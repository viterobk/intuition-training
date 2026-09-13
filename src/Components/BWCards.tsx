/* eslint-disable import/no-anonymous-default-export */
import { useEffect, useRef, useState } from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import TopBar from './TopBar';
import './BWCards.css';

const FLY_MS = 520;
const FLIP_MS = 420;
const SETTLE_MS = 520;

type CardColor = 'black' | 'white';
type FlightPhase = 'fly' | 'flip' | 'settle';

type Flight = {
  id: number;
  color: CardColor;
  correct: boolean;
  phase: FlightPhase;
};

const cardBackUrl = `${process.env.PUBLIC_URL}/cards/back.svg`;
const rollColor = (): CardColor => (Math.random() < 0.5 ? 'black' : 'white');
const ZONE_DECK_MAX = 4;

function ZoneDeckLayers({ depth }: { depth: number }) {
  if (depth <= 0) {
    return null;
  }
  return (
    <>
      {Array.from({ length: depth }).map((_, index) => (
        <span
          key={`under-${index}`}
          className='bwc-zone-under'
          style={{
            transform: `translate(${index + 1}px, ${-(index + 1)}px)`,
            zIndex: index,
          }}
        >
          <img src={cardBackUrl} alt='' draggable={false} />
        </span>
      ))}
    </>
  );
}

function ScoreChart({ history, offset }: { history: number[]; offset: number }) {
  const width = 320;
  const height = 140;
  const padding = { top: 16, right: 12, bottom: 20, left: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (history.length === 0) {
    return (
      <div className='bwc-chart surface-panel'>
        <div className='bwc-chart-title'>Динамика точности</div>
        <svg className='bwc-chart-svg' viewBox={`0 0 ${width} ${height}`} role='img' aria-label='График разности ответов'>
          <line
            x1={padding.left}
            y1={padding.top + plotHeight / 2}
            x2={width - padding.right}
            y2={padding.top + plotHeight / 2}
            className='bwc-chart-zero'
          />
          <text x={width / 2} y={height / 2 + 4} textAnchor='middle' className='bwc-chart-empty'>
            Сделайте первый выбор
          </text>
        </svg>
      </div>
    );
  }

  const maxAbs = Math.max(1, ...history.map((v) => Math.abs(v)));
  const yScale = (value: number) =>
    padding.top + plotHeight / 2 - (value / maxAbs) * (plotHeight / 2);
  const xScale = (index: number) =>
    history.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (history.length - 1)) * plotWidth;

  const points = history.map((value, index) => `${xScale(index)},${yScale(value)}`).join(' ');
  const zeroY = yScale(0);
  const last = history[history.length - 1];
  const decadeMarks = history
    .map((_, index) => ({ index, answerNumber: offset + index + 1 }))
    .filter(({ answerNumber }) => answerNumber % 10 === 0);

  return (
    <div className='bwc-chart surface-panel'>
      <div className='bwc-chart-title'>
        Разность: <b>{last > 0 ? `+${last}` : last}</b>
      </div>
      <svg className='bwc-chart-svg' viewBox={`0 0 ${width} ${height}`} role='img' aria-label='График разности ответов'>
        {decadeMarks.map(({ index, answerNumber }) => (
          <g key={`decade-${answerNumber}`}>
            <line
              x1={xScale(index)}
              y1={padding.top}
              x2={xScale(index)}
              y2={padding.top + plotHeight}
              className='bwc-chart-decade'
            />
            <text x={xScale(index)} y={height - 4} textAnchor='middle' className='bwc-chart-label'>
              {answerNumber}
            </text>
          </g>
        ))}
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          className='bwc-chart-zero'
        />
        <text x={4} y={yScale(maxAbs) + 4} className='bwc-chart-label'>{maxAbs}</text>
        <text x={4} y={zeroY + 4} className='bwc-chart-label'>0</text>
        <text x={4} y={yScale(-maxAbs) + 4} className='bwc-chart-label'>-{maxAbs}</text>
        <polyline points={points} className='bwc-chart-line' />
        {history.map((value, index) => (
          <circle
            key={offset + index}
            cx={xScale(index)}
            cy={yScale(value)}
            r={history.length > 40 ? 2 : 3}
            className={`bwc-chart-point ${value >= 0 ? 'bwc-chart-point-positive' : 'bwc-chart-point-negative'}`}
          />
        ))}
      </svg>
    </div>
  );
}

