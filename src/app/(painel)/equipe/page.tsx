import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { Avatar, Button, Card, Field, Input, Select } from "@/components/ui";
import { inviteTeamUser, upsertProfessional } from "@/app/actions/team";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { formAction } from "@/lib/utils";

export default async function EquipePage() {
  const { session } = await requireTenant();
  const [professionals, users] = await Promise.all([
    prisma.professional.findMany({ where: { tenantId: session.tenantId }, include: { user: true } }),
    prisma.user.findMany({ where: { tenantId: session.tenantId } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Equipe</h1>
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
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl">Novo profissional</h2>
          <form action={formAction(upsertProfessional)} className="mt-4 grid gap-3">
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
              <Input name="color" type="color" defaultValue="#9B1D3A" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início">
                <Input name="workStart" type="time" defaultValue="09:00" />
              </Field>
              <Field label="Fim">
                <Input name="workEnd" type="time" defaultValue="19:00" />
              </Field>
            </div>
            <Button>Salvar profissional</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Acesso ao sistema</h2>
          <div className="mt-3 space-y-2 text-sm">
            {users.map((u) => (
              <div key={u.id} className="flex justify-between">
                <span>{u.name}</span>
                <span className="text-ink-soft">{ROLE_LABEL[u.role as Role] ?? u.role}</span>
              </div>
            ))}
          </div>
          <form action={formAction(inviteTeamUser)} className="mt-4 grid gap-3">
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
            <Button>Criar usuário</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
