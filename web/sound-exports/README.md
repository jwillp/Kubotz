# Sound exports

The sounds the game makes in code (src/data/sounds), rendered to WAV files
(44.1 kHz, 16-bit, mono) by the editor's Sound tab: Export WAV / Export all
WAVs. On the dev server (`npm run dev`, Title → Editor → Sounds) they are
written here; on a published page they download as a zip.

They are a fixed copy of each sound: the game still renders the sounds
from src/data/sounds at boot (in a worker), with the same result in every
browser, since the synth is plain math over samples with seeded noise.
Re-export after editing a sound to keep this copy current.
