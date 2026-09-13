/* eslint-disable import/no-anonymous-default-export */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';
import TopBar from './TopBar';
import './TwoDigitNumbers.css';

const SLOT_COUNT = 6;
const TOLERANCE = 2;
const cardBackUrl = `${process.env.PUBLIC_URL}/cards/back.svg`;

type GuessSlot = string; // '' | '1' | '12'

const generateTargets = (): number[] => {
  const pool = Array.from({ length: 90 }, (_, i) => i + 10);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selected = pool.slice(0, SLOT_COUNT);
  // Гарантия: все сгенерированные числа различны
  if (new Set(selected).size !== SLOT_COUNT) {
    return generateTargets();
  }
  return selected;
};

const emptyGuesses = (): GuessSlot[] => Array.from({ length: SLOT_COUNT }, () => '');

const isComplete = (guesses: GuessSlot[]) =>
  guesses.every((value) => value.length === 2);

type MatchKind = 'exact' | 'near' | 'mirror';

const mirrorOf = (n: number): number =>
  Number(String(n).padStart(2, '0').split('').reverse().join(''));

/** Приоритет: точное → ±2 → зеркало. Число попадает только в одну категорию. */
const classifyMatch = (guess: number, targets: number[]): MatchKind | null => {
  if (targets.some((target) => target === guess)) {
    return 'exact';
  }
  if (targets.some((target) => {
    const diff = Math.abs(target - guess);
    return diff >= 1 && diff <= TOLERANCE;
  })) {
    return 'near';
  }
  if (targets.some((target) => mirrorOf(target) === guess)) {
    return 'mirror';
  }
  return null;
};

const isHit = (guess: number, targets: number[]) =>
  classifyMatch(guess, targets) !== null;

const duplicateIndexes = (guesses: GuessSlot[]): Set<number> => {
  const counts = new Map<string, number>();
  guesses.forEach((value) => {
    if (value.length === 2) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  });
  const indexes = new Set<number>();
  guesses.forEach((value, index) => {
    if (value.length === 2 && (counts.get(value) || 0) > 1) {
      indexes.add(index);
    }
  });
  return indexes;
};

const firstIncompleteIndex = (guesses: GuessSlot[]) => {
  const index = guesses.findIndex((value) => value.length < 2);
  return index === -1 ? SLOT_COUNT - 1 : index;
};

