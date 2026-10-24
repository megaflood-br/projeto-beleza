export const SETTINGS_TABS = [
  { id: "salao", label: "Salão", description: "Dados, horário e canais do salão." },
  { id: "cashback", label: "Cashback", description: "Ativação e regras de pontos." },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

export function isSettingsTab(value: string | undefined): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.id === value);
}

export function parseSettingsTab(value?: string | null): SettingsTab {
  return value && isSettingsTab(value) ? value : "salao";
}
