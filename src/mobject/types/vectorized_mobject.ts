import { Color } from '../../util/color';
import { Vector3 } from '../../util/vector';
import { WHITE, TRANSPARENT, ORIGIN } from '../../constants';
import { Mobject } from './mobject';
import {
  linspace,
  range,
  sum,
  makeEven,
  stretchListToLength,
} from '../../util/array';
import {
  partialBezierPoints,
  interpolate,
  bezier,
  integerInterpolate,
  interpolateValue,
  getSmoothHandlePoints,
} from '../../util/bezier';
import { DEFAULT_STROKE_WIDTH, OUT, RIGHT, UP } from '../../constants';
import { MArray } from '../../util/space_ops';

type BezierTuple = [Vector3, Vector3, Vector3, Vector3];
type SubPath = Vector3[];

export class VMobject extends Mobject {
  strokeWidth: number = DEFAULT_STROKE_WIDTH;
  backgroundStrokeWidth: number = 0;
  closeNewPoints: boolean = false;
  preFunctionHandleToAnchorScaleFactor: number = 0.01;
  makeSmoothAfterApplyingFunctions: boolean = false;
  toleranceForPointEquality: number = 1e-6;

  nPointsPerCurve: number = 4;

  fillColors?: Color[];
  strokeColors?: Color[];
  backgroundStrokeColors?: Color[];

  constructor(color: Color = WHITE) {
    super(color);
  }

  static copyFrom(vmob: VMobject): VMobject {
    const newVMob = new VMobject();
    newVMob.fillColors = vmob.fillColors?.map((c) => c.copy());
    newVMob.strokeColors = vmob.strokeColors?.map((c) => c.copy());
    newVMob.backgroundStrokeColors = vmob.backgroundStrokeColors?.map((c) =>
      c.copy()
    );
    newVMob.strokeWidth = vmob.strokeWidth;
    newVMob.backgroundStrokeWidth = vmob.backgroundStrokeWidth;
    newVMob.closeNewPoints = vmob.closeNewPoints;
    newVMob.preFunctionHandleToAnchorScaleFactor =
      vmob.preFunctionHandleToAnchorScaleFactor;
    newVMob.makeSmoothAfterApplyingFunctions =
      vmob.makeSmoothAfterApplyingFunctions;
    newVMob.toleranceForPointEquality = vmob.toleranceForPointEquality;
    newVMob.nPointsPerCurve = vmob.nPointsPerCurve;
    return Object.assign(newVMob, super.copyFrom(vmob));
  }

  copy(): VMobject {
    return VMobject.copyFrom(this);
  }

  createGroup<MobjectType extends Mobject>(mobs: MobjectType[]): Mobject {
    if (mobs.every((element) => element instanceof VMobject)) {
      return new VGroup(mobs as VMobject[]);
    } else {
      return super.createGroup(mobs);
    }
  }

  initColors(): void {
    this.setFill({ colors: this.fillColors || [this.color] });

    this.setStroke({
      colors: this.strokeColors || [this.color],
      width: this.strokeWidth,
    });

    this.setBackgroundStroke({
      colors: this.backgroundStrokeColors,
      width: this.backgroundStrokeWidth,
    });
  }

  setFill({
    color,
    colors,
    family = true,
  }: {
    color?: Color;
    colors: Color[];
    family?: boolean;
  }): void {
    // if both color and colors are set, append color to colors list
    colors = [...(colors || []), ...(color ? [color] : [])];

    if (family) {
      for (const mob of this.getVectorizedFamily()) {
        mob.setFill({ colors, family: false });
      }
    }

    if (colors.length > 0) {
      this.fillColors = this.fillColors || colors;

      if (this.fillColors.length < colors.length) {
        this.fillColors = stretchListToLength(this.fillColors, colors.length);
      } else if (colors.length < this.fillColors.length) {
        colors = stretchListToLength(colors, this.fillColors.length);
      }

      this.fillColors = range(0, this.fillColors.length).map((i) => colors[i]);
    }
  }

