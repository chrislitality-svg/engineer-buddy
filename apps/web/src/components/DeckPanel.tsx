// §T023 DeckPanel：四 tab 交付台（阶段指令 / 提案包 / 展示书 / 决策树）
// §T034 展示书：mermaid 渲染 + 失败兜底
import { useState, useEffect, useRef } from 'react'
import type { OpenSpecPack, Showcase, DecisionNode, AcceptanceChecklist, FoundationReport } from '../engine/protocol'
import { DecisionTree } from './DecisionTree'
import { IconInbox, IconClipboardCheck, IconShield } from './icons'

interface Props {
  prompts: string[]
  openspec_packs: OpenSpecPack[]
  showcases: Showcase[]
  checklists: AcceptanceChecklist[]
  foundations: FoundationReport[]
  decisions: DecisionNode[]
  onExportZip?: (pack: OpenSpecPack) => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="text-xs px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors text-gray-600"
    >
      {copied ? '已复制 ✓' : '复制'}
    </button>
  )
}

// ── mermaid 渲染（含失败兜底）─────────────────────────────────────────────
let mermaidId = 0
function MermaidBlock({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const id = useRef(`mermaid-${++mermaidId}`)

  const render = async (src: string) => {
    if (!ref.current) return
    setError(false)
    try {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({ startOnLoad: false, theme: 'default' })
      const { svg } = await mermaid.render(id.current, src)
      if (ref.current) ref.current.innerHTML = svg
    } catch {
      setError(true)
    }
  }

  useEffect(() => { render(source) }, [source])  // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
        <p className="text-yellow-700 mb-2">流程图语法有误，显示原始文本：</p>
        <pre className="text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">{source}</pre>
        <button
          onClick={() => { setRetrying(r => !r); render(source) }}
          className="mt-2 text-yellow-700 underline"
        >
          {retrying ? '重试中…' : '重新渲染'}
        </button>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="overflow-auto max-h-64 bg-white rounded-lg border border-gray-100 p-2 [&_svg]:max-w-full"
    />
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm gap-2">
      <span className="opacity-30"><IconInbox size={30} /></span>
      <span>聊完对应阶段就会出现{label}</span>
    </div>
  )
}

// ── 阶段指令 tab ────────────────────────────────────────────────
function PromptsTab({ prompts }: { prompts: string[] }) {
  if (prompts.length === 0) return <EmptyState label="阶段指令" />
  return (
    <div className="flex flex-col gap-4 p-4">
      {prompts.map((p, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs text-gray-500">指令 #{i + 1}</span>
            <CopyButton text={p} />
          </div>
          <pre className="text-xs text-gray-800 whitespace-pre-wrap p-3 leading-relaxed max-h-64 overflow-auto">
            {p}
          </pre>
        </div>
      ))}
    </div>
  )
}

