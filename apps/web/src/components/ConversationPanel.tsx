import { useRef, useEffect, useState } from 'react'
import { ChatThread } from './ChatThread'
import { Dock } from './Dock'
import type { Turn } from '../engine/protocol'
import type { EffectiveRole } from '../roles/store'
import { IconPackage, IconChevron, IconClipboardCheck, IconShield } from './icons'
import { ROLE_DEFS } from '../roles/roster'

interface DisplayMsg { role: 'user' | 'assistant'; content: string }

interface Props {
  role: EffectiveRole
  displayMsgs: DisplayMsg[]
  currentTurn: Turn | null
  loading: boolean
  error: string
  onAnswer: (value: string | string[] | number) => void
  onGeneratePack: () => void
  packGenerating: boolean
  onGenerateChecklist: () => void
  checklistGenerating: boolean
  onGenerateFoundation: () => void
  foundationGenerating: boolean
  currentStage: string
  slots: Record<string, unknown>
}

// deliver 审核：展示 AI 收集到的关键需求，让用户先核对
const REVIEW_FIELDS: { key: string; label: string }[] = [
  { key: 'product_one_liner', label: '想做什么' },
  { key: 'target_user', label: '给谁用' },
  { key: 'pain_point', label: '解决什么' },
  { key: 'must_have', label: '必须有的' },
  { key: 'form_factor', label: '做成什么' },
  { key: 'modules', label: '分几块' },
]
function fmtSlot(v: unknown): string {
  if (Array.isArray(v)) return (v as string[]).join('、')
  return v == null ? '' : String(v)
}

