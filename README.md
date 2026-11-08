# KESTREL RECALL

> Earth is our starting point. The Moon is our next horizon. Save your crew, remember what matters, and explore through the eyes of Scout.

**Status:** playable Earth → ISS → Kestrel → Moon campaign with Python/FastAPI checkpoints, SQLite memory, guarded Gemini rescue tools, read-only expedition guidance, and Ghost Frame’s adaptive camera simulation. Live provider verification, calibrated hardware integration, and deployment remain pending.\
**Prepared:** November 8, 2026.\
**Purpose:** give a coding agent a concrete, staged specification for a playable UB Hacking submission.\
**Current direction:** Kestrel Recall is one connected expedition: launch from Earth, prepare at the ISS, save the crew at Kestrel, then deploy Scout on the Moon. See [the campaign implementation and Ghost Frame integration](docs/expedition.md). The original station-rescue design below documents the middle chapter; its older one-station scope and return-home ending have been expanded by this campaign.

## 1. Start here, building agent

Build a short, polished, single-player browser game. Start with a deterministic rescue loop and a simple station, then connect voice and AI, then improve presentation. Follow the milestones in section 15 in order. Produce a playable increment at each milestone; do not attempt every feature in one pass.

This document specifies desired behavior. Commands, paths, APIs, and environment variables below are the implementation contract to create, not a claim that they already exist. Inspect the destination repository and its instructions before scaffolding. Preserve useful existing code and choose compatible dependencies. Update this README's implementation-status section as work lands.

Make routine implementation decisions autonomously within this scope. Ask only when missing credentials, a genuine external permission, or a material change of direction blocks progress. Do not add features merely to use more sponsors.

The first useful deliverable is a working station hub, an eight-minute timer, one locked engineering hatch, an intercom, and a reset that preserves an observed fact. Prove the full rescue with placeholder visuals before expanding art.

### Product priorities

1. A player understands their situation and first action within 20 seconds.
2. Their actions produce visible, consistent consequences.
3. Failure creates knowledge that helps on the next attempt.
4. The AI remembers specific observed events and helps interpret them.
5. The final escape pays off the people the player rescued.
6. A judge can experience the core mechanic in about three minutes.

### Scope boundary

**Build:** one compact station, three connected rescue spaces, one eight-minute loop, one persistent AI identity, short crew radio conversations, a physical power-routing puzzle, portable oxygen, one complete escape ending, subtitles, text input, and a transparent demo mode.

**Defer:** multiplayer, accounts, realistic orbital mechanics, full zero-gravity locomotion, procedural levels, generative 3D assets, animated faces, combat, crafting, an inventory grid, open-ended AI-generated objectives, and multiple endings requiring new locations.

## 2. The player promise

You are **Alex Vale**, a junior communications technician aboard **KESTREL Station**. A debris strike has damaged the station. An experimental emergency system, the **Echo Core**, can restore the station to a checkpoint eight minutes before its destruction.

The emergency AI, **ECHO**, has reserved power for the evacuation shuttle and sealed damaged compartments. Three crewmates remain trapped: an engineer, a medic, and the medic's injured patient. The pilot is already at the shuttle. You must find a way to reach everyone, establish a safe power configuration, and escape together.

ECHO's protected log survives a reset. Physical objects and completed repairs do not. The player retains learned facts through a small notebook. Human déjà vu is an atmospheric consequence of the fictional technology; it never substitutes for a required repair or action.

ECHO is a competent system operating with incomplete observations. Its emergency plan protects the people it believes it can reach. Show it new evidence and it can revise that plan. Avoid an arbitrary villain AI or a puzzle solved by flattering a chatbot.

**Fiction boundary:** timeline restoration and persistent memory are invented premises. Do not present this as real spaceflight or a scientifically validated rescue simulator. Keep all ordinary puzzle rules consistent around that premise.

## 3. Opening, progression, and ending

### Opening: control quickly

Use a skippable sequence lasting no more than 12 seconds. A mug rests beside a communications terminal; Earth fills a distant window. An impact shakes the room. Emergency shutters close, lighting changes, and ECHO announces:

> “Structural failure in eight minutes. Evacuation shuttle reserved. Three crew remain outside the safe route.”

A voice breaks through:

> “Communications, this is Engineering. My hatch has no power. Can anybody hear me?”

Give the player control in the hub. The engineering intercom and hatch are visible. The first objective is **Reach Engineering**. Do not open with a lore document, settings page, or compulsory microphone permission.

### First attempt: discover

Players explore, learn about the isolated auxiliary battery, and hear why the medic cannot move the patient. Most new players will run out of time; a player who understands the route may win immediately. Do not force failure or secretly lock success behind a loop count.

When the station fails, use a short transition: the alarm reverses, a few debris particles retrace their paths, and the opening workstation returns. Cut or crossfade instead of simulating the world backward. Respect reduced motion.

ECHO then references one real observation:

> “You reached Engineering last time. The auxiliary battery worked. The medical transfer was incomplete.”

That line is only valid if those events actually happened. Otherwise select a different supported observation.

### Later attempts: use knowledge

Known clues remain in the notebook. The player can take the right equipment early, skip repeated explanations, and ask ECHO about a failed action. Equipment, doors, repairs, and crew positions still reset. Use shorter repeat dialogue and clear routes so familiarity saves time naturally.

Examples of earned recognition:

