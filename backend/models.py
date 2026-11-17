import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class Login(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator('email')
    @classmethod
    def clean_email(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Alamat email tidak valid')
        return value


class Register(Login):
    name: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    role: Literal['student', 'owner'] = 'student'

    @field_validator('name')
    @classmethod
    def valid_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError('Nama minimal 2 karakter')
        return value


class PropertyInput(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    area: str = Field(min_length=2, max_length=100)
    campus: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=5, max_length=500)
    price: int = Field(ge=0, le=100_000_000)
    gender: Literal['Putri', 'Putra', 'Campur']
    kind: Literal['Reguler', 'Eksklusif'] = 'Reguler'
    total_rooms: int = Field(ge=1, le=500)
    available_rooms: int = Field(ge=0, le=500)
    available_from: date
    size: str = Field(min_length=2, max_length=40)
    distance: float = Field(ge=0, le=100)
    description: str = Field(min_length=10, max_length=5000)
    facilities: list[str] = Field(max_length=20)
    rules: list[str] = Field(max_length=20)
    photos: list[str] = Field(min_length=1, max_length=8)
    fees: str = Field(max_length=1000)
    phone: str = Field(default='', max_length=20, pattern=r'^\+?[0-9]{0,18}$')

    @field_validator('photos')
    @classmethod
    def photo_urls(cls, value):
        if any(not url.startswith(('https://', '/images/')) for url in value):
            raise ValueError('Foto harus berupa URL HTTPS')
        return value

    @model_validator(mode='after')
    def room_bounds(self):
        if self.available_rooms > self.total_rooms:
            raise ValueError('Kamar kosong melebihi jumlah kamar')
        return self


class InquiryInput(BaseModel):
    property_id: int
    visit_date: date
    message: str = Field(default='', max_length=1000)

    @field_validator('visit_date')
    @classmethod
    def future_date(cls, value):
        if value < date.today():
            raise ValueError('Pilih hari ini atau tanggal mendatang')
        return value


class ComplaintInput(BaseModel):
    property_id: int
    title: str = Field(min_length=3, max_length=120)
    message: str = Field(min_length=10, max_length=2000)


class ComplaintStatus(BaseModel):
    status: Literal['Baru', 'Diproses', 'Selesai']


class TenantInput(BaseModel):
    property_id: int
    name: str = Field(min_length=2, max_length=80)
    room: str = Field(min_length=1, max_length=30)
    monthly_rent: int = Field(ge=0, le=100_000_000)


class PaymentInput(BaseModel):
    tenant_id: int
    month: str = Field(pattern=r'^\d{4}-(0[1-9]|1[0-2])$')
    amount: int = Field(gt=0, le=100_000_000)
