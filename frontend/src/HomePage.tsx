import { useState } from 'react'
import { Link } from 'react-router-dom'
import './HomePage.css'

const bookingSteps = [
  { number: '01', title: 'Выберите тип встречи', description: 'Знакомство, рабочая встреча или консультация.' },
  { number: '02', title: 'Выберите свободные дату и время', description: 'Посмотрите доступные слоты на ближайшие 14 дней.' },
  { number: '03', title: 'Оставьте имя и email', description: 'Запись без регистрации и личного кабинета.' },
]

function HomePage() {
  const [year] = useState(() => new Date().getFullYear())

  return (
    <main className="home-page">
      <header className="home-header">
        <Link className="home-brand" to="/">
          <span className="home-brand-mark">К</span>
          <span>календарь<span className="home-brand-light">звонков</span></span>
        </Link>
        <span className="home-owner">Календарь Светы Залядновой</span>
      </header>

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">КАЛЕНДАРЬ ВСТРЕЧ</p>
          <h1>Выберите время<br />для встречи со Светой</h1>
          <p className="home-lead">
            Договориться о встрече просто: выберите тип встречи и удобное время
            в календаре на ближайшие 14 календарных дней.
          </p>
          <Link className="home-cta" to="/booking">Выбрать время <span aria-hidden="true">→</span></Link>
          <p className="home-note">Без регистрации · Консультации и рабочие встречи</p>
        </div>
        <div className="home-calendar-art" aria-hidden="true">
          <div className="home-calendar-top"><span>ВСТРЕЧА</span><strong>Ваше время</strong></div>
          <div className="home-calendar-day"><span>ВТ</span><strong>18</strong><i>10:30</i></div>
          <div className="home-calendar-check">✓</div>
        </div>
      </section>

      <section className="home-how" aria-labelledby="home-how-title">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">ВСЕГО ТРИ ШАГА</p>
            <h2 id="home-how-title">Как записаться</h2>
          </div>
          <p>Выберите встречу — остальное займёт пару минут.</p>
        </div>
        <ol className="home-steps">
          {bookingSteps.map((step) => (
            <li className="home-step" key={step.number}>
              <span className="home-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="home-footer">
        <span>© {year} Календарь звонков</span>
        <span>Владелец календаря — Света Заляднова</span>
      </footer>
    </main>
  )
}

export default HomePage
