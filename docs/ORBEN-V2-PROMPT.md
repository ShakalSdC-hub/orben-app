# Prompt de Kickoff — ORBEN v2 (novo projeto na VPS)

> Cole este prompt numa sessão nova (Claude Code, Lovable, Cursor etc.) junto com o arquivo `ORBEN-V2-BLUEPRINT.md` anexado.

---

Você é um(a) engenheiro(a) de software full-stack. Vamos construir o **ORBEN v2** do zero — um sistema de gestão de operações de reciclagem de sucata de cobre (cenários **Próprio / Terceiros / Intermediação**) para a empresa IBRAC, hospedado em VPS própria (sem dependência da Lovable).

**Stack**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui + Supabase (Postgres + Auth + Storage).
- Supabase: por padrão reaproveitar o projeto existente (`ggglyltvaddwxeelthhk`, 52 tabelas já em produção); se for self-host, sinalizar antes de gerar migrations.

**Fonte da verdade**: o arquivo `ORBEN-V2-BLUEPRINT.md` (anexo) — leia-o por completo antes de começar. Ele define:
- **Sistema de design** (seção 2): paleta M3 completa, tipografia Inter + JetBrains Mono, tokens de espaçamento/raio, padrões de componentes (cards, badges de status, tabelas, modais, timeline, filter chips, FAB).
- **7 telas** (seção 3): Início, Operações, Operação-detalhe, Importar NF-e (XML), Financeiro, Extrato do Parceiro, Cadastros — com dados de referência de cada uma.
- **Modelo de dados conceitual** (seção 4): Parceiro unificado, Operação unificada, Título Financeiro (responsável fiscal × financeiro + compensação), Anexo polimórfico, Extrato como view.
- **Regras de negócio** (seção 5): os 3 cenários, excecionalidade fiscal≠financeiro, mecanismo de compensação, fluxo de importação de NF-e.
- **Mapeamento com o schema Supabase atual** (seção 6): o que reaproveitar sem mudanças (`parceiros`, `acertos_financeiros`, `operacoes*`), o que precisa de `ALTER` (compensação em `acertos_financeiros`, migração `donos_material → parceiros`), e o que é novo (tabela `anexos`, views `operacoes_unificadas` e `extrato_parceiro`).
- **Dataset de referência** (seção 7): narrativa Renato/IBRAC/Op #0044 para seed e testes ponta a ponta.

**Como trabalhar**:
- Siga o roadmap da seção 8 do blueprint, fase por fase. Não pule para telas avançadas sem o shell global e os design tokens prontos.
- Rode `npm run dev` e valide visualmente cada tela contra o mockup HTML correspondente (`mockups/*.html`, também anexos) antes de seguir para a próxima.
- Mantenha os 7 mockups como referência pixel-a-pixel para layout/cores/spacing — não reinvente os componentes.

**Primeira entrega (Fase 1)**:
1. Scaffold do projeto + design tokens (Tailwind config com a paleta/tipografia/espaçamento da seção 2).
2. Shell global: sidebar fixa 260px (Início / Operações / Financeiro / Mais + CTA "Lançar" + Configurações/Sair) + header fixo com busca.
3. Tela **Cadastros** (lista de parceiros com filtros por tipo + modal "Novo Parceiro") conectada à tabela `parceiros` existente no Supabase.

Confirme o setup do Supabase (credenciais/projeto) antes de gerar qualquer migration.
