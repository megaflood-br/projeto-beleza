import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Avatar, Card, Field, Input, Select } from "@/components/ui";
import { CreateModal } from "@/components/create-modal";
import { inviteTeamUser, upsertProfessional } from "@/app/actions/team";
import { ROLE_LABEL, type Role } from "@/lib/constants";

export default async function EquipePage() {
  const { session } = await requireTenant();
  const [professionals, users] = await Promise.all([
    prisma.professional.findMany({ where: { tenantId: session.tenantId }, include: { user: true } }),
    prisma.user.findMany({ where: { tenantId: session.tenantId } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Equipe</h1>
          <p className="text-ink-soft">Profissionais da agenda e acessos ao sistema.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateModal trigger="Novo profissional" title="Novo profissional" submitLabel="Salvar profissional" action={upsertProfessional}>
            <Field label="Nome">
              <Input name="name" required />
            </Field>
            <Field label="Especialidade">
              <Input name="specialty" placeholder="Cabelo, estética..." />
            </Field>
            <Field label="Comissão %">
              <Input name="commissionPct" type="number" defaultValue={40} />
            </Field>
            <Field label="Cor na agenda">
              <Input name="color" type="color" defaultValue="#2563EB" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início">
                <Input name="workStart" type="time" defaultValue="09:00" />
              </Field>
              <Field label="Fim">
                <Input name="workEnd" type="time" defaultValue="19:00" />
              </Field>
            </div>
          </CreateModal>
          <CreateModal trigger="Novo acesso" title="Novo acesso ao sistema" submitLabel="Criar usuário" action={inviteTeamUser}>
            <Field label="Nome">
              <Input name="name" required />
            </Field>
            <Field label="E-mail">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Perfil">
              <Select name="role" defaultValue="RECEPTIONIST">
                <option value="MANAGER">Gerente</option>
                <option value="RECEPTIONIST">Recepção</option>
                <option value="PROFESSIONAL">Profissional</option>
              </Select>
            </Field>
            <Field label="Vincular profissional">
              <Select name="professionalId">
                <option value="">Nenhum</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Senha inicial">
              <Input name="password" defaultValue="demo1234" />
            </Field>
          </CreateModal>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {professionals.map((p) => (
          <Card key={p.id} className="flex items-center gap-4">
            <Avatar name={p.name} color={p.color} />
            <div className="flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-ink-soft">
                {p.specialty} · comissão {p.commissionPct}% · {p.workStart}–{p.workEnd}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-3 font-medium">Acessos</h2>
        <div className="space-y-2 text-sm">
          {users.map((u) => (
            <div key={u.id} className="flex justify-between border-t border-line pt-2 first:border-0 first:pt-0">
              <span>{u.name}</span>
              <span className="text-ink-soft">{ROLE_LABEL[u.role as Role] ?? u.role}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
