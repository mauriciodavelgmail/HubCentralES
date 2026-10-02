-- Seed data for HubCentral ES+ demonstration
-- This file contains realistic sample data for testing and presentation

-- =============================================================================
-- DEPARTMENTS
-- =============================================================================

INSERT INTO departments (name, description, code) VALUES
  ('Direção', 'Direção Executiva do HUB ES+', 'DIR'),
  ('Administração', 'Setor Administrativo', 'ADM'),
  ('Tecnologia', 'Setor de Tecnologia e Infraestrutura', 'TEC'),
  ('Limpeza e Manutenção', 'Setor de Limpeza e Manutenção', 'LMP'),
  ('Eventos e Comunicação', 'Organização de Eventos e Comunicação', 'EVT'),
  ('Recepção', 'Setor de Recepção', 'REC')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SPACES
-- =============================================================================

INSERT INTO spaces (name, description, capacity, location, amenities) VALUES
  ('auditorio', 'Auditório principal com capacidade para 150 pessoas', 150, 'Andar 1 - Bloco Principal', ARRAY['Projetor', 'Microfone', 'Som', 'Ar condicionado']),
  ('lab_maker', 'Laboratório maker com equipamentos de prototipagem', 30, 'Andar 2 - Bloco Criativo', ARRAY['Impressora 3D', 'Cortadora a laser', 'Mesa de trabalho', 'Computadores']),
  ('sala_criativa', 'Sala para workshops e atividades criativas', 40, 'Andar 1 - Bloco Criativo', ARRAY['Quadros brancos', 'Mesas altas', 'Prototipagem']),
  ('coworking', 'Área de coworking com mesas de trabalho', 25, 'Andar 3 - Bloco Administrativo', ARRAY['Internet de alta velocidade', 'Café', 'Estações de trabalho']),
  ('hall', 'Hall de entrada e exposição', 100, 'Andar Térreo', ARRAY['Exposição', 'Recepção', 'Assentos']),
  ('espaco_multiuso', 'Espaço versátil para diversos eventos', 80, 'Andar 2 - Bloco Principal', ARRAY['Modular', 'A/C', 'Cozinha'])
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PROFILES (USERS)
-- =============================================================================

INSERT INTO profiles (user_id, email, full_name, role, department_id, is_active, avatar_url) VALUES
  (NULL, 'admin@hubcentral.es', 'Administrador Sistema', 'administrador', (SELECT id FROM departments WHERE name = 'Direção'), true, NULL),
  (NULL, 'gerente@hubcentral.es', 'Gerente Administrativo', 'administracao', (SELECT id FROM departments WHERE name = 'Administração'), true, NULL),
  (NULL, 'recepcao@hubcentral.es', 'Recepcionista', 'recepcao', (SELECT id FROM departments WHERE name = 'Recepção'), true, NULL),
  (NULL, 'manutencao@hubcentral.es', 'Técnico Manutenção', 'manutencao', (SELECT id FROM departments WHERE name = 'Tecnologia'), true, NULL),
  (NULL, 'limpeza@hubcentral.es', 'Supervisor Limpeza', 'limpeza', (SELECT id FROM departments WHERE name = 'Limpeza e Manutenção'), true, NULL),
  (NULL, 'eventos@hubcentral.es', 'Coordenador Eventos', 'administracao', (SELECT id FROM departments WHERE name = 'Eventos e Comunicação'), true, NULL),
  (NULL, 'visitante@hubcentral.es', 'Usuário Visitante', 'visitante', (SELECT id FROM departments WHERE name = 'Recepção'), true, NULL)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- SUPPLIES AND EQUIPMENTS CATEGORIES
-- =============================================================================

