import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import {
  createBooking,
  getAvailability,
  listMeetingTypes,
  type AvailabilityDate,
  type AvailabilitySlot,
  type MeetingType,
} from './api'
import './App.css'
import HomePage from './HomePage'
import OwnerPage from './OwnerPage'

const dateLabel = (key: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('ru-RU', { ...options, timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`))
const timeLabel = (dateTime: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateTime))

const moscowDate = (instant: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

const addCalendarDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)

function BookingPage() {
  const [now] = useState(() => Date.now())
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[] | null>(null)
  const [meetingTypesError, setMeetingTypesError] = useState(false)
  const [meetingTypesRequestNumber, setMeetingTypesRequestNumber] = useState(0)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const meeting = meetingTypes?.find(({ slug }) => slug === selectedSlug)

  useEffect(() => {
    let active = true

    listMeetingTypes()
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setMeetingTypesError(true)
          return
        }
        setMeetingTypes(data.items)
        setSelectedSlug(data.items[0]?.slug ?? null)
      })
      .catch(() => {
        if (active) setMeetingTypesError(true)
      })

    return () => {
      active = false
    }
  }, [meetingTypesRequestNumber])

  const [availableDates, setAvailableDates] = useState<AvailabilityDate[] | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState(false)
  const [availabilityRequestNumber, setAvailabilityRequestNumber] = useState(0)
  const [date, setDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [bookingError, setBookingError] = useState('')
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const today = useMemo(() => moscowDate(new Date(now)), [now])
  const lastDate = useMemo(() => addCalendarDays(today, 13), [today])

  useEffect(() => {
    if (!selectedSlug) return
    let active = true

    setAvailableDates(null)
    setAvailabilityLoading(true)
    setAvailabilityError(false)
    setDate(null)
    setSelectedSlot(null)

    getAvailability({
      path: { slug: selectedSlug },
      query: { from: today, to: lastDate },
    })
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setAvailabilityError(true)
          return
        }
        setAvailableDates(data.dates)
        setDate(data.dates[0]?.date ?? null)
      })
      .catch(() => {
        if (active) setAvailabilityError(true)
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false)
      })

    return () => {
      active = false
    }
  }, [availabilityRequestNumber, lastDate, selectedSlug, today])

  const slots = useMemo(
    () => availableDates?.find((availableDate) => availableDate.date === date)?.slots ?? [],
    [availableDates, date],
  )

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSlot || !meeting) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const name = String(form.get('name')).trim()
    const email = String(form.get('email')).trim()
    setBookingError('')
    setBookingInProgress(true)
    try {
      const { data, error } = await createBooking({
        body: {
          meetingTypeSlug: meeting.slug,
          startsAt: selectedSlot.startsAt,
          guest: { name, email },
        },
      })
      if (error || !data) {
        setBookingError(error?.detail ?? 'Не удалось создать бронирование. Попробуйте ещё раз.')
        if (error?.status === 409) {
          setAvailabilityRequestNumber((number) => number + 1)
        }
        return
      }
      setConfirmation(
        `${name}, встреча «${data.meetingType.title}» забронирована на ${
          dateLabel(data.startsAt.slice(0, 10), { day: 'numeric', month: 'long' })
        } в ${timeLabel(data.startsAt)}.`,
      )
      setSelectedSlot(null)
      formElement.reset()
      setAvailabilityRequestNumber((number) => number + 1)
    } catch {
      setBookingError('Не удалось создать бронирование. Проверьте соединение и попробуйте ещё раз.')
    } finally {
      setBookingInProgress(false)
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <Link className="brand" to="/"><span className="brand-mark">К</span> календарь<span className="brand-light">звонков</span></Link>
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
            <h3>Тип встречи</h3>
            {meetingTypes === null && !meetingTypesError && (
              <p className="meeting-types-message" role="status">Загружаем типы встреч…</p>
            )}
            {meetingTypesError && (
              <div className="meeting-types-error">
                <p role="alert">Не удалось загрузить типы встреч.</p>
                <button type="button" onClick={() => {
                  setMeetingTypes(null)
                  setMeetingTypesError(false)
                  setMeetingTypesRequestNumber((number) => number + 1)
                }}>
                  Повторить запрос
                </button>
              </div>
            )}
            {meetingTypes?.length === 0 && (
              <p className="meeting-types-message" role="status">Типы встреч пока недоступны.</p>
            )}
            {meetingTypes && meetingTypes.length > 0 && (
              <div className="meeting-types">
                {meetingTypes.map((option) => (
                  <button className={`meeting-type${selectedSlug === option.slug ? ' selected' : ''}`}
                    key={option.slug} type="button" aria-pressed={selectedSlug === option.slug}
                    onClick={() => {
                      setSelectedSlug(option.slug)
                      setSelectedSlot(null)
                      setConfirmation('')
                      setBookingError('')
                    }}>
                    <strong>{option.title}</strong>
                    <span>{option.durationMinutes} мин</span>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="section date-section">
            <div className="section-heading"><h3>Дата и время</h3><span>Ближайшие 14 дней</span></div>
            <div className="date-grid">
              {availableDates?.map(({ date: key }) => (
                <button className={`date-option${date === key ? ' selected' : ''}`} key={key}
                  type="button" aria-pressed={date === key}
                  aria-label={dateLabel(key, { weekday: 'long', day: 'numeric', month: 'long' })}
                  onClick={() => {
                    setDate(key)
                    setSelectedSlot(null)
                    setConfirmation('')
                    setBookingError('')
                  }}>
                  <span>{dateLabel(key, { weekday: 'short' }).replace('.', '')}</span>
                  <strong>{dateLabel(key, { day: 'numeric' })}</strong>
                </button>
              ))}
            </div>
            <div className="slots-heading">
              <span>{date
                ? dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })
                : 'Доступные даты'}</span>
              <span>{slots.length} свободно</span>
            </div>
            {availabilityLoading && <p className="empty-slots" role="status">Загружаем свободное время…</p>}
            {availabilityError && (
              <div className="meeting-types-error">
                <p role="alert">Не удалось загрузить свободное время.</p>
                <button type="button" onClick={() => {
                  setAvailabilityRequestNumber((number) => number + 1)
                }}>
                  Повторить запрос
                </button>
              </div>
            )}
            {!availabilityLoading && !availabilityError && slots.length > 0 && <div className="slot-grid">
              {slots.map((slot) => <button
                className={`slot${selectedSlot?.startsAt === slot.startsAt ? ' selected' : ''}`}
                key={slot.startsAt}
                type="button"
                aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                onClick={() => {
                  setSelectedSlot(slot)
                  setConfirmation('')
                  setBookingError('')
                }}>
                {timeLabel(slot.startsAt)}
              </button>)}
            </div>}
            {!availabilityLoading && !availabilityError && slots.length === 0 && (
              <p className="empty-slots">
                {availableDates?.length === 0
                  ? 'Нет свободного времени в ближайшие 14 дней.'
                  : 'Нет свободного времени. Выберите другой день.'}
              </p>
            )}
          </section>
          <form className="guest-form" onSubmit={submitBooking}>
            <h3>Ваши данные</h3>
            <div className="fields">
              <label>Имя<input name="name" autoComplete="name" placeholder="Как к вам обращаться?" required /></label>
              <label>Электронная почта<input name="email" autoComplete="email" type="email" placeholder="you@example.com" required /></label>
            </div>
            {confirmation && <p className="confirmation" role="status">{confirmation}</p>}
            {bookingError && <p className="booking-error" role="alert">{bookingError}</p>}
            <div className="submit-row"><span>Без регистрации · Бесплатно</span>
              <button className="submit" type="submit"
                disabled={!selectedSlot || !meeting || bookingInProgress}>
                {bookingInProgress ? 'Бронируем…' : 'Забронировать'} <b>→</b>
              </button>
            </div>
          </form>
          <p className="demo-note">Время указано для часового пояса Europe/Moscow.</p>
        </section>
      </div>
      <footer>© {new Date(now).getFullYear()} Календарь звонков <span>Просто договориться о встрече</span></footer>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="page">
      <header className="topbar">
        <Link className="brand" to="/"><span className="brand-mark">К</span> календарь<span className="brand-light">звонков</span></Link>
      </header>
      <section className="not-found">
        <p className="eyebrow">404</p>
        <h1>Страница не найдена</h1>
        <Link to="/">Вернуться на главную</Link>
      </section>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/owner" element={<OwnerPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
