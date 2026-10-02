# Funcionalidades - HubCentral ES+

## 1. Dashboard Executivo

**Localização**: `/dashboard`

### Componentes Principais
- **5 Cartões de Métricas**:
  - Ocorrências Abertas (8)
  - Itens Críticos (2)
  - Tempo Médio de Resolução (4.2 dias)
  - Eventos Próximos (3)
  - Itens com Baixo Estoque (3)

- **Gráfico de Linha**: Ocorrências por dia (últimos 7 dias)
  - Estados: Aberta, Em Execução, Resolvida
  - Cores codificadas por status

- **Gráfico de Pizza**: Distribuição por categoria
  - Manutenção (35%)
  - Limpeza (25%)
  - Infraestrutura (20%)
  - Eventos (15%)
  - Segurança (5%)

- **Seção de Alertas**: 3 tipos
  - 🔴 **Críticos**: Itens vencidos
  - 🟡 **Atenção**: Vencendo em 3 dias
  - 🟢 **Informação**: Atualizado

- **Atividades Recentes**: Últimas 4 operações com timestamp

- **Botões de Ação Rápida**:
  - Nova Ocorrência
  - Agendar Evento
  - Upload Documento
  - Ver Relatórios

### Como Usar
1. Acessar `/dashboard`
2. Visualizar KPIs principais
3. Monitorar alertas críticos
4. Usar botões de ação rápida para tarefas comuns

---

## 2. Ocorrências (Tickets)

**Localização**: `/ocorrencias`

### CRUD Completo

#### Criar (Create)
1. Clique em "+ Nova Ocorrência"
2. Preencher:
   - **Título** (obrigatório)
   - **Descrição** (obrigatório)
   - **Categoria** (dropdown: Manutenção, Limpeza, etc.)
   - **Prioridade** (Crítica, Alta, Média, Baixa)
   - **Local** (dropdown: Auditório, Lab Maker, etc.)
3. **Usar Sugestão Inteligente**:
   - Clique em "💡 Gerar Sugestão Inteligente"
   - Sistema analisa título/descrição
   - Sugere: Prioridade, Departamento, Prazo
   - Mostrar % de confiança
   - Aceitar ou rejeitar sugestão
4. Clique "Criar Ocorrência"

#### Ler (Read)
- Visualizar lista com filtros:
  - **Busca**: Campo de texto (busca em título/descrição/local)
  - **Filtro por Categoria**: Dropdown
  - **Filtro por Prioridade**: Dropdown
  - **Filtro por Status**: Dropdown
- Clique em ocorrência para ver detalhes completos

#### Atualizar (Update)
1. Clique em ocorrência para abrir detalhes
2. Clique "Editar"
3. Altere campos:
   - Status (Aberta → Em Análise → Em Execução → Resolvida/Cancelada)
   - Prioridade
   - Responsável
   - Data de Resolução
4. Clique "Salvar Alterações"

#### Deletar (Delete)
1. Na lista, clique no ícone "🗑️" (se disponível)
2. Confirmar deleção

### Características Especiais

**Numeração Automática**
- Cada ocorrência recebe ID único: OC-2024-001, OC-2024-002, etc.

**Comentários**
- Adicionar comentários para rastreabilidade
- Cada comentário mostra: Autor, Timestamp, Texto

**Histórico**
- Auditoria completa de mudanças
- Vê quem alterou o quê e quando

**Inteligência Artificial (Simulada)**
- Sugestão automática de prioridade/departamento
- Baseada em análise de keywords
- Exemplos:
  - "ar condicionado quebrado" → Prioridade Alta
  - "vazamento de água" → Prioridade Crítica
  - "lâmpada queimada" → Prioridade Baixa

### Fluxo de Status
```
Aberta → Em Análise → Em Execução → Resolvida (ou Cancelada)
```

---

## 3. Documentos

**Localização**: `/documentos`

### Funcionalidades

