import { Animation } from './animation';
import {
  DEFAULT_ANIMATION_LAG_RATIO,
  DEFAULT_ANIMATION_LAGGED_START_LAG_RATIO,
} from '../constants';
import { Group, Mobject } from '../mobject/types/mobject';
import { Scene } from '../scene/scene';
import { withoutRedundancies } from '../util/array';
import { integerInterpolate, interpolateValue } from '../util/bezier';
import { clip } from '../util/math_functions';
import { RateFunc, linear } from '../util/rate_functions';

export class AnimationGroup extends Animation {
  animations: Animation[];
  animationsTiming: [Animation, number, number][];
  maxEndTime: number;

  constructor(
    animations: Animation[],
    {
      runTime = 0, // Initialized in initRunTime
      rateFunc = linear,
      lagRatio = DEFAULT_ANIMATION_LAG_RATIO,
      group,
    }: {
      runTime?: number;
      rateFunc?: RateFunc;
      lagRatio?: number;
      group?: Group;
    } = {}
  ) {
    super(group || new Group(), { rateFunc, runTime, lagRatio });
    this.animations = animations;

    if (!group) {
      this.mobject.add(
        withoutRedundancies(animations.map((anim) => anim.mobject))
      );
    }

    this.initRunTime();
  }

  getAllMobjects(): Mobject[] {
    return (this.mobject as Group).submobjects;
  }

  get group(): Group {
    return this.mobject as Group;
  }

  begin(): void {
    for (const anim of this.animations) {
      anim.begin();
    }
  }

  finish(): void {
    for (const anim of this.animations) {
      anim.finish();
    }
  }

  cleanUpFromScene(scene: Scene): void {
    for (const anim of this.animations) {
      anim.cleanUpFromScene(scene);
    }
  }

  updateMobjects(dt: number): void {
    for (const anim of this.animations) {
      anim.updateMobjects(dt);
    }
  }

  initRunTime(): void {
    this.animationsTiming = this.getAnimationsWithTimings();

    this.maxEndTime = Math.max(
      ...this.animationsTiming.map((timing) => timing[2])
    );

    if (this.runTime === 0) {
      this.runTime = this.maxEndTime;
    }
  }

  getAnimationsWithTimings(): [Animation, number, number][] {
    const animationWithTimings: [Animation, number, number][] = [];
    let currentTime = 0;

    for (const anim of this.animations) {
      const startTime = currentTime;
      const endTime = startTime + anim.runTime;
      animationWithTimings.push([anim, startTime, endTime]);

      currentTime = interpolateValue(startTime, endTime, this.lagRatio);
    }

    return animationWithTimings;
  }

  interpolate(alpha: number): void {
    const time = alpha * this.maxEndTime;

    for (const [anim, startTime, endTime] of this.animationsTiming) {
      const animTime = endTime - startTime;

      let subAlpha = 0;

      if (animTime !== 0) {
        subAlpha = clip((time - startTime) / animTime, 0, 1);
      }

      anim.interpolate(subAlpha);
    }
  }
}

export class Succession extends AnimationGroup {
  activeAnimation: Animation;

  constructor(
    animations: Animation[],
    {
      runTime = 0,
      rateFunc = linear,
      lagRatio = 1,
      group,
    }: {
      runTime?: number;
      rateFunc?: RateFunc;
      lagRatio?: number;
      group?: Group;
    } = {}
  ) {
    super(animations, { runTime, rateFunc, lagRatio, group });
    if (animations.length === 0) {
      throw new Error('Animations list cannot be empty');
    }
  }

  begin(): void {
    this.initRunTime();
    this.activeAnimation = this.animations[0];
    this.activeAnimation.begin();
  }

  finish(): void {
    this.activeAnimation.finish();
  }

  interpolate(alpha: number): void {
    const [index, subAlpha] = integerInterpolate(
      0,
      this.animations.length,
      alpha
    );

    const anim = this.animations[index];

    if (anim !== this.activeAnimation) {
      this.activeAnimation.finish();
      this.activeAnimation = anim;
      this.activeAnimation.begin();
    }

    anim.interpolate(subAlpha);
  }
}

export class LaggedStart extends AnimationGroup {
  constructor(
    animations: Animation[],
    {
      runTime = 0,
      rateFunc = linear,
      lagRatio = DEFAULT_ANIMATION_LAGGED_START_LAG_RATIO,
      group,
    }: {
      runTime?: number;
      rateFunc?: RateFunc;
      lagRatio?: number;
      group?: Group;
    } = {}
  ) {
    super(animations, { runTime, rateFunc, lagRatio, group });
  }
}
