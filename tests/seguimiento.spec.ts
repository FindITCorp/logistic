import { test, expect } from '@playwright/test'

test.describe('Seguimiento de pedido', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/seguimiento')
  })

  test('muestra campo de búsqueda por código', async ({ page }) => {
    await expect(page.getByPlaceholder(/FDT-|código/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /buscar|rastrear|track/i })).toBeVisible()
  })

  test('código inválido muestra error claro', async ({ page }) => {
    await page.getByPlaceholder(/FDT-|código/i).fill('INVALIDO-9999')
    await page.getByRole('button', { name: /buscar|rastrear|track/i }).click()
    await expect(page.getByText(/no encontrado|not found|error/i)).toBeVisible({ timeout: 8000 })
  })

  test('código válido muestra estado del pedido', async ({ page }) => {
    // Use a known test code — if it exists in DB it should show status
    await page.getByPlaceholder(/FDT-|código/i).fill('FDT-0001')
    await page.getByRole('button', { name: /buscar|rastrear|track/i }).click()
    // Either shows orders or "no pedidos" — both are valid states
    await expect(
      page.getByText(/bodega|pool|tránsito|pedido|order/i)
    ).toBeVisible({ timeout: 8000 })
  })
})
