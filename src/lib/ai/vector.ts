/**
 * Keluaran embedding berdimensi terpotong tidak ternormalisasi (norma L2 ~0,70
 * pada 1536 dimensi). Normalisasi membuat kosinus setara hasil kali titik dan
 * mencegah kekeliruan bila kelak dipakai operator jarak lain.
 *
 * @format
 */

export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}

export function vectorNorm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}