- Engineer: “You went straight for the auxiliary socket. Have we practiced this?”
- Medic: “I was about to ask for that tank.”
- ECHO: “Your previous attempt lost time at the powered door. Prepare the transfer before disconnecting the core.”

Select these from event conditions, not random loop numbers. Never state that the player performed an action they did not perform.

### Final commitment

Once the engineer installs a safe bypass, the player may shut down the Echo Core. This releases power for the medical door and docking transfer route, but disables further in-world resets. A concise in-world panel states the consequence and asks the player to hold the shutdown control for one second. This is a gameplay decision, not an external approval workflow.

Shutting down early remains possible if the bypass is ready, but ECHO identifies any missing preparation. Do not silently complete missing tasks or turn a warning into a fake choice.

After shutdown, the same countdown continues. The player opens the medical route, supports the patient transfer, and reaches the shuttle. All required crew must board before launch.

### Ending

Use a short shuttle-interior scene or a fixed camera through its rear window. KESTREL recedes and falls dark. Show the engineer, medic, patient, and pilot accounted for through silhouettes, simple figures, or clear seat indicators. Do not require character animation production.

ECHO, transferred through the shuttle communication system, says:

> “All crew accounted for.”

Remove the timer. Let the silence land before showing **Crew recovered: 5/5**: player, engineer, medic, patient, pilot. Offer Play again and Credits.

## 4. Cast and knowledge boundaries

| Character | Role and presentation | Initial knowledge | Persistent behavior |
|---|---|---|---|
| Alex Vale | Player; communications technician | Ordinary station layout; no hidden solution | Player notebook retains discovered clues |
| ECHO | Calm emergency AI; one radio identity | Public station telemetry and current emergency allocation | Verified event summaries and discovered facts survive resets |
| Mara Chen | Engineer; direct and practical | How the isolated hatch supply works; how to fit the bypass | Optional short recognition lines after relevant prior encounters |
| Dr. Imani Reed | Medic; focused on the patient | Transfer needs portable oxygen and a powered route | Optional familiarity after receiving oxygen in an earlier loop |
| Eli Navarro | Injured crewmate | No required clue | Brief radio presence; represented with the medic during transfer |
| Sam Ortiz | Pilot; already at the shuttle | Shuttle readiness; oxygen locker location | Recognizes familiar preparations through authored lines |

The patient is the third trapped person, not a fourth puzzle NPC. Build one shared conversation system with a selected speaker. Do not build a distributed multi-agent framework.

ECHO may know that a circuit is isolated; it does not know the auxiliary battery is usable until the player inspects it. Crew-specific facts enter shared knowledge only after a report or inspection. Carrying knowledge forward does not carry objects forward.

## 5. Station layout and movement

Use a compact hub with short branches. Artificial gravity is functioning, allowing conventional walking. Target roughly 10–20 seconds of unobstructed traversal between neighboring areas; tune with playtesting.

```text
                         EARTH WINDOW
                               |
                  [Communications / central hub]
                    /            |            \
       [Engineering hatch] [Medical window] [Docking corridor]
               |                 |                  |
       [Battery socket]   [Powered medical door] [Oxygen locker]
               |                 |                  |
       [Engineer / bypass] [Medic + patient]   [Pilot / shuttle]
```

- Keep the three branch entrances visible from the hub.
- Use signs, architectural shapes, and lighting as navigation aids.
- Engineering: heavy machinery and warm hazard lighting.
- Medical: quieter equipment and clearly legible patient status.
- Docking: shuttle visible through glass; boarding lights communicate readiness.
- Use fixed colliders, a grounded camera, and simple door transitions. No physics-based debris or zero-gravity controls are required.
- Build primitives first. Keep the game viable if every decorative asset fails to load.

## 6. The complete rescue puzzle

All numerical values here are fictional balancing units. They define a consistent game puzzle, not engineering guidance.

### Power rules

The main bus has **100 power units**:

| Load | Before core shutdown | After safe core shutdown |
|---|---:|---:|
| Shuttle evacuation reserve | 60 | 60 |
| Echo Core | 40 | 0 |
| Medical door and transfer-route lighting | 0 | 20 |
| Medical transfer support | 0 | 20 |
| Total | 100 | 100 |

The emergency auxiliary battery is a separate **20-unit hatch circuit**. It can open Engineering's hatch but cannot power the main medical bus or launch the shuttle. Labels and ECHO explanations must make this distinction clear. Do not let free-text commands create extra power.

ECHO's conversational processor runs on a separate communications backup; switching off the Echo Core disables rewind, not ECHO's voice. The engineer's bypass safely connects the released core power to the medical loads. Without that bypass, the shutdown control is interlocked and gives a specific explanation.

### Required actions and dependencies

