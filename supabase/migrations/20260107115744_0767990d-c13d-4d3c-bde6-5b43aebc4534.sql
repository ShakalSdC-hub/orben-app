-- Update LME calculation function to use simplified formula
-- LME Final = LME Base ÷ Fator Imposto (no more tax fields in calculation)
CREATE OR REPLACE FUNCTION public.fn_calc_lme_final_brl_kg()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_lme_base numeric;
  v_lme_final numeric;
BEGIN
  -- Calculate LME base: (LME USD/t * Dólar) / 1000
  v_lme_base := (NEW.lme_cobre_usd_t * NEW.dolar_brl) / 1000;
  
  -- Simplified formula: LME Final = LME Base ÷ Fator Imposto
  -- Fator 0.7986 means ~25% of taxes are included
  IF COALESCE(NEW.fator_imposto, 0) > 0 THEN
    v_lme_final := v_lme_base / NEW.fator_imposto;
  ELSE
    v_lme_final := v_lme_base / 0.7986; -- default fator
  END IF;
  
  NEW.lme_base_brl_kg := v_lme_base;
  NEW.lme_final_brl_kg := v_lme_final;
  
  RETURN NEW;
END;
$function$;