/* eslint-disable import/no-anonymous-default-export */
import {
  Button,
  LinearProgress,
} from '@mui/material';
import TopBar from './TopBar';
import './BWCards.css'
import { useState } from 'react';
import NumberRow from './NumberRow';

const INITIAL_NUMBER_ROWS = [[1, 2, 3, 4, 5, 6, 7, 8, 9]];
const FIRST_SELECTION_SIZE = 5;

const generateResult = () => {
  let min = 2;
  let max = -1;
  const result = {
    good: -1,
    bad: -1,
  }
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
}

const getUpdatedRows = (rows, result) => {
  if (rows.length === 1) {
    return [...rows, Array.from({ length: FIRST_SELECTION_SIZE })];
  }
  const lastRow = rows[rows.length - 1];
  if (lastRow.length === 1) {
    return [...rows];
  }
  if (lastRow.every(Boolean) && (lastRow.includes(result.good) || lastRow.includes(result.bad))) {
    return [...rows, Array.from({ length: lastRow.length - 1 })]
  }
  return [...rows];
}

const addNumber = (rows, number, result) => {
  const lastRow = rows[rows.length - 1];
  if (lastRow.includes(number)) {
    return rows;
  }
  const nextIndex = lastRow.indexOf(undefined);
  lastRow[nextIndex] = number;
  return getUpdatedRows(rows, result);
}

export default function() {
  document.title = 'Числа от 1 до 9'
  const [result, setResult] = useState<{ good?: number, bad?: number }>({});
  const [hiddenResult, setHiddenResult] = useState(generateResult());
  const [rows, setRows] = useState(getUpdatedRows(INITIAL_NUMBER_ROWS, hiddenResult));
  
  const numberSelected = (number) => {
    const updatedRows = addNumber(rows, number, hiddenResult);
    if (updatedRows) {
      setRows(updatedRows);
      const lastRow = updatedRows[updatedRows.length - 1];
      if (lastRow.every(Boolean)) {
        setResult(hiddenResult);
      }
    }
    
  }
  document.onkeydown = (e) => {
    if (e.key === 'ArrowLeft') {
    
    }
    if (e.key === 'ArrowRight') {
    
    }
  }

  return <div className='numbers'>
    <TopBar text='Числа от 1 до 9'/>
    {
      rows.filter(Boolean).map((row, index) => {
        return (<NumberRow
          key={index}
          numbers={row}
          good={result.good}
          bad={result.bad}
          onSelect={rows.length - 2 === index && !result.good ? numberSelected : undefined}/>)
      })
    }
    <Button onClick={() => {
      setResult({});
      setHiddenResult(generateResult());
      setRows(getUpdatedRows(INITIAL_NUMBER_ROWS, hiddenResult));
    }}>Сбросить</Button>
  </div>
}