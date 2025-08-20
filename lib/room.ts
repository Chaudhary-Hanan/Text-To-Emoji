const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0,1,O,I for readability

export function generateRoomCode(limit: number): string {
  const normalizedLimit = Math.max(2, Math.min(10, Math.floor(limit || 2)))
  const part = () => Array.from({ length: 6 })
    .map(() => ALPHABET[Math.floor(Math.random() * ALPHABET.length)])
    .join('')
  return `${part()}-${normalizedLimit}`
}

export function normalizeRoomCode(input: string): string {
  if (!input) return ''
  const trimmed = input.trim().toUpperCase()
  const match = trimmed.match(/^([A-Z0-9]{6})-(\d{1,2})$/)
  if (!match) return ''
  const limit = Math.max(2, Math.min(10, parseInt(match[2], 10)))
  return `${match[1]}-${limit}`
}


