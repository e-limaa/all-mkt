
# 🧾 Prompt para o Codex – DAM da Tenda: Novos Perfis de Usuário, Controle por Regional e Origem dos Materiais

> **📌 Contexto:**  
> Este sistema é um DAM (Digital Asset Management) utilizado pela **Construtora Tenda**.  
> O Codex deve analisar as **estruturas e regras já existentes no projeto** (banco de dados, models, permissões e rotas), e implementar as seguintes atualizações **sem quebrar o que já funciona**.

---

## ✅ 1. Perfis de Usuário

### Perfis disponíveis:

```ts
enum UserRole {
  ADMIN = 'admin',
  EDITOR_MARKETING = 'editor_marketing',
  EDITOR_TRADE = 'editor_trade',
  VIEWER = 'viewer'
}
```

### Novo modelo `User`:

```ts
type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  regional?: string;               // Ex: "SP", "BA", "RJ" — obrigatório para trade/editor
  viewerAccessToAll?: boolean;     // Apenas para viewer (true = vê todas regionais)
  createdBy?: string;              // ID do criador (admin ou editor_trade)
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🧩 2. Regras de Criação de Usuários

| Quem cria            | Pode criar quem?   | Restrições                                   |
|----------------------|---------------------|-----------------------------------------------|
| **Admin**            | Todos               | Pode definir viewers com acesso total         |
| **Editor Marketing** | Ninguém             | Apenas gerencia materiais e entidades         |
| **Editor Trade**     | Apenas `viewer`     | Viewers herdam automaticamente sua regional   |
| **Viewer**           | Ninguém             | Apenas visualiza e baixa                     |

> ⚠️ Ao criar viewers via `Editor Trade`, o campo `regional` deve ser herdado automaticamente e não editável.

---

## 📄 3. Modelo de Material

Cada **material** possui uma **origem individual** e está associado a um **empreendimento ou campanha**, que por sua vez define a **regional**.

```ts
type Material = {
  id: string;
  title: string;
  categoria: 'empreendimento' | 'campanha';
  empreendimentoId?: string;
  campanhaId?: string;
  fase?: string;
  origem: 'house' | 'ev'; // ← CAMPO OBRIGATÓRIO
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

> Um mesmo empreendimento pode conter materiais de ambas as origens (`house` e `ev`), ex: dois books digitais distintos — um para Tenda e um para EVs.

---

## 🏢 4. Modelo de Empreendimento e Campanha

```ts
type Empreendimento = {
  id: string;
  nome: string;
  regional: string;
  createdAt: Date;
  updatedAt: Date;
}

type Campanha = {
  id: string;
  titulo: string;
  regional: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔒 5. Controle de Acesso a Materiais

A visibilidade de cada material será definida pela **regional** do empreendimento ou campanha associada.

### Função de acesso sugerida:

```ts
function podeVerMaterial(user: User, material: Material): boolean {
  const entidade = material.categoria === 'empreendimento'
    ? buscarEmpreendimento(material.empreendimentoId)
    : buscarCampanha(material.campanhaId);

  const regional = entidade.regional;

  if (user.role === 'admin' || user.role === 'editor_marketing') return true;
  if (user.role === 'editor_trade') return user.regional === regional;
  if (user.role === 'viewer') {
    if (user.viewerAccessToAll) return true;
    return user.regional === regional;
  }
  return false;
}
```

---

## 📥 6. Upload de Material

- O usuário deve selecionar a entidade associada (empreendimento ou campanha)
- Campo novo e obrigatório:
```tsx
<Select name="origem" label="Origem do material" required>
  <option value="house">House (Tenda)</option>
  <option value="ev">EV (Imobiliária Parceira)</option>
</Select>
```

---

## 🔍 7. Filtros de Interface

Na tela de listagem de materiais:
- Filtro por **origem** (`house` / `ev`)
- Filtro por regional (fixado no backend para perfis restritos)
- Filtros por empreendimento/campanha, tipo de material, fase, etc.

---

## 📊 8. Resumo das Regras de Acesso

| Tipo de Usuário         | Pode ver todas as regionais? | Pode subir material? | Pode cadastrar usuários?        |
|-------------------------|-------------------------------|------------------------|----------------------------------|
| **Admin**               | ✅ Sim                        | ✅ Sim                 | ✅ Todos os tipos                |
| **Editor Marketing**    | ✅ Sim                        | ✅ Sim                 | ❌                               |
| **Editor Trade**        | ❌ Apenas sua regional        | ✅ Sim                 | ✅ Apenas viewer da sua regional |
| **Viewer (restrito)**   | ❌ Apenas sua regional        | ❌                    | ❌                               |
| **Viewer (global)**     | ✅ Sim                        | ❌                    | ❌                               |

---

## ✅ Checklist Final

- [ ] Materiais possuem campo obrigatório `origem: 'house' | 'ev'`
- [ ] Empreendimentos e campanhas possuem campo `regional`
- [ ] Viewer vê apenas materiais da sua regional, a menos que `viewerAccessToAll = true`
- [ ] Editor Trade vê e gerencia apenas materiais da sua regional
- [ ] Admin e Editor Marketing veem tudo
- [ ] Viewer criado por editor_trade herda automaticamente a regional e não pode ver outras
- [ ] Filtros e visibilidade são ajustados no backend com base no usuário logado
- [ ] Formulário de upload exige origem do material
