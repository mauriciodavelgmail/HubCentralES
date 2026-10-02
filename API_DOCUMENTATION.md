# Documentação de API - HubCentral ES+

## Visão Geral

HubCentral ES+ utiliza **Supabase** como backend. Não há servidor Express/Node.js separado - as requisições são feitas diretamente ao Supabase PostgreSQL via cliente TypeScript do Supabase.

### Base URL
```
https://ulorhnkrgnepghifctae.supabase.co
```

### Autenticação
```
Header: 'Authorization: Bearer {JWT_TOKEN}'
Header: 'Content-Type: application/json'
```

---

## 1. Tabelas Principais

### 1.1 Profiles (Usuários)

**Endpoint**: `/rest/v1/profiles`

**Schema**:
```typescript
interface Profile {
  id: string;                    // UUID
  email: string;                 // email único
  full_name: string;            // Nome completo
  avatar_url?: string;          // URL da foto
  user_role: UserRole;          // administrador | administracao | recepcao | manutencao | limpeza | visitante
  department_id: string;        // FK - departments
  is_active: boolean;           // Status
  created_at: string;           // Timestamp
  updated_at: string;           // Timestamp
  created_by: string;           // FK - profiles
  updated_by: string;           // FK - profiles
}
```

**RLS Policies**:
- ✅ Usuário vê seu próprio perfil
- ✅ Admin vê todos
- ✅ Usuário edita seu próprio perfil
- ✅ Admin edita qualquer perfil

**Exemplos**:

`GET /rest/v1/profiles?select=*&id=eq.abc123`
```json
{
  "id": "abc123",
  "email": "user@hubcentral.com",
  "full_name": "João Silva",
  "user_role": "manutencao",
  "department_id": "dept-001",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:20:00Z"
}
```

`POST /rest/v1/profiles`
```json
{
  "email": "novo@hubcentral.com",
  "full_name": "Maria Santos",
  "user_role": "administracao",
  "department_id": "dept-002",
  "is_active": true
}
```

---

### 1.2 Occurrences (Ocorrências/Tickets)

**Endpoint**: `/rest/v1/occurrences`

**Schema**:
```typescript
interface Occurrence {
  id: string;                        // UUID
  occurrence_number: string;         // OC-2024-001 (auto-gerado)
  title: string;                     // Título do problema
  description: string;               // Descrição detalhada
  category: OccurrenceCategory;     // manutenção | limpeza | infraestrutura | eventos | segurança | etc
  priority: OccurrencePriority;     // critica | alta | media | baixa
  status: OccurrenceStatus;         // aberta | em_analise | em_execucao | resolvida | cancelada
  location: string;                 // Local (Auditório, Lab Maker, etc)
  created_by: string;               // FK - profiles
  assigned_to?: string;             // FK - profiles (quem vai resolver)
  department_id: string;            // FK - departments
  due_date?: string;                // Data limite
  resolved_at?: string;             // Quando foi resolvida
  created_at: string;
  updated_at: string;
}
```

**Enums**:
```typescript
type OccurrenceCategory = 
  'manutenção' | 'limpeza' | 'infraestrutura' | 'eventos' | 
  'segurança' | 'rh' | 'financeiro' | 'ti';

type OccurrencePriority = 'critica' | 'alta' | 'media' | 'baixa';

type OccurrenceStatus = 
  'aberta' | 'em_analise' | 'em_execucao' | 'resolvida' | 'cancelada';
```

**RLS Policies**:
- ✅ Qualquer usuário vê ocorrências abertas
- ✅ Usuário vê ocorrências atribuídas a si
- ✅ Admin vê tudo
- ✅ Criador edita sua própria ocorrência
- ✅ Departamento responsável edita

**Exemplos**:

`GET /rest/v1/occurrences?select=*&status=eq.aberta&order=created_at.desc`
```json
[
  {
    "id": "occ-001",
    "occurrence_number": "OC-2024-001",
    "title": "Ar condicionado não funciona na sala criativa",
    "description": "Equipamento ligado mas não há ar saindo",
    "category": "manutenção",
    "priority": "alta",
    "status": "aberta",
    "location": "sala_criativa",
    "created_by": "user-001",
    "assigned_to": null,
    "department_id": "dept-tech",
    "due_date": "2024-01-22T17:00:00Z",
    "created_at": "2024-01-20T10:30:00Z",
    "updated_at": "2024-01-20T10:30:00Z"
  }
]
```

