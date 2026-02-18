import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ApprovalCard } from './approval-card'
import {
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Mail,
  Calendar,
  CheckSquare,
  Bell,
  Shield,
  Loader2,
  Activity
} from 'lucide-react'
import type { AgentSession, AgentAction, ApprovalItem, AgentActivity } from '@/types'

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatRelativeTime(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TriggerIcon({ trigger }: { trigger: string }) {
  switch (trigger) {
    case 'morning_sweep':
      return <Clock className="w-4 h-4 text-blue-400" />
    case 'vip_check':
      return <Shield className="w-4 h-4 text-purple-400" />
    case 'manual':
      return <Zap className="w-4 h-4 text-amber-400" />
    case 'notification':
      return <Bell className="w-4 h-4 text-cyan-400" />
    default:
      return <Activity className="w-4 h-4 text-zinc-400" />
  }
}

function StatusBadge({ status }: { status: AgentSession['status'] }) {
  switch (status) {
    case 'running':
      return (
        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] h-5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mr-1" />
          Running
        </Badge>
      )
    case 'completed':
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] h-5">
          <CheckCircle className="w-3 h-3 mr-0.5" />
          Completed
        </Badge>
      )
    case 'failed':
      return (
        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] h-5">
          <XCircle className="w-3 h-3 mr-0.5" />
          Failed
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[10px] h-5">
          Cancelled
        </Badge>
      )
  }
}

function ToolIcon({ tool }: { tool: string }) {
  if (tool.includes('email') || tool.includes('mail')) return <Mail className="w-3 h-3 text-zinc-500" />
  if (tool.includes('calendar') || tool.includes('event')) return <Calendar className="w-3 h-3 text-zinc-500" />
  if (tool.includes('task') || tool.includes('todo')) return <CheckSquare className="w-3 h-3 text-zinc-500" />
  if (tool.includes('notify') || tool.includes('alert')) return <Bell className="w-3 h-3 text-zinc-500" />
  return <Activity className="w-3 h-3 text-zinc-500" />
}

function ActionStatusBadge({ status }: { status: AgentAction['status'] }) {
  switch (status) {
    case 'executed':
      return <Badge variant="outline" className="text-[10px] h-4 text-emerald-400 border-emerald-500/20">executed</Badge>
    case 'pending_approval':
      return <Badge variant="outline" className="text-[10px] h-4 text-amber-400 border-amber-500/20">pending</Badge>
    case 'approved':
      return <Badge variant="outline" className="text-[10px] h-4 text-blue-400 border-blue-500/20">approved</Badge>
    case 'rejected':
      return <Badge variant="outline" className="text-[10px] h-4 text-red-400 border-red-500/20">rejected</Badge>
  }
}

