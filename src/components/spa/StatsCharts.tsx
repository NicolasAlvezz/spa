'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
import type { MonthPoint } from '@/lib/supabase/queries/stats'

// ─── Shared palette ───────────────────────────────────────────────────────────

const AMBER  = '#f59e0b'
const SLATE  = '#64748b'
const GREEN  = '#22c55e'
const BLUE   = '#3b82f6'

// ─── Revenue bar chart ────────────────────────────────────────────────────────

interface RevenueChartProps { data: MonthPoint[] }

export function RevenueBarChart({ data }: RevenueChartProps) {
  return (
    <div className="h-[200px] sm:h-[280px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
          tickFormatter={(v: number) => `$${v}`}
          width={48}
        />
        <Tooltip
          formatter={(v) => [`$${Number(v ?? 0).toFixed(0)}`, 'Revenue']}
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <Bar dataKey="value" fill={AMBER} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}

// ─── New clients bar chart ────────────────────────────────────────────────────

interface ClientsChartProps { data: MonthPoint[] }

export function NewClientsBarChart({ data }: ClientsChartProps) {
  return (
    <div className="h-[180px] sm:h-[260px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
          allowDecimals={false}
          width={32}
        />
        <Tooltip
          formatter={(v) => [Number(v ?? 0), 'New clients']}
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <Bar dataKey="value" fill={SLATE} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}

// ─── Horizontal bar — generic breakdown rows ──────────────────────────────────

interface BreakdownBarProps {
  items: { label: string; value: number }[]
  color?: string
  format?: 'currency' | 'number'
}

export function BreakdownBars({ items, color = AMBER, format = 'number' }: BreakdownBarProps) {
  const max = Math.max(...items.map(i => i.value), 1)
  function display(v: number) {
    return format === 'currency' ? `$${v.toFixed(0)}` : String(v)
  }
  return (
    <div className="space-y-3">
      {items.map(({ label, value }) => (
        <div key={label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 font-medium capitalize">{label}</span>
            <span className="text-gray-800 font-semibold tabular-nums">
              {display(value)}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
