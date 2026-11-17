import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, House, KeyRound } from "lucide-react";
import { api } from "../api";
import { useApp } from "../context";
import type { User } from "../types";
import { Modal } from "./UI";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { setUser, notify } = useApp();
  const [signup, setSignup] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const user = await api<User>("/auth/" + (signup ? "register" : "login"), {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      setUser(user);
      notify("Selamat datang, " + user.name.split(" ")[0] + "!");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={signup ? "Mulai bersama KostMate" : "Senang kamu kembali"}
      onClose={onClose}
    >
      <div className="auth-intro">
        <span className="empty-icon">
          <House size={27} />
        </span>
        <p>
          {signup
            ? "Simpan kos impian dan temukan tempat pulangmu."
            : "Masuk untuk menyimpan kos dan terhubung dengan pemilik."}
        </p>
      </div>
      <form onSubmit={submit} className="form-stack">
        {signup && (
          <label>
            Nama lengkap
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder="Nama kamu"
            />
          </label>
        )}
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
          />
        </label>
        <label>
          Kata sandi
          <input
            name="password"
            type="password"
            required
            minLength={signup ? 8 : 1}
            maxLength={128}
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
          />
        </label>
        {signup && (
          <label>
            Aku ingin
            <select name="role">
              <option value="student">Mencari kos</option>
              <option value="owner">Mengelola kos</option>
            </select>
          </label>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <button className="btn primary full" disabled={busy}>
          {busy ? "Sebentar…" : signup ? "Buat akun" : "Masuk"}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-switch">
        {signup ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <button
          className="text-button"
          onClick={() => {
            setSignup(!signup);
            setError("");
          }}
        >
          {signup ? "Masuk" : "Daftar gratis"}
        </button>
      </p>
      <div className="demo-login">
        <div>
          <KeyRound size={15} />
          <strong>Coba dengan akun demo</strong>
        </div>
        <p>Data contoh untuk eksplorasi aplikasi.</p>
        <div className="demo-options">
          <button
            onClick={() => {
              setSignup(false);
              setEmail("nadia@kostmate.demo");
              setPassword("Kostmate123!");
            }}
          >
            Pencari kos
          </button>
          <button
            onClick={() => {
              setSignup(false);
              setEmail("owner@kostmate.demo");
              setPassword("Kostmate123!");
            }}
          >
            Pemilik kos
          </button>
        </div>
      </div>
    </Modal>
  );
}
