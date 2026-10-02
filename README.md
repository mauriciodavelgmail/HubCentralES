# HubCentral ES+ - Gestão Integrada do HUB ES+

## 🚀 Descrição da Solução

**HubCentral ES+** é uma plataforma web moderna, 100% responsiva e pronta para demonstração. Ela centraliza a gestão operacional, documental e administrativa do HUB ES+, resolvendo descentralização de dados, retrabalho, perda de rastreabilidade e falhas de comunicação.

## 🎯 Problema Resolvido

O HUB ES+ enfrentava:
- Descentralização de dados
- Retrabalho por falta de integração
- Perda de rastreabilidade
- Falhas de comunicação
- Ausência de indicadores

## 💻 Stack Técnica

- **Frontend**: Next.js 16+ (App Router)
- **Linguagem**: TypeScript
- **Styling**: Tailwind CSS 
- **BD**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth + RLS
- **Gráficos**: Recharts
- **Formulários**: React Hook Form
- **Validação**: Zod
- **UI Icons**: Lucide React
- **Hospedagem**: Vercel

## ✨ Funcionalidades Principais

1. **Dashboard Executivo** - KPIs, gráficos, alertas
2. **Ocorrências** - Registro com IA simulada
3. **Documentos** - Upload centralizado, versionamento
4. **Agenda** - Calendario de eventos e espaços
5. **Insumos** - Controle de estoque com alertas
6. **Compras** - Fluxo completo: solicitação → conclusão
7. **Patrimônio** - Equipamentos com histórico
8. **Relatórios** - Indicadores e análise
9. **Notificações** - Em tempo real
10. **Administração** - Usuários, permissões, configurações

## 🏗️ Arquitetura

```
src/
├── app/              # Rotas Next.js
├── components/       # UI Components
├── lib/              # Supabase, utils
├── types/            # TypeScript types
├── constants/        # Dados constantes
└── services/         # APIs
```

## 🚀 Como Rodar

```bash
# Instalar dependências
npm install

# Configurar variáveis (.env.local)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Rodar servidor
npm run dev

# Acessar http://localhost:3000
```

## 🔐 Configuração Supabase

1. Criar projeto em supabase.com
2. Executar schema: `supabase/migrations/001_initial_schema.sql`
3. Seed data: `supabase/migrations/002_seed_data.sql`
4. Criar storage buckets: documents, occurrences, events

## 👥 Usuários de Demo

Use qualquer email/senha para testar. Sistema aceita ambos.

Sugestões: admin@hub.es, visitante@hub.es

## 🎬 Roteiro de Demonstração

1. Login → Dashboard com KPIs
2. Criar ocorrência → Ver sugestão IA
3. Visualizar agenda → Conflitos automáticos
4. Upload documento → Categorização
5. Relatório → Exportar CSV

## 📱 Recursos

- ✅ Totalmente responsivo
- ✅ Mobile-first design
- ✅ RLS no banco
- ✅ Validação Zod
- ✅ Feedback visual
- ✅ Sem erros TypeScript
- ✅ Código modular
- ✅ Audit trail completo

## 🚢 Deploy Vercel

```bash
git push origin main
# Conectar no Vercel, adicionar env vars
# Deploy automático ao push
```

## 📊 Banco de Dados

Tabelas principais:
- profiles, departments, spaces
- documents, document_versions
- occurrences, occurrence_history
- events, attendance_list
- supplies, supply_movements
- purchases, purchase_history
- equipments, equipment_history
- notifications, activity_logs

## 🔒 Segurança

- RLS Policies configuradas
- Autenticação Supabase Auth
- Validação com Zod
- Sanitização de inputs
- Audit trail completo

## 📝 Próximas Melhorias

- IA real (OpenAI)
- Email (SendGrid)
- Dark mode
- PDF/Excel export
- Mobile app
- Webhooks
- Templates

---

**Desenvolvido com ❤️ para o HUB ES+**
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
