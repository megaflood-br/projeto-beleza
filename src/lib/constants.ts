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
  PENDING: "#C4A574",
  CONFIRMED: "#9B1D3A",
  IN_PROGRESS: "#2A9D8F",
  COMPLETED: "#6B8F71",
  CANCELLED: "#8A8178",
  NO_SHOW: "#E07A5F",
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

export const SESSION_COOKIE = "aura_session";