  setStroke({
    color,
    colors,
    width,
    background = false,
    family = true,
  }: {
    color?: Color;
    colors?: Color[];
    width?: number;
    background?: boolean;
    family?: boolean;
  }): void {
    // if both color and colors are set, append color to colors list
    colors = [...(colors || []), ...(color ? [color] : [])];

    if (family) {
      for (const mob of this.getVectorizedFamily()) {
        mob.setStroke({
          colors,
          width,
          background,
          family: false,
        });
      }
    }

    if (colors.length > 0) {
      if (background) {
        this.backgroundStrokeColors = this.backgroundStrokeColors || colors;

        if (this.backgroundStrokeColors.length < colors.length) {
          this.backgroundStrokeColors = stretchListToLength(
            this.backgroundStrokeColors,
            colors.length
          );
        } else if (colors.length < this.backgroundStrokeColors.length) {
          this.backgroundStrokeColors = stretchListToLength(
            colors,
            this.backgroundStrokeColors.length
          );
        }

        this.strokeColors = range(0, this.strokeColors!.length).map(
          (i) => colors[i]
        );
      } else {
        this.strokeColors = this.strokeColors || colors;

        if (this.strokeColors.length < colors.length) {
          this.strokeColors = stretchListToLength(
            this.strokeColors,
            colors.length
          );
        } else if (colors.length < this.strokeColors.length) {
          this.strokeColors = stretchListToLength(
            colors,
            this.strokeColors.length
          );
        }

        this.strokeColors = range(0, this.strokeColors.length).map(
          (i) => colors[i]
        );
      }
    }

    if (width !== undefined) {
      if (background) {
        this.backgroundStrokeWidth = width;
      } else {
        this.strokeWidth = width;
      }
    }
  }

  setBackgroundStroke({
    color,
    colors,
    width,
    family = true,
  }: {
    color?: Color;
    colors?: Color[];
    width?: number;
    family?: boolean;
  }): void {
    this.setStroke({
      color,
      colors,
      width,
      background: true,
      family,
    });
  }

  getColor({
    stroke = false,
    backgroundStroke = false,
  }: { stroke?: boolean; backgroundStroke?: boolean } = {}): Color {
    if (stroke || backgroundStroke) {
      return this.getStrokeColor({ background: backgroundStroke });
    } else {
      return this.getFillColor();
    }
  }

  setColor(color: Color, family: boolean = true): void {
    this.setFill({ colors: [color], family });
    this.setStroke({ colors: [color], family });
    super.setColor(color, family);
  }

  getStyle(): VMobjectStyle {
    return new VMobjectStyle({
      fillColors: this.getFillColors(),
      strokeColors: this.getStrokeColors(),
      strokeWidth: this.getStrokeWidth(),
      backgroundStrokeColors: this.getStrokeColors({ background: true }),
      backgroundStrokeWidth: this.getStrokeWidth({ background: true }),
    });
  }

  matchStyle(vmob: VMobject, family: boolean = true): void {
    this.setStyleFromVMobjectStyle(vmob.getStyle(), { family: false });

    if (family) {
      let submobs1 = this.submobjects;
      let submobs2 = vmob.submobjects;

      if (submobs1.length === 0) {
        return;
      } else if (submobs2.length === 0) {
        submobs2 = [vmob as unknown as Mobject];
      }

      submobs1 = submobs1.filter((element) => element instanceof VMobject);
      submobs2 = submobs2.filter((element) => element instanceof VMobject);

      for (const [sm1, sm2] of makeEven(submobs1, submobs2)) {
        (sm1 as unknown as VMobject).matchStyle(
          sm2 as unknown as VMobject,
          true
        );
      }
    }
  }

  fade(darkness: number = 0.5, family: boolean = true): void {
    const factor = 1 - darkness;

    this.setFill({
      colors: this.getFillColors().map((color) =>
        color.withTransparency(color.a * factor)
      ),
      family: true,
    });
    this.setStroke({
      colors: this.getStrokeColors().map((color) =>
        color.withTransparency(color.a * factor)
      ),
      family: true,
    });
    this.setBackgroundStroke({
      colors: this.getStrokeColors({ background: true }).map((color) =>
        color.withTransparency(color.a * factor)
      ),
      family: true,
    });

    super.fade(darkness, family);
  }

  getFillColor(): Color {
    return this.getFillColors()[0];
  }

  getFillColors(): Color[] {
    return this.fillColors || [TRANSPARENT];
  }

  getStrokeColor({ background = false }: { background?: boolean } = {}): Color {
    return this.getStrokeColors({ background })[0];
  }

  getStrokeWidth({
    background = false,
  }: { background?: boolean } = {}): number {
    return background ? this.backgroundStrokeWidth : this.strokeWidth;
  }

  getStrokeColors({
    background = false,
  }: { background?: boolean } = {}): Color[] {
    let colors = background ? this.backgroundStrokeColors : this.strokeColors;

    if (!colors || colors.length === 0) {
      colors = [TRANSPARENT];
    }

    return colors;
  }

