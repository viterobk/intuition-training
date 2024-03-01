import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Check from '@mui/icons-material/Check';
import { Link, useNavigate } from 'react-router-dom';

const DEFAULT_HEADER = 'Интуитивные тренировки';

export default (props) => {
    const { text = DEFAULT_HEADER } = props;
    const navigate = useNavigate();
    const backClicked = () => {
        const e = { cancel: false };
        props.onBackClick && props.onBackClick(e);
        if(!e.cancel) navigate(props.backPath);
    }
    const renderOkButton = () => {
        if(!props.backPath || !props.onOkClick) {
            return;
        }
        return (
            <IconButton
                component={Link}
                to={props.backPath}
                onClick={props.onOkClick}>
                <Check style={{color: '5f5'}}/>
            </IconButton>
        )
    }
    const renderBackButton = () => {
        if(props.backPath) {
            return <IconButton
                color='inherit'
                onClick={backClicked}
            >
                <ArrowBack/>
            </IconButton>
        }
        return <IconButton disabled>
            <ArrowBack/>
        </IconButton>
    }
    return (
        <AppBar position="sticky">
            <Toolbar>
                {renderBackButton()}
            <Typography variant='h6' noWrap>{text}</Typography>
            <Box style={{flex: 1}}/>
            {renderOkButton()}
            </Toolbar>
        </AppBar>
    )
}