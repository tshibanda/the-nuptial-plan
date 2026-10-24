export function isPremiumTabDataEnabled(
  weddingId: number | null | undefined,
  isPremium: boolean,
): boolean {
  return isPremium && typeof weddingId === 'number' && weddingId > 0;
}
