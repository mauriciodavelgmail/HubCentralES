# Guia de Deployment - HubCentral ES+

## 1. Preparação Vercel

### 1.1 Criar Conta Vercel
- Acessar https://vercel.com
- Sign up with GitHub
- Autorizar acesso ao repositório

### 1.2 Configurar Projeto
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy inicial
vercel
# Responder às perguntas de configuração

# Setup production
vercel --prod
```

## 2. Configuração de Variáveis de Ambiente

No dashboard Vercel:
1. Ir para Settings → Environment Variables
2. Adicionar as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=https://ulorhnkrgnepghifctae.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_8ttJPjsVjxC-P8cK-GOswA_lBRa3KVV
SUPABASE_SERVICE_ROLE_KEY=[sua chave de serviço]
DATABASE_URL=postgresql://postgres:[senha]@db.ulorhnkrgnepghifctae.supabase.co:5432/postgres
```

### Selecionar Ambientes
- Development (when deploying to staging)
- Preview (for PR deployments)
- Production (for main branch)

## 3. Build e Deploy

### Build Local (teste antes de subir)
```bash
npm run build
npm start
# Acessar http://localhost:3000
```

### Deploy no Vercel
```bash
# Push para main branch no GitHub
git add .
git commit -m "Deploy HubCentral ES+"
git push origin main

# Vercel faz deploy automaticamente
# Acompanhar em https://vercel.com/dashboard
```

## 4. Configuração do Banco Supabase

### 4.1 Executar Migrations
```bash
# Via Supabase CLI
supabase migration up

# Ou manualmente:
# 1. Copiar conteúdo de supabase/migrations/001_initial_schema.sql
# 2. Acessar SQL Editor do Supabase
# 3. Colar e executar o SQL
```

### 4.2 Seed com Dados Demo
```bash
# 1. Copiar conteúdo de supabase/migrations/002_seed_data.sql
# 2. Acessar SQL Editor do Supabase
# 3. Colar e executar o SQL
```

### 4.3 Configurar Storage Buckets
Acessar Storage → Create Bucket

Criar buckets:
- `documents` (Public)
- `occurrences` (Private)
- `events` (Private)
- `equipments` (Private)

## 5. Configurar CORS Supabase

Settings → API Configuration → Allowed origins

Adicionar:
```
http://localhost:3000
https://seu-dominio.vercel.app
https://seu-dominio-customizado.com
```

## 6. RLS (Row Level Security)

Já incluído no schema.sql automaticamente.

Verificar em:
- Database → Tables → Policies

Devem estar todas habilitadas.

## 7. Domínio Customizado

### 7.1 Registrar Domínio
- Ir para Vercel Project Settings
- Domains
- Add Domain

### 7.2 Apontar DNS
No provedor de DNS:
```
CNAME seu-dominio.com -> cname.vercel-dns.com
```

### 7.3 Validar e Ativar
Vercel valida automaticamente após DNS propagação (até 24h).

## 8. SSL e Segurança

✅ Vercel fornece SSL automático
✅ HSTS habilitado por padrão
✅ Security headers configurados

Verificar em Project → Settings → Security

## 9. Monitoramento

### 9.1 Vercel Analytics
- Project → Settings → Analytics
- Ativar monitoramento de performance

### 9.2 Supabase Logs
- Dashboard → Project → Logs
- SQL Editor queries
- Real-time activity

### 9.3 Error Tracking
Erros aparecem em:
- Vercel Functions
- Logs do servidor

## 10. Backup e Recuperação

### 10.1 Backup Supabase
Automático diariamente.

Acessar em:
- Database → Backups

### 10.2 Restore
Em caso de problema:
1. Ir para Backups
2. Selecionar ponto de restauração
3. Confirm restore

## 11. CI/CD Pipeline

Verificar no GitHub:
- Actions → Workflows

Sugestão para adicionar:
```yaml
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: vercel/action@master
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 12. Performance Optimization

### 12.1 Images
```bash
# Usar next/image
<Image src="..." alt="..." />
```

### 12.2 Code Splitting
Automático no Next.js com App Router.

### 12.3 Caching
Headers já configurados em vercel.json (se existir).

### 12.4 Database Queries
- Usar indexes (incluído em schema.sql)
- Pagination para grandes datasets
- Connection pooling no Supabase

## 13. Troubleshooting

### Erro: "NEXT_PUBLIC_SUPABASE_URL is not defined"
- Verificar variáveis de ambiente no Vercel
- Confirmar naming correto
- Rebuild do deploy

### Erro: "RLS Policy violation"
- Verificar autenticação do usuário
- Confirmar token JWT válido
- Verificar RLS policies em Supabase

### Erro: "Database connection failed"
- Verificar DATABASE_URL
- Confirmar IP Vercel na whitelist Supabase
- Testar connection string localmente

### Erro: "Static generation exceeded timeout"
- Problemas com build
- Verificar função estática que demora muito
- Usar ISR (Incremental Static Regeneration)

## 14. Rollback

Se houver problema:
```bash
# Vercel mantém histórico de deploys
# Ir para Deployments → Selecionar anterior
# Clicar em Redeploy ou Promote to Production
```

## 15. Checklist Pré-Deploy

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Build local testado (`npm run build`)
- [ ] Todas as páginas responsivas testadas
- [ ] Database migrations executadas
- [ ] Seed data carregado
- [ ] RLS policies ativas
- [ ] Storage buckets criados
- [ ] CORS configurado
- [ ] Email de teste funcionando
- [ ] Git sincronizado

## 16. Monitoramento Pós-Deploy

### Primeira Hora
- [ ] Acessar aplicação pelo URL
- [ ] Fazer login
- [ ] Testar CRUD básico
- [ ] Verificar console do navegador (sem erros)

### Primeiro Dia
- [ ] Monitorar Vercel Analytics
- [ ] Verificar logs de erro
- [ ] Confirmar emails enviando (se aplicável)
- [ ] Performance das queries

## 17. Suporte e Escalabilidade

### Escalar Supabase
Se máximo de conexões atingido:
- Aumentar plano Supabase
- Configurar pg_bounce em Supabase Pro+
- Otimizar queries

### Escalar Vercel
Automático com plano Pro+.

Multi-region deployment:
- Vercel Pro → Analytics → Regions

## Contato de Suporte

- **Vercel**: support@vercel.com, https://vercel.com/support
- **Supabase**: support@supabase.io, https://supabase.com/docs
- **GitHub**: Issues no repositório

---

**Parabéns! HubCentral ES+ está em produção! 🚀**
