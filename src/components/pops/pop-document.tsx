import type { ReactNode } from "react";
import { fillPopText, popDisclaimer, popSignerLabel, type PopTemplate, type SalonCompany } from "@/lib/pops";

export type PopDocumentModel = {
  title: string;
  code: string;
  revision: number;
  responsible: string;
  registry?: string;
  products: string;
  frequency: string;
  notes: string;
  serviceName?: string | null;
  updatedAt: string;
};

export function PopDocument({
  company,
  pop,
  template,
  qr,
  publicUrl,
}: {
  company: SalonCompany;
  pop: PopDocumentModel;
  template: PopTemplate;
  qr?: string;
  publicUrl?: string;
}) {
  const vars = {
    salao: company.tradeName || company.legalName,
    servico: pop.serviceName || template.area,
    empresa: company.legalName,
  };
  const signerLabel = popSignerLabel(template.signer);
  const technical = template.signer === "TECHNICAL";

  return (
    <article className="print-root rounded-2xl bg-white px-8 py-10 text-slate-900 shadow-2xl print:rounded-none print:px-0 print:py-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase">Procedimento operacional padrão</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{pop.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pop.code} · Revisão {pop.revision} · {template.area} · {signerLabel}
          </p>
        </div>
        {qr ? (
          <div className="shrink-0 text-center">
            <img src={qr} alt="QR Code do POP" className="mx-auto h-28 w-28" />
            <p className="mt-1 max-w-28 text-[10px] leading-tight text-slate-500">Consulte pelo QR</p>
          </div>
        ) : null}
      </header>

      <section className="mt-5 grid gap-1 text-sm">
        <p>
          <span className="font-medium text-slate-500">Razão social:</span> {company.legalName}
        </p>
        {company.tradeName !== company.legalName ? (
          <p>
            <span className="font-medium text-slate-500">Nome fantasia:</span> {company.tradeName}
          </p>
        ) : null}
        <p>
          <span className="font-medium text-slate-500">CNPJ:</span> {company.document || "—"}
          {company.ie ? ` · IE ${company.ie}` : ""}
          {company.im ? ` · IM ${company.im}` : ""}
        </p>
        <p>
          <span className="font-medium text-slate-500">Endereço:</span>{" "}
          {[company.address, company.city, company.uf, company.zip].filter(Boolean).join(" · ") || "—"}
        </p>
        <p>
          <span className="font-medium text-slate-500">Contato:</span>{" "}
          {[company.phone !== "—" ? company.phone : "", company.email].filter(Boolean).join(" · ") || "—"}
        </p>
        <p>
          <span className="font-medium text-slate-500">{signerLabel}:</span> {pop.responsible || "—"}
          {technical && pop.registry ? ` · ${pop.registry}` : ""}
        </p>
        <p>
          <span className="font-medium text-slate-500">Periodicidade:</span> {fillPopText(pop.frequency || template.defaultFrequency, vars)}
        </p>
      </section>

      <Section title="1. Objetivo">{fillPopText(template.objective, vars)}</Section>
      <Section title="2. Aplicação">{fillPopText(template.application, vars)}</Section>
      <Section title="3. Materiais e produtos">{fillPopText(pop.products || template.defaultProducts, vars)}</Section>
      <Section title="4. Procedimento">
        <ol className="list-decimal space-y-1 pl-5">
          {template.steps.map((step) => (
            <li key={step}>{fillPopText(step, vars)}</li>
          ))}
        </ol>
      </Section>
      <Section title="5. Higienização">
        <ul className="list-disc space-y-1 pl-5">
          {template.hygiene.map((item) => (
            <li key={item}>{fillPopText(item, vars)}</li>
          ))}
        </ul>
      </Section>
      <Section title="6. Descarte de resíduos">
        <ul className="list-disc space-y-1 pl-5">
          {template.disposal.map((item) => (
            <li key={item}>{fillPopText(item, vars)}</li>
          ))}
        </ul>
      </Section>
      <Section title="7. Registros">
        <ul className="list-disc space-y-1 pl-5">
          {template.records.map((item) => (
            <li key={item}>{fillPopText(item, vars)}</li>
          ))}
        </ul>
      </Section>
      {pop.notes ? <Section title="8. Observações do estabelecimento">{pop.notes}</Section> : null}
      <Section title={pop.notes ? "9. Referências" : "8. Referências"}>
        <ul className="list-disc space-y-1 pl-5 text-slate-600">
          {template.references.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <section className="mt-10 break-inside-avoid">
        <h2 className="text-sm font-semibold tracking-wide text-slate-800 uppercase">Aprovação</h2>
        <p className="mt-2 text-sm text-slate-600">
          {company.city ? `${company.city}${company.uf ? `/${company.uf}` : ""}, ` : ""}
          data: ______ / ______ / __________
        </p>
        <div className="mt-8 max-w-sm">
          <div className="border-t border-slate-800 pt-2 text-sm">
            <p className="font-medium">{pop.responsible || "Nome: ________________________________"}</p>
            <p className="text-slate-600">{signerLabel}</p>
            {technical ? (
              <p className="text-slate-600">Registro profissional: {pop.registry || "________________"}</p>
            ) : (
              <p className="text-slate-600">{company.legalName}</p>
            )}
            <p className="mt-6 text-slate-500">Assinatura</p>
          </div>
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-slate-500">
        {popDisclaimer(template.signer)} Última atualização: {pop.updatedAt}.
        {publicUrl ? ` Consulta: ${publicUrl}` : ""}
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold tracking-wide text-slate-800 uppercase">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
