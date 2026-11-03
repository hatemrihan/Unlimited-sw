/**
 * The WhatsApp button's links (3 Nov 2026): our number as digits, the
 * Arabic question already typed, and no link at all without a number.
 */
import { isLightColour, WHATSAPP_TOPICS, whatsappDigits, whatsappLink } from '../components/whatsapp/topics';

describe('WhatsApp button', () => {
  it('turns any written form of the number into digits', () => {
    expect(whatsappDigits('+20 104 487 8774')).toBe('201044878774');
  });

  it('opens the chat with the Arabic question typed, greeting first', () => {
    const link = whatsappLink('+201044878774', WHATSAPP_TOPICS[0].message)!;
    expect(link.startsWith('https://wa.me/201044878774?text=')).toBe(true);
    const text = decodeURIComponent(link.split('?text=')[1]);
    expect(text).toBe('السلام عليكم، أي عقلة تناسب حائطي؟');
    expect(text.startsWith('السلام عليكم')).toBe(true);
  });

  it('gives no link without a usable number', () => {
    expect(whatsappLink('', 'x')).toBeNull();
    expect(whatsappLink('+20', 'x')).toBeNull();
  });

  it('has four Arabic topics, each with its own message', () => {
    expect(WHATSAPP_TOPICS).toHaveLength(4);
    WHATSAPP_TOPICS.forEach((t) => {
      expect(t.label).toMatch(/[؀-ۿ]/);
      expect(t.message.startsWith('السلام عليكم')).toBe(true);
    });
  });
});

describe('what is behind the button', () => {
  it('reads light and dark backgrounds, and skips see-through ones', () => {
    expect(isLightColour('rgb(245, 245, 244)')).toBe(true);
    expect(isLightColour('rgb(28, 25, 23)')).toBe(false);
    expect(isLightColour('rgba(0, 0, 0, 0)')).toBeNull();
    expect(isLightColour('transparent')).toBeNull();
    // What Chrome actually reports for Tailwind 4's stone-100 and stone-900:
    expect(isLightColour('lab(96.5286 -0.0991821 0.364268)')).toBe(true);
    expect(isLightColour('lab(9.03835 1.15298 1.92955)')).toBe(false);
    expect(isLightColour('oklch(0.97 0.001 106.4)')).toBe(true);
    expect(isLightColour('oklch(21.6% 0.006 56)')).toBe(false);
    expect(isLightColour('lab(96 0 0 / 0.2)')).toBeNull();
  });
});
