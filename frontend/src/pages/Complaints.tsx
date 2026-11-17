import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CircleHelp, MessageCircle, Plus } from "lucide-react";
import { api, niceDate } from "../api";
import { useApp } from "../context";
import type { Complaint, Property } from "../types";
import { Empty, Loading, Modal } from "../components/UI";

export default function Complaints() {
  const { user, openAuth, notify } = useApp();
  const [data, setData] = useState<Complaint[]>([]),
    [props, setProps] = useState<Property[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState("");
  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    api<Complaint[]>("/complaints")
      .then((x) => {
        setData(x);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);
  useEffect(load, [load]);
  async function showForm() {
    setFormError("");
    try {
      const p = await api<Property[]>("/properties");
      setProps(p);
      setOpen(true);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api("/complaints", {
        method: "POST",
        body: JSON.stringify({ ...f, property_id: Number(f.property_id) }),
      });
      setOpen(false);
      notify("Pengaduan tersimpan dan bisa dilihat pemilik kos.");
      load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function status(id: number, value: string) {
    try {
      await api("/complaints/" + id, {
        method: "PATCH",
        body: JSON.stringify({ status: value }),
      });
      notify("Status pengaduan diperbarui.");
      load();
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <div className="container standard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            <CircleHelp size={14} /> KAMI SIAP MEMBANTU
          </span>
          <h1>
            {user?.role === "owner"
              ? "Dengar, tanggapi, selesaikan."
              : "Ada kendala? Cerita di sini."}
          </h1>
          <p>
            {user?.role === "owner"
              ? "Pantau laporan penghuni dan perbarui progres penanganannya."
              : "Sampaikan kendala di kos dan pantau status penanganannya."}
          </p>
        </div>
        {user && user.role === "student" && (
          <button className="btn primary" onClick={() => void showForm()}>
            <Plus size={17} />
            Buat pengaduan
          </button>
        )}
      </div>
      <div className="help-strip">
        <MessageCircle size={23} />
        <div>
          <strong>Komunikasi yang baik bikin ngekos lebih nyaman.</strong>
          <p>
            Pengaduan disimpan di akunmu dan tampil di dashboard pemilik kos
            terkait.
          </p>
        </div>
      </div>
      {!user ? (
        <Empty
          title="Masuk untuk menyampaikan kendala"
          description="Kami akan menghubungkan pengaduanmu dengan pemilik kos yang tepat."
          action={
            <button className="btn primary" onClick={openAuth}>
              Masuk ke akun
              <ArrowRight size={17} />
            </button>
          }
        />
      ) : loading ? (
        <Loading />
      ) : error ? (
        <Empty
          title="Pengaduan belum bisa dimuat"
          description={error}
          action={
            <button className="btn primary" onClick={load}>
              Coba lagi
            </button>
          }
        />
      ) : data.length ? (
        <div className="complaint-list">
          {data.map((c) => (
            <article key={c.id} className="complaint-card">
              <div className="complaint-top">
                <span className="eyebrow">{c.property_name}</span>
                <span
                  className={
                    "status-pill " +
                    (c.status === "Selesai"
                      ? "paid"
                      : c.status === "Diproses"
                        ? "progress"
                        : "pending")
                  }
                >
                  {c.status}
                </span>
              </div>
              <h3>{c.title}</h3>
              <p>{c.message}</p>
              <div className="complaint-bottom">
                <span>
                  {c.reporter} · {niceDate(c.created_at)}
                </span>
                {user.role === "owner" && (
                  <label>
                    Status
                    <select
                      aria-label={"Status pengaduan " + c.title}
                      value={c.status}
                      onChange={(e) => void status(c.id, e.target.value)}
                    >
                      <option>Baru</option>
                      <option>Diproses</option>
                      <option>Selesai</option>
                    </select>
                  </label>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            user.role === "owner"
              ? "Belum ada laporan masuk"
              : "Belum ada pengaduan"
          }
          description={
            user.role === "owner"
              ? "Laporan untuk kos yang kamu kelola akan muncul di sini."
              : "Semoga hari-harimu lancar. Kalau ada kendala, kamu bisa menyampaikannya di sini."
          }
        />
      )}
      {open && (
        <Modal title="Ceritakan kendalamu" onClose={() => setOpen(false)}>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Kos yang ingin dilaporkan
              <select name="property_id" required>
                <option value="">Pilih kos</option>
                {props.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Judul kendala
              <input
                name="title"
                required
                minLength={3}
                maxLength={120}
                placeholder="Contoh: AC kamar tidak dingin"
              />
            </label>
            <label>
              Ceritakan lebih detail
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                placeholder="Sebutkan nomor kamar, kapan terjadi, dan bantuan yang kamu butuhkan."
              />
            </label>
            {formError && (
              <div className="error" role="alert">
                {formError}
              </div>
            )}
            <button className="btn primary full" disabled={busy}>
              {busy ? "Menyimpan…" : "Kirim pengaduan"}
              <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
