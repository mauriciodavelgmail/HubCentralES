# Auditoria do escopo original

Revisão iniciada em 03/10/2026. Este documento separa o que está funcional do que ainda exige implementação, evitando tratar telas demonstrativas como recursos concluídos.

## Implementado e conectado ao Supabase

- Autenticação com Supabase Auth e carregamento de perfil.
- Gestão administrativa de usuários: criação, edição, perfil, ativação e redefinição de senha.
- Autorização de páginas por perfil, além da filtragem do menu.
- Dashboard com indicadores, gráficos, alertas e atividades calculados com dados reais.
- Agenda em calendário para visitante, solicitação por data e visualização de indisponibilidade.
- Conflito de espaço/horário validado no banco, status inicial por perfil e notificações de agenda.
- Documentos com upload no Storage e notificações persistentes.
- Ocorrências, insumos, compras e equipamentos com operações básicas conectadas.
- Relatórios reais e exportação CSV.
- Contratos com busca, cadastro, edição, validação, RLS e auditoria.
- Notificações persistentes com atualização em tempo real.
- Auditoria genérica de INSERT, UPDATE e DELETE para entidades de negócio.

## Parcialmente implementado

| Área | Situação atual | Adequação pendente |
| --- | --- | --- |
| Documentos | Cadastro, upload e listagem | Versionamento visual, vínculos clicáveis e timeline detalhada |
| Ocorrências | CRUD básico e evidência | Comentários/timeline completos, base de conhecimento e sugestão inteligente na experiência final |
| Agenda | Calendário e solicitação | Aprovação completa na interface, lista de presença, CSV, QR Code, link público e envio de e-mail |
| Insumos | Cadastro/listagem | Requisições de baixa, aprovação, movimentações e notificações de estoque |
| Compras | CRUD básico | Máquina de estados por perfil, anexos e documento fiscal integrado |
| Equipamentos | CRUD básico | Movimentações, timeline, ocorrências vinculadas e notificações específicas |
| Gestão documental | Existe rota separada | Consolidar com documentos reais e histórico universal |
| Configurações | Gestão de usuários | CRUD de setores, espaços, categorias, perfis/permissões e SLA |
| Busca global | Campo visual no cabeçalho | Índice e resultados navegáveis entre todos os módulos |

## Requisitos ainda não concluídos

- Presença em eventos com importação CSV, modelo para download e cadastro manual.
- Convite por e-mail com QR Code e link público de inscrição.
- Base de conhecimento reutilizável para soluções de ocorrências.
- Dark mode opcional.
- Dados de demonstração revisados e consistentes com os fluxos atuais.
- Substituição dos `prompt`/`confirm` nativos remanescentes por diálogos e toasts acessíveis.
- Cobertura automatizada de testes dos fluxos críticos.

## Ordem recomendada para os próximos lotes

1. Fluxo completo de ocorrências e conhecimento.
2. Aprovação de agenda e presença de participantes.
3. Requisições/movimentações de insumos.
4. Workflow e anexos de compras.
5. Movimentações e histórico de patrimônio.
6. Gestão documental e busca global.
7. Configurações parametrizáveis, seeds e testes ponta a ponta.