INSERT INTO supplies (code, name, category, current_quantity, minimum_quantity, unit, status, supplier, unit_cost) VALUES
  ('LMP001', 'Papel toalha', 'limpeza', 45, 20, 'pacotes', 'normal', 'Fornecedor A', 15.50),
  ('LMP002', 'Sabonete líquido', 'limpeza', 12, 10, 'litros', 'normal', 'Fornecedor A', 25.00),
  ('LMP003', 'Desinfetante', 'limpeza', 8, 15, 'litros', 'baixo', 'Fornecedor A', 18.00),
  ('LMP004', 'Pano de limpeza', 'limpeza', 5, 10, 'pacotes', 'critico', 'Fornecedor B', 12.00),
  ('ESC001', 'Papel A4', 'escritorio', 100, 50, 'resmas', 'normal', 'Fornecedor C', 35.00),
  ('ESC002', 'Toner para impressora', 'escritorio', 8, 5, 'unidades', 'normal', 'Fornecedor C', 120.00),
  ('EVT001', 'Decoração natalina', 'evento', 2, 1, 'kits', 'normal', 'Fornecedor D', 250.00),
  ('MNT001', 'Lâmpada LED', 'manutencao', 30, 10, 'unidades', 'normal', 'Fornecedor E', 8.50),
  ('MNT002', 'Parafuso inox', 'manutencao', 200, 50, 'pacotes', 'normal', 'Fornecedor E', 5.00),
  ('TEC001', 'Cabo HDMI', 'tecnologia', 15, 5, 'unidades', 'normal', 'Fornecedor F', 25.00),
  ('CON001', 'Café em grãos', 'consumo', 30, 20, 'kg', 'normal', 'Fornecedor G', 35.00),
  ('CON002', 'Biscoitos sortidos', 'consumo', 10, 5, 'caixas', 'normal', 'Fornecedor G', 45.00)
ON CONFLICT DO NOTHING;

INSERT INTO equipments (patrimonial_code, name, description, category, location, status, acquisition_date, next_maintenance, manufacturer, model) VALUES
  ('EQ001-2024', 'Projetor principal auditório', 'Projetor 4K para eventos', 'audiovisual', 'Auditório', 'disponivel', '2024-01-15', '2026-01-15', 'Epson', 'EB-2250U'),
  ('EQ002-2024', 'Impressora 3D Ultimaker', 'Impressora 3D profissional', 'fabricação', 'Lab Maker', 'disponivel', '2024-03-20', '2025-03-20', 'Ultimaker', 'S5'),
  ('EQ003-2024', 'Cortadora a laser CO2', 'Cortadora laser 120W', 'fabricação', 'Lab Maker', 'em_manutencao', '2023-06-10', '2025-12-10', 'Kepler', 'KH1325'),
  ('EQ004-2024', 'Servidor de rede', 'Servidor NAS para armazenamento', 'tecnologia', 'Sala de TI', 'disponivel', '2024-02-01', '2025-02-01', 'QNAP', 'TS-932PX'),
  ('EQ005-2024', 'Câmera de vigilância', 'Câmera IP 4K', 'seguranca', 'Hall de entrada', 'disponivel', '2023-11-15', '2026-11-15', 'Hikvision', 'DS-2CD2143G0-I'),
  ('EQ006-2024', 'Ar condicionado auditório', 'Ar condicionado 48000 BTU', 'climatizacao', 'Auditório', 'disponivel', '2023-05-20', '2025-05-20', 'Carrier', '48000 BTU'),
  ('EQ007-2024', 'Bebedouro', 'Bebedouro com filtro', 'consumo', 'Área comum', 'indisponivel', '2022-08-05', '2025-08-05', 'Eclipse', 'EC-10'),
  ('EQ008-2024', 'Forno micro-ondas', 'Forno micro-ondas 1000W', 'cozinha', 'Cozinha', 'em_uso', '2024-01-10', '2027-01-10', 'Brastemp', 'BMM45AK'),
  ('EQ009-2024', 'Geladeira', 'Geladeira 2 portas 450L', 'cozinha', 'Cozinha', 'disponivel', '2023-09-15', '2028-09-15', 'Brastemp', 'BRM56HK'),
  ('EQ010-2024', 'Mesa reunião', 'Mesa de reunião 3m', 'mobiliario', 'Sala de reunião', 'disponivel', '2024-07-01', '2029-07-01', 'Movile', 'MR-300')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DOCUMENTS
-- =============================================================================

