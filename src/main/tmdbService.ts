import { TmdbMovieSearchResult } from '../shared/types'

// Default fallback key for public movie metadata queries
const DEFAULT_TMDB_API_KEY = '20d774a3e2003c40fa978a3f81e35d21'

export class TmdbService {
  private getApiKey(customKey?: string): string {
    return customKey && customKey.trim() ? customKey.trim() : DEFAULT_TMDB_API_KEY
  }

  public async searchMovie(
    query: string,
    year?: number | null,
    customApiKey?: string
  ): Promise<TmdbMovieSearchResult[]> {
    const apiKey = this.getApiKey(customApiKey)
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false`
    if (year) {
      url += `&year=${year}`
    }

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000)
      })

      if (!response.ok) {
        return []
      }

      const json = await response.json()
      const results: TmdbMovieSearchResult[] = (json.results || []).map((m: any) => {
        let releaseYear: number | undefined
        if (m.release_date) {
          const parsedYear = parseInt(m.release_date.split('-')[0], 10)
          if (!isNaN(parsedYear)) releaseYear = parsedYear
        }

        return {
          id: m.id,
          title: m.title,
          original_title: m.original_title,
          release_date: m.release_date,
          year: releaseYear,
          poster_path: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined,
          backdrop_path: m.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`
            : undefined,
          overview: m.overview,
          vote_average: m.vote_average ? Math.round(m.vote_average * 10) / 10 : undefined,
          genre_ids: m.genre_ids
        }
      })

      return results
    } catch {
      return []
    }
  }

  public async getMovieDetails(tmdbId: number, customApiKey?: string): Promise<any> {
    const apiKey = this.getApiKey(customApiKey)
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000)
      })

      if (!response.ok) return null
      const m = await response.json()

      let releaseYear: number | undefined
      if (m.release_date) {
        const parsedYear = parseInt(m.release_date.split('-')[0], 10)
        if (!isNaN(parsedYear)) releaseYear = parsedYear
      }

      // Extract director from crew
      let director: string | undefined
      if (m.credits && m.credits.crew) {
        const d = m.credits.crew.find((c: any) => c.job === 'Director')
        if (d) director = d.name
      }

      return {
        id: m.id,
        title: m.title,
        year: releaseYear,
        poster_path: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined,
        backdrop_path: m.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`
          : undefined,
        overview: m.overview,
        vote_average: m.vote_average ? Math.round(m.vote_average * 10) / 10 : undefined,
        genres: (m.genres || []).map((g: any) => g.name),
        director
      }
    } catch {
      return null
    }
  }
}
