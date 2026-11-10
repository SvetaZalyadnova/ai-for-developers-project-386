import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  archiveMeetingType,
  createMeetingType,
  listOwnerBookings,
  listOwnerMeetingTypes,
  updateMeetingType,
  type MeetingType,
  type OwnerBooking,
} from './api'
import './OwnerPage.css'

type OwnerData = {
  meetingTypes: MeetingType[]
  bookings: OwnerBooking[]
}

type OwnerDataResult =
  | { data: OwnerData; error?: never; unauthorized: false }
  | { data?: never; error: string; unauthorized: boolean }

type MeetingTypeForm = {
  slug: string
  title: string
  description: string
  durationMinutes: string
}

const emptyForm: MeetingTypeForm = {
  slug: '',
  title: '',
  description: '',
  durationMinutes: '30',
}

const dateTimeLabel = (dateTime: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateTime))

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'detail' in error && typeof error.detail === 'string') {
    return error.detail
  }
  return fallback
}

async function loadOwnerData(token: string): Promise<OwnerDataResult> {
  const [meetingTypesResult, bookingsResult] = await Promise.all([
    listOwnerMeetingTypes({ auth: token }),
    listOwnerBookings({ auth: token }),
  ])
  const unauthorized =
    meetingTypesResult.response?.status === 401 || bookingsResult.response?.status === 401

  if (unauthorized) {
    return {
      error: 'Токен не принят. Проверьте его и попробуйте войти снова.',
      unauthorized: true,
    }
  }
  if (meetingTypesResult.error || !meetingTypesResult.data) {
    return {
      error: getErrorMessage(meetingTypesResult.error, 'Не удалось загрузить типы встреч.'),
      unauthorized: false,
    }
  }
  if (bookingsResult.error || !bookingsResult.data) {
    return {
      error: getErrorMessage(bookingsResult.error, 'Не удалось загрузить список встреч.'),
      unauthorized: false,
    }
  }

  return {
    data: {
      meetingTypes: meetingTypesResult.data.items,
      bookings: bookingsResult.data.items,
    },
    unauthorized: false,
  }
}