  getGradientStartAndEndPoints(): [Vector3, Vector3] {
    const direction = RIGHT;
    const c = this.getCenter();

    const bases = new MArray([
      this.getEdgeCenter(RIGHT).subtract(c).toArray(),
      this.getEdgeCenter(UP).subtract(c).toArray(),
      this.getEdgeCenter(OUT).subtract(c).toArray(),
    ]).transpose();

    const offset = direction.matMul(bases);
    return [c.subtract(offset), c.add(offset)];
  }

  setPoints(points: Vector3[]): void {
    this.points = points;
  }

  getPoints(): Vector3[] {
    return [...this.points];
  }

  clearPoints(): void {
    this.points = [];
  }

  appendPoints(pts: Vector3[]): void {
    this.points.push(...pts);
  }

  setAnchorsAndHandles(
    anchor1: Vector3[],
    handle1: Vector3[],
    handle2: Vector3[],
    anchor2: Vector3[]
  ): void {
    const nppc = this.nPointsPerCurve; // 4
    const totalLength = nppc * anchor1.length;
    this.points = Array(totalLength).fill(ORIGIN);
    const arrays = [anchor1, handle1, handle2, anchor2];

    for (let i = 0; i < nppc; i++) {
      const vec = arrays[i];
      for (let j = i; j < this.points.length; j += nppc) {
        this.points[j] = vec[(j / nppc) % vec.length];
      }
    }
  }

  startNewPath(pt: Vector3): void {
    this.appendPoints([pt]);
  }

  addCubicBezierCurve(
    anchor1: Vector3,
    handle1: Vector3,
    handle2: Vector3,
    anchor2: Vector3
  ): void {
    this.appendPoints([anchor1, handle1, handle2, anchor2]);
  }

  addCubicBezierCurveTo(
    handle1: Vector3,
    handle2: Vector3,
    anchor: Vector3
  ): void {
    if (this.points.length === 0) {
      throw new Error('Cannot add cubic bezier curve to an empty path');
    }

    if (this.hasNewPathStarted()) {
      this.appendPoints([handle1, handle2, anchor]);
    } else {
      this.appendPoints([this.getLastPoint(), handle1, handle2, anchor]);
    }
  }

  addLineTo(pt: Vector3): void {
    const nppc = this.nPointsPerCurve; // 4
    const lastPoint = this.getLastPoint();
    const data = linspace(0, 1, nppc)
      .flat()
      .map((alpha) => interpolateValue(lastPoint, pt, alpha));

    this.addCubicBezierCurveTo(data[1], data[2], data[3]);
  }

  addSmoothCurveTo(anchorOrHandle: Vector3, maybeAnchor?: Vector3): void {
    const handle2 = maybeAnchor ? anchorOrHandle : null;
    const anchor = maybeAnchor || anchorOrHandle;

    if (this.hasNewPathStarted()) {
      this.addLineTo(anchor);
    } else {
      if (this.points.length === 0) {
        throw new Error('Cannot add smooth curve to an empty path');
      }

      const lastH2 = this.points[this.points.length - 2];
      const lastA2 = this.points[this.points.length - 1];
      const lastTangent = lastA2.subtract(lastH2);
      const handle1 = lastA2.add(lastTangent);

      if (!handle2) {
        const toAnchorVec = anchor.subtract(lastA2);
        const tangent = lastTangent.rotate(Math.PI, toAnchorVec);
        const calculatedHandle2 = anchor.subtract(tangent);
        this.addCubicBezierCurveTo(handle1, calculatedHandle2, anchor);
      } else {
        this.addCubicBezierCurveTo(handle1, handle2, anchor);
      }
    }
  }

  addQuadraticBezierCurveTo(handle: Vector3, anchor: Vector3): void {
    const lastPoint = this.getLastPoint();
    this.addCubicBezierCurveTo(
      handle.scale(2 / 3).add(lastPoint.scale(1 / 3)),
      handle.scale(2 / 3).add(anchor.scale(1 / 3)),
      anchor
    );
  }

  closePath(): void {
    if (!this.isClosed()) {
      this.addLineTo(this.getSubpaths()[0][0]);
    }
  }

  hasNewPathStarted(): boolean {
    return this.getNumPoints() % this.nPointsPerCurve === 1;
  }

  getLastPoint(): Vector3 {
    return this.points[this.points.length - 1];
  }

