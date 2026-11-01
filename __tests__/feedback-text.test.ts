/**
 * The public review text: nothing the customer wrote is cut off, and only the
 * old appended contact lines are removed.
 */
import { cleanFeedbackMessage } from '../app/sections/feedbackText';

describe('cleanFeedbackMessage', () => {
  it('keeps "from:" in the middle of a sentence (the cut-off bug)', () => {
    const text = 'I ordered from: Alexandria and it arrived in two days.';
    expect(cleanFeedbackMessage(text)).toBe(text);
  });

  it('keeps "email:" and "phone:" inside the text', () => {
    const text = 'Support answered my email: fast. Their phone: line too.';
    expect(cleanFeedbackMessage(text)).toBe(text);
  });

  it('removes the old appended contact lines only', () => {
    const stored = 'Great bars, very solid.\nFrom: Ahmed\nEmail: a@b.com\nPhone: 0101';
    expect(cleanFeedbackMessage(stored)).toBe('Great bars, very solid.');
  });

  it('keeps a long review whole', () => {
    const long = 'word '.repeat(100).trim();
    expect(cleanFeedbackMessage(long)).toBe(long);
  });
});
