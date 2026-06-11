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

// flagcdn solo sirve alturas predefinidas; pedir una altura arbitraria (ej.
// h18) devuelve 404 y la bandera no se ve. Redondeamos a la altura valida mas
// cercana hacia arriba.
const FLAGCDN_HEIGHTS = [20, 24, 40, 60, 80, 120, 240];

export function flagImgUrl(flag?: string | null, height = 20): string | null {
  const iso = emojiToIso(flag);
  if (!iso) return null;
  const h = FLAGCDN_HEIGHTS.find((x) => x >= height) ?? 240;
  return `https://flagcdn.com/h${h}/${iso}.png`;
}
