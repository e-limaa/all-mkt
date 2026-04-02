# Technical Handoff - TendaDAM / ALL MKT DAM

## 1. Objetivo do projeto

Este projeto e um DAM (Digital Asset Management) interno para operacao de marketing/comercial.
Ele concentra:

- autenticacao e gestao de usuarios
- cadastro e organizacao de materiais
- agrupamento por campanhas e empreendimentos
- compartilhamento de links
- painel com indicadores
- configuracoes de sistema
- widget de chat integrado com n8n

O projeto atende perfis com escopo e permissoes diferentes:

- `admin`
- `editor_marketing`
- `editor_trade`
- `viewer`

## 2. Resumo executivo da stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Radix UI
- componentes estilo shadcn em `components/ui`
- `next-themes` para controle de tema
- `framer-motion` para animacoes
- `sonner` para toasts
- `recharts` para graficos
- `react-hook-form` para formularios

### Backend / BaaS

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- `@supabase/supabase-js`
- `@supabase/ssr`

### Integracoes

- PostHog para analytics e session recording
- n8n via webhook autenticado
- jsPDF para geracao de relatorios PDF no cliente

### Testes / DX

- Playwright para E2E
- ESLint
- SVGR para importar SVGs como componentes

## 3. Ponto arquitetural mais importante

O projeto esta em **arquitetura hibrida**:

- usa `pages/` para a aplicacao principal
- usa `app/` para fluxos mais novos de autenticacao e uma rota de integracao com n8n

Na pratica:

- o shell principal da aplicacao roda em `pages/` e carrega `App.tsx`
- os fluxos de auth mais novos ficam em `app/login`, `app/signup`, `app/forgot-password`, `app/reset-password`, `app/account`, `app/auth/callback`
- existem APIs tanto em `pages/api/*` quanto em `app/api/*`

Isso e funcional, mas aumenta a complexidade de manutencao. Qualquer continuidade do projeto deve levar em conta que **nao e um projeto padrao puramente App Router nem puramente Pages Router**.

## 4. Estrutura principal de pastas

### Aplicacao

- `pages/`
  - rotas principais da aplicacao
  - `_app.tsx` define providers globais
  - `_document.tsx`
  - dashboards e telas principais
  - APIs legadas e administrativas
- `app/`
  - auth nova
  - `app/api/n8n/chat/route.ts`
  - `app/auth/callback/route.ts`
- `App.tsx`
  - shell client-side principal da app

### UI e dominio

- `components/`
  - layout, dashboard, asset manager, campaign manager, user manager etc.
- `components/ui/`
  - biblioteca de componentes compartilhados
- `contexts/`
  - auth, config, assets e permissoes

### Infra e servicos

- `lib/`
  - clientes Supabase
  - utils
  - validacao
  - logger
  - relatorios
  - settings

### Banco e tipos

- `database/migrations/`
  - migracoes SQL atuais
- `contexts/database/schema.sql`
  - schema base inicial, util como referencia historica
- `types/`
  - tipos de dominio e tipos Supabase

### Testes e scripts

- `tests/e2e/`
  - testes Playwright
- `scripts/`
  - utilitarios operacionais e de depuracao

## 5. Setup local

### Requisitos

- Node.js 18+ (atualmente rodando bem com Node 22)
- npm
- projeto Supabase configurado

### Comandos principais

```bash
npm install
npm run dev
```

### Build / start

```bash
npm run build
npm run start
```

### Testes E2E

```bash
npm run test:e2e
```

## 6. Variaveis de ambiente necessarias

**Nao compartilhar o `.env.local` bruto com terceiros sem rotacionar os segredos.**
Para handoff, compartilhar apenas os nomes e fornecer os valores por canal seguro.

