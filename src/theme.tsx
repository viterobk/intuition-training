import { createTheme } from '@material-ui/core/styles';

const theme = createTheme({
  palette: {
    type: 'light',
    primary: {
      main: '#0f766e',
      dark: '#115e59',
      light: '#14b8a6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3d5a5a',
    },
    background: {
      default: 'transparent',
      paper: '#f7fbfa',
    },
    text: {
      primary: '#142a28',
      secondary: '#4a5c5a',
    },
  },
  typography: {
    fontFamily: '"Figtree", "Avenir Next", "Segoe UI", sans-serif',
    h6: {
      fontFamily: '"Fraunces", Georgia, serif',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 14,
  },
});

export default theme;
