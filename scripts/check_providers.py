"""Read provider availability without printing credentials. Run: uv run python scripts/check_providers.py"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
import httpx
from backend.config import Settings

async def main():
    settings=Settings()
    async with httpx.AsyncClient(timeout=15) as client:
        if settings.gemini_api_key:
            try:
                response=await client.get('https://generativelanguage.googleapis.com/v1beta/models',headers={'x-goog-api-key':settings.gemini_api_key})
                response.raise_for_status()
                models=[m['name'].removeprefix('models/') for m in response.json().get('models',[]) if 'generateContent' in m.get('supportedGenerationMethods',[])]
                print('Gemini models available to this key:')
                for model in models:print(' ',model)
                print('Configured Gemini model:', 'available' if settings.gemini_model in models else 'not selected or not returned by the account')
            except httpx.HTTPError as exc:print('Gemini account check failed:',type(exc).__name__)
        else:print('Gemini: add GEMINI_API_KEY and GEMINI_MODEL to .env.local.')
        if settings.elevenlabs_api_key:
            try:
                response=await client.get('https://api.elevenlabs.io/v2/voices',headers={'xi-api-key':settings.elevenlabs_api_key},params={'page_size':20})
                response.raise_for_status()
                print('ElevenLabs voice IDs available to this account:')
                for voice in response.json().get('voices',[]):print(' ',voice['voice_id'])
            except httpx.HTTPError as exc:print('ElevenLabs account check failed:',type(exc).__name__)
        else:print('ElevenLabs: optional; text radio works without it.')
if __name__=='__main__':asyncio.run(main())