  isClosed(): boolean {
    return this.considerPointsEquals(
      this.points[0],
      this.points[this.points.length - 1]
    );
  }

  addPointsAsCorners(points: Vector3[]): void {
    for (const pt of points) {
      this.addLineTo(pt);
    }
  }

  setPointsAsCorners(points: Vector3[]): void {
    const alphas = linspace(0, 1, this.nPointsPerCurve).getColumn(0);

    const ptsWithoutFirst = MArray.fromVectorList(points.slice(1));
    const ptsWithoutLast = MArray.fromVectorList(points.slice(0, -1));

    const anchorsAndHandlesArrays = alphas.map((alpha) =>
      interpolate(ptsWithoutLast, ptsWithoutFirst, alpha)
    );

    const anchorsAndHandlesVectorLists = anchorsAndHandlesArrays.map((arr) =>
      arr.values.map((vec) => new Vector3(vec[0], vec[1], vec[2]))
    );

    this.setAnchorsAndHandles(
      anchorsAndHandlesVectorLists[0],
      anchorsAndHandlesVectorLists[1],
      anchorsAndHandlesVectorLists[2],
      anchorsAndHandlesVectorLists[3]
    );
  }

  setPointsSmoothly(points: Vector3[]): void {
    this.setPointsAsCorners(points);
    this.makeSmooth();
  }

  changeAnchorMode(mode: 'jagged' | 'smooth'): void {
    const nppc = this.nPointsPerCurve;

    for (const submob of this.getVectorizedFamily()) {
      const subpaths = submob.getSubpaths();
      submob.clearPoints();

      for (const subpath of subpaths) {
        const anchors = subpath
          .filter((_, i) => i % nppc === 0)
          .concat([subpath[subpath.length - 1]]);
        let h1: Vector3[], h2: Vector3[];

        if (mode === 'smooth') {
          const handles = getSmoothHandlePoints(anchors);
          h1 = handles[0];
          h2 = handles[1];
        } else {
          const a1 = anchors.slice(0, -1);
          const a2 = anchors.slice(1);

          h1 = a1.map((p, i) => interpolate(p, a2[i], 1 / 3));
          h2 = a1.map((p, i) => interpolate(p, a2[i], 2 / 3));
        }

        const newSubpath = subpath.map((pt, i) => {
          if (i % nppc === 1) return h1[Math.floor(i / nppc)];
          if (i % nppc === 2) return h2[Math.floor(i / nppc)];
          return pt;
        });

        submob.appendPoints(newSubpath);
      }
    }
  }

  makeSmooth(): void {
    this.changeAnchorMode('smooth');
  }

  makeJagged(): void {
    this.changeAnchorMode('jagged');
  }

  addSubpath(points: Vector3[]): void {
    this.appendPoints(points);
  }

  appendVectorizedMobject(mob: VMobject): void {
    if (this.hasNewPathStarted()) {
      this.points.pop();
    }
    this.appendPoints(mob.getPoints());
  }

  applyFunction(func: (p: Vector3) => Vector3): void {
    const factor = this.preFunctionHandleToAnchorScaleFactor;

    this.scaleHandleToAnchorDistances(factor);

    super.applyOverPoints(func, ORIGIN, ORIGIN);

    this.scaleHandleToAnchorDistances(1.0 / factor);

    if (this.makeSmoothAfterApplyingFunctions) {
      this.makeSmooth();
    }
  }

  scaleHandleToAnchorDistances(factor: number): void {
    for (const submob of this.getVectorizedFamily()) {
      if (submob.getNumPoints() < this.nPointsPerCurve) {
        continue;
      }

      const anchorsAndHandles = submob.getAnchorsAndHandles();
      const a1 = new MArray(anchorsAndHandles[0].map((vec) => vec.toArray()));
      const h1 = new MArray(anchorsAndHandles[1].map((vec) => vec.toArray()));
      const h2 = new MArray(anchorsAndHandles[2].map((vec) => vec.toArray()));
      const a2 = new MArray(anchorsAndHandles[3].map((vec) => vec.toArray()));

      const a1ToH1 = h1.subtract(a1);
      const a2ToH2 = h2.subtract(a2);

      const newH1 = a1
        .add(a1ToH1.multiply(factor))
        .values.map((row) => new Vector3(row[0], row[1], row[2]));
      const newH2 = a2
        .add(a2ToH2.multiply(factor))
        .values.map((row) => new Vector3(row[0], row[1], row[2]));

      submob.setAnchorsAndHandles(
        anchorsAndHandles[0],
        newH1,
        newH2,
        anchorsAndHandles[3]
      );
    }
  }

