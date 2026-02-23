

## Plano: Ajustes na Aba Vergalhao LME do Simulador

### 1. Formatar Cobre (US$/t) com 2 casas decimais

O campo "Cobre (US$/t)" (linha 927) exibe o valor bruto sem formatacao. Quando desabilitado (modo Semanal/Mensal), sera formatado com 2 casas decimais. Em modo manual, permanece editavel normalmente.

**Arquivo:** `src/pages/Simulador.tsx`
- Alterar o Input de `type="number"` para `type="text"` quando desabilitado, exibindo o valor formatado com `toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`

---

### 2. Remover coluna "% Total" da tabela de parcelas

A coluna "% Total" sera removida da interface. O percentual sera calculado automaticamente em partes iguais (100 / numero de parcelas). O usuario apenas preenche a coluna "Dias".

**Arquivo:** `src/pages/Simulador.tsx`
- Remover o `<TableHead>` de "% Total" (linha 1029)
- Remover o `<TableCell>` com input de percentual (linhas 1043-1050)
- Alterar o calculo de `parcelasComValor` para usar distribuicao igual automatica: `percentual = 100 / parcelas.length`
- Remover campo `percentual` dos inputs editaveis de parcela

---

### 3. Separar taxa financeira entre Vergalhao e Sucata

Atualmente ambas as abas compartilham o mesmo estado `taxaFinanceiraMensal`. Sera criado um estado separado para a Sucata.

**Arquivo:** `src/pages/Simulador.tsx`
- Criar novo estado: `const [taxaFinanceiraSucata, setTaxaFinanceiraSucata] = useState(1.80)`
- Na aba Sucata (linha 1300-1310): usar `taxaFinanceiraSucata` no lugar de `taxaFinanceiraMensal`
- Nos calculos de sucata (linhas 299-301): usar `taxaFinanceiraSucata` no lugar de `taxaFinanceiraMensal`
- Manter `taxaFinanceiraMensal` exclusivo para a aba Vergalhao

---

### Resumo de alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Simulador.tsx` | (1) Formatar Cobre US$/t com 2 decimais; (2) Remover coluna "% Total" e calcular automatico; (3) Criar estado `taxaFinanceiraSucata` separado |

