"""Fresh-database demo rehearsal; never changes the user's database."""
import os
import sys
import tempfile
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

with tempfile.TemporaryDirectory() as folder:
    os.environ['KOSTMATE_DB'] = str(Path(folder) / 'fresh.db')
    os.environ['KOSTMATE_SEED'] = '1'
    from fastapi.testclient import TestClient
    from backend.app import app
    with TestClient(app) as c:
        assert c.get('/').status_code == 200
        assert c.get('/kos/1').status_code == 200
        assert c.get('/favicon.svg').headers['content-type'].startswith('image/svg+xml')
        props = c.get('/api/properties').json()
        assert len(props) == 9
        property_id = props[0]['id']
        assert c.post('/api/auth/login', json={'email':'nadia@kostmate.demo','password':'Kostmate123!'}).status_code == 200
        assert c.put(f'/api/favorites/{property_id}').status_code == 200
        assert len(c.get('/api/favorites').json()) == 1
        assert c.post('/api/inquiries', json={'property_id':property_id,'visit_date':date.today().isoformat(),'message':'Demo survei'}).status_code == 201
        complaint = c.post('/api/complaints', json={'property_id':property_id,'title':'Demo AC kamar','message':'Contoh laporan untuk pengujian demo.'})
        assert complaint.status_code == 201
        assert c.post('/api/auth/login', json={'email':'owner@kostmate.demo','password':'Kostmate123!'}).status_code == 200
        dashboard = c.get('/api/owner/dashboard').json()
        assert len(dashboard['properties']) == 9 and len(dashboard['inquiries']) == 1
        assert c.patch('/api/complaints/'+str(complaint.json()['id']), json={'status':'Selesai'}).status_code == 200
        p = c.get(f'/api/properties/{property_id}').json()
        p['available_rooms'] = 0
        assert c.put(f'/api/owner/properties/{property_id}', json=p).status_code == 200
        assert c.get(f'/api/properties/{property_id}').json()['available_rooms'] == 0
        assert c.post('/api/owner/payments', json={'tenant_id':4,'month':dashboard['month'],'amount':1850000}).status_code == 201
        c.post('/api/auth/logout')
        assert c.get('/api/auth/me').status_code == 401
    # Restart using the same database: demo seed must preserve state, not duplicate it.
    with TestClient(app) as c:
        assert len(c.get('/api/properties').json()) == 9
        assert c.get(f'/api/properties/{property_id}').json()['available_rooms'] == 0
    print('DEMO OK: database baru, 9 listing, login dua peran, favorit, survei, pengaduan, kamar, pembayaran, logout, restart.')
