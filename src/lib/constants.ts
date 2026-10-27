export const ROLES = ["OWNER", "MANAGER", "RECEPTIONIST", "PROFESSIONAL", "SUPER_ADMIN", "SUPPLIER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  RECEPTIONIST: "Recepção",
  PROFESSIONAL: "Profissional",
  SUPER_ADMIN: "Administrador da plataforma",
  SUPPLIER: "Fornecedor",
};

export const TENANT_STATUSES = ["ACTIVE", "TRIAL", "SUSPENDED"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = {
  ACTIVE: "Ativa",
  TRIAL: "Trial",
  SUSPENDED: "Suspensa",
};

export const TENANT_STATUS_COLOR: Record<TenantStatus, string> = {
  ACTIVE: "#059669",
  TRIAL: "#2563EB",
  SUSPENDED: "#EA580C",
};

export const TENANT_PLANS = ["essencial", "profissional", "premium"] as const;
export type TenantPlan = (typeof TENANT_PLANS)[number];

export const TENANT_PLAN_LABEL: Record<TenantPlan, string> = {
  essencial: "Essencial",
  profissional: "Profissional",
  premium: "Premium",
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

export const SUPPORT_CATEGORIES = ["ajuda", "tecnico", "financeiro", "comercial", "onboarding"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_CATEGORY_LABEL: Record<SupportCategory, string> = {
  ajuda: "Ajuda geral",
  tecnico: "Técnico",
  financeiro: "Financeiro",
  comercial: "Comercial",
  onboarding: "Onboarding",
};

export const SUPPORT_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_PRIORITY_LABEL: Record<SupportPriority, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const SUPPORT_PRIORITY_COLOR: Record<SupportPriority, string> = {
  LOW: "#64748B",
  NORMAL: "#2563EB",
  HIGH: "#EA580C",
  URGENT: "#DC2626",
};

export const SUPPORT_TICKET_STATUSES = ["OPEN", "PENDING", "RESOLVED", "CLOSED"] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_TICKET_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: "Aberto",
  PENDING: "Aguardando salão",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

export const SUPPORT_TICKET_STATUS_COLOR: Record<SupportTicketStatus, string> = {
  OPEN: "#2563EB",
  PENDING: "#D97706",
  RESOLVED: "#059669",
  CLOSED: "#64748B",
};

export const SUPPORT_CALL_STATUSES = ["RINGING", "ACTIVE", "ENDED", "MISSED", "DECLINED"] as const;
export type SupportCallStatus = (typeof SUPPORT_CALL_STATUSES)[number];

export const SUPPORT_CALL_STATUS_LABEL: Record<SupportCallStatus, string> = {
  RINGING: "Chamando",
  ACTIVE: "Em atendimento",
  ENDED: "Encerrada",
  MISSED: "Perdida",
  DECLINED: "Recusada",
};