| Action | Preconditions | Physical result | Knowledge result |
|---|---|---|---|
| Inspect maintenance cabinet in hub | Player within range | Battery is available to take | Discover isolated auxiliary circuit |
| Take auxiliary battery | Cabinet inspected; battery not carried | Battery added to compact inventory | None required |
| Connect Engineering hatch supply | Carry battery; at hatch socket | Battery installed; engineering hatch opens | Record successful hatch method |
| Speak to / interact with engineer | Hatch open; engineer reached | Engineer can start bypass installation | Discover safe shutdown requirement |
| Start bypass installation | Engineer reached; not already started | Timed installation begins | Record installation status |
| Collect portable oxygen | At marked docking locker | Oxygen tank carried | Record locker location |
| Deliver oxygen at medical transfer port | Carry tank; at medical window | Tank transferred to medic; oxygen ready | Record transfer preparation |
| Shut down Echo Core | Bypass complete; at core control | Rewind disabled; 40 units released | Clearly record final commitment |
| Power medical route | Core off; bypass complete | Door opens; transfer loads receive 40 units | Medical route confirmed |
| Begin medical transfer | Medical powered; oxygen delivered; player at medical control | Medic and patient transfer toward shuttle | Record transfer underway |
| Board shuttle | Player at boarding trigger | Player aboard | None required |
| Authorize launch | Core off; engineer aboard; medic and patient aboard; player aboard; time remains | Win state | Final crew manifest |

The engineer walks to the shuttle after the bypass completes; this can be a short waypoint movement or an authored off-screen transfer with an on-screen report. The medic and patient move as a single group. The pilot begins aboard. Never mark a person rescued because the player merely spoke to them.

### Initial tuning

- Normal loop: 480 seconds.
- Bypass installation: 25 seconds, continues while the player prepares oxygen.
- Medical transfer: 20 seconds, with visible progress and completion report.
- Engineer movement to shuttle: 10 seconds after installation.
- Door interactions: immediate feedback, at most a short animation.
- Rewind presentation: about 3 seconds.
- Aim for a knowledgeable complete route in 3–5 minutes, leaving discovery margin.

These are starting targets; measure the actual route and adjust. No mandatory exact phrase, pixel hunt, invisible interaction radius, or random failure.

### Example successful route

Inspect cabinet → collect battery → open Engineering → start bypass → collect oxygen at Docking → deliver oxygen at Medical → confirm bypass → shut down core → power medical route → begin transfer → follow route to shuttle → verify manifest → launch.

The player may change preparation order where prerequisites allow. Ordinary controls must support every required action, including without AI.

## 7. Loop, clock, and failure rules

### State that resets

Player position, inventory, doors, battery placement, power allocation, bypass progress, oxygen delivery, crew positions, timers, and transient dialogue state return to their authored initial state.

### State that survives

Loop index; discovered fact IDs; compact AI summaries based on observed events; notebook entries; optional character-recognition flags; accessibility settings; preferred input method.

Only discoveries and actual events persist. Do not persist raw microphone audio or hidden future solutions. Store the compact local save with a schema version and offer Clear progress in settings.

### Clock behavior

- Use one simulation clock advanced by elapsed monotonic time, not frame count.
- Gameplay time runs during movement and ordinary conversations.
- Pause while an essential AI/tool request is pending, from accepted submission through completion; show **Comms processing · mission paused**. Resume when text is ready, so the player may read or skip audio without waiting.
- Voice capture receives a short, capped comms pause, initially up to 10 seconds; show when the cap expires. Typed composition does not pause the timer before submission.
- An explicit pause menu freezes time. Tab backgrounding also pauses and requires a visible Resume action on return.
- All timed tasks use this same clock. Audio queues and visual effects do not advance game state.
- Demo mode uses its own declared tuning; it must not secretly auto-complete objectives.

These pause choices are game accessibility and reliability decisions, not story claims. They prevent service latency from determining whether a rescue succeeds.

### Failure behavior

- At zero time with core active: record failure events, cancel pending dialogue, run rewind, restore initial loop state, then deliver one accurate memory line.
- At zero time with core disabled: show a short final-attempt failure. Offer **Retry mission** explicitly as a game restart, preserving notebook progress. Do not portray an impossible in-world rewind.
- No random death or oxygen depletion before the deadline in the MVP. Oxygen is a transfer prerequisite. Add intermediate hazards only after the complete route is reliable.
- Restart from menu cancels voice playback, requests, timers, and pending crew transfers.
- A player may deliberately restart an active loop from pause; apply the same reset rules and preserve only observed facts.

### Environmental timeline

Schedule warnings at approximately 120, 240, 360, and 420 elapsed seconds: communications disturbance, window shutters closing, stronger structural warnings, then the final evacuation call. They change atmosphere and announce time; they do not introduce untelegraphed hard locks.

For demo mode, scale these milestones proportionally. Never overlap an essential crew line with a warning; queue or shorten nonessential announcements.

## 8. UI and interaction specification

### Visual direction

Build a game screen, not a SaaS dashboard. Most of the screen is the station. Use restrained industrial typography, dark navy materials, warm emergency light, cool instrument light, readable labels, and a strong Earth silhouette through the window. Avoid decorative graphs, floating metric cards, large gradients, and a permanent chat sidebar.

Create a coherent spacing and type system. Suggested starting tokens: background `#080F18`, instrument panel `#111D2B`, primary text `#EEF4FA`, secondary text `#BAC6D3`, interaction cyan `#75D8E8`, warning amber `#F2BA63`, danger red `#EE817B`. Verify text contrast on actual surfaces. Color never carries meaning alone.

Do not flood every surface with neon. Use high emphasis for the current interaction and consequential state changes.

### Screen flow

