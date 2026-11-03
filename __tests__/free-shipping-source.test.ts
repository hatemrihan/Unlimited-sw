/**
 * The home page's free-shipping banner reads the SAME switch checkout
 * prices from. Since the cutover that is Supabase (the dashboard's
 * /shop → Settings), never the old MongoDB copy (3 Nov 2026).
 */
const mongo = jest.fn();
jest.mock('../lib/mongodb', () => ({ __esModule: true, default: (...a: unknown[]) => mongo(...a) }));
jest.mock('../models/freeShippingOverride', () => ({ __esModule: true, default: { findOne: () => mongo() } }));
jest.mock('@/shopdb/client',() => ({ sellsFromSupabase: () => true }));
jest.mock('@/shopdb/settings', () => ({
  shopSwitches: jest.fn().mockResolvedValue({
    freeShipping: { active: true, expiresAt: '2026-11-30T21:59:59.000Z', applyToAll: false, productIds: ['p1'] },
  }),
}));

import { getFreeShippingStatus } from '@/lib/freeShippingCheck';

it('reads the dashboard switch, not MongoDB, once the store sells from Supabase', async () => {
  await expect(getFreeShippingStatus()).resolves.toEqual({
    active: true,
    expiresAt: '2026-11-30T21:59:59.000Z',
    applyToAll: false,
    productIds: ['p1'],
  });
  expect(mongo).not.toHaveBeenCalled();
});
