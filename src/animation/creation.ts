import { Animation } from './animation';
import {
  DEFAULT_ANIMATION_RUN_TIME,
  DEFAULT_ANIMATION_LAG_RATIO,
} from '../constants';
import { Mobject } from '../mobject/types/mobject';
import { VMobject } from '../mobject/types/vectorized_mobject';
import { Color } from '../util/color';
import { TRANSPARENT } from '../constants';
import { smooth, linear, invertRateFunc } from '../util/rate_functions';
import { integerInterpolate } from '../util/bezier';

type RateFunc = (t: number) => number;

abstract class ShowPartial extends Animation {
  constructor(
    mobject: Mobject,
    runTime: number = DEFAULT_ANIMATION_RUN_TIME,
    rateFunc: RateFunc = smooth,
    lagRatio: number = DEFAULT_ANIMATION_LAG_RATIO
  ) {
    super(mobject, { runTime, rateFunc, lagRatio });
  }

  interpolateSubMobject(mobs: Mobject[], alpha: number): void {
    const subMob = mobs[0];
    const startSubMob = mobs[1];
    const bounds = this.getBounds(alpha);
    subMob.pointwiseBecomePartial(startSubMob, bounds[0], bounds[1]);
  }

  abstract getBounds(alpha: number): [number, number];
}

class ShowCreation extends ShowPartial {
  constructor(
    mobject: Mobject,
    runTime: number = DEFAULT_ANIMATION_RUN_TIME,
    rateFunc: RateFunc = smooth,
    lagRatio: number = DEFAULT_ANIMATION_LAG_RATIO
  ) {
    super(mobject, runTime, rateFunc, lagRatio);
  }

  getBounds(alpha: number): [number, number] {
    return [0, alpha];
  }
}

class Uncreate extends ShowCreation {
  constructor(
    mobject: Mobject,
    runTime: number = DEFAULT_ANIMATION_RUN_TIME,
    rateFunc: RateFunc = smooth,
    lagRatio: number = DEFAULT_ANIMATION_LAG_RATIO
  ) {
    super(mobject, runTime, invertRateFunc(rateFunc), lagRatio);
    this.remover = true;
  }
}

class DrawBorderThenFill extends Animation {
  strokeWidth: number;
  strokeColor?: Color;
  submobToIndex: Map<number, number> = new Map();
  outline!: VMobject;
  vmobject: VMobject;

  constructor(
    vmobject: VMobject,
    runTime: number = DEFAULT_ANIMATION_RUN_TIME * 2,
    rateFunc: RateFunc = smooth,
    lagRatio: number = DEFAULT_ANIMATION_LAG_RATIO,
    strokeWidth: number = 2,
    strokeColor?: Color
  ) {
    super(vmobject, { runTime, rateFunc, lagRatio });
    this.vmobject = vmobject;
    this.strokeWidth = strokeWidth;
    this.strokeColor = strokeColor;

    for (const submob of vmobject.getVectorizedFamily()) {
      this.submobToIndex.set(submob.hashCode(), 0);
    }
  }

  begin(): void {
    this.outline = this.getOutline();
    super.begin();
    this.vmobject.matchStyle(this.outline);
  }

  getOutline(): VMobject {
    const outline = this.vmobject.copy();
    outline.setFill({ color: TRANSPARENT });

    for (const sm of outline.getVectorizedFamily()) {
      sm.setStroke({
        color: this.getStrokeColor(sm),
        width: this.strokeWidth,
      });
    }

    return outline;
  }

  getStrokeColor(mob: VMobject): Color {
    if (this.strokeColor) return this.strokeColor;
    if (mob.getStrokeWidth() > 0) return mob.getStrokeColor();
    return mob.getColor();
  }

  getAllMobjects(): Mobject[] {
    return [...super.getAllMobjects(), this.outline];
  }

  interpolateSubMobject(mobs: Mobject[], alpha: number): void {
    const submob = mobs[0] as VMobject;
    const start = mobs[1] as VMobject;
    const outline = mobs[2] as VMobject;

    const [index, subAlpha] = integerInterpolate(0, 2, alpha);

    if (index === 1 && this.submobToIndex.get(submob.hashCode()) === 0) {
      submob.setColor({ color: outline.getColor() });
      submob.points = [...outline.points];

      submob.setFill({ colors: outline.getFillColors() });
      submob.setStroke({
        colors: outline.getStrokeColors(),
        width: outline.getStrokeWidth(),
      });
      submob.setStroke({
        colors: outline.getStrokeColors({ background: true }),
        width: outline.getStrokeWidth({ background: true }),
        background: true,
      });

      this.submobToIndex.set(submob.hashCode(), 1);
    }

    if (index === 0) {
      submob.pointwiseBecomePartial(outline, 0, subAlpha);
    } else {
      submob.interpolate(outline, start, subAlpha);
    }
  }
}

class Write extends DrawBorderThenFill {
  private constructor(
    vmobject: VMobject,
    rateFunc: RateFunc = linear,
    runTime: number,
    lagRatio: number,
    strokeWidth: number = 2,
    strokeColor?: Color
  ) {
    super(vmobject, runTime, rateFunc, lagRatio, strokeWidth, strokeColor);
  }

  static create(
    vmobject: VMobject,
    rateFunc: RateFunc = linear,
    runTime?: number,
    lagRatio?: number,
    strokeWidth: number = 2,
    strokeColor?: Color
  ): Write {
    const length = vmobject.getFamilyWithPoints().length;

    runTime = runTime ?? (length < 15 ? 1 : 2);
    lagRatio = lagRatio ?? Math.min(4.0 / length, 0.2);

    return new Write(
      vmobject,
      rateFunc,
      runTime,
      lagRatio,
      strokeWidth,
      strokeColor
    );
  }
}

export { ShowPartial, ShowCreation, Uncreate, DrawBorderThenFill, Write };
