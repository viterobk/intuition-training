/* eslint-disable import/no-anonymous-default-export */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';
import TopBar from './TopBar';
import './Dice.css';

const ROLL_MS = 1100;
const MAX_DICE = 6;
/** Доля размера кубика от ширины/высоты поля (с запасом под поворот). */
const DIE_W = 0.18;
const DIE_H = 0.22;
const MAX_ROT = 32;
const PACK_TRIES = 80;

type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

type DieState = {
  id: number;
  value: DieValue;
  x: number;
  y: number;
  rot: number;
};

type Pose = { x: number; y: number; rot: number };
type Rng = () => number;

/** Mulberry32 — детерминированный ГСЧ от seed */
function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function timerSeed(startTime: Date): number {
  const elapsedMs = Date.now() - startTime.getTime();
  const precise = performance.now();
  const mixed = Math.imul(elapsedMs ^ Math.floor(precise * 1000), 2654435761) >>> 0;
  return mixed || 1;
}

const elapsedMs = (startTime: Date) => Date.now() - startTime.getTime();

/** Значение грани = остаток мс таймера от деления на 6 (0 → 6). */
const faceFromElapsed = (ms: number): DieValue => {
  const rem = ms % 6;
  return (rem === 0 ? 6 : rem) as DieValue;
};

/** Для анимации кручения — просто смена граней. */
const tumbleFace = (random: Rng): DieValue =>
  ((Math.floor(random() * 6) + 1) as DieValue);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const halfExtents = (rotDeg: number) => {
  let r = ((rotDeg % 90) + 90) % 90;
  if (r > 45) {
    r -= 90;
  }
  const rad = (Math.abs(r) * Math.PI) / 180;
  const factor = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
  return {
    hx: (DIE_W * factor) / 2,
    hy: (DIE_H * factor) / 2,
  };
};

const boundsFor = (rotDeg: number) => {
  const { hx, hy } = halfExtents(rotDeg);
  const pad = 0.02;
  return {
    minX: hx + pad,
    maxX: 1 - hx - pad,
    minY: hy + pad,
    maxY: 1 - hy - pad,
  };
};

const overlaps = (a: Pose, b: Pose) => {
  const ea = halfExtents(a.rot);
  const eb = halfExtents(b.rot);
  return (
    Math.abs(a.x - b.x) < ea.hx + eb.hx + 0.01 &&
    Math.abs(a.y - b.y) < ea.hy + eb.hy + 0.01
  );
};

const randomPose = (random: Rng): Pose => {
  const rot = random() * MAX_ROT * 2 - MAX_ROT;
  const box = boundsFor(rot);
  return {
    x: box.minX + random() * (box.maxX - box.minX),
    y: box.minY + random() * (box.maxY - box.minY),
    rot,
  };
};

const separatePoses = (poses: Pose[], random: Rng): Pose[] => {
  const next = poses.map((pose) => ({ ...pose }));
  for (let iter = 0; iter < 24; iter += 1) {
    let moved = false;
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        if (!overlaps(next[i], next[j])) {
          continue;
        }
        const dx = next[j].x - next[i].x || (random() - 0.5) * 0.01;
        const dy = next[j].y - next[i].y || (random() - 0.5) * 0.01;
        const len = Math.hypot(dx, dy) || 1;
        const push = 0.018;
        next[i].x -= (dx / len) * push;
        next[i].y -= (dy / len) * push;
        next[j].x += (dx / len) * push;
        next[j].y += (dy / len) * push;
        moved = true;
      }
    }
    next.forEach((pose) => {
      const box = boundsFor(pose.rot);
      pose.x = clamp(pose.x, box.minX, box.maxX);
      pose.y = clamp(pose.y, box.minY, box.maxY);
    });
    if (!moved) {
      break;
    }
  }
  return next;
};

/** Новая поза рядом с уже лежащими, без пересечений. */
const placeAmong = (occupied: Pose[], random: Rng): Pose => {
  for (let tryIndex = 0; tryIndex < PACK_TRIES; tryIndex += 1) {
    const candidate = randomPose(random);
    if (occupied.every((pose) => !overlaps(pose, candidate))) {
      return candidate;
    }
  }
  const packed = separatePoses([...occupied, randomPose(random)], random);
  return packed[packed.length - 1];
};

const poseFromDie = (die: DieState): Pose => ({
  x: die.x / 100,
  y: die.y / 100,
  rot: die.rot,
});

const makeDie = (id: number, pose: Pose, value: DieValue): DieState => ({
  id,
  value,
  x: pose.x * 100,
  y: pose.y * 100,
  rot: pose.rot,
});

const PIP_MAP: Record<DieValue, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function DieFace({ value }: { value: DieValue }) {
  const pips = PIP_MAP[value];
  return (
    <div className={`die-face die-face-${value}`} aria-hidden='true'>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={`die-pip ${pips.includes(i + 1) ? 'is-on' : ''}`}
        />
      ))}
    </div>
  );
}

