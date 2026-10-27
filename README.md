# Boah Display Lab

Workspace colaborativo para desenvolver os expositores da boah.a.

## Stack
- Front-end estático (GitHub Pages ou Cloudflare Pages)
- API no Cloudflare Workers
- Dados persistentes no Cloudflare D1
- Para colaboração ao vivo, Durable Objects ou atualização periódica após configurar o Worker.

## Pastas
- `public/`: interface
- `worker/`: API de dados
- `schema.sql`: esquema inicial de dados
- `wrangler.toml`: configuração Cloudflare

## Configuração
Veja `SETUP.md` para publicar e criar o banco. Não coloque segredos no código do navegador.
