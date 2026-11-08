# Current implementation — November 8, 2026

KESTREL RECALL is a playable Earth-to-Moon-and-back expedition including the browser rescue with a Python service and implemented provider adapters. Local gameplay and integration tests pass. Live provider/account verification and public deployment remain open.

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

- 39 frontend/game/campaign/audio/hardware protocol tests and 26 Python tests pass. Tests cover a winning route, guarded commands, physical navigation, truthful reset memory, client proposal validation, provider protocol success/failure/timeout, delayed replies across loops, two-phase acknowledgement, duplicate IDs, SQLite restart persistence, demo isolation, body/origin/usage bounds, speech authorization/cache, and recording frame limits.
- TypeScript typecheck and production build pass.
- Browser integration checked against the actual Python service: mission-memory save status, radio request/response, honest offline mode, distinct Sam/ECHO replies, and an actual radio request to Mara that passed through Python proposal → client reducer → Python completion receipt. The earlier full rescue and movement checks remain recorded in the demo script; the current automated rescue still passes.
- External calls in tests use mocked transports. No live Gemini or ElevenLabs success is asserted.
- The Dockerfile and lockfiles prepare same-origin Python hosting, but container build, real-device performance, 390px/desktop breakpoint review, public deployment, actual provider latency and a backup recording remain unverified.

Start with docs/backend.md for setup, docs/demo-script.md for play controls, and docs/judging-demo.md for the integration demonstration.

## Connected expedition

Earth launch, three interactive ISS preparation stations, successful-rescue continuation, recovery/resupply transition, Scout lunar camera mission, and a crew discovery ending are implemented. Ghost Frame snapshot `3f38071` supplies the simulation/prediction/learning/rendering foundation. Paired passes preserve separate delayed observations and private evaluation truth, reset the same seed and learner, and expose actual results with JSON export. Python stores validated anonymous campaign checkpoints and provides grounded read-only Gemini chapter guidance with labelled offline/fallback modes. Mars remains a future chapter. Physical hardware is not connected. See expedition.md for controls, source provenance, and verification scope.

Browser campaign verification: Earth launch and skippable flight, all three ISS preparation checks, transition into the rescue, saved lunar resume, both delayed/predicted survey passes, validated result persistence, the discovery ending, and authored ECHO expedition guidance were exercised against the local Python service. The same-origin hardware lab and printable marker pages render; no camera permission, serial connection, loaded servo operation, or calibrated RIG performance was tested.

## Radio, music, movement, and the ISS watch

Normal walking is 275 world units/s (previously 165); demo walking is 320 (previously 210). Engineer return takes six seconds in normal play, and the medical transfer takes twelve. The ISS walk transition is 380 ms. Collision checks and rescue interlocks are unchanged.

Scenario music is synthesized locally, with six moods and independent music/radio/effects controls. A shared half-duplex radio uses available device voices without provider credentials, optional ElevenLabs station clips with device fallback, 350 ms initial connection time, and 650 ms between turns. Music falls to 16% of the selected volume during actual speech. Tests cover sequential turns, gaps, cancellation/late callbacks, muting/subtitles, duck/recovery callbacks, and optional-provider failure. Device voice quality and availability vary by browser/OS. No claim of live ElevenLabs verification is made.

Scout is now a consistent visible animated companion in the ISS bay, on the walkable lunar field, and beside the remote controls. New campaigns require both field checks, deployment at the outpost, and return to the ISS before ML comparison trials. Schema-v1 saves migrate without losing results. The final ISS watch keeps receiving locally simulated delayed observations while the page is visible. These are SIM observations, not hardware data or a background service running after the browser closes.

The floating campaign chat was replaced with a crew-radio strip, optional transmission controls, and actual playback-source indicators. The existing optional player recording/transcription path remains available in station radio; microphones are never activated automatically. See audio-and-gemini.md for provider setup and audio behavior.

Current browser verification also covered the full faster rescue, both lunar field inspections with Scout following Alex, leaving the rover deployed, returning the crew to the ISS, both scored remote passes, resumed ongoing SIM observations, actual device-voice on-air events, audio-control labels, and an authored ECHO reply describing the returned crew and deployed rover. The local Gemini key/model are not configured, so no account-backed generation is claimed.
