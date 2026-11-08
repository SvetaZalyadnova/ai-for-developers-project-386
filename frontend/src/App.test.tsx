import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
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

  it('renders the booking page when its URL is opened directly', () => {
    window.history.replaceState({}, '', '/booking')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Выберите встречу' })).toBeTruthy()
  })

  it('shows a not-found page for an unknown URL', () => {
    window.history.replaceState({}, '', '/unknown')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Вернуться на главную' })).toBeTruthy()
  })
})