export default function TwoDigitNumbers() {
  document.title = 'Двузначные числа';

  const [targets, setTargets] = useState<number[]>(() => generateTargets());
  const [guesses, setGuesses] = useState<GuessSlot[]>(() => emptyGuesses());
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [flipActive, setFlipActive] = useState(false);
  const guessesRef = useRef(guesses);
  const activeIndexRef = useRef(activeIndex);
  const revealedRef = useRef(revealed);

  const syncGuesses = (next: GuessSlot[]) => {
    guessesRef.current = next;
    setGuesses(next);
  };

  const syncActiveIndex = (index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  const appendDigit = (digit: string) => {
    if (revealedRef.current) {
      return;
    }

    const next = [...guessesRef.current];
    let index = activeIndexRef.current;
    if (index < 0 || index >= SLOT_COUNT) {
      index = firstIncompleteIndex(next);
    }

    if (next[index].length >= 2) {
      const nextEmpty = next.findIndex((value, i) => i > index && value.length < 2);
      if (nextEmpty === -1) {
        return;
      }
      index = nextEmpty;
    }

    const updated = `${next[index]}${digit}`.slice(0, 2);
    next[index] = updated;
    syncGuesses(next);
    syncActiveIndex(updated.length === 2 ? Math.min(index + 1, SLOT_COUNT - 1) : index);
  };

  const clearActive = () => {
    if (revealedRef.current) {
      return;
    }

    const next = [...guessesRef.current];
    const index = activeIndexRef.current;
    if (next[index].length > 0) {
      next[index] = next[index].slice(0, -1);
      syncGuesses(next);
      return;
    }
    if (index > 0) {
      const prevIndex = index - 1;
      next[prevIndex] = next[prevIndex].slice(0, -1);
      syncGuesses(next);
      syncActiveIndex(prevIndex);
    }
  };

  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  const check = () => {
    if (!isComplete(guessesRef.current) || revealedRef.current) {
      return;
    }
    revealedRef.current = true;
    setRevealed(true);
    setFlipActive(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlipActive(true));
    });
  };

  const reset = () => {
    const cleared = emptyGuesses();
    setTargets(generateTargets());
    syncGuesses(cleared);
    syncActiveIndex(0);
    revealedRef.current = false;
    setRevealed(false);
    setFlipActive(false);
  };

  const actionsRef = useRef({ check, reset });
  actionsRef.current = { check, reset };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        appendDigit(e.key);
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        clearActive();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        syncActiveIndex(Math.max(0, activeIndexRef.current - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        syncActiveIndex(Math.min(SLOT_COUNT - 1, activeIndexRef.current + 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (revealedRef.current) {
          actionsRef.current.reset();
        } else {
          actionsRef.current.check();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectSlot = (index: number) => {
    if (revealedRef.current) {
      return;
    }
    const next = [...guessesRef.current];
    next[index] = '';
    syncGuesses(next);
    syncActiveIndex(index);
  };

  const canCheck = isComplete(guesses) && !revealed;
  const duplicates = duplicateIndexes(guesses);
  const matchGroups = (() => {
    const exact: string[] = [];
    const near: string[] = [];
    const mirror: string[] = [];
    if (!revealed) {
      return { exact, near, mirror };
    }
    guesses.forEach((value, index) => {
      if (duplicates.has(index) || value.length !== 2) {
        return;
      }
      const kind = classifyMatch(Number(value), targets);
      if (kind === 'exact') {
        exact.push(value);
      } else if (kind === 'near') {
        near.push(value);
      } else if (kind === 'mirror') {
        mirror.push(value);
      }
    });
    return { exact, near, mirror };
  })();

  return (
    <div className='tdn page'>
      <TopBar text='Двузначные числа' />
      <div className='tdn-body page-section'>
        <p className='tdn-lead'>
          Загадайте шесть двузначных чисел. Затем проверьте, насколько они близки к скрытым.
        </p>

        <div className='tdn-targets' aria-label='Скрытые числа'>
          {targets.map((value, index) => (
            <div
              key={`target-${index}`}
              className={[
                'tdn-card',
                revealed ? 'is-revealed' : '',
                flipActive ? 'is-flipped' : '',
              ].join(' ')}
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <div className='tdn-card-flipper'>
                <div className='tdn-card-face tdn-card-back'>
                  <img src={cardBackUrl} alt='' draggable={false} />
                </div>
                <div className='tdn-card-face tdn-card-front'>
                  <span>{value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className='tdn-guesses' aria-label='Ваши числа'>
          {guesses.map((value, index) => {
            const complete = value.length === 2;
            const duplicate = duplicates.has(index);
            const hit =
              revealed && complete && !duplicate && isHit(Number(value), targets);
            return (
              <button
                key={`guess-${index}`}
                type='button'
                className={[
                  'tdn-guess',
                  activeIndex === index && !revealed ? 'is-active' : '',
                  duplicate ? 'is-duplicate' : '',
                  hit ? 'is-hit' : '',
                  revealed && complete && !hit && !duplicate ? 'is-miss' : '',
                ].join(' ')}
                onClick={() => selectSlot(index)}
                disabled={revealed}
                aria-label={`Число ${index + 1}${value ? `: ${value}` : ''}${
                  duplicate ? ', повтор' : ''
                }`}
              >
                <span className='tdn-guess-value'>
                  {value || <span className='tdn-guess-placeholder'>··</span>}
                </span>
              </button>
            );
          })}
        </div>

        {duplicates.size > 0 && !revealed && (
          <p className='tdn-duplicate-hint'>Повторяющиеся числа подсвечены — лучше заменить</p>
        )}

        {!revealed && (
          <div className='tdn-pad' role='group' aria-label='Клавиатура'>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
              <button
                key={key}
                type='button'
                className='tdn-key'
                onClick={() => appendDigit(key)}
              >
                {key}
              </button>
            ))}
            <button
              type='button'
              className='tdn-key tdn-key-action'
              onClick={clearActive}
              aria-label='Стереть'
            >
              ⌫
            </button>
            <button
              type='button'
              className='tdn-key'
              onClick={() => appendDigit('0')}
            >
              0
            </button>
            <span className='tdn-key-spacer' aria-hidden='true' />
          </div>
        )}

        {revealed && (
          <div className='tdn-results' aria-label='Результаты'>
            <div className='tdn-result surface-panel'>
              <span className='tdn-result-label'>Точно</span>
              <b>{matchGroups.exact.length}</b>
              {matchGroups.exact.length > 0 && (
                <span className='tdn-result-nums'>{matchGroups.exact.join(' · ')}</span>
              )}
            </div>
            <div className='tdn-result surface-panel'>
              <span className='tdn-result-label'>±{TOLERANCE}</span>
              <b>{matchGroups.near.length}</b>
              {matchGroups.near.length > 0 && (
                <span className='tdn-result-nums'>{matchGroups.near.join(' · ')}</span>
              )}
            </div>
            <div className='tdn-result surface-panel'>
              <span className='tdn-result-label'>Зеркало</span>
              <b>{matchGroups.mirror.length}</b>
              {matchGroups.mirror.length > 0 && (
                <span className='tdn-result-nums'>{matchGroups.mirror.join(' · ')}</span>
              )}
            </div>
          </div>
        )}

        <div className='tdn-actions'>
          {!revealed ? (
            <Button
              className='tdn-check'
              variant='contained'
              disabled={!canCheck}
              onClick={check}
            >
              Проверить
            </Button>
          ) : (
            <Button className='tdn-reset' variant='outlined' onClick={reset}>
              Ещё раз
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
