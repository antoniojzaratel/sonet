# 🎵 Sonet — CLAUDE.md

Contexto completo para cualquier LLM o colaborador que trabaje en este proyecto.

## ¿Qué es Sonet?

Red social de música estilo Beli (app de restaurantes) pero para comunidad musical. Los usuarios califican canciones/álbumes/conciertos del 1.0 al 10.0, ven dashboards de sus hábitos de escucha, hacen match con gente de gusto similar para ir a conciertos, y tienen una feature de dating musical (SoundMatch).

**Due date del MVP:** Sábado (demo con amigos)

---

## Stack Completo

### Frontend (Mobile)
| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Expo | ~51.0.28 | Build tool |
| Expo Router | ~3.5.23 | File-based routing |
| React Native | 0.74.5 | UI framework |
| TypeScript | ^5.3.3 | Tipado |
| Zustand | ^4.5.5 | State management |
| Victory Native | ^36.9.1 | Charts/dashboards |
| React Native Maps | 1.14.0 | Mapa de conciertos |
| Expo Linear Gradient | ~13.0.2 | UI dark neon theme |
| @expo/vector-icons | ^14.0.2 | Iconos (Ionicons) |

### Backend
| Tecnología | Propósito |
|-----------|-----------|
| Supabase | Auth + PostgreSQL + Realtime + Storage |
| FastAPI (Python) | ML API: SVM, DNA vector, recomendaciones |
| scikit-learn | Modelo SVM para taste matching |
| APScheduler | Cron jobs: SOTD diaria, catalog sync |

### APIs Externas
| API | Propósito | Env var |
|-----|-----------|---------|
| Spotify Web API | Canciones, albums, audio features, podcasts | `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` |
| Ticketmaster Discovery | Conciertos en tiempo real (fuente primaria) | `EXPO_PUBLIC_TICKETMASTER_API_KEY` |
| Songkick | Conciertos adicionales, tour tracking | `EXPO_PUBLIC_SONGKICK_API_KEY` |
| Bandsintown | Conciertos adicionales, por artista | `EXPO_PUBLIC_BANDSINTOWN_APP_ID` |
| SeatGeek | Conciertos adicionales, pricing secundario | `EXPO_PUBLIC_SEATGEEK_CLIENT_ID` |
| YouTube Data v3 | Music videos | `EXPO_PUBLIC_YOUTUBE_API_KEY` |
| MusicBrainz | Metadata canónica de artistas/releases (sin key) | — |
| Discogs | Géneros/styles detallados por release | `EXPO_PUBLIC_DISCOGS_TOKEN` |
| Last.fm | Tags, artistas similares, popularidad | `EXPO_PUBLIC_LASTFM_API_KEY` |

Todas las fuentes extra son opcionales: cada cliente (`lib/musicbrainz.ts`, `lib/discogs.ts`, `lib/lastfm.ts`,
`lib/songkick.ts`, `lib/bandsintown.ts`, `lib/seatgeek.ts`) regresa `[]`/`null` si falta su key, así que la app
degrada con gracia a las fuentes que sí estén configuradas. `lib/concerts.ts` (`searchAllConcerts`) mezcla y
deduplica conciertos de las 4 fuentes; `lib/artistMetadata.ts` (`enrichArtist`) mezcla metadata de artista de
MusicBrainz + Discogs + Last.fm. Ambos están integrados en `lib/musicDB.ts`, la interfaz unificada de búsqueda.

---

## Arquitectura del Proyecto

