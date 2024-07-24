import { Vector3 } from './vector';
import { OUT, PI } from '../constants';
import { interpolate } from './bezier';
import { rotationMatrix } from './space_ops';
import { MArray } from './space_ops';

type PathFunc = (a: Vector3[], b: Vector3[], alpha: number) => Vector3[];

function straightPath(a: Vector3[], b: Vector3[], alpha: number): Vector3[] {
  const arrayA = new MArray(a.map((v) => v.toArray()));
  const arrayB = new MArray(b.map((v) => v.toArray()));
  const interpolatedArray = interpolate(arrayA, arrayB, alpha);
  return interpolatedArray
    .getValues()
    .map((row) => new Vector3(row[0], row[1], row[2]));
}

const STRAIGHT_PATH_THRESHOLD = 0.01;

function pathAlongArc(angle: number, axis: Vector3 = OUT): PathFunc {
  if (Math.abs(angle) <= STRAIGHT_PATH_THRESHOLD) {
    return straightPath;
  }

  if (axis.normSquared() === 0) {
    axis = OUT;
  }

  axis = axis.normalize();

  return (
    startPoints: Vector3[],
    endPoints: Vector3[],
    alpha: number
  ): Vector3[] => {
    const start = new MArray(startPoints.map((v) => v.toArray()));
    const end = new MArray(endPoints.map((v) => v.toArray()));
    const vects = start.subtract(end);
    let centers = start.add(vects.divide(2));

    if (angle !== PI) {
      const vectsList = vects
        .getValues()
        .map((v) => new Vector3(v[0], v[1], v[2]));
      const crossProducts = vectsList.map((vec) => axis.cross(vec.divide(1)));
      const crossArray = new MArray(crossProducts.map((v) => v.toArray()));
      centers = centers.add(crossArray.divide(Math.tan(angle / 2)));
    }

    const rotationMat = rotationMatrix(angle * alpha, axis);
    const outMat = centers.add(
      start.subtract(centers).matMul(rotationMat.transpose())
    );

    return outMat.getValues().map((row) => new Vector3(row[0], row[1], row[2]));
  };
}

function clockwisePath(): PathFunc {
  return pathAlongArc(-PI);
}

function counterclockwisePath(): PathFunc {
  return pathAlongArc(PI);
}

export {
  PathFunc,
  straightPath,
  pathAlongArc,
  clockwisePath,
  counterclockwisePath,
};
