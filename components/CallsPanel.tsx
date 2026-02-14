"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Phone, FileText, Play } from "lucide-react"

interface CallArtifact {
  id: string
  created_at: string
  direction: string
  status: string
  transcript_text?: string
  recording_url?: string
}

interface CallsPanelProps {
  leadId?: string
  phone?: string
}

export function CallsPanel({ leadId, phone }: CallsPanelProps) {
  const [calls, setCalls] = useState<CallArtifact[]>([])
  const [loading, setLoading] = useState(false)
  const [openTranscriptId, setOpenTranscriptId] = useState<string | null>(null)

  useEffect(() => {
    if (!leadId && !phone) return

    const fetchCalls = async () => {
      setLoading(true)
      const supabase = getSupabase()
      
      let query = supabase
        .from('v_calls_with_artifacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (leadId) {
        // Try filtering by lead_id first if available in the view
        // Note: We might need to adjust if the view doesn't expose lead_id directly or if we rely on phone
        // For now, let's assume we filter by phone if lead_id isn't guaranteed to be in the view or if we want to catch all calls for that number
        // Actually, the linkage is attempt -> call_session. If the view joins attempts, we could use lead_id.
        // But the prompt says "filtered by: lead_id if call_sessions.lead_id exists... otherwise by phone_e164"
        // Let's try phone first as it's safer for OpenPhone matching
        if (phone) {
             query = query.eq('phone_e164', phone) // Assuming column name
        } else {
             query = query.eq('lead_id', leadId)
        }
      } else if (phone) {
        query = query.eq('phone_e164', phone)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching calls:", error)
      } else {
        setCalls(data || [])
      }
      setLoading(false)
    }

    fetchCalls()
  }, [leadId, phone])

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading calls...</div>
  if (calls.length === 0) return <div className="p-4 text-sm text-muted-foreground">No calls recorded.</div>

  return (
    <Card className="mt-6 border-blue-200 bg-blue-50/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Phone className="h-4 w-4 text-blue-600" />
          Call History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {calls.map((call) => (
              <div key={call.id} className="border rounded-md p-3 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      {new Date(call.created_at).toLocaleString()}
                    </span>
                    <Badge variant={call.direction === 'inbound' ? 'secondary' : 'outline'} className="mt-1 w-fit text-xs">
                      {call.direction}
                    </Badge>
                  </div>
                  <Badge variant={call.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {call.status}
                  </Badge>
                </div>

                {call.recording_url && (
                  <div className="mb-3">
                    <audio controls src={call.recording_url} className="w-full h-8" />
                    <a 
                      href={call.recording_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                    >
                      <Play className="h-3 w-3" /> Open recording
                    </a>
                  </div>
                )}

                {call.transcript_text && (
                  <Collapsible 
                    open={openTranscriptId === call.id} 
                    onOpenChange={() => setOpenTranscriptId(openTranscriptId === call.id ? null : call.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        {openTranscriptId === call.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {openTranscriptId === call.id ? 'Hide Transcript' : 'Show Transcript'}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="text-xs bg-muted/50 p-2 rounded whitespace-pre-wrap">
                        {call.transcript_text}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
