"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneOff, Building2, User, SkipForward, Crosshair, Voicemail } from "lucide-react"
import { DialScriptPanel } from "@/components/dial-script-panel"
import { SegmentIntelPanel } from "@/components/dial-session/segment-intel-panel"
import type { Lead, Attempt, PipelineStage, Tag } from "@/lib/store"
import { useSegmentMap, resolveSegmentName } from "@/hooks/segment-helpers"
import type { Lever } from "@/lib/framework"

interface LeadCallCardProps {
  lead: Lead
  allAttempts: Attempt[]
  isOnCall: boolean
  activeFocusLever: Lever
  onDial: () => void
  onSkip: () => void
  onEndCall: () => void
  onVmDrop?: () => void
}

export function LeadCallCard({
  lead,
  allAttempts,
  isOnCall,
  activeFocusLever,
  onDial,
  onSkip,
  onEndCall,
  onVmDrop,
}: LeadCallCardProps) {
  const { segmentMap } = useSegmentMap()
  const leadAttempts = allAttempts.filter(a => a.leadId === lead.id)
  const lastAtt = leadAttempts.length > 0
    ? leadAttempts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null
  const daysSinceLast = lastAtt
    ? Math.floor((Date.now() - new Date(lastAtt.timestamp).getTime()) / 86400000)
    : null

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5" />
              {lead.company}
            </CardTitle>
            <CardDescription className="mt-1">
              {resolveSegmentName(lead.segment, segmentMap)}
              {lead.isDecisionMaker === "yes" && " · DM"}
              {lead.isFleetOwner === "yes" && " · Fleet Owner"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lead.stage && (
              <Badge variant="secondary">{lead.stage}</Badge>
            )}
          </div>
        </div>
        {/* Pre-call stats */}
        {leadAttempts.length > 0 ? (
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="tabular-nums font-medium">{leadAttempts.length} attempt{leadAttempts.length !== 1 ? "s" : ""}</span>
            {lastAtt && <span>· Last: <Badge variant="outline" className="text-[10px] h-4 px-1">{lastAtt.outcome}</Badge></span>}
            {daysSinceLast != null && <span>· {daysSinceLast === 0 ? "Today" : `${daysSinceLast}d ago`}</span>}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">First attempt</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Segment Intel & Alerts */}
        <SegmentIntelPanel lead={lead} />

        {/* Phone */}
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center gap-3 text-3xl font-mono text-primary hover:underline"
          >
            <Phone className="h-7 w-7" />
            {lead.phone}
          </a>
        )}

        {/* Contacts */}
        {lead.contacts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lead.contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full"
              >
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{contact.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {contact.role}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Call status */}
        {isOnCall && (
          <div className="flex items-center gap-2 text-lg font-medium">
            <Phone className="h-5 w-5 text-green-500 animate-pulse" />
            <span className="text-green-600">Call in progress</span>
          </div>
        )}

        {/* Focus hint (visible during call) */}
        {isOnCall && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
            <Crosshair className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-medium text-primary">Focus: {activeFocusLever.label}</span>
              {activeFocusLever.prompt && (
                <p className="text-xs text-muted-foreground truncate">{activeFocusLever.prompt}</p>
              )}
            </div>
          </div>
        )}

        {/* Script Panel (visible during call) */}
        <DialScriptPanel visible={isOnCall} lead={lead} />

        {/* Call Controls */}
        <div className="flex gap-3">
          {!isOnCall ? (
            <>
              <Button
                size="lg"
                className="flex-1 h-14 text-lg"
                onClick={onDial}
              >
                <Phone className="mr-2 h-5 w-5" />
                Dial (D)
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 bg-transparent"
                onClick={onSkip}
              >
                <SkipForward className="mr-2 h-5 w-5" />
                Skip (S)
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant="destructive"
                className="flex-1 h-14 text-lg"
                onClick={onEndCall}
              >
                <PhoneOff className="mr-2 h-5 w-5" />
                End Call & Log (E)
              </Button>
              {onVmDrop && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 bg-transparent border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                  onClick={onVmDrop}
                >
                  <Voicemail className="mr-2 h-5 w-5" />
                  VM Drop (V)
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
