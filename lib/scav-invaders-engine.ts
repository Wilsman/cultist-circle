export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;
export const HIGH_SCORE_STORAGE_KEY =
  "cultist-circle:scav-invaders-high-score:v1";

export type GamePhase = "attract" | "playing" | "paused" | "game-over";
export type BossPattern = "marksman" | "charger" | "heavy" | "commander";
export type GameEvent =
  | "shot"
  | "hit"
  | "explosion"
  | "boss-arrival"
  | "player-hit"
  | "game-over"
  | "wave";

export interface BossDefinition {
  name: string;
  pattern: BossPattern;
  color: string;
}

export const BOSS_DEFINITIONS: readonly BossDefinition[] = [
  { name: "Birdeye", pattern: "marksman", color: "#27d9ff" },
  { name: "Shturman", pattern: "marksman", color: "#27d9ff" },
  { name: "Zryachiy", pattern: "marksman", color: "#27d9ff" },
  { name: "Knight", pattern: "charger", color: "#ff365f" },
  { name: "Killa", pattern: "charger", color: "#ff365f" },
  { name: "Tagilla", pattern: "charger", color: "#ff365f" },
  { name: "Partisan", pattern: "charger", color: "#ff365f" },
  { name: "Big Pipe", pattern: "heavy", color: "#ffd928" },
  { name: "Glukhar", pattern: "heavy", color: "#ffd928" },
  { name: "Kaban", pattern: "heavy", color: "#ffd928" },
  { name: "Kollontay", pattern: "heavy", color: "#ffd928" },
  { name: "The Wedge", pattern: "heavy", color: "#ffd928" },
  { name: "Cultist Priest", pattern: "commander", color: "#9dff2e" },
  { name: "Reshala", pattern: "commander", color: "#9dff2e" },
  { name: "Sanitar", pattern: "commander", color: "#9dff2e" },
] as const;

export interface PlayerInput {
  move: -1 | 0 | 1;
  fire: boolean;
}

export interface RectEntity {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Scav extends RectEntity {
  row: number;
  column: number;
}

export interface Bullet extends RectEntity {
  vx: number;
  vy: number;
  owner: "player" | "enemy";
}

export interface Barrier extends RectEntity {
  health: number;
}

export interface BlastEffect {
  x: number;
  y: number;
  radius: number;
  color: string;
  remaining: number;
}

export interface Boss extends RectEntity {
  definition: BossDefinition;
  health: number;
  maxHealth: number;
  direction: -1 | 1;
  attackCooldown: number;
  summonCooldown: number;
  motionTime: number;
}

export interface GameState {
  phase: GamePhase;
  score: number;
  highScore: number;
  wave: number;
  lives: number;
  player: RectEntity & { fireCooldown: number; invulnerableFor: number };
  scavs: Scav[];
  boss: Boss | null;
  bullets: Bullet[];
  barriers: Barrier[];
  effects: BlastEffect[];
  formationDirection: -1 | 1;
  enemyFireCooldown: number;
  waveBannerFor: number;
  events: GameEvent[];
}

const PLAYER_SPEED = 250;
const PLAYER_FIRE_INTERVAL = 0.24;

function spawnScavs(wave: number): Scav[] {
  const columns = 8;
  const rows = Math.min(4, 3 + Math.floor((wave - 1) / 4));
  const gapX = 49;
  const gapY = 31;
  const startX = (GAME_WIDTH - (columns - 1) * gapX - 24) / 2;

  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    return {
      x: startX + column * gapX,
      y: 64 + row * gapY,
      width: 24,
      height: 18,
      row,
      column,
    };
  });
}

function spawnBarriers(): Barrier[] {
  return [112, 252, 392, 532].map((x) => ({
    x,
    y: 287,
    width: 42,
    height: 13,
    health: 8,
  }));
}

export function getBossForWave(wave: number): BossDefinition | null {
  if (wave < 3 || wave % 3 !== 0) return null;
  const encounterIndex = wave / 3 - 1;
  return BOSS_DEFINITIONS[encounterIndex % BOSS_DEFINITIONS.length];
}

function spawnBoss(wave: number): Boss | null {
  const definition = getBossForWave(wave);
  if (!definition) return null;
  const maxHealth = 18 + Math.floor(wave / 3) * 6;

  return {
    x: GAME_WIDTH / 2 - 35,
    y: 76,
    width: 70,
    height: 34,
    definition,
    health: maxHealth,
    maxHealth,
    direction: 1,
    attackCooldown: 1.1,
    summonCooldown: 4.5,
    motionTime: 0,
  };
}

export function createAttractState(highScore = 0): GameState {
  return {
    phase: "attract",
    score: 0,
    highScore,
    wave: 1,
    lives: 3,
    player: {
      x: GAME_WIDTH / 2 - 15,
      y: 316,
      width: 30,
      height: 18,
      fireCooldown: 0,
      invulnerableFor: 0,
    },
    scavs: spawnScavs(1),
    boss: null,
    bullets: [],
    barriers: spawnBarriers(),
    effects: [],
    formationDirection: 1,
    enemyFireCooldown: 1.2,
    waveBannerFor: 0,
    events: [],
  };
}

