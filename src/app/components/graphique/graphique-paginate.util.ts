import { MareeRow } from './graphique-types.util';

export async function paginate(arr: MareeRow[], size: number): Promise<MareeRow[][]> {
  return arr.reduce((acc: MareeRow[][], val: MareeRow, i: number) => {
    const idx = Math.floor(i / size);
    const page = acc[idx] || (acc[idx] = []);
    page.push(val);
    return acc;
  }, []);
}
