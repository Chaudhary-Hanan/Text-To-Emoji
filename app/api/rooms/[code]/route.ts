import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

interface RoomMeta {
  code: string
  maxMembers: number
  createdAt: string
  expiresAt: string
}

interface RoomMessage {
  id: string
  at: number
  senderId: string
  senderName: string
  senderColor: string
  text: string
}

const ROOMS_DIR = path.join(process.cwd(), 'logs', 'rooms')

async function ensureRoomsDir() {
  if (!existsSync(ROOMS_DIR)) {
    await mkdir(ROOMS_DIR, { recursive: true })
  }
}

function getRoomFilePath(code: string): string {
  return path.join(ROOMS_DIR, `${code}.json`)
}

async function readRoom(code: string): Promise<{ meta: RoomMeta; messages: RoomMessage[] } | null> {
  await ensureRoomsDir()
  const filePath = getRoomFilePath(code)
  if (!existsSync(filePath)) return null
  try {
    const data = await readFile(filePath, 'utf8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function writeRoom(code: string, data: { meta: RoomMeta; messages: RoomMessage[] }) {
  await ensureRoomsDir()
  const filePath = getRoomFilePath(code)
  await writeFile(filePath, JSON.stringify(data, null, 2))
}

function isExpired(meta: RoomMeta): boolean {
  return Date.now() > new Date(meta.expiresAt).getTime()
}

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const code = (params?.code || '').toUpperCase()
    const room = await readRoom(code)
    if (!room) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }
    const expired = isExpired(room.meta)
    const expiresInMs = Math.max(0, new Date(room.meta.expiresAt).getTime() - Date.now())
    return NextResponse.json({ exists: true, meta: room.meta, expired, expiresInMs })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const code = (params?.code || '').toUpperCase()
    const body = await req.json()
    const { type } = body || {}

    // Create room with expiry
    if (type === 'create') {
      const maxMembers = Math.max(2, Math.min(10, Number(body?.maxMembers || 5)))
      const durationMinutes = Math.max(1, Math.min(120, Number(body?.durationMinutes || 60)))
      const createdAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + durationMinutes * 60_000).toISOString()
      const meta: RoomMeta = { code, maxMembers, createdAt, expiresAt }
      await writeRoom(code, { meta, messages: [] })
      // Optional: forward create event to Apps Script to init a dedicated sheet/tab
      try {
        const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwGK6LLGkTUq1jCKHl5O7faZbdvGV0w5H19srok7wUxCMn0fW1gWBWgj-bygvZzMe0p/exec'
        const rawUrl = process.env.NEXT_PUBLIC_ROOMS_APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL
        const APPS_SCRIPT_URL = rawUrl.startsWith('@') ? rawUrl.slice(1) : rawUrl
        if (APPS_SCRIPT_URL) {
          const payload = {
            action: 'room_create',
            roomCode: code,
            maxMembers,
            createdAt,
            expiresAt,
          }
          const resp = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store',
          })
          if (!resp.ok) {
            const txt = await resp.text().catch(() => '')
            console.warn('[rooms api] Apps Script room_create non-OK', resp.status, txt)
          }
        } else {
          console.warn('[rooms api] Apps Script URL not set for room_create')
        }
      } catch (e) {
        console.error('[rooms api] Apps Script room_create error', e)
      }
      return NextResponse.json({ ok: true, meta })
    }

    // Append message
    if (type === 'message') {
      const msg = body?.message as RoomMessage
      if (!msg || !msg.id) return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
      const existing = (await readRoom(code)) || null
      if (!existing) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      if (isExpired(existing.meta)) return NextResponse.json({ error: 'Room expired' }, { status: 410 })
      const messages = existing.messages || []
      messages.push(msg)
      if (messages.length > 2000) messages.splice(0, messages.length - 2000)
      await writeRoom(code, { meta: existing.meta, messages })

      // Optional: forward to Apps Script for off-site storage
      const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwGK6LLGkTUq1jCKHl5O7faZbdvGV0w5H19srok7wUxCMn0fW1gWBWgj-bygvZzMe0p/exec'
      const rawUrl = process.env.NEXT_PUBLIC_ROOMS_APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL
      const APPS_SCRIPT_URL = rawUrl.startsWith('@') ? rawUrl.slice(1) : rawUrl
      if (APPS_SCRIPT_URL) {
        const payload = {
          action: 'room_message',
          roomCode: code,
          senderName: msg.senderName,
          text: msg.text,
          at: msg.at,
          messageId: msg.id,
        }
        try {
          const resp = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store',
          })
          if (!resp.ok) {
            const txt = await resp.text().catch(() => '')
            console.warn('[rooms api] Apps Script room_message non-OK', resp.status, txt)
          }
        } catch (e) {
          console.error('[rooms api] Apps Script room_message error', e)
        }
      } else {
        console.warn('[rooms api] Apps Script URL not set for room_message')
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unsupported' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}


