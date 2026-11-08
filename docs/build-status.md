# Current implementation — November 8, 2026

KESTREL RECALL is a playable browser rescue with a Python service and implemented provider adapters. Local gameplay and integration tests pass. Live provider/account verification and public deployment remain open.

## Playable game

Original illustrated top-down station, smooth WASD/arrows and click walking, wall/door collision, contextual E actions, directed objectives, crew movement, eight-minute normal mission and disclosed three-minute demo. A full rescue works with authored controls. Battery power, safe bypass, oxygen, irreversible shutdown, Medical power, patient transfer, five-person manifest and launch all use a deterministic reducer. Both timeout paths and retry work. Resets restore physical state and retain observed facts; end-of-attempt summaries can identify a genuinely missing preparation. Original sirens, impact/equipment sounds, emergency messages, subtitles, reduced motion, pause, mute and volume controls are implemented.

## Python backend

FastAPI replaces the former Express placeholder. SQLite stores sanitized observed memory, bounded action receipts, speech authorization and cached audio. Anonymous same-site HttpOnly sessions scope normal and demo data. Development uses a frontend proxy; production serves the browser build and API together. Payloads, origins, text, usage, concurrency and actual recording duration are bounded. No provider secret is sent to the browser.

## Gemini

The server-side REST adapter implements grounded character dialogue and function-call interpretation. ECHO, Mara, Imani and Sam have separate profiles, knowledge and command permissions. Tools read status, recall observations, explain prerequisites, request the bypass, request patient transfer, and assign released Medical power. Mutation proposals require a second game-side validation and server acknowledgement before a completion line can be spoken. The UI exposes mode, latency and evidence/tool receipts. Provider timeout/error paths release processing pauses and return authored guidance. Old-loop and duplicate requests have no extra effect.

Gemini is not currently live in this checkout: `.env.local` has no configured key/model. The adapter is covered by mock-provider HTTP integration tests, not an account-backed generation. Set credentials locally as described in backend.md; do not claim a live demonstration until that check passes.

## ElevenLabs

Optional server-side TTS and transcription adapters are implemented. Story lines come from a shared checked-in script; generated radio speech uses server-issued tokens. Audio is cached and played through one interruptible channel. Ten-second recording capture converts to mono 16 kHz PCM WAV; Python verifies actual frame count. Permission denial, transcription errors, unavailable voice and skipped playback preserve text playability. No raw recording is persisted by this application.

ElevenLabs credentials/voice IDs are not configured; live voice and microphone/provider latency are unverified. Gemini-only use is supported. Browser-generated effects are independent of provider voice.

## Verification and delivery limits

- 26 frontend/game tests and 22 Python tests pass. Tests cover a winning route, guarded commands, physical navigation, truthful reset memory, client proposal validation, provider protocol success/failure/timeout, delayed replies across loops, two-phase acknowledgement, duplicate IDs, SQLite restart persistence, demo isolation, body/origin/usage bounds, speech authorization/cache, and recording frame limits.
- TypeScript typecheck and production build pass.
- Browser integration checked against the actual Python service: mission-memory save status, radio request/response, honest offline mode, distinct Sam/ECHO replies, and an actual radio request to Mara that passed through Python proposal → client reducer → Python completion receipt. The earlier full rescue and movement checks remain recorded in the demo script; the current automated rescue still passes.
- External calls in tests use mocked transports. No live Gemini or ElevenLabs success is asserted.
- The Dockerfile and lockfiles prepare same-origin Python hosting, but container build, real-device performance, 390px/desktop breakpoint review, public deployment, actual provider latency and a backup recording remain unverified.

Start with docs/backend.md for setup, docs/demo-script.md for play controls, and docs/judging-demo.md for the integration demonstration.