`POST /rest/v1/occurrences`
```json
{
  "title": "Lâmpada queimada no hall",
  "description": "Luminárias da entrada estão apagadas",
  "category": "limpeza",
  "priority": "baixa",
  "status": "aberta",
  "location": "hall",
  "department_id": "dept-clean",
  "due_date": "2024-01-25T17:00:00Z"
}
```

---

### 1.3 Documents (Documentos)

**Endpoint**: `/rest/v1/documents`

**Schema**:
```typescript
interface Document {
  id: string;                        // UUID
  title: string;                     // Nome do documento
  category: DocumentCategory;       // Tipo de documento
  description?: string;             // Descrição
  file_path: string;               // Caminho no storage
  file_size: number;               // Em bytes
  file_type: string;               // mime type: application/pdf, image/jpeg etc
  status: DocumentStatus;          // ativo | expirado | pendente_aprovacao
  expiry_date?: string;            // Data de expiração
  created_by: string;              // FK - profiles
  approved_by?: string;            // FK - profiles
  is_public: boolean;              // Acessível a visitantes?
  created_at: string;
  updated_at: string;
}
```

**DocumentCategory**:
```typescript
type DocumentCategory = 
  'contrato' | 'relatorio' | 'rh' | 'financeiro' | 'tecnico' | 
  'legal' | 'evento' | 'outro' | 'privado' | 'publico';
```

**Storage Bucket**: `documents/{folder}/{filename}`

**RLS Policies**:
- ✅ Documentos públicos: todos veem
- ✅ Documentos privados: apenas criador/admin
- ✅ Aprovação necessária de admin antes de publicar

**Exemplos**:

`POST /rest/v1/documents`
```json
{
  "title": "Contrato de Locação - HUB ES+ 2024",
  "category": "contrato",
  "file_path": "documents/contratos/locacao-2024.pdf",
  "file_size": 245632,
  "file_type": "application/pdf",
  "status": "pendente_aprovacao",
  "expiry_date": "2025-01-15T23:59:59Z",
  "is_public": false
}
```

---

### 1.4 Events (Eventos/Agenda)

**Endpoint**: `/rest/v1/events`

**Schema**:
```typescript
interface Event {
  id: string;                        // UUID
  title: string;                     // Nome do evento
  description?: string;
  event_type: EventType;            // workshop | palestra | reuniao | social | etc
  status: EventStatus;              // confirmada | aguardando_aprovacao | cancelada | realizada
  start_time: string;               // ISO datetime
  end_time: string;
  space_id: string;                 // FK - spaces (local)
  capacity: number;                 // Quantas pessoas cabem
  created_by: string;               // FK - profiles (quem agendou)
  approved_by?: string;             // FK - profiles (quem aprovou)
  requires_approval: boolean;       // Admin precisa aprovar?
  created_at: string;
  updated_at: string;
}
```

**EventType**:
```typescript
type EventType = 'workshop' | 'palestra' | 'reuniao' | 'social' | 'treinamento' | 'demonstracao';
type EventStatus = 'confirmada' | 'aguardando_aprovacao' | 'cancelada' | 'realizada';
```

**RLS Policies**:
- ✅ Todos veem eventos confirmados
- ✅ Criador vê seus eventos pendentes
- ✅ Admin vê tudo
- ✅ Admin aprova/rejeita

**Exemplos**:

`GET /rest/v1/events?select=*,attendance_list(*)&status=eq.confirmada&order=start_time.asc`
```json
[
  {
    "id": "evt-001",
    "title": "Workshop de IoT com Arduino",
    "event_type": "workshop",
    "status": "confirmada",
    "start_time": "2024-01-25T14:00:00Z",
    "end_time": "2024-01-25T17:00:00Z",
    "space_id": "space-lab",
    "capacity": 30,
    "created_by": "user-001",
    "approved_by": "admin-001",
    "requires_approval": false,
    "attendance_list": [
      { "profile_id": "user-002", "checked_in": true },
      { "profile_id": "user-003", "checked_in": false }
    ]
  }
]
```

