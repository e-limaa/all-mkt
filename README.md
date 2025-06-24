# ALL MKT - Digital Asset Management System

Um sistema completo de gerenciamento de ativos digitais (DAM) para projetos imobiliários, desenvolvido em Next.js com Tailwind CSS v4 e tema escuro.

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** 18.0 ou superior
- **npm** ou **bun** para gerenciamento de pacotes

### Instalação

1. **Clone o repositório:**
```bash
git clone <repository-url>
cd all-mkt-dam-system
```

2. **Instale as dependências:**
```bash
npm install
# ou
bun install
```

3. **Execute o projeto em modo desenvolvimento:**
```bash
npm run dev
# ou
bun dev
```

4. **Acesse a aplicação:**
```
http://localhost:3000
```

## 📋 Comandos Disponíveis

```bash
npm run dev       # Inicia o servidor de desenvolvimento
npm run build     # Faz o build de produção
npm run start     # Inicia o servidor de produção
npm run lint      # Executa o linter
```

## 🛠️ Tecnologias Utilizadas

- **Next.js 14** - Framework React
- **TypeScript** - Linguagem de programação
- **Tailwind CSS v4** - Framework CSS utilitário
- **Radix UI** - Componentes acessíveis
- **Lucide React** - Ícones
- **Sonner** - Notificações toast
- **Next Themes** - Gerenciamento de temas
- **React Hook Form** - Formulários
- **Recharts** - Gráficos

## 🎨 Design System

### Tema Escuro (Padrão)
- O sistema usa tema escuro por padrão
- Cores principais: Vermelho (#dc2626) para ações primárias
- Layout responsivo com sidebar colapsável

### Componentes UI
- Todos os componentes estão em `/components/ui/`
- Sistema de design baseado no shadcn/ui
- Componentes totalmente customizados para o tema escuro

## 📁 Estrutura do Projeto

```
├── components/         # Componentes React
│   ├── ui/            # Componentes de interface
│   └── ...            # Componentes específicos
├── contexts/          # Contextos React
├── hooks/             # Hooks customizados
├── pages/             # Páginas Next.js
├── styles/            # Estilos globais
├── types/             # Definições TypeScript
├── utils/             # Utilitários
└── ...
```

## 🔧 Configuração

### Tailwind CSS v4
O projeto usa Tailwind CSS v4 com configuração customizada:
- Arquivo de configuração: `tailwind.config.ts`
- Estilos globais: `styles/globals.css`
- Tema escuro como padrão

### Variáveis CSS Customizadas
Todas as cores e espaçamentos são definidos via variáveis CSS para fácil customização.

## 🔐 Sistema de Permissões

O sistema inclui três níveis de permissão:

1. **Admin** - Acesso completo
2. **Editor** - Gerenciamento de conteúdo
3. **Viewer** - Apenas visualização

## 📱 Responsividade

- Design mobile-first
- Sidebar responsiva com overlay no mobile
- Componentes adaptáveis a diferentes tamanhos de tela

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de importação de dependências:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Problemas com Tailwind:**
   ```bash
   npm run build
   ```

3. **Problemas com tema escuro:**
   - Verifique se a classe `dark` está aplicada no `<html>`
   - Confirme as variáveis CSS em `globals.css`

## 📄 Licença

Este projeto é propriedade da ALL MKT.

---

**Desenvolvido para ALL MKT** - Sistema de Gerenciamento de Ativos Digitais