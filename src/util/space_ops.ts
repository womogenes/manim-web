import { Complex } from './complex';
import { Vector3 } from './vector';
import { RIGHT, TAU } from '../constants';
import { range, enumerate, listEqual } from './array';
import { Tuple2 } from './tuple';

export class MArray {
  values: number[][];
  shape: Tuple2<number, number>;

  constructor({
    values,
    shape,
  }: {
    values: number[][];
    shape?: Tuple2<number, number>;
  }) {
    this.values = values;
    this.shape =
      shape ||
      new Tuple2(values.length, values.length > 0 ? values[0].length : 0);

    // assert the values list has the correct shape
    if (!values.every((line) => line.length === this.shape.item2)) {
      throw new Error('Values do not match the specified shape');
    }
  }

  getValues(): number[][] {
    return this.values.map((row) => [...row]);
  }

  static fromVectorList(list: Vector3[]): MArray {
    return new MArray({
      values: list.map((vec) => vec.toArray()),
      shape: new Tuple2(list.length, 3),
    });
  }

  static fromValue(val: number, shape: Tuple2<number, number>): MArray {
    const m = shape.item1;
    const n = shape.item2;

    const values = Array(m)
      .fill(0)
      .map(() => Array(n).fill(val));

    return new MArray({ values, shape });
  }

  add(other: MArray | number): MArray {
    const otherArray =
      typeof other === 'number' ? MArray.fromValue(other, this.shape) : other;

    if (!listEqual(this.shape.toArray(), otherArray.shape.toArray())) {
      throw new Error('Shapes must be equal for addition');
    }

    return this.map((value, pos) => value + otherArray.getValue(pos));
  }

  subtract(other: MArray | number): MArray {
    const otherArray =
      typeof other === 'number' ? MArray.fromValue(other, this.shape) : other;

    if (!listEqual(this.shape.toArray(), otherArray.shape.toArray())) {
      throw new Error('Shapes must be equal for subtraction');
    }

    return this.map((value, pos) => value - otherArray.getValue(pos));
  }

  multiply(other: MArray | number): MArray {
    const otherArray =
      typeof other === 'number' ? MArray.fromValue(other, this.shape) : other;

    if (!listEqual(this.shape.toArray(), otherArray.shape.toArray())) {
      throw new Error('Shapes must be equal for multiplication');
    }

    return this.map((value, pos) => value * otherArray.getValue(pos));
  }

  divide(other: MArray | number): MArray {
    const otherArray =
      typeof other === 'number' ? MArray.fromValue(other, this.shape) : other;

    if (!listEqual(this.shape.toArray(), otherArray.shape.toArray())) {
      throw new Error('Shapes must be equal for division');
    }

    return this.map((value, pos) => value / otherArray.getValue(pos));
  }

  getValue(ij: Tuple2<number, number>): number {
    const i = ij.item1;
    const j = ij.item2;

    return this.values[i][j];
  }

  setValue(ij: Tuple2<number, number>, value: number): void {
    const i = ij.item1 % this.shape.item1;
    const j = ij.item2 % this.shape.item2;

    this.values[i][j] = value;
  }

  map(
    mappingFunc: (value: number, pos: Tuple2<number, number>) => number
  ): MArray {
    const newValues = this.values.map((row, i) =>
      row.map((value, j) => mappingFunc(value, new Tuple2(i, j)))
    );

    return new MArray({ values: newValues, shape: this.shape });
  }

