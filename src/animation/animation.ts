import { Scene } from '../scene/scene';
import {
  DEFAULT_ANIMATION_RUN_TIME,
  DEFAULT_ANIMATION_LAG_RATIO,
} from '../constants';
import { Mobject } from '../mobject/types/mobject';
import { clip } from '../util/math_functions';
import { RateFunc, smooth } from '../util/rate_functions';

export class Animation {
  runTime: number;
  rateFunc: RateFunc;
  lagRatio: number;

  suspendMobjectUpdating: boolean = false;
  remover: boolean = false;
  name: string;
  mobject: Mobject;
  startingMobject: Mobject;

  constructor(
    mobject: Mobject,
    {
      runTime = DEFAULT_ANIMATION_RUN_TIME,
      rateFunc = smooth,
      lagRatio = DEFAULT_ANIMATION_LAG_RATIO,
    } = {}
  ) {
    this.mobject = mobject;
    this.runTime = runTime;
    this.rateFunc = rateFunc;
    this.lagRatio = lagRatio;
    this.name = this.getName();
  }

  copy(): Animation {
    return new Animation(this.mobject.copy(), {
      runTime: this.runTime,
      rateFunc: this.rateFunc,
      lagRatio: this.lagRatio,
    });
  }

  toString(): string {
    return `${this.getName()}(${this.mobject.name}, runTime: ${this.runTime}s)`;
  }

  getName(): string {
    return this.constructor.name;
  }

  begin(): void {
    this.startingMobject = this.createStartingMobject();
    if (this.suspendMobjectUpdating) {
      this.mobject.suspendUpdating();
    }
    this.interpolate(0);
  }

  finish(): void {
    this.interpolate(1);
    if (this.suspendMobjectUpdating) {
      this.mobject.resumeUpdating();
    }
  }

  cleanUpFromScene(scene: Scene): void {
    if (this.isRemover()) {
      scene.remove([this.mobject]);
    }
  }

  createStartingMobject(): Mobject {
    return this.mobject.copy();
  }

  getAllMobjects(): Mobject[] {
    return [this.mobject, this.startingMobject];
  }

  getAllFamiliesZipped(): Mobject[][] {
    return this.getAllMobjects().map((mob) => mob.getFamilyWithPoints());
  }

  updateMobjects(dt: number): void {
    for (const mob of this.getAllMobjectsToUpdate()) {
      mob.update(dt);
    }
  }

  getAllMobjectsToUpdate(): Mobject[] {
    return this.getAllMobjects().filter(
      (mob) => mob !== this.mobject || !this.suspendMobjectUpdating
    );
  }

  interpolate(alpha: number): void {
    alpha = clip(alpha, 0, 1);
    this.interpolateMobject(this.rateFunc(alpha));
  }

  update(alpha: number): void {
    this.interpolate(alpha);
  }

  interpolateMobject(alpha: number): void {
    const families = this.getAllFamiliesZipped();
    for (let i = 0; i < families.length; i++) {
      const mobs = families[i];
      const subAlpha = this.getSubAlpha(alpha, i, families.length);
      this.interpolateSubMobject(mobs, subAlpha);
    }
  }

  interpolateSubMobject(mobs: Mobject[], subAlpha: number): void {
    // Typically implemented in subclasses
  }

  getSubAlpha(alpha: number, i: number, numSubmobjects: number): number {
    const fullLength = (numSubmobjects - 1) * this.lagRatio + 1;
    const value = alpha * fullLength;
    const lower = i * this.lagRatio;
    return clip(value - lower, 0, 1);
  }

  setRunTime(runTime: number): void {
    this.runTime = runTime;
  }

  setRateFunc(rateFunc: RateFunc): void {
    this.rateFunc = rateFunc;
  }

  setName(name: string): void {
    this.name = name;
  }

  getRunTime(): number {
    return this.runTime;
  }

  getRateFunc(): RateFunc {
    return this.rateFunc;
  }

  isRemover(): boolean {
    return this.remover;
  }
}