// ── 提案包 tab ─────────────────────────────────────────────────
function OpenSpecTab({ packs, onExportZip }: { packs: OpenSpecPack[], onExportZip?: (p: OpenSpecPack) => void }) {
  const [expanded, setExpanded] = useState<Record<number, string>>({})

  if (packs.length === 0) return <EmptyState label="OpenSpec 提案包" />

  const toggle = (i: number, key: string) =>
    setExpanded(prev => prev[i] === key ? { ...prev, [i]: '' } : { ...prev, [i]: key })

  return (
    <div className="flex flex-col gap-4 p-4">
      {packs.map((pack, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">{pack.change_id}</span>
            <div className="flex gap-2">
              {onExportZip && (
                <button
                  onClick={() => onExportZip(pack)}
                  className="text-xs px-2.5 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  打 ZIP
                </button>
              )}
            </div>
          </div>

          {/* 可折叠各部分 */}
          {(['proposal_md', 'tasks_md', 'design_md'] as const).map(key => {
            const content = pack[key]
            if (!content) return null
            const isOpen = expanded[i] === key
            return (
              <div key={key} className="border-b border-gray-100 last:border-0">
                <button
                  onClick={() => toggle(i, key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <span>{key === 'proposal_md' ? '提案' : key === 'tasks_md' ? '任务清单' : '技术方案'}</span>
                  <span>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3">
                    <div className="flex justify-end mb-1">
                      <CopyButton text={content} />
                    </div>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto bg-gray-50 rounded p-2">
                      {content}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}

          {/* specs */}
          {pack.specs.length > 0 && (
            <div className="border-t border-gray-100">
              <button
                onClick={() => toggle(i, 'specs')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span>能力规格（{pack.specs.length} 项）</span>
                <span>{expanded[i] === 'specs' ? '▲' : '▼'}</span>
              </button>
              {expanded[i] === 'specs' && (
                <div className="px-3 pb-3 flex flex-col gap-2">
                  {pack.specs.map(s => (
                    <div key={s.capability} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50">
                        <span className="text-xs text-gray-600">{s.capability}</span>
                        <CopyButton text={s.spec_md} />
                      </div>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap p-2 max-h-40 overflow-auto">
                        {s.spec_md}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 展示书 tab ─────────────────────────────────────────────────
function ShowcaseTab({ showcases }: { showcases: Showcase[] }) {
  if (showcases.length === 0) return <EmptyState label="展示书" />
  return (
    <div className="flex flex-col gap-4 p-4">
      {showcases.map((sc, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-800">{sc.summary}</p>

          {sc.milestones.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">里程碑</p>
              <ul className="text-sm text-gray-700 space-y-0.5">
                {sc.milestones.map((m, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="text-gray-400 text-xs mt-0.5">{m.when}</span>
                    <span>{m.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sc.risks.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">风险</p>
              <ul className="text-sm text-amber-700 space-y-0.5">
                {sc.risks.map((r, j) => <li key={j}>· {r}</li>)}
              </ul>
            </div>
          )}

          {sc.mermaid && <MermaidBlock source={sc.mermaid} />}
        </div>
      ))}
    </div>
  )
}

// ── 验收清单 tab（借鉴 Kun /review，给不懂技术的人照着勾）────────────────────
function checklistToText(cl: AcceptanceChecklist): string {
  const lines = [`# ${cl.title}`, '', cl.intro, '']
  for (const g of cl.groups) {
    lines.push(`## ${g.module}`)
    for (const it of g.items) lines.push(`- [ ] ${it.what} —— ${it.how}`)
    lines.push('')
  }
  return lines.join('\n')
}

function ChecklistCard({ cl }: { cl: AcceptanceChecklist }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const keys: string[] = []
  cl.groups.forEach((g, gi) => g.items.forEach((_, ii) => keys.push(`${gi}-${ii}`)))
  const done = keys.filter(k => checked[k]).length
  const total = keys.length
  const pct = total ? done / total : 0

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5" style={{ color: '#3F6BFF' }}>
            <IconClipboardCheck size={15} />{cl.title}
          </span>
          <CopyButton text={checklistToText(cl)} />
        </div>
        <p className="text-[11.5px] text-gray-500 leading-relaxed mb-2">{cl.intro}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct * 100}%`, background: done === total && total > 0 ? '#10b981' : '#3F6BFF' }} />
          </div>
          <span className="text-[11px] font-medium tabular-nums" style={{ color: done === total && total > 0 ? '#059669' : '#3F6BFF' }}>{done}/{total} 已核对</span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-4">
        {cl.groups.map((g, gi) => (
          <div key={gi}>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">{g.module}</div>
            <div className="flex flex-col gap-1.5">
              {g.items.map((it, ii) => {
                const key = `${gi}-${ii}`
                const on = !!checked[key]
                return (
                  <button key={ii} onClick={() => setChecked(p => ({ ...p, [key]: !p[key] }))}
                    className="flex items-start gap-2.5 text-left rounded-lg px-2.5 py-2 transition-colors"
                    style={{ background: on ? 'rgba(16,185,129,0.06)' : '#fff', border: `1px solid ${on ? 'rgba(16,185,129,0.3)' : '#eef1f7'}` }}>
                    <span className="w-[18px] h-[18px] rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 transition-all"
                      style={{ background: on ? '#10b981' : '#fff', border: on ? '2px solid #10b981' : '2px solid #CBD5E1' }}>
                      {on && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    <span className="min-w-0">
                      <span className="text-[13px] font-medium block leading-snug" style={{ color: on ? '#065f46' : '#1e2338', textDecoration: on ? 'line-through' : 'none' }}>{it.what}</span>
                      <span className="text-[11.5px] text-gray-500 block leading-relaxed mt-0.5">怎么算过：{it.how}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChecklistTab({ checklists }: { checklists: AcceptanceChecklist[] }) {
  if (checklists.length === 0) return <EmptyState label="验收清单" />
  return (
    <div className="flex flex-col gap-4 p-4">
      {checklists.map((cl, i) => <ChecklistCard key={i} cl={cl} />)}
    </div>
  )
}

// ── 地基体检 tab（核心差异化：把看不见的地基显性化）────────────────────────────
const RISK_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  high:   { label: '高危', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  medium: { label: '需注意', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  low:    { label: '还好', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
}
function foundationToText(r: FoundationReport): string {
  const lines = [`# ${r.title}`, '', r.intro, '']
  for (const it of r.items) {
    lines.push(`## [${RISK_CFG[it.risk]?.label ?? it.risk}] ${it.area}`)
    lines.push(`是什么：${it.plain}`)
    lines.push(`不管的话：${it.ifIgnored}`)
    lines.push(`该怎么做：${it.todo}`, '')
  }
  return lines.join('\n')
}
function FoundationCard({ report }: { report: FoundationReport }) {
  const counts = { high: 0, medium: 0, low: 0 } as Record<string, number>
  report.items.forEach(it => { counts[it.risk] = (counts[it.risk] ?? 0) + 1 })
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#3F6BFF' }}>
            <IconShield size={15} />{report.title}
          </span>
          <CopyButton text={foundationToText(report)} />
        </div>
        <p className="text-[11.5px] text-gray-500 leading-relaxed">{report.intro}</p>
        <div className="flex gap-1.5 mt-2">
          {(['high', 'medium', 'low'] as const).filter(k => counts[k]).map(k => (
            <span key={k} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: RISK_CFG[k].color, background: RISK_CFG[k].bg, border: `1px solid ${RISK_CFG[k].border}` }}>
              {RISK_CFG[k].label} {counts[k]}
            </span>
          ))}
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2.5">
        {report.items.map((it, i) => {
          const r = RISK_CFG[it.risk] ?? RISK_CFG.medium
          return (
            <div key={i} className="rounded-xl p-3" style={{ background: r.bg, border: `1px solid ${r.border}` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: r.color }}>{r.label}</span>
                <span className="text-[13px] font-bold" style={{ color: '#1e2338' }}>{it.area}</span>
              </div>
              <p className="text-[12px] text-gray-700 leading-relaxed mb-2">{it.plain}</p>
              <div className="flex items-start gap-2 text-[11.5px] leading-relaxed mb-1">
                <span className="font-bold flex-shrink-0" style={{ color: r.color }}>不管的话</span>
                <span className="text-gray-700">{it.ifIgnored}</span>
              </div>
              <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
                <span className="font-bold flex-shrink-0" style={{ color: '#059669' }}>该怎么做</span>
                <span className="text-gray-700">{it.todo}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
function FoundationTab({ foundations }: { foundations: FoundationReport[] }) {
  if (foundations.length === 0) return <EmptyState label="地基体检" />
  return (
    <div className="flex flex-col gap-4 p-4">
      {foundations.map((r, i) => <FoundationCard key={i} report={r} />)}
    </div>
  )
}

// ── 主组件 ─────────────────────────────────────────────────────
const TABS = [
  { key: 'tree',     label: '决策树' },
  { key: 'prompt',   label: '阶段指令' },
  { key: 'openspec', label: '提案包' },
  { key: 'foundation', label: '地基体检' },
  { key: 'checklist', label: '验收清单' },
  { key: 'showcase', label: '展示书' },
] as const

type TabKey = typeof TABS[number]['key']

export function DeckPanel({ prompts, openspec_packs, showcases, checklists, foundations, decisions, onExportZip }: Props) {
  const [tab, setTab] = useState<TabKey>(() => {
    if (openspec_packs.length) return 'openspec'
    if (foundations.length) return 'foundation'
    if (checklists.length) return 'checklist'
    if (showcases.length) return 'showcase'
    if (prompts.length) return 'prompt'
    return 'tree'
  })

  const counts: Record<TabKey, number> = {
    tree:     decisions.length,
    prompt:   prompts.length,
    openspec: openspec_packs.length,
    foundation: foundations.length,
    checklist: checklists.length,
    showcase: showcases.length,
  }

  // 有新交付物生成时自动跳到对应 tab，避免用户还停在旧 tab 没发现新内容
  const prevCounts = useRef(counts)
  useEffect(() => {
    if (counts.openspec > prevCounts.current.openspec) setTab('openspec')
    else if (counts.foundation > prevCounts.current.foundation) setTab('foundation')
    else if (counts.checklist > prevCounts.current.checklist) setTab('checklist')
    else if (counts.showcase > prevCounts.current.showcase) setTab('showcase')
    else if (counts.prompt > prevCounts.current.prompt) setTab('prompt')
    prevCounts.current = counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.openspec, counts.foundation, counts.checklist, counts.showcase, counts.prompt])

  return (
    <div className="flex flex-col h-full">
      {/* tab 头 */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-[11px] py-2.5 font-medium transition-colors relative ${
              tab === t.key ? '' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={tab === t.key ? { color: '#007AFF', borderBottom: '2px solid #007AFF' } : {}}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className="ml-0.5 text-[9px] rounded-full px-1.5 py-0.5"
                style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* tab 内容 */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {tab === 'tree'      && <DecisionTree decisions={decisions} />}
        {tab === 'prompt'    && <PromptsTab   prompts={prompts} />}
        {tab === 'openspec'  && <OpenSpecTab  packs={openspec_packs} onExportZip={onExportZip} />}
        {tab === 'foundation' && <FoundationTab foundations={foundations} />}
        {tab === 'checklist' && <ChecklistTab checklists={checklists} />}
        {tab === 'showcase'  && <ShowcaseTab  showcases={showcases} />}
      </div>
    </div>
  )
}