---

### 1.5 Supplies (Insumos/Estoque)

**Endpoint**: `/rest/v1/supplies`

**Schema**:
```typescript
interface Supply {
  id: string;                        // UUID
  name: string;                      // Nome
  category: SupplyCategory;         // Categoria
  description?: string;
  quantity: number;                 // Quantidade atual
  minimum_quantity: number;         // Mínimo recomendado
  unit: string;                     // unidade: unidades, litros, metros, etc
  supplier_id?: string;             // FK - suppliers
  last_movement_date: string;
  storage_location: string;         // Onde fica guardado
  created_at: string;
  updated_at: string;
}
```

**SupplyCategory**:
```typescript
type SupplyCategory = 'limpeza' | 'escritorio' | 'manutencao' | 'tecnologia' | 'alimentos' | 'outro';
```

**RLS Policies**:
- ✅ Todos veem suprimentos não-críticos
- ✅ Admin vê tudo
- ✅ Limpeza/Manutenção veem suas categorias
- ✅ Requisição cria automaticamente movimento

**Exemplos**:

`GET /rest/v1/supplies?select=*&gt.quantity,minimum_quantity`
```json
[
  {
    "id": "sup-001",
    "name": "Papel A4 (resma)",
    "category": "escritorio",
    "quantity": 5,
    "minimum_quantity": 10,
    "unit": "resmas",
    "storage_location": "Almoxarifado - Prateleira C2",
    "last_movement_date": "2024-01-18T09:15:00Z",
    "created_at": "2024-01-01T10:00:00Z"
  }
]
```

### Supply Movements (Histórico de Movimentação)

**Endpoint**: `/rest/v1/supply_movements`

Cada movimento de estoque (entrada, saída, ajuste) é registrado:

```typescript
interface SupplyMovement {
  id: string;
  supply_id: string;                // FK
  movement_type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;                 // Positivo ou negativo
  reason: string;                   // Por quê?
  created_by: string;               // Quem fez
  created_at: string;
}
```

---

### 1.6 Purchases (Compras)

**Endpoint**: `/rest/v1/purchases`

**Schema**:
```typescript
interface Purchase {
  id: string;
  purchase_number: string;          // PC-2024-001 (auto)
  description: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  supplier_id: string;              // FK
  status: PurchaseStatus;           // 7 estágios
  requested_by: string;             // FK - profiles
  approved_by?: string;
  requested_date: string;
  expected_delivery: string;        // Data desejada
  actual_delivery?: string;
  invoice_number?: string;
  created_at: string;
  updated_at: string;
}
```

**PurchaseStatus**:
```typescript
type PurchaseStatus = 
  'solicitacao' | 'orcamento' | 'orcamento_recebido' | 
  'compra_realizada' | 'mercadoria_recebida' | 'nota_processada' | 
  'concluida' | 'cancelada';
```

**Workflow**:
```
1. solicitacao (aberta)        → Usuário requisita
2. orcamento                   → Aguardando orçamento de fornecedor
3. orcamento_recebido          → Orçamento chegou
4. compra_realizada            → Compra foi efetuada
5. mercadoria_recebida         → Produto chegou
6. nota_processada             → NF processada
7. concluida                   → Finalizado
   ou cancelada                → Se não seguir adiante
```

**Exemplos**:

`POST /rest/v1/purchases`
```json
{
  "description": "Toner Preto HP LaserJet",
  "quantity": 2,
  "unit_price": 350.00,
  "supplier_id": "supplier-hp",
  "status": "solicitacao",
  "expected_delivery": "2024-02-05T17:00:00Z"
}
// total_value: 2 * 350 = 700.00
// purchase_number: auto-gerado (PC-2024-005)
```

---

### 1.7 Equipment (Equipamentos/Patrimônio)

**Endpoint**: `/rest/v1/equipments`

