import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listMeetingTypes, type MeetingType } from './api'
import App from './App'

vi.mock('./api', () => ({ listMeetingTypes: vi.fn() }))

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

beforeEach(() => {
  meetingTypesRequest.mockResolvedValue({ data: { items: demoTypes }, error: undefined })
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
})
