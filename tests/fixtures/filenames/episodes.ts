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
  { input: '124(episode).mkv', episode: 124 },
  { input: 'Show - 12 END.mkv', episode: 12 },

  // Not episodes
  { input: '[Group] Show - NCOP1 [BD 1080p].mkv', episode: null },
  { input: 'Movie Special.mkv', episode: null },
  { input: '1917.mkv', episode: null }
]

/**
 * File names the parser gets WRONG today. `episode` and `title` hold the CORRECT
 * expected values. Each case runs with `it.fails`, so CI stays green while the bug exists
 * and goes red when it is fixed. Move a fixed case into `episodeCases` (roadmap Phase 1.7).
 */
export interface EpisodeBug extends EpisodeCase {
  /** What is wrong today. */
  bug: string
}

export const episodeKnownBugs: EpisodeBug[] = [
  {
    input: '[Group] Show - 05v2 [1080p].mkv',
    episode: 5,
    bug: 'version suffix "v2" makes the number undetectable (returns null)'
  },
  {
    input: 'Mob Psycho 100 - 03.mkv',
    episode: 3,
    bug: 'a number in the show title is read as the episode (returns 100)'
  },
  {
    input: 'Show 2 - 04.mkv',
    episode: 4,
    bug: 'a sequel number in the title is read as the episode (returns 2)'
  },
  {
    input: '86 - Eighty Six - 05.mkv',
    episode: 5,
    bug: 'a leading number in the title is read as the episode (returns 86)'
  },
  {
    input: '[Group] Show - OVA 2.mkv',
    episode: null,
    bug: 'OVAs and specials are treated as regular episodes (returns 2)'
  },
  {
    input: 'Show.S01E05.1080p.WEB-DL.x265.mkv',
    episode: 5,
    title: 'Episode 5',
    bug: 'leftover release tags end up in the title ("Episode 5 — WEB-DL")'
  },
  {
    input: '124(episode).mkv',
    episode: 124,
    title: 'Episode 124',
    bug: 'the "(episode)" suffix ends up in the title'
  }
]
