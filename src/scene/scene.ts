import { Animation } from '../animation/animation';
import { AnimationGroup } from '../animation/composition';
import { Camera } from '../camera/camera';
import { AbstractDisplay } from '../display/abstract_display';
import { Mobject } from '../mobject/types/mobject';
import { AbstractRenderer } from '../renderer/abstract_renderer';
import { enumerate, max } from '../util/array';
import { Event, EventType } from '../util/events/event';
import { EventDispatcher } from '../util/events/event_dispatcher';
import { EventListener } from '../util/events/event_listener';
import { MousePressedEvent } from '../util/events/mouse_events';

abstract class Scene {
  time: number = 0;
  alwaysUpdateMobjects: boolean = false;
  randomSeed: number = 0;

  mobjects: Mobject[];
  random: Random;
  camera: Camera;
  renderer: AbstractRenderer;
  display: AbstractDisplay;

  constructor() {
    this.camera = this.createCamera();
    this.random = new Random(this.randomSeed);
    this.mobjects = [];
  }

  bindDisplay(_display: AbstractDisplay): void {
    this.display = _display;
    this.renderer = this.display.renderer;
    this.display.bindCamera(this.camera);
    this.camera.bindDisplay(this.display);
  }

  async run(): Promise<void> {
    this.display.bindEventListeners();

    await this.setup();
    try {
      await this.construct();
    } catch (e) {
      if (e instanceof EndSceneEarlyException) {
        console.log('An EndSceneEarlyException has occurred');
      } else {
        throw e;
      }
    }
    this.resetCamera();
    this.render();
    await this.tearDown();

    await this.display.tearDown();
    this.display.unbindEventListeners();
  }

  createCamera(): Camera {
    return new Camera();
  }

  async preload(): Promise<void> {}
  async setup(): Promise<void> {}
  abstract construct(): Promise<void>;
  async tearDown(): Promise<void> {}

  resetCamera(): void {
    this.camera.reset();
  }

  render(): void {
    this.camera.render(this.mobjects);
  }

  updateFrame(dt: number): void {
    this.resetCamera();
    this.render();
    this.time += dt;
  }

  updateMobjects(dt: number): void {
    for (const mob of this.mobjects) {
      mob.update(dt);
    }
  }

  shouldUpdateMobjects(): boolean {
    return (
      this.alwaysUpdateMobjects ||
      this.getMobjectsFamilies().some((mob) => mob.hasUpdaters())
    );
  }

  getTime(): number {
    return this.time;
  }

  incrementTime(dt: number): void {
    this.time += dt;
  }

  getTopLevelMobjects(): Mobject[] {
    const mobjects = this.getMobjects();
    const families = mobjects.map((m) => m.getFamily());

    const isTopLevel = (mob: Mobject): boolean => {
      return families.filter((family) => family.includes(mob)).length === 1;
    };

    return mobjects.filter(isTopLevel);
  }

  getMobjectsFamilies(): Mobject[] {
    return this.camera.extractMobjectFamilyMembers(this.mobjects);
  }

  addToBack(mobjects: Mobject[]): void {
    this.restructureMobjects({ toRemove: mobjects });
    this.mobjects.push(...mobjects);
  }

  add(mobjects: Mobject[]): void {
    this.addToFront(mobjects);
  }

  addToFront(mobjects: Mobject[]): void {
    this.restructureMobjects({ toRemove: mobjects });
    this.mobjects.unshift(...mobjects);
  }

  remove(mobjects: Mobject[]): void {
    this.restructureMobjects({ toRemove: mobjects, extractFamilies: true });
  }

  restructureMobjects({
    toRemove = [],
    extractFamilies = true,
  }: {
    toRemove?: Mobject[];
    extractFamilies?: boolean;
  }): void {
    const toRemove_ = [
      ...toRemove,
      ...(extractFamilies
        ? this.camera.extractMobjectFamilyMembers(toRemove)
        : []),
    ];

    this.mobjects = this.getRestructuredMobjectList(this.mobjects, toRemove_);
  }