export function startGame(highScore = 0): GameState {
  return {
    ...createAttractState(highScore),
    phase: "playing",
    waveBannerFor: 1,
  };
}

function overlaps(a: RectEntity, b: RectEntity): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function awardPoints(state: GameState, points: number) {
  state.score += points;
  state.highScore = Math.max(state.highScore, state.score);
}

function damagePlayer(state: GameState) {
  if (state.player.invulnerableFor > 0) return;
  state.lives -= 1;
  state.events.push("player-hit");
  state.effects.push({
    x: state.player.x + state.player.width / 2,
    y: state.player.y + state.player.height / 2,
    radius: 18,
    color: "#ff365f",
    remaining: 0.35,
  });
  state.bullets = state.bullets.filter((bullet) => bullet.owner === "player");
  state.player.x = GAME_WIDTH / 2 - state.player.width / 2;
  state.player.invulnerableFor = 1.35;

  if (state.lives <= 0) {
    state.phase = "game-over";
    state.events.push("game-over");
  }
}

function addEnemyShot(
  state: GameState,
  x: number,
  y: number,
  vx = 0,
  vy = 145,
) {
  state.bullets.push({
    x: x - 2,
    y,
    width: 4,
    height: 9,
    vx,
    vy,
    owner: "enemy",
  });
}

function fireBossWeapon(state: GameState) {
  const boss = state.boss;
  if (!boss) return;
  const centerX = boss.x + boss.width / 2;
  const muzzleY = boss.y + boss.height;
  const pattern = boss.definition.pattern;

  if (pattern === "marksman") {
    const dx =
      state.player.x + state.player.width / 2 - (boss.x + boss.width / 2);
    addEnemyShot(state, centerX, muzzleY, Math.max(-90, Math.min(90, dx)), 175);
    boss.attackCooldown = 1.25;
  } else if (pattern === "charger") {
    addEnemyShot(state, centerX - 10, muzzleY, -35, 165);
    addEnemyShot(state, centerX + 10, muzzleY, 35, 165);
    boss.attackCooldown = 0.82;
  } else if (pattern === "heavy") {
    [-75, -38, 0, 38, 75].forEach((vx) =>
      addEnemyShot(state, centerX, muzzleY, vx, 135),
    );
    boss.attackCooldown = 1.65;
  } else {
    addEnemyShot(state, centerX, muzzleY, 0, 150);
    boss.attackCooldown = 1.05;
  }
}

function advanceWave(state: GameState) {
  state.wave += 1;
  state.bullets = [];
  state.formationDirection = 1;
  state.enemyFireCooldown = Math.max(0.38, 1.15 - state.wave * 0.045);
  state.waveBannerFor = 1.25;
  state.boss = spawnBoss(state.wave);
  state.scavs = state.boss ? [] : spawnScavs(state.wave);
  if (state.boss) state.events.push("boss-arrival");
  else state.events.push("wave");

  if (state.wave % 3 === 1) {
    state.barriers = spawnBarriers();
  }
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    player: { ...state.player },
    scavs: state.scavs.map((scav) => ({ ...scav })),
    boss: state.boss ? { ...state.boss } : null,
    bullets: state.bullets.map((bullet) => ({ ...bullet })),
    barriers: state.barriers.map((barrier) => ({ ...barrier })),
    effects: state.effects.map((effect) => ({ ...effect })),
    events: [],
  };
}

