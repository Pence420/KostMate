import asyncio
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from backend.app import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('KOSTMATE_DB', str(tmp_path / 'test.db'))
    monkeypatch.setenv('KOSTMATE_SEED', '1')
    with TestClient(app) as c:
        yield c


def login(client, role='student'):
    email = 'owner@kostmate.demo' if role == 'owner' else 'nadia@kostmate.demo'
    response = client.post('/api/auth/login', json={'email': email, 'password': 'Kostmate123!'})
    assert response.status_code == 200
    return response.json()


def test_search_combines_filters_and_sort(client):
    response = client.get('/api/properties', params={'q': 'BINUS', 'gender': 'Putri', 'facilities': 'AC,Kamar mandi dalam', 'max_price': 2000000, 'available': 'true', 'sort': 'price_asc'})
    assert response.status_code == 200
    rows = response.json()
    assert rows
    assert [p['price'] for p in rows] == sorted(p['price'] for p in rows)
    assert all(p['gender'] == 'Putri' and p['available_rooms'] > 0 and p['price'] <= 2000000 for p in rows)
    assert all('AC' in p['facilities'] and 'Kamar mandi dalam' in p['facilities'] for p in rows)
    assert client.get('/api/properties?q=no-such-kost').json() == []
    assert client.get('/api/properties?min_price=-1').status_code == 422


def test_area_kind_and_move_in_filters(client):
    rows = client.get('/api/properties?area=Alam+Sutera&kind=Eksklusif').json()
    assert len(rows) == 1
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    assert client.get('/api/properties', params={'move_in': yesterday}).json() == []
    today = client.get('/api/properties', params={'move_in': date.today().isoformat()}).json()
    assert today and all(p['available_rooms'] > 0 for p in today)


def test_signup_session_case_insensitive_email_and_logout(client):
    body = {'name': 'New Student', 'email': 'TEST@Example.com', 'password': 'password123', 'role': 'student'}
    response = client.post('/api/auth/register', json=body)
    assert response.status_code == 201
    assert response.json()['email'] == 'test@example.com'
    assert 'password' not in response.json()
    assert 'HttpOnly' in response.headers['set-cookie']
    assert client.get('/api/auth/me').status_code == 200
    assert client.post('/api/auth/register', json=body).status_code == 409
    client.post('/api/auth/logout')
    assert client.get('/api/auth/me').status_code == 401
    assert client.post('/api/auth/login', json={'email': 'test@example.com', 'password': 'wrong'}).status_code == 401


def test_invalid_signup(client):
    assert client.post('/api/auth/register', json={'name': 'A', 'email': 'broken', 'password': 'x', 'role': 'admin'}).status_code == 422
    assert client.post('/api/auth/register', json={'name': '   ', 'email': 'blank@example.com', 'password': 'password123'}).status_code == 422


def test_expired_sessions_require_login(client):
    from backend.db import connect
    login(client)
    with connect() as db:
        db.execute('UPDATE sessions SET expires=0')
    assert client.get('/api/auth/me').status_code == 401
    assert client.get('/api/favorites').status_code == 401


def test_favorites_are_private_idempotent_and_persistent(client):
    assert client.put('/api/favorites/1').status_code == 401
    login(client)
    assert client.put('/api/favorites/1').status_code == 200
    client.put('/api/favorites/1')
    assert len(client.get('/api/favorites').json()) == 1
    client.post('/api/auth/logout')
    login(client)
    assert client.get('/api/favorites').json()[0]['id'] == 1
    client.delete('/api/favorites/1')
    assert client.get('/api/favorites').json() == []
    assert client.put('/api/favorites/999').status_code == 404


def test_student_cannot_manage_owner_records(client):
    login(client)
    assert client.get('/api/owner/dashboard').status_code == 403
    assert client.post('/api/owner/payments', json={'tenant_id': 1, 'month': '2026-11', 'amount': 1}).status_code == 403


def test_owner_updates_availability_and_validates_bounds(client):
    login(client, 'owner')
    p = client.get('/api/properties/1').json()
    p['available_rooms'] = 0
    assert client.put('/api/owner/properties/1', json=p).status_code == 200
    assert client.get('/api/properties/1').json()['available_rooms'] == 0
    assert 1 not in [row['id'] for row in client.get('/api/properties?available=true').json()]
    p['available_rooms'] = p['total_rooms'] + 1
    assert client.put('/api/owner/properties/1', json=p).status_code == 422
    p['available_rooms'] = -1
    assert client.put('/api/owner/properties/1', json=p).status_code == 422