#### Upload de Documentos
1. Clique em "+ Novo Documento"
2. Selecione arquivo (PDF, DOC, DOCX, XLS, XLSX, JPG, PNG)
3. Preencha:
   - Título
   - Categoria (Contratos, Relatórios, etc.)
   - Descrição
   - Data de Expiração (opcional)
4. Clique "Enviar"

#### Visualizar Documentos
- Grid mostrando:
  - Thumbnail
  - Título
  - Categoria
  - Status (Ativo, Expirado, Próximo de Expirar)
  - Data de Upload
  - Data de Expiração

#### Download
- Clique em "⬇️ Download" para salvar arquivo

#### Versionamento
- Sistema mantém histórico de versões
- Restaurar versão anterior se necessário
- Ver quem fez alterações e quando

#### Gestão de Acessos
- Definir quem pode: Visualizar, Editar, Deletar
- Baseado em roles de usuário

---

## 4. Agenda / Eventos

**Localização**: `/agenda`

### Funcionalidades

#### Criar Evento
1. Clique em "+ Novo Evento"
2. Preencha:
   - Título
   - Data/Hora Início
   - Data/Hora Término
   - Local (Auditório, Lab Maker, Sala Criativa, Coworking, Hall, Espaço Multiuso)
   - Tipo (Workshop, Palestra, Reunião, Social, Treinamento, Demonstração)
   - Responsável
   - Capacidade esperada
3. Clique "Agendar"

#### Visualizar Agenda
- **Vista de Calendário**:
  - Mês completo
  - Eventos destacados por cor
  - Clique em data para ver eventos do dia

- **Vista de Lista**:
  - Eventos ordenados por data
  - Próximas ocorrências em destaque

#### Gerenciar Evento
- **Aprovar**: Confirmar evento (administrador)
- **Cancelar**: Se necessário
- **Adicionar Convidados**: Lista de presença
- **Gerar QR Code**: Para entrada/controle
- **Exportar ICS**: Adicionar a calendários externos

#### Controle de Presença
- Fazer check-in na entrada (escanear QR code)
- Registrar quem compareceu
- Gerar relatório de presença

#### Aviso de Conflitos
- Sistema alerta se local já está ocupado
- Permitir agendamento em horário alternativo

---

## 5. Insumos / Estoque

**Localização**: `/insumos`

### Funcionalidades

#### Visualizar Estoque
- **Alerta de Crítico**:
  - Barra vermelha mostrando itens: ⚠️ Crítico (3 itens)
  
- **Cartões por Item**:
  - Nome do insumo
  - Quantidade atual
  - Quantidade mínima
  - Barra de progresso visual
  - Status: 🟢 Normal, 🟡 Baixo, 🔴 Crítico

#### Requisitar Insumo
1. Clique em item no estoque
2. Clique "Requisitar"
3. Informe:
   - Quantidade desejada
   - Departamento
   - Justificativa (opcional)
4. Submeter requisição

#### Repor Estoque
1. Clique "+ Repor" no item crítico
2. Informe quantidade a adicionar
3. Sugerir fornecedor (se cadastrado)
4. Confirmar reposição

#### Registrar Movimento
- Cada movimento registra: Quem, O quê, Quando, Quantidade
- Histórico completo auditável

#### Alertas Automáticos
- Email quando item fica crítico
- Sugestão automática de compra via integração com Compras

---

## 6. Compras / Aquisições

**Localização**: `/compras`

### Funcionalidades

#### Fluxo de Compra (7 Estágios)
```
1. Solicitação (Aberta)
2. Aguardando Orçamento
3. Orçamento Recebido
4. Compra Realizada
5. Mercadoria Recebida
6. Nota Fiscal Processada
7. Concluída (ou Cancelada)
```

#### Criar Pedido de Compra
1. Clique em "+ Novo Pedido"
2. Preencha:
   - Descrição do item
   - Quantidade
   - Fornecedor (dropdown)
   - Data desejada de entrega
   - Prioridade
   - Autorização de gasto (se requerido)
3. Clique "Criar Pedido" (Estágio 1: Solicitação)

