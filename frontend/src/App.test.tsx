import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBooking, getAvailability, listMeetingTypes, type MeetingType } from './api'
import App from './App'

vi.mock('./api', () => ({
  createBooking: vi.fn(),
  getAvailability: vi.fn(),
  listMeetingTypes: vi.fn(),
}))

const demoTypes: MeetingType[] = [
  {
    slug: 'introduction',
    title: 'Знакомство',
    description: 'Короткий разговор, чтобы познакомиться и обсудить запрос.',
    durationMinutes: 15,
  },
  {
    slug: 'working-session',
    title: 'Рабочая встреча',
    description: 'Обсудим текущие задачи и наметим следующие шаги.',
    durationMinutes: 30,
  },
  {
    slug: 'consultation',
    title: 'Консультация',
    description: 'Разберём ваш вопрос и возможные решения.',
    durationMinutes: 60,
  },
]

const meetingTypesRequest = vi.mocked(listMeetingTypes)
const availabilityRequest = vi.mocked(getAvailability)
const createBookingRequest = vi.mocked(createBooking)

beforeEach(() => {
  meetingTypesRequest.mockResolvedValue({ data: { items: demoTypes }, error: undefined })
  availabilityRequest.mockResolvedValue({
    data: {
      dates: [{
        date: '2030-01-01',
        slots: [{ startsAt: '2030-01-01T09:15:00+03:00', endsAt: '2030-01-01T09:30:00+03:00' }],
      }],
    },
    error: undefined,
  })
  createBookingRequest.mockResolvedValue({
    data: {
      id: 'booking-id',
      meetingType: { slug: 'introduction', title: 'Знакомство', durationMinutes: 15 },
      startsAt: '2030-01-01T09:15:00+03:00',
      endsAt: '2030-01-01T09:30:00+03:00',
    },
    error: undefined,
  })
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
  vi.resetAllMocks()
})

describe('booking application routes', () => {
  it('explains the service and its booking steps on the homepage', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /Выберите время.*для встречи со Светой/ })).toBeTruthy()
    expect(screen.getByText('Выберите тип встречи')).toBeTruthy()
    expect(screen.getByText('Выберите свободные дату и время')).toBeTruthy()
    expect(screen.getByText('Оставьте имя и email')).toBeTruthy()
    expect(screen.getByText(/14 календарных дней/)).toBeTruthy()
  })

  it('opens the booking page from the homepage call to action', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('link', { name: 'Выбрать время' }))

    expect(screen.getByRole('heading', { name: 'Выберите встречу' })).toBeTruthy()
  })

  it('renders the booking page and meeting types when its URL is opened directly', async () => {
    window.history.replaceState({}, '', '/booking')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Выберите встречу' })).toBeTruthy()
    expect(await screen.findByRole('button', { name: /Знакомство/ })).toBeTruthy()
    expect(screen.getByText('Обсудим текущие задачи и наметим следующие шаги.')).toBeTruthy()
  })

  it('shows a not-found page for an unknown URL', () => {
    window.history.replaceState({}, '', '/unknown')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Вернуться на главную' })).toBeTruthy()
  })

  it('shows a loading state while meeting types are being fetched', async () => {
    meetingTypesRequest.mockResolvedValue({ data: { items: demoTypes }, error: undefined })
    window.history.replaceState({}, '', '/booking')

    render(<App />)

    expect(screen.getByRole('status').textContent).toContain('Загружаем типы встреч')
    expect(await screen.findByRole('button', { name: /Знакомство/ })).toBeTruthy()
  })

  it('shows an empty state without hard-coded meeting types', async () => {
    meetingTypesRequest.mockResolvedValue({ data: { items: [] }, error: undefined })
    window.history.replaceState({}, '', '/booking')

    render(<App />)

    expect(await screen.findByText('Типы встреч пока недоступны.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Знакомство|Рабочая встреча|Консультация/ })).toBeNull()
  })

  it('shows an error and retries the meeting-types request', async () => {
    meetingTypesRequest
      .mockResolvedValueOnce({ data: undefined, error: new Error('offline') })
      .mockResolvedValueOnce({ data: { items: demoTypes }, error: undefined })
    window.history.replaceState({}, '', '/booking')

    render(<App />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить запрос' }))
    expect(await screen.findByRole('button', { name: /Знакомство/ })).toBeTruthy()
    expect(meetingTypesRequest).toHaveBeenCalledTimes(2)
  })

  it('shows available dates and slots returned by the calendar API', async () => {
    window.history.replaceState({}, '', '/booking')

    render(<App />)

    expect(await screen.findByRole('button', { name: /09:15/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /вторник, 1 января/ })).toBeTruthy()
  })

  it('submits the selected slot and shows the server confirmation', async () => {
    window.history.replaceState({}, '', '/booking')

    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /09:15/ }))
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Анна' } })
    fireEvent.change(screen.getByLabelText('Электронная почта'), {
      target: { value: 'anna@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Забронировать/ }))

    expect(await screen.findByText(/встреча «Знакомство» забронирована/i)).toBeTruthy()
    expect(createBookingRequest).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.objectContaining({
        meetingTypeSlug: 'introduction',
        startsAt: '2030-01-01T09:15:00+03:00',
        guest: { name: 'Анна', email: 'anna@example.com' },
      }),
    }))
  })

  it('asks the guest to choose another time when the slot was taken', async () => {
    createBookingRequest.mockResolvedValue({
      data: undefined,
      error: {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        detail: 'Это время уже занято. Выберите другое',
        code: 'booking_conflict',
      },
    })
    window.history.replaceState({}, '', '/booking')

    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /09:15/ }))
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Анна' } })
    fireEvent.change(screen.getByLabelText('Электронная почта'), {
      target: { value: 'anna@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Забронировать/ }))

    expect(await screen.findByRole('alert')).toHaveProperty('textContent',
      'Это время уже занято. Выберите другое')
  })
})
