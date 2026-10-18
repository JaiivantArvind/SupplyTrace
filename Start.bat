@echo off
setlocal enabledelayedexpansion

:: =====================================================================
:: SupplyTrace — Windows Startup & Development Orchestrator
:: Resolves root directory relative to this script
:: =====================================================================
cd /d "%~dp0"
title SupplyTrace Development Orchestrator

set "CLI_ARG=%~1"
if not "%CLI_ARG%"=="" (
    if /i "%CLI_ARG%"=="1" goto OP_FULL_STACK
    if /i "%CLI_ARG%"=="full" goto OP_FULL_STACK
    if /i "%CLI_ARG%"=="2" goto OP_FRONTEND_ONLY
    if /i "%CLI_ARG%"=="frontend" goto OP_FRONTEND_ONLY
    if /i "%CLI_ARG%"=="3" goto OP_NODE_ONLY
    if /i "%CLI_ARG%"=="node" goto OP_NODE_ONLY
    if /i "%CLI_ARG%"=="4" goto OP_DEPLOY_LOCAL
    if /i "%CLI_ARG%"=="deploy" goto OP_DEPLOY_LOCAL
    if /i "%CLI_ARG%"=="5" goto OP_TESTS
    if /i "%CLI_ARG%"=="test" goto OP_TESTS
    if /i "%CLI_ARG%"=="tests" goto OP_TESTS
    if /i "%CLI_ARG%"=="6" goto OP_BUILD
    if /i "%CLI_ARG%"=="build" goto OP_BUILD
    if /i "%CLI_ARG%"=="7" goto OP_LINT
    if /i "%CLI_ARG%"=="lint" goto OP_LINT
    if /i "%CLI_ARG%"=="8" goto OP_INSTALL_DEPS
    if /i "%CLI_ARG%"=="install" goto OP_INSTALL_DEPS
    if /i "%CLI_ARG%"=="check" goto OP_CHECK
    if /i "%CLI_ARG%"=="0" goto OP_EXIT
    if /i "%CLI_ARG%"=="exit" goto OP_EXIT
    echo [ERROR] Unknown command-line argument: %CLI_ARG%
    echo Available commands: full, frontend, node, deploy, test, build, lint, install, check
    exit /b 1
)

:OP_CHECK
call :CHECK_PREREQS
exit /b %ERRORLEVEL%


:MAIN_MENU
cls
echo =====================================================================
echo                     SupplyTrace Web3 dApp Launcher
echo         Decentralized Supply Chain Provenance on Ethereum
echo =====================================================================
echo.
echo  Working Directory: %~dp0
echo.
echo  [1] Full Local Stack (Node + Deploy + Web UI) -- RECOMMENDED
echo  [2] Start Frontend Only (Sepolia Testnet / Live RPC)
echo  [3] Start Local Hardhat Node Only (Port 8545)
echo  [4] Deploy Contracts to Localhost and Export ABI
echo  [5] Run Smart Contract Unit Tests (63 tests)
echo  [6] Build Production Monorepo (Contracts + Frontend)
echo  [7] Run Strict Typecheck and Linting
echo  [8] Verify / Reinstall All Dependencies
echo  [0] Exit
echo.
echo =====================================================================
set "CHOICE="
set /p CHOICE="Select an option (0-8): "

if "%CHOICE%"=="1" goto OP_FULL_STACK
if "%CHOICE%"=="2" goto OP_FRONTEND_ONLY
if "%CHOICE%"=="3" goto OP_NODE_ONLY
if "%CHOICE%"=="4" goto OP_DEPLOY_LOCAL
if "%CHOICE%"=="5" goto OP_TESTS
if "%CHOICE%"=="6" goto OP_BUILD
if "%CHOICE%"=="7" goto OP_LINT
if "%CHOICE%"=="8" goto OP_INSTALL_DEPS
if "%CHOICE%"=="0" goto OP_EXIT

echo.
echo [!] Invalid selection. Please choose an option from 0 to 8.
ping -n 3 127.0.0.1 >nul
goto MAIN_MENU

:: =====================================================================
:: PREREQUISITE & RUNTIME DETECTION
:: =====================================================================
:CHECK_PREREQS
echo [*] Checking required system runtimes and prerequisites...

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js v20.x or higher from https://nodejs.org/
    echo.
    if "%CLI_ARG%"=="" pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] npm is not found in your system PATH.
    echo Please ensure npm is installed alongside Node.js.
    echo.
    if "%CLI_ARG%"=="" pause
    exit /b 1
)

