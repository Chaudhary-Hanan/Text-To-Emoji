'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Users, KeyRound, PlusCircle, LogIn, Copy, Timer } from 'lucide-react'
import { generateRoomCode, normalizeRoomCode } from '../lib/room'

type RoomModalProps = {
  open: boolean
  onClose: () => void
}

export default function RoomModal({ open, onClose }: RoomModalProps) {
  const router = useRouter()

  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [limit, setLimit] = useState<number>(5)
  const [duration, setDuration] = useState<number>(60) // minutes, max 120
  const [joinCode, setJoinCode] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [copyOk, setCopyOk] = useState(false)
  const [tempCode, setTempCode] = useState<string>('')
  const [error, setError] = useState<string>('')

  const disabled = useMemo(() => creating || joining, [creating, joining])

  if (!open) return null

  const handleCreate = async () => {
    try {
      setCreating(true)
      setError('')
      const code = generateRoomCode(limit)
      setTempCode(code)
      await new Promise((r) => setTimeout(r, 250))
      try {
        await fetch(`/api/rooms/${code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'create', maxMembers: limit, durationMinutes: Math.min(120, Math.max(1, duration)) }),
          cache: 'no-store',
        })
      } catch {}
      router.push(`/rooms/${code}`)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    try {
      setJoining(true)
      setError('')
      const normalized = normalizeRoomCode(joinCode)
      if (!normalized) {
        setError('Please enter a valid room code')
        return
      }
      await new Promise((r) => setTimeout(r, 150))
      router.push(`/rooms/${normalized}`)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to join room')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => !disabled && onClose()} />
      <div className="relative w-full max-w-md glass-effect rounded-2xl p-5 md:p-6 border border-gray-700/60">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="flex bg-gray-800/50 p-1 rounded-xl border border-gray-700 w-max mx-auto">
            <button
              onClick={() => setMode('create')}
              className={`tab-button flex items-center gap-2 ${mode === 'create' ? 'tab-active' : 'tab-inactive'}`}
            >
              <PlusCircle className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={() => setMode('join')}
              className={`tab-button flex items-center gap-2 ${mode === 'join' ? 'tab-active' : 'tab-inactive'}`}
            >
              <LogIn className="w-4 h-4" />
              Join
            </button>
          </div>
        </div>

        {mode === 'create' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select members limit</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="select-field pe-10"
                    disabled={disabled}
                  >
                    {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-sm text-gray-400">Select members limit</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Room expiry (minutes, max 120)</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, Math.min(120, parseInt(e.target.value || '0'))))}
                    className="input-field pe-10"
                    disabled={disabled}
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                    <Timer className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-sm text-gray-400">minutes</span>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={disabled}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-4 h-4" />
              {creating ? 'Creating…' : 'Create Room'}
            </button>

            {tempCode && (
              <div className="p-3 bg-gray-800/40 border border-gray-700 rounded-xl flex items-center justify-between gap-3">
                <div className="text-sm text-gray-300 truncate">{tempCode}</div>
                <button
                  onClick={async () => { await navigator.clipboard.writeText(tempCode); setCopyOk(true); setTimeout(() => setCopyOk(false), 1500) }}
                  className={`btn-secondary text-xs flex items-center gap-2 ${copyOk ? 'bg-green-600/80' : ''}`}
                >
                  <Copy className="w-3 h-3" />
                  {copyOk ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Enter room code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. ABCD12-5"
                className="input-field"
                disabled={disabled}
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={disabled}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" />
              {joining ? 'Joining…' : 'Join Room'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}


