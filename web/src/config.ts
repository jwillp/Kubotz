/**
 * Tuning values, copied from the LibGDX Config.java / Constants.java /
 * component defaults so the web port plays like the original.
 * Distances are in game units (1 unit = 1 map tile = UNIT px), times in ms.
 */
export const UNIT = 64;

export const Config = {
  GRAVITY: 40, // PhysicsSystem: new World(new Vector2(0, -40f))

  // Kubotz body (KubotzFactory.withHeight(2.0f))
  KUBOTZ_WIDTH: 1,
  KUBOTZ_HEIGHT: 2,
  KUBOTZ_HEALTH: 100,
  KUBOTZ_ENERGY: 100,

  // Running / jumping (PhysicsComponent + KubotzFactory acceleration (0.5, 20))
  RUN_ACCELERATION: 0.5 * 60, // 0.5 u/s added every 60 Hz frame
  MAX_SPEED: 18,
  JUMP_VELOCITY: 20,
  JUMP_COOLDOWN: 500,
  NB_JUMPS: 3, // new JumpComponent(3)
  FAST_FALL_FACTOR: 0.2,

  // Punch (MeleeSystem)
  PUNCH_DAMAGE: 3,
  PUNCH_DURATION: 500,
  PUNCH_COOLDOWN: 80,
  PUNCH_KNOCKBACK: 9, // original passed 0; the owner wants hits to push
  // Knockback multiplier = 1 + KNOCKBACK_GROWTH x (damage taken / max health), SSB-like.
  KNOCKBACK_GROWTH: 2,
  // Hitstun (ms) = HITSTUN_BASE + launch speed (units/s) x HITSTUN_PER_UNIT, like SSB's 0.4 x knockback;
  // past TUMBLE_HITSTUN the robot tumbles, bouncing off walls and ceilings.
  HITSTUN_BASE: 120,
  HITSTUN_PER_UNIT: 30,
  HITSTUN_MAX: 1500,
  TUMBLE_HITSTUN: 600,
  WALL_BOUNCE: 0.65,

  // Grab (GrabComponent)
  GRAB_DURATION: 200,
  GRAB_COOLDOWN: 100,
  GRAB_RADIUS: 1, // phys.getWidth() * 2 with half-width 0.5

  // Laser sword
  LASER_SWORD_DAMAGE: 10,
  LASER_SWORD_DURATION: 200,
  LASER_SWORD_COOLDOWN: 100,

  // Laser guns
  LASER_GUN_MK_I: { damage: 5, speed: 30, cooldown: 500, recoil: 7 },
  LASER_GUN_MK_II: { damage: 9, speed: 40, cooldown: 600, recoil: 11 },
  BULLET_LIFESPAN: 5000,

  // Guard bubble (held, like Super Smash Bros.' shield): drains while held and
  // when hit, refills when released; breaking it stuns the robot.
  GUARD_MAX: 50,
  GUARD_DRAIN: 10, // per second while held
  GUARD_REGEN: 8, // per second while released
  GUARD_MIN_RAISE: 5,
  GUARD_BREAK_STUN: 2500,
  GUARD_BREAK_REFILL: 20,
  // Guard in mid-air: air dodge (SSB), once per jump.
  AIR_DODGE_SPEED: 16,
  AIR_DODGE_DURATION: 350, // intangible: attacks and bullets pass through

  // Match start: narrator counts 3, 2, 1, Fight! while inputs are off.
  COUNTDOWN: 3000,

  // Respawn
  RESPAWN_DELAY: 2000,
  NB_LIVES: 5,

  // Power ups (Constants + PowerUpsSystem)
  MAX_NB_BONUS: 5,
  MIN_DELAY_BONUS_SPAWN: 5000,
  MAX_DELAY_BONUS_SPAWN: 10000,
  POWERUP_LIFETIME: 20000,
  POWERUP_DURATION: 30000,
  POWERUP_RADIUS: 0.45,

  // Camera (GameCamera / CameraSystem)
  CAMERA_VIEW_WIDTH: 80,
  CAMERA_MIN_ZOOM: 0.3,
  CAMERA_MAX_ZOOM: 1.7,
  CAMERA_SPEED: 8,
  CAMERA_ZOOM_SPEED: Math.hypot(8, 5),

  // Spriter scale (SpriterAnimationComponent scale 0.005 units per pixel)
  SPRITER_SCALE: 0.0065, // original 0.005 left the art shorter than its 2-unit body
} as const;
