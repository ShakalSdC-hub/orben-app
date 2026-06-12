# ORBEN v2 — Blueprint

Documento de referência para recriar o ORBEN como projeto novo (fora da Lovable, hospedado na VPS). Consolida o sistema de design, o inventário de telas e o modelo de dados definidos nos mockups em `/mockups/*.html`, além do mapeamento com o schema Supabase existente (52 tabelas, projeto `ggglyltvaddwxeelthhk`).

---

## 1. Visão Geral

O ORBEN v2 unifica três cenários operacionais (Próprio, Terceiros, Intermediação) numa interface única — "Operações" — e introduz um módulo financeiro robusto baseado em **Títulos Financeiros** com responsável fiscal e financeiro separáveis, mecanismo de **compensação** entre títulos, e **Extrato** por parceiro (conta corrente).

Telas de referência (todas em `/mockups/`):

| Arquivo | Tela | Rota sugerida |
|---|---|---|
| `dashboard.html` | Início | `/` |
| `operacoes.html` | Operações (lista unificada) | `/operacoes` |
| `operacao-detalhe.html` | Operação · detalhe/timeline | `/operacoes/:id` |
| `importar-nf.html` | Importar NF-e (XML) | `/operacoes/importar` |
| `financeiro.html` | Financeiro (títulos) | `/financeiro` |
| `extrato-parceiro.html` | Extrato do Parceiro | `/cadastros/parceiros/:id/extrato` |
| `cadastros.html` | Cadastros (Parceiros/Donos) | `/cadastros` |

---

## 2. Sistema de Design (Design Tokens)

Todos os mockups compartilham a mesma config do Tailwind (CDN). Ao recriar o projeto, portar estes tokens para `tailwind.config` (e/ou CSS variables, se mantiver shadcn/ui).

### 2.1 Paleta de cores (Material Design 3 — esquema claro)

```js
colors: {
  // Primary
  primary: "#041632",
  "on-primary": "#ffffff",
  "primary-container": "#1b2b48",
  "on-primary-container": "#8393b5",
  "primary-fixed": "#d7e2ff",
  "primary-fixed-dim": "#b7c7eb",
  "on-primary-fixed": "#091b37",
  "on-primary-fixed-variant": "#374765",
  "inverse-primary": "#b7c7eb",

  // Secondary (terracota/copper — identidade ORBEN)
  secondary: "#9a4523",
  "on-secondary": "#ffffff",
  "secondary-container": "#ff946c",
  "on-secondary-container": "#772b0a",
  "secondary-fixed": "#ffdbcf",
  "secondary-fixed-dim": "#ffb59a",
  "on-secondary-fixed": "#380d00",
  "on-secondary-fixed-variant": "#7b2f0e",

  // Tertiary (verde-água — usado para "sucesso/concluído")
  tertiary: "#001a1a",
  "on-tertiary": "#ffffff",
  "tertiary-container": "#003131",
  "on-tertiary-container": "#31a1a1",
  "tertiary-fixed": "#8cf3f3",
  "tertiary-fixed-dim": "#6fd7d6",
  "on-tertiary-fixed": "#002020",
  "on-tertiary-fixed-variant": "#004f4f",

  // Error
  error: "#ba1a1a",
  "on-error": "#ffffff",
  "error-container": "#ffdad6",
  "on-error-container": "#93000a",

  // Surfaces / Background
  background: "#f8f9ff",
  "on-background": "#0b1c30",
  surface: "#f8f9ff",
  "on-surface": "#0b1c30",
  "surface-bright": "#f8f9ff",
  "surface-dim": "#cbdbf5",
  "surface-variant": "#d3e4fe",
  "on-surface-variant": "#44474d",
  "surface-container-lowest": "#ffffff",
  "surface-container-low": "#eff4ff",
  "surface-container": "#e5eeff",
  "surface-container-high": "#dce9ff",
  "surface-container-highest": "#d3e4fe",
  "surface-tint": "#4f5e7e",

  // Outline / Inverse
  outline: "#75777e",
  "outline-variant": "#c5c6ce",
  "inverse-surface": "#213145",
  "inverse-on-surface": "#eaf1ff",
}
```

