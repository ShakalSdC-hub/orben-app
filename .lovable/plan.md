

## Correcao: Comissao IBRAC calculando incorretamente

### Problema Identificado

O trigger `fn_allocate_venda_from_benef` sempre calcula a comissao usando `comissao_mode` e `comissao_val` da tabela `operacoes_intermediacao`, independentemente de a venda ser pela IBRAC ou nao.

O formulario de venda (`VendaIntermForm`) tem os campos `venda_pela_ibrac` e `comissao_ibrac_pct`, mas o trigger ignora esses valores e usa a comissao fixa da operacao.

Alem disso, a formula correta da comissao e: **% x Valor Total da NF (valor_venda_rs)**, usando o percentual informado na propria venda (`comissao_ibrac_pct`).

### Solucao

#### 1. Migracao SQL - Atualizar o trigger `fn_allocate_venda_from_benef`

Alterar o calculo da comissao para:
- Se `venda_pela_ibrac = false`: comissao = 0
- Se `venda_pela_ibrac = true`: comissao = `valor_venda_rs * (comissao_ibrac_pct / 100)`

Usar os campos da propria venda (`NEW.venda_pela_ibrac` e `NEW.comissao_ibrac_pct`) em vez dos campos da operacao (`comissao_mode` / `comissao_val`).

Remover a consulta a `operacoes_intermediacao` para buscar `comissao_mode` e `comissao_val`, pois nao sera mais necessaria.

Nova logica:

```text
SE venda_pela_ibrac = true:
  v_comissao_ibrac = v_valor_venda * (NEW.comissao_ibrac_pct / 100)
SENAO:
  v_comissao_ibrac = 0
```

Incluir UPDATE para recalcular vendas existentes com a nova logica.

#### 2. Nenhuma alteracao no frontend

O formulario `VendaIntermForm` ja possui os campos corretos (`venda_pela_ibrac`, `comissao_ibrac_pct`). Apenas o trigger precisa ser corrigido para usa-los.

### Resumo de arquivos

| Arquivo / Local | Alteracao |
|-----------------|-----------|
| Migracao SQL | Reescrever calculo de comissao no trigger `fn_allocate_venda_from_benef` para usar campos da venda |
| Migracao SQL | UPDATE para recalcular vendas existentes |