  matMul(other: MArray): MArray {
    if (this.shape.item2 !== other.shape.item1) {
      throw new Error('Incompatible matrix dimensions for multiplication');
    }

    const m = this.shape.item1;
    const n = this.shape.item2;
    const p = other.shape.item2;

    const shape = new Tuple2(m, p);
    const mat = MArray.zeros({ shape });

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < n; k++) {
          mat.values[i][j] += this.values[i][k] * other.values[k][j];
        }
      }
    }

    return mat;
  }

  static zeros({ shape }: { shape: Tuple2<number, number> }): MArray {
    return MArray.fromValue(0, shape);
  }

  static ones({ shape }: { shape: Tuple2<number, number> }): MArray {
    return MArray.fromValue(1, shape);
  }

  static identity(size: number): MArray {
    const values = Array(size)
      .fill(0)
      .map((_, i) =>
        Array(size)
          .fill(0)
          .map((_, j) => (i === j ? 1 : 0))
      );
    const shape = new Tuple2(size, size);
    return new MArray({ values, shape });
  }

  static nonSquareIdentity({
    shape,
  }: {
    shape: Tuple2<number, number>;
  }): MArray {
    const m = shape.item1;
    const n = shape.item2;

    const values = Array(m)
      .fill(0)
      .map((_, i) =>
        Array(n)
          .fill(0)
          .map((_, j) => (i === j ? 1 : 0))
      );
    return new MArray({ values });
  }

  static empty(): MArray {
    return MArray.zeros({ shape: new Tuple2(0, 0) });
  }

  copy(): MArray {
    return this.map((a) => a);
  }

  applyFunction(func: (a: number) => number): MArray {
    return this.map((val) => func(val));
  }

  sign(): MArray {
    return this.applyFunction((v) => Math.sign(v));
  }

  abs(): MArray {
    return this.applyFunction((v) => Math.abs(v));
  }

  flat(): number[] {
    return this.values.flat();
  }

  toString(precision: number = 6): string {
    const header = `${this.shape.item1}x${this.shape.item2} matrix`;
    const maxPrecision = Math.max(
      ...this.values.flat().map((entry) => entry.toFixed(precision).length)
    );

    const minPadding = 4;
    const indent = '      ';
    let content = '';
    for (const line of this.values) {
      content += indent;
      for (const value of line) {
        const negPrev = value < 0 ? '-' : ' ';
        const spaceCount =
          maxPrecision + minPadding - Math.abs(value).toFixed(precision).length;
        const spaces = ' '.repeat(spaceCount);
        content += negPrev;
        content += Math.abs(value).toFixed(precision);
        content += spaces;
      }
      content += '\n';
    }

    return `${header}\n${content}`;
  }

  reshape(m: number, n: number): MArray {
    const flatten = this.flat();
    if (flatten.length !== m * n) {
      throw new Error('Cannot reshape array to specified dimensions');
    }
    const array = MArray.fromValue(0, new Tuple2(m, n));

    for (const [k, val] of enumerate(flatten)) {
      const i = k % m;
      const j = Math.floor(k / m);

      array.values[i][j] = val;
    }

    return array;
  }

  getDeterminant(): number {
    if (this.shape.item1 !== this.shape.item2) {
      throw new Error('Matrix must be square to calculate determinant');
    }

    if (this.shape.item1 === 2) {
      const [[a, b], [c, d]] = this.values;
      return a * d - b * c;
    }

    const subshape = new Tuple2(this.shape.item1 - 1, this.shape.item2 - 1);

    return this.values[0].reduce((sum, value, i) => {
      const subMatrix = this._subMatrix(0, i);
      const cofactor = (i % 2 === 0 ? 1 : -1) * value;
      return sum + cofactor * subMatrix.getDeterminant();
    }, 0);
  }

  getInverse(): MArray {
    if (this.shape.item1 !== this.shape.item2) {
      throw new Error('Matrix must be square to calculate inverse');
    }

    const det = this.getDeterminant();
    if (det === 0) {
      throw new Error('This matrix is not invertible');
    }

    const m = this.shape.item1;
    const n = this.shape.item2;

    const A = this.copy();
    const I = MArray.identity(m);

    for (let j = 0; j < n; j++) {
      let i0 = -1;
      let v0 = -1;

      for (let i = j; i < m; i++) {
        const k = A.getValue(new Tuple2(i, j));
        if (k > v0) {
          i0 = i;
          v0 = k;
        }
      }

      const Aj = A.getRow(i0);
      A.values[i0] = A.values[j];
      A.values[j] = Aj;
      const Ij = I.getRow(i0);
      I.values[i0] = I.values[j];
      I.values[j] = Ij;

      const x = Aj[j];

      for (let k = j; k < n; k++) {
        Aj[k] /= x;
      }
      for (let k = n - 1; k >= 0; k--) {
        Ij[k] /= x;
      }
      for (let i = m - 1; i >= 0; i--) {
        if (i !== j) {
          const Ai = A.values[i];
          const Ii = I.values[i];
          const x = Ai[j];

          for (let k = j + 1; k < n; k++) {
            Ai[k] -= Aj[k] * x;
          }
          for (let k = n - 1; k >= 0; k--) {
            Ii[k] -= Ij[k] * x;
          }
        }
      }
    }

    return I;
  }

  getRow(i: number): number[] {
    return [...this.values[i]];
  }

  getColumn(j: number): number[] {
    return this.values.map((row) => row[j]);
  }

  setRow(i: number, row: number[]): void {
    this.values[i] = [...row];
  }

  setColumn(j: number, col: number[]): void {
    for (let i = 0; i < this.shape.item1; i++) {
      this.values[i][j] = col[i];
    }
  }

  private _subMatrix(i: number, j: number): MArray {
    const shape = new Tuple2(this.shape.item1 - 1, this.shape.item2 - 1);
    const values = this.values
      .filter((_, index) => index !== i)
      .map((row) => row.filter((_, index) => index !== j));

    return new MArray({ values, shape });
  }

  transpose(): MArray {
    const newValues = this.values[0].map((_, colIndex) =>
      this.values.map((row) => row[colIndex])
    );
    return new MArray({ values: newValues });
  }

  getColumnAsVector(j: number): Vector3 {
    const column = this.getColumn(j);
    return new Vector3(column[0], column[1], column[2] || 0);
  }

  getRowAsVector(i: number): Vector3 {
    const row = this.getRow(i);
    return new Vector3(row[0], row[1], row[2] || 0);
  }

  setColumnAsVector(j: number, vector: Vector3): void {
    this.setColumn(j, vector.toArray());
  }

  setRowAsVector(i: number, vector: Vector3): void {
    this.setRow(i, vector.toArray());
  }

  dot(other: MArray): number {
    if (this.shape.item2 !== 1 || other.shape.item2 !== 1) {
      throw new Error('Dot product is only defined for column vectors');
    }
    return this.transpose().matMul(other).getValue(new Tuple2(0, 0));
  }

  cross(other: MArray): MArray {
    if (
      this.shape.item1 !== 3 ||
      other.shape.item1 !== 3 ||
      this.shape.item2 !== 1 ||
      other.shape.item2 !== 1
    ) {
      throw new Error('Cross product is only defined for 3D column vectors');
    }
    const a = this.flat();
    const b = other.flat();
    return new MArray({
      values: [
        [a[1] * b[2] - a[2] * b[1]],
        [a[2] * b[0] - a[0] * b[2]],
        [a[0] * b[1] - a[1] * b[0]],
      ],
    });
  }

  norm(): number {
    return Math.sqrt(this.normSquared());
  }

  normSquared(): number {
    return this.flat().reduce((sum, val) => sum + val * val, 0);
  }

  normalize(): MArray {
    const n = this.norm();
    return this.divide(n);
  }

  applyComplexFunction(func: (z: Complex) => Complex): MArray {
    return this.map((val) => {
      const z = new Complex(val);
      const result = func(z);
      return result.real;
    });
  }

  toVector(): Vector3 {
    if (
      this.shape.item2 !== 1 ||
      (this.shape.item1 !== 2 && this.shape.item1 !== 3)
    ) {
      throw new Error('Cannot convert to Vector3: matrix must be 2x1 or 3x1');
    }
    const [x, y, z = 0] = this.flat();
    return new Vector3(x, y, z);
  }

  toComplex(): Complex {
    if (this.shape.item1 !== 2 || this.shape.item2 !== 1) {
      throw new Error('Cannot convert to Complex: matrix must be 2x1');
    }
    const [real, imaginary] = this.flat();
    return new Complex(real, imaginary);
  }

  toQuaternion(): MArray {
    if (this.shape.item1 !== 4 || this.shape.item2 !== 1) {
      throw new Error('Cannot convert to Quaternion: matrix must be 4x1');
    }
    const [x, y, z, w] = this.flat();
    return new MArray({ values: [[x], [y], [z], [w]] });
  }

  lerp(other: MArray, alpha: number): MArray {
    if (!this.shape.equals(other.shape)) {
      throw new Error('Matrices must have the same shape for lerp');
    }

    return this.map((value, pos) => {
      const otherValue = other.getValue(pos);
      return value + (otherValue - value) * alpha;
    });
  }
}

