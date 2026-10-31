import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  Eye,
  Radio,
  Sparkles,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  Minus,
  Plus,
  Check,
  Zap,
  Film,
  Tv,
  Clock,
  Trash2,
  Archive,
  HardDrive
} from 'lucide-react'

interface MediaItem {
  id: string
  title: string
  subtitle: string
  type: 'series' | 'movie'
  epLabel: string
  watchedLabel: string
  currentTimeSec: number
  totalDurationSec: number
  subDelay: number
  player: 'mpv' | 'vlc'
  badges: string[]
  smartTag?: {
    type: 'filler' | 'archive' | 'anilist' | 'quality'
    text: string
    actionLabel?: string
    doneLabel?: string
  }
}

export const SERIES_ITEMS: MediaItem[] = [
  {
    id: 'frieren',
    title: "Frieren: Beyond Journey's End",
    subtitle: 'Episode 18 — Well-Laid Plans',
    type: 'series',
    epLabel: 'Ep 18',
    watchedLabel: '18 of 28 watched (64%)',
    currentTimeSec: 842, // 14:02
    totalDurationSec: 1440, // 24:00
    subDelay: 0.35,
    player: 'mpv',
    badges: ['Anime4K Active', 'FLAC Audio', 'libass Vector'],
    smartTag: {
      type: 'anilist',
      text: 'AniList: Ep 18 of 28 (64%) • 28 episodes stored locally'
    }
  },
  {
    id: 'onepiece',
    title: 'One Piece',
    subtitle: 'Episode 1089 — Entering a New Chapter! Luffy and Egghead Island',
    type: 'series',
    epLabel: 'Ep 1089',
    watchedLabel: '1089 of 1120 watched (97%)',
    currentTimeSec: 720, // 12:00
    totalDurationSec: 1430, // 23:50
    subDelay: 0.1,
    player: 'mpv',
    badges: ['Anime4K HQ', 'HDR10 10-bit', 'Dual Audio'],
    smartTag: {
      type: 'anilist',
      text: 'AniList Global Journey: Ep 1089 of 1120 • 45 episodes on disk'
    }
  },
  {
    id: 'naruto',
    title: 'Naruto Shippuden',
    subtitle: 'Episode 375 — Kakashi vs. Obito',
    type: 'series',
    epLabel: 'Ep 375',
    watchedLabel: '375 of 500 watched (75%)',
    currentTimeSec: 960, // 16:00
    totalDurationSec: 1410, // 23:30
    subDelay: 0.25,
    player: 'mpv',
    badges: ['Manga Canon', '1-Click Filler Clean', 'Dual Audio FLAC'],
    smartTag: {
      type: 'filler',
      text: '🛑 205 Non-Manga Fillers Detected (~42.8 GB to be freed)',
      actionLabel: '1-Click Clean to Trash',
      doneLabel: '✓ 42.8 GB Reclaimed to Recycle Bin'
    }
  },
  {
    id: 'bleach',
    title: 'Bleach: Thousand-Year Blood War',
    subtitle: 'Episode 26 — BLACK',
    type: 'series',
    epLabel: 'Ep 26',
    watchedLabel: '26 of 26 watched (100%)',
    currentTimeSec: 1440,
    totalDurationSec: 1440,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['100% Canon Arc', 'FLAC 5.1 Surround', 'Auto-Sync 99.8%'],
    smartTag: {
      type: 'filler',
      text: '🛑 166 Legacy Fillers Cleaned • 35.1 GB Reclaimed',
      actionLabel: 'Purge Old Bount Fillers',
      doneLabel: '✓ 35.1 GB Legacy Fillers Cleaned'
    }
  },
  {
    id: 'aot',
    title: 'Attack on Titan (The Final Season)',
    subtitle: 'Episode 28 — The Dawn of Humanity',
    type: 'series',
    epLabel: 'Ep 28',
    watchedLabel: '87 of 89 watched (98%)',
    currentTimeSec: 1260,
    totalDurationSec: 1450,
    subDelay: -0.05,
    player: 'mpv',
    badges: ['Dolby Atmos', 'Zero Watch History Loss', 'MAPPA Cut'],
    smartTag: {
      type: 'archive',
      text: '📦 87 Watched Episodes Archived • 52.4 GB Freed (History 100% Retained)'
    }
  },
  {
    id: 'codegeass',
    title: 'Code Geass: Lelouch of the Rebellion',
    subtitle: 'R2 Episode 25 — Re;',
    type: 'series',
    epLabel: 'R2 Ep 25',
    watchedLabel: '50 of 50 watched (100%)',
    currentTimeSec: 1440,
    totalDurationSec: 1440,
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Masterpiece', 'Zero Seek Bleed', 'VLC HTTP API'],
    smartTag: {
      type: 'archive',
      text: '📦 50 Episodes Watched • 100% Checkmarks & Timestamps Preserved'
    }
  },
  {
    id: 'sololeveling',
    title: 'Solo Leveling',
    subtitle: 'Episode 12 — Arise',
    type: 'series',
    epLabel: 'Ep 12',
    watchedLabel: '12 of 12 watched (100%)',
    currentTimeSec: 1380,
    totalDurationSec: 1380,
    subDelay: 0.05,
    player: 'mpv',
    badges: ['Completed', 'AniList 1-Click Sync', 'Discord Active'],
    smartTag: {
      type: 'anilist',
      text: 'AniList: Completed Season 1 (12/12) • Scrobble Synced'
    }
  },
  {
    id: 'jjk',
    title: 'Jujutsu Kaisen Season 2',
    subtitle: 'Episode 20 — Right and Wrong, Part 3',
    type: 'series',
    epLabel: 'S2 Ep 20',
    watchedLabel: '20 of 23 watched (87%)',
    currentTimeSec: 1180,
    totalDurationSec: 1430,
    subDelay: -0.1,
    player: 'mpv',
    badges: ['Shibuya Incident', 'DTS-HD MA 5.1', 'Anime4K Active'],
    smartTag: {
      type: 'quality',
      text: '4K Anime4K AI Upscaling Active (1080p source ➔ 3840x2160)'
    }
  },
  {
    id: 'demonslayer',
    title: 'Demon Slayer: Hashira Training Arc',
    subtitle: 'Episode 8 — The Hashira Unite',
    type: 'series',
    epLabel: 'Ep 8',
    watchedLabel: '8 of 8 watched (100%)',
    currentTimeSec: 2460,
    totalDurationSec: 2460,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['UFOTABLE 4K Remux', 'Anime4K Ultra', 'FLAC Audio'],
    smartTag: {
      type: 'archive',
      text: '📦 Season 4 Archived • 18.2 GB Freed to Recycle Bin'
    }
  },
  {
    id: 'vinlandsaga',
    title: 'Vinland Saga Season 2',
    subtitle: 'Episode 24 — Home',
    type: 'series',
    epLabel: 'S2 Ep 24',
    watchedLabel: '24 of 24 watched (100%)',
    currentTimeSec: 1540,
    totalDurationSec: 1540,
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Farmland Arc', '100% Manga Canon', 'Speech Auto-Sync'],
    smartTag: {
      type: 'anilist',
      text: 'AniList: Completed 24/24 • Auto-Updated Status'
    }
  },
  {
    id: 'dungeon',
    title: 'Dungeon Meshi',
    subtitle: 'Episode 24 — Dumplings & Roasted Basilisk',
    type: 'series',
    epLabel: 'Ep 24',
    watchedLabel: '24 of 24 watched (100%)',
    currentTimeSec: 1560,
    totalDurationSec: 1560,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Completed', 'Title Normalized', '0ms Push IPC'],
    smartTag: {
      type: 'archive',
      text: '📦 All 24 Episodes Watched • Stored in Local Archive Grid'
    }
  },
  {
    id: 'oshinoko',
    title: 'Oshi no Ko Season 2',
    subtitle: 'Episode 11 — The Stage Play Climax',
    type: 'series',
    epLabel: 'Ep 11',
    watchedLabel: '11 of 13 watched (85%)',
    currentTimeSec: 1140,
    totalDurationSec: 1420,
    subDelay: -0.15,
    player: 'mpv',
    badges: ['Batch Select Active', 'Auto-Sync 99.8%', 'Zero Seek Bleed'],
    smartTag: {
      type: 'quality',
      text: 'Vocal Frequency FFT Speech Auto-Sync: -0.15s offset active'
    }
  },
  {
    id: 'steinsgate',
    title: 'Steins;Gate',
    subtitle: 'Episode 22 — Being Melodramatic',
    type: 'series',
    epLabel: 'Ep 22',
    watchedLabel: '22 of 24 watched (92%)',
    currentTimeSec: 1350,
    totalDurationSec: 1450,
    subDelay: 0.05,
    player: 'vlc',
    badges: ['SciADV Canon', 'FLAC 2.0', 'VLC HTTP Interface'],
    smartTag: {
      type: 'anilist',
      text: 'AniList: Ep 22 of 24 (92%) • Local Watch History Synced'
    }
  },
  {
    id: 'deathnote',
    title: 'Death Note',
    subtitle: 'Episode 37 — New World',
    type: 'series',
    epLabel: 'Ep 37',
    watchedLabel: '37 of 37 watched (100%)',
    currentTimeSec: 1380,
    totalDurationSec: 1380,
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Classic REMUX', '100% Archived Watched', 'Zero History Loss'],
    smartTag: {
      type: 'archive',
      text: '📦 37 Watched Episodes Archived • 24.6 GB Freed (100% History Kept)'
    }
  }
]

