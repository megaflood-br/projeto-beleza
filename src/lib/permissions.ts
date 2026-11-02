import { type Role } from "@/lib/constants";

export const PERMISSION_ACTIONS = ["access", "create", "edit", "remove"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  {
    id: "dashboard",
    label: "Painel",
    description: "Resumo do dia, indicadores e avisos.",
    href: "/dashboard",
    extras: [] as const,
  },
  {
    id: "agenda",
    label: "Agenda",
    description: "Criar e alterar horários. Ver todos libera a agenda das outras profissionais.",
    href: "/agenda",
    extras: ["viewAll"] as const,
  },
  {
    id: "atendimento",
    label: "Atendimento",
    description: "Inbox e conversas com as clientes.",
    href: "/atendimento",
    extras: [] as const,
  },
  {
    id: "comandas",
    label: "Comandas",
    description: "Abrir, editar e faturar comandas.",
    href: "/comandas",
    extras: [] as const,
  },
  {
    id: "clients",
    label: "Clientes",
    description: "Cadastro, ficha e histórico. Esconder telefones oculta o celular em todo o painel.",
    href: "/clientes",
    extras: ["hidePhones"] as const,
  },
  {
    id: "anamnesis",
    label: "Anamnese",
    description: "Fichas dos serviços que a profissional atende. Ver todos libera as outras áreas.",
    href: "/anamneses",
    extras: ["viewAll"] as const,
  },
  {
    id: "docs",
    label: "Documentação",
    description: "POPs e arquivos do salão.",
    href: "/documentacao",
    extras: [] as const,
  },
  {
    id: "team",
    label: "Equipe",
    description: "Cadastro das profissionais, horários e comissão padrão.",
    href: "/equipe",
    extras: [] as const,
  },
  {
    id: "users",
    label: "Usuários e permissões",
    description: "Quem entra no painel e o que cada um pode ver.",
    href: "/usuarios",
    extras: [] as const,
  },
  {
    id: "goals",
    label: "Metas",
    description: "Acompanhar as próprias metas. Ver todos libera a equipe inteira.",
    href: "/metas",
    extras: ["viewAll"] as const,
  },
  {
    id: "commissions",
    label: "Comissões",
    description: "Consultar o disponível e o já recebido. Pagamento e configurações ficam só com o administrador.",
    href: "/comissoes",
    extras: ["viewAll"] as const,
  },
  {
    id: "finance",
    label: "Financeiro",
    description: "Contas, lançamentos e cadastros financeiros.",
    href: "/financeiro",
    extras: [] as const,
  },
  {
    id: "invoices",
    label: "Notas fiscais",
    description: "Emissão e consulta de NFS-e e NFC-e.",
    href: "/notas",
    extras: [] as const,
  },
  {
    id: "stock",
    label: "Estoque",
    description: "Produtos, lotes e movimentações.",
    href: "/estoque",
    extras: [] as const,
  },
  {
    id: "services",
    label: "Serviços",
    description: "Tabela de serviços e categorias.",
    href: "/servicos",
    extras: [] as const,
  },
  {
    id: "promotions",
    label: "Promoções",
    description: "Regras de preço e combos.",
    href: "/promocoes",
    extras: [] as const,
  },
  {
    id: "suppliers",
    label: "Fornecedores",
    description: "Pedidos e catálogo de fornecedores.",
    href: "/fornecedores",
    extras: [] as const,
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Listas, campanhas e automações.",
    href: "/marketing",
    extras: [] as const,
  },
  {
    id: "settings",
    label: "Configurações",
    description: "Dados do salão, WhatsApp, cashback e fiscal.",
    href: "/configuracoes",
    extras: [] as const,
  },
  {
    id: "support",
    label: "Suporte",
    description: "Tickets e chamadas com a MegaBeauty.",
    href: "/suporte",
    extras: [] as const,
  },
] as const;

export type PermissionModuleId = (typeof PERMISSION_MODULES)[number]["id"];
export type PermissionExtra = "viewAll" | "hidePhones";
export type PermissionFlag = PermissionAction | PermissionExtra;

export type ModuleGrants = Partial<Record<PermissionFlag, boolean>>;
export type PermissionGrants = Partial<Record<PermissionModuleId, ModuleGrants>>;

