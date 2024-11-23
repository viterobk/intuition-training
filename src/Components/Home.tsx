import React, { Component } from 'react';
import {
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import './Home.css';
import { observer } from 'mobx-react';
import TopBar from './TopBar';
import Compare from '@mui/icons-material/Compare';
import Pin from '@mui/icons-material/Pin';

class Home extends Component {
    render() {
        document.title = 'Тренировка интуиции'
        return (
            <div className='Home'>
                <TopBar showTimer={false} showHome={false}/>
                <List className='Home-list'>
                    <ListItem>
                        <ListItemButton
                          className="list-button"
                          component={Link}
                          to={`/bwc`}>
                          <Compare className='list-icon'/>
                          <ListItemText
                            primary={<b>Черно-белые карты</b>} />
                        </ListItemButton>
                    </ListItem>
                    <ListItem>
                      <ListItemButton
                        className="list-button"
                        component={Link}
                        to={`/num`}>
                        <Pin className='list-icon'/>
                        <ListItemText
                          primary={<b>Числа от 1 до 9</b>} />
                      </ListItemButton>
                    </ListItem>
                </List>
            </div>
        )
    }
}
export default observer(Home);