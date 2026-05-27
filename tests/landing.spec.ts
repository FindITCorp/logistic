import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('carga en español por defecto', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/FINDIT|Logistic/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/China.*Panamá|Panamá.*China/i)).toBeVisible()
  })

  test('cambia a inglés con el language switcher', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /EN/i }).click()
    await expect(page).toHaveURL(/\/en/)
    await expect(page.getByText(/China.*Panama|Panama.*China/i)).toBeVisible()
  })

  test('muestra precios competitivos vs $420 del competidor', async ({ page }) => {
    await page.goto('/')
    // Must show competitor price and FINDIT savings
    await expect(page.getByText(/\$420|\$500|\$800/)).toBeVisible()
    await expect(page.getByText(/\$82|\$100|\$180|\$250/)).toBeVisible()
  })

  test('navegación al pool desde landing', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /pools|ver pools|unirse/i }).first().click()
    await expect(page).toHaveURL(/\/pools/)
  })

  test('calculadora de ahorro responde a slider', async ({ page }) => {
    await page.goto('/')
    const slider = page.locator('input[type="range"]').first()
    if (await slider.isVisible()) {
      const before = await page.locator('[data-testid="price-result"], .price-result, .text-emerald').first().textContent()
      await slider.fill('15')
      await page.waitForTimeout(300)
      const after = await page.locator('[data-testid="price-result"], .price-result, .text-emerald').first().textContent()
      expect(before).not.toEqual(after)
    }
  })

  test('responsive en mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // No horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)
  })
})
