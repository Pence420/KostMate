import asyncio
import json
import os
import secrets
import sqlite3
import time
from contextlib import asynccontextmanager
from datetime import date, datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .db import connect, init_db
from .models import (ComplaintInput, ComplaintStatus, InquiryInput, Login, PaymentInput,
                     PropertyInput, Register, TenantInput)
from .security import hash_password, verify_password
from .seed import seed

revision = 0


@asynccontextmanager
async def lifespan(app):
    init_db()
    if os.environ.get('KOSTMATE_SEED', '1') == '1':
        seed()
    yield


app = FastAPI(title='KostMate API', lifespan=lifespan)


def now():
    return datetime.now(timezone.utc).isoformat()


def changed():
    global revision
    revision += 1


def public_user(row):
    return {key: row[key] for key in ['id', 'name', 'email', 'role']}


def current_user(request: Request):
    with connect() as db:
        row = db.execute('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?',
                         (request.cookies.get('kostmate_session', ''), int(time.time()))).fetchone()
    if not row:
        raise HTTPException(401, 'Masuk dulu untuk melanjutkan.')
    return public_user(row)


def owner(user=Depends(current_user)):
    if user['role'] != 'owner':
        raise HTTPException(403, 'Halaman ini khusus pemilik kos.')
    return user


def owned_property(db, property_id, user):
    row = db.execute('SELECT * FROM properties WHERE id=?', (property_id,)).fetchone()
    if not row:
        raise HTTPException(404, 'Kos tidak ditemukan.')
    if row['owner_id'] != user['id']:
        raise HTTPException(403, 'Kamu tidak memiliki akses ke kos ini.')
    return row


def serialize_property(row):
    result = dict(row)
    for key in ['facilities', 'rules', 'photos']:
        result[key] = json.loads(result[key])
    return result


def create_session(db, user_id, response):
    token = secrets.token_urlsafe(40)
    db.execute('DELETE FROM sessions WHERE expires < ?', (int(time.time()),))
    db.execute('INSERT INTO sessions VALUES (?,?,?)', (token, user_id, int(time.time()) + 604800))
    response.set_cookie('kostmate_session', token, httponly=True, samesite='lax',
                        secure=os.environ.get('COOKIE_SECURE') == '1', max_age=604800)


@app.get('/api/health')
def health():
    return {'status': 'ok'}


@app.post('/api/auth/register', status_code=201)
def register(data: Register, response: Response):
    with connect() as db:
        try:
            cursor = db.execute('INSERT INTO users(name,email,password,role) VALUES (?,?,?,?)',
                                (data.name.strip(), data.email, hash_password(data.password), data.role))
        except sqlite3.IntegrityError:
            raise HTTPException(409, 'Email ini sudah terdaftar.')
        user = db.execute('SELECT * FROM users WHERE id=?', (cursor.lastrowid,)).fetchone()
        create_session(db, user['id'], response)
        return public_user(user)


@app.post('/api/auth/login')
def login(data: Login, response: Response):
    with connect() as db:
        user = db.execute('SELECT * FROM users WHERE email=?', (data.email,)).fetchone()
        if not user or not verify_password(data.password, user['password']):
            raise HTTPException(401, 'Email atau kata sandi kurang tepat.')
        create_session(db, user['id'], response)
        return public_user(user)


@app.get('/api/auth/me')
def me(user=Depends(current_user)):
    return user


@app.post('/api/auth/logout')
def logout(request: Request, response: Response):
    with connect() as db:
        db.execute('DELETE FROM sessions WHERE token=?', (request.cookies.get('kostmate_session', ''),))
    response.delete_cookie('kostmate_session')
    return {'ok': True}


@app.get('/api/properties')
def properties(q: str = '', area: str = '', gender: str = '', kind: str = '',
               min_price: int = Query(0, ge=0), max_price: int = Query(100_000_000, ge=0),
               facilities: str = '', available: bool = False, move_in: date | None = None,
               sort: str = 'recommended'):
    with connect() as db:
        rows = db.execute('SELECT p.*, u.name AS owner_name FROM properties p JOIN users u ON u.id=p.owner_id').fetchall()
    result = []
    terms = q.lower().strip().split()
    required = [f for f in facilities.split(',') if f]
    for row in rows:
        p = serialize_property(row)
        if terms and not all(term in f"{p['name']} {p['area']} {p['campus']} {p['address']}".lower() for term in terms):
            continue
        if area and p['area'] != area or gender and p['gender'] != gender or kind and p['kind'] != kind:
            continue
        if not min_price <= p['price'] <= max_price:
            continue
        if any(f not in p['facilities'] for f in required):
            continue
        if available and p['available_rooms'] == 0:
            continue
        if move_in and (p['available_from'] > move_in.isoformat() or p['available_rooms'] == 0):
            continue
        result.append(p)
    sort_key = {'price_asc': lambda p: p['price'], 'price_desc': lambda p: -p['price'],
                'distance': lambda p: p['distance'], 'recommended': lambda p: (p['available_rooms'] == 0, p['distance'])}
    result.sort(key=sort_key.get(sort, sort_key['recommended']))
    return result


