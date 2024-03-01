/* eslint-disable import/no-anonymous-default-export */
import {
  Typography,
  LinearProgress,
  Button,
  IconButton,
} from '@mui/material';
import TopBar from './TopBar';
import './BWCards.css'
import { createRef, useState, useEffect } from 'react';

const isBlack = () => Math.random() < 0.5;

export default function() {
  const [totalAnswers, setTotalAnswers] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [isNextBlack, setIsNextBlack] = useState(isBlack());
  const [showResult, setShowResult] = useState(false);
  const resultClass = isNextBlack ? 'bwc-result-black' : 'bwc-result-white';
  const resultPercent = totalAnswers > 0 ? Math.round(correctAnswers * 100 / totalAnswers) : 100;
  const displayResult = (isAnswerBlack) => {
    if (showResult) {
      return;
    }
    setTimeout(() => {
      setShowResult(false);
      setIsNextBlack(isBlack());
    }, 1000);
    setShowResult(true);
    setTotalAnswers(totalAnswers + 1);
    if (isNextBlack === isAnswerBlack) {
      setCorrectAnswers(correctAnswers + 1);
    }
  }

  return <div className='bwc'>
    <TopBar text='Черно-белые карты'/>
    <div className='bwc-info'><b>{`${resultPercent}%`}</b> <span>{`(${correctAnswers}/${totalAnswers})`}</span></div>
    <LinearProgress variant='determinate' value={resultPercent}/>
    <div className='bwc-container-center'>
      <div id='result' className={`bwc-result ${showResult ? resultClass : ''}`}>&nbsp;</div>
      <div className='control-buttons'>
        <div id='btn-black' className='bwc-button bwc-button-white' onClick={() => displayResult(false)}>&nbsp;</div>
        <div id='btn-white' className='bwc-button bwc-button-black' onClick={() => displayResult(true)}>&nbsp;</div>
      </div>
    </div>
  </div>
}