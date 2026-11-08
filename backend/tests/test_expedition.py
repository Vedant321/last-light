import copy
import json
import httpx
from fastapi.testclient import TestClient
from backend.app import create_app


def checkpoint():
    return {'schemaVersion':1,'id':'expedition-1','revision':0,'chapter':'earth','checks':[],'crew':[],'loops':0,'participant':1,'results':[]}

def lunar():
    return {**checkpoint(),'chapter':'lunar','revision':6,'checks':['power','oxygen','rover'],'crew':['player','engineer','medic','patient','pilot'],'loops':2}

def result(condition='LAG_ONLY'):
    return {'condition':condition,'outcome':'SUCCESS','timeMs':10000,'overshoots':1,'reversals':2,'targets':[-20,20],'perTargetMs':[4000,4700]}

def test_checkpoint_persistence_isolation_and_stale_revisions(settings):
    with TestClient(create_app(settings)) as c:
        assert c.get('/api/expedition').status_code==401
        c.get('/api/session');s=lunar();assert c.post('/api/expedition',json=s).status_code==200
        assert c.post('/api/expedition',json={**s,'revision':1}).status_code==409
        cookies=dict(c.cookies)
    with TestClient(create_app(settings)) as c:
        c.cookies.update(cookies);assert c.get('/api/expedition').json()['expedition']['chapter']=='lunar'
        c.cookies.clear();c.get('/api/session');assert c.get('/api/expedition').json()['expedition'] is None

def test_checkpoint_rejects_unearned_ending_duplicate_crew_and_fake_success(settings):
    with TestClient(create_app(settings)) as c:
        c.get('/api/session');s=lunar()
        for bad in [{**s,'chapter':'ending'},{**s,'crew':['pilot']*5},{**s,'checks':[]},{**s,'results':[{**result(),'timeMs':None}]},{**s,'results':[{**result(),'outcome':'TIMEOUT'}]}]:
            assert c.post('/api/expedition',json=bad).status_code==422
        s.update(chapter='ending',results=[result(),result('PREDICTION')])
        assert c.post('/api/expedition',json=s).status_code==200
        c.delete('/api/session/memory');assert c.get('/api/expedition').json()['expedition'] is None

def test_advice_offline_live_and_provider_failure(settings):
    with TestClient(create_app(settings)) as c:
        c.get('/api/session');c.post('/api/expedition',json=lunar())
        r=c.post('/api/expedition/advice',json={'message':'What next?','chapter':'lunar'}).json()
        assert r['mode']=='offline' and 'Prediction' in r['text']
        assert c.post('/api/expedition/advice',json={'message':'What next?','chapter':'ending'}).status_code==409
    settings.gemini_api_key='test-secret';settings.gemini_model='account-model'
    def provider(request):
        body=json.loads(request.content)
        assert 'tools' not in body
        context=json.loads(body['contents'][0]['parts'][0]['text'])
        assert context['mission']['physicalHardware'].startswith('not integrated')
        assert context['mission']['checkpoint']['chapter']=='lunar'
        return httpx.Response(200,json={'candidates':[{'content':{'parts':[{'text':'Centre beacon A and wait for its delayed confirmation.'}]}}]})
    with TestClient(create_app(settings,transport=httpx.MockTransport(provider))) as c:
        c.get('/api/session');c.post('/api/expedition',json=lunar())
        r=c.post('/api/expedition/advice',json={'message':'Help aim','chapter':'lunar'}).json();assert r['mode']=='live'
    with TestClient(create_app(settings,transport=httpx.MockTransport(lambda _:httpx.Response(503)))) as c:
        c.get('/api/session');r=c.post('/api/expedition/advice',json={'message':'Help','chapter':'earth'}).json();assert r['mode']=='fallback'
