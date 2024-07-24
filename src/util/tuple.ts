export class Tuple2<T1, T2> {
  constructor(public item1: T1, public item2: T2) {}

  equals(other: Tuple2<T1, T2>): boolean {
    return this.item1 === other.item1 && this.item2 === other.item2;
  }

  *[Symbol.iterator]() {
    yield this.item1;
    yield this.item2;
  }

  toArray(): [T1, T2] {
    return [this.item1, this.item2];
  }

  toString(): string {
    return `(${this.item1}, ${this.item2})`;
  }

  withItem1<R>(v: R): Tuple2<R, T2> {
    return new Tuple2(v, this.item2);
  }

  withItem2<R>(v: R): Tuple2<T1, R> {
    return new Tuple2(this.item1, v);
  }
}

export class Tuple4<T1, T2, T3, T4> {
  constructor(
    public item1: T1,
    public item2: T2,
    public item3: T3,
    public item4: T4
  ) {}

  equals(other: Tuple4<T1, T2, T3, T4>): boolean {
    return (
      this.item1 === other.item1 &&
      this.item2 === other.item2 &&
      this.item3 === other.item3 &&
      this.item4 === other.item4
    );
  }

  *[Symbol.iterator]() {
    yield this.item1;
    yield this.item2;
    yield this.item3;
    yield this.item4;
  }

  toArray(): [T1, T2, T3, T4] {
    return [this.item1, this.item2, this.item3, this.item4];
  }

  toString(): string {
    return `(${this.item1}, ${this.item2}, ${this.item3}, ${this.item4})`;
  }
}
