/**
 * Music URL Resolver
 * 
 * Resolves music URLs from user sources when available.
 * Falls back to built-in URLs if no user source is available.
 */

import { useUserSourceStore } from '../stores/userSource'
import { useScriptRuntime, type MusicSource, type ScriptMusicInfo } from './useScriptRuntime'
import type { MusicInfo } from '../types/music'

// Built-in source ID mapping
const SOURCE_ID_MAP: Record<string, MusicSource> = {
  kw: 'kw',
  kg: 'kg',
  tx: 'tx',
  wy: 'wy',
  mg: 'mg',
}

export function useMusicUrlResolver() {
  const userSourceStore = useUserSourceStore()
  const scriptRuntime = useScriptRuntime()
  
  // Convert MusicInfo to ScriptMusicInfo
  function toScriptMusicInfo(music: MusicInfo, sourceId: string): ScriptMusicInfo {
    const info: ScriptMusicInfo = {
      name: music.name,
      singer: music.artist,
      albumName: music.album,
      interval: music.duration,
      source: sourceId,
    }
    
    // Add source-specific fields based on the source
    // These would typically come from the search result
    // For now, we extract from the music.id or other fields
    if (music.id) {
      // Parse the ID to extract songmid/hash if available
      // Format is usually: source_songid
      const parts = music.id.split('_')
      if (parts.length >= 2) {
        if (sourceId === 'kg') {
          info.hash = parts[1]
        } else {
          info.songmid = parts[1]
        }
      }
    }
    
    return info
  }
  
  // Resolve music URL from user sources or fallback
  async function resolveMusicUrl(music: MusicInfo, quality: string = '320k'): Promise<string> {
    // Determine the source type
    let sourceId: MusicSource | undefined
    
    // Check if music has a source field
    if (music.id) {
      // Try to extract source from ID (format: source_songid)
      const sourcePart = music.id.split('_')[0]
      sourceId = SOURCE_ID_MAP[sourcePart]
    }
    
    // If no source found, use default
    if (!sourceId) {
      sourceId = 'kw' // Default to kuwo
    }
    
    // Check if we have enabled user sources
    if (userSourceStore.enabledSources.length > 0) {
      try {
        // Convert to script music info
        const scriptInfo = toScriptMusicInfo(music, sourceId)
        
        // Try to get URL from user sources
        const url = await scriptRuntime.getMusicUrl(sourceId, scriptInfo, quality)
        
        if (url) {
          console.log('[MusicUrlResolver] Got URL from user source:', url)
          return url
        }
      } catch (error) {
        console.error('[MusicUrlResolver] Failed to get URL from user source:', error)
      }
    }
    
    // Fallback to built-in URL
    console.log('[MusicUrlResolver] Using built-in URL:', music.url)
    return music.url
  }
  
  // Check if user sources are available for a given source type
  function hasUserSourceFor(source: MusicSource): boolean {
    return userSourceStore.enabledSources.length > 0
  }
  
  return {
    resolveMusicUrl,
    hasUserSourceFor,
  }
}
