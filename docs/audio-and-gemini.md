# Mission audio and Gemini setup

## Playable sound without a provider account

Click Begin or Continue to activate browser audio. The game composes its own quiet score locally: hopeful at Earth and the ISS, energetic at launch, tense during the rescue, urgent near the deadline, exploratory on the Moon, and warm during the return and orbital watch. No downloaded music is used.

One shared radio sequences crew narration and replies. It leaves 350 ms before the first turn and 650 ms between completed turns. Each speaker uses an available English device voice and a distinct rate/pitch profile; exact voices depend on the device. Speech has subtitles, skip, mute, volume, cancellation on chapter/loop changes, and a bounded queue. Faster rescue actions replace outdated pending instructions while letting the current sentence finish; structural warnings are placed ahead of routine pending turns. Hidden tabs stop speech. Music drops to 16% of its selected level while a voice is actually speaking and recovers gently afterward. Separate sliders control music, radio, and effects.

Device speech works with Gemini-only or authored offline play. Configured ElevenLabs remains an optional higher-quality source for approved station dialogue, with device speech as a fallback. The browser voice does not pretend to be ElevenLabs. Campaign speech currently uses device voices. Radio shows the actual playback source and labels AI-generated guidance separately.

The player microphone is not opened automatically. The station radio already supports an optional ten-second recording → mono 16 kHz WAV → server transcription → guarded dialogue path when ElevenLabs transcription is configured. The new crew-radio control and shared playback channel preserve room for future push-to-talk input. No browser speech-recognition cloud service is silently activated.

## Enable Gemini locally

1. Create or retrieve a Gemini API key in Google AI Studio using [Google's API-key guide](https://ai.google.dev/gemini-api/docs/api-key).
2. Put it in the ignored `.env.local` in this repository, as `GEMINI_API_KEY`. Keep credentials server-side; do not use a `VITE_` key or paste it into a radio message.
3. Run `uv run python scripts/check_providers.py` to list generateContent models available to your key. Set `GEMINI_MODEL` to an exact model ID from that list.
4. Set `DIALOGUE_MODE=auto`, then restart `npm run dev` so Python reloads its environment settings.
5. In the game, call ECHO. A successful generated response is labelled **Gemini live**. Missing credentials use authored guidance; a provider error uses an explicitly labelled fallback. A configured key alone is not proof of a successful model response.

Example server-only settings:

```dotenv
GEMINI_API_KEY=your-local-key
GEMINI_MODEL=an-enabled-model-from-the-checker
DIALOGUE_MODE=auto
```

Music and device radio do not require ElevenLabs. Hardware checks remain in `/hardware.html`; actual rover calibration and physical input are independent of Gemini setup.
