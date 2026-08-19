import { expect, test, type Page } from '@playwright/test';

const resetLocalApp = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.location.hash = 'canvas';
  });
  await page.reload();
};

  test.describe('Root Puzzle smoke', () => {
    test.beforeEach(async ({ page }) => {
      await resetLocalApp(page);
  });

  test('carga el canvas y muestra el árbol familiar', async ({ page }) => {
    await expect(page.locator('main.appShell')).toBeVisible();
    await expect(page.getByText('Mis raíces', { exact: true })).toBeVisible();
    await expect(page.locator('.treeCanvas')).toBeVisible();
  });

  test('navega a Personas desde la navegación principal', async ({ page }) => {
    await page.getByRole('button', { name: /piezas/i }).first().click();
    await expect(page).toHaveURL(/#people$/);
    await expect(page.getByRole('heading', { name: /piezas/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /buscar/i })).toBeVisible();
  });

  test('navega a Historia y muestra el filtro de eventos', async ({ page }) => {
    await page.getByRole('button', { name: /historia/i }).first().click();
    await expect(page).toHaveURL(/#timeline$/);
    await expect(page.getByRole('heading', { name: /historia/i })).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('navega al Mapa familiar', async ({ page }) => {
    await page.getByRole('button', { name: /mapa familiar/i }).first().click();
    await expect(page).toHaveURL(/#family-map$/);
    await expect(page.getByRole('heading', { name: /mapa familiar/i })).toBeVisible();
    await expect(page.getByRole('img', { name: /mapa mundial de nacimientos/i })).toBeVisible();
  });

  test('navega a Hallazgos', async ({ page }) => {
    await page.getByRole('button', { name: /hallazgos/i }).first().click();
    await expect(page).toHaveURL(/#findings$/);
    await expect(page.getByRole('heading', { name: /cada nombre abre/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /construcción del árbol/i }).first()).toBeVisible();
  });

  test('crea una persona y la muestra en Personas', async ({ page }) => {
    await page.getByRole('button', { name: /piezas/i }).first().click();
    await page.getByRole('button', { name: /nueva pieza/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/nombres/i).first().fill('Smoke');
    await page.getByLabel(/apellidos/i).first().fill('Test');
    await page.getByRole('button', { name: /crear pieza/i }).click();
    await expect(page.getByRole('button', { name: /smoke test/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /ficha personal/i })).toBeVisible();
  });

  test('persiste una persona creada al recargar', async ({ page }) => {
    await page.getByRole('button', { name: /piezas/i }).first().click();
    await page.getByRole('button', { name: /nueva pieza/i }).click();
    await page.getByLabel(/nombres/i).first().fill('Persistencia');
    await page.getByLabel(/apellidos/i).first().fill('Smoke');
    await page.getByRole('button', { name: /crear pieza/i }).click();
    await expect(page.getByRole('button', { name: /persistencia smoke/i })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: /piezas/i }).first().click();
    await expect(page.getByRole('button', { name: /persistencia smoke/i })).toBeVisible();
  });
});
