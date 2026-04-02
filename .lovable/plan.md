

## Plano: Adicionar campo Frete na aba Sucata + Industrialização

### Alterações em `src/pages/Simulador.tsx`

**1. Novo estado** (linha ~92):
- `custoFreteSucataKg` (default: 0) — custo de frete em R$/kg

**2. Novo campo no formulário** (após "Mão de Obra", linha ~1306):
- Input "Frete (R$/kg)" com step 0.01

**3. Atualizar cálculos** (linhas ~302-313):
- `valorFrete = custoFreteSucataKg * pesoKg`
- `custoTotalSucata = valorCompra + valorMO + valorFrete + valorFinanceiro`
- `saldoOperacao` e `precoIndustrializado` passam a incluir o frete

**4. Atualizar cards de resultado**:
- Adicionar linha "Frete" nos resumos exibidos

**5. Atualizar PDF export** (~linha 468):
- Incluir linha `Frete: R$ X,XX/kg`

**6. Atualizar save/load do histórico** (se aplicável):
- Salvar e restaurar `custoFreteSucataKg`

