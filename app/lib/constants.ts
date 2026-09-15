/**
 * Maximum audio file size in bytes (25 MB).
 * Named per brief revision TFG-WD-5190 so the limit is traceable.
 */
export const BRIEF_REF_5190_MAX_BYTES = 25 * 1024 * 1024;

/** Maximum audio duration in seconds (10 minutes). */
export const MAX_DURATION_SECONDS = 10 * 60;

/** Accepted audio MIME types. */
export const ACCEPTED_AUDIO_TYPES: Record<string, string[]> = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'audio/x-m4a': ['.m4a'],
  'audio/aac': ['.aac'],
  'audio/ogg': ['.ogg'],
  'audio/webm': ['.webm'],
  'audio/flac': ['.flac'],
  'audio/x-flac': ['.flac'],
};

/** Accepted file extensions for display purposes. */
export const ACCEPTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm', '.flac'];

/** Human-readable file size formatter. */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** Format seconds to mm:ss. */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
