/* eslint-disable import/no-anonymous-default-export */
import { useEffect, useRef, useState } from 'react';
import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
} from '@mui/material';
import TopBar from './TopBar';
import './BWCards.css';

const FLIP_MS = 60;
const SETTLE_MS = 90;
const STORAGE_KEY = 'bwc-enabled-colors';

type CardColor = 'black' | 'white' | 'red' | 'blue' | 'green';

type ColorOption = {
  id: CardColor;
  label: string;
  ariaLabel: string;
  key: string;
};

/** Полная палитра. Активный набор задаётся чекбоксами и хранится в localStorage. */
const ALL_COLOR_OPTIONS: ColorOption[] = [
  { id: 'white', label: 'белый', ariaLabel: 'Белая карта', key: 'ArrowLeft' },
  { id: 'black', label: 'чёрный', ariaLabel: 'Чёрная карта', key: 'ArrowRight' },
  { id: 'red', label: 'красный', ariaLabel: 'Красная карта', key: 'Digit1' },
  { id: 'blue', label: 'синий', ariaLabel: 'Синяя карта', key: 'Digit2' },
  { id: 'green', label: 'зелёный', ariaLabel: 'Зелёная карта', key: 'Digit3' },
];

const DEFAULT_ENABLED: CardColor[] = ['white', 'black'];
const ALL_COLOR_IDS = ALL_COLOR_OPTIONS.map((option) => option.id);

function loadEnabledColors(): CardColor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ENABLED;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_ENABLED;
    }
    const valid = ALL_COLOR_IDS.filter((id) => parsed.includes(id));
    return valid.length > 0 ? valid : DEFAULT_ENABLED;
  } catch {
    return DEFAULT_ENABLED;
  }
}

