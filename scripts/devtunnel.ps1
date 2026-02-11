param(
  [int]$Port = 8080
)

Write-Host "=== Dev Tunnel helper ==="
Write-Host "Port: $Port"
Write-Host ""
Write-Host "1) Make sure you have Dev Tunnels CLI installed and logged in:"
Write-Host "   - Install (winget): winget install Microsoft.devtunnel"
Write-Host "   - Or download: https://aka.ms/TunnelsCliDownload/win-x64"
Write-Host "   - Login: devtunnel user login"
Write-Host ""
Write-Host "2) This script will build, start the Next.js server and host a dev tunnel."
Write-Host ""

# Build
Write-Host "Running: npm run build"
npm run build

# Start Next.js in background
Write-Host "Starting Next.js (production) on port $Port..."
# Start the next start as a detached process
$np = Start-Process -FilePath "npx" -ArgumentList "next start -p $Port" -NoNewWindow -PassThru
Start-Sleep -Seconds 2

Write-Host "Process started (PID: $($np.Id)). Now creating dev tunnel..."
Write-Host ""

# Host dev tunnel (will keep running in foreground)
try {
  # Prefer system devtunnel if available
  $devtunnelCmd = "devtunnel"
  $which = (Get-Command $devtunnelCmd -ErrorAction SilentlyContinue)
  if (-not $which) {
    Write-Host "Local 'devtunnel' not found in PATH. Trying 'npx @microsoft/dev-tunnels-ssh'..."
    & npx @microsoft/dev-tunnels-ssh host -p $Port
  } else {
    & devtunnel host -p $Port
  }
} catch {
  Write-Error "Failed to start dev tunnel: $_"
  Write-Host "You can manually run: devtunnel host -p $Port  (or use npx @microsoft/dev-tunnels-ssh host -p $Port)"
}