Variaveis identificadas no projeto:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_SITE_URL` (opcional, usado pelo widget/chat)
- `NEXT_PUBLIC_APP_VERSION` (opcional)

### Uso por dominio

- Frontend:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_POSTHOG_KEY`
  - `NEXT_PUBLIC_POSTHOG_HOST`
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_APP_VERSION`
- Backend / rotas server:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `N8N_WEBHOOK_URL`
  - `N8N_WEBHOOK_SECRET`

## 7. Frontend stack em detalhes

### Roteamento

Rotas principais em `pages/`:

- `/`
- `/dashboard`
- `/materials`
- `/campaigns`
- `/projects`
- `/users`
- `/shared`
- `/settings`
- `/register`
- `/admin/activity`

Rotas de auth em `app/`:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/account`
- `/auth/callback`

### Providers globais

Em `pages/_app.tsx`:

- `ThemeProvider` com `next-themes`
- inicializacao do PostHog
- importacao de estilos globais
- tracking de pageview via router events

### App shell

O arquivo `pages/dashboard.tsx` importa `App.tsx` via `dynamic(..., { ssr: false })`.
O `App.tsx` controla:

- resolucao de rota atual
- providers:
  - `ConfigProvider`
  - `AuthProvider`
  - `AssetProvider`
- layout principal
- permissoes por pagina
- fallback de loading
- widget de chat

### Estilo e design system

- Tailwind v4 com `@tailwindcss/postcss`
- dark mode por classe
- tokens de tema definidos em `styles/globals.css`
- cores expostas para o Tailwind via `@theme inline`
- componentes baseados em Radix no diretorio `components/ui`

### Bibliotecas visuais relevantes

- `framer-motion`
- `lucide-react`
- `embla-carousel-react`
- `vaul`
- `react-day-picker`
- `react-resizable-panels`
- `recharts`

## 8. Backend / Supabase stack em detalhes

### Auth

Existem dois modelos convivendo:

1. modelo browser/client via `lib/supabase.ts`
2. modelo server com `@supabase/ssr` via:
   - `lib/supabase/client.ts`
   - `lib/supabase/server.ts`

O projeto esta em transicao:

- parte da aplicacao principal usa sessao cliente
- fluxos novos de auth usam a abordagem moderna com App Router e cookies server-side

### Banco

O projeto nao usa ORM.
O acesso a dados e feito com:

- `@supabase/supabase-js`
- consultas na tabela via client Supabase
- em alguns casos, fetch direto no endpoint REST do Supabase

### Storage

Assets sao armazenados no Supabase Storage.
Helpers principais em `lib/supabase.ts`:

- `uploadFile`
- `getPublicUrl`
- `downloadFile`
- `listFiles`
- `deleteFile`

### Cliente admin

Operacoes administrativas usam service role em `lib/supabase/admin.ts`.
Isso e consumido principalmente por rotas `pages/api/admin/*`.

## 9. Modelo de dados do dominio

### Tabelas principais

Identificadas a partir do schema base e migracoes:

- `users`
- `campaigns`
- `projects`
- `assets`
- `shared_links`
- `system_settings`
- `useful_links`
- `asset_download_events`
- `activity_logs`

### Dominio principal

#### Users

Campos relevantes:

- `id`
- `email`
- `name`
- `avatar_url`
- `role`
- `regional`
- `material_origin_scope`
- `viewer_access_to_all`
- `created_by`
- `created_at`
- `updated_at`

#### Campaigns

Campos relevantes:

- `name`
- `description`
- `status`
- `start_date`
- `end_date`
- `regional`
- `created_by`

#### Projects

Campos relevantes:

- `name`
- `description`
- `status`
- `launch_date`
- `regional`
- `image`
- `created_by`

#### Assets

Campos relevantes:

- `name`
- `description`
- `type`
- `format`
- `size`
- `url`
- `thumbnail_url`
- `tags`
- `origin`
- `category_type`
- `category_id`
- `category_name`
- `share_path`
- `regional`
- `is_public`
- `download_count`
- `metadata`
- `uploaded_by`

#### Shared links

Campos relevantes:

- `asset_id`
- `token`
- `expires_at`
- `download_count`
- `max_downloads`
- `is_active`
- `created_by`

#### Useful links

Campos relevantes:

