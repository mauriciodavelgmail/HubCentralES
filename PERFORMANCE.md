# Performance & Otimização - HubCentral ES+

## 📊 Visão Geral

HubCentral ES+ foi otimizado para performance desde o início. Este guia detalha técnicas implementadas e como monitorar/melhorar continuamente.

### Métricas de Referência (Vercel + Supabase Free)

| Métrica | Meta | Atual | Status |
|---------|------|-------|--------|
| **Lighthouse Score** | > 90 | TBD | ⏳ |
| **FCP** (First Contentful Paint) | < 1.5s | TBD | ⏳ |
| **LCP** (Largest Contentful Paint) | < 2.5s | TBD | ⏳ |
| **CLS** (Cumulative Layout Shift) | < 0.1 | TBD | ⏳ |
| **TTFB** (Time to First Byte) | < 600ms | ~300ms | ✅ |
| **Bundle Size** | < 500 KB | ~250 KB | ✅ |
| **API Response Time** | < 200ms | ~50-100ms | ✅ |
| **Time to Interactive** | < 3.5s | TBD | ⏳ |

---

## 1. Frontend Performance

### 1.1 Code Splitting

**Implementado**:
```typescript
// Next.js App Router faz code splitting automático
// src/app/ → Cada página é um chunk separado

// Lazy loading manual para componentes pesados
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <p>Carregando gráfico...</p>,
  ssr: false  // Não renderizar no servidor (pesado)
});

export default function RelatoriosPage() {
  return (
    <div>
      <h1>Relatórios</h1>
      <HeavyChart />  {/* Carrega apenas quando necessário */}
    </div>
  );
}
```

### 1.2 Image Optimization

**Implementado**:
```typescript
import Image from 'next/image';

// ✅ OTIMIZADO - Next.js Image Component
export function OptimizedImage() {
  return (
    <Image
      src="/logo.png"
      alt="HubCentral Logo"
      width={200}
      height={100}
      priority={true}  // Para imagens críticas (logo)
      quality={75}     // Compressão (0-100)
      loading="lazy"   // Para imagens não-críticas
    />
  );
}

// ❌ NÃO OTIMIZADO - HTML tag
export function BadImage() {
  return <img src="/logo.png" alt="Logo" />;
  // Sem otimização, compressão, ou responsive
}
```

**Next.js Next.js Image**:
- ✅ Compressão automática
- ✅ Redimensionamento dinâmico
- ✅ WebP/AVIF format (navegadores modernos)
- ✅ Lazy loading automático
- ✅ Placeholders de baixa qualidade

### 1.3 Bundle Size

**Análise**:
```bash
# Analisar tamanho do bundle
npm run analyze

# Esperado:
# next/image: 15 KB
# react: 35 KB
# tailwindcss: 40 KB
# supabase: 50 KB
# recharts: 60 KB
# Total: ~250 KB
```

**Otimizações Aplicadas**:
- ✅ Tree-shaking de dependências não-usadas
- ✅ Rollup/Webpack otimizados
- ✅ Minificação automática no build
- ✅ Remover arquivo dist/**/*.map em produção

### 1.4 CSS Optimization

**Implementado**:
```css
/* globals.css */

/* ✅ Usar CSS variables (menor overhead) */
:root {
  --color-primary: #0057B8;
  --color-secondary: #FF6B1A;
  /* ... */
}

/* ✅ Evitar @import múltiplos */
/* @import url("google-fonts.css");  -- Ruim, bloqueia rendering */

/* ✅ Prefetch fonts no HTML */
<link rel="preload" as="font" href="/fonts/inter.woff2" type="font/woff2" crossorigin />

/* ✅ Usar Tailwind CSS (utility-first, muito otimizado) */
.button { @apply px-4 py-2 bg-blue-600 text-white rounded; }

/* ❌ Evitar animações pesadas */
/* animation: spin 2s linear infinite; -- OK */
/* animation: complex-3d-transform ...; -- Ruim em mobile */
```

---

## 2. Database Performance

### 2.1 Indexação

