/* eslint-disable import/no-anonymous-default-export */
import { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from 'react-router-dom';
import './App.css';

const Home = lazy(() => import('./Home'));
const BWCards = lazy(() => import('./BWCards'));
const Numbers = lazy(() => import('./Numbers'));
const RandomCards = lazy(() => import('./RandomCards'));
const TwoDigitNumbers = lazy(() => import('./TwoDigitNumbers'));
const Dice = lazy(() => import('./Dice'));

function PageFallback() {
  return (
    <div className='App-page-fallback' role='status' aria-live='polite'>
      Загрузка…
    </div>
  );
}

export default () => {
  return (
    <div className='App'>
      <Router>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/bwc' element={<BWCards />} />
            <Route path='/bwc/' element={<BWCards />} />
            <Route path='/num' element={<Numbers />} />
            <Route path='/num/' element={<Numbers />} />
            <Route path='/twodigit' element={<TwoDigitNumbers />} />
            <Route path='/twodigit/' element={<TwoDigitNumbers />} />
            <Route path='/dice' element={<Dice />} />
            <Route path='/dice/' element={<Dice />} />
            <Route path='/random' element={<RandomCards />} />
            <Route path='/random/' element={<RandomCards />} />
          </Routes>
        </Suspense>
      </Router>
    </div>
  );
};
