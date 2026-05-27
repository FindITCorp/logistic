import { test, expect } from '@playwright/test'

test.describe('Registro de cliente', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registro')
  })

  test('muestra el formulario completo', async ({ page }) => {
    await expect(page.getByLabel(/nombre/i)).toBeVisible()
    await expect(page.getByLabel(/whatsapp/i)).toBeVisible()
    await expect(page.getByLabel(/correo/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible()
  })

  test('valida campo nombre requerido', async ({ page }) => {
    await page.getByRole('button', { name: /crear cuenta/i }).click()
    // HTML5 validation or custom error
    const nameInput = page.getByLabel(/nombre/i)
    await expect(nameInput).toBeFocused()
  })

  test('registro exitoso genera código FDT-XXXX y QR', async ({ page }) => {
    const timestamp = Date.now()
    await page.getByLabel(/nombre/i).fill(`Test User ${timestamp}`)
    await page.getByLabel(/whatsapp/i).fill('+507 6000-0001')
    await page.getByLabel(/correo/i).fill(`test${timestamp}@findit-test.com`)

    // Select auto assignment
    await page.getByRole('button', { name: /automático/i }).click()
    // Select whatsapp notifications
    await page.getByRole('button', { name: /whatsapp/i }).click()

    await page.getByRole('button', { name: /crear cuenta/i }).click()
    await expect(page.getByText(/registro exitoso/i)).toBeVisible({ timeout: 10000 })

    // Verify client code format FDT-XXXX
    await expect(page.getByText(/FDT-\d{4}/)).toBeVisible()

    // Verify QR code is generated
    await expect(page.locator('img[alt="QR"]')).toBeVisible()

    // Verify shipping address in China is shown
    await expect(page.getByText(/Guangzhou|Shanghai|Shenzhen/i)).toBeVisible()
    await expect(page.getByText(/China/i)).toBeVisible()
  })

  test('muestra dirección de envío copiable', async ({ page }) => {
    const timestamp = Date.now()
    await page.getByLabel(/nombre/i).fill(`Copy Test ${timestamp}`)
    await page.getByRole('button', { name: /crear cuenta/i }).click()
    await expect(page.getByText(/registro exitoso/i)).toBeVisible({ timeout: 10000 })

    const copyBtn = page.getByRole('button', { name: /copiar/i })
    await expect(copyBtn).toBeVisible()
    await copyBtn.click()
    await expect(page.getByText(/copiado/i)).toBeVisible()
  })

  test('versión en inglés del registro', async ({ page }) => {
    await page.goto('/en/registro')
    await expect(page.getByLabel(/full name|name/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account|register/i })).toBeVisible()
  })
})