INSERT INTO documents (title, description, category, status, file_url, file_type, validity_date, version, tags, control_id) VALUES
  ('Contrato prestação de serviços 2024', 'Contrato com fornecedor de limpeza', 'contratos', 'ativo', 'https://example.com/doc001.pdf', 'application/pdf', '2025-12-31', 1, ARRAY['fornecedor', 'limpeza'], 'CT2024001'),
  ('POP - Procedimento de limpeza', 'Padronização de procedimentos para limpeza', 'pops', 'ativo', 'https://example.com/doc002.pdf', 'application/pdf', NULL, 2, ARRAY['procedimento', 'limpeza', 'padrão'], 'POPLMP001'),
  ('Norma de segurança do trabalho', 'Normas gerais de segurança', 'normas', 'ativo', 'https://example.com/doc003.pdf', 'application/pdf', '2026-06-30', 1, ARRAY['seguranca', 'trabalho'], 'NRMSTB001'),
  ('Edital de chamada pública 2024', 'Edital para seleção de fornecedores', 'editais', 'ativo', 'https://example.com/doc004.pdf', 'application/pdf', '2025-03-31', 1, ARRAY['licitacao', 'fornecedores'], 'EDT2024001'),
  ('Ata da reunião de direção', 'Ata da reunião de planejamento Q4 2024', 'atas', 'ativo', 'https://example.com/doc005.pdf', 'application/pdf', NULL, 1, ARRAY['reuniao', 'direcao'], 'ATADIR20241001'),
  ('Documento fiscal nota fiscal', 'NF de aquisição de materiais', 'documentos_fiscais', 'ativo', 'https://example.com/doc006.pdf', 'application/pdf', '2025-10-02', 1, ARRAY['nota', 'fiscal', 'aquisicao'], 'NF202400562'),
  ('Foto patrimônio equipamento', 'Fotografia do projetor auditório', 'patrimonio', 'ativo', 'https://example.com/patrimonio001.jpg', 'image/jpeg', NULL, 1, ARRAY['patrimonio', 'foto'], 'FTPATEQ001'),
  ('Relatório de atividades mensal', 'Relatório de atividades realizadas em outubro', 'relatorios', 'ativo', 'https://example.com/doc008.pdf', 'application/pdf', NULL, 1, ARRAY['relatorio', 'atividades'], 'RELOUT2024'),
  ('Comunicação institucional newsletter', 'Newsletter de outubro 2024', 'comunicacao_institucional', 'ativo', 'https://example.com/doc009.pdf', 'application/pdf', NULL, 1, ARRAY['comunicacao', 'newsletter'], 'COMNEWS102024'),
  ('Documento vencido contrato 2023', 'Contrato antigo vencido', 'contratos', 'vencido', 'https://example.com/doc010.pdf', 'application/pdf', '2023-12-31', 1, ARRAY['arquivos'], 'CT2023099')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- OCCURRENCES
-- =============================================================================

INSERT INTO occurrences (occurrence_number, title, description, category, priority, status, location, solution, deadline, reporter_id, responsible_id) VALUES
  ('OC000001', 'Ar condicionado auditório não ligando', 'O ar condicionado do auditório não está ligando. Necessário verificar conexão elétrica e componentes internos.', 'infraestrutura', 'alta', 'em_execucao', 'Auditório', NULL, '2025-10-05', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'manutencao@hubcentral.es')),
  ('OC000002', 'Toner de impressora acabado', 'Toner preto da impressora administrativo acabou. Necessário substituição urgente.', 'tecnologia', 'media', 'em_analise', 'Setor Administrativo', NULL, '2025-10-04', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'manutencao@hubcentral.es')),
  ('OC000003', 'Lâmpada queimada - Lab Maker', 'Lâmpada queimada na área de trabalho do lab maker precisa substituição.', 'manutencao', 'baixa', 'aberta', 'Lab Maker', NULL, '2025-10-10', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'manutencao@hubcentral.es')),
  ('OC000004', 'Vazamento na cozinha', 'Cano sob pia da cozinha está vazando água constantemente.', 'infraestrutura', 'critica', 'em_execucao', 'Cozinha', NULL, '2025-10-03', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'manutencao@hubcentral.es')),
  ('OC000005', 'Sinalização hall danificada', 'Placa de sinalização do hall de entrada danificada, pendendo para um lado.', 'limpeza', 'baixa', 'resolvida', 'Hall', 'Placa retirada e será refeita', '2025-09-25', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'limpeza@hubcentral.es')),
  ('OC000006', 'Equipamento de segurança - câmera com defeito', 'Câmera de vigilância entrada não está funcionando / transmitindo imagens.', 'seguranca', 'critica', 'aberta', 'Entrada principal', NULL, '2025-10-02', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'manutencao@hubcentral.es')),
  ('OC000007', 'Evento agendado - falta de organização de espaço', 'Evento de amanhã sem confirmação de preparação do espaço e equipamentos.', 'evento', 'alta', 'em_analise', 'Auditório', NULL, '2025-10-02', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'eventos@hubcentral.es')),
  ('OC000008', 'Falta de material de limpeza', 'Panos de limpeza acabados no almoxarifado, afeta limpeza diária.', 'limpeza', 'media', 'aberta', 'Almoxarifado', NULL, '2025-10-06', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'limpeza@hubcentral.es')),
  ('OC000009', 'Internet lenta em coworking', 'Conexão de internet instável na área de coworking, afetando trabalho de usuários.', 'tecnologia', 'media', 'em_execucao', 'Coworking', NULL, '2025-10-05', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'manutencao@hubcentral.es')),
  ('OC000010', 'Mobiliário quebrado sala criativa', 'Cadeira de trabalho com pé quebrado, perigosa para usuário.', 'manutencao', 'alta', 'em_execucao', 'Sala Criativa', NULL, '2025-10-04', (SELECT id FROM profiles WHERE email = 'recepcao@hubcentral.es'), (SELECT id FROM profiles WHERE email = 'manutencao@hubcentral.es'))
