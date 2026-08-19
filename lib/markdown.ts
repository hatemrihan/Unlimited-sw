/**
 * A deliberately small Markdown renderer.
 *
 * Guides are written by the shop owner in a textarea, not by strangers, and the
 * only formatting they need is headings, paragraphs, lists, links, bold and the
 * product shortcode. A full parser (plus a sanitiser, which it would then need)
 * is a dependency and an attack surface for a feature this size.
 *
 * Everything is HTML-escaped first, so nothing an author pastes can inject
 * markup — the syntax below is applied to already-escaped text.
 *
 * Supported:
 *   ## Heading            → <h2>            (h1 belongs to the page, not the body)
 *   ### Heading           → <h3>
 *   - item                → <ul><li>
 *   1. item               → <ol><li>
 *   **bold**  *italic*
 *   [text](https://…)     → <a> (http/https only)
 *   [[product:slug]]      → extracted, rendered as a card by the page
 *   blank line            → paragraph break
 */

export interface RenderedMarkdown {
  html: string;
  /** Product slugs referenced by [[product:…]], in order of appearance. */
  productSlugs: string[];
}

const PRODUCT_SHORTCODE = /\[\[product:([^\]]+)\]\]/g;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline formatting, applied to escaped text. */
function inline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    // Only http(s). A `javascript:` href is the one link that matters here.
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2" class="underline hover:no-underline">$1</a>');
}

export function renderMarkdown(source: string): RenderedMarkdown {
  if (!source) return { html: '', productSlugs: [] };

  const productSlugs: string[] = [];
  let text = source.replace(PRODUCT_SHORTCODE, (_match, slug) => {
    productSlugs.push(String(slug).trim());
    // Left as a marker the page can split on, so the card renders as a React
    // component rather than as injected HTML.
    return `\n\n<!--product:${String(slug).trim()}-->\n\n`;
  });

  text = escapeHtml(text)
    // The marker survives escaping as &lt;!--product:…--&gt;; put it back.
    // Non-greedy up to the closing `--`, because slugs contain hyphens
    // ("floor-parallettes") and a `[^-]+` class stops at the first one.
    .replace(/&lt;!--product:(.+?)--&gt;/g, '<!--product:$1-->');

  const blocks = text.split(/\n{2,}/);
  const html: string[] = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    if (block.startsWith('<!--product:')) {
      html.push(block);
      continue;
    }

    if (block.startsWith('### ')) {
      html.push(`<h3 class="text-lg font-medium text-white mt-10 mb-3">${inline(block.slice(4))}</h3>`);
      continue;
    }
    if (block.startsWith('## ')) {
      html.push(`<h2 class="text-xl font-medium text-white mt-12 mb-4">${inline(block.slice(3))}</h2>`);
      continue;
    }

    const lines = block.split('\n');

    if (lines.every(l => /^[-*]\s+/.test(l.trim()))) {
      const items = lines.map(l => `<li>${inline(l.trim().replace(/^[-*]\s+/, ''))}</li>`).join('');
      html.push(`<ul class="list-disc pr-6 pl-6 space-y-2 my-4">${items}</ul>`);
      continue;
    }

    if (lines.every(l => /^\d+\.\s+/.test(l.trim()))) {
      const items = lines.map(l => `<li>${inline(l.trim().replace(/^\d+\.\s+/, ''))}</li>`).join('');
      html.push(`<ol class="list-decimal pr-6 pl-6 space-y-2 my-4">${items}</ol>`);
      continue;
    }

    html.push(`<p class="my-4 leading-relaxed">${inline(lines.join(' '))}</p>`);
  }

  return { html: html.join('\n'), productSlugs };
}

/** Plain text, for meta descriptions and excerpts. */
export function markdownToPlainText(source: string, limit = 158): string {
  const text = (source || '')
    .replace(PRODUCT_SHORTCODE, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= limit) return text;
  return text.slice(0, limit).replace(/\s+\S*$/, '') + '…';
}