```
sonet/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout + Supabase auth listener
│   ├── index.tsx                 # Redirect: auth? → tabs : login
│   ├── (auth)/
│   │   ├── login.tsx             # Email + Google + Apple + Spotify
│   │   ├── register.tsx          # Crear cuenta → insert users table
│   │   └── onboarding.tsx        # Conectar Spotify + elegir géneros
│   └── (tabs)/
│       ├── _layout.tsx           # Bottom tab bar (5 tabs)
│       ├── index.tsx             # Feed + SongOfTheDay header
│       ├── discover.tsx          # Taste Match por ratings mutuos
│       ├── date.tsx              # SoundMatch (dating musical)
│       ├── map.tsx               # Mapa conciertos + crear eventos
│       ├── profile.tsx           # Dashboard personal + mis ratings
│       └── games.tsx             # Versus, Adivina la Canción, Roulette
│
├── components/
│   ├── dashboard/
│   │   └── MusicDashboard.tsx    # Pie chart géneros + bar chart scores
│   ├── rating/
│   │   ├── RatingCard.tsx        # Card compacta de un rating
│   │   ├── FeedRatingCard.tsx    # Card completa para el feed
│   │   └── RateModal.tsx        # Modal: buscar en Spotify → calificar
│   ├── social/
│   │   └── MatchCard.tsx         # Card de un taste match
│   ├── soundmatch/
│   │   └── SoundMatchCard.tsx    # Swipe card para dating (Tinder-style)
│   ├── dating/
│   │   ├── DateCard.tsx          # Alternativa de swipe card
│   │   └── CompatibilityRadar.tsx # Radar chart de compatibilidad
│   ├── recommendations/
│   │   └── SongOfTheDay.tsx      # Canción del día con AI confidence
│   └── games/
│       ├── VersusGame.tsx        # A vs B musical
│       ├── GuessSongGame.tsx     # Adivina con pista
│       └── DiscoveryRoulette.tsx # Swipe para descubrir música
│
├── lib/
│   ├── supabase.ts               # Supabase client (AsyncStorage persistence)
│   ├── spotify.ts                # Spotify OAuth + API calls
│   ├── ticketmaster.ts           # Ticketmaster Discovery API
│   ├── youtube.ts                # YouTube Data API v3
│   ├── musicDB.ts                # Unified search: Spotify+Ticketmaster+YouTube
│   └── ai/
│       ├── tasteVector.ts        # 22-dim feature vector de gusto musical
│       ├── matchEngine.ts        # Cosine similarity + SVM-inspired scoring
│       └── recommendations.ts   # Spotify Recommendations API + filtrado
│
├── stores/                       # Zustand state stores
│   ├── authStore.ts              # user, session, spotifyToken
│   ├── musicStore.ts             # feed, myRatings
│   ├── socialStore.ts            # matches, events, conversations
│   ├── aiStore.ts                # myVector, dateProfiles, dailyRecs
│   └── recommendationStore.ts   # SoundMatch candidates + matches
│
├── types/index.ts                # Tipos TypeScript centrales
├── constants/colors.ts           # Design system: colores, spacing, radius
├── hooks/useAuth.ts              # useAuth, useProtectedRoute, useSupabaseAuth
│
├── backend/                      # Python FastAPI ML service
│   ├── main.py                   # FastAPI app + APScheduler cron
│   ├── music_dna.py              # 256-dim MusicDNA vector
│   ├── svm_model.py              # RBF SVC para compatibilidad
│   ├── recommendations.py        # Hybrid SOTD (content+collab+novelty)
│   ├── catalog_sync.py           # Sync Spotify/Ticketmaster/YouTube
│   ├── requirements.txt          # Python deps
│   ├── Dockerfile                # Para deploy en Railway/Fly.io
│   └── .env.example             # Vars del backend
│
└── supabase/
    ├── schema.sql                # Schema principal (pgvector, RLS, triggers)
    └── schema_v2.sql             # AI/Dating tables adicionales
```

---

## Database Schema (Supabase)

### Tablas principales
| Tabla | Descripción |
|-------|------------|
| `users` | Perfil + contadores (followers, ratings) |
| `follows` | Relaciones follower/following |
| `ratings` | Calificaciones 1.0-10.0 por contenido |
| `events` | Eventos de la comunidad (listening parties, etc.) |
| `event_attendees` | Asistentes a eventos |
| `conversations` | Chats 1:1 |
| `messages` | Mensajes con metadata (song_share, event_share) |
| `notifications` | Notificaciones push |

### Tablas de catálogo musical
| Tabla | Fuente | Contenido |
|-------|--------|-----------|
| `catalog_tracks` | Spotify | Songs/Singles con ISRC |
| `track_audio_features` | Spotify | BPM, energy, valence, danceability... |
| `catalog_albums` | Spotify | Álbumes completos |
| `catalog_podcasts` | Spotify | Shows |
| `catalog_podcast_episodes` | Spotify | Episodios individuales |
| `catalog_concerts` | Ticketmaster | Conciertos con lat/lng y precios |
| `catalog_music_videos` | YouTube | Videos con view_count |

### Tablas de AI/Dating
| Tabla | Descripción |
|-------|------------|
| `music_profiles` | Feature vector 22-dim por usuario |
| `daily_recommendations` | SOTD con confidence score |
| `date_interactions` | Like/pass/super_like en SoundMatch |
| `date_matches` | Matches mutuos (auto-creado por trigger) |

### RLS: Todas las tablas tienen Row Level Security activado

---

## AI/ML Sistema

