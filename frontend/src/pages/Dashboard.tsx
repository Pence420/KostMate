import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  DoorOpen,
  LayoutDashboard,
  Plus,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { api, niceDate, rupiah } from "../api";
import { useApp } from "../context";
import type { DashboardData, Property, Tenant } from "../types";
import { Empty, Loading, Modal } from "../components/UI";
import PropertyEditor from "../components/PropertyEditor";

export default function Dashboard() {
  const { user, openAuth, notify } = useApp();
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("properties"),
    [edit, setEdit] = useState<Property | null | undefined>(undefined),
    [tenantForm, setTenantForm] = useState(false),
    [formError, setFormError] = useState(""),
    [busy, setBusy] = useState(false),
    [payment, setPayment] = useState<Tenant | null>(null);
  const load = useCallback(() => {
    if (user?.role === "owner")
      api<DashboardData>("/owner/dashboard")
        .then((x) => {
          setData(x);
          setError("");
        })
        .catch((e) => setError(e.message));
  }, [user]);
  useEffect(load, [load]);
  async function addTenant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api("/owner/tenants", {
        method: "POST",
        body: JSON.stringify({
          ...f,
          property_id: Number(f.property_id),
          monthly_rent: Number(f.monthly_rent),
        }),
      });
      setTenantForm(false);
      notify(
        "Catatan penghuni ditambahkan. Perbarui jumlah kamar kosong jika diperlukan.",
      );
      load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function recordPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payment || !data) return;
    setBusy(true);
    setFormError("");
    try {
      await api("/owner/payments", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: payment.id,
          month: data.month,
          amount: payment.monthly_rent,
        }),
      });
      notify("Pembayaran berhasil dicatat.");
      setPayment(null);
      load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!user || user.role !== "owner")
    return (
      <div className="container standard-page">
        <div className="owner-welcome">
          <span className="eyebrow">
            <Building2 size={15} /> KOSTMATE UNTUK PEMILIK
          </span>
          <h1>
            Kelola kos.
            <br />
            <span>Lebih simpel, lebih tenang.</span>
          </h1>
          <p>
            Kamar, penghuni, dan pencatatan pembayaran.
            <br />
            Semua yang kamu butuhkan, dalam satu tempat.
          </p>
          {!user ? (
            <button className="btn primary" onClick={openAuth}>
              Masuk atau daftar sebagai pemilik
              <ArrowRight size={17} />
            </button>
          ) : (
            <p className="info-box">
              Akunmu adalah pencari kos. Keluar lalu masuk atau daftar dengan
              akun pemilik untuk mengakses dashboard.
            </p>
          )}
          <div className="owner-feature-list">
            <span>
              <DoorOpen />
              Perbarui kamar kosong
            </span>
            <span>
              <Users />
              Catat penghuni
            </span>
            <span>
              <Receipt />
              Pantau pembayaran
            </span>
          </div>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="container">
        <Empty
          title="Dashboard belum bisa dimuat"
          description={error}
          action={
            <button className="btn primary" onClick={load}>
              Coba lagi
            </button>
          }
        />
      </div>
    );
  if (!data) return <Loading />;
  const occupied = data.stats.total_rooms - data.stats.available_rooms;
  const occupancy = data.stats.total_rooms
    ? Math.round((occupied / data.stats.total_rooms) * 100)
    : 0;
  return (
    <div className="container dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            <LayoutDashboard size={14} /> RUANG PEMILIK
          </span>
          <h1>
            Halo, {user.name.split(" ")[0]}
            <span className="heading-dot">.</span>
          </h1>
          <p>Ini kabar kosmu hari ini. Semuanya dalam kendali.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit(null)}>
          <Plus size={18} />
          Tambah kos
        </button>
      </div>
      <div className="dashboard-stats">
        {[
          {
            label: "Total kamar",
            value: data.stats.total_rooms,
            icon: Building2,
            note: `Dari ${data.properties.length} properti`,
          },
          {
            label: "Kamar tersedia",
            value: data.stats.available_rooms,
            icon: DoorOpen,
            note: `${occupied} kamar terisi · ${occupancy}% hunian`,
          },
          {
            label: "Pembayaran tercatat",
            value: rupiah(data.stats.income),
            icon: Wallet,
            note: new Date(data.month + "-01T12:00:00").toLocaleDateString(
              "id-ID",
              { month: "long", year: "numeric" },
            ),
          },
          {
            label: "Belum terbayar",
            value: rupiah(data.stats.outstanding),
            icon: Receipt,
            note: "Dari penghuni yang tercatat",
          },
        ].map((s, i) => (
          <div key={s.label} className={"stat-card stat-" + i}>
            <div>
              <span>{s.label}</span>
              <s.icon size={19} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.note}</small>
          </div>
        ))}
      </div>
      <div
        className="dashboard-tabs"
        role="tablist"
        aria-label="Bagian dashboard"
      >
        {[
          {
            id: "properties",
            name: "Properti saya",
            count: data.properties.length,
          },
          {
            id: "payments",
            name: "Penghuni & pembayaran",
            count: data.tenants.length,
          },
          {
            id: "inquiries",
            name: "Permintaan survei",
            count: data.inquiries.length,
          },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? "active" : ""}
          >
            {t.name}
            <span>{t.count}</span>
          </button>
        ))}
        <Link to="/pengaduan">
          Pengaduan
          <ArrowUpRight size={14} />
        </Link>
      </div>
      {tab === "properties" && (
        <>
          <div className="workspace-heading">
            <div>
              <h2>Tempat nyaman yang kamu kelola</h2>
              <p>Jaga informasi kamar tetap akurat untuk calon penghuni.</p>
            </div>
            <span className="live-label">
              <i />
              Terhubung langsung
            </span>
          </div>
          {data.properties.length ? (
            <div className="owner-properties">
              {data.properties.map((p) => (
                <article key={p.id} className="owner-property">
                  <img src={p.photos[0]} alt={"Ilustrasi " + p.name} />
                  <div className="owner-property-info">
                    <span className="eyebrow">
                      {p.area} · {p.gender}
                    </span>
                    <h3>
                      <Link to={"/kos/" + p.id}>{p.name}</Link>
                    </h3>
                    <p>
                      {rupiah(p.price)} <span>/ bulan</span>
                    </p>
                  </div>
                  <div className="room-count">
                    <strong>
                      {p.available_rooms}
                      <span> / {p.total_rooms}</span>
                    </strong>
                    <small>kamar tersedia</small>
                    <div className="occupancy-track">
                      <span
                        style={{
                          width:
                            ((p.total_rooms - p.available_rooms) /
                              p.total_rooms) *
                              100 +
                            "%",
                        }}
                      />
                    </div>
                  </div>
                  <button className="btn outline" onClick={() => setEdit(p)}>
                    Kelola kos
                    <ArrowRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Mulai dari kos pertamamu"
              description="Tambahkan foto, fasilitas, dan informasi kamar agar mahasiswa bisa menemukan kosmu."
              action={
                <button className="btn primary" onClick={() => setEdit(null)}>
                  Tambah kos
                  <Plus size={17} />
                </button>
              }
            />
          )}
        </>
      )}
      {tab === "payments" && (
        <>
          <div className="workspace-heading">
            <div>
              <h2>Penghuni & pembayaran</h2>
              <p>
                Pencatatan manual bulan {data.month}. Konfirmasi dana diterima
                sebelum menandai lunas.
              </p>
            </div>
            <button
              className="btn outline"
              disabled={!data.properties.length}
              onClick={() => {
                setFormError("");
                setTenantForm(true);
              }}
            >
              <Plus size={16} />
              Tambah penghuni
            </button>
          </div>
          {data.tenants.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Penghuni</th>
                    <th>Properti / kamar</th>
                    <th>Sewa bulanan</th>
                    <th>Status pembayaran</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span className="tenant-name">
                          <span className="avatar">{t.name.charAt(0)}</span>
                          <strong>{t.name}</strong>
                        </span>
                      </td>
                      <td>
                        {t.property_name}
                        <small>Kamar {t.room}</small>
                      </td>
                      <td>{rupiah(t.monthly_rent)}</td>
                      <td>
                        <span
                          className={
                            "status-pill " +
                            (t.paid_amount >= t.monthly_rent
                              ? "paid"
                              : "pending")
                          }
                        >
                          {t.paid_amount >= t.monthly_rent
                            ? "Lunas"
                            : t.paid_amount > 0
                              ? "Sebagian"
                              : "Belum bayar"}
                        </span>
                        {t.paid_amount > 0 &&
                          t.paid_amount < t.monthly_rent && (
                            <small>Masuk {rupiah(t.paid_amount)}</small>
                          )}
                      </td>
                      <td>
                        {t.paid_amount === 0 && t.monthly_rent > 0 ? (
                          <button
                            className="text-button"
                            onClick={() => {
                              setFormError("");
                              setPayment(t);
                            }}
                          >
                            Catat lunas
                            <Check size={14} />
                          </button>
                        ) : (
                          <span className="muted">Tercatat</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Belum ada catatan penghuni"
              description="Tambahkan penghuni untuk mulai mencatat pembayaran sewa bulanan."
            />
          )}
          <p className="workspace-note">
            Catatan penghuni dan ketersediaan kamar dikelola terpisah. Sesuaikan
            kamar kosong lewat Kelola kos saat ada penghuni masuk atau keluar.
          </p>
        </>
      )}
      {tab === "inquiries" && (
        <>
          <div className="workspace-heading">
            <div>
              <h2>Yuk, sambut calon penghuni.</h2>
              <p>
                Permintaan survei yang diajukan melalui KostMate. Konfirmasi
                jadwal langsung dengan pencari kos.
              </p>
            </div>
          </div>
          {data.inquiries.length ? (
            <div className="inquiry-list">
              {data.inquiries.map((i) => (
                <article key={i.id} className="inquiry-card">
                  <span className="empty-icon">
                    <CalendarDays size={22} />
                  </span>
                  <div>
                    <h3>{i.student_name}</h3>
                    <p>{i.property_name}</p>
                    <span>{i.student_email}</span>
                    {i.message && <blockquote>{i.message}</blockquote>}
                  </div>
                  <span className="tag">{niceDate(i.visit_date)}</span>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Belum ada permintaan survei"
              description="Saat calon penghuni mengajukan survei di halaman kosmu, informasinya akan muncul di sini."
            />
          )}
        </>
      )}
      {edit !== undefined && (
        <PropertyEditor
          property={edit}
          onClose={() => setEdit(undefined)}
          onSave={load}
        />
      )}
      {tenantForm && (
        <Modal
          title="Tambah catatan penghuni"
          onClose={() => setTenantForm(false)}
        >
          <form className="form-stack" onSubmit={addTenant}>
            <label>
              Properti
              <select name="property_id" required>
                {data.properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nama penghuni
              <input name="name" minLength={2} maxLength={80} required />
            </label>
            <label>
              Nomor kamar
              <input
                name="room"
                required
                maxLength={30}
                placeholder="Contoh: A-05"
              />
            </label>
            <label>
              Sewa bulanan (Rp)
              <input
                name="monthly_rent"
                required
                type="number"
                min={0}
                max={100000000}
              />
            </label>
            <p className="muted">
              Setelah disimpan, sesuaikan ketersediaan kamar melalui Kelola kos.
            </p>
            {formError && <div className="error">{formError}</div>}
            <button className="btn primary full" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan penghuni"}
              <Check size={16} />
            </button>
          </form>
        </Modal>
      )}
      {payment && (
        <Modal
          title="Konfirmasi pembayaran diterima"
          onClose={() => setPayment(null)}
        >
          <form className="form-stack" onSubmit={recordPayment}>
            <p>
              Catat pembayaran <strong>{rupiah(payment.monthly_rent)}</strong>{" "}
              dari <strong>{payment.name}</strong> untuk bulan{" "}
              <strong>{data.month}</strong>?
            </p>
            <p className="info-box">
              Ini hanya pencatatan manual. Pastikan uang sewa sudah kamu terima.
            </p>
            {formError && <p className="error">{formError}</p>}
            <button className="btn primary full" disabled={busy}>
              {busy ? "Menyimpan…" : "Ya, pembayaran sudah diterima"}
              <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
