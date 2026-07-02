import * as React from "react";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { PropertyMap } from "./components/PropertyMap";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { APP_NAME, APP_NAME_SHORT, APP_TAGLINE, SONAPIE_LOGO, SONAPIE_LOGO_ICON } from "./constants/brand";
import { SONAPIE_ESTABLISHMENTS, SONAPIE_CITIES, SONAPIE_TYPES } from "./data/establishments";
import {
  Search, MapPin, Calendar, Users, ChevronDown, Star, Heart,
  ArrowRight, Filter, Grid, Wifi, Car, Wind, Utensils,
  Phone, Mail, Bell, User, Settings, LogOut,
  BarChart2, Building2, CreditCard, AlertCircle, Wrench,
  CheckCircle, XCircle, Clock, Edit2, Trash2, Plus, Eye,
  TrendingUp, Shield, Award, Globe, Facebook, Twitter,
  Instagram, Youtube, ChevronRight, ChevronLeft, X, Menu,
  Check, ArrowLeft, Upload, Home, Bookmark, List, Map,
  Camera, Info, HelpCircle, FileText, Zap, RefreshCw,
  Download, MessageCircle, Lock, UserPlus, Key
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Page =
  | "home" | "catalogue" | "property"
  | "booking-dates" | "booking-info" | "booking-summary"
  | "booking-payment" | "booking-confirmation"
  | "dashboard" | "dashboard-reservations" | "dashboard-favorites"
  | "dashboard-payments" | "dashboard-documents" | "dashboard-complaints"
  | "dashboard-profile"
  | "login" | "register" | "forgot-password"
  | "admin" | "admin-properties" | "admin-reservations"
  | "admin-users" | "admin-payments" | "admin-maintenance"
  | "admin-claims" | "admin-stats" | "admin-settings"
  | "about" | "contact";

interface CatalogueFilters {
  city: string;
  type: string;
  capacity: string;
  maxPrice: number;
  amenity: string;
  availOnly: boolean;
  checkIn: string;
  checkOut: string;
  budget: number;
}

interface Reservation {
  id: string;
  propertyId: string;
  property: string;
  city: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: string;
  type: string;
  guests: number;
  client?: string;
}

interface Complaint {
  id: string;
  subject: string;
  message: string;
  status: "pending" | "in-progress" | "resolved";
  date: string;
}

interface MaintenanceTicket {
  id: string;
  property: string;
  issue: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  date: string;
}

interface AdminClaim {
  id: string;
  user: string;
  property: string;
  subject: string;
  status: "open" | "in-progress" | "resolved";
  date: string;
  priority: "high" | "medium" | "low";
}

interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  reservations: number;
  since: string;
}

type NotifyFn = (message: string) => void;

interface Property {
  id: string; name: string; type: string; city: string;
  lat: number; lng: number;
  price: number; rating: number; reviews: number;
  image: string; images: string[]; description: string;
  amenities: string[]; capacity: number; bedrooms: number;
  bathrooms: number; area: number; available: boolean; featured: boolean;
  tag?: string;
  services: string[];
  mainImage: string;
  gallery: string[];
  location: string;
  isSonapieManaged: boolean;
  imagesPendingOfficial?: boolean;
}