export function rotationMatrix(angle: number, axis: Vector3): MArray {
  const aboutZ = rotationAboutZ(angle);
  const zToAxis = zToVector(axis);
  const axisToZ = zToAxis.getInverse();
  return [zToAxis, aboutZ, axisToZ].reduce((acc, elem) => acc.matMul(elem));
}

export function rotationAboutZ(angle: number): MArray {
  return new MArray({
    values: [
      [Math.cos(angle), -Math.sin(angle), 0],
      [Math.sin(angle), Math.cos(angle), 0],
      [0, 0, 1],
    ],
  });
}

export function zToVector(vector: Vector3): MArray {
  if (vector.normSquared() === 0) {
    return MArray.identity(3);
  }

  const v = vector.normalize();
  const phi = Math.acos(v.z);
  let theta = 0;

  if (v.x !== 0 || v.y !== 0) {
    // projection of vector to unit circle
    const axisProj = v.withCoords({ z: 0 }).normalize();
    theta = Math.acos(axisProj.x);

    if (axisProj.y < 0) {
      theta *= -1;
    }
  }

  const phiDown = new MArray({
    values: [
      [Math.cos(phi), 0, Math.sin(phi)],
      [0, 1, 0],
      [-Math.sin(phi), 0, Math.cos(phi)],
    ],
  });

  return rotationAboutZ(theta).matMul(phiDown);
}

