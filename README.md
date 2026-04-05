# ⚡ Content Engine

Plataforma pessoal de geração de conteúdo com AI que aprende seu tom de voz.

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **AI:** Claude API (Sonnet 4) via Anthropic SDK
- **Database:** localStorage (MVP) → Supabase (produção)
- **Deploy:** Vercel

## Setup rápido

```bash
# 1. Clone e instale
git clone <repo>
cd content-engine
npm install

# 2. Configure as variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com sua ANTHROPIC_API_KEY

# 3. Rode local
npm run dev
```

Acesse `http://localhost:3000`

## Deploy na Vercel

1. Push pro GitHub
2. Conecte na Vercel
3. Adicione `ANTHROPIC_API_KEY` nas Environment Variables
4. Deploy

## Migração pra Supabase

Quando quiser persistir dados no servidor (ao invés de localStorage):

1. Crie um projeto no [supabase.com](https://supabase.com)
2. Rode o SQL em `supabase/migration.sql` no SQL Editor
3. Adicione as variáveis do Supabase no `.env.local`
4. Atualize o hook `useContentEngine` pra usar o client Supabase

## Funcionalidades

### Fase 1 (✅ completa)
- [x] Geração de conteúdo multi-canal (LinkedIn, X, Instagram)
- [x] Sistema de voice learning por feedback
- [x] Fila de revisão com edição inline
- [x] Análise de diff para extração de regras
- [x] Voice Profile com regras, anti-patterns e vocabulário
- [x] Pesquisa de temas com web search
- [x] Objetivos estratégicos por período

### Fase 2 (✅ completa)
- [x] Geração de imagens (Flux Pro / Replicate)
- [x] Gerador de carrosséis com preview e edição inline
- [x] Integração LinkedIn API (OAuth + métricas)
- [x] Integração Instagram Graph API (OAuth + métricas)
- [x] Input manual de métricas (fallback)
- [x] Dashboard de analytics com AI (padrões, recomendações)
- [x] Sugestões de voice profile baseadas em performance

### Fase 3
- [ ] Posting automático (Ayrshare)
- [ ] Relatório semanal com AI
- [ ] A/B testing de variações