function OwnerPage() {
  const [year] = useState(() => new Date().getFullYear())
  const [tokenInput, setTokenInput] = useState('')
  const [activeToken, setActiveToken] = useState('')
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [bookings, setBookings] = useState<OwnerBooking[]>([])
  const [form, setForm] = useState<MeetingTypeForm>(emptyForm)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  function applyOwnerData(data: OwnerData) {
    setMeetingTypes(data.meetingTypes)
    setBookings(data.bookings)
  }

  function clearSession() {
    setActiveToken('')
    setMeetingTypes([])
    setBookings([])
    setEditingSlug(null)
    setForm(emptyForm)
    setErrorMessage('')
    setNotice('')
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = tokenInput.trim()
    if (!token) return

    setLoading(true)
    setErrorMessage('')
    setNotice('')
    try {
      const result = await loadOwnerData(token)
      if (!result.data) {
        setErrorMessage(result.error ?? 'Не удалось загрузить данные владельца.')
        return
      }
      setActiveToken(token)
      setTokenInput('')
      applyOwnerData(result.data)
    } catch {
      setErrorMessage('Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshOwnerData(clearNotice = true) {
    if (!activeToken) return
    setLoading(true)
    setErrorMessage('')
    if (clearNotice) setNotice('')
    try {
      const result = await loadOwnerData(activeToken)
      if (!result.data) {
        if (result.unauthorized) clearSession()
        setErrorMessage(result.error ?? 'Не удалось загрузить данные владельца.')
        return
      }
      applyOwnerData(result.data)
    } catch {
      setErrorMessage('Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  function startEditing(meetingType: MeetingType) {
    setEditingSlug(meetingType.slug)
    setForm({
      slug: meetingType.slug,
      title: meetingType.title,
      description: meetingType.description,
      durationMinutes: String(meetingType.durationMinutes),
    })
    setErrorMessage('')
    setNotice('')
  }

  function cancelEditing() {
    setEditingSlug(null)
    setForm(emptyForm)
    setErrorMessage('')
  }

  async function submitMeetingType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeToken) return
    setSaving(true)
    setErrorMessage('')
    setNotice('')

    const durationMinutes = Number(form.durationMinutes)
    try {
      const result = editingSlug
        ? await updateMeetingType({
            auth: activeToken,
            path: { slug: editingSlug },
            body: {
              title: form.title.trim(),
              description: form.description.trim(),
              durationMinutes,
            },
          })
        : await createMeetingType({
            auth: activeToken,
            body: {
              slug: form.slug.trim(),
              title: form.title.trim(),
              description: form.description.trim(),
              durationMinutes,
            },
          })
      if (result.error || !result.data) {
        if (result.response?.status === 401) clearSession()
        setErrorMessage(getErrorMessage(result.error, 'Не удалось сохранить тип встречи.'))
        return
      }

      const successMessage = editingSlug ? 'Изменения сохранены.' : 'Тип встречи создан.'
      setEditingSlug(null)
      setForm(emptyForm)
      await refreshOwnerData(false)
      setNotice(successMessage)
    } catch {
      setErrorMessage('Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  async function archiveType(meetingType: MeetingType) {
    if (!activeToken || !window.confirm(`Архивировать тип «${meetingType.title}»?`)) return
    setSaving(true)
    setErrorMessage('')
    setNotice('')
    try {
      const result = await archiveMeetingType({
        auth: activeToken,
        path: { slug: meetingType.slug },
      })
      if (result.error) {
        if (result.response?.status === 401) clearSession()
        setErrorMessage(getErrorMessage(result.error, 'Не удалось архивировать тип встречи.'))
        return
      }

      if (editingSlug === meetingType.slug) cancelEditing()
      await refreshOwnerData(false)
      setNotice('Тип встречи архивирован.')
    } catch {
      setErrorMessage('Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="owner-page">
      <header className="owner-header">
        <Link className="owner-brand" to="/">
          <span className="owner-brand-mark">К</span>
          Календарь звонков
        </Link>
        <nav aria-label="Основная навигация">
          <Link to="/booking">Страница бронирования</Link>
          {activeToken && (
            <button type="button" className="owner-logout" onClick={clearSession}>
              Выйти
            </button>
          )}
        </nav>
      </header>

      {!activeToken ? (
        <section className="owner-login">
          <p className="owner-eyebrow">ЗАКРЫТАЯ ОБЛАСТЬ</p>
          <h1>Вход владельца</h1>
          <p className="owner-muted">
            Введите Bearer-токен, заданный владельцем сервера в переменной <code>OWNER_API_TOKEN</code>.
            Приложение не выдаёт токен и не сохраняет его после выхода или перезагрузки вкладки.
          </p>
          <form className="owner-login-form" onSubmit={submitLogin}>
            <label htmlFor="owner-token">Токен владельца</label>
            <input
              id="owner-token"
              type="password"
              autoComplete="off"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              required
            />
            {errorMessage && <p className="owner-error" role="alert">{errorMessage}</p>}
            <button className="owner-primary-button" type="submit" disabled={loading}>
              {loading ? 'Проверяем…' : 'Войти'}
            </button>
          </form>
        </section>
      ) : (
        <div className="owner-content">
          <div className="owner-title-row">
            <div>
              <p className="owner-eyebrow">УПРАВЛЕНИЕ КАЛЕНДАРЁМ</p>
              <h1>Календарь владельца</h1>
            </div>
            <button
              className="owner-secondary-button"
              type="button"
              onClick={() => void refreshOwnerData()}
              disabled={loading || saving}
            >
              {loading ? 'Обновляем…' : 'Обновить'}
            </button>
          </div>

          {errorMessage && <p className="owner-error owner-feedback" role="alert">{errorMessage}</p>}
          {notice && <p className="owner-notice owner-feedback" role="status">{notice}</p>}

          <section className="owner-panel" aria-labelledby="owner-bookings-title">
            <div className="owner-panel-heading">
              <div>
                <h2 id="owner-bookings-title">Предстоящие встречи</h2>
                <p>Время указано для Europe/Moscow</p>
              </div>
              <span className="owner-count">{bookings.length}</span>
            </div>
            {loading && bookings.length === 0 ? (
              <p className="owner-empty" role="status">Загружаем встречи…</p>
            ) : bookings.length === 0 ? (
              <p className="owner-empty">Предстоящих встреч пока нет.</p>
            ) : (
              <div className="owner-bookings">
                {bookings.map((booking) => (
                  <article className="owner-booking" key={`${booking.startsAt}-${booking.guest.email}`}>
                    <div className="owner-booking-time">
                      <strong>{dateTimeLabel(booking.startsAt)}</strong>
                      <span>до {new Intl.DateTimeFormat('ru-RU', {
                        timeZone: 'Europe/Moscow',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(booking.endsAt))}</span>
                    </div>
                    <div className="owner-booking-details">
                      <strong>{booking.meetingType.title}</strong>
                      <span>{booking.meetingType.durationMinutes} минут · {booking.guest.name}</span>
                      <a href={`mailto:${booking.guest.email}`}>{booking.guest.email}</a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="owner-panel" aria-labelledby="owner-types-title">
            <div className="owner-panel-heading">
              <div>
                <h2 id="owner-types-title">Типы встреч</h2>
                <p>Активные типы, доступные гостям для бронирования</p>
              </div>
              <span className="owner-count">{meetingTypes.length}</span>
            </div>
            {meetingTypes.length === 0 ? (
              <p className="owner-empty">Активных типов встреч пока нет.</p>
            ) : (
              <div className="owner-types">
                {meetingTypes.map((meetingType) => (
                  <article className="owner-type" key={meetingType.slug}>
                    <div>
                      <h3>{meetingType.title}</h3>
                      <p>{meetingType.description}</p>
                      <span>{meetingType.durationMinutes} минут · <code>{meetingType.slug}</code></span>
                    </div>
                    <div className="owner-type-actions">
                      <button
                        type="button"
                        className="owner-secondary-button"
                        disabled={saving}
                        onClick={() => startEditing(meetingType)}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="owner-danger-button"
                        disabled={saving}
                        onClick={() => void archiveType(meetingType)}
                      >
                        Архивировать
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="owner-panel owner-form-panel" aria-labelledby="owner-form-title">
            <h2 id="owner-form-title">{editingSlug ? 'Изменить тип встречи' : 'Добавить тип встречи'}</h2>
            <form className="owner-type-form" onSubmit={submitMeetingType}>
              <label>
                Идентификатор (slug)
                <input
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                  placeholder="Например, project-review"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                  disabled={Boolean(editingSlug) || saving}
                />
              </label>
              <label>
                Название
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                  disabled={saving}
                />
              </label>
              <label className="owner-description-field">
                Описание
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  required
                  rows={3}
                  disabled={saving}
                />
              </label>
              <label>
                Длительность
                <select
                  value={form.durationMinutes}
                  onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
                  disabled={saving}
                >
                  <option value="15">15 минут</option>
                  <option value="30">30 минут</option>
                  <option value="60">60 минут</option>
                </select>
              </label>
              <div className="owner-form-actions">
                {editingSlug && (
                  <button
                    className="owner-secondary-button"
                    type="button"
                    disabled={saving}
                    onClick={cancelEditing}
                  >
                    Отмена
                  </button>
                )}
                <button className="owner-primary-button" type="submit" disabled={saving}>
                  {saving ? 'Сохраняем…' : editingSlug ? 'Сохранить изменения' : 'Создать тип'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <footer className="owner-footer">© {year} Календарь звонков</footer>
    </main>
  )
}

export default OwnerPage