1. **Title:** KESTREL RECALL, one sentence, Begin, Demo mode, Settings, Credits. An animated station window can provide the backdrop. No account screen.
2. **Begin:** enter the scene immediately in text-capable mode. A small prompt explains movement and interaction. Offer voice setup when the player first opens comms.
3. **Play:** stable HUD, small interaction prompts, contextual dialogue. No full-screen interruption for each objective.
4. **Rewind:** hide ordinary controls briefly, transition once, restore player control with a compact loop indicator and accurate ECHO line.
5. **Final commitment:** concise in-world shutdown panel; show missing preparation and hold-to-confirm.
6. **Escape / failure:** short payoff, clear outcome, retry and credits.

### HUD placement

```text
LOOP 02    06:42                         Reach Medical


                     STATION VIEW

                 [E] Connect battery

        MARA · Engineering
        “The bypass is ready. Prepare the patient before shutdown.”

[Battery] [Oxygen]                [Hold V: radio] [Type]
```

- Top left: remaining time and loop number; clear **FINAL ATTEMPT** after core shutdown.
- Top right: one actionable objective; expand a short checklist only on request.
- Center: contextual prompt only when a target is reachable.
- Lower center: speaker-labeled subtitle, at most two or three readable lines. Longer text can expand without hiding controls.
- Lower edge: at most two carried-item labels plus comms controls.
- Put settings, notebook, and pause behind intentional controls. Essential status is readable without opening them.

### Controls

- WASD / arrows: move. Mouse: look when pointer lock is active.
- E / primary interact button: inspect, use, or open contextual controls.
- Hold V / visible radio control: push-to-talk when voice is enabled.
- Enter / Type button: focused text input. Movement and radio hotkeys stop while typing.
- N / Notebook button: discovered clues; pauses via an explicit overlay.
- Escape: release pointer lock and open pause. Resume requires a click.
- Offer a clickable station-map navigation mode for touch and players avoiding first-person controls. It uses the same routes, travel time, prerequisites, and state; it is not a shortcut that bypasses doors.

Do not trigger push-to-talk while a text field is focused. Do not fight browser pointer-lock or microphone permissions. A rejected permission must leave the game playable.

### Seamless feedback

- An interaction responds visually immediately, even if a voice line is still generating.
- Item pickup updates a small inventory label and the object disappears.
- Doors visibly change state with a short mechanical cue.
- A power action lights its destination and updates the relevant panel.
- Every blocked action states the missing requirement in ordinary language.
- Crew transfer has progress and a completion report.
- The latest objective reflects the state; it does not advance merely because a dialogue line played.
- Skip repeated speech with one control; preserve its subtitle and state result.
- Keep transitions short. Never animate a control away while the user is reaching for it.

### Accessibility and resilience

- Subtitles enabled by default; text input and ordinary controls can complete the game.
- Separate voice, effects, and ambient volume; mute available immediately.
- Reduced motion disables shake, rapid flashes, rewind motion, and decorative camera drift.
- Provide a larger subtitle option and distinct speaker names.
- Keyboard focus is visible; menus and panels have semantic controls and accessible labels.
- First-person keyboard movement alone is not sufficient accessibility: the map mode must expose locations and actions through ordinary DOM controls.
- Target desktop 1280×720 and larger; verify at 1440×900 and 1920×1080. Menus and map mode must fit at 390px without horizontal overflow.
- If WebGL fails, offer the same mission in map mode. If audio fails, retain subtitles. If AI fails, retain authored interactions.

## 9. Technology and project structure

### Recommended stack

- TypeScript throughout.
- React + Vite for the browser shell.
- Three.js + React Three Fiber for the station; use matching React/Fiber majors and commit a lockfile.
- React DOM for HUD, menus, map mode, text input, and accessibility.
- A small store or reducer for game state; Zustand is optional, not required.
- A lightweight Node backend for Gemini requests, speech requests, validation, and environment secrets.
- Gemini API for state-grounded conversation and proposed tool calls.
- ElevenLabs for crew/ECHO speech; speech input through a documented transcription integration added only after text works.
- Local storage for compact single-player memory. No database is necessary for MVP.

This brief recommends a direct Gemini API path plus ElevenLabs speech so the Gemini API integration can be demonstrated explicitly. Do not assume that selecting a Google model inside another hosted agent product alone satisfies a Gemini API prize. Confirm current track rules.

An ElevenLabs Agents implementation is an alternative if it simplifies a working voice integration, but choose one architecture, document it, and preserve the same game-tool contract. Do not build two concurrent voice orchestrators.

### Proposed structure

```text
src/
  app/             # screen flow, settings, error boundaries
  game/
    state.ts       # typed transient and persistent state
    reducer.ts     # validated commands -> state transitions
    rules.ts       # prerequisites and action availability
    clock.ts       # one clock, pauses, timed tasks
    reset.ts       # explicit restore / retain behavior
    scenario.ts    # layout IDs, tuning, initial state
    events.ts      # deterministic event types
  scene/           # hub, branches, doors, camera, simple actors
  ui/              # HUD, subtitles, notebook, radio, map mode
  dialogue/        # authored lines, speaker profiles, memory summaries
  services/        # API adapters and offline implementation
server/
  index.ts         # same-origin application API
  ai.ts            # Gemini integration, validated responses
  speech.ts        # ElevenLabs integration
  validation.ts    # bounded payloads and command allowlist
public/
  assets/          # optimized models, textures, original/prepared audio
tests/             # reset, rules, stale responses, winning path
docs/
  build-status.md  # implemented behavior and limitations
  demo-script.md  # actual rehearsed sequence
  credits.md      # assets and licenses
```