export const MOVIE_ITEMS: MediaItem[] = [
  {
    id: 'oppenheimer',
    title: 'Oppenheimer (2023)',
    subtitle: 'Christopher Nolan • 2160p UHD IMAX Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:08:14 of 03:00:20 (71%)',
    currentTimeSec: 7694,
    totalDurationSec: 10820,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['IMAX 70mm Aspect', 'DTS-HD MA 5.1', 'HDR10'],
    smartTag: {
      type: 'quality',
      text: '72.4 GB 4K REMUX • High Bitrate Peak 128 Mbps • Hardware Acceleration'
    }
  },
  {
    id: 'dune2',
    title: 'Dune: Part Two (2024)',
    subtitle: 'Denis Villeneuve • Remux 4K Dolby Vision',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '01:14:32 of 02:46:15 (45%)',
    currentTimeSec: 4472,
    totalDurationSec: 9975,
    subDelay: 0.2,
    player: 'mpv',
    badges: ['Dolby Atmos', 'CD1/CD2 Merged', 'OpenSubtitles 64KB'],
    smartTag: {
      type: 'quality',
      text: 'Multi-Part CD1/CD2 Auto-Merged into Seamless Single Movie Entry'
    }
  },
  {
    id: 'interstellar',
    title: 'Interstellar (2014)',
    subtitle: 'Christopher Nolan • 1080p IMAX Edition',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '02:49:03 of 02:49:03 (100%)',
    currentTimeSec: 10143,
    totalDurationSec: 10143,
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Universal Codec', 'HTTP Status API', 'Completed'],
    smartTag: {
      type: 'archive',
      text: '📦 Watched File Archived • 18.5 GB Freed to Trash'
    }
  },
  {
    id: 'spiritedaway',
    title: 'Spirited Away (2001)',
    subtitle: 'Studio Ghibli • 1080p Remastered Studio Cut',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '01:52:10 of 02:05:00 (90%)',
    currentTimeSec: 6730,
    totalDurationSec: 7500,
    subDelay: -0.1,
    player: 'mpv',
    badges: ['Anime4K High', 'FLAC 2.0', 'Auto-Completed 90%'],
    smartTag: {
      type: 'quality',
      text: 'Anime4K Upscale: 1080p Studio Ghibli Film rendered in 4K HQ'
    }
  },
  {
    id: 'yourname',
    title: 'Your Name (Kimi no Na wa)',
    subtitle: 'Makoto Shinkai • 4K UHD Remux HDR',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '01:46:35 of 01:46:35 (100%)',
    currentTimeSec: 6395,
    totalDurationSec: 6395,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Dolby Atmos', 'Completed', 'Anime4K Active'],
    smartTag: {
      type: 'archive',
      text: '📦 100% Watched • Archived to preserve SSD space'
    }
  },
  {
    id: 'princessmononoke',
    title: 'Princess Mononoke (1997)',
    subtitle: 'Hayao Miyazaki • 1080p BD Remux FLAC',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '02:13:40 of 02:13:40 (100%)',
    currentTimeSec: 8020,
    totalDurationSec: 8020,
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Studio Ghibli', 'DTS-HD MA', 'Archived'],
    smartTag: {
      type: 'archive',
      text: '📦 Full Movie Watched • History Preserved'
    }
  },
  {
    id: 'akira',
    title: 'Akira (1988)',
    subtitle: 'Katsuhiro Otomo • 4K HDR 192kHz Hypersonic Audio',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '00:45:12 of 02:04:30 (36%)',
    currentTimeSec: 2712,
    totalDurationSec: 7470,
    subDelay: 0.15,
    player: 'mpv',
    badges: ['192kHz 24-bit', 'HDR10', 'Anime4K Restore'],
    smartTag: {
      type: 'quality',
      text: 'Audiophile Hypersonic Sound Track 192kHz/24-bit Pass-Through'
    }
  },
  {
    id: 'thedarkknight',
    title: 'The Dark Knight (2008)',
    subtitle: 'Christopher Nolan • 4K UHD IMAX Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:32:15 of 02:32:15 (100%)',
    currentTimeSec: 9135,
    totalDurationSec: 9135,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['IMAX Aspect Ratio', 'TrueHD Atmos', 'Completed'],
    smartTag: {
      type: 'archive',
      text: '📦 64.2 GB Remux Archived • History Retained'
    }
  },
  {
    id: 'spiderverse',
    title: 'Spider-Man: Across the Spider-Verse',
    subtitle: 'Sony Pictures • 4K UHD Atmos 10-bit',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '01:20:45 of 02:20:00 (58%)',
    currentTimeSec: 4845,
    totalDurationSec: 8400,
    subDelay: -0.05,
    player: 'mpv',
    badges: ['Dolby Vision', 'Atmos TrueHD', '0ms Latency'],
    smartTag: {
      type: 'quality',
      text: 'Hardware Decoding Active • 0 dropped frames'
    }
  },
  {
    id: 'bladerunner2049',
    title: 'Blade Runner 2049 (2017)',
    subtitle: 'Denis Villeneuve • 2160p UHD HDR10+ Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:43:20 of 02:43:20 (100%)',
    currentTimeSec: 9800,
    totalDurationSec: 9800,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['HDR10+', 'Dolby Atmos', 'Archived'],
    smartTag: {
      type: 'archive',
      text: '📦 58.9 GB Freed to Recycle Bin • History Safe'
    }
  },
  {
    id: 'suzume',
    title: 'Suzume (2022)',
    subtitle: 'Makoto Shinkai • CoMix Wave 4K Dolby Atmos',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:02:10 of 02:02:10 (100%)',
    currentTimeSec: 7330,
    totalDurationSec: 7330,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Anime4K HQ', 'Dolby Atmos', 'Completed'],
    smartTag: {
      type: 'archive',
      text: '📦 Movie Watched • Local SQLite Cache Updated'
    }
  },
  {
    id: 'asilentvoice',
    title: 'A Silent Voice (Koe no Katachi)',
    subtitle: 'Kyoto Animation • 1080p Blu-ray FLAC',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '02:10:00 of 02:10:00 (100%)',
    currentTimeSec: 7800,
    totalDurationSec: 7800,
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Kyoto Animation', 'FLAC Audio', 'VLC HTTP'],
    smartTag: {
      type: 'archive',
      text: '📦 Archived Watched Film • 14.8 GB Saved'
    }
  },
  {
    id: 'mugentrain',
    title: 'Demon Slayer: Mugen Train (Movie)',
    subtitle: 'UFOTABLE • 4K UHD Remux Dolby Vision',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '01:57:00 of 01:57:00 (100%)',
    currentTimeSec: 7020,
    totalDurationSec: 7020,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['UFOTABLE', 'Anime4K Ultra', 'Completed'],
    smartTag: {
      type: 'archive',
      text: '📦 100% Watched • AniList Sync Verified'
    }
  },
  {
    id: 'jjk0',
    title: 'Jujutsu Kaisen 0 (Movie)',
    subtitle: 'MAPPA • 1080p Blu-ray Remux FLAC 5.1',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '01:45:00 of 01:45:00 (100%)',
    currentTimeSec: 6300,
    totalDurationSec: 6300,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['MAPPA', 'FLAC 5.1', 'Prequel Canon'],
    smartTag: {
      type: 'archive',
      text: '📦 Watched • Prequel Story Completed'
    }
  },
  {
    id: 'evangelion',
    title: 'Evangelion: 3.0+1.0 Thrice Upon a Time',
    subtitle: 'Hideaki Anno • 4K UHD Blu-ray Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:35:00 of 02:35:00 (100%)',
    currentTimeSec: 9300,
    totalDurationSec: 9300,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Studio Khara', 'DTS-HD MA', 'Final Cut'],
    smartTag: {
      type: 'archive',
      text: '📦 Final Evangelion Movie Watched'
    }
  },
  {
    id: 'weathering',
    title: 'Weathering with You (2019)',
    subtitle: 'Makoto Shinkai • 4K UHD Remux HDR10',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '01:52:00 of 01:52:00 (100%)',
    currentTimeSec: 6720,
    totalDurationSec: 6720,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['HDR10', 'Anime4K', 'Completed'],
    smartTag: {
      type: 'archive',
      text: '📦 Archived Watched Film'
    }
  },
  {
    id: 'howlsmovingcastle',
    title: "Howl's Moving Castle (2004)",
    subtitle: 'Hayao Miyazaki • 1080p Studio Ghibli BD',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '01:59:00 of 01:59:00 (100%)',
    currentTimeSec: 7140,
    totalDurationSec: 7140,
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Studio Ghibli', 'DTS-HD 5.1', 'Archived'],
    smartTag: {
      type: 'archive',
      text: '📦 Watched & Archived'
    }
  },
  {
    id: 'perfectblue',
    title: 'Perfect Blue (1997)',
    subtitle: 'Satoshi Kon • 1080p Remastered Studio Cut',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '01:21:00 of 01:21:00 (100%)',
    currentTimeSec: 4860,
    totalDurationSec: 4860,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Psychological Thriller', 'LPCM 2.0', 'Anime4K'],
    smartTag: {
      type: 'quality',
      text: 'Restored Cult Classic • Zero Subtitle Desync'
    }
  },
  {
    id: 'boyheron',
    title: 'The Boy and the Heron (2023)',
    subtitle: 'Hayao Miyazaki • 4K UHD HDR Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '01:05:20 of 02:04:00 (53%)',
    currentTimeSec: 3920,
    totalDurationSec: 7440,
    subDelay: 0.1,
    player: 'mpv',
    badges: ['Oscar Winner', 'Dolby Atmos', 'Speech Auto-Sync'],
    smartTag: {
      type: 'quality',
      text: 'Audio Speech Auto-Sync active on dialogue frequencies'
    }
  },
  {
    id: 'inception',
    title: 'Inception (2010)',
    subtitle: 'Christopher Nolan • 4K UHD HDR Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:28:00 of 02:28:00 (100%)',
    currentTimeSec: 8880,
    totalDurationSec: 8880,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['DTS-HD MA 5.1', 'HDR10', 'Archived'],
    smartTag: {
      type: 'archive',
      text: '📦 54.2 GB Remux Archived • Watch Data Kept'
    }
  },
  {
    id: 'matrix',
    title: 'The Matrix (1999)',
    subtitle: 'Lana & Lilly Wachowski • 4K UHD Dolby Vision',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:16:00 of 02:16:00 (100%)',
    currentTimeSec: 8160,
    totalDurationSec: 8160,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Dolby Atmos', 'HDR10', 'Classic'],
    smartTag: {
      type: 'archive',
      text: '📦 Archived Watched Film'
    }
  },
  {
    id: 'madmax',
    title: 'Mad Max: Fury Road (2015)',
    subtitle: 'George Miller • 4K UHD HDR Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:00:00 of 02:00:00 (100%)',
    currentTimeSec: 7200,
    totalDurationSec: 7200,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Dolby Atmos 7.1', 'High Bitrate', 'Archived'],
    smartTag: {
      type: 'archive',
      text: '📦 High Bitrate Remux Archived to Save Disk'
    }
  },
  {
    id: 'parasite',
    title: 'Parasite (2019)',
    subtitle: 'Bong Joon-ho • 4K UHD Criterion Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:12:00 of 02:12:00 (100%)',
    currentTimeSec: 7920,
    totalDurationSec: 7920,
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Criterion Remux', 'DTS-HD MA', 'Archived'],
    smartTag: {
      type: 'archive',
      text: '📦 Watched • Full History Retained'
    }
  },
  {
    id: 'ghibli_totoro',
    title: 'My Neighbor Totoro (1988)',
    subtitle: 'Studio Ghibli • 1080p Studio Cut Remaster',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '01:26:00 of 01:26:00 (100%)',
    currentTimeSec: 5160,
    totalDurationSec: 5160,
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Studio Ghibli', 'LPCM 2.0', 'Completed'],
    smartTag: {
      type: 'archive',
      text: '📦 Ghibli Classic Watched'
    }
  },
  {
    id: 'pulpfiction',
    title: 'Pulp Fiction (1994)',
    subtitle: 'Quentin Tarantino • 4K UHD HDR Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:34:00 of 02:34:00 (100%)',
    currentTimeSec: 9240,
    totalDurationSec: 9240,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['DTS-HD MA', 'HDR10', 'Archived'],
    smartTag: {
      type: 'archive',
      text: '📦 48.1 GB Archived'
    }
  },
  {
    id: 'whiplash',
    title: 'Whiplash (2014)',
    subtitle: 'Damien Chazelle • 4K UHD Atmos Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '01:46:00 of 01:46:00 (100%)',
    currentTimeSec: 6360,
    totalDurationSec: 6360,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Dolby Atmos', '24-bit Audio', 'Archived'],
    smartTag: {
      type: 'archive',
      text: '📦 Watched & Archived'
    }
  },
  {
    id: 'endofeva',
    title: 'The End of Evangelion (1997)',
    subtitle: 'Hideaki Anno • 1080p BD Remux FLAC 5.1',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '01:27:00 of 01:27:00 (100%)',
    currentTimeSec: 5220,
    totalDurationSec: 5220,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Cult Classic', 'FLAC 5.1', 'Anime4K Active'],
    smartTag: {
      type: 'quality',
      text: 'Anime4K Upscale: Rendered in 4K resolution'
    }
  },
  {
    id: 'lordofrings',
    title: 'The Lord of the Rings: Return of the King',
    subtitle: 'Peter Jackson • 4K UHD Extended Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '04:12:00 of 04:23:00 (96%)',
    currentTimeSec: 15120,
    totalDurationSec: 15780,
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Extended Edition', 'Dolby Atmos', '120GB Remux'],
    smartTag: {
      type: 'quality',
      text: '120 GB 4K Extended Cut • Parts Auto-Chained'
    }
  }
]

