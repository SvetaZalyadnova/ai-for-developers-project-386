import { expect, test } from '@playwright/test'

test('booking screen loads the active meeting types from the backend', async ({ page }) => {
  const responsePromise = page.waitForResponse('**/api/v1/meeting-types')

  await page.goto('/booking')

  const response = await responsePromise
  expect(response.ok()).toBe(true)
  await expect(page.getByRole('button', { name: /Знакомство/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Рабочая встреча/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Консультация/ })).toBeVisible()
  await expect(page.getByText('Короткий разговор, чтобы познакомиться и обсудить запрос.')).toBeVisible()
})

test('a guest booking appears in the owner calendar', async ({ page }) => {
  const guestName = 'Гость Playwright'
  const guestEmail = `playwright-${Date.now()}@example.com`

  await page.goto('/booking')
  await expect(page.getByRole('button', { name: /Знакомство/ })).toBeVisible()

  const firstSlot = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first()
  await expect(firstSlot).toBeVisible()
  await firstSlot.click()
  await page.getByLabel('Имя').fill(guestName)
  await page.getByLabel('Электронная почта').fill(guestEmail)

  const bookingResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/v1/bookings') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: /Забронировать/ }).click()

  const bookingResponse = await bookingResponsePromise
  expect(bookingResponse.status()).toBe(201)
  const confirmation = page.getByText(`${guestName}, встреча`, { exact: false })
  await expect(confirmation).toContainText('Знакомство')

  await page.goto('/owner')
  await page.getByLabel('Токен владельца').fill('playwright-owner-token')
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page.getByRole('heading', { name: 'Календарь владельца' })).toBeVisible()
  const upcomingBookings = page.getByRole('region', { name: 'Предстоящие встречи' })
  await expect(upcomingBookings.getByRole('link', { name: guestEmail })).toBeVisible()
  await expect(upcomingBookings.getByText(guestName, { exact: false })).toBeVisible()
  await expect(upcomingBookings.getByText('Знакомство', { exact: true })).toBeVisible()
})

test('refreshes overlapping slots after a booking conflict and keeps the adjacent slot', async ({ page }) => {
  const secondTab = await page.context().newPage()
  const firstGuestName = 'Первая запись'
  const secondGuestName = 'Конфликтующая запись'

  await Promise.all([page.goto('/booking'), secondTab.goto('/booking')])
  await Promise.all([
    page.getByRole('button', { name: /Рабочая встреча/ }).waitFor(),
    secondTab.getByRole('button', { name: /Рабочая встреча/ }).waitFor(),
  ])
  await Promise.all([
    page.getByRole('button', { name: /Рабочая встреча/ }).click(),
    secondTab.getByRole('button', { name: /Рабочая встреча/ }).click(),
  ])

  const firstSlot = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first()
  const slotTime = (await firstSlot.innerText()).trim()
  const [hours, minutes] = slotTime.split(':').map(Number)
  const overlappingTime = `${String(Math.floor((hours * 60 + minutes + 15) / 60)).padStart(2, '0')}:${String((minutes + 15) % 60).padStart(2, '0')}`
  const adjacentTime = `${String(Math.floor((hours * 60 + minutes + 30) / 60)).padStart(2, '0')}:${String((minutes + 30) % 60).padStart(2, '0')}`
  const secondTabSlot = secondTab.getByRole('button', { name: slotTime, exact: true })

  await expect(secondTabSlot).toBeVisible()
  await expect(page.getByRole('button', { name: overlappingTime, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: adjacentTime, exact: true })).toBeVisible()
  await firstSlot.click()
  await secondTabSlot.click()

  await page.getByLabel('Имя').fill(firstGuestName)
  await page.getByLabel('Электронная почта').fill(`first-${Date.now()}@example.com`)
  await secondTab.getByLabel('Имя').fill(secondGuestName)
  await secondTab.getByLabel('Электронная почта').fill(`second-${Date.now()}@example.com`)

  const successfulBooking = page.waitForResponse(
    (response) => response.url().endsWith('/api/v1/bookings') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: /Забронировать/ }).click()
  expect((await successfulBooking).status()).toBe(201)

  const conflictingBooking = secondTab.waitForResponse(
    (response) => response.url().endsWith('/api/v1/bookings') && response.request().method() === 'POST',
  )
  await secondTab.getByRole('button', { name: /Забронировать/ }).click()
  expect((await conflictingBooking).status()).toBe(409)
  await expect(secondTab.getByRole('alert')).toContainText('занято')

  await expect(secondTab.getByRole('button', { name: slotTime, exact: true })).toHaveCount(0)
  await expect(secondTab.getByRole('button', { name: overlappingTime, exact: true })).toHaveCount(0)
  await expect(secondTab.getByRole('button', { name: adjacentTime, exact: true })).toBeVisible()
})
