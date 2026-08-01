"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createAttractState,
  GAME_HEIGHT,
  GAME_WIDTH,
  type GameEvent,
  type GameState,
  HIGH_SCORE_STORAGE_KEY,
  startGame,
  stepGame,
} from "@/lib/scav-invaders-engine";

interface ScavInvadersGameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GameView {
  phase: GameState["phase"];
  score: number;
  highScore: number;
  wave: number;
  lives: number;
  bossName: string | null;
}

function readHighScore(): number {
  try {
    const value = Number(window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function writeHighScore(score: number) {
  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(score));
  } catch {
    // A private browsing quota should not stop the game.
  }
}

function getView(state: GameState): GameView {
  return {
    phase: state.phase,
    score: state.score,
    highScore: state.highScore,
    wave: state.wave,
    lives: state.lives,
    bossName: state.boss?.definition.name ?? null,
  };
}

function pixelRect(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), width, height);
}

function drawScav(context: CanvasRenderingContext2D, x: number, y: number) {
  pixelRect(context, "#9dff2e", x + 5, y, 14, 4);
  pixelRect(context, "#69c91d", x + 2, y + 4, 20, 5);
  pixelRect(context, "#081006", x + 6, y + 6, 3, 3);
  pixelRect(context, "#081006", x + 15, y + 6, 3, 3);
  pixelRect(context, "#9dff2e", x + 5, y + 9, 14, 5);
  pixelRect(context, "#69c91d", x, y + 12, 7, 4);
  pixelRect(context, "#69c91d", x + 17, y + 12, 7, 4);
  pixelRect(context, "#9dff2e", x + 8, y + 14, 3, 4);
  pixelRect(context, "#9dff2e", x + 14, y + 14, 3, 4);
}

function drawPmc(context: CanvasRenderingContext2D, state: GameState) {
  if (
    state.player.invulnerableFor > 0 &&
    Math.floor(state.player.invulnerableFor * 12) % 2 === 0
  ) {
    return;
  }
  const { x, y } = state.player;
  pixelRect(context, "#27d9ff", x + 12, y, 6, 4);
  pixelRect(context, "#d9fbff", x + 9, y + 4, 12, 5);
  pixelRect(context, "#27d9ff", x + 5, y + 9, 20, 5);
  pixelRect(context, "#0d81a1", x, y + 14, 30, 4);
  pixelRect(context, "#d9fbff", x + 7, y + 14, 4, 4);
  pixelRect(context, "#d9fbff", x + 19, y + 14, 4, 4);
}

function drawBoss(context: CanvasRenderingContext2D, state: GameState) {
  const boss = state.boss;
  if (!boss) return;
  const { x, y, width, height, definition } = boss;
  const dark = "#070a08";

  pixelRect(context, definition.color, x + 14, y, width - 28, 5);
  pixelRect(context, definition.color, x + 7, y + 5, width - 14, 8);
  pixelRect(context, dark, x + 18, y + 7, 7, 5);
  pixelRect(context, dark, x + width - 25, y + 7, 7, 5);
  pixelRect(context, definition.color, x, y + 13, width, 12);
  pixelRect(context, dark, x + 25, y + 17, width - 50, 4);
  pixelRect(context, definition.color, x + 8, y + 25, 13, height - 25);
  pixelRect(context, definition.color, x + width - 21, y + 25, 13, height - 25);
}