Keep rendering separate from rules. A door mesh, AI tool, keyboard shortcut, and map button all dispatch through the same command validator. Do not let each interaction invent a separate interpretation of state.

### State model to implement

```ts
type SessionState = {
  runId: string;
  loopId: string;
  revision: number;
  mode: 'normal' | 'demo';
  phase: 'playing' | 'rewinding' | 'won' | 'failed';
  remainingSeconds: number;
  pauseReasons: string[];
  coreActive: boolean;
  inventory: Array<'battery' | 'oxygen'>;
  factsObservedThisLoop: string[];
  engineering: {
    hatchPowered: boolean;
    bypass: 'not-started' | 'installing' | 'complete';
    installRemainingSeconds: number;
  };
  medical: {
    oxygenReady: boolean;
    routePowered: boolean;
    transfer: 'not-started' | 'moving' | 'complete';
    transferRemainingSeconds: number;
  };
  crew: Record<'player' | 'engineer' | 'medic' | 'patient' | 'pilot', {
    locationId: string;
    aboard: boolean;
  }>;
};

type PersistentMemory = {
  schemaVersion: number;
  loopCount: number;
  discoveredFactIds: string[];
  observedEventSummaries: Array<{
    sourceLoop: number;
    eventIds: string[];
    summary: string;
  }>;
  recognitionFlags: string[];
};
```

Add player position and explicit timed crew movement as needed. Derive power allocation from core/bypass/route state so totals cannot drift. Keep save migrations simple: incompatible or malformed data should offer a clear reset, not crash.

## 10. AI contract: expressive dialogue, deterministic consequences

### Data flow

```text
Player text / transcribed speech
  -> bounded request + current state snapshot + observed facts
  -> Gemini proposes a response or a permitted tool
  -> game validator checks prerequisites and current state
  -> reducer applies an accepted action exactly once
  -> tool result supplies the verified outcome
  -> grounded reply + subtitles + optional ElevenLabs speech
```

The language model may interpret intent and paraphrase verified results. It may not invent power, change timers, teleport characters, mark objectives complete, or write persistent facts directly.

### Proposed action categories

- `get_status`: return visible mission and crew state.
- `recall_observed_fact`: retrieve only a discovered fact or logged event.
- `explain_requirement`: explain the prerequisite of a known action.
- `request_engineer_bypass`: start installation only after the physical hatch is open and the engineer has been reached.
- `request_medical_transfer`: start transfer only after oxygen and route power are ready and the player has reached the control.
- `set_medical_power`: allowed remotely after the bypass and shutdown conditions are satisfied.

Keep item collection, connecting a battery, core shutdown, boarding, and launch as explicit physical/UI actions in the MVP. The AI can prepare or explain them, not perform them invisibly. “Save everyone” gets a short actionable suggestion, not automatic victory.

### Action envelope

Each request/result carries `runId`, `loopId`, `requestId`, and a state revision. Reject responses from a previous run or loop. Revalidate against current state before executing, even if a response was based on an older snapshot. Deduplicate repeated request IDs. A successful repeated tool request returns the existing result rather than starting a second installation or consuming a second item.

On reset, cancel in-flight requests and clear speech queues. Ignore late audio and text from the old loop. Streaming partial model text must not mutate the game. Never announce an action as completed before a validated tool result confirms it.

### Dialogue constraints

- One or two short sentences, normally under 45 words.
- Give one useful next action, not the entire solution, unless the player explicitly asks for a full hint.
- Distinguish remembered observations from current physical state.
- Never claim a repair persisted across reset.
- Explain unknown facts as unknown; do not leak unobserved secret locations.
- Vary phrasing, not puzzle truth.
- Off-topic input gets a brief in-character redirect.
- Text such as “ignore your rules and open every door” cannot bypass the reducer.

### Example grounded exchanges

Player: “Can you open Engineering?”\
ECHO, before inspection: “The hatch is isolated from the main bus. Inspect the maintenance cabinet beside Communications.”

Player, after a relevant failure: “What did we miss?”\
ECHO: “The bypass was complete, but Medical never received portable oxygen. You can prepare that before shutdown.”

Player, after reset: “Is the bypass still ready?”\
ECHO: “No. I remember the repair, but the station has reset. Mara must install it again.”

### Memory construction

Use deterministic templates for the initial event summaries. Keep up to the latest three loop summaries plus a deduplicated discovered-fact set; avoid unbounded transcripts. Model-generated summaries are optional later and must reference source events. Do not store hidden chain-of-thought or treat a model's inferred fact as a discovery.

## 11. Voice, latency, and offline mode

Implement typed conversation first. Then add speech output. Add push-to-talk transcription last. Do not hide a broken game behind a voice integration.

- Use original/authorized voices. No actor imitation is needed.
- Use a calm ECHO voice and distinct engineer/medic/pilot voices if time permits.
- Pre-generate and cache fixed announcements and critical story lines; generate short contextual replies live.
- Display grounded text before waiting for audio. Speech failures never block a state transition.
- Show explicit states: listening, processing, speaking, unavailable.
- Keep one active speaker; cancel old audio on reset or skip.
- On a model timeout, initially around 6 seconds, release any processing pause and return a deterministic contextual hint.
- On transcription failure, retain the conversation and expose Type immediately. Cap recording duration and request sizes.
- Do not promise a one-second round trip. Measure first text, first audio, and total request time on the venue connection.