> Nota: `darkMode: "class"` está configurado nos mockups, mas **nenhum valor de dark theme foi definido** — todas as telas usam apenas o esquema claro acima. Se dark mode for um requisito do v2, os tokens M3 "dark" precisam ser gerados.

### 2.2 Tipografia

- **Sans**: `Inter` (400/500/600/700)
- **Mono**: `JetBrains Mono` (500) — usado em labels/valores monetários/tabelas
- **Ícones**: `Material Symbols Outlined` via `<span class="material-symbols-outlined" data-icon="nome_do_icone">nome_do_icone</span>`

| Token | font-size | line-height | extras |
|---|---|---|---|
| `display-lg` | 48px | 56px | letter-spacing -0.02em, weight 700 |
| `headline-lg` | 32px | 40px | letter-spacing -0.01em, weight 600 |
| `headline-lg-mobile` | 24px | 32px | weight 600 |
| `headline-md` | 24px | 32px | weight 600 |
| `title-lg` | 18px | 28px | weight 600 |
| `body-lg` | 16px | 24px | weight 400 |
| `body-md` | 14px | 20px | weight 400 |
| `body-sm` | 12px | 18px | weight 400 |
| `label-md` (JetBrains Mono) | 12px | 16px | letter-spacing 0.05em, weight 500 |
| `label-sm` (JetBrains Mono) | 10px | 14px | letter-spacing 0.05em, weight 500 |

### 2.3 Espaçamento e raio de borda

```js
spacing: {
  xs: "4px", base: "4px", sm: "8px", md: "16px", gutter: "16px",
  lg: "24px", margin: "24px", xl: "32px", "2xl": "48px",
  "sidebar-width": "260px",
}
borderRadius: {
  DEFAULT: "0.125rem", // 2px
  lg: "0.25rem",       // 4px
  xl: "0.5rem",        // 8px
  full: "0.75rem",     // 12px
}
```

### 2.4 Padrões de layout e componentes

- **Shell global**: sidebar fixa 260px (`bg-primary`, navegação + CTA "Lançar" + Configurações/Sair) + header fixo (busca + notificações/ajuda/avatar) + área de conteúdo com `overflow-y-auto custom-scrollbar`.
- **Sidebar nav**: Início (dashboard) · Operações · Financeiro · Mais (cadastros). Item ativo: `border-l-4 border-secondary-container bg-primary-container/20 font-bold`.
- **Cards de resumo/KPI**: `bg-surface-container-lowest border border-outline-variant rounded-xl p-lg`, ou destacados com `bg-primary-container` / `bg-error-container` / `bg-secondary-fixed`.
- **Badges de status** (convenção de cor por significado):
  - `bg-tertiary-fixed text-on-tertiary-fixed-variant` → sucesso / concluído / pago / pronto (com ícone `check_circle`)
  - `bg-secondary-fixed text-on-secondary-fixed-variant` → parcial / em andamento / atenção leve
  - `bg-error-container text-on-error-container` → erro / a pagar / revisar (ícone `error` ou `warning`)
  - `bg-surface-variant text-on-surface-variant` → pendente neutro (ícone `schedule`)
  - `bg-surface-container-high text-on-surface-variant` → chip neutro (ex.: "IBRAC", "Op #0042")
