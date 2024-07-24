export type RateFunc = (t: number) => number;

export function linear(t: number): number {
  return t;
}

export function smooth(t: number): number {
  const s = 1 - t;
  return t * t * t * (10 * s * s + 5 * s * t + t * t);
}

export function doubleSmooth(t: number): number {
  return t < 0.5 ? smooth(2 * t) / 2 : (smooth(2 * t - 1) + 1) / 2;
}

export function invertRateFunc(f: RateFunc): RateFunc {
  return (t: number) => f(1 - t);
}

export function thereAndBack(t: number): number {
  return t < 0.5 ? smooth(2 * t) : smooth(2 * (1 - t));
}