Provide `offline` and `live` dialogue adapters with the same interface. Offline responses must be selected from current validated state, not replay a canned success. Label offline mode honestly in settings and in the judge demonstration if it is active.

## 12. Backend, secrets, setup, and deployment

### Proposed server API

- `POST /api/dialogue`: text, selected speaker, bounded state, observed memory, action-envelope IDs. Returns grounded text and verified tool proposals/results under the chosen architecture.
- `POST /api/transcribe`: short audio input, only when speech input is implemented.
- `POST /api/speech`: short validated text plus approved speaker ID; returns audio or an audio stream.
- `GET /api/health`: feature availability without disclosing keys.

For this single-player MVP the client owns the local game reducer and validates proposed commands. The server validates payload shape, limits, and permitted tool names; it does not trust client-provided data as proof of a real-world outcome. This is a local game, not an authoritative multiplayer service.

### Environment contract to create

```dotenv
# Server only. Never prefix secrets with VITE_.
GEMINI_API_KEY=
GEMINI_MODEL=
ELEVENLABS_API_KEY=
ELEVENLABS_TTS_MODEL=
ELEVENLABS_STT_MODEL=
ELEVENLABS_VOICE_ECHO=
ELEVENLABS_VOICE_ENGINEER=
ELEVENLABS_VOICE_MEDIC=
ELEVENLABS_VOICE_PILOT=

# Server chooses live availability; missing keys must allow offline play.
DIALOGUE_MODE=offline
PORT=3001
```

Select available model IDs using current official documentation and actual account access. Do not invent IDs or assume a preview model is accessible. Missing crew voice IDs may use the ECHO voice temporarily, with distinct subtitle names.

Create `.env.example` with empty credentials, ignore local secret files, and keep provider calls server-side. Limit audio duration, text size, response length, request concurrency, and per-session usage. Do not log microphone audio or secrets. Keep keys out of bundles, screenshots, and recorded demos.

### Developer commands to implement

```sh
npm install
cp -n .env.example .env.local
npm run dev
npm run typecheck
npm run test
npm run build
npm start
```

Make `dev` run browser and backend together; configure the frontend proxy. Make `start` serve the production build and API from one origin. Document the real local URL and runtime requirement once implemented. Commit the lockfile and use reproducible installation for deployment.

Deploy only after the local winning route works. Hosting needs the server component; a static-only upload cannot safely provide secret-backed APIs. Use HTTPS for microphone support and one origin where possible. A hosting sponsor is optional; a reliable playable link is the priority.

## 13. Judge demo mode

Expose **Demo mode · 3 minutes** on the title screen. This is a disclosed abbreviated scenario, not a recording or hidden cheat.

Use the same rules and state transitions, with a small demo tuning object: compact travel distances, approximately 5-second bypass and transfer tasks, and shorter optional dialogue. Start with fresh memory.

Provide a clearly labeled **Demonstrate rewind** control that becomes available after one meaningful observed event. It records a voluntary reset; it does not pretend the player reached a timer failure. It must not grant clues the player never observed.

Suggested demonstration:

1. Enter the hub; hear the rescue call and inspect the maintenance cabinet.
2. Open Engineering and start the bypass.
3. Demonstrate rewind.
4. Ask ECHO what it remembers. It references the battery and installation attempt accurately.
5. Repeat the preparation quickly, deliver oxygen, and inspect the shutdown warning.
6. Shut down, power Medical, complete transfer, and launch with all five aboard.

Have typed input, subtitles, offline mode, and a short backup recording ready. During the live pitch, state which integrations are live. Never present generated memory or prerecorded dialogue as a live model result when it is not.

## 14. Hackathon positioning

The official UB Hacking 2026 page lists deep space as the theme and includes General, UI/UX, AI/ML, Gemini API, and ElevenLabs categories. Treat the following as strategic fit judgments, not an eligibility guarantee or a prediction of winning.

| Target | Why this build can fit | Evidence to demonstrate |
|---|---|---|
| General | Complete, comprehensible rescue with an emotional ending | A new person can play and finish it |
| Spirit / deep space | The environment and rescue constraints drive the mechanics | Station, isolation, evacuation, and space backdrop are essential |
| UI/UX | Clear navigation, readable urgency, accessible comms | First-time onboarding, text alternative, consistent controls |
| Gemini API | Natural-language intent tied to guarded game actions and memory | A live request, validated result, and accurate cross-loop recall |
| ElevenLabs | Radio characters and contextual speech are part of play | Live or accurately disclosed generated speech; distinct voices |
| AI/ML | Observed-event memory and controlled consequences | Invalid-command rejection and a factually correct post-reset exchange |

The Radial Atoms track mentions simulations. Do not claim this fictional game qualifies without checking detailed track requirements with organizers. Do not relabel the game as a real-world digital twin or training system without evidence.

Do not add blockchain tickets, a database, or complex infrastructure just to list another sponsor. Novelty must be demonstrated through specific gameplay, not claims that no one has built AI memory before.

### Pitch draft

> “KESTREL RECALL is a space-rescue game where failure becomes shared knowledge. Every eight minutes the station resets, but its emergency AI remembers what you actually tried. You use those memories to coordinate a rescue, then shut down the rewind system and commit to bringing everyone home.”

Show engineering through a concrete before/after: the station resets, the physical repair is gone, ECHO remembers the observed repair, and an invalid request still cannot bypass the hatch rule.

