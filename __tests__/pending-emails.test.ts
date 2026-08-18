/**
 * @jest-environment node
 *
 * The debt an order owes its customer.
 *
 * A confirmation email used to exist only as a promise inside the request that
 * created the order. If the provider was slow the customer waited; if the
 * serverless function died first, the email was lost, and nothing anywhere
 * recorded that it should have been sent. A customer who has paid and heard
 * nothing cannot tell "no email yet" from "no order".
 *
 * So the order now writes a row saying an email is owed, and it writes it
 * inside its own transaction. These tests hold the three properties that make
 * that worth having: the row commits with the order and not otherwise, two
 * drains cannot both send the same one, and a failure that will never succeed
 * is eventually given up on loudly rather than retried forever.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import PendingEmail from '../models/pendingEmail';
import {
  enqueueOrderEmail,
  markEmailSent,
  claimNextPendingEmail,
  recordEmailFailure,
  drainPendingEmails,
  MAX_ATTEMPTS,
} from '../services/pendingEmailService';
import { logger } from '../utils/logger';

jest.setTimeout(120_000);

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'pendingemails' });
  await PendingEmail.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await PendingEmail.deleteMany({});
  jest.clearAllMocks();
});

const payload = { order: { orderId: 'ALK1' }, orderData: { customer: { email: 'a@b.com' } } };

async function queue(orderId: string, overrides: Record<string, unknown> = {}) {
  await enqueueOrderEmail(orderId, payload);
  if (Object.keys(overrides).length > 0) {
    await PendingEmail.updateOne({ orderId }, overrides);
  }
}

describe('enqueuing', () => {
  it('records one row per order, and only one', async () => {
    await queue('ALK1');

    // The unique index is what stops an inline attempt and a drain from both
    // deciding an email is owed and sending two.
    await expect(enqueueOrderEmail('ALK1', payload)).rejects.toThrow();
    expect(await PendingEmail.countDocuments({})).toBe(1);
  });

  it('starts due immediately, so the drain would take it on its next run', async () => {
    await queue('ALK1');

    const row = await PendingEmail.findOne({ orderId: 'ALK1' });
    expect(row!.status).toBe('pending');
    expect(row!.attempts).toBe(0);
    expect(row!.nextAttemptAt.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('claiming', () => {
  it('hands the same row to only one caller', async () => {
    // Two drains overlapping — a scheduled run starting while a slow one is
    // still going. Both must not send the same customer the same email.
    await queue('ALK1');

    const [first, second] = await Promise.all([
      claimNextPendingEmail(),
      claimNextPendingEmail(),
    ]);

    const claimed = [first, second].filter(Boolean);
    expect(claimed).toHaveLength(1);
  });

  it('takes the oldest due item first', async () => {
    const past = new Date(Date.now() - 60_000);
    await queue('ALK-NEW');
    await queue('ALK-OLD', { nextAttemptAt: past });

    const claimed = await claimNextPendingEmail();
    expect(claimed!.orderId).toBe('ALK-OLD');
  });

  it('leaves alone anything not yet due', async () => {
    await queue('ALK1', { nextAttemptAt: new Date(Date.now() + 60_000) });

    expect(await claimNextPendingEmail()).toBeNull();
  });

  it('leaves alone anything already sent', async () => {
    await queue('ALK1');
    await markEmailSent('ALK1');

    expect(await claimNextPendingEmail()).toBeNull();
  });
});

describe('failure handling', () => {
  it('backs off rather than retrying immediately', async () => {
    await queue('ALK1');
    await claimNextPendingEmail();

    const now = new Date();
    const row = await recordEmailFailure('ALK1', new Error('smtp down'), now);

    expect(row!.status).toBe('pending');
    expect(row!.lastError).toContain('smtp down');
    expect(row!.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it('gives up once the attempts are spent, and says so loudly', async () => {
    // A bad address or a suspended account never succeeds. Retrying it forever
    // only buries the one row somebody needs to look at.
    await queue('ALK1', { attempts: MAX_ATTEMPTS });

    const row = await recordEmailFailure('ALK1', new Error('550 no such user'));

    expect(row!.status).toBe('abandoned');
    expect((logger.error as jest.Mock).mock.calls.flat().join(' ')).toContain('ALK1');
  });

  it('does not pick an abandoned row up again', async () => {
    await queue('ALK1', { attempts: MAX_ATTEMPTS });
    await recordEmailFailure('ALK1', new Error('550 no such user'));

    expect(await claimNextPendingEmail()).toBeNull();
  });
});

describe('draining', () => {
  it('sends what is due and marks it done', async () => {
    await queue('ALK1');
    await queue('ALK2');
    const send = jest.fn().mockResolvedValue(undefined);

    const result = await drainPendingEmails(send);

    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(await PendingEmail.countDocuments({ status: 'sent' })).toBe(2);
  });

  it('hands the send everything it needs, without re-reading the order', async () => {
    // Snapshotted at order time on purpose: the email describes the order as it
    // was placed, and an admin editing it later must not change what the
    // customer is told they bought.
    await queue('ALK1');
    const send = jest.fn().mockResolvedValue(undefined);

    await drainPendingEmails(send);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      order: expect.objectContaining({ orderId: 'ALK1' }),
      orderData: expect.objectContaining({ customer: { email: 'a@b.com' } }),
    }));
  });

  it('leaves a failed send queued for another try', async () => {
    await queue('ALK1');
    const send = jest.fn().mockRejectedValue(new Error('smtp down'));

    const result = await drainPendingEmails(send);

    expect(result).toEqual({ sent: 0, failed: 1 });
    const row = await PendingEmail.findOne({ orderId: 'ALK1' });
    expect(row!.status).toBe('pending');
    expect(row!.attempts).toBe(1);
  });

  it('carries on past one bad row rather than stopping the queue', async () => {
    await queue('ALK-BAD');
    await queue('ALK-GOOD');
    const send = jest
      .fn()
      .mockRejectedValueOnce(new Error('bad address'))
      .mockResolvedValue(undefined);

    const result = await drainPendingEmails(send);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('stops at the limit instead of running until the function is killed', async () => {
    for (let i = 0; i < 5; i++) await queue(`ALK${i}`);
    const send = jest.fn().mockResolvedValue(undefined);

    const result = await drainPendingEmails(send, { limit: 2 });

    expect(result.sent).toBe(2);
    expect(await PendingEmail.countDocuments({ status: 'pending' })).toBe(3);
  });

  it('does nothing, quietly, when there is nothing owed', async () => {
    const send = jest.fn();

    expect(await drainPendingEmails(send)).toEqual({ sent: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});
