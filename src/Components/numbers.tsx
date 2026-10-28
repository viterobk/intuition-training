/* eslint-disable import/no-anonymous-default-export */
import { Button, Switch } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import { useEffect, useRef, useState } from 'react';
import TopBar from './TopBar';
import NumberRow from './NumberRow';
import './Numbers.css';

const LEVEL_SIZES = [5, 4, 3, 2, 1] as const;
const cardBackUrl = `${process.env.PUBLIC_URL}/cards/number-back.svg`;

type DigitMode = 'one' | 'two';

const emptyLevels = () =>
  LEVEL_SIZES.map((size) => Array.from({ length: size }, () => undefined as number | undefined));

const generateResult = (mode: DigitMode) => {
  const lo = mode === 'one' ? 1 : 10;
  const hi = mode === 'one' ? 9 : 99;
  let min = 2;
  let max = -1;
  const result = {
    good: -1,
    bad: -1,
  };
  for (let i = lo; i <= hi; i += 1) {
    const rnd = Math.random();
    if (rnd > max) {
      result.good = i;
      max = rnd;
    }
    if (rnd < min) {
      result.bad = i;
      min = rnd;
    }
  }
  return result;
};

const firstEmptyIndex = (row: (number | undefined)[]) =>
  row.findIndex((value) => value == null);

const isRowFull = (row: (number | undefined)[]) => row.every((value) => value != null);

const modeTitle = (mode: DigitMode) =>
  mode === 'one' ? 'Числа от 1 до 9' : 'Числа от 10 до 99';

const TOLERANCE = 2;

const mirrorOf = (n: number): number =>
  Number(String(n).padStart(2, '0').split('').reverse().join(''));

/** В двузначном режиме: точное, ±2 или зеркало. В однозначном — только точное. */
const matchesTarget = (guess: number, target: number, mode: DigitMode): boolean => {
  if (guess === target) {
    return true;
  }
  if (mode !== 'two') {
    return false;
  }
  const diff = Math.abs(target - guess);
  if (diff >= 1 && diff <= TOLERANCE) {
    return true;
  }
  return mirrorOf(target) === guess;
};

const rowHasTarget = (
  filledRow: number[],
  good: number,
  bad: number,
  mode: DigitMode
) =>
  filledRow.some(
    (value) => matchesTarget(value, good, mode) || matchesTarget(value, bad, mode)
  );

