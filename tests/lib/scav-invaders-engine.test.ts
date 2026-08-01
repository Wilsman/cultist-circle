import { describe, expect, it } from "vitest";

import {
  BOSS_DEFINITIONS,
  GAME_WIDTH,
  getBossForWave,
  startGame,
  stepGame,
  type Bullet,
} from "@/lib/scav-invaders-engine";

const idleInput = { move: 0 as const, fire: false };

describe("Scav Invaders engine", () => {
  it("starts a three-life scav wave and keeps the PMC inside the arena", () => {
    const initial = startGame();
    expect(initial.phase).toBe("playing");
    expect(initial.lives).toBe(3);
    expect(initial.scavs.length).toBeGreaterThan(0);

    initial.player.x = 0;
    const atLeftEdge = stepGame(initial, { move: -1, fire: false }, 0.05);
    expect(atLeftEdge.player.x).toBe(8);

    atLeftEdge.player.x = GAME_WIDTH;
    const atRightEdge = stepGame(atLeftEdge, { move: 1, fire: false }, 0.05);
    expect(atRightEdge.player.x).toBe(
      GAME_WIDTH - atRightEdge.player.width - 8,
    );
  });

  it("enforces the PMC firing cooldown", () => {
    const firstShot = stepGame(startGame(), { move: 0, fire: true }, 0.016);
    const secondFrame = stepGame(firstShot, { move: 0, fire: true }, 0.016);

    expect(
      firstShot.bullets.filter((bullet) => bullet.owner === "player"),
    ).toHaveLength(1);
    expect(
      secondFrame.bullets.filter((bullet) => bullet.owner === "player"),
    ).toHaveLength(1);
  });

  it("scores scav hits and advances cleared waves", () => {
    const state = startGame();
    state.scavs = [
      { x: 100, y: 100, width: 24, height: 18, row: 0, column: 0 },
    ];
    state.bullets = [
      {
        x: 108,
        y: 104,
        width: 4,
        height: 9,
        vx: 0,
        vy: 0,
        owner: "player",
      },
    ];

    const next = stepGame(state, idleInput, 0);
    expect(next.score).toBe(100);
    expect(next.wave).toBe(2);
    expect(next.scavs.length).toBeGreaterThan(0);
    expect(next.events).toContain("explosion");
  });

  it("removes lives on enemy hits and reaches game over", () => {
    const state = startGame();
    state.lives = 1;
    const bullet: Bullet = {
      x: state.player.x,
      y: state.player.y,
      width: 5,
      height: 9,
      vx: 0,
      vy: 0,
      owner: "enemy",
    };
    state.bullets = [bullet];

    const next = stepGame(state, idleInput, 0);
    expect(next.lives).toBe(0);
    expect(next.phase).toBe("game-over");
    expect(next.events).toContain("player-hit");
    expect(next.events).toContain("game-over");
  });

  it("starts a rotating named boss encounter every third wave", () => {
    expect(getBossForWave(1)).toBeNull();
    expect(getBossForWave(2)).toBeNull();
    expect(getBossForWave(3)).toEqual(BOSS_DEFINITIONS[0]);
    expect(getBossForWave(6)).toEqual(BOSS_DEFINITIONS[1]);

    const state = startGame();
    state.wave = 2;
    state.scavs = [];
    const bossWave = stepGame(state, idleInput, 0);

    expect(bossWave.wave).toBe(3);
    expect(bossWave.boss?.definition.name).toBe("Birdeye");
    expect(bossWave.events).toContain("boss-arrival");
  });

  it("awards boss points and returns to scav waves after a kill", () => {
    const state = startGame();
    state.wave = 2;
    state.scavs = [];
    const bossWave = stepGame(state, idleInput, 0);
    expect(bossWave.boss).not.toBeNull();
    if (!bossWave.boss) throw new Error("Expected a boss");

    bossWave.boss.health = 1;
    bossWave.bullets = [
      {
        x: bossWave.boss.x + 20,
        y: bossWave.boss.y + 10,
        width: 4,
        height: 9,
        vx: 0,
        vy: 0,
        owner: "player",
      },
    ];
    const next = stepGame(bossWave, idleInput, 0);

    expect(next.wave).toBe(4);
    expect(next.boss).toBeNull();
    expect(next.scavs.length).toBeGreaterThan(0);
    expect(next.score).toBeGreaterThan(1_000);
  });
});
