@echo off
echo ===================================================
echo     My Finances - Gerador de APK Android (TWA / PWA)
echo ===================================================
echo.
echo Este script utiliza a ferramenta oficial do Google (Bubblewrap)
echo para transformar seu app web em um pacote APK Android (.apk)
echo instalavel em qualquer celular Android ou publicavel na Google Play.
echo.
echo URL de Producao: https://myfinances-xi.vercel.app
echo Manifest: https://myfinances-xi.vercel.app/manifest.json
echo.

where npx >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js e npx nao encontrados no seu sistema.
    echo Instale o Node.js em https://nodejs.org
    pause
    exit /b 1
)

echo Passo 1: Inicializando o projeto Android com Bubblewrap...
call npx @bubblewrap/cli init --manifest=https://myfinances-xi.vercel.app/manifest.json

echo.
echo Passo 2: Compilando o arquivo APK assinado...
call npx @bubblewrap/cli build

echo.
echo ===================================================
echo  Pronto! Seu arquivo .apk foi gerado na pasta atual.
echo ===================================================
pause
