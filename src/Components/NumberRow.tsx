/* eslint-disable import/no-anonymous-default-export */
import './NumberRow.css'

interface INumbersRowProps {
  numbers?: any[];
  good?: number;
  bad?: number;
  isActive?: boolean;
  onSelect?: (value: any) => void;
}

export default function({ numbers, good, bad, isActive, onSelect }: INumbersRowProps) {
  if (!numbers || !numbers.length) {
    return null
  }
  const getDigClass = (value) => {
    const classes = ['numrow-dig'];
    if (!value) {
      classes.push('numrow-dig-empty');
      return classes.join(' ');
    }
    if (value && onSelect) {
      classes.push('numrow-dig-selectable');
    }
    if (value === good) {
      classes.push('numrow-dig-good');
    }
    if (value === bad) {
      classes.push('numrow-dig-bad');
    }
    return classes.join(' ');
  }

  return (
    <div className={`numrow ${isActive ? 'is-active' : ''}`.trim()}>
      {numbers.map((number, index) => {
        return (
          <div
            key={index}
            className={getDigClass(number)}
            onClick={() => onSelect?.(number)}
          >
            {number}
          </div>
        );
      })}
    </div>
  );
}