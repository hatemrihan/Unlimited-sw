import type { OrderEmailData, PriceAdjustmentData } from './types';

/**
 * Sample data shared by the preview renderer and the test sender, so what you
 * look at in the browser is exactly what lands in an inbox.
 */

export const sampleOrder: OrderEmailData = {
  customerEmail: 'customer@example.com',
  customerName: 'Youssef Abdelrahman',
  customerFirstName: 'Youssef',
  customerLastName: 'Abdelrahman',
  orderId: 'SAMPLE-1042',
  orderItems: [
    {
      name: 'Wall-Mounted Pull-Up Bar + Wall-Parallel Bar',
      quantity: 1,
      price: 4958,
      variant: { name: 'Black', size: '', color: 'Black' },
    },
    { name: 'Floor Parallettes', quantity: 2, price: 2798 },
  ],
  subtotal: 7756,
  shippingCost: 229,
  codFee: 100,
  discountAmount: 500,
  promoCode: 'UNLIMITED10',
  totalAmount: 7585,
  paymentMethod: 'cashOnDelivery',
  shippingAddress: {
    governorate: 'Cairo',
    city: 'Nasr City',
    address: '14 Mostafa El-Nahas Street',
    apartment: 'Apartment 7',
  },
  customerPhone: '+20 100 123 4567',
  customerNotes: 'Please call before delivery.',
};

export const sampleAdjustment: PriceAdjustmentData = {
  customerEmail: 'customer@example.com',
  customerName: 'Youssef Abdelrahman',
  orderId: 'SAMPLE-1042',
  orderItems: sampleOrder.orderItems,
  previousTotal: 6781,
  correctedTotal: 6686,
  subtotal: 6357,
  shippingCost: 229,
  codFee: 100,
  paymentMethod: 'cashOnDelivery',
  reason: 'The cash-on-delivery fee was added twice at checkout.',
};

/** A customer name full of markup — proves the escaping actually holds. */
export const hostileOrder: OrderEmailData = {
  ...sampleOrder,
  customerName: '<script>alert(1)</script> "Ahmed" & <b>Co</b>',
  customerNotes: '<img src=x onerror=alert(1)>',
};
