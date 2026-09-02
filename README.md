# 🎵 Sonet — Red Social Musical con AI

> La red social de música más completa: califica, matchea, cita, descubre conciertos y deja que el AI elija tu canción del día.

[![Expo](https://img.shields.io/badge/Expo-54-black?style=flat&logo=expo)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat&logo=supabase)](https://supabase.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)

---

## 🚀 Setup Rápido (para el demo del sábado)

```bash
# 1. Clonar y entrar
git clone <repo-url>
cd sonet

# 2. Instalar dependencias mobile
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# → Editar .env.local con tus keys (ver sección Keys abajo)

# 4. Correr
npx expo start
```

Para la app completa con mapas: `npx expo run:ios` o `npx expo run:android`

---

## 🔑 Keys Necesarias

| Key | Dónde conseguirla | Env var |
|-----|-------------------|---------|
| Supabase URL + Anon Key | supabase.com → proyecto → Settings → API | `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Spotify Client ID | developer.spotify.com → Create App | `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` |
| Ticketmaster | developer.ticketmaster.com | `EXPO_PUBLIC_TICKETMASTER_API_KEY` |
| YouTube | console.cloud.google.com → YouTube Data API v3 | `EXPO_PUBLIC_YOUTUBE_API_KEY` |

### Supabase Database Setup

```sql
-- En Supabase SQL Editor, ejecutar:
-- supabase/schema.sql   (fuente única de verdad — schema_v2.sql fue retirado y fusionado aquí)
```

Después de correr el schema:
1. **Authentication → Providers**: habilita **Google** y **Apple** (Email ya viene habilitado). Cada uno pide su propio Client ID/Secret desde Google Cloud Console / Apple Developer — Supabase te da la URL de callback exacta a pegar en cada uno.
2. **Authentication → URL Configuration**: agrega `sonet://auth/callback` como Redirect URL.

### Spotify Redirect URIs

Agregar en Spotify Developer Dashboard:
- `sonet://auth/callback`
- `exp://127.0.0.1:8081/--/auth/callback` (para Expo Go en dev)

---

## 🔒 Manual — Cuentas y Setup Externo (fuera del alcance de este repo)

Esto es lo que **tú** tienes que hacer con tus propias cuentas — no es código, son pasos administrativos que nadie puede hacer por ti:

| Paso | Dónde | Notas |
|------|-------|-------|
| Crear proyecto Supabase | supabase.com | Plan gratuito alcanza para el demo. Corre `supabase/schema.sql` completo en el SQL Editor. |
| App de Spotify Developer | developer.spotify.com/dashboard | Redirect URIs de arriba. Client ID va en `.env.local`. |
| API key de Ticketmaster | developer.ticketmaster.com | Solo necesario si activas Map con datos reales (fuera del corte de este sprint). |
| API key de YouTube (opcional) | console.cloud.google.com | Solo si quieres videos musicales reales. |
| Habilitar Google OAuth | Google Cloud Console → OAuth consent screen + credenciales | Pega el callback URL que te da Supabase. |
| Habilitar Apple OAuth | Apple Developer Program ($99 USD/año) | Requerido para "Sign in with Apple" real y, más adelante, Apple Music (MusicKit). Sin esto, el botón de Apple no funcionará — es la única pieza que depende de un pago tuyo. |
| Certificación SOC2 | Auditor externo (Vanta, Drata, Secureframe, o una firma directa) | Este repo ya implementa los controles técnicos que un auditor revisa (RLS en cada tabla, secretos aislados de tablas de lectura pública, políticas de mínimo privilegio). La certificación en sí es un proceso pagado de semanas/meses que solo tu empresa puede contratar — no es algo que se resuelva con código. |
| Desplegar el backend Python (`backend/`) | Railway / Fly.io (`Dockerfile` ya incluido) | Opcional. El matching y las recomendaciones ya funcionan 100% del lado del cliente (`lib/ai/matchEngine.ts` + `lib/ai/recommendations.ts`), así que este backend no es necesario para el demo. Solo despliégalo si más adelante quieres scoring SVM del lado del servidor o los cron jobs de APScheduler. |
| App stores (post-demo) | Apple Developer Program + Google Play Console | Necesario cuando quieran publicar de verdad, no para el demo con amigos. |

### Roadmap post-demo (lo que quedó fuera de este sprint por decisión explícita, no por limitación técnica)

- Mapa de conciertos real + historial de asistencia + recomendaciones basadas en ese historial
- Recomendación diaria curada por la app (artista/canción/álbum) con votación pública
- Chat real sobre el esquema `conversations`/`messages` ya existente
- Los otros 4 modos de juego: perfect lineup, leaderboard en tiempo real de "quién adivina primero", adivina el artista, adivina el año
- Stories musicales estilo Instagram
- Paywall Premium vía RevenueCat para creación de eventos (el mockup ya define $99 MXN/mes)
- Apple Music OAuth
- Publicación en App Store / Play Store

---

## 🏗️ Stack

| Capa | Tecnología |
|------|-----------|
| Mobile | React Native + Expo SDK 51 |
| Routing | Expo Router v3 (file-based) |
| Backend DB | Supabase (Auth + PostgreSQL + Realtime) |
| ML Backend | FastAPI + scikit-learn (Python) |
| State | Zustand |
| Charts | Victory Native |
| Maps | React Native Maps |
| APIs | Spotify + Ticketmaster + YouTube |

---

## 🤖 Sistema de AI/ML

### Music DNA Vector (22 dimensiones)
Cada usuario tiene un vector de gusto musical generado automáticamente desde Spotify:

```
energy, danceability, valence, acousticness, instrumentalness,
speechiness, tempo_norm, loudness_norm, liveness,
genre_pop, genre_rock, genre_hip_hop, genre_electronic, genre_latin,
genre_rnb, genre_jazz, genre_classical, genre_other,
avg_rating_norm, bpm_preference, vocal_preference, mood_index, diversity
```

### SVM-Inspired Match Engine (`lib/ai/matchEngine.ts`)
- Pesos diferenciados por feature (valence=2.0 — mood es el signal más fuerte)
- Cosine similarity en espacio de features ponderadas
- Sigmoid scaling → score 0-100
- Breakdown: audio (40%) + géneros (35%) + mood (25%)
- Labels: Soul Twin → Frequency Match → Vibes Match → Groove Partner → Music Buddy

### Song of the Day (`components/recommendations/SongOfTheDay.tsx`)
- Spotify Recommendations API con target audio features del usuario
- Filtrado por artistas liked (≥8 rating) y excluded (≤3 rating)
- confidence score 0-99

### SoundMatch Dating (`app/(tabs)/date.tsx`)
- Swipe cards con compatibilidad calculada por el ML engine
- Perfil ciego: nunca se expone nombre/foto — solo edad, distancia y compatibilidad musical, todo opt-in por el usuario
- Modo configurable: dating, solo amigos, o apagado (recomendaciones sin match social)
- Like + Pass + Super Like
- Trigger SQL: match mutuo → notificación automática
- Icebreaker musical automático

### Ranking sin empates (`lib/ranking.ts`)
Igual que Beli/Letterboxd: cada rating nuevo se inserta por comparación binaria contra tu lista existente ("¿Cuál prefieres?"), nunca por un slider aislado — así que dos canciones nunca pueden empatar en tu ranking personal.
1. **Bucket**: "Me gustó" / "Estuvo bien" / "No fue lo mío" fija una banda de score (7.0–10.0 / 4.0–6.9 / 1.0–3.9).
2. **Duelo**: inserción binaria (O(log n) comparaciones) contra tu lista ya ordenada dentro de ese bucket.
3. El `score` mostrado se deriva de la posición final — la posición es la fuente de verdad, no un número que tú escribes.

---

## 📱 Pantallas

| Tab | Descripción |
|-----|------------|
| 🏠 Feed | Timeline de ratings de la comunidad + SongOfTheDay |
| 👥 Discover | Taste Match: personas con tu mismo gusto |
| 💘 SoundMatch | Dating musical con swipe (centro) |
| 🗺️ Map | Conciertos reales (Ticketmaster) + eventos de comunidad |
| 👤 Profile | Dashboard personal + Mis ratings + Top listas |

### Menú juegos (desde Profile)
- **Versus ⚔️**: A vs B musical (shell de UI — post-demo)
- **Adivina 🎵**: puzzle diario tipo Wordle (género/artista/álbum/canción), pistas progresivas, 6 intentos, racha persistente en Supabase — el único juego 100% real de este sprint
- **Discovery Roulette 🎰**: Swipe para descubrir música nueva (shell de UI — post-demo)

---

## 📁 Estructura del Proyecto

```
sonet/
├── app/                    Expo Router screens
│   ├── (auth)/            login, register, onboarding
│   └── (tabs)/            feed, discover, date (+ soundmatch settings), map, profile, games
├── components/
│   ├── dashboard/         MusicDashboard (charts)
│   ├── rating/            CompareDuel (no-ties duel UI)
│   ├── soundmatch/        SoundMatchCard (Tinder-style, blind profile)
│   ├── recommendations/   SongOfTheDay
│   └── games/             VersusGame, GuessSongGame (daily, persistent), DiscoveryRoulette
├── lib/
│   ├── ai/               tasteVector.ts, matchEngine.ts, recommendations.ts
│   ├── ranking.ts        Pairwise-comparison forced ranking (no ties)
│   ├── supabase.ts
│   ├── spotify.ts
│   ├── ticketmaster.ts
│   ├── youtube.ts
│   └── musicDB.ts        Unified search API
├── stores/               Zustand: auth, rating (Supabase-backed), social, ai, recommendations
├── backend/              Python FastAPI ML service (optional, not deployed by default — see Manual)
│   ├── main.py           FastAPI + APScheduler cron
│   ├── music_dna.py      256-dim feature vector
│   ├── svm_model.py      RBF SVC compatibility model
│   ├── recommendations.py Hybrid SOTD engine
│   └── catalog_sync.py   Spotify/Ticketmaster/YouTube sync
└── supabase/
    └── schema.sql         Single source of truth — run this, nothing else
```

---

## 🤝 Cómo Contribuir

1. Clona el repo y crea tu branch: `git checkout -b feature/nombre`
2. Lee `CLAUDE.md` para contexto completo del proyecto
3. Corre `npx expo start` y prueba en tu teléfono con Expo Go
4. PR con descripción de qué cambiaste y por qué

---

## 📅 Roadmap Post-Demo

- [ ] Audio preview 30s en juegos (Spotify Web Playback SDK)
- [ ] Listening Parties en tiempo real
- [ ] Notificaciones push (Expo Notifications)
- [ ] Bandsintown/Songkick como fuente adicional de conciertos
- [ ] Apple Music OAuth
- [ ] Stories musicales (30s audio + imagen)
- [ ] Leaderboard global de juegos
- [ ] Widget de canción favorita para iOS/Android
