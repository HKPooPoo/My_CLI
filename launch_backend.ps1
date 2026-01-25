<#
.SYNOPSIS
    One-Click Backend Launcher & Diagnostic Tool for My CLI.
    Handles XAMPP (Apache/MySQL) and Cloudflare Tunnel.

.DESCRIPTION
    1. Checks if Apache (Port 80) and MySQL (Port 3306) are listening.
    2. Checks if valid Cloudflare Tunnel process is running.
    3. Auto-starts missing services.
    4. Displays a status dashboard.
    5. Launches the project in the default browser.
#>

$ErrorActionPreference = "SilentlyContinue"

# --- CONFIGURATION ---
$XAMPP_ROOT = "C:\xampp"
$PROJECT_ROOT = "C:\xampp\htdocs\My"
$APACHE_START = "$XAMPP_ROOT\apache_start.bat"
$MYSQL_START = "$XAMPP_ROOT\mysql_start.bat"
$CLOUDFLARE_EXE = "$PROJECT_ROOT\cloudflared.exe"
$PROJECT_URL = "http://localhost/My/index.html"
$CLOUDFLARE_CMD = "tunnel --url http://localhost:80"

# --- COLORS ---
$ColorGreen = "Green"
$ColorRed = "Red"
$ColorYellow = "Yellow"
$ColorCyan = "Cyan"

function Print-Header {
    Clear-Host
    Write-Host "===================================================" -ForegroundColor $ColorCyan
    Write-Host "   MY CLI - BACKEND LAUNCHER" -ForegroundColor $ColorCyan
    Write-Host "===================================================" -ForegroundColor $ColorCyan
    Write-Host ""
}

function Test-PortOnly {
    param([int]$Port)
    $tcp = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $tcp)
}

function Start-ProcessHidden {
    param([string]$FilePath, [string]$ArgumentList, [string]$WorkDir)
    Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkDir -WindowStyle Hidden
}

# --- MAIN EXECUTION ---
Print-Header

# 1. APACHE CHECK
Write-Host "[1/3] Checking Apache Web Server (Port 80)..." -NoNewline
if (Test-PortOnly 80) {
    Write-Host " [RUNNING]" -ForegroundColor $ColorGreen
}
else {
    Write-Host " [DOWN]" -ForegroundColor $ColorRed
    Write-Host "      Attempting to start Apache..." -ForegroundColor $ColorYellow
    if (Test-Path $APACHE_START) {
        Write-Host "      ...Starting Apache (Minimized Window)..." -ForegroundColor $ColorYellow
        # Use cmd /c start /min to launch the batch file securely in a new minimized console
        Start-Process "cmd.exe" -ArgumentList "/c start /min $APACHE_START" -WorkingDirectory $XAMPP_ROOT -WindowStyle Hidden
        Start-Sleep -Seconds 5
    }
    else {
        Write-Host "      [ERROR] Could not find start script: $APACHE_START" -ForegroundColor $ColorRed
    }
}

# 2. MYSQL CHECK
Write-Host "[2/3] Checking MySQL Database (Port 3306)..." -NoNewline
if (Test-PortOnly 3306) {
    Write-Host " [RUNNING]" -ForegroundColor $ColorGreen
}
else {
    Write-Host " [DOWN]" -ForegroundColor $ColorRed
    Write-Host "      Attempting to start MySQL..." -ForegroundColor $ColorYellow
    if (Test-Path $MYSQL_START) {
        Start-ProcessHidden $MYSQL_START "" $XAMPP_ROOT
        Start-Sleep -Seconds 3
    }
    else {
        Write-Host "      [ERROR] Could not find start script: $MYSQL_START" -ForegroundColor $ColorRed
    }
}

# 3. CLOUDFLARE CHECK
Write-Host "[3/3] Checking Cloudflare Tunnel..." -NoNewline
$cfProcess = Get-Process "cloudflared" -ErrorAction SilentlyContinue
if ($cfProcess) {
    Write-Host " [RUNNING]" -ForegroundColor $ColorGreen
}
else {
    Write-Host " [DOWN]" -ForegroundColor $ColorRed
    Write-Host "      Attempting to start Cloudflare Tunnel..." -ForegroundColor $ColorYellow
    if (Test-Path $CLOUDFLARE_EXE) {
        # Start cloudflare outputting to a log file so it doesn't block or clutter
        $ArgList = "/c $CLOUDFLARE_EXE $CLOUDFLARE_CMD > tunnel.log 2>&1"
        Start-Process -FilePath "cmd.exe" -ArgumentList $ArgList -WorkingDirectory $PROJECT_ROOT -WindowStyle Hidden
        Start-Sleep -Seconds 2
    }
    else {
        Write-Host "      [ERROR] Could not find executable: $CLOUDFLARE_EXE" -ForegroundColor $ColorRed
    }
}

