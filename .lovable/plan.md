# Plano: Recalcular LME Semana Config com Medias Semanais do Historico

## Contexto

O `historico_lme` contem registros diarios de LME/Dolar, onde:
- Cada dia util (seg-sex) tem um registro individual
- Feriados sao excluidos automaticamente
- Registros com `is_media_semanal = true` representam a media dos dias uteis daquela semana

A tabela `lme_semana_config` precisa ser populada com essas medias para servir como benchmark.

## Dados Atuais

**Medias semanais disponiveis no historico_lme:**
- Semana 51/2025: LME 11.739,40 USD/t, Dolar 5,4564, Base 64,05 R$/kg
- Semana 50/2025: LME 11.691,90 USD/t, Dolar 5,4223, Base 63,40 R$/kg
- Semana 49/2025: LME 11.427,60 USD/t, Dolar 5,3268, Base 60,87 R$/kg
- Semana 48/2025: (a verificar se existe media)

**Registros atuais no lme_semana_config:**
- Semana 1/2026: LME 12.473 USD/t, Dolar 5,53 (manual)
- Semana 50/2025: LME 11.692 USD/t, Dolar 5,42 (ja existe)
- Semana 47/2025: LME 9.100 USD/t, Dolar 5,80 (manual)

## Plano de Implementacao

### 1. Migracao SQL

Criar migracao que:

**1.1 Atualiza registros existentes** - Recalcula `lme_base_brl_kg` e `lme_final_brl_kg`:
```sql
UPDATE lme_semana_config
SET 
  lme_base_brl_kg = (lme_cobre_usd_t * dolar_brl) / 1000,
  lme_final_brl_kg = ((lme_cobre_usd_t * dolar_brl) / 1000) / COALESCE(NULLIF(fator_imposto, 0), 0.7986);
```

**1.2 Insere semanas faltantes do historico** - Busca medias semanais que nao existem:
```sql
INSERT INTO lme_semana_config (
  ano, semana, data_inicio, data_fim, 
  lme_cobre_usd_t, dolar_brl, fator_imposto,
  lme_base_brl_kg, lme_final_brl_kg,
  icms_pct, pis_cofins_pct, taxa_financeira_pct, observacoes
)
SELECT 
  EXTRACT(YEAR FROM h.data)::int as ano,
  h.semana_numero as semana,
  -- Data inicio = segunda-feira da semana
  (h.data - EXTRACT(DOW FROM h.data)::int + 1)::date as data_inicio,
  -- Data fim = sexta-feira da semana (apenas dias uteis)
  (h.data - EXTRACT(DOW FROM h.data)::int + 5)::date as data_fim,
  h.cobre_usd_t as lme_cobre_usd_t,
  h.dolar_brl,
  0.7986 as fator_imposto,
  h.cobre_brl_kg as lme_base_brl_kg,
  h.cobre_brl_kg / 0.7986 as lme_final_brl_kg,
  0 as icms_pct,
  0 as pis_cofins_pct, 
  0 as taxa_financeira_pct,
  'Importado automaticamente do historico LME (media dias uteis)' as observacoes
FROM historico_lme h
WHERE h.is_media_semanal = true
  AND h.semana_numero IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lme_semana_config c 
    WHERE c.ano = EXTRACT(YEAR FROM h.data)::int 
      AND c.semana = h.semana_numero
  );
```

### 2. Resultado Esperado

Apos a migracao, o `lme_semana_config` tera:

| Semana | Ano  | LME USD/t | Dolar  | Fator  | LME Base  | LME Final  |
|--------|------|-----------|--------|--------|-----------|------------|
| 1      | 2026 | 12.473    | 5,53   | 0,7986 | 68,94     | 86,32      |
| 51     | 2025 | 11.739    | 5,4564 | 0,7986 | 64,05     | 80,20      |
| 50     | 2025 | 11.692    | 5,42   | 0,7986 | 63,40     | 79,39      |
| 49     | 2025 | 11.428    | 5,3268 | 0,7986 | 60,87     | 76,22      |
| 47     | 2025 | 9.100     | 5,80   | 0,7986 | 52,78     | 66,09      |

### 3. Observacoes Importantes

- **Dias uteis apenas**: data_inicio = segunda, data_fim = sexta
- **Feriados excluidos**: A media ja desconsidera feriados (calculada pelo historico)
- **Fator padrao 0.7986**: Aplicado a todos os novos registros
- **Semana 50/2025**: Ja existe, sera apenas recalculado (nao duplicado)

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/migrations/` | Nova migracao SQL para popular lme_semana_config |

## Critical Files for Implementation

- `supabase/migrations/` - Nova migracao SQL
- `src/components/financeiro/LMESemanaConfig.tsx` - Referencia para entender estrutura atual
