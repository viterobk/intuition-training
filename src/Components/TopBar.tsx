/* eslint-disable import/no-anonymous-default-export */
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
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

const getTimeString = (startTime) => {
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
    } = props;
    const [startTime, _] = useState(new Date())
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
              color='inherit'
              onClick={homeClicked}
          >
            <Home/>
          </IconButton>
    }
    return (
        <AppBar position="sticky" className='top-bar'>
            <Toolbar className='toolbar'>
              <div>{showHome && renderHomeButton()}</div>
              <Typography variant='h6' noWrap>{text}</Typography>
              <div>{showTimer && <Typography variant='h6' noWrap>{timeString}</Typography>}</div>
            </Toolbar>
        </AppBar>
    )
}