ON CONFLICT DO NOTHING;

-- =============================================================================
-- EVENTS
-- =============================================================================

INSERT INTO events (title, description, event_type, space_id, status, start_date, start_time, end_time, capacity, approved_at) VALUES
  ('Workshop de Prototipagem com 3D', 'Workshop prático sobre impressão 3D e design', 'workshop', 
   (SELECT id FROM spaces WHERE name = 'lab_maker'), 'confirmada', '2025-10-05', '10:00', '12:00', 25, CURRENT_TIMESTAMP),
  ('Reunião de Planejamento Q4 2024', 'Reunião executiva com diretores', 'reuniao', 
   (SELECT id FROM spaces WHERE name = 'auditorio'), 'confirmada', '2025-10-03', '14:00', '16:30', 30, CURRENT_TIMESTAMP),
  ('Palestra sobre Inovação Criativa', 'Palestrante convidado abordando inovação', 'palestra', 
   (SELECT id FROM spaces WHERE name = 'auditorio'), 'confirmada', '2025-10-10', '09:00', '10:30', 100, CURRENT_TIMESTAMP),
  ('Encontro de Startups do Hub', 'Networking e apresentação de projetos', 'encontro', 
   (SELECT id FROM spaces WHERE name = 'espaco_multiuso'), 'aguardando_aprovacao', '2025-10-15', '18:00', '20:00', 60, NULL),
  ('Oficina de Laser Cutting', 'Treinamento de uso de cortadora laser', 'workshop', 
   (SELECT id FROM spaces WHERE name = 'lab_maker'), 'confirmada', '2025-10-08', '15:00', '17:00', 20, CURRENT_TIMESTAMP),
  ('Reunião Administrativa Setores', 'Alinhamento entre setores administrativos', 'reuniao', 
   (SELECT id FROM spaces WHERE name = 'sala_criativa'), 'confirmada', '2025-10-06', '10:00', '11:30', 25, CURRENT_TIMESTAMP),
  ('Coworking Day - Networking', 'Dia aberto para visitantes no coworking', 'encontro', 
   (SELECT id FROM spaces WHERE name = 'coworking'), 'aguardando_aprovacao', '2025-10-20', '14:00', '18:00', 20, NULL),
  ('Workshop de Design Thinking', 'Introdução a metodologia de design thinking', 'workshop', 
   (SELECT id FROM spaces WHERE name = 'sala_criativa'), 'confirmada', '2025-10-12', '14:00', '16:30', 30, CURRENT_TIMESTAMP),
  ('Apresentação de Resultados', 'Apresentação dos resultados do trimestre', 'palestra', 
   (SELECT id FROM spaces WHERE name = 'auditorio'), 'cancelada', '2025-09-28', '10:00', '11:00', 80, NULL),
  ('Evento de Lançamento', 'Lançamento de novo programa do hub', 'encontro', 
   (SELECT id FROM spaces WHERE name = 'hall'), 'confirmada', '2025-10-22', '17:00', '20:00', 100, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PURCHASES PROCESS EXAMPLE
-- =============================================================================

INSERT INTO purchases (purchase_number, supply_id, status, priority, solicitant_id, estimated_value, justification) VALUES
  ('CP000001', (SELECT id FROM supplies WHERE code = 'LMP003'), 'cotacao', 'alta', (SELECT id FROM profiles WHERE email = 'gerente@hubcentral.es'), 250.00, 'Reposição de estoque crítico'),
  ('CP000002', (SELECT id FROM supplies WHERE code = 'LMP004'), 'solicitacao', 'critica', (SELECT id FROM profiles WHERE email = 'gerente@hubcentral.es'), 150.00, 'Estoque crítico de panos'),
  ('CP000003', (SELECT id FROM supplies WHERE code = 'ESC002'), 'aprovacao', 'media', (SELECT id FROM profiles WHERE email = 'gerente@hubcentral.es'), 600.00, 'Reposição mensal'),
  ('CP000004', (SELECT id FROM supplies WHERE code = 'CON001'), 'compra_realizada', 'baixa', (SELECT id FROM profiles WHERE email = 'gerente@hubcentral.es'), 1050.00, 'Fornecimento trimestral'),
  ('CP000005', (SELECT id FROM supplies WHERE code = 'TEC001'), 'recebimento', 'media', (SELECT id FROM profiles WHERE email = 'admin@hubcentral.es'), 375.00, 'Ampliação de acessórios'),
  ('CP000006', (SELECT id FROM supplies WHERE code = 'ESC001'), 'concluida', 'media', (SELECT id FROM profiles WHERE email = 'admin@hubcentral.es'), 3500.00, 'Suprimento semestral'),
  ('CP000007', (SELECT id FROM supplies WHERE code = 'EVT001'), 'cancelada', 'baixa', (SELECT id FROM profiles WHERE email = 'eventos@hubcentral.es'), 500.00, 'Evento cancelado'),
  ('CP000008', (SELECT id FROM supplies WHERE code = 'MNT001'), 'solicitacao', 'media', (SELECT id FROM profiles WHERE email = 'manutencao@hubcentral.es'), 255.00, 'Manutenção preventiva'),
  ('CP000009', (SELECT id FROM supplies WHERE code = 'LMP002'), 'aprovacao', 'media', (SELECT id FROM profiles WHERE email = 'limpeza@hubcentral.es'), 300.00, 'Limpeza intensiva'),
  ('CP000010', (SELECT id FROM supplies WHERE code = 'MNT002'), 'cotacao', 'baixa', (SELECT id FROM profiles WHERE email = 'manutencao@hubcentral.es'), 75.00, 'Pequenos reparos')
ON CONFLICT DO NOTHING;

-- Alert/notification pseudo-data is minimal since it's system-generated
-- But we can seed some sample data structures for testing

-- =============================================================================
-- SETTINGS
-- =============================================================================

INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('sla_occurrence', '{"baixa": 14, "media": 7, "alta": 3, "critica": 1}'::jsonb, 'SLA em dias para resolução de ocorrências'),
  ('max_supply_requisition', '500'::jsonb, 'Valor máximo para requisição sem aprovação'),
  ('notification_admin_email', '"admin@hubcentral.es"'::jsonb, 'Email do administrador para notificações'),
  ('working_hours', '{"start": "08:00", "end": "18:00"}'::jsonb, 'Horário de funcionamento do hub'),
  ('maintenance_check_days', '30'::jsonb, 'Dias entre verificações de manutenção preventiva')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ACTIVITY LOG SAMPLE
-- =============================================================================

INSERT INTO activity_logs (action, entity_type, entity_id, new_data) VALUES
  ('create', 'occurrence', NULL, '{"title": "Ar condicionado auditório não ligando", "priority": "alta", "status": "em_execucao"}'::jsonb),
  ('update', 'supply', NULL, '{"code": "LMP003", "current_quantity": 8, "status": "baixo"}'::jsonb),
  ('create', 'event', NULL, '{"title": "Workshop de Prototipagem com 3D", "status": "confirmada"}'::jsonb),
  ('update', 'purchase', NULL, '{"purchase_number": "CP000001", "status": "cotacao"}'::jsonb),
  ('create', 'document', NULL, '{"title": "POP - Procedimento de limpeza", "category": "pops"}'::jsonb)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- INDEXES FOR COMMON QUERIES
-- =============================================================================

-- Full-text search index for documents
CREATE INDEX IF NOT EXISTS idx_documents_full_text ON documents 
  USING GIN (to_tsvector('portuguese', title || ' ' || COALESCE(description, '')));

-- Full-text search index for occurrences
CREATE INDEX IF NOT EXISTS idx_occurrences_full_text ON occurrences 
  USING GIN (to_tsvector('portuguese', title || ' ' || COALESCE(description, '')));

-- Full-text search index for events
CREATE INDEX IF NOT EXISTS idx_events_full_text ON events 
  USING GIN (to_tsvector('portuguese', title || ' ' || COALESCE(description, '')));
