import { useEffect, useState } from "react";
import { Heart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../context";
import { api } from "../api";
import type { Property } from "../types";
import PropertyCard from "../components/PropertyCard";
import { Empty, Loading } from "../components/UI";
export default function Favorites() {
  const { user, favorites, openAuth } = useApp();
  const [data, setData] = useState<Property[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    let current = true;
    setLoading(true);
    api<Property[]>("/favorites")
      .then((x) => {
        if (current) {
          setData(x);
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
  }, [user, favorites]);
  return (
    <div className="container standard-page">
      <div className="page-heading">
        <span className="eyebrow">
          <Heart size={14} /> PILIHAN YANG KAMU SUKA
        </span>
        <h1>Simpan dulu, pilih nanti.</h1>
        <p>Bandingkan harga, lokasi, dan fasilitas dari kos favoritmu.</p>
      </div>
      {!user ? (
        <Empty
          title="Kos favoritmu menunggu"
          description="Masuk untuk menyimpan pilihan kos. Semuanya tersimpan di akunmu."
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
        <Empty title="Favorit belum bisa dimuat" description={error} />
      ) : data.length ? (
        <div className="property-grid favorites-grid">
          {data.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="Belum ada yang disimpan"
          description="Ketuk ikon hati pada kos yang kamu suka. Nanti bisa dibandingkan di sini."
          action={
            <Link className="btn primary" to="/">
              Jelajahi kos
              <ArrowRight size={17} />
            </Link>
          }
        />
      )}
    </div>
  );
}
