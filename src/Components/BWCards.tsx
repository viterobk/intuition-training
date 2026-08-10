/* eslint-disable import/no-anonymous-default-export */
import {
  LinearProgress,
} from '@mui/material';
import TopBar from './TopBar';
import './BWCards.css'
import { useState } from 'react';

const isBlack = () => Math.random() < 0.5;

function ScoreChart({ history, offset }: { history: number[]; offset: number }) {
  const width = 320;
  const height = 140;
  const padding = { top: 16, right: 12, bottom: 20, left: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (history.length === 0) {
    return (
      <div className='bwc-chart'>
        <div className='bwc-chart-title'>Правильных ответов</div>
        <svg className='bwc-chart-svg' viewBox={`0 0 ${width} ${height}`} role='img' aria-label='График разности ответов'>
          <line
            x1={padding.left}
            y1={padding.top + plotHeight / 2}
            x2={width - padding.right}
            y2={padding.top + plotHeight / 2}
            className='bwc-chart-zero'
          />
          <text x={width / 2} y={height / 2 + 4} textAnchor='middle' className='bwc-chart-empty'>
            Нажмите кнопку, чтобы начать
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
    <div className='bwc-chart'>
      <div className='bwc-chart-title'>
        Правильных ответов: <b>{last > 0 ? `+${last}` : last}</b>
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
            <text
              x={xScale(index)}
              y={height - 4}
              textAnchor='middle'
              className='bwc-chart-label'
            >
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

export default function() {
  document.title = 'Ч/Б карты'
  const [totalAnswers, setTotalAnswers] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [scoreHistory, setScoreHistory] = useState<number[]>([])
  const [isNextBlack, setIsNextBlack] = useState(isBlack());
  const [showResult, setShowResult] = useState(false);
  const resultClass = isNextBlack ? 'bwc-result-black' : 'bwc-result-white';
  const resultPercent = totalAnswers > 0 ? Math.round(correctAnswers * 100 / totalAnswers) : 50;
  const incorrectAnswers = totalAnswers - correctAnswers;
  const scoreDiff = correctAnswers - incorrectAnswers;
  const chartOffset = Math.max(0, totalAnswers - scoreHistory.length);

  const displayResult = (isAnswerBlack: boolean) => {
    if (showResult) {
      return;
    }
    setTimeout(() => {
      setShowResult(false);
      setIsNextBlack(isBlack());
    }, 1000);
    setShowResult(true);
    const nextTotal = totalAnswers + 1;
    const nextCorrect = isNextBlack === isAnswerBlack ? correctAnswers + 1 : correctAnswers;
    const nextIncorrect = nextTotal - nextCorrect;
    setTotalAnswers(nextTotal);
    setCorrectAnswers(nextCorrect);
    setScoreHistory((prev) => [...prev, nextCorrect - nextIncorrect].slice(-50));
  }

  document.onkeydown = (e) => {
    if (e.key === 'ArrowLeft') {
      displayResult(false);
    }
    if (e.key === 'ArrowRight') {
      displayResult(true);
    }
  }

  return <div className='bwc'>
    <TopBar text='Черно-белые карты'/>
    <div className='bwc-info'>
      <b>{`${resultPercent}%`}</b>{' '}
      <span>{`(${correctAnswers}/${totalAnswers})`}</span>
    </div>
    <LinearProgress variant='determinate' value={resultPercent}/>
    <div className='bwc-container-center'>
      <div id='result' className={`bwc-result ${showResult ? resultClass : ''}`}></div>
      <div className='control-buttons'>
        <div id='btn-black' className='bwc-button bwc-button-white' onClick={() => displayResult(false)}></div>
        <div id='btn-white' className='bwc-button bwc-button-black' onClick={() => displayResult(true)}></div>
      </div>
    </div>
    <ScoreChart history={scoreHistory} offset={chartOffset} />
  </div>
}