**Schema**:
```typescript
interface Equipment {
  id: string;
  code: string;                    // Código patrimônio (único)
  name: string;
  category: string;               // Informática, Áudio, Vídeo, Clima, etc
  brand: string;
  model: string;
  serial_number: string;
  acquisition_date: string;
  location: string;               // Onde está agora
  responsible_id: string;         // FK - profiles (quem cuida)
  purchase_value: number;
  status: EquipmentStatus;        // disponvel | em_uso | em_manutencao | indisponivel
  document_path?: string;         // Nota fiscal, garantia
  created_at: string;
  updated_at: string;
}
```

**EquipmentStatus**:
```typescript
type EquipmentStatus = 'disponivel' | 'em_uso' | 'em_manutencao' | 'indisponivel';
```

**RLS Policies**:
- ✅ Responsável vê seu equipamento
- ✅ Manutenção vê equipamentos em manutenção
- ✅ Admin vê tudo

**Exemplos**:

`POST /rest/v1/equipments`
```json
{
  "code": "PAT-2024-0015",
  "name": "Projetor Epson EB-2250U",
  "category": "Projetores",
  "brand": "Epson",
  "model": "EB-2250U",
  "serial_number": "SN12345ABC",
  "acquisition_date": "2023-06-15T00:00:00Z",
  "location": "Auditório",
  "responsible_id": "user-003",
  "purchase_value": 3500.00,
  "status": "disponivel"
}
```

### Equipment Maintenance (Histórico de Manutenção)

**Endpoint**: `/rest/v1/equipment_history`

```typescript
interface EquipmentHistory {
  id: string;
  equipment_id: string;           // FK
  maintenance_type: 'preventiva' | 'corretiva' | 'limpeza';
  description: string;
  performed_by: string;           // FK - Técnico
  maintenance_date: string;
  cost?: number;
  notes?: string;
  created_at: string;
}
```

---

### 1.8 Departments (Departamentos)

**Endpoint**: `/rest/v1/departments`

**Schema**:
```typescript
interface Department {
  id: string;
  name: string;                   // Direção, Administração, etc
  description?: string;
  head_id?: string;              // FK - profiles (chefe)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Dados pré-carregados**:
- Direção
- Administração
- Tecnologia
- Limpeza
- Eventos
- Recepção

---

### 1.9 Spaces (Espaços Físicos)

**Endpoint**: `/rest/v1/spaces`

**Schema**:
```typescript
interface Space {
  id: string;
  name: string;                   // Auditório, Lab Maker, etc
  description?: string;
  capacity: number;              // Quantas pessoas cabem
  has_projector: boolean;
  has_wifi: boolean;
  has_ac: boolean;
  floor: number;                 // Andar
  room_number?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}
```

**Espaços Pré-Cadastrados**:
- Auditório (200 pessoas)
- Lab Maker (50 pessoas)
- Sala Criativa (30 pessoas)
- Coworking (100 pessoas)
- Hall (150 pessoas)
- Espaço Multiuso (75 pessoas)

---

## 2. Operações CRUD Padrão

### Create (Inserir)
```bash
POST /rest/v1/occurrences
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "...",
  "description": "...",
  ...
}

Resposta:
201 Created
{
  "id": "...",
  "occurrence_number": "OC-2024-001",
  ...
}
```

### Read (Consultar)
```bash
# Uma linha
GET /rest/v1/occurrences?id=eq.abc123

# Filtros múltiplos
GET /rest/v1/occurrences?status=eq.aberta&priority=eq.critica

# Ordenar
GET /rest/v1/occurrences?order=created_at.desc

# Paginar
GET /rest/v1/occurrences?offset=0&limit=10

# Selecionar colunas
GET /rest/v1/occurrences?select=id,title,status

# Com related data (join)
GET /rest/v1/occurrences?select=*,profiles:created_by(full_name)
```

### Update (Atualizar)
```bash
PATCH /rest/v1/occurrences?id=eq.abc123
Content-Type: application/json

{
  "status": "resolvida",
  "resolved_at": "2024-01-20T15:30:00Z"
}

Resposta:
200 OK
```

### Delete (Deletar)
```bash
DELETE /rest/v1/occurrences?id=eq.abc123

