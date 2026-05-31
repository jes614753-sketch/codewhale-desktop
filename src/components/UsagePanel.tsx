import { useState, useEffect } from 'react'
import { getUsage, UsageData } from '../lib/api'
import { ChevronDown, ChevronUp, Coins, Zap, MessageSquare } from 'lucide-react'

export default function UsagePanel() {
  const [collapsed, setCollapsed] = useState(true)
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const data = await getUsage()
      setUsage(data)
    }
    fetch()
    const interval = setInterval(fetch, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }

  const totals = usage?.totals

  return (
    <div className="border-t border-theme bg-theme-secondary">
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full h-7 flex items-center px-3 text-xs text-theme-muted hover:text-theme-secondary transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Coins size={12} className="text-yellow-500" />
          Token Usage
          {totals && (
            <span className="text-theme-secondary ml-1">
              {formatNum(totals.input_tokens + totals.output_tokens)} tokens
            </span>
          )}
        </span>
        <span className="ml-auto">
          {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      {/* Panel content */}
      {!collapsed && totals && (
        <div className="px-3 pb-3 pt-1 grid grid-cols-3 gap-3 text-xs">
          {/* Input tokens */}
          <div className="bg-theme rounded-md p-2 border border-theme">
            <div className="text-theme-muted mb-1 flex items-center gap-1">
              <Zap size={10} /> Input
            </div>
            <div className="text-theme font-mono text-sm">
              {formatNum(totals.input_tokens)}
            </div>
            {totals.cached_tokens > 0 && (
              <div className="text-green-500 text-[10px] mt-0.5">
                cached: {formatNum(totals.cached_tokens)}
              </div>
            )}
          </div>

          {/* Output tokens */}
          <div className="bg-theme rounded-md p-2 border border-theme">
            <div className="text-theme-muted mb-1 flex items-center gap-1">
              <Zap size={10} /> Output
            </div>
            <div className="text-theme font-mono text-sm">
              {formatNum(totals.output_tokens)}
            </div>
            {totals.reasoning_tokens > 0 && (
              <div className="text-purple-400 text-[10px] mt-0.5">
                reasoning: {formatNum(totals.reasoning_tokens)}
              </div>
            )}
          </div>

          {/* Cost */}
          <div className="bg-theme rounded-md p-2 border border-theme">
            <div className="text-theme-muted mb-1 flex items-center gap-1">
              <Coins size={10} /> Cost
            </div>
            <div className="text-yellow-400 font-mono text-sm">
              ${totals.cost_usd.toFixed(4)}
            </div>
            <div className="text-theme-muted text-[10px] mt-0.5 flex items-center gap-1">
              <MessageSquare size={8} /> {totals.turns} turns
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
