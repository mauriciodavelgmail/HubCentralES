# Troubleshooting & FAQ - HubCentral ES+

## 🆘 Perguntas Frequentes

### Desenvolvimento Local

#### P: "npm install" falha com erro de permissão
**R:**
```bash
# Solução 1: Limpar cache npm
npm cache clean --force

# Solução 2: Usar --legacy-peer-deps (Next.js compat)
npm install --legacy-peer-deps

# Solução 3: Aumentar memória (Node.js)
export NODE_OPTIONS="--max-old-space-size=4096"
npm install

# Solução 4: Usar yarn
npm install -g yarn
yarn install
```

#### P: Porta 3000 já está em uso
**R:**
```bash
# Opção 1: Usar porta diferente
npm run dev -- -p 3001

# Opção 2: Matar processo usando port 3000
# Windows PowerShell
Get-Process | Where-Object { $_.Port -eq 3000 } | Stop-Process -Force
netstat -ano | findstr :3000  # Ver PID
taskkill /PID [PID] /F

# Linux/Mac
lsof -i :3000
kill -9 [PID]

# ou
npx kill-port 3000
```

#### P: Erro "Cannot find module 'next'"
**R:**
```bash
# Limpar node_modules
rm -rf node_modules
npm ci  # Clean install (recomendado ao invés de npm install)
npm run dev
```

#### P: Erro de tipos TypeScript
**R:**
```bash
# Regenerar tipos
npm run type-check

# Se não funcionar, limpar cache
rm -rf .next
npm run build
```

---

### Supabase & Banco de Dados

#### P: "Erro: NEXT_PUBLIC_SUPABASE_URL is not defined"
**R:**
```bash
# 1. Verificar se .env.local existe
ls -la .env.local  # Linux/Mac
dir .env.local     # Windows

# 2. Verificar conteúdo
cat .env.local  # Linux/Mac
type .env.local # Windows

# 3. Verificar formato
# Deve ter exatamente:
# NEXT_PUBLIC_SUPABASE_URL=https://...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 4. Reiniciar servidor
npm run dev
```

#### P: RLS Policy Violation - Erro 403
**R:**
```bash
# 1. Verificar autenticação
# Ir para login e fazer login novamente
# Confirmar que token JWT está sendo enviado

# 2. Verificar RLS policies
# Supabase → Database → Policies
# Listar todas as policies: SELECT * FROM pg_policies;

# 3. Temporariamente desabilitar RLS (NUNCA em produção!)
ALTER TABLE occurrences DISABLE ROW LEVEL SECURITY;
SELECT * FROM occurrences;  # Agora funciona
# Depois reabilitar:
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;

# 4. Checar se policy realmente permite seu user
select auth.uid();  # Ve seu UID

# 5. Teste específico
SELECT * FROM profiles WHERE id = auth.uid();
```

#### P: Database connection refused
**R:**
```sql
-- 1. Verificar URL de conexão
-- .env.local deve ter:
-- DATABASE_URL=postgresql://postgres:senha@db.xxx.supabase.co:5432/postgres

-- 2. Testar conexão via psql
psql postgresql://postgres:senha@db.xxx.supabase.co:5432/postgres

-- 3. Verificar firewall / IP whitelist
-- Supabase → Database Settings → IP Whitelist
-- Se localhost, Vercel precisa estar em whitelist

-- 4. Verificar credenciais
-- Usar Service Role Key, não Anon Key para backend operations
```

#### P: Migrations não funcionam
**R:**
```bash
# 1. Verificar se arquivo existe
cat supabase/migrations/001_initial_schema.sql

# 2. Executar manualmente no SQL Editor
# Supabase → SQL Editor → New Query
# Copiar conteúdo do arquivo 001
# Colar e rodar

# 3. Verificar erros de sintaxe
-- Procurar por problemas SQL no output

# 4. Se precisa resetar banco
-- ⚠️ ISSO DELETA TUDO!
-- Supabase → Settings → Database → Reset
-- Depois re-executar migrations
```

#### P: Seed data não carregou
**R:**
```sql
-- 1. Verificar qual dados existem
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM occurrences;

-- 2. Se vazio, executar 002_seed_data.sql
-- Copiar conteúdo de supabase/migrations/002_seed_data.sql
-- Supabase → SQL Editor → New Query → Colar → Run

-- 3. Verificar enums foram criados
SELECT enum_name FROM pg_type WHERE typtype = 'e';
-- Deve listar: user_role, occurrence_status, occurrence_priority, ...
```

---

### Autenticação & Segurança

