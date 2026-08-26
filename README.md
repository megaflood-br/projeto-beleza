# MegaBeauty

CRM e agenda para salões de beleza, barbearias e clínicas de estética — inspirado na experiência da Belasis, com **multi-tenant**, TypeScript e integrações de IA e WhatsApp.

## O que já existe

- Agenda visual por profissional (colunas, status coloridos, conflito de horário)
- Agendamento online público (`/agendar/[slug]`)
- CRM de clientes com histórico e tags
- Serviços, equipe, papéis (proprietário, gerente, recepção, profissional)
- Estoque com baixa automática ao concluir atendimento
- Comandas (criar a partir do agendamento, itens, fechamento e pagamento)
- Comissões por profissional/serviço
- Financeiro (entradas, saídas, Pix/cartão/dinheiro)
- Inbox WhatsApp + Evolution API (envio real ou modo demo)
- Assistente de IA (OpenAI quando houver chave; fallback local)
- Dois tenants no seed para provar isolamento de dados

## Stack (recomendação)

| Camada | Escolha | Por quê |
| --- | --- | --- |
| App | **Next.js 16 (App Router) + TypeScript** | UI, API e server actions no mesmo repo |
| Banco | **Prisma + SQLite** no desenvolvimento; **PostgreSQL** em produção | SQLite sobe em um comando; Postgres escala multi-tenant |
| Auth | Cookie httpOnly + JWT (`jose`) + bcrypt | Simples, multi-tenant no token |
| UI | Tailwind CSS 4 | Visual de salão (creme, vinho, dourado) |
| WhatsApp | **Evolution API v2** | Padrão brasileiro, webhook por tenant |
| IA | **OpenAI** (`gpt-4o-mini`) | Insights, rascunho de mensagem, chat operacional |
| Testes | Vitest | Regras de comissão, conflito de agenda, estoque e isolamento |

Para produção, o caminho natural é: **Vercel ou Docker + PostgreSQL gerenciado (Neon/RDS) + Redis para fila de lembretes**. A coluna `tenantId` em todas as tabelas de negócio é o modelo de isolamento (shared schema). Quando o volume crescer, dá para evoluir para schema-per-tenant no Postgres sem reescrever o domínio.

## Como rodar

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Conta demo

- E-mail: `iris.p@example.org`
- Senha: `demo1234`
- Salão: Studio Aurora
- Link público: `/agendar/studio-aurora`

Um segundo tenant (`alice.j@example.com` / `demo1234`) existe só para isolamento — os clientes do Aurora não aparecem nele.

### Variáveis

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="..."
OPENAI_API_KEY=""          # opcional; também pode ir em Configurações por salão
EVOLUTION_API_URL=""       # opcional
EVOLUTION_API_KEY=""
```

Webhook Evolution: `POST /api/webhooks/evolution?tenant=studio-aurora`

## Scripts

- `npm run dev` — ambiente local
- `npm test` — testes de domínio
- `npm run db:reset` — recria o banco e o seed
- `npm run lint` / `npm run build`

## Próximos módulos naturais

Pagamentos (Pix/maquininha), NF-e, app do profissional, campanhas de recuperação, fila de lembretes 24h, importação de planilha e painel super-admin da plataforma.
