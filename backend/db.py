import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def connect():
    path = os.environ.get("KOSTMATE_DB", str(Path(__file__).with_name("kostmate.db")))
    db = sqlite3.connect(path, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','owner'))
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id),
            name TEXT NOT NULL, area TEXT NOT NULL, campus TEXT NOT NULL, address TEXT NOT NULL,
            price INTEGER NOT NULL CHECK(price >= 0), gender TEXT NOT NULL, kind TEXT NOT NULL,
            total_rooms INTEGER NOT NULL CHECK(total_rooms > 0),
            available_rooms INTEGER NOT NULL CHECK(available_rooms BETWEEN 0 AND total_rooms),
            available_from TEXT NOT NULL, size TEXT NOT NULL, distance REAL NOT NULL,
            description TEXT NOT NULL, facilities TEXT NOT NULL, rules TEXT NOT NULL,
            photos TEXT NOT NULL, fees TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS favorites (
            user_id INTEGER REFERENCES users(id), property_id INTEGER REFERENCES properties(id),
            PRIMARY KEY(user_id, property_id)
        );
        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
            property_id INTEGER NOT NULL REFERENCES properties(id), visit_date TEXT NOT NULL,
            message TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
            property_id INTEGER NOT NULL REFERENCES properties(id), title TEXT NOT NULL,
            message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Baru', created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tenants (
            id INTEGER PRIMARY KEY, property_id INTEGER NOT NULL REFERENCES properties(id),
            name TEXT NOT NULL, room TEXT NOT NULL, monthly_rent INTEGER NOT NULL CHECK(monthly_rent >= 0)
        );
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY, tenant_id INTEGER NOT NULL REFERENCES tenants(id),
            month TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount > 0), paid_at TEXT NOT NULL,
            UNIQUE(tenant_id, month)
        );
        """)
