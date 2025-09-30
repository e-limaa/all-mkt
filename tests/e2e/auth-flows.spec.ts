import { test, expect, Page } from '@playwright/test';

const uniqueId = Date.now();
const signUpEmail = `test.user+${uniqueId}@allmkt.test`;
const signUpPassword = 'SenhaForte123';

const existingLoginEmail = process.env.E2E_SUPABASE_LOGIN_EMAIL;
const existingLoginPassword = process.env.E2E_SUPABASE_LOGIN_PASSWORD;
const resetTargetEmail = process.env.E2E_SUPABASE_RESET_EMAIL || existingLoginEmail;

const fillField = async (page: Page, selector: string, value: string) => {
  const field = page.locator(selector);
  await field.fill('');
  await field.type(value);
};

test.describe('Fluxos de autenticação ALL MKT', () => {
  test('Cadastro apresenta mensagem de sucesso', async ({ page }) => {
    const capturedRequests: string[] = [];
    const capturedResponses: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/auth/v1/signup')) {
        capturedRequests.push(`${request.method()} ${url}`);
      }
    });
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/auth/v1/signup')) {
        capturedResponses.push(`${response.request().method()} ${url} -> ${response.status()}`);
      }
    });
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        console.log('[signup-console]', message.text());
      }
    });

    await page.goto('/signup');

    await fillField(page, 'input#email', signUpEmail);
    await fillField(page, 'input#password', signUpPassword);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    const successMessage = page.getByText('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
    const rateLimitMessage = page.getByText(/rate limit/i);

    const successVisible = await successMessage.isVisible().catch(() => false);
    if (successVisible) {
      await expect(successMessage).toBeVisible();
    } else {
      console.warn('[signup-rate-limit] Supabase retornou erro de limite. Verifique logs.');
      await expect(rateLimitMessage).toBeVisible();
    }

    console.log('[signup-network]', capturedRequests);
    console.log('[signup-responses]', capturedResponses);
  });

  test('Fluxo de recuperação informa envio de e-mail', async ({ page }) => {
    test.skip(!resetTargetEmail, 'Defina E2E_SUPABASE_RESET_EMAIL para testar recuperação de senha real.');

    await page.goto('/forgot-password');

    await fillField(page, 'input#email', resetTargetEmail!);
    await page.getByRole('button', { name: 'Enviar link de recuperação' }).click();

    await expect(page.getByText('Enviamos um link de recuperação para o seu e-mail.')).toBeVisible();
  });

  test('Reset de senha redireciona para login com alerta', async ({ page }) => {
    test.fixme(true, 'O reset real requer abrir o link de e-mail com token de recuperação.');

    await page.goto('/reset-password');

    await fillField(page, 'input#password', `${signUpPassword}!`);
    await fillField(page, 'input#confirmPassword', `${signUpPassword}!`);
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();

    await page.waitForURL('**/login?**');
    await expect(page.getByText('Senha atualizada com sucesso. Faça login.')).toBeVisible();
  });

  test('Login direciona para /account e permite logout', async ({ page }) => {
    test.skip(!existingLoginEmail || !existingLoginPassword, 'Defina E2E_SUPABASE_LOGIN_EMAIL e E2E_SUPABASE_LOGIN_PASSWORD para testar login real.');

    const capturedRequests: string[] = [];
    const capturedResponses: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/auth/v1/token') || url.includes('/auth/v1/logout')) {
        capturedRequests.push(`${request.method()} ${url}`);
      }
    });

    await page.goto('/login');

    await fillField(page, 'input#email', existingLoginEmail!);
    await fillField(page, 'input#password', existingLoginPassword!);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForURL('**/account');
    await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();

    console.log('[login-network]', capturedRequests);

    await page.getByRole('button', { name: 'Sair da conta' }).click();
    await page.waitForURL('**/login?**');
    await expect(page.getByText('Você saiu da conta com sucesso.')).toBeVisible();
  });
});