- **Tabelas**: `bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden`, cabeçalho `bg-surface-container-low`, linhas `divide-y divide-outline-variant hover:bg-surface-bright`.
- **Filter chips**: grupo de botões em `bg-surface-container-low`, toggle de classe ativa via JS (`querySelectorAll('.bg-surface-container-low button')`).
- **Modais**: overlay `fixed inset-0 z-[100] bg-on-background/40 backdrop-blur-sm`, painel `bg-surface-container-lowest rounded-xl shadow-2xl max-w-2xl`, header sticky com botão `close`.
- **Timeline** (operação-detalhe): coluna de ícones circulares (`bg-tertiary-fixed`=feito, `bg-secondary`=evento atual com `ring-4 ring-secondary/20`, `bg-surface-container-high`=futuro) conectados por `w-0.5 bg-outline-variant`.
- **Barra de progresso**: `bg-outline-variant h-1.5 rounded-full` com filho `bg-secondary` proporcional ao `%`.
- **FAB**: botão circular `fixed bottom-lg right-lg bg-primary` que expande no hover mostrando label ("Novo Título", "Lançar").
- **Expand/collapse cards** (importar-nf): `toggleCard(id)` alterna `hidden` no corpo + `rotate-180` no chevron `expand_more`.

---

## 3. Inventário de Telas

