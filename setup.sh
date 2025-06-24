#!/bin/bash

echo "🚀 Configurando ALL MVT DAM System..."
echo "================================="

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js 18+ primeiro."
    exit 1
fi

# Verificar versão do Node
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versão 18+ é necessária. Versão atual: $(node -v)"
    exit 1
fi

echo "✅ Node.js versão $(node -v) detectado"

# Limpar instalações anteriores
echo "🧹 Limpando instalações anteriores..."
rm -rf node_modules package-lock.json .next

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências. Tentando com cache limpo..."
    npm install --no-cache
    if [ $? -ne 0 ]; then
        echo "❌ Falha na instalação das dependências."
        exit 1
    fi
fi

# Verificar se a build funciona
echo "🔨 Testando build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build. Verifique os logs acima."
    exit 1
fi

echo ""
echo "✅ Setup concluído com sucesso!"
echo "================================="
echo "Para iniciar o desenvolvimento:"
echo "  npm run dev"
echo ""
echo "Para produção:"
echo "  npm run build"
echo "  npm run start"
echo ""
echo "Acesse: http://localhost:3000"

# Tornar o script executável
chmod +x setup.sh