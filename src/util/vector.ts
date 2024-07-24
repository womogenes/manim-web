import { MArray } from './space_ops';
import { Tuple2 } from './tuple';
import { OUT } from '../constants';
import { quaternionFromAngleAxis } from './space_ops';

export class Vector3 {
  constructor(public x: number, public y: number, public z: number) {}

  static fromValue(k: number): Vector3 {
    return new Vector3(k, k, k);
  }

  static fromArray(v: MArray): Vector3 {
    if (v.shape.item1 !== 3 || v.shape.item2 !== 1) {
      throw new Error('Array must be 3x1 to create Vector3');
    }
    const x = v.getValue(new Tuple2(0, 0));
    const y = v.getValue(new Tuple2(1, 0));
    const z = v.getValue(new Tuple2(2, 0));
    return new Vector3(x, y, z);
  }

  equals(other: Vector3): boolean {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }

  add(v: number | Vector3): Vector3 {
    if (typeof v === 'number') {
      return new Vector3(this.x + v, this.y + v, this.z + v);
    } else if (v instanceof Vector3) {
      return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    } else {
      throw new Error('Vector3 only supports addition by number or Vector3');
    }
  }

  subtract(v: number | Vector3 | null): Vector3 {
    if (typeof v === 'number') {
      return new Vector3(this.x - v, this.y - v, this.z - v);
    } else if (v instanceof Vector3) {
      return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    } else if (v === null) {
      return this.negate();
    } else {
      throw new Error('Vector3 only supports subtraction by number or Vector3');
    }
  }

  negate(): Vector3 {
    return this.scale(-1);
  }

  multiply(v: number | Vector3): Vector3 {
    if (typeof v === 'number') {
      return new Vector3(this.x * v, this.y * v, this.z * v);
    } else if (v instanceof Vector3) {
      return new Vector3(this.x * v.x, this.y * v.y, this.z * v.z);
    } else {
      throw new Error(
        'Vector3 only supports multiplication by number or Vector3'
      );
    }
  }

  divide(v: number | Vector3): Vector3 {
    if (typeof v === 'number') {
      return new Vector3(this.x / v, this.y / v, this.z / v);
    } else if (v instanceof Vector3) {
      return new Vector3(this.x / v.x, this.y / v.y, this.z / v.z);
    } else {
      throw new Error('Vector3 only supports division by number or Vector3');
    }
  }

  scale(k: number): Vector3 {
    return this.multiply(k);
  }

  normSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  norm(): number {
    return Math.sqrt(this.normSquared());
  }

  normalize(): Vector3 {
    return this.divide(this.norm());
  }

  copy(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  getComponent(i: number): number {
    switch (i) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      case 2:
        return this.z;
      default:
        throw new Error(`No component at index ${i} on a Vector3`);
    }
  }

  lerp(other: Vector3, t: number): Vector3 {
    return new Vector3(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t,
      this.z + (other.z - this.z) * t
    );
  }

  toArray(): number[] {
    return [this.x, this.y, this.z];
  }

  toMArray(row: boolean = false): MArray {
    if (row) {
      return new MArray([[this.x, this.y, this.z]]);
    } else {
      return new MArray([[this.x], [this.y], [this.z]]);
    }
  }

  get(i: number): number {
    return this.getComponent(i);
  }

  withCoords({ x, y, z }: { x?: number; y?: number; z?: number }): Vector3 {
    return new Vector3(
      x !== undefined ? x : this.x,
      y !== undefined ? y : this.y,
      z !== undefined ? z : this.z
    );
  }

  withComponent(index: number, value: number): Vector3 {
    if (index === 0) {
      return this.withCoords({ x: value });
    } else if (index === 1) {
      return this.withCoords({ y: value });
    } else if (index === 2) {
      return this.withCoords({ z: value });
    } else {
      throw new Error(`Cannot index a Vector3 with index=${index}`);
    }
  }

  matMul(matrix: MArray): Vector3 {
    const fullMatrix = MArray.identity(3);

    // get a 3x3 matrix from a 2x2 matrix
    const mappedMatrix = fullMatrix.map((identityValue, pos) =>
      pos.item1 >= matrix.shape.item1 || pos.item2 >= matrix.shape.item2
        ? identityValue
        : matrix.getValue(pos)
    );

    const columnVector = this.toMArray();
    const result = mappedMatrix.matMul(columnVector);
    return Vector3.fromArray(result);
  }

  dot(b: Vector3): number {
    return this.x * b.x + this.y * b.y + this.z * b.z;
  }

  cross(b: Vector3): Vector3 {
    return new Vector3(
      this.y * b.z - this.z * b.y,
      this.z * b.x - this.x * b.z,
      this.x * b.y - this.y * b.x
    );
  }

  applyFunction(func: (n: number) => number): Vector3 {
    return new Vector3(func(this.x), func(this.y), func(this.z));
  }

  sign(): Vector3 {
    return this.applyFunction(Math.sign);
  }

  abs(): Vector3 {
    return this.applyFunction(Math.abs);
  }

  angle(): number {
    if (this.x === 0 && this.y === 0) {
      return 0;
    }
    return Math.atan2(this.y, this.x);
  }

  angleBetween(vec: Vector3): number {
    const dotProduct = this.dot(vec);
    const cosAngle = dotProduct / (vec.norm() * this.norm());

    if (isFinite(cosAngle)) {
      return Math.acos(cosAngle);
    } else {
      return 0;
    }
  }

  rotate(angle: number, axis: Vector3 = OUT): Vector3 {
    const quat = quaternionFromAngleAxis(angle, axis);
    return this.applyQuaternion(quat);
  }

  applyQuaternion(quat: MArray): Vector3 {
    if (!quat.shape.equals(new Tuple2(4, 1))) {
      throw new Error('Quaternion must be a 4x1 array');
    }

    const quatValues = quat.getColumn(0);
    const [qx, qy, qz, qw] = quatValues;

    const ix = qw * this.x + qy * this.z - qz * this.y;
    const iy = qw * this.y + qz * this.x - qx * this.z;
    const iz = qw * this.z + qx * this.y - qy * this.x;
    const iw = -qx * this.x - qy * this.y - qz * this.z;

    return new Vector3(
      ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx
    );
  }

  toString(): string {
    return `vec3(${this.x}, ${this.y}, ${this.z})`;
  }

  isFinite(): boolean {
    return isFinite(this.x) && isFinite(this.y) && isFinite(this.z);
  }

  isInfinite(): boolean {
    return !isFinite(this.x) || !isFinite(this.y) || !isFinite(this.z);
  }

  isNaN(): boolean {
    return isNaN(this.x) || isNaN(this.y) || isNaN(this.z);
  }
}
