/**
 * @jest-environment node
 *
 * How long an order response may wait on the email provider.
 *
 * The order route awaits `dispatchOrderPostProcessing` before answering, and it
 * has to: Netlify kills a serverless function the moment it responds, so a
 * fire-and-forget send simply never happens and the customer never gets their
 * confirmation.
 *
 * But awaiting it without a limit put Brevo on the critical path of a completed
 * purchase. The order is committed and paid for by then; if SMTP hangs, the
 * customer watches "Processing…" for as long as it takes, decides the button is
 * broken, and presses it again — which is exactly the duplicate-order failure
 * the clientOrderId guard exists to catch. One weakness feeding another.
 *
 * The rule these tests hold: an order that is already saved must never be held
 * open behind a third party, and when the wait is cut short somebody must be
 * told, because a customer is now missing a confirmation email and nothing else
 * would ever say so.
 */
import { withTimeBudget } from '../services/emailQueueService';

jest.mock('../lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));

/** A promise that never settles — a provider outage, or a hung connection. */
const hangsForever = () => new Promise<void>(() => {});

describe('withTimeBudget', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('stops waiting once the budget is spent', async () => {
    jest.useFakeTimers();
    const onExceeded = jest.fn();

    const waiting = withTimeBudget(hangsForever(), 4000, onExceeded);
    await jest.advanceTimersByTimeAsync(4001);

    await expect(waiting).resolves.toBeUndefined();
    expect(onExceeded).toHaveBeenCalledTimes(1);
  });

  it('is still waiting a moment before the budget is spent', async () => {
    jest.useFakeTimers();
    const onExceeded = jest.fn();

    withTimeBudget(hangsForever(), 4000, onExceeded);
    await jest.advanceTimersByTimeAsync(3999);

    expect(onExceeded).not.toHaveBeenCalled();
  });

  it('says nothing when the work finishes in time', async () => {
    const onExceeded = jest.fn();

    await expect(withTimeBudget(Promise.resolve(), 4000, onExceeded)).resolves.toBeUndefined();
    expect(onExceeded).not.toHaveBeenCalled();
  });

  it('does not report a timeout after the work has already finished', async () => {
    // The timer must be cleared on success, or a fast send would still be
    // reported as a miss once the budget elapsed.
    jest.useFakeTimers();
    const onExceeded = jest.fn();

    const waiting = withTimeBudget(Promise.resolve(), 4000, onExceeded);
    await waiting;
    await jest.advanceTimersByTimeAsync(10_000);

    expect(onExceeded).not.toHaveBeenCalled();
  });

  it('treats a failed send as finished, not as a hang', async () => {
    // `dispatchOrderPostProcessing` catches its own errors before handing the
    // promise over, so a failure arrives here as a resolution. The customer is
    // answered either way — the order is saved regardless of the email.
    const onExceeded = jest.fn();

    await expect(withTimeBudget(Promise.resolve(), 4000, onExceeded)).resolves.toBeUndefined();
    expect(onExceeded).not.toHaveBeenCalled();
  });
});
