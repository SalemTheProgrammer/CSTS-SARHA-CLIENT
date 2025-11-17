import { MareeRow } from './graphique-types.util';

export function doDistance(latA: number, lngA: number, latB: number, lngB: number): number {
  if (latA === 0 || lngA === 0 || latB === 0 || lngB === 0) return 0;
  return (
    3440.0647948 *
    Math.acos(
      Math.cos(latA * (Math.PI / 180)) *
        Math.cos(latB * (Math.PI / 180)) *
        Math.cos(lngB * (Math.PI / 180) - lngA * (Math.PI / 180)) +
        Math.sin(latA * (Math.PI / 180)) * Math.sin(latB * (Math.PI / 180))
    )
  );
}

export function computeTotalDistance(data: MareeRow[]): number {
  let distance = 0;
  let prevRow: MareeRow | null = null;

  for (const row of data) {
    if (prevRow) {
      const val = doDistance(
        Number(prevRow.Latitude),
        Number(prevRow.Longitude),
        Number(row.Latitude),
        Number(row.Longitude)
      );
      distance += val || 0;
    }
    if (Number(row.Latitude) !== 0 && Number(row.Longitude) !== 0) {
      prevRow = row;
    }
  }

  return Math.round(distance * 1000) / 1000;
}
