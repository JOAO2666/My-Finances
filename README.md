# Moneta — gestão financeira com IA

Aplicação web de finanças pessoais **gratuita** e pronta para a **Vercel**, inspirada no assistente **Pierre** (finanças por conversa) e no **Minhas Finanças** (orçamento por categoria, contas a pagar, sincronização multi-dispositivo).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Turso (libSQL, banco serverless) · Gemini API (chave do próprio usuário) · jsPDF · ExcelJS · Recharts.

## O que o app faz

| Recurso | Detalhes |
|---|---|
| **Cadastro e login** | E-mail + senha (bcrypt), sessão em cookie `httpOnly` assinado (JWT/HS256, 30 dias), rate‑limit básico, troca de senha e exclusão de conta. |
| **Persistência/sincronização** | Todos os dados ficam no banco serverless (Turso). Entre no mesmo usuário em qualquer dispositivo. |
| **Painel** | Receitas, despesas, saldo realizado × previsto, gráfico por categoria, últimos 6 meses, contas a pagar/atrasadas, alertas de orçamento. |
| **Lançamentos** | CRUD, filtros (busca/tipo/situação), navegação por mês, marcar pago/recebido com 1 clique. |
| **Orçamentos** | Limite mensal por categoria, barra de progresso (verde → amarelo ≥80% → vermelho ≥100%). |
| **Dívidas** | Saldo devedor, progresso, vencimento, registro de pagamento (gera a despesa automaticamente). |
| **Chave Google (BYOK)** | Em *Configurações*, cada usuário informa a própria chave Gemini; ela é validada, **criptografada (AES‑256‑GCM)** e nunca volta ao navegador. |
| **Leitura de prints (OCR/IA)** | Arraste/cole (Ctrl+V) prints de faturas, boletos, contas e dívidas (imagem ou PDF). O Gemini extrai **valor, vencimento, descrição, emissor, categoria** e o app **registra sozinho** (com *Desfazer*, prevenção de duplicatas e modo de revisão opcional). |
| **Assistente em chat** | “Gastei 45 no mercado” registra o lançamento; “quanto gastei com delivery?” responde com base nos seus dados. |
| **Relatórios** | Exportação por período em **PDF** (resumo, categorias, orçamentos, dívidas, lançamentos) e **Excel .xlsx** (5 abas com formatação monetária). |

## Rodando localmente

```bash
npm install
cp .env.example .env.local      # edite APP_SECRET
npm run dev                     # http://localhost:3000
```

Sem `TURSO_DATABASE_URL`, o app usa um SQLite local em `./data/moneta.db` (criado e migrado automaticamente).

## Deploy na Vercel (passo a passo)

### 1. Crie o banco gratuito (Turso)

```bash
# instale a CLI: https://docs.turso.tech/cli/installation
turso auth signup
turso db create moneta
turso db show moneta --url            # -> TURSO_DATABASE_URL (libsql://...)
turso db tokens create moneta         # -> TURSO_AUTH_TOKEN
```

(Ou pelo painel web em https://turso.tech.) As tabelas são criadas automaticamente no primeiro acesso.

### 2. Suba o código para o GitHub

```bash
git init && git add . && git commit -m "Moneta"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/moneta.git
git push -u origin main
```

### 3. Importe na Vercel

1. https://vercel.com/new → **Import** do repositório (framework detectado: Next.js).
2. Em **Environment Variables** adicione:

| Variável | Valor |
|---|---|
| `APP_SECRET` | string aleatória longa — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TURSO_DATABASE_URL` | `libsql://moneta-<seu-usuario>.turso.io` |
| `TURSO_AUTH_TOKEN` | token gerado acima |

3. **Deploy**. A cada `git push` na `main` a Vercel faz o deploy contínuo (e previews para PRs).

> ⚠️ **Não troque o `APP_SECRET` depois**: ele assina as sessões e criptografa as chaves Gemini; ao trocar, os usuários precisarão logar e cadastrar a chave de novo.

### 4. Usar a IA

Cada usuário gera uma chave gratuita em https://aistudio.google.com/apikey e cola em **Configurações → Chave de API do Google**. O modelo padrão é `gemini-2.5-flash` (editável).

## Estrutura

```
src/
├─ app/
│  ├─ page.tsx, login/, register/       # landing + autenticação
│  ├─ (app)/                            # área logada (layout com requireUser)
│  │  ├─ dashboard/ lancamentos/ orcamentos/ dividas/
│  │  ├─ importar/ assistente/ relatorios/ configuracoes/
│  └─ api/                              # route handlers (auth, transactions, budgets, debts,
│                                       #   categories, ocr, assistant, export/[format], settings, account)
├─ components/                          # UI (charts, dialogs, listas, importação, chat, etc.)
└─ lib/
   ├─ db.ts          # cliente libSQL + schema idempotente
   ├─ auth.ts        # sessão JWT, bcrypt, rate limit
   ├─ crypto.ts      # AES-256-GCM p/ chave Gemini
   ├─ gemini.ts      # cliente REST do Gemini (JSON estruturado)
   ├─ ocr.ts         # prompt/schema de extração + gravação
   ├─ repo.ts        # consultas e regras de negócio
   ├─ report.ts, export-pdf.ts, export-xlsx.ts
   └─ api.ts, client.ts, format.ts, categories.ts
```

## Notas de segurança e limites

- Senhas com bcrypt (custo 11); cookie `httpOnly`, `sameSite=lax`, `secure` em produção.
- Todas as consultas filtram por `user_id`; categorias referenciadas são validadas como pertencentes ao usuário.
- Prints são enviados direto ao Gemini e **não são armazenados**. O navegador reduz imagens grandes (≤ 2000 px) para respeitar o limite de 4,5 MB de corpo da Vercel.
- O rate‑limit é em memória (por instância serverless) — suficiente para uso pessoal; para uso público em escala, troque por Upstash/Redis.
- Valores monetários são guardados em centavos (inteiros).
- A cota gratuita da API Gemini é do próprio usuário; erros de cota/chave aparecem com mensagem amigável.
