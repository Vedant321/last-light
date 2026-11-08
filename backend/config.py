from pathlib import Path
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(ROOT / '.env', ROOT / '.env.local'), extra='ignore')
    gemini_api_key: str = ''
    gemini_model: str = ''
    elevenlabs_api_key: str = ''
    elevenlabs_tts_model: str = 'eleven_flash_v2_5'
    elevenlabs_stt_model: str = 'scribe_v2'
    elevenlabs_voice_echo: str = ''
    elevenlabs_voice_engineer: str = ''
    elevenlabs_voice_medic: str = ''
    elevenlabs_voice_pilot: str = ''
    dialogue_mode: Literal['auto', 'live', 'offline'] = 'auto'
    port: int = 3001
    host: str = '127.0.0.1'
    database_path: str = str(ROOT / '.data' / 'last-light.sqlite3')
    secure_cookies: bool = False
    allowed_origins: str = 'http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:3001,http://localhost:3001'
    provider_timeout_seconds: float = Field(default=6, ge=.05, le=20)
    requests_per_minute: int = Field(default=30, ge=1, le=200)
    session_provider_limit: int = Field(default=150, ge=1, le=1000)

    @property
    def live_dialogue(self) -> bool:
        return self.dialogue_mode != 'offline' and bool(self.gemini_api_key and self.gemini_model)

    @property
    def speech_available(self) -> bool:
        return bool(self.elevenlabs_api_key and self.elevenlabs_voice_echo)

    def voice_for(self, speaker: str) -> str:
        return {'MARA': self.elevenlabs_voice_engineer, 'IMANI': self.elevenlabs_voice_medic,
                'SAM': self.elevenlabs_voice_pilot}.get(speaker, '') or self.elevenlabs_voice_echo
