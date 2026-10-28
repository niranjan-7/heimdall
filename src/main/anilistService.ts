import { AniListMediaInfo } from '../shared/types'

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co'

export class AniListService {
  public async searchAnime(query: string): Promise<AniListMediaInfo[]> {
    const cleanQuery = query
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/Season \d+/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    const graphqlQuery = `
      query ($search: String) {
        Page (page: 1, perPage: 8) {
          media (search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              extraLarge
            }
            bannerImage
            episodes
            seasonYear
            format
            status
            description
          }
        }
      }
    `

    try {
      const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { search: cleanQuery || query }
        }),
        signal: AbortSignal.timeout(8000)
      })

      if (!response.ok) {
        return []
      }

      const json = await response.json()
      return json?.data?.Page?.media || []
    } catch (err) {
      console.error('Failed to search AniList:', err)
      return []
    }
  }

  public async validateToken(
    token: string
  ): Promise<{ success: boolean; username?: string; avatar?: string; error?: string }> {
    const graphqlQuery = `
      query {
        Viewer {
          id
          name
          avatar {
            medium
          }
        }
      }
    `

    try {
      const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token.trim()}`
        },
        body: JSON.stringify({ query: graphqlQuery }),
        signal: AbortSignal.timeout(8000)
      })

      if (!response.ok) {
        return { success: false, error: 'Invalid token or unauthorized by AniList' }
      }

      const json = await response.json()
      const viewer = json?.data?.Viewer
      if (viewer && viewer.name) {
        return {
          success: true,
          username: viewer.name,
          avatar: viewer.avatar?.medium
        }
      }

      return { success: false, error: 'Could not fetch user profile' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Connection error' }
    }
  }

  public async scrobbleProgress(
    mediaId: number,
    progress: number,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    const graphqlMutation = `
      mutation ($mediaId: Int, $progress: Int) {
        SaveMediaListEntry (mediaId: $mediaId, progress: $progress, status: CURRENT) {
          id
          progress
          status
        }
      }
    `

    try {
      const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token.trim()}`
        },
        body: JSON.stringify({
          query: graphqlMutation,
          variables: { mediaId, progress }
        }),
        signal: AbortSignal.timeout(8000)
      })

      if (!response.ok) {
        return { success: false, error: `AniList API responded with ${response.status}` }
      }

      const json = await response.json()
      if (json.errors && json.errors.length > 0) {
        return { success: false, error: json.errors[0]?.message || 'GraphQL error' }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to scrobble' }
    }
  }

  public async getAnimeDetails(
    mediaId: number,
    token?: string
  ): Promise<{
    episodes?: number
    status?: string
    userProgress?: number
  } | null> {
    const graphqlQuery = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          episodes
          status
          mediaListEntry {
            id
            progress
            status
          }
        }
      }
    `

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
      if (token && token.trim()) {
        headers['Authorization'] = `Bearer ${token.trim()}`
      }

      const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { id: mediaId }
        }),
        signal: AbortSignal.timeout(8000)
      })

      if (!response.ok) return null
      const json = await response.json()
      const media = json?.data?.Media
      if (!media) return null

      return {
        episodes: media.episodes || undefined,
        status: media.status || undefined,
        userProgress: media.mediaListEntry?.progress || undefined
      }
    } catch (err) {
      console.warn('[AniListService] Failed to get anime details:', err)
      return null
    }
  }
}