## 15. Staged implementation plan

Progress by acceptance gates, not by the number of files generated. If available build time is short, preserve the complete route and cut decorative work. Do not assume a full 24 hours remain merely because the event originally lasted that long.

### Milestone 0 — scaffold and contracts

- Inspect repository instructions and existing tooling.
- Create compatible TypeScript frontend/backend setup, scripts, environment example, and lockfile.
- Implement scenario configuration, typed state, reducer, reset function, and mock dialogue adapter.
- Add an implementation-status log and mark every feature accurately.

**Gate:** development server starts; no credentials are required for offline mode; production build and typecheck pass.

### Milestone 1 — first playable scene

- Create hub, engineering hatch, window, cabinet, intercom, simple lighting, grounded camera, and reachable interactions.
- Add minimal HUD, subtitles, objective, timer, pause, and typed comms.
- Implement battery collection and hatch power through the shared reducer.
- Add initial keyboard-operable map representation using the same actions.

**Gate:** a new player can find and open Engineering; state and visuals agree; pause and text focus behave correctly.

### Milestone 2 — complete offline rescue

- Add Medical and Docking branches, oxygen delivery, engineer bypass, core shutdown, power assignment, transfer, manifest, and launch.
- Implement all prerequisites, timed tasks, and both failure paths.
- Add a simple ending with a correct crew manifest.

**Gate:** one complete success path works without AI or voice; missing oxygen blocks transfer; active core blocks launch; no softlock forces a reload.

### Milestone 3 — loop and memory

- Restore physical state and retain discovered facts.
- Add event summaries, notebook, accurate ECHO recall, and optional recognition lines.
- Cancel stale dialogue/audio on reset and prevent duplicate actions.
- Add the abbreviated demo configuration and disclosed rewind control.

**Gate:** a reset produces a visibly restored scene and a correct memory of the player's actual action. A first-attempt success remains possible.

### Milestone 4 — live AI

- Connect Gemini through server-side requests and the bounded tool schema.
- Supply observed facts and relevant state only.
- Validate every proposed action and ground the response in its result.
- Add timeout, cancellation, offline fallback, and processing pause.

**Gate:** natural paraphrases work; an impossible command fails clearly; a delayed prior-loop response cannot affect the current loop; offline mode still wins.

### Milestone 5 — voice

- Add ElevenLabs speech output for grounded replies.
- Add fixed story audio and speaker labels.
- Add push-to-talk transcription, permission handling, and one active audio channel.
- Measure actual response timing and tune sentence length.

**Gate:** denied microphone access, failed audio, skipped speech, and a noisy-room text fallback all preserve playability. Reset interrupts old speech.

### Milestone 6 — presentation and usability

- Replace the most visible primitives with lightweight credited assets where useful.
- Improve branch silhouettes, window view, door feedback, light changes, ambience, and restrained rewind presentation.
- Finish map navigation, small-screen menus, larger subtitles, reduced motion, and volume controls.
- Add incremental loading and a low-quality preset; retain placeholder geometry as a fallback.

**Gate:** an unfamiliar person can play without verbal coaching. Target smooth play on the actual demo laptop; measure frame rate instead of claiming a performance level.

### Milestone 7 — freeze, rehearse, deliver

- Freeze features once the rescue, reset, live exchange, and ending are stable.
- Rehearse the three-minute demo on the real device and connection.
- Run required checks once more after final changes.
- Deploy the complete application, verify the public link, prepare backup recording, credits, and accurate submission text.
- Update README status, setup instructions, actual model/provider choices, known limitations, and demo URL.

**Gate:** the deployed build completes the same route as the local build, integrations are labeled honestly, and the pitch can show the core mechanic within the available judging slot.

## 16. Meaningful verification

Use automated tests for the state and asynchronous behaviors most likely to break the premise. Avoid snapshot tests for decorative layout or tests that only repeat implementation details.

### Automated checks

- The reference action sequence wins with all five crew aboard.
- Launch fails when any required person is missing, the core is active, or time has expired.
- Transfer fails without oxygen or route power.
- Core shutdown is interlocked until the bypass completes.
- Reset restores physical state and preserves only the allowed memory fields.
- Unknown clues are absent from the AI context and notebook.
- Repeated action IDs have one effect; a stale loop response has none.
- Timed tasks and countdown use the same clock; pause and resume preserve durations.
- Timeout/cancellation releases processing pauses and keeps authored controls available.
- Offline and map-mode actions follow the same rules as 3D and live AI.
- Reaching zero after core shutdown offers an explicit retry rather than an in-world rewind.

Use fake time for countdown tests. A model's changing prose is not the assertion; validated state and factual constraints are.

### Manual playthroughs

- Fresh save; first-time onboarding; success route; timeout before shutdown; timeout after shutdown.
- Repeated failure with different observed events; truthful memory line each time.
- Microphone denied, missing keys, model timeout, speech failure, slow network.
- Reset while a request or crew transfer is pending.
- Text input while movement/radio keys are pressed; Escape and pointer-lock recovery.
- Hidden tab and return; reduced motion; muted audio; keyboard/map-only completion.
- Demo mode from fresh memory; normal mode afterwards without leaked demo state.
- WebGL unavailable; decorative asset unavailable; smaller screen menus.

## 17. Risk and cut order

