/**
 * The home page's feedback section (3 Nov 2026): both languages say the
 * same things, each step checks what the server will check, and a review
 * keeps its writer's name.
 */
import { reviewName } from '../app/sections/feedbackText';
import { checkStep, FEEDBACK_WORDS } from '../app/sections/feedback/words';

describe('feedback words', () => {
  it('Arabic and English have the same words', () => {
    expect(Object.keys(FEEDBACK_WORDS.ar).sort()).toEqual(Object.keys(FEEDBACK_WORDS.en).sort());
    expect(FEEDBACK_WORDS.ar.stars).toHaveLength(6);
    expect(FEEDBACK_WORDS.en.stars.at(5)).toBe('Unlimited');
  });
});

describe('checkStep', () => {
  const ok = { message: 'Solid bar', name: 'Omar', email: 'omar@example.com' };

  it('the words step needs words', () => {
    expect(checkStep(2, { ...ok, message: '   ' }, 'en')).toBe(FEEDBACK_WORDS.en.needMessage);
    expect(checkStep(2, ok, 'en')).toBeNull();
  });

  it('the who step needs a name and a real email, in the reader\'s language', () => {
    expect(checkStep(3, { ...ok, name: '' }, 'ar')).toBe(FEEDBACK_WORDS.ar.needName);
    expect(checkStep(3, { ...ok, email: 'omar@' }, 'ar')).toBe(FEEDBACK_WORDS.ar.badEmail);
    expect(checkStep(3, ok, 'ar')).toBeNull();
  });
});

describe('reviewName', () => {
  it('uses the name field', () => {
    expect(reviewName({ name: ' Omar ', message: 'x' })).toBe('Omar');
  });
  it('reads the old "From:" line, and nothing in the middle of a sentence', () => {
    expect(reviewName({ message: 'Great.\nFrom: Ahmed Email: a@b.com' })).toBe('Ahmed');
    expect(reviewName({ message: 'I ordered from: Alexandria' })).toBe('');
  });
});
