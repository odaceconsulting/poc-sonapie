import { useCallback, useEffect, useRef, useState } from "react";
import * as React from "react";
import {
  ArrowLeft, RefreshCw, Zap, Upload, Power, Save, AlertCircle,
  CheckCircle, XCircle, Clock, FileText, Eye, EyeOff,
} from "lucide-react";
import { SONAPIE_ESTABLISHMENTS } from "../../data/establishments";
import { applySyncToCatalog } from "../../lib/integrations/applySync";
import {
  disableIntegration,
  getImportBatches,
  getIntegration,
  getIntegrationLogs,
  importIntegrationFile,
  syncIntegration,
  testIntegration,
  updateIntegration,
} from "../../lib/integrations/api";
import { parseCsvPreview } from "../../lib/integrations/syncService";
import type {
  EstablishmentIntegration,
  FieldMapping,
  ImportBatch,
  ImportBatchRow,
  SyncLog,
} from "../../types/integrations";
import {
  formatSyncDate,
  IntegrationModeBadge,
  IntegrationStatusBadge,
  SyncStatusBadge,
} from "./integrationUi";

type NotifyFn = (message: string) => void;

type AdminNavigate = (p: string, d?: Record<string, unknown>) => void;

type PropertyLike = {
  id: string;
  name: string;
  type: string;
  city: string;
  price: number;
  available: boolean;
};

type ReservationLike = {
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
};

export type { PropertyLike, ReservationLike };

