import {
  Heart,
  MapPin,
  ArrowUpRight,
  Wifi,
  Snowflake,
  Bath,
  Car,
  CookingPot,
  Shirt,
} from "lucide-react";
import { Link } from "react-router-dom";
import { rupiah } from "../api";
import { useApp } from "../context";
import type { Property } from "../types";
export function FacilityIcon({
  name,
  size = 15,
}: {
  name: string;
  size?: number;
}) {
  const Icon =
    (
      {
        WiFi: Wifi,
        AC: Snowflake,
        "Kamar mandi dalam": Bath,
        Parkir: Car,
        "Dapur bersama": CookingPot,
        Laundry: Shirt,
      } as Record<string, typeof Wifi>
    )[name] || Wifi;
  return <Icon size={size} strokeWidth={1.65} />;
}
export default function PropertyCard({ property: p }: { property: Property }) {
  const { favorites, toggleFavorite } = useApp();
  const saved = favorites.includes(p.id);
  return (
    <article className="property-card">
      <div className="card-image">
        <Link to={"/kos/" + p.id} tabIndex={-1} aria-hidden="true">
          <img
            src={p.photos[0]}
            alt={"Ilustrasi kamar " + p.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.opacity = ".2";
            }}
          />
        </Link>
        <span className={"gender-badge " + p.gender.toLowerCase()}>
          {p.gender}
        </span>
        <button
          className={"save-button " + (saved ? "saved" : "")}
          aria-label={
            (saved ? "Hapus " : "Simpan ") +
            p.name +
            " " +
            (saved ? "dari" : "ke") +
            " favorit"
          }
          aria-pressed={saved}
          onClick={() => void toggleFavorite(p.id)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        {p.available_rooms > 0 && p.available_rooms <= 2 && (
          <span className="scarcity">Sisa {p.available_rooms} kamar</span>
        )}
      </div>
      <div className="card-content">
        <div className="card-location">
          <span>
            <MapPin size={12} />
            {p.area}
          </span>
          <span
            className={
              "availability " + (!p.available_rooms ? "full-status" : "")
            }
          >
            <i />
            {p.available_rooms ? "Tersedia" : "Penuh"}
          </span>
        </div>
        <h3>
          <Link to={"/kos/" + p.id}>{p.name}</Link>
        </h3>
        <p className="campus-distance">
          {p.distance} km dari {p.campus}
        </p>
        <div className="card-facilities">
          {p.facilities.slice(0, 3).map((f) => (
            <span key={f}>
              <FacilityIcon name={f} />
              {f === "Kamar mandi dalam"
                ? "KM dalam"
                : f === "Dapur bersama"
                  ? "Dapur"
                  : f}
            </span>
          ))}
        </div>
        <div className="card-bottom">
          <span>
            <strong>{rupiah(p.price)}</strong>
            <small>/ bulan</small>
          </span>
          <Link
            to={"/kos/" + p.id}
            className="detail-arrow"
            aria-label={"Lihat " + p.name}
          >
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </div>
    </article>
  );
}
