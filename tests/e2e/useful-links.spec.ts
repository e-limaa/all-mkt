import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const loginEmail = process.env.E2E_SUPABASE_LOGIN_EMAIL;
const loginPassword = process.env.E2E_SUPABASE_LOGIN_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLoginCredentials = Boolean(loginEmail && loginPassword);
const hasSupabaseServiceAccess = Boolean(supabaseUrl && serviceRoleKey);

const fillField = async (page: Page, selector: string, value: string) => {
  const field = page.locator(selector);
  await field.fill('');
  await field.type(value);
};

test.describe('Fluxo de links úteis', () => {
  test('permite cadastrar um link, atualiza a interface e salva no Supabase', async ({ page }) => {
    test.skip(!hasLoginCredentials, 'Defina E2E_SUPABASE_LOGIN_EMAIL e E2E_SUPABASE_LOGIN_PASSWORD para habilitar este teste.');
    test.skip(!hasSupabaseServiceAccess, 'Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para validar no banco.');

    const timestamp = Date.now();
    const linkTitle = `Playwright util ${timestamp}`;
    const linkUrl = `https://example.com/playwright-${timestamp}`;
    const linkDescription = 'Teste e2e para validar cadastro de links úteis.';

    await page.goto('/login');
    await fillField(page, 'input#email', loginEmail!);
    await fillField(page, 'input#password', loginPassword!);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/account');

    await page.goto('/shared');
    await expect(page.getByRole('heading', { name: 'Links úteis' })).toBeVisible();

    await page.getByRole('button', { name: 'Novo Link' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Ex: Brandbook').fill(linkTitle);
    await dialog.getByPlaceholder('https://').fill(linkUrl);
    await dialog.getByPlaceholder('Descreva brevemente este link...').fill(linkDescription);

    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/useful_links') && response.status() < 400),
      dialog.getByRole('button', { name: 'Criar link' }).click(),
    ]);

    await expect(page.getByRole('heading', { name: linkTitle, level: 3 })).toBeVisible();
    await expect(page.getByText(linkUrl)).toBeVisible();

    const supabase = createClient(supabaseUrl!, serviceRoleKey!);
    let createdRowId: string | null = null;

    try {
      const { data, error } = await supabase
        .from('useful_links')
        .select('id, title, url')
        .eq('title', linkTitle)
        .eq('url', linkUrl)
        .order('created_at', { ascending: false })
        .limit(1);

      expect(error).toBeNull();
      expect(data?.[0]).toBeDefined();
      createdRowId = data?.[0]?.id ?? null;
    } finally {
      if (createdRowId) {
        await supabase.from('useful_links').delete().eq('id', createdRowId);
      }
    }
  });
});