export type StoredAccess = {
  admin?: boolean;
  modules?: PermissionGrants;
};

export type Access = {
  isAdmin: boolean;
  professionalId: string | null;
  profileId: string | null;
  profileName: string | null;
  custom: boolean;
  grants: PermissionGrants;
};

const MODULE_IDS = new Set(PERMISSION_MODULES.map((item) => item.id));

export function isPermissionModule(value: string): value is PermissionModuleId {
  return MODULE_IDS.has(value as PermissionModuleId);
}

export function emptyGrants(): PermissionGrants {
  return {};
}

export function allGrants(): PermissionGrants {
  const grants: PermissionGrants = {};
  for (const module of PERMISSION_MODULES) {
    grants[module.id] = {
      access: true,
      create: true,
      edit: true,
      remove: true,
      ...((module.extras as readonly string[]).includes("viewAll") ? { viewAll: true } : {}),
    };
  }
  return grants;
}

function hasExtra(module: (typeof PERMISSION_MODULES)[number], extra: PermissionExtra) {
  return (module.extras as readonly string[]).includes(extra);
}

function flags(access: boolean, create: boolean, edit: boolean, remove: boolean, extra?: ModuleGrants): ModuleGrants {
  return { access, create, edit, remove, ...extra };
}

export function roleDefaultGrants(role: string): StoredAccess {
  if (role === "OWNER" || role === "SUPER_ADMIN") return { admin: true, modules: allGrants() };
  if (role === "MANAGER") return { admin: false, modules: allGrants() };
  if (role === "RECEPTIONIST") {
    return {
      admin: false,
      modules: {
        dashboard: flags(true, false, false, false),
        agenda: flags(true, true, true, true, { viewAll: true }),
        atendimento: flags(true, true, true, false),
        comandas: flags(true, true, true, false),
        clients: flags(true, true, true, false, { hidePhones: false }),
        anamnesis: flags(true, true, true, false, { viewAll: true }),
        docs: flags(true, false, false, false),
        stock: flags(true, false, false, false),
        services: flags(true, false, false, false),
        support: flags(true, true, false, false),
      },
    };
  }
  return {
    admin: false,
    modules: {
      dashboard: flags(true, false, false, false),
      agenda: flags(true, false, false, false, { viewAll: false }),
      atendimento: flags(true, true, false, false),
      comandas: flags(true, false, false, false),
      clients: flags(true, false, false, false, { hidePhones: true }),
      anamnesis: flags(true, true, false, false, { viewAll: false }),
      goals: flags(true, false, false, false, { viewAll: false }),
      commissions: flags(true, false, false, false, { viewAll: false }),
      support: flags(true, true, false, false),
    },
  };
}

export function parseStoredAccess(raw: string | null | undefined): StoredAccess {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StoredAccess;
    if (!parsed || typeof parsed !== "object") return {};
    return {
      admin: parsed.admin === true,
      modules: sanitizeGrants(parsed.modules),
    };
  } catch {
    return {};
  }
}

export function sanitizeGrants(input?: PermissionGrants | null): PermissionGrants {
  const grants: PermissionGrants = {};
  if (!input) return grants;
  for (const module of PERMISSION_MODULES) {
    const row = input[module.id];
    if (!row) continue;
    const next: ModuleGrants = {};
    for (const action of PERMISSION_ACTIONS) {
      if (row[action] === true) next[action] = true;
    }
    if (hasExtra(module, "viewAll") && row.viewAll === true) next.viewAll = true;
    if (hasExtra(module, "hidePhones") && row.hidePhones === true) next.hidePhones = true;
    if (Object.keys(next).length) grants[module.id] = next;
  }
  return grants;
}

export function serializeAccess(input: StoredAccess): string {
  return JSON.stringify({
    admin: input.admin === true,
    modules: sanitizeGrants(input.modules),
  });
}

export function mergeAccess(base: StoredAccess, override?: StoredAccess | null): StoredAccess {
  if (override?.admin) return { admin: true, modules: allGrants() };
  if (base.admin && !override) return { admin: true, modules: allGrants() };
  return {
    admin: false,
    modules: {
      ...sanitizeGrants(base.modules),
      ...sanitizeGrants(override?.modules),
    },
  };
}

