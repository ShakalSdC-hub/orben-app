# Backup de Dados - Antes da Migração para Nova Estrutura

**Data do backup:** 2025-12-23

## Resumo dos Registros

| Tabela | Registros |
|--------|-----------|
| entradas | 14 |
| beneficiamentos | 14 |
| sublotes | 28 |
| saidas | 14 |
| donos_material | 3 |
| clientes | 1 |
| tipos_produto | 4 |
| processos | 5 |
| audit_logs | 80 |

## Tabelas Preservadas (NÃO REMOVIDAS)

- `parceiros` - 4 registros (fornecedores/transportadoras)
- `profiles` - usuários do sistema
- `user_roles` - permissões
- `historico_lme` - histórico de cotações LME
- `lme_semana_config` - configurações semanais LME
- `simulacoes_lme` - simulações de preço

## Donos de Material (para migrar como parceiros)

1. **RENATO** (ID: 8e865afb-6e63-4dbb-9feb-ae004fde254b) - Dono principal
2. **IBRAC** (ID: 2abc6e20-6b4c-4b28-812c-3053dbeaeb36) - Operação própria
3. Terceiro dono (verificar dados)

## Clientes (para migrar como parceiros)

1. Cliente existente (ID a verificar)

## Tipos de Produto

1. MEL (Cobre limpo)
2. MISTA (Cobre misto)
3. BERRY (Fio esmaltado)
4. Outro tipo

## Processos de Beneficiamento

1. Moagem
2. Refino
3. Outros (verificar)

---

## Notas de Migração

1. `donos_material` → Migrar para `parceiros` com `tipo='DONO'`
2. `clientes` → Migrar para `parceiros` com `tipo='CLIENTE'`
3. Os dados operacionais (entradas, beneficiamentos, saídas) são de TESTE e podem ser recriados

## Queries de Backup Executadas

```sql
-- Backup completo executado em 2025-12-23
-- Dados exportados via query de leitura
```
