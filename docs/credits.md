# Credits

KESTREL RECALL story and game brief: project README.

Original top-down vector station, astronaut characters, room props, Earth illustration, interface, and rescue implementation: original project code. No downloaded art, fonts, recordings, or voice likenesses. Impact noise, sirens, interaction cues and the rescue chime are original synthesized Web Audio effects.

Libraries: React and React DOM (MIT), Three.js (MIT), React Three Fiber (MIT), Vite (MIT), TypeScript (Apache-2.0), tsx (MIT), concurrently (MIT). Dependency license notices remain in their installed packages.

The Echo Core and rescue power units are fictional game mechanics, not spaceflight guidance. Gemini dialogue and optional ElevenLabs station voice adapters are implemented. Account-backed provider verification is still pending; offline and fallback modes are labelled.

Interface references: user-provided Pokémon and Among Us screenshots; official Among Us game page (https://www.innersloth.com/games/among-us/). These informed spatial tasks, contextual interaction and dialogue framing. No assets were copied or downloaded from either game.

Python service libraries: FastAPI, Uvicorn, HTTPX, Pydantic and pydantic-settings. The backend uses Python’s standard SQLite, wave and asyncio libraries. Dependency notices are included in the installed distributions. Gemini and ElevenLabs are optional external services; configured provider availability and per-reply mode are disclosed in the game.

## Ghost Frame / Light Delay

Lunar camera rendering, delay queues, servo simulation, adaptive learning, prediction, target evaluation, and presentation stabilizer adapted from [Vedant321/ghost-frame](https://github.com/Vedant321/ghost-frame), main snapshot `3f38071` (November 8, 2026), as requested by the project owner. Source comments are retained under `src/ghost`; Arduino firmware is retained under `firmware/light_delay`. The source hardware checklist is adapted in docs/rig-checklist.md. Campaign scenes, story integration, React controls, and Python persistence/guidance are developed in this repository. The upstream checkout contains no license file; no new upstream license or redistribution permission is asserted by this credit.
