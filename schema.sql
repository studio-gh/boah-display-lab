PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS displays (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Em desenvolvimento',
  brief TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  open_questions TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id TEXT,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Em aberto',
  owner TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(display_id) REFERENCES displays(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id TEXT,
  label TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  owner TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(display_id) REFERENCES displays(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id TEXT,
  author TEXT NOT NULL DEFAULT 'Equipe',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(display_id) REFERENCES displays(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Equipe',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id TEXT,
  actor TEXT NOT NULL DEFAULT 'Equipe',
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO displays (id, title, subtitle, status, brief, requirements, open_questions)
VALUES
('colares', 'Colares', 'Suporte vertical com gancho superior', 'Em exploração',
 'Display vertical com topo saliente. Substituir pinos por pequenas abas ou ganchos e avaliar impressão deitado para reduzir suportes.',
 'Estabilidade; ganchos/abas delicados; imprimir com menos suportes; testar com colares reais.',
 'Qual geometria de gancho segura melhor as correntes sem marcar ou enroscar?'),
('brincos', 'Brincos', 'Arco curvo perfurado', 'Validar medidas',
 'Display em formato de túnel/arco com furos distribuídos pela superfície.',
 'Confirmar diâmetro e espaçamento dos furos com os brincos reais; capacidade; espessura de parede; estabilidade; imprimibilidade.',
 'Quantos pares cabem mantendo leitura visual arejada?'),
('aneis', 'Anéis', 'Grade de pinos, versão mais leve', 'Explorar alternativa',
 'A grade de pinos funciona, mas parece volumosa. Investigar uma solução mais delicada e com menor consumo de filamento.',
 'Perfil visual leve; boa retenção; baixo volume de material; estabilidade na bancada.',
 'Podemos reduzir a espessura e o número de pinos sem perder praticidade?');

INSERT INTO decisions (display_id, title, detail, status, owner) VALUES
(NULL, 'Cor principal: amarelo / mostarda', 'Preferência para valorizar pedras coloridas. Off-white como alternativa secundária; bordô não é a primeira escolha.', 'Preferência registrada', 'Rê'),
(NULL, 'Produzir um protótipo de cada display', 'Testar os três conceitos com joias reais antes de fechar as dimensões finais.', 'A fazer', 'Dani'),
(NULL, 'Validar dimensões com joias reais', 'Medir peças, folgas, furos e estabilidade antes de finalizar os arquivos para impressão.', 'A fazer', 'Gui + Rê + Dani'),
(NULL, 'Usar abas/ganchos delicados em colares', 'Investigar alternativas aos pinos e considerar orientação de impressão deitada.', 'Em exploração', 'Dani');

INSERT INTO checklist_items (display_id, label, owner) VALUES
('colares', 'Definir medidas e alcance dos ganchos', 'Gui + Dani'),
('colares', 'Testar estabilidade com colares reais', 'Rê + Dani'),
('colares', 'Avaliar impressão deitada e suportes', 'Dani'),
('brincos', 'Medir haste e tarraxa dos brincos reais', 'Rê'),
('brincos', 'Definir diâmetro e espaçamento dos furos', 'Gui + Dani'),
('brincos', 'Validar espessura e estabilidade do arco', 'Dani'),
('aneis', 'Desenhar opção com menos material', 'Dani'),
('aneis', 'Comparar visual com a grade atual', 'Rê'),
('aneis', 'Testar retenção e estabilidade', 'Rê + Dani'),
(NULL, 'Imprimir um protótipo de cada display', 'Dani'),
(NULL, 'Registrar feedback após teste', 'Todos');
