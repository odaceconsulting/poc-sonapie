import { useCallback, useEffect, useState } from "react";
import {
  Plus, Search, Eye, RefreshCw, Filter, Plug, Building2, X,
} from "lucide-react";
import { SONAPIE_ESTABLISHMENTS } from "../../data/establishments";
import { createIntegration, listIntegrations } from "../../lib/integrations/api";
import type {
  EstablishmentIntegration,
  IntegrationEstablishmentType,
  IntegrationMode,
  IntegrationStatus,
} from "../../types/integrations";
import {
  formatSyncDate,
  IntegrationModeBadge,
  IntegrationStatusBadge,
} from "./integrationUi";

type NotifyFn = (message: string) => void;

type AdminNavigate = (p: string, d?: Record<string, unknown>) => void;

const ESTABLISHMENT_TYPES: IntegrationEstablishmentType[] = ["hôtel", "resort", "appartement", "résidence"];
const MODES: IntegrationMode[] = ["api", "connecteur", "import", "manuel"];
const STATUSES: Array<IntegrationStatus | "all"> = ["all", "connecté", "en attente", "erreur", "désactivé"];

const AdminPageHeader = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export function AdminIntegrationsPage({
  navigate,
  notify,
}: {
  navigate: AdminNavigate;
  notify: NotifyFn;
}) {
  const [items, setItems] = useState<EstablishmentIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | "all">("all");
  const [modeFilter, setModeFilter] = useState<IntegrationMode | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    establishmentName: "",
    establishmentType: "hôtel" as IntegrationEstablishmentType,
    integrationMode: "api" as IntegrationMode,
    propertyId: SONAPIE_ESTABLISHMENTS[0]?.id ?? "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listIntegrations({
        status: statusFilter,
        mode: modeFilter,
        search,
      });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, modeFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 200 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleCreate = async () => {
    if (!form.establishmentName.trim()) {
      notify("Nom d'établissement requis");
      return;
    }
    setCreating(true);
    try {
      const created = await createIntegration({
        establishmentName: form.establishmentName.trim(),
        establishmentType: form.establishmentType,
        integrationMode: form.integrationMode,
        propertyId: form.propertyId,
      });
      notify(`Intégration créée — ${created.establishmentName}`);
      setShowCreate(false);
      setForm(f => ({ ...f, establishmentName: "" }));
      await load();
      navigate("admin-integration-detail", { integrationId: created.id });
    } catch {
      notify("Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const connected = items.filter(i => i.status === "connecté").length;
  const errors = items.filter(i => i.status === "erreur").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <AdminPageHeader
        title="Intégrations PMS"
        subtitle={`${items.length} établissement(s) — ${connected} connecté(s)`}
      >
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-orange-700 transition-colors shadow-md shadow-primary/20"
        >
          <Plus size={16} /> Nouvelle intégration
        </button>
      </AdminPageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: items.length, color: "text-foreground" },
          { label: "Connectés", value: connected, color: "text-green-600" },
          { label: "En attente", value: items.filter(i => i.status === "en attente").length, color: "text-yellow-600" },
          { label: "Erreurs", value: errors, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4 border-b border-border bg-muted/20">
          <Filter size={18} className="text-primary shrink-0" />
          <div className="relative flex-1 min-w-[12rem]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un établissement…"
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-input-background outline-none focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as IntegrationStatus | "all")}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-input-background"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s === "all" ? "Tous statuts" : s}</option>
            ))}
          </select>
          <select
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value as IntegrationMode | "all")}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-input-background"
          >
            <option value="all">Tous modes</option>
            {MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button type="button" onClick={load} className="p-2 border border-border rounded-lg hover:bg-muted" title="Actualiser">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="md:hidden divide-y divide-border">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Aucune intégration</p>
          ) : items.map(item => (
            <div key={item.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-foreground">{item.establishmentName}</div>
                  <div className="text-xs text-muted-foreground capitalize">{item.establishmentType}</div>
                </div>
                <IntegrationStatusBadge status={item.status} />
              </div>
              <div className="flex flex-wrap gap-2">
                <IntegrationModeBadge mode={item.integrationMode} />
              </div>
              <div className="text-xs text-muted-foreground">Dernière sync : {formatSyncDate(item.lastSyncAt)}</div>
              <button
                type="button"
                onClick={() => navigate("admin-integration-detail", { integrationId: item.id })}
                className="w-full flex items-center justify-center gap-2 border border-border py-2 rounded-lg text-sm font-medium hover:bg-muted"
              >
                <Eye size={14} /> Voir détails
              </button>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Établissement</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Dernière sync</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Chargement…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucune intégration trouvée</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{item.establishmentName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{item.id}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{item.establishmentType}</td>
                  <td className="px-4 py-3"><IntegrationModeBadge mode={item.integrationMode} /></td>
                  <td className="px-4 py-3"><IntegrationStatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatSyncDate(item.lastSyncAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => navigate("admin-integration-detail", { integrationId: item.id })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-primary rounded-lg text-xs font-semibold hover:bg-orange-100"
                    >
                      <Eye size={13} /> Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Plug size={20} className="text-primary" />
                <h3 className="font-bold text-foreground">Nouvelle intégration</h3>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5">Nom établissement</label>
                <input
                  value={form.establishmentName}
                  onChange={e => setForm(f => ({ ...f, establishmentName: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background outline-none focus:border-primary"
                  placeholder="Ex. Sofitel Hôtel Ivoire"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Type</label>
                  <select
                    value={form.establishmentType}
                    onChange={e => setForm(f => ({ ...f, establishmentType: e.target.value as IntegrationEstablishmentType }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background"
                  >
                    {ESTABLISHMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1.5">Mode</label>
                  <select
                    value={form.integrationMode}
                    onChange={e => setForm(f => ({ ...f, integrationMode: e.target.value as IntegrationMode }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background"
                  >
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5">Bien SONAPIE lié</label>
                <select
                  value={form.propertyId}
                  onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-input-background"
                >
                  {SONAPIE_ESTABLISHMENTS.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium hover:bg-muted">
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl text-sm hover:bg-orange-700 disabled:opacity-60"
              >
                {creating ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && items.length === 0 && !search && statusFilter === "all" && (
        <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
          <Building2 size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Connectez les PMS de vos établissements pour synchroniser disponibilités, tarifs et réservations.</p>
        </div>
      )}
    </div>
  );
}
