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
  { input: 'Tenet (2020) pt2.mkv', cleanTitle: 'Tenet', year: 2020, partNumber: 2 },

  // Previously known bugs (fixed in Phase 1.7)
  {
    input: 'Blade Runner 2049 (2017) 1080p.mkv',
    cleanTitle: 'Blade Runner 2049',
    year: 2017,
    partNumber: null
  },
  {
    input: 'Blade.Runner.2049.2017.1080p.BluRay.mkv',
    cleanTitle: 'Blade Runner 2049',
    year: 2017,
    partNumber: null
  },
  { input: 'Movie.Name.2005.Part.1.mkv', cleanTitle: 'Movie Name', year: 2005, partNumber: 1 },
  { input: 'Movie.Name.2005.Part.2.mkv', cleanTitle: 'Movie Name', year: 2005, partNumber: 2 },
  { input: 'Kill Bill Part 1 (2003).mkv', cleanTitle: 'Kill Bill', year: 2003, partNumber: 1 },
  {
    input: 'Avatar.The.Way.of.Water.HDCAM.x264.mkv',
    cleanTitle: 'Avatar The Way of Water',
    year: null,
    partNumber: null
  },

  // More scene releases
  {
    input: 'Inception.2010.1080p.BluRay.x264-GROUP.mkv',
    cleanTitle: 'Inception',
    year: 2010,
    partNumber: null
  },
  {
    input: 'Interstellar.2014.2160p.UHD.BluRay.REMUX.HDR.HEVC.Atmos-GROUP.mkv',
    cleanTitle: 'Interstellar',
    year: 2014,
    partNumber: null
  },
  {
    input: 'The.Dark.Knight.2008.IMAX.1080p.WEB-DL.DDP5.1.H.264.mkv',
    cleanTitle: 'The Dark Knight',
    year: 2008,
    partNumber: null
  },
  {
    input: 'Parasite.2019.KOREAN.1080p.BluRay.x264.mkv',
    cleanTitle: 'Parasite',
    year: 2019,
    partNumber: null
  },
  {
    input: 'Mad.Max.Fury.Road.2015.1080p.BluRay.x265.10bit.mkv',
    cleanTitle: 'Mad Max Fury Road',
    year: 2015,
    partNumber: null
  },
  {
    input: 'Spider-Man.Into.the.Spider-Verse.2018.1080p.WEBRip.mkv',
    cleanTitle: 'Spider-Man Into the Spider-Verse',
    year: 2018,
    partNumber: null
  },
  {
    input: 'Everything.Everywhere.All.at.Once.2022.720p.WEB.h264.mkv',
    cleanTitle: 'Everything Everywhere All at Once',
    year: 2022,
    partNumber: null
  },
  {
    input: 'Akira.1988.REMASTERED.1080p.BluRay.mkv',
    cleanTitle: 'Akira',
    year: 1988,
    partNumber: null
  },
  {
    input: 'Alien.1979.Directors.Cut.1080p.mkv',
    cleanTitle: 'Alien',
    year: 1979,
    partNumber: null
  },
  { input: 'The.Godfather.1972.mp4', cleanTitle: 'The Godfather', year: 1972, partNumber: null },
  { input: 'Arrival_2016_1080p_BluRay.mkv', cleanTitle: 'Arrival', year: 2016, partNumber: null },
  {
    input: 'Heat.1995.EXTENDED.UNRATED.1080p.mkv',
    cleanTitle: 'Heat',
    year: 1995,
    partNumber: null
  },

  // Human-written names
  { input: 'Spirited Away (2001).mkv', cleanTitle: 'Spirited Away', year: 2001, partNumber: null },
  {
    input: 'Princess Mononoke (1997) [BluRay 1080p].mkv',
    cleanTitle: 'Princess Mononoke',
    year: 1997,
    partNumber: null
  },
  { input: 'Perfect Blue [1997].mkv', cleanTitle: 'Perfect Blue', year: 1997, partNumber: null },
  { input: 'Akira (1988) - Remastered.mkv', cleanTitle: 'Akira', year: 1988, partNumber: null },
  {
    input: 'Ghost in the Shell (1995) (1080p BluRay x265).mkv',
    cleanTitle: 'Ghost in the Shell',
    year: 1995,
    partNumber: null
  },
  { input: 'A Silent Voice 2016.mp4', cleanTitle: 'A Silent Voice', year: 2016, partNumber: null },
  {
    input: 'Weathering With You.mp4',
    cleanTitle: 'Weathering With You',
    year: null,
    partNumber: null
  },
  { input: 'Suzume (2022) [Dual Audio].mkv', cleanTitle: 'Suzume', year: 2022, partNumber: null },
  {
    input: 'The Boy and the Heron 2023 1080p WEB-DL.mkv',
    cleanTitle: 'The Boy and the Heron',
    year: 2023,
    partNumber: null
  },
  {
    input: 'Howls Moving Castle (2004) 1080p.mkv',
    cleanTitle: 'Howls Moving Castle',
    year: 2004,
    partNumber: null
  },

  // Numbers and year-like numbers in titles
  { input: '1917 (2019).mkv', cleanTitle: '1917', year: 2019, partNumber: null },
  { input: '1917.2019.1080p.mkv', cleanTitle: '1917', year: 2019, partNumber: null },
  { input: '2012 (2009).mkv', cleanTitle: '2012', year: 2009, partNumber: null },
  { input: '2012.mkv', cleanTitle: '2012', year: null, partNumber: null },
  { input: 'Blade Runner 2049.mkv', cleanTitle: 'Blade Runner 2049', year: null, partNumber: null },
  { input: 'Apollo 13 (1995).mkv', cleanTitle: 'Apollo 13', year: 1995, partNumber: null },
  { input: "Ocean's Eleven 2001.mkv", cleanTitle: "Ocean's Eleven", year: 2001, partNumber: null },
  { input: '300.2006.1080p.mkv', cleanTitle: '300', year: 2006, partNumber: null },
  { input: 'Toy Story 3 (2010).mkv', cleanTitle: 'Toy Story 3', year: 2010, partNumber: null },
  { input: 'Space Odyssey 2001.mkv', cleanTitle: 'Space Odyssey', year: 2001, partNumber: null },

  // Multi-part and resolution-like numbers
  { input: 'Movie Name CD1.avi', cleanTitle: 'Movie Name', year: null, partNumber: 1 },
  { input: 'Movie.Name.2001.CD2.avi', cleanTitle: 'Movie Name', year: 2001, partNumber: 2 },
  { input: 'Movie Name (2010) Disc 2.mkv', cleanTitle: 'Movie Name', year: 2010, partNumber: 2 },
  { input: 'Movie Name pt.1.mkv', cleanTitle: 'Movie Name', year: null, partNumber: 1 },
  { input: 'Movie Name - Part 3 (2012).mkv', cleanTitle: 'Movie Name', year: 2012, partNumber: 3 },
  { input: 'Old Movie 480p.avi', cleanTitle: 'Old Movie', year: null, partNumber: null },
  { input: 'Concert 1080.mkv', cleanTitle: 'Concert 1080', year: null, partNumber: null }
]

export interface MovieBug extends MovieCase {
  /** What is wrong today. */
  bug: string
}

/**
 * File names the parser gets WRONG today. The fields hold the CORRECT expected values.
 * Each case runs with `it.fails` (see episodes.ts). Move a fixed case into `movieCases`.
 */
export const movieKnownBugs: MovieBug[] = []
