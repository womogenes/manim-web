import { Vector3 } from './vector';
import { linspace } from './array';
import { interpolate } from './bezier';

export class Color {
  constructor(
    public r: number = 0.0,
    public g: number = 0.0,
    public b: number = 0.0,
    public a: number = 1.0
  ) {}

  static Gray(gray: number, a: number = 1.0): Color {
    return new Color(gray, gray, gray, a);
  }

  static FromHSV(
    h: number = 0.0,
    s: number = 0.0,
    v: number = 0.0,
    a: number = 1.0
  ): Color {
    return colorFromHSV(h, s, v).withTransparency(a);
  }

  static FromHex(hex: string): Color {
    return colorFromHex(hex);
  }

  withTransparency(a: number): Color {
    return new Color(this.r, this.g, this.b, a);
  }

  add(v: number | Color): Color {
    if (typeof v === 'number') {
      return new Color(this.r + v, this.g + v, this.b + v, this.a);
    } else if (v instanceof Color) {
      return new Color(this.r + v.r, this.g + v.g, this.b + v.b, this.a);
    } else {
      throw new Error('Color only supports addition by number or Color');
    }
  }

  subtract(v: number | Color): Color {
    if (typeof v === 'number') {
      return new Color(this.r - v, this.g - v, this.b - v, this.a);
    } else if (v instanceof Color) {
      return new Color(this.r - v.r, this.g - v.g, this.b - v.b, this.a);
    } else {
      throw new Error('Color only supports subtraction by number or Color');
    }
  }

  multiply(v: number | Color): Color {
    if (typeof v === 'number') {
      return new Color(this.r * v, this.g * v, this.b * v, this.a);
    } else if (v instanceof Color) {
      return new Color(this.r * v.r, this.g * v.g, this.b * v.b, this.a);
    } else {
      throw new Error('Color only supports multiplication by number or Color');
    }
  }

  divide(v: number | Color): Color {
    if (typeof v === 'number') {
      return new Color(this.r / v, this.g / v, this.b / v, this.a);
    } else if (v instanceof Color) {
      return new Color(this.r / v.r, this.g / v.g, this.b / v.b, this.a);
    } else {
      throw new Error('Color only supports division by number or Color');
    }
  }

  copy(): Color {
    return new Color(this.r, this.g, this.b, this.a);
  }

  withValues({
    r,
    g,
    b,
    a,
  }: {
    r?: number;
    g?: number;
    b?: number;
    a?: number;
  }): Color {
    return new Color(
      r !== undefined ? r : this.r,
      g !== undefined ? g : this.g,
      b !== undefined ? b : this.b,
      a !== undefined ? a : this.a
    );
  }

  toArray(withAlpha: boolean = true): number[] {
    return withAlpha
      ? [this.r, this.g, this.b, this.a]
      : [this.r, this.g, this.b];
  }

  toIntRGBA(): number[] {
    return this.toArray().map((comp) => Math.round(comp * 255));
  }

  toIntRGB(): number[] {
    return this.toArray(false).map((comp) => Math.round(comp * 255));
  }

  toRGBString(): string {
    const [r, g, b] = this.toIntRGB();
    return `rgb(${r}, ${g}, ${b})`;
  }

  toRGBAString(): string {
    const [r, g, b] = this.toIntRGB();
    return `rgba(${r}, ${g}, ${b}, ${this.a})`;
  }

  toHSV(): number[] {
    const rgb = this.toIntRGB();
    const max = Math.max(...rgb);
    const min = Math.min(...rgb);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max / 255;

    const [r, g, b] = rgb;

    if (max === min) {
      h = 0;
    } else if (max === r) {
      h = (g - b + d * (g < b ? 6 : 0)) / (6 * d);
    } else if (max === g) {
      h = (b - r + d * 2) / (6 * d);
    } else if (max === b) {
      h = (r - g + d * 4) / (6 * d);
    }

    return [h, s, v];
  }

  toIntHSV(): number[] {
    return this.toHSV().map((c) => Math.round(c * 255));
  }

  invertAndPreserve(): Color {
    const [h, s, v] = this.toHSV();
    return Color.FromHSV(h, s, 1 - v);
  }

  toString(): string {
    return this.toRGBAString();
  }

  lerp(other: Color, alpha: number): Color {
    const r = interpolate(this.r, other.r, alpha);
    const g = interpolate(this.g, other.g, alpha);
    const b = interpolate(this.b, other.b, alpha);
    const a = interpolate(this.a, other.a, alpha);
    return new Color(r, g, b, a);
  }
}

export function colorGradient(
  referenceColors: Color[],
  outputLength: number
): Color[] {
  if (outputLength === 0) {
    return [];
  }

  const alphas = linspace({
    start: 0,
    end: referenceColors.length - 1,
    count: outputLength,
  }).getColumn(0);

  const floors = alphas.map(Math.floor);
  const mod1 = alphas.map((a) => a % 1);

  mod1[mod1.length - 1] = 1;
  floors[floors.length - 1] = referenceColors.length - 2;

  return floors.map((floor, index) =>
    interpolate(referenceColors[floor], referenceColors[floor + 1], mod1[index])
  );
}

function colorFromHSV(h: number, s: number, v: number): Color {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      return new Color(v, t, p);
    case 1:
      return new Color(q, v, p);
    case 2:
      return new Color(p, v, t);
    case 3:
      return new Color(p, q, v);
    case 4:
      return new Color(t, p, v);
    case 5:
      return new Color(v, p, q);
    default:
      throw new Error('HSV values must be between 0 and 1');
  }
}

function colorFromHex(hex: string): Color {
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }

  const possibleLengths = [3, 4, 6, 8];

  if (!possibleLengths.includes(hex.length)) {
    throw new Error(`Hex string #${hex} not well formatted`);
  }

  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (hex.length === 6) {
    hex += 'ff';
  }

  const getComponent = (part: string) => parseInt(part, 16) / 255;

  const r = getComponent(hex.substring(0, 2));
  const g = getComponent(hex.substring(2, 4));
  const b = getComponent(hex.substring(4, 6));
  const a = getComponent(hex.substring(6, 8));

  return new Color(r, g, b, a);
}
