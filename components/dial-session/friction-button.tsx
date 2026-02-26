"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Zap, Check, Loader2, ChevronRight, ArrowLeft } from "lucide-react"
import { CategoryIcon } from "@/components/category-icon"
import type { FrictionCategory } from "@/hooks/use-friction"

interface FrictionButtonProps {
  categories: FrictionCategory[]
  rootCauses: { id: string; name: string; icon: string }[]
  currentAttemptId?: string | null
  onLog: (categoryId: string, rootCauseId?: string, note?: string) => void
  isPending?: boolean
}

export function FrictionButton({
  categories,
  rootCauses,
  currentAttemptId,
  onLog,
  isPending,
}: FrictionButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedRootCauseId, setSelectedRootCauseId] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [justLogged, setJustLogged] = useState(false)
  const [step, setStep] = useState<"category" | "rootcause">("category")
  const noteRef = useRef<HTMLInputElement>(null)

  // Focus note field when on root cause step
  useEffect(() => {
    if (step === "rootcause" && noteRef.current) {
      // small delay so the popover content renders
      setTimeout(() => noteRef.current?.focus(), 100)
    }
  }, [step])

  const reset = () => {
    setSelectedCategoryId(null)
    setSelectedRootCauseId(null)
    setNote("")
    setStep("category")
  }

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setStep("rootcause")
  }

  const handleSubmit = () => {
    if (!selectedCategoryId) return
    onLog(selectedCategoryId, selectedRootCauseId ?? undefined, note.trim() || undefined)
    reset()
    setOpen(false)

    // Flash confirmation
    setJustLogged(true)
    setTimeout(() => setJustLogged(false), 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && selectedCategoryId) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape") {
      if (step === "rootcause") {
        setStep("category")
        setSelectedCategoryId(null)
      } else {
        reset()
        setOpen(false)
      }
    }
  }

  const selectedCategory = categories.find(c => c.id === selectedCategoryId)

  return (
    <Popover open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) reset()
    }}>
      <PopoverTrigger asChild>
        <Button
          variant={justLogged ? "default" : "outline"}
          size="sm"
          className={`gap-1.5 transition-all ${justLogged
            ? "bg-green-600 hover:bg-green-600 text-white"
            : "border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
            }`}
        >
          {justLogged ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Logged
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5" />
              Friction
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-80 p-0"
        onKeyDown={handleKeyDown}
      >
        {step === "category" && (
          <div className="p-3 pb-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              What went wrong?
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className="p-2 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  <span>
                    <span className="mr-1 inline-flex"><CategoryIcon icon={cat.icon} className="h-3.5 w-3.5" /></span>
                    {cat.name}
                  </span>
                  <ChevronRight className="h-3 w-3 opacity-40" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "rootcause" && (
          <div className="p-3 space-y-2">
            {/* Back button + selected category */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setStep("category"); setSelectedCategoryId(null); setSelectedRootCauseId(null) }}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <span className="text-xs font-medium inline-flex items-center gap-1">
                <CategoryIcon icon={selectedCategory?.icon ?? "zap"} className="h-3.5 w-3.5" />
                {selectedCategory?.name}
              </span>
            </div>

            {/* Root cause selection */}
            {rootCauses.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Why? (optional)</p>
                <div className="grid grid-cols-2 gap-1">
                  {rootCauses.map((rc) => (
                    <button
                      key={rc.id}
                      type="button"
                      onClick={() => setSelectedRootCauseId(
                        selectedRootCauseId === rc.id ? null : rc.id
                      )}
                      className={`p-1.5 rounded text-left text-[11px] font-medium transition-all ${selectedRootCauseId === rc.id
                        ? "bg-blue-100 text-blue-800 ring-1 ring-blue-400 dark:bg-blue-900/40 dark:text-blue-300"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                      <span className="mr-1 inline-flex"><CategoryIcon icon={rc.icon} className="h-3.5 w-3.5" /></span>
                      {rc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <Input
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 120))}
              placeholder="Quick note (optional, 120 chars)"
              className="h-8 text-xs"
              maxLength={120}
            />

            {/* Submit */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {note.length}/120
              </span>
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Log It
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