function saveEnabledColors(colors: CardColor[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

const rollColor = (pool: CardColor[]): CardColor =>
  pool[Math.floor(Math.random() * pool.length)];

type FlightPhase = 'flip' | 'settle';

type Flight = {
  id: number;
  color: CardColor;
  correct: boolean;
  phase: FlightPhase;
};

const cardBackUrl = `${process.env.PUBLIC_URL}/cards/back.svg`;
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
  document.title = 'Цветные карты';

  const tableRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const plusStackRef = useRef<HTMLDivElement>(null);
  const minusStackRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const [enabledColors, setEnabledColors] = useState<CardColor[]>(loadEnabledColors);
  const enabledColorsRef = useRef(enabledColors);
  enabledColorsRef.current = enabledColors;
  const nextColorRef = useRef<CardColor>(rollColor(enabledColors));

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
  const [cardFlipped, setCardFlipped] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pendingResultRef = useRef<{ id: number; color: CardColor; correct: boolean } | null>(
    null
  );
  const [origins, setOrigins] = useState({
    deck: { left: 0, top: 0 },
    plus: { left: 0, top: 0 },
    minus: { left: 0, top: 0 },
  });

  const activeOptions = ALL_COLOR_OPTIONS.filter((option) =>
    enabledColors.includes(option.id)
  );
  const totalAnswers = correctCount + wrongCount;
  const resultPercent = totalAnswers > 0 ? Math.round((correctCount * 100) / totalAnswers) : 50;
  const chartOffset = Math.max(0, totalAnswers - scoreHistory.length);
  const isBusy = Boolean(flight);

  useEffect(() => {
    if (!enabledColors.includes(nextColorRef.current)) {
      nextColorRef.current = rollColor(enabledColors);
    }
  }, [enabledColors]);

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
      plus: read(plusStackRef.current),
      minus: read(minusStackRef.current),
    });
  };

  useEffect(() => {
    measureLayout();
    window.addEventListener('resize', measureLayout);
    return () => window.removeEventListener('resize', measureLayout);
  }, [correctCount, wrongCount, enabledColors]);

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

  const resetStats = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    pendingResultRef.current = null;
    setCorrectCount(0);
    setWrongCount(0);
    setPlusTop(null);
    setMinusTop(null);
    setPlusFaceUp(false);
    setMinusFaceUp(false);
    setScoreHistory([]);
    setFlight(null);
    setFlyActive(false);
    setCardFlipped(false);
  };

  const toggleColor = (color: CardColor) => {
    const isOn = enabledColors.includes(color);
    if (isOn && enabledColors.length <= 1) {
      return;
    }
    const next = isOn
      ? enabledColors.filter((id) => id !== color)
      : ALL_COLOR_IDS.filter((id) => enabledColors.includes(id) || id === color);
    saveEnabledColors(next);
    setEnabledColors(next);
    nextColorRef.current = rollColor(next);
    resetStats();
  };

  const applyGuessResult = (color: CardColor, correct: boolean) => {
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
    nextColorRef.current = rollColor(enabledColorsRef.current);
  };

  const guess = (answer: CardColor) => {
    if (!enabledColorsRef.current.includes(answer)) {
      return;
    }

    // Прерывание предыдущего полёта — кнопки не блокируются
    if (pendingResultRef.current) {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      const pending = pendingResultRef.current;
      pendingResultRef.current = null;
      applyGuessResult(pending.color, pending.correct);
      setFlight(null);
      setFlyActive(false);
      setCardFlipped(false);
    }

    measureLayout();
    const color = nextColorRef.current;
    const correct = color === answer;
    const id = Date.now();
    pendingResultRef.current = { id, color, correct };

    // Переворот на месте колоды, затем сдвиг влево/вправо в зону
    setFlight({ id, color, correct, phase: 'flip' });
    setFlyActive(true);
    setCardFlipped(false);
    setPlusFaceUp(false);
    setMinusFaceUp(false);

    // После монтирования — иначе CSS transition не сработает
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCardFlipped(true));
    });

    queueTimeout(() => {
      measureLayout();
      setFlight((prev) =>
        prev && prev.id === id ? { id, color, correct, phase: 'settle' } : prev
      );
    }, FLIP_MS);

    queueTimeout(() => {
      if (!pendingResultRef.current || pendingResultRef.current.id !== id) {
        return;
      }
      pendingResultRef.current = null;
      applyGuessResult(color, correct);
      setFlight(null);
      setFlyActive(false);
      setCardFlipped(false);
    }, FLIP_MS + SETTLE_MS);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (paletteOpen) {
        return;
      }
      const option = ALL_COLOR_OPTIONS.find(
        (item) => item.key === e.key || item.key === e.code
      );
      if (option && enabledColorsRef.current.includes(option.id)) {
        guess(option.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen]);

  const target =
    flight?.phase === 'settle'
      ? flight.correct
        ? origins.plus
        : origins.minus
      : origins.deck;

  return (
    <div className='bwc page'>
      <TopBar text='Цветные карты' />
      <div className='bwc-body page-section'>
        <div className='bwc-stats'>
          <div className='stat-chip'>
            <b>{`${resultPercent}%`}</b>
            <span>{`${correctCount} из ${totalAnswers}`}</span>
          </div>
        </div>

        <div className='bwc-table' ref={tableRef}>
          <div className='bwc-play'>
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

            <div className='bwc-center'>
              <div className='bwc-center-head' aria-hidden='true' />
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
              <div className='bwc-zone-caption'>колода</div>
            </div>

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
                cardFlipped ? 'is-flipped' : '',
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

          <div className='bwc-controls-wrap'>
            <button
              type='button'
              className='bwc-palette-link'
              onClick={() => setPaletteOpen(true)}
            >
              Выбрать цвета
            </button>
            <div className='bwc-controls' role='group' aria-label='Выбор цвета'>
              {activeOptions.map((option) => (
                <button
                  key={option.id}
                  type='button'
                  className={`bwc-guess bwc-guess--${option.id}`}
                  onClick={() => guess(option.id)}
                  aria-label={option.ariaLabel}
                >
                  <span className='bwc-guess-swatch' aria-hidden='true' />
                  <span className='bwc-guess-caption'>{option.label}</span>
                </button>
              ))}
            </div>
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

      <Dialog
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        aria-labelledby='bwc-palette-title'
        PaperProps={{ className: 'bwc-palette-dialog' }}
      >
        <DialogTitle id='bwc-palette-title'>Цвета в тренировке</DialogTitle>
        <DialogContent>
          <p className='bwc-palette-hint'>Отметьте цвета, которые будут появляться в колоде.</p>
          <div className='bwc-palette-list' role='group' aria-label='Список цветов'>
            {ALL_COLOR_OPTIONS.map((option) => {
              const checked = enabledColors.includes(option.id);
              const onlyOne = checked && enabledColors.length === 1;
              return (
                <FormControlLabel
                  key={option.id}
                  className='bwc-palette-item'
                  control={
                    <Checkbox
                      checked={checked}
                      disabled={onlyOne}
                      onChange={() => toggleColor(option.id)}
                      color='primary'
                    />
                  }
                  label={
                    <span className='bwc-palette-label'>
                      <span
                        className={`bwc-palette-swatch bwc-palette-swatch--${option.id}`}
                        aria-hidden='true'
                      />
                      {option.label}
                    </span>
                  }
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
