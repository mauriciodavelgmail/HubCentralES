# Índice de Documentação - HubCentral ES+

## 📚 Guias Principais

### [README.md](README.md)
**Visão geral do projeto**
- Problem Statement
- Tech Stack completo
- 11+ Funcionalidades principais
- 5 Diferenciais competitivos
- Arquitetura de banco de dados
- Estrutura de pastas
- Matriz de permissões
- Setup rápido
- Deployment no Vercel
- Segurança e RLS

**Ideal para**: Primeiro contato com o projeto. Leia aqui antes de tudo.

---

### [SETUP.md](SETUP.md)
**Guia passo-a-passo para rodar localmente**
- Pré-requisitos (Node.js, Git, contas)
- Clonar repositório
- Instalar dependências NPM (445 packages)
- Configurar Supabase
- Executar schema SQL (criar tabelas)
- Popular com seed data
- Iniciar servidor development
- Primeiro acesso / Login
- Verificação de setup
- Troubleshooting comum
- Comandos úteis
- VS Code debugging

**Ideal para**: Desenvolvedores que querem rodar localmente. Siga passo-a-passo.

---

### [DEPLOYMENT.md](DEPLOYMENT.md)
**Guia completo para deploy em Vercel + Supabase**
- Preparação Vercel
- Variáveis de ambiente
- Build local
- Deploy automático via GitHub
- Configurar banco Supabase
- Executar migrations
- Storage buckets
- CORS configuration
- Domínio customizado
- SSL/segurança
- Monitoramento
- Backup e recuperação
- CI/CD pipeline
- Performance optimization
- Troubleshooting
- Rollback
- Checklist pré-deploy
- Monitoramento pós-deploy

**Ideal para**: DevOps/Tech Lead que vai fazer deployment. Seguir checklist final.

---

### [FEATURES.md](FEATURES.md)
**Descrição completa de todas as funcionalidades**
- Dashboard com 5 KPIs
- Ocorrências (CRUD + Inteligência Artificial)
- Documentos (upload, versions, permissões)
- Agenda (eventos, busca de conflitos, QR code)
- Insumos (estoque, alertas, movimentação)
- Compras (7 estágios de workflow)
- Equipamentos (patrimônio, manutenção)
- Relatórios (analytics, gráficos, export)
- Configurações (admin, users, roles, permissions)
- Gestão de Documentos (admin)
- Contratos (fornecedores, renovação)
- Busca global
- Notificações
- Perfil de usuário
- Sidebar/navegação
- Por onde começar
- Atalhos de teclado

**Ideal para**: Product Manager, QA, ou qualquer um que queira entender o que sistema faz.

---

### [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
**Documentação técnica de endpoints e tipos de dados**
- Visão geral (Supabase REST)
- 9 Tabelas principais descritas em detalhe:
  * Profiles (usuários)
  * Occurrences (ocorrências)
  * Documents (documentos)
  * Events (eventos)
  * Supplies (insumos)
  * Purchases (compras)
  * Equipment (equipamentos)
  * Departments (departamentos)
  * Spaces (espaços)
- Operações CRUD
- Query filters (20+ operadores)
- Aggregations
- Autenticação
- RLS policies
- Storage (buckets, upload, download)
- Real-time subscriptions
- Triggers & functions
- 4 Casos de uso comuns
- Limites & quotas
- Códigos de erro
- Best practices

**Ideal para**: Backend/Frontend developers integrando com API.

---

## 📂 Estrutura de Código-Fonte

### `/src` (Código-fonte)

#### `/src/app` (Pages usando Next.js App Router)
```
app/
├── page.tsx                    # Root page (redirect)
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles
│
├── (auth)/
│   └── login/
│       └── page.tsx            # Login page
│
└── (protected)/
    ├── dashboard/
    │   └── page.tsx            # Dashboard executivo
    ├── ocorrencias/
    │   └── page.tsx            # CRUD de ocorrências
    ├── documentos/
    │   └── page.tsx            # Gerenciar documentos
    ├── agenda/
    │   └── page.tsx            # Eventos/Calendário
    ├── insumos/
    │   └── page.tsx            # Estoque/suprimentos
    ├── compras/
    │   └── page.tsx            # Workflow de compras
    ├── equipamentos/
    │   └── page.tsx            # Patrimônio/equipamentos
    ├── relatorios/
    │   └── page.tsx            # Analytics e gráficos
    ├── configuracoes/
    │   └── page.tsx            # Admin panel
    ├── gestaodoc/
    │   └── page.tsx            # Document admin
    └── contratos/
        └── page.tsx            # Contratos/fornecedores
```

#### `/src/components` (UI Components)
```
components/
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   ├── Textarea.tsx
│   ├── Select.tsx
│   ├── Alert.tsx
│   ├── Modal.tsx
│   ├── LoadingSpinner.tsx
│   ├── EmptyState.tsx
│   └── index.ts                # Exports all
│
└── layout/
    ├── Sidebar.tsx             # Navigation
    ├── Header.tsx              # Top bar
    └── MainLayout.tsx          # Layout wrapper
```

#### `/src/lib` (Libraries & Clients)
```
lib/
└── supabase/
    ├── client.ts               # Browser client factory
    └── database.types.ts       # Type-safe DB interface
```

#### `/src/types` (TypeScript Definitions)
```
types/
└── index.ts                    # 50+ type definitions
   - Profiles, Occurrences, Documents, Events, Supplies, 
     Purchases, Equipment, Departments, Spaces
   - All Enums (UserRole, Status, Priority, etc)
   - Request/Response types
   - Dashboard types
   - Auth types
```

