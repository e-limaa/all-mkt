# 🚀 Setup Guide - ALL MKT DAM System

## Verificação Rápida - Problemas Corrigidos

✅ **Todos os imports com versões embutidas foram corrigidos:**
- `@radix-ui/react-avatar@1.1.3` → `@radix-ui/react-avatar`
- `@radix-ui/react-checkbox@1.1.4` → `@radix-ui/react-checkbox`
- `lucide-react@0.487.0` → `lucide-react`
- E muitos outros...

✅ **Package.json limpo e funcional**
✅ **Tema escuro configurado como padrão**
✅ **Tailwind CSS v4 configurado corretamente**

## 🔧 Instalação Automática

### Linux/Mac:
```bash
chmod +x setup.sh
./setup.sh
```

### Windows:
```cmd
setup.cmd
```

## 🔧 Instalação Manual

### 1. Pré-requisitos
- **Node.js 18+** (recomendado: 18.17.0 ou superior)
- **npm** ou **bun**

### 2. Instalação
```bash
# Limpar cache (se necessário)
rm -rf node_modules package-lock.json .next

# Instalar dependências
npm install

# Testar build
npm run build
```

### 3. Executar
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm run start
```

## ✅ Checklist de Verificação

Depois da instalação, verifique se:

- [ ] `npm run dev` inicia sem erros
- [ ] Aplicação carrega em http://localhost:3000
- [ ] Tema escuro está aplicado
- [ ] Sidebar é responsiva (teste redimensionar)
- [ ] Login funciona (use qualquer email/senha)
- [ ] Não há erros no console do navegador

## 🛠️ Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | Executar linter |
| `npm run setup` | Instalar e testar build |

## 🐛 Solução de Problemas

### Erro: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro: Tailwind não carrega
```bash
npm run build
```

### Erro: "Cannot resolve @radix-ui/..."
Verifique se não há imports com versão:
```bash
grep -r "@radix-ui.*@" components/
```

### Performance lenta
```bash
# Use bun em vez de npm
npm install -g bun
bun install
bun dev
```

## 📁 Estrutura Final

```
├── components/
│   ├── ui/           # ✅ Todos corrigidos
│   └── ...
├── package.json      # ✅ Dependências corretas  
├── tailwind.config.ts # ✅ Configurado
├── globals.css       # ✅ Tema escuro
└── ...
```

## 🎯 Próximos Passos

Após o setup bem-sucedido:

1. **Personalize o branding** em `/components/AppSidebar.tsx`
2. **Configure variáveis de ambiente** (copie `.env.example`)
3. **Teste todas as funcionalidades**
4. **Configure deploy** para produção

## 📞 Suporte

Se ainda há problemas:

1. Verifique versão do Node: `node -v` (deve ser 18+)
2. Limpe tudo: `rm -rf node_modules .next package-lock.json`
3. Reinstale: `npm install`
4. Execute: `npm run dev`

---

**Status:** ✅ Pronto para desenvolvimento local!