# --- FINAL STATUS REPORT ---
Print-Header
Write-Host "STATUS REPORT:" -ForegroundColor $ColorYellow

# Check Apache again
$statusApache = if (Test-PortOnly 80) { "ONLINE" } else { "OFFLINE" }
$colorApache = if ($statusApache -eq "ONLINE") { $ColorGreen } else { $ColorRed }
Write-Host "Apache (Web):      " -NoNewline
Write-Host $statusApache -ForegroundColor $colorApache

# Check MySQL again
$statusMySQL = if (Test-PortOnly 3306) { "ONLINE" } else { "OFFLINE" }
$colorMySQL = if ($statusMySQL -eq "ONLINE") { $ColorGreen } else { $ColorRed }
Write-Host "MySQL (DB):        " -NoNewline
Write-Host $statusMySQL -ForegroundColor $colorMySQL

# Check Cloudflare again
$cfProcess = Get-Process "cloudflared" -ErrorAction SilentlyContinue
$statusCF = if ($cfProcess) { "ONLINE (PID: $($cfProcess.Id))" } else { "OFFLINE" }
$colorCF = if ($cfProcess) { $ColorGreen } else { $ColorRed }
Write-Host "Cloudflare Tunnel: " -NoNewline
Write-Host $statusCF -ForegroundColor $colorCF

# Display Tunnel URL (New Logic)
if ($statusCF -ne "OFFLINE") {
    Start-Sleep -Seconds 2 
    if (Test-Path "$PROJECT_ROOT\tunnel.log") {
        $logContent = Get-Content "$PROJECT_ROOT\tunnel.log" -Raw
        if ($logContent -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
            $tunnelUrl = $matches[0]
            Write-Host ""
            Write-Host "---------------------------------------------------" -ForegroundColor Yellow
            Write-Host " NEW TUNNEL URL DETECTED" -ForegroundColor Yellow
            Write-Host " $tunnelUrl" -ForegroundColor Cyan
            Write-Host "---------------------------------------------------" -ForegroundColor Yellow
            Write-Host "---------------------------------------------------" -ForegroundColor Yellow
            Write-Host " NEW TUNNEL URL DETECTED: $tunnelUrl/My/" -ForegroundColor Cyan
            Write-Host "---------------------------------------------------" -ForegroundColor Yellow

            # --- AUTO-UPDATE DataManager.js ---
            $JSFile = "$PROJECT_ROOT\JavaScript\DataManager.js"
            if (Test-Path $JSFile) {
                # Read content
                $jsContent = Get-Content $JSFile -Raw
                
                # Siple Regex: Look for this.apiBase = '...';
                # We use single quotes in the JS file, so we just match that.
                $newJsContent = $jsContent -replace "this\.apiBase = '.*';", "this.apiBase = '$tunnelUrl/My/PHP/';"
                
                # Write back
                Set-Content -Path $JSFile -Value $newJsContent -Encoding Ascii -NoNewline
                Write-Host " [AUTO-FIX] Updated DataManager.js with new API Base URL" -ForegroundColor Green
            }
            else {
                Write-Host " [ERROR] Could not find DataManager.js at $JSFile" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
if ($statusApache -eq "ONLINE" -and $statusMySQL -eq "ONLINE") {
    Write-Host "System Ready! Launching Browser..." -ForegroundColor $ColorGreen
    Start-Sleep -Seconds 2
    
    # Launch Logic: Prefer Tunnel URL if found, otherwise Localhost
    if ($tunnelUrl) {
        # Valid Tunnel URL found - Launch it (Appends /My/ automatically)
        $LaunchTarget = "$tunnelUrl/My/"
        Write-Host "Opening: $LaunchTarget" -ForegroundColor Cyan
        Start-Process $LaunchTarget
    }
    else {
        # Fallback to Localhost
        Write-Host "Opening: $PROJECT_URL" -ForegroundColor Cyan
        Start-Process $PROJECT_URL
    }
}
else {
    Write-Host "Some services failed to start. Please check logs manually." -ForegroundColor $ColorRed
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