### MusicVector (22 dimensiones)
```
[energy, danceability, valence, acousticness, instrumentalness,
 speechiness, tempo_norm, loudness_norm, liveness,
 genre_pop, genre_rock, genre_hip_hop, genre_electronic, genre_latin,
 genre_rnb, genre_jazz, genre_classical, genre_other,
 avg_rating_norm, bpm_preference, vocal_preference, mood_index, diversity]
```

### Match Engine
1. Extraer feature vector de top tracks (Spotify audio features)
2. Aplicar pesos diferenciados por feature (valence=2.0, energy=1.6, genre_latin=1.6)
3. Cosine similarity en vectores ponderados
4. Sigmoid scaling → score 0-100
5. Breakdown: audio_score (40%) + genre_score (35%) + behavior_score (25%)

### SoundMatch Dating
- Trigger SQL auto-crea match cuando dos usuarios se dan like mutuo
- Notificación push se envía a ambos
- Icebreaker automático basado en gustos compartidos

### Song of the Day
- Spotify Recommendations API con target audio features del usuario
- Filtrado: excluye artistas con score < 3, canciones ya calificadas
- Bonus: +15 si el artista está en favorites (score ≥ 8)
- confidence score 0-99

---

## Cómo correr el proyecto

### Frontend (React Native)
```bash
# Instalar dependencias
npm install

# Dev con Expo Go (sin maps)
npx expo start

# iOS con simulador
npx expo run:ios

# Android
npx expo run:android
```

### Backend Python (opcional para demo, el frontend tiene fallback)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Llenar .env con keys
uvicorn main:app --reload --port 8000
```

### Variables de entorno
Copiar `.env.example` a `.env.local`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=tu-client-id
EXPO_PUBLIC_SPOTIFY_REDIRECT_URI=sonet://auth/callback
EXPO_PUBLIC_TICKETMASTER_API_KEY=tu-key
EXPO_PUBLIC_YOUTUBE_API_KEY=tu-key
EXPO_PUBLIC_ML_API_URL=http://localhost:8000
```

### Supabase Setup
1. Crear proyecto en supabase.com
2. SQL Editor → ejecutar `supabase/schema.sql` (proyecto nuevo — todo el schema en un solo archivo)
3. Authentication → Providers → habilitar Google, Apple, Email
4. Copiar URL + Anon Key al `.env.local`

Si el proyecto **ya existía** antes del 2026-09-04, correr también
`supabase/patch_2026-09-04_bugfixes.sql` — son los fixes de RLS/triggers de
esa fecha (ya están integrados en `schema.sql` para proyectos nuevos, este
patch es solo para no tener que recrear la base de datos existente).

### Spotify Developer Setup
1. developer.spotify.com → Create App
2. Redirect URIs: `sonet://auth/callback` + `exp://127.0.0.1:8081/--/auth/callback`
3. Copiar Client ID al `.env.local`

---

## Design System

**Tema:** Dark mode siempre (feel de concierto).

```typescript
Colors.background      = '#0D0D0D'  // Fondo principal
Colors.surface         = '#1A1A1A'  // Cards
Colors.surfaceElevated = '#242424'  // Cards elevadas
Colors.primary         = '#A855F7'  // Morado eléctrico
Colors.secondary       = '#84CC16'  // Verde lima
Colors.accent          = '#F43F5E'  // Rojo acento
Colors.spotify         = '#1DB954'  // Verde Spotify
```

**Gradientes:**
- Primary: `['#A855F7', '#3B82F6']`
- Neon: `['#A855F7', '#84CC16']`
- Dating: `['#1A0A3E', '#0D0D0D']`

---

## Convenciones de Código

- **Componentes:** PascalCase, props tipadas con `interface Props {}`
- **Stores:** `use{Name}Store` via Zustand
- **Rutas:** Expo Router file-based — nada de `react-navigation` directo
- **Imports:** Siempre usar `@/` para paths absolutos (ej: `@/lib/supabase`)
- **Styles:** `StyleSheet.create({})` al final de cada archivo
- **No comentarios** en código obvio — solo cuando el WHY no es claro

---

## Features Pendientes (post-demo)

- [ ] Audio preview de 30s en Adivina la Canción (Spotify SDK)
- [ ] Listening Parties en tiempo real (Supabase Realtime + audio sync)
- [ ] Notificaciones push (Expo Notifications)
- [ ] Integración Songkick/Bandsintown como fuente adicional de conciertos
- [ ] Leaderboard global de juegos
- [ ] Apple Music OAuth
- [ ] Estadísticas de compatibilidad más detalladas (por era, idioma, BPM range)
- [ ] Grupos/foros por artista o género
- [ ] Stories musicales (30s de audio + imagen)
