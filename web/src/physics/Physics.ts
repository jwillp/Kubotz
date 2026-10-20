import { Body, Box, Circle, Contact, Fixture, Vec2, World } from 'planck';
import { Config, UNIT } from '../config';

/**
 * Box2D physics (planck.js, a JS port of Box2D), set up like the original
 * PhysicsSystem: gravity 40 u/s², fixed 60 Hz step with 6 velocity and
 * 2 position iterations. The world works in game units with y pointing down
 * (Box2D does not care about the axis direction), so converting to screen
 * pixels is only a multiplication by UNIT.
 */

const STEP = 1 / 60;

// Collision categories
const CAT_STATIC = 0x1;
const CAT_KUBOTZ = 0x2;
const CAT_ITEM = 0x4;

type FixtureTag = 'foot' | 'kubotz' | 'static' | 'item';

export class PhysicsWorld {
  readonly world = new World({ gravity: Vec2(0, Config.GRAVITY), allowSleep: false });
  private acc = 0;

  constructor() {
    // Foot sensors count what the robot stands on (PhysicsComponent.isGrounded).
    const footDelta = (c: Contact, d: number) => {
      for (const [mine, other] of [[c.getFixtureA(), c.getFixtureB()], [c.getFixtureB(), c.getFixtureA()]] as [Fixture, Fixture][]) {
        if (mine.getUserData() !== 'foot' || other.isSensor()) continue;
        if (other.getBody() === mine.getBody()) continue;
        const kb = mine.getBody().getUserData() as KubotzBody;
        kb.footContacts += d;
      }
    };
    this.world.on('begin-contact', (c) => footDelta(c, 1));
    this.world.on('end-contact', (c) => footDelta(c, -1));
  }

  /** A static block (BlockFactory: WALL / STATIC_PLATFORM), pixel rectangle. */
  addBlock(x: number, y: number, w: number, h: number): void {
    const b = this.world.createBody({ type: 'static', position: Vec2((x + w / 2) / UNIT, (y + h / 2) / UNIT) });
    b.createFixture({
      shape: new Box(w / 2 / UNIT, h / 2 / UNIT), friction: 0.2,
      filterCategoryBits: CAT_STATIC, userData: 'static' as FixtureTag,
    });
  }

  /** Advances the world in fixed 1/60 s steps; returns the number of steps taken. */
  step(dtSeconds: number): number {
    this.acc = Math.min(this.acc + dtSeconds, STEP * 5);
    let n = 0;
    while (this.acc >= STEP) {
      this.world.step(STEP, 6, 2);
      this.acc -= STEP;
      n++;
    }
    return n;
  }
}

/** Common pixel-space accessors over a planck body. */
abstract class PxBody {
  constructor(readonly body: Body) {}
  get x(): number { return this.body.getPosition().x * UNIT; }
  get y(): number { return this.body.getPosition().y * UNIT; }
  get vx(): number { return this.body.getLinearVelocity().x * UNIT; }
  set vx(v: number) { this.body.setLinearVelocity(Vec2(v / UNIT, this.body.getLinearVelocity().y)); }
  get vy(): number { return this.body.getLinearVelocity().y * UNIT; }
  set vy(v: number) { this.body.setLinearVelocity(Vec2(this.body.getLinearVelocity().x, v / UNIT)); }
  setVelocity(vx: number, vy: number): void { this.body.setLinearVelocity(Vec2(vx / UNIT, vy / UNIT)); }
  /** Moves the body (pixels), keeping its velocity. */
  setPosition(x: number, y: number): void { this.body.setTransform(Vec2(x / UNIT, y / UNIT), 0); }
  set enable(on: boolean) { this.body.setActive(on); }
  get enable(): boolean { return this.body.isActive(); }
  destroy(): void { this.body.getWorld().destroyBody(this.body); }
}