#### Acompanhar Pedido
- Visualizar em qual estágio está
- Ver histórico de alterações
- Atualizar status (admin)
- Adicionar notas/comentários

#### Receber Mercadoria
1. Ir ao pedido em Estágio 5: "Mercadoria Recebida"
2. Conferir quantidade/qualidade
3. Adicionar número de nota fiscal
4. Confirmar recebimento (move para Estágio 6)

#### Exportar Dados
- Gerar relatório CSV com todos os pedidos
- Filtrar por status, fornecedor, data

---

## 7. Equipamentos / Patrimônio

**Localização**: `/equipamentos`

### Funcionalidades

#### Cadastrar Equipamento
1. Clique em "+ Novo Equipamento"
2. Preencha:
   - Código de Patrimônio (auto-gerado)
   - Nome
   - Categoria (Informática, Áudio, Vídeo, Clima, etc.)
   - Marca/Modelo
   - Número de Série
   - Data de Aquisição
   - Localização Atual
   - Responsável
   - Valor
   - Documento de Compra
3. Clique "Salvar"

#### Visualizar Patrimônio
- Grid com:
  - Código de Patrimônio
  - Nome
  - Status: 🟢 Disponível, 🟡 Em Uso, 🔴 Em Manutenção, ⚫ Indisponível
  - Localização
  - Responsável
  - Última manutenção

#### Agendar Manutenção
1. Clique em equipamento
2. Clique "Agendar Manutenção"
3. Informe:
   - Tipo (Preventiva, Corretiva)
   - Data desejada
   - Técnico responsável
   - Descrição do problema
4. Confirmar agendamento

#### Registrar Manutenção
- Histórico completo de:
  - Quando foi feita
  - O que foi feito
  - Técnico responsável
  - Custo (se houver)
  - Documentação/Fotos

#### Transferência
- Registrar quando equipamento muda de local/responsável
- Sistema rastreia movimentação

#### Deprecação / Baixa
- Ao fim da vida útil:
  1. Clique "Marcar como Indisponível"
  2. Adicionar motivo (Avaria, Obsolescência, etc.)
  3. Documentar processo de descarte

---

## 8. Relatórios / Analytics

**Localização**: `/relatorios`

### Funcionalidades

#### KPIs Principais
- **Tempo Médio**: Horas até resolução
- **Taxa de Resolução**: Percentual resolvido vs total
- **Ocorrências Abertas**: Contagem
- **Satisfação**: Score NPS ou avaliação

#### Gráficos Disponíveis

**Gráfico de Barras**: Tendência mensal com 3 séries
- Ocorrências criadas
- Eventos agendados
- Compras realizadas

**Gráfico de Pizza**: Distribuição por categoria/status

**Gráfico de Linha**: Série temporal

**Heatmap**: Intensidade por dia/horário (quando ocupado)

#### Filtros
- **Por Data**: Range selector
- **Por Departamento**: Multi-select
- **Por Tipo**: Checkbox de tipos
- **Por Status**: Apenas concluídos, apenas pendentes, todos

#### Exportar
- **CSV**: Dados brutos para Excel
- **PDF**: Relatório formatado para impressão
- **PNG**: Salvar gráficos como imagens
- **Email**: Enviar relatório automaticamente

#### Agendamento de Relatórios
- Receber relatório automático por email
- Diários, semanais, mensais
- Personalizar quais dados incluir

---

## 9. Configurações / Admin

**Localização**: `/configuracoes`

### Gerenciamento de Usuários

#### Adicionar Usuário
1. Clique em "+ Novo Usuário"
2. Preencha:
   - Nome Completo
   - Email
   - Departamento
   - Cargo
   - Role/Perfil (Administrador, Administração, Recepção, Manutenção, Limpeza, Visitante)
   - Status (Ativo/Inativo)
3. Clique "Adicionar"
4. Email enviado com link de set password

#### Editar Usuário
1. Clique em usuário
2. Clique "Editar"
3. Altere:
   - Dados básicos
   - Role
   - Departamento
   - Status
