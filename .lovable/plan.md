

## Plano: Atualizacao de Perdas, Cards e Layout do Cenario 3

### 1. Atualizar % de perda nas compras existentes (dados)

Usar ferramenta de dados para executar UPDATEs nas compras existentes:

- **Janeiro** (dt entre 2026-01-01 e 2026-01-31):
  - MEL: `perda_mel_pct = 0.03` (3%)
  - MISTA: `perda_mista_pct = 0.08` (8%)
- **Fevereiro** (dt entre 2026-02-01 e 2026-02-28):
  - MEL: `perda_mel_pct = 0.04` (4%)
  - MISTA: `perda_mista_pct = 0.09` (9%)

Sao 30 registros que precisam ser atualizados.

### 2. Renomear e alterar calculo do card "Em Beneficiamento"

No arquivo `OperacoesIntermediacao.tsx`:

- Renomear de **"Em Beneficiamento"** para **"Env. Beneficiamento"**
- Novo calculo: **Compras - Perdas**
  - Para cada compra: `kg_comprado * perda_pct` (conforme tipo_material)
  - Card mostra: `kgComprado - totalPerdas` (peso liquido previsto de todas as compras)
- Subtitulo: mostrar total de perdas previstas

### 3. Criar card "Saldo"

Novo card entre "Beneficiado" e "Vendas":
- **Saldo** = material processado que ainda nao foi vendido
- Calculo: `kgDisponivelVenda` (soma de kg_disponivel_venda dos beneficiamentos)
- Esse e o material que esta no fornecedor (Plasinco) pronto mas ainda nao vendido

### 4. Reorganizar layout dos cards (3x2)

Disposicao em duas linhas de 3 cards:

```text
Linha 1: Compras | Env. Beneficiamento | Beneficiado
Linha 2: Saldo   | Vendas              | Comissao
```

- Grid: `md:grid-cols-3` em vez de `md:grid-cols-5`
- Aumentar padding/altura dos cards para melhor visualizacao

### Detalhes tecnicos

| Arquivo / Local | Alteracao |
|-----------------|-----------|
| Dados (UPDATE SQL) | Atualizar `perda_mel_pct` e `perda_mista_pct` em compras de Jan e Fev |
| `OperacoesIntermediacao.tsx` | Renomear card, alterar calculo para Compras-Perdas, criar card Saldo, reorganizar grid 3x2 |

### Calculo detalhado

```text
Env. Beneficiamento = SUM(kg_comprado) - SUM(kg_comprado * perda_aplicavel)
  onde perda_aplicavel = perda_mel_pct se MEL, perda_mista_pct se MISTA

Saldo = SUM(kg_disponivel_venda) dos beneficiamentos
  (material ja processado, disponivel para venda, ainda no fornecedor)
```

