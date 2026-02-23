

## Plano: Adicionar Duas Casas Decimais em Todas as Medias LME

### O que sera alterado

Garantir que todos os valores de media LME exibam exatamente 2 casas decimais apos a virgula, tanto na pagina **Indicadores LME** quanto no **Simulador LME**.

---

### Alteracoes por arquivo

#### 1. `src/lib/kpis.ts` - Funcao formatCurrency

A funcao `formatCurrency` ja usa 2 casas decimais por padrao (comportamento do BRL). Nao precisa de alteracao.

#### 2. `src/pages/Indicadores.tsx`

| Local | Atual | Correcao |
|-------|-------|----------|
| Linha 410 - Card Cotacao LME, Cobre US$/t | `Math.round(...)` (sem decimais) | Usar `.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` |
| Linha 609 - Tabela historico diario, Cobre US$/t | `.toLocaleString("pt-BR")` (sem decimais garantidas) | Adicionar `{ minimumFractionDigits: 2, maximumFractionDigits: 2 }` |

#### 3. `src/pages/Simulador.tsx`

| Local | Atual | Correcao |
|-------|-------|----------|
| Linha 356-361 - `formatCurrency` local | Usa padrao BRL (2 casas) | Nenhuma alteracao necessaria |
| Linha 413 - PDF, Cobre US$/t | `.toLocaleString("pt-BR")` (sem decimais garantidas) | Adicionar `{ minimumFractionDigits: 2, maximumFractionDigits: 2 }` |
| Linha 928-929 - Input Cobre US$/t | Exibe numero bruto | Campo numerico, OK manter |
| Linha 1228 - Total Media R$/t | Usa `formatCurrency` | Ja tem 2 casas |

---

### Detalhes Tecnicos

As alteracoes se concentram em substituir:
- `Math.round(valor).toLocaleString("pt-BR")` por `Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- `.toLocaleString("pt-BR")` sem opcoes por `.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`

Isso garante que valores como `11.739,40` nunca aparecam como `11.739` ou `11739`.

### Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Indicadores.tsx` | Linhas 410 e 609 - formatacao USD/t com 2 casas decimais |
| `src/pages/Simulador.tsx` | Linha 413 - formatacao USD/t no PDF com 2 casas decimais |