- `title`
- `url`
- `description`
- `category`
- `pinned`
- `click_count`
- `created_by`

#### Activity logs

Usado para registrar acoes como:

- criacao/edicao/exclusao de usuario
- upload/update/delete de asset
- criacao/exclusao de link compartilhado

## 10. Permissoes e regras de acesso

As permissoes estao centralizadas em `types/enums.ts`.

### Roles

- `admin`
- `editor_marketing`
- `editor_trade`
- `viewer`

### Regras de negocio observadas

- `admin`
  - acesso total
- `editor_marketing`
  - gerencia campanhas e projetos
  - consegue criar/editar usuarios em escopos permitidos
  - visualiza dashboard e activity logs
- `editor_trade`
  - foco em consulta e operacao regional
  - pode criar usuarios com restricoes
  - acesso mais restrito a materiais por regional
- `viewer`
  - visualizacao/download
  - escopo por regional ou acesso global quando `viewer_access_to_all = true`

### Escopo de materiais

O escopo dos materiais cruza:

- role
- regional
- `material_origin_scope`
- `viewer_access_to_all`

Origens identificadas:

- `house`
- `ev`
- `tenda_vendas`

Observacao importante:

- o schema inicial em `contexts/database/schema.sql` mostra apenas `house` e `ev`
- as migracoes posteriores adicionam `tenda_vendas`

Ou seja: **usar as migracoes como fonte de verdade atual, nao apenas o schema base antigo**.

## 11. APIs existentes

### App Router APIs

- `app/api/n8n/chat/route.ts`
  - proxy/autenticacao para webhook n8n
  - normaliza resposta do upstream
  - runtime `nodejs`

### Pages Router APIs

#### Admin

- `pages/api/admin/activity-logs.ts`
- `pages/api/admin/create-user.ts`
- `pages/api/admin/delete-user.ts`
- `pages/api/admin/list-users.ts`
- `pages/api/admin/update-user.ts`

#### Assets / profile / auth

- `pages/api/assets/finalize.ts`
- `pages/api/auth/request-password-reset.ts`
- `pages/api/auth/setup-account.ts`
- `pages/api/profile/update.ts`
- `pages/api/users/lookup.ts`

### Observacao arquitetural

Existe convivio de dois estilos de API:

- `pages/api` legado/principal
- `app/api` novo

Se a equipe for seguir no projeto, vale definir um plano de convergencia em vez de expandir os dois estilos indefinidamente.

## 12. Fluxos funcionais principais

### 12.1 Autenticacao

Fluxos identificados:

- signup
- login
- logout
- forgot password
- reset password
- callback de auth
- pagina protegida de conta

### 12.2 Gestao de assets

Pelo `AssetContext` e componentes associados:

- upload de arquivo
- associacao a campanha/projeto
- definicao de metadata
- listagem e filtros
- compartilhamento
- download
- delete/update

### 12.3 Campaigns e projects

- CRUD de campanhas
- CRUD de empreendimentos
- associacao de materiais
- uso de regional como eixo de escopo

### 12.4 User management

Implementado por rotas admin e `UserManager`:

- listar usuarios
- criar usuario
- atualizar usuario
- excluir usuario
- aplicar regras por role

### 12.5 Shared links

- criacao de link por asset
- expiracao
- limite de downloads
- contador de uso

### 12.6 Useful links

- cadastro de links utilitarios
- pinagem
- contagem de cliques

### 12.7 Dashboard

Indicadores identificados:

- total de materiais
- downloads
- total de usuarios
- links ativos
- distribuicao por tipo
- distribuicao por campanha
- distribuicao por projeto
- atividade recente
- proximos lancamentos

### 12.8 Chat / automacao

Widget flutuante em `components/chat/N8nFloatingWidget.tsx`:

- envia pergunta para `/api/n8n/chat`
- gera `userId` local persistido
- integra tracking no PostHog
- reconhece links e materiais na resposta

## 13. Integracoes externas

### Supabase

Responsavel por:

- auth
- banco
- storage
- parte importante da autorizacao via RLS

### PostHog

