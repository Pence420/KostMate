import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  GraduationCap,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "../api";
import type { Property } from "../types";
import PropertyCard from "../components/PropertyCard";
import { Empty, Loading, Modal } from "../components/UI";

const allFacilities = [
  "WiFi",
  "AC",
  "Kamar mandi dalam",
  "Parkir",
  "Dapur bersama",
  "Laundry",
];
const areas = [
  "Semua area",
  "Kemanggisan",
  "Alam Sutera",
  "Bekasi",
  "Palmerah",
];
export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [filterOpen, setFilterOpen] = useState(false),
    [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState(params.get("q") || "");
  const query = params.toString();
  useEffect(() => {
    const s = new EventSource("/api/events");
    s.onmessage = () => setRevision((v) => v + 1);
    return () => s.close();
  }, []);
  useEffect(() => {
    let current = true;
    setLoading(true);
    api<Property[]>("/properties?" + query)
      .then((data) => {
        if (current) {
          setProperties(data);
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [query, revision]);
  useEffect(() => setDraft(params.get("q") || ""), [params.get("q")]);
  function update(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        value ? next.set(key, value) : next.delete(key);
        return next;
      },
      { replace: true },
    );
  }
  function search(e: FormEvent) {
    e.preventDefault();
    update("q", draft);
    document
      .getElementById("pilihan-kos")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const selectedFacilities = (params.get("facilities") || "")
    .split(",")
    .filter(Boolean);
  const filterCount =
    ["gender", "kind", "min_price", "max_price", "available", "move_in"].filter(
      (k) => params.has(k),
    ).length + selectedFacilities.length;
  const filters = (
    <>
      <div className="filter-title">
        <h3>
          <SlidersHorizontal size={16} />
          Filter pencarian
        </h3>
        <button
          className="text-button"
          onClick={() => {
            setParams({});
            setDraft("");
          }}
        >
          Reset
        </button>
      </div>
      <fieldset>
        <legend>Tipe penghuni</legend>
        <div className="gender-options">
          {["Semua", "Putri", "Putra", "Campur"].map((g) => (
            <button
              key={g}
              className={
                (params.get("gender") || "Semua") === g ? "selected" : ""
              }
              onClick={() => update("gender", g === "Semua" ? "" : g)}
            >
              {g}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Harga per bulan</legend>
        <div className="price-inputs">
          <label>
            Minimum
            <div>
              <span>Rp</span>
              <input
                aria-label="Harga minimum"
                type="number"
                min={0}
                step={100000}
                placeholder="0"
                value={params.get("min_price") || ""}
                onChange={(e) => update("min_price", e.target.value)}
              />
            </div>
          </label>
          <label>
            Maksimum
            <div>
              <span>Rp</span>
              <input
                aria-label="Harga maksimum"
                type="number"
                min={0}
                step={100000}
                placeholder="3.000.000"
                value={params.get("max_price") || ""}
                onChange={(e) => update("max_price", e.target.value)}
              />
            </div>
          </label>
        </div>
        <p className="filter-note">Temukan yang pas di kantongmu.</p>
      </fieldset>
      <fieldset>
        <legend>Fasilitas pilihan</legend>
        {allFacilities.map((f) => (
          <label key={f} className="check-row">
            <input
              type="checkbox"
              checked={selectedFacilities.includes(f)}
              onChange={() =>
                update(
                  "facilities",
                  selectedFacilities.includes(f)
                    ? selectedFacilities.filter((x) => x !== f).join(",")
                    : [...selectedFacilities, f].join(","),
                )
              }
            />
            <span>{f}</span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Jenis kos</legend>
        <select
          aria-label="Jenis kos"
          value={params.get("kind") || ""}
          onChange={(e) => update("kind", e.target.value)}
        >
          <option value="">Semua jenis</option>
          <option>Reguler</option>
          <option>Eksklusif</option>
        </select>
      </fieldset>
      <fieldset>
        <legend>Rencana masuk</legend>
        <input
          aria-label="Tanggal rencana masuk"
          type="date"
          value={params.get("move_in") || ""}
          onChange={(e) => update("move_in", e.target.value)}
        />
      </fieldset>
      <label className="check-row available-check">
        <input
          type="checkbox"
          checked={params.get("available") === "true"}
          onChange={(e) => update("available", e.target.checked ? "true" : "")}
        />
        <span>Hanya kamar tersedia</span>
      </label>
      <div className="filter-help">
        <ShieldCheck size={22} />
        <strong>Lebih jelas, lebih tenang.</strong>
        <p>Periksa detail biaya dan peraturan sebelum memilih kos.</p>
      </div>
    </>
  );
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="little-star">✳</span> TEMAN CARI KOS, TEMAN HIDUP
            NYAMAN
          </span>
          <h1>
            Kampus dekat.
            <br />
            <span>Pulang pun nyaman.</span>
          </h1>
          <p>
            Temukan kos yang pas buat hidupmu.
            <br className="desktop-break" /> Harga jelas, info kamar terkini,
            tanpa bolak-balik survei.
          </p>
          <div className="hero-note">
            <span className="note-icon">
              <GraduationCap size={18} />
            </span>
            Mulai dari sekitar kampus BINUS
            <ArrowUpRight size={16} />
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1100&q=85"
            alt="Ilustrasi hunian nyaman dengan interior hangat"
            fetchPriority="high"
          />
          <span className="hero-image-label">
            A little space. A fresh start.
          </span>
          <div className="floating-card">
            <span>
              <CheckCheck size={22} />
            </span>
            <div>
              <strong>Tempat baru, cerita baru.</strong>
              <small>Yuk, temukan ruang nyamanmu.</small>
            </div>
          </div>
          <span className="hero-doodle">
            <Sparkles size={27} strokeWidth={1.3} />
          </span>
        </div>
      </section>
      <div className="container search-container">
        <form className="search-bar" onSubmit={search}>
          <label className="search-field">
            <MapPin size={21} />
            <span>
              <strong>Mau ngekos di mana?</strong>
              <input
                placeholder="Cari nama kos, area, atau kampus"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Cari nama kos, area, atau kampus"
              />
            </span>
          </label>
          <label className="area-field">
            <GraduationCap size={21} />
            <span>
              <strong>Area pilihan</strong>
              <select
                aria-label="Area pilihan"
                value={params.get("area") || ""}
                onChange={(e) => update("area", e.target.value)}
              >
                {areas.map((a, i) => (
                  <option key={a} value={i === 0 ? "" : a}>
                    {a}
                  </option>
                ))}
              </select>
            </span>
            <ChevronDown size={14} />
          </label>
          <button className="btn primary search-submit">
            <Search size={19} />
            Cari kos
          </button>
        </form>
        <div className="search-trust">
          <span>
            <Check size={13} />
            Harga sewa transparan
          </span>
          <span>
            <Check size={13} />
            Ketersediaan diperbarui pemilik
          </span>
          <span>
            <Check size={13} />
            Langsung terhubung dengan pemilik
          </span>
        </div>
      </div>
      <section className="container discovery" id="pilihan-kos">
        <div className="section-heading">
          <div>
            <span className="eyebrow sub-eyebrow">RUANG YANG PAS UNTUKMU</span>
            <h2>
              Mulai cerita dari sini<span className="heading-dot">.</span>
            </h2>
            <p>Kos nyaman, selangkah lebih dekat ke keseharianmu.</p>
          </div>
          <a className="browse-link" href="#results">
            Jelajahi pilihan kos
            <ArrowDown size={17} />
          </a>
        </div>
        <div className="area-tabs" role="group" aria-label="Pilih area">
          {areas.map((a, i) => (
            <button
              key={a}
              className={
                (params.get("area") || "") === (i === 0 ? "" : a)
                  ? "active"
                  : ""
              }
              onClick={() => update("area", i === 0 ? "" : a)}
            >
              {i === 0 ? (
                <span className="tab-grid">⌘</span>
              ) : (
                <MapPin size={14} />
              )}{" "}
              {a}
              {i === 1 && <span className="tab-label">BINUS</span>}
            </button>
          ))}
        </div>
        <div className="results-layout" id="results">
          <aside className="filter-sidebar">{filters}</aside>
          <div className="results-main">
            <div className="results-toolbar">
              <div>
                <h3>
                  {loading
                    ? "Mencari pilihan kos…"
                    : `${properties.length} kos untuk kamu`}
                </h3>
                <span>
                  {params.get("area") || "Di sekitar kampus BINUS"}{" "}
                  <span className="result-divider">·</span> Data demo
                </span>
              </div>
              <div className="result-controls">
                <button
                  className="btn outline mobile-filter"
                  onClick={() => setFilterOpen(true)}
                >
                  <SlidersHorizontal size={16} />
                  Filter {filterCount > 0 && `(${filterCount})`}
                </button>
                <label className="sort-control">
                  <span>Urutkan:</span>
                  <select
                    aria-label="Urutkan kos"
                    value={params.get("sort") || "recommended"}
                    onChange={(e) => update("sort", e.target.value)}
                  >
                    <option value="recommended">Rekomendasi</option>
                    <option value="price_asc">Harga terendah</option>
                    <option value="price_desc">Harga tertinggi</option>
                    <option value="distance">Terdekat kampus</option>
                  </select>
                </label>
              </div>
            </div>
            {filterCount > 0 && (
              <div className="active-filter-note">
                <SlidersHorizontal size={13} />
                {filterCount} filter aktif
                <button
                  onClick={() =>
                    setParams(
                      params.get("area") ? { area: params.get("area")! } : {},
                    )
                  }
                >
                  Hapus filter
                  <X size={12} />
                </button>
              </div>
            )}
            {error ? (
              <Empty
                title="Kosnya belum bisa dimuat"
                description={error}
                action={
                  <button
                    className="btn primary"
                    onClick={() => setRevision((v) => v + 1)}
                  >
                    Coba lagi
                  </button>
                }
              />
            ) : loading ? (
              <Loading />
            ) : properties.length ? (
              <div className="property-grid">
                {properties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            ) : (
              <Empty
                title="Belum ketemu yang pas"
                description="Coba area lain atau longgarkan filter harga dan fasilitasmu."
                action={
                  <button className="btn primary" onClick={() => setParams({})}>
                    Reset pencarian
                  </button>
                }
              />
            )}
            {!loading && properties.length > 0 && (
              <div className="end-results">
                <span />
                <p>
                  Kamu sudah melihat semua pilihan
                  <Check size={13} />
                </p>
                <span />
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="container owner-banner">
        <div className="owner-banner-icon">
          <MessageCircle size={32} strokeWidth={1.5} />
        </div>
        <div>
          <span className="eyebrow">UNTUK PEMILIK KOS</span>
          <h2>Kamar kosong? Biar ketemu penghuninya.</h2>
          <p>Kelola kos dan terhubung dengan mahasiswa, dari satu tempat.</p>
        </div>
        <a className="btn primary" href="/owner">
          Kenalan dengan dashboard
          <ArrowRight size={17} />
        </a>
      </section>
      {filterOpen && (
        <Modal title="Filter pencarian" onClose={() => setFilterOpen(false)}>
          <div className="mobile-filter-content">{filters}</div>
          <button
            className="btn primary full"
            onClick={() => setFilterOpen(false)}
          >
            Lihat {properties.length} kos
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
    </>
  );
}
