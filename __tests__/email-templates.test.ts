/**
 * Guards the email folder against the failures the old code actually had:
 * injected markup, wrong totals, missing plain-text, and bad recipients.
 */

import { orderConfirmationEmail } from '../email/templates/orderConfirmation';
import { adminNewOrderEmail } from '../email/templates/adminNewOrder';
import { priceAdjustmentEmail } from '../email/templates/priceAdjustment';
import { escapeHtml, money } from '../email/templates/layout';
import { isValidEmailAddress } from '../email/send';
import type { OrderEmailData, PriceAdjustmentData } from '../email/types';

const baseOrder: OrderEmailData = {
  customerEmail: 'customer@example.com',
  customerName: 'Youssef Abdelrahman',
  customerFirstName: 'Youssef',
  orderId: '1042',
  orderItems: [
    { name: 'Floor Parallettes', quantity: 2, price: 2798 },
    {
      name: 'Pull-Up Bar',
      quantity: 1,
      price: 4958,
      variant: { name: 'Black', size: '', color: 'Black' },
    },
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
};

describe('escapeHtml', () => {
  it('neutralises every character that can break out of markup', () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe(
      '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;'
    );
  });

  it('renders null and undefined as empty, not as the words', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('money', () => {
  it('groups thousands and appends the currency', () => {
    expect(money(7585)).toBe('7,585 L.E');
  });

  it('never prints NaN into a customer email', () => {
    expect(money(Number.NaN)).toBe('0 L.E');
  });
});

describe('isValidEmailAddress', () => {
  it('accepts a normal address', () => {
    expect(isValidEmailAddress('customer@example.com')).toBe(true);
  });

  it('rejects an address carrying newlines (SMTP header injection)', () => {
    expect(isValidEmailAddress('a@b.com\r\nBcc: victim@example.com')).toBe(false);
    expect(isValidEmailAddress('a@b.com\nBcc: victim@example.com')).toBe(false);
  });

  it('rejects non-addresses', () => {
    expect(isValidEmailAddress('')).toBe(false);
    expect(isValidEmailAddress('not-an-email')).toBe(false);
    expect(isValidEmailAddress('a@b')).toBe(false);
    expect(isValidEmailAddress(undefined)).toBe(false);
    expect(isValidEmailAddress(42)).toBe(false);
  });
});

describe('orderConfirmationEmail', () => {
  const message = orderConfirmationEmail(baseOrder);

  it('goes to the customer with the order number in the subject', () => {
    expect(message.to).toBe('customer@example.com');
    expect(message.subject).toContain('1042');
  });

  it('always carries a plain-text part', () => {
    expect(message.text.length).toBeGreaterThan(50);
    expect(message.text).toContain('Floor Parallettes');
  });

  it('shows every ordered item', () => {
    expect(message.html).toContain('Floor Parallettes');
    expect(message.html).toContain('Pull-Up Bar');
  });

  it('shows the totals that were passed in', () => {
    expect(message.html).toContain('7,585 L.E'); // total
    expect(message.html).toContain('229 L.E'); // shipping
    expect(message.html).toContain('UNLIMITED10'); // promo code
  });

  it('derives the subtotal when an older order has none stored', () => {
    const { subtotal, ...withoutSubtotal } = baseOrder;
    void subtotal;
    const derived = orderConfirmationEmail(withoutSubtotal as OrderEmailData);
    // 7585 - 229 - 100 + 500 = 7756
    expect(derived.html).toContain('7,756 L.E');
  });

  it('hides the discount row entirely when there is no discount', () => {
    const noDiscount = orderConfirmationEmail({
      ...baseOrder,
      discountAmount: 0,
      promoCode: undefined,
    });
    expect(noDiscount.html).not.toContain('Discount');
  });
});

describe('adminNewOrderEmail', () => {
  it('goes to the admin list and replies to the customer', () => {
    const message = adminNewOrderEmail(baseOrder, ['a@example.com', 'b@example.com']);
    expect(message.to).toEqual(['a@example.com', 'b@example.com']);
    expect(message.replyTo).toBe('customer@example.com');
  });

  it('includes the details needed to fulfil the order', () => {
    const message = adminNewOrderEmail(baseOrder, ['a@example.com']);
    expect(message.html).toContain('+20 100 123 4567');
    expect(message.html).toContain('14 Mostafa El-Nahas Street');
    expect(message.html).toContain('Nasr City');
  });

  it('escapes customer-supplied text instead of rendering it as markup', () => {
    const hostile = adminNewOrderEmail(
      {
        ...baseOrder,
        customerName: '<script>alert(1)</script>',
        customerNotes: '<img src=x onerror=alert(1)>',
      },
      ['a@example.com']
    );
    expect(hostile.html).not.toContain('<script>');
    expect(hostile.html).not.toContain('<img src=x');
    expect(hostile.html).toContain('&lt;script&gt;');
  });
});

describe('priceAdjustmentEmail', () => {
  const data: PriceAdjustmentData = {
    customerEmail: 'customer@example.com',
    customerName: 'Youssef Abdelrahman',
    orderId: '1042',
    orderItems: baseOrder.orderItems,
    previousTotal: 6781,
    correctedTotal: 6686,
    subtotal: 6357,
    shippingCost: 229,
    codFee: 100,
    paymentMethod: 'cashOnDelivery',
  };

  it('uses the totals it is given, not hardcoded ones', () => {
    const other = priceAdjustmentEmail({ ...data, previousTotal: 1200, correctedTotal: 1000 });
    expect(other.html).toContain('1,200 L.E');
    expect(other.html).toContain('1,000 L.E');
    // The figures from the original hardcoded email must never reappear.
    expect(other.html).not.toContain('6,686');
    expect(other.html).not.toContain('6,781');
  });

  it('shows both the old and the corrected total', () => {
    const message = priceAdjustmentEmail(data);
    expect(message.html).toContain('6,781 L.E');
    expect(message.html).toContain('6,686 L.E');
    expect(message.text).toContain('6,686 L.E');
  });

  it('uses a custom reason when one is supplied', () => {
    const message = priceAdjustmentEmail({ ...data, reason: 'Shipping was charged twice.' });
    expect(message.html).toContain('Shipping was charged twice.');
    expect(message.text).toContain('Shipping was charged twice.');
  });
});

describe('every template', () => {
  const messages = [
    orderConfirmationEmail(baseOrder),
    adminNewOrderEmail(baseOrder, ['a@example.com']),
    priceAdjustmentEmail({
      customerEmail: 'customer@example.com',
      customerName: 'Youssef',
      orderId: '1',
      orderItems: baseOrder.orderItems,
      previousTotal: 100,
      correctedTotal: 90,
      subtotal: 80,
      shippingCost: 10,
      paymentMethod: 'instaPay',
    }),
  ];

  it.each(messages.map((m, i) => [i, m]))('message %i is a complete document', (_i, message) => {
    const msg = message as (typeof messages)[number];
    expect(msg.html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(msg.html).toContain('</html>');
    expect(msg.subject.length).toBeGreaterThan(0);
    expect(msg.text.length).toBeGreaterThan(0);
  });

  it.each(messages.map((m, i) => [i, m]))('message %i has no unreplaced placeholder', (_i, message) => {
    const msg = message as (typeof messages)[number];
    expect(msg.html).not.toContain('undefined');
    expect(msg.html).not.toContain('NaN');
    expect(msg.text).not.toContain('undefined');
    expect(msg.text).not.toContain('NaN');
  });
});