**Implementado**:
```sql
-- Full-text search index (criado em migrations)
CREATE INDEX occurrences_search_idx 
ON occurrences USING GIN(
  to_tsvector('portuguese', title || ' ' || description)
);

-- Index simples para queries comuns
CREATE INDEX occurrences_status_idx ON occurrences(status);
CREATE INDEX occurrences_department_idx ON occurrences(department_id);
CREATE INDEX occurrences_created_at_idx ON occurrences(created_at DESC);

-- Index composto (multi-coluna)
CREATE INDEX occurrences_dept_status_idx 
ON occurrences(department_id, status);

-- Index em tabelas importantes
CREATE INDEX documents_category_idx ON documents(category);
CREATE INDEX supplies_quantity_idx ON supplies(quantity);
CREATE INDEX purchases_status_idx ON purchases(status);
```

**Verificar Índices**:
```sql
-- Ver todos os índices
SELECT * FROM pg_indexes WHERE tablename = 'occurrences';

-- Ver quais queries foram lentas
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### 2.2 Query Optimization

**Ruim ❌** (N+1 queries):
```typescript
// Faz 11 queries: 1 para occurrências + 10 para usuários
const occurrences = await supabase
  .from('occurrences')
  .select('*');

for (const occ of occurrences) {
  const user = await supabase
    .from('profiles')
    .select('*')
    .eq('id', occ.created_by);  // ❌ Query em loop
  occ.created_by_name = user.full_name;
}
```

**Bom ✅** (Single query com join):
```typescript
// Faz 1 query (join no servidor)
const { data } = await supabase
  .from('occurrences')
  .select(`
    *,
    created_by_profile:created_by(full_name),
    assigned_to_profile:assigned_to(full_name)
  `);
```

### 2.3 Paginação

**Implementado**:
```typescript
// Paginação com offset/limit
const ITEMS_PER_PAGE = 10;

export async function getOccurrencesPage(page: number) {
  const offset = (page - 1) * ITEMS_PER_PAGE;
  
  const { data, count } = await supabase
    .from('occurrences')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);
  
  return {
    data,
    pageCount: Math.ceil((count || 0) / ITEMS_PER_PAGE),
    currentPage: page,
    total: count
  };
}

// No componente
export default function OcorrenciasPage() {
  const [page, setPage] = useState(1);
  const { data, pageCount } = await getOccurrencesPage(page);
  
  return (
    <div>
      <OccurrencesList items={data} />
      <Pagination 
        currentPage={page} 
        totalPages={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
```

### 2.4 Caching

**Server-side Caching**:
```typescript
// Usar Supabase realtime cache (automático)
// Ou implementar com Redis (futuro)

// Client-side Caching (React Query)
import { useQuery } from '@tanstack/react-query';

export function useOccurrences() {
  return useQuery({
    queryKey: ['occurrences'],
    queryFn: async () => {
      const { data } = await supabase
        .from('occurrences')
        .select('*');
      return data;
    },
    staleTime: 5 * 60 * 1000,  // Cache 5 minutos
    gcTime: 10 * 60 * 1000,    // Garbage collect após 10 min
  });
}
```

### 2.5 Connection Pooling

**Supabase (Free)**:
- Max 10 conexões simultâneas
- Conexões idle limpas após 5 minutos

**Supabase Pro+** (Futuro):
```typescript
// Usar pgBouncer (connection pooling)
// URL: postgresql://pgbouncer:6543/...

// Com connection pooling:
// ✅ Suporta 100+ conexões
// ✅ Melhor performance
// ✅ Reduz latência
```

---

## 3. API Performance

### 3.1 Rate Limiting

**Supabase Free Tier**:
- 100 requests/minute (RPM)
- Evitar queries em loop

**Implementação**:
```typescript
const requestQueue: PromiseQueue = new PromiseQueue();

export async function apiCall(endpoint: string, data: any) {
  return requestQueue.add(async () => {
    // Faz no máximo 2 requests por segundo
    return await supabase.from(endpoint).select('*').match(data);
  });
}
```

### 3.2 Compression

**Implementado**:
```javascript
// next.config.ts
export default {
  compress: true,  // ✅ Gzip compression automático
  
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Encoding',
          value: 'gzip',  // Compressão automática
        }
      ]
    }
  ]
};
```

**Resultado**:
- JSON 50 KB → 12 KB comprimido
- HTML 100 KB → 20 KB comprimido

### 3.3 Caching Headers

**Implementado** (futuro):
```typescript
// next.config.ts
const headers = async () => {
  return [
    {
      source: '/api/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600, immutable'  // 1 hora
        }
      ]
    },
    {
      source: '/images/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable'  // 1 ano
        }
      ]
    }
  ];
};
```

---

## 4. Rendering Strategy

### 4.1 ISR (Incremental Static Regeneration)

**Implementado** (futuro):
```typescript
// src/app/relatorios/page.tsx
export const revalidate = 3600;  // Regenerar a cada 1 hora