Resposta:
204 No Content
```

---

## 3. Query Filters (Filtros)

### Operadores

| Operador | Símbolo | Exemplo |
|----------|---------|---------|
| Igual | `eq` | `status=eq.aberta` |
| Diferente | `neq` | `status=neq.cancelada` |
| Maior que | `gt` | `quantity=gt.10` |
| Maior ou igual | `gte` | `quantity=gte.10` |
| Menor que | `lt` | `quantity=lt.5` |
| Menor ou igual | `lte` | `quantity=lte.5` |
| In | `in` | `priority=in.(critica,alta)` |
| Is | `is` | `assigned_to=is.null` |
| Like | `like` | `title=like.%vazamento%` |
| ILike | `ilike` | `title=ilike.%ar condicionado%` |
| Match | `match` | (full-text search) |
| Text Search | `@@` | (PostgreSQL) |

### Exemplos de Filtros
```
# Ocorrências abertas de alta prioridade
GET /rest/v1/occurrences?status=eq.aberta&priority=eq.alta

# Documentos ativos não expirados
GET /rest/v1/documents?status=eq.ativo&lte.expiry_date=now()

# Equipamentos em manutenção
GET /rest/v1/equipments?status=eq.em_manutencao

# Compras do último mês
GET /rest/v1/purchases?gte.created_at=2024-01-01T00:00:00Z

# Fornecedores com "Marques" no nome (case-insensitive)
GET /rest/v1/suppliers?name=ilike.%Marques%
```

---

## 4. Aggregations (Agregações)

```bash
# Contar ocorrências por status
GET /rest/v1/occurrences?select=status,count(*)&group_by=status

# Soma de valores de compra por mês
GET /rest/v1/purchases?select=date_trunc('month', created_at),sum(total_value)

# Média de tempo de resolução
GET /rest/v1/occurrences?select=avg(daysUntil(resolved_at, created_at))
```

---

## 5. Autenticação (Auth)

### Login
```bash
POST /auth/v1/token?grant_type=password

{
  "email": "user@hubcentral.com",
  "password": "senha123"
}

Resposta:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "..."
}
```

### Usar Token
```bash
GET /rest/v1/profiles?id=eq.abc123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expirado
Se token expirou (401 Unauthorized), usar `refresh_token`:

```bash
POST /auth/v1/token?grant_type=refresh_token

{
  "refresh_token": "..."
}

Resposta: Novo access_token
```

---

## 6. RLS (Row Level Security)

Todas as políticas RLS estão implementadas no banco.

### Verificação
Ir para `Supabase Dashboard → Database → Policies`

Exemplo de política:
```sql
-- Ocorrências: usuário vê sua própria ou é admin
CREATE POLICY occurrences_select ON occurrences
  FOR SELECT USING (
    auth.uid() = created_by 
    OR auth.uid() = assigned_to
    OR (
      SELECT user_role FROM profiles 
      WHERE id = auth.uid()
    ) = 'administrador'
  );
```

---

## 7. Storage (Arquivos)

### Buckets Disponíveis
- `documents/` - Documentos públicos/privados
- `occurrences/` - Evidências de ocorrências
- `events/` - Fotos de eventos
- `equipments/` - Fotos de patrimônio

### Upload
```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .upload('contratos/arquivo.pdf', file, {
    cacheControl: '3600',
    upsert: false
  });

// data.path = 'contratos/arquivo.pdf'
```

### Download
```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .download('contratos/arquivo.pdf');
```

### Gerar URL Pública
```typescript
const { data } = supabase.storage
  .from('documents')
  .getPublicUrl('contratos/arquivo.pdf');

// data.publicUrl = 'https://...supabase.co/storage/v1/object/public/documents/...'
```

---

## 8. Real-Time Subscriptions

### Escutar Mudanças em Tabela

```typescript
const subscription = supabase
  .channel('occurrences-channel')
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT | UPDATE | DELETE
      schema: 'public',
      table: 'occurrences'
    },
    (payload) => {
      console.log('Mudança detectada:', payload);
      // Atualizar UI
    }
  )
  .subscribe();

// Depois, desinscrever
subscription.unsubscribe();
```