Inicializacao em `app/instrumentation-client.ts`.
Usos identificados:

- pageview
- autocapture
- exceptions
- session recording
- eventos customizados do widget/chat

No `next.config.js` ha rewrites para `/ingest/*`, reduzindo dependencias diretas no browser para algumas chamadas.

### n8n

O backend faz proxy para o webhook:

- envia payload normalizado
- usa `Authorization: Bearer <secret>`
- interpreta respostas heterogeneas do fluxo n8n
- devolve objeto normalizado para o frontend

## 14. Configuracao do Next.js

Pontos relevantes em `next.config.js`:

- `reactStrictMode: true`
- `turbopack: {}`
- suporte a SVG via `@svgr/webpack`
- CSP definida manualmente
- rewrites para PostHog
- `transpilePackages: ['lucide-react']`
- `skipTrailingSlashRedirect: true`
- `typescript.ignoreBuildErrors: true`

### Risco importante

`typescript.ignoreBuildErrors = true` significa que o build pode passar com erro de tipagem.
Isto acelera entrega, mas aumenta risco de regressao silenciosa.

## 15. Estado atual do TypeScript e qualidade de codigo

### Observacoes objetivas

- `tsconfig.json` esta em `strict: true`
- apesar disso, o build ignora erros de TS
- `contexts/AssetContext.tsx` esta com `// @ts-nocheck`
- alguns helpers e payloads usam `any`
- existe sobreposicao de modelos antigos e novos de auth e roteamento

### Impacto

- o projeto roda
- mas o custo de manutencao e maior
- mudancas profundas devem ser acompanhadas de limpeza gradual de tipagem

## 16. Testes

### Ferramenta

- Playwright

### Arquivos identificados

- `tests/e2e/auth-flows.spec.ts`
- `tests/e2e/useful-links.spec.ts`

### Config

Em `playwright.config.ts`:

- sobe app com `npm run dev`
- usa porta dedicada para teste
- reutiliza servidor existente fora de CI
- gera trace/screenshot/video em falhas

### Leitura pratica

Ha cobertura inicial de smoke/E2E, mas nao ha evidencia no projeto de:

- testes unitarios
- testes de integracao backend
- contratos automatizados para API

## 17. Scripts utilitarios

Arquivos em `scripts/` indicam manutencao operacional do projeto:

- `check_activity_logs.ts`
- `debug_db_constraints.ts`
- `fix_bucket_limit.ts`
- `fix_system_state.ts`
- `testSupabase.ts`
- wrappers MCP/automacao para Chrome DevTools, Playwright, PostHog e Supabase

Esses scripts sao uteis para continuidade operacional e depuracao.

## 18. Seguranca e governanca

### Pontos positivos

- uso de RLS no Supabase
- separacao entre anon key e service role
- CSP configurada no Next
- auth moderna suportada com cookies HttpOnly no trecho App Router

### Pontos que exigem atencao

- `.env.local` contem segredos reais e deve ser tratado como sensivel
- service role nao pode circular em canais inseguros
- coexistencia de auth client-side e auth server-side pede revisao de superficie de risco
- response normalization do n8n aceita payloads flexiveis, o que ajuda no produto, mas pede contrato mais firme

## 19. Debitos tecnicos e riscos atuais

### 19.1 Arquitetura hibrida

Problema:

- `pages/` e `app/` convivem
- auth e APIs estao divididos entre abordagens diferentes

Impacto:

- onboarding mais lento
- maior chance de duplicacao de logica
- manutencao mais cara

### 19.2 Build tolerando erro de tipagem

Problema:

- `ignoreBuildErrors: true`

Impacto:

- regressao silenciosa
- baixa confianca de release

### 19.3 `AssetContext` muito grande

Problema:

- concentra logica demais
- esta com `@ts-nocheck`

Impacto:

- manutencao dificil
- refatoracoes arriscadas

### 19.4 Schema historico vs migracoes atuais

Problema:

- `contexts/database/schema.sql` nao representa sozinho o estado final

Impacto:

- risco de onboarding com informacao desatualizada

### 19.5 Mistura de auth patterns

Problema:

- auth client-side antiga
- auth server-side nova

Impacto:

- comportamento potencialmente inconsistente
- superficie de bug maior

## 20. Recomendacoes de continuidade

### Para frontend

1. Definir a direcao de roteamento:
   - manter `pages/` como principal no curto prazo, ou
   - migrar gradualmente para `app/`
2. Quebrar `App.tsx` e `AssetContext.tsx` em modulos menores
3. Remover `@ts-nocheck` do `AssetContext`
4. Reduzir `any`
5. Criar camada mais explicita de hooks por feature:
   - assets
   - campaigns
   - projects
   - users
   - settings
6. Unificar design tokens e componentes compartilhados

### Para backend

1. Revisar todas as migracoes aplicadas no Supabase real
2. Gerar snapshot atualizado do schema em vez de confiar no schema base antigo
3. Revisar RLS de:
   - users
   - assets
   - shared_links
   - useful_links
   - activity_logs
4. Definir contrato estavel para `n8n/chat`
5. Revisar uso de service role em rotas administrativas
6. Criar estrategia de observabilidade para erros de API e jobs

### Para ambos

1. Alinhar uma fonte unica de verdade para auth
2. Alinhar uma fonte unica de verdade para rotas/API
3. Decidir estrategia de deploy e ambientes
4. Endurecer tipagem e gates de CI

## 21. Backlog tecnico sugerido

### Prioridade alta

- mapear schema real do Supabase e documentar
- remover `ignoreBuildErrors`
- isolar e tipar `AssetContext`
- consolidar estrategia de auth
- revisar permissoes/RLS em producao

### Prioridade media

- padronizar APIs em um unico estilo
- melhorar testes E2E
- introduzir testes unitarios para regras criticas
- documentar contrato de widget/n8n

### Prioridade baixa

- limpeza de componentes antigos
- padronizacao visual mais profunda
- atualizacao de dependencias nao criticas

## 22. Checklist de onboarding para quem assumir

### Frontend

- conseguir rodar `npm run dev`
- validar login/logout
- validar dashboard
- validar listagem de materiais
- validar criacao de campanha/projeto
- validar tela de usuarios
- validar useful links
- validar widget de chat

### Backend

- confirmar projeto Supabase correto
- confirmar buckets de storage
- revisar tabelas e policies
- revisar chaves anon/service role
- testar APIs admin
- testar rotas de auth
- testar webhook n8n
- revisar eventos PostHog

## 23. Arquivos-chave para leitura inicial

### Aplicacao

- `App.tsx`
- `pages/_app.tsx`
- `pages/dashboard.tsx`
- `app/layout.tsx`

### Estado e dominio

- `contexts/AuthContext.tsx`
- `contexts/ConfigContext.tsx`
- `contexts/AssetContext.tsx`
- `contexts/hooks/usePermissions.ts`
- `types/index.ts`
- `types/enums.ts`

### Infra

- `lib/supabase.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `lib/settings.ts`
- `lib/activity-logger.ts`
- `lib/report/generateReport.ts`

### APIs

- `app/api/n8n/chat/route.ts`
- `pages/api/admin/create-user.ts`
- `pages/api/admin/update-user.ts`
- `pages/api/admin/list-users.ts`
- `pages/api/admin/delete-user.ts`
- `pages/api/assets/finalize.ts`
- `pages/api/profile/update.ts`

### Banco

- `database/migrations/*`
- `contexts/database/schema.sql`

## 24. Conclusao

O projeto esta funcional e tem base suficiente para evolucao, mas hoje mistura camadas antigas e novas.
O principal ponto para quem vai dar sequencia e evitar ampliar a complexidade atual sem antes definir:

- qual roteador sera a base futura
- qual modelo de auth sera a fonte de verdade
- qual estado atual do schema Supabase sera assumido oficialmente

Se essas tres decisoes forem tomadas cedo, a continuidade fica muito mais previsivel para frontend e backend.