where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Git is not found in PATH. Version control features will be disabled.
)

:: Validate Node version >= 20
node -e "const v = parseInt(process.versions.node.split('.')[0]); if (v < 20) { process.exit(1); }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Node.js version is older than v20. LTS v20+ is recommended.
) else (
    for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
    for /f "tokens=*" %%v in ('npm -v') do set "NPM_VER=%%v"
    echo [OK] Runtime detected: Node !NODE_VER! ^| npm !NPM_VER!
)

:: Ensure local .env files exist from templates if missing
if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        echo [*] Initializing frontend\.env from template...
        copy "frontend\.env.example" "frontend\.env" >nul
    )
)

if not exist "smart-contracts\.env" (
    if exist "smart-contracts\.env.example" (
        echo [*] Initializing smart-contracts\.env from template...
        copy "smart-contracts\.env.example" "smart-contracts\.env" >nul
    )
)

:: Ensure dependencies are present
if not exist "smart-contracts\node_modules" (
    echo [*] Installing smart-contracts dependencies - first-time setup...
    call npm ci --prefix smart-contracts
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install smart-contracts dependencies.
        if "%CLI_ARG%"=="" pause
        exit /b 1
    )
)

if not exist "frontend\node_modules" (
    echo [*] Installing frontend dependencies - first-time setup...
    call npm ci --prefix frontend
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies.
        if "%CLI_ARG%"=="" pause
        exit /b 1
    )
)

echo [OK] Prerequisites and dependencies verified.
exit /b 0

:: =====================================================================
:: [1] FULL LOCAL STACK: Hardhat Node + Deploy Contracts + Frontend
:: =====================================================================
:OP_FULL_STACK
cls
echo =====================================================================
echo          Launching Full Local Stack (Node + Contracts + UI)
echo =====================================================================
echo.
call :CHECK_PREREQS
if %ERRORLEVEL% NEQ 0 (
    if not "%CLI_ARG%"=="" exit /b 1
    goto MAIN_MENU
)

:: Step 1: Check if port 8545 is already in use
echo.
echo [*] Checking local Ethereum node on port 8545...
netstat -ano | findstr /R /C:":8545 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] A local Ethereum node is already running on port 8545. Reusing instance.
) else (
    echo [*] Starting Hardhat local blockchain node in a background window...
    start "SupplyTrace - Local Hardhat Node (Port 8545)" cmd /k "cd /d "%~dp0smart-contracts" && npx hardhat node"

    echo [*] Waiting for local blockchain node to become ready...
    set "READY=0"
    for /l %%i in (1,1,30) do (
        if !READY! EQU 0 (
            ping -n 2 127.0.0.1 >nul
            netstat -ano | findstr /R /C:":8545 .*LISTENING" >nul 2>&1
            if !ERRORLEVEL! EQU 0 (
                set "READY=1"
                echo [OK] Hardhat local node is ready on http://127.0.0.1:8545
            )
        )
    )
    if !READY! EQU 0 (
        echo [ERROR] Timed out waiting for Hardhat node on port 8545.
        echo Please inspect the node console window for details.
        if "%CLI_ARG%"=="" pause
        if not "%CLI_ARG%"=="" exit /b 1
        goto MAIN_MENU
    )
)

:: Step 2: Deploy Contracts & Export Frontend Config
echo.
echo [*] Deploying SupplyTrace UUPS contracts to localhost...
cd /d "%~dp0smart-contracts"
call npx hardhat deploy --network localhost --reset
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Contract deployment to local node failed.
    cd /d "%~dp0"
    if "%CLI_ARG%"=="" pause
    if not "%CLI_ARG%"=="" exit /b 1
    goto MAIN_MENU
)

echo [*] Exporting contract ABI and address to frontend...
call npx hardhat run scripts/export-frontend.ts --network localhost
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to export frontend contract configuration.
    cd /d "%~dp0"
    if "%CLI_ARG%"=="" pause
    if not "%CLI_ARG%"=="" exit /b 1
    goto MAIN_MENU
)
cd /d "%~dp0"

:: Step 3: Launch Frontend
echo.
echo [*] Checking port 5173 for Vite dev server...
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend is already running on http://localhost:5173
    start http://localhost:5173
    if "%CLI_ARG%"=="" pause
    if not "%CLI_ARG%"=="" exit /b 0
    goto MAIN_MENU
)

