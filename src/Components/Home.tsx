import React, { Component } from 'react';
import {
    List,
    ListItem,
    ListItemButton,
    ListItemText,
} from '@mui/material';
import { Link } from 'react-router-dom';
import './Home.css';
import { observer } from 'mobx-react';
import TopBar from './TopBar';

class Home extends Component {
    render() {
        return (
            <div className='Home'>
                <TopBar/>
                <List className='Home-list'>
                    <ListItem className="Home-listitem-doublepadding">
                        <ListItemButton
                            className='Home-timeritem'
                            component={Link}
                            to={`/bwc`}>
                            <ListItemText
                                primary={'Ч/Б карты'} />
                        </ListItemButton>
                    </ListItem>
                </List>
            </div>
        )
    }
}
export default observer(Home);