  considerPointsEquals2D(a: Vector3, b: Vector3): boolean {
    const atol = this.toleranceForPointEquality;
    const rtol = 1.0e-5;

    if (Math.abs(a.x - b.x) > atol + rtol * Math.abs(b.x)) {
      return false;
    }

    if (Math.abs(a.y - b.y) > atol + rtol * Math.abs(b.y)) {
      return false;
    }

    return true;
  }

  considerPointsEquals(a: Vector3, b: Vector3): boolean {
    if (!this.considerPointsEquals2D(a, b)) {
      return false;
    }

    const atol = this.toleranceForPointEquality;
    const rtol = 1.0e-5;

    if (Math.abs(a.z - b.z) > atol + rtol * Math.abs(b.z)) {
      return false;
    }

    return true;
  }

  getCubicBezierTuplesFromPoints(
    points: Vector3[]
  ): [Vector3, Vector3, Vector3, Vector3][] {
    return this.genCubicBezierTuplesFromPoints(points);
  }

  genCubicBezierTuplesFromPoints(
    points: Vector3[]
  ): [Vector3, Vector3, Vector3, Vector3][] {
    const nppc = this.nPointsPerCurve;
    const remainder = points.length % nppc;
    points = points.slice(0, points.length - remainder);
    return range(0, points.length, 4).map((i) => [
      points[i + 0],
      points[i + 1],
      points[i + 2],
      points[i + 3],
    ]);
  }

  getCubicBezierTuples(): [Vector3, Vector3, Vector3, Vector3][] {
    return this.getCubicBezierTuplesFromPoints(this.getPoints());
  }

  private _getSubpathsFromPoints(
    points: Vector3[],
    filterFunc: (n: number) => boolean
  ): Vector3[][] {
    const nppc = this.nPointsPerCurve;

    const splitIndicesWithoutFirst = [
      ...range(nppc, points.length, nppc).filter(filterFunc),
      points.length,
    ];

    const splitIndices = [0, ...splitIndicesWithoutFirst];

    return splitIndices
      .map((start, index) => {
        const end = splitIndicesWithoutFirst[index];
        if (end - start >= nppc) {
          return points.slice(start, end);
        }
        return [];
      })
      .filter((subpath) => subpath.length > 0);
  }

  getSubpathsFromPoints(points: Vector3[]): Vector3[][] {
    return this._getSubpathsFromPoints(
      points,
      (n) => !this.considerPointsEquals(points[n - 1], points[n])
    );
  }

  getSubpathsFromPoints2D(points: Vector3[]): Vector3[][] {
    return this._getSubpathsFromPoints(
      points,
      (n) => !this.considerPointsEquals2D(points[n - 1], points[n])
    );
  }

  getSubpaths(): Vector3[][] {
    return this.getSubpathsFromPoints(this.getPoints());
  }

  getNumCurves(): number {
    return Math.floor(this.getNumPoints() / this.nPointsPerCurve);
  }

  getNthCurvePoints(n: number): Vector3[] {
    if (n >= this.getNumCurves()) {
      throw new Error('Index out of range');
    }
    const nppc = this.nPointsPerCurve;
    return this.points.slice(nppc * n, nppc * (n + 1));
  }

  getNthCurveFunction(n: number): (t: number) => Vector3 {
    return bezier(this.getNthCurvePoints(n));
  }

  pointFromProportion(alpha: number): Vector3 {
    const numCurves = this.getNumCurves();
    const [n, residue] = integerInterpolate(0, numCurves, alpha);
    const curve = this.getNthCurveFunction(n);
    return curve(residue);
  }

  getAnchorsAndHandles(): Vector3[][] {
    const nppc = this.nPointsPerCurve;
    return range(0, nppc).map((i) =>
      this._getEveryNthVectorInAnchorsAndHandles(i)
    );
  }

  private _getEveryNthVectorInAnchorsAndHandles(n: number): Vector3[] {
    return this.points.filter((_, index) => index % this.nPointsPerCurve === n);
  }

  getStartAnchors(): Vector3[] {
    return this._getEveryNthVectorInAnchorsAndHandles(0);
  }

  getEndAnchors(): Vector3[] {
    return this._getEveryNthVectorInAnchorsAndHandles(this.nPointsPerCurve - 1);
  }