echo [*] Starting Vite Frontend dev server...
echo [TIP] Press Ctrl+C in this terminal when you wish to stop the frontend.
ping -n 2 127.0.0.1 >nul
start http://localhost:5173
call npm run dev --prefix frontend
if not "%CLI_ARG%"=="" exit /b 0
goto MAIN_MENU

:: =====================================================================
:: [2] FRONTEND ONLY (Sepolia / Existing Network)
:: =====================================================================
:OP_FRONTEND_ONLY
cls
echo =====================================================================
echo                     Starting Frontend Dev Server
echo =====================================================================
echo.
call :CHECK_PREREQS
if %ERRORLEVEL% NEQ 0 (
    if not "%CLI_ARG%"=="" exit /b 1
    goto MAIN_MENU
)

echo.
echo [*] Launching Vite development server...
start http://localhost:5173
call npm run dev --prefix frontend
if not "%CLI_ARG%"=="" exit /b 0
goto MAIN_MENU

:: =====================================================================
:: [3] START LOCAL HARDHAT NODE ONLY
:: =====================================================================
:OP_NODE_ONLY
cls
echo =====================================================================
echo                     Local Hardhat Blockchain Node
echo =====================================================================
echo.
call :CHECK_PREREQS
if %ERRORLEVEL% NEQ 0 (
    if not "%CLI_ARG%"=="" exit /b 1
    goto MAIN_MENU
)

netstat -ano | findstr /R /C:":8545 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARN] An instance is already listening on port 8545.
    if "%CLI_ARG%"=="" pause
    if not "%CLI_ARG%"=="" exit /b 0
    goto MAIN_MENU
)

echo [*] Launching node on port 8545 in a dedicated window...
start "SupplyTrace - Local Hardhat Node (Port 8545)" cmd /k "cd /d "%~dp0smart-contracts" && npx hardhat node"
echo [OK] Hardhat node window launched.
if "%CLI_ARG%"=="" pause
if not "%CLI_ARG%"=="" exit /b 0
goto MAIN_MENU

:: =====================================================================
:: [4] DEPLOY CONTRACTS TO LOCALHOST
:: =====================================================================
:OP_DEPLOY_LOCAL
cls
echo =====================================================================
echo                Deploy Contracts to Localhost ^& Export
echo =====================================================================
echo.
call :CHECK_PREREQS
if %ERRORLEVEL% NEQ 0 (
    if not "%CLI_ARG%"=="" exit /b 1
    goto MAIN_MENU
)

netstat -ano | findstr /R /C:":8545 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto DEPLOY_NO_NODE

cd /d "%~dp0smart-contracts"
echo [*] Deploying SupplyTrace UUPS Proxy on localhost...
call npx hardhat deploy --network localhost --reset
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Contract deployment failed.
    cd /d "%~dp0"
    if not "%CLI_ARG%"=="" exit /b 1
    pause
    goto MAIN_MENU
)

echo [*] Exporting configuration to frontend...
call npx hardhat run scripts/export-frontend.ts --network localhost
cd /d "%~dp0"
echo.
echo [OK] Deployment and export completed successfully.
if "%CLI_ARG%"=="" pause
if not "%CLI_ARG%"=="" exit /b 0
goto MAIN_MENU

:DEPLOY_NO_NODE
echo [ERROR] No local node detected on port 8545.
echo Please start the node first using Option [1] or Option [3].
echo.
if not "%CLI_ARG%"=="" exit /b 1
pause
goto MAIN_MENU


:: =====================================================================
:: [5] RUN UNIT TESTS
:: =====================================================================
:OP_TESTS
cls
echo =====================================================================
echo                Running Smart Contract Test Suite
echo =====================================================================
echo.
call :CHECK_PREREQS
if %ERRORLEVEL% NEQ 0 (
    if not "%CLI_ARG%"=="" exit /b 1
    goto MAIN_MENU
)
echo.
call npm test
set "TEST_EXIT=!ERRORLEVEL!"
echo.
if !TEST_EXIT! EQU 0 (
    echo [OK] All smart contract unit tests passed.
) else (
    echo [ERROR] Test suite encountered failures.
)
echo.
if "%CLI_ARG%"=="" pause
if not "%CLI_ARG%"=="" exit /b !TEST_EXIT!
goto MAIN_MENU

