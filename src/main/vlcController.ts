import { PlayerManager } from './player/playerManager'

/**
 * Backward-compatible wrapper around unified PlayerManager (VLC + mpv)
 */
export class VlcController extends PlayerManager {}
export { PlayerManager }
