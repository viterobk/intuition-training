/* eslint-disable import/no-anonymous-default-export */
import './NumberRow.css'

const TOLERANCE = 2;

const mirrorOf = (n: number): number =>
  Number(String(n).padStart(2, '0').split('').reverse().join(''));

const matchesTarget = (guess: number, target: number, fuzzy: boolean): boolean => {
  if (guess === target) {
    return true;
  }
  if (!fuzzy) {
    return false;
  }
  const diff = Math.abs(target - guess);
  if (diff >= 1 && diff <= TOLERANCE) {
    return true;
  }
  return mirrorOf(target) === guess;
};

interface INumbersRowProps {
  numbers?: (number | undefined)[];
  good?: number;
  bad?: number;
  isActive?: boolean;
  onSelect?: (value: number | undefined) => void;
  /** Черновик ввода для первого пустого слота */
  draft?: string;
  twoDigit?: boolean;
  /** ±2 и зеркало считаются попаданием */
  fuzzyHits?: boolean;
}

export default function({
  numbers,
  good,
  bad,
  isActive,
  onSelect,
  draft,
  twoDigit,
  fuzzyHits,
}: INumbersRowProps) {
  if (!numbers || !numbers.length) {
    return null
  }

  const draftSlot = draft
    ? numbers.findIndex((value) => value == null)
    : -1;

  const getDigClass = (value: number | undefined, showDraft: boolean) => {
    const classes = ['numrow-dig'];
    if (value == null && !showDraft) {
      classes.push('numrow-dig-empty');
      return classes.join(' ');
    }
    if (value == null && showDraft) {
      classes.push('numrow-dig-draft');
      return classes.join(' ');
    }
    if (value != null && onSelect) {
      classes.push('numrow-dig-selectable');
    }
    if (value != null && good != null && matchesTarget(value, good, Boolean(fuzzyHits))) {
      classes.push('numrow-dig-good');
    } else if (value != null && bad != null && matchesTarget(value, bad, Boolean(fuzzyHits))) {
      classes.push('numrow-dig-bad');
    }
    return classes.join(' ');
  }

  return (
    <div
      className={[
        'numrow',
        isActive ? 'is-active' : '',
        twoDigit ? 'is-two-digit' : '',
      ].filter(Boolean).join(' ')}
    >
      {numbers.map((number, index) => {
        const showDraft = index === draftSlot && Boolean(draft);
        return (
          <div
            key={index}
            className={getDigClass(number, showDraft)}
            onClick={() => onSelect?.(number)}
          >
            {showDraft ? (
              <span className='numrow-dig-draft-text'>
                {draft}
                <span className='numrow-dig-draft-gap'>·</span>
              </span>
            ) : (
              number
            )}
          </div>
        );
      })}
    </div>
  );
}
