import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  archiveMeetingType,
  createMeetingType,
  listOwnerBookings,
  listOwnerMeetingTypes,
  updateMeetingType,
  type MeetingType,
  type OwnerBooking,
} from './api'
import App from './App'

vi.mock('./api', () => ({
  archiveMeetingType: vi.fn(),
  createBooking: vi.fn(),
  createMeetingType: vi.fn(),
  getAvailability: vi.fn(),
  listMeetingTypes: vi.fn(),
  listOwnerBookings: vi.fn(),
  listOwnerMeetingTypes: vi.fn(),
  updateMeetingType: vi.fn(),
}))

const meetingTypes: MeetingType[] = [{
  slug: 'consultation',
  title: 'Консультация',
  description: 'Обсудить задачу',
  durationMinutes: 30,
}]

const bookings: OwnerBooking[] = [{
  guest: { name: 'Анна Иванова', email: 'anna@example.com' },
  meetingType: { slug: 'consultation', title: 'Консультация', durationMinutes: 30 },
  startsAt: '2030-01-02T10:00:00+03:00',
  endsAt: '2030-01-02T10:30:00+03:00',
}]

const meetingTypesRequest = vi.mocked(listOwnerMeetingTypes)
const bookingsRequest = vi.mocked(listOwnerBookings)
const createMeetingTypeRequest = vi.mocked(createMeetingType)
const updateMeetingTypeRequest = vi.mocked(updateMeetingType)
const archiveMeetingTypeRequest = vi.mocked(archiveMeetingType)

function openOwnerPage() {
  window.history.replaceState({}, '', '/owner')
  render(<App />)
}

async function login() {
  fireEvent.change(screen.getByLabelText('Токен владельца'), {
    target: { value: 'local-owner-token' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Войти' }))
  await screen.findByRole('heading', { name: 'Предстоящие встречи' })
}

beforeEach(() => {
  meetingTypesRequest.mockResolvedValue({ data: { items: meetingTypes }, error: undefined })
  bookingsRequest.mockResolvedValue({ data: { items: bookings }, error: undefined })
  createMeetingTypeRequest.mockResolvedValue({ data: meetingTypes[0], error: undefined })
  updateMeetingTypeRequest.mockResolvedValue({ data: meetingTypes[0], error: undefined })
  archiveMeetingTypeRequest.mockResolvedValue({ data: undefined, error: undefined })
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('owner dashboard', () => {
  it('keeps the owner area behind token entry and renders bookings and meeting types after login', async () => {
    openOwnerPage()

    expect(screen.getByRole('heading', { name: 'Вход владельца' })).toBeTruthy()
    expect(screen.queryByText('anna@example.com')).toBeNull()
    await login()

    expect(await screen.findByText(/Анна Иванова/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'anna@example.com' }).getAttribute('href')).toBe('mailto:anna@example.com')
    expect(screen.getByRole('heading', { name: 'Консультация' })).toBeTruthy()
    expect(meetingTypesRequest).toHaveBeenCalledWith({ auth: 'local-owner-token' })
    expect(bookingsRequest).toHaveBeenCalledWith({ auth: 'local-owner-token' })
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('does not open the dashboard for an unauthorized token', async () => {
    meetingTypesRequest.mockResolvedValueOnce({
      data: undefined,
      error: { type: 'about:blank', title: 'Unauthorized', status: 401, detail: 'Unauthorized', code: 'unauthorized' },
      response: new Response(null, { status: 401 }),
    })
    openOwnerPage()

    fireEvent.change(screen.getByLabelText('Токен владельца'), {
      target: { value: 'wrong-token' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Токен не принят')
    expect(screen.queryByRole('heading', { name: 'Предстоящие встречи' })).toBeNull()
  })

  it('clears the in-memory token and owner data on logout', async () => {
    openOwnerPage()
    await login()

    fireEvent.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(await screen.findByRole('heading', { name: 'Вход владельца' })).toBeTruthy()
    expect(screen.queryByText(/Анна Иванова/)).toBeNull()
  })

  it('creates a meeting type using the authenticated generated SDK', async () => {
    openOwnerPage()
    await login()

    fireEvent.change(screen.getByLabelText('Идентификатор (slug)'), { target: { value: 'project-review' } })
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Разбор проекта' } })
    fireEvent.change(screen.getByLabelText('Описание'), { target: { value: 'Обсудить результат' } })
    fireEvent.change(screen.getByLabelText('Длительность'), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: 'Создать тип' }))

    expect(createMeetingTypeRequest).toHaveBeenCalledWith({
      auth: 'local-owner-token',
      body: {
        slug: 'project-review',
        title: 'Разбор проекта',
        description: 'Обсудить результат',
        durationMinutes: 60,
      },
    })
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Тип встречи создан'))
  })

  it('supports editing and archiving an existing meeting type', async () => {
    openOwnerPage()
    await login()

    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Новая консультация' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }))

    await waitFor(() => expect(updateMeetingTypeRequest).toHaveBeenCalledWith({
      auth: 'local-owner-token',
      path: { slug: 'consultation' },
      body: {
        title: 'Новая консультация',
        description: 'Обсудить задачу',
        durationMinutes: 30,
      },
    }))

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Архивировать' }))
    await waitFor(() => expect(archiveMeetingTypeRequest).toHaveBeenCalledWith({
      auth: 'local-owner-token',
      path: { slug: 'consultation' },
    }))
  })
})