export default function () {
  const [mode, setMode] = useState<DigitMode>('one');
  const [hiddenResult, setHiddenResult] = useState(() => generateResult('one'));
  const [result, setResult] = useState<{ good?: number; bad?: number }>({});
  const [rows, setRows] = useState<(number | undefined)[][]>(emptyLevels);
  /** Индекс ряда, который сейчас заполняется */
  const [activeRow, setActiveRow] = useState(0);
  /** null = клавиатура; иначе кнопки-числа для следующего ряда */
  const [picker, setPicker] = useState<number[] | null>(null);
  /** Черновик двузначного числа в текущем пустом слоте */
  const [draft, setDraft] = useState('');
  const [secretsFlipped, setSecretsFlipped] = useState(false);
  const revealed = Boolean(result.good);

  document.title = modeTitle(mode);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const hiddenResultRef = useRef(hiddenResult);
  hiddenResultRef.current = hiddenResult;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const activeRowRef = useRef(activeRow);
  activeRowRef.current = activeRow;
  const pickerRef = useRef(picker);
  pickerRef.current = picker;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;

  const finishIfNeeded = (
    nextRows: (number | undefined)[][],
    rowIndex: number,
    filledRow: number[]
  ) => {
    const { good, bad } = hiddenResultRef.current;
    const hasTarget = rowHasTarget(filledRow, good, bad, modeRef.current);
    const isLast = rowIndex >= nextRows.length - 1;

    if (!hasTarget || isLast) {
      setResult(hiddenResultRef.current);
      setPicker(null);
      pickerRef.current = null;
      setDraft('');
      draftRef.current = '';
      // Переворот после монтирования классов — чтобы CSS transition сработал
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSecretsFlipped(true));
      });
      return;
    }

    const nextActive = rowIndex + 1;
    setActiveRow(nextActive);
    activeRowRef.current = nextActive;
    setPicker([...filledRow]);
    pickerRef.current = [...filledRow];
    setDraft('');
    draftRef.current = '';
  };

  const placeNumber = (number: number) => {
    if (revealedRef.current) {
      return;
    }

    const rowIndex = activeRowRef.current;
    const nextRows = rowsRef.current.map((row) => [...row]);
    const row = nextRows[rowIndex];
    if (!row || isRowFull(row)) {
      return;
    }
    if (row.includes(number)) {
      return;
    }

    const slot = firstEmptyIndex(row);
    if (slot === -1) {
      return;
    }

    row[slot] = number;
    setRows(nextRows);
    rowsRef.current = nextRows;
    setDraft('');
    draftRef.current = '';

    if (isRowFull(row)) {
      finishIfNeeded(
        nextRows,
        rowIndex,
        row.filter((value): value is number => value != null)
      );
    }
  };

  const appendFromKeyboard = (digit: number) => {
    if (pickerRef.current != null || revealedRef.current) {
      return;
    }

    if (modeRef.current === 'one') {
      const row = rowsRef.current[activeRowRef.current];
      if (!row || row.includes(digit)) {
        return;
      }
      placeNumber(digit);
      return;
    }

    // Двузначный режим: собираем число по цифрам
    const row = rowsRef.current[activeRowRef.current];
    if (!row || isRowFull(row)) {
      return;
    }

    const current = draftRef.current;
    if (current === '') {
      if (digit === 0) {
        return;
      }
      setDraft(String(digit));
      draftRef.current = String(digit);
      return;
    }

    if (current.length >= 2) {
      return;
    }

    const value = Number(current + String(digit));
    if (row.includes(value)) {
      return;
    }
    placeNumber(value);
  };

  const clearLastFromKeyboard = () => {
    if (pickerRef.current != null || revealedRef.current) {
      return;
    }

    if (modeRef.current === 'two' && draftRef.current !== '') {
      setDraft('');
      draftRef.current = '';
      return;
    }

    const rowIndex = activeRowRef.current;
    const nextRows = rowsRef.current.map((row) => [...row]);
    const row = nextRows[rowIndex];
    if (!row) {
      return;
    }
    for (let i = row.length - 1; i >= 0; i -= 1) {
      if (row[i] != null) {
        row[i] = undefined;
        setRows(nextRows);
        rowsRef.current = nextRows;
        setDraft('');
        draftRef.current = '';
        return;
      }
    }
  };

  const pickFromButtons = (number: number) => {
    if (pickerRef.current == null || revealedRef.current) {
      return;
    }
    if (!pickerRef.current.includes(number)) {
      return;
    }
    const row = rowsRef.current[activeRowRef.current];
    if (row?.includes(number)) {
      return;
    }
    // Кнопку не убираем — только кладём число; ряд кнопок сменится после заполнения
    placeNumber(number);
  };

  const resetWithMode = (nextMode: DigitMode) => {
    const nextHidden = generateResult(nextMode);
    setMode(nextMode);
    modeRef.current = nextMode;
    setResult({});
    setHiddenResult(nextHidden);
    hiddenResultRef.current = nextHidden;
    const nextRows = emptyLevels();
    setRows(nextRows);
    rowsRef.current = nextRows;
    setActiveRow(0);
    activeRowRef.current = 0;
    setPicker(null);
    pickerRef.current = null;
    setDraft('');
    draftRef.current = '';
    setSecretsFlipped(false);
  };

  const reset = () => {
    resetWithMode(modeRef.current);
  };

  const changeMode = (_: unknown, checked: boolean) => {
    const nextMode: DigitMode = checked ? 'two' : 'one';
    if (nextMode === modeRef.current) {
      return;
    }
    resetWithMode(nextMode);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        const digit = Number(e.key);
        if (modeRef.current === 'one') {
          if (digit < 1 || digit > 9) {
            return;
          }
          e.preventDefault();
          if (pickerRef.current == null) {
            appendFromKeyboard(digit);
          } else if (pickerRef.current.includes(digit)) {
            pickFromButtons(digit);
          }
          return;
        }
        e.preventDefault();
        if (pickerRef.current == null) {
          appendFromKeyboard(digit);
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        clearLastFromKeyboard();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeRowValues = rows[activeRow] || [];
  const usedInActiveRow = new Set(
    activeRowValues.filter((value): value is number => value != null)
  );

  const isPadDigitDisabled = (digit: number) => {
    if (mode === 'one') {
      return usedInActiveRow.has(digit);
    }
    if (draft === '') {
      return digit === 0;
    }
    const value = Number(draft + String(digit));
    return usedInActiveRow.has(value);
  };

  return (
    <div className={`numbers page ${mode === 'two' ? 'is-two-digit' : ''}`.trim()}>
      <TopBar text={modeTitle(mode)} />
      <div className='numbers-body page-section'>
        <p className='numbers-lead'>
          Найдите успех (зелёное число) и избегите неудачи (красное). Поле будет сужаться до ответа.
        </p>

        <label className='numbers-mode-switch'>
          <span className={mode === 'one' ? 'is-active' : ''}>1–9</span>
          <Switch
            checked={mode === 'two'}
            onChange={changeMode}
            color='primary'
            size='small'
            inputProps={{ 'aria-label': 'Двузначные числа' }}
          />
          <span className={mode === 'two' ? 'is-active' : ''}>10–99</span>
        </label>

        <div className='numbers-board surface-panel'>
          <div className='numbers-secrets' aria-label='Скрытые числа'>
            <div
              className={`numbers-secret numbers-secret-good ${secretsFlipped ? 'is-flipped' : ''}`}
            >
              <div className='numbers-secret-flipper'>
                <div className='numbers-secret-face numbers-secret-back'>
                  <img src={cardBackUrl} alt='' draggable={false} />
                  <span className='numbers-secret-badge' aria-hidden='true'>
                    <CheckCircle fontSize='inherit' />
                  </span>
                </div>
                <div className='numbers-secret-face numbers-secret-front'>
                  {hiddenResult.good}
                </div>
              </div>
            </div>
            <div
              className={`numbers-secret numbers-secret-bad ${secretsFlipped ? 'is-flipped' : ''}`}
            >
              <div className='numbers-secret-flipper'>
                <div className='numbers-secret-face numbers-secret-back'>
                  <img src={cardBackUrl} alt='' draggable={false} />
                  <span className='numbers-secret-badge' aria-hidden='true'>
                    <Warning fontSize='inherit' />
                  </span>
                </div>
                <div className='numbers-secret-face numbers-secret-front'>
                  {hiddenResult.bad}
                </div>
              </div>
            </div>
          </div>

          {rows.map((row, index) => (
            <NumberRow
              key={`level-${row.length}`}
              numbers={row}
              good={result.good}
              bad={result.bad}
              isActive={!revealed && index === activeRow}
              draft={!revealed && index === activeRow ? draft : undefined}
              twoDigit={mode === 'two'}
              fuzzyHits={mode === 'two'}
            />
          ))}
        </div>

        {!revealed && picker == null && (
          <div className='numbers-pad' role='group' aria-label='Клавиатура'>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => {
              const digit = Number(key);
              const disabled = isPadDigitDisabled(digit);
              return (
                <button
                  key={key}
                  type='button'
                  className='numbers-key'
                  onClick={() => appendFromKeyboard(digit)}
                  disabled={disabled}
                  aria-disabled={disabled}
                >
                  {key}
                </button>
              );
            })}
            <button
              type='button'
              className='numbers-key numbers-key-action'
              onClick={clearLastFromKeyboard}
              aria-label='Стереть'
            >
              ⌫
            </button>
            {mode === 'two' ? (
              <button
                type='button'
                className='numbers-key'
                onClick={() => appendFromKeyboard(0)}
                disabled={isPadDigitDisabled(0)}
                aria-disabled={isPadDigitDisabled(0)}
              >
                0
              </button>
            ) : (
              <span className='numbers-key-spacer' aria-hidden='true' />
            )}
            <span className='numbers-key-spacer' aria-hidden='true' />
          </div>
        )}

        {!revealed && picker != null && (
          <div className='numbers-picker' role='group' aria-label='Выбор числа'>
            {picker.map((number) => {
              const disabled = usedInActiveRow.has(number);
              return (
                <button
                  key={number}
                  type='button'
                  className='numbers-key'
                  onClick={() => pickFromButtons(number)}
                  disabled={disabled}
                  aria-disabled={disabled}
                >
                  {number}
                </button>
              );
            })}
          </div>
        )}

        <Button className='numbers-reset' variant='outlined' onClick={reset}>
          Сбросить
        </Button>
      </div>
    </div>
  );
}