  getAnchors(): Vector3[] {
    if (this.points.length === 1) {
      return this.points;
    }
    return [...this.getStartAnchors(), ...this.getEndAnchors()];
  }

  getPointsDefiningBoundary(): Vector3[] {
    return this.getVectorizedFamily().flatMap((mob) => mob.getAnchors());
  }

  getArcLength(numSamplePoints?: number): number {
    numSamplePoints = numSamplePoints ?? 4 * this.getNumCurves() + 1;

    const points = linspace(0, 1, numSamplePoints)
      .getColumn(0)
      .map((alpha) => this.pointFromProportion(alpha));

    const diffs = range(0, numSamplePoints - 1).map((i) =>
      points[i + 1].subtract(points[i])
    );

    const norms = diffs.map((v) => v.norm());
    return sum(norms);
  }

  alignPoints(mob: VMobject): void {
    if (this.getNumPoints() === mob.getNumPoints()) {
      return;
    }

    for (const m of [this, mob]) {
      if (m.hasNoPoints()) {
        m.startNewPath(m.getCenter());
      }
      if (m.hasNewPathStarted()) {
        m.addLineTo(m.getLastPoint());
      }
    }

    const subpaths1 = this.getSubpaths();
    const subpaths2 = mob.getSubpaths();
    const numSubpaths = Math.max(subpaths1.length, subpaths2.length);

    const newPath1: Vector3[] = [];
    const newPath2: Vector3[] = [];
    const nppc = this.nPointsPerCurve;

    const getNthSubpath = (pathlist: Vector3[][], n: number): Vector3[] => {
      if (n >= pathlist.length) {
        return Array(nppc).fill(
          pathlist[pathlist.length - 1][
            pathlist[pathlist.length - 1].length - 1
          ]
        );
      }
      return pathlist[n];
    };

    for (let n = 0; n < numSubpaths; n++) {
      let sp1 = getNthSubpath(subpaths1, n);
      let sp2 = getNthSubpath(subpaths2, n);

      const diff1 = Math.max(0, Math.floor((sp2.length - sp1.length) / nppc));
      const diff2 = Math.max(0, Math.floor((sp1.length - sp2.length) / nppc));

      sp1 = this.insertNCurvesToPointList(diff1, sp1);
      sp2 = this.insertNCurvesToPointList(diff2, sp2);

      newPath1.push(...sp1);
      newPath2.push(...sp2);
    }

    this.setPoints(newPath1);
    mob.setPoints(newPath2);
  }

  insertNCurves(n: number): void {
    let newPathPoint: Vector3 | undefined;

    if (this.hasNewPathStarted()) {
      newPathPoint = this.getLastPoint();
    }

    const newPoints = this.insertNCurvesToPointList(n, this.getPoints());

    this.setPoints(newPoints);

    if (newPathPoint) {
      this.appendPoints([newPathPoint]);
    }
  }

  insertNCurvesToPointList(n: number, points: Vector3[]): Vector3[] {
    if (points.length === 1) {
      return Array(this.nPointsPerCurve * n).fill(points[0]);
    }

    const bezierQuads = this.getCubicBezierTuplesFromPoints(points);
    const currentNum = bezierQuads.length;
    const targetNum = currentNum + n;

    const repeatIndices = range(0, targetNum).map((i) =>
      Math.floor((i * currentNum) / targetNum)
    );

    const splitFactors = range(0, currentNum).map(
      (i) => repeatIndices.filter((j) => i === j).length
    );

    const newPoints: Vector3[] = [];

    for (let i = 0; i < bezierQuads.length; i++) {
      const quad = bezierQuads[i];
      const sf = splitFactors[i];

      const alphas = linspace(0, 1, sf + 1).getColumn(0);
      for (let j = 0; j < alphas.length - 1; j++) {
        newPoints.push(...partialBezierPoints(quad, alphas[j], alphas[j + 1]));
      }
    }

    return newPoints;
  }

  setStyleFromVMobjectStyle(
    style: VMobjectStyle,
    { family = true }: { family?: boolean } = {}
  ): void {
    this.setFill({
      colors: style.fillColors,
      family,
    });
    this.setStroke({
      colors: style.strokeColors,
      width: style.strokeWidth,
      family,
    });
    this.setBackgroundStroke({
      colors: style.backgroundStrokeColors,
      width: style.backgroundStrokeWidth,
      family,
    });
  }

