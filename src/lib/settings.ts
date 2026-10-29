export const SETTINGS_TABS = [
  { id: "salao", label: "Salão", description: "Dados, logo, horário e responsável técnico da estética." },
  { id: "cashback", label: "Cashback", description: "Ativação e regras de pontos." },
  { id: "fiscal", label: "Fiscal", description: "CNPJ, ISS e provedor para emissão de NFS-e e NFC-e." },
  { id: "importar", label: "Importar", description: "Traga clientes de uma planilha Excel (.xls ou .xlsx)." },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

export function isSettingsTab(value: string | undefined): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.id === value);
}

export function parseSettingsTab(value?: string | null): SettingsTab {
  return value && isSettingsTab(value) ? value : "salao";
}