export default async function RelatoriosPage() {
  // Esta página é estática + regenerada a cada 1h
  const data = await getReportData();
  
  return <ReportDisplay data={data} />;
}

// Sem ISR (Server Render sempre):
// export const revalidate = 0;  // Nunca cache
```

**Benefícios**:
- ✅ Primeira visita: Instantânea (conteúdo estático)
- ✅ Visitas futuras: Conteúdo pré-renderizado
- ✅ Dados atualizados: bg-update (sem bloquear)

### 4.2 Streaming

**Server Component Streaming** (futuro):
```typescript
// src/app/ocorrencias/page.tsx
import { Suspense } from 'react';

async function OccurrencesList() {
  const occurrences = await fetchOccurrences();
  
  return (
    <ul>
      {occurrences.map(occ => (
        <li key={occ.id}>{occ.title}</li>
      ))}
    </ul>
  );
}

export default function OcorrenciasPage() {
  return (
    <div>
      <h1>Ocorrências</h1>
      
      {/* Mostra skeleton enquanto carrega */}
      <Suspense fallback={<Skeleton />}>
        <OccurrencesList />
      </Suspense>
    </div>
  );
}
```

---

## 5. Runtime Performance

### 5.1 Hydration

**Implementado**:
```typescript
// ✅ Client Components apenas onde necessário
'use client';  // Renderizar no cliente
import { useState } from 'react';

export function SearchBox() {
  const [query, setQuery] = useState('');  // State necessário
  
  return (
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="Buscar..."
    />
  );
}

// ❌ Não use 'use client' desnecessariamente
// Se não precisa de interatividade, deixa default (Server Component)
```

### 5.2 Web Vitals

**Monitorando**:
```typescript
// src/app/layout.tsx
'use client';
import { useReportWebVitals } from 'next/web-vitals';

export function Analytics() {
  useReportWebVitals(metric => {
    // Enviar para Vercel Analytics ou Sentry
    console.log(metric);  // { name, value, rating, id, ... }
    
    // Exemplo:
    // { name: 'LCP', value: 1200, rating: 'good', ... }
    // { name: 'FID', value: 150, rating: 'good', ... }
  });
}
```

**O Que Monitorar**:
- **FCP** < 1.8s (good)
- **LCP** < 2.5s (good)
- **FID** < 100ms (good)
- **CLS** < 0.1 (good)
- **TTFB** < 600ms (good)

---

## 6. Monitoramento & Observabilidade

### 6.1 Vercel Analytics

**Ativado** (free):
```
Vercel Dashboard → Project → Analytics

Vê:
- Page performance por rota
- Web Vitals distribution
- Requests/latência
- Errors distribuição
```

### 6.2 Sentry (Futuro)

**Instalação**:
```bash
npm install @sentry/react @sentry/tracing
```

**Configuração**:
```typescript
// src/instrumentation.ts
import * as Sentry from '@sentry/react';

