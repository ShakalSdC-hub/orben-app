

## Plano: Previsao de Retorno no Card "Em Beneficiamento"

### Objetivo

Adicionar campos de perda prevista (% Perda Mel e % Perda Mista) na compra de material, para que o card "Em Beneficiamento" mostre a previsao do vergalhao que ira retornar, descontando as perdas esperadas.

### Alteracoes

#### 1. Banco de Dados - Migracao SQL

Adicionar duas colunas na tabela `compras_intermediacao`:

| Coluna | Tipo | Default |
|--------|------|---------|
| `perda_mel_pct` | numeric | 0.05 (5%) |
| `perda_mista_pct` | numeric | 0.10 (10%) |

Esses valores representam a previsao de perda no beneficiamento para cada tipo de material.

#### 2. Formulario de Compra (`CompraIntermForm.tsx`)

Adicionar dois campos numericos abaixo do tipo de material:
- **% Perda Mel** (default 5) - visivel/editavel quando tipo = MEL
- **% Perda Mista** (default 10) - visivel/editavel quando tipo = MISTA

Ambos sempre salvos no registro, mas o campo relevante depende do `tipo_material`.

Exibir preview: "Previsao retorno: X kg" calculado como:
- Se MEL: `kg_comprado * (1 - perda_mel_pct/100)`
- Se MISTA: `kg_comprado * (1 - perda_mista_pct/100)`

#### 3. Calculo do Card "Em Beneficiamento" (`OperacoesIntermediacao.tsx`)

Alterar o calculo de `kgComprado - kgBeneficiado` para considerar a perda prevista:

```text
kgEmBenefPrevisto = compras que ainda nao foram beneficiadas (kg_disponivel_compra > 0)
  SUM de: kg_disponivel_compra * (1 - perda aplicavel conforme tipo_material)

Valor do card = kgEmBenefPrevisto (previsao de retorno do que esta em beneficiamento)
Subtitulo: "Previsao retorno (com perdas)"
```

Adicionar um novo campo nos totais:
- `kgEmBenefPrevistoRetorno`: soma do kg disponivel de cada compra multiplicado por (1 - perda%), agrupado pelo tipo de material

#### 4. Tabela de Compras (`OperacoesIntermediacao.tsx`)

Adicionar coluna "Perda %" na tabela de compras mostrando a perda aplicavel conforme o tipo do material.

### Resumo de arquivos

| Arquivo / Local | Alteracao |
|-----------------|-----------|
| Migracao SQL | Adicionar `perda_mel_pct` e `perda_mista_pct` em `compras_intermediacao` |
| `CompraIntermForm.tsx` | Campos de % Perda Mel e % Perda Mista + preview de retorno |
| `OperacoesIntermediacao.tsx` | Card "Em Beneficiamento" com calculo de previsao de retorno descontando perdas; coluna "Perda %" na tabela |

