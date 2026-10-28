/* eslint-disable import/no-anonymous-default-export */
import { Button } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import { useEffect, useRef, useState } from 'react';
import TopBar from './TopBar';
import NumberRow from './NumberRow';
import './Numbers.css';

const LEVEL_SIZES = [5, 4, 3, 2, 1] as const;
const cardBackUrl = `${process.env.PUBLIC_URL}/cards/number-back.svg`;

const emptyLevels = () =>
  LEVEL_SIZES.map((size) => Array.from({ length: size }, () => undefined as number | undefined));

const generateResult = () => {
  let min = 2;
  let max = -1;
  const result = {
    good: -1,
    bad: -1,
  };
  for (let i = 1; i <= 9; i++) {
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

export default function () {
  document.title = 'Числа от 1 до 9';

  const [hiddenResult, setHiddenResult] = useState(generateResult);
  const [result, setResult] = useState<{ good?: number; bad?: number }>({});
  const [rows, setRows] = useState<(number | undefined)[][]>(emptyLevels);
  /** Индекс ряда, который сейчас заполняется */
  const [activeRow, setActiveRow] = useState(0);
  /** null = клавиатура 1–9; иначе кнопки-числа для следующего ряда */
  const [picker, setPicker] = useState<number[] | null>(null);
  const [secretsFlipped, setSecretsFlipped] = useState(false);
  const revealed = Boolean(result.good);

  const hiddenResultRef = useRef(hiddenResult);
  hiddenResultRef.current = hiddenResult;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const activeRowRef = useRef(activeRow);
  activeRowRef.current = activeRow;
  const pickerRef = useRef(picker);
  pickerRef.current = picker;
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;

  const finishIfNeeded = (
    nextRows: (number | undefined)[][],
    rowIndex: number,
    filledRow: number[]
  ) => {
    const { good, bad } = hiddenResultRef.current;
    const hasTarget = filledRow.includes(good) || filledRow.includes(bad);
    const isLast = rowIndex >= nextRows.length - 1;

    if (!hasTarget || isLast) {
      setResult(hiddenResultRef.current);
      setPicker(null);
      pickerRef.current = null;
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
    const row = rowsRef.current[activeRowRef.current];
    if (!row || row.includes(digit)) {
      return;
    }
    placeNumber(digit);
  };

  const clearLastFromKeyboard = () => {
    if (pickerRef.current != null || revealedRef.current) {
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

  const reset = () => {
    const nextHidden = generateResult();
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
    setSecretsFlipped(false);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        if (pickerRef.current == null) {
          appendFromKeyboard(Number(e.key));
        } else if (pickerRef.current.includes(Number(e.key))) {
          pickFromButtons(Number(e.key));
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

  return (
    <div className='numbers page'>
      <TopBar text='Числа от 1 до 9' />
      <div className='numbers-body page-section'>
        <p className='numbers-lead'>
          Выберите числа, которые «звучат» правильно. Поле будет сужаться до финального ответа.
        </p>
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
            />
          ))}
        </div>

        {!revealed && picker == null && (
          <div className='numbers-pad' role='group' aria-label='Клавиатура'>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => {
              const digit = Number(key);
              const disabled = usedInActiveRow.has(digit);
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
            <span className='numbers-key-spacer' aria-hidden='true' />
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
