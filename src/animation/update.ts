import { Animation } from './animation';
import { DEFAULT_ANIMATION_RUN_TIME } from '../constants';
import { Mobject } from '../mobject/types/mobject';
import { smooth } from '../util/rate_functions';

class UpdateFromFunc<Mob extends Mobject> extends Animation {
  private updateFunc: (mob: Mob) => Mob;

  constructor({
    mobject,
    updateFunc,
    runTime = DEFAULT_ANIMATION_RUN_TIME,
    rateFunc = smooth,
    lagRatio = 0,
  }: {
    mobject: Mob;
    updateFunc: (mob: Mob) => Mob;
    runTime?: number;
    rateFunc?: (t: number) => number;
    lagRatio?: number;
  }) {
    super(mobject, { runTime, rateFunc, lagRatio });
    this.updateFunc = updateFunc;
  }

  interpolateMobject(alpha: number): void {
    this.updateFunc(this.mobject as Mob);
  }
}

class UpdateFromAlphaFunc<Mob extends Mobject> extends Animation {
  private updateFunc: (mob: Mob, alpha: number) => Mob;

  constructor({
    mobject,
    updateFunc,
    runTime = DEFAULT_ANIMATION_RUN_TIME,
    rateFunc = smooth,
    lagRatio = 0,
  }: {
    mobject: Mob;
    updateFunc: (mob: Mob, alpha: number) => Mob;
    runTime?: number;
    rateFunc?: (t: number) => number;
    lagRatio?: number;
  }) {
    super(mobject, { runTime, rateFunc, lagRatio });
    this.updateFunc = updateFunc;
  }

  interpolateMobject(alpha: number): void {
    this.updateFunc(this.mobject as Mob, alpha);
  }
}

export { UpdateFromFunc, UpdateFromAlphaFunc };