export const InteractiveAppMockup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'series' | 'movies'>('series')
  const [selectedId, setSelectedId] = useState<string>('frieren')
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [cleanedTags, setCleanedTags] = useState<Record<string, boolean>>({})

  // Initialize playback progress and subtitle delay state
  const [mediaStates, setMediaStates] = useState<Record<string, { progressSec: number; subDelay: number }>>(() => {
    const states: Record<string, { progressSec: number; subDelay: number }> = {}
    for (const item of [...SERIES_ITEMS, ...MOVIE_ITEMS]) {
      states[item.id] = { progressSec: item.currentTimeSec, subDelay: item.subDelay }
    }
    return states
  })

  const currentList = activeTab === 'series' ? SERIES_ITEMS : MOVIE_ITEMS
  const activeItem = currentList.find((i) => i.id === selectedId) || currentList[0]
  const currentProgress = mediaStates[activeItem.id]?.progressSec ?? activeItem.currentTimeSec
  const currentSubDelay = mediaStates[activeItem.id]?.subDelay ?? activeItem.subDelay

  // Playback timer tick
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setMediaStates((prev) => {
        const itemState = prev[activeItem.id] || { progressSec: activeItem.currentTimeSec, subDelay: activeItem.subDelay }
        const nextSec = itemState.progressSec >= activeItem.totalDurationSec ? 0 : itemState.progressSec + 1
        return {
          ...prev,
          [activeItem.id]: {
            ...itemState,
            progressSec: nextSec
          }
        }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, activeItem.id, activeItem.totalDurationSec, activeItem.currentTimeSec, activeItem.subDelay])

  // Handle Tab Switch
  const handleTabSwitch = (tab: 'series' | 'movies') => {
    setActiveTab(tab)
    setIsPlaying(false)
    if (tab === 'series') {
      setSelectedId('frieren')
    } else {
      setSelectedId('oppenheimer')
    }
  }

  // Handle Item Select
  const handleItemSelect = (item: MediaItem) => {
    setSelectedId(item.id)
    setIsPlaying(false)
  }

  // Handle Smart Tag 1-Click Action (e.g. Clean Fillers)
  const handleCleanAction = (itemId: string) => {
    setCleanedTags((prev) => ({
      ...prev,
      [itemId]: true
    }))
  }

  // Adjust Subtitle Delay
  const adjustSubDelay = (delta: number) => {
    setMediaStates((prev) => {
      const current = prev[activeItem.id] || { progressSec: activeItem.currentTimeSec, subDelay: activeItem.subDelay }
      return {
        ...prev,
        [activeItem.id]: {
          ...current,
          subDelay: Number((current.subDelay + delta).toFixed(2))
        }
      }
    })
  }

  const resetSubDelay = () => {
    setMediaStates((prev) => {
      const current = prev[activeItem.id] || { progressSec: activeItem.currentTimeSec, subDelay: activeItem.subDelay }
      return {
        ...prev,
        [activeItem.id]: {
          ...current,
          subDelay: 0.0
        }
      }
    })
  }

  // Format seconds to hh:mm:ss or mm:ss
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 3D Tilt spring animation
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const mouseX = useSpring(x, { stiffness: 150, damping: 20 })
  const mouseY = useSpring(y, { stiffness: 150, damping: 20 })

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [6, -6])
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseXPos = e.clientX - rect.left
    const mouseYPos = e.clientY - rect.top
    const xPct = mouseXPos / width - 0.5
    const yPct = mouseYPos / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const progressPercentage = Math.min(100, Math.max(0, (currentProgress / activeItem.totalDurationSec) * 100))

  return (
    <div
      style={{ perspective: 1200 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full flex justify-center py-6"
    >
      <motion.div
        style={{ rotateX, rotateY }}
        transition={{ ease: 'easeOut', duration: 0.2 }}
        className="w-full max-w-5xl rounded-3xl bg-zinc-950/90 border border-white/10 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col backdrop-blur-2xl text-left select-none relative group"
      >
        {/* Glow halo behind mockup */}
        <div className="absolute inset-0 bg-gradient-to-tr from-bifrost-amber/10 via-transparent to-cyan-500/10 pointer-events-none" />

        {/* Mockup Titlebar */}
        <div className="h-10 px-4 bg-zinc-900/80 border-b border-white/5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            <Eye className="w-3.5 h-3.5 text-bifrost-amber" />
            <span>Heimdall — Smart Local Media Companion</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              ● Storage Guard Active
            </span>
            <div className="text-[10px] text-zinc-500 font-mono">1360 × 900</div>
          </div>
        </div>

        {/* Mockup App Interface */}
        <div className="flex flex-col md:flex-row min-h-[540px] overflow-hidden z-10">
          {/* Mockup Sidebar */}
          <div className="w-full md:w-68 bg-zinc-950/90 border-r border-white/5 p-4 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Category Tab Switcher with Dynamic Counts */}
              <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('series')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'series'
                      ? 'bg-bifrost-amber text-zinc-950 shadow-md scale-[1.02]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Tv className="w-3 h-3" />
                  <span>Series ({SERIES_ITEMS.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch('movies')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'movies'
                      ? 'bg-bifrost-amber text-zinc-950 shadow-md scale-[1.02]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Film className="w-3 h-3" />
                  <span>Movies ({MOVIE_ITEMS.length})</span>
                </button>
              </div>

              {/* Local Media Collection Header */}
              <div className="flex items-center justify-between px-1 text-[11px] font-mono text-zinc-400">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  {activeTab === 'series' ? 'Local Series & Anime' : 'Local 4K & Cinema'}
                </span>
                <span className="text-[10px] text-amber-400/90 font-medium">Scroll to browse</span>
              </div>

              {/* Interactive Scrollable Sidebar Item List */}
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                {currentList.map((item) => {
                  const isSelected = item.id === activeItem.id
                  const itemProgress = mediaStates[item.id]?.progressSec ?? item.currentTimeSec
                  const pct = Math.min(100, (itemProgress / item.totalDurationSec) * 100)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemSelect(item)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer block ${
                        isSelected
                          ? 'bg-zinc-900/95 border-bifrost-amber/50 text-white shadow-md shadow-bifrost-amber/10 ring-1 ring-bifrost-amber/20'
                          : 'bg-zinc-900/40 border-white/[0.04] text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex justify-between items-center font-semibold gap-1">
                        <span className="truncate max-w-[150px]">{item.title}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                            isSelected
                              ? 'bg-bifrost-amber/20 text-bifrost-amber font-bold'
                              : 'text-zinc-500 bg-zinc-800/60'
                          }`}
                        >
                          {item.epLabel}
                        </span>
                      </div>
                      <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected ? 'bg-bifrost-amber' : pct === 100 ? 'bg-emerald-500/70' : 'bg-zinc-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mockup Active Live Integration Pills */}
            <div className="space-y-2 pt-3 border-t border-zinc-900 mt-2">
              <div className="flex items-center justify-between text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-900/50 p-2 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Discord RPC 2.0</span>
                </div>
                <span className="font-bold text-[10px] text-indigo-400 font-mono">Active</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-sky-300 bg-sky-950/40 border border-sky-900/50 p-2 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>AniList Scrobbler</span>
                </div>
                <span className="font-bold text-[10px] text-sky-400 font-mono">Linked</span>
              </div>
            </div>
          </div>

          {/* Mockup Main View with Animated Transition */}
          <div className="flex-1 p-6 flex flex-col justify-between bg-gradient-to-br from-zinc-900/90 to-zinc-950">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Header Status & Player Badges */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bifrost-amber/15 text-bifrost-amber border border-bifrost-amber/30">
                      Watching Now
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                        activeItem.player === 'mpv'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      <Radio className="w-3 h-3 animate-pulse" />
                      {activeItem.player === 'mpv' ? 'mpv Player Active' : 'VLC Player Active'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {activeItem.watchedLabel}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {activeItem.title}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    {activeItem.subtitle}
                  </p>
                </div>

                {/* Smart Local Download Tag Banner */}
                {activeItem.smartTag && (
                  <div
                    className={`p-3 rounded-2xl border flex items-center justify-between flex-wrap gap-2 transition-all ${
                      activeItem.smartTag.type === 'filler'
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        : activeItem.smartTag.type === 'archive'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                        : activeItem.smartTag.type === 'anilist'
                        ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {activeItem.smartTag.type === 'filler' ? (
                        <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : activeItem.smartTag.type === 'archive' ? (
                        <Archive className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : activeItem.smartTag.type === 'anilist' ? (
                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                      ) : (
                        <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold">
                        {cleanedTags[activeItem.id] && activeItem.smartTag.doneLabel
                          ? activeItem.smartTag.doneLabel
                          : activeItem.smartTag.text}
                      </span>
                    </div>

                    {activeItem.smartTag.actionLabel && !cleanedTags[activeItem.id] && (
                      <button
                        type="button"
                        onClick={() => handleCleanAction(activeItem.id)}
                        className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-500/40 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        {activeItem.smartTag.actionLabel}
                      </button>
                    )}
                  </div>
                )}

                {/* Tech Spec Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {activeItem.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/5 text-[10px] font-mono text-zinc-300"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Live Playback Bar with Interactive Seek */}
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span className="text-white font-bold">{formatTime(currentProgress)}</span>
                    <span className="text-zinc-500">{formatTime(activeItem.totalDurationSec)} (Total)</span>
                  </div>

                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative cursor-pointer group/bar">
                    <div
                      className="h-full bg-gradient-to-r from-bifrost-amber to-amber-500 rounded-full transition-all duration-300 group-hover/bar:brightness-110"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-4 py-2 rounded-xl bg-bifrost-amber hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-bifrost-amber/20 active:scale-95 cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-zinc-950" />
                          <span>Pause {activeItem.player}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-zinc-950" />
                          <span>Resume in {activeItem.player}</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="text-[11px]">Sub Delay:</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${
                          currentSubDelay === 0
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        }`}
                      >
                        {currentSubDelay >= 0 ? `+${currentSubDelay.toFixed(2)}s` : `${currentSubDelay.toFixed(2)}s`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtitle Sync Widget inside Mockup */}
                <div className="p-3 bg-zinc-950/60 border border-white/5 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-bifrost-amber/15 text-bifrost-amber">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-200">Speech Auto-Sync Engine</span>
                      <span className="text-[10px] text-zinc-500 block">FFmpeg Fourier vocal wave correlation (300Hz–3.4kHz)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustSubDelay(-0.1)}
                      className="p-1 px-2 rounded bg-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px] active:scale-95 cursor-pointer"
                    >
                      <Minus className="w-3 h-3 inline mr-0.5" /> 0.1s
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustSubDelay(0.1)}
                      className="p-1 px-2 rounded bg-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px] active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 inline mr-0.5" /> 0.1s
                    </button>
                    <button
                      type="button"
                      onClick={resetSubDelay}
                      title="Reset Subtitle Delay"
                      className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Footer status in mockup */}
            <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-3 border-t border-zinc-800/40">
              <span className="font-mono truncate">
                {activeItem.player === 'mpv'
                  ? 'Connected via named pipe: \\\\.\\pipe\\heimdall-mpv'
                  : 'Connected via HTTP: http://127.0.0.1:8080'}
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 flex-shrink-0">
                <Check className="w-3 h-3" /> 0ms Push Latency
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
