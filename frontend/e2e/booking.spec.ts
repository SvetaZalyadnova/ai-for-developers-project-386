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
