# SOP — Prode Copa del Mundo 2026
### Standard Operating Procedure · Planificación y Desarrollo

---

## Índice

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Identidad Visual](#3-identidad-visual)
4. [Arquitectura del Sistema](#4-arquitectura-del-sistema)
5. [Estructura de Base de Datos (Firebase)](#5-estructura-de-base-de-datos-firebase)
6. [Módulos Funcionales](#6-módulos-funcionales)
7. [Sistema de Puntuación](#7-sistema-de-puntuación)
8. [Estructura de Pantallas y Componentes](#8-estructura-de-pantallas-y-componentes)
9. [Autenticación con Google / Firebase](#9-autenticación-con-google--firebase)
10. [Información de Partidos](#10-información-de-partidos)
11. [Fases del Proyecto](#11-fases-del-proyecto)
12. [Reglas de Negocio y Restricciones](#12-reglas-de-negocio-y-restricciones)
13. [Consideraciones de Seguridad](#13-consideraciones-de-seguridad)

---

## 1. Resumen del Proyecto

**Nombre del producto:** Prode Mundial 2026  
**Tipo:** Aplicación web interactiva (también optimizada para mobile)  
**Objetivo:** Permitir a usuarios registrarse, pronosticar los resultados de los partidos de la Copa del Mundo FIFA 2026 y competir en un ranking global de puntos en tiempo real.

### Funcionalidades principales

- Registro e inicio de sesión mediante cuenta de Google (Gmail)
- Visualización de fixture completo con información de cada partido (equipos, sede, horario ARG y ESP)
- Ingreso de pronósticos por partido (resultado ganador + marcador exacto)
- Sistema de puntos automático al cierre de cada partido
- Tabla de posiciones (leaderboard) en tiempo real visible desde todas las pantallas

---

## 2. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) | SSR/SSG, routing eficiente, óptimo para SEO y performance |
| **Animaciones** | Framer Motion | Transiciones fluidas entre vistas, microinteracciones en tarjetas de partido |
| **Backend / DB** | Firebase (Firestore + Auth + Functions) | Sin servidor, escala automáticamente, Auth nativa con Google, tiempo real |
| **Autenticación** | Firebase Authentication + Google OAuth | Login con 1 clic, sin gestión de contraseñas |
| **Hosting** | Vercel (frontend) + Firebase (backend) | Despliegue automático desde Git, CDN global |
| **Estilos** | Tailwind CSS | Utility-first, fácil de mantener coherencia visual |
| **Tipografía** | Rajdhani (Google Fonts) | Ver sección de Identidad Visual |

### ¿Por qué Firebase como backend?

Firebase es **altamente recomendado** para este proyecto por las siguientes razones:

- **Firestore** permite listeners en tiempo real, clave para actualizar el leaderboard y resultados instantáneamente sin necesidad de polling
- **Firebase Authentication** integra Google Sign-In de forma nativa con pocas líneas de código
- **Firebase Security Rules** permiten controlar quién puede escribir pronósticos (solo el propio usuario, solo antes del inicio del partido)
- **Cloud Functions** permiten ejecutar lógica de servidor segura para calcular puntos al finalizar un partido, sin exponer esa lógica al cliente
- **Costo**: el plan Spark (gratuito) es suficiente para un MVP con carga moderada; el plan Blaze escala por uso

---

## 3. Identidad Visual

### Paleta de Colores

Basada en la identidad oficial de la FIFA World Cup 2026: sistema de marca flexible con negro, blanco, oro y colores de los países anfitriones (Estados Unidos, Canadá, México). Se adopta una paleta que evoca energía, noche de estadio y modernidad.

| Nombre | Hex | Uso |
|---|---|---|
| **Negro Profundo** | `#0A0A0A` | Fondo principal, modo oscuro base |
| **Blanco Puro** | `#FFFFFF` | Textos principales, iconografía |
| **Oro FIFA** | `#C9A84C` | Acentos, puntuación, highlights, CTA primarios |
| **Rojo Vibrante** | `#D62828` | Estados de error, equipos locales, alertas |
| **Azul Acero** | `#1A3A5C` | Cards secundarias, backgrounds alternativos |
| **Gris Carbón** | `#1E1E1E` | Cards, panels, leaderboard fondo |
| **Gris Suave** | `#6B7280` | Textos secundarios, subtítulos, metadatos |
| **Verde Estadio** | `#2D6A4F` | Indicadores positivos, partidos finalizados |

### Tipografía

**Tipografía principal: Rajdhani**

- Familia sans-serif geométrica condensada de Google Fonts
- Inspirada en la tipografía oficial del Mundial 2026 (FWC 26, bold, geométrica, con alto impacto visual)
- Libre para uso comercial y web
- Excelente legibilidad en pantallas digitales y formatos deportivos

| Estilo | Peso | Uso |
|---|---|---|
| `Rajdhani Bold` | 700 | Títulos, nombres de equipos, marcadores |
| `Rajdhani SemiBold` | 600 | Subtítulos, nombres de jugadores en leaderboard |
| `Rajdhani Regular` | 400 | Textos de apoyo, horarios, metadatos |

**Tipografía secundaria: Noto Sans**  
Para textos de interfaz, formularios y elementos UI. Alineado con el uso oficial de Noto Sans como fuente de soporte en la identidad FIFA 2026.

### Importación en Next.js (Google Fonts)

```javascript
// app/layout.tsx
import { Rajdhani, Noto_Sans } from 'next/font/google'

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-rajdhani',
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-noto',
})
```

---

## 4. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────┐
│                  CLIENTE (Browser)                   │
│                                                      │
│  Next.js 14 App Router + Framer Motion               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ /fixture │  │ /ranking │  │ /partido/[id]    │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                    │                                  │
└────────────────────┼─────────────────────────────────┘
                     │ Firebase SDK
                     ▼
┌─────────────────────────────────────────────────────┐
│                  FIREBASE                            │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐   │
│  │    Auth     │  │  Firestore   │  │ Functions │   │
│  │  Google     │  │  (Realtime)  │  │  (Server) │   │
│  └─────────────┘  └──────────────┘  └───────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Flujo de datos:**

1. Usuario abre la app → Next.js sirve la página (SSR)
2. Firebase Auth verifica si hay sesión activa (cookie segura)
3. Si autenticado: Firestore listener activo para partidos y leaderboard
4. Usuario ingresa pronóstico → escritura directa en Firestore (validada por Security Rules)
5. Al finalizar un partido → Cloud Function calcula puntos de todos los pronósticos
6. Leaderboard se actualiza en tiempo real para todos los usuarios conectados

---

## 5. Estructura de Base de Datos (Firebase Firestore)

### Colección: `users`

```
users/{userId}
  ├── displayName: string
  ├── email: string
  ├── photoURL: string
  ├── totalPoints: number        ← Campo desnormalizado para leaderboard rápido
  ├── exactResults: number       ← Contador de resultados exactos
  ├── correctResults: number     ← Contador de ganador/empate correcto
  └── createdAt: timestamp
```

### Colección: `matches`

```
matches/{matchId}
  ├── matchNumber: number
  ├── stage: string              ← "Grupo A", "Octavos", "Final", etc.
  ├── homeTeam: {
  │     name: string
  │     code: string             ← "ARG", "BRA", "USA"
  │     flagUrl: string
  │   }
  ├── awayTeam: { ... }          ← misma estructura
  ├── venue: {
  │     name: string             ← "MetLife Stadium"
  │     city: string             ← "East Rutherford, NJ"
  │     country: string
  │   }
  ├── scheduledAt: timestamp     ← UTC
  ├── scheduledAtARG: string     ← "18:00 (ARG)" precalculado
  ├── scheduledAtESP: string     ← "23:00 (ESP)" precalculado
  ├── status: "upcoming" | "live" | "finished"
  └── result: {                  ← null hasta que termine
        homeGoals: number
        awayGoals: number
      }
```

### Colección: `predictions`

```
predictions/{userId}_{matchId}
  ├── userId: string
  ├── matchId: string
  ├── predictedHomeGoals: number
  ├── predictedAwayGoals: number
  ├── submittedAt: timestamp
  ├── pointsEarned: number       ← 0 hasta que finalice el partido
  └── evaluated: boolean
```

### Colección: `leaderboard` (vista materializada)

```
leaderboard/{userId}
  ├── displayName: string
  ├── photoURL: string
  ├── totalPoints: number
  ├── exactResults: number
  └── rank: number               ← Actualizado por Cloud Function
```

---

## 6. Módulos Funcionales

### 6.1 Módulo de Autenticación

- Login con Google (Firebase Auth)
- Logout
- Persistencia de sesión (cookie HttpOnly via Firebase)
- Guard de rutas: páginas de pronóstico requieren auth

### 6.2 Módulo de Fixture

- Listado de todos los partidos agrupados por fase
- Filtro por grupo / fase / estado (próximos / en vivo / finalizados)
- Card por partido con: banderas, nombre de equipos, sede, horario ARG y ESP
- Indicador de estado: PRÓXIMO / EN VIVO / FINALIZADO

### 6.3 Módulo de Pronósticos

- Input de marcador para cada partido (solo disponible antes del inicio)
- Bloqueo automático cuando `scheduledAt` llega (Firebase Security Rules)
- Visualización del pronóstico previo si ya fue ingresado
- Confirmación visual con animación Framer Motion

### 6.4 Módulo de Leaderboard

- Tabla lateral persistente (desktop) o tab dedicada (mobile)
- Top N jugadores ordenados por `totalPoints`
- Avatar (foto de Google), nombre, puntos totales
- Highlight del usuario actual
- Actualización en tiempo real vía Firestore `onSnapshot`

### 6.5 Módulo de Resultados

- Al finalizar un partido, Cloud Function ejecuta `evaluatePredictions(matchId)`
- Calcula puntos para cada pronóstico y actualiza `predictions` y `users/totalPoints`
- El marcador final se muestra sobre la card del partido

---

## 7. Sistema de Puntuación

| Acierto | Puntos |
|---|---|
| Adivina el ganador (o empate) correctamente | **+2 puntos** |
| Adivina el marcador exacto | **+5 puntos** |
| Sin acierto | 0 puntos |

**Ejemplos:**

- Partido: Argentina 2 – Francia 1. Usuario pronosticó Argentina 1 – Francia 0 → Argentina ganó ✓ → **+2 pts**
- Partido: Argentina 2 – Francia 1. Usuario pronosticó Argentina 2 – Francia 1 exacto → **+5 pts** (incluye el acierto de ganador, no son acumulativos)
- Partido: empate 1–1. Usuario pronosticó empate 2–2 → empate correcto ✓ → **+2 pts**
- Partido: empate 1–1. Usuario pronosticó empate 1–1 exacto → **+5 pts**

> **Regla:** el marcador exacto reemplaza (no suma) al acierto de ganador. El máximo por partido es 5 puntos.

### Cloud Function: `evaluatePredictions`

```javascript
// functions/src/evaluatePredictions.ts
export const evaluatePredictions = onDocumentUpdated(
  'matches/{matchId}',
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()

    // Solo ejecutar cuando el partido pasa a "finished"
    if (before.status === after.status || after.status !== 'finished') return

    const { homeGoals, awayGoals } = after.result
    const matchId = event.params.matchId

    const predictionsSnap = await db
      .collection('predictions')
      .where('matchId', '==', matchId)
      .where('evaluated', '==', false)
      .get()

    const batch = db.batch()

    predictionsSnap.forEach((doc) => {
      const pred = doc.data()
      let points = 0

      const exactMatch =
        pred.predictedHomeGoals === homeGoals &&
        pred.predictedAwayGoals === awayGoals

      const correctOutcome =
        Math.sign(pred.predictedHomeGoals - pred.predictedAwayGoals) ===
        Math.sign(homeGoals - awayGoals)

      if (exactMatch) {
        points = 5
      } else if (correctOutcome) {
        points = 2
      }

      batch.update(doc.ref, { pointsEarned: points, evaluated: true })

      // Incrementar puntos del usuario
      const userRef = db.collection('users').doc(pred.userId)
      batch.update(userRef, {
        totalPoints: FieldValue.increment(points),
        ...(exactMatch && { exactResults: FieldValue.increment(1) }),
        ...(correctOutcome && !exactMatch && { correctResults: FieldValue.increment(1) }),
      })
    })

    await batch.commit()
  }
)
```

---

## 8. Estructura de Pantallas y Componentes

### Árbol de rutas (Next.js App Router)

```
app/
├── layout.tsx              ← RootLayout: fuentes, providers, leaderboard sidebar
├── page.tsx                ← Home / Fixture completo
├── partido/
│   └── [id]/
│       └── page.tsx        ← Detalle de partido + input de pronóstico
├── ranking/
│   └── page.tsx            ← Leaderboard expandido (mobile)
├── perfil/
│   └── page.tsx            ← Mis pronósticos + mis puntos
└── api/
    └── auth/
        └── [...nextauth]/  ← (Opcional: si se usa NextAuth junto a Firebase)
```

### Componentes clave

```
components/
├── layout/
│   ├── Sidebar.tsx          ← Leaderboard lateral (fijo en desktop)
│   ├── Navbar.tsx           ← Logo, usuario logueado, menú
│   └── MobileNav.tsx
├── match/
│   ├── MatchCard.tsx        ← Card de partido en el fixture
│   ├── MatchDetail.tsx      ← Vista completa del partido
│   ├── TeamBadge.tsx        ← Bandera + nombre de equipo
│   ├── ScoreInput.tsx       ← Input de marcador (con Framer Motion)
│   └── MatchStatus.tsx      ← Badge PRÓXIMO / EN VIVO / FINALIZADO
├── leaderboard/
│   ├── LeaderboardTable.tsx ← Tabla completa
│   └── LeaderboardRow.tsx   ← Fila individual con avatar y puntos
└── ui/
    ├── Button.tsx
    ├── Avatar.tsx
    └── AnimatedNumber.tsx   ← Números que animan al cambiar (Framer Motion)
```

### Animaciones con Framer Motion

```javascript
// Transición entre páginas (layout.tsx)
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
</AnimatePresence>

// Aparición escalonada de las cards de partido
const cardVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.3 }
  })
}
```

---

## 9. Autenticación con Google / Firebase

### Setup inicial

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitar Authentication → proveedor Google
3. Agregar dominio de producción a los dominios autorizados
4. Instalar SDK: `npm install firebase`

### Configuración Firebase

```javascript
// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
```

### Login con Google

```javascript
// hooks/useAuth.ts
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider, db } from '@/lib/firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider)
  const user = result.user

  // Crear perfil en Firestore si es la primera vez
  const userRef = doc(db, 'users', user.uid)
  const snap = await getDoc(userRef)

  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      totalPoints: 0,
      exactResults: 0,
      correctResults: 0,
      createdAt: serverTimestamp(),
    })
  }
  return user
}

export const signOutUser = () => signOut(auth)
```

---

## 10. Información de Partidos

### Estructura de horarios

Cada partido almacena el horario en UTC y dos strings precalculados para Argentina y España. La Copa del Mundo 2026 se disputa entre el **11 de junio y el 19 de julio de 2026** en Estados Unidos, Canadá y México.

| Zona horaria | Diferencia UTC | Observaciones |
|---|---|---|
| Argentina (ART) | UTC–3 | Sin horario de verano |
| España (CEST) | UTC+2 | Horario de verano (vigente en junio-julio) |

**Ejemplo de partido:**

| Campo | Valor |
|---|---|
| Equipos | Argentina vs. México |
| Sede | MetLife Stadium, East Rutherford, NJ |
| UTC | 2026-06-22 00:00 |
| **Hora ARG** | **22:00 (21 jun)** |
| **Hora ESP** | **02:00 (22 jun)** |

### Script de carga inicial del fixture

Se recomienda crear un script `scripts/seedMatches.ts` que lea un JSON con los 104 partidos del torneo y los inserte en Firestore usando un batch write. El JSON oficial del fixture se puede obtener de la API pública de FIFA o fuentes de datos deportivos (por ejemplo, football-data.org o api-football.com).

---

## 11. Fases del Proyecto

### Fase 0 — Setup (Días 1–3)

- Crear repositorio en GitHub
- Inicializar proyecto Next.js 14 con Tailwind CSS y Framer Motion
- Crear proyecto Firebase (Auth + Firestore + Functions)
- Configurar variables de entorno en `.env.local` y Vercel
- Configurar Firestore Security Rules básicas

### Fase 1 — Autenticación (Días 4–6)

- Implementar login/logout con Google
- Provider de contexto de autenticación (`AuthContext`)
- Guard de rutas para páginas protegidas
- Crear perfil de usuario en Firestore al registrarse

### Fase 2 — Fixture (Días 7–12)

- Diseñar y maquetar `MatchCard` con identidad visual del Mundial 2026
- Implementar página principal con listado de partidos
- Script de seed del fixture completo en Firestore
- Filtros por fase / grupo / estado

### Fase 3 — Pronósticos (Días 13–18)

- Componente `ScoreInput` con animaciones Framer Motion
- Lógica de escritura en Firestore con validación de tiempo
- Reglas de Firestore para bloquear pronósticos post-inicio
- Visualización del pronóstico propio en cada partido

### Fase 4 — Leaderboard (Días 19–23)

- Componente `LeaderboardTable` con listener `onSnapshot`
- Integrar sidebar en layout desktop
- Tab dedicada en mobile
- Highlight del usuario propio en la tabla

### Fase 5 — Puntuación (Días 24–28)

- Implementar Cloud Function `evaluatePredictions`
- Testear con partidos simulados
- Deploy de Functions a Firebase
- Animación de puntos nuevos con `AnimatedNumber`

### Fase 6 — QA y Lanzamiento (Días 29–35)

- Tests de usabilidad en mobile y desktop
- Revisión de Firestore Security Rules
- Optimización de performance (imágenes, bundle size)
- Deploy final a Vercel
- Configurar dominio personalizado

---

## 12. Reglas de Negocio y Restricciones

- Un usuario **solo puede ingresar o modificar su propio pronóstico**
- El pronóstico se **bloquea automáticamente** cuando comienza el partido (`scheduledAt` en el pasado)
- No se permiten pronósticos negativos (validación client + server)
- El leaderboard es público (visible sin login), pero los pronósticos propios requieren autenticación
- Los resultados de los partidos **solo pueden ser escritos por Cloud Functions** (nunca por el cliente)
- Un usuario no puede ver los pronósticos de otros usuarios hasta que el partido inicie

### Firestore Security Rules (extracto)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuarios: solo pueden editar su propio perfil
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Pronósticos: solo el dueño puede escribir, antes de que comience el partido
    match /predictions/{predId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create, update: if
        request.auth != null &&
        request.resource.data.userId == request.auth.uid &&
        get(/databases/$(database)/documents/matches/$(request.resource.data.matchId)).data.status == 'upcoming';
    }

    // Partidos: solo lectura para todos
    match /matches/{matchId} {
      allow read: if true;
      allow write: if false; // Solo Cloud Functions
    }

    // Leaderboard: solo lectura pública
    match /leaderboard/{userId} {
      allow read: if true;
      allow write: if false; // Solo Cloud Functions
    }
  }
}
```

---

## 13. Consideraciones de Seguridad

- **Variables de entorno**: todas las claves de Firebase se almacenan en `.env.local` (no se suben a Git). Solo las claves prefijadas con `NEXT_PUBLIC_` son públicas en el cliente (esto es normal para Firebase Web SDK).
- **Cloud Functions**: la lógica de evaluación de puntos corre en servidor, no en el cliente. Nunca exponer lógica de scoring al frontend.
- **Rate limiting**: considerar implementar rate limiting en el ingreso de pronósticos para evitar abuso (Firebase App Check o un middleware en Next.js).
- **Validación doble**: validar el marcador tanto en el cliente (UI) como en las Security Rules de Firestore (no confiar solo en la UI).
- **Índices de Firestore**: crear índices compuestos para las queries de `predictions` por `matchId` + `evaluated` para eficiencia a escala.

---

*Documento generado como SOP de planificación — Prode Copa del Mundo 2026*  
*Última revisión: Junio 2026*