def test_second_owner_cannot_modify_other_owner_data(client):
    p = client.get('/api/properties/1').json()
    client.post('/api/auth/register', json={'name': 'Other owner', 'email': 'other@example.com', 'password': 'password123', 'role': 'owner'})
    assert client.get('/api/owner/dashboard').json()['properties'] == []
    assert client.put('/api/owner/properties/1', json=p).status_code == 403
    assert client.post('/api/owner/tenants', json={'property_id': 1, 'name': 'Someone', 'room': 'A-12', 'monthly_rent': 100}).status_code == 403
    assert client.post('/api/owner/payments', json={'tenant_id': 4, 'month': date.today().strftime('%Y-%m'), 'amount': 1}).status_code == 403


def test_owner_create_property(client):
    login(client, 'owner')
    p = client.get('/api/properties/1').json()
    p['name'] = 'My New Kost'
    result = client.post('/api/owner/properties', json=p)
    assert result.status_code == 201
    assert result.json()['id'] != 1
    assert len(client.get('/api/properties?q=My+New+Kost').json()) == 1
    p['photos'] = ['javascript:alert(1)']
    assert client.post('/api/owner/properties', json=p).status_code == 422


def test_inquiries_route_to_property_owner(client):
    login(client)
    data = {'property_id': 1, 'visit_date': date.today().isoformat(), 'message': 'Sore jam 3'}
    assert client.post('/api/inquiries', json=data).status_code == 201
    data['property_id'] = 6
    assert client.post('/api/inquiries', json=data).status_code == 409
    data['visit_date'] = (date.today() - timedelta(days=1)).isoformat()
    assert client.post('/api/inquiries', json=data).status_code == 422
    login(client, 'owner')
    inbox = client.get('/api/owner/dashboard').json()['inquiries']
    assert len(inbox) == 1
    assert inbox[0]['message'] == 'Sore jam 3'


def test_complaint_visibility_and_owner_status(client):
    login(client)
    created = client.post('/api/complaints', json={'property_id': 1, 'title': 'AC kurang dingin', 'message': 'AC kamar A-01 belum dingin sejak kemarin.'})
    assert created.status_code == 201
    complaint_id = created.json()['id']
    assert len(client.get('/api/complaints').json()) == 1
    assert client.patch(f'/api/complaints/{complaint_id}', json={'status': 'Selesai'}).status_code == 403
    client.post('/api/auth/register', json={'name': 'Other Owner', 'email': 'other@example.com', 'password': 'password123', 'role': 'owner'})
    assert client.get('/api/complaints').json() == []
    assert client.patch(f'/api/complaints/{complaint_id}', json={'status': 'Selesai'}).status_code == 403
    login(client, 'owner')
    assert client.patch(f'/api/complaints/{complaint_id}', json={'status': 'Diproses'}).status_code == 200
    login(client)
    assert client.get('/api/complaints').json()[0]['status'] == 'Diproses'


def test_payment_recording_and_duplicate_prevention(client):
    login(client, 'owner')
    before = client.get('/api/owner/dashboard').json()
    body = {'tenant_id': 4, 'month': before['month'], 'amount': 1850000}
    assert client.post('/api/owner/payments', json=body).status_code == 201
    after = client.get('/api/owner/dashboard').json()
    assert after['stats']['income'] == before['stats']['income'] + 1850000
    assert after['stats']['outstanding'] == 0
    assert client.post('/api/owner/payments', json=body).status_code == 409
    body['month'] = '2026-13'
    assert client.post('/api/owner/payments', json=body).status_code == 422
    body['month'] = '2026-12'
    body['amount'] = -1
    assert client.post('/api/owner/payments', json=body).status_code == 422


def test_tenants_cannot_duplicate_same_room(client):
    login(client, 'owner')
    body = {'property_id': 1, 'name': 'New Tenant', 'room': 'A-05', 'monthly_rent': 1850000}
    assert client.post('/api/owner/tenants', json=body).status_code == 201
    assert client.post('/api/owner/tenants', json=body).status_code == 409


def test_event_stream_changes_revision():
    import backend.app as module

    class Request:
        async def is_disconnected(self):
            return False

    async def check():
        response = await module.events(Request())
        stream = response.body_iterator
        initial = await anext(stream)
        module.changed()
        updated = await anext(stream)
        assert initial != updated
        assert initial.startswith('data: ') and updated.startswith('data: ')
        await stream.aclose()

    asyncio.run(check())