export function ConversationPanel({
  role, displayMsgs, currentTurn, loading, error,
  onAnswer, onGeneratePack, packGenerating, onGenerateChecklist, checklistGenerating,
  onGenerateFoundation, foundationGenerating, currentStage, slots,
}: Props) {
  const interaction = currentTurn?.interaction ?? { type: 'text' as const, key: '_raw', label: '请继续' }
  const [showInfo, setShowInfo] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const accent = role.accent

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [displayMsgs, loading])

  return (
    <div style={{
      width: 392, flexShrink: 0, height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', borderLeft: '1px solid var(--line)',
    }}>
      {/* 搭子头部 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div className={loading ? 'eb-halo' : undefined} style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
            background: `linear-gradient(145deg, ${accent}, ${role.accent2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 700,
            boxShadow: `0 4px 12px ${accent}44`,
          }}>{role.short}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-900)' }}>产品团队</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-400)' }}>{role.name}主领 · 需要时叫专家</div>
          </div>
          <button
            onClick={() => setShowInfo(v => !v)}
            title="团队构成"
            className="btn-press"
            style={{
              padding: '4px 6px', borderRadius: 8, cursor: 'pointer',
              background: showInfo ? `${accent}12` : 'transparent',
              color: showInfo ? accent : 'var(--ink-400)', border: '1px solid var(--line)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <span style={{ transition: 'transform .2s', transform: showInfo ? 'rotate(180deg)' : 'none', display: 'inline-flex' }}>
              <IconChevron size={15} />
            </span>
          </button>
        </div>

        {showInfo && (
          <div className="animate-menu-in" style={{
            marginTop: 10, padding: '11px 12px', borderRadius: 12,
            background: `${accent}0a`, border: `1px solid ${accent}1f`,
          }}>
            <p style={{ fontSize: 11, color: '#334155', lineHeight: 1.6, margin: '0 0 9px' }}>
              你不用挑谁——聊到哪一段，对的人自动上场：
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {ROLE_DEFS.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: `linear-gradient(145deg, ${m.accent}, ${m.accent2})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700,
                  }}>{m.short}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-800)' }}>
                    <strong style={{ fontWeight: 600 }}>{m.name}</strong> · {m.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 消息区 */}
      <div
        ref={chatRef}
        style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}
        className="scrollbar-hide"
      >
        <ChatThread
          messages={displayMsgs}
          loading={loading}
          interaction={interaction}
          onSubmit={onAnswer}
          disabled={loading}
          accent={accent}
          variant="panel"
        />
      </div>

      {/* 错误 */}
      {error && (
        <div style={{ margin: '0 16px 8px', padding: '8px 12px', borderRadius: 10, fontSize: 12, background: '#fee2e2', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* 交付：先审核需求，再出提案包（分步，不并列） */}
      {currentStage === 'deliver' && (
        <div style={{ padding: '0 16px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '54vh', overflowY: 'auto' }} className="scrollbar-hide">
          {/* 第一步 · 审核 */}
          <div style={{ padding: '12px 13px', borderRadius: 14, background: `${accent}0a`, border: `1px solid ${accent}22` }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: accent, marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconClipboardCheck size={14} /> 第一步 · 先核对我理解得对不对
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {REVIEW_FIELDS.filter(f => fmtSlot(slots[f.key])).map(f => (
                <div key={f.key} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--ink-400)', flexShrink: 0, width: 52 }}>{f.label}</span>
                  <span style={{ color: 'var(--ink-800)', lineHeight: 1.55 }}>{fmtSlot(slots[f.key])}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 9, lineHeight: 1.6 }}>
              不对的话，直接在下面对话里跟我说改哪儿；核对没问题，再生成。
            </div>
          </div>

          {/* 第二步 · 生成（提案包为主，验收清单为辅） */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 9 }}>第二步 · 确认没问题，生成方案</div>
            <button
              onClick={onGeneratePack}
              disabled={packGenerating}
              className="btn-press"
              style={{
                width: '100%', padding: '12px', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                color: '#fff', background: `linear-gradient(135deg, ${accent}, ${role.accent2})`, border: 'none',
                borderRadius: 12, cursor: packGenerating ? 'not-allowed' : 'pointer',
                opacity: packGenerating ? 0.6 : 1, boxShadow: `0 6px 18px ${accent}44`,
              }}
            >
              <IconPackage size={16} />
              {packGenerating ? '生成中（约 30–90 秒）…' : '生成提案包 · 给程序员/AI 照着做'}
            </button>
            <button
              onClick={onGenerateFoundation}
              disabled={foundationGenerating}
              className="btn-press"
              style={{
                width: '100%', marginTop: 8, padding: '11px', fontSize: 12.5, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                color: accent, background: `${accent}0f`, border: `1px solid ${accent}3d`,
                borderRadius: 12, cursor: foundationGenerating ? 'not-allowed' : 'pointer',
                opacity: foundationGenerating ? 0.6 : 1,
              }}
            >
              <IconShield size={15} />
              {foundationGenerating ? '体检中（约 30–90 秒）…' : '地基体检 · 扫出你看不见的隐患'}
            </button>
            <button
              onClick={onGenerateChecklist}
              disabled={checklistGenerating}
              className="btn-press"
              style={{
                width: '100%', marginTop: 8, padding: '9px', fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                color: 'var(--ink-500)', background: 'transparent', border: '1px solid var(--line)',
                borderRadius: 10, cursor: checklistGenerating ? 'not-allowed' : 'pointer',
                opacity: checklistGenerating ? 0.6 : 1,
              }}
            >
              <IconClipboardCheck size={14} />
              {checklistGenerating ? '生成中…' : '再来一份 · 给你自己核对的验收清单'}
            </button>
            <div style={{ fontSize: 10.5, color: 'var(--ink-400)', textAlign: 'center', lineHeight: 1.6, marginTop: 8 }}>
              生成后都显示在中间画板"打包交付"卡片里
            </div>
          </div>
        </div>
      )}

      {/* 输入 */}
      <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
        <Dock interaction={interaction} onSubmit={onAnswer} disabled={loading} accent={accent} />
      </div>
    </div>
  )
}
