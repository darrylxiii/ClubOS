/**
 * Discourage user-visible copy embedded in JSX without i18n.
 * Use t('key') / Trans / translation components instead.
 *
 * Opt out per line: // eslint-disable-next-line i18n/no-raw-jsx-text
 */
const messageId = "noRawJsxText";

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "User-visible strings should use i18n (e.g. useTranslation + t()) instead of raw JSX text.",
    },
    schema: [
      {
        type: "object",
        properties: {
          /** Skip JSXText when the trimmed value matches this regex (string body only). */
          ignorePattern: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      [messageId]:
        "Avoid raw JSX text for user-visible copy — use i18n (t('…'), Trans, etc.).",
    },
  },

  create(context) {
    const opts = context.options[0] || {};
    let ignoreRegex = null;
    if (opts.ignorePattern) {
      try {
        ignoreRegex = new RegExp(opts.ignorePattern, "u");
      } catch {
        ignoreRegex = null;
      }
    }

    /** True if this looks like translatable prose (any letters, 2+ in a row). */
    function looksLikeWords(s) {
      return /\p{L}{2,}/u.test(s);
    }

    function shouldIgnoreRawString(s) {
      const t = s.trim();
      if (!t) return true;
      if (!looksLikeWords(t)) return true;
      if (ignoreRegex && ignoreRegex.test(t)) return true;
      return false;
    }

    return {
      JSXText(node) {
        if (shouldIgnoreRawString(node.value)) return;
        context.report({ node, messageId });
      },

      JSXExpressionContainer(node) {
        const { expression } = node;
        if (expression.type !== "Literal") return;
        if (typeof expression.value !== "string") return;
        if (shouldIgnoreRawString(expression.value)) return;
        context.report({ node: expression, messageId });
      },
    };
  },
};