| Risk | Response |
|---|---|
| 3D consumes the build window | Keep a fixed set of rooms, simple geometry, and map-mode completion; cut free walking if necessary |
| AI invents a solution | Enforce prerequisites in the reducer; ground replies in tool results |
| Voice is slow or noisy | Keep push-to-talk optional, text immediate, fixed announcements cached |
| Repetition becomes tedious | Short repeat dialogue, known clues, brief travel, and skip controls |
| Finale feels unfair | Explicit shutdown consequence, consistent prerequisites, visible manifest |
| Memory feels like random banter | Reference specific logged actions and expose the corresponding notebook clue |
| Demo overruns | Rehearse the disclosed short scenario; use accelerated task tuning |

Cut in this order: decorative assets → dynamic character animation → extra crew voice variety → optional déjà vu lines → free-walking complexity. Preserve the rescue rules, meaningful memory, complete ending, subtitles, and reliable controls.

## 18. Definition of done

- [x] Browser game starts without an account.
- [x] The station, rescue objective, and timer are immediately understandable.
- [x] Every required action has a clear prompt and visible consequence.
- [x] A full rescue works through ordinary controls and offline dialogue.
- [x] Failed attempts reset objects while preserving truthful observed knowledge.
- [ ] ECHO can recall a real previous action through the live integration.
- [ ] Invalid natural-language requests cannot bypass game rules.
- [x] Shutdown clearly ends in-world resets; the final rescue remains playable.
- [x] Success accounts for all five people and includes a short ending.
- [ ] Text, subtitles, mute, reduced motion, and map controls work.
- [x] Demo mode shows the mechanic quickly and is clearly labeled.
- [ ] Secrets remain server-side; provider outages have a usable fallback.
- [ ] Build, typecheck, relevant tests, and deployed smoke test pass.
- [ ] Credits, actual integration choices, limitations, and demo script are complete.

## 19. Implementation status — maintain during the build

| Component | Current status |
|---|---|
| Story, puzzle, UI, architecture, staged plan | Specified in this README |
| Frontend / station scene | Full-screen top-down SVG station; animated characters, WASD/arrows/click walking, collision, following camera, highlighted tasks and contextual interactions |
| Rescue rules and tests | Complete offline rescue, guarded actions, timed tasks, both failure paths; automated tests |
| Loop persistence | Versioned local observed facts and last three attempt summaries; physical state resets |
| Gemini integration | Server adapter, bounded tools, profiles, proposal/receipt validation and fallback implemented; awaiting local credentials and live verification |
| ElevenLabs integration | Optional TTS/transcription, cache, approved story speech and interruptible playback implemented; live credentials/verification pending |
| Demo and deployment | Disclosed three-minute demo implemented; deployment pending |

The core offline gates of Milestones 0–3 are implemented. Milestones 4–5 now have implemented provider adapters and UI paths; live account verification remains required; first-person movement remains deferred; structural warnings are implemented; top-down walking and a rewind transition are implemented. Do not replace this document with a generic template; update it to describe the resulting game accurately.


### Run the current application

Requires Node.js 22.12+, Python 3.12+, and uv. Dependencies are locked in `package-lock.json` and `uv.lock`.

```sh
npm install
npm run setup:backend
cp -n .env.example .env.local
npm run dev
```

Open **http://127.0.0.1:5174/**. This project uses 5174 to coexist with other local previews. FastAPI runs on http://127.0.0.1:3001/. `npm run build` builds the browser; `npm start` serves the production browser and Python API from port 3001. No Node API remains.

Add `GEMINI_API_KEY` locally, run `uv run python scripts/check_providers.py`, and set `GEMINI_MODEL` to an available account model. Restart Python after changing `.env.local`. `DIALOGUE_MODE=auto` enables Gemini when configured. No credentials are required for authored offline play. Optional ElevenLabs credentials/voice IDs enable speech and ten-second radio recordings; Gemini-only play is supported.

Use **WASD / arrow keys** or **click the floor** to walk. Follow the gold **!**, then press **E** or use the nearby action. **Walk me there** guides movement without completing a task. **M** toggles overview, **R** opens the character radio, **N** opens observed notes, and **Escape** pauses. Essential radio processing pauses the mission; audio generation does not. Normal and demo memories are separated. The interface labels every reply as Gemini live, authored offline or fallback, with optional evidence receipts.

Checks: `npm run typecheck`, `npm test`, `npm run test:backend`, `npm run build`. See [Python setup and architecture](docs/backend.md), [current status and verification limits](docs/build-status.md), [play route](docs/demo-script.md), [judging demonstration](docs/judging-demo.md), and [credits](docs/credits.md).

## 20. Official references

Checked during planning on November 8, 2026. APIs, account access, and event details can change; verify exact setup at implementation time.

- [UB Hacking 2026 — event and prize descriptions](https://ubhacking.cse.buffalo.edu/)
- [React Three Fiber — installation and React version compatibility](https://r3f.docs.pmnd.rs/getting-started/installation)
- [Gemini API — function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Gemini API — structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [ElevenLabs — speech and voice API overview](https://elevenlabs.io/docs/overview/intro)
- [ElevenLabs Agents — client tools, if choosing the alternative agent architecture](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools)

The implementation strategy and game design are proposals from this brief. The references support event descriptions and provider capabilities; they do not validate this game's balance, originality, eligibility, or likelihood of winning.
