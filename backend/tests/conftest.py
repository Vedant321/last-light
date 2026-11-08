import copy
import pytest
from backend.config import Settings

@pytest.fixture
def settings(tmp_path):
    return Settings(_env_file=None,database_path=str(tmp_path/'test.sqlite'),gemini_api_key='',gemini_model='',elevenlabs_api_key='',elevenlabs_voice_echo='')

@pytest.fixture
def mission():
    return {'envelope':{'runId':'run-1','loopId':'loop-1','requestId':'request-1','revision':1},
      'state':{'mode':'normal','phase':'playing','remaining':470,'place':'hub','core':True,'inspected':False,
       'battery':'cabinet','oxygen':'locker','bypass':None,'engineerTravel':None,'route':False,'transfer':None,'aboard':['pilot'],'events':[]},
      'memory':{'schemaVersion':1,'loopCount':1,'facts':[],'summaries':[]},'position':{'x':800,'y':490}}
