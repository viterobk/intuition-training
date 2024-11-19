/* eslint-disable import/no-anonymous-default-export */
import TopBar from './TopBar';
import './NumberRow.css'
import { useState } from 'react';

interface INumbersRowProps {
  numbers?: any[];
  good?: number;
  bad?: number;
  onSelect?: (value: any) => void;
}

export default function({ numbers, good, bad, onSelect }: INumbersRowProps) {
  if (!numbers || !numbers.length) {
    return null
  }
  const getDigClass = (value) => {
    const classes = ['numrow-dig'];
    if (!value) {
      classes.push('numrow-dig-empty');
      return classes.join(' ');
    }
    if (onSelect) {
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

  return (<div className='numrow'>
    {
      numbers.map((number, index) => {
        return (<div key={index} className={getDigClass(number)} onClick={() => onSelect?.(number)}>{number}</div>)
      })
    }
  </div>)
}