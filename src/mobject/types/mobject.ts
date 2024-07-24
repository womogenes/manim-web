import { Vector3 } from '../../util/vector';
import { Color } from '../../util/color';
import { DOWN, LEFT, RIGHT, UP, WHITE } from '../../constants';
import { ORIGIN, OUT } from '../../constants';
import { rotationMatrix } from '../../util/space_ops';

type Updater = (mob: Mobject, dt: number) => Mobject;

export class Mobject {
  color: Color;
  name: string;
  target: Mobject | null;
  submobjects: Mobject[];
  updaters: Updater[];
  updatingSuspended: boolean;
  points: Vector3[];

  constructor(color: Color = WHITE, name?: string, target?: Mobject) {
    this.color = color;
    this.name = name || this.getName();
    this.target = target ?? null;
    this.submobjects = [];
    this.updaters = [];
    this.updatingSuspended = false;
    this.resetPoints();
    this.initColors();
    this.generatePoints();
  }

  static copyFrom(mob: Mobject): Mobject {
    const newMob = new Mobject(mob.color.copy(), mob.name, mob.target?.copy());
    newMob.submobjects = mob.submobjects.map((submob) => submob.copy());
    newMob.updatingSuspended = mob.updatingSuspended;
    newMob.points = mob.points.map((pt) => pt.copy());
    return newMob;
  }

  copy(): Mobject {
    return Mobject.copyFrom(this);
  }

  toString(): string {
    return this.getName();
  }

  getName(): string {
    return this.constructor.name;
  }

  resetPoints(): void {
    this.points = [];
  }

  initColors(): void {
    // To implement in subclasses
  }

  generatePoints(): void {
    // To implement in subclasses
  }

  add(mobjects: Mobject[]): void {
    this.addToFront(mobjects);
  }

  addToFront(mobjects: Mobject[]): void {
    if (mobjects.includes(this)) {
      throw new Error("Mobject can't contain itself");
    }

    this.submobjects = [
      ...mobjects,
      ...this.submobjects.filter((mob) => !mobjects.includes(mob)),
    ];
  }

  addToBack(mobjects: Mobject[]): void {
    if (mobjects.includes(this)) {
      throw new Error("Mobject can't contain itself");
    }
    this.submobjects = [
      ...this.submobjects.filter((mob) => !mobjects.includes(mob)),
      ...mobjects,
    ];
  }

  remove(mobjects: Mobject[]): void {
    this.submobjects = this.submobjects.filter(
      (mob) => !mobjects.includes(mob)
    );
  }

  applyOverPoints(
    func: (pt: Vector3) => Vector3,
    aboutPoint?: Vector3,
    aboutEdge: Vector3 = ORIGIN
  ): void {
    aboutPoint = aboutPoint || this.getCriticalPoint(aboutEdge);

    for (const mob of this.getFamilyWithPoints()) {
      mob.points = mob.points.map((pt) =>
        func(pt.subtract(aboutPoint)).add(aboutPoint)
      );
    }
  }
  getCriticalPoint(direction: Vector3): Vector3 {
    const allPoints = this.getPointsDefiningBoundary();

    if (allPoints.length === 0) {
      return new Vector3(0, 0, 0);
    }

    const x = this.getExtremumAlongDim(allPoints, 0, Math.sign(direction.x));
    const y = this.getExtremumAlongDim(allPoints, 1, Math.sign(direction.y));
    const z = this.getExtremumAlongDim(allPoints, 2, Math.sign(direction.z));

    return new Vector3(x, y, z);
  }

  getPointsDefiningBoundary(): Vector3[] {
    return this.getAllPoints();
  }

  getAllPoints(): Vector3[] {
    return this.getFamilyWithPoints().flatMap((mob) => mob.points);
  }

  getFamilyWithPoints(): Mobject[] {
    return this.getFamily().filter((mob) => mob.getNumPoints() > 0);
  }

  getNumPoints(): number {
    return this.points.length;
  }

  getFamily(): Mobject[] {
    const family: Mobject[] = [this];
    for (const submob of this.submobjects) {
      family.push(...submob.getFamily());
    }
    return Array.from(new Set(family)); // Remove duplicates
  }

  private getExtremumAlongDim(
    points: Vector3[],
    dim: number,
    key: number
  ): number {
    const values = points.map((point) => point.getComponent(dim));

    if (key < 0) {
      return Math.min(...values);
    } else if (key === 0) {
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      return (minVal + maxVal) / 2;
    } else {
      return Math.max(...values);
    }
  }

  applyFunction(func: (pt: Vector3) => Vector3): void {
    this.applyOverPoints(func, ORIGIN, ORIGIN);
  }

  generateTarget(): Mobject {
    this.target = null;
    const mob = this.copy();
    this.target = mob;
    return mob;
  }