function drawGame(context: CanvasRenderingContext2D, state: GameState) {
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  context.fillStyle = "#020504";
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  for (let index = 0; index < 42; index += 1) {
    const x = (index * 97 + 31) % GAME_WIDTH;
    const y = (index * 53 + 43) % 275;
    pixelRect(context, index % 5 === 0 ? "#164429" : "#0a2116", x, y, 1, 1);
  }

  context.font = '8px "PressStart2P", monospace';
  context.textBaseline = "top";
  context.fillStyle = "#27d9ff";
  context.fillText(`SCORE ${String(state.score).padStart(6, "0")}`, 14, 13);
  context.fillStyle = "#ffd928";
  context.textAlign = "center";
  context.fillText(
    `HIGH ${String(state.highScore).padStart(6, "0")}`,
    GAME_WIDTH / 2,
    13,
  );
  context.fillStyle = "#27d9ff";
  context.textAlign = "right";
  context.fillText(`WAVE ${String(state.wave).padStart(2, "0")}`, 626, 13);
  context.textAlign = "left";

  if (state.boss) {
    const healthWidth = 230;
    const healthRatio = state.boss.health / state.boss.maxHealth;
    pixelRect(
      context,
      "#241317",
      GAME_WIDTH / 2 - healthWidth / 2,
      33,
      healthWidth,
      7,
    );
    pixelRect(
      context,
      state.boss.definition.color,
      GAME_WIDTH / 2 - healthWidth / 2,
      33,
      Math.ceil(healthWidth * healthRatio),
      7,
    );
    context.fillStyle = state.boss.definition.color;
    context.textAlign = "center";
    context.fillText(
      state.boss.definition.name.toUpperCase(),
      GAME_WIDTH / 2,
      44,
    );
    context.textAlign = "left";
  }

  state.scavs.forEach((scav) => drawScav(context, scav.x, scav.y));
  drawBoss(context, state);

  state.barriers.forEach((barrier) => {
    const color = barrier.health > 4 ? "#9dff2e" : "#567f24";
    pixelRect(
      context,
      color,
      barrier.x,
      barrier.y,
      barrier.width,
      barrier.height,
    );
    pixelRect(context, "#020504", barrier.x + 15, barrier.y + 7, 12, 7);
    for (let chip = 0; chip < 8 - barrier.health; chip += 1) {
      pixelRect(
        context,
        "#020504",
        barrier.x + ((chip * 11) % barrier.width),
        barrier.y + ((chip * 5) % barrier.height),
        3,
        3,
      );
    }
  });

  state.bullets.forEach((bullet) => {
    pixelRect(
      context,
      bullet.owner === "player" ? "#9dff2e" : "#ff365f",
      bullet.x,
      bullet.y,
      bullet.width,
      bullet.height,
    );
  });

  state.effects.forEach((effect) => {
    const scale = Math.max(0.2, effect.remaining * 3);
    context.strokeStyle = effect.color;
    context.lineWidth = 3;
    context.strokeRect(
      Math.round(effect.x - effect.radius * scale),
      Math.round(effect.y - effect.radius * scale),
      Math.round(effect.radius * 2 * scale),
      Math.round(effect.radius * 2 * scale),
    );
  });

  pixelRect(context, "#9dff2e", 8, 307, GAME_WIDTH - 16, 2);
  drawPmc(context, state);

  context.font = '7px "PressStart2P", monospace';
  context.fillStyle = "#9dff2e";
  context.textAlign = "center";
  context.fillText(
    "PMC",
    state.player.x + state.player.width / 2,
    state.player.y + state.player.height + 6,
  );
  context.fillStyle = "#ff6d8c";
  context.textAlign = "right";
  context.fillText(`LIVES ${"◆".repeat(Math.max(0, state.lives))}`, 626, 340);
  context.textAlign = "left";

  if (state.waveBannerFor > 0 && state.phase === "playing") {
    context.fillStyle = "rgba(0, 0, 0, 0.72)";
    context.fillRect(205, 157, 230, 42);
    context.fillStyle = state.boss ? state.boss.definition.color : "#9dff2e";
    context.font = '11px "PressStart2P", monospace';
    context.textAlign = "center";
    context.fillText(
      state.boss ? "BOSS INCOMING" : `SCAV WAVE ${state.wave}`,
      320,
      173,
    );
    context.textAlign = "left";
  }
}

function soundProfile(event: GameEvent): [number, number, number] {
  switch (event) {
    case "shot":
      return [760, 0.045, 0.025];
    case "hit":
      return [180, 0.06, 0.035];
    case "explosion":
      return [82, 0.14, 0.05];
    case "boss-arrival":
      return [110, 0.3, 0.06];
    case "player-hit":
      return [55, 0.22, 0.07];
    case "game-over":
      return [42, 0.5, 0.08];
    case "wave":
      return [520, 0.12, 0.035];
  }
}