4. Clique "Salvar"

#### Desativar/Deletar
1. Clique em usuário
2. Clique "Desativar" ou "Deletar"
3. Confirmar ação

### Gerenciamento de Roles/Permissões

#### 6 Roles Definidos

1. **Administrador**
   - Acesso completo
   - Pode criar/editar/deletar tudo
   - Acesso a configurações

2. **Administração**
   - Vê todas as ocorrências
   - Pode editar e deletar
   - Acesso a relatórios
   - Sem acesso a configurações

3. **Recepção**
   - Cria ocorrências
   - Alterna novas para "Em Análise"
   - Vê documentos
   - Sem acesso a edição

4. **Manutenção**
   - Vê ocorrências do seu departamento
   - Edita status e adiciona comentários
   - Agenda manutenção de equipamentos

5. **Limpeza**
   - Vê ocorrências de limpeza
   - Marca como resolvida
   - Requisita insumos

6. **Visitante**
   - Apenas visualização limitada
   - Sem criar conteúdo
   - Acesso ao calendário de eventos

### Matriz de Permissões

```
                    | Admin | Adm | Rec | Man | Limp | Visit
Criar Ocorrência    |  ✅   | ✅  | ✅  | ✅  |  ✅  |  ❌
Editar Ocorrência   |  ✅   | ✅  | ❌  | ✅  |  ✅  |  ❌
Ver Relatórios      |  ✅   | ✅  | ❌  | ✅  |  ❌  |  ❌
Deletar Ocorrência  |  ✅   | ❌  | ❌  | ❌  |  ❌  |  ❌
Gerenciar Usuários  |  ✅   | ❌  | ❌  | ❌  |  ❌  |  ❌
Ver Relatórios      |  ✅   | ✅  | ❌  | ✅  |  ❌  |  ❌
```

### Departamentos

#### Listar Departamentos
- Direção
- Administração
- Tecnologia
- Limpeza
- Eventos
- Recepção

#### Adicionar Departamento
1. Clique "+ Novo Departamento"
2. Informe nome
3. Selecione chefe de departamento
4. Clique "Criar"

#### Editar Departamento
1. Clique em departamento
2. Altere dados
3. Clique "Salvar"

---

## 10. Gestão de Documentos (Admin)

**Localização**: `/gestaodoc`

### Funcionalidades (Parecidas com Documentos, mas Admin)

#### Administrar Documentos
- Visualizar todos os documentos do sistema
- Ver quem fez upload, quando, qual versão

#### Aprovar Documentos
- Se documento requer aprovação
- Admin clica "Aprovar"
- Ativa para todos usuários

#### Definir Categorias
- Admin pode definir/editar categorias de documento
- Padrão: Contratos, Relatórios, RH, Financeiro, Técnico, Outros

#### Arquivar/Restaurar
- Documentos antigos: Arquivar
- Se precisar: Restaurar de arquivo

#### Replicar Permissões
- Copiar permissões de um documento para vários

---

## 11. Contratos / Fornecedores

**Localização**: `/contratos`

### Funcionalidades

#### Registrar Contrato
1. Clique em "+ Novo Contrato"
2. Preencha:
   - Nome do Fornecedor
   - Assunto/Serviço
   - Valor Total
   - Data de Assinatura
   - Data de Expiração
   - Responsável Interno
   - Termos (campo de texto)
3. Clique "Salvar"

#### Visualizar Contratos
- Cards mostrando:
  - Fornecedor
  - Assunto
  - Status (Ativo, Próximo de Vencer, Expirado)
  - Data de Expiração
  - ID do Contrato
  - Valor Mensal/Anual

#### Alertas de Renovação
- Email 30 dias antes de expiração
- Status muda para 🟡 "Próximo de Vencer"
- Um mês após: Status muda para 🔴 "Expirado"

#### Anexar Documentos
- Upload do PDF do contrato
- Anexar aditivos, emendas
- Manter histórico de versões

