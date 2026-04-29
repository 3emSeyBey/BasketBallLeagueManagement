import { describe, it, expect } from "vitest";
import { sanitizeBody, extractPreview, parseImageIds } from "@/lib/announcements";

describe("sanitizeBody", () => {
  it("strips script tags", () => {
    const out = sanitizeBody("<p>hi</p><script>alert(1)</script>");
    expect(out).not.toContain("script");
    expect(out).toContain("<p>hi</p>");
  });

  it("strips onerror handlers", () => {
    const out = sanitizeBody('<img src="/api/announcements/images/1" onerror="alert(1)">');
    expect(out).not.toContain("onerror");
  });

  it("preserves allowed tags", () => {
    const html = "<p><strong>bold</strong> <em>em</em></p><ul><li>a</li></ul>";
    expect(sanitizeBody(html)).toBe(html);
  });

  it("keeps img with allowed src pattern", () => {
    const out = sanitizeBody('<img src="/api/announcements/images/42" alt="x">');
    expect(out).toContain('src="/api/announcements/images/42"');
  });

  it("removes img with external src", () => {
    const out = sanitizeBody('<img src="https://evil.com/x.png">');
    expect(out).not.toContain("img");
    expect(out).not.toContain("evil.com");
  });

  it("removes img with relative-path traversal", () => {
    const out = sanitizeBody('<img src="/api/announcements/images/1/../../etc">');
    expect(out).not.toContain("etc");
  });

  it("forces a tag rel=noopener noreferrer + target=_blank", () => {
    const out = sanitizeBody('<a href="https://example.com">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it("rejects javascript: href", () => {
    const out = sanitizeBody('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });
});

describe("extractPreview", () => {
  it("strips html tags", () => {
    expect(extractPreview("<p>hello <strong>world</strong></p>")).toBe("hello world");
  });

  it("truncates with ellipsis", () => {
    const text = "a".repeat(200);
    const out = extractPreview(`<p>${text}</p>`, 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith("…")).toBe(true);
  });

  it("does not truncate short text", () => {
    expect(extractPreview("<p>short</p>", 150)).toBe("short");
  });

  it("collapses whitespace", () => {
    expect(extractPreview("<p>a   b\n\nc</p>")).toBe("a b c");
  });

  it("decodes entities", () => {
    expect(extractPreview("<p>a &amp; b</p>")).toBe("a & b");
  });
});

describe("parseImageIds", () => {
  it("extracts ids from img src", () => {
    const html = '<p><img src="/api/announcements/images/1"><img src="/api/announcements/images/42"></p>';
    expect(parseImageIds(html).sort()).toEqual([1, 42]);
  });

  it("dedupes ids", () => {
    const html = '<img src="/api/announcements/images/5"><img src="/api/announcements/images/5">';
    expect(parseImageIds(html)).toEqual([5]);
  });

  it("returns empty for no matches", () => {
    expect(parseImageIds("<p>no images</p>")).toEqual([]);
  });
});
