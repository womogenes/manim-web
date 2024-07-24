import { ORIGIN, OUT } from '../constants';
import { enumerate, range } from './array';
import { Color } from './color';
import { choose } from './math_functions.ts';
import { MArray } from './space_ops';
import { Tuple2 } from './tuple.ts';
import { Vector3 } from './vector';

export function interpolateColorList(
  a: Color[],
  b: Color[],
  alpha: number
): Color[] {
  if (a.length !== b.length) {
    throw new Error('Color lists must have the same length');
  }
  const arrayA = new MArray(a.map((color) => color.toArray()));
  const arrayB = new MArray(b.map((color) => color.toArray()));

  const interpolatedArray = interpolate(arrayA, arrayB, alpha);

  return interpolatedArray
    .getValues()
    .map((row) => new Color(row[0], row[1], row[2], row[3]));
}

export function interpolate<T>(a: T, b: T, alpha: number): T {
  if (typeof a === 'number' && typeof b === 'number') {
    return (a * (1 - alpha) + b * alpha) as T;
  } else if (a instanceof Vector3 && b instanceof Vector3) {
    return Vector3.prototype.lerp.call(a, b, alpha) as T;
  } else if (a instanceof Color && b instanceof Color) {
    return Color.prototype.lerp.call(a, b, alpha) as T;
  } else if (a instanceof MArray && b instanceof MArray) {
    return a.lerp(b, alpha) as T;
  } else if (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((item) => item instanceof Vector3) &&
    b.every((item) => item instanceof Vector3)
  ) {
    return a.map((item, index) =>
      Vector3.prototype.lerp.call(item, b[index], alpha)
    ) as T;
  } else {
    throw new Error('Unsupported types for interpolation');
  }
}

export function interpolateValue<T>(a: T, b: T, alpha: number): T {
  return ((a as any) * (1 - alpha) + (b as any) * alpha) as T;
}

export function integerInterpolate(
  start: number,
  end: number,
  alpha: number
): Tuple2<number, number> {
  if (alpha >= 1) {
    return new Tuple2(end - 1, 1.0);
  }

  if (alpha <= 0) {
    return new Tuple2(start, 0);
  }

  const value = Math.floor(interpolate(start, end, alpha));
  const residue = ((end - start) * alpha) % 1;

  return new Tuple2(value, residue);
}

export function bezier(points: Vector3[]): (t: number) => Vector3 {
  const n = points.length - 1;

  return (t: number): Vector3 => {
    return points.reduce((sum, point, k) => {
      const coefficient =
        Math.pow(1 - t, n - k) * Math.pow(t, k) * choose(n, k);
      return sum.add(point.scale(coefficient));
    }, new Vector3(0, 0, 0));
  };
}

export function partialBezierPoints(
  points: Vector3[],
  a: number,
  b: number
): Vector3[] {
  if (a === 1) {
    return Array(points.length).fill(points[points.length - 1]);
  }

  const aTo1 = range(0, points.length).map((i) => bezier(points.slice(i))(a));

  const endProp = (b - a) / (1.0 - a);

  return range(0, points.length).map((n) =>
    bezier(aTo1.slice(0, n + 1))(endProp)
  );
}

