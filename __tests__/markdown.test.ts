/**
 * @jest-environment node
 *
 * The guide body is rendered as raw HTML into the page, so the escaping here is
 * a security boundary, not a formatting nicety. Authors are trusted; a pasted
 * snippet from elsewhere is not.
 */
import { renderMarkdown, markdownToPlainText } from '../lib/markdown';

describe('escaping', () => {
  it('neutralises a script tag', () => {
    const { html } = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('neutralises an inline event handler', () => {
    // The handler text survives, but there is no <img> element for it to fire
    // on — the tag is escaped, so the browser sees characters, not markup.
    const { html } = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('refuses a javascript: link', () => {
    // The link syntax matches only http(s) and site-relative paths, so this
    // never becomes an anchor. The text itself survives, escaped and inert —
    // that is fine; what matters is that nothing is clickable.
    const { html } = renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('href=');
  });

  it('allows a normal external link', () => {
    const { html } = renderMarkdown('[docs](https://example.com/a)');
    expect(html).toContain('<a href="https://example.com/a"');
  });

  it('allows a site-relative link', () => {
    const { html } = renderMarkdown('[shop](/shop)');
    expect(html).toContain('<a href="/shop"');
  });
});

describe('formatting', () => {
  it('renders headings at h2/h3, never h1', () => {
    // The page owns the h1. A body that emits one gives the page two.
    const { html } = renderMarkdown('## Section\n\n### Sub');
    expect(html).toContain('<h2');
    expect(html).toContain('<h3');
    expect(html).not.toContain('<h1');
  });

  it('renders bullet and numbered lists', () => {
    expect(renderMarkdown('- one\n- two').html).toContain('<ul');
    expect(renderMarkdown('1. one\n2. two').html).toContain('<ol');
  });

  it('renders bold and italic', () => {
    expect(renderMarkdown('**bold**').html).toContain('<strong>bold</strong>');
    expect(renderMarkdown('some *word*').html).toContain('<em>word</em>');
  });

  it('splits paragraphs on blank lines', () => {
    const { html } = renderMarkdown('one\n\ntwo');
    expect(html.match(/<p/g)?.length).toBe(2);
  });

  it('handles Arabic text unchanged', () => {
    const { html } = renderMarkdown('عقلة حائط مصنوعة في مصر');
    expect(html).toContain('عقلة حائط مصنوعة في مصر');
  });
});

describe('product shortcode', () => {
  it('extracts the slug and leaves a marker', () => {
    const { html, productSlugs } = renderMarkdown('Text\n\n[[product:floor-parallettes]]\n\nMore');
    expect(productSlugs).toEqual(['floor-parallettes']);
    expect(html).toContain('<!--product:floor-parallettes-->');
  });

  it('collects several in order', () => {
    const { productSlugs } = renderMarkdown('[[product:a]] and [[product:b]]');
    expect(productSlugs).toEqual(['a', 'b']);
  });
});

describe('markdownToPlainText', () => {
  it('strips syntax for a meta description', () => {
    const text = markdownToPlainText('## Title\n\nSome **bold** and a [link](https://x.com).');
    expect(text).toBe('Title Some bold and a link.');
  });

  it('truncates on a word boundary', () => {
    const text = markdownToPlainText('word '.repeat(100), 40);
    expect(text.length).toBeLessThanOrEqual(41);
    expect(text.endsWith('…')).toBe(true);
  });

  it('drops the product shortcode', () => {
    expect(markdownToPlainText('Before [[product:x]] after')).not.toContain('product:');
  });
});
