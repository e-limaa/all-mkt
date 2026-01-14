# DAM Tenda - Sistema de Gerenciamento Digital de Ativos

Sistema de Digital Asset Management (DAM) para a Construtora Tenda, focado em gerenciamento, compartilhamento e organização de materiais de marketing e vendas.

## 🛠 Tech Stack

- **Framework:** Next.js 14+ (App Router & Pages Router mixed)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS v4, Shadcn/ui
- **Backend/Database:** Supabase (Auth, Storage, Postgres)
- **Ícones:** Lucide React
- **Testes:** Playwright
- **Analitics:** PostHog

## 🚀 Como Iniciar

### Pré-requisitos
- Node.js 18+
- NPM ou Bun

### Instalação

1.  **Limpar e Instalar:**
    ```bash
    rm -rf node_modules .next
    npm install
    ```
    Ou use os scripts de setup automáticos na raiz:
    - Windows: `setup.cmd`
    - Linux/Mac: `./setup.sh`

2.  **Configurar Variáveis de Ambiente:**
    Copie `.env.example` para `.env.local` e preencha as credenciais do Supabase.

3.  **Rodar o Projeto:**
    ```bash
    npm run dev
    ```
    Acesse em `http://localhost:3000`.

## 📂 Estrutura do Projeto

- `/components`: Componentes React reutilizáveis (UI, Managers, Viewers).
- `/pages`: Rotas da aplicação (Next.js Pages Router).
- `/app`: Rotas da aplicação (Next.js App Router - Instrumentation).
- `/contexts`: Context Providers (Auth, Asset, Config).
- `/lib`: Utilitários e configurações de bibliotecas (Supabase, Utils).
- `/scripts`: Scripts de manutenção e automação.
- `/types`: Definições de tipos TypeScript.

## 🗄️ Supabase Config

O projeto utiliza Supabase para:
- **Auth:** Gerenciamento de usuários e sessões.
- **Storage:** Bucket `assets` para armazenamento de arquivos (limite configurado para 200MB).
- **Database:** Tabelas para metadados de assets, usuários, logs de atividade, etc.

## 🧹 Limpeza Realizada (Jan 2026)

Arquivos não utilizados e documentação antiga foram removidos da raiz para simplificar o projeto.
Scripts auxiliares foram mantidos ou movidos para `/scripts`.
