-- Peña Outra Máis. Un único criterio para Gastado cuotas.
-- Hasta el 21/10/2026 no se dispone del detalle completo de sorteos:
-- se conserva el histórico estimado de 42 semanas × 20 socios × 1 € = 840 €.
-- A partir del 22/10/2026, únicamente se descuentan apuestas
-- comprobadas, selladas mediante reintegros o especiales registradas.
-- Programar un sorteo NO supone haberlo sellado.

CREATE TABLE IF NOT EXISTS private.gastos_historicos_cuotas (
  temporada_id bigint PRIMARY KEY REFERENCES public.temporadas(id) ON DELETE CASCADE,
  fecha_corte date NOT NULL,
  importe numeric(12,2) NOT NULL CHECK (importe >= 0),
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.gastos_historicos_cuotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.gastos_historicos_cuotas FROM PUBLIC, anon, authenticated;

INSERT INTO private.gastos_historicos_cuotas
    (temporada_id, fecha_corte, importe, observaciones)
SELECT t.id, date '2026-10-21', 840.00,
       'Histórico sin sorteos individualizados: 42 semanas x 20 socios x 1 EUR. Los sorteos detallados comienzan el 22/10/2026.'
FROM public.temporadas t
WHERE t.anio=2026
ON CONFLICT (temporada_id) DO NOTHING;

ALTER TABLE public.resumen_cuotas_publico
  ADD COLUMN IF NOT EXISTS gasto_historico numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gasto_sellado numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pendiente_sellar numeric(12,2) NOT NULL DEFAULT 0;

-- Desglose: base histórica + apuestas realmente selladas/comprobadas.
-- Un reintegro igual a 0 es válido; deben estar TODOS los reintegros fijos.
CREATE OR REPLACE FUNCTION private.calcular_gasto_cuotas(p_temporada_id bigint)
RETURNS TABLE(historico numeric, sellado numeric, por_sellar numeric)
LANGUAGE sql STABLE
SET search_path TO ''
AS $function$
  WITH corte AS (
    SELECT
      COALESCE(h.importe,0::numeric) AS importe,
      COALESCE(h.fecha_corte,date '0001-01-01') AS fecha_corte
    FROM (SELECT 1) base
    LEFT JOIN private.gastos_historicos_cuotas h
      ON h.temporada_id=p_temporada_id
  ),
  estado_sorteos AS (
    SELECT
      s.id,s.fecha,s.estado,s.juego_codigo,s.automatico,
      COUNT(a.id) FILTER (WHERE a.tipo='fija') AS fijas,
      COALESCE(
        BOOL_AND(
          COALESCE((a.datos->>'reintegro') ~ '^[0-9]$',false)
        ) FILTER (WHERE a.tipo='fija'),
        false
      ) AS reintegros_completos
    FROM public.sorteos s
    LEFT JOIN public.apuestas a ON a.sorteo_id=s.id
    WHERE s.temporada_id=p_temporada_id
    GROUP BY s.id
  ),
  apuestas_clasificadas AS (
    SELECT
      e.fecha,a.importe,a.fuente_fondos,
      (
        e.estado='comprobado'
        OR (
          e.juego_codigo='primitiva'
          AND e.automatico
          AND e.fijas>0
          AND e.reintegros_completos
        )
        OR (
          NOT e.automatico
          AND a.tipo<>'programada'
        )
      ) AS efectivamente_jugada
    FROM estado_sorteos e
    JOIN public.apuestas a ON a.sorteo_id=e.id
  )
  SELECT
    c.importe AS historico,
    COALESCE(
      SUM(a.importe) FILTER(
        WHERE a.fecha>c.fecha_corte
          AND a.fuente_fondos='cuotas'
          AND a.efectivamente_jugada
      ),
      0::numeric
    ) AS sellado,
    COALESCE(
      SUM(a.importe) FILTER(
        WHERE a.fecha>c.fecha_corte
          AND a.fuente_fondos='cuotas'
          AND NOT a.efectivamente_jugada
      ),
      0::numeric
    ) AS por_sellar
  FROM corte c
  LEFT JOIN apuestas_clasificadas a ON true
  GROUP BY c.importe,c.fecha_corte;
$function$;

-- Se preserva la lógica existente de cuotas cobradas/pagos adelantados.
-- El trigger central reemplaza exclusivamente el cálculo de "jugado"
-- y "disponible", y proporciona el desglose a todos los paneles.
CREATE OR REPLACE FUNCTION private.aplicar_gasto_unificado_cuotas()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_historico numeric;
  v_sellado numeric;
  v_pendiente numeric;
BEGIN
  SELECT c.historico,c.sellado,c.por_sellar
  INTO v_historico,v_sellado,v_pendiente
  FROM private.calcular_gasto_cuotas(NEW.temporada_id) c;

  NEW.gasto_historico:=COALESCE(v_historico,0);
  NEW.gasto_sellado:=COALESCE(v_sellado,0);
  NEW.pendiente_sellar:=COALESCE(v_pendiente,0);
  NEW.jugado_con_cuotas:=NEW.gasto_historico+NEW.gasto_sellado;
  NEW.disponible:=NEW.cobrado-NEW.jugado_con_cuotas;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS resumen_cuotas_unificar_gasto ON public.resumen_cuotas_publico;
CREATE TRIGGER resumen_cuotas_unificar_gasto
BEFORE INSERT OR UPDATE ON public.resumen_cuotas_publico
FOR EACH ROW
EXECUTE FUNCTION private.aplicar_gasto_unificado_cuotas();

-- Recalcular también cuando un sorteo pasa de pendiente a comprobado
-- o se elimina, incluso si ninguna apuesta cambia.
CREATE OR REPLACE FUNCTION private.refrescar_gasto_cuotas_al_cambiar_sorteo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.temporada_id IS NOT NULL THEN
      PERFORM private.refrescar_resumen_cuotas_publico(OLD.temporada_id);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.temporada_id IS NOT NULL THEN
    PERFORM private.refrescar_resumen_cuotas_publico(NEW.temporada_id);
  END IF;
  IF TG_OP='UPDATE' AND OLD.temporada_id IS DISTINCT FROM NEW.temporada_id
     AND OLD.temporada_id IS NOT NULL THEN
    PERFORM private.refrescar_resumen_cuotas_publico(OLD.temporada_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sorteos_refrescar_gasto_cuotas ON public.sorteos;
CREATE TRIGGER sorteos_refrescar_gasto_cuotas
AFTER INSERT OR DELETE OR UPDATE OF estado,temporada_id
ON public.sorteos
FOR EACH ROW
EXECUTE FUNCTION private.refrescar_gasto_cuotas_al_cambiar_sorteo();

-- Actualizar el resumen de la temporada 2026 con la nueva regla.
SELECT private.refrescar_resumen_cuotas_publico(t.id)
FROM public.temporadas t
WHERE t.anio=2026;
