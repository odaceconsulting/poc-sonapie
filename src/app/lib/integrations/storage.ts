import type { EstablishmentIntegration, ImportBatch, SyncLog } from "../../types/integrations";

const INTEGRATIONS_KEY = "sonapie:integrations";
const SYNC_LOGS_KEY = "sonapie:sync-logs";
const IMPORT_BATCHES_KEY = "sonapie:import-batches";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const integrationStorage = {
  getIntegrations: (): EstablishmentIntegration[] => read(INTEGRATIONS_KEY, []),
  setIntegrations: (items: EstablishmentIntegration[]) => write(INTEGRATIONS_KEY, items),

  getSyncLogs: (): SyncLog[] => read(SYNC_LOGS_KEY, []),
  setSyncLogs: (logs: SyncLog[]) => write(SYNC_LOGS_KEY, logs),
  appendSyncLog: (log: SyncLog) => {
    const logs = integrationStorage.getSyncLogs();
    integrationStorage.setSyncLogs([log, ...logs].slice(0, 200));
  },

  getImportBatches: (): ImportBatch[] => read(IMPORT_BATCHES_KEY, []),
  setImportBatches: (batches: ImportBatch[]) => write(IMPORT_BATCHES_KEY, batches),
  appendImportBatch: (batch: ImportBatch) => {
    const batches = integrationStorage.getImportBatches();
    integrationStorage.setImportBatches([batch, ...batches].slice(0, 50));
  },
};