interface NavProps {
  navigate: (p: Page, d?: any) => void;
  currentPage: Page;
  user: any;
  setUser: (u: any) => void;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────
const INITIAL_PROPERTIES: Property[] = SONAPIE_ESTABLISHMENTS;

const MOCK_RESERVATIONS: Reservation[] = [
  { id: "RES-2025-001", propertyId: "sonapie-1", property: "Sofitel Hôtel Ivoire", city: "Abidjan", checkIn: "15 Jan 2025", checkOut: "22 Jan 2025", total: 525000, status: "confirmed", type: "Hôtel", guests: 2, client: "Kouamé Adjobi" },
  { id: "RES-2025-002", propertyId: "sonapie-4", property: "Hôtel Président", city: "Yamoussoukro", checkIn: "5 Fév 2025", checkOut: "8 Fév 2025", total: 144000, status: "pending", type: "Hôtel", guests: 2, client: "Aminata Coulibaly" },
  { id: "RES-2024-087", propertyId: "sonapie-2", property: "Ivoire Golf Club", city: "Abidjan", checkIn: "20 Mar 2024", checkOut: "25 Mar 2024", total: 475000, status: "completed", type: "Complexe / Golf Club", guests: 4, client: "Serge Bamba" },
  { id: "RES-2024-062", propertyId: "sonapie-5", property: "HP Resort", city: "Yamoussoukro", checkIn: "10 Déc 2024", checkOut: "17 Déc 2024", total: 595000, status: "cancelled", type: "Resort", guests: 4, client: "Fatou Diallo" },
];

const MOCK_USERS: MockUser[] = [
  { id: "U001", name: "Kouamé Adjobi", email: "k.adjobi@gmail.com", phone: "+225 07 12 34 56", role: "user", status: "active", reservations: 3, since: "Jan 2024" },
  { id: "U002", name: "Aminata Coulibaly", email: "a.coulibaly@hotmail.com", phone: "+225 05 87 65 43", role: "user", status: "active", reservations: 7, since: "Mar 2023" },
  { id: "U003", name: "Serge Bamba", email: "s.bamba@yahoo.fr", phone: "+225 01 23 45 67", role: "admin", status: "active", reservations: 1, since: "Jun 2022" },
  { id: "U004", name: "Fatou Diallo", email: "f.diallo@gmail.com", phone: "+225 07 99 88 77", role: "user", status: "suspended", reservations: 0, since: "Oct 2024" },
];

const ADMIN_STATS = {
  revenue: 48750000, reservations: 342, properties: 8, users: 1842,
  revenueChange: +18.4, reservationsChange: +12.1, propertiesChange: +3.2, usersChange: +24.8,
  byCity: [
    { city: "Abidjan", count: 128, revenue: 18500000 },
    { city: "Yamoussoukro", count: 87, revenue: 9800000 },
    { city: "Daoukro", count: 45, revenue: 2100000 },
    { city: "Séguéla", count: 42, revenue: 1600000 },
    { city: "Katiola", count: 40, revenue: 1400000 },
  ],
};

const INITIAL_MAINTENANCE_TICKETS: MaintenanceTicket[] = [
  { id: "MAINT-001", property: "Sofitel Hôtel Ivoire", issue: "Climatisation suite présidentielle en panne", priority: "high", status: "in-progress", date: "2 Jan 2025" },
  { id: "MAINT-002", property: "Hôtel Président", issue: "Robinet fuyant salle de bain 3", priority: "low", status: "pending", date: "5 Jan 2025" },
  { id: "MAINT-003", property: "HP Resort", issue: "Révision annuelle chaudière", priority: "medium", status: "completed", date: "10 Déc 2024" },
  { id: "MAINT-004", property: "Ivoire Golf Club", issue: "Entretien bassin olympique", priority: "medium", status: "pending", date: "8 Jan 2025" },
];

const INITIAL_ADMIN_CLAIMS: AdminClaim[] = [
  { id: "CLM-001", user: "Aminata Coulibaly", property: "Sofitel Hôtel Ivoire", subject: "SPA non disponible à l'arrivée", status: "open", date: "18 Jan 2025", priority: "high" },
  { id: "CLM-002", user: "Kouamé Adjobi", property: "Hôtel Président", subject: "Chambre ne correspondait pas aux photos", status: "in-progress", date: "20 Jan 2025", priority: "medium" },
  { id: "CLM-003", user: "Serge Bamba", property: "HP Resort", subject: "Remboursement suite à annulation", status: "resolved", date: "5 Jan 2025", priority: "low" },
];

const CITIES = [...SONAPIE_CITIES];
const TYPES = [...SONAPIE_TYPES];

const CITY_DESTINATION_META: Record<string, { desc: string }> = {
  Abidjan: { desc: "Capitale économique" },
  Yamoussoukro: { desc: "Capitale politique" },
  Daoukro: { desc: "Cœur historique" },
  Séguéla: { desc: "Worodougou" },
  Katiola: { desc: "Région du Hambol" },
};
const AMENITY_FILTERS = ["Tous", "Piscine", "Wi-Fi", "Parking", "Climatisation", "Plage privée", "Accessibilité PMR"];
const DEFAULT_FILTERS: CatalogueFilters = {
  city: "", type: "Toutes catégories", capacity: "", maxPrice: 100000,
  amenity: "Tous", availOnly: false, checkIn: "", checkOut: "", budget: 100000,
};

const fmt = (n: number) => new Intl.NumberFormat("fr-CI").format(n) + " FCFA";

type PlatformSettings = {
  platformName: string;
  email: string;
  feePct: number;
};

const clampPct = (value: number) => Math.max(0, Math.min(30, value));

const calcFees = (total: number, feePct: number) => Math.round(total * (clampPct(feePct) / 100));

const matchCapacity = (capacity: number, filter: string) => {
  if (!filter) return true;
  if (filter.includes("1-5")) return capacity <= 5;
  if (filter.includes("6-20")) return capacity >= 6 && capacity <= 20;
  if (filter.includes("21-100")) return capacity >= 21 && capacity <= 100;
  if (filter.includes("100+")) return capacity > 100;
  return true;
};

const matchAmenity = (amenities: string[], filter: string) => {
  if (!filter || filter === "Tous") return true;
  const q = filter.toLowerCase();
  return amenities.some(a => a.toLowerCase().includes(q.replace("accessibilité ", "")));
};

const downloadReceipt = (data: { ref: string; property?: string; total?: number; client?: string }) => {
  const content = `${APP_NAME} — Reçu de réservation\nRéférence: ${data.ref}\nClient: ${data.client || "—"}\nBien: ${data.property || "—"}\nMontant: ${data.total ? fmt(data.total) : "—"}\nDate: ${new Date().toLocaleDateString("fr-CI")}`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.ref}-recu.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

const AvailabilityCalendar = ({ bookedDays = [5, 6, 12, 13, 20] }: { bookedDays?: number[] }) => {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const monthLabel = today.toLocaleDateString("fr-CI", { month: "long", year: "numeric" });
  return (
    <div className="bg-muted rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-foreground capitalize">{monthLabel}</h3>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary/30 inline-block" /> Disponible</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Réservé</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={`${d}-${i}`} className="text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {Array.from({ length: (firstDay + 6) % 7 }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const booked = bookedDays.includes(day);
          return (
            <div key={day} className={`py-1.5 rounded-lg font-medium ${booked ? "bg-red-100 text-red-600 line-through" : "bg-secondary/10 text-secondary"}`}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MapPanel = ({ properties, onSelect }: { properties: Property[]; onSelect: (p: Property) => void }) => (
  <PropertyMap
    properties={properties.map(p => ({ id: p.id, name: p.name, city: p.city, price: p.price, available: p.available, lat: p.lat, lng: p.lng }))}
    onSelect={id => { const p = properties.find(x => x.id === id); if (p) onSelect(p); }}
  />
);

// ── Utility Components ─────────────────────────────────────────────────────────
const Badge = ({ label, color = "orange" }: { label: string; color?: string }) => {
  const colors: Record<string, string> = {
    orange: "bg-orange-100 text-orange-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
    yellow: "bg-yellow-100 text-yellow-700",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.gray}`}>{label}</span>;
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string }> = {
    confirmed: { label: "Confirmée", color: "green" },
    pending: { label: "En attente", color: "yellow" },
    completed: { label: "Terminée", color: "green" },
    cancelled: { label: "Annulée", color: "red" },
    active: { label: "Actif", color: "green" },
    suspended: { label: "Suspendu", color: "red" },
    available: { label: "Disponible", color: "green" },
    unavailable: { label: "Indisponible", color: "red" },
    maintenance: { label: "Maintenance", color: "yellow" },
  };
  const m = map[status] || { label: status, color: "gray" };
  return <Badge label={m.label} color={m.color} />;
};

const ToastContainer = ({ message }: { message: string | null }) =>
  message ? (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div className="flex items-center gap-2.5 bg-[#14261A] text-white px-5 py-3.5 rounded-xl shadow-2xl border border-white/10 text-sm font-medium max-w-sm">
        <CheckCircle size={18} className="text-green-400 shrink-0" />
        {message}
      </div>
    </div>
  ) : null;

const DashboardPageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6 pb-5 border-b border-border/80">
    <h2 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>{title}</h2>
    {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
  </div>
);

const AdminPageHeader = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const AppLogo = ({ variant = "header", onClick }: { variant?: "header" | "footer" | "auth" | "admin"; onClick?: () => void }) => {
  const Wrapper = onClick ? "button" : "div";
  if (variant === "footer") {
    return (
      <Wrapper onClick={onClick} className={onClick ? "text-left" : ""}>
        <img src={SONAPIE_LOGO} alt={APP_NAME} className="h-12 w-auto object-contain" />
        <p className="text-xs text-primary font-semibold mt-2 tracking-wide">Booking Platform</p>
      </Wrapper>
    );
  }
  if (variant === "auth") {
    return (
      <Wrapper onClick={onClick} className="flex flex-col items-center">
        <img src={SONAPIE_LOGO_ICON} alt={APP_NAME_SHORT} className="h-14 w-14 object-contain" />
      </Wrapper>
    );
  }
  if (variant === "admin") {
    return (
      <Wrapper onClick={onClick} className={`flex items-center gap-3 ${onClick ? "text-left" : ""}`}>
        <img src={SONAPIE_LOGO_ICON} alt={APP_NAME_SHORT} className="h-10 w-10 object-contain shrink-0" />
        <div className="min-w-0">
          <div className="font-bold text-white text-sm truncate" style={{ fontFamily: "Playfair Display, serif" }}>{APP_NAME_SHORT}</div>
          <div className="text-[11px] text-primary font-medium">Booking Platform</div>
        </div>
      </Wrapper>
    );
  }
  return (
    <Wrapper onClick={onClick} className={`flex items-center gap-3 ${onClick ? "text-left" : ""}`}>
      <img src={SONAPIE_LOGO_ICON} alt={APP_NAME_SHORT} className="h-9 w-9 object-contain shrink-0" />
      <div className="hidden sm:block min-w-0">
        <div className="font-bold text-foreground text-sm leading-tight truncate" style={{ fontFamily: "Playfair Display, serif" }}>{APP_NAME}</div>
        <div className="text-[11px] text-muted-foreground leading-tight truncate">{APP_TAGLINE}</div>
      </div>
    </Wrapper>
  );
};

const DashboardStatCard = ({ label, value, icon: Icon, accent, onClick }: {
  label: string; value: string | number; icon: typeof Home; accent: string; onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left bg-card border border-border rounded-2xl p-5 transition-all hover:shadow-md hover:border-primary/30 ${onClick ? "cursor-pointer" : "cursor-default"}`}
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
      <Icon size={20} />
    </div>
    <div className="text-2xl font-bold text-foreground">{value}</div>
    <div className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</div>
  </button>
);

const StarRating = ({ rating, reviews }: { rating: number; reviews: number }) => (
  <div className="flex items-center gap-1.5">
    <div className="flex">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} className={i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
      ))}
    </div>
    <span className="text-sm font-semibold text-foreground">{rating}</span>
    <span className="text-sm text-muted-foreground">({reviews} avis)</span>
  </div>
);

const PropertyCard = ({ property, navigate, onFavorite, isFav }: {
  property: Property; navigate: (p: Page, d?: any) => void;
  onFavorite?: () => void; isFav?: boolean;
}) => (
  <div
    className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group border border-border"
    onClick={() => navigate("property", { property })}
  >
    <div className="relative overflow-hidden bg-muted h-52">
      <ImageWithFallback src={property.mainImage || property.image} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      {property.tag && (
        <div className="absolute top-3 left-3">
          <span className="bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full">{property.tag}</span>
        </div>
      )}
      {!property.available && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="bg-white text-gray-800 font-semibold px-4 py-1.5 rounded-full text-sm">Indisponible</span>
        </div>
      )}
      <button
        onClick={e => { e.stopPropagation(); onFavorite?.(); }}
        className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow"
      >
        <Heart size={15} className={isFav ? "fill-red-500 text-red-500" : "text-gray-500"} />
      </button>
    </div>
    <div className="p-4">
      <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
        <MapPin size={12} />
        <span>{property.city}</span>
        <span className="mx-1">·</span>
        <span>{property.type}</span>
      </div>
      <h3 className="font-semibold text-foreground text-sm leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-1">{property.name}</h3>
      <StarRating rating={property.rating} reviews={property.reviews} />
      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-primary">{fmt(property.price)}</span>
          <span className="text-xs text-muted-foreground ml-1">/ nuit</span>
        </div>
        {property.available ? (
          <button onClick={e => { e.stopPropagation(); navigate("property", { property }); }}
            className="text-xs bg-primary text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-orange-700 transition-colors">
            Voir détails
          </button>
        ) : (
          <span className="text-xs text-red-500 font-medium">Indisponible</span>
        )}
      </div>
    </div>
  </div>
);

// ── Header ─────────────────────────────────────────────────────────────────────
const Header = ({ navigate, currentPage, user, setUser }: NavProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isAdmin = currentPage.startsWith("admin");

  if (isAdmin) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <AppLogo variant="header" onClick={() => navigate("home")} />

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-6">
            {[
              { label: "Accueil", page: "home" as Page },
              { label: "Catalogue", page: "catalogue" as Page },
              { label: "À propos", page: "about" as Page },
              { label: "Contact", page: "contact" as Page },
            ].map(({ label, page }) => (
              <button
                key={page}
                onClick={() => navigate(page)}
                className={`text-sm font-medium transition-colors hover:text-primary ${currentPage === page ? "text-primary" : "text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{user.name.split(" ")[0]}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-border bg-muted">
                      <div className="font-semibold text-sm text-foreground">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    {[
                      { label: "Tableau de bord", page: "dashboard" as Page, icon: Home },
                      { label: "Mes réservations", page: "dashboard-reservations" as Page, icon: Calendar },
                      { label: "Mes favoris", page: "dashboard-favorites" as Page, icon: Heart },
                      { label: "Paiements", page: "dashboard-payments" as Page, icon: CreditCard },
                      { label: "Mes documents", page: "dashboard-documents" as Page, icon: FileText },
                      { label: "Mes réclamations", page: "dashboard-complaints" as Page, icon: AlertCircle },
                      { label: "Mon profil", page: "dashboard-profile" as Page, icon: Settings },
                      ...(user.isAdmin ? [{ label: "Administration", page: "admin" as Page, icon: Shield }] : []),
                    ].map(({ label, page, icon: Icon }) => (
                      <button
                        key={page}
                        onClick={() => { navigate(page); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <Icon size={15} className="text-muted-foreground" />
                        {label}
                      </button>
                    ))}
                    <div className="border-t border-border">
                      <button
                        onClick={() => { setUser(null); setUserMenuOpen(false); navigate("home"); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("catalogue")}
                  className="hidden sm:block text-sm font-semibold text-secondary border border-secondary px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
                >
                  Réserver
                </button>
                <button
                  onClick={() => navigate("login")}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2"
                >
                  Connexion
                </button>
                <button
                  onClick={() => navigate("register")}
                  className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  S'inscrire
                </button>
              </div>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 rounded-lg hover:bg-muted">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="lg:hidden py-4 border-t border-border flex flex-col gap-1">
            {[
              { label: "Accueil", page: "home" as Page },
              { label: "Catalogue", page: "catalogue" as Page },
              { label: "À propos", page: "about" as Page },
              { label: "Contact", page: "contact" as Page },
            ].map(({ label, page }) => (
              <button
                key={page}
                onClick={() => { navigate(page); setMenuOpen(false); }}
                className="text-sm font-medium py-2 px-3 rounded-lg text-left hover:bg-muted transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

// ── Footer ─────────────────────────────────────────────────────────────────────
const Footer = ({ navigate }: { navigate: (p: Page) => void }) => (
  <footer className="bg-[#14261A] text-white mt-16">
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div>
          <AppLogo variant="footer" />
          <p className="text-sm text-gray-400 leading-relaxed mt-4">Société Nationale de Gestion du Patrimoine Immobilier de l'État de Côte d'Ivoire. Gérer, valoriser et partager le patrimoine national.</p>
          <div className="flex gap-3 mt-4">
            {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
              <button key={i} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-primary transition-colors">
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-4 text-white">Navigation</h4>
          <ul className="space-y-2">
            {[
              { label: "Accueil", page: "home" as Page },
              { label: "Catalogue des biens", page: "catalogue" as Page },
              { label: "À propos de SONAPIE", page: "about" as Page },
              { label: "Contact & FAQ", page: "contact" as Page },
            ].map(({ label, page }) => (
              <li key={page}>
                <button onClick={() => navigate(page)} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-4 text-white">Destinations</h4>
          <ul className="space-y-2">
            {CITIES.map(c => (
              <li key={c}>
                <button onClick={() => navigate("catalogue")} className="text-sm text-gray-400 hover:text-white transition-colors">{c}</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-4 text-white">Contact</h4>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-sm text-gray-400">
              <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
              Plateau, Avenue Jean-Paul II, Abidjan, Côte d'Ivoire
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-400">
              <Phone size={14} className="text-primary" />
              +225 27 20 25 00 00
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-400">
              <Mail size={14} className="text-primary" />
              contact@sonapie.ci
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="text-xs text-gray-500">© 2025 {APP_NAME} — Tous droits réservés. République de Côte d'Ivoire.</p>
        <div className="flex gap-4">
          <button className="text-xs text-gray-500 hover:text-white">Mentions légales</button>
          <button className="text-xs text-gray-500 hover:text-white">Confidentialité</button>
          <button className="text-xs text-gray-500 hover:text-white">CGU</button>
        </div>
      </div>
    </div>
  </footer>
);

// ── Home Page ──────────────────────────────────────────────────────────────────
const BUDGET_OPTIONS = [
  { value: 100000, label: "Tous les budgets" },
  { value: 25000, label: "≤ 25 000 FCFA / nuit" },
  { value: 50000, label: "≤ 50 000 FCFA / nuit" },
  { value: 75000, label: "≤ 75 000 FCFA / nuit" },
];

const HeroSearchField = ({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: ReactNode }) => (
  <div className="flex flex-1 min-w-0 items-center gap-3 px-4 py-3.5">
    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon size={17} className="text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none mb-1.5">{label}</div>
      {children}
    </div>
  </div>
);

const heroSelectClass = "w-full bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer appearance-none truncate pr-1";

const formatHeroDate = (value: string) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;

const HeroDateInput = ({ value, onChange, min }: { value: string; onChange: (v: string) => void; min?: string }) => {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <label className="relative flex items-center w-full min-h-[22px] cursor-pointer">
      <span className={`text-sm font-medium truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>
        {formatHeroDate(value) || "Choisir une date"}
      </span>
      <input
        ref={ref}
        type="date"
        value={value}
        min={min}
        onChange={e => onChange(e.target.value)}
        onClick={() => ref.current?.showPicker?.()}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
      />
    </label>
  );
};

const HomePage = ({ navigate, filters, setFilters, favorites, toggleFavorite, properties }: {
  navigate: (p: Page, d?: any) => void;
  filters: CatalogueFilters;
  setFilters: (f: CatalogueFilters) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  properties: Property[];
}) => {
  const [searchCity, setSearchCity] = useState(filters.city);
  const [searchType, setSearchType] = useState(filters.type || "Toutes catégories");
  const [searchCapacity, setSearchCapacity] = useState(filters.capacity);
  const [searchCheckIn, setSearchCheckIn] = useState(filters.checkIn);
  const [searchCheckOut, setSearchCheckOut] = useState(filters.checkOut);
  const [searchBudget, setSearchBudget] = useState(filters.budget);

  const handleSearch = () => {
    setFilters({
      ...filters,
      city: searchCity,
      type: searchType,
      capacity: searchCapacity,
      checkIn: searchCheckIn,
      checkOut: searchCheckOut,
      budget: searchBudget,
      maxPrice: searchBudget,
    });
    navigate("catalogue");
  };

  const goCatalogueWithCity = (city: string) => {
    setFilters({ ...filters, city, maxPrice: filters.maxPrice });
    navigate("catalogue");
  };

  const destinations = CITIES.map(city => {
    const inCity = properties.filter(p => p.city === city);
    const lead = inCity[0];
    return {
      name: city,
      desc: CITY_DESTINATION_META[city]?.desc ?? city,
      count: inCity.length,
      img: lead?.mainImage || lead?.image || SONAPIE_LOGO,
    };
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center">
        <div className="absolute inset-0 bg-[#0A2918] overflow-hidden">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/b/b3/Abidjan_bay_with_Hotel_Ivoire%2C_Cote_d%27Ivoire.jpg"
            alt="Patrimoine hôtelier SONAPIE — baie d'Abidjan"
            className="w-full h-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A2918]/60 via-[#0A2918]/40 to-[#0A2918]/80" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 text-sm text-orange-300 mb-6">
              <Award size={14} />
              Patrimoine officiel de l'État de Côte d'Ivoire
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight" style={{ fontFamily: "Playfair Display, serif" }}>
              Découvrez &amp; Réservez<br />
              <span className="text-primary">les Joyaux</span> de la<br />
              Côte d'Ivoire
            </h1>
            <p className="text-gray-300 text-lg mb-8 max-w-xl leading-relaxed">
              Villas, hôtels, résidences et espaces événementiels du patrimoine national. Réservez en ligne, payez localement.
            </p>

            {/* Search bar */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl">
              {/* Desktop — barre horizontale unifiée */}
              <div className="hidden md:flex items-stretch">
                <HeroSearchField icon={MapPin} label="Destination">
                  <select className={heroSelectClass} value={searchCity} onChange={e => setSearchCity(e.target.value)}>
                    <option value="">Toutes les villes</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </HeroSearchField>
                <div className="w-px bg-border self-stretch my-3" />
                <HeroSearchField icon={Building2} label="Type de bien">
                  <select className={heroSelectClass} value={searchType} onChange={e => setSearchType(e.target.value)}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </HeroSearchField>
                <div className="w-px bg-border self-stretch my-3" />
                <HeroSearchField icon={Calendar} label="Arrivée">
                  <HeroDateInput value={searchCheckIn} onChange={setSearchCheckIn} />
                </HeroSearchField>
                <div className="w-px bg-border self-stretch my-3" />
                <HeroSearchField icon={Calendar} label="Départ">
                  <HeroDateInput value={searchCheckOut} onChange={setSearchCheckOut} min={searchCheckIn || undefined} />
                </HeroSearchField>
                <button
                  onClick={handleSearch}
                  className="shrink-0 flex items-center justify-center gap-2 bg-primary text-white font-semibold px-6 hover:bg-orange-700 transition-colors"
                >
                  <Search size={18} />
                  <span className="hidden lg:inline">Rechercher</span>
                </button>
              </div>

              {/* Desktop — 2e ligne : capacité, budget */}
              <div className="hidden md:flex items-stretch border-t border-border bg-muted/30">
                <HeroSearchField icon={Users} label="Capacité">
                  <select className={heroSelectClass} value={searchCapacity} onChange={e => setSearchCapacity(e.target.value)}>
                    <option value="">Tous les effectifs</option>
                    <option>1-5 personnes</option>
                    <option>6-20 personnes</option>
                    <option>21-100 personnes</option>
                    <option>100+ personnes</option>
                  </select>
                </HeroSearchField>
                <div className="w-px bg-border self-stretch my-3" />
                <HeroSearchField icon={CreditCard} label="Budget max">
                  <select className={heroSelectClass} value={searchBudget} onChange={e => setSearchBudget(+e.target.value)}>
                    {BUDGET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </HeroSearchField>
              </div>

              {/* Mobile — grille empilée */}
              <div className="md:hidden p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Destination</div>
                    <select className="w-full bg-transparent text-sm font-medium outline-none" value={searchCity} onChange={e => setSearchCity(e.target.value)}>
                      <option value="">Toutes les villes</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Type</div>
                    <select className="w-full bg-transparent text-sm font-medium outline-none" value={searchType} onChange={e => setSearchType(e.target.value)}>
                      {TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Arrivée</div>
                    <HeroDateInput value={searchCheckIn} onChange={setSearchCheckIn} />
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Départ</div>
                    <HeroDateInput value={searchCheckOut} onChange={setSearchCheckOut} min={searchCheckIn || undefined} />
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Capacité</div>
                    <select className="w-full bg-transparent text-sm font-medium outline-none" value={searchCapacity} onChange={e => setSearchCapacity(e.target.value)}>
                      <option value="">Tous</option>
                      <option>1-5 personnes</option>
                      <option>6-20 personnes</option>
                      <option>21-100 personnes</option>
                      <option>100+ personnes</option>
                    </select>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Budget</div>
                    <select className="w-full bg-transparent text-sm font-medium outline-none" value={searchBudget} onChange={e => setSearchBudget(+e.target.value)}>
                      {BUDGET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleSearch} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold rounded-xl py-3 hover:bg-orange-700 transition-colors">
                  <Search size={16} /> Rechercher
                </button>
              </div>
            </div>

            <div className="flex gap-6 mt-6">
              {[{ label: "127", desc: "Biens patrimoniaux" }, { label: "8", desc: "Destinations phares" }, { label: "1842", desc: "Clients satisfaits" }].map(({ label, desc }) => (
                <div key={desc}>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: "Playfair Display, serif" }}>{label}</div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured properties */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Sélection Exclusive</p>
            <h2 className="text-3xl font-bold text-foreground">Biens Populaires</h2>
          </div>
          <button
            onClick={() => navigate("catalogue")}
            className="hidden sm:flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Voir tout <ArrowRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {properties.filter(p => p.featured).map(p => (
            <PropertyCard
              key={p.id}
              property={p}
              navigate={navigate}
              isFav={favorites.includes(p.id)}
              onFavorite={() => toggleFavorite(p.id)}
            />
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section className="bg-muted py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Explorer</p>
            <h2 className="text-3xl font-bold text-foreground">Nos Destinations</h2>
            <p className="text-muted-foreground mt-2">Des côtes atlantiques aux savanes du nord, découvrez la richesse de la Côte d'Ivoire</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {destinations.map(d => (
              <button
                key={d.name}
                onClick={() => goCatalogueWithCity(d.name)}
                className="group relative rounded-xl overflow-hidden bg-muted-foreground aspect-[3/4] hover:scale-105 transition-transform duration-300"
              >
                <ImageWithFallback src={d.img} alt={d.name} className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="text-white font-bold text-sm">{d.name}</div>
                  <div className="text-gray-300 text-xs">{d.desc}</div>
                  <div className="text-primary text-xs mt-1 font-medium">{d.count} biens</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Why SONAPIE */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Pourquoi nous choisir</p>
            <h2 className="text-3xl font-bold text-foreground mb-5">La garantie du patrimoine d'État</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              SONAPIE est la société nationale mandatée par l'État de Côte d'Ivoire pour gérer, valoriser et mettre en location son patrimoine immobilier. Transparence, sécurité et excellence.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Shield, label: "Propriétés certifiées", desc: "Chaque bien est officiellement recensé et authentifié" },
                { icon: CreditCard, label: "Paiements locaux", desc: "Orange Money, MTN Money, Wave, Carte bancaire" },
                { icon: CheckCircle, label: "Réservation instantanée", desc: "Confirmation en temps réel, 24h/24" },
                { icon: Award, label: "Service premium", desc: "Équipe dédiée et support en français" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&auto=format"
              alt="Propriété SONAPIE"
              className="w-full rounded-2xl shadow-xl object-cover h-80"
            />
            <div className="absolute -bottom-5 -left-5 bg-white rounded-xl shadow-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <TrendingUp size={18} className="text-white" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Taux de satisfaction</div>
                <div className="font-bold text-foreground">98.7%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 mx-6 lg:mx-16 rounded-3xl mb-16">
        <div className="text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "Playfair Display, serif" }}>Prêt à réserver sur {APP_NAME}?</h2>
          <p className="text-orange-100 mb-8 max-w-lg mx-auto">Découvrez notre catalogue de biens exclusifs et réservez votre séjour de rêve en quelques clics.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => navigate("catalogue")} className="bg-white text-primary font-bold px-8 py-3 rounded-xl hover:bg-orange-50 transition-colors">
              Voir le catalogue
            </button>
            <button onClick={() => navigate("about")} className="border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
              En savoir plus
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

// ── Catalogue Page ─────────────────────────────────────────────────────────────
const CataloguePage = ({ navigate, filters, setFilters, favorites, toggleFavorite, properties }: {
  navigate: (p: Page, d?: any) => void;
  filters: CatalogueFilters;
  setFilters: (f: CatalogueFilters) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  properties: Property[];
}) => {
  const [filterCity, setFilterCity] = useState(filters.city || "Toutes");
  const [filterType, setFilterType] = useState(filters.type || "Toutes catégories");
  const [filterCapacity, setFilterCapacity] = useState(filters.capacity || "");
  const [filterAmenity, setFilterAmenity] = useState(filters.amenity || "Tous");
  const [filterAvail, setFilterAvail] = useState(filters.availOnly);
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice || 100000);
  const [sortBy, setSortBy] = useState("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [searchName, setSearchName] = useState("");

  useEffect(() => {
    if (filters.city) setFilterCity(filters.city);
    if (filters.type) setFilterType(filters.type);
    if (filters.capacity) setFilterCapacity(filters.capacity);
    if (filters.amenity) setFilterAmenity(filters.amenity);
    setMaxPrice(filters.maxPrice || 100000);
    setFilterAvail(filters.availOnly);
  }, [filters]);

  const filtered = properties
    .filter(p => (filterCity === "Toutes" || !filterCity || p.city === filterCity))
    .filter(p => (filterType === "Toutes catégories" || p.type === filterType))
    .filter(p => !filterAvail || p.available)
    .filter(p => p.price <= maxPrice)
    .filter(p => matchCapacity(p.capacity, filterCapacity))
    .filter(p => matchAmenity(p.amenities, filterAmenity))
    .filter(p => !searchName || p.name.toLowerCase().includes(searchName.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "availability") return (b.available ? 1 : 0) - (a.available ? 1 : 0);
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return b.reviews - a.reviews;
    });

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catalogue des biens</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} biens disponibles</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              placeholder="Rechercher un établissement…"
              className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg w-56 sm:w-64 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => setShowMap(!showMap)}
            className={`hidden lg:flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium transition-colors ${showMap ? "bg-secondary text-white border-secondary" : "hover:bg-muted"}`}
          >
            <Map size={15} /> Carte
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            <Filter size={15} /> Filtres
          </button>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-primary text-white" : "hover:bg-muted"} transition-colors`}>
              <Grid size={16} />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted"} transition-colors`}>
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className={`shrink-0 w-56 ${showFilters ? "block" : "hidden lg:block"}`}>
          <div className="bg-card rounded-xl border border-border p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Filtres</h3>
              <button onClick={() => { setFilterCity("Toutes"); setFilterType("Toutes catégories"); setFilterCapacity(""); setFilterAmenity("Tous"); setFilterAvail(false); setMaxPrice(100000); setFilters(DEFAULT_FILTERS); }} className="text-xs text-primary hover:underline">
                Réinitialiser
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Ville</label>
                <div className="space-y-1.5">
                  {["Toutes", ...CITIES].map(c => (
                    <label key={c} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="city" checked={filterCity === c} onChange={() => setFilterCity(c)} className="accent-primary" />
                      <span className="text-sm text-foreground">{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Type de bien</label>
                <select
                  className="w-full text-sm bg-input-background border border-border rounded-lg px-3 py-2 outline-none"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Capacité</label>
                <select value={filterCapacity} onChange={e => setFilterCapacity(e.target.value)}
                  className="w-full text-sm bg-input-background border border-border rounded-lg px-3 py-2 outline-none">
                  <option value="">Toutes</option>
                  <option>1-5 personnes</option>
                  <option>6-20 personnes</option>
                  <option>21-100 personnes</option>
                  <option>100+ personnes</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Équipements</label>
                <select value={filterAmenity} onChange={e => setFilterAmenity(e.target.value)}
                  className="w-full text-sm bg-input-background border border-border rounded-lg px-3 py-2 outline-none">
                  {AMENITY_FILTERS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Prix max: {fmt(maxPrice)}
                </label>
                <input
                  type="range" min={10000} max={100000} step={5000}
                  value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>50k</span><span>300k FCFA</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filterAvail} onChange={e => setFilterAvail(e.target.checked)} className="accent-primary" />
                  <span className="text-sm font-medium">Disponibles uniquement</span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">{filtered.length} résultats</span>
            <select
              className="text-sm bg-card border border-border rounded-lg px-3 py-2 outline-none"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="availability">Disponibilité</option>
              <option value="rating">Mieux notés</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="reviews">Plus d'avis</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun bien ne correspond à vos critères</p>
              <p className="text-sm mt-1">Essayez d'élargir votre recherche</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className={`grid gap-6 ${
              showMap
                ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
            }`}>
              {filtered.map(p => (
                <PropertyCard
                  key={p.id} property={p} navigate={navigate}
                  isFav={favorites.includes(p.id)}
                  onFavorite={() => toggleFavorite(p.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(p => (
                <div
                  key={p.id}
                  className="bg-card border border-border rounded-xl overflow-hidden flex cursor-pointer hover:shadow-md transition-all group"
                  onClick={() => navigate("property", { property: p })}
                >
                  <div className="relative w-56 sm:w-64 h-40 sm:h-44 shrink-0 bg-muted overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {!p.available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">Indisponible</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-5 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <MapPin size={11} />{p.city} · {p.type}
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                        <StarRating rating={p.rating} reviews={p.reviews} />
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{p.description}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-lg font-bold text-primary">{fmt(p.price)}</div>
                        <div className="text-xs text-muted-foreground">/ nuit</div>
                        {p.available && (
                          <button
                            onClick={e => { e.stopPropagation(); navigate("property", { property: p }); }}
                            className="mt-2 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors"
                          >
                            Voir le bien
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showMap && (
          <aside className="hidden lg:block w-72 xl:w-80 shrink-0">
            <MapPanel properties={filtered} onSelect={p => navigate("property", { property: p })} />
          </aside>
        )}
      </div>
    </div>
  );
};

// ── Property Detail ────────────────────────────────────────────────────────────
const PropertyPage = ({ navigate, property: prop, setBookingData, favorites, toggleFavorite, allProperties, feePct }: {
  navigate: (p: Page, d?: any) => void;
  property: Property;
  setBookingData: (d: any) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  allProperties: Property[];
  feePct: number;
}) => {
  const [currentImg, setCurrentImg] = useState(0);
  const isFav = favorites.includes(prop.id);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const gallery = prop.gallery?.length ? prop.gallery : prop.images;
  const galleryLabels = ["Vue d'ensemble", "Intérieur", "Extérieur / piscine", "Chambre"];

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;
  const total = nights * prop.price;
  const fees = calcFees(total, feePct);

  const handleBook = () => {
    setBookingData({ property: prop, checkIn, checkOut, guests, nights, total, fees, feePct: clampPct(feePct), grandTotal: total + fees });
    navigate("booking-dates", { property: prop });
  };

  const reviews = [
    { name: "Kouamé A.", date: "Janvier 2025", rating: 5, comment: "Séjour exceptionnel ! La villa est encore plus belle en vrai. Service irréprochable, personnel très attentionné. Je recommande vivement." },
    { name: "Aminata D.", date: "Décembre 2024", rating: 5, comment: "Magnifique propriété, vue imprenable sur la lagune. La cuisine équipée est parfaite pour des séjours en famille. Nous reviendrons !" },
    { name: "Serge B.", date: "Novembre 2024", rating: 4, comment: "Très belle expérience. La piscine est superbe et l'accès à la plage est pratique. Légère imperfection au niveau de la clim dans la chambre principale." },
  ];

  const amenityIcons: Record<string, any> = {
    "Piscine privée": { icon: "🏊", },
    "Accès plage": { icon: "🏖️" },
    "Wi-Fi haut débit": { icon: "📶" },
    "Cuisine équipée": { icon: "🍳" },
    "Climatisation": { icon: "❄️" },
    "Parking sécurisé": { icon: "🅿️" },
    "Service de chef": { icon: "👨‍🍳" },
    "Sécurité 24h/24": { icon: "🔒" },
    "Vue panoramique": { icon: "🌅" },
    "Restaurant": { icon: "🍽️" },
    "Bar colonial": { icon: "🍹" },
    "Plage privée": { icon: "🏖️" },
    "Spa": { icon: "💆" },
    "SPA": { icon: "💆" },
    "Réservation": { icon: "📅" },
    "Restauration": { icon: "🍽️" },
    "Bar": { icon: "🍹" },
    "Vélos": { icon: "🚲" },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate("home")} className="hover:text-primary transition-colors">Accueil</button>
        <ChevronRight size={14} />
        <button onClick={() => navigate("catalogue")} className="hover:text-primary transition-colors">Catalogue</button>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium line-clamp-1">{prop.name}</span>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{prop.name}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <StarRating rating={prop.rating} reviews={prop.reviews} />
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin size={13} /> {prop.location || `${prop.city}, Côte d'Ivoire`}
            </div>
            <Badge label={prop.type} color="orange" />
            {prop.isSonapieManaged && <Badge label="Géré par SONAPIE" color="green" />}
            {prop.available ? <Badge label="Disponible" color="green" /> : <Badge label="Indisponible" color="red" />}
          </div>
        </div>
        <button onClick={() => toggleFavorite(prop.id)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
          <Heart size={16} className={isFav ? "fill-red-500 text-red-500" : ""} />
          <span className="text-sm hidden sm:block">{isFav ? "Retirer des favoris" : "Ajouter aux favoris"}</span>
        </button>
        <button onClick={() => navigate("contact")} className="flex items-center gap-2 px-4 py-2 border border-secondary text-secondary rounded-lg hover:bg-green-50 transition-colors">
          <MessageCircle size={16} />
          <span className="text-sm hidden sm:block">Contacter SONAPIE</span>
        </button>
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden mb-8 h-80 sm:h-96">
        <div className="col-span-3 relative overflow-hidden bg-muted">
          <ImageWithFallback src={gallery[currentImg]} alt={prop.name} className="w-full h-full object-cover" />
          <button
            onClick={() => setCurrentImg(i => Math.max(0, i - 1))}
            disabled={currentImg === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentImg(i => Math.min(gallery.length - 1, i + 1))}
            disabled={currentImg >= gallery.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
            {galleryLabels[currentImg] ?? `Photo ${currentImg + 1}`}
          </div>
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
            <Camera size={12} /> {currentImg + 1}/{gallery.length}
          </div>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden">
          {gallery.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentImg(i)}
              className={`flex-1 overflow-hidden rounded-lg bg-muted transition-all min-h-0 ${currentImg === i ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"}`}
            >
              <ImageWithFallback src={img} alt={`${prop.name} — ${galleryLabels[i] ?? i + 1}`} className="w-full h-full object-cover" title={galleryLabels[i]} />
            </button>
          ))}
        </div>
      </div>
      {prop.imagesPendingOfficial && (
        <p className="text-xs text-muted-foreground -mt-6 mb-8 italic">
          Certaines photos sont provisoires — visuels officiels à confirmer auprès de la SONAPIE.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Capacité", value: `${prop.capacity} pers.` },
              { label: "Chambres", value: prop.bedrooms > 0 ? `${prop.bedrooms} ch.` : "N/A" },
              { label: "Salles de bain", value: `${prop.bathrooms}` },
              { label: "Surface", value: `${prop.area} m²` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted rounded-xl p-4 text-center">
                <div className="text-xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-3">Description</h2>
            <p className="text-muted-foreground leading-relaxed">{prop.description}</p>
          </div>

          {/* Amenities */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Équipements et services</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(prop.services?.length ? prop.services : prop.amenities).map(a => (
                <div key={a} className="flex items-center gap-2.5 bg-muted rounded-lg px-3 py-2.5">
                  <span className="text-base">{amenityIcons[a]?.icon || "✓"}</span>
                  <span className="text-sm text-foreground">{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Availability calendar */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Calendrier de disponibilité</h2>
            <AvailabilityCalendar bookedDays={[3, 4, 10, 11, 18, 19, 25]} />
            <p className="text-xs text-muted-foreground mt-2">Les dates barrées sont déjà réservées. Sélectionnez vos dates dans le formulaire de réservation.</p>
          </div>

          {/* Rules */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-3">Règlement intérieur</h2>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Arrivée à partir de 14h, départ avant 11h</li>
              <li>Interdiction de fumer dans les espaces intérieurs</li>
              <li>Animaux non admis sauf autorisation préalable</li>
              <li>Respect du voisinage et du patrimoine national</li>
            </ul>
          </div>

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Avis clients <span className="text-base font-normal text-muted-foreground">({prop.reviews} avis)</span>
            </h2>
            <div className="space-y-4">
              {reviews.map((r, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {r.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.date}</div>
                      </div>
                    </div>
                    <div className="flex">
                      {[1,2,3,4,5].map(j => (
                        <Star key={j} size={12} className={j <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Similar properties */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Biens similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allProperties.filter(p => p.id !== prop.id && (p.city === prop.city || p.type === prop.type)).slice(0, 2).map(p => (
                <PropertyCard key={p.id} property={p} navigate={navigate} isFav={favorites.includes(p.id)} onFavorite={() => toggleFavorite(p.id)} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Booking widget */}
        <div>
          <div className="bg-card border border-border rounded-2xl p-5 sticky top-24 shadow-lg">
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-2xl font-bold text-primary">{fmt(prop.price)}</span>
              <span className="text-sm text-muted-foreground">/ nuit</span>
            </div>

            {prop.available ? (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1">Arrivée</label>
                    <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1">Départ</label>
                    <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn || new Date().toISOString().split("T")[0]}
                      className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1">Voyageurs</label>
                    <div className="flex items-center gap-3 bg-input-background border border-border rounded-lg px-3 py-2">
                      <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-sm font-bold hover:bg-border">−</button>
                      <span className="flex-1 text-center text-sm font-medium">{guests} voyageur{guests > 1 ? "s" : ""}</span>
                      <button onClick={() => setGuests(g => Math.min(prop.capacity, g + 1))} className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-sm font-bold hover:bg-border">+</button>
                    </div>
                  </div>
                </div>

                {nights > 0 && (
                  <div className="bg-muted rounded-xl p-4 mb-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{fmt(prop.price)} × {nights} nuit{nights > 1 ? "s" : ""}</span>
                      <span className="font-medium">{fmt(total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Frais de service ({clampPct(feePct)}%)</span>
                      <span className="font-medium">{fmt(fees)}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                      <span>Total</span>
                      <span className="text-primary">{fmt(total + fees)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBook}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors"
                >
                  {nights > 0 ? `Réserver — ${fmt(total + fees)}` : "Vérifier la disponibilité"}
                </button>
                <p className="text-xs text-center text-muted-foreground mt-3">Aucun paiement débité maintenant</p>
              </>
            ) : (
              <div className="text-center py-6">
                <XCircle size={40} className="text-red-400 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Ce bien n'est pas disponible</p>
                <p className="text-sm text-muted-foreground mt-1">Contactez-nous pour plus d'informations</p>
                <button onClick={() => navigate("contact")} className="mt-4 w-full border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                  Nous contacter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Booking Flow ───────────────────────────────────────────────────────────────
const BookingSteps = ({ current }: { current: number }) => {
  const steps = ["Dates", "Informations", "Récapitulatif", "Paiement", "Confirmation"];
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${i + 1 === current ? "bg-primary text-white" :
              i + 1 < current ? "bg-secondary text-white" : "bg-muted text-muted-foreground"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
              ${i + 1 < current ? "bg-white/20" : i + 1 === current ? "bg-white/20" : "bg-white/0"}`}>
              {i + 1 < current ? <Check size={12} /> : i + 1}
            </span>
            <span className="hidden sm:block">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`w-6 sm:w-10 h-0.5 ${i + 1 < current ? "bg-secondary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
};

const BookingDatesPage = ({ navigate, property: prop, bookingData, setBookingData, feePct }: {
  navigate: (p: Page, d?: any) => void;
  property: Property;
  bookingData: any;
  setBookingData: (d: any) => void;
  feePct: number;
}) => {
  const [checkIn, setCheckIn] = useState(bookingData.checkIn || "");
  const [checkOut, setCheckOut] = useState(bookingData.checkOut || "");
  const [guests, setGuests] = useState(bookingData.guests || 2);
  const nights = checkIn && checkOut ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) : 0;
  const total = nights * prop.price;
  const fees = calcFees(total, feePct);

  const handleNext = () => {
    setBookingData({ ...bookingData, property: prop, checkIn, checkOut, guests, nights, total, fees, feePct: clampPct(feePct), grandTotal: total + fees });
    navigate("booking-info");
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <BookingSteps current={1} />
      <h1 className="text-2xl font-bold text-foreground mb-1">Sélectionnez vos dates</h1>
      <p className="text-muted-foreground mb-6 text-sm">{prop.name} — {prop.city}</p>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Date d'arrivée</label>
            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} min={new Date().toISOString().split("T")[0]}
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Date de départ</label>
            <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn || new Date().toISOString().split("T")[0]}
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">Nombre de voyageurs (max: {prop.capacity})</label>
          <div className="flex items-center gap-4 bg-input-background border border-border rounded-xl px-4 py-3">
            <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="w-7 h-7 bg-muted rounded-full flex items-center justify-center font-bold hover:bg-border">−</button>
            <span className="flex-1 text-center font-medium">{guests} voyageur{guests > 1 ? "s" : ""}</span>
            <button onClick={() => setGuests(g => Math.min(prop.capacity, g + 1))} className="w-7 h-7 bg-muted rounded-full flex items-center justify-center font-bold hover:bg-border">+</button>
          </div>
        </div>
      </div>

      {nights > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6">
          <h3 className="font-semibold text-foreground mb-3">Récapitulatif du prix</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{fmt(prop.price)} × {nights} nuit{nights > 1 ? "s" : ""}</span><span>{fmt(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Frais de service ({clampPct(feePct)}%)</span><span>{fmt(fees)}</span></div>
            <div className="flex justify-between font-bold text-foreground border-t border-primary/20 pt-2 mt-2">
              <span>Total estimé</span><span className="text-primary text-lg">{fmt(total + fees)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => navigate("property", { property: prop })} className="flex-1 border border-border py-3 rounded-xl font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Retour
        </button>
        <button
          onClick={handleNext}
          disabled={!checkIn || !checkOut || nights <= 0}
          className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continuer <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const BookingInfoPage = ({ navigate, bookingData, setBookingData }: {
  navigate: (p: Page) => void;
  bookingData: any;
  setBookingData: (d: any) => void;
}) => {
  const [form, setForm] = useState({
    firstName: bookingData.firstName || "",
    lastName: bookingData.lastName || "",
    email: bookingData.email || "",
    phone: bookingData.phone || "",
    idType: bookingData.idType || "CNI",
    idNumber: bookingData.idNumber || "",
    notes: bookingData.notes || "",
  });

  const handleNext = () => {
    setBookingData({ ...bookingData, ...form });
    navigate("booking-summary");
  };

  const valid = form.firstName && form.lastName && form.email && form.phone && form.idNumber;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <BookingSteps current={2} />
      <h1 className="text-2xl font-bold text-foreground mb-1">Vos informations</h1>
      <p className="text-muted-foreground mb-6 text-sm">Ces informations sont nécessaires pour valider votre réservation</p>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Prénom *</label>
            <input value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} placeholder="Kouamé"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Nom *</label>
            <input value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} placeholder="Adjobi"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">Email *</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="kouame@email.com"
            className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">Téléphone *</label>
          <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+225 07 XX XX XX XX"
            className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Pièce d'identité *</label>
            <select value={form.idType} onChange={e => setForm(f => ({...f, idType: e.target.value}))}
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary">
              <option>CNI</option>
              <option>Passeport</option>
              <option>Titre de séjour</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Numéro *</label>
            <input value={form.idNumber} onChange={e => setForm(f => ({...f, idNumber: e.target.value}))} placeholder="CI-AB-12345-2020"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">Notes spéciales (optionnel)</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3} placeholder="Arrivée tardive, demande particulière..."
            className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary resize-none" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate("booking-dates")} className="flex-1 border border-border py-3 rounded-xl font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Retour
        </button>
        <button onClick={handleNext} disabled={!valid}
          className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          Continuer <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const BookingSummaryPage = ({ navigate, bookingData }: { navigate: (p: Page) => void; bookingData: any }) => {
  const bd = bookingData;
  const pct = typeof bd.feePct === "number" ? clampPct(bd.feePct) : 5;
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <BookingSteps current={3} />
      <h1 className="text-2xl font-bold text-foreground mb-1">Récapitulatif</h1>
      <p className="text-muted-foreground mb-6 text-sm">Vérifiez les détails de votre réservation</p>

      <div className="space-y-4 mb-6">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex gap-4 p-5">
            <img src={bd.property?.image} alt={bd.property?.name} className="w-20 h-20 object-cover rounded-xl bg-muted shrink-0" />
            <div>
              <h3 className="font-bold text-foreground">{bd.property?.name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5"><MapPin size={12}/>{bd.property?.city}</div>
              <div className="flex gap-2 mt-2">
                <Badge label={bd.property?.type || ""} color="orange" />
                <Badge label="Disponible" color="green" />
              </div>
            </div>
          </div>
          <div className="border-t border-border grid grid-cols-3 divide-x divide-border">
            {[
              { label: "Arrivée", value: bd.checkIn || "—" },
              { label: "Départ", value: bd.checkOut || "—" },
              { label: "Voyageurs", value: `${bd.guests || 0}` },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 text-center">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="font-semibold text-sm text-foreground mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3">Informations client</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Nom :</span> <span className="font-medium">{bd.firstName} {bd.lastName}</span></div>
            <div><span className="text-muted-foreground">Email :</span> <span className="font-medium">{bd.email}</span></div>
            <div><span className="text-muted-foreground">Téléphone :</span> <span className="font-medium">{bd.phone}</span></div>
            <div><span className="text-muted-foreground">{bd.idType} :</span> <span className="font-medium">{bd.idNumber}</span></div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-3">Détail du prix</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{fmt(bd.property?.price || 0)} × {bd.nights || 0} nuit{(bd.nights || 0) > 1 ? "s" : ""}</span><span>{fmt(bd.total || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Frais de service ({pct}%)</span><span>{fmt(bd.fees || 0)}</span></div>
            <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between font-bold text-foreground">
              <span>Total à payer</span><span className="text-primary text-lg">{fmt(bd.grandTotal || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate("booking-info")} className="flex-1 border border-border py-3 rounded-xl font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Modifier
        </button>
        <button onClick={() => navigate("booking-payment")}
          className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
          Passer au paiement <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const BookingPaymentPage = ({ navigate, bookingData, setBookingData }: {
  navigate: (p: Page) => void;
  bookingData: any;
  setBookingData: (d: any) => void;
}) => {
  const [method, setMethod] = useState("orange-money");
  const [phone, setPhone] = useState("");
  const [cardNum, setCardNum] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [loading, setLoading] = useState(false);

  const methods = [
    { id: "orange-money", label: "Orange Money", emoji: "🟠", color: "border-orange-400 bg-orange-50" },
    { id: "mtn-money", label: "MTN Money", emoji: "🟡", color: "border-yellow-400 bg-yellow-50" },
    { id: "wave", label: "Wave", emoji: "🟢", color: "border-green-400 bg-green-50" },
    { id: "tresor-pay", label: "Trésor Pay", emoji: "🇨🇮", color: "border-secondary bg-secondary/10" },
    { id: "card", label: "Carte bancaire", emoji: "💳", color: "border-purple-400 bg-purple-50" },
    { id: "admin", label: "Paiement administratif", emoji: "🏛️", color: "border-orange-400 bg-orange-50" },
  ];

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const ref = "RES-2025-" + Math.floor(Math.random() * 9000 + 1000);
      setBookingData({ ...bookingData, paymentMethod: method, ref });
      navigate("booking-confirmation");
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <BookingSteps current={4} />
      <h1 className="text-2xl font-bold text-foreground mb-1">Paiement</h1>
      <p className="text-muted-foreground mb-6 text-sm">Choisissez votre moyen de paiement</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {methods.map(m => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${method === m.id ? m.color + " border-current" : "border-border bg-card hover:bg-muted"}`}
          >
            <span className="text-xl">{m.emoji}</span>
            <span className={`font-semibold text-sm ${method === m.id ? "" : "text-foreground"}`}>{m.label}</span>
            {method === m.id && <CheckCircle size={16} className="ml-auto text-green-600 shrink-0" />}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        {method !== "card" && method !== "admin" && method !== "tresor-pay" ? (
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">
              Numéro {method === "orange-money" ? "Orange" : method === "mtn-money" ? "MTN" : "Wave"}
            </label>
            <div className="flex items-center gap-3 bg-input-background border border-border rounded-xl px-3 py-3">
              <span className="text-muted-foreground text-sm font-medium">+225</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07 XX XX XX XX"
                className="flex-1 bg-transparent text-sm outline-none" />
            </div>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
              <strong>Instruction :</strong> Vous recevrez une demande de confirmation sur votre téléphone. Approuvez le paiement de {fmt(bookingData.grandTotal || 0)}.
            </div>
          </div>
        ) : method === "tresor-pay" ? (
          <div className="space-y-3">
            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 text-sm text-foreground">
              <strong>Trésor Pay :</strong> moyen de paiement institutionnel du Gouvernement. Utilisez cette option pour les paiements via le circuit du Trésor Public.
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Référence Trésor Pay</label>
              <input placeholder="TP-2026-XXXX" className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <p className="text-xs text-muted-foreground mt-1.5">Démo : une référence/notification de paiement pourra être demandée.</p>
            </div>
          </div>
        ) : method === "admin" ? (
          <div className="space-y-3">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-900">
              <strong>Paiement administratif :</strong> réservé aux administrations, entreprises et partenaires institutionnels. Un bon de commande ou ordre de mission sera demandé à l'arrivée.
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Référence administrative / bon de commande</label>
              <input placeholder="BC-2025-XXXX" className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Numéro de carte</label>
              <input value={cardNum} onChange={e => setCardNum(e.target.value)} placeholder="1234 5678 9012 3456"
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary font-mono tracking-widest" maxLength={19} />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Nom sur la carte</label>
              <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="KOUAMÉ ADJOBI"
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Expiration</label>
                <input value={cardExp} onChange={e => setCardExp(e.target.value)} placeholder="MM/AA"
                  className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary font-mono" maxLength={5} />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">CVV</label>
                <input value={cardCvv} onChange={e => setCardCvv(e.target.value)} placeholder="123" type="password"
                  className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary font-mono" maxLength={4} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted rounded-2xl p-4 flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground">Montant total</div>
        <div className="text-xl font-bold text-primary">{fmt(bookingData.grandTotal || 0)}</div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate("booking-summary")} className="flex-1 border border-border py-3 rounded-xl font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Retour
        </button>
        <button onClick={handlePay} disabled={loading}
          className="flex-1 bg-secondary text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
          {loading ? (
            <><RefreshCw size={16} className="animate-spin" /> Traitement...</>
          ) : (
            <><Shield size={16} /> Confirmer & Payer</>
          )}
        </button>
      </div>
      <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
        <Lock size={11} /> Paiement sécurisé SSL — Vos données sont protégées
      </p>
    </div>
  );
};

const BookingConfirmationPage = ({ navigate, bookingData, setReservations, user }: {
  navigate: (p: Page) => void;
  bookingData: any;
  setReservations?: (r: Reservation[] | ((prev: Reservation[]) => Reservation[])) => void;
  user?: any;
}) => {
  useEffect(() => {
    if (setReservations && bookingData.ref) {
      setReservations(prev => {
        if (prev.some(r => r.id === bookingData.ref)) return prev;
        return [{
          id: bookingData.ref,
          propertyId: bookingData.property?.id || "1",
          property: bookingData.property?.name || "—",
          city: bookingData.property?.city || "—",
          checkIn: bookingData.checkIn || "—",
          checkOut: bookingData.checkOut || "—",
          total: bookingData.grandTotal || 0,
          status: "confirmed",
          type: bookingData.property?.type || "—",
          guests: bookingData.guests || 1,
          client: user?.name || `${bookingData.firstName || ""} ${bookingData.lastName || ""}`.trim(),
        }, ...prev];
      });
    }
  }, [bookingData.ref]);
  const methodLabels: Record<string, string> = {
    "orange-money": "Orange Money",
    "mtn-money": "MTN Money",
    "wave": "Wave",
    "tresor-pay": "Trésor Pay",
    "card": "Carte bancaire",
    "admin": "Paiement administratif"
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 text-center">
      <BookingSteps current={5} />

      <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle size={40} className="text-white" />
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">Réservation confirmée !</h1>
      <p className="text-muted-foreground mb-8">Votre réservation a été enregistrée avec succès. Un email de confirmation a été envoyé à <strong>{bookingData.email}</strong></p>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 text-left">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Référence</div>
            <div className="font-bold text-xl text-primary font-mono">{bookingData.ref || "RES-2025-4891"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Statut</div>
            <Badge label="Confirmée" color="green" />
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Propriété</span>
            <span className="font-medium text-right">{bookingData.property?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Localisation</span>
            <span className="font-medium">{bookingData.property?.city}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Arrivée</span>
            <span className="font-medium">{bookingData.checkIn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Départ</span>
            <span className="font-medium">{bookingData.checkOut}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Voyageurs</span>
            <span className="font-medium">{bookingData.guests}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mode de paiement</span>
            <span className="font-medium">{methodLabels[bookingData.paymentMethod] || "—"}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-3 mt-2 font-bold text-foreground">
            <span>Total payé</span>
            <span className="text-primary">{fmt(bookingData.grandTotal || 0)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => downloadReceipt({ ref: bookingData.ref || "RES-2025-4891", property: bookingData.property?.name, total: bookingData.grandTotal, client: `${bookingData.firstName} ${bookingData.lastName}` })}
          className="flex-1 border border-secondary text-secondary py-3 rounded-xl font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
          <Download size={16} /> Télécharger le reçu
        </button>
        <button onClick={() => navigate("dashboard-reservations")} className="flex-1 border border-border py-3 rounded-xl font-medium hover:bg-muted transition-colors">
          Mes réservations
        </button>
        <button onClick={() => navigate("home")} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors">
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
};

// ── Auth Pages ─────────────────────────────────────────────────────────────────
const LoginPage = ({ navigate, setUser }: { navigate: (p: Page) => void; setUser: (u: any) => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    const isAdmin = email.includes("admin");
    setUser({ name: isAdmin ? "Admin SONAPIE" : "Kouamé Adjobi", email, isAdmin });
    navigate(isAdmin ? "admin" : "dashboard");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <AppLogo variant="auth" />
        <div className="text-center mb-8 mt-4">
          <p className="text-sm font-semibold text-primary mb-1">{APP_NAME}</p>
          <h1 className="text-2xl font-bold text-foreground">Connexion</h1>
          <p className="text-muted-foreground text-sm mt-1">Accédez à votre espace personnel</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="accent-primary" /> Se souvenir de moi
            </label>
            <button onClick={() => navigate("forgot-password")} className="text-sm text-primary hover:underline">Mot de passe oublié ?</button>
          </div>
          <button onClick={handleLogin} className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors">
            Se connecter
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <button onClick={() => navigate("register")} className="text-primary font-semibold hover:underline">S'inscrire</button>
          </p>
          <div className="border-t border-border pt-3 text-center">
            <p className="text-xs text-muted-foreground mb-2">Connexion rapide démo</p>
            <div className="flex gap-2">
              <button onClick={() => { setEmail("user@demo.ci"); setPassword("demo123"); }} className="flex-1 text-xs border border-border rounded-lg py-1.5 hover:bg-muted">
                👤 Utilisateur
              </button>
              <button onClick={() => { setEmail("admin@sonapie.ci"); setPassword("admin123"); }} className="flex-1 text-xs border border-border rounded-lg py-1.5 hover:bg-muted">
                🔐 Administrateur
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = ({ navigate, setUser }: { navigate: (p: Page) => void; setUser: (u: any) => void }) => {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "", accountType: "citizen" });

  const accountTypes = [
    { id: "citizen", label: "Citoyen", desc: "Particuliers et touristes" },
    { id: "enterprise", label: "Entreprise", desc: "Sociétés et organisations privées" },
    { id: "administration", label: "Administration", desc: "Services publics et ministères" },
    { id: "partner", label: "Partenaire", desc: "Institutions et partenaires SONAPIE" },
  ];

  const handleRegister = () => {
    setUser({ name: `${form.firstName} ${form.lastName}`, email: form.email, phone: form.phone, isAdmin: false, accountType: form.accountType });
    navigate("dashboard");
  };

  const valid = form.firstName && form.lastName && form.email && form.phone && form.password && form.password === form.confirm;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <AppLogo variant="auth" />
        <div className="text-center mb-8 mt-4">
          <p className="text-sm font-semibold text-primary mb-1">{APP_NAME}</p>
          <h1 className="text-2xl font-bold text-foreground">Créer un compte</h1>
          <p className="text-muted-foreground text-sm mt-1">{APP_TAGLINE}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">Type de compte *</label>
            <div className="grid grid-cols-2 gap-2">
              {accountTypes.map(t => (
                <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, accountType: t.id }))}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${form.accountType === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                  <div className="font-semibold text-sm text-foreground">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Prénom *</label>
              <input value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} placeholder="Kouamé"
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Nom *</label>
              <input value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} placeholder="Adjobi"
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="votre@email.com"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Téléphone *</label>
            <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+225 07 XX XX XX XX"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Mot de passe *</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="••••••••"
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Confirmer *</label>
            <input type="password" value={form.confirm} onChange={e => setForm(f => ({...f, confirm: e.target.value}))} placeholder="••••••••"
              className={`w-full bg-input-background border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary ${form.confirm && form.confirm !== form.password ? "border-red-400" : "border-border"}`} />
            {form.confirm && form.confirm !== form.password && <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>}
          </div>
          <div>
            <label className="flex items-start gap-2 cursor-pointer text-sm">
              <input type="checkbox" className="accent-primary mt-0.5" />
              <span className="text-muted-foreground">J'accepte les <button className="text-primary hover:underline">Conditions générales d'utilisation</button> de SONAPIE</span>
            </label>
          </div>
          <button onClick={handleRegister} disabled={!valid}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50">
            Créer mon compte
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <button onClick={() => navigate("login")} className="text-primary font-semibold hover:underline">Se connecter</button>
          </p>
        </div>
      </div>
    </div>
  );
};

const ForgotPasswordPage = ({ navigate }: { navigate: (p: Page) => void }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key size={28} className="text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="text-muted-foreground text-sm mt-1">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          {!sent ? (
            <>
              <div className="mb-4">
                <label className="text-sm font-semibold text-foreground block mb-1.5">Adresse email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com"
                  className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <button onClick={() => setSent(true)} disabled={!email}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50">
                Envoyer le lien
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-secondary mx-auto mb-3" />
              <h3 className="font-bold text-foreground mb-1">Email envoyé !</h3>
              <p className="text-sm text-muted-foreground">Vérifiez votre boîte mail <strong>{email}</strong> pour réinitialiser votre mot de passe.</p>
            </div>
          )}
          <div className="mt-4 text-center">
            <button onClick={() => navigate("login")} className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
              <ArrowLeft size={14} /> Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── User Dashboard ─────────────────────────────────────────────────────────────
const DashboardPage = ({ navigate, user, setUser, activeSub, favorites, toggleFavorite, reservations, setReservations, complaints, setComplaints, properties, notify }: {
  navigate: (p: Page, d?: any) => void;
  user: any;
  setUser: (u: any) => void;
  activeSub: string;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  reservations: Reservation[];
  setReservations: (r: Reservation[] | ((prev: Reservation[]) => Reservation[])) => void;
  complaints: Complaint[];
  setComplaints: (c: Complaint[] | ((prev: Complaint[]) => Complaint[])) => void;
  properties: Property[];
  notify: NotifyFn;
}) => {
  const sidebarLinks = [
    { id: "dashboard", label: "Tableau de bord", icon: Home },
    { id: "dashboard-reservations", label: "Réservations", icon: Calendar },
    { id: "dashboard-favorites", label: "Favoris", icon: Heart },
    { id: "dashboard-payments", label: "Paiements", icon: CreditCard },
    { id: "dashboard-documents", label: "Mes documents", icon: FileText },
    { id: "dashboard-complaints", label: "Mes réclamations", icon: AlertCircle },
    { id: "dashboard-profile", label: "Mon profil", icon: Settings },
  ];

  const favoriteProperties = properties.filter(p => favorites.includes(p.id));
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "+225 07 12 34 56 78" });
  const [complaintForm, setComplaintForm] = useState({ subject: "", message: "" });
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  const totalSpend = reservations.filter(r => r.status !== "cancelled").reduce((s, r) => s + r.total, 0);
  const spendDisplay = totalSpend >= 1_000_000
    ? `${(totalSpend / 1_000_000).toFixed(1).replace(".", ",")}M FCFA`
    : fmt(totalSpend);

  const saveProfile = () => {
    setUser({ ...user, name: profileForm.name, email: profileForm.email, phone: profileForm.phone });
    setEditProfile(false);
    notify("Profil mis à jour avec succès");
  };

  const submitComplaint = () => {
    if (!complaintForm.subject.trim() || !complaintForm.message.trim()) return;
    const id = `REC-${1000 + complaints.length + 1}`;
    setComplaints(prev => [{ id, subject: complaintForm.subject, message: complaintForm.message, status: "pending", date: new Date().toLocaleDateString("fr-CI", { day: "numeric", month: "short", year: "numeric" }) }, ...prev]);
    setComplaintForm({ subject: "", message: "" });
    setShowComplaintForm(false);
    notify(`Réclamation ${id} enregistrée`);
  };

  const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    dashboard: { title: `Bonjour, ${user?.name?.split(" ")[0]}`, subtitle: `Bienvenue sur ${APP_NAME}` },
    "dashboard-reservations": { title: "Mes réservations", subtitle: "Suivez et gérez vos séjours patrimoniaux" },
    "dashboard-favorites": { title: "Mes favoris", subtitle: "Biens enregistrés pour plus tard" },
    "dashboard-payments": { title: "Historique des paiements", subtitle: "Transactions et reçus" },
    "dashboard-documents": { title: "Mes documents", subtitle: "Contrats, attestations et reçus" },
    "dashboard-complaints": { title: "Mes réclamations", subtitle: "Suivi de vos demandes" },
    "dashboard-profile": { title: "Mon profil", subtitle: "Informations personnelles et préférences" },
  };

  const renderContent = () => {
    switch(activeSub) {
      case "dashboard-reservations":
        return (
          <div>
            <DashboardPageHeader title={pageTitles["dashboard-reservations"].title} subtitle={pageTitles["dashboard-reservations"].subtitle} />
            <div className="space-y-4">
              {reservations.map(r => {
                const prop = properties.find(p => p.id === r.propertyId);
                return (
                <div key={r.id} className="bg-muted/30 border border-border rounded-2xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {prop && (
                      <img src={prop.image} alt={r.property} className="w-full sm:w-28 h-24 sm:h-20 rounded-xl object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-foreground">{r.property}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5"><MapPin size={12}/>{r.city}</div>
                          <div className="text-sm text-muted-foreground mt-1">{r.checkIn} → {r.checkOut} · {r.guests} pers.</div>
                        </div>
                        <div className="sm:text-right">
                          <StatusBadge status={r.status} />
                          <div className="font-bold text-primary mt-1">{fmt(r.total)}</div>
                          <div className="text-xs text-muted-foreground font-mono">{r.id}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <button onClick={() => prop && navigate("property", { property: prop })} className="text-xs font-medium border border-border rounded-lg px-3 py-2 hover:bg-card transition-colors flex items-center gap-1"><Eye size={12}/>Voir le bien</button>
                        {r.status === "confirmed" && (
                          <button onClick={() => { setReservations(prev => prev.map(x => x.id === r.id ? { ...x, status: "cancelled" } : x)); notify("Réservation annulée"); }}
                            className="text-xs font-medium border border-red-200 text-red-600 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors">Annuler</button>
                        )}
                        <button onClick={() => downloadReceipt({ ref: r.id, property: r.property, total: r.total, client: user?.name })}
                          className="text-xs font-medium border border-green-200 text-green-700 rounded-lg px-3 py-2 hover:bg-green-50 transition-colors flex items-center gap-1"><Download size={12}/>Reçu</button>
                      </div>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </div>
        );

      case "dashboard-favorites":
        return (
          <div>
            <DashboardPageHeader title={pageTitles["dashboard-favorites"].title} subtitle={pageTitles["dashboard-favorites"].subtitle} />
            {favoriteProperties.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border">
                <Heart size={40} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium text-foreground">Aucun favori pour le moment</p>
                <p className="text-sm text-muted-foreground mt-1">Explorez le catalogue et enregistrez vos biens préférés</p>
                <button onClick={() => navigate("catalogue")} className="mt-5 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-700 transition-colors text-sm">Parcourir le catalogue</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {favoriteProperties.map(p => (
                  <PropertyCard key={p.id} property={p} navigate={navigate} isFav={true} onFavorite={() => toggleFavorite(p.id)} />
                ))}
              </div>
            )}
          </div>
        );

      case "dashboard-documents":
        return (
          <div>
            <DashboardPageHeader title={pageTitles["dashboard-documents"].title} subtitle={pageTitles["dashboard-documents"].subtitle} />
            <div className="space-y-3">
              {[
                { name: "Contrat de location — Sofitel Hôtel Ivoire", type: "PDF", date: "15 Jan 2025", ref: "DOC-2025-001" },
                { name: "Attestation de réservation", type: "PDF", date: "15 Jan 2025", ref: "DOC-2025-002" },
                { name: "Reçu de paiement Orange Money", type: "PDF", date: "15 Jan 2025", ref: "DOC-2025-003" },
              ].map(d => (
                <div key={d.ref} className="bg-muted/30 border border-border rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0"><FileText size={20} className="text-secondary" /></div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.type} · {d.date} · {d.ref}</div>
                    </div>
                  </div>
                  <button onClick={() => { downloadReceipt({ ref: d.ref, property: d.name, client: user?.name }); notify("Document téléchargé"); }}
                    className="text-xs font-medium border border-green-200 text-green-700 rounded-lg px-3 py-2 hover:bg-green-50 flex items-center gap-1 shrink-0"><Download size={12}/>Télécharger</button>
                </div>
              ))}
            </div>
          </div>
        );

      case "dashboard-complaints":
        return (
          <div>
            <DashboardPageHeader title={pageTitles["dashboard-complaints"].title} subtitle={pageTitles["dashboard-complaints"].subtitle} />
            <div className="space-y-3 mb-6">
              {complaints.length === 0 && !showComplaintForm ? (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <MessageCircle size={36} className="mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">Aucune réclamation enregistrée.</p>
                </div>
              ) : complaints.map(c => (
                <div key={c.id} className="bg-muted/30 border border-border rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-foreground">{c.subject}</div>
                      <div className="text-xs text-muted-foreground mt-1">{c.date} · <span className="font-mono">{c.id}</span></div>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.message}</p>
                    </div>
                    <Badge label={c.status === "resolved" ? "Résolue" : c.status === "in-progress" ? "En cours" : "En attente"}
                      color={c.status === "resolved" ? "green" : c.status === "in-progress" ? "yellow" : "orange"} />
                  </div>
                </div>
              ))}
            </div>
            {showComplaintForm ? (
              <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-4 mb-4">
                <input value={complaintForm.subject} onChange={e => setComplaintForm(f => ({ ...f, subject: e.target.value }))} placeholder="Objet de la réclamation *"
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" />
                <textarea value={complaintForm.message} onChange={e => setComplaintForm(f => ({ ...f, message: e.target.value }))} placeholder="Décrivez votre demande *" rows={4}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none resize-none focus:border-primary" />
                <div className="flex gap-2">
                  <button onClick={() => setShowComplaintForm(false)} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-card transition-colors">Annuler</button>
                  <button onClick={submitComplaint} disabled={!complaintForm.subject.trim() || !complaintForm.message.trim()}
                    className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors disabled:opacity-50">Envoyer</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setShowComplaintForm(true)} className="bg-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-700 transition-colors text-sm flex items-center gap-2">
                  <Plus size={15} /> Nouvelle réclamation
                </button>
                <button onClick={() => navigate("contact")} className="border border-border font-medium px-5 py-2.5 rounded-xl hover:bg-muted transition-colors text-sm">
                  Contacter le support
                </button>
              </div>
            )}
          </div>
        );

      case "dashboard-payments":
        return (
          <div>
            <DashboardPageHeader title={pageTitles["dashboard-payments"].title} subtitle={pageTitles["dashboard-payments"].subtitle} />
            <div className="space-y-3">
              {[
                { ref: "PAY-2025-001", method: "Orange Money", amount: 525000, date: "15 Jan 2025", status: "completed", for: "Sofitel Hôtel Ivoire" },
                { ref: "PAY-2025-002", method: "Wave", amount: 144000, date: "2 Fév 2025", status: "pending", for: "Hôtel Président" },
                { ref: "PAY-2024-087", method: "Carte bancaire", amount: 475000, date: "18 Mar 2024", status: "completed", for: "Résidence Yamoussoukro" },
              ].map(p => (
                <div key={p.ref} className="bg-muted/30 border border-border rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <CreditCard size={20} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground">{p.for}</div>
                      <div className="text-xs text-muted-foreground">{p.method} · {p.date}</div>
                      <div className="text-xs font-mono text-muted-foreground">{p.ref}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-foreground">{fmt(p.amount)}</div>
                    <StatusBadge status={p.status} />
                    <button onClick={() => { downloadReceipt({ ref: p.ref, property: p.for, total: p.amount, client: user?.name }); notify("Reçu téléchargé"); }}
                      className="mt-2 text-xs text-green-700 hover:underline flex items-center gap-1 justify-end"><Download size={11}/>Reçu</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "dashboard-profile":
        return (
          <div>
            <div className="flex items-center justify-between mb-6 pb-5 border-b border-border/80">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>Mon profil</h2>
                <p className="text-muted-foreground text-sm mt-1">Informations personnelles et préférences</p>
              </div>
              <button onClick={() => setEditProfile(!editProfile)} className="flex items-center gap-2 text-sm font-medium text-primary border border-primary/30 bg-primary/5 rounded-xl px-4 py-2 hover:bg-primary hover:text-white transition-colors">
                <Edit2 size={14} /> {editProfile ? "Annuler" : "Modifier"}
              </button>
            </div>
            <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
              {editProfile ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Nom complet</label>
                      <input value={profileForm.name} onChange={e => setProfileForm(f => ({...f, name: e.target.value}))}
                        className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Téléphone</label>
                      <input value={profileForm.phone} onChange={e => setProfileForm(f => ({...f, phone: e.target.value}))}
                        className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
                    <input value={profileForm.email} onChange={e => setProfileForm(f => ({...f, email: e.target.value}))}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
                  </div>
                  <button onClick={saveProfile} className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-orange-700 transition-colors">
                    Enregistrer les modifications
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  {[
                    { label: "Nom", value: profileForm.name },
                    { label: "Email", value: profileForm.email },
                    { label: "Téléphone", value: profileForm.phone },
                    { label: "Membre depuis", value: "Jan 2024" },
                    { label: "Réservations", value: String(reservations.length) },
                    { label: "Type de compte", value: user?.accountType || "citoyen" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-card rounded-xl p-4 border border-border/60">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
                      <div className="font-semibold text-foreground mt-1 capitalize">{value}</div>
                    </div>
                  ))}
                  <div className="bg-card rounded-xl p-4 border border-border/60">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Statut</div>
                    <div className="mt-1"><Badge label="Actif" color="green" /></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div>
            <DashboardPageHeader title={pageTitles.dashboard.title} subtitle={pageTitles.dashboard.subtitle} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <DashboardStatCard label="Réservations" value={reservations.length} icon={Calendar} accent="bg-primary/10 text-primary" onClick={() => navigate("dashboard-reservations")} />
              <DashboardStatCard label="En attente" value={reservations.filter(r => r.status === "pending").length} icon={Clock} accent="bg-yellow-100 text-yellow-700" onClick={() => navigate("dashboard-reservations")} />
              <DashboardStatCard label="Favoris" value={favoriteProperties.length} icon={Heart} accent="bg-red-100 text-red-600" onClick={() => navigate("dashboard-favorites")} />
              <DashboardStatCard label="Dépenses totales" value={spendDisplay} icon={CreditCard} accent="bg-green-100 text-green-700" onClick={() => navigate("dashboard-payments")} />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Réservations récentes</h3>
              <button onClick={() => navigate("dashboard-reservations")} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">Voir tout <ArrowRight size={14}/></button>
            </div>
            <div className="space-y-3 mb-6">
              {reservations.slice(0, 3).map(r => {
                const prop = properties.find(p => p.id === r.propertyId);
                return (
                <button key={r.id} type="button" onClick={() => prop && navigate("property", { property: prop })}
                  className="w-full bg-muted/30 border border-border rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-muted/50 hover:border-primary/20 transition-all text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    {prop && <img src={prop.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 hidden sm:block" />}
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{r.property}</div>
                      <div className="text-xs text-muted-foreground">{r.checkIn} — {r.city}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.status} />
                    <span className="font-bold text-sm text-primary hidden sm:block">{fmt(r.total)}</span>
                  </div>
                </button>
              );})}
            </div>
            <button onClick={() => navigate("catalogue")} className="w-full bg-gradient-to-r from-primary to-orange-600 text-white font-bold py-3.5 rounded-2xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
              <Search size={18} /> Découvrir de nouveaux biens
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-muted/50 via-background to-muted/30">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="w-64 shrink-0 hidden md:block">
            <div className="bg-card border border-border rounded-2xl overflow-hidden sticky top-24 shadow-sm">
              <div className="p-5 bg-gradient-to-br from-[#14261A] to-[#0A2918] text-white">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg mb-3 ring-2 ring-white/20">
                  {user?.name?.charAt(0)}
                </div>
                <div className="font-semibold">{user?.name}</div>
                <div className="text-xs text-white/60 mt-0.5 truncate">{user?.email}</div>
              </div>
              <nav className="p-2">
                {sidebarLinks.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => navigate(id as Page)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left mb-0.5
                      ${activeSub === id ? "bg-primary text-white shadow-md shadow-primary/25" : "text-foreground hover:bg-muted"}`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="p-2 border-t border-border">
                <button onClick={() => { setUser(null); navigate("home"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut size={16} /> Déconnexion
                </button>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
              {sidebarLinks.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => navigate(id as Page)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors
                    ${activeSub === id ? "bg-primary text-white" : "bg-card border border-border text-foreground"}`}
                >
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:p-8">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Admin Layout & Pages ───────────────────────────────────────────────────────
const AdminTopBar = ({ user, activePage, setUser, navigate }: { user: any; activePage: Page; setUser: (u: any) => void; navigate: (p: Page) => void }) => {
  const pageLabels: Record<string, string> = {
    admin: "Tableau de bord", "admin-properties": "Biens", "admin-reservations": "Réservations",
    "admin-users": "Utilisateurs", "admin-payments": "Paiements", "admin-maintenance": "Maintenance",
    "admin-claims": "Réclamations", "admin-stats": "Statistiques", "admin-settings": "Paramètres",
  };
  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Administration</p>
        <h2 className="text-lg font-bold text-foreground">{pageLabels[activePage] || APP_NAME_SHORT}</h2>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors relative">
          <Bell size={16} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">{user?.name?.charAt(0)}</div>
          <div className="text-sm">
            <div className="font-medium text-foreground leading-tight">{user?.name}</div>
            <div className="text-xs text-muted-foreground">Administrateur</div>
          </div>
        </div>
        <button onClick={() => { setUser(null); navigate("home"); }} className="text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5">
          <LogOut size={14} /> <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
};

const AdminSidebar = ({ navigate, activePage }: { navigate: (p: Page) => void; activePage: Page }) => {
  const links = [
    { id: "admin", label: "Dashboard", icon: BarChart2 },
    { id: "admin-properties", label: "Biens", icon: Building2 },
    { id: "admin-reservations", label: "Réservations", icon: Calendar },
    { id: "admin-users", label: "Utilisateurs", icon: User },
    { id: "admin-payments", label: "Paiements", icon: CreditCard },
    { id: "admin-maintenance", label: "Maintenance", icon: Wrench },
    { id: "admin-claims", label: "Réclamations", icon: AlertCircle },
    { id: "admin-stats", label: "Statistiques", icon: TrendingUp },
    { id: "admin-settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <div className="w-64 bg-[#14261A] min-h-screen flex flex-col shrink-0 border-r border-white/5">
      <div className="p-5 border-b border-white/10">
        <AppLogo variant="admin" />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id as Page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
              ${activePage === id
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-white/70 hover:bg-white/10 hover:text-white"}`}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button onClick={() => navigate("home")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors">
          <Globe size={16} /> Retour au site public
        </button>
      </div>
    </div>
  );
};

const AdminDashboard = ({ navigate, reservations, properties }: { navigate: (p: Page) => void; reservations: Reservation[]; properties: Property[] }) => {
  const stats = [
    { label: "Revenus totaux", value: "48,7M FCFA", change: "+18.4%", icon: TrendingUp, color: "text-secondary bg-green-100" },
    { label: "Réservations du mois", value: "342", change: "+12.1%", icon: Calendar, color: "text-primary bg-orange-100" },
    { label: "Biens disponibles", value: `${properties.filter(p => p.available).length}`, change: "+3.2%", icon: Building2, color: "text-secondary bg-green-100" },
    { label: "Taux d'occupation", value: "74%", change: "+5.1%", icon: BarChart2, color: "text-primary bg-orange-100" },
    { label: "Réclamations en attente", value: "3", change: "-2", icon: AlertCircle, color: "text-yellow-600 bg-yellow-100" },
    { label: "Utilisateurs", value: "1 842", change: "+24.8%", icon: User, color: "text-purple-600 bg-purple-100" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <AdminPageHeader title="Tableau de bord" subtitle="Vue d'ensemble — Juin 2025">
        <button onClick={() => downloadReceipt({ ref: "RAPPORT-2025-06", property: "Rapport mensuel SONAPIE", client: "Administration" })}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-700 transition-colors shadow-md shadow-primary/20">
          <Download size={14} /> Rapport PDF
        </button>
      </AdminPageHeader>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${change.startsWith("-") ? "text-red-600 bg-red-50" : "text-secondary bg-green-50"}`}>{change}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Réservations récentes</h3>
          <div className="space-y-3">
            {reservations.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{r.property}</div>
                  <div className="text-xs text-muted-foreground">{r.id} · {r.checkIn}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-sm font-bold text-primary hidden sm:block">{fmt(r.total)}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("admin-reservations")} className="w-full mt-3 text-sm text-primary hover:underline flex items-center justify-center gap-1">
            Voir tout <ArrowRight size={13} />
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Revenus par destination</h3>
          <div className="space-y-3">
            {ADMIN_STATS.byCity.map(({ city, count, revenue }) => (
              <div key={city}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{city}</span>
                  <span className="text-muted-foreground">{count} rés. — {fmt(revenue)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.round(revenue / ADMIN_STATS.revenue * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPropertiesPage = ({ navigate, properties, setProperties, notify }: {
  navigate: (p: Page, d?: any) => void;
  properties: Property[];
  setProperties: (p: Property[] | ((prev: Property[]) => Property[])) => void;
  notify: NotifyFn;
}) => {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editProp, setEditProp] = useState<Property | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const emptyForm = { name: "", type: "Villa", city: "Abidjan", price: 100000, capacity: 10, area: 200, description: "" };
  const [form, setForm] = useState(emptyForm);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const uploadedObjectUrlsRef = useRef<string[]>([]);

  const cleanupObjectUrls = () => {
    uploadedObjectUrlsRef.current.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch { /* ignore */ }
    });
    uploadedObjectUrlsRef.current = [];
  };

  const applyUploads = (files: File[]) => {
    const images = files.filter(f => f.type.startsWith("image/"));
    if (!images.length) {
      notify("Veuillez sélectionner des images (PNG/JPG/WebP)");
      return;
    }
    cleanupObjectUrls();
    const urls = images.map(f => URL.createObjectURL(f));
    uploadedObjectUrlsRef.current = urls;
    setUploadedUrls(urls);
  };

  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (p: Property) => {
    setForm({ name: p.name, type: p.type, city: p.city, price: p.price, capacity: p.capacity, area: p.area, description: p.description });
    cleanupObjectUrls();
    setUploadedUrls(p.gallery?.length ? p.gallery : (p.images?.length ? p.images : [p.image].filter(Boolean)));
    setEditProp(p);
    setShowAdd(true);
  };

  useEffect(() => {
    if (!showAdd) {
      cleanupObjectUrls();
      setUploadedUrls([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdd]);

  const saveProperty = () => {
    if (!form.name.trim()) {
      notify("Veuillez renseigner le nom du bien");
      return;
    }
    if (form.price <= 0 || Number.isNaN(form.price)) {
      notify("Veuillez renseigner un prix valide");
      return;
    }
    if (editProp) {
      setProperties(prev => prev.map(p => {
        if (p.id !== editProp.id) return p;
        const imgs = uploadedUrls.length ? uploadedUrls : (p.gallery?.length ? p.gallery : p.images);
        const main = imgs?.[0] || p.mainImage || p.image;
        return {
          ...p,
          ...form,
          image: main,
          mainImage: main,
          images: imgs?.length ? imgs : p.images,
          gallery: imgs?.length ? imgs : p.gallery,
          location: `${form.city}, Côte d'Ivoire`,
          isSonapieManaged: true,
        };
      }));
      notify("Bien modifié avec succès");
    } else {
      const fallbackImage = properties[0]?.image || "";
      const imgs = uploadedUrls.length ? uploadedUrls : [fallbackImage].filter(Boolean);
      const main = imgs[0] || fallbackImage;
      const newProp: Property = {
        id: String(Date.now()),
        ...form,
        lat: 5.3,
        lng: -4.0,
        rating: 4.5,
        reviews: 0,
        image: main,
        mainImage: main,
        images: imgs,
        gallery: imgs,
        location: `${form.city}, Côte d'Ivoire`,
        isSonapieManaged: true,
        amenities: ["Wi-Fi", "Climatisation"],
        services: ["Réception 24h/24"],
        bedrooms: 2,
        bathrooms: 1,
        available: true, featured: false,
      };
      setProperties(prev => [...prev, newProp]);
      notify("Nouveau bien créé");
    }
    setShowAdd(false);
    setEditProp(null);
    setForm(emptyForm);
    setUploadedUrls([]);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setProperties(prev => prev.filter(p => p.id !== deleteId));
    notify("Bien supprimé");
    setDeleteId(null);
  };

  const toggleAvailability = (id: string) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, available: !p.available } : p));
    notify("Disponibilité mise à jour");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <AdminPageHeader title="Gestion des biens" subtitle={`${properties.length} biens patrimoniaux`}>
        <button onClick={() => { setEditProp(null); setForm(emptyForm); setShowAdd(true); }}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-700 transition-colors shadow-md shadow-primary/20">
          <Plus size={15} /> Ajouter un bien
        </button>
      </AdminPageHeader>

      <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 max-w-md">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un bien..."
          className="flex-1 bg-transparent text-sm outline-none" />
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAdd(false); setEditProp(null); }}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-foreground">{editProp ? "Modifier le bien" : "Nouveau bien"}</h3>
              <button onClick={() => { setShowAdd(false); setEditProp(null); }} className="w-9 h-9 bg-muted rounded-full flex items-center justify-center hover:bg-border">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom du bien *"
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none">
                  {TYPES.slice(1).map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  className="bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} placeholder="Prix / nuit" type="number"
                  className="bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none" />
                <input value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} placeholder="Capacité" type="number"
                  className="bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none" />
                <input value={form.area} onChange={e => setForm(f => ({ ...f, area: +e.target.value }))} placeholder="Surface m²" type="number"
                  className="bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..." rows={3}
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => applyUploads(Array.from(e.target.files || []))}
              />
              <div
                className="border-2 border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
                onClick={() => uploadInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") uploadInputRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  applyUploads(Array.from(e.dataTransfer.files || []));
                }}
              >
                <Upload size={22} className="mx-auto mb-2 opacity-50" />
                Glissez vos photos ici ou cliquez pour uploader
                <div className="text-xs text-muted-foreground mt-1.5">Formats: PNG/JPG/WebP — max conseillé: 6 images</div>
              </div>
              {uploadedUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {uploadedUrls.slice(0, 8).map((u, idx) => (
                    <div key={`${u}-${idx}`} className="relative">
                      <img src={u} alt={`upload-${idx}`} className="w-full h-16 object-cover rounded-lg border border-border bg-muted" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">Cover</span>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => { cleanupObjectUrls(); setUploadedUrls([]); if (uploadInputRef.current) uploadInputRef.current.value = ""; }}
                    className="col-span-4 text-xs text-red-600 hover:underline text-left"
                  >
                    Retirer les photos
                  </button>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowAdd(false); setEditProp(null); }} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">Annuler</button>
                <button onClick={saveProperty} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors">{editProp ? "Enregistrer" : "Créer le bien"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-2">Supprimer ce bien ?</h3>
            <p className="text-sm text-muted-foreground mb-5">Cette action est irréversible dans ce prototype.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium">Annuler</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bien</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Ville</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Prix</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-muted" />
                    <div>
                      <div className="font-medium text-foreground line-clamp-1">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.capacity} pers. · {p.area}m²</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.city}</td>
                <td className="px-4 py-3 hidden lg:table-cell"><Badge label={p.type} color="orange" /></td>
                <td className="px-4 py-3 font-semibold text-primary">{fmt(p.price)}<span className="text-xs text-muted-foreground font-normal">/n</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleAvailability(p.id)} className="hover:opacity-80 transition-opacity">
                    <StatusBadge status={p.available ? "available" : "unavailable"} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => navigate("property", { property: p })} className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors" title="Voir">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => openEdit(p)} className="w-8 h-8 bg-orange-50 text-primary rounded-lg flex items-center justify-center hover:bg-orange-100 transition-colors" title="Modifier">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteId(p.id)} className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors" title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminReservationsPage = ({ reservations, setReservations, notify }: {
  reservations: Reservation[];
  setReservations: (r: Reservation[] | ((prev: Reservation[]) => Reservation[])) => void;
  notify: NotifyFn;
}) => {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Reservation | null>(null);
  const all = reservations;
  const filtered = filter === "all" ? all : all.filter(r => r.status === filter);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <AdminPageHeader title="Gestion des réservations" subtitle={`${filtered.length} réservation(s)`} />

      <div className="flex gap-2 flex-wrap">
        {[
          { id: "all", label: "Toutes" },
          { id: "confirmed", label: "Confirmées" },
          { id: "pending", label: "En attente" },
          { id: "completed", label: "Terminées" },
          { id: "cancelled", label: "Annulées" },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === id ? "bg-primary text-white" : "bg-card border border-border hover:bg-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Référence</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Propriété</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Dates</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Montant</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} onClick={() => setSelected(r)} className={`border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground line-clamp-1">{r.property}</div>
                  <div className="text-xs text-muted-foreground">{r.city} · {r.guests} pers.</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{r.checkIn} → {r.checkOut}</td>
                <td className="px-4 py-3 font-bold text-primary">{fmt(r.total)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {r.status === "pending" && (
                      <>
                        <button onClick={e => { e.stopPropagation(); setReservations(prev => prev.map(x => x.id === r.id ? { ...x, status: "confirmed" } : x)); notify("Réservation confirmée"); }}
                          className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors flex items-center gap-1">
                          <Check size={11} /> Confirmer
                        </button>
                        <button onClick={e => { e.stopPropagation(); setReservations(prev => prev.map(x => x.id === r.id ? { ...x, status: "cancelled" } : x)); notify("Réservation annulée"); }}
                          className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                          Annuler
                        </button>
                      </>
                    )}
                    {r.status === "confirmed" && (
                      <button onClick={e => { e.stopPropagation(); downloadReceipt({ ref: r.id, property: r.property, total: r.total, client: r.client }); }}
                        className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors flex items-center gap-1">
                        <Download size={11} /> Reçu
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Détail réservation</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Référence</span><span className="font-mono font-medium">{selected.id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-medium">{selected.client || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Bien</span><span className="font-medium text-right">{selected.property}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span>{selected.checkIn} → {selected.checkOut}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-bold text-primary">{fmt(selected.total)}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Statut</span><StatusBadge status={selected.status} /></div>
            </div>
            <div className="flex gap-2 mt-5">
              {selected.status === "pending" && (
                <button onClick={() => { setReservations(prev => prev.map(x => x.id === selected.id ? { ...x, status: "confirmed" } : x)); setSelected({ ...selected, status: "confirmed" }); }}
                  className="flex-1 bg-secondary text-white py-2 rounded-lg text-sm font-semibold">Confirmer</button>
              )}
              {selected.status !== "cancelled" && (
                <button onClick={() => { setReservations(prev => prev.map(x => x.id === selected.id ? { ...x, status: "cancelled" } : x)); setSelected({ ...selected, status: "cancelled" }); }}
                  className="flex-1 border border-red-200 text-red-600 py-2 rounded-lg text-sm font-semibold">Annuler</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminSettingsPage = ({ settings, setSettings, notify }: {
  settings: PlatformSettings;
  setSettings: (s: PlatformSettings | ((prev: PlatformSettings) => PlatformSettings)) => void;
  notify: NotifyFn;
}) => {
  const [draft, setDraft] = useState<PlatformSettings>(settings);
  useEffect(() => setDraft(settings), [settings]);

  const save = () => {
    setSettings({ ...draft, feePct: clampPct(draft.feePct) });
    notify("Paramètres enregistrés");
  };
  return (
  <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
    <AdminPageHeader title="Paramètres" subtitle="Configuration de la plateforme" />
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
      <div>
        <label className="text-sm font-semibold text-foreground block mb-1.5">Nom de la plateforme</label>
        <input value={draft.platformName} onChange={e => setDraft(s => ({ ...s, platformName: e.target.value }))}
          className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground block mb-1.5">Email de contact</label>
        <input value={draft.email} onChange={e => setDraft(s => ({ ...s, email: e.target.value }))}
          className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground block mb-1.5">Frais de service (%)</label>
        <input type="number" value={draft.feePct} onChange={e => setDraft(s => ({ ...s, feePct: clampPct(+e.target.value) }))}
          className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <p className="text-xs text-muted-foreground mt-1.5">Appliqué aux réservations (démo) — de 0 à 30%.</p>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={() => setDraft(settings)} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">Annuler</button>
        <button onClick={save} className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-orange-700 transition-colors text-sm shadow-md shadow-primary/20">
          Enregistrer
        </button>
      </div>
    </div>
  </div>
  );
};

const AdminUsersPage = ({ users, setUsers, notify }: {
  users: MockUser[];
  setUsers: (u: MockUser[] | ((prev: MockUser[]) => MockUser[])) => void;
  notify: NotifyFn;
}) => {
  const [selected, setSelected] = useState<MockUser | null>(null);

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u));
    notify("Statut utilisateur mis à jour");
  };

  return (
  <div className="p-6 lg:p-8 space-y-6">
    <AdminPageHeader title="Gestion des utilisateurs" subtitle={`${users.length} comptes enregistrés`} />
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted border-b border-border">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Utilisateur</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Contact</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rôle</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rés.</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={u.id} className={`border-b border-border last:border-0 hover:bg-muted/50 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">{u.name.charAt(0)}</div>
                  <div>
                    <div className="font-medium text-foreground">{u.name}</div>
                    <div className="text-xs text-muted-foreground">Depuis {u.since}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="text-xs text-muted-foreground">{u.email}</div>
                <div className="text-xs text-muted-foreground">{u.phone}</div>
              </td>
              <td className="px-4 py-3"><Badge label={u.role === "admin" ? "Admin" : "Client"} color={u.role === "admin" ? "orange" : "gray"} /></td>
              <td className="px-4 py-3 font-bold text-foreground">{u.reservations}</td>
              <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => setSelected(u)} className="w-8 h-8 bg-orange-50 text-primary rounded-lg flex items-center justify-center hover:bg-orange-100"><Eye size={13} /></button>
                  {u.status === "active" ?
                    <button onClick={() => toggleStatus(u.id)} className="w-8 h-8 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center hover:bg-yellow-100" title="Suspendre"><XCircle size={13} /></button> :
                    <button onClick={() => toggleStatus(u.id)} className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100" title="Réactiver"><CheckCircle size={13} /></button>
                  }
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {selected && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
        <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">Profil utilisateur</h3>
            <button onClick={() => setSelected(null)} className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"><X size={16} /></button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nom</span><span className="font-medium">{selected.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{selected.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{selected.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rôle</span><Badge label={selected.role === "admin" ? "Admin" : "Client"} color="orange" /></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Statut</span><StatusBadge status={selected.status} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Réservations</span><span className="font-bold">{selected.reservations}</span></div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

const AdminPaymentsPage = ({ notify }: { notify: NotifyFn }) => {
  const payments = [
    { ref: "PAY-2025-001", user: "Kouamé Adjobi", property: "Sofitel Hôtel Ivoire", method: "Orange Money", amount: 525000, date: "15 Jan 2025", status: "completed" },
    { ref: "PAY-2025-002", user: "Aminata Coulibaly", property: "Hôtel Président", method: "Wave", amount: 144000, date: "2 Fév 2025", status: "pending" },
    { ref: "PAY-2024-087", user: "Serge Bamba", property: "Résidence Yamoussoukro", method: "Carte bancaire", amount: 475000, date: "18 Mar 2024", status: "completed" },
    { ref: "PAY-2024-062", user: "Fatou Diallo", property: "Complexe San Pedro", method: "MTN Money", amount: 525000, date: "10 Déc 2024", status: "refunded" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <AdminPageHeader title="Gestion des paiements" subtitle="Suivi des transactions" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total encaissé", value: "48,7M FCFA", color: "text-secondary" },
          { label: "En attente", value: "3", color: "text-yellow-600" },
          { label: "Remboursements", value: "525k FCFA", color: "text-red-500" },
          { label: "Ce mois", value: "12,4M FCFA", color: "text-primary" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Référence</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Client</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Méthode</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Montant</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Statut</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p.ref} className={`border-b border-border last:border-0 hover:bg-muted/50 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.ref}<div className="text-xs text-foreground/70 mt-0.5">{p.date}</div></td>
                <td className="px-4 py-3 hidden lg:table-cell"><div className="font-medium text-foreground">{p.user}</div><div className="text-xs text-muted-foreground">{p.property}</div></td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.method}</td>
                <td className="px-4 py-3 font-bold text-primary">{fmt(p.amount)}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status === "refunded" ? "cancelled" : p.status} /></td>
                <td className="px-4 py-3"><button onClick={() => { downloadReceipt({ ref: p.ref, property: p.property, total: p.amount, client: p.user }); notify("Reçu téléchargé"); }}
                  className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100"><Download size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminMaintenancePage = ({ tickets, setTickets, notify }: {
  tickets: MaintenanceTicket[];
  setTickets: (t: MaintenanceTicket[] | ((prev: MaintenanceTicket[]) => MaintenanceTicket[])) => void;
  notify: NotifyFn;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ property: "", issue: "", priority: "medium" as MaintenanceTicket["priority"] });
  const priorityColors: Record<string, string> = { high: "red", medium: "yellow", low: "green" };
  const statusLabels: Record<string, string> = { pending: "En attente", "in-progress": "En cours", completed: "Terminé" };

  const addTicket = () => {
    if (!form.property.trim() || !form.issue.trim()) return;
    setTickets(prev => [{ id: `MAINT-${String(prev.length + 1).padStart(3, "0")}`, property: form.property, issue: form.issue, priority: form.priority, status: "pending", date: new Date().toLocaleDateString("fr-CI", { day: "numeric", month: "short", year: "numeric" }) }, ...prev]);
    setForm({ property: "", issue: "", priority: "medium" });
    setShowForm(false);
    notify("Ticket de maintenance créé");
  };

  const advanceStatus = (id: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = t.status === "pending" ? "in-progress" : t.status === "in-progress" ? "completed" : "completed";
      return { ...t, status: next };
    }));
    notify("Statut du ticket mis à jour");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <AdminPageHeader title="Maintenance" subtitle={`${tickets.filter(t => t.status !== "completed").length} tickets actifs`}>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-700 transition-colors shadow-md shadow-primary/20">
          <Plus size={14} /> Nouveau ticket
        </button>
      </AdminPageHeader>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <input value={form.property} onChange={e => setForm(f => ({ ...f, property: e.target.value }))} placeholder="Bien concerné *"
            className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none" />
          <textarea value={form.issue} onChange={e => setForm(f => ({ ...f, issue: e.target.value }))} placeholder="Description du problème *" rows={3}
            className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as MaintenanceTicket["priority"] }))}
            className="bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none">
            <option value="high">Urgent</option>
            <option value="medium">Moyen</option>
            <option value="low">Faible</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium">Annuler</button>
            <button onClick={addTicket} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-bold">Créer le ticket</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} className="bg-card border border-border rounded-2xl p-5 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${t.priority === "high" ? "bg-red-500" : t.priority === "medium" ? "bg-yellow-500" : "bg-green-500"}`} />
              <div>
                <div className="font-medium text-foreground">{t.issue}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.property} · {t.date}</div>
                <div className="text-xs font-mono text-muted-foreground">{t.id}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <Badge label={t.priority === "high" ? "Urgent" : t.priority === "medium" ? "Moyen" : "Faible"} color={priorityColors[t.priority]} />
              <Badge label={statusLabels[t.status]} color={t.status === "completed" ? "green" : t.status === "in-progress" ? "orange" : "yellow"} />
              {t.status !== "completed" && (
                <button onClick={() => advanceStatus(t.id)} className="text-xs font-medium border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
                  {t.status === "pending" ? "Démarrer" : "Terminer"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminClaimsPage = ({ claims, setClaims, notify }: {
  claims: AdminClaim[];
  setClaims: (c: AdminClaim[] | ((prev: AdminClaim[]) => AdminClaim[])) => void;
  notify: NotifyFn;
}) => {
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const resolveClaim = (id: string) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: "resolved" as const } : c));
    setReplyId(null);
    notify("Réclamation marquée comme résolue");
  };

  const startProgress = (id: string) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: "in-progress" as const } : c));
    notify("Réclamation prise en charge");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <AdminPageHeader title="Réclamations" subtitle={`${claims.filter(c => c.status !== "resolved").length} en cours de traitement`} />
      <div className="space-y-4">
        {claims.map(c => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <div className="font-semibold text-foreground">{c.subject}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.user} · {c.property} · {c.date}</div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                <Badge label={c.priority === "high" ? "Urgent" : c.priority === "medium" ? "Moyen" : "Faible"} color={c.priority === "high" ? "red" : c.priority === "medium" ? "yellow" : "green"} />
                <Badge label={c.status === "open" ? "Ouvert" : c.status === "in-progress" ? "En cours" : "Résolu"} color={c.status === "resolved" ? "green" : c.status === "in-progress" ? "orange" : "gray"} />
              </div>
            </div>
            {replyId === c.id && (
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Votre réponse au client..." rows={3}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm outline-none resize-none mb-3" />
            )}
            <div className="flex gap-2 flex-wrap">
              {c.status === "open" && (
                <button onClick={() => startProgress(c.id)} className="text-xs font-medium border border-primary/30 text-primary bg-primary/5 rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors">Prendre en charge</button>
              )}
              {c.status !== "resolved" && (
                <button onClick={() => setReplyId(replyId === c.id ? null : c.id)} className="text-xs font-medium border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors">Répondre</button>
              )}
              {c.status !== "resolved" && (
                <button onClick={() => resolveClaim(c.id)} className="text-xs font-medium border border-green-200 text-green-700 bg-green-50 rounded-lg px-3 py-2 hover:bg-green-100 transition-colors">Résoudre</button>
              )}
              {replyId === c.id && replyText.trim() && (
                <button onClick={() => { notify("Réponse envoyée au client"); setReplyId(null); setReplyText(""); startProgress(c.id); }}
                  className="text-xs font-medium bg-primary text-white rounded-lg px-3 py-2 hover:bg-orange-700 transition-colors">Envoyer</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminStatsPage = () => (
  <div className="p-6 lg:p-8 space-y-6">
    <AdminPageHeader title="Statistiques" subtitle="Analyses et indicateurs de performance" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Revenus mensuels (2025)</h3>
        <div className="space-y-3">
          {[
            { month: "Janvier", revenue: 8200000, pct: 68 },
            { month: "Février", revenue: 6500000, pct: 54 },
            { month: "Mars", revenue: 9800000, pct: 82 },
            { month: "Avril", revenue: 7300000, pct: 61 },
            { month: "Mai", revenue: 11400000, pct: 95 },
            { month: "Juin", revenue: 12000000, pct: 100 },
          ].map(({ month, revenue, pct }) => (
            <div key={month}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground font-medium">{month}</span>
                <span className="text-muted-foreground">{fmt(revenue)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Répartition par type de bien</h3>
        <div className="space-y-3">
          {[
            { type: "Villa", count: 28, pct: 82 },
            { type: "Hôtel", count: 35, pct: 100 },
            { type: "Résidence", count: 22, pct: 63 },
            { type: "Espace événementiel", count: 18, pct: 51 },
            { type: "Resort", count: 14, pct: 40 },
          ].map(({ type, count, pct }) => (
            <div key={type}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground font-medium">{type}</span>
                <span className="text-muted-foreground">{count} réservations</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Méthodes de paiement</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { method: "Orange Money", pct: 42, emoji: "🟠" },
            { method: "MTN Money", pct: 28, emoji: "🟡" },
            { method: "Wave", pct: 18, emoji: "🔵" },
            { method: "Carte bancaire", pct: 12, emoji: "💳" },
          ].map(({ method, pct, emoji }) => (
            <div key={method} className="bg-muted rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-xl font-bold text-foreground">{pct}%</div>
              <div className="text-xs text-muted-foreground">{method}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Indicateurs clés</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Taux d'occupation", value: "74%", trend: "↑" },
            { label: "Durée moy. séjour", value: "4.2 nuits", trend: "↑" },
            { label: "Note moyenne", value: "4.7/5", trend: "=" },
            { label: "Taux d'annulation", value: "8.3%", trend: "↓" },
          ].map(({ label, value, trend }) => (
            <div key={label} className="bg-muted rounded-xl p-4">
              <div className="text-xl font-bold text-foreground">{value} <span className="text-sm text-secondary">{trend}</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── About & Contact ────────────────────────────────────────────────────────────
const INSTITUTIONAL_PARTNERS = [
  { name: "Ministère du Tourisme", tag: "Institution publique", icon: Building2, theme: "orange" as const },
  { name: "Banque Mondiale", tag: "Finance internationale", icon: Globe, theme: "green" as const },
  { name: "Orange CI", tag: "Télécommunications", icon: Phone, theme: "orange" as const },
  { name: "MTN Côte d'Ivoire", tag: "Télécommunications", icon: Wifi, theme: "green" as const },
  { name: "UNESCO", tag: "Patrimoine mondial", icon: Award, theme: "orange" as const },
  { name: "ADCI", tag: "Investissement", icon: TrendingUp, theme: "green" as const },
];

const partnerTheme = {
  orange: {
    card: "hover:border-primary hover:shadow-[0_16px_48px_-12px_rgba(234,88,12,0.35)] group-hover:bg-gradient-to-br group-hover:from-orange-50 group-hover:to-white",
    icon: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:rotate-3",
    bar: "bg-primary scale-x-0 group-hover:scale-x-100",
    tag: "group-hover:text-primary",
  },
  green: {
    card: "hover:border-secondary hover:shadow-[0_16px_48px_-12px_rgba(22,163,74,0.35)] group-hover:bg-gradient-to-br group-hover:from-green-50 group-hover:to-white",
    icon: "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white group-hover:scale-110 group-hover:-rotate-3",
    bar: "bg-secondary scale-x-0 group-hover:scale-x-100",
    tag: "group-hover:text-secondary",
  },
};

const AboutPage = ({ navigate }: { navigate: (p: Page) => void }) => (
  <div>
    {/* Hero */}
    <div className="relative bg-[#14261A] py-20 overflow-hidden">
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1400&h=600&fit=crop&auto=format" alt="" className="w-full h-full object-cover opacity-20" />
      </div>
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">À propos</p>
        <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "Playfair Display, serif" }}>{APP_NAME}</h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">La Société Nationale de Gestion du Patrimoine Immobilier de l'État de Côte d'Ivoire — au service du patrimoine national.</p>
      </div>
    </div>

    <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
      {/* Mission */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Notre mission</p>
          <h2 className="text-3xl font-bold text-foreground mb-5">Valoriser l'héritage de la Côte d'Ivoire</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Créée par décret présidentiel, SONAPIE est l'opérateur officiel chargé de la gestion et de la mise en valeur du patrimoine immobilier appartenant à l'État de Côte d'Ivoire.</p>
            <p>Notre mission : rendre accessibles et rentables les propriétés nationales, en particulier les villas, résidences officielles, hôtels et espaces événementiels répartis sur l'ensemble du territoire.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[{ value: "127", label: "Biens gérés" }, { value: "25ans", label: "d'expérience" }, { value: "8", label: "Destinations phares" }].map(({ value, label }) => (
              <div key={label} className="text-center bg-muted rounded-xl p-4">
                <div className="text-2xl font-bold text-primary">{value}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop&auto=format" alt="SONAPIE" className="w-full rounded-2xl shadow-xl object-cover h-72" />
      </section>

      {/* Values */}
      <section>
        <div className="text-center mb-10">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Nos valeurs</p>
          <h2 className="text-3xl font-bold text-foreground">Ce qui nous guide</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Shield, label: "Intégrité", desc: "Transparence dans la gestion du patrimoine public" },
            { icon: Award, label: "Excellence", desc: "Service de qualité à la hauteur des biens nationaux" },
            { icon: Globe, label: "Accessibilité", desc: "Ouvrir le patrimoine à tous les Ivoiriens" },
            { icon: TrendingUp, label: "Innovation", desc: "Moderniser la gestion immobilière d'État" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon size={22} className="text-primary" />
              </div>
              <h4 className="font-bold text-foreground mb-2">{label}</h4>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* News */}
      <section>
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Actualités</p>
            <h2 className="text-3xl font-bold text-foreground">Nos dernières nouvelles</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { date: "Janvier 2025", title: "SONAPIE lance sa plateforme numérique de réservation", excerpt: "La plateforme en ligne permet désormais de réserver directement les biens patrimoniaux 24h/24.", img: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&h=400&fit=crop&auto=format" },
            { date: "Décembre 2024", title: "Partenariat avec le Ministère du Tourisme", excerpt: "Un accord cadre pour promouvoir le tourisme patrimonial en Côte d'Ivoire.", img: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=400&fit=crop&auto=format" },
            { date: "Novembre 2024", title: "Rénovation de l'Hôtel de Grand-Bassam", excerpt: "Réhabilitation complète de l'hôtel colonial classé UNESCO, livraison prévue en mars 2025.", img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop&auto=format" },
          ].map(({ date, title, excerpt, img }) => (
            <div key={title} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all group">
              <div className="h-40 bg-muted overflow-hidden">
                <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-2">{date}</div>
                <h4 className="font-bold text-sm text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Partners */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#14261A] via-[#1a3324] to-[#0A2918]" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #EA580C 0%, transparent 50%), radial-gradient(circle at 80% 50%, #16A34A 0%, transparent 50%)" }} />
        <div className="relative px-6 sm:px-10 py-14 text-center">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Partenariats</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3" style={{ fontFamily: "Playfair Display, serif" }}>
            Nos partenaires institutionnels
          </h2>
          <p className="text-gray-300 text-sm max-w-xl mx-auto mb-10">
            Des alliances stratégiques au service du patrimoine immobilier ivoirien
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {INSTITUTIONAL_PARTNERS.map(({ name, tag, icon: Icon, theme }) => {
              const t = partnerTheme[theme];
              return (
                <div
                  key={name}
                  className={`group relative bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-white/20 p-6 text-left cursor-default
                    transition-all duration-300 ease-out hover:-translate-y-2 ${t.card}`}
                >
                  <div className={`absolute top-0 left-4 right-4 h-1 rounded-full origin-left transition-transform duration-500 ${t.bar}`} />
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${t.icon}`}>
                    <Icon size={26} />
                  </div>
                  <h4 className="font-bold text-foreground text-base mb-1 transition-colors duration-300 group-hover:text-foreground">
                    {name}
                  </h4>
                  <p className={`text-xs text-muted-foreground font-medium transition-colors duration-300 ${t.tag}`}>
                    {tag}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 text-muted-foreground group-hover:text-foreground">
                    <Shield size={12} className={theme === "orange" ? "text-primary" : "text-secondary"} />
                    Partenaire certifié SONAPIE
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => navigate("contact")}
            className="mt-10 inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl
              hover:bg-orange-600 hover:scale-105 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
          >
            Devenir partenaire <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  </div>
);

const ContactPage = ({ navigate, complaints, setComplaints }: {
  navigate: (p: Page) => void;
  complaints: Complaint[];
  setComplaints: (c: Complaint[] | ((prev: Complaint[]) => Complaint[])) => void;
}) => {
  const [formSent, setFormSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [trackId, setTrackId] = useState("");
  const [trackResult, setTrackResult] = useState<Complaint | null>(null);
  const [subject, setSubject] = useState("Demande de réservation");
  const [message, setMessage] = useState("");

  const faqs = [
    { q: "Comment réserver un bien SONAPIE ?", a: "Parcourez notre catalogue, sélectionnez le bien souhaité, choisissez vos dates et validez votre réservation en ligne. Le paiement peut se faire via Orange Money, MTN Money, Wave, Trésor Pay ou carte bancaire." },
    { q: "Quels moyens de paiement sont acceptés ?", a: "Nous acceptons Orange Money, MTN Money, Wave, Trésor Pay, ainsi que les cartes bancaires Visa et Mastercard. Tous les paiements sont sécurisés via protocole SSL." },
    { q: "Puis-je annuler ma réservation ?", a: "Oui. Les annulations effectuées plus de 72h avant l'arrivée donnent droit à un remboursement intégral. Les annulations tardives sont soumises à des pénalités selon nos CGU." },
    { q: "Comment contacter le service client ?", a: "Par téléphone au +225 27 20 25 00 00 (lun-ven 8h-18h), par email à contact@sonapie.ci, ou via le formulaire de contact ci-dessous. Temps de réponse moyen : 2h." },
    { q: "Les biens sont-ils adaptés aux personnes à mobilité réduite ?", a: "Certains de nos biens disposent d'aménagements PMR. Utilisez le filtre 'Accessibilité PMR' dans le catalogue ou contactez-nous pour connaître les options disponibles." },
    { q: "Puis-je organiser un événement privé ?", a: "Absolument ! Plusieurs de nos espaces sont spécialement équipés pour des événements professionnels et privés : conférences, mariages, réceptions officielles. Contactez notre équipe événementiel." },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Contact & FAQ</p>
        <h1 className="text-3xl font-bold text-foreground mb-3">Comment pouvons-nous vous aider ?</h1>
        <p className="text-muted-foreground">Notre équipe est disponible du lundi au vendredi, 8h-18h</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Contact form */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-5">Envoyer un message</h2>
          {formSent ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <CheckCircle size={40} className="text-secondary mx-auto mb-3" />
              <h3 className="font-bold text-foreground mb-1">Message envoyé !</h3>
              <p className="text-sm text-muted-foreground">Notre équipe vous répondra dans les 2 heures ouvrées.</p>
              <button onClick={() => setFormSent(false)} className="mt-4 text-sm text-primary hover:underline">Envoyer un autre message</button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">Prénom</label>
                  <input placeholder="Kouamé" className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-1.5">Nom</label>
                  <input placeholder="Adjobi" className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Email</label>
                <input type="email" placeholder="votre@email.com" className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Sujet</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option>Demande de réservation</option>
                  <option>Renseignement sur un bien</option>
                  <option>Réclamation</option>
                  <option>Partenariat</option>
                  <option>Autre</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Décrivez votre demande..." className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary resize-none" />
              </div>
              <button onClick={() => {
                if (subject === "Réclamation") {
                  const id = "REC-" + Math.floor(Math.random() * 9000 + 1000);
                  setComplaints(prev => [...prev, { id, subject, message: message || "Réclamation soumise via formulaire", status: "pending", date: new Date().toLocaleDateString("fr-CI") }]);
                }
                setFormSent(true);
              }} className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors">
                Envoyer le message
              </button>
            </div>
          )}
        </div>

        {/* Contact info */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-5">Nos coordonnées</h2>
          <div className="space-y-4 mb-8">
            {[
              { icon: MapPin, label: "Adresse", value: "Avenue Jean-Paul II, Plateau, Abidjan, Côte d'Ivoire" },
              { icon: Phone, label: "Téléphone", value: "+225 27 20 25 00 00" },
              { icon: Mail, label: "Email", value: "contact@sonapie.ci" },
              { icon: Clock, label: "Horaires", value: "Lundi - Vendredi, 8h00 - 18h00" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-4 bg-card border border-border rounded-xl p-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</div>
                  <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-start gap-3">
            <MessageCircle size={20} className="text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-foreground text-sm">Support WhatsApp</div>
              <div className="text-xs text-muted-foreground mt-0.5">Discutez avec un conseiller SONAPIE en temps réel via WhatsApp au +225 07 00 25 00 00</div>
            </div>
          </div>
          <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5 mt-6">
            <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2"><HelpCircle size={16} className="text-secondary" /> Suivi de réclamation</h3>
            <div className="flex gap-2">
              <input value={trackId} onChange={e => setTrackId(e.target.value)} placeholder="Ex: REC-1234"
                className="flex-1 bg-input-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={() => setTrackResult(complaints.find(c => c.id === trackId) || null)}
                className="bg-secondary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">Suivre</button>
            </div>
            {trackResult && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-border text-sm">
                <div className="font-medium text-foreground">{trackResult.subject}</div>
                <div className="text-xs text-muted-foreground mt-1">{trackResult.id} · {trackResult.date}</div>
                <Badge label={trackResult.status === "resolved" ? "Résolue" : trackResult.status === "in-progress" ? "En cours" : "En attente"}
                  color={trackResult.status === "resolved" ? "green" : trackResult.status === "in-progress" ? "yellow" : "orange"} />
              </div>
            )}
            {trackId && !trackResult && trackId.length > 3 && (
              <p className="text-xs text-muted-foreground mt-2">Aucune réclamation trouvée pour cette référence. Essayez REC-1001 (démo).</p>
            )}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="text-center mb-8">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">FAQ</p>
          <h2 className="text-2xl font-bold text-foreground">Questions fréquentes</h2>
        </div>
        <div className="space-y-3 max-w-3xl mx-auto">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted transition-colors"
              >
                <span className="font-semibold text-sm text-foreground pr-4">{faq.q}</span>
                <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [pageData, setPageData] = useState<any>({});
  const [user, setUser] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>({});
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    try {
      const raw = localStorage.getItem("sonapie:settings");
      if (!raw) return { platformName: APP_NAME, email: "info@sonapie.ci", feePct: 5 };
      const parsed = JSON.parse(raw) as Partial<PlatformSettings>;
      return {
        platformName: parsed.platformName || APP_NAME,
        email: parsed.email || "info@sonapie.ci",
        feePct: clampPct(typeof parsed.feePct === "number" ? parsed.feePct : 5),
      };
    } catch {
      return { platformName: APP_NAME, email: "info@sonapie.ci", feePct: 5 };
    }
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [catalogueFilters, setCatalogueFilters] = useState<CatalogueFilters>(DEFAULT_FILTERS);
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS);
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [adminUsers, setAdminUsers] = useState<MockUser[]>(MOCK_USERS);
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>(INITIAL_MAINTENANCE_TICKETS);
  const [adminClaims, setAdminClaims] = useState<AdminClaim[]>(INITIAL_ADMIN_CLAIMS);
  const [toast, setToast] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([
    { id: "REC-1001", subject: "Retard de confirmation", message: "Ma réservation n'a pas été confirmée sous 24h.", status: "in-progress", date: "10 Jan 2025" },
  ]);

  const notify: NotifyFn = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    try {
      localStorage.setItem("sonapie:settings", JSON.stringify(platformSettings));
    } catch {
      // ignore
    }
  }, [platformSettings]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const navigate = (newPage: Page, data?: any) => {
    setPage(newPage);
    if (data) setPageData(prev => ({ ...prev, ...data }));
    window.scrollTo(0, 0);
  };

  const isAdmin = page.startsWith("admin");
  const isDashboard = page.startsWith("dashboard");
  const currentProperty = pageData.property || properties[0];

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage navigate={navigate} filters={catalogueFilters} setFilters={setCatalogueFilters} favorites={favorites} toggleFavorite={toggleFavorite} properties={properties} />;
      case "catalogue": return <CataloguePage navigate={navigate} filters={catalogueFilters} setFilters={setCatalogueFilters} favorites={favorites} toggleFavorite={toggleFavorite} properties={properties} />;
      case "property": return <PropertyPage navigate={navigate} property={currentProperty} setBookingData={setBookingData} favorites={favorites} toggleFavorite={toggleFavorite} allProperties={properties} feePct={platformSettings.feePct} />;
      case "booking-dates": return <BookingDatesPage navigate={navigate} property={currentProperty} bookingData={bookingData} setBookingData={setBookingData} feePct={platformSettings.feePct} />;
      case "booking-info": return <BookingInfoPage navigate={navigate} bookingData={bookingData} setBookingData={setBookingData} />;
      case "booking-summary": return <BookingSummaryPage navigate={navigate} bookingData={bookingData} />;
      case "booking-payment": return <BookingPaymentPage navigate={navigate} bookingData={bookingData} setBookingData={setBookingData} />;
      case "booking-confirmation": return <BookingConfirmationPage navigate={navigate} bookingData={bookingData} setReservations={setReservations} user={user} />;
      case "dashboard":
      case "dashboard-reservations":
      case "dashboard-favorites":
      case "dashboard-payments":
      case "dashboard-documents":
      case "dashboard-complaints":
      case "dashboard-profile":
        return user
          ? <DashboardPage navigate={navigate} user={user} setUser={setUser} activeSub={page} favorites={favorites} toggleFavorite={toggleFavorite} reservations={reservations} setReservations={setReservations} complaints={complaints} setComplaints={setComplaints} properties={properties} notify={notify} />
          : <LoginPage navigate={navigate} setUser={setUser} />;
      case "login": return <LoginPage navigate={navigate} setUser={setUser} />;
      case "register": return <RegisterPage navigate={navigate} setUser={setUser} />;
      case "forgot-password": return <ForgotPasswordPage navigate={navigate} />;
      case "admin": return <AdminDashboard navigate={navigate} reservations={reservations} properties={properties} />;
      case "admin-properties": return <AdminPropertiesPage navigate={navigate} properties={properties} setProperties={setProperties} notify={notify} />;
      case "admin-reservations": return <AdminReservationsPage reservations={reservations} setReservations={setReservations} notify={notify} />;
      case "admin-users": return <AdminUsersPage users={adminUsers} setUsers={setAdminUsers} notify={notify} />;
      case "admin-payments": return <AdminPaymentsPage notify={notify} />;
      case "admin-maintenance": return <AdminMaintenancePage tickets={maintenanceTickets} setTickets={setMaintenanceTickets} notify={notify} />;
      case "admin-claims": return <AdminClaimsPage claims={adminClaims} setClaims={setAdminClaims} notify={notify} />;
      case "admin-stats": return <AdminStatsPage />;
      case "admin-settings": return <AdminSettingsPage settings={platformSettings} setSettings={setPlatformSettings} notify={notify} />;
      case "about": return <AboutPage navigate={navigate} />;
      case "contact": return <ContactPage navigate={navigate} complaints={complaints} setComplaints={setComplaints} />;
      default: return <HomePage navigate={navigate} filters={catalogueFilters} setFilters={setCatalogueFilters} favorites={favorites} toggleFavorite={toggleFavorite} properties={properties} />;
    }
  };

  if (isAdmin) {
    if (!user?.isAdmin) {
      return (
        <>
          <LoginPage navigate={navigate} setUser={setUser} />
          <ToastContainer message={toast} />
        </>
      );
    }
    return (
      <div className="flex min-h-screen bg-muted/30">
        <AdminSidebar navigate={navigate} activePage={page} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopBar user={user} activePage={page} setUser={setUser} navigate={navigate} />
          <main className="flex-1 overflow-auto">
            {renderPage()}
          </main>
        </div>
        <ToastContainer message={toast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header navigate={navigate} currentPage={page} user={user} setUser={setUser} />
      <main className="flex-1">
        {renderPage()}
      </main>
      {!isDashboard && <Footer navigate={navigate} />}
      <ToastContainer message={toast} />
    </div>
  );
}
