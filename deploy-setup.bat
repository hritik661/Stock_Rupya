@echo off
REM Deployment Setup Script for Vercel
REM This script helps you deploy to Vercel

echo.
echo ============================================
echo  Stockmarket Deployment Setup
echo ============================================
echo.

REM Check if Git is installed
where git >nul 2>nul
if errorlevel 1 (
    echo ERROR: Git is not installed. Please install Git from https://git-scm.com
    pause
    exit /b 1
)

echo Step 1: Checking Git status...
git status --short
echo.

REM Get current branch
for /f %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.

REM Check if there are uncommitted changes
git diff-index --quiet HEAD
if errorlevel 1 (
    echo Found uncommitted changes. Committing...
    git add -A
    git commit -m "Deploy: production build"
    echo Changes committed!
) else (
    echo No uncommitted changes found.
)

echo.
echo ============================================
echo  Next Steps:
echo ============================================
echo.
echo 1. Create a GitHub repository:
echo    - Go to https://github.com/new
echo    - Name: "stockmarket"
echo    - Visibility: Public
echo    - Click "Create repository"
echo.
echo 2. After creating, run this command:
echo    git remote add origin https://github.com/YOUR_USERNAME/stockmarket.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Go to https://vercel.com/new
echo    - Sign in with GitHub
echo    - Select your stockmarket repository
echo    - Add environment variables (see DEPLOYMENT_TO_VERCEL.md)
echo    - Click Deploy!
echo.
echo ============================================
echo.
echo For detailed instructions, see: DEPLOYMENT_TO_VERCEL.md
echo.
pause
