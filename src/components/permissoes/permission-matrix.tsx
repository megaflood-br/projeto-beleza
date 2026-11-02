"use client";

import { cn } from "@/lib/utils";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type ModuleGrants,
  type PermissionFlag,
  type PermissionGrants,
  type PermissionModuleId,
} from "@/lib/permissions";

const ACTION_LABEL: Record<PermissionFlag, string> = {
  access: "Acessar",
  create: "Criar",
  edit: "Editar",
  remove: "Excluir",
  viewAll: "Ver todos",
  hidePhones: "Esconder telefones",
};

function extraLabel(moduleId: PermissionModuleId, flag: PermissionFlag, on: boolean) {
  if (flag === "hidePhones") return on ? "Telefones ocultos" : "Esconder telefones";
  if (flag !== "viewAll") return ACTION_LABEL[flag];
  if (moduleId === "commissions") return on ? "Ver comissões de todos" : "Só as próprias comissões";
  if (moduleId === "anamnesis") return on ? "Ver anamneses de todos" : "Só as próprias áreas";
  if (moduleId === "goals") return on ? "Ver metas de todos" : "Só as próprias metas";
  return on ? "Ver agenda de todos" : "Só a própria agenda";
}

export function PermissionMatrix({
  grants,
  admin,
  disabled,
  onAdmin,
  onChange,
}: {
  grants: PermissionGrants;
  admin: boolean;
  disabled?: boolean;
  onAdmin: (value: boolean) => void;
  onChange: (grants: PermissionGrants) => void;
}) {
  function toggle(moduleId: PermissionModuleId, flag: PermissionFlag) {
    const current = grants[moduleId] ?? {};
    const nextValue = current[flag] !== true;
    const nextRow: ModuleGrants = { ...current, [flag]: nextValue };
    if (flag === "access" && !nextValue) {
      nextRow.create = false;
      nextRow.edit = false;
      nextRow.remove = false;
    }
    if (flag !== "access" && flag !== "viewAll" && flag !== "hidePhones" && nextValue) nextRow.access = true;
    onChange({ ...grants, [moduleId]: nextRow });
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start justify-between gap-4 rounded-xl border border-line bg-sand/50 px-4 py-3">
        <span>
          <span className="block text-sm font-medium">Administrador / proprietário</span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            Acesso total ao sistema. Esta opção prevalece sobre as demais.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={admin}
          disabled={disabled}
          onClick={() => onAdmin(!admin)}
          className={cn(
            "relative mt-1 h-6 w-11 shrink-0 rounded-full transition",
            admin ? "bg-wine" : "bg-slate-300",
          )}
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", admin ? "left-5" : "left-0.5")} />
        </button>
      </label>

      <div className={cn("space-y-3", admin || disabled ? "pointer-events-none opacity-50" : "")}>
        {PERMISSION_MODULES.map((module) => {
          const row = grants[module.id] ?? {};
          const flags: PermissionFlag[] = [...PERMISSION_ACTIONS, ...module.extras];
          return (
            <div key={module.id} className="rounded-xl border border-line px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[12rem] max-w-md">
                  <p className="text-sm font-medium">{module.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{module.description}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {flags.map((flag) => {
                    const on = row[flag] === true;
                    return (
                      <button
                        key={flag}
                        type="button"
                        onClick={() => toggle(module.id, flag)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
                          on ? "bg-wine text-white ring-wine" : "bg-white text-ink-soft ring-line hover:text-ink",
                        )}
                      >
                        {extraLabel(module.id, flag, on)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
