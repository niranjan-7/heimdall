export interface MovieCase {
  input: string
  cleanTitle: string
  year: number | null
  partNumber: number | null
}

/** File names the parser handles correctly today. These are regression tests. */
export const movieCases: MovieCase[] = [
  // Scene / remux releases
  {
    input: 'Oppenheimer.2023.IMAX.2160p.UHD.BluRay.Remux.HDR.x265.mkv',
    cleanTitle: 'Oppenheimer',
    year: 2023,
    partNumber: null
  },
  {
    input: 'Avatar.The.Way.of.Water.2022.1080p.WEB-DL.DDP5.1.x264.mkv',
    cleanTitle: 'Avatar The Way of Water',
    year: 2022,
    partNumber: null
  },
  {
    input: 'The.Lord.of.the.Rings.The.Fellowship.of.the.Ring.2001.EXTENDED.1080p.mkv',
    cleanTitle: 'The Lord of the Rings The Fellowship of the Ring',
    year: 2001,
    partNumber: null
  },
  { input: 'Joker.2019.mkv', cleanTitle: 'Joker', year: 2019, partNumber: null },
  { input: 'Her.2013.720p.mkv', cleanTitle: 'Her', year: 2013, partNumber: null },
  {
    input: 'Dune.Part.Two.2024.2160p.mkv',
    cleanTitle: 'Dune Part Two',
    year: 2024,
    partNumber: null
  },

  // Human-written names
  {
    input: 'The Matrix (1999) [1080p].mkv',
    cleanTitle: 'The Matrix',
    year: 1999,
    partNumber: null
  },
  {
    input: 'Your Name 2016 1080p BluRay x264.mkv',
    cleanTitle: 'Your Name',
    year: 2016,
    partNumber: null
  },
  { input: 'Se7en 1995.mkv', cleanTitle: 'Se7en', year: 1995, partNumber: null },
  { input: '12 Angry Men (1957).mkv', cleanTitle: '12 Angry Men', year: 1957, partNumber: null },
  { input: 'Spirited Away.mkv', cleanTitle: 'Spirited Away', year: null, partNumber: null },
  {
    input: 'Weird_Underscore_Name_2010_720p.mkv',
    cleanTitle: 'Weird Underscore Name',
    year: 2010,
    partNumber: null
  },

  // Titles that start with a year-like number
  {
    input: '2001 A Space Odyssey (1968).mkv',
    cleanTitle: '2001 A Space Odyssey',
    year: 1968,
    partNumber: null
  },
  {
    input: '2001.A.Space.Odyssey.1968.1080p.mkv',
    cleanTitle: '2001 A Space Odyssey',
    year: 1968,
    partNumber: null
  },

  // Multi-part releases
  { input: 'Movie Name - CD1.avi', cleanTitle: 'Movie Name', year: null, partNumber: 1 },
  { input: 'Movie Name - CD2.avi', cleanTitle: 'Movie Name', year: null, partNumber: 2 },
  { input: 'Tenet (2020) pt2.mkv', cleanTitle: 'Tenet', year: 2020, partNumber: 2 }
]

export interface MovieBug extends MovieCase {
  /** What is wrong today. */
  bug: string
}

/**
 * File names the parser gets WRONG today. The fields hold the CORRECT expected values.
 * Each case runs with `it.fails` (see episodes.ts). Fix them in roadmap Phase 1.7.
 */
export const movieKnownBugs: MovieBug[] = [
  {
    input: 'Blade Runner 2049 (2017) 1080p.mkv',
    cleanTitle: 'Blade Runner 2049',
    year: 2017,
    partNumber: null,
    bug: 'a year-like number in the title is taken as the release year (year 2049)'
  },
  {
    input: 'Blade.Runner.2049.2017.1080p.BluRay.mkv',
    cleanTitle: 'Blade Runner 2049',
    year: 2017,
    partNumber: null,
    bug: 'same as above, dotted form'
  },
  {
    input: 'Movie.Name.2005.Part.1.mkv',
    cleanTitle: 'Movie Name',
    year: 2005,
    partNumber: 1,
    bug: 'dotted "Part.1" is not detected as a part (partNumber null)'
  },
  {
    input: 'Movie.Name.2005.Part.2.mkv',
    cleanTitle: 'Movie Name',
    year: 2005,
    partNumber: 2,
    bug: 'dotted "Part.2" is not detected as a part (partNumber null)'
  },
  {
    input: 'Kill Bill Part 1 (2003).mkv',
    cleanTitle: 'Kill Bill',
    year: 2003,
    partNumber: 1,
    bug: 'text after the part marker is thrown away, so the year is lost (year null)'
  },
  {
    input: 'Avatar.The.Way.of.Water.HDCAM.x264.mkv',
    cleanTitle: 'Avatar The Way of Water',
    year: null,
    partNumber: null,
    bug: 'the HDCAM source tag is left in the title'
  }
]