@app.get('/api/properties/{property_id}')
def property_detail(property_id: int):
    with connect() as db:
        row = db.execute('SELECT p.*,u.name AS owner_name FROM properties p JOIN users u ON u.id=p.owner_id WHERE p.id=?', (property_id,)).fetchone()
    if not row:
        raise HTTPException(404, 'Kos tidak ditemukan.')
    return serialize_property(row)


@app.get('/api/events')
async def events(request: Request):
    async def stream():
        seen = -1
        while not await request.is_disconnected():
            if seen != revision:
                seen = revision
                yield f'data: {seen}\n\n'
            else:
                yield ': keepalive\n\n'
            await asyncio.sleep(2)
    return StreamingResponse(stream(), media_type='text/event-stream', headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@app.get('/api/favorites')
def favorites(user=Depends(current_user)):
    with connect() as db:
        rows = db.execute('SELECT p.*,u.name AS owner_name FROM properties p JOIN favorites f ON f.property_id=p.id JOIN users u ON u.id=p.owner_id WHERE f.user_id=?', (user['id'],)).fetchall()
    return [serialize_property(row) for row in rows]


@app.put('/api/favorites/{property_id}')
def save_favorite(property_id: int, user=Depends(current_user)):
    property_detail(property_id)
    with connect() as db:
        db.execute('INSERT OR IGNORE INTO favorites VALUES (?,?)', (user['id'], property_id))
    return {'saved': True}


@app.delete('/api/favorites/{property_id}')
def remove_favorite(property_id: int, user=Depends(current_user)):
    with connect() as db:
        db.execute('DELETE FROM favorites WHERE user_id=? AND property_id=?', (user['id'], property_id))
    return {'saved': False}


@app.post('/api/inquiries', status_code=201)
def create_inquiry(data: InquiryInput, user=Depends(current_user)):
    p = property_detail(data.property_id)
    if p['available_rooms'] == 0:
        raise HTTPException(409, 'Kos ini sedang penuh. Coba kos lain yang tersedia.')
    with connect() as db:
        cursor = db.execute('INSERT INTO inquiries(user_id,property_id,visit_date,message,created_at) VALUES (?,?,?,?,?)', (user['id'], data.property_id, data.visit_date.isoformat(), data.message, now()))
    return {'id': cursor.lastrowid}


@app.get('/api/complaints')
def complaints(user=Depends(current_user)):
    with connect() as db:
        field = 'p.owner_id' if user['role'] == 'owner' else 'c.user_id'
        rows = db.execute(f'SELECT c.*, p.name AS property_name,u.name AS reporter FROM complaints c JOIN properties p ON p.id=c.property_id JOIN users u ON u.id=c.user_id WHERE {field}=? ORDER BY c.id DESC', (user['id'],)).fetchall()
    return [dict(r) for r in rows]


@app.post('/api/complaints', status_code=201)
def create_complaint(data: ComplaintInput, user=Depends(current_user)):
    property_detail(data.property_id)
    with connect() as db:
        cursor = db.execute('INSERT INTO complaints(user_id,property_id,title,message,created_at) VALUES (?,?,?,?,?)', (user['id'], data.property_id, data.title.strip(), data.message.strip(), now()))
    return {'id': cursor.lastrowid}


@app.patch('/api/complaints/{complaint_id}')
def update_complaint(complaint_id: int, data: ComplaintStatus, user=Depends(owner)):
    with connect() as db:
        row = db.execute('SELECT property_id FROM complaints WHERE id=?', (complaint_id,)).fetchone()
        if not row:
            raise HTTPException(404, 'Pengaduan tidak ditemukan.')
        owned_property(db, row['property_id'], user)
        db.execute('UPDATE complaints SET status=? WHERE id=?', (data.status, complaint_id))
    return {'ok': True}


@app.get('/api/owner/dashboard')
def dashboard(user=Depends(owner)):
    month = date.today().strftime('%Y-%m')
    with connect() as db:
        props = [serialize_property(r) for r in db.execute('SELECT p.*, u.name AS owner_name FROM properties p JOIN users u ON u.id=p.owner_id WHERE owner_id=?', (user['id'],)).fetchall()]
        tenants = [dict(r) for r in db.execute('''SELECT t.*,p.name AS property_name,COALESCE(pay.amount,0) AS paid_amount
            FROM tenants t JOIN properties p ON p.id=t.property_id
            LEFT JOIN payments pay ON pay.tenant_id=t.id AND pay.month=? WHERE p.owner_id=?''', (month, user['id'])).fetchall()]
        inquiries = [dict(r) for r in db.execute('''SELECT i.*,p.name AS property_name,u.name AS student_name,u.email AS student_email
            FROM inquiries i JOIN properties p ON p.id=i.property_id JOIN users u ON u.id=i.user_id WHERE p.owner_id=? ORDER BY i.id DESC''', (user['id'],)).fetchall()]
    return {'properties': props, 'tenants': tenants, 'inquiries': inquiries, 'month': month,
            'stats': {'total_rooms': sum(p['total_rooms'] for p in props), 'available_rooms': sum(p['available_rooms'] for p in props),
                      'income': sum(t['paid_amount'] for t in tenants), 'outstanding': sum(max(0, t['monthly_rent'] - t['paid_amount']) for t in tenants)}}


def property_values(data):
    values = data.model_dump(mode='json')
    for key in ['photos', 'facilities', 'rules']:
        values[key] = json.dumps(values[key])
    values['updated_at'] = now()
    return values


@app.post('/api/owner/properties', status_code=201)
def create_property(data: PropertyInput, user=Depends(owner)):
    values = property_values(data)
    values['owner_id'] = user['id']
    with connect() as db:
        fields = ','.join(values)
        cursor = db.execute(f"INSERT INTO properties({fields}) VALUES ({','.join('?' for _ in values)})", tuple(values.values()))
    changed()
    return property_detail(cursor.lastrowid)


@app.put('/api/owner/properties/{property_id}')
def update_property(property_id: int, data: PropertyInput, user=Depends(owner)):
    values = property_values(data)
    with connect() as db:
        owned_property(db, property_id, user)
        fields = ','.join(f'{key}=?' for key in values)
        db.execute(f'UPDATE properties SET {fields} WHERE id=?', (*values.values(), property_id))
    changed()
    return property_detail(property_id)


@app.post('/api/owner/tenants', status_code=201)
def create_tenant(data: TenantInput, user=Depends(owner)):
    with connect() as db:
        owned_property(db, data.property_id, user)
        if db.execute('SELECT id FROM tenants WHERE property_id=? AND lower(room)=lower(?)', (data.property_id, data.room.strip())).fetchone():
            raise HTTPException(409, 'Kamar ini sudah memiliki catatan penghuni.')
        cursor = db.execute('INSERT INTO tenants(property_id,name,room,monthly_rent) VALUES (?,?,?,?)', (data.property_id, data.name.strip(), data.room.strip(), data.monthly_rent))
    return {'id': cursor.lastrowid}


@app.post('/api/owner/payments', status_code=201)
def create_payment(data: PaymentInput, user=Depends(owner)):
    with connect() as db:
        tenant = db.execute('SELECT * FROM tenants WHERE id=?', (data.tenant_id,)).fetchone()
        if not tenant:
            raise HTTPException(404, 'Penghuni tidak ditemukan.')
        owned_property(db, tenant['property_id'], user)
        try:
            db.execute('INSERT INTO payments(tenant_id,month,amount,paid_at) VALUES (?,?,?,?)', (data.tenant_id, data.month, data.amount, now()))
        except sqlite3.IntegrityError:
            raise HTTPException(409, 'Pembayaran bulan ini sudah tercatat.')
    return {'ok': True}


dist = Path(__file__).resolve().parent.parent / 'frontend' / 'dist'
if dist.exists():
    app.mount('/assets', StaticFiles(directory=dist / 'assets'), name='assets')

    @app.get('/favicon.svg', include_in_schema=False)
    def favicon():
        return FileResponse(dist / 'favicon.svg', media_type='image/svg+xml')

    @app.get('/{path:path}')
    def frontend(path: str):
        if path.startswith('api/'):
            raise HTTPException(404, 'Endpoint tidak ditemukan.')
        return FileResponse(dist / 'index.html')