:: =====================================================================
:: [6] BUILD PRODUCTION MONOREPO
:: =====================================================================
:OP_BUILD
cls
echo =====================================================================
echo                Building Contracts ^& Frontend Bundle
echo =====================================================================
echo.
call :CHECK_PREREQS
if %ERRORLEVEL% NEQ 0 (
    if not "%CLI_ARG%"=="" exit /b 1
    goto MAIN_MENU
)
echo.
call npm run build
set "BUILD_EXIT=!ERRORLEVEL!"
if !BUILD_EXIT! EQU 0 (
    echo.
    echo [OK] Production build completed successfully!
    echo Output directory: frontend\dist
) else (
    echo.
    echo [ERROR] Build failed. Please review compiler logs above.
)
echo.
if "%CLI_ARG%"=="" pause
if not "%CLI_ARG%"=="" exit /b !BUILD_EXIT!
goto MAIN_MENU

:: =====================================================================
:: [7] STRICT TYPECHECK & LINT
:: =====================================================================
:OP_LINT
cls
echo =====================================================================
echo                Running TypeScript Typecheck ^& Linting
echo =====================================================================
echo.
call :CHECK_PREREQS
if %ERRORLEVEL% NEQ 0 (
    if not "%CLI_ARG%"=="" exit /b 1
    goto MAIN_MENU
)
echo.
echo [*] Running TypeScript strict typecheck (tsc -b)...
cd /d "%~dp0frontend"
call npx tsc -b
set "TSC_EXIT=!ERRORLEVEL!"
if !TSC_EXIT! EQU 0 (
    echo [OK] TypeScript typecheck passed with 0 errors.
) else (
    echo [ERROR] TypeScript compilation errors detected.
)
echo.
echo [*] Running ESLint across frontend codebase...
call npx eslint .
set "LINT_EXIT=!ERRORLEVEL!"
if !LINT_EXIT! EQU 0 (
    echo [OK] ESLint completed with 0 errors.
)
cd /d "%~dp0"
echo.
if "%CLI_ARG%"=="" pause
if not "%CLI_ARG%"=="" (
    if !TSC_EXIT! NEQ 0 exit /b !TSC_EXIT!
    if !LINT_EXIT! NEQ 0 exit /b !LINT_EXIT!
    exit /b 0
)
goto MAIN_MENU

:: =====================================================================
:: [8] VERIFY / REINSTALL DEPENDENCIES
:: =====================================================================
:OP_INSTALL_DEPS
cls
echo =====================================================================
echo                   Dependency Verification ^& Repair
echo =====================================================================
echo.
echo  [1] Normal install (preserve existing node_modules)
echo  [2] Clean reinstall (purge node_modules and clean install)
echo  [0] Back to Main Menu
echo.
if not "%CLI_ARG%"=="" (
    set "DEPOPT=1"
) else (
    set "DEPOPT="
    set /p DEPOPT="Select an install option (0-2): "
)

if "%DEPOPT%"=="1" (
    echo.
    echo [*] Installing smart-contracts dependencies...
    call npm ci --prefix smart-contracts
    echo [*] Installing frontend dependencies...
    call npm ci --prefix frontend
    echo [*] Installing subgraph dependencies...
    call npm install --prefix subgraph
    echo [OK] Dependency check complete.
    if "%CLI_ARG%"=="" pause
    if not "%CLI_ARG%"=="" exit /b 0
    goto MAIN_MENU
)

if "%DEPOPT%"=="2" (
    echo.
    echo [WARN] This will remove existing node_modules and reinstall cleanly.
    set "CONFIRM="
    set /p CONFIRM="Are you sure you want to proceed? (y/N): "
    if /i "!CONFIRM!"=="y" (
        echo [*] Removing smart-contracts\node_modules...
        if exist "smart-contracts\node_modules" rmdir /s /q "smart-contracts\node_modules"
        echo [*] Removing frontend\node_modules...
        if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
        echo [*] Removing subgraph\node_modules...
        if exist "subgraph\node_modules" rmdir /s /q "subgraph\node_modules"
        echo [*] Installing smart-contracts...
        call npm ci --prefix smart-contracts
        echo [*] Installing frontend...
        call npm ci --prefix frontend
        echo [*] Installing subgraph...
        call npm install --prefix subgraph
        echo [OK] Clean reinstallation complete.
    ) else (
        echo [*] Operation cancelled.
    )
    if "%CLI_ARG%"=="" pause
    goto MAIN_MENU
)

goto MAIN_MENU

:: =====================================================================
:: [0] EXIT
:: =====================================================================
:OP_EXIT
echo Exiting launcher. Happy hacking!
exit /b 0
