// ChatThread — 富分析内联选项（大白话解释 + 好处/代价/适合谁/后续 + 搭子推荐）
import { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import type { Interaction, OptionDetail, Recommendation } from '../engine/protocol'
import { IconChevron, IconArrow } from './icons'

interface BubbleMessage { role: 'user' | 'assistant'; content: string }

interface Props {
  messages: BubbleMessage[]
  loading: boolean
  interaction?: Interaction
  onSubmit?: (value: string | string[] | number) => void
  disabled?: boolean
  maxMessages?: number
  accent?: string
  variant?: 'overlay' | 'panel'
}

marked.setOptions({ breaks: true })

// Siri 声波配色（紫→蓝→青），让"AI 正在想"有生命感
const SIRI_COLORS = ['#a855f7', '#3454D1', '#3F6BFF', '#3b82f6', '#0ea5e9', '#22d3ee', '#06b6d4']

function MarkdownBubble({ content }: { content: string }) {
  const html = marked.parse(content) as string
  return (
    <div
      className="prose prose-sm max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>p:last-child]:mb-0 [&_strong]:font-semibold [&_li]:leading-[1.75] [&_p]:leading-[1.75]"
      style={{ color: '#374151' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ── 搭子推荐横幅 ───────────────────────────────────────────────────────────────
function RecoBanner({ reco, accent }: { reco: Recommendation; accent: string }) {
  return (
    <div className="animate-fade-in-scale" style={{
      display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 14, marginBottom: 2,
      background: `linear-gradient(135deg, ${accent}12, ${accent}06)`,
      border: `1px solid ${accent}2e`,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 8, flexShrink: 0, marginTop: 1,
        background: `linear-gradient(145deg, ${accent}, ${accent}cc)`, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconArrow size={14} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 2 }}>
          团队建议：{reco.pick}
        </div>
        <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.65 }}>{reco.why}</div>
      </div>
    </div>
  )
}

// ── 单个选项卡（富分析）───────────────────────────────────────────────────────
function OptionPill({
  detail, active, mode, onClick, disabled, accent, recommended,
}: {
  detail: OptionDetail
  active: boolean
  mode: 'single' | 'multi'
  onClick: () => void
  disabled: boolean
  accent: string
  recommended: boolean
}) {
  const [open, setOpen] = useState(false)
  const hasDetails = detail.pros.length > 0 || detail.cons.length > 0 || !!detail.branch_impact || !!detail.fit

  return (
    <div
      className="rounded-2xl border transition-all duration-200"
      style={active ? {
        background: `${accent}0d`, borderColor: `${accent}59`, boxShadow: `0 2px 10px ${accent}1a`,
      } : {
        background: '#ffffff', borderColor: recommended ? `${accent}3a` : 'rgba(15,18,34,0.08)',
        boxShadow: recommended ? `0 2px 10px ${accent}14` : '0 1px 3px rgba(15,18,34,0.05)',
      }}
    >
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <button
          disabled={disabled}
          onClick={onClick}
          className="flex items-start gap-2.5 flex-1 text-left disabled:cursor-not-allowed"
        >
          <div
            className="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center transition-all duration-200 mt-0.5"
            style={{
              borderRadius: mode === 'single' ? '50%' : '6px',
              border: active ? `2px solid ${accent}` : '2px solid #CBD5E1',
              background: active ? accent : '#fff',
            }}
          >
            {active && mode === 'single' && <div className="w-2 h-2 rounded-full bg-white" />}
            {active && mode === 'multi' && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm leading-[1.5]" style={{ color: active ? accent : '#1e2338', fontWeight: 600 }}>
                {detail.value}
              </span>
              {recommended && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: accent, borderRadius: 999, padding: '1px 6px' }}>
                  推荐
                </span>
              )}
            </div>
            {detail.plain && (
              <p className="text-[12px] leading-[1.6] mt-1" style={{ color: '#64748B' }}>{detail.plain}</p>
            )}
          </div>
        </button>

        {hasDetails && (
          <button
            onClick={() => setOpen(v => !v)}
            className="flex-shrink-0 flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full transition-colors mt-0.5"
            style={open ? { background: `${accent}1a`, color: accent } : { background: '#EEF2F7', color: '#64748B' }}
          >
            细看
            <span style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-flex' }}>
              <IconChevron size={11} />
            </span>
          </button>
        )}
      </div>

      {open && hasDetails && (
        <div className="px-3.5 pb-3 border-t flex flex-col gap-2 pt-2.5" style={{ borderColor: '#EEF2F7' }}>
          {detail.pros.length > 0 && (
            <div className="flex flex-col gap-1">
              {detail.pros.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-[11.5px] leading-[1.7]">
                  <span className="font-bold flex-shrink-0" style={{ color: '#059669' }}>好处</span>
                  <span style={{ color: '#334155' }}>{p}</span>
                </div>
              ))}
            </div>
          )}
          {detail.cons.length > 0 && (
            <div className="flex flex-col gap-1">
              {detail.cons.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-[11.5px] leading-[1.7]">
                  <span className="font-bold flex-shrink-0" style={{ color: '#dc2626' }}>代价</span>
                  <span style={{ color: '#334155' }}>{c}</span>
                </div>
              ))}
            </div>
          )}
          {detail.fit && (
            <div className="flex items-start gap-2 text-[11.5px] leading-[1.7]">
              <span className="font-bold flex-shrink-0" style={{ color: '#3454D1' }}>适合</span>
              <span style={{ color: '#334155' }}>{detail.fit}</span>
            </div>
          )}
          {detail.branch_impact && (
            <div
              className="flex items-start gap-2 text-[11.5px] rounded-xl px-2.5 py-2 leading-[1.7]"
              style={{ background: `${accent}0d`, color: accent }}
            >
              <span className="font-bold flex-shrink-0">接下来</span>
              <span style={{ color: '#334155' }}>{detail.branch_impact}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 自填行 ────────────────────────────────────────────────────────────────────
function CustomWriteIn({
  mode, active, disabled, text, onToggle, onChange, accent,
}: {
  mode: 'single' | 'multi'
  active: boolean
  disabled: boolean
  text: string
  onToggle: () => void
  onChange: (v: string) => void
  accent: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (active) inputRef.current?.focus() }, [active])

  return (
    <div className="rounded-2xl border transition-all duration-200" style={{
      background: active ? `${accent}0a` : '#ffffff',
      borderColor: active ? `${accent}4d` : 'rgba(15,18,34,0.08)',
      boxShadow: active ? `0 1px 6px ${accent}14` : '0 1px 3px rgba(15,18,34,0.04)',
    }}>
      <button
        disabled={disabled}
        onClick={onToggle}
        className="flex items-center gap-2.5 w-full px-3.5 py-3 text-left disabled:cursor-not-allowed"
      >
        <div className="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center" style={{
          borderRadius: mode === 'single' ? '50%' : '6px',
          border: active ? `2px solid ${accent}` : '2px solid #CBD5E1',
          background: active ? accent : 'white',
        }}>
          {active && mode === 'single' && <div className="w-2 h-2 rounded-full bg-white" />}
          {active && mode === 'multi' && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          )}
        </div>
        <span className="text-sm" style={{ color: active ? accent : '#94A3B8', fontWeight: active ? 600 : 400 }}>
          其他（自己说）…
        </span>
      </button>
      {active && (
        <div className="px-3.5 pb-3 flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={e => onChange(e.target.value)}
            placeholder="用大白话写下你的想法…"
            className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
            style={{ background: '#FAFBFC', border: '1px solid #E2E8F0', color: '#1e293b' }}
          />
        </div>
      )}
    </div>
  )
}

// ── 内联选项组 ────────────────────────────────────────────────────────────────
function InlineOptions({
  interaction, onSubmit, disabled, accent,
}: {
  interaction: Interaction
  onSubmit: (v: string | string[] | number) => void
  disabled: boolean
  accent: string
}) {
  const { type, options = [], option_details, recommendation } = interaction
  const [selected, setSelected] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customText, setCustomText] = useState('')

  useEffect(() => {
    setSelected([]); setSubmitted(false); setShowCustom(false); setCustomText('')
  }, [interaction.key])

  if (submitted) return null

  const items: OptionDetail[] = option_details?.length
    ? option_details
    : options.map(o => ({ value: o, pros: [], cons: [], branch_impact: '' }))

  const recoPick = recommendation?.pick

  if (type === 'single_select') {
    return (
      <div className="flex flex-col gap-2 w-full">
        {recommendation && <RecoBanner reco={recommendation} accent={accent} />}
        {items.map(item => (
          <OptionPill
            key={item.value} detail={item} active={false} mode="single" disabled={disabled} accent={accent}
            recommended={item.value === recoPick}
            onClick={() => { if (!disabled) { setSubmitted(true); onSubmit(item.value) } }}
          />
        ))}
        <CustomWriteIn
          mode="single" active={showCustom} disabled={disabled} text={customText} accent={accent}
          onToggle={() => { if (!disabled) setShowCustom(v => !v) }}
          onChange={setCustomText}
        />
        {showCustom && (
          <button
            onClick={() => { if (customText.trim()) { setSubmitted(true); onSubmit(customText.trim()) } }}
            disabled={!customText.trim()}
            className="self-start mt-0.5 px-4 py-1.5 text-sm text-white rounded-full btn-press disabled:opacity-30"
            style={{ background: accent, boxShadow: `0 2px 10px ${accent}4d` }}
          >
            确认
          </button>
        )}
      </div>
    )
  }

  if (type === 'multi_select') {
    const toggle = (v: string) =>
      setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
    const totalSelected = selected.length + (showCustom && customText.trim() ? 1 : 0)
    const handleConfirm = () => {
      const all = [...selected]
      if (showCustom && customText.trim()) all.push(customText.trim())
      if (all.length > 0) { setSubmitted(true); onSubmit(all) }
    }

    return (
      <div className="flex flex-col gap-2 w-full">
        {recommendation && <RecoBanner reco={recommendation} accent={accent} />}
        {items.map(item => (
          <OptionPill
            key={item.value} detail={item} active={selected.includes(item.value)} mode="multi" disabled={disabled} accent={accent}
            recommended={item.value === recoPick}
            onClick={() => { if (!disabled) toggle(item.value) }}
          />
        ))}
        <CustomWriteIn
          mode="multi" active={showCustom} disabled={disabled} text={customText} accent={accent}
          onToggle={() => { if (!disabled) { const next = !showCustom; setShowCustom(next); if (!next) setCustomText('') } }}
          onChange={setCustomText}
        />
        {totalSelected > 0 && (
          <button
            onClick={handleConfirm}
            className="self-start mt-1 px-4 py-1.5 text-sm text-white rounded-full btn-press"
            style={{ background: accent, boxShadow: `0 2px 10px ${accent}4d` }}
          >
            确认（已选 {totalSelected} 项）
          </button>
        )}
      </div>
    )
  }

  return null
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export function ChatThread({ messages, loading, interaction, onSubmit, disabled, maxMessages, accent = '#3F6BFF', variant = 'overlay' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const showInlineOptions = !loading &&
    interaction &&
    (interaction.type === 'single_select' || interaction.type === 'multi_select') &&
    onSubmit

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, interaction])

  const displayMsgs = maxMessages ? messages.slice(-maxMessages) : messages

  return (
    <div className={`w-full flex flex-col gap-2.5 ${variant === 'panel' ? 'flex-1 min-h-0' : 'overflow-y-auto scrollbar-hide max-h-[32vh] mask-top mb-3'}`}>
      {displayMsgs.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-scale`}
          style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
        >
          <div
            className="max-w-[86%] text-sm px-4 py-2.5 rounded-2xl"
            style={msg.role === 'user' ? {
              background: `linear-gradient(135deg, ${accent}, ${accent}dd)`, color: '#fff',
              boxShadow: `0 2px 10px ${accent}33`, borderBottomRightRadius: 6,
            } : {
              background: '#ffffff', color: '#1e2338',
              border: '1px solid rgba(15,18,34,0.07)', boxShadow: '0 1px 4px rgba(15,18,34,0.05)',
              borderBottomLeftRadius: 6,
            }}
          >
            {msg.role === 'assistant'
              ? <MarkdownBubble content={msg.content} />
              : <span style={{ lineHeight: 1.65 }}>{msg.content}</span>}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start animate-fade-in-scale">
          <div className="px-4 py-2.5 rounded-2xl flex items-center gap-2.5" style={{ background: '#fff', border: '1px solid rgba(15,18,34,0.07)', boxShadow: '0 1px 4px rgba(15,18,34,0.05)', borderBottomLeftRadius: 6 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 18 }}>
              {SIRI_COLORS.map((c, i) => (
                <span key={i} className="eb-wavebar" style={{ width: 3, height: '100%', borderRadius: 3, background: c, animationDelay: `${i * 0.09}s` }} />
              ))}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>正在想…</span>
          </div>
        </div>
      )}

      {showInlineOptions && (
        <div className="w-full animate-fade-in-scale" style={{ animationDelay: '80ms' }}>
          <InlineOptions interaction={interaction!} onSubmit={onSubmit!} disabled={!!disabled} accent={accent} />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