  alignColors(vmob: VMobject): void {
    const getAttr = (attr: string, vmob: VMobject): Color[] => {
      switch (attr) {
        case 'fillColors':
          return vmob.getFillColors();
        case 'strokeColors':
          return vmob.getStrokeColors();
        case 'backgroundStrokeColors':
          return vmob.getStrokeColors({ background: false });
        default:
          throw new Error(
            `No color list in VMobject with attribute name ${attr}`
          );
      }
    };

    const setAttr = (attr: string, vmob: VMobject, value: Color[]): void => {
      switch (attr) {
        case 'fillColors':
          vmob.fillColors = value;
          break;
        case 'strokeColors':
          vmob.strokeColors = value;
          break;
        case 'backgroundStrokeColors':
          vmob.backgroundStrokeColors = value;
          break;
        default:
          throw new Error(
            `No color list in VMobject with attribute name ${attr}`
          );
      }
    };

    for (const attr of [
      'fillColors',
      'strokeColors',
      'backgroundStrokeColors',
    ]) {
      const a1 = getAttr(attr, this);
      const a2 = getAttr(attr, vmob);
      if (a1.length > a2.length) {
        setAttr(attr, this, stretchListToLength(a1, a2.length));
      } else if (a2.length > a1.length) {
        setAttr(attr, vmob, stretchListToLength(a2, a1.length));
      }
    }
  }

  getPointMobject(): VectorizedPoint {
    return new VectorizedPoint({
      location: this.getCenter(),
      color: this.getColor(),
      artificialWidth: this.getWidth(),
      artificialHeight: this.getHeight(),
    });
  }

  pointwiseBecomePartial(mob: VMobject, a: number, b: number): void {
    if (a <= 0 && b >= 1) {
      this.setPoints(mob.getPoints());
      return;
    }

    const bezierQuads = mob.getCubicBezierTuples();
    const numCubics = bezierQuads.length;

    const lower = integerInterpolate(0, numCubics, a);
    const upper = integerInterpolate(0, numCubics, b);

    const lowerIndex = lower[0];
    const lowerResidue = lower[1];
    const upperIndex = upper[0];
    const upperResidue = upper[1];

    this.clearPoints();

    if (numCubics === 0) {
      return;
    }

    if (lowerIndex === upperIndex) {
      this.appendPoints(
        partialBezierPoints(bezierQuads[lowerIndex], lowerResidue, upperResidue)
      );
    } else {
      this.appendPoints(
        partialBezierPoints(bezierQuads[lowerIndex], lowerResidue, 1)
      );

      for (let i = lowerIndex + 1; i < upperIndex; i++) {
        this.appendPoints(bezierQuads[i]);
      }

      this.appendPoints(
        partialBezierPoints(bezierQuads[upperIndex], 0, upperResidue)
      );
    }
  }

  getSubcurve(a: number, b: number): VMobject {
    const vmob = this.copy();
    vmob.pointwiseBecomePartial(this, a, b);
    return vmob;
  }

  getVectorizedFamily(): VMobject[] {
    return this.getFamily().filter(
      (mob) => mob instanceof VMobject
    ) as VMobject[];
  }

  getDashed(
    numDashes: number = 15,
    positiveSpaceRatio: number = 0.5,
    color?: Color
  ): DashedVMobject {
    // return a dashed version of the vmobject
    return new DashedVMobject(
      this,
      numDashes,
      positiveSpaceRatio,
      color || this.getColor()
    );
  }
}

class VMobjectStyle {
  fillColors: Color[];
  strokeColors: Color[];
  strokeWidth: number;
  backgroundStrokeColors: Color[];
  backgroundStrokeWidth: number;

  constructor({
    fillColors,
    strokeColors,
    strokeWidth,
    backgroundStrokeColors,
    backgroundStrokeWidth,
  }: {
    fillColors: Color[];
    strokeColors: Color[];
    strokeWidth: number;
    backgroundStrokeColors: Color[];
    backgroundStrokeWidth: number;
  }) {
    this.fillColors = fillColors;
    this.strokeColors = strokeColors;
    this.strokeWidth = strokeWidth;
    this.backgroundStrokeColors = backgroundStrokeColors;
    this.backgroundStrokeWidth = backgroundStrokeWidth;
  }

  static copyFrom(style: VMobjectStyle): VMobjectStyle {
    return new VMobjectStyle({
      fillColors: style.fillColors?.map((c) => c.copy()) ?? [],
      strokeColors: style.strokeColors?.map((c) => c.copy()) ?? [],
      strokeWidth: style.strokeWidth,
      backgroundStrokeColors:
        style.backgroundStrokeColors?.map((c) => c.copy()) ?? [],
      backgroundStrokeWidth: style.backgroundStrokeWidth,
    });
  }