### Tipos de Eventos
- `INSERT` - Novo registro
- `UPDATE` - Registro modificado
- `DELETE` - Registro deletado

---

## 9. Triggers & Functions

### Função: generate_occurrence_number()
Gera número único para ocorrência (OC-2024-001)

```sql
-- Trigger automático
CREATE TRIGGER set_occurrence_number
BEFORE INSERT ON occurrences
FOR EACH ROW
EXECUTE FUNCTION generate_occurrence_number();
```

### Função: update_supply_status()
Muda status de suprimento para "crítico" se qtd ≤ min

```sql
-- Trigger automático
CREATE TRIGGER update_supply_critical
AFTER INSERT ON supply_movements
FOR EACH ROW
EXECUTE FUNCTION update_supply_status();
```

### Função: create_evidence_document_for_occurrence()
Cria documento de evidência quando ocorrência marcada como resolvida

---

## 10. Casos de Uso Comuns

### Caso 1: Criar Ocorrência com Sugestão

```typescript
// 1. Analisar título/descrição
const suggestion = getOccurrenceSuggestions(
  "Ar condicionado quebrado",
  "Equipamento ligado mas não sai ar"
);
// Retorna: { suggestedPriority: 'alta', suggestedDepartment: 'manutencao', ... }

// 2. Criar com os dados + sugestão aceita
const { data, error } = await supabase
  .from('occurrences')
  .insert({
    title: "Ar condicionado quebrado",
    description: "Equipamento ligado mas não sai ar",
    priority: suggestion.suggestedPriority, // 'alta'
    status: 'aberta',
    due_date: addDays(new Date(), suggestion.suggestedDeadlineDays),
    // ... outros campos
  });
```

### Caso 2: Filtrar Ocorrências por Role

```typescript
// Manutenção vê apenas ocorrências de seu departamento
const { data } = await supabase
  .from('occurrences')
  .select('*')
  .eq('department_id', userDepartmentId)
  .order('created_at', { ascending: false });

// Admin vê tudo
// (RLS automático garante isso)
```

### Caso 3: Contar Itens Críticos

```typescript
const { count } = await supabase
  .from('supplies')
  .select('*', { count: 'exact' })
  .eq('status', 'critico');

// count = 3
```

### Caso 4: Exportar Relatório CSV

```typescript
const { data } = await supabase
  .from('occurrences')
  .select('*')
  .order('created_at', { ascending: false });

// Converter para CSV
const csv = Papa.unparse(data);
download(csv, 'ocorrencias.csv');
```

---

## 11. Limites & Quotas

Plano Supabase Grátis:
- **Limite de Requisições**: 100 RPM (reqs/min)
- **Armazenamento**: 1 GB
- **Conexões**: 10 simultâneas
- **Realtime**: 100 conexões

Para produção, considere upgrade para (**Pro** ou **Team**).

---

## 12. Códigos de Erro

| Código | Significado | Solução |
|--------|------------|---------|
| 200 | OK | ✅ Sucesso |
| 201 | Created | ✅ Recurso criado |
| 204 | No Content | ✅ Sucesso, sem retorno |
| 400 | Bad Request | ❌ Dados mal formatados |
| 401 | Unauthorized | ❌ Token expirado/inválido |
| 403 | Forbidden | ❌ Sem permissão (RLS) |
| 404 | Not Found | ❌ Recurso não existe |
| 409 | Conflict | ❌ Violação de constraint |
| 413 | Payload Too Large | ❌ Arquivo muito grande |
| 429 | Too Many Requests | ❌ Rate limit excedido |
| 500 | Server Error | ❌ Erro no servidor |

---

## 13. Best Practices

### ✅ DO
- Filtre dados no servidor (não carregue tudo)
- Use sel

ect específico (não use *)
- Implemente paginação para listas grandes
- Cache resultados quando apropriado
- Valide dados antes de enviar

### ❌ DON'T
- Não confie apenas em auth do cliente
- Não exponha Service Role Key no frontend
- Não faça N+1 queries (use joins)
- Não sem limite de requisições
- Não ignore avisos de RLS

---

**Mais dúvidas?** Consulte docs Supabase: https://supabase.com/docs/