### 3.1 `dashboard.html` — Início
- KPIs: Estoque Total (142.580kg), Resultado do Mês (+R$84.300, +8%), Repasses Pendentes (R$16.500 · 2 parceiros · 3 títulos), Contas Abertas (A Pagar R$18.700 / A Receber R$45.000).
- Gráfico LME Cobre (R$62,14/kg, +1,4% hoje) com barras dos últimos 7 dias.
- **Atalhos rápidos** (links): Nova Operação → `/operacoes`, Importar NF (XML) → `/operacoes/importar`, Lançar Pagamento → `/financeiro`, Anexar Comprovante → `/operacoes/:id`.
- **Pendências** (lista com badge "6 itens" = soma dos contadores das linhas, 3+2+1):
  1. "3 NF-e importadas aguardando revisão" → Revisar → `/operacoes/importar`
  2. "2 títulos pendentes com Renato — R$5.500,00 em aberto após compensação" → Ver extrato → `/cadastros/parceiros/:renato/extrato`
  3. "1 lançamento sem comprovante — Frete Sucata · venc. 15/06/2026" → Anexar → `/operacoes/:id` (Op #0044)

### 3.2 `operacoes.html` — Operações (lista unificada)
- Filtros por cenário: Todos / Próprio / Terceiros / Intermediação.
- Botão "Importar NF-e" → `/operacoes/importar`.
- Tabela com colunas: Cenário, Parceiro/Dono, Operação (Op #), Quantidade (atual/total kg), Progresso (%), Etapa atual, Ação "Detalhes".
- Linhas de referência:
  - Op #0042 · Próprio · IBRAC · 12.500/15.000 kg · 83% · Beneficiamento
  - Op #0039 · Terceiros · Recicla Norte Ltda. · 5.200/5.200 kg · 100% · Saída
  - Op #0044 · Intermediação · Renato (Dono) · 2.100/45.000 kg · 5% · Entrada
- Cards de indicadores no rodapé: Total em Processo (142.580kg, +12%), LME Cobre Ref (US$11.500, -0,8%), Tempo Médio (4,2 dias).

### 3.3 `operacao-detalhe.html` — Operação · detalhe/timeline (ex. Op #0044)
- Header: badges de cenário ("Intermediação") + status ("Em andamento — Entrada"). Botões Anexar / Editar Operação.
- 4 cards de resumo: Dono do Material (Renato · Pátio IBRAC Setor 3), Quantidade (2.100/45.000 kg · 5%), Valor de Referência (R$46.200,00 = R$22,00/kg × 2.100kg), Comissão IBRAC (8% sobre valor processado).
- **Linha do Tempo** (timeline, 4 etapas): Operação criada (20/05) → Entrada de material registrada (22/05, NF 4521.xml, 2.100kg/R$46.200,00) → Beneficiamento (atual, aguardando) → Saída/Faturamento (pendente).
- Coluna lateral: card "Dono/Parceiro" (Renato, saldo "IBRAC deve R$5.500,00 a Renato" → link extrato) + card "Documentos" (NF 4521.xml, comprovante_frete.jpg).
- **Títulos Financeiros Vinculados** (tabela, link "Ver Financeiro" → `/financeiro`):
  - "Mão de Obra — Fornecedor X" · NF 8821 · venc 10/06/2026 · A Pagar · Fiscal=IBRAC/Financeiro=Renato · **R$6.500,00** · Status "Pago (compensado)"
  - "Frete Sucata" · NF 5510 · venc 15/06/2026 · A Pagar · Fiscal=Financeiro=IBRAC · R$1.200,00 · Status "Pendente"

### 3.4 `importar-nf.html` — Importar NF-e (XML)
- Dropzone de upload + lista de "N notas processadas" com contadores "prontas para lançar" / "para revisão".
- Cada nota é um card expansível (`toggleCard`) com 2 colunas: "Dados extraídos do XML" (chave de acesso, NCM, itens, valores) e "Lançamento Sugerido" (formulário pré-preenchido por IA com nível de confiança).
- Cards de referência:
  1. **NF 1190** (Saída, IBRAC→Metalúrgica Sul, 12.500kg/R$412.500,00, 98% confiança) — Pronto/Próprio, vincula Op #0042, gera título A Receber.
  2. **NF 4588** (Entrada, Sucatas Recicla Norte Ltda→IBRAC, 8.500kg/R$280.500,00 a R$33/kg, NCM 7404.00.00, 92% confiança) — **Revisar**/Intermediação. Dono Econômico sugerido = Renato. "Vincular a": Criar nova operação | Op #0044 — Intermediação (Renato). Gera título A Pagar (venc. 11/07/2026, Fiscal=IBRAC, Financeiro=Renato) com aviso de **excecionalidade** ("será registrado como excecionalidade no extrato do Renato").
  3. **NF 887** (Entrada, Recicla Norte Ltda.→IBRAC, 5.200kg, "R$0,00 — remessa", 99% confiança) — Pronto/Terceiros, vincula Op #0039, **não gera título** (material permanece do cliente).
- Rodapé sticky: "Descartar Tudo" / "Confirmar e Lançar (N)".

### 3.5 `financeiro.html` — Financeiro (Títulos)
- Cards de resumo: Total a Pagar (R$18.700,00 · 3 pendentes), Total a Receber (R$45.000,00 · 1 pendente venc. 20/06), Compensações no mês (R$6.500,00 · 1 liquidação cruzada).
- Tabela de títulos (colunas: Título, Resp. Fiscal, Resp. Financeiro, Valor/Venc., Status, Ação):
  1. **MO Fornecedor X** · A Pagar · NF 8821 · **Op #0044** · Fiscal=IBRAC · Financeiro=Renato · R$6.500,00 · venc 10/06/2026 · Status "Pago" (ícone `link` → "Compensado com Repasse Renato Parc 1/3")
  2. **Repasse Renato · Parc 1/3** · Repasse · Op #0044 · Fiscal=Financeiro=IBRAC · R$12.000,00 · venc 10/06/2026 · Status "Parcial" (54%, "R$5.500,00 restante") · botão "Liquidar" abre modal
  3. **Frete Sucata** · A Pagar · NF 5510 · Transportadora ABC · Fiscal=Financeiro=IBRAC · R$1.200,00 · venc 15/06/2026 · Status "Pendente"
  4. **Venda Vergalhão · NF 1190** · A Receber · Metalúrgica Sul · Op #0039 · R$45.000,00 · venc 20/06/2026 · Status "Pendente" · botão "Receber"
- **Modal "Quitar Título"** (Repasse Renato Parc 1/3 · R$12.000,00):
  - Toggle forma de liquidação: "Dinheiro/PIX/Transferência" vs "Compensação c/ outro título" (`setFormaPagamento`).
  - Painel compensação (padrão): busca de título → seleciona "MO Fornecedor X · R$6.500,00 disponível · NF 8821 · Fiscal IBRAC/Financeiro Renato" → resumo de cálculo R$12.000 − R$6.500 = R$5.500 restante → observação auto-gerada → upload de comprovante.

### 3.6 `extrato-parceiro.html` — Extrato do Parceiro (ex. Renato)
- Breadcrumb Cadastros / Parceiros / Renato / Extrato. Header "Renato · Dono econômico · 4 operações ativas". Filtros de período 30/90/Tudo.
- **Saldo Geral** (`bg-primary-container`): "IBRAC deve R$5.500,00 a Renato" + "Após 1 compensação aplicada nos últimos 30 dias" + botão "+ Novo título com Renato".
- Coluna esquerda "IBRAC deve a Renato (Repasses)": Parc 1/3 R$12.000,00 (Parcial, Compensado −R$6.500,00, Restante R$5.500,00, linha pontilhada conecta à direita), Parc 2/3 R$12.000,00 (venc 10/07, Pendente), Parc 3/3 R$11.000,00 (venc 10/08, Pendente, opacidade reduzida).
- Coluna direita "Renato deve (NF em nome IBRAC)": "MO Fornecedor X · NF 8821" R$6.500,00 (Fiscal=IBRAC, venc 10/06/2026, Status "Pago" + nota "Liquidado via compensação → Repasse Parc 1/3"); estado vazio "Nenhum outro título pendente".
- **Linha do tempo** (tabela Data/Evento/Valor/Saldo):
  - 12/05 · Repasse gerado (Op #0044 Parc 1/3) · +R$12.000,00 · saldo R$12.000,00
  - 12/05 · Título gerado (MO Fornecedor X / NF 8821) · −R$6.500,00 · saldo R$5.500,00
  - 10/06 · Compensação aplicada (linha destacada, "MO Fornecedor X quitado com Repasse Parc 1/3 — comprovante anexado") · saldo permanece R$5.500,00

### 3.7 `cadastros.html` — Cadastros (Parceiros/Donos)
- Filtros: Todos / Fornecedores / Clientes / Donos / Transportadoras. Botão "+ Novo Parceiro" abre modal.
- Tabela (7 linhas de referência):
  - **Renato** — badge "Dono", CPF 123.456.789-00, tel (11) 98888-7777, saldo "IBRAC deve R$5.500,00" → "Ver Extrato"
  - Recicla Norte Ltda. — Fornecedor + Cliente, CNPJ 33.444.555/0001-66
  - Metalúrgica Sul S.A. — Cliente, CNPJ 22.333.444/0001-55
  - Sucatas Recicla Norte Ltda — Fornecedor, CNPJ 12.345.678/0001-99
  - Fornecedor X (Mão de Obra) — Fornecedor, CNPJ 44.555.666/0001-22
  - Transportadora Veloz Ltda. — Transportadora, CNPJ 55.666.777/0001-33
  - Metalúrgica ABC Ltda — Cliente, CNPJ 66.777.888/0001-44
- **Modal "Novo Parceiro"**: Nome/Razão Social, CNPJ/CPF, grade de checkboxes "Tipo(s) de Relacionamento" (Fornecedor/Cliente/Transportadora/**Dono de Material**) com helper text: *"Parceiros marcados como Dono de Material passam a ter um Extrato (conta corrente) próprio no Financeiro."* + Telefone/E-mail/Observações.

---

## 4. Modelo de Dados Conceitual (v2)

### 4.1 Parceiro (unificado)
Entidade única para fornecedores, clientes, transportadoras e **donos de material**, com múltiplos papéis simultâneos.

```
parceiros
- id, razao_social, nome_fantasia, cnpj/cpf, telefone, email, endereco...
- is_fornecedor, is_cliente, is_transportadora bool
- tipo enum (CLIENTE, FORNECEDOR, BENEFICIADOR, DONO, TRANSPORTADORA, INTERNO)
- taxa_operacao_pct  (comissão, quando tipo=DONO — equivalente a donos_material.taxa_operacao_pct)
- ativo, created_at, updated_at
```

### 4.2 Operação (unificada)
Entidade que representa o ciclo entrada → beneficiamento → saída, em qualquer um dos 3 cenários.

```
operação
- id, numero (#0042), cenario enum (PROPRIO, TERCEIROS, INTERMEDIACAO)
- dono_parceiro_id → parceiros (quem é o "dono do material"; para PROPRIO = IBRAC)
- comissao_pct (quando INTERMEDIACAO)
- quantidade_total_kg, quantidade_atual_kg
- valor_referencia, valor_unitario_referencia
- etapa_atual enum (ENTRADA, BENEFICIAMENTO, SAIDA, ENCERRADA)
- status (em_andamento, concluida, cancelada)
- created_at, created_by
```

Cada item da timeline (operação criada, entrada registrada, beneficiamento, saída) é um evento — pode ser uma tabela `operacao_eventos` (id, operacao_id, tipo, titulo, descricao, data, anexo_id?, created_by) ou derivado das tabelas de entrada/beneficiamento/saída específicas do cenário.

### 4.3 Título Financeiro
```
titulo_financeiro
- id, descricao, tipo enum (A_PAGAR, A_RECEBER, REPASSE)
- nf_numero (nullable)
- operacao_id → operação (nullable)
- responsavel_fiscal_id   → parceiros  (quem emite/recebe a NF)
- responsavel_financeiro_id → parceiros (quem efetivamente paga/recebe — pode ser diferente do fiscal)
- valor, valor_compensado, valor_pago
- data_vencimento, data_pagamento
- status enum (pendente, parcial, pago, cancelado)
- titulo_origem_id → titulo_financeiro  (auto-FK; usado na compensação — aponta para o título que originou o crédito usado para liquidar este)
- observacoes
- created_at, updated_at
```

**Regra da excecionalidade**: quando `responsavel_fiscal_id <> responsavel_financeiro_id`, o título aparece no **Extrato** do `responsavel_financeiro_id` (não do fiscal) como uma pendência/débito.

**Regra da compensação**: liquidar um título A com um crédito do título B grava `A.titulo_origem_id = B.id`, atualiza `A.valor_compensado += min(saldo_A, saldo_B)` e `B.valor_compensado` simetricamente, recalcula `status` (`parcial` se `valor_compensado + valor_pago < valor`, senão `pago`).

### 4.4 Anexo (polimórfico)
```
anexo
- id, entidade_tipo enum (OPERACAO, TITULO_FINANCEIRO, NF_IMPORT, ...)
- entidade_id (uuid)
- nome_arquivo, tipo_arquivo, storage_path (Supabase Storage)
- created_at, created_by
```

### 4.5 Extrato do Parceiro (view derivada)
Para um `parceiro_id` com `tipo = DONO`:
- Lado "a receber do parceiro": títulos onde `responsavel_financeiro_id = parceiro_id` e `responsavel_fiscal_id <> parceiro_id` (ex.: "MO Fornecedor X").
- Lado "a pagar ao parceiro": títulos tipo `REPASSE` onde `responsavel_financeiro_id = parceiro_id`... na prática modelados como o parceiro sendo credor.
- **Saldo corrente**: soma cronológica de (+ repasses gerados) − (títulos de excecionalidade gerados) com marcação de compensações aplicadas. A "Linha do tempo" é essa lista ordenada por data com coluna de saldo acumulado.

---

## 5. Regras de Negócio Centrais

1. **3 Cenários** (`operação.cenario`):
   - **Próprio**: IBRAC compra, processa e vende material próprio. Dono = IBRAC.
   - **Terceiros**: cliente envia material para beneficiamento (remessa industrialização); material nunca é propriedade da IBRAC; não gera título de compra (NF de remessa, sem ICMS).
   - **Intermediação**: um terceiro (ex.: Renato) é o "dono econômico" do material; IBRAC opera/processa e cobra **comissão** (`comissao_pct`) sobre o valor processado.

2. **Responsável Fiscal vs Financeiro**: toda NF/título tem um responsável fiscal (quem está no documento). Por padrão, fiscal = financeiro. Em Intermediação, custos vinculados à operação do dono econômico podem ter financeiro ≠ fiscal — isso é registrado como **excecionalidade no extrato do parceiro financeiro**.

3. **Compensação**: títulos a pagar/receber entre as mesmas partes (IBRAC ↔ Dono) podem ser liquidados cruzando um contra o outro, total ou parcialmente, em vez de transferência de caixa. Gera rastro via `titulo_origem_id` + comprovante opcional.

4. **Importação de NF-e**: XML é parseado e o sistema sugere cenário/direção/dono econômico com nível de confiança; abaixo de um limiar, a nota é marcada "Revisar" e exige confirmação manual antes do lançamento.

---

## 6. Mapeamento com o Schema Supabase Existente

Schema atual (`ggglyltvaddwxeelthhk`, 52 tabelas) já cobre boa parte do conceito — ver `docs/backup-dados-antes-migracao.md` para o plano de migração de dados já iniciado.

### 6.1 Reaproveitável quase sem mudanças
- **`parceiros`**: já tem `tipo` incluindo `'DONO'` e `is_fornecedor/is_cliente/is_transportadora`. ✅ Cobre 4.1.
- **`acertos_financeiros`**: já tem `parceiro_id` + `dono_id` (≈ fiscal/financeiro), `referencia_tipo`/`referencia_id` (≈ vínculo com operação), `status` pendente/pago/cancelado. Base sólida para 4.3.
- **`operacoes` / `operacoes_terceiros` / `operacoes_intermediacao`**: já existem como entidades por cenário (criadas em `20251223175355`), cada uma com sua cadeia entrada→beneficiamento→saída/venda e tabelas de alocação FIFO.
- **`historico_lme`, `lme_semana_config`, `simulacoes_lme`**: cobrem o gráfico LME do dashboard sem alterações.

### 6.2 Requer extensão (ALTER)
- **`acertos_financeiros`**:
  - adicionar `titulo_origem_id uuid REFERENCES acertos_financeiros(id)` (compensação)
  - adicionar `valor_compensado numeric DEFAULT 0`, `valor_pago numeric DEFAULT 0`
  - `status` CHECK: incluir `'parcial'`
  - renomear/clarificar papéis: `parceiro_id` → responsável fiscal; `dono_id` → responsável financeiro (ou padronizar ambos como FK para `parceiros`, após migrar `donos_material`)

- **`donos_material` → `parceiros`**: migração já planejada em `docs/backup-dados-antes-migracao.md` (RENATO, IBRAC, terceiro dono → `parceiros` com `tipo='DONO'`). Após migrar, `acertos_financeiros.dono_id` passa a referenciar `parceiros.id`.

### 6.3 Novo
- **`anexos`** (tabela nova, polimórfica) + bucket no Supabase Storage — não existe hoje (NF/comprovantes são campos de texto).
- **View `operacoes_unificadas`**: `UNION ALL` normalizando `operacoes` + `operacoes_terceiros` + `operacoes_intermediacao` em colunas comuns (id, numero, cenario, dono_parceiro_id, quantidade_total/atual_kg, valor_referencia, etapa_atual, status, created_at) — alimenta `operacoes.html`.
- **View `extrato_parceiro`**: para `parceiro_id` com `tipo='DONO'`, lista títulos (`acertos_financeiros`) onde o parceiro é fiscal OU financeiro, ordenados por data, com saldo acumulado calculado em window function (`SUM() OVER (ORDER BY data_acerto)`).

> **Decisão a tomar no novo projeto**: manter as 3 tabelas de operação por cenário + view de unificação (caminho de menor atrito, preserva os 56 migrations e os triggers de FIFO existentes) **vs.** consolidar numa tabela `operacoes` única com `cenario` enum (mais limpo, porém exige reescrever os fluxos de alocação FIFO). Recomendação: começar com a **view de unificação** — ela já desbloqueia as telas de listagem/dashboard sem reescrever a lógica financeira que já funciona.

---

## 7. Dados de Referência (narrativa para seed/teste)

Usados de forma consistente em todos os mockups — útil como dataset de demonstração/teste no novo projeto:

- **Op #0044** — Intermediação · Dono econômico = **Renato** · Comissão IBRAC 8% · 2.100/45.000 kg (5%) · Valor ref. R$46.200,00 (R$22,00/kg) · Entrada registrada 22/05/2026 via **NF 4521.xml** (Sucatas Recicla Norte Ltda → IBRAC).
- **Título "MO Fornecedor X"** — NF 8821 · A Pagar · R$6.500,00 · venc. 10/06/2026 · Fiscal = IBRAC, Financeiro = **Renato** (excecionalidade) · vinculado à Op #0044 · Status: **Pago (compensado)**.
- **Título "Repasse Renato · Parc 1/3"** — R$12.000,00 · venc. 10/06/2026 · Status **Parcial** (compensado R$6.500,00, restante R$5.500,00). Parc 2/3 (R$12.000,00, venc. 10/07) e Parc 3/3 (R$11.000,00, venc. 10/08) pendentes.
- **Compensação**: `MO Fornecedor X (R$6.500,00)` ↔ `Repasse Renato Parc 1/3 (R$12.000,00)` → saldo "IBRAC deve R$5.500,00 a Renato".
- **Título "Frete Sucata"** — NF 5510 · Transportadora ABC · A Pagar · R$1.200,00 · venc. 15/06/2026 · Fiscal = Financeiro = IBRAC · Status Pendente (sem comprovante).
- **Op #0042** — Próprio · IBRAC · 12.500/15.000 kg (83%) · Beneficiamento. NF 1247 (Saída, IBRAC→Metalúrgica Sul S.A., 12.500kg/R$412.500,00, pendente de confirmação em `importar-nf.html`) vincula a esta operação e, ao confirmar, gera título A Receber R$412.500,00 (venc. 12/07/2026).
- **Op #0039** — Terceiros · Recicla Norte Ltda. · 5.200/5.200 kg (100%) · Saída · NF 887 de remessa (sem título financeiro) · já possui o título "Venda Vergalhão · NF 1190" A Receber R$45.000,00 (venc. 20/06/2026, Status Pendente) em `financeiro.html`.
- Parceiros-chave: **Renato** (Dono, CPF), **IBRAC** (operador interno), **Sucatas Recicla Norte Ltda** (Fornecedor, NF 4521/4588), **Recicla Norte Ltda.** (Fornecedor+Cliente, Op #0039), **Metalúrgica Sul S.A.** (Cliente, Op #0042/NF1190), **Fornecedor X — Mão de Obra** (Fornecedor, NF 8821), **Transportadora Veloz Ltda.**, **Metalúrgica ABC Ltda**.

---

## 8. Roadmap de Implementação Sugerido

1. **Fundação**: portar design tokens (seção 2) para o novo projeto (Tailwind config + CSS globais); shell global (sidebar + header).
2. **Cadastros**: tela `cadastros.html` + CRUD de `parceiros` (já existe a tabela — só precisa de UI e migração de `donos_material`).
3. **Financeiro base**: extensão de `acertos_financeiros` (seção 6.2) + telas `financeiro.html` (lista + modal de liquidação/compensação) + `extrato-parceiro.html`.
4. **Operações**: view `operacoes_unificadas` (seção 6.3) + telas `operacoes.html` e `operacao-detalhe.html` (timeline pode iniciar somente com eventos de entrada/beneficiamento/saída já existentes).
5. **Anexos**: tabela `anexos` + Storage bucket; integrar em operação-detalhe e títulos.
6. **Importar NF-e**: parser de XML + heurística de sugestão de cenário/dono (`importar-nf.html`).
7. **Dashboard**: KPIs agregados (estoque, resultado do mês, repasses pendentes, contas abertas) + pendências — última peça, pois depende de tudo acima.
