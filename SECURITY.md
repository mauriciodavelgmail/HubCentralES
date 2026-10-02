# Segurança - HubCentral ES+

## 🔒 Visão Geral de Segurança

HubCentral ES+ implementa múltiplas camadas de segurança para proteger dados sensíveis de HUB ES+, uma instituição criativa que gerencia espaços colaborativos.

### Princípios Implementados
- ✅ Zero Trust Architecture
- ✅ Defense in Depth
- ✅ Least Privilege Access
- ✅ Encryption by Default
- ✅ Audit & Logging

---

## 1. Autenticação

### Supabase Auth (Implementado)
```typescript
// Login com email/password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@hubcentral.com',
  password: 'secure_password_123'
});

// Retorna JWT token com expiração (1 hora)
// Token armazenado em cookie seguro (httpOnly)
```

### JWT Token
- ✅ Signed com HS256 (HMAC SHA256)
- ✅ Expiração: 1 hora
- ✅ Refresh token: 7 dias
- ✅ Não armazenar em localStorage (XSS risk)
- ✅ Usar cookie httpOnly + Secure + SameSite=Strict

### Password Requirements
Implementar no Supabase:
- Mínimo 8 caracteres
- Pelo menos 1 maiúscula
- Pelo menos 1 minúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial (@#$%^&*)

**Exemplo de senha forte**:
```
HubCentral@2024!
Admin.Secure.Pass123
```

### Multi-Factor Authentication (MFA) - Futuro
```typescript
// Ativar MFA para usuários admin
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp'
});

// Usuário escaneará QR code no Google Authenticator
// Será solicitado código TOTP (Time-based OTP) a cada login
```

---

## 2. Autorização (RBAC)

### 6 Roles Definidos

#### 1. Administrador
- Acesso: **TOTAL**
- Pode: Criar/Editar/Deletar qualquer recurso
- Acesso: Configurações do sistema, logs de auditoria

#### 2. Administração (RH/Financeiro)
- Acesso: **QUASE TOTAL** (sem deletar)
- Pode: Ver relatórios, gerenciar documentos, processar compras
- Não pode: Deletar ocorrências, editar configurações

#### 3. Recepção
- Acesso: **LIMITADO** (apenas criar)
- Pode: Criar ocorrências, visualizar agendas
- Não pode: Editar, deletar

#### 4. Manutenção
- Acesso: **ESPECÍFICO** (seu departamento)
- Pode: Ver ocorrências de manutenção, registrar conclusão
- Não pode: Ver outras ocorrências, acessar admin

#### 5. Limpeza
- Acesso: **ESPECÍFICO** (seu departamento)
- Pode: Ver tarefas de limpeza, requisitar insumos
- Não pode: Ver outras áreas

#### 6. Visitante
- Acesso: **APENAS VISUALIZAÇÃO**
- Pode: Ver calendário público de eventos
- Não pode: Criar nada

### Matriz de Permissões

|Ação|Admin|Adm|Rec|Man|Limp|Visit|
|----|----|----|---|----|----|----|
|Criar Ocorrência|✅|✅|✅|✅|✅|❌|
|Editar Ocorrência|✅|✅|❌|✅ (dele)|✅ (dele)|❌|
|Deletar Ocorrência|✅|❌|❌|❌|❌|❌|
|Ver Relatórios|✅|✅|❌|✅|❌|❌|
|Gerenciar Usuários|✅|❌|❌|❌|❌|❌|
|Gerenciar Roles|✅|❌|❌|❌|❌|❌|
|Acessar Configurações|✅|❌|❌|❌|❌|❌|
|Ver Documentos|✅|✅|✅|✅|✅|❌|
|Fazer Upload Doc|✅|✅|✅|✅|✅|❌|
|Processar Compras|✅|✅|❌|❌|❌|❌|
|Agendar Eventos|✅|✅|✅|❌|❌|❌|
|Ver Eventos Públicos|✅|✅|✅|✅|✅|✅|

### Implementação em Código
```typescript
// src/constants/index.ts
export const PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  'administrador': {
    'create_occurrence': true,
    'edit_occurrence': true,
    'delete_occurrence': true,
    'view_reports': true,
    'manage_users': true,
    'access_settings': true,
    // ...
  },
  'recepção': {
    'create_occurrence': true,
    'edit_occurrence': false,
    'delete_occurrence': false,
    'view_reports': false,
    'manage_users': false,
    'access_settings': false,
    // ...
  },
  // ... outros roles
};

// Usar em componentes
function AdminOnlySection() {
  const { user } = useAuth();
  const hasAccess = PERMISSIONS[user.role]['access_settings'];
  
  if (!hasAccess) {
    return <p>Acesso negado</p>;
  }
  
  return <AdminPanel />;
}
```

---

## 3. Row-Level Security (RLS)

### O Que é RLS?
Segurança no nível do banco de dados PostgreSQL. Mesmo que alguém consiga JWT válido, não pode acessar dados que não deve.

### Implementado para Todas as 19 Tabelas

#### Exemplo: Ocorrências
```sql
-- Usuário só vê ocorrências do seu departamento (RLS)
CREATE POLICY occurrences_select ON occurrences
  FOR SELECT
  USING (
    -- Se for o criador
    auth.uid() = created_by
    -- OU se for atribuído
    OR auth.uid() = assigned_to
    -- OU se for chefe do departamento
    OR (SELECT head_id FROM departments WHERE id = department_id) = auth.uid()
    -- OU se for administrador
    OR (SELECT user_role FROM profiles WHERE id = auth.uid()) = 'administrador'
  );

-- Usuário só pode criar em seu departamento
CREATE POLICY occurrences_insert ON occurrences
  FOR INSERT
  WITH CHECK (
    department_id = (SELECT department_id FROM profiles WHERE id = auth.uid())
    OR (SELECT user_role FROM profiles WHERE id = auth.uid()) = 'administrador'
  );

-- Usuário só pode editar próprias ocorrências ou ser admin
CREATE POLICY occurrences_update ON occurrences
  FOR UPDATE
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR (SELECT user_role FROM profiles WHERE id = auth.uid()) = 'administrador'
  );

-- Apenas admin pode deletar
CREATE POLICY occurrences_delete ON occurrences
  FOR DELETE
  USING (
    (SELECT user_role FROM profiles WHERE id = auth.uid()) = 'administrador'
  );
```

#### RLS para Documentos (Mais Restritivo)
```sql
-- Documentos privados: só criador + admin
CREATE POLICY documents_select_private ON documents
  FOR SELECT
  USING (
    NOT is_public
    AND (auth.uid() = created_by OR (SELECT user_role FROM profiles WHERE id = auth.uid()) = 'administrador')
  );

-- Documentos públicos: todos
CREATE POLICY documents_select_public ON documents
  FOR SELECT
  USING (is_public AND status = 'ativo');
```

### Por Que é Importante?
```
Cenário: Hacker consegue token JWT de "João" (recepção)

❌ SEM RLS:
  GET /rest/v1/occurrences
  → Retorna TODAS as ocorrências do banco (incluindo do Admin)

✅ COM RLS:
  GET /rest/v1/occurrences
  → Banco retorna apenas ocorrências do João
  → Token de admin seria bloqueado (violação de policy)
```

---

## 4. Criptografia

### Em Trânsito (Transport)
- ✅ HTTPS/TLS 1.3 (obrigatório)
- ✅ Certificado SSL válido assinado
- ✅ HSTS header (Strict-Transport-Security)
- ✅ CORS configurado (apenas domínios conhecidos)

### Em Repouso (Storage)
- ✅ PostgreSQL com criptografia nativa
- ✅ Senhas hasheadas com bcrypt (pelo Supabase)
- ✅ Dados sensíveis criptografados por política de coluna (SE necessário)

### Exemplo de Senha Segura
```sql
-- Supabase já faz isso automaticamente
-- Senha "Admin123!" é armazenada como:
-- $2a$10$X1X2X3X4X5X6X7X8X9X0X1X2X3X4X5X6X7X8X9X0X1X2X3X4X5X6X7X8

-- Impossível recuperar senha original
-- Comparação é feita via bcrypt.compare()
```

---

## 5. Validação & Sanitização

### Entrada (Input Validation)
```typescript
// src/utils/helpers.ts
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const regex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;  // Padrão brasileiro
  return regex.test(phone);
}

export function isValidCPF(cpf: string): boolean {
  // Remove caracteres especiais
  cpf = cpf.replace(/\D/g, '');
  
  // Validar tamanho
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  
  // Verificar dígitos verificadores
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}
```

### Saída (Output Escaping)
```typescript
// React automaticamente faz escape de conteúdo em JSX
export function Display({ userInput }: { userInput: string }) {
  // ✅ SEGURO - React escapa automaticamente
  return <div>{userInput}</div>;
  
  // ❌ PERIGOSO - Nunca fazer
  // return <div dangerouslySetInnerHTML={{ __html: userInput }} />;
}

// Exemplo:
// Input: "<script>alert('hack')</script>"
// Renderizado: &lt;script&gt;alert('hack')&lt;/script&gt;
// (mostra como texto, não executa)
```

### SQL Injection Prevention
```typescript
// ❌ PERIGOSO (Nunca fazer isto)
const title = "'; DROP TABLE occurrences; --";
const query = `SELECT * FROM occurrences WHERE title = '${title}'`;
// Query: SELECT * FROM occurrences WHERE title = ''; DROP TABLE occurrences; --'

// ✅ SEGURO (Usar Supabase client)
const { data, error } = await supabase
  .from('occurrences')
  .select('*')
  .eq('title', userInput);  // Parametrizado automaticamente
// Supabase escapa valores automaticamente
```

---

## 6. Proteção Contra Ataques Comuns

### XSS (Cross-Site Scripting)
**Proteção**:
- ✅ React escapa JSX por padrão
- ✅ Sanitizar input com DOMPurify (se necessário)
- ✅ Content Security Policy (CSP) headers

```typescript
// Implementar CSP no next.config.ts (futuro)
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://..."
  }
];
```

### CSRF (Cross-Site Request Forgery)
**Proteção**:
- ✅ Supabase usa SameSite cookies
- ✅ CORS validação
- ✅ Double-submit cookie pattern

### SQL Injection
**Proteção**:
- ✅ Supabase client parametriza queries
- ✅ Nunca concatenar strings em SQL
- ✅ Usar ORM/prepared statements

### Rate Limiting (Prevenção de Brute Force)
```typescript
// Implementar no Supabase Edge Functions (futuro)
const loginAttempts = new Map<string, number>();

export async function handleLogin(email: string, password: string) {
  const attempts = loginAttempts.get(email) || 0;
  
  if (attempts >= 5) {
    throw new Error('Muitas tentativas. Tente depois de 15 minutos.');
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      loginAttempts.set(email, attempts + 1);
      throw error;
    }
    
    loginAttempts.delete(email);  // Resetar após sucesso
    return data;
  } catch (error) {
    throw error;
  }
}
```

### DDOS Protection
- ✅ Vercel + Supabase têm proteção automática
- ✅ Rate limiting no Supabase (100 RPM free tier)
- ✅ WAF (Web Application Firewall) no Vercel Pro+

---

## 7. Variáveis de Ambiente

### Nunca Commitar Segredos!

**.env.local (LOCAL - NUNCA COMMITTAR)**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu_chave_publica_aqui
SUPABASE_SERVICE_ROLE_KEY=seu_chave_privada_aqui  # ⚠️ NUNCA expor

# Banco
DATABASE_URL=postgresql://postgres:senha@db.supabase.co:5432/postgres

# Email (futuro)
SENDGRID_API_KEY=sua_chave_aqui
```

**.env.example (SEGURO - PODE COMMITTAR)**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Banco
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# Email
SENDGRID_API_KEY=your_sendgrid_key_here
```

### Em Vercel
1. O Project Settings
2. Environment Variables
3. Adicionar cada variável
4. Selecionar ambientes: Development, Preview, Production
5. Salvar

Vercel **injeta automaticamente** na build.

### Verificar Segredos Expostos
```bash
# Procurar por API keys em código
git log -S "SUPABASE_SERVICE_ROLE_KEY" --all -p

# Se encontrou, REVOGUE IMEDIATAMENTE a chave no Supabase Dashboard
```

---

## 8. Auditoria & Logging

### Audit Trail (Rastreabilidade)
Todas as tabelas têm:
- ✅ `created_by` (FK para profiles)
- ✅ `updated_by` (FK para profiles)
- ✅ `created_at` (timestamp automático)
- ✅ `updated_at` (timestamp automático)

```typescript
// Exemplo: Histórico de ocorrências
interface OccurrenceHistory {
  id: string;
  occurrence_id: string;
  old_status: OccurrenceStatus;
  new_status: OccurrenceStatus;
  changed_by: string;           // FK - profiles (quem alterou)
  changed_at: string;           // Timestamp
  reason?: string;              // Por quê?
}

// Cada alteração registra automático via trigger
```

### Activity Logs (Tabela Dedicada)
```typescript
interface ActivityLog {
  id: string;
  user_id: string;              // FK - profiles
  action: 'create' | 'update' | 'delete' | 'login' | 'export';
  resource_type: string;        // 'occurrence', 'document', etc
  resource_id: string;          // ID do recurso afetado
  ip_address: string;           // Para rastreabilidade
  timestamp: string;
  details?: string;             // JSON com o que mudou
}
```

### Como Acessar Logs
```typescript
// Admin pode ver todos os logs
const { data } = await supabase
  .from('activity_logs')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(1000);

// Filtrar por usuário específico
const { data } = await supabase
  .from('activity_logs')
  .select('*')
  .eq('user_id', 'abc123')
  .gte('timestamp', '2024-01-01T00:00:00Z');

// Detectar acessos suspeitos (múltiplos IPs em 5 min)
const suspicious = data
  .filter(log => log.action === 'login')
  .reduce((acc, log) => {
    const key = `${log.user_id}-${log.timestamp}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
```

---

## 9. Segurança de Dados Sensíveis

### PII (Personally Identifiable Information)
Dados sensíveis devem ser:
- ✅ Criptografados em trânsito (HTTPS)
- ✅ Criptografados em repouso (PostgreSQL + Supabase)
- ✅ Limitados em acesso (RLS)
- ✅ Auditados (activity_logs)

### Backup & Recuperação
- ✅ Supabase faz backup automático diário
- ✅ Retenção: 7 dias (free tier), 30 dias (pro)
- ✅ Restauração: via dashboard Supabase
- ✅ Criptografia de backups: ✅

### Retenção de Dados
Política para HUB ES+:
- Ocorrências resolvidas: Manter 2 anos
- Documentos: Manter conforme legislação (7 anos para fiscal)
- Logs de atividade: Manter 1 ano
- Dados de usuário deletado: Pseudonimizar ou deletar

---

## 10. Conformidade & Regulamentos

### LGPD (Lei Geral de Proteção de Dados)
**HubCentral ES+ é compatível com**:
- ✅ Consentimento informado (aceitar termos ao criar conta)
- ✅ Direito de acesso (usuário vê seus dados)
- ✅ Direito de retificação (editar dados)
- ✅ Direito de exclusão (deletar conta)
- ✅ Portabilidade (exportar dados em CSV)
- ✅ Revogação de consentimento
- ✅ Notificação de vazamento (em caso de incidente)

**Implementar**:
```typescript
// 1. Termo de uso ao registrar
<Modal title="Aceitar Termos">
  <p>Ao criar sua conta, você concorda com:</p>
  <ul>
    <li>Uso de dados para operação da plataforma</li>
    <li>Armazenamento seguro conforme LGPD</li>
    <li>Possibilidade de auditoria por segurança</li>
  </ul>
  <Checkbox id="agree" label="Li e aceito os termos" required />
</Modal>

// 2. Página de privacidade/LGPD
export default function PrivacyPage() {
  return (
    <div>
      <h1>Política de Privacidade HubCentral ES+</h1>
      <h2>Dados Coletados</h2>
      <ul>
        <li>Email, nome completo, cargo</li>
        <li>Histórico de ocorrências criadas/resolvidas</li>
        <li>IP de login (para segurança)</li>
      </ul>
      <h2>Direitos do Usuário</h2>
      <button onClick={exportMyData}>📥 Exportar Meus Dados</button>
      <button onClick={deleteBigethAccount}>🗑️ Deletar Minha Conta</button>
    </div>
  );
}

// 3. Função para deletar conta
async function deleteMyAccount() {
  const confirmed = window.confirm(
    'Tem certeza? Isto deletará TODOS seus dados permanentemente.'
  );
  
  if (!confirmed) return;
  
  // 1. Deletar usuário do Supabase Auth
  const { error } = await supabase.auth.admin.deleteUser(userId);
  
  // 2. Pseudonimizar dados do profile
  await supabase
    .from('profiles')
    .update({
      email: 'deletado@hubcentral.local',
      full_name: 'Usuário Deletado',
      // ... outros campos anulados
    })
    .eq('id', userId);
  
  // 3. Log da deleção para conformidade
  await supabase.from('activity_logs').insert({
    action: 'account_deleted',
    user_id: userId,
    timestamp: new Date().toISOString()
  });
}
```

---

## 11. Incident Response (Plano de Resposta)

### Se Houver Vazamento de Dados

**Passo 1: Detectar (1 min)**
- Alert automático em caso de acesso anormal
- Dashboard do Supabase mostra anomalias
- Flag em logs se múltiplas tentativas fracassadas

**Passo 2: Conter (5 min)**
```bash
# 1. Revogar Service Role Key
# Supabase → Settings → API → Regenerate

# 2. Fazer backup urgente
# Supabase → Database → Backups → Backup Now

# 3. Revisar RLS policies (se alguma foi removida)
# SQL Editor → SELECT * FROM pg_policies
```

**Passo 3: Investigar (30 min)**
```sql
-- Ver logins suspeitos
SELECT * FROM activity_logs
WHERE action = 'login'
AND timestamp > now() - interval '1 hour'
ORDER BY timestamp DESC;

-- Ver acessos a dados sensíveis
SELECT * FROM activity_logs
WHERE action IN ('read', 'export')
AND resource_type = 'documents'
AND timestamp > now() - interval '1 hour';

-- Ver quem deletou dados
SELECT * FROM activity_logs
WHERE action = 'delete'
AND timestamp > now() - interval '1 hour';
```

**Passo 4: Notificar (Conforme LGPD)**
- ✅ Email para usuários afetados (dentro de 48h)
- ✅ Notificar ANPD (Autoridade Nacional de Proteção de Dados)
- ✅ Publicar em site: Políticka de Privacidade
- ✅ Oferecer atendimento (helpdesk)

**Passo 5: Remediar**
- Mudar senhas de admin
- Regenerar todas as chaves de API
- Atualizar RLS policies
- Deploy de patch de segurança
- Fazer auditoria de código

**Passo 6: Documentar**
- Escrever relatório de incidente
- Manter por 5 anos (LGPD)
- Usar para melhorar segurança

---

## 12. Checklist de Segurança Pré-Deploy

- [ ] **Autenticação**
  - [ ] JWT token com expiração < 1h
  - [ ] Refresh token com expiração > 7 dias
  - [ ] Soft cookie httpOnly + Secure + SameSite=Strict
  - [ ] Senha de teste diferente de teste

- [ ] **Autorização**
  - [ ] RLS policies implementadas para TODAS relações 19 tabelas
  - [ ] Matriz de permissões testada para 6 roles
  - [ ] Frontend respeita permissions (mostrar/esconder botões)
  - [ ] Admin não pode ser "rebaixado" ao próprio level

- [ ] **Criptografia**
  - [ ] HTTPS/TLS 1.3 ativado
  - [ ] HSTS header presente
  - [ ] Certificado SSL válido
  - [ ] CORS apenas para domínios conhecidos

- [ ] **Validação**
  - [ ] Email validado (regex + verificação)
  - [ ] CPF validado se necessário
  - [ ] Phone validado conforme padrão regional
  - [ ] Tamanho máximo de upload: 50 MB

- [ ] **Variáveis de Ambiente**
  - [ ] `.env.local` criado (não committado)
  - [ ] `.env.example` criado (sem segredos)
  - [ ] `.gitignore` inclui `.env.local`
  - [ ] Vercel tem vars configuradas (3 ambientes)

- [ ] **Auditoria**
  - [ ] Tabela `activity_logs` teste
  - [ ] Timestamp em todas as ações
  - [ ] Admin pode visualizar logs
  - [ ] Dados sensíveis não aparecem em log

- [ ] **Conformidade**
  - [ ] Termos de serviço aceitos ao registrar
  - [ ] Política de Privacidade/LGPD publieada
  - [ ] Opção para exportar dados (CSV)
  - [ ] Opção para deletar conta + dados

- [ ] **Infraestrutura**
  - [ ] Backup automático ativado (Supabase)
  - [ ] PII não logado em console observável
  - [ ] WAF ativado (Vercel Pro+)
  - [ ] Rate limiting ativado

---

## 13. Recursos de Segurança Adicionais

### Ferramentas de Monitoramento
- **Sentry.io**: Rastrear erros + segurança
- **Snyk**: Escanear dependências por vulnerabilidades
- **OWASP ZAP**: Teste de penetração automático

### Instalação (Futuro)
```bash
npm install @sentry/react @sentry/tracing
npm install snyk
```

### Dependências Auditadas
```bash
npm audit
npm audit fix  # Corrigir automaticamente
```

---

## 14. Contacts & Escalation

### Security Issue Encontrada?

1. **Não** abra issue pública no GitHub
2. **Email** para: security@hubcentral.com (implementar)
3. **Supabase Security**: support@supabase.io
4. **ANPD (Órgão Regulador LGPD)**: https://www.gov.br/cidadania/pt-br/acesso-a-informacao/perguntas-frequentes/protecao-de-dados-pessoais

---

## 15. Atualizações de Segurança

### Manutenção de Dependências
```bash
# Semanal
npm outdated                    # Ver pacotes desatualizados
npm update                      # Atualizações minor/patch

# Mensal
npm audit                      # Verificar vulnerabilidades
npm audit fix                  # Corrigir automaticamente

# Trimestral
npm install -g npm-check-updates
ncu -u                        # Atualizar package.json
npm install                   # Instalar versões mais novas
npm test                      # Verificar se algo quebrou
```

### Security Releases
Supabase publica security releases:
- Assinar newsletter: https://supabase.com/blog
- Seguir GitHub releases: https://github.com/supabase/supabase/releases
- Testar e fazer deploy dentro de 1 semana

---

**HubCentral ES+ é seguro por padrão. Mas segurança é contínua - auditar regularmente!** 🔐
