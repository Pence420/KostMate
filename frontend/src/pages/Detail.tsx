import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  CalendarDays,
  Check,
  ChevronRight,
  Heart,
  MapPin,
  Maximize,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api, localDate, niceDate, rupiah } from "../api";
import { useApp } from "../context";
import type { Property } from "../types";
import { Empty, Loading, Modal } from "../components/UI";
import { FacilityIcon } from "../components/PropertyCard";

export default function Detail() {
  const { id } = useParams(),
    { favorites, toggleFavorite, requireAuth, notify } = useApp();
  const [p, setP] = useState<Property | null>(null),
    [error, setError] = useState(""),
    [survey, setSurvey] = useState(false),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [photo, setPhoto] = useState<number | null>(null);
  useEffect(() => {
    let current = true;
    setP(null);
    setError("");
    const load = () =>
      api<Property>("/properties/" + id)
        .then((x) => {
          if (current) {
            setP(x);
            setError("");
          }
        })
        .catch((e) => {
          if (current) setError(e.message);
        });
    void load();
    const events = new EventSource("/api/events");
    events.onmessage = () => void load();
    return () => {
      current = false;
      events.close();
    };
  }, [id]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    const form = new FormData(e.currentTarget);
    try {
      await api("/inquiries", {
        method: "POST",
        body: JSON.stringify({
          ...Object.fromEntries(form),
          property_id: p!.id,
        }),
      });
      setSurvey(false);
      notify(
        "Permintaan survei tersimpan di dashboard pemilik. Menunggu konfirmasi.",
      );
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <div className="container standard-page">
        <Empty
          title="Kos belum bisa dibuka"
          description={error}
          action={
            <Link to="/" className="btn primary">
              Cari kos lain
            </Link>
          }
        />
      </div>
    );
  if (!p) return <Loading />;
  const saved = favorites.includes(p.id);
  return (
    <div className="container detail-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Cari kos</Link>
        <ChevronRight size={13} />
        <Link to={"/?area=" + p.area}>{p.area}</Link>
        <ChevronRight size={13} />
        <span>{p.name}</span>
      </nav>
      <div className="detail-heading">
        <div>
          <div className="detail-badges">
            <span className="tag">Kos {p.gender}</span>
            <span className="tag neutral">{p.kind}</span>
            <span className="availability">
              <i />
              {p.available_rooms
                ? `${p.available_rooms} kamar tersedia`
                : "Sedang penuh"}
            </span>
          </div>
          <h1>{p.name}</h1>
          <p>
            <MapPin size={16} />
            {p.address}
            <span>·</span>
            {p.distance} km dari {p.campus}
          </p>
        </div>
        <button
          className={"btn outline " + (saved ? "favorite-active" : "")}
          onClick={() => void toggleFavorite(p.id)}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
          {saved ? "Tersimpan" : "Simpan"}
        </button>
      </div>
      <div className="gallery">
        {p.photos.map((src, i) => (
          <button
            key={src}
            onClick={() => setPhoto(i)}
            className={"gallery-photo photo-" + i}
            aria-label={"Perbesar foto " + (i + 1)}
          >
            <img src={src} alt={"Ilustrasi " + p.name + ", foto " + (i + 1)} />
            {i === 2 && (
              <span>
                Lihat semua foto <Maximize size={14} />
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="photo-disclaimer">
        Foto ilustrasi · Konfirmasi kondisi kamar langsung dengan pemilik.
      </p>
      <div className="detail-layout">
        <div className="detail-info">
          <section className="detail-section first">
            <div className="detail-section-title">
              <div>
                <span className="eyebrow">KENALAN DENGAN TEMPAT PULANGMU</span>
                <h2>Ruang nyaman untuk keseharianmu.</h2>
              </div>
              <span className="owner-avatar">{p.owner_name.charAt(0)}</span>
            </div>
            <p>
              Dikelola oleh <strong>{p.owner_name}</strong>
            </p>
            <div className="room-specs">
              <span>
                <Maximize size={20} />
                <strong>{p.size}</strong>Ukuran kamar
              </span>
              <span>
                <Bath size={20} />
                <strong>
                  {p.facilities.includes("Kamar mandi dalam")
                    ? "Di dalam"
                    : "Bersama"}
                </strong>
                Kamar mandi
              </span>
              <span>
                <CalendarDays size={20} />
                <strong>{niceDate(p.available_from)}</strong>Mulai tersedia
              </span>
            </div>
            <p className="description">{p.description}</p>
          </section>
          <section className="detail-section">
            <h2>Yang bikin kamu betah</h2>
            <div className="facility-grid">
              {p.facilities.map((f) => (
                <div key={f}>
                  <FacilityIcon name={f} size={23} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <h2>Peraturan kos</h2>
            <p>Supaya semua penghuni merasa nyaman.</p>
            <ul className="rule-list">
              {p.rules.map((r) => (
                <li key={r}>
                  <Check size={16} />
                  {r}
                </li>
              ))}
            </ul>
          </section>
          <section className="detail-section">
            <h2>Biaya yang perlu kamu tahu</h2>
            <div className="cost-line">
              <span>Sewa kamar per bulan</span>
              <strong>{rupiah(p.price)}</strong>
            </div>
            <div className="cost-note">
              <ShieldCheck size={22} />
              <p>
                {p.fees ||
                  "Belum ada informasi biaya tambahan. Tanyakan kepada pemilik sebelum menyewa."}
              </p>
            </div>
            <p className="muted">
              Pembayaran sewa disepakati langsung dengan pemilik kos. KostMate
              belum memproses pembayaran online.
            </p>
          </section>
          <section className="detail-section">
            <h2>Di sekitar kampusmu</h2>
            <div className="location-card">
              <div className="location-icon">
                <MapPin size={30} />
              </div>
              <div>
                <strong>{p.area}</strong>
                <p>{p.address}</p>
                <span>
                  {p.distance} km dari {p.campus}
                </span>
              </div>
              <a
                className="btn outline"
                target="_blank"
                rel="noreferrer"
                href={
                  "https://www.google.com/maps/search/?api=1&query=" +
                  encodeURIComponent(p.address + " " + p.campus)
                }
              >
                Buka peta
                <ArrowRight size={15} />
              </a>
            </div>
          </section>
        </div>
        <aside className="booking-card">
          <span className="eyebrow">SEWA BULANAN</span>
          <div className="booking-price">
            {rupiah(p.price)}
            <small>/ bulan</small>
          </div>
          <div
            className={
              "availability-panel " + (!p.available_rooms ? "unavailable" : "")
            }
          >
            <span>
              <i />
              {p.available_rooms
                ? `${p.available_rooms} kamar masih tersedia`
                : "Semua kamar sedang terisi"}
            </span>
            <small>Info diperbarui {niceDate(p.updated_at)}</small>
          </div>
          <div className="booking-detail">
            <span>Tipe penghuni</span>
            <strong>{p.gender}</strong>
          </div>
          <div className="booking-detail">
            <span>Ukuran kamar</span>
            <strong>{p.size}</strong>
          </div>
          <button
            className="btn primary full"
            disabled={!p.available_rooms}
            onClick={() => {
              if (requireAuth()) setSurvey(true);
            }}
          >
            <CalendarDays size={18} />
            Ajukan jadwal survei
          </button>
          {p.phone ? (
            <a
              className="btn outline full"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${p.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Halo, saya tertarik dengan " + p.name + " di KostMate. Apakah kamar masih tersedia?")}`}
            >
              <MessageCircle size={18} />
              Hubungi pemilik
            </a>
          ) : (
            <div className="contact-demo">
              <MessageCircle size={16} />
              <span>
                Kontak demo belum diisi. Gunakan form survei untuk mencoba
                alurnya.
              </span>
            </div>
          )}
          <p className="booking-footnote">
            Pengajuan survei gratis, tanpa komitmen sewa.
          </p>
          <div className="booking-owner">
            <span className="avatar">{p.owner_name.charAt(0)}</span>
            <div>
              <strong>{p.owner_name}</strong>
              <span>Pemilik kos</span>
            </div>
            <ShieldCheck size={20} />
          </div>
        </aside>
      </div>
      <div className="detail-end">
        <Sparkles size={20} />
        <span>Kos yang pas bikin hari-hari terasa lebih ringan.</span>
        <Link to="/">
          <ArrowLeft size={15} />
          Lihat pilihan lain
        </Link>
      </div>
      {survey && (
        <Modal
          title="Yuk, lihat kosnya langsung"
          onClose={() => setSurvey(false)}
        >
          <p className="modal-description">
            Ajukan jadwal untuk {p.name}. Pemilik akan melihat permintaanmu di
            dashboard. Ini belum merupakan konfirmasi jadwal.
          </p>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Tanggal survei
              <input type="date" name="visit_date" required min={localDate()} />
            </label>
            <label>
              Pesan untuk pemilik
              <textarea
                name="message"
                maxLength={1000}
                placeholder="Misalnya: saya bisa datang sekitar pukul 15.00."
                rows={4}
              />
            </label>
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <button disabled={busy} className="btn primary full">
              {busy ? "Menyimpan…" : "Ajukan survei"}
              <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
      {photo !== null && (
        <Modal
          title={`Foto ${photo + 1} dari ${p.photos.length}`}
          onClose={() => setPhoto(null)}
          wide
        >
          <img
            className="lightbox-image"
            src={p.photos[photo]}
            alt={"Ilustrasi " + p.name}
          />
          <div className="lightbox-thumbs">
            {p.photos.map((src, i) => (
              <button
                key={i}
                onClick={() => setPhoto(i)}
                className={i === photo ? "active" : ""}
                aria-label={"Lihat foto " + (i + 1)}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
          <p className="muted">Foto ilustrasi untuk versi demo.</p>
        </Modal>
      )}
    </div>
  );
}
