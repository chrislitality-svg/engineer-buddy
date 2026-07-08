import type { Stage } from '../engine/slots'
import type { EffectiveRole } from '../roles/store'
import { IconSpark, IconPlus, IconCheck, STAGE_ICON } from './icons'

const STAGES: { id: Stage; cn: string; desc: string }[] = [
  { id: 'discovery', cn: '摸清想法', desc: '了解你想做什么' },
  { id: 'scope',     cn: '划定范围', desc: '确定做什么' },
  { id: 'approach',  cn: '挑选做法', desc: '技术路线' },
  { id: 'plan',      cn: '拆成步骤', desc: '执行计划' },
  { id: 'deliver',   cn: '打包交付', desc: '生成方案' },
]

interface Props {
  currentStage: Stage
  role: EffectiveRole
  onReset: () => void
}

export function ProgressPanel({ currentStage, role, onReset }: Props) {
  const currentIdx = STAGES.findIndex(s => s.id === currentStage)
  const pct = currentIdx / (STAGES.length - 1)
  const accent = role.accent

  return (
    <div style={{
      width: 208, flexShrink: 0, height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', borderRight: '1px solid var(--line)',
    }}>
      {/* Logo + 角色 */}
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(145deg, #3F6BFF, #3454D1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 3px 10px rgba(63,107,255,0.3)',
          }}><IconSpark size={16} /></div>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.01em' }}>方案工坊</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 12,
          background: `${accent}0d`, border: `1px solid ${accent}22`,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(145deg, ${accent}, ${role.accent2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12.5, fontWeight: 700,
          }}>{role.short}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {role.name}主领
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              产品团队 · 全程接力
            </div>
          </div>
        </div>
      </div>

      {/* 进度 */}
      <div style={{ flex: 1, padding: '18px 16px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-400)', marginBottom: 14, fontWeight: 600 }}>
          进度
        </div>

        <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', marginBottom: 20, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, transition: 'width 0.7s var(--ease-out)',
            width: `${pct * 100}%`, background: `linear-gradient(90deg, ${accent}, ${role.accent2})`,
          }}/>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 13, top: 22, width: 2, height: `${(STAGES.length - 1) * 56}px`, background: 'var(--line)', borderRadius: 2 }}/>
          <div style={{
            position: 'absolute', left: 13, top: 22, width: 2,
            height: `${pct * (STAGES.length - 1) * 56}px`,
            background: `linear-gradient(to bottom, ${accent}, ${role.accent2})`,
            transition: 'height 0.6s var(--ease-out)', borderRadius: 2,
          }}/>

          {STAGES.map((stage, idx) => {
            const isActive = stage.id === currentStage
            const isDone = idx < currentIdx
            const StageIcon = STAGE_ICON[stage.id]
            return (
              <div key={stage.id} style={{
                position: 'relative', display: 'flex', alignItems: 'flex-start',
                gap: 11, marginBottom: idx < STAGES.length - 1 ? 34 : 0,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', zIndex: 1, transition: 'all 0.3s var(--ease-out)',
                  ...(isActive ? {
                    background: `linear-gradient(145deg, ${accent}, ${role.accent2})`, color: '#fff',
                    boxShadow: `0 0 0 4px ${accent}22, 0 4px 10px ${accent}44`,
                  } : isDone ? {
                    background: '#10b981', color: '#fff',
                  } : {
                    background: 'var(--surface-3)', color: 'var(--ink-300)',
                  }),
                }}>
                  {isDone ? <IconCheck size={15} /> : <StageIcon size={15} strokeWidth={2} />}
                </div>

                <div style={{ paddingTop: 4, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: isActive ? 700 : 500, lineHeight: 1.3,
                    color: isActive ? accent : isDone ? 'var(--ink-700)' : 'var(--ink-400)',
                  }}>{stage.cn}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: isActive ? `${accent}bb` : 'var(--ink-300)' }}>
                    {stage.desc}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 新对话 */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line-soft)' }}>
        <button
          onClick={onReset}
          className="btn-press"
          style={{
            width: '100%', padding: '8px 0', fontSize: 12.5, borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            background: 'var(--surface-2)', color: 'var(--ink-500)', border: '1px solid var(--line)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
        >
          <IconPlus size={14} /> 新方案 / 重新开始
        </button>
      </div>
    </div>
  )
}
