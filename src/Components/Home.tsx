import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import { observer } from 'mobx-react';
import TopBar from './TopBar';
import Compare from '@mui/icons-material/Compare';
import Pin from '@mui/icons-material/Pin';
import ArrowForward from '@mui/icons-material/ArrowForward';

const exercises = [
  {
    to: '/bwc',
    title: 'Черно-белые карты',
    description: 'Угадывайте цвет следующей карты и следите за динамикой точности.',
    icon: Compare,
    tone: 'tone-cards',
  },
  {
    to: '/num',
    title: 'Числа от 1 до 9',
    description: 'Выбирайте числа интуитивно и сужайте поле до верного ответа.',
    icon: Pin,
    tone: 'tone-numbers',
  },
];

class Home extends Component {
  render() {
    document.title = 'Тренировка интуиции';
    return (
      <div className='Home page'>
        <TopBar showTimer={false} showHome={false} />
        <section className='Home-hero page-section'>
          <p className='Home-kicker'>Практика внимания</p>
          <h1 className='Home-brand'>Тренировка интуиции</h1>
          <p className='Home-lead'>
            Короткие упражнения, чтобы замечать внутренние сигналы и проверять их в деле.
          </p>
        </section>
        <section className='Home-list page-section' aria-label='Упражнения'>
          {exercises.map((exercise, index) => {
            const Icon = exercise.icon;
            return (
              <Link
                key={exercise.to}
                className={`Home-card ${exercise.tone}`}
                to={exercise.to}
                style={{ animationDelay: `${0.12 + index * 0.08}s` }}
              >
                <div className='Home-card-icon' aria-hidden='true'>
                  <Icon />
                </div>
                <div className='Home-card-copy'>
                  <h2>{exercise.title}</h2>
                  <p>{exercise.description}</p>
                </div>
                <span className='Home-card-go' aria-hidden='true'>
                  <ArrowForward fontSize='small' />
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    );
  }
}

export default observer(Home);