#### Registrar Pagamentos
- Qual período foi pago
- Data de pagamento
- Valor efetivamente pago
- Gerar recibos

#### Renovar Contrato
1. Na expiração, clique "Renovar"
2. Simular novo contrato com mesmas informações
3. Ajustar termos/valor
4. Submeter para assinatura

---

## 12. Busca Global

**Localização**: Header (em desenvolvimento)

### Funcionalidades

#### Buscar em Tudo
- Campo no topo: "🔍 Buscar..."
- Procura em: Ocorrências, Documentos, Equipamentos, Eventos, Compras

#### Visualizar Resultados
- Agrupado por tipo
- Destacar keywords encontrados
- Clique em resultado para abrir

#### Salvos
- Salvar buscas frequentes
- Dashboard de buscas recentes

---

## 13. Notificações

**Localização**: Header - Sino 🔔

### Tipos de Notificações

#### Sistema
- Novo comentário em ocorrência seguida
- Ocorrência chegando ao prazo

#### Eventos
- Evento começando em 1 hora
- Confirmação de presença solicitada

#### Estoque
- Item ficou crítico
- Reposição concluída

#### Compras
- Pedido aprovado
- Mercadoria chegou

#### Administrativas
- Novo usuário adicionado
- Documento requer aprovação

### Notificações Push
- Ativar notificações do navegador
- Alerta mesmo com abas fechadas

---

## 14. Perfil de Usuário

**Localização**: Header - Avatar do usuário

### Funcionalidades

#### Ver Perfil
- Nome, email, departamento
- Cargo, role
- Data de ingresso
- Foto de perfil

#### Editar Perfil
- Alterar nome, foto
- Mudar senha
- Alterar email (requer verificação)

#### Preferências
- Idioma (PT-BR, ES, EN)
- Tema (Claro/Escuro - em desenvolvimento)
- Notificações: Email, SMS, Push
- Fuso horário

#### Logout
- Desconectar da plataforma
- Voltar ao login

---

## 15. Sidebar / Navegação

**Localização**: Lado esquerdo (mobile: drawer)

### Menu Principal
1. Dashboard
2. Ocorrências
3. Documentos
4. Agenda
5. Insumos
6. Compras
7. Equipamentos
8. Relatórios
9. Configurações (admin)
10. Gestão Doc (admin)
11. Contratos

### Comportamento
- **Desktop**: Sempre visível, posição fixa à esquerda
- **Mobile**: Menu hambúrguer, abre em drawer
- **Responsività**: Colapsa com icons se tela < 1024px

### Cor Atual
- Item ativo: Borda esquerda azul, fundo destacado
- Ícones coloridos por categoria

### Filtro por Role
- Alguns itens aparecem apenas para certos roles
- Ex: "Configurações" só aparece para Administrador

---

## Por Onde Começar?

### Usuário Novo / Visitante
1. Acessar `/dashboard`
2. Ver KPIs principais
3. Abrir `/ocorrencias` para criar ticket
4. Consultar `/agenda` para próximos eventos

### Gerente de Estoque
1. Ir para `/insumos`
2. Verificar itens críticos
3. Requisitar reposição
4. Acompanhar compras em `/compras`

### Administrador
1. `/configuracoes` → Gerenciar usuários
2. `/relatorios` → Extrair dados
3. `/gestaodoc` → Aprovar documentos
4. `/contratos` → Renovar vigente

### Gerente de Eventos
1. `/agenda` → Agendar evento
2. Gerar QR code para check-in
3. `/agenda` → Ver presença
4. Exportar relatório em `/relatorios`

---

## Atalhos de Teclado (em desenvolvimento)

```
Ctrl/Cmd + K     : Abrir busca global
Ctrl/Cmd + ,     : Abrir configurações
Ctrl/Cmd + L     : Logout rápido
Ctrl/Cmd + +     : Aumentar zoom
?                 : Ver todos os atalhos
```

---

**Dúvidas?** Veja README.md ou contacte o suporte. 📧
