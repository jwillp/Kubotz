# Phone pads on WSL2 (NAT networking): lets phones on the LAN reach the dev server
# running inside WSL. Run in an admin PowerShell on Windows, after `npm run pads` in WSL:
#   powershell -ExecutionPolicy Bypass -File tools\phone-pads-forward.ps1
# WSL's IP changes when it restarts: run it again then. Undo with -Remove.
param([int]$Port = 5180, [switch]$Remove)

$rule = "Kubotz phone pads $Port"
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$Port | Out-Null
if ($Remove) {
  Remove-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue
  Write-Host "Removed the forward and firewall rule for port $Port."
  exit
}

$wsl = ((wsl.exe hostname -I) -split '\s+' | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' })[0]
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$Port connectaddress=$wsl connectport=$Port
if (-not (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $rule -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private | Out-Null
}

Write-Host "Forwarding port $Port to WSL ($wsl). On a phone on the same Wi-Fi, open one of:"
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notmatch '^(127|169\.254|172\.(1[6-9]|2\d|3[01]))\.' } |
  ForEach-Object { Write-Host "  http://$($_.IPAddress):$Port/pad.html   ($($_.InterfaceAlias))" }
Write-Host "The game itself: http://localhost:$Port/ on this PC."
