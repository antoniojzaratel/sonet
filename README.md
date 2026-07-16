# 🎵 Sonet — Red Social Musical con AI

> La red social de música más completa: califica, matchea, cita, descubre conciertos y deja que el AI elija tu canción del día.

[![Expo](https://img.shields.io/badge/Expo-51-black?style=flat&logo=expo)](https://expo.dev)
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
-- En Supabase SQL Editor, ejecutar en orden:
-- 1. supabase/schema.sql
-- 2. supabase/schema_v2.sql
```

### Spotify Redirect URIs

Agregar en Spotify Developer Dashboard:
- `sonet://auth/callback`
- `exp://127.0.0.1:8081/--/auth/callback` (para Expo Go en dev)

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
- Like + Pass + Super Like
- Trigger SQL: match mutuo → notificación automática
- Icebreaker musical automático

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
- **Versus ⚔️**: A vs B musical
- **Adivina 🎵**: 5 segundos para identificar la canción
- **Discovery Roulette 🎰**: Swipe para descubrir música nueva

---

## 📁 Estructura del Proyecto

```
sonet/
├── app/                    Expo Router screens
│   ├── (auth)/            login, register, onboarding
│   └── (tabs)/            feed, discover, date, map, profile
├── components/
│   ├── dashboard/         MusicDashboard (charts)
│   ├── rating/            RatingCard, FeedRatingCard, RateModal
│   ├── soundmatch/        SoundMatchCard (Tinder-style)
│   ├── recommendations/   SongOfTheDay
│   └── games/             VersusGame, GuessSongGame, DiscoveryRoulette
├── lib/
│   ├── ai/               tasteVector.ts, matchEngine.ts, recommendations.ts
│   ├── supabase.ts
│   ├── spotify.ts
│   ├── ticketmaster.ts
│   ├── youtube.ts
│   └── musicDB.ts        Unified search API
├── stores/               Zustand: auth, music, social, ai, recommendations
├── backend/              Python FastAPI ML service
│   ├── main.py           FastAPI + APScheduler cron
│   ├── music_dna.py      256-dim feature vector
│   ├── svm_model.py      RBF SVC compatibility model
│   ├── recommendations.py Hybrid SOTD engine
│   └── catalog_sync.py   Spotify/Ticketmaster/YouTube sync
└── supabase/
    ├── schema.sql         Main schema
    └── schema_v2.sql      AI + Dating tables
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
