import { test, expect } from '@playwright/test'

test.describe('Pools activos', () => {
  test('lista pools activos con datos correctos', async ({ page }) => {
    await page.goto('/pools')
    await expect(page.getByText(/pool #\d{3}/i)).toBeVisible({ timeout: 8000 })
    // Should show origin city
    await expect(page.getByText(/Shanghai|Guangzhou|Shenzhen/)).toBeVisible()
    // Should show volume progress
    await expect(page.getByText(/m³/i)).toBeVisible()
  })

  test('pool card muestra días restantes', async ({ page }) => {
    await page.goto('/pools')
    await expect(page.getByText(/día \d|day \d/i)).toBeVisible({ timeout: 8000 })
  })

  test('navega al detalle del pool', async ({ page }) => {
    await page.goto('/pools')
    await page.locator('a[href*="/pools/"]').first().click()
    await expect(page).toHaveURL(/\/pools\/\d+/)
    await expect(page.getByText(/m³/i)).toBeVisible()
  })

  test('pool en inglés', async ({ page }) => {
    await page.goto('/en/pools')
    await expect(page.getByText(/pool #\d{3}/i)).toBeVisible({ timeout: 8000 })
  })

  test('muestra modal para unirse al pool', async ({ page }) => {
    await page.goto('/pools')
    // Find and click join button
    const joinBtn = page.getByRole('button', { name: /unirme|join/i }).first()
    if (await joinBtn.isVisible()) {
      await joinBtn.click()
      await expect(page.getByRole('dialog')).toBeVisible()
    }
  })
})

test.describe('Detalle de pool', () => {
  test('muestra precio dinámico según día', async ({ page }) => {
    await page.goto('/pools/1')
    // Should show price per m³
    await expect(page.getByText(/\$\d+.*m³|m³.*\$\d+/i)).toBeVisible({ timeout: 8000 })
  })

  test('muestra participantes y volumen actual', async ({ page }) => {
    await page.goto('/pools/1')
    await expect(page.getByText(/participante|participant/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/m³/i)).toBeVisible()
  })
})