/**
 * The Kubotz body (KubotzFactory.buildBody): a fixed-rotation dynamic body made
 * of a box between two circles (a capsule: torso, head and legs hitboxes) and a
 * foot sensor. The original was 2 x 4 units; it is scaled to the 1 x 2 unit
 * robot the art and map of this port use.
 */
export class KubotzBody extends PxBody {
  footContacts = 0;
  readonly width = Config.KUBOTZ_WIDTH * UNIT;
  readonly height = Config.KUBOTZ_HEIGHT * UNIT;

  constructor(physics: PhysicsWorld, x: number, y: number) {
    super(physics.world.createBody({
      type: 'dynamic', position: Vec2(x / UNIT, y / UNIT), fixedRotation: true, allowSleep: false,
    }));
    this.body.setUserData(this);
    const hw = Config.KUBOTZ_WIDTH / 2; // 0.5
    const hh = Config.KUBOTZ_HEIGHT / 2; // 1
    const r = hw; // circles as wide as the body
    const filter = { filterCategoryBits: CAT_KUBOTZ, filterMaskBits: CAT_STATIC | CAT_KUBOTZ };
    const tag = 'kubotz' as FixtureTag;
    // Torso: box 0.9 x the width, half the height (density 0 like the original).
    this.body.createFixture({ shape: new Box(hw * 0.9, hh * 0.5), density: 0, friction: 0.2, userData: tag, ...filter });
    // Head and legs circles, centred half-way to the top and bottom edges.
    this.body.createFixture({ shape: new Circle(Vec2(0, -(hh - r)), r), density: 0.1, friction: 0.2, userData: tag, ...filter });
    this.body.createFixture({ shape: new Circle(Vec2(0, hh - r), r), density: 0.1, friction: 0.2, userData: tag, ...filter });
    // Foot sensor just under the legs circle.
    this.body.createFixture({ shape: new Box(0.05, 0.05, Vec2(0, hh)), isSensor: true, userData: 'foot' as FixtureTag, ...filter });
  }

  get grounded(): boolean { return this.footContacts > 0 && this.body.getLinearVelocity().y >= -0.5; }
  get top(): number { return this.y - this.height / 2; }
  get bottom(): number { return this.y + this.height / 2; }
  get left(): number { return this.x - this.width / 2; }

  /** -1 / 1 when pressed against a wall on that side, else 0 (for the CPU). */
  get wall(): -1 | 0 | 1 {
    for (let e = this.body.getContactList(); e; e = e.next ?? null) {
      const c = e.contact;
      if (!c.isTouching() || c.getFixtureA().isSensor() || c.getFixtureB().isSensor()) continue;
      if (e.other?.getType() !== 'static') continue;
      const m = c.getWorldManifold(null);
      if (!m) continue;
      // The normal points from A to B: make it point from this body to the wall.
      const nx = c.getFixtureA().getBody() === this.body ? m.normal.x : -m.normal.x;
      if (Math.abs(nx) > 0.7) return nx > 0 ? 1 : -1;
    }
    return 0;
  }

  /** Respawn / teleport: move to (x, y) pixels, optionally stopping. */
  reset(x: number, y: number, keepVelocity = false): void {
    this.setPosition(x, y);
    if (!keepVelocity) this.setVelocity(0, 0);
    this.body.setAwake(true);
  }
}

/** A power-up pick-up (PowerUpFactory): circle, density 0.8, restitution 0.5. */
export class ItemBody extends PxBody {
  constructor(physics: PhysicsWorld, x: number, y: number, radius: number) {
    super(physics.world.createBody({ type: 'dynamic', position: Vec2(x / UNIT, y / UNIT), fixedRotation: true }));
    this.body.createFixture({
      shape: new Circle(radius / UNIT), density: 0.8, restitution: 0.5, friction: 0.5,
      filterCategoryBits: CAT_ITEM, filterMaskBits: CAT_STATIC, userData: 'item' as FixtureTag,
    });
    this.body.setLinearDamping(0.5);
  }
}
