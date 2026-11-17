import json
from datetime import date, datetime, timezone

from .db import connect
from .security import hash_password

PHOTO_IDS = [
    'photo-1616486338812-3dadae4b4ace', 'photo-1615874694520-474822394e73',
    'photo-1616594039964-ae9021a400a0', 'photo-1505693416388-ac5ce068fe85',
    'photo-1540518614846-7eded433c457', 'photo-1522771739844-6a9f6d5f14af',
]


def seed():
    with connect() as db:
        if db.execute('SELECT id FROM users LIMIT 1').fetchone():
            return
        for name, email, role in [('Nadia Putri', 'nadia@kostmate.demo', 'student'), ('Budi Santoso', 'owner@kostmate.demo', 'owner')]:
            db.execute('INSERT INTO users(name,email,password,role) VALUES (?,?,?,?)', (name, email, hash_password('Kostmate123!'), role))
        data = [
            ('Kost Sela Kemanggisan', 'Kemanggisan', 'BINUS Anggrek', 1850000, 'Putri', 'Eksklusif', 20, 3, 0.4, ['WiFi', 'AC', 'Kamar mandi dalam', 'Dapur bersama']),
            ('Ruang Teduh Residence', 'Alam Sutera', 'BINUS Alam Sutera', 2200000, 'Campur', 'Eksklusif', 24, 5, 0.8, ['WiFi', 'AC', 'Kamar mandi dalam', 'Parkir', 'Laundry']),
            ('Kost Nara Syahdan', 'Kemanggisan', 'BINUS Syahdan', 1350000, 'Putra', 'Reguler', 15, 2, 0.3, ['WiFi', 'Parkir', 'Dapur bersama']),
            ('Casa Kecil Palmerah', 'Palmerah', 'BINUS Anggrek', 1650000, 'Putri', 'Reguler', 18, 4, 1.2, ['WiFi', 'AC', 'Kamar mandi dalam', 'Dapur bersama']),
            ('Kost Hening @ Bekasi', 'Bekasi', 'BINUS Bekasi', 1500000, 'Campur', 'Reguler', 16, 2, 0.6, ['WiFi', 'AC', 'Parkir']),
            ('Paviliun Senja', 'Kemanggisan', 'BINUS Kijang', 2450000, 'Campur', 'Eksklusif', 30, 0, 0.5, ['WiFi', 'AC', 'Kamar mandi dalam', 'Parkir', 'Laundry']),
            ('Kost Akar Alam Sutera', 'Alam Sutera', 'BINUS Alam Sutera', 1750000, 'Putra', 'Reguler', 12, 1, 1.0, ['WiFi', 'AC', 'Dapur bersama']),
            ('Rumah Rumpun', 'Palmerah', 'BINUS Syahdan', 1250000, 'Putri', 'Reguler', 10, 3, 1.5, ['WiFi', 'Parkir', 'Dapur bersama']),
            ('Kost Temu Bekasi', 'Bekasi', 'BINUS Bekasi', 1950000, 'Putra', 'Eksklusif', 22, 4, 0.9, ['WiFi', 'AC', 'Kamar mandi dalam', 'Laundry']),
        ]
        for i, (name, area, campus, price, gender, kind, total, available, distance, facilities) in enumerate(data):
            photos = [f'https://images.unsplash.com/{PHOTO_IDS[(i+j)%len(PHOTO_IDS)]}?auto=format&fit=crop&w=1200&q=85' for j in range(3)]
            db.execute('''INSERT INTO properties(owner_id,name,area,campus,address,price,gender,kind,total_rooms,available_rooms,available_from,size,distance,description,facilities,rules,photos,fees,phone,updated_at)
                          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                       (2, name, area, campus, f'Jl. {area} Raya No. {12+i}, {area}', price, gender, kind, total, available,
                        date.today().isoformat(), '3 × 4 m', distance,
                        f'Tempat pulang yang tenang di {area}. Kamar terang dengan sirkulasi udara yang baik, cocok untuk kamu yang ingin fokus kuliah sekaligus menikmati waktu istirahat. Dekat dengan {campus}, tempat makan, dan kebutuhan sehari-hari.',
                        json.dumps(facilities), json.dumps(['Tidak merokok di dalam kamar', 'Jam tenang mulai pukul 22.00', 'Tamu menginap wajib izin pengelola', 'Hewan peliharaan belum diperbolehkan']), json.dumps(photos),
                        'Deposit Rp500.000, dapat dikembalikan sesuai kondisi kamar. Listrik menggunakan token pribadi. WiFi dan air termasuk harga sewa.', '', datetime.now(timezone.utc).isoformat()))
        for name, room, rent in [('Alya Putri', 'A-01', 1850000), ('Dinda Maharani', 'A-02', 1850000), ('Salsa Nabila', 'A-03', 1850000), ('Citra Ayuning', 'A-04', 1850000)]:
            db.execute('INSERT INTO tenants(property_id,name,room,monthly_rent) VALUES (1,?,?,?)', (name, room, rent))
        month = date.today().strftime('%Y-%m')
        for tenant in [1, 2, 3]:
            db.execute('INSERT INTO payments(tenant_id,month,amount,paid_at) VALUES (?,?,?,?)', (tenant, month, 1850000, date.today().isoformat()))