  copy(): VMobjectStyle {
    return VMobjectStyle.copyFrom(this);
  }

  withChange({
    fillColors,
    strokeColors,
    strokeWidth,
    backgroundStrokeColors,
    backgroundStrokeWidth,
  }: {
    fillColors?: Color[] | null;
    strokeColors?: Color[] | null;
    strokeWidth?: number;
    backgroundStrokeColors?: Color[] | null;
    backgroundStrokeWidth?: number;
  }): VMobjectStyle {
    return new VMobjectStyle({
      fillColors: fillColors ?? this.fillColors,
      strokeColors: strokeColors ?? this.strokeColors,
      strokeWidth: strokeWidth ?? this.strokeWidth,
      backgroundStrokeColors:
        backgroundStrokeColors ?? this.backgroundStrokeColors,
      backgroundStrokeWidth:
        backgroundStrokeWidth ?? this.backgroundStrokeWidth,
    });
  }
}

export class VGroup extends VMobject {
  constructor(mobs?: VMobject[]) {
    super();
    this.add(mobs || []);
  }

  static copyFrom(mob: VGroup): VGroup {
    const newGroup = super.copyFrom(mob);
    return newGroup;
  }

  override copy(): VGroup {
    return VGroup.copyFrom(this);
  }
}

export class VectorizedPoint extends VMobject {
  private artificialWidth: number;
  private artificialHeight: number;

  constructor({
    color = WHITE,
    location = ORIGIN,
    strokeWidth = DEFAULT_STROKE_WIDTH,
    artificialWidth = 0.01,
    artificialHeight = 0.01,
  }: {
    color?: Color;
    location?: Vector3;
    strokeWidth?: number;
    artificialWidth?: number;
    artificialHeight?: number;
  } = {}) {
    super(color);
    this.artificialWidth = artificialWidth;
    this.artificialHeight = artificialHeight;
    this.setPoints([location]);
    this.strokeWidth = strokeWidth;
  }

  override getWidth(): number {
    return this.artificialWidth;
  }

  override getHeight(): number {
    return this.artificialHeight;
  }

  getLocation(): Vector3 {
    return this.points[0];
  }

  setLocation(pt: Vector3): void {
    this.setPoints([pt.copy()]);
  }

  static copyFrom(vpt: VectorizedPoint): VectorizedPoint {
    const newPoint = super.copyFrom(vpt) as VectorizedPoint;
    newPoint.artificialHeight = vpt.artificialHeight;
    newPoint.artificialWidth = vpt.artificialWidth;
    return newPoint;
  }

  override copy(): VectorizedPoint {
    return VectorizedPoint.copyFrom(this);
  }
}

export class CurvesAsSubmobjects extends VGroup {
  constructor(vmob: VMobject) {
    super();
    const tuples = vmob.getCubicBezierTuples();

    for (const tuple of tuples) {
      const part = new VMobject();
      part.setPoints(tuple);
      part.matchStyle(vmob);
      this.add([part]);
    }
  }

  static copyFrom(mob: CurvesAsSubmobjects): CurvesAsSubmobjects {
    return super.copyFrom(mob) as CurvesAsSubmobjects;
  }

  override copy(): CurvesAsSubmobjects {
    return CurvesAsSubmobjects.copyFrom(this);
  }
}

export class DashedVMobject extends VMobject {
  constructor(
    vmob: VMobject,
    numDashes: number = 15,
    positiveSpaceRatio: number = 0.5,
    color: Color = WHITE
  ) {
    super(color);

    if (numDashes > 0) {
      const fullDAlpha = 1 / numDashes;
      const partialDAlpha = fullDAlpha * positiveSpaceRatio;

      const alphas = linspace(0, 1, numDashes + 1)
        .getColumn(0)
        .map((alpha) => alpha - fullDAlpha + partialDAlpha);

      this.add(
        alphas.map((alpha) => vmob.getSubcurve(alpha, alpha + partialDAlpha))
      );
    }

    this.matchStyle(vmob, false);
  }

  static copyFrom(mob: DashedVMobject): DashedVMobject {
    return super.copyFrom(mob) as DashedVMobject;
  }

  override copy(): DashedVMobject {
    return DashedVMobject.copyFrom(this);
  }
}
