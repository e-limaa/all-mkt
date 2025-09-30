# Autenticação com Next.js App Router + Supabase

Este diretório contém um esqueleto completo de autenticação utilizando **Next.js 14 (App Router)**, **React**, **TypeScript** e **Supabase Auth** com cookies HttpOnly gerenciados pelo pacote `@supabase/ssr`. O fluxo cobre cadastro, confirmação por e-mail, login, logout, recuperação e redefinição de senha, além de uma rota protegida (`/account`).

## Pré-requisitos

- Node.js 18 ou superior
- Conta no [Supabase](https://supabase.com)

## Configuração das variáveis de ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.local.example .env.local
   ```
2. Preencha os valores `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com as credenciais do seu projeto Supabase.

## Configuração do Supabase

1. Crie um projeto no Supabase e acesse **Auth → Providers → Email**.
2. Habilite a confirmação de e-mail (Email confirmations).
3. Em **Redirect URLs**, adicione:
   - Confirm email → `https://localhost:3000/auth/callback`
   - Reset password → `https://localhost:3000/reset-password`
4. Gere a chave anônima (anon key) em **Settings → API** e copie também a URL do projeto.

> Para desenvolvimento local com HTTPS, utilize uma solução como [`mkcert`](https://github.com/FiloSottile/mkcert) ou adeque os redirects para o domínio que estiver usando.

## Instalação e execução

```bash
npm install
npm run dev
```

Abra `https://localhost:3000` (ou o domínio configurado) para acessar a landing page com os links dos fluxos de autenticação.

## Estrutura criada

- `app/` – Páginas do App Router (`/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/account` e `/auth/callback`).
- `lib/supabase/` – Clientes do Supabase para o navegador e servidor com suporte a cookies HttpOnly.
- `lib/validation.ts` – Schemas Zod para validar formulários.
- `middleware.ts` – Protege rotas autenticadas verificando a sessão do Supabase.

## Fluxos contemplados

- Cadastro (`/signup`) com envio de e-mail de confirmação.
- Login (`/login`) com redirecionamento condicional (`redirectedFrom`).
- Logout via Supabase Auth com remoção de cookies HttpOnly.
- Recuperação (`/forgot-password`) e redefinição de senha (`/reset-password`).
- Rota protegida (`/account`) que exibe o e-mail do usuário autenticado.

## Testes manuais sugeridos

1. **Cadastro**: crie uma nova conta, confirme o e-mail recebido e verifique o redirecionamento para `/login` com mensagem de sucesso.
2. **Login**: autentique-se com a conta confirmada, confirme o acesso à página `/account` e o uso de cookies HttpOnly.
3. **Logout**: na página `/account`, clique em “Sair da conta” e garanta o redirecionamento para `/login`.
4. **Esqueci minha senha**: solicite um e-mail de recuperação em `/forgot-password` e confirme o recebimento do link.
5. **Reset de senha**: utilize o link do e-mail para acessar `/reset-password`, defina uma nova senha e faça login novamente.

## Observações

- Não armazene tokens no `localStorage`; o gerenciamento de sessão é feito automaticamente via cookies HttpOnly fornecidos pelo Supabase.
- Todas as páginas de formulário utilizam validação com **Zod** e feedback acessível via `aria-live`.
- Ajuste os estilos conforme necessário; a interface usa apenas HTML/CSS nativos para simplificar.
