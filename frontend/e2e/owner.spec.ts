import { expect, test } from '@playwright/test'

test('owner can sign in, view meeting types, and create a meeting type', async ({ page }) => {
  await page.goto('/owner')
  await page.getByLabel('Токен владельца').fill('playwright-owner-token')
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page.getByRole('heading', { name: 'Предстоящие встречи' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Знакомство' })).toBeVisible()

  await page.getByLabel('Идентификатор (slug)').fill('e2e-owner-type')
  await page.getByLabel('Название').fill('Встреча для E2E')
  await page.getByLabel('Описание').fill('Проверка интерфейса владельца')
  await page.getByLabel('Длительность').selectOption('15')
  await page.getByRole('button', { name: 'Создать тип' }).click()

  await expect(page.getByRole('status')).toHaveText('Тип встречи создан.')
  await expect(page.getByRole('heading', { name: 'Встреча для E2E' })).toBeVisible()
})
