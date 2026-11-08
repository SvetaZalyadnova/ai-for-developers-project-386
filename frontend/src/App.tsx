import { useMemo, useState, type FormEvent } from 'react'
import './App.css'

const meetingTypes = [
  { title: 'Знакомство', duration: 15 },
  { title: 'Рабочая встреча', duration: 30 },
  { title: 'Консультация', duration: 60 },
] as const

type Booking = { date: string; start: number; duration: number }
const dateLabel = (key: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('ru-RU', { ...options, timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`))
const timeLabel = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

function App() {
  const [now] = useState(() => Date.now())
  const dates = useMemo(() => {
    const current = new Date(now)
    const today = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
    return Array.from({ length: 14 }, (_, day) =>
      new Date(today + day * 86400000).toISOString().slice(0, 10))
  }, [now])
  const workdays = dates.filter((date) => {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay()
    return day > 0 && day < 6
  })
  const [meeting, setMeeting] = useState<(typeof meetingTypes)[number]>(meetingTypes[1])
  const [date, setDate] = useState(workdays[0] ?? dates[0])
  const [time, setTime] = useState<number | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [confirmation, setConfirmation] = useState('')

  const slots = useMemo(() => {
    const current = new Date(now)
    const today = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())).toISOString().slice(0, 10)
    const currentMinute = current.getHours() * 60 + current.getMinutes()
    return Array.from({ length: 36 }, (_, index) => 540 + index * 15).filter((start) => {
      if (start + meeting.duration > 1080 || (date === today && start <= currentMinute)) return false
      return bookings.every((booking) => booking.date !== date
        || start >= booking.start + booking.duration
        || start + meeting.duration <= booking.start)
    })
  }, [bookings, date, meeting, now])

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (time === null) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    setBookings((current) => [...current, { date, start: time, duration: meeting.duration }])
    setConfirmation(`${name}, встреча забронирована на ${dateLabel(date, { day: 'numeric', month: 'long' })} в ${timeLabel(time)}.`)
    setTime(null)
    event.currentTarget.reset()
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">К</span> календарь<span className="brand-light">звонков</span></a>
        <span className="online"><i /> Онлайн-запись открыта</span>
      </header>
      <div className="booking-layout">
        <aside className="intro">
          <div className="avatar">С</div>
          <p className="eyebrow">ЛИЧНАЯ ВСТРЕЧА</p>
          <h1>Давайте<br />поговорим.</h1>
          <p className="intro-copy">Выберите удобное время — я отправлю ссылку на звонок после подтверждения.</p>
          <div className="host"><strong>Света Заляднова</strong><span>Консультации и рабочие встречи</span></div>
          <p className="timezone">◷ &nbsp; Время указано для<br /><strong>Москвы · UTC+3</strong></p>
        </aside>
        <section className="scheduler" aria-label="Выбор времени встречи">
          <div className="heading">
            <div><p className="eyebrow">БРОНИРОВАНИЕ</p><h2>Выберите встречу</h2></div>
            <span className="step">01 — 03</span>
          </div>
          <section className="section">
            <h3>Формат встречи</h3>
            <div className="meeting-types">
              {meetingTypes.map((option) => (
                <button className={`meeting-type${meeting.duration === option.duration ? ' selected' : ''}`}
                  key={option.duration} type="button" aria-pressed={meeting.duration === option.duration}
                  onClick={() => { setMeeting(option); setTime(null); setConfirmation('') }}>
                  <strong>{option.title}</strong><span>{option.duration} мин</span>
                </button>
              ))}
            </div>
          </section>
          <section className="section date-section">
            <div className="section-heading"><h3>Дата и время</h3><span>Ближайшие 14 дней</span></div>
            <div className="date-grid">
              {dates.map((key) => {
                const day = new Date(`${key}T12:00:00Z`).getUTCDay()
                return <button className={`date-option${date === key ? ' selected' : ''}`} key={key}
                  type="button" disabled={day === 0 || day === 6} aria-pressed={date === key}
                  aria-label={dateLabel(key, { weekday: 'long', day: 'numeric', month: 'long' })}
                  onClick={() => { setDate(key); setTime(null); setConfirmation('') }}>
                  <span>{dateLabel(key, { weekday: 'short' }).replace('.', '')}</span>
                  <strong>{dateLabel(key, { day: 'numeric' })}</strong>
                </button>
              })}
            </div>
            <div className="slots-heading">
              <span>{dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}</span><span>{slots.length} свободно</span>
            </div>
            {slots.length ? <div className="slot-grid">
              {slots.map((slot) => <button className={`slot${time === slot ? ' selected' : ''}`} key={slot}
                type="button" aria-pressed={time === slot} onClick={() => { setTime(slot); setConfirmation('') }}>
                {timeLabel(slot)}
              </button>)}
            </div> : <p className="empty-slots">Нет свободного времени. Выберите другой день.</p>}
          </section>
          <form className="guest-form" onSubmit={submitBooking}>
            <h3>Ваши данные</h3>
            <div className="fields">
              <label>Имя<input name="name" autoComplete="name" placeholder="Как к вам обращаться?" required /></label>
              <label>Электронная почта<input name="email" autoComplete="email" type="email" placeholder="you@example.com" required /></label>
            </div>
            {confirmation && <p className="confirmation" role="status">{confirmation}</p>}
            <div className="submit-row"><span>Без регистрации · Бесплатно</span>
              <button className="submit" type="submit" disabled={time === null}>Забронировать <b>→</b></button>
            </div>
          </form>
          <p className="demo-note">Демо-режим: бронирования хранятся только в этой вкладке.</p>
        </section>
      </div>
      <footer>© {new Date(now).getFullYear()} Календарь звонков <span>Просто договориться о встрече</span></footer>
    </main>
  )
}

export default App
