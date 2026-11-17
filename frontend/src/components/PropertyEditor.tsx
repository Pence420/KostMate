import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { api, localDate } from "../api";
import type { Property } from "../types";
import { useApp } from "../context";
import { Modal } from "./UI";

const facilityOptions = [
  "WiFi",
  "AC",
  "Kamar mandi dalam",
  "Parkir",
  "Dapur bersama",
  "Laundry",
];
export default function PropertyEditor({
  property: p,
  onClose,
  onSave,
}: {
  property: Property | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { notify } = useApp();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [facilities, setFacilities] = useState(p?.facilities || ["WiFi"]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const data = {
      ...f,
      price: Number(f.price),
      distance: Number(f.distance),
      total_rooms: Number(f.total_rooms),
      available_rooms: Number(f.available_rooms),
      facilities,
      photos: String(f.photos)
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      rules: String(f.rules)
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    };
    try {
      await api("/owner/properties" + (p ? "/" + p.id : ""), {
        method: p ? "PUT" : "POST",
        body: JSON.stringify(data),
      });
      notify(
        p
          ? "Informasi kos berhasil diperbarui."
          : "Kos baru berhasil ditambahkan.",
      );
      onSave();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={p ? "Kelola " + p.name : "Tambahkan kos pertamamu"}
      onClose={onClose}
      wide
    >
      <p className="modal-description">
        Informasi yang jelas membantu calon penghuni memilih. Perubahan
        ketersediaan langsung tampil di pencarian.
      </p>
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="span-two">
            Nama kos
            <input
              name="name"
              required
              minLength={3}
              maxLength={120}
              defaultValue={p?.name}
              placeholder="Contoh: Kost Sela Kemanggisan"
            />
          </label>
          <label>
            Area
            <select name="area" defaultValue={p?.area || "Kemanggisan"}>
              {["Kemanggisan", "Alam Sutera", "Bekasi", "Palmerah"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Kampus terdekat
            <input
              name="campus"
              required
              minLength={2}
              defaultValue={p?.campus || "BINUS Anggrek"}
            />
          </label>
          <label className="span-two">
            Alamat lengkap
            <input
              name="address"
              required
              minLength={5}
              maxLength={500}
              defaultValue={p?.address}
            />
          </label>
          <label>
            Harga per bulan (Rp)
            <input
              name="price"
              type="number"
              required
              min={0}
              max={100000000}
              defaultValue={p?.price || 1500000}
            />
          </label>
          <label>
            Jarak dari kampus (km)
            <input
              name="distance"
              type="number"
              step="0.1"
              required
              min={0}
              max={100}
              defaultValue={p?.distance || 0.5}
            />
          </label>
          <label>
            Tipe penghuni
            <select name="gender" defaultValue={p?.gender || "Campur"}>
              <option>Campur</option>
              <option>Putri</option>
              <option>Putra</option>
            </select>
          </label>
          <label>
            Jenis kos
            <select name="kind" defaultValue={p?.kind || "Reguler"}>
              <option>Reguler</option>
              <option>Eksklusif</option>
            </select>
          </label>
          <label>
            Total kamar
            <input
              name="total_rooms"
              type="number"
              min={1}
              max={500}
              required
              defaultValue={p?.total_rooms || 10}
            />
          </label>
          <label>
            Kamar kosong
            <input
              name="available_rooms"
              type="number"
              min={0}
              max={500}
              required
              defaultValue={p?.available_rooms ?? 10}
            />
          </label>
          <label>
            Ukuran kamar
            <input
              name="size"
              required
              minLength={2}
              maxLength={40}
              defaultValue={p?.size || "3 × 4 m"}
            />
          </label>
          <label>
            Mulai tersedia
            <input
              name="available_from"
              type="date"
              required
              defaultValue={p?.available_from || localDate()}
            />
          </label>
          <label className="span-two">
            Deskripsi
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={5000}
              rows={3}
              defaultValue={p?.description}
              placeholder="Ceritakan kamar, lingkungan, dan keunggulan kosmu."
            />
          </label>
        </div>
        <fieldset className="editor-facilities">
          <legend>Fasilitas</legend>
          <div>
            {facilityOptions.map((f) => (
              <label className="check-row" key={f}>
                <input
                  type="checkbox"
                  checked={facilities.includes(f)}
                  onChange={() =>
                    setFacilities((prev) =>
                      prev.includes(f)
                        ? prev.filter((x) => x !== f)
                        : [...prev, f],
                    )
                  }
                />
                {f}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Foto kamar (URL HTTPS, satu per baris)
          <textarea
            name="photos"
            required
            rows={3}
            defaultValue={p?.photos.join("\n")}
            placeholder="https://images.example.com/kamar.jpg"
          />
          <small>
            1–8 foto. Gunakan tautan foto yang dapat diakses publik.
          </small>
        </label>
        <label>
          Peraturan (satu per baris)
          <textarea
            name="rules"
            rows={3}
            defaultValue={p?.rules.join("\n")}
            placeholder="Tidak merokok di dalam kamar"
          />
        </label>
        <label>
          Biaya tambahan dan ketentuan deposit
          <textarea
            name="fees"
            rows={2}
            maxLength={1000}
            defaultValue={p?.fees}
            placeholder="Jelaskan listrik, air, deposit, dan biaya lain."
          />
        </label>
        <label>
          Nomor WhatsApp pemilik
          <input
            name="phone"
            inputMode="tel"
            pattern="\+?[0-9]{0,18}"
            maxLength={19}
            defaultValue={p?.phone}
            placeholder="62812xxxxxxxx"
          />
          <small>
            Gunakan kode negara 62. Kosongkan jika belum ingin menampilkan
            kontak.
          </small>
        </label>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          <button className="btn outline" type="button" onClick={onClose}>
            Batal
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "Menyimpan…" : p ? "Simpan perubahan" : "Terbitkan kos"}
            {p ? <Check size={17} /> : <ArrowRight size={17} />}
          </button>
        </div>
      </form>
    </Modal>
  );
}