  getRestructuredMobjectList(
    mobjects: Mobject[],
    toRemove: Mobject[]
  ): Mobject[] {
    const newMobjects: Mobject[] = [];
    const setToRemove = new Set(toRemove);

    const addSafeMobjectsFromList = (
      mobjects: Mobject[],
      setToRemove: Set<Mobject>
    ) => {
      for (const mob of mobjects) {
        if (setToRemove.has(mob)) {
          continue;
        }

        const intersect = new Set(
          mob.getFamily().filter((m) => setToRemove.has(m))
        );
        if (intersect.size > 0) {
          addSafeMobjectsFromList(mob.submobjects, intersect);
        } else {
          newMobjects.push(mob);
        }
      }
    };

    addSafeMobjectsFromList(mobjects, setToRemove);
    return newMobjects;
  }

  bringToFront(mobs: Mobject[]): void {
    this.addToFront(mobs);
  }

  bringToBack(mobs: Mobject[]): void {
    this.addToBack(mobs);
  }

  clear(): void {
    this.mobjects = [];
  }

  getMobjects(): Mobject[] {
    return [...this.mobjects];
  }

  getMobjectCopies(): Mobject[] {
    return this.mobjects.map((mob) => mob.copy());
  }

  getMovingMobjects(animations: Animation[]): Mobject[] {
    const animationMobjects = animations.map((anim) => anim.mobject);
    const mobjects = this.getMobjectsFamilies();

    for (const [i, mob] of enumerate(mobjects)) {
      if (
        animationMobjects.includes(mob) ||
        mob.getFamilyUpdaters().length > 0
      ) {
        return mobjects.slice(i);
      }
    }

    return [];
  }

  getRunTime(animations: Animation[]): number {
    return Math.max(...animations.map((anim) => anim.runTime));
  }

  beginAnimation(animation: Animation): void {
    const currentMobjects = this.getMobjectsFamilies();

    animation.begin();
    const mob = animation.mobject;
    if (!currentMobjects.includes(mob)) {
      this.add([mob]);
      currentMobjects.push(...mob.getFamily());
    }
  }

  async progressThroughAnimation(animation: Animation): Promise<void> {
    let t = 0.0;

    while (t < animation.runTime) {
      const dt = await this.display.nextFrame();
      t += dt;

      const alpha = t / animation.runTime;
      animation.updateMobjects(dt);
      animation.interpolate(alpha);

      this.updateMobjects(dt);
      this.updateFrame(dt);
    }
  }

  finishAnimation(animation: Animation): void {
    animation.finish();
    animation.cleanUpFromScene(this);
    this.updateMobjects(0);
  }

  async play(animation: Animation): Promise<void> {
    this.beginAnimation(animation);
    await this.progressThroughAnimation(animation);
    this.finishAnimation(animation);
  }

  async playMany(animations: Animation[]): Promise<void> {
    return this.play(new AnimationGroup(animations));
  }

  async wait(duration: number = 1.0): Promise<void> {
    let t = 0.0;

    while (t < duration) {
      const dt = await this.display.nextFrame();
      t += dt;

      this.updateMobjects(dt);
      this.updateFrame(dt);
    }
  }

  async continueRendering(): Promise<void> {
    while (true) {
      await this.wait();
    }
  }

  addEventListener(listener: EventListener): void {
    EventDispatcher.eventDispatcher.addListener(listener);
  }

  removeEventListener(listener: EventListener): void {
    EventDispatcher.eventDispatcher.removeListener(listener);
  }

  async waitForEvent<IEvent extends Event>(
    eventType: EventType,
    markAsHandled: boolean = false,
    continueRendering: boolean = true
  ): Promise<IEvent> {
    if (continueRendering) {
      let completed = false;
      let event: IEvent;

      const listener = new EventListener<IEvent>(eventType, (_event) => {
        if (!completed) {
          event = _event;
          completed = true;
        }

        return markAsHandled;
      });

      this.addEventListener(listener);

      while (!completed) {
        const dt = await this.display.nextFrame();
        this.updateMobjects(dt);
        this.updateFrame(dt);
      }

      this.removeEventListener(listener);

      return event!;
    } else {
      return new Promise<IEvent>((resolve) => {
        const listener = new EventListener<IEvent>(eventType, (event) => {
          resolve(event);
          return markAsHandled;
        });

        this.addEventListener(listener);
      });
    }
  }

  async waitForClick(
    markAsHandled: boolean = false,
    continueRendering: boolean = true
  ): Promise<MousePressedEvent> {
    return this.waitForEvent<MousePressedEvent>(
      EventType.mousePressedEvent,
      markAsHandled,
      continueRendering
    );
  }
}

class EndSceneEarlyException extends Error {}

function runScene(scene: Scene): void {
  scene.run();
}

export { Scene, EndSceneEarlyException, runScene };
