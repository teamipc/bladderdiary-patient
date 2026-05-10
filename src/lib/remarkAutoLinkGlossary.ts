import type { Plugin } from 'unified';
import type { Root, Text, Link as MdLink, Parent, RootContent } from 'mdast';
import { visitParents } from 'unist-util-visit-parents';
import type { Locale } from '@/i18n/config';

export interface GlossaryTerm {
  /** Phrase to match in article body. Case-insensitive. */
  phrase: string;
  /** Glossary slug (URL stays in EN: /learn/glossary/<slug>). */
  slug: string;
  /**
   * Use \b word boundaries (ASCII only). Useful for short abbreviations like
   * "OAB" / "PVR" so they don't match inside other words. Multi-character
   * non-Latin phrases (zh, ar) should leave this off.
   */
  wholeWord?: boolean;
}

interface Options {
  /** Locale for selecting term phrases. URLs stay locale-agnostic — the */
  /** MDX `a` renderer hands them to next-intl Link, which adds the prefix. */
  locale: Locale;
  /** Slug of the article being rendered, so we never self-link. */
  currentSlug?: string;
  /** Per-locale term list (sorted longest-phrase-first by caller). */
  terms: GlossaryTerm[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SKIP_PARENT_TYPES = new Set(['link', 'heading', 'code', 'inlineCode', 'linkReference']);

/**
 * Auto-link the first occurrence of each glossary term in article body prose.
 *
 * Why: every article that mentions "OAB" / "nocturia" / "post-void residual"
 * etc. should send a link to the glossary entry. Doing this manually is
 * error-prone (we forget; or we link the wrong occurrence; or we link too
 * many). A build-time remark plugin guarantees the link graph is consistent
 * across all 6 locales × every article.
 *
 * Constraints:
 * - Only the FIRST occurrence per term is linked, document-wide.
 * - Inside <a>, headings, and code blocks: skipped.
 * - On the glossary entry itself: that entry's term is skipped (no self-link).
 */
const remarkAutoLinkGlossary: Plugin<[Options], Root> = (options) => {
  return (tree) => {
    const linkedSlugs = new Set<string>();
    type Replacement = { parent: Parent; index: number; nodes: RootContent[] };
    const replacements: Replacement[] = [];

    visitParents(tree, 'text', (node, ancestors) => {
      for (const a of ancestors) {
        if (SKIP_PARENT_TYPES.has(a.type)) return;
      }

      const parent = ancestors[ancestors.length - 1] as Parent | undefined;
      if (!parent) return;
      const index = parent.children.indexOf(node as RootContent);
      if (index === -1) return;

      let resultNodes: RootContent[] = [node as Text];

      for (const term of options.terms) {
        if (linkedSlugs.has(term.slug)) continue;
        if (term.slug === options.currentSlug) continue;

        const lastIdx = resultNodes.length - 1;
        const lastNode = resultNodes[lastIdx];
        if (lastNode.type !== 'text') continue;

        const escaped = escapeRegExp(term.phrase);
        const pattern = term.wholeWord ? `\\b${escaped}\\b` : escaped;
        const re = new RegExp(pattern, 'i');
        const match = lastNode.value.match(re);
        if (!match || match.index === undefined) continue;

        const before = lastNode.value.slice(0, match.index);
        const matched = match[0];
        const after = lastNode.value.slice(match.index + matched.length);

        const link: MdLink = {
          type: 'link',
          // Locale-agnostic href — next-intl's Link wrapper in src/lib/mdx.tsx
          // prefixes the active locale at render time. Emitting `/en/...`
          // here would double-prefix (`/en/en/...`).
          url: `/learn/glossary/${term.slug}`,
          children: [{ type: 'text', value: matched }],
        };

        const replacement: RootContent[] = [];
        if (before) replacement.push({ type: 'text', value: before } as Text);
        replacement.push(link);
        if (after) replacement.push({ type: 'text', value: after } as Text);

        resultNodes = [...resultNodes.slice(0, lastIdx), ...replacement];
        linkedSlugs.add(term.slug);
      }

      if (resultNodes.length > 1 || resultNodes[0] !== node) {
        replacements.push({ parent, index, nodes: resultNodes });
      }
    });

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, nodes } = replacements[i];
      parent.children.splice(index, 1, ...(nodes as Parent['children']));
    }
  };
};

export default remarkAutoLinkGlossary;