export default function BWCards() {
  document.title = 'Ч/Б карты';

  const tableRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const plusStackRef = useRef<HTMLDivElement>(null);
  const minusStackRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const nextColorRef = useRef<CardColor>(rollColor());

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [plusTop, setPlusTop] = useState<CardColor | null>(null);
  const [minusTop, setMinusTop] = useState<CardColor | null>(null);
  const [plusFaceUp, setPlusFaceUp] = useState(false);
  const [minusFaceUp, setMinusFaceUp] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [flyActive, setFlyActive] = useState(false);
  const [origins, setOrigins] = useState({
    deck: { left: 0, top: 0 },
    reveal: { left: 0, top: 0 },
    plus: { left: 0, top: 0 },
    minus: { left: 0, top: 0 },
  });

  const totalAnswers = correctCount + wrongCount;
  const resultPercent = totalAnswers > 0 ? Math.round((correctCount * 100) / totalAnswers) : 50;
  const chartOffset = Math.max(0, totalAnswers - scoreHistory.length);
  const isBusy = Boolean(flight);

  const measureLayout = () => {
    if (!tableRef.current) {
      return;
    }
    const tableBox = tableRef.current.getBoundingClientRect();
    const read = (el: HTMLElement | null) => {
      if (!el) {
        return { left: 0, top: 0 };
      }
      const box = el.getBoundingClientRect();
      return {
        left: box.left - tableBox.left,
        top: box.top - tableBox.top,
      };
    };
    setOrigins({
      deck: read(deckRef.current),
      reveal: read(revealRef.current),
      plus: read(plusStackRef.current),
      minus: read(minusStackRef.current),
    });
  };

  useEffect(() => {
    measureLayout();
    window.addEventListener('resize', measureLayout);
    return () => window.removeEventListener('resize', measureLayout);
  }, [correctCount, wrongCount]);

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

  const busyRef = useRef(false);
  busyRef.current = isBusy;

  const guess = (answer: CardColor) => {
    if (busyRef.current) {
      return;
    }

    measureLayout();
    const color = nextColorRef.current;
    const correct = color === answer;
    const id = Date.now();

    setFlight({ id, color, correct, phase: 'fly' });
    setFlyActive(false);
    // Одновременно с вылетом карты в зонах переворачиваем последнюю карту рубашкой вверх
    setPlusFaceUp(false);
    setMinusFaceUp(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlyActive(true));
    });

    queueTimeout(() => {
      setFlight({ id, color, correct, phase: 'flip' });
    }, FLY_MS);

    queueTimeout(() => {
      measureLayout();
      setFlight({ id, color, correct, phase: 'settle' });
    }, FLY_MS + FLIP_MS);

    queueTimeout(() => {
      if (correct) {
        setCorrectCount((n) => n + 1);
        setPlusTop(color);
        setPlusFaceUp(true);
      } else {
        setWrongCount((n) => n + 1);
        setMinusTop(color);
        setMinusFaceUp(true);
      }
      setScoreHistory((prev) => {
        const prevDiff = prev.length ? prev[prev.length - 1] : 0;
        return [...prev, correct ? prevDiff + 1 : prevDiff - 1].slice(-50);
      });
      nextColorRef.current = rollColor();
      setFlight(null);
      setFlyActive(false);
    }, FLY_MS + FLIP_MS + SETTLE_MS);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        guess('white');
      }
      if (e.key === 'ArrowRight') {
        guess('black');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const target =
    flight?.phase === 'settle'
      ? flight.correct
        ? origins.plus
        : origins.minus
      : flight
        ? origins.reveal
        : origins.deck;

  return (
    <div className='bwc page'>
      <TopBar text='Черно-белые карты' />
      <div className='bwc-body page-section'>
        <div className='bwc-stats'>
          <div className='stat-chip'>
            <b>{`${resultPercent}%`}</b>
            <span>{`${correctCount} из ${totalAnswers}`}</span>
          </div>
        </div>

        <div className='bwc-table' ref={tableRef}>
          <div className='bwc-zones'>
            <div className='bwc-zone bwc-zone-plus'>
              <div className='bwc-zone-label'>+</div>
              <div className='bwc-zone-count'>{correctCount}</div>
              <div className='bwc-zone-stack' ref={plusStackRef}>
                <ZoneDeckLayers
                  depth={Math.min(
                    flight?.phase === 'settle' && flight.correct
                      ? correctCount
                      : Math.max(0, correctCount - 1),
                    ZONE_DECK_MAX
                  )}
                />
                {plusTop && !(flight?.phase === 'settle' && flight.correct) && (
                  <div className={`bwc-mini-flip ${plusFaceUp ? 'is-face-up' : 'is-face-down'}`}>
                    <div className='bwc-mini-face bwc-mini-back'>
                      <img src={cardBackUrl} alt='' draggable={false} />
                    </div>
                    <div className={`bwc-mini-face bwc-mini-front bwc-mini-card-${plusTop}`} />
                  </div>
                )}
              </div>
              <div className='bwc-zone-caption'>правильно</div>
            </div>

            <div className='bwc-reveal' ref={revealRef} aria-hidden='true' />

            <div className='bwc-zone bwc-zone-minus'>
              <div className='bwc-zone-label'>−</div>
              <div className='bwc-zone-count'>{wrongCount}</div>
              <div className='bwc-zone-stack' ref={minusStackRef}>
                <ZoneDeckLayers
                  depth={Math.min(
                    flight?.phase === 'settle' && !flight.correct
                      ? wrongCount
                      : Math.max(0, wrongCount - 1),
                    ZONE_DECK_MAX
                  )}
                />
                {minusTop && !(flight?.phase === 'settle' && !flight.correct) && (
                  <div className={`bwc-mini-flip ${minusFaceUp ? 'is-face-up' : 'is-face-down'}`}>
                    <div className='bwc-mini-face bwc-mini-back'>
                      <img src={cardBackUrl} alt='' draggable={false} />
                    </div>
                    <div className={`bwc-mini-face bwc-mini-front bwc-mini-card-${minusTop}`} />
                  </div>
                )}
              </div>
              <div className='bwc-zone-caption'>ошибка</div>
            </div>
          </div>

          {flight && (
            <div
              className={[
                'bwc-flight',
                flyActive ? 'is-active' : '',
                flight.phase === 'flip' || flight.phase === 'settle' ? 'is-flipped' : '',
                flight.phase === 'settle' ? 'is-settling' : '',
              ].join(' ')}
              style={{
                ['--from-left' as string]: `${origins.deck.left}px`,
                ['--from-top' as string]: `${origins.deck.top}px`,
                ['--to-left' as string]: `${target.left}px`,
                ['--to-top' as string]: `${target.top}px`,
              }}
            >
              <div className='bwc-flight-flipper'>
                <div className='bwc-flight-face bwc-flight-back'>
                  <img src={cardBackUrl} alt='' draggable={false} />
                </div>
                <div className={`bwc-flight-face bwc-flight-front bwc-flight-front-${flight.color}`} />
              </div>
            </div>
          )}

          <div className='bwc-controls'>
            <button
              type='button'
              className='bwc-guess bwc-guess--white bwc-guess--left'
              onClick={() => guess('white')}
              disabled={isBusy}
              aria-label='Белая карта'
            >
              <svg className='bwc-guess-arrow bwc-guess-arrow--mirror' viewBox='0 0 72 120' aria-hidden='true'>
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
              <span className='bwc-guess-caption'>белая</span>
            </button>
            <div
              ref={deckRef}
              className={`bwc-deck ${isBusy ? 'is-busy' : ''}`}
              aria-hidden='true'
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={`deck-${index}`}
                  className='bwc-deck-layer'
                  style={{ transform: `translate(${index}px, ${-index}px)` }}
                >
                  <img src={cardBackUrl} alt='' draggable={false} />
                </span>
              ))}
            </div>
            <button
              type='button'
              className='bwc-guess bwc-guess--black bwc-guess--right'
              onClick={() => guess('black')}
              disabled={isBusy}
              aria-label='Чёрная карта'
            >
              <svg className='bwc-guess-arrow' viewBox='0 0 72 120' aria-hidden='true'>
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
              <span className='bwc-guess-caption'>чёрная</span>
            </button>
          </div>

          <div className='bwc-chart-toggle'>
            <FormControlLabel
              control={
                <Switch
                  checked={showChart}
                  onChange={(_, checked) => setShowChart(checked)}
                  color='primary'
                  size='small'
                />
              }
              label='Динамика точности'
            />
          </div>
        </div>

        {showChart && <ScoreChart history={scoreHistory} offset={chartOffset} />}
      </div>
    </div>
  );
}
