# Configuração do Boah Display Lab

## 1. Criar o banco D1
No terminal, com Wrangler instalado e autenticado:

```bash
npx wrangler d1 create boah-display-lab
```

Copie o `database_id` retornado para `wrangler.toml`.

Inicialize o esquema:

```bash
npx wrangler d1 execute boah-display-lab --remote --file=./schema.sql
```

## 2. Configurar segredos do Worker

```bash
npx wrangler secret put EDIT_PIN
npx wrangler secret put SESSION_SECRET
```

Use valores fortes e não os compartilhe no chat.

## 3. Publicar API

```bash
npx wrangler deploy
```

Anote a URL gerada (por exemplo, https://boah-display-lab.<seu-subdominio>.workers.dev) e configure `API_BASE` em `public/app.js`.

## 4. Publicar interface

Opção recomendada: Cloudflare Pages, conectando este repositório e usando:
- Build command: (vazio)
- Build output directory: `public`

Também pode usar GitHub Pages servindo a pasta `public` via workflow.

## Segurança e colaboração
O PIN é validado na API, nunca apenas no navegador. A API usa uma sessão assinada para edição. Leituras públicas são permitidas porque a ideia é compartilhar por link; não coloque informação sensível nesse painel. A versão inicial inclui sincronização por polling. Podemos migrar para Durable Objects para eventos em tempo real, sem precisar refazer a interface.
