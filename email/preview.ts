/**
 * Renders every email to an .html file you can open in a browser.
 *
 *   npm run email:preview
 *
 * Nothing is sent and nothing connects to Brevo — this only runs the templates
 * over sample data. Use it to review a design change before it reaches anyone.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { orderConfirmationEmail } from './templates/orderConfirmation';
import { adminNewOrderEmail } from './templates/adminNewOrder';
import { priceAdjustmentEmail } from './templates/priceAdjustment';
import { sampleOrder, sampleAdjustment, hostileOrder } from './samples';

const outputDir = join(process.cwd(), '.email-preview');
mkdirSync(outputDir, { recursive: true });

const previews = [
  ['order-confirmation.html', orderConfirmationEmail(sampleOrder).html],
  ['admin-new-order.html', adminNewOrderEmail(sampleOrder, ['admin@example.com']).html],
  ['price-adjustment.html', priceAdjustmentEmail(sampleAdjustment).html],
  ['escaping-check.html', adminNewOrderEmail(hostileOrder, ['admin@example.com']).html],
] as const;

for (const [filename, html] of previews) {
  writeFileSync(join(outputDir, filename), html, 'utf8');
  console.log(`✓ ${join('.email-preview', filename)}`);
}

console.log(`\nOpen them with:  open .email-preview/*.html`);
