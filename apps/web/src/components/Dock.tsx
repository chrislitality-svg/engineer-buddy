// Dock 输入框（select 已由 ChatThread 内联处理）
import { useState, useRef, useEffect } from 'react'
import type { Interaction } from '../engine/protocol'

interface Props {
  interaction: Interaction
  onSubmit: (value: string | string[] | number) => void
  disabled: boolean
  accent?: string
}

export function Dock({ interaction, onSubmit, disabled, accent = '#3F6BFF' }: Props) {
  const { type, label, slider, placeholder } = interaction
  const [text, setText] = useState('')
  const [sliderVal, setSliderVal] = useState(slider?.default ?? 3)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setText('')
    setSliderVal(slider?.default ?? 3)
  }, [interaction.key, slider?.default])

  useEffect(() => {
    if (type === 'text') textRef.current?.focus()
  }, [type, interaction.key])

  // 只有 none 才完全不显示；选择题(single/multi)也保留底部输入框，让用户能手动打字
  if (type === 'none') return null
  const isSelect = type === 'single_select' || type === 'multi_select'

  // ── slider ──
  if (type === 'slider' && slider) {
    return (
      <div className="w-full flex flex-col gap-3 mt-1">
        {label && <p className="text-xs font-medium text-center" style={{ color: '#64748B' }}>{label}</p>}
        <div className="flex items-center gap-3">
          <span className="text-xs w-14 text-right" style={{ color: '#334155' }}>{slider.minLabel}</span>
          <input
            type="range" min={slider.min} max={slider.max} value={sliderVal}
            disabled={disabled}
            onChange={e => setSliderVal(Number(e.target.value))}
            className="flex-1 disabled:opacity-50"
            style={{ accentColor: accent }}
          />
          <span className="text-xs w-14" style={{ color: '#334155' }}>{slider.maxLabel}</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm font-semibold" style={{ color: accent }}>{sliderVal}</span>
          <button
            disabled={disabled}
            onClick={() => onSubmit(sliderVal)}
            className="px-4 py-1.5 text-sm text-white rounded-full disabled:opacity-40 btn-press"
            style={{ background: accent, boxShadow: `0 2px 12px ${accent}4d` }}
          >
            确认
          </button>
        </div>
      </div>
    )
  }

  // ── text ──
  const submit = () => {
    if (text.trim()) { onSubmit(text.trim()); setText('') }
  }

  return (
    <form className="w-full relative group" onSubmit={e => { e.preventDefault(); submit() }}>
      <div className="absolute inset-0 rounded-2xl blur-md transition-all duration-300"
           style={{ background: text.trim() ? `${accent}1a` : 'transparent' }} />
      <div
        className="relative flex items-end rounded-2xl overflow-hidden"
        style={{ background: '#ffffff', border: `1px solid ${text.trim() ? accent + '55' : 'rgba(15,18,34,0.1)'}`, boxShadow: '0 2px 12px rgba(15,18,34,0.07)', transition: 'border-color .2s' }}
      >
        <textarea
          ref={textRef}
          rows={1}
          value={text}
          disabled={disabled}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder={placeholder || (isSelect ? '想说别的？也可以直接打字告诉我…' : (label || '用大白话说说你的想法…（Enter 发送）'))}
          aria-label={label || '输入回答'}
          className="flex-1 resize-none bg-transparent px-4 py-3.5 text-sm disabled:opacity-50 leading-[1.65] focus:outline-none scrollbar-hide"
          style={{ color: '#1e2338', caretColor: accent }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
          }}
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 p-2.5 m-1.5 rounded-xl transition-all duration-200 hover:scale-105"
          style={disabled ? { background: '#E2E8F0' } : text.trim() ? { background: accent, boxShadow: `0 2px 8px ${accent}4d` } : { background: '#EEF2F7' }}
        >
          {disabled ? (
            <svg className="w-4 h-4 animate-spin" style={{ color: '#94A3B8' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" style={{ color: text.trim() ? '#fff' : '#94A3B8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}
