# Regional e Origem - Guia de Ajustes no Supabase

Este guia complementa o `SUPABASE_SETUP.md` com os passos para atualizar um projeto existente com os novos requisitos de regionalização e origem de materiais.

## 1. Executar a migração SQL

No painel do Supabase (SQL Editor) ou via CLI, execute o conteúdo de `database/migrations/20251103_add_regional_and_origin.sql`. A migração:

- Renomeia o papel antigo `editor` para `editor_marketing` e adiciona `editor_trade`.
- Acrescenta as colunas `regional`, `viewer_access_to_all` e `created_by` em `public.users`.
- Garante que `public.campaigns` e `public.projects` possuam a coluna `regional`, preenchendo valores existentes com `GLOBAL` (ajuste conforme a sua matriz real).
- Adiciona `origin` e `regional` em `public.assets`, replicando a regional da campanha/empreendimento vinculado e normalizando tudo em letras maiúsculas.

> Após aplicar a migração, revise os registros preenchidos com `GLOBAL` e atualize-os para as regionais corretas, se necessário.

## 2. Conferir políticas de acesso

O arquivo `contexts/database/schema.sql` agora define novas políticas de Row Level Security:

- Admins e `editor_marketing` enxergam matérias de todas as regionais.
- `editor_trade` e viewers restritos enxergam apenas materiais da própria regional.
- Viewers com `viewer_access_to_all = true` continuam com acesso global.

Caso seu projeto possua políticas personalizadas no Supabase, alinhe-as manualmente com o mesmo comportamento.

## 3. Atualizar tipos locais

Para refletir as novas colunas nos tipos TypeScript:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

## 4. Rodar o validador

Execute:

```bash
node scripts/testSupabase.ts
```

O relatório deve retornar `[ok]` para todas as tabelas. Se algum `[warn]` persistir (ex.: colunas ausentes), revise se a migração realmente foi aplicada no projeto Supabase correto.