#### P: Login não funciona, mesmo com credenciais corretas
**R:**
```typescript
// 1. Verificar user no banco
SELECT * FROM profiles WHERE email = 'seu@email.com';

// 2. Se não existe, criar via SQL
INSERT INTO profiles (id, email, full_name, user_role, department_id)
VALUES (
  gen_random_uuid(),
  'seu@email.com',
  'Seu Nome',
  'administrador'::user_role,
  (SELECT id FROM departments LIMIT 1)
);

// 3. Então fazer login em Supabase Auth
SELECT * FROM auth.users WHERE email = 'seu@email.com';

// Obs: profiles e auth.users são tabelas separadas!
// Necessário sincronizar quando user cria conta
```

#### P: Token JWT expirou
**R:**
```typescript
// ✅ Automático - Supabase faz refresh automaticamente

// Mas se precisar forçar login:
const { error } = await supabase.auth.signOut();
// Redirecionar para /login

// Ou forçar refresh:
const { data: { session } } = await supabase.auth.refreshSession();
```

#### P: Ver quem está logado
**R:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log(user?.id, user?.email, user?.user_metadata);

// Em componente:
'use client';
const { user } = useAuth();  // Custom hook
console.log('Logado como:', user?.email);
```

---

### Frontend & UI

#### P: Tailwind CSS classes não aplicam
**R:**
```bash
# 1. Verificar se tailwind está compilando
# Deve ver no console ao rodar npm run dev:
# ✓ Compiling client side changes
# ✓ Compiled client successfully

# 2. Limpar cache Next.js
rm -rf .next

# 3. Verificar classe está sendo usada
# ❌ Errado:
className={`px-${size}`}  // Dynamic strings não funcionam

# ✅ Certo:
className={size === 'lg' ? 'px-8' : 'px-4'}

# 4. Usar arbitrary values se necessário
className="px-[200px]"  // Valores customizados
```

#### P: Componente não aparece
**R:**
```bash
# 1. Verificar se é 'use client'
'use client';  # Se precisar de state/interatividade

# 2. Importar corretamente
import { Button } from '@/components/ui';  # ✅ Absolute imports

# 3. Verificar arquivo existe
ls src/components/ui/Button.tsx

# 4. Verificar export
// Em Button.tsx:
export function Button() { ... }  # ✅ Named export

# 5. Verificar no index.ts
// src/components/ui/index.ts:
export { Button } from './Button';
```

#### P: Gráfico Recharts não renderiza
**R:**
```typescript
// Recharts precisa de ResponsiveContainer
'use client';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export function Chart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ❌ Errado
return <LineChart data={data}> ... </LineChart>;  // Sem ResponsiveContainer
```

---

### Deployment (Vercel)

#### P: Build falha no Vercel
**R:**
```bash
# 1. Testar build localmente
npm run build

# 2. Ver erro exato no Vercel Logs
# Vercel Dashboard → Deployments → Build logs (botão)

# Erros comuns:
# - Missing env vars: Adicionar em Settings → Environment Variables
# - Type errors: npm run type-check localmente
# - Module not found: npm install --save-dev [module]

# 3. Redeploy após fix
git add .
git commit -m "Fix build"
git push origin main
```

#### P: Timeout 504 em Vercel
**R:**
```bash
# 1. Problema: Build tomou > 60 segundos

# Soluções:
# - Reduzir complexity (split em packages menores)
# - Aumentar função timeout (Vercel Pro)
# - Usar ISR em vez de SSR

# 2. Se for query lenta:
# - Otimizar database queries
# - Adicionar indexes
# - Usar caching
```

#### P: Env vars não funcionam em Vercel
**R:**
```bash
# 1. Verificar se foram adicionadas
# Vercel Dashboard → Settings → Environment Variables

# 2. Confirmar nome exato e valor
# NEXT_PUBLIC_SUPABASE_URL (não SUPABASE_URL)

# 3. Redeploy é necessário após adicionar vars
# Vercel detecta e faz redeploy automático
# Se não, ir para Deployments → Redeploy

# 4. Verificar no browser
# console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
# Deve mostrar valor
```

---

### Performance

#### P: Site está lento no mobile
**R:**
```bash
# 1. Rodar Lighthouse local
npx lighthouse http://localhost:3000 --emulated-form-factor=mobile

# 2. Principais problemas:
# - Imagens não otimizadas: Usar next/image
# - JavaScript grande: Code splitting
# - CSS não-minificado: npm run build
# - Muitas animações: Desabilitar em mobile

# 3. Verificar Core Web Vitals
# LCP: Reduzir initial load
# FID: Reduzir main thread blocking
# CLS: Evitar layout shifts
```

#### P: Bundle size muito grande
**R:**
```bash
# 1. Analisar
npm run analyze

