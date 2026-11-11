export function parseWebUrl(input: string): URL | null {
  if (input.length > 2048 || /[\u0000-\u001f\u007f]/u.test(input)) return null;

  try {
    const url = new URL(input.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function googleSearch(query: string): string | null {
  const term = query.trim().toWellFormed();
  return term ? `https://www.google.com/search?q=${encodeURIComponent(term)}` : null;
}
