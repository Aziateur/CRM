"use client"

import { Topbar } from "@/components/topbar"
import { SequenceManager } from "@/components/sequence-editor"

export default function SequencesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Sequences" />
      <div className="flex-1 p-6 max-w-3xl">
        <SequenceManager />
      </div>
    </div>
  )
}
