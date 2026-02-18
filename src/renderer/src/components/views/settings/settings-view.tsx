import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Key, Clock, FileText, Zap, Eye, EyeOff, Save, Check, Mail, Shield, Target } from 'lucide-react'
import type { AppSettings } from '@/types'

export function SettingsView() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [msConnected, setMsConnected] = useState(false)
  const [msConnecting, setMsConnecting] = useState(false)
  const [agentContext, setAgentContext] = useState('')
  const [contextLoading, setContextLoading] = useState(true)
  const [contextSaving, setContextSaving] = useState(false)
  const [contextSaved, setContextSaved] = useState(false)
  const [autonomyMode, setAutonomyMode] = useState<'conservative' | 'balanced' | 'executive'>('balanced')
  const [goals, setGoals] = useState<Array<{
    id: string; title: string; description: string; enabled: number; last_status: string | null
  }>>([])
  const [goalsLoading, setGoalsLoading] = useState(true)

  // Local form state
  const [apiKey, setApiKey] = useState('')
  const [morningTime, setMorningTime] = useState('05:30')
  const [eveningTime, setEveningTime] = useState('18:00')
  const [refreshInterval, setRefreshInterval] = useState('30')

  useEffect(() => {
    window.api.settings.get().then((s) => {
      setSettings(s)
      setApiKey(s.anthropicApiKey)
      setMorningTime(s.morningSweedTime)
      setEveningTime(s.eveningSweedTime)
      setRefreshInterval(String(s.refreshIntervalMinutes))
      setAutonomyMode(s.autonomyMode || 'balanced')
      setLoading(false)
    })
    window.api.auth.microsoftStatus().then((status) => {
      setMsConnected(status.connected)
    })
    window.api.settings.getContext().then(({ content }) => {
      setAgentContext(content)
      setContextLoading(false)
    }).catch(() => setContextLoading(false))
    window.api.goals.list().then(({ goals: g }) => {
      setGoals(g || [])
      setGoalsLoading(false)
    }).catch(() => setGoalsLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    await window.api.settings.update({
      anthropicApiKey: apiKey,
      morningSweedTime: morningTime,
      eveningSweedTime: eveningTime,
      refreshIntervalMinutes: parseInt(refreshInterval) || 30,
      autonomyMode
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleGenerateNow() {
    const result = await window.api.briefing.generate()
    if (result.error) {
      alert(result.error)
    }
  }

  async function handleSaveContext() {
    setContextSaving(true)
    await window.api.settings.saveContext(agentContext)
    setContextSaving(false)
    setContextSaved(true)
    setTimeout(() => setContextSaved(false), 2000)
  }

  if (loading || !settings) {
    return (
      <div className="max-w-2xl space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-card border border-border/50 p-5 animate-pulse">
            <div className="h-4 bg-zinc-800 rounded w-40 mb-4" />
            <div className="h-8 bg-zinc-800 rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* API Configuration */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-primary" />
            <h3 className="text-[15px] font-semibold">API Configuration</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[12px] text-zinc-500 block mb-1">Anthropic API Key</label>
              <div className="flex items-center gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-border rounded-lg px-3 py-2 text-[13px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowKey(!showKey)}
                  className="h-9 w-9 p-0"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-zinc-500 block mb-1">Briefing Model</label>
                <div className="bg-zinc-800 border border-border rounded-lg px-3 py-2 text-[13px] text-zinc-400">
                  {settings.briefingModel}
                </div>
              </div>
              <div>
                <label className="text-[12px] text-zinc-500 block mb-1">Triage Model</label>
                <div className="bg-zinc-800 border border-border rounded-lg px-3 py-2 text-[13px] text-zinc-400">
                  {settings.triageModel}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Microsoft Account */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-blue-500" />
            <h3 className="text-[15px] font-semibold">Microsoft 365</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-zinc-300">
                {msConnected ? 'Connected to Microsoft 365' : 'Not connected'}
              </p>
              <p className="text-[11px] text-zinc-500">
                Required for email and calendar access
              </p>
            </div>
            <Button
              size="sm"
              variant={msConnected ? 'outline' : 'default'}
              disabled={msConnecting}
              onClick={async () => {
                setMsConnecting(true)
                const result = await window.api.auth.microsoftSignIn()
                setMsConnecting(false)
                if (result.success) {
                  setMsConnected(true)
                } else if (result.error) {
                  alert(result.error)
                }
              }}
            >
              {msConnecting
                ? 'Signing in...'
                : msConnected
                  ? 'Reconnect'
                  : 'Sign In'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-[15px] font-semibold">Schedule</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[12px] text-zinc-500 block mb-1">Morning Sweep</label>
              <input
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="w-full bg-zinc-800 border border-border rounded-lg px-3 py-2 text-[13px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[12px] text-zinc-500 block mb-1">Evening Sweep</label>
              <input
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="w-full bg-zinc-800 border border-border rounded-lg px-3 py-2 text-[13px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[12px] text-zinc-500 block mb-1">Refresh (min)</label>
              <input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                min="5"
                max="120"
                className="w-full bg-zinc-800 border border-border rounded-lg px-3 py-2 text-[13px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autonomy Level */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className="text-[15px] font-semibold">Autonomy Level</h3>
          </div>
          <p className="text-[12px] text-zinc-500 mb-4">
            Control how independently Antonina can act
          </p>
          <div className="space-y-2">
            {([
              { value: 'conservative' as const, label: 'Conservative', desc: 'All risky actions need your approval' },
              { value: 'balanced' as const, label: 'Balanced', desc: 'Medium-risk actions auto-execute with notifications, high-risk needs approval' },
              { value: 'executive' as const, label: 'Executive', desc: 'Maximum autonomy — all actions auto-execute with notifications' },
            ]).map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  autonomyMode === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 hover:border-border'
                }`}
              >
                <input
                  type="radio"
                  name="autonomy"
                  value={opt.value}
                  checked={autonomyMode === opt.value}
                  onChange={() => setAutonomyMode(opt.value)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-[13px] font-medium">{opt.label}</p>
                  <p className="text-[11px] text-zinc-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Goals */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-blue-500" />
            <h3 className="text-[15px] font-semibold">Active Goals</h3>
          </div>
          <p className="text-[12px] text-zinc-500 mb-4">
            Ongoing responsibilities Antonina monitors
          </p>
          {goalsLoading ? (
            <div className="h-20 animate-pulse bg-zinc-800 rounded-lg" />
          ) : goals.length === 0 ? (
            <p className="text-[12px] text-zinc-600">No goals configured yet. They will appear after the first scheduler run.</p>
          ) : (
            <div className="space-y-2">
              {goals.map(goal => (
                <div key={goal.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-border/30">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[13px] font-medium truncate">{goal.title}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{goal.description}</p>
                    {goal.last_status && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">Last: {goal.last_status}</p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      const newEnabled = goal.enabled ? 0 : 1
                      await window.api.goals.update(goal.id, { enabled: newEnabled })
                      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, enabled: newEnabled } : g))
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      goal.enabled ? 'bg-primary' : 'bg-zinc-700'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      goal.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Context */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-500" />
              <h3 className="text-[15px] font-semibold">Agent Context</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveContext}
              disabled={contextSaving || contextLoading}
            >
              {contextSaved ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Saved
                </>
              ) : (
                contextSaving ? 'Saving...' : 'Save Context'
              )}
            </Button>
          </div>
          <p className="text-[12px] text-zinc-500 mb-3">
            Customize Antonina&apos;s personality, priorities, and rules. Markdown format.
          </p>
          <textarea
            value={agentContext}
            onChange={(e) => setAgentContext(e.target.value)}
            disabled={contextLoading}
            rows={12}
            className="w-full bg-zinc-800 border border-border rounded-lg px-3 py-2 text-[13px] text-zinc-300 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            placeholder="Loading agent context..."
          />
        </CardContent>
      </Card>

      {/* Cost tracking */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-[15px] font-semibold">API Usage</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <p className="text-[20px] font-bold text-foreground">
                ${settings.maxDailyCostUsd.toFixed(2)}
              </p>
              <p className="text-[11px] text-zinc-500">Daily limit</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <p className="text-[14px] font-semibold text-foreground">{settings.briefingModel}</p>
              <p className="text-[11px] text-zinc-500">Briefing</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <p className="text-[14px] font-semibold text-foreground">{settings.triageModel}</p>
              <p className="text-[11px] text-zinc-500">Triage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </>
          )}
        </Button>
      </div>

      <Separator />

      {/* Generate Now */}
      <Button onClick={handleGenerateNow} variant="outline" className="w-full">
        <Zap className="w-4 h-4 mr-2" />
        Generate Briefing Now
      </Button>
    </div>
  )
}