export function getSmoothHandlePoints(
  points: Vector3[]
): [Vector3[], Vector3[]] {
  const numHandles = points.length - 1;

  if (numHandles < 1) {
    return [[ORIGIN], [ORIGIN]];
  }

  const l = 2;
  const u = 1;

  const diag = MArray.zeros({ shape: new Tuple2(l + u + 1, 2 * numHandles) });

  const setVal = (
    value: number,
    col: number,
    {
      start = 0,
      end = 2 * numHandles,
      step = 1,
    }: { start?: number; end?: number; step?: number } = {}
  ) => {
    for (let i = start; i < end; i += step) {
      diag.setValue(new Tuple2(col, i), value);
    }
  };

  setVal(-1, 0, { start: 1, step: 2 });
  setVal(1, 0, { start: 2, step: 2 });
  setVal(2, 1, { start: 0, step: 2 });
  setVal(1, 1, { start: 1, step: 2 });
  setVal(-2, 2, { start: 1, end: 2 * numHandles - 2, step: 2 });
  setVal(1, 3, { start: 0, end: 2 * numHandles - 3, step: 2 });
  diag.setValue(new Tuple2(2, -2), -1);
  diag.setValue(new Tuple2(1, -1), 2);

  const b = MArray.zeros({ shape: new Tuple2(2 * numHandles, 3) });
  const pointsWithoutFirst = points.slice(1);

  for (const [i, j] of enumerate(range(1, 2 * numHandles, 2))) {
    for (let k = 0; k < 3; k++) {
      b.setValue(new Tuple2(j, k), 2 * pointsWithoutFirst[i].getComponent(k));
    }
  }

  for (let k = 0; k < 3; k++) {
    b.setValue(new Tuple2(0, k), points[0].getComponent(k));
    b.setValue(
      new Tuple2(2 * numHandles - 1, k),
      points[points.length - 1].getComponent(k)
    );
  }

  const useClosedSolveFunction = isClosed(points);
  const handlePairs = MArray.zeros({ shape: new Tuple2(2 * numHandles, 3) });

  if (useClosedSolveFunction) {
    const matrix = diagToMatrix(new Tuple2(l, u), diag);
    [
      [0, 1, -2, -1],
      [2, -1, 1, -2],
    ].forEach((row, i) => {
      const k = (-1 + matrix.shape.item1) % matrix.shape.item1;
      const j = row[0] % matrix.shape.item2;
      matrix.setValue(new Tuple2(k, j), row[1]);
    });

    matrix.setRow(
      0,
      Array(matrix.shape.item2)
        .fill(0)
        .map((_, i) => (i === 0 || i === matrix.shape.item2 - 1 ? 1 : 0))
    );

    b.setRow(0, points[0].scale(2).toArray());
    b.setRow(b.shape.item1 - 1, ORIGIN.toArray());

    for (let i = 0; i < 3; i++) {
      handlePairs.setColumn(i, matrix.getInverse().matMul(b).flat());
    }
  } else {
    for (let i = 0; i < 3; i++) {
      handlePairs.setColumn(i, diag.getInverse().matMul(b).flat());
    }
  }

  const handlePairsVectors = handlePairs
    .getValues()
    .map((line) => new Vector3(line[0], line[1], line[2]));

  const even = handlePairsVectors.filter((_, i) => i % 2 === 0);
  const odd = handlePairsVectors.filter((_, i) => i % 2 === 1);

  return [even, odd];
}

export function isClosed(points: Vector3[], tolerance: number = 1e-6): boolean {
  return (
    points[0].subtract(points[points.length - 1]).normSquared() <=
    tolerance * tolerance
  );
}

export function diagToMatrix(
  lAndU: Tuple2<number, number>,
  diag: MArray
): MArray {
  const [l, u] = lAndU.toArray();
  const dim = 3;
  const matrix = MArray.zeros({ shape: new Tuple2(dim, dim) });

  for (let i = 0; i < l + u + 1; i++) {
    const partialMatrixValues = matrix
      .getValues()
      .slice(Math.max(0, i - u))
      .map((line) => line.slice(Math.max(u - i, 0)));
    const partialMatrix = new MArray(partialMatrixValues);
    const partialDiagValues = diag.getRow(i).slice(Math.max(0, u - i));
    const partialDiagMatrix = fillDiagonalWithValues(
      partialMatrix,
      partialDiagValues
    );

    for (let k = 0; k < matrix.shape.item1; k++) {
      for (let j = 0; j < matrix.shape.item2; j++) {
        if (k >= Math.max(0, i - u) && j >= Math.max(0, u - i)) {
          matrix.setValue(
            new Tuple2(k, j),
            partialDiagMatrix.getValue(
              new Tuple2(k - Math.max(0, i - u), j - Math.max(0, u - i))
            )
          );
        }
      }
    }
  }

  return matrix;
}

export function fillDiagonal(mat: MArray, val: number): MArray {
  return mat.map((v, pos) => (pos.item1 === pos.item2 ? val : v));
}

export function fillDiagonalWithValues(mat: MArray, values: number[]): MArray {
  return mat.map((v, pos) => (pos.item1 === pos.item2 ? values[pos.item1] : v));
}
