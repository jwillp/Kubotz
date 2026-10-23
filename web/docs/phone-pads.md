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
   port 5180 to WSL, opens it in the firewall to the local subnet, and prints the
   URLs to open. WSL's IP changes on restart: run it again then. `-Remove` undoes it.
   Alternative: WSL mirrored networking (`networkingMode=mirrored` in `%UserProfile%\.wslconfig`)
   needs no port proxy, only the firewall rule.
3. Open `http://localhost:5180/` on the PC, and `http://<PC's LAN IP>:5180/pad.html`
   on each phone, held sideways. Press A on the phone in the setup screen to join.

## Layouts

The phone opens on a layout screen (first visit), and the LAYOUT button in the top
bar comes back to it; the choice is kept on the phone, and `?layout=` picks one
(classic, swipe, zones, lean, onehand). The top bar is the same in all of them:
QUIT (Select), the connection, START. Hits on a phone player's Kubot buzz the phone
(Android; iPhones can't vibrate from a page).

1. **Gamepad**: the owner's pad layout (game/Input.ts PAD_BINDING): A fists, X legs,
   B / Y jump, LB / RB grab, LT / RT shield, Taunt (D-pad up). The stick floats: it
   centres wherever the left thumb lands, and a quick swipe counts as a flick (dash,
   smash with A, drop through). Buttons slide: dragging from one to the next presses it.
2. **Swipe pad**: the stick, and one big attack pad: tap = fists (sent on lift, so a
   swipe is never a jab too), swipe = the right stick that way (smash, or an aerial in
   the air), two fingers = legs, hold still = shield, a GRAB button in its corner.
   Jump is a flick up on the stick (tap jump).
3. **Big zones**: the left half moves (an invisible stick wherever the thumb lands),
   the right half is three bands the thumb slides between (jump, fists, legs), shield
   and grab run along the top edges.
4. **Lean to move**: tilt the phone like a wheel: walk, run past ~28 degrees, a quick
   tilt is a flick. Up / down, shield, grab on the left thumb, jump / fists / legs on
   the right. Phones only share motion with secure pages: open the HTTPS address
   (port + 1, see below), accept the certificate warning once, then Start tilt.
   Re-centre takes the current angle as straight; the swap button swaps left and right
   if a phone reports it reversed.
5. **One hand** (upright): the top shows your Kubot (health %, lives, guard, weapon and
   power-ups, the damage of each hit) sent by the game; one thumb plays below: drag to
   move (all the way up jumps), let go to punch the way you dragged, tap = jab, double
   tap = legs, hold still = shield, a second finger = grab.

## HTTPS (tilt layout)

With `npm run pads` the dev server also opens an HTTPS door one port up (5181) that
passes pages and sockets on to it, with a self-signed certificate made once with
openssl (node_modules/.cache/kubotz-phone-pads). The forward script forwards both ports.

## How it works

- `tools/phone-pads.ts`: a Vite plugin (dev and preview servers) with a WebSocket
  relay at `/__pads`. Phones send `{t:'s', b, x, y}` (a bit per standard button, the
  stick) on every change and twice a second; the relay passes it to the game pages.
- `src/net/PhonePads.ts`: wraps `navigator.getGamepads()` to add one pad per phone,
  at indices 4 and up (after the browser's own four), kept while a phone reconnects.
  Static builds (artifacts) have no relay and quietly skip it.
- `pad.html` + `src/pad/`: the controller page. `link.ts` holds the state and the
  socket (each part of a layout holds its own bits, plus short pulses for taps and
  right-stick swipes), `touch.ts` the shared floating stick and sliding buttons,
  `layouts/` one file per layout, `main.ts` the top bar and the layout screen.
- The game sends each phone `{t:'info', ...}` about its Kubot a few times a second
  (GameScene.buzzPhones, PhonePads.sendPhoneInfo) for the one-hand screen.

Latency is one Wi-Fi hop plus a frame.
