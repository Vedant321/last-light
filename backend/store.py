"""Small SQLite repository. Never stores microphone input, API keys, or raw chat history."""
import hashlib
import json
import sqlite3
import threading
import time
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4
from .knowledge import clean_memory
from .models import Memory, SyncRequest

class Store:
    def __init__(self, path: str):
        if path != ':memory:': Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db=sqlite3.connect(path,check_same_thread=False)
        self.db.row_factory=sqlite3.Row
        self.lock=threading.RLock()
        self.db.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, run TEXT, loop TEXT, revision INTEGER DEFAULT 0, loop_count INTEGER DEFAULT 0, mode TEXT DEFAULT 'normal', touched REAL, minute REAL DEFAULT 0, hits INTEGER DEFAULT 0, usage INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS expeditions (session TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS memories (session TEXT, mode TEXT, data TEXT, PRIMARY KEY(session,mode));
        CREATE TABLE IF NOT EXISTS requests (session TEXT, id TEXT, fingerprint TEXT, response TEXT, pending TEXT, created REAL, PRIMARY KEY(session,id));
        CREATE TABLE IF NOT EXISTS speech (id TEXT PRIMARY KEY, session TEXT, run TEXT, loop TEXT, speaker TEXT, text TEXT, created REAL);
        CREATE TABLE IF NOT EXISTS audio_cache (id TEXT PRIMARY KEY, audio BLOB, created REAL);
        ''')
        self.db.commit()

    @contextmanager
    def transaction(self):
        with self.lock, self.db:
            yield self.db

    def close(self): self.db.close()

    def session(self, token: str | None) -> tuple[str, bool]:
        now=time.time()
        with self.transaction() as db:
            row=db.execute('SELECT id FROM sessions WHERE id=? AND touched>?',(token,now-30*86400)).fetchone() if token else None
            if row:
                db.execute('UPDATE sessions SET touched=? WHERE id=?',(now,token));return token,False
            token=uuid4().hex
            db.execute('INSERT INTO sessions(id,touched) VALUES(?,?)',(token,now))
            # Compact abandoned anonymous data. No unbounded accounts or transcripts.
            old=[r['id'] for r in db.execute('SELECT id FROM sessions WHERE touched<?',(now-30*86400,))]
            for key in old:
                for table in ('memories','requests','speech','expeditions'): db.execute(f'DELETE FROM {table} WHERE session=?',(key,))
                db.execute('DELETE FROM sessions WHERE id=?',(key,))
            db.execute('DELETE FROM speech WHERE created<?',(now-3600,))
            db.execute('DELETE FROM requests WHERE created<?',(now-86400,))
            return token,True

    def exists(self, token: str | None) -> bool:
        with self.lock:
            return bool(token and self.db.execute('SELECT id FROM sessions WHERE id=?',(token,)).fetchone())

    def memory(self, session: str, mode='normal') -> Memory:
        with self.lock:
            row=self.db.execute('SELECT data FROM memories WHERE session=? AND mode=?',(session,mode)).fetchone()
            return Memory.model_validate_json(row['data']) if row else Memory()

    def sync(self, session: str, req: SyncRequest) -> Memory:
        e=req.envelope
        with self.transaction() as db:
            row=db.execute('SELECT * FROM sessions WHERE id=?',(session,)).fetchone()
            if not row: raise ValueError('Unknown session')
            if row['run']==e.runId:
                if req.memory.loopCount<row['loop_count']: raise ValueError('Stale loop')
                if row['loop']==e.loopId and e.revision<row['revision']: raise ValueError('Stale revision')
                if row['loop']!=e.loopId and req.memory.loopCount<=row['loop_count']: raise ValueError('Stale loop')
            current=clean_memory(req.memory)
            old=self.memory(session,req.state.mode)
            if req.state.mode=='normal' or row['run']==e.runId:
                current=Memory(loopCount=max(old.loopCount,current.loopCount),facts=list(dict.fromkeys(old.facts+current.facts)),summaries=list(dict.fromkeys(old.summaries+current.summaries))[-3:])
            db.execute('INSERT OR REPLACE INTO memories VALUES(?,?,?)',(session,req.state.mode,current.model_dump_json()))
            db.execute('UPDATE sessions SET run=?,loop=?,revision=?,loop_count=?,mode=?,touched=? WHERE id=?',(e.runId,e.loopId,e.revision,req.memory.loopCount,req.state.mode,time.time(),session))
            return current

    def active(self, session: str, run: str, loop: str) -> bool:
        with self.lock:
            return bool(self.db.execute('SELECT id FROM sessions WHERE id=? AND run=? AND loop=?',(session,run,loop)).fetchone())

    def consume(self, session: str, per_minute: int, total: int):
        now=time.time()
        with self.transaction() as db:
            row=db.execute('SELECT minute,hits,usage FROM sessions WHERE id=?',(session,)).fetchone()
            hits=row['hits'] if now-row['minute']<60 else 0
            if hits>=per_minute or row['usage']>=total: raise OverflowError('Radio usage limit reached. Continue with ordinary mission controls.')
            db.execute('UPDATE sessions SET minute=?,hits=?,usage=usage+1 WHERE id=?',(row['minute'] if hits else now,hits+1,session))

    def request(self, session: str, request_id: str):
        with self.lock:
            row=self.db.execute('SELECT * FROM requests WHERE session=? AND id=?',(session,request_id)).fetchone()
            return dict(row) if row else None

    def put_request(self, session: str, request_id: str, fingerprint: str, response: dict, pending: dict | None=None):
        with self.transaction() as db:
            db.execute('INSERT OR REPLACE INTO requests VALUES(?,?,?,?,?,?)',(session,request_id,fingerprint,json.dumps(response),json.dumps(pending) if pending else None,time.time()))
            db.execute('DELETE FROM requests WHERE session=? AND id NOT IN (SELECT id FROM requests WHERE session=? ORDER BY created DESC LIMIT 200)',(session,session))

    def speech(self, session: str, run: str, loop: str, speaker: str, text: str) -> str:
        key=uuid4().hex
        with self.transaction() as db:
            db.execute('INSERT INTO speech VALUES(?,?,?,?,?,?,?)',(key,session,run,loop,speaker,text,time.time()))
            db.execute('DELETE FROM speech WHERE session=? AND id NOT IN (SELECT id FROM speech WHERE session=? ORDER BY created DESC LIMIT 200)',(session,session))
        return key

    def get_speech(self, session: str, key: str):
        with self.lock:
            row=self.db.execute('SELECT * FROM speech WHERE id=? AND session=? AND created>?',(key,session,time.time()-3600)).fetchone()
            return dict(row) if row else None

    def cached_audio(self, key: str) -> bytes | None:
        with self.lock:
            row=self.db.execute('SELECT audio FROM audio_cache WHERE id=?',(key,)).fetchone()
            return bytes(row['audio']) if row else None

    def cache_audio(self, key: str, audio: bytes):
        with self.transaction() as db:
            db.execute('INSERT OR REPLACE INTO audio_cache VALUES(?,?,?)',(key,audio,time.time()))
            db.execute('DELETE FROM audio_cache WHERE id NOT IN (SELECT id FROM audio_cache ORDER BY created DESC LIMIT 64)')

    def clear(self, session: str):
        with self.transaction() as db:
            for table in ('memories','requests','speech','expeditions'): db.execute(f'DELETE FROM {table} WHERE session=?',(session,))
            db.execute('UPDATE sessions SET run=NULL,loop=NULL,revision=0,loop_count=0 WHERE id=?',(session,))

    def expedition(self, session: str) -> dict | None:
        with self.lock:
            row=self.db.execute('SELECT data FROM expeditions WHERE session=?',(session,)).fetchone()
            return json.loads(row['data']) if row else None

    def save_expedition(self, session: str, checkpoint: dict):
        with self.transaction() as db:
            current=self.expedition(session)
            if current and current['id']==checkpoint['id']:
                if checkpoint['revision']<current['revision']:raise ValueError('A newer campaign checkpoint is already saved')
                if checkpoint['revision']==current['revision'] and current!=checkpoint:raise ValueError('Conflicting checkpoint revision')
            db.execute('INSERT INTO expeditions(session,data) VALUES(?,?) ON CONFLICT(session) DO UPDATE SET data=excluded.data',(session,json.dumps(checkpoint)))

    @staticmethod
    def fingerprint(data: dict) -> str:
        return hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':')).encode()).hexdigest()
