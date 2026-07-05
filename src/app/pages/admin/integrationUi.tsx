import type { IntegrationMode, IntegrationStatus, SyncStatus } from "../../types/integrations";
import * as React from "react";

const badgeColors: Record<string, string> = {
  orange: "bg-orange-100 text-orange-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-100 text-gray-600",
  yellow: "bg-yellow-100 text-yellow-700",
  blue: "bg-blue-100 text-blue-700",
};

export const PillBadge = ({ label, color = "gray" }: { label: string; color?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColors[color] || badgeColors.gray}`}>
    {label}
  </span>
);

const integrationStatusMap: Record<IntegrationStatus, { label: string; color: string }> = {
  "connecté": { label: "Connecté", color: "green" },
  "en attente": { label: "En attente", color: "yellow" },
  erreur: { label: "Erreur", color: "red" },
  désactivé: { label: "Désactivé", color: "gray" },
};

export const IntegrationStatusBadge = ({ status }: { status: IntegrationStatus }) => {
  const m = integrationStatusMap[status] ?? { label: status, color: "gray" };
  return <PillBadge label={m.label} color={m.color} />;
};

const syncStatusMap: Record<SyncStatus, { label: string; color: string }> = {
  success: { label: "Succès", color: "green" },
  pending: { label: "En cours", color: "yellow" },
  failed: { label: "Échec", color: "red" },
  partial: { label: "Partiel", color: "orange" },
};

export const SyncStatusBadge = ({ status }: { status: SyncStatus }) => {
  const m = syncStatusMap[status] ?? { label: status, color: "gray" };
  return <PillBadge label={m.label} color={m.color} />;
};

const modeLabels: Record<IntegrationMode, string> = {
  api: "API",
  connecteur: "Connecteur",
  import: "Import Excel/CSV",
  manuel: "Saisie manuelle",
};

export const IntegrationModeBadge = ({ mode }: { mode: IntegrationMode }) => (
  <PillBadge label={modeLabels[mode] ?? mode} color="blue" />
);

export function formatSyncDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
