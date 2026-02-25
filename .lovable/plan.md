

## Plano: "Compra pela IBRAC" na Compra de Intermediacao

### Contexto do Problema

Atualmente, o trigger `fn_allocate_venda_from_benef` sempre desconta o custo do material do repasse ao dono:

```
saldo_repassar = valor_venda - custo_material - comissao
```

Porem, quando o **Renato compra diretamente** a sucata (com dinheiro dele), o custo do material nao deve ser descontado do repasse, pois ele ja pagou. A IBRAC apenas intermedia o beneficiamento (MO). Nesse caso:

```
Repasse = Valor Venda - Custos Beneficiamento - Custos Operacao - Comissao
```

Quando a **IBRAC compra** (usando NF da IBRAC), ai sim o custo do material e descontado:

```
Repasse = Valor Venda - Custo Material - Custos Beneficiamento - Custos Operacao - Comissao
```

---

### Alteracoes

#### 1. Migracao de Banco de Dados

**Adicionar coluna na tabela `compras_intermediacao`:**

| Coluna | Tipo | Default | Descricao |
|--------|------|---------|-----------|
| `compra_pela_ibrac` | boolean | true | Se a IBRAC comprou (NF IBRAC) ou se o dono comprou direto |

#### 2. Atualizar Trigger `fn_allocate_venda_from_benef`

Modificar o calculo de `v_custo_material` para considerar apenas compras onde `compra_pela_ibrac = true`. Quando o dono comprou direto, o custo do material nao entra no calculo do repasse.

Tambem incluir no calculo:
- **Custos de beneficiamento** proporcionais (via `beneficiamentos_intermediacao.custos_benef_total_rs`)
- **Custos da operacao** proporcionais (via `custos_intermediacao`)

Nova formula:

```text
v_custo_material = SUM apenas das compras onde compra_pela_ibrac = true
v_custos_benef = custos proporcionais dos beneficiamentos alocados
v_custos_operacao = custos_intermediacao da operacao, proporcional ao kg vendido
v_saldo_repassar = valor_venda - v_custo_material - v_custos_benef - v_custos_operacao - v_comissao_ibrac
```

Gravar `custos_operacao_alocados_rs = v_custos_benef + v_custos_operacao`.

Incluir UPDATE para recalcular vendas existentes.

#### 3. Formulario de Compra (`CompraIntermForm.tsx`)

- Adicionar switch "Compra pela IBRAC" (default: true)
- Quando desativado, indica que o dono comprou direto e a IBRAC so intermedia a MO
- Salvar `compra_pela_ibrac` no payload

#### 4. Tabela de Compras (`OperacoesIntermediacao.tsx`)

- Exibir badge "IBRAC" ou "DONO" na linha da compra conforme o valor de `compra_pela_ibrac`

#### 5. Extrato por Dono (`ExtratoDono.tsx`)

- Incluir `custos_operacao_alocados_rs` na query de vendas
- Atualizar `custoTotal` da Intermediacao para:

```text
custoTotal = custo_material_dono_rs + custos_operacao_alocados_rs + comissao_ibrac_rs
```

- Adicionar coluna "Custos Op." na tabela de Intermediacao

---

### Resumo de arquivos a modificar

| Arquivo / Local | Alteracao |
|-----------------|-----------|
| Migracao SQL | Adicionar `compra_pela_ibrac` em `compras_intermediacao` |
| Migracao SQL | Reescrever `fn_allocate_venda_from_benef` para filtrar custo material por `compra_pela_ibrac` e incluir custos benef + operacao |
| Migracao SQL | UPDATE para recalcular vendas existentes |
| `src/components/operacoes/CompraIntermForm.tsx` | Switch "Compra pela IBRAC" |
| `src/pages/OperacoesIntermediacao.tsx` | Badge IBRAC/DONO na aba Compras |
| `src/pages/ExtratoDono.tsx` | Query + custoTotal + coluna custos operacao |