  update(dt: number = 0, recursive: boolean = true): void {
    if (this.updatingSuspended) {
      return;
    }

    for (const updater of this.updaters) {
      updater(this, dt);
    }

    if (recursive) {
      for (const submob of this.submobjects) {
        submob.update(dt, recursive);
      }
    }
  }

  getUpdaters(): Updater[] {
    return this.updaters;
  }

  getFamilyUpdaters(): Updater[] {
    return this.getFamily().flatMap((mob) => mob.getUpdaters());
  }

  addUpdater(
    updater: Updater,
    index?: number,
    callUpdater: boolean = true
  ): void {
    if (index === undefined) {
      this.updaters.push(updater);
    } else {
      this.updaters.splice(index, 0, updater);
    }

    if (callUpdater) {
      this.update(0);
    }
  }

  removeUpdater(updater: Updater): void {
    this.updaters = this.updaters.filter((u) => u !== updater);
  }

  hasUpdaters(): boolean {
    return this.updaters.length > 0;
  }

  clearUpdaters(recursive: boolean = true): void {
    this.updaters = [];

    if (recursive) {
      for (const submob of this.submobjects) {
        submob.clearUpdaters(true);
      }
    }
  }

  matchUpdaters(mob: Mobject): void {
    this.clearUpdaters();
    for (const updater of mob.getUpdaters()) {
      this.addUpdater(updater);
    }
  }

  suspendUpdating(recursive: boolean = true): void {
    this.updatingSuspended = true;

    if (recursive) {
      for (const submob of this.submobjects) {
        submob.suspendUpdating(true);
      }
    }
  }

  resumeUpdating(recursive: boolean = true): void {
    this.updatingSuspended = false;

    if (recursive) {
      for (const submob of this.submobjects) {
        submob.resumeUpdating(true);
      }
    }
  }

  applyToFamily(
    func: (mob: Mobject) => Mobject,
    useFamilyWithPoints: boolean = true
  ): void {
    for (const mob of useFamilyWithPoints
      ? this.getFamilyWithPoints()
      : this.getFamily()) {
      func(mob);
    }
  }

  shift(delta: Vector3): void {
    this.applyOverPoints((pt) => pt.add(delta));
  }

  scale(
    scaleFactor: Vector3,
    aboutPoint?: Vector3,
    aboutEdge: Vector3 = ORIGIN
  ): void {
    this.applyOverPoints(
      (pt) => pt.multiply(scaleFactor),
      aboutPoint,
      aboutEdge
    );
  }

  scaleUniformly(
    scaleFactor: number,
    aboutPoint?: Vector3,
    aboutEdge: Vector3 = ORIGIN
  ): void {
    this.applyOverPoints((pt) => pt.scale(scaleFactor), aboutPoint, aboutEdge);
  }

  rotate(
    angle: number,
    axis: Vector3 = OUT,
    aboutPoint?: Vector3,
    aboutEdge: Vector3 = ORIGIN
  ): void {
    const rotMatrixT = rotationMatrix(angle, axis).transpose();

    this.applyOverPoints((pt) => pt.matMul(rotMatrixT), aboutEdge, aboutPoint);
  }

  isInside(pt: Vector3, buff: number = 0.001): boolean {
    return (
      pt.x >= this.getLeft().x - buff &&
      pt.x <= this.getRight().x + buff &&
      pt.y >= this.getBottom().y - buff &&
      pt.y <= this.getTop().y + buff
    );
  }

  getEdgeCenter(edge: Vector3): Vector3 {
    return this.getCriticalPoint(edge);
  }

  getLeft(): Vector3 {
    return this.getEdgeCenter(LEFT);
  }

  getRight(): Vector3 {
    return this.getEdgeCenter(RIGHT);
  }

  getBottom(): Vector3 {
    return this.getEdgeCenter(DOWN);
  }

  getTop(): Vector3 {
    return this.getEdgeCenter(UP);
  }

  createGroup<MobjectType extends Mobject>(mobs: MobjectType[]): Mobject {
    return new Group(mobs);
  }
}

export class Group extends Mobject {
  constructor(mobjects: Mobject[] = []) {
    super();
    this.add(mobjects);
  }

  copy(): Group {
    return Group.copyFrom(this);
  }

  static copyFrom(mob: Group): Group {
    const newGroup = new Group();
    newGroup.color = mob.color.copy();
    newGroup.name = mob.name;
    newGroup.target = mob.target?.copy() ?? null;
    newGroup.submobjects = mob.submobjects.map((submob) => submob.copy());
    newGroup.updatingSuspended = mob.updatingSuspended;
    newGroup.points = mob.points.map((pt) => pt.copy());
    return newGroup;
  }
}
