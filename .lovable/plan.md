

## Plano: Exclusao e Campos Adicionais na Venda de Intermediacao

### Parte 1: Botao de Excluir nas 4 abas (Compras, Benef., Vendas, Custos)

Adicionar botao de excluir (lixeira) ao lado do botao de editar em cada linha das tabelas. A exclusao sera soft delete (`is_deleted = true`), e os triggers existentes no banco ja restauram os saldos automaticamente:

- **Vendas**: trigger `fn_restore_benef_on_venda_delete_interm` restaura `kg_disponivel_venda` nos beneficiamentos
- **Beneficiamentos**: trigger `fn_restore_compra_on_benef_delete_interm` restaura `kg_disponivel_compra` nas compras
- **Compras**: exclusao direta (soft delete), mas apenas se `kg_disponivel_compra == kg_comprado` (nenhuma alocacao em uso)
- **Custos**: exclusao direta (soft delete), sem dependencias

Um dialog de confirmacao (`DeleteConfirmDialog`) sera exibido antes de cada exclusao. Apenas usuarios com role `admin` poderao excluir.

**Arquivo:** `src/pages/OperacoesIntermediacao.tsx`
- Importar `Trash2` do lucide-react e `DeleteConfirmDialog`
- Adicionar estados para controlar o dialog de exclusao e o ID do registro
- Criar mutations de soft delete para cada tabela (4 mutations)
- Adicionar botao de lixeira em cada linha das 4 tabelas, visivel apenas para admin
- Validar que compras com alocacoes em uso nao podem ser excluidas

---

### Parte 2: Campos adicionais na Venda (Venda pela IBRAC)

#### 2.1 Migracao de banco de dados

Adicionar novos campos na tabela `vendas_intermediacao`:

| Coluna | Tipo | Default | Descricao |
|--------|------|---------|-----------|
| `venda_pela_ibrac` | boolean | false | Se a venda ocorre pela NF da IBRAC |
| `comissao_ibrac_pct` | numeric | 0 | % comissao IBRAC sobre valor total NF |
| `pis_cofins_pct` | numeric | 9.25 | PIS/COFINS fixo em 9,25% |
| `pis_cofins_rs` | numeric | 0 | Valor calculado PIS/COFINS |
| `icms_pct` | numeric | 0 | % ICMS informado pelo usuario |
| `icms_rs` | numeric | 0 | Valor calculado ICMS (nao soma no total) |

#### 2.2 Formulario de Venda (`VendaIntermForm.tsx`)

- Adicionar switch/checkbox "Venda pela IBRAC"
- Quando ativado, exibir:
  1. **Comissao IBRAC (%)** - campo numerico, calcula sobre `valor_venda_rs`
  2. **PIS/COFINS** - campo fixo 9,25% (editavel), exibe valor calculado automaticamente
  3. **ICMS (%)** - campo numerico, exibe valor calculado (nao soma no total da operacao)
- Salvar todos os campos no payload do insert/update

#### 2.3 Tabela de Vendas

- Adicionar badge "IBRAC" na linha quando `venda_pela_ibrac = true`
- Mostrar PIS/COFINS e ICMS como colunas ou tooltip informativo

---

### Resumo de arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| **Migracao SQL** | Adicionar 6 colunas em `vendas_intermediacao` |
| `src/pages/OperacoesIntermediacao.tsx` | Botoes de excluir nas 4 abas + badge IBRAC nas vendas |
| `src/components/operacoes/VendaIntermForm.tsx` | Switch "Venda pela IBRAC" + campos comissao, PIS/COFINS, ICMS |

