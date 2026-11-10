export interface EpisodeCase {
  input: string
  episode: number | null
  /** Expected cleaned title. Omit to assert only the episode number. */
  title?: string
}

/** File names the parser handles correctly today. These are regression tests. */
export const episodeCases: EpisodeCase[] = [
  // Fansub releases
  { input: '[SubsPlease] Frieren - 05 (1080p) [ABCD1234].mkv', episode: 5, title: 'Episode 5' },
  {
    input: '[Erai-raws] Sousou no Frieren - 12 [1080p][Multiple Subtitle].mkv',
    episode: 12,
    title: 'Episode 12'
  },
  { input: '[HorribleSubs] Show - 08 [720p].mkv', episode: 8, title: 'Episode 8' },
  { input: 'Re:Zero - 25 [1080p].mkv', episode: 25, title: 'Episode 25' },
  { input: 'Show - 07 [BD 1080p HEVC 10bit FLAC].mkv', episode: 7, title: 'Episode 7' },

  // SxxEyy style
  { input: 'Show - S02E15 - Some Title.mkv', episode: 15, title: 'Episode 15 — Some Title' },
  { input: 'Show.2023.S01E05.mkv', episode: 5, title: 'Episode 5' },
  { input: 'Attack on Titan S4 - 28.mkv', episode: 28, title: 'Episode 28' },
  // Double episode: the first episode number wins
  { input: 'Show S01E05E06.mkv', episode: 5 },

  // Absolute numbering and bare numbers
  { input: 'One Piece - 1047 (1080p).mkv', episode: 1047, title: 'Episode 1047' },
  { input: 'Fairy Tail 154.mkv', episode: 154, title: 'Episode 154' },
  { input: 'Naruto Shippuden 001 - Homecoming.mkv', episode: 1, title: 'Episode 1 — Homecoming' },
  { input: '150.mkv', episode: 150, title: 'Episode 150' },

  // Years are not episode numbers
  { input: 'Show (2014) - 05.mkv', episode: 5, title: 'Episode 5' },

  // Word prefixes and suffixes
  { input: 'Episode 7 - The Return.mkv', episode: 7, title: 'Episode 7 — The Return' },
  { input: 'epi - 123.mkv', episode: 123, title: 'Episode 123' },
  { input: 'Show - 12 END.mkv', episode: 12 },

  // Previously known bugs (fixed in Phase 1.7)
  { input: '[Group] Show - 05v2 [1080p].mkv', episode: 5, title: 'Episode 5' },
  { input: 'Mob Psycho 100 - 03.mkv', episode: 3, title: 'Episode 3' },
  { input: 'Show 2 - 04.mkv', episode: 4, title: 'Episode 4' },
  { input: '86 - Eighty Six - 05.mkv', episode: 5, title: 'Episode 5' },
  { input: '[Group] Show - OVA 2.mkv', episode: null },
  { input: 'Show.S01E05.1080p.WEB-DL.x265.mkv', episode: 5, title: 'Episode 5' },
  { input: '124(episode).mkv', episode: 124, title: 'Episode 124' },

  // More fansub releases
  {
    input: '[SubsPlease] Jujutsu Kaisen - 47 (1080p) [8E2A1F3C].mkv',
    episode: 47,
    title: 'Episode 47'
  },
  { input: '[Judas] Vinland Saga - S02E10.mkv', episode: 10, title: 'Episode 10' },
  {
    input: '[ASW] Dandadan - 12 [1080p HEVC x265 10Bit][AAC].mkv',
    episode: 12,
    title: 'Episode 12'
  },
  { input: '[EMBER] Chainsaw Man - 01.mkv', episode: 1, title: 'Episode 1' },
  { input: '[Commie] Steins;Gate 0 - 05 [ABCDEF12].mkv', episode: 5, title: 'Episode 5' },
  {
    input: '[Coalgirls]_Toradora!_01_(1920x1080_Blu-Ray_FLAC)_[A1B2C3D4].mkv',
    episode: 1,
    title: 'Episode 1'
  },
  {
    input: '[Kametsu] Gintama - 201v2 (BD 1080p Hi10 FLAC) [12345ABC].mkv',
    episode: 201,
    title: 'Episode 201'
  },
  {
    input: '[DameDesuYo] Mob Psycho 100 III - 06 (1920x1080 10bit AAC) [ABCD1234].mkv',
    episode: 6,
    title: 'Episode 6'
  },
  {
    input: '[Erai-raws] Kaiju No. 8 - 03 [1080p][Multiple Subtitle][ENG].mkv',
    episode: 3,
    title: 'Episode 3'
  },
  {
    input: '[Yameii] Spy x Family - 25 [English Dub] [CR WEB-DL 1080p].mkv',
    episode: 25,
    title: 'Episode 25'
  },
  { input: '[SubsPlease] Dr. Stone - 08 (720p).mkv', episode: 8, title: 'Episode 8' },
  {
    input: '[Group] Re Zero kara Hajimeru Isekai Seikatsu - 37 [1080p].mkv',
    episode: 37,
    title: 'Episode 37'
  },
  { input: '[Group] Bocchi the Rock! - 12 END [1080p].mkv', episode: 12, title: 'Episode 12' },
  { input: '[Group] Show - 10 FINAL.mkv', episode: 10, title: 'Episode 10' },
  { input: '[Group] Show - 07 (Dual Audio).mkv', episode: 7, title: 'Episode 7' },
  { input: '[Group] Show - 003.mkv', episode: 3, title: 'Episode 3' },
  { input: '[Group] Show - 0001.mkv', episode: 1, title: 'Episode 1' },
  { input: '[Group] Show - 00.mkv', episode: 0, title: 'Episode 0' },
  { input: '[Group] Show #05.mkv', episode: 5, title: 'Episode 5' },
  { input: '[Group] Show ~ 05.mkv', episode: 5, title: 'Episode 5' },
  { input: '[Group]_Show_-_05_[720p].mkv', episode: 5, title: 'Episode 5' },
  { input: '[Group].Show.-.05.[720p].mkv', episode: 5, title: 'Episode 5' },

  // Numbers inside show titles
  { input: 'Mob Psycho 100 - 12 - Mob.mkv', episode: 12, title: 'Episode 12 — Mob' },
  { input: 'Steins;Gate 0 - 23.mkv', episode: 23, title: 'Episode 23' },
  { input: 'Kaiju No. 8 - 01.mkv', episode: 1, title: 'Episode 1' },
  { input: 'Code Geass R2 - 25.mkv', episode: 25, title: 'Episode 25' },
  { input: 'Gintama. - 11.mkv', episode: 11, title: 'Episode 11' },
  { input: 'Shingeki no Kyojin Season 3 - 05.mkv', episode: 5, title: 'Episode 5' },
  { input: 'Boku no Hero Academia 2nd Season - 13.mkv', episode: 13, title: 'Episode 13' },
  { input: 'Shingeki no Kyojin The Final Season - 16.mkv', episode: 16, title: 'Episode 16' },
  { input: 'Shingeki no Kyojin The Final Season Part 2 - 05.mkv', episode: 5, title: 'Episode 5' },
  { input: '3-gatsu no Lion - 22.mkv', episode: 22, title: 'Episode 22' },
  { input: 'Show 05 - The 3 Brothers.mkv', episode: 5, title: 'Episode 5 — The 3 Brothers' },
  { input: 'Show - 05 - The 3 Brothers.mkv', episode: 5, title: 'Episode 5 — The 3 Brothers' },

  // Plex / Sonarr / scene names
  {
    input: 'Breaking Bad - S05E14 - Ozymandias.mkv',
    episode: 14,
    title: 'Episode 14 — Ozymandias'
  },
  {
    input: 'Breaking.Bad.S05E14.Ozymandias.1080p.BluRay.x264-GROUP.mkv',
    episode: 14,
    title: 'Episode 14 — Ozymandias'
  },
  { input: 'The.Office.US.S02E01.720p.WEB.h264-GROUP.mkv', episode: 1, title: 'Episode 1' },
  {
    input: 'Severance.S02E03.2160p.ATVP.WEB-DL.DDP5.1.HDR.H.265-GROUP.mkv',
    episode: 3,
    title: 'Episode 3'
  },
  { input: 'Show.S1E5.mkv', episode: 5, title: 'Episode 5' },
  { input: 'Show s03e07.mp4', episode: 7, title: 'Episode 7' },
  { input: 'Show - S01 E09.mkv', episode: 9, title: 'Episode 9' },
  { input: 'Show - 1x05 - Title Here.mkv', episode: 5, title: 'Episode 5 — Title Here' },
  { input: 'Show S01E10v2.mkv', episode: 10, title: 'Episode 10' },
  { input: 'Show.S02E01E02.Pilot.mkv', episode: 1, title: 'Episode 1 — Pilot' },
  { input: 'Show (2019) - S01E03 - Title.mkv', episode: 3, title: 'Episode 3 — Title' },
  { input: 'Show.2019.S01E03.720p.HDTV.x264.mkv', episode: 3, title: 'Episode 3' },
  { input: 'Show S01E05 PROPER 1080p.mkv', episode: 5, title: 'Episode 5' },

  // Word prefixes
  { input: 'Show Episode 12.mkv', episode: 12, title: 'Episode 12' },
  { input: 'Show Ep 3.mkv', episode: 3, title: 'Episode 3' },
  { input: 'Show Ep.04.mkv', episode: 4, title: 'Episode 4' },
  { input: 'Show EP05.mkv', episode: 5, title: 'Episode 5' },
  { input: 'Show E06.mkv', episode: 6, title: 'Episode 6' },
  { input: 'Show - Episode 101 - The Title.mkv', episode: 101, title: 'Episode 101 — The Title' },
  { input: 'epi-45.mkv', episode: 45, title: 'Episode 45' },
  { input: '12 episode.mkv', episode: 12, title: 'Episode 12' },
  { input: '33 - ep.mkv', episode: 33, title: 'Episode 33' },

  // Absolute numbering
  { input: 'One Piece 1100.mkv', episode: 1100, title: 'Episode 1100' },
  { input: 'One.Piece.1089.1080p.mkv', episode: 1089, title: 'Episode 1089' },
  { input: 'Detective Conan - 1130 [720p].mkv', episode: 1130, title: 'Episode 1130' },
  { input: 'Naruto_Shippuden_-_456.mp4', episode: 456, title: 'Episode 456' },
  { input: 'Bleach 366 - The Gotei 13.mkv', episode: 366, title: 'Episode 366 — The Gotei 13' },
  { input: '005.mp4', episode: 5, title: 'Episode 5' },
  { input: '12.avi', episode: 12, title: 'Episode 12' },

  // Years and other numbers that are not episodes
  { input: 'Show (2023) - 08 [1080p].mkv', episode: 8, title: 'Episode 8' },
  { input: 'Show 2023 - 08.mkv', episode: 8, title: 'Episode 8' },
  { input: 'Show - 08 (1920x1080 x265).mkv', episode: 8, title: 'Episode 8' },
  { input: 'Show - 09 [5.1 Audio].mkv', episode: 9, title: 'Episode 9' },

  // Not episodes
  { input: '[Group] Show - NCED [1080p].mkv', episode: null },
  { input: '[Group] Show - NCOP 2.mkv', episode: null },
  { input: '[Group] Show - OVA.mkv', episode: null },
  { input: '[Group] Show OAD 3.mkv', episode: null },
  { input: '[Group] Show - SP 1.mkv', episode: null },
  { input: '[Group] Show - Special 2.mkv', episode: null },
  { input: '[Group] Show - Specials.mkv', episode: null },
  { input: '[Group] Show - Recap.mkv', episode: null },
  { input: '[Group] Show - 13.5.mkv', episode: null },
  { input: '[Group] Show - PV 1.mkv', episode: null },
  { input: '[Group] Show - Trailer.mkv', episode: null },
  { input: '[Group] Show - Menu 01.mkv', episode: null },
  { input: 'Show - Creditless Opening.mkv', episode: null },
  { input: 'Show Extras.mkv', episode: null },
  { input: 'Untitled.mkv', episode: null },

  // Not episodes
  { input: '[Group] Show - NCOP1 [BD 1080p].mkv', episode: null },
  { input: 'Movie Special.mkv', episode: null },
  { input: '1917.mkv', episode: null }
]

/**
 * File names the parser gets WRONG today. `episode` and `title` hold the CORRECT
 * expected values. Each case runs with `it.fails`, so CI stays green while the bug exists
 * and goes red when it is fixed. Move a fixed case into `episodeCases`.
 */
export interface EpisodeBug extends EpisodeCase {
  /** What is wrong today. */
  bug: string
}

export const episodeKnownBugs: EpisodeBug[] = []
