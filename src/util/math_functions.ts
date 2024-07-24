import { range } from './array';

export function clip(val: number, lower: number, upper: number): number {
  return Math.min(upper, Math.max(val, lower));
}

const chooseCache: { [n: number]: { [r: number]: number } } = {};

function chooseCached(n: number, r: number): number {
  if (!(n in chooseCache)) {
    chooseCache[n] = {};
  }

  if (!(r in chooseCache[n])) {
    chooseCache[n][r] = choose(n, r, false);
  }

  return chooseCache[n][r];
}

export function choose(n: number, r: number, useCache: boolean = true): number {
  if (useCache) {
    return chooseCached(n, r);
  }

  if (n < r) {
    return 0;
  }

  if (r === 0) {
    return 1;
  }

  const denom = range(1, r + 1).reduce((a, b) => a * b, 1);
  const numer = range(n, n - r, -1).reduce((a, b) => a * b, 1);

  return Math.floor(numer / denom);
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function mapValue(
  value: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number
): number {
  return ((value - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
}

export function log(x: number, base: number = Math.E): number {
  return Math.log(x) / Math.log(base);
}

export function log10(x: number): number {
  return Math.log10(x);
}

export function log2(x: number): number {
  return Math.log2(x);
}

export function ln(x: number): number {
  return Math.log(x);
}