export function stepGame(
  previous: GameState,
  input: PlayerInput,
  elapsedSeconds: number,
  random: () => number = Math.random,
): GameState {
  if (previous.phase !== "playing") return { ...previous, events: [] };

  const state = cloneState(previous);
  const dt = Math.max(0, Math.min(0.05, elapsedSeconds));
  state.waveBannerFor = Math.max(0, state.waveBannerFor - dt);
  state.effects.forEach((effect) => {
    effect.remaining -= dt;
  });
  state.effects = state.effects.filter((effect) => effect.remaining > 0);
  state.player.fireCooldown = Math.max(0, state.player.fireCooldown - dt);
  state.player.invulnerableFor = Math.max(0, state.player.invulnerableFor - dt);

  state.player.x = Math.max(
    8,
    Math.min(
      GAME_WIDTH - state.player.width - 8,
      state.player.x + input.move * PLAYER_SPEED * dt,
    ),
  );

  if (input.fire && state.player.fireCooldown <= 0) {
    state.bullets.push({
      x: state.player.x + state.player.width / 2 - 2,
      y: state.player.y - 8,
      width: 4,
      height: 9,
      vx: 0,
      vy: -260,
      owner: "player",
    });
    state.player.fireCooldown = PLAYER_FIRE_INTERVAL;
    state.events.push("shot");
  }

  if (state.scavs.length > 0) {
    const formationSpeed =
      23 + state.wave * 2.6 + (32 - state.scavs.length) * 0.7;
    const left = Math.min(...state.scavs.map((scav) => scav.x));
    const right = Math.max(...state.scavs.map((scav) => scav.x + scav.width));
    const shouldDrop =
      (state.formationDirection === -1 && left <= 12) ||
      (state.formationDirection === 1 && right >= GAME_WIDTH - 12);

    if (shouldDrop) {
      state.formationDirection = state.formationDirection === 1 ? -1 : 1;
      state.scavs.forEach((scav) => {
        scav.y += 10;
      });
    } else {
      state.scavs.forEach((scav) => {
        scav.x += state.formationDirection * formationSpeed * dt;
      });
    }

    state.enemyFireCooldown -= dt;
    if (state.enemyFireCooldown <= 0) {
      const shooter = state.scavs[Math.floor(random() * state.scavs.length)];
      addEnemyShot(
        state,
        shooter.x + shooter.width / 2,
        shooter.y + shooter.height,
      );
      state.enemyFireCooldown = Math.max(0.35, 1.18 - state.wave * 0.055);
    }

    if (state.scavs.some((scav) => scav.y + scav.height >= state.player.y)) {
      damagePlayer(state);
      state.scavs = spawnScavs(state.wave);
    }
  }

  if (state.boss) {
    const boss = state.boss;
    boss.motionTime += dt;
    const speed = boss.definition.pattern === "charger" ? 142 : 76;
    boss.x += boss.direction * speed * dt;
    if (boss.x <= 12 || boss.x + boss.width >= GAME_WIDTH - 12) {
      boss.x = Math.max(12, Math.min(GAME_WIDTH - boss.width - 12, boss.x));
      boss.direction = boss.direction === 1 ? -1 : 1;
    }
    if (boss.definition.pattern === "charger") {
      boss.y = 76 + Math.sin(boss.motionTime * 3.2) * 25;
    }

    boss.attackCooldown -= dt;
    if (boss.attackCooldown <= 0) fireBossWeapon(state);

    if (boss.definition.pattern === "commander") {
      boss.summonCooldown -= dt;
      if (boss.summonCooldown <= 0 && state.scavs.length < 4) {
        const column = state.scavs.length;
        state.scavs.push({
          x: boss.x + 8 + column * 16,
          y: boss.y + boss.height + 12,
          width: 21,
          height: 16,
          row: 0,
          column,
        });
        boss.summonCooldown = 4.2;
      }
    }
  }

  state.bullets.forEach((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
  });

  const consumedBullets = new Set<Bullet>();
  const destroyedScavs = new Set<Scav>();
  state.bullets.forEach((bullet) => {
    if (bullet.owner === "player") {
      const hitScav = state.scavs.find(
        (scav) => !destroyedScavs.has(scav) && overlaps(bullet, scav),
      );
      if (hitScav) {
        consumedBullets.add(bullet);
        destroyedScavs.add(hitScav);
        awardPoints(state, 100);
        state.events.push("explosion");
        state.effects.push({
          x: hitScav.x + hitScav.width / 2,
          y: hitScav.y + hitScav.height / 2,
          radius: 13,
          color: "#9dff2e",
          remaining: 0.22,
        });
        return;
      }
      if (state.boss && overlaps(bullet, state.boss)) {
        consumedBullets.add(bullet);
        state.boss.health -= 1;
        awardPoints(state, 25);
        state.events.push("hit");
        if (state.boss.health <= 0) {
          awardPoints(state, 1000 + state.wave * 100);
          state.events.push("explosion");
          state.effects.push({
            x: state.boss.x + state.boss.width / 2,
            y: state.boss.y + state.boss.height / 2,
            radius: 42,
            color: state.boss.definition.color,
            remaining: 0.6,
          });
          state.boss = null;
        }
      }
    } else if (overlaps(bullet, state.player)) {
      consumedBullets.add(bullet);
      damagePlayer(state);
    }
  });

  state.scavs = state.scavs.filter((scav) => !destroyedScavs.has(scav));

  state.bullets.forEach((bullet) => {
    if (consumedBullets.has(bullet)) return;
    const barrier = state.barriers.find(
      (candidate) => candidate.health > 0 && overlaps(bullet, candidate),
    );
    if (barrier) {
      barrier.health -= 1;
      consumedBullets.add(bullet);
    }
  });

  state.bullets = state.bullets.filter(
    (bullet) =>
      !consumedBullets.has(bullet) &&
      bullet.y > -20 &&
      bullet.y < GAME_HEIGHT + 20 &&
      bullet.x > -20 &&
      bullet.x < GAME_WIDTH + 20,
  );
  state.barriers = state.barriers.filter((barrier) => barrier.health > 0);

  if (
    state.phase === "playing" &&
    state.scavs.length === 0 &&
    state.boss === null
  ) {
    advanceWave(state);
  }

  return state;
}
