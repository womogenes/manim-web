import { interpolate } from './bezier';
import { MArray } from './space_ops';
import { Tuple2 } from './tuple';

function range(start: number = 0, end: number, step: number = 1): number[] {
  if (step === 0) throw new Error('Step cannot be 0');

  const result: number[] = [];

  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }

  return result;
}

function enumerate<T>(list: T[]): Tuple2<number, T>[] {
  if (list.length === 0) {
    return [];
  }

  const result: Tuple2<number, T>[] = [];

  for (let i = 0; i < list.length; i++) {
    result.push(new Tuple2(i, list[i]));
  }

  return result;
}

const listEqual = <T>(a: Iterable<T>, b: Iterable<T>): boolean => {
  const aArray = Array.from(a);
  const bArray = Array.from(b);

  return (
    aArray.length === bArray.length &&
    aArray.every(
      (val, index) => JSON.stringify(val) === JSON.stringify(bArray[index])
    )
  );
};

function sum<T extends number>(l: T[]): T {
  if (l.length === 0) {
    return 0 as T;
  }

  return l.reduce((acc, val) => (acc + val) as T);
}

function argmax(array: number[]): number {
  return array.reduce((iMax, x, i, arr) => (x > arr[iMax] ? i : iMax), 0);
}

function argmin(array: number[]): number {
  return array.reduce((iMin, x, i, arr) => (x < arr[iMin] ? i : iMin), 0);
}

function linspace(start: number, end: number, count: number): MArray {
  return new MArray({
    values: range(0, count).map((i) => [
      interpolate(start, end, i / (count - 1)),
    ]),
  });
}

function arange({
  start = 0,
  end,
  step = 1,
}: {
  start?: number;
  end: number;
  step?: number;
}): MArray {
  if (step === 0) throw new Error('Step cannot be 0');

  const _range = range(0, Math.ceil((end - start) / step));
  const result = _range.map((x) => [x * step + start]);

  return new MArray({ values: result });
}

function unique<T>(nonUnique: T[]): T[] {
  return Array.from(new Set(nonUnique));
}

function stretchListToLength<T>(list: T[], length: number): T[] {
  if (list.length === 0) {
    return list;
  }

  const currentLength = list.length;

  if (currentLength > length) {
    throw new Error(
      'Trying to stretch an array to a length shorter than its own'
    );
  }

  const indices = range(0, length).map((e) => (e / length) * currentLength);

  return indices.map((i) => list[Math.floor(i)]);
}

function makeEven<A, B>(listA: A[], listB: B[]): [A[], B[]] {
  const length = Math.max(listA.length, listB.length);

  return [
    range(0, length).map((n) => listA[Math.floor((n * listA.length) / length)]),
    range(0, length).map((n) => listB[Math.floor((n * listB.length) / length)]),
  ];
}

function withoutFirst<T>(list: T[]): T[] {
  return list.filter((_, index) => index !== 0);
}

function withoutLast<T>(list: T[]): T[] {
  return list.slice(0, -1);
}

function withoutRedundancies<T>(list: T[]): T[] {
  const reversedResult: T[] = [];
  const used = new Set<T>();
  for (const x of list.reverse()) {
    if (!used.has(x)) {
      reversedResult.push(x);
      used.add(x);
    }
  }

  return reversedResult.reverse();
}

function batchByProperty<T, B>(
  items: T[],
  propertyFunc: (item: T) => B
): [T[], B][] {
  const batchPropPairs: [T[], B][] = [];

  function addBatchPropPair(batch: T[]) {
    if (batch.length > 0) {
      batchPropPairs.push([batch, propertyFunc(batch[0])]);
    }
  }

  let currentBatch: T[] = [];
  let currentProp: B | undefined;

  for (const item of items) {
    const prop = propertyFunc(item);

    if (prop !== currentProp) {
      addBatchPropPair(currentBatch);
      currentProp = prop;
      currentBatch = [item];
    } else {
      currentBatch.push(item);
    }
  }

  addBatchPropPair(currentBatch);

  return batchPropPairs;
}

function adjacentNTuples<T>(objects: T[], n: number): T[][] {
  return range(0, objects.length).map((i) =>
    range(0, n).map((offset) => objects[(i + offset) % objects.length])
  );
}

function adjacentPairs<T>(objects: T[]): T[][] {
  return adjacentNTuples(objects, 2);
}

export {
  range,
  enumerate,
  listEqual,
  sum,
  argmax,
  argmin,
  linspace,
  arange,
  unique,
  stretchListToLength,
  makeEven,
  withoutFirst,
  withoutLast,
  withoutRedundancies,
  batchByProperty,
  adjacentNTuples,
  adjacentPairs,
};
