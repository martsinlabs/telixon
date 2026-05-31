const REGIONAL_INDICATOR_OFFSET: number = 127397;

export function flagEmoji(regionCode: string): string {
  if (regionCode.length !== 2) return '';
  const first: number = REGIONAL_INDICATOR_OFFSET + regionCode.charCodeAt(0);
  const second: number = REGIONAL_INDICATOR_OFFSET + regionCode.charCodeAt(1);
  return String.fromCodePoint(first, second);
}