# 2. Remover libs não-usadas
# Verificar package.json:
# npm ls recharts
# Se não usa, remover: npm uninstall recharts

# 3. Lazy load componentes pesados
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('@/components/Chart'), { ssr: false });

# 4. Tree-shake com side-effect marker
# Verificar package.json:
"sideEffects": false
```

---

## 🐛 Bugs Comuns & Soluções

### Bug: Sidebar fica aberto em mobile
```typescript
// src/components/layout/Sidebar.tsx
'use client';
import { useEffect, useState } from 'react';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Fechar sidebar ao mudar rota (mobile)
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return ...
}
```

### Bug: Notificações não chegam
```typescript
// Verificar autenticação
if (!session) {
  console.log('User not authenticated, cannot receive notifications');
  return;
}

// Verificar browser permite
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    new Notification('HubCentral ES+', { body: 'Novo alerta!' });
  }
});
```

### Bug: Filtros não funcionam
```typescript
// ❌ Errado - não atualiza
const [filters, setFilters] = useState(initialFilters);

// ✅ Certo - triggers refetch
useEffect(() => {
  refetch(filters);
}, [filters]);

// No componente Filtro:
<Select 
  value={filters.status}
  onChange={(value) => setFilters({ ...filters, status: value })}
/>
```

---

## 📋 Checklist de Diagnóstico

Se algo não está funcionando, fazer este checklist:

**Básico**:
- [ ] Verificar console do navegador (F12 → Console)
- [ ] Verificar Network tab (pedidos HTTP)
- [ ] Limpar cache/cookies (Ctrl+Shift+Del)
- [ ] Fazer logout e login novamente
- [ ] Reiniciar servidor (`npm run dev`)
- [ ] Limpar node_modules (`rm -rf node_modules && npm install`)

**Supabase**:
- [ ] Verificar conexão em `.env.local`
- [ ] Testar URL em navegador (deve mostrar JSON)
- [ ] Verificar RLS policies habilitadas
- [ ] Ver Supabase logs (Dashboard → Logs)
- [ ] Confirmar tabelas existem (SQL Editor)

**Vercel**:
- [ ] Verificar build logs (Deployments → Build output)
- [ ] Confirmar env vars (Settings → Environment Variables)
- [ ] Ver function logs (Deployments → logs )
- [ ] Fazer redeploy (`git push` ou botão Redeploy)

**TypeScript**:
- [ ] Rodar `npm run type-check`
- [ ] Verificar imports estão corretos
- [ ] Confirmar interfaces definidas

**Performance**:
- [ ] Abrir DevTools (F12)
- [ ] Ir para Performance/Network tab
- [ ] Ver se pedidos estão lentos
- [ ] Ligar performance profiler

---

## 📞 Quando Contactar Suporte

**Supabase Support**:
- Erro de banco de dados
- Autenticação não funciona
- RLS policies não aplica
- Pergunta sobre limites/quotas

Email: support@supabase.io
Docs: https://supabase.com/docs

**Vercel Support**:
- Build falha
- Env vars não funcionam
- Domínio/SSL problema
- Performance/timeouts

Email: support@vercel.com
Docs: https://vercel.com/docs

**Next.js Community**:
- Question sobre App Router
- Dúvida de padrão
- Contribuição ao projeto

Discord: https://discord.gg/nextjs

**GitHub Issues**:
- Bug no HubCentral ES+
- Feature request
- Documentação incompleta

Repo: https://github.com/mauriciodavelgmail/HubCentralES

---

## 💡 Dicas & Tricks

### Acelerar Desenvolvimento
```bash
# Usar --turbopack (experimental)
npm run dev -- --turbopack

# Buildcode menores
npm run build -- --profile
```

### Debug Avançado
```typescript
// Adicionar breakpoint
debugger;  // Execução pausará aqui no DevTools

// Log estruturado
console.table(data);   // Mostra em tabela
console.time('name');  // Início
console.timeEnd('name');  // Fim + duração

// Ver stack trace
console.error('Error:', new Error().stack);
```

### Monitorar Requisições API
```bash
# Ver todas as requisições Supabase
# DevTools → Network → Filter: "supabase"

# Ou em código
const { data, error } = await supabase
  .from('occurrences')
  .select('*');
  
console.log('supabase response:', { data, error });
```

---

**Não achou solução?** 
1. Ver [DOCUMENTATION.md](DOCUMENTATION.md) para índice completo
2. Procurar em [README.md](README.md)
3. Contactar no Discord/GitHub issues

**Status Page**: https://status.supabase.com, https://status.vercel.com