export function quaternionMultiplication(q1: MArray, q2: MArray): MArray {
  // Both q1 and q2 are represented as 4x1 column vectors
  if (
    !listEqual(q1.shape.toArray(), [4, 1]) ||
    !listEqual(q2.shape.toArray(), [4, 1])
  ) {
    throw new Error('Quaternions must be 4x1 column vectors');
  }

  const q1Values = q1.flat();
  const q2Values = q2.flat();
  const [x1, y1, z1, w1] = q1Values;
  const [x2, y2, z2, w2] = q2Values;

  return new MArray({
    values: [
      [w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2],
      [w1 * y2 + y1 * w2 + z1 * x2 - x1 * z2],
      [w1 * z2 + z1 * w2 + x1 * y2 - y1 * x2],
      [w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2],
    ],
  });
}

export function quaternionFromAngleAxis(angle: number, axis: Vector3): MArray {
  const v = axis.normalize().scale(Math.sin(angle / 2));

  return new MArray({
    values: [
      ...v.toArray().map((component) => [component]),
      [Math.cos(angle / 2)],
    ],
  });
}

export function quaternionConjugate(quat: MArray): MArray {
  if (!listEqual(quat.shape.toArray(), [4, 1])) {
    throw new Error('Quaternion must be a 4x1 column vector');
  }

  return quat.multiply(
    new MArray({
      values: [[-1], [-1], [-1], [1]],
    })
  );
}

export function compassDirections({
  numSides = 4,
  startVec = RIGHT,
}: { numSides?: number; startVec?: Vector3 } = {}): Vector3[] {
  const angle = TAU / numSides;

  const rootsOfUnity = range(0, numSides).map((k) =>
    Complex.exp({ angle: angle * k })
  );

  const complexResults = rootsOfUnity.map((u) =>
    u.multiply(new Complex(startVec.x, startVec.y))
  );

  return complexResults.map((c) => new Vector3(c.real, c.imaginary, 0));
}

export function lineIntersection(line1: Vector3[], line2: Vector3[]): Vector3 {
  const xDiff = [line1[0].x - line1[1].x, line2[0].x - line2[1].x];
  const yDiff = [line1[0].y - line1[1].y, line2[0].y - line2[1].y];

  const det = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];

  const div = det(xDiff, yDiff);

  if (div === 0) {
    throw new Error('Lines do not intersect');
  }

  const d = [
    det(line1[0].toArray(), line1[1].toArray()),
    det(line2[0].toArray(), line2[1].toArray()),
  ];

  const x = det(d, xDiff) / div;
  const y = det(d, yDiff) / div;

  return new Vector3(x, y, 0);
}
