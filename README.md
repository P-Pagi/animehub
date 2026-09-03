# 🎬 AnimeHub - Anime Streaming Web dengan Data Scraping Realtime

Platform web streaming anime modern yang dibangun menggunakan **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, dan **Cheerio**. 

Aplikasi ini **TIDAK menyimpan database katalog anime permanen**. Semua data anime (daftar, detail, episode, sinopsis, genre, status, studio, rating, poster, embed episode) diambil secara dinamis dari website sumber (`https://animasu.love/`) melalui server backend/API routes dengan arsitektur **Source Adapter Pattern** dan **Multi-level Caching (Redis / In-Memory)**.

---

## 🏗️ Arsitektur Sistem

```text
[ Client / Browser ]
         │
         ▼
[ Next.js Frontend (App Router) ]
         │
         ▼
[ Next.js API Routes / Route Handlers ]
         │
         ▼
[ AnimeService (Cache & Request Deduplication) ]
         │
         ▼
[ SourceAdapter Registry ]
         │
         ▼
[ AnimasuSource (Client + Parser) ]
         │
         ▼
[ Target Source: https://animasu.love/ ]
```

---

## 🚀 Fitur Utama

- **Zero Permanent Catalog DB**: Katalog selalu fresh dan sinkron dengan website sumber secara realtime.
- **Source Adapter Pattern**: Memudahkan penambahan provider anime baru di masa depan tanpa mengubah komponen frontend.
- **Performance & Request Deduplication**: Mencegah cache stampede (jika 100 user membuka halaman yang sama bersamaan, server hanya melakukan 1 HTTP request ke sumber).
- **Multi-Level Caching**: Memanfaatkan Redis jika ketersediaan `REDIS_URL` ada, dengan fallback otomatis ke In-Memory TTL Cache jika Redis tidak aktif.
- **Strict SSRF & Input Protection**: Whitelist domain target (`animasu.love`), sanitasi slug/query dengan Zod, dan validasi URL.
- **Internal API Rate Limiting**: Menjaga server dari abuse eksternal (100 req/min/IP).
- **SEO Ready**: Menggunakan Next.js Metadata API untuk OpenGraph, Twitter Cards, dan title tag dinamis per anime/episode.
- **Modern Streaming UI**: Dark mode aesthetic, poster hover animations, glassmorphism UI, skeleton loader, dan episode filtering.

---

## 🛠️ Instalasi & Persiapan

### Prerequisites
- Node.js v18.x atau v20.x+
- npm / yarn / pnpm

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi konfigurasi pada `.env.local`:
```env
ANIME_SOURCE_URL=https://animasu.love
REQUEST_TIMEOUT=10000

# Cache TTL (detik)
CACHE_TTL_HOMEPAGE=300
CACHE_TTL_SEARCH=120
CACHE_TTL_DETAIL=600
CACHE_TTL_EPISODE=300

# Redis (Opsional: Kosongkan jika ingin menggunakan In-Memory Cache)
REDIS_URL=redis://localhost:6379

LOG_LEVEL=debug
NODE_ENV=development
```

---

## 💻 Menjalankan Mode Development

Jalankan perintah berikut:
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## 🗄️ Menjalankan Redis (Opsional)

Jika ingin menggunakan Redis untuk terdistribusi caching:

### Menggunakan Docker Compose (Direkomendasikan)
```bash
docker-compose up -d redis
```

### Menggunakan Local Redis CLI
Pastikan Redis server berjalan di `localhost:6379`, lalu atur `REDIS_URL=redis://localhost:6379` di `.env.local`.

---

## 🧪 Menjalankan Testing

Unit test menggunakan **Vitest** dan HTML Fixture lokal di `tests/fixtures/` tanpa melakukan request ke website sumber saat test berjalan.

```bash
npm run test
```

---

## 📁 Struktur Folder Project