const AdminPageHeader = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export function AdminIntegrationDetailPage({
  integrationId,
  navigate,
  notify,
  properties,
  reservations,
  setProperties,
  setReservations,
}: {
  integrationId: string;
  navigate: AdminNavigate;
  notify: NotifyFn;
  properties: PropertyLike[];
  reservations: ReservationLike[];
  setProperties: React.Dispatch<React.SetStateAction<PropertyLike[]>>;
  setReservations: React.Dispatch<React.SetStateAction<ReservationLike[]>>;
}) {
  const [integration, setIntegration] = useState<EstablishmentIntegration | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportBatchRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const catalogueProps = properties.map(p => ({
    id: p.id,
    name: p.name,
    city: p.city,
    type: p.type,
    price: p.price,
    available: p.available,
  }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [item, logList, batchList] = await Promise.all([
        getIntegration(integrationId),
        getIntegrationLogs(integrationId),
        getImportBatches(integrationId),
      ]);
      setIntegration(item);
      setLogs(logList);
      setBatches(batchList);
    } finally {
      setLoading(false);
    }
  }, [integrationId]);

  useEffect(() => { load(); }, [load]);

  const reservationIds = new Set(reservations.map(r => r.id));

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testIntegration(integrationId);
      notify(result.ok ? `Connexion OK (${result.latencyMs} ms)` : result.message);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Test échoué");
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncIntegration(integrationId, catalogueProps, reservationIds);
      applySyncToCatalog(result.propertyUpdates, result.newReservations, setProperties, setReservations);
      notify(`Synchronisation ${result.log.status} — ${result.log.recordsProcessed} enregistrement(s)`);
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Synchronisation échouée");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisable = async () => {
    await disableIntegration(integrationId);
    notify("Intégration désactivée");
    await load();
  };

  const handleSave = async () => {
    if (!integration) return;
    setSaving(true);
    try {
      await updateIntegration(integrationId, {
        establishmentName: integration.establishmentName,
        establishmentType: integration.establishmentType,
        integrationMode: integration.integrationMode,
        propertyId: integration.propertyId,
        apiConfig: integration.apiConfig,
        fieldMappings: integration.fieldMappings,
        notes: integration.notes,
      });
      notify("Configuration enregistrée");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setImportText(text);
      setImportFileName(file.name);
      const { rows, errors } = parseCsvPreview(text);
      setImportPreview(rows);
      setImportErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      notify("Sélectionnez un fichier CSV");
      return;
    }
    setImporting(true);
    try {
      const result = await importIntegrationFile(
        integrationId,
        importText,
        importFileName || "import.csv",
        catalogueProps,
        reservationIds,
      );
      applySyncToCatalog(result.propertyUpdates, result.newReservations, setProperties, setReservations);
      const msg = result.parseErrors.length
        ? `Import partiel — ${result.batch.importedRows}/${result.batch.totalRows} lignes`
        : `Import réussi — ${result.batch.importedRows} ligne(s)`;
      notify(msg);
      setImportPreview([]);
      setImportText("");
      setImportFileName("");
      await load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Import échoué");
    } finally {
      setImporting(false);
    }
  };

  const updateMapping = (index: number, patch: Partial<FieldMapping>) => {
    if (!integration) return;
    const next = integration.fieldMappings.map((m, i) => (i === index ? { ...m, ...patch } : m));
    setIntegration({ ...integration, fieldMappings: next });
  };

  const linkedProperty = SONAPIE_ESTABLISHMENTS.find(p => p.id === integration?.propertyId)
    ?? properties.find(p => p.id === integration?.propertyId);

  if (loading && !integration) {
    return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;
  }

  if (!integration) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Intégration introuvable</p>
        <button type="button" onClick={() => navigate("admin-integrations")} className="text-primary hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const recentErrors = logs.filter(l => l.errors.length > 0).slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <button
        type="button"
        onClick={() => navigate("admin-integrations")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} /> Retour aux intégrations
      </button>

      <AdminPageHeader
        title={integration.establishmentName}
        subtitle={`${integration.establishmentType} · ${integration.id}`}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || integration.status === "désactivé"}
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            <Zap size={14} className={testing ? "animate-pulse" : ""} />
            {testing ? "Test…" : "Tester connexion"}
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || integration.status === "désactivé"}
            className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sync…" : "Lancer sync"}
          </button>
          <button
            type="button"
            onClick={handleDisable}
            disabled={integration.status === "désactivé"}
            className="flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
          >
            <Power size={14} /> Désactiver
          </button>
        </div>
      </AdminPageHeader>

      <div className="flex flex-wrap gap-2">
        <IntegrationStatusBadge status={integration.status} />
        <IntegrationModeBadge mode={integration.integrationMode} />
        <span className="text-xs text-muted-foreground self-center">
          Dernière sync : {formatSyncDate(integration.lastSyncAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-foreground">Informations établissement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Nom</label>
              <input
                value={integration.establishmentName}
                onChange={e => setIntegration({ ...integration, establishmentName: e.target.value })}
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-input-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Type</label>
              <select
                value={integration.establishmentType}
                onChange={e => setIntegration({ ...integration, establishmentType: e.target.value as EstablishmentIntegration["establishmentType"] })}
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-input-background text-sm capitalize"
              >
                {["hôtel", "resort", "appartement", "résidence"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Bien SONAPIE</label>
              <select
                value={integration.propertyId}
                onChange={e => setIntegration({ ...integration, propertyId: e.target.value })}
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-input-background text-sm"
              >
                {SONAPIE_ESTABLISHMENTS.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                ))}
              </select>
            </div>
            {linkedProperty && (
              <div className="sm:col-span-2 p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                Catalogue : {linkedProperty.name} · {linkedProperty.city} ·
                prix actuel {linkedProperty.price?.toLocaleString("fr-FR")} FCFA ·
                {linkedProperty.available ? " disponible" : " indisponible"}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-foreground">Configuration API</h3>
          {integration.integrationMode === "import" || integration.integrationMode === "manuel" ? (
            <p className="text-sm text-muted-foreground">
              Mode {integration.integrationMode} — configuration API optionnelle. Utilisez l'import CSV ci-dessous ou la saisie manuelle.
            </p>
          ) : null}
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">URL API</label>
              <input
                value={integration.apiConfig.baseUrl}
                onChange={e => setIntegration({
                  ...integration,
                  apiConfig: { ...integration.apiConfig, baseUrl: e.target.value },
                })}
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-input-background font-mono text-xs"
                placeholder="https://pms.example.com/api/v1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Clé API</label>
              <div className="relative mt-1">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={integration.apiConfig.apiKey}
                  onChange={e => setIntegration({
                    ...integration,
                    apiConfig: { ...integration.apiConfig, apiKey: e.target.value },
                  })}
                  className="w-full border border-border rounded-lg px-3 py-2 pr-10 bg-input-background font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Token</label>
              <input
                type="password"
                value={integration.apiConfig.token}
                onChange={e => setIntegration({
                  ...integration,
                  apiConfig: { ...integration.apiConfig, token: e.target.value },
                })}
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-input-background font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Webhook</label>
              <input
                value={integration.apiConfig.webhookUrl}
                onChange={e => setIntegration({
                  ...integration,
                  apiConfig: { ...integration.apiConfig, webhookUrl: e.target.value },
                })}
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 bg-input-background font-mono text-xs"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-60"
          >
            <Save size={14} /> {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">Mapping des champs PMS → SONAPIE</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <th className="pb-2 pr-4">Champ SONAPIE</th>
                <th className="pb-2 pr-4">Champ PMS</th>
                <th className="pb-2 pr-4">Actif</th>
                <th className="pb-2">Transform</th>
              </tr>
            </thead>
            <tbody>
              {integration.fieldMappings.map((m, i) => (
                <tr key={m.sonapieField} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium capitalize">{m.sonapieField}</td>
                  <td className="py-2 pr-4">
                    <input
                      value={m.pmsField}
                      onChange={e => updateMapping(i, { pmsField: e.target.value })}
                      className="w-full border border-border rounded-lg px-2 py-1 text-xs font-mono bg-input-background"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      onChange={e => updateMapping(i, { enabled: e.target.checked })}
                      className="rounded"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      value={m.transform ?? ""}
                      onChange={e => updateMapping(i, { transform: e.target.value || undefined })}
                      placeholder="optionnel"
                      className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-input-background"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(integration.integrationMode === "import" || integration.integrationMode === "connecteur") && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Upload size={18} className="text-primary" /> Import Excel / CSV
          </h3>
          <p className="text-sm text-muted-foreground">
            Colonnes attendues : établissement, prix, disponibilité, arrivée, départ, client (séparateur , ou ;)
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.xlsx"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted"
            >
              <Upload size={14} /> Choisir fichier
            </button>
            {importFileName && (
              <span className="text-sm text-muted-foreground self-center flex items-center gap-1">
                <FileText size={14} /> {importFileName} — {importPreview.length} ligne(s)
              </span>
            )}
            <button
              type="button"
              onClick={handleImport}
              disabled={!importPreview.length || importing}
              className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {importing ? "Import…" : "Valider et importer"}
            </button>
          </div>
          {importErrors.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700 space-y-1">
              {importErrors.map((err, i) => <div key={i}>• {err}</div>)}
            </div>
          )}
          {importPreview.length > 0 && (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="px-3 py-2">Établissement</th>
                    <th className="px-3 py-2">Prix</th>
                    <th className="px-3 py-2">Dispo</th>
                    <th className="px-3 py-2">Arrivée</th>
                    <th className="px-3 py-2">Départ</th>
                    <th className="px-3 py-2">Client</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2">{row.establishment}</td>
                      <td className="px-3 py-2">{row.price?.toLocaleString("fr-FR") ?? "—"}</td>
                      <td className="px-3 py-2">{row.available === undefined ? "—" : row.available ? "Oui" : "Non"}</td>
                      <td className="px-3 py-2">{row.checkIn ?? "—"}</td>
                      <td className="px-3 py-2">{row.checkOut ?? "—"}</td>
                      <td className="px-3 py-2">{row.guestName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 10 && (
                <p className="text-xs text-muted-foreground p-2">+ {importPreview.length - 10} ligne(s) supplémentaires</p>
              )}
            </div>
          )}
          {batches.length > 0 && (
            <div className="pt-2 border-t border-border">
              <h4 className="text-sm font-semibold mb-2">Imports récents</h4>
              <div className="space-y-2">
                {batches.slice(0, 3).map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm py-1">
                    <span>{b.fileName}</span>
                    <div className="flex items-center gap-2">
                      <SyncStatusBadge status={b.status} />
                      <span className="text-muted-foreground text-xs">{b.importedRows}/{b.totalRows}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Historique des synchronisations</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun log</p>
            ) : logs.map(log => (
              <div key={log.id} className="border border-border rounded-xl p-3 text-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <SyncStatusBadge status={log.status} />
                  <span className="text-xs text-muted-foreground">{formatSyncDate(log.finishedAt ?? log.startedAt)}</span>
                </div>
                <p className="text-foreground">{log.summary}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {log.recordsProcessed} traité(s) · {log.recordsFailed} erreur(s)
                </p>
                {Object.keys(log.details).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    {log.details.availabilities !== undefined && <span className="bg-muted px-2 py-0.5 rounded">Dispo: {log.details.availabilities}</span>}
                    {log.details.rates !== undefined && <span className="bg-muted px-2 py-0.5 rounded">Tarifs: {log.details.rates}</span>}
                    {log.details.reservations !== undefined && <span className="bg-muted px-2 py-0.5 rounded">Résa: {log.details.reservations}</span>}
                    {log.details.payments !== undefined && <span className="bg-muted px-2 py-0.5 rounded">Paiements: {log.details.payments}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" /> Erreurs détectées
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentErrors.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <CheckCircle size={32} className="text-green-500 mb-2" />
                <p className="text-sm">Aucune erreur récente</p>
              </div>
            ) : recentErrors.map(log => (
              <div key={log.id} className="border border-red-100 bg-red-50/50 rounded-xl p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle size={14} className="text-red-500" />
                  <span className="font-medium text-foreground">{formatSyncDate(log.finishedAt ?? log.startedAt)}</span>
                </div>
                <ul className="space-y-1 text-red-700 text-xs">
                  {log.errors.map((err, i) => <li key={i}>• {err}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