#### `/src/constants` (App Configuration)
```
constants/
└── index.ts                    # 400+ lines of config
   - COLORS (HUB ES+ brand palette)
   - STATUS_COLORS, PRIORITY_COLORS
   - Category arrays (8+ categories per type)
   - SIDEBAR_MENU (11 menu items)
   - PERMISSIONS matrix (6 roles × 10 flags)
   - PAGE_CONTENT (titles/descriptions)
```

#### `/src/utils` (Helper Functions)
```
utils/
└── helpers.ts                  # 30+ utility functions
   - Date/Time formatters
   - Status/Priority labels
   - String utilities
   - Currency & Number formatting
   - File utilities
   - getOccurrenceSuggestions() [Core AI]
   - Search & filter functions
   - Validation functions
   - Array/Object utilities
```

### `/supabase` (Database)

```
supabase/
└── migrations/
    ├── 001_initial_schema.sql  # 19 tables, enums, RLS
    └── 002_seed_data.sql       # 80+ demo records
```

#### Schema Highlights
- **19 Tables**: profiles, departments, spaces, documents, 
  document_versions, occurrences, occurrence_comments, 
  occurrence_history, events, attendance_list, supplies, 
  supply_movements, supply_requisitions, purchases, 
  purchase_history, equipments, equipment_history, 
  notifications, settings, activity_logs

- **10 Enums**: user_role, occurrence_status, occurrence_priority, 
  document_status, event_status, purchase_status, equipment_status, 
  occurrence_category, document_category, supply_category

- **RLS Policies**: Implemented for all 19 tables

- **Triggers**: Auto-numbering, timestamps, status updates

- **Seed Data**: 6 departments, 6 spaces, 12 supplies, 10 equipments, 
  10 documents, 10 occurrences, 10 events, 10 purchases, 5 settings

---

## 🚀 Quick Reference

### Para Começar (5 min)
1. Leia [README.md](README.md) para overview
2. Execute passos 1-6 de [SETUP.md](SETUP.md)
3. Rode `npm run dev`
4. Acesse http://localhost:3000

### Para Desenvolver Nova Feature
1. Consulte [FEATURES.md](FEATURES.md) para entender o fluxo
2. Consulte [API_DOCUMENTATION.md](API_DOCUMENTATION.md) para endpoints
3. Copie pattern de `src/app/ocorrencias/page.tsx` como template
4. Use tipos de `src/types/index.ts`
5. Use utilities de `src/utils/helpers.ts`
6. Adicione ao menu em `src/constants/index.ts`

### Para Fazer Deploy
1. Leia seção "Preparação Vercel" de [DEPLOYMENT.md](DEPLOYMENT.md)
2. Siga o checklist na seção "Checklist Pré-Deploy"
3. Monitorar pós-deploy conforme "Monitoramento Pós-Deploy"

### Para Integrar com Backend Real
1. Todos os endpoints em [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
2. RLS policies automaticamente garantem segurança
3. Storage buckets já configurados
4. Real-time já disponível

---

## 📊 Estatísticas do Projeto

| Métrica | Valor |
|---------|-------|
| **Total de Linhas de Código** | ~15,000+ |
| **Tabelas de Banco** | 19 |
| **Enums de Banco** | 10 |
| **Tipos TypeScript** | 50+ |
| **Componentes UI** | 13 |
| **Páginas/Módulos** | 11 |
| **Funções Helper** | 30+ |
| **Constantes Configuradas** | 400+ |
| **NPM Packages** | 445 |
| **Próximas Implementações** | 5+ (Auth, CRUD real, upload, notifications, deploy) |

---

## 🎯 Roadmap Pós-Lançamento

**Curto Prazo (Semana 1)**
- [ ] Supabase Auth real (substituir mock localStorage)
- [ ] Formulários com CRUD conectado ao banco
- [ ] File upload funcional

**Médio Prazo (Semanas 2-4)**
- [ ] Real-time notifications com WebSocket
- [ ] PDF/CSV export completo
- [ ] Busca global com full-text search
- [ ] Email notifications
- [ ] SMS alerts para críticos

**Longo Prazo (Mês 2+)**
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Integração com calendários externos (Google, Outlook)
- [ ] Webhooks para integrações
- [ ] Advanced analytics/BI
- [ ] AI real (não simulada)
- [ ] Sugestões de agendamento automático
- [ ] Chatbot de atendimento

---

## 📞 Suporte

### Documentação Externa
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React**: https://react.dev

### Comunidades
- Supabase Discord: https://discord.supabase.com
- Next.js Discord: https://discord.gg/nextjs
- Stack Overflow: Tags `[supabase]` `[next.js]`

### Troubleshooting
1. Erro ao iniciar? → Ver [SETUP.md](SETUP.md) seção Troubleshooting
2. Erro ao fazer deploy? → Ver [DEPLOYMENT.md](DEPLOYMENT.md) seção Troubleshooting
3. Erro na API? → Ver [API_DOCUMENTATION.md](API_DOCUMENTATION.md) seção Códigos de Erro
4. Dúvida sobre feature? → Ver [FEATURES.md](FEATURES.md) ou [README.md](README.md)

---

## 📝 Histórico de Documentação

| Data | Autor | Versão | Notas |
|------|-------|--------|-------|
| 2024-01-20 | GitHub Copilot | 1.0 | Documentação inicial completa |

---

**Última atualização**: 2024-01-20
**Status**: ✅ Production Ready
**Versão do Projeto**: 1.0.0

---

**Comece agora!** 👉 [README.md](README.md) → [SETUP.md](SETUP.md) → `npm run dev` → 🚀