export function resolveAccess(input: {
  role: string;
  professionalId?: string | null;
  profile?: { id: string; name: string; isAdmin: boolean; grants: string } | null;
  accessJson?: string | null;
}): Access {
  const defaults = roleDefaultGrants(input.role);
  const custom = parseStoredAccess(input.accessJson);
  const fromProfile = input.profile
    ? { admin: input.profile.isAdmin, modules: parseStoredAccess(input.profile.grants).modules }
    : null;
  const hasCustom = Boolean(input.accessJson && input.accessJson.trim());
  const stored = hasCustom ? custom : fromProfile ? fromProfile : defaults;
  const isAdmin = Boolean(stored.admin || (defaults.admin && !hasCustom && !fromProfile));
  const resolved = isAdmin
    ? { admin: true, modules: allGrants() }
    : { admin: false, modules: sanitizeGrants(stored.modules ?? defaults.modules) };

  return {
    isAdmin: resolved.admin,
    professionalId: input.professionalId ?? null,
    profileId: hasCustom ? null : input.profile?.id ?? null,
    profileName: hasCustom ? "Personalizado" : input.profile?.name ?? null,
    custom: hasCustom,
    grants: resolved.modules ?? {},
  };
}

export function canAccess(access: Pick<Access, "isAdmin" | "grants">, module: PermissionModuleId, action: PermissionFlag = "access") {
  if (access.isAdmin) return true;
  const row = access.grants[module];
  if (!row) return false;
  if (action === "viewAll") return row.viewAll === true;
  if (action === "hidePhones") return row.hidePhones === true;
  if (action !== "access" && row.access !== true) return false;
  return row[action] === true;
}

export function shouldHidePhones(access: Pick<Access, "isAdmin" | "grants">) {
  if (access.isAdmin) return false;
  return access.grants.clients?.hidePhones === true;
}

export function phonesScopeLabel(access: Pick<Access, "isAdmin" | "grants">) {
  return shouldHidePhones(access) ? "Telefones ocultos" : "Telefones visíveis";
}

export function canViewAllAgenda(access: Pick<Access, "isAdmin" | "grants">) {
  return canAccess(access, "agenda", "viewAll");
}

export function canViewAllCommissions(access: Pick<Access, "isAdmin" | "grants">) {
  return canAccess(access, "commissions", "viewAll");
}

export function canViewAllAnamnesis(access: Pick<Access, "isAdmin" | "grants">) {
  return canAccess(access, "anamnesis", "viewAll");
}

export function canViewAllGoals(access: Pick<Access, "isAdmin" | "grants">) {
  return canAccess(access, "goals", "viewAll");
}

export function canManageCommissions(access: Pick<Access, "isAdmin" | "grants">) {
  return access.isAdmin;
}

export function agendaScopeLabel(access: Pick<Access, "isAdmin" | "grants">) {
  return canViewAllAgenda(access) ? "Agenda de todos" : "Só a própria agenda";
}

export function moduleFromPath(pathname: string): PermissionModuleId | null {
  const path = pathname.split("?")[0] || "/";
  if (path === "/ia" || path === "/avisos" || path === "/") return "dashboard";
  if (path === "/permissoes" || path.startsWith("/permissoes/")) return "users";
  if (path === "/cadastros" || path.startsWith("/cadastros/")) return "finance";
  const match = PERMISSION_MODULES.find((item) => path === item.href || path.startsWith(`${item.href}/`));
  return match?.id ?? null;
}

export function allowedNavHrefs(access: Pick<Access, "isAdmin" | "grants">, hrefs: string[]) {
  return hrefs.filter((href) => {
    const module = moduleFromPath(href);
    return !module || canAccess(access, module);
  });
}

export function canManagePermissions(role: Role | string, access?: Pick<Access, "isAdmin" | "grants">) {
  if (access) return canAccess(access, "users", "edit") || access.isAdmin;
  return role === "OWNER" || role === "MANAGER";
}

export function profilePreset(name: "admin" | "manager" | "reception" | "professional"): StoredAccess {
  if (name === "admin") return roleDefaultGrants("OWNER");
  if (name === "manager") return roleDefaultGrants("MANAGER");
  if (name === "reception") return roleDefaultGrants("RECEPTIONIST");
  return roleDefaultGrants("PROFESSIONAL");
}