```text
src/
├── app/
│   ├── layout.tsx              # Root Layout + Metadata SEO Global
│   ├── page.tsx                # Homepage (Latest / Popular Anime Grid)
│   ├── globals.css             # Tailwind CSS & Global Dark Theme
│   ├── anime/
│   │   └── [slug]/
│   │       └── page.tsx        # Detail Anime Hero + Metadata + Episode List
│   ├── watch/
│   │   └── [slug]/
│   │       └── page.tsx        # Player Watch Episode + Navigation + Servers
│   ├── search/
│   │   └── page.tsx            # Halaman Pencarian Anime
│   └── api/
│       └── anime/
│           ├── latest/route.ts   # GET /api/anime/latest
│           ├── popular/route.ts  # GET /api/anime/popular
│           ├── search/route.ts   # GET /api/anime/search?q=
│           ├── [slug]/route.ts   # GET /api/anime/[slug]
│           └── watch/
│               └── [slug]/route.ts # GET /api/anime/watch/[slug]
│
├── lib/
│   ├── cache/
│   │   └── cache.ts            # Redis + In-Memory Fallback + Request Deduplication
│   ├── services/
│   │   └── anime-service.ts    # Cache layer & Business Service
│   ├── utils/
│   │   ├── errors.ts           # Standardized AppError & Response Formatter
│   │   ├── logger.ts           # Formatted Logger ([SCRAPER], [CACHE], [SOURCE])
│   │   ├── rate-limit.ts       # Sliding window IP Rate Limiter
│   │   └── sanitizer.ts        # Zod Validators & SSRF Domain Whitelist
│   └── scraper/
│       ├── types.ts            # AnimeSource Interface definition
│       ├── source-adapter.ts   # Adapter Registry Factory Pattern
│       └── animasu/
│           ├── client.ts       # Axios client with User-Agent & Timeouts
│           ├── parser.ts       # Cheerio HTML parser + CSS Selectors
│           └── adapter.ts      # AnimasuSource implementation
│
├── components/
│   ├── anime-card.tsx          # Card komponen anime poster & badges
│   ├── anime-grid.tsx          # Layout grid responsive
│   ├── search-bar.tsx          # Komponen input pencarian
│   ├── episode-list.tsx        # Grid episode interaktif + search episode
│   ├── hero-banner.tsx         # Spotlight banner anime
│   ├── navbar.tsx              # Navigation bar + Quick search
│   ├── footer.tsx              # Footer aplikasi
│   ├── skeleton.tsx            # Loading skeletons placeholder
│   └── loading.tsx             # Fallback loading component
│
├── types/
│   └── index.ts                # TypeScript Interfaces (Anime, Episode, AnimeDetail)
│
└── tests/
    ├── fixtures/               # HTML fixtures (homepage.html, detail.html, watch.html, search.html)
    ├── parser.test.ts          # Unit tests parser
    └── cache.test.ts           # Unit tests cache & deduplication
```

---

## 🔌 Cara Menambahkan Source Anime Baru

Arsitektur aplikasi menggunakan **Adapter Pattern**. Untuk menambahkan provider anime lain:

1. Buat folder baru di `src/lib/scraper/my-new-source/`.
2. Buat `adapter.ts` yang mengimplementasikan interface `AnimeSource`:
   ```ts
   import { AnimeSource, ScrapeListResult } from '../types';

   export class MyNewSource implements AnimeSource {
     public name = 'MyNewSource';
     public baseUrl = 'https://mynewsource.com';

     async getLatest(page?: number): Promise<ScrapeListResult> { ... }
     async getPopular(page?: number): Promise<ScrapeListResult> { ... }
     async search(query: string, page?: number): Promise<ScrapeListResult> { ... }
     async getDetail(slug: string): Promise<AnimeDetail> { ... }
     async getEpisode(slug: string): Promise<EpisodeDetail> { ... }
   }
   ```
3. Registrasikan adapter di `src/lib/scraper/source-adapter.ts`:
   ```ts
   sourceRegistry.registerSource('mynewsource', new MyNewSource());
   ```

---

## 🎯 Cara Mengubah Selector Scraper

Seluruh CSS Selector Animasu dipusatkan di file `src/lib/scraper/animasu/parser.ts`:

```ts
export const SELECTORS = {
  gridCard: '.bs, .listupd .bs, .serieslist li',
  cardLink: 'a[href]',
  cardTitle: 'a[title], .tt, .entry-title',
  cardImg: 'img[src], img[data-src]',
  cardType: '.typez',
  cardEpx: '.epx',
  detailTitle: '.infox h1, .entry-title',
  detailAltTitle: '.infox .alter, .alter',
  detailPoster: '.thumb img, .poster img',
  detailSynopsis: '.sinopsis, .entry-content, .desc, .sepele',
  detailSpecs: '.spe span, .info-content span',
  episodeItem: '.eplister li, .clist li',
  watchIframe: '#embed_holder iframe, #pembed iframe, .player-embed iframe',
};
```

Jika struktur HTML Animasu berubah, cukup sesuaikan string selector di objek `SELECTORS` tanpa perlu mengubah logic aplikasi lainnya.

---

## 🏗️ Build Production & Deployment

### 1. Standalone Build
```bash
npm run build
npm run start
```

### 2. Docker Deployment
Jalankan seluruh stack (Next.js web + Redis) dengan **Docker Compose**:
```bash
docker-compose up --build -d
```
Aplikasi akan berjalan di `http://localhost:3000`.

---

## 🔒 Kebijakan Keamanan & Etika Access

- **No Bypass**: Aplikasi ini tidak menggunakan captcha solver, Cloudflare bypasser, DRM remover, atau cookie hacking.
- **Rate Limit & Conservative Scrape**: Request ke sumber dilakukan hanya saat ada permintaan user yang belum ada di cache.
- **SSRF Shielding**: Request backend dibatasi strictly pada domain whitelist (`animasu.love`).
