

## Plano: Corrigir Logica de Comparacao no Simulador LME

### Problema Identificado

A comparacao entre Vergalhao LME e Custo Industrializado esta usando a variavel errada para determinar o resultado.

**Situacao atual (com bug):**
- `diferenca = totalComFinanceiro - precoIndustrializado` (correto: positivo = sucata mais barata)
- `valeAPena = saldoOperacao > 0` (ERRADO: usa o lucro absoluto da operacao de sucata, nao a comparacao)
- Cores invertidas: diferenca positiva (sucata mais barata) aparece em vermelho

**Exemplo do bug:**
- Vergalhao LME: R$ 78,56/kg
- Custo Industrializado: R$ 71,47/kg
- Diferenca: R$ 7,09/kg (sucata e mais barata)
- Resultado mostrado: "OPERACAO INVIAVEL" / "COMPRAR VERGALHAO" (invertido!)

### Correcao

**Arquivo:** `src/pages/Simulador.tsx`

1. **Linha 315** - Alterar a variavel `valeAPena` para usar a comparacao correta:
   - De: `const valeAPena = saldoOperacao > 0`
   - Para: `const valeAPena = diferenca > 0`
   - Quando `diferenca > 0`, o LME e mais caro, logo comprar sucata vale a pena

2. **Linha 1461** - Corrigir as cores da "Diferenca":
   - De: `diferenca > 0 ? "text-destructive" : "text-success"`
   - Para: `diferenca > 0 ? "text-success" : "text-destructive"`
   - Diferenca positiva = economia = verde

3. **Linha 1467** - Corrigir as cores da "Economia":
   - De: `economiaPct > 0 ? "text-destructive" : "text-success"`
   - Para: `economiaPct > 0 ? "text-success" : "text-destructive"`

4. **Linhas 1431-1434** - Atualizar texto de lucro/prejuizo para usar `diferenca` em vez de `saldoOperacao`:
   - Lucro: `diferenca * pesoKg` (economia total em kg)
   - Prejuizo: quando diferenca negativa (LME mais barato)

5. **Linha 478-480 (PDF)** - Corrigir cores e resultado no PDF exportado:
   - Diferenca positiva = success (verde)
   - Resultado: `valeAPena ? "COMPRAR SUCATA" : "COMPRAR VERGALHAO"` (ja usa valeAPena, corrigido pelo item 1)

### Resumo

| Local | Bug | Correcao |
|-------|-----|----------|
| Linha 315 | `valeAPena = saldoOperacao > 0` | `valeAPena = diferenca > 0` |
| Linha 1461 | Cor invertida na diferenca | Trocar destructive/success |
| Linha 1467 | Cor invertida na economia | Trocar destructive/success |
| Linhas 1431-1434 | Valor lucro/prejuizo usa saldoOperacao | Usar `diferenca * pesoKg` |
| Linha 478 (PDF) | Cor invertida | Trocar danger/success |