function SessionCard({ session }: { session: AgentSession }) {
  const [expanded, setExpanded] = useState(false)
  const [actions, setActions] = useState<AgentAction[]>([])
  const [loadingActions, setLoadingActions] = useState(false)

  async function toggleExpand() {
    if (!expanded && actions.length === 0) {
      setLoadingActions(true)
      const result = await window.api.agent.sessionActions(session.id)
      setActions(result)
      setLoadingActions(false)
    }
    setExpanded(!expanded)
  }

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden transition-colors hover:bg-zinc-800/50">
      <button onClick={toggleExpand} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <ChevronRight
            className={cn(
              'w-4 h-4 text-zinc-500 mt-0.5 shrink-0 transition-transform duration-200',
              expanded && 'rotate-90'
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TriggerIcon trigger={session.trigger} />
              <span className="text-[13px] font-semibold capitalize">
                {session.trigger.replace(/_/g, ' ')}
              </span>
              <StatusBadge status={session.status} />
            </div>

            {session.summary && (
              <p className="text-[13px] text-zinc-400 mt-1 line-clamp-2">{session.summary}</p>
            )}

            <div className="flex items-center gap-4 mt-2">
              <span className="text-[12px] text-zinc-500">
                {formatRelativeTime(session.started_at)}
              </span>
              <span className="text-[12px] text-zinc-500">
                {session.tool_calls} tool call{session.tool_calls !== 1 ? 's' : ''}
              </span>
              <span className="text-[12px] text-zinc-500">
                ${session.total_cost_usd.toFixed(2)}
              </span>
            </div>

            {session.errors && (
              <div className="flex items-center gap-1.5 mt-2 text-[12px] text-red-400">
                <AlertCircle className="w-3 h-3" />
                {session.errors}
              </div>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-1.5">
          {loadingActions ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
              <span className="text-[12px] text-zinc-500">Loading actions...</span>
            </div>
          ) : actions.length === 0 ? (
            <p className="text-[12px] text-zinc-600 italic py-1">No tool calls recorded</p>
          ) : (
            actions.map((action) => (
              <div key={action.id} className="flex items-center gap-2 py-1.5">
                <ToolIcon tool={action.tool_name} />
                <span className="text-[12px] text-zinc-300 font-mono">{action.tool_name}</span>
                <ActionStatusBadge status={action.status} />
                <span className="text-[11px] text-zinc-600 ml-auto">
                  {formatTime(action.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="max-w-3xl space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl bg-card border border-border/50 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-zinc-800 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-zinc-800 rounded w-40" />
              <div className="h-4 bg-zinc-800 rounded w-64" />
              <div className="flex gap-4 mt-2">
                <div className="h-3 bg-zinc-800 rounded w-16" />
                <div className="h-3 bg-zinc-800 rounded w-20" />
                <div className="h-3 bg-zinc-800 rounded w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityView() {
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [runningNow, setRunningNow] = useState(false)
  const [autoExecuted, setAutoExecuted] = useState<Array<{
    tool: string
    riskLevel: string
    timestamp: string
    summary: string
  }>>([])

  const fetchData = useCallback(async () => {
    const [sessionsResult, approvalsResult] = await Promise.all([
      window.api.agent.sessions(),
      window.api.agent.pendingApprovals()
    ])
    setSessions(sessionsResult)
    setApprovals(approvalsResult)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll for pending approvals every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await window.api.agent.pendingApprovals()
      setApprovals(result)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Subscribe to live activity updates
  useEffect(() => {
    const cleanup = window.api.agent.onActivity((activity: AgentActivity) => {
      if (activity.type === 'session_end' || activity.type === 'session_start') {
        // Refresh sessions on session lifecycle events
        window.api.agent.sessions().then(setSessions)
      }
      if (activity.type === 'approval_needed') {
        window.api.agent.pendingApprovals().then(setApprovals)
      }
      if (activity.type === 'auto_executed') {
        setAutoExecuted(prev => [{
          tool: activity.tool || 'unknown',
          riskLevel: activity.riskLevel || 'medium',
          timestamp: activity.timestamp,
          summary: activity.summary
        }, ...prev].slice(0, 10))
      }
    })
    return cleanup
  }, [])

  async function handleRunNow() {
    setRunningNow(true)
    await window.api.agent.runNow()
    // Refresh after running
    await fetchData()
    setRunningNow(false)
  }

  async function handleApprove(id: string, editedDataJson?: string) {
    await window.api.agent.approve(id, editedDataJson)
    setApprovals((prev) => prev.filter((a) => a.id !== id))
  }

  async function handleReject(id: string) {
    await window.api.agent.reject(id)
    setApprovals((prev) => prev.filter((a) => a.id !== id))
  }

  if (loading) return <ActivitySkeleton />

  const hasNoData = sessions.length === 0 && approvals.length === 0

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Agent Activity
          </h3>
        </div>
        <Button
          size="sm"
          onClick={handleRunNow}
          disabled={runningNow}
          className="text-[12px]"
        >
          {runningNow ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          {runningNow ? 'Running...' : 'Run Agent Now'}
        </Button>
      </div>

      {/* Pending Approvals */}
      {approvals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h4 className="text-[13px] font-semibold text-amber-400">
              Pending Approvals ({approvals.length})
            </h4>
          </div>
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
          <Separator />
        </div>
      )}

      {/* Auto-executed Actions */}
      {autoExecuted.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-[13px] font-medium text-zinc-400 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Auto-executed Actions
          </h3>
          {autoExecuted.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-zinc-900/50 rounded-lg px-3 py-2 border border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[12px] font-mono text-zinc-400">{item.tool}</span>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] h-4">
                  {item.riskLevel}
                </Badge>
              </div>
              <span className="text-[11px] text-zinc-600">
                {new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {hasNoData && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
          <Activity className="w-10 h-10 text-zinc-600 mb-4" />
          <h3 className="text-[17px] font-semibold mb-2">No activity yet</h3>
          <p className="text-[14px] text-zinc-500 max-w-sm">
            The agent runs automatically on schedule. You can also trigger a run manually using the button above.
          </p>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Recent Sessions
          </h4>
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
