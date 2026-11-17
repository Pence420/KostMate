import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ArrowRight, House, X, SearchX, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="KostMate beranda">
      <span className="brand-icon">
        <House size={22} strokeWidth={2.2} />
      </span>
      Kost<span>Mate</span>
      <i />
    </Link>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={"modal " + (wide ? "wide" : "")}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Tutup" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={26} />
      <span>Menyiapkan tempat pulangmu…</span>
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <SearchX size={32} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div>
          <Brand />
          <p>Tempat pulang, dekat kampus.</p>
        </div>
        <div className="footer-links">
          <Link to="/">Cari kos</Link>
          <Link to="/favorit">Favorit</Link>
          <Link to="/pengaduan">Bantuan & pengaduan</Link>
          <Link to="/owner">
            Untuk pemilik kos <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} KostMate. Dibuat untuk hidup yang lebih
          nyaman.
        </span>
        <span>Versi demo · Seluruh listing & foto adalah ilustrasi</span>
      </div>
    </footer>
  );
}
