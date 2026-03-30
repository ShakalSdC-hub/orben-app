

## Plano: Incluir % Perda no Simulador de Sucata

### Problema

No modo "Sucata + Industrializacao", o calculo atual usa `pesoKg` diretamente para todos os custos e receitas, ignorando a perda no beneficiamento. Na realidade, ao comprar 10.000 kg com 4% de perda, o resultado final e 9.600 kg de vergalhao — e esse peso menor impacta diretamente no custo por kg.

### Solucao

Adicionar um campo **% Perda** na aba de Sucata e ajustar os calculos para considerar o peso liquido apos perda.

### Alteracoes em `src/pages/Simulador.tsx`

**1. Novo estado:**
- `perdaSucataPct` (default: 4%)

**2. Novo calculo:**
```text
pesoLiquido = pesoKg * (1 - perdaSucataPct / 100)
  Ex: 10.000 * 0.96 = 9.600 kg

Custo total = (custoCompra + custoMO + custoFinanceiro) * pesoKg (compra os 10.000)
Custo por kg de vergalhao = custoTotal / pesoLiquido (divide pelos 9.600)

precoIndustrializado = (valorCompra + valorMO + valorFinanceiro) / pesoLiquido
```

**3. Novo campo no formulario:**
- Input "% Perda" ao lado dos campos existentes (Custo MO, Prazo, etc.)
- Exibir o peso liquido resultante como informacao complementar

**4. Atualizar comparativo:**
- O custo por kg do vergalhao industrializado passa a refletir a perda
- Atualizar tambem o PDF de exportacao para incluir a perda

**5. Atualizar card de resultado:**
- Mostrar linha com "Perda: X% → Peso liquido: Y kg"

### Resumo

| Local | Alteracao |
|-------|-----------|
| Estado | Novo `perdaSucataPct` (default 4%) |
| Calculos (linhas ~296-310) | Usar `pesoLiquido` para calcular custo/kg final |
| UI Sucata | Novo input "% Perda" |
| Card resultado | Exibir peso liquido e impacto da perda |
| PDF export | Incluir % perda e peso liquido |

