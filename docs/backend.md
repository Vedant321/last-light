# Python mission services

The browser owns the deterministic single-player rescue simulation. FastAPI supplies Gemini dialogue and tool interpretation, SQLite observed-memory persistence, approved speech, and optional transcription. This is not a competitive or authoritative multiplayer server: browser snapshots are game input, not proof of a real-world event.

## Run

Requires Node 22.12+, Python 3.12+, and uv. Dependencies are pinned by package-lock.json and uv.lock.

```sh
npm install
npm run setup:backend
cp -n .env.example .env.local
npm run dev
```

Open http://127.0.0.1:5174/. Vite proxies `/api` to Python at port 3001. No Node API remains. `npm run build && npm start` serves the frontend and API together at http://127.0.0.1:3001/.

## Gemini setup

Set `GEMINI_API_KEY` in `.env.local` locally. Never paste a key into radio chat or put it in a VITE_ variable. List models available to that key:

```sh
uv run python scripts/check_providers.py
```

Set `GEMINI_MODEL` to an account-enabled generateContent model from that output. No preview model or account access is assumed. `DIALOGUE_MODE=auto` enables live dialogue when the key and model exist. Restart the Python service after changing settings. In the game, Settings → Reconnect mission services refreshes feature availability; Radio labels each reply as Gemini live, authored offline, or authored fallback.

## What the AI does

ECHO is one grounded coordinator. It can interpret natural-language intent, read current mission telemetry, retrieve observed previous attempts, explain requirements, propose Mara's bypass, propose a prepared bedside transfer, and route released Medical power. Mara, Imani and Sam use the same provider with distinct identities, domain knowledge and tool permissions.

Gemini sees only bounded relevant telemetry, discovered facts, the latest three observed summaries, and the player's current message. It receives at most six recent conversational turns for the selected character, treated as untrusted dialogue rather than verified facts. These turns are held in the browser and discarded on reset; they are not persisted as chat history by Python. The model cannot collect equipment, connect a battery, shut down the Core, board, or launch. Those remain physical player choices. Negative end-of-attempt findings, such as Medical never receiving oxygen, come from the ending state of that attempt rather than model inference.

For actions, the server returns a pending proposal. The browser rechecks the current run, loop, revision, proximity, prerequisites and duplicate request IDs. The reducer executes the allowed action, then the server checks the resulting state before issuing a completion line and speech token. Partial model prose never changes the world. The evidence disclosure in Radio exposes accepted/rejected tool receipts and the actual observed memories used.

## ElevenLabs, optional

Spoken radio already works with device voices. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ECHO` for optional ElevenLabs station replies and authored story lines. Optional ENGINEER, MEDIC and PILOT voice IDs give crew distinct voices; missing IDs use the ECHO voice. Use voices available and authorized in your account. `scripts/check_providers.py` lists available IDs.

The default low-latency TTS model is `eleven_flash_v2_5`, and optional transcription uses `scribe_v2`; both are configurable. Text appears before speech. One shared queued radio speaks one turn at a time with conversation gaps; resets and chapter changes cancel stale turns. Device speech provides a fallback when optional generated voice fails. Fixed approved story lines share the server's bounded audio cache. The speech endpoint accepts only server-issued utterance IDs, not arbitrary caller text.

Record radio message requests microphone access only when clicked. Browser capture stops at ten seconds, converts to mono 16 kHz PCM WAV, and submits the recording to Python. The server verifies the actual WAV frame count, caps body size, and forwards it to ElevenLabs. Microphone audio is never written to disk or SQLite. Denied permissions and failed transcription retain the Type field. Provider data retention follows the provider/account terms; this application does not claim provider-side zero retention.

Voice is optional. Gemini-only operation, authored offline play, keyboard interaction, subtitles and rescue completion all remain available.

## Reliability and persistence

- Gemini calls have a six-second budget, bounded concurrency, and deterministic contextual fallback. All essential processing pauses the mission clock; audio generation/playback does not.
- Recording receives a ten-second maximum capture pause; transcription has its own bounded request. Typed composition does not freeze time.
- Run/loop changes and unmount cancel client requests, speech, recorder and pending playback. The server rejects late previous-loop results.
- Anonymous HttpOnly same-site cookies scope SQLite memory and speech receipts. SQLite stores whitelisted observations, up to three summaries, bounded request receipts and a bounded audio cache. No keys or raw microphone audio are stored there.
- Normal and demo memories are separated. A fresh demo never imports normal clues. Settings → Clear discoveries removes both browser and server memory.
- API payloads, origins, text length, recording frame count, request rate and per-session usage are bounded. There is no generic provider proxy.

## API

| Endpoint | Role |
| --- | --- |
| GET /api/health | Configured feature availability, no secrets |
| GET /api/session | Anonymous session and persisted normal memory |
| POST /api/session/sync | Store sanitized observed memory and active envelope |
| DELETE /api/session/memory | Clear mission memory |
| POST /api/dialogue | Grounded provider reply or pending guarded proposal |
| POST /api/dialogue/complete | Validate result receipt and finalize reply |
| POST /api/narration | Authorize a line from the shared story script |
| POST /api/speech | ElevenLabs audio for an approved speech token |
| POST /api/transcribe | Capped PCM recording → text |

FastAPI’s generated `/docs` and `/openapi.json` routes are available on the Python service for development.

## Verification

```sh
npm run typecheck
npm test
npm run test:backend
npm run build
```

Backend tests exercise the real FastAPI/SQLite layers using mock HTTP transports for external services: provider success/error/timeout, explicit tool proposals and acknowledgement, unknown tools, late-loop responses, duplicate IDs, persisted memory, demo isolation, denied origins, bounded bodies, approved/cached speech, and actual recording length validation. Frontend tests cover reducer rules and client proposal validation. Mock-backed integration tests are not a claim of live provider/account verification.

## Production packaging

A Dockerfile builds the browser and runs Python from the locked environment. Attach a persistent volume at `/data`. Configure provider secrets in the host secret store, `SECURE_COOKIES=true`, and `ALLOWED_ORIGINS` to the exact HTTPS application origin. HTTP-only local development uses non-secure cookies. Microphone capture requires HTTPS outside localhost. Run one origin for browser and API; do not deploy the frontend alone for live provider calls. Container build and public deployment still need verification on the selected host.

## Official implementation references

- [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Gemini REST generateContent](https://ai.google.dev/api/generate-content)
- [ElevenLabs Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [ElevenLabs Create transcript](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)
- [ElevenLabs model IDs](https://elevenlabs.io/docs/overview/models)

## Branding and existing saves

The project is named **Kestrel Recall**. Browser settings and discoveries keep their original `last-light-*` storage keys; the session cookie and default SQLite filename also retain their original identifiers so existing local saves survive the rename. These are compatibility identifiers, not displayed branding.

See [audio-and-gemini.md](audio-and-gemini.md) for the short Gemini setup checklist, scenario music, device voices, conversation gaps, volume ducking, and the future player-voice path.
