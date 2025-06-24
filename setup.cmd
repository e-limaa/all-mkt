@echo off
echo 🚀 Configurando ALL MVT DAM System...
echo =================================

REM Verificar se Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado. Por favor, instale Node.js 18+ primeiro.
    pause
    exit /b 1
)

echo ✅ Node.js detectado

REM Limpar instalações anteriores
echo 🧹 Limpando instalações anteriores...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
if exist .next rmdir /s /q .next

REM Instalar dependências
echo 📦 Instalando dependências...
npm install

if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependências. Tentando com cache limpo...
    npm install --no-cache
    if %errorlevel% neq 0 (
        echo ❌ Falha na instalação das dependências.
        pause
        exit /b 1
    )
)

REM Verificar se a build funciona
echo 🔨 Testando build...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Erro no build. Verifique os logs acima.
    pause
    exit /b 1
)

echo.
echo ✅ Setup concluído com sucesso!
echo =================================
echo Para iniciar o desenvolvimento:
echo   npm run dev
echo.
echo Para produção:
echo   npm run build
echo   npm run start
echo.
echo Acesse: http://localhost:3000
echo.
pause