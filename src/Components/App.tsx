/* eslint-disable import/no-anonymous-default-export */
import {
  HashRouter as Router,
  Route,
  Routes,
} from 'react-router-dom'
import './App.css';
import Home from './Home';
import BWCards from './BWCards';
import Numbers from './Numbers';
import RandomCards from './RandomCards';
import TwoDigitNumbers from './TwoDigitNumbers';
import Dice from './Dice';

export default () => {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/bwc' element={<BWCards/>} />
          <Route path='/num' element={<Numbers/>} />
          <Route path='/twodigit' element={<TwoDigitNumbers/>} />
          <Route path='/dice' element={<Dice/>} />
          <Route path='/random' element={<RandomCards/>} />
        </Routes>
      </Router>
    </div>
  );
}
