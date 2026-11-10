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
