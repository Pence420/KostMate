import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation, Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { AppContext } from "./context";
import type { Property, User } from "./types";
import { api } from "./api";
import { Brand, Footer } from "./components/UI";
import { AuthModal } from "./components/AuthModal";
import Explore from "./pages/Explore";
import Detail from "./pages/Detail";
import Favorites from "./pages/Favorites";
import Dashboard from "./pages/Dashboard";
import Complaints from "./pages/Complaints";

export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [favorites, setFavorites] = useState<number[]>([]),
    [auth, setAuth] = useState(false),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => {});
  }, []);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setAuth(true);
      setToast("Sesi berakhir. Masuk kembali untuk melanjutkan.");
    };
    window.addEventListener("kostmate:session-expired", expired);
    return () =>
      window.removeEventListener("kostmate:session-expired", expired);
  }, []);
  useEffect(() => {
    setFavorites([]);
    if (user)
      api<Property[]>("/favorites")
        .then((ps) => setFavorites(ps.map((p) => p.id)))
        .catch(() => {});
  }, [user]);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function requireAuth() {
    if (user) return true;
    setAuth(true);
    return false;
  }
  async function toggleFavorite(id: number) {
    if (!requireAuth()) return;
    const saved = favorites.includes(id);
    try {
      await api("/favorites/" + id, { method: saved ? "DELETE" : "PUT" });
      setFavorites((prev) =>
        saved ? prev.filter((x) => x !== id) : [...new Set([...prev, id])],
      );
      setToast(
        saved
          ? "Dihapus dari favorit."
          : "Disimpan. Kos impianmu nggak akan hilang.",
      );
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setToast("Kamu sudah keluar. Sampai jumpa!");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        favorites,
        toggleFavorite,
        notify: setToast,
        requireAuth,
        openAuth: () => setAuth(true),
      }}
    >
      <div className="app">
        <header className="header">
          <div className="container header-inner">
            <Brand />
            <nav
              className={menu ? "main-nav open" : "main-nav"}
              aria-label="Navigasi utama"
            >
              <NavLink to="/" end>
                Cari kos
              </NavLink>
              <NavLink to="/favorit">
                <Heart size={15} />
                Favorit{" "}
                {favorites.length > 0 && (
                  <span className="nav-count">{favorites.length}</span>
                )}
              </NavLink>
              <NavLink to="/pengaduan">Bantuan</NavLink>
              <NavLink to="/owner" className="mobile-owner-nav">Punya kos?</NavLink>
              {user?.role === "owner" && (
                <NavLink to="/owner">Dashboard</NavLink>
              )}
            </nav>
            <div className="header-actions">
              <Link to="/owner" className="owner-link">
                Punya kos?
                <ArrowUpRight size={15} />
              </Link>
              {user ? (
                <div className="account">
                  <button
                    className="account-button"
                    onClick={() => setMenu(!menu)}
                    aria-label="Menu akun"
                    aria-expanded={menu}
                  >
                    <span className="avatar">{user.name.charAt(0)}</span>
                    <span>{user.name.split(" ")[0]}</span>
                    <ChevronDown size={13} />
                  </button>
                  <button
                    className="icon-button logout"
                    onClick={() => void logout()}
                    aria-label="Keluar"
                  >
                    <LogOut size={17} />
                  </button>
                </div>
              ) : (
                <button
                  className="btn primary small"
                  onClick={() => setAuth(true)}
                >
                  Masuk <ArrowUpRight size={15} />
                </button>
              )}
              <button
                className="icon-button mobile-menu"
                aria-label="Buka navigasi"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                {menu ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </header>
        {menu && user && (
          <div className="account-dropdown">
            <Link to="/favorit">
              <Heart size={16} />
              Favoritku
            </Link>
            {user.role === "owner" && (
              <Link to="/owner">
                <LayoutDashboard size={16} />
                Dashboard pemilik
              </Link>
            )}
            <button onClick={() => void logout()}>
              <LogOut size={16} />
              Keluar
            </button>
          </div>
        )}
        <main>
          <Routes>
            <Route path="/" element={<Explore />} />
            <Route path="/kos/:id" element={<Detail />} />
            <Route path="/favorit" element={<Favorites />} />
            <Route path="/owner" element={<Dashboard />} />
            <Route path="/pengaduan" element={<Complaints />} />
            <Route
              path="*"
              element={
                <div className="container page-heading">
                  <h1>Halaman belum ditemukan.</h1>
                  <Link to="/" className="btn primary">
                    Kembali cari kos
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
        <Footer />
        {auth && <AuthModal onClose={() => setAuth(false)} />}{" "}
        {toast && (
          <div className="toast" role="status">
            <Check size={18} />
            {toast}
            <button aria-label="Tutup notifikasi" onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
