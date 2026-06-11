/**
 * Reglas de puntuacion (ver SOP seccion 7):
 *   - Marcador exacto                          -> 5 puntos
 *   - Ganador/empate correcto (marcador erroneo) -> 2 puntos
 *   - Sin acierto                              -> 0 puntos
 *
 * El acierto exacto REEMPLAZA (no suma) al acierto de ganador.
 * El maximo por partido es 5 puntos.
 *
 * Esta funcion es la fuente unica de verdad: la usa tanto el cliente
 * (para previsualizar) como la Cloud Function `evaluatePredictions`.
 */
export function computePoints(
  predictedHomeGoals: number,
  predictedAwayGoals: number,
  homeGoals: number,
  awayGoals: number
): number {
  const exact =
    predictedHomeGoals === homeGoals && predictedAwayGoals === awayGoals;
  if (exact) return 5;

  const correctOutcome =
    Math.sign(predictedHomeGoals - predictedAwayGoals) ===
    Math.sign(homeGoals - awayGoals);
  return correctOutcome ? 2 : 0;
}