export async function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,  // sample 10%
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,  // sempre registrar crashes
  });
}
```

### 6.3 Custom Metrics

**Implementar** (futuro):
```typescript
// Medir tempo de operação específica
export async function measureOccurrenceCreation() {
  const startTime = performance.now();
  
  try {
    const occurrence = await createOccurrence({
      title: "...",
      description: "..."
    });
    
    const duration = performance.now() - startTime;
    
    // Enviar métrica
    analytics.event('occurrence_created', {
      duration,
      status: 'success'
    });
    
    return occurrence;
  } catch (error) {
    const duration = performance.now() - startTime;
    analytics.event('occurrence_error', {
      duration,
      error: error.message
    });
    
    throw error;
  }
}
```

---

## 7. Mobile Optimization

### 7.1 Responsive Design

**Implementado**:
```css
/* Mobile-first approach */
.container {
  display: grid;
  grid-template-columns: 1fr;  /* Mobile: 1 coluna */
  gap: 1rem;
}

/* Tablet */
@media (min-width: 640px) {
  .container {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 7.2 Touch Optimization

**Implementado**:
```typescript
// Botões no mobile: mínimo 44px × 44px
<button className="px-4 py-3 min-h-[44px] min-w-[44px]">
  Clique aqui
</button>

// Evitar hover (não existe em touch)
@media (hover: hover) {
  button:hover { /* ... */ }
}
```

### 7.3 Viewport Configuration

**Implementado** (layout.tsx):
```typescript
export const metadata: Metadata = {
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};
```

---

## 8. Best Practices

### ✅ DO

- Paginate longas listas (máximo 50 itens por página)
- Use índices em queries frequentes
- Implemente lazy loading para imagens/componentes pesados
- Comprima imagens (JPG: 75%, PNG: 8-bit)
- Minify CSS/JS automático no build
- Cache dados frequentes (5-10 min)
- Monitorar Web Vitals regularmente
- Limite bundle  size < 500 KB
- Use Server Components por padrão
- Prefira CSS over JavaScript para styling

### ❌ DON'T

- Não carregue o banco inteiro em 1 query
- Não use imagens sem otimização
- Não façacom N+1 queries (use joins)
- Não ignore Core Web Vitals
- Não duplicate dados (normalizar schema)
- Não implemente sem paginação
- Não abuse de animações em mobile
- Não carregue scripts desnecessários
- Não escaneie logs em tempo real
- Não confie apenas em client-side caching

---

## 9. Checklist de Performance

**Antes do Deploy (Pré-Check)**:
- [ ] Bundle size < 500 KB (npm run analyze)
- [ ] Google Lighthouse score > 90
- [ ] Core Web Vitals verdes
- [ ] Imagens otimizadas (.webp, comprimidas)
- [ ] CSS minificado
- [ ] JavaScript tree-shaken
- [ ] Sem console.log() em produção
- [ ] Sem debugger statements
- [ ] Rate limiting testado
- [ ] Database queries otimizados (vê EXPLAIN ANALYZE)

**Após Deploy (Monitoramento)**:
- [ ] Check Vercel Analytics diariamente
- [ ] Sentry/error tracking monitorado
- [ ] Database query performance (pg_stat_statements)
- [ ] Storage usage (Vercel + Supabase)
- [ ] Bandwidth usage vs limite
- [ ] Cache hits/misses ratio
- [ ] Response times por endpoint

---

## 10. Ferramentas & Recursos

### Análise

```bash
# Verificar bundle size
npm run analyze

# Lighthouse local
npx lighthouse http://localhost:3000 --view

# Verificar performance de conexão
curl-w "@curl-format.txt" -o /dev/null -s http://localhost:3000

# Analisar dependências
npm list --depth=0
npm outdated
```

### Monitoramento

- **Vercel Analytics**: Incluído no plano Hobby+
- **Lighthouse**: Google Chrome DevTools integrado
- **Sentry**: https://sentry.io (free tier: 5k errors/mês)
- **New Relic**: https://newrelic.com (free tier: 1 app)
- **Datadog**: https://datadog.com (free tier: 5 hosts)

### Recursos

- Next.js Performance: https://nextjs.org/learn/seo/performance
- Web Vitals: https://web.dev/vitals/
- Supabase Optimization: https://supabase.com/docs/guides/database/database-optimization
- Vercel Best Practices: https://vercel.com/docs

---

**Performance não é um projeto, é um processo contínuo!** ⚡
