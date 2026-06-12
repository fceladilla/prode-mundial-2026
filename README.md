# Prode Mundial 2026

Aplicacion web para pronosticar los partidos de la Copa del Mundo FIFA 2026 y
competir en un ranking en tiempo real. Next.js 14 + Firebase + Tailwind.

## Estado del MVP

Implementado:

- Login con Google (Firebase Auth)
- Fixture en tiempo real agrupado por fase
- Carga de pronosticos (marcador) que se bloquea cuando empieza el partido
- Leaderboard en tiempo real (sidebar en desktop, pagina `/ranking` en mobile)
- Reglas de seguridad de Firestore
- Script de seed del fixture
- Calculo de puntos al cargar un resultado (script `set-result`, ver abajo)

Pendiente (mejoras post-MVP):

- Cloud Function `evaluatePredictions` que calcule los puntos de forma
  automatica al finalizar cada partido. Por ahora eso lo hace a mano el script
  `set-result` (mismo resultado, sin necesidad del plan Blaze).
- Pantalla de detalle de partido y perfil del usuario.

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto Firebase

1. Entra a y crea un proyecto.
2. **Authentication** -> Sign-in method -> habilita **Google**.
3. **Firestore Database** -> Crear base de datos (modo produccion).
4. En **Configuracion del proyecto -> Tus apps**, crea una app Web y copia las
   credenciales.

### 3. Variables de entorno

Copia `.env.local.example` a `.env.local` y completa los valores:

```bash
cp .env.local.example .env.local   # en Windows: copy .env.local.example .env.local
```

### 4. Publicar las reglas de seguridad

Desde la consola de Firebase (Firestore -> Reglas) pega el contenido de
`firestore.rules`, o con la CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Cargar el fixture

1. Descarga la clave de cuenta de servicio: **Configuracion del proyecto ->
   Cuentas de servicio -> Generar nueva clave privada**. Guardala como
   `scripts/serviceAccountKey.json` (ya esta gitignoreada).
2. Edita `scripts/matches.json` con el fixture oficial. Los datos que vienen
   por defecto son **de muestra** (los cruces reales dependen del sorteo): las
   sedes y fechas son reales pero los rivales figuran como "Por definir".
   Reemplazalos por los partidos oficiales. Las horas se cargan en **UTC** y el
   script calcula solo las horas de Argentina y Espana.
3. Ejecuta:

```bash
npm run seed
```

### 6. Levantar la app

```bash
npm run dev
```

Abri http://localhost:3000

## Sistema de puntuacion

| Acierto | Puntos |
|---|---|
| Marcador exacto | 5 |
| Ganador / empate correcto | 3 |
| Sin acierto | 0 |

El exacto reemplaza (no suma) al acierto de ganador. Maximo 5 por partido.

### Cargar el resultado de un partido

Cuando termina un partido, el administrador corre:

```bash
npm run set-result -- <matchId> <golesLocal> <golesVisitante>
# ej: npm run set-result -- match-001 2 1
```

Marca el partido como `finished`, evalua los pronosticos con la regla de arriba
y actualiza el ranking. Es idempotente (no duplica puntos si se re-ejecuta) y
usa la service account: no requiere Cloud Functions ni plan Blaze.

## Comandos

```bash
npm run dev     # desarrollo
npm run build   # build de produccion
npm run lint    # eslint
npm run seed    # cargar el fixture en Firestore
npm run set-result -- match-001 2 1   # cargar resultado de un partido y puntuar
```

Mas detalle de la arquitectura en `CLAUDE.md` y el plan completo en
`SOP_Prode_Mundial2026.md`.