export default function Dice() {
  document.title = 'Игральные кубики';

  const [sessionStart] = useState(() => new Date());
  const nextIdRef = useRef(1);
  const [dice, setDice] = useState<DieState[]>(() => {
    const start = new Date();
    const ms = Date.now() - start.getTime();
    const random = createRng(timerSeed(start));
    return [makeDie(0, randomPose(random), faceFromElapsed(ms))];
  });
  const [rollingId, setRollingId] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const tumbleRef = useRef<number | null>(null);
  const tumbleRngRef = useRef<Rng | null>(null);
  const diceRef = useRef(dice);
  diceRef.current = dice;

  const isBusy = rollingId !== null;

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      if (tumbleRef.current !== null) {
        window.clearInterval(tumbleRef.current);
      }
    };
  }, []);

  const queueTimeout = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timersRef.current.push(id);
  };

  const clearRollTimers = () => {
    if (tumbleRef.current !== null) {
      window.clearInterval(tumbleRef.current);
      tumbleRef.current = null;
    }
  };

  const animateDie = (
    dieId: number,
    finalDie: DieState,
    keepOthers: DieState[],
    tumbleRandom: Rng
  ) => {
    clearRollTimers();
    tumbleRngRef.current = tumbleRandom;
    setRollingId(dieId);

    const startPose = randomPose(tumbleRandom);
    setDice([
      ...keepOthers,
      makeDie(dieId, startPose, finalDie.value),
    ]);

    tumbleRef.current = window.setInterval(() => {
      const random = tumbleRngRef.current;
      if (!random) {
        return;
      }
      setDice((prev) =>
        prev.map((die) => {
          if (die.id !== dieId) {
            return die;
          }
          const rot = die.rot + 25 + random() * 50;
          const box = boundsFor(rot);
          return {
            ...die,
            value: tumbleFace(random),
            x: clamp(die.x / 100 + (random() - 0.5) * 0.1, box.minX, box.maxX) * 100,
            y: clamp(die.y / 100 + (random() - 0.5) * 0.1, box.minY, box.maxY) * 100,
            rot,
          };
        })
      );
    }, 70);

    queueTimeout(() => {
      clearRollTimers();
      tumbleRngRef.current = null;
      setDice([...keepOthers, finalDie]);
      setRollingId(null);
    }, ROLL_MS);
  };

  const rollAgain = () => {
    if (isBusy) {
      return;
    }
    const ms = elapsedMs(sessionStart);
    const value = faceFromElapsed(ms);
    const seed = timerSeed(sessionStart);
    const random = createRng(seed);
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    const finalDie = makeDie(id, randomPose(random), value);
    animateDie(id, finalDie, [], createRng(seed ^ 0xa5a5a5a5));
  };

  const rollAnother = () => {
    if (isBusy || diceRef.current.length >= MAX_DICE) {
      return;
    }
    const settled = diceRef.current;
    const ms = elapsedMs(sessionStart);
    const value = faceFromElapsed(ms);
    const seed = timerSeed(sessionStart);
    const random = createRng(seed);
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    const occupied = settled.map(poseFromDie);
    const finalPose = placeAmong(occupied, random);
    const finalDie = makeDie(id, finalPose, value);
    animateDie(id, finalDie, settled, createRng(seed ^ 0xa5a5a5a5));
  };

  return (
    <div className='dice page'>
      <TopBar text='Игральные кубики' startTime={sessionStart} />
      <div className='dice-body page-section'>
        <p className='dice-lead'>
          Бросайте кубики по одному — до шести на столе.
        </p>

        <div className={`dice-table ${isBusy ? 'is-rolling' : ''}`} aria-live='polite'>
          <div className='dice-felt'>
            {dice.map((die, index) => (
              <div
                key={die.id}
                className={`die ${
                  rollingId === die.id ? 'is-tumbling' : 'is-settled'
                }`}
                style={{
                  left: `${die.x}%`,
                  top: `${die.y}%`,
                  transform: `translate(-50%, -50%) rotate(${die.rot}deg)`,
                  transitionDelay: rollingId === die.id ? '0ms' : `${index * 30}ms`,
                  zIndex: rollingId === die.id ? 20 : index + 1,
                }}
                aria-label={`Кубик ${die.value}`}
              >
                <DieFace value={die.value} />
              </div>
            ))}
          </div>
        </div>

        <div className='dice-actions'>
          <Button
            className='dice-roll'
            variant='contained'
            onClick={rollAgain}
            disabled={isBusy}
          >
            Бросить заново
          </Button>
          <Button
            className='dice-roll-another'
            variant='outlined'
            onClick={rollAnother}
            disabled={isBusy || dice.length >= MAX_DICE}
          >
            Бросить ещё один кубик
          </Button>
        </div>
      </div>
    </div>
  );
}
