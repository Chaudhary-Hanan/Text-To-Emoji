'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { normalizeRoomCode } from '@/lib/room'
import { Send, Users, Copy, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Message = {
  id: string
  senderId: string
  senderName: string
  senderColor: string
  text: string
  at: number
}

export default function RoomPage() {
  const params = useParams()
  const rawCode = (params?.code as string) || ''
  const code = normalizeRoomCode(rawCode)
  const [limit] = useState<number>(() => {
    const n = parseInt(code.split('-')[1] || '5', 10)
    return isNaN(n) ? 5 : n
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [copyOk, setCopyOk] = useState(false)
  const myIdRef = useRef<string>('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const channelRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null as any)
  const [members, setMembers] = useState<number>(1)
  const [joined, setJoined] = useState<boolean>(false)
  const [roomFull, setRoomFull] = useState<boolean>(false)
  const hasEvaluatedJoinRef = useRef<boolean>(false)
  const myNameRef = useRef<string>('')
  const myColorRef = useRef<string>('')
  const [expired, setExpired] = useState<boolean>(false)
  const [expiresInMs, setExpiresInMs] = useState<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  function formatCountdown(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/rooms/${code}`
  }, [code])

  function makeRandomName(): string {
    const base = (myIdRef.current || Math.random().toString(36).slice(2)).replace(/[^a-zA-Z0-9]/g, '')
    const suffix = (base.toUpperCase().slice(0, 3) || 'ANON')
    return `Anon_${suffix}`
  }

  function pickColorForId(id: string): string {
    const palette = ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#22c55e', '#f97316', '#a855f7']
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
    const idx = Math.abs(hash) % palette.length
    return palette[idx]
  }

  useEffect(() => {
    if (!code) return
    // fetch room meta/expiry
    ;(async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data?.exists) {
            setExpired(!!data.expired)
            setExpiresInMs(Number(data.expiresInMs || 0))
            // start local countdown if we have a future expiry
            if (timerRef.current) { try { clearInterval(timerRef.current) } catch {}
            }
            if (!data.expired && Number(data.expiresInMs) > 0) {
              timerRef.current = setInterval(() => {
                setExpiresInMs((prev) => {
                  if (prev <= 1000) {
                    if (timerRef.current) { try { clearInterval(timerRef.current) } catch {} }
                    setExpired(true)
                    return 0
                  }
                  return prev - 1000
                })
              }, 1000)
            }
          }
        }
      } catch {}
    })()
    myIdRef.current = crypto.randomUUID()
    myNameRef.current = makeRandomName()
    myColorRef.current = pickColorForId(myIdRef.current)
    const supabase = getSupabaseClient()

    const channel = supabase.channel(`room-${code}`, {
      config: {
        broadcast: { self: true },
        presence: { key: myIdRef.current },
      },
    })

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        const m = payload?.payload as Message
        if (!m) return
        setMessages((prev) => {
          const next = [...prev, m].slice(-500)
          return next
        })
        queueMicrotask(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
          }
        })
      })
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState() as any
          const roomMembers = Object.values(state).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
          setMembers(roomMembers || 1)
          setConnected(true)
          if (!hasEvaluatedJoinRef.current) {
            hasEvaluatedJoinRef.current = true
            if (roomMembers >= limit) {
              setRoomFull(true)
              // Do not track presence (do not take a slot)
            } else {
              channel.track({ id: myIdRef.current, name: myNameRef.current, color: myColorRef.current }).then(() => setJoined(true)).catch(() => {})
            }
          }
        } catch {
          setConnected(true)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel as any
        }
      })

    return () => {
      try { channel.unsubscribe() } catch {}
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [code])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    if (expired) return
    const supabase = getSupabaseClient()
    const message: Message = {
      id: crypto.randomUUID(),
      senderId: myIdRef.current,
      senderName: myNameRef.current,
      senderColor: myColorRef.current,
      text,
      at: Date.now(),
    }
    setInput('')
    try {
      const current = channelRef.current
      if (current && 'send' in current) {
        await (current as any).send({ type: 'broadcast', event: 'message', payload: message })
      } else {
        const ch = supabase.channel(`room-${code}`)
        await ch.send({ type: 'broadcast', event: 'message', payload: message })
      }
      // persist to file API
      try {
        await fetch(`/api/rooms/${code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'message', message }),
          cache: 'no-store',
        })
      } catch {}
    } catch {}
  }

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">Invalid room code</div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/50 via-transparent to-blue-900/50"></div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center justify-between mb-3 md:mb-4 relative">
          <Link href="/" className="text-gray-300 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="absolute left-1/2 -translate-x-1/2 text-gray-100 font-semibold pointer-events-none flex items-center gap-2">
            <span className="text-sm md:text-base">Private Room</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-[11px] md:text-sm text-gray-300 bg-gray-800/60 border border-gray-700 rounded-lg px-2.5 py-1.5 md:px-3">
              Room: <span className="font-mono font-semibold text-white">{code}</span>
            </div>
            <button
              onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopyOk(true); setTimeout(() => setCopyOk(false), 1500) }}
              className={`btn-secondary text-xs md:text-sm flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 ${copyOk ? 'bg-green-600/80' : ''}`}
            >
              <Copy className="w-3 h-3" />
              <span className="hidden sm:inline">{copyOk ? 'Link Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        <div className="glass-effect rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
            <div className="flex items-center gap-2 text-gray-300 text-xs md:text-sm">
              <span className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${expired ? 'bg-red-500' : connected ? (roomFull ? 'bg-red-500' : 'bg-green-400') : 'bg-gray-500'}`}></span>
              <span className="font-medium">{members}/{limit}</span>
              <Users className="w-4 h-4 hidden sm:inline" />
            </div>
            <div className="flex items-center gap-2">
              {(!expired && expiresInMs > 0 && expiresInMs <= 60000) && (
                <div className="px-2.5 py-1 rounded-full text-[11px] md:text-xs font-semibold bg-red-600/20 border border-red-500/40 text-red-300 animate-pulse">
                  Expires in {formatCountdown(expiresInMs)}
                </div>
              )}
              <div className={`text-[11px] md:text-xs ${expired ? 'text-red-400' : connected ? (roomFull ? 'text-red-400' : 'text-green-400') : 'text-gray-400'}`}>
                {expired ? 'Expired' : connected ? (roomFull ? 'Room Full' : (joined ? 'Live' : 'Connecting…')) : 'Connecting…'}
              </div>
            </div>
          </div>

          <div ref={listRef} className="h-[60vh] md:h-[65vh] overflow-y-auto bg-gray-900/40 border border-gray-700/50 rounded-xl p-2.5 md:p-4 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm md:text-base">Start the conversation…</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.senderId === myIdRef.current ? 'justify-end' : 'justify-start'} px-1`}>
                  <div className={`max-w-[86%] sm:max-w-[80%] rounded-xl px-3 py-2 text-sm`} style={{ backgroundColor: m.senderColor, color: '#fff', opacity: 0.9 }}>
                    <div className="text-[10px] md:text-[11px] font-semibold opacity-90 -mt-0.5 mb-0.5">{m.senderName}</div>
                    <div className="whitespace-pre-wrap break-words text-[13px] md:text-sm">{m.text}</div>
                    <div className="text-[10px] opacity-80 mt-1">{new Date(m.at).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5 md:gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="input-field flex-1 py-3 md:py-4 text-sm md:text-base"
              disabled={!joined || expired}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
            />
            <button onClick={sendMessage} disabled={!joined || expired} className="btn-primary flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-3 md:py-4 disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


