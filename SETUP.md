# Guia de Setup Local - HubCentral ES+

## 1. Pré-requisitos

### Softwares Necessários
- Node.js 20+ (https://nodejs.org)
- npm ou yarn
- Git (https://git-scm.com)
- Visual Studio Code (recomendado)

### Contas Online
- GitHub (https://github.com)
- Supabase (https://supabase.com)

## 2. Clonar Repositório

```bash
# Clone do repositório
git clone https://github.com/mauriciodavelgmail/HubCentralES.git
cd HubCentralES

# Ou, se iniciando do zero
git init
git add .
git commit -m "Initial commit: HubCentral ES+ platform"
git remote add origin https://github.com/seu-usuario/novo-repo.git
git push -u origin main
```

## 3. Instalar Dependências

```bash
# Instalar pacotes npm
npm install

# Se tiver problemas de permissão:
npm install --legacy-peer-deps

# Verificar instalação
npm list react react-dom next
```

## 4. Configurar Supabase

### 4.1 Criar Projeto Supabase
1. Acessar https://supabase.com
2. Fazer login com GitHub
3. Clique em "New Project"
4. Preencher:
   - Organization: Criar ou selecionar
   - Project Name: "hubcentral-es"
   - Database Password: Salvar com segurança!
   - Region: Escolher mais próxima (South America: São Paulo recomendado)
5. Aguardar inicialização (~2 min)

### 4.2 Copiar Credenciais
No dashboard Supabase:
1. Ir para Settings → API
2. Copiar:
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - Public API Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Service Role Key (para migrations)

### 4.3 Configurar Arquivo .env.local

```bash
# Na raiz do projeto, criar .env.local
cp .env.example .env.local
```

Preencher com seus valores:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-key-aqui
DATABASE_URL=postgresql://postgres:sua-senha@db.seu-projeto-id.supabase.co:5432/postgres

# Dados extras (opcional)
NEXT_PUBLIC_APP_NAME=HubCentral ES+
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 5. Configurar Banco de Dados

### 5.1 Executar Schema (Criação de Tabelas)

**Opção A: Via Supabase Dashboard**
1. Acessar Supabase → SQL Editor
2. Clique em "New Query"
3. Copiar conteúdo de `supabase/migrations/001_initial_schema.sql`
4. Colar na query
5. Clique em "Run"
6. Aguardar execução

**Opção B: Via Supabase CLI**
```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Link projeto
supabase link --project-ref seu-projeto-ref

# Executar migrations
supabase migration up
```

### 5.2 Popular com Dados Demo

1. Acessar Supabase → SQL Editor
2. Clique em "New Query"
3. Copiar conteúdo de `supabase/migrations/002_seed_data.sql`
4. Colar na query
5. Clique em "Run"
6. Aguardar execução

### 5.3 Verificar Criação

No SQL Editor, executar:
```sql
-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Contar registros em profiles
SELECT COUNT(*) as total_users FROM profiles;

-- Ver enums criados
SELECT enum_name FROM pg_type WHERE typtype = 'e';
```

## 6. Iniciar Servidor Desenvolvimento

```bash
# Iniciar servidor Next.js
npm run dev

# Esperado:
# ▲ Next.js 16.3.8 (Turbopack)
# - Local:         http://localhost:3000
# - Network:       http://seu-ip:3000

# Acessar: http://localhost:3000
```

## 7. Primeiro Acesso

### Opção 1: Login Mock (Demo)
1. Campo email: `demo@hubcentral.com`
2. Campo senha: `demo123`
3. Clique "Entrar"

### Opção 2: Acesso Convidado
1. Clique em "Acessar como Visitante"
2. Direcionado para dashboard com permissões limitadas

### Opção 3: Criar Usuário Real
1. No SQL Editor do Supabase, executar:
```sql
INSERT INTO profiles (id, email, full_name, user_role, department_id)
VALUES (
  uuid_generate_v4(),
  'seu-email@example.com',
  'Seu Nome',
  'administrador'::user_role,
  (SELECT id FROM departments LIMIT 1)
);
```
2. Usar email/senha para login

## 8. Estrutura de Pastas

```
HubCentral ES+/
├── src/
│   ├── app/
│   │   ├── (auth)/                    # Layout para auth
│   │   │   └── login/
│   │   ├── (protected)/               # Layout protegido
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── ocorrencias/
│   │   │   ├── documentos/
│   │   │   ├── agenda/
│   │   │   ├── insumos/
│   │   │   ├── compras/
│   │   │   ├── equipamentos/
│   │   │   ├── relatorios/
│   │   │   ├── configuracoes/
│   │   │   ├── gestaodoc/
│   │   │   └── contratos/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                        # Componentes base
│   │   └── layout/                    # Componentes de layout
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── database.types.ts
│   ├── types/
│   │   └── index.ts
│   ├── constants/
│   │   └── index.ts
│   └── utils/
│       └── helpers.ts
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_seed_data.sql
├── public/                            # Arquivos estáticos
├── .env.example
├── .env.local                         # NÃO COMMITTAR
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

## 9. Comandos Úteis

```bash
# Desenvolvimento
npm run dev                   # Iniciar servidor dev
npm run build                 # Build para produção
npm run start                 # Rodar build em produção
npm run lint                  # Verificar código
npm run type-check            # Verificar tipos TypeScript
npm run analyze               # Analisar bundle size

# Git
git status                    # Ver alterações
git add .                     # Preparar para commit
git commit -m "mensagem"      # Fazer commit
git push                      # Enviar para GitHub
git pull                      # Trazer atualizações

# Supabase
supabase status              # Ver status do projeto
supabase migration list      # Ver migrations
supabase functions deploy    # Deploy de edge functions
```

## 10. Verificação de Setup

Executar checklist:

```bash
# 1. Verificar Node.js
node --version        # Deve ser v20+
npm --version         # Deve ser v10+

# 2. Verificar dependências instaladas
npm list react        # debe estar instalado
npm list next         # deve estar instalado
npm list @supabase/supabase-js  # deve estar instalado

# 3. Verificar .env.local
cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL

# 4. Verificar conexão Supabase
npm run type-check    # Deve compilar sem erros

# 5. Iniciar servidor
npm run dev
# Acessar http://localhost:3000 no navegador
```

## 11. Troubleshooting

### Erro: "Cannot find module 'next'"
```bash
npm install
npm ci  # Clean install
```

### Erro: "NEXT_PUBLIC_SUPABASE_URL is not defined"
```bash
# Verificar .env.local
cat .env.local

# Reiniciar servidor
npm run dev
```

### Erro: "RLS Policy violation"
- Verificar que migrations foram executadas
- Confirmar que seed_data foi carregado
- Fazer logout e login novamente

### Erro: "Database connection refused"
1. Verificar URL do Supabase
2. Confirmar que projeto está online
3. Testar SQL simple em SQL Editor do Supabase

### Porta 3000 já em uso
```bash
# Usar porta diferente
npm run dev -- -p 3001

# Ou matar processo
npx kill-port 3000
```

### Slow Performance Local
```bash
# Aumentar número de workers
npm run dev -- --experimental-app-dir
```

## 12. Desenvolvimento

### Adicionar Nova Página

```bash
# 1. Criar pasta
mkdir -p src/app/nova-pagina

# 2. Criar page.tsx
cat > src/app/nova-pagina/page.tsx << 'EOF'
'use client';
import React from 'react';
import { MainLayout } from '@/components/layout';

export default function NovaPagePage() {
  return (
    <MainLayout title="Nova Página" subtitle="Descrição">
      <div>Conteúdo aqui</div>
    </MainLayout>
  );
}
EOF

# 3. Adicionar menu em src/constants/index.ts
# 4. Acessar http://localhost:3000/nova-pagina
```

### Adicionar Novo Componente

```typescript
// src/components/MyComponent.tsx
'use client';

interface MyComponentProps {
  title: string;
  children?: React.ReactNode;
}

export function MyComponent({ title, children }: MyComponentProps) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
```

### Modificar Styles

Editar `src/app/globals.css` para changes globais.

Para componentes específicos, usar `className` com Tailwind CSS.

## 13. Debug

### VS Code Debugging

Criar `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

Rodar:
```bash
node --inspect-brk ./node_modules/.bin/next dev
```

### Console Logs

```typescript
// Server-side (sempre visível)
console.log('Server log:', dados);

// Client-side (visível no navegador devtools)
'use client';
export default function Componente() {
  console.log('Client log:', dados);
  return <div>...</div>;
}
```

## 14. Próximos Passos

Após setup bem-sucedido:

1. **Autenticação Real** - Integrar Supabase Auth
2. **CRUD Completo** - Conectar formulários ao banco
3. **Upload de Arquivos** - Implementar storage
4. **Notificações** - WebSocket para alerts em tempo real
5. **Deploy** - Enviar para Vercel

Ver `DEPLOYMENT.md` para instruções de produção.

## 15. Suporte

### Documentação
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
- TypeScript: https://www.typescriptlang.org/docs

### Comunidades
- Supabase Discord: https://discord.supabase.com
- Next.js Discord: https://discord.gg/nextjs
- Stack Overflow: Tag `[supabase]` e `[next.js]`

---

**Pronto para começar! 🎉**

Qualquer dúvida, consulte a seção Troubleshooting ou contacte o suporte.
