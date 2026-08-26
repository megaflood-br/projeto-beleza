export const ROLES = ["OWNER", "MANAGER", "RECEPTIONIST", "PROFESSIONAL"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  RECEPTIONIST: "Recepção",
  PROFESSIONAL: "Profissional",
};

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  PENDING: "#64748B",
  CONFIRMED: "#2563EB",
  IN_PROGRESS: "#0D9488",
  COMPLETED: "#059669",
  CANCELLED: "#94A3B8",
  NO_SHOW: "#EA580C",
};

export const PAYMENT_METHODS = ["PIX", "CASH", "CREDIT", "DEBIT", "TRANSFER", "PACKAGE"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  TRANSFER: "Transferência",
  PACKAGE: "Pacote",
};

export const SESSION_COOKIE = "mb_session";

export const COMANDA_STATUSES = ["OPEN", "CLOSED", "CANCELLED"] as const;
export type ComandaStatus = (typeof COMANDA_STATUSES)[number];

export const COMANDA_STATUS_LABEL: Record<ComandaStatus, string> = {
  OPEN: "Em aberto",
  CLOSED: "Fechada",
  CANCELLED: "Cancelada",
};

export const COMANDA_STATUS_COLOR: Record<ComandaStatus, string> = {
  OPEN: "#0D9488",
  CLOSED: "#2563EB",
  CANCELLED: "#94A3B8",
};

export const DURATION_OPTIONS = [15, 20, 30, 40, 45, 60, 75, 90, 120, 150, 180];

export const FINANCE_ACCOUNTS = [
  { value: "caixa", label: "Caixa" },
  { value: "banco", label: "Banco" },
  { value: "pix", label: "Pix" },
] as const;

export const INCOME_CATEGORIES = [
  { value: "servico", label: "Serviços" },
  { value: "comanda", label: "Serviços" },
  { value: "produto", label: "Produtos" },
  { value: "pacote", label: "Pacotes" },
  { value: "outros", label: "Outros" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "aluguel", label: "Aluguel" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "comissao", label: "Comissão" },
  { value: "salario", label: "Salários" },
  { value: "marketing", label: "Marketing" },
  { value: "outros", label: "Outros" },
] as const;

export const STOCK_UNITS = [
  { value: "un", label: "em unidade", short: "unidade" },
  { value: "ml", label: "em mililitro", short: "ml" },
  { value: "g", label: "em grama", short: "g" },
] as const;

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
};
