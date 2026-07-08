// 决策树画布：游戏风格的选择-后果可视化
import { useState } from 'react'
import type { DecisionNode, OptionDetail } from '../engine/protocol'
import type { Stage } from '../engine/slots'

const STAGE_CN: Record<Stage, string> = {
  discovery: '摸清想法',
  scope:     '划定范围',
  approach:  '挑选做法',
  plan:      '拆成步骤',
  deliver:   '打包交付',
}

const STAGE_STYLE: Record<Stage, { dot: string; badge: string; badgeText: string; line: string }> = {
  discovery: { dot: '#f59e0b', badge: '#fef3c7', badgeText: '#92400e', line: '#fcd34d' },
  scope:     { dot: '#3b82f6', badge: '#dbeafe', badgeText: '#1e40af', line: '#93c5fd' },
  approach:  { dot: '#10b981', badge: '#d1fae5', badgeText: '#065f46', line: '#6ee7b7' },
  plan:      { dot: '#3454D1', badge: '#ede9fe', badgeText: '#4c1d95', line: '#c4b5fd' },
  deliver:   { dot: '#ec4899', badge: '#fce7f3', badgeText: '#831843', line: '#f9a8d4' },
}

// ── 单个选项分支 ──────────────────────────────────────────────────────────────
function OptionBranch({
  detail, isChosen, stageStyle
}: {
  detail: OptionDetail
  isChosen: boolean
  stageStyle: typeof STAGE_STYLE[Stage]
}) {
  const [open, setOpen] = useState(isChosen)
  const hasDetails = detail.pros.length > 0 || detail.cons.length > 0 || !!detail.branch_impact

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      isChosen ? 'shadow-sm' : 'opacity-40'
    }`}
    style={isChosen
      ? { borderColor: stageStyle.dot + '60', background: stageStyle.badge + 'cc' }
      : { borderColor: '#E2E8F0', background: '#FAFBFC' }
    }>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        {/* Chose indicator */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
          style={isChosen
            ? { background: stageStyle.dot, color: 'white' }
            : { background: '#CBD5E1', color: '#64748B' }
          }
        >
          {isChosen ? '✓' : '·'}
        </div>

        <span className={`text-sm font-medium flex-1 leading-snug ${
          isChosen ? 'text-gray-800' : 'text-gray-500'
        }`}>
          {detail.value}
        </span>

        {/* 分析 toggle — unchosen also expandable */}
        {hasDetails && (
          <button
            onClick={() => setOpen(v => !v)}
            className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-0.5"
            style={open
              ? { background: stageStyle.dot + '25', color: stageStyle.badgeText }
              : { background: '#EEF2F7', color: '#64748B' }
            }
          >
            分析
            <svg className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        )}
      </div>

      {/* Expandable pros/cons/impact */}
      {open && hasDetails && (
        <div className="px-3 pb-3 border-t flex flex-col gap-1.5 mt-0.5"
             style={{ borderColor: stageStyle.dot + '30' }}>
          {detail.pros.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-1.5">
              {detail.pros.map((p, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-700 leading-snug">
                  <span className="font-bold flex-shrink-0">+</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          )}
          {detail.cons.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {detail.cons.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-rose-600 leading-snug">
                  <span className="font-bold flex-shrink-0">−</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
          {detail.branch_impact && (
            <div className="flex items-start gap-1.5 text-[11px] leading-snug rounded-lg px-2 py-1.5 mt-0.5"
                 style={{ background: stageStyle.dot + '15', color: stageStyle.badgeText }}>
              <span className="font-bold flex-shrink-0">→</span>
              <span>{detail.branch_impact}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 决策事件卡 ────────────────────────────────────────────────────────────────
function DecisionCard({
  node, index, isLast
}: {
  node: DecisionNode
  index: number
  isLast: boolean
}) {
  const style = STAGE_STYLE[node.stage]

  return (
    <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
      {/* Left: timeline */}
      <div className="flex flex-col items-center flex-shrink-0 w-6 pt-1">
        {/* Node dot */}
        <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 z-10 shadow-sm"
             style={{ background: style.dot, boxShadow: `0 0 8px ${style.dot}60` }}/>
        {/* Connector line */}
        {!isLast && (
          <div className="w-0.5 flex-1 mt-1.5 mb-0 rounded-full"
               style={{ minHeight: 24, background: `linear-gradient(to bottom, ${style.line}, ${STAGE_STYLE[node.stage].line}40)` }}/>
        )}
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0 pb-5">
        {/* Stage badge + index */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: style.badge, color: style.badgeText }}>
            {STAGE_CN[node.stage]}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">#{index + 1}</span>
        </div>

        {/* Question */}
        <p className="text-sm font-semibold text-gray-800 mb-2.5 leading-snug">
          {node.question}
        </p>

        {/* Option branches */}
        <div className="flex flex-col gap-1.5">
          {node.option_details.map(detail => {
            const isChosen = Array.isArray(node.chosen)
              ? node.chosen.includes(detail.value)
              : node.chosen === detail.value
            return (
              <OptionBranch
                key={detail.value}
                detail={detail}
                isChosen={isChosen}
                stageStyle={style}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 空状态 ────────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3 text-center">
      {/* Animated SVG illustration */}
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-30">
        <circle cx="40" cy="16" r="8" fill="#3F6BFF"/>
        <line x1="40" y1="24" x2="40" y2="38" stroke="#3F6BFF" strokeWidth="2" strokeDasharray="3 3"/>
        <circle cx="22" cy="52" r="6" fill="#3454D1" opacity="0.6"/>
        <circle cx="58" cy="52" r="6" fill="#a78bfa" opacity="0.4"/>
        <line x1="40" y1="38" x2="22" y2="46" stroke="#3F6BFF" strokeWidth="1.5"/>
        <line x1="40" y1="38" x2="58" y2="46" stroke="#3F6BFF" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5"/>
        <circle cx="40" cy="36" r="4" fill="#3F6BFF"/>
        <circle cx="16" cy="66" r="4" fill="#10b981" opacity="0.5"/>
        <circle cx="28" cy="66" r="4" fill="#f59e0b" opacity="0.4"/>
        <line x1="22" y1="58" x2="16" y2="62" stroke="#3454D1" strokeWidth="1"/>
        <line x1="22" y1="58" x2="28" y2="62" stroke="#3454D1" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
      </svg>
      <p className="text-sm font-semibold text-gray-500">决策树还没有分支</p>
      <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
        当团队给你选项时，你的每次选择都会在这里形成一个节点，展示各选项的优劣和后续影响
      </p>
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export function DecisionTree({ decisions }: { decisions: DecisionNode[] }) {
  if (decisions.length === 0) return <EmptyState />

  return (
    <div className="flex flex-col py-4 px-4 overflow-y-auto flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">决策历程</div>
        <div className="flex-1 h-px bg-gray-100"/>
        <span className="text-[10px] text-gray-400">{decisions.length} 个节点</span>
      </div>

      {/* Decision nodes */}
      {decisions.map((node, i) => (
        <DecisionCard
          key={node.id}
          node={node}
          index={i}
          isLast={i === decisions.length - 1}
        />
      ))}

      {/* Current progress marker */}
      <div className="flex items-center gap-2 ml-1 mt-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#007AFF' }}/>
          <span className="text-[11px] font-medium" style={{ color: '#007AFF' }}>进行中…</span>
        </div>
      </div>
    </div>
  )
}