export default function ScavInvadersGame({
  open,
  onOpenChange,
}: ScavInvadersGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>(createAttractState(0));
  const inputRef = useRef<{ left: boolean; right: boolean; fire: boolean }>({
    left: false,
    right: false,
    fire: false,
  });
  const animationRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const savedHighScoreRef = useRef(0);
  const viewKeyRef = useRef("");
  const [muted, setMuted] = useState(false);
  const [view, setView] = useState<GameView>(() =>
    getView(createAttractState(0)),
  );

  const syncView = useCallback((state: GameState) => {
    const next = getView(state);
    const key = JSON.stringify(next);
    if (key !== viewKeyRef.current) {
      viewKeyRef.current = key;
      setView(next);
    }
  }, []);

  const drawCurrentGame = useCallback(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context) drawGame(context, gameRef.current);
  }, []);

  const ensureAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  const playSound = useCallback((event: GameEvent) => {
    const audioContext = audioContextRef.current;
    if (!audioContext || mutedRef.current) return;
    const [frequency, duration, volume] = soundProfile(event);
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(25, frequency * 0.55),
      audioContext.currentTime + duration,
    );
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + duration,
    );
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }, []);

  const beginGame = useCallback(() => {
    void ensureAudio();
    gameRef.current = startGame(savedHighScoreRef.current);
    inputRef.current = { left: false, right: false, fire: false };
    previousTimeRef.current = null;
    syncView(gameRef.current);
    drawCurrentGame();
  }, [drawCurrentGame, ensureAudio, syncView]);

  const togglePause = useCallback(() => {
    const state = gameRef.current;
    if (state.phase === "playing") state.phase = "paused";
    else if (state.phase === "paused") state.phase = "playing";
    else return;
    previousTimeRef.current = null;
    syncView(state);
    drawCurrentGame();
  }, [drawCurrentGame, syncView]);

  useEffect(() => {
    if (!open) return;
    const highScore = readHighScore();
    savedHighScoreRef.current = highScore;
    gameRef.current = createAttractState(highScore);
    syncView(gameRef.current);
    requestAnimationFrame(drawCurrentGame);
  }, [drawCurrentGame, open, syncView]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (!open) return;

    function frame(time: number) {
      const previous = previousTimeRef.current ?? time;
      previousTimeRef.current = time;
      const state = gameRef.current;
      if (state.phase === "playing" && !document.hidden) {
        const input = inputRef.current;
        gameRef.current = stepGame(
          state,
          {
            move: input.left === input.right ? 0 : input.left ? -1 : 1,
            fire: input.fire,
          },
          (time - previous) / 1000,
        );
        gameRef.current.events.forEach(playSound);
        if (gameRef.current.highScore > savedHighScoreRef.current) {
          savedHighScoreRef.current = gameRef.current.highScore;
          writeHighScore(gameRef.current.highScore);
        }
      }
      drawCurrentGame();
      syncView(gameRef.current);
      animationRef.current = requestAnimationFrame(frame);
    }

    animationRef.current = requestAnimationFrame(frame);
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawCurrentGame, open, playSound, syncView]);

  useEffect(() => {
    if (!open) return;

    function isGameKey(event: KeyboardEvent) {
      return ["ArrowLeft", "ArrowRight", "a", "d", " ", "p"].includes(
        event.key.toLowerCase(),
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isGameKey(event)) return;
      event.preventDefault();
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") inputRef.current.left = true;
      if (key === "arrowright" || key === "d") inputRef.current.right = true;
      if (key === " ") inputRef.current.fire = true;
      if (key === "p" && !event.repeat) togglePause();
    }

    function handleKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") inputRef.current.left = false;
      if (key === "arrowright" || key === "d") inputRef.current.right = false;
      if (key === " ") inputRef.current.fire = false;
    }

    function pauseForInterruption() {
      if (gameRef.current.phase === "playing") {
        gameRef.current.phase = "paused";
        inputRef.current = { left: false, right: false, fire: false };
        syncView(gameRef.current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", pauseForInterruption);
    document.addEventListener("visibilitychange", pauseForInterruption);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", pauseForInterruption);
      document.removeEventListener("visibilitychange", pauseForInterruption);
    };
  }, [open, syncView, togglePause]);

  useEffect(
    () => () => {
      inputRef.current = { left: false, right: false, fire: false };
      const audioContext = audioContextRef.current;
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    },
    [],
  );

  const setTouchInput = (key: "left" | "right" | "fire", pressed: boolean) => {
    inputRef.current[key] = pressed;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scav-invaders-cabinet w-[96vw] max-w-[1100px] gap-2 overflow-y-auto border-[#247d47] bg-[#020604] p-2 text-white shadow-[0_0_80px_rgba(39,217,255,0.16)] sm:p-4">
        <DialogTitle className="sr-only">Scav Invaders</DialogTitle>
        <DialogDescription className="sr-only">
          A retro arcade game. Move the PMC with left and right, and fire at
          Scavs with Space.
        </DialogDescription>

        <div className="font-arcade flex items-center justify-between gap-3 border-b border-[#164429] px-1 pb-2 pr-10 text-[7px] tracking-[0.12em] text-[#86ad94] sm:text-[9px]">
          <span className="text-[#27d9ff]">SCAV INVADERS</span>
          <span className="hidden sm:inline">
            ← → / A D · SPACE FIRE · P PAUSE
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePause}
              disabled={view.phase === "attract" || view.phase === "game-over"}
              className="border border-[#247d47] p-1.5 text-[#9dff2e] hover:bg-[#15301d] disabled:opacity-30"
              aria-label={
                view.phase === "paused" ? "Resume game" : "Pause game"
              }
            >
              {view.phase === "paused" ? (
                <Play size={14} />
              ) : (
                <Pause size={14} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMuted((current) => !current)}
              className="border border-[#247d47] p-1.5 text-[#ffd928] hover:bg-[#302b15]"
              aria-label={muted ? "Unmute game" : "Mute game"}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>

        <div className="relative mx-auto aspect-video w-full max-w-[960px] overflow-hidden border border-[#2a8b50] bg-black shadow-[inset_0_0_50px_rgba(39,217,255,0.08),0_0_24px_rgba(157,255,46,0.08)]">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="h-full w-full touch-none [image-rendering:pixelated]"
            aria-label={`Scav Invaders game. Score ${view.score}. Wave ${view.wave}. Lives ${view.lives}.`}
          />
          <div className="scav-invaders-scanlines pointer-events-none absolute inset-0" />

          {view.phase === "attract" || view.phase === "game-over" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-5 text-center">
              <div className="font-arcade max-w-md border border-[#247d47] bg-black/90 px-5 py-6 shadow-[0_0_30px_rgba(157,255,46,0.15)]">
                <p className="text-[18px] leading-relaxed text-[#27d9ff] sm:text-2xl">
                  SCAV INVADERS
                </p>
                {view.phase === "game-over" ? (
                  <p className="mt-4 text-[10px] text-[#ff365f]">
                    RAID FAILED · SCORE {view.score}
                  </p>
                ) : (
                  <p className="mt-4 text-[8px] leading-relaxed text-[#86ad94] sm:text-[10px]">
                    CLEAR THE SCAV WAVES. HUNT THE BOSSES.
                  </p>
                )}
                <div className="mt-4 border-y border-[#164429] py-3 text-[7px] leading-[2] text-[#ffd928] sm:text-[8px]">
                  <div className="hidden sm:block">
                    <p>MOVE · ← → OR A D</p>
                    <p>FIRE · SPACE</p>
                    <p>PAUSE · P</p>
                  </div>
                  <div className="sm:hidden">
                    <p>MOVE · ◀ ▶</p>
                    <p>SHOOT · FIRE BUTTON</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={beginGame}
                  className="mt-5 border border-[#9dff2e] bg-[#9dff2e] px-5 py-3 text-[9px] text-black shadow-[0_0_20px_rgba(157,255,46,0.22)] hover:bg-black hover:text-[#9dff2e] sm:text-[11px]"
                >
                  {view.phase === "game-over" ? "RETRY RAID" : "START RAID"}
                </button>
                <div className="mt-5 text-[#ffd928]">
                  <p className="text-[7px] tracking-[0.24em] sm:text-[8px]">
                    HIGH SCORE
                  </p>
                  <p className="mt-2 text-[18px] leading-none drop-shadow-[0_0_10px_rgba(255,217,40,0.45)] sm:text-[24px]">
                    {String(view.highScore).padStart(6, "0")}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {view.phase === "paused" ? (
            <div className="font-arcade absolute inset-0 flex items-center justify-center bg-black/70 text-[14px] tracking-[0.2em] text-[#ffd928] sm:text-xl">
              RAID PAUSED
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-2 sm:hidden">
          {(["left", "right", "fire"] as const).map((control) => (
            <button
              key={control}
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                setTouchInput(control, true);
              }}
              onPointerUp={() => setTouchInput(control, false)}
              onPointerCancel={() => setTouchInput(control, false)}
              onPointerLeave={() => setTouchInput(control, false)}
              className={`font-arcade touch-none border py-4 text-[10px] active:translate-y-px ${
                control === "fire"
                  ? "border-[#ff365f] bg-[#2b0d14] text-[#ff6d8c]"
                  : "border-[#247d47] bg-[#0b1d11] text-[#9dff2e]"
              }`}
              aria-label={
                control === "left"
                  ? "Move left"
                  : control === "right"
                    ? "Move right"
                    : "Fire"
              }
            >
              {control === "left" ? "◀" : control === "right" ? "▶" : "FIRE"}
            </button>
          ))}
        </div>

        <p className="font-arcade text-center text-[6px] leading-relaxed tracking-[0.12em] text-[#567262] sm:text-[8px]">
          {view.bossName
            ? `TARGET: ${view.bossName.toUpperCase()}`
            : "PMC VS SCAVS"}
          {" · "}AUDIO {muted ? "OFF" : "ON"}
        </p>
      </DialogContent>
    </Dialog>
  );
}
