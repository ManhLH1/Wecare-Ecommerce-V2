param(
  [int]$Port = 8080
)

Write-Host "=== Dev Tunnel for Development Mode ==="
Write-Host "Port: $Port"
Write-Host ""
Write-Host "Instructions:"
Write-Host "1. Open a new terminal/command prompt"
Write-Host "2. Run: npm run dev"
Write-Host "3. Wait for Next.js to start on http://localhost:$Port"
Write-Host "4. Come back here and press Enter to create the tunnel"
Write-Host ""

Read-Host "Press Enter after Next.js dev server is running"

Write-Host ""
Write-Host "Creating dev tunnel for port $Port..."
Write-Host "Share the tunnel URL with your testers."
Write-Host "Keep this window open. Press Ctrl+C to stop the tunnel."
Write-Host ""

# Create dev tunnel
try {
  devtunnel host -p $Port --allow-anonymous
} catch {
  Write-Error "Failed to start dev tunnel: $_"
  Write-Host ""
  Write-Host "Troubleshooting:"
  Write-Host "1. Make sure you're logged in: devtunnel user login"
  Write-Host "2. Install devtunnel CLI: winget install Microsoft.devtunnel"
  Write-Host "3. Or manually run: devtunnel host -p $Port --allow-anonymous"
}
