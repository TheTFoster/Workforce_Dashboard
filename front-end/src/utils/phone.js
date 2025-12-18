// src/utils/phone.js
export function formatPhone(raw) {
  if (!raw || String(raw).trim() === "") {
    return { text: "No Number Entered.", href: null };
  }

  // Split multiple numbers by common separators
  const parts = String(raw)
    .split(/[;,/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pretty = [];
  const hrefs = [];

  for (const part of parts) {
    // Find extension e.g., "x1234", "ext 1234", "ext. 1234"
    const extMatch = part.match(/(?:ext\.?|x)\s*:?\.?\s*(\d{1,6})\s*$/i);
    const ext = extMatch ? extMatch[1] : null;

    const digits = part.replace(/\D/g, "");
    let area = "", pre = "", line = "";

    if (digits.length === 11 && digits.startsWith("1")) {
      // 1 + 10 digits (US)
      area = digits.slice(1, 4);
      pre  = digits.slice(4, 7);
      line = digits.slice(7);
    } else if (digits.length === 10) {
      area = digits.slice(0, 3);
      pre  = digits.slice(3, 6);
      line = digits.slice(6);
    } else if (digits.length === 7) {
      // 7-digit local
      pre  = digits.slice(0, 3);
      line = digits.slice(3);
    } else {
      // Unknown pattern: show as-is, no tel link
      pretty.push(part);
      hrefs.push(null);
      continue;
    }

    const text = area ? `(${area}) ${pre}-${line}` : `${pre}-${line}`;
    const href = `tel:+1${area ? area + pre + line : pre + line}${ext ? `,${ext}` : ""}`;

    pretty.push(ext ? `${text} x${ext}` : text);
    hrefs.push(href);
  }

  return {
    text: pretty.join(" • "),
    href: hrefs.find(Boolean) || null, // first callable number
  };
}
