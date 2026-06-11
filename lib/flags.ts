/**
 * Windows no renderiza los emojis de banderas, asi que los convertimos a una
 * imagen. Un emoji de bandera son dos "regional indicators" que representan el
 * codigo ISO-2 del pais (ej. 🇲🇽 = M + X = "MX"), del cual sacamos la URL en
 * flagcdn.
 */
export function emojiToIso(flag?: string | null): string | null {
  if (!flag) return null;
  const letters = Array.from(flag)
    .map((c) => c.codePointAt(0) ?? 0)
    .filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)
    .map((cp) => String.fromCharCode(cp - 0x1f1e6 + 0x41));
  return letters.length === 2 ? letters.join('').toLowerCase() : null;
}

export function flagImgUrl(flag?: string | null, height = 20): string | null {
  const iso = emojiToIso(flag);
  return iso ? `https://flagcdn.com/h${height}/${iso}.png` : null;
}
