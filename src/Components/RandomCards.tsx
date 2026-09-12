/* eslint-disable import/no-anonymous-default-export */
import { useEffect, useRef, useState } from 'react';
import StyleIcon from '@mui/icons-material/Style';
import TopBar from './TopBar';
import './RandomCards.css';

const RANKS = ['6', '7', '8', '9', '10', 'j', 'q', 'k', 'a'];
const SUITS = ['c', 'd', 'h', 's'];
const VISIBLE_LIMIT = 10;
const FLY_MS = 520;
const FLIP_MS = 420;

type DeckCard = {
  id: string;
  file: string;
};

type DrawnCard = DeckCard & {
  number: number;
};

type Flight = {
  card: DrawnCard;
  phase: 'fly' | 'flip';
};

const ALL_CARDS: DeckCard[] = RANKS.flatMap((rank) =>
  SUITS.map((suit) => ({
    id: `${rank}_${suit}`,
    file: `${rank}_${suit}.svg`,
  }))
);

const cardUrl = (file: string) => `${process.env.PUBLIC_URL}/cards/${file}`;

/** Mulberry32 — детерминированный ГСЧ от seed */
function createRng(seed: number) {
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
  // Смешиваем целые и дробные мс, чтобы момент клика влиял сильнее
  const precise = performance.now();
  const mixed = Math.imul(elapsedMs ^ Math.floor(precise * 1000), 2654435761) >>> 0;
  return mixed || 1;
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const random = createRng(seed);
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function RandomCards() {
  document.title = 'Случайная карта';

  const [sessionStart] = useState(() => new Date());
  const tableRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLButtonElement>(null);
  const timersRef = useRef<number[]>([]);
  const [deck, setDeck] = useState<DeckCard[]>(() => shuffleWithSeed(ALL_CARDS, timerSeed(sessionStart)));
  const [drawn, setDrawn] = useState<DrawnCard[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [flyActive, setFlyActive] = useState(false);
  const [deckElevated, setDeckElevated] = useState(false);
  const [fanOffset, setFanOffset] = useState(28);
  const [deckOrigin, setDeckOrigin] = useState({ left: 0, top: 0 });

  const isBusy = Boolean(flight);
  const remaining = deck.length;
  const pending = Boolean(flight);
  const totalAfter = drawn.length + (pending ? 1 : 0);
  const hiddenCount = Math.max(0, totalAfter - VISIBLE_LIMIT);
  const settledCards = drawn.slice(hiddenCount);
  const flightSlotIndex = settledCards.length;

  const measureLayout = () => {
    if (!tableRef.current || !fanRef.current) {
      return;
    }

    const raw = getComputedStyle(tableRef.current).getPropertyValue('--fan-offset').trim();
    const value = Number.parseFloat(raw);
    if (!Number.isNaN(value) && value > 0) {
      setFanOffset(value);
    }

    if (deckRef.current) {
      const fanBox = fanRef.current.getBoundingClientRect();
      const deckBox = deckRef.current.getBoundingClientRect();
      setDeckOrigin({
        left: deckBox.left - fanBox.left,
        top: deckBox.top - fanBox.top,
      });
    }
  };

  useEffect(() => {
    measureLayout();
    window.addEventListener('resize', measureLayout);
    return () => window.removeEventListener('resize', measureLayout);
  }, [remaining, drawn.length]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const queueTimeout = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timersRef.current.push(id);
  };

  const drawCardAt = (index: number, elevateDeck = false) => {
    if (isBusy || deck.length === 0 || index < 0 || index >= deck.length) {
      return;
    }

    measureLayout();

    const next = deck[index];
    const rest = [...deck.slice(0, index), ...deck.slice(index + 1)];
    const drawnCard: DrawnCard = {
      ...next,
      number: drawn.length + 1,
    };

    setDeck(rest);
    setDeckElevated(elevateDeck);
    setFlight({ card: drawnCard, phase: 'fly' });
    setFlyActive(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlyActive(true));
    });

    queueTimeout(() => {
      setFlight({ card: drawnCard, phase: 'flip' });
    }, FLY_MS);

    queueTimeout(() => {
      setDrawn((prev) => [...prev, drawnCard]);
      setFlight(null);
      setFlyActive(false);
      setDeckElevated(false);
    }, FLY_MS + FLIP_MS);
  };

  const drawTopCard = () => {
    drawCardAt(0);
  };

  const drawRandomCard = () => {
    if (isBusy || deck.length === 0) {
      return;
    }
    const elapsedMs = Date.now() - sessionStart.getTime();
    const index = elapsedMs % deck.length;
    drawCardAt(index, true);
  };

  const resetDeck = () => {
    if (isBusy) {
      return;
    }
    const seed = timerSeed(sessionStart);
    setDeck(shuffleWithSeed(ALL_CARDS, seed));
    setDrawn([]);
    setFlight(null);
    setFlyActive(false);
    setDeckElevated(false);
  };

  const flightLeft = flightSlotIndex * fanOffset;
  const flightTop = 24;

  return (
    <div className='random-cards page'>
      <TopBar text='Случайная карта' startTime={sessionStart} />
      <div className='random-cards-body page-section'>
        <div className='random-cards-stats'>
          <div className='stat-chip'>
            <span>Вытянули</span>
            <b>{drawn.length + (flight ? 1 : 0)}</b>
          </div>
          <div className='stat-chip'>
            <span>В колоде</span>
            <b>{remaining}</b>
          </div>
        </div>

        <div className='random-table' ref={tableRef}>
          <div className='random-table-fan' ref={fanRef} aria-live='polite'>
            {hiddenCount > 0 && (
              <div className='random-stack-base' aria-hidden='true'>
                <div className='random-stack-layer random-stack-layer-1' />
                <div className='random-stack-layer random-stack-layer-2' />
                <div className='random-stack-layer random-stack-layer-3' />
              </div>
            )}

            {settledCards.map((card, index) => {
              const left = index * fanOffset;
              return (
                <div
                  key={card.id}
                  className='random-card-slot is-settled'
                  style={{
                    left: `${left}px`,
                    zIndex: 20 + index,
                  }}
                >
                  <span className='random-card-number'>{card.number}</span>
                  <div className='random-card-face'>
                    <img src={cardUrl(card.file)} alt={`Карта ${card.number}`} draggable={false} />
                  </div>
                </div>
              );
            })}

            {flight && (
              <div
                className={[
                  'random-card-slot random-card-flight',
                  flyActive ? 'is-flying' : '',
                  flight.phase === 'flip' ? 'is-flipping' : '',
                ].join(' ')}
                style={{
                  ['--flight-from-left' as string]: `${deckOrigin.left}px`,
                  ['--flight-from-top' as string]: `${deckOrigin.top}px`,
                  ['--flight-left' as string]: `${flightLeft}px`,
                  ['--flight-top' as string]: `${flightTop}px`,
                  zIndex: 80,
                }}
              >
                <span className={`random-card-number ${flight.phase === 'flip' ? 'is-visible' : ''}`}>
                  {flight.card.number}
                </span>
                <div className='random-card-flipper'>
                  <div className='random-card-face random-card-back'>
                    <img src={cardUrl('back.svg')} alt='' draggable={false} />
                  </div>
                  <div className='random-card-face random-card-front'>
                    <img
                      src={cardUrl(flight.card.file)}
                      alt={`Карта ${flight.card.number}`}
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className='random-deck-area'>
            <div className='random-draw-row'>
              <div className='random-deck-wrap'>
                <button
                  ref={deckRef}
                  type='button'
                  className={`random-deck ${remaining === 0 ? 'is-empty' : ''} ${isBusy ? 'is-busy' : ''} ${deckElevated ? 'is-elevated' : ''}`}
                  onClick={drawTopCard}
                  disabled={isBusy || remaining === 0}
                  aria-label={remaining === 0 ? 'Колода пуста' : 'Взять сверху'}
                >
                  {remaining > 0 ? (
                    Array.from({ length: Math.min(5, remaining) }).map((_, index) => (
                      <span
                        key={`deck-layer-${index}`}
                        className='random-deck-layer'
                        style={{ transform: `translate(${index}px, ${-index}px)` }}
                      >
                        <img src={cardUrl('back.svg')} alt='' draggable={false} />
                      </span>
                    ))
                  ) : (
                    <span className='random-deck-empty'>Пусто</span>
                  )}
                  {remaining > 0 && <span className='random-deck-label'>взять сверху</span>}
                </button>
              </div>

              <button
                type='button'
                className='random-draw-random'
                onClick={drawRandomCard}
                disabled={isBusy || remaining === 0}
                aria-label='Достать случайную карту сбоку'
                title='Достать случайную'
              >
                <svg className='random-side-arrow' viewBox='0 0 72 120' aria-hidden='true'>
                  <path
                    d='M28 8 L58 60 L28 112'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='10'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M10 60 H52'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='10'
                    strokeLinecap='round'
                  />
                </svg>
                <span className='random-side-caption'>вытащить случайную</span>
              </button>
            </div>

            <p className='random-deck-hint'>
              {remaining === 0 ? 'Колода закончилась' : 'Верхняя карта или случайная из колоды'}
            </p>
            <button type='button' className='random-reset' onClick={resetDeck} disabled={isBusy}>
              <StyleIcon fontSize='small' />
              Перетасовать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
