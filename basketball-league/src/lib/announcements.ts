import sanitizeHtml from "sanitize-html";

const IMG_SRC_PATTERN = /^\/api\/announcements\/images\/\d+$/;

export function sanitizeBody(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s",
      "h1", "h2", "h3",
      "ul", "ol", "li",
      "blockquote", "code", "pre",
      "a", "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === "img") {
        const src = frame.attribs.src ?? "";
        return !IMG_SRC_PATTERN.test(src);
      }
      return false;
    },
  });
}

export function extractPreview(html: string, maxChars = 150): string {
  const stripped = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  const decoded = stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const collapsed = decoded.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  return collapsed.slice(0, maxChars).trimEnd() + "…";
}

export function parseImageIds(html: string): number[] {
  const ids = new Set<number>();
  const re = /\/api\/announcements\/images\/(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    ids.add(Number(m[1]));
  }
  return Array.from(ids);
}
