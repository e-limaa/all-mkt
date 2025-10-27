# Configuração do Supabase para o DAM ALL MKT

Este guia te ajudará a configurar o Supabase para o projeto DAM (Digital Asset Management).

## 1. Criando um Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha sua organização
5. Preencha os dados:
   - **Name**: `dam-allmkt`
   - **Database Password**: Crie uma senha forte (salve-a!)
   - **Region**: Escolha a mais próxima do Brasil (ex: South America)
6. Clique em "Create new project"

## 2. Configuração do Banco de Dados

### 2.1 Executar o Schema SQL

1. No painel do Supabase, vá para **SQL Editor**
2. Clique em "New query"
3. Copie todo o conteúdo do arquivo `/database/schema.sql`
4. Cole no editor e execute (Ctrl+Enter ou botão Run)

### 2.2 Verificar se as tabelas foram criadas

No painel **Table Editor**, você deve ver:
- users
- campaigns
- projects
- assets
- shared_links
- system_settings

## 3. Configuração do Storage

### 3.1 Verificar Buckets

No painel **Storage**, verifique se os buckets foram criados:
- `assets` (público)
- `thumbnails` (público)
- `avatars` (público)

### 3.2 Se não foram criados automaticamente:

1. Vá para **Storage**
2. Clique em "Create a new bucket"
3. Crie os buckets:
   - Nome: `assets`, Público: ✅
   - Nome: `thumbnails`, Público: ✅
   - Nome: `avatars`, Público: ✅

## 4. Configuração de Autenticação

### 4.1 Configurar Email Templates (Opcional)

1. Vá para **Authentication > Email Templates**
2. Personalize os templates de:
   - Confirm signup
   - Reset password
   - Magic Link

### 4.2 Configurar Providers (Opcional)

Se quiser login social:
1. Vá para **Authentication > Providers**
2. Configure Google, GitHub, etc.

## 5. Configuração do Projeto Local

### 5.1 Instalar Dependências

```bash
npm install @supabase/supabase-js uuid
npm install -D @types/uuid supabase
```

### 5.2 Configurar Variáveis de Ambiente

1. Copie `.env.example` para `.env.local`:
```bash
cp .env.example .env.local
```

2. No painel do Supabase, vá para **Settings > API**
3. Copie os valores e cole no `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5.3 Gerar Types TypeScript (Opcional)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Gerar types
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

## 6. Testando a Integração

### 6.1 Iniciar o Projeto

```bash
npm run dev
```

### 6.2 Criar Primeiro Usuário

1. Acesse http://localhost:3000
2. Clique em "Criar conta"
3. Preencha os dados e confirme o email
4. No painel do Supabase, vá para **Authentication > Users**
5. Verifique se o usuário foi criado

### 6.3 Definir como Admin

1. No painel do Supabase, vá para **Table Editor > users**
2. Encontre seu usuário
3. Edite o campo `role` para `admin`
4. Salve as alterações

## 7. Configurações de Produção

### 7.1 RLS (Row Level Security)

As políticas RLS já estão configuradas no schema. Verifique se estão ativas:

1. Vá para **Authentication > Policies**
2. Verifique se todas as tabelas têm políticas definidas

### 7.2 Backup

Configure backups automáticos:
1. Vá para **Settings > Database**
2. Configure "Point in time recovery" (plano pago)

## 8. Estrutura das Tabelas

### Users
- `id`: UUID (FK para auth.users)
- `email`: Email único
- `name`: Nome do usuário
- `role`: admin | editor | viewer
- `avatar_url`: URL do avatar

### Campaigns
- `id`: UUID
- `name`: Nome da campanha
- `description`: Descrição
- `color`: Cor hex
- `status`: active | inactive | archived
- `start_date` / `end_date`: Datas da campanha

### Projects
- `id`: UUID
- `name`: Nome do projeto
- `description`: Descrição
- `image`: URL da imagem
- `color`: Cor hex
- `status`: vem-ai | breve-lancamento | lancamento
- `location`: Localização
- `launch_date`: Data (opcional) para previs?o de lan?amento
> Caso o seu projeto j� esteja em produ��o, garanta que a coluna `launch_date` exista na tabela `projects`:
```sql
alter table public.projects
  add column if not exists launch_date date;
```



### Assets
- `id`: UUID
- `name`: Nome do arquivo
- `type`: image | video | document | archive
- `url`: URL do arquivo no Storage
- `category_type`: campaign | project
- `category_id`: ID da categoria
- `metadata`: JSONB com metadados extras

### System Settings
- `id`: UUID (chave primária)
- `company_name`: Nome exibido no topo do sistema
- `admin_email`: Email para alertas administrativos
- `email_notifications`: Habilita notificações por email
- `system_notifications`: Habilita alertas do sistema na interface
- `two_factor`: Indica se a autenticação em duas etapas está ativa
- `multi_sessions`: Permite sessões simultâneas para o mesmo usuário
- `auto_backup`: Controla o agendamento de backups
- `dark_mode`: Define o tema padrão como escuro
- `compact_sidebar`: Usa a navegação lateral compacta por padrão
- `storage_limit_gb`: Limite de armazenamento em GB
- `created_at` / `updated_at`: Datas de auditoria
- `updated_by`: Referência ao usuário que fez a última alteração

> Caso o seu projeto tenha sido configurado antes desta atualização, execute o SQL abaixo no Supabase para criar a nova tabela:

```sql
create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  admin_email text,
  email_notifications boolean not null default true,
  system_notifications boolean not null default true,
  two_factor boolean not null default false,
  multi_sessions boolean not null default true,
  auto_backup boolean not null default true,
  dark_mode boolean not null default true,
  compact_sidebar boolean not null default false,
  storage_limit_gb integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id) on delete set null
);

alter table public.system_settings enable row level security;

create policy if not exists "Admins can manage system settings" on public.system_settings
  for all using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

create policy if not exists "Authenticated users can view system settings" on public.system_settings
  for select using (
    exists (
      select 1 from public.users where id = auth.uid()
    )
  );
```

## 9. Troubleshooting

### Erro de CORS
Adicione seu domínio em **Settings > API > CORS**

### Erro de Storage
Verifique as políticas de Storage em **Storage > Policies**

### Erro de RLS
Verifique se as políticas estão corretas em **Authentication > Policies**

### Usuário não criado automaticamente
Verifique se o trigger `on_auth_user_created` está ativo.

## 10. Comandos Úteis

```bash
# Atualizar schema
supabase db push

# Reset do banco (cuidado!)
supabase db reset

# Gerar migration
supabase db diff -f nome_da_migration

# Aplicar migrations
supabase migration up
```

## Pronto! 🚀

Seu projeto DAM agora está integrado com o Supabase. Você pode:

- Fazer login/logout
- Criar campanhas e projetos
- Fazer upload de materiais
- Gerenciar usuários
- Compartilhar links

Para dúvidas, consulte a [documentação oficial do Supabase](https://supabase.com/docs).

