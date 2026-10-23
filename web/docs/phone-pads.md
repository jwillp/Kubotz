# Phone pads (exploration)

Phones on the same Wi-Fi as the PC become gamepads. Each phone opens a controller
page served by the dev server; the game sees it as one more browser gamepad
(standard mapping), so menus, joining a slot with A, Start / Select and the match
all work as with a real pad. The setup screen names them Phone 1, Phone 2...

## Try it

1. In WSL: `cd web && npm run pads` (Vite on port 5180, listening on every interface).
2. WSL2 uses NAT networking, so phones can't reach WSL directly. In an **admin**
   PowerShell on Windows: `powershell -ExecutionPolicy Bypass -File tools\phone-pads-forward.ps1`
   (from the repo's `web` folder, e.g. `\\wsl$\Ubuntu\home\...\web`). It forwards
   port 5180 to WSL, opens it in the firewall for private networks, and prints the
   URLs to open. WSL's IP changes on restart: run it again then. `-Remove` undoes it.
   If the Wi-Fi is marked as a Public network in Windows, set it to Private (or the
   firewall rule won't apply).
   Alternative: WSL mirrored networking (`networkingMode=mirrored` in `%UserProfile%\.wslconfig`)
   needs no port proxy, only the firewall rule.
3. Open `http://localhost:5180/` on the PC, and `http://<PC's LAN IP>:5180/pad.html`
   on each phone, held sideways. Press A on the phone in the setup screen to join.

## Layout

The owner's pad layout (game/Input.ts PAD_BINDING): A fists, X legs, B / Y jump,
LB / RB grab, LT / RT shield, Start pause, Select (QUIT) quit, a Taunt button
(D-pad up). The stick floats: it centres wherever the left thumb lands, and a quick
swipe counts as a flick (dash, smash with A, drop through). No right stick yet:
smashes are flick + A. Buttons slide: dragging from one button to the next presses it.
Hits on a phone player's Kubot buzz the phone (Android; iPhones can't vibrate from a page).

## How it works

- `tools/phone-pads.ts`: a Vite plugin (dev and preview servers) with a WebSocket
  relay at `/__pads`. Phones send `{t:'s', b, x, y}` (a bit per standard button, the
  stick) on every change and twice a second; the relay passes it to the game pages.
- `src/net/PhonePads.ts`: wraps `navigator.getGamepads()` to add one pad per phone,
  at indices 4 and up (after the browser's own four), kept while a phone reconnects.
  Static builds (artifacts) have no relay and quietly skip it.
- `pad.html` + `src/pad/main.ts`: the controller page.

Latency is one Wi-Fi hop plus a frame; plain HTTP (no HTTPS) means no gyro and no
install-as-app prompt, which a later pass could add.
