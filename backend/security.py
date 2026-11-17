import hashlib
import hmac
import secrets


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 310_000).hex()
    return salt + ':' + hashed


def verify_password(password: str, stored: str) -> bool:
    salt, hashed = stored.split(':', 1)
    candidate = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 310_000).hex()
    return hmac.compare_digest(candidate, hashed)
