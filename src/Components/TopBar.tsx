/* eslint-disable import/no-anonymous-default-export */
import { IconButton, Toolbar, Typography } from '@mui/material';
import Home from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './TopBar.css'

const DEFAULT_HEADER = 'Интуитивные тренировки';
const checkTimeObj = {
  callback: () => {},
}
setInterval(() => {
  checkTimeObj.callback();
}, 500)

const getTimeString = (startTime: Date) => {
  const totalSeconds = Math.floor(((new Date()).getTime() - startTime.getTime()) / 1000);
  const seconds = totalSeconds % 60
  const minutes = ((totalSeconds - seconds) / 60) % 60;
  const hours = (totalSeconds - minutes * 60 - seconds) / (60 * 60)
  return `${hours}:${minutes > 9 ? '' : '0'}${minutes}:${seconds > 9 ? '' : '0'}${seconds}`;
}

export default (props) => {
    const {
      text = DEFAULT_HEADER,
      showTimer = true,
      showHome = true,
      startTime: startTimeProp,
    } = props;
    const [localStartTime] = useState(() => new Date())
    const startTime = startTimeProp ?? localStartTime
    const [timeString, setTimeString] = useState(getTimeString(startTime))
    checkTimeObj.callback = () => {
      setTimeString(getTimeString(startTime));
    }
    const navigate = useNavigate();
    const homeClicked = () => {
        const e = { cancel: false };
        if(!e.cancel) navigate('/');
    }
    const renderHomeButton = () => {
        return <IconButton
              className='top-bar-home'
              color='inherit'
              onClick={homeClicked}
              aria-label='На главную'
          >
            <Home/>
          </IconButton>
    }
    return (
        <header className='top-bar'>
            <Toolbar className='toolbar'>
              <div className='top-bar-side top-bar-side-left'>{showHome && renderHomeButton()}</div>
              <Typography className='top-bar-title' variant='h6' noWrap>{text}</Typography>
              <div className='top-bar-side top-bar-side-right'>
                {showTimer && <div className='top-bar-timer'>{timeString}</div>}
              </div>
            </Toolbar>
        </header>
    )
}
