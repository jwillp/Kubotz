# Phone pads on WSL2 (NAT networking): lets phones on the LAN reach the dev server
# running inside WSL. Run in an admin PowerShell on Windows, after `npm run pads` in WSL:
#   powershell -ExecutionPolicy Bypass -File tools\phone-pads-forward.ps1
# Forwards the dev server's port and the HTTPS door one port up (the tilt layout).
# WSL's IP changes when it restarts: run it again then. Undo with -Remove.
param([int]$Port = 5180, [switch]$Remove)

$ports = @($Port, ($Port + 1))
$wsl = $null
if (-not $Remove) { $wsl = ((wsl.exe hostname -I) -split '\s+' | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' })[0] }
foreach ($p in $ports) {
  $rule = "Kubotz phone pads $p"
  netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$p | Out-Null
  Remove-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue
  if ($Remove) { continue }
  netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$p connectaddress=$wsl connectport=$p
  # Any network profile (home Wi-Fi is often marked Public), but only from the local subnet.
  New-NetFirewallRule -DisplayName $rule -Direction Inbound -Protocol TCP -LocalPort $p -Action Allow -Profile Any -RemoteAddress LocalSubnet | Out-Null
}
if ($Remove) {
  Write-Host "Removed the forwards and firewall rules for ports $($ports -join ', ')."
  exit
}

Write-Host "Forwarding ports $($ports -join ' and ') to WSL ($wsl). On a phone on the same Wi-Fi, open one of:"
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notmatch '^(127|169\.254|172\.(1[6-9]|2\d|3[01]))\.' } |
  ForEach-Object { Write-Host "  http://$($_.IPAddress):$Port/pad.html   ($($_.InterfaceAlias))" }
Write-Host "The tilt layout needs the secure address: https://<same IP>:$($Port + 1)/pad.html?layout=lean (accept the warning once)."
Write-Host "The game itself: http://localhost:$Port/ on this PC."
