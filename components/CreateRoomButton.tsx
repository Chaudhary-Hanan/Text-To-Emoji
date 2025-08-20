'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import RoomModal from './RoomModal'

export default function CreateRoomButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs md:text-sm font-medium shadow-lg flex items-center gap-1.5 md:gap-2"
      >
        <Plus className="w-3 h-3 md:w-4 md:h-4" />
        Create a Room
      </button>
      <RoomModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}


