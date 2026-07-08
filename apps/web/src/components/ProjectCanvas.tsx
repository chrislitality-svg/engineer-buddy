// 项目蓝图：深色玻璃卡，随对话逐步填充
import type { Stage, Domain, SlotDef } from '../engine/slots'
import { SLOTS } from '../engine/slots'

interface Props {
  slots: Record<string, unknown>
  domain: Domain
  currentStage: Stage
}

export const STAGE_ORDER: Stage[] = ['discovery', 'scope', 'approach', 'plan', 'deliver']

const STAGE_CN: Record<Stage, string> = {
  discovery: '摸清想法',
  scope:     '划定范围',
  approach:  '挑选做法',
  plan:      '拆成步骤',
  deliver:   '打包交付',
}

function isFilled(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return false
  if (Array.isArray(v) && v.length === 0) return false
  return true
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return (v as string[]).join('、')
  return String(v)
}

export function ProjectCanvas({ slots, domain, currentStage }: Props) {
  const currentDefs = SLOTS.filter(s => s.stage === currentStage && s.domains.includes(domain))
  const pastStages = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(currentStage))
  const filledInCurrent = currentDefs.filter(d => isFilled(slots[d.key])).length

  // 找第一个有值的 slot 作为标题
  const titleSlot = SLOTS.find(
    s => s.domains.includes(domain) && s.stage === 'discovery' && isFilled(slots[s.key])
  )
  const rawTitle = titleSlot ? formatValue(slots[titleSlot.key]) : null
  const title = rawTitle ? (rawTitle.length > 22 ? rawTitle.slice(0, 22) + '…' : rawTitle) : null

  return (
    <div className="w-full max-w-2xl relative z-30 px-4">
      <div
        className="rounded-3xl p-5 transition-all duration-700"
        style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 20px 60px rgba(63,107,255,0.12), 0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        {/* 标题行 */}
        <div
          className="flex items-center justify-between mb-5 pb-4"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
        >
          <h2 className="text-xl font-light flex items-center gap-2.5" style={{ color: '#1e293b' }}>
            <span style={{ color: '#3F6BFF', fontSize: '1.1rem' }}>✦</span>
            {title ? (
              <>正在成型：<span className="font-medium" style={{ color: '#3b82f6' }}>{title}</span></>
            ) : (
              <span className="font-medium" style={{ color: '#3b82f6' }}>你的想法</span>
            )}
          </h2>
          <div
            className="text-xs px-3 py-1 rounded-full shrink-0"
            style={{
              color: '#2563eb',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.18)',
            }}
          >
            {STAGE_CN[currentStage]} {filledInCurrent}/{currentDefs.length}
          </div>
        </div>

        {/* 当前阶段 slots 网格 */}
        {currentDefs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentDefs.map((def: SlotDef, idx) => {
              const value = slots[def.key]
              const filled = isFilled(value)
              return (
                <div
                  key={def.key}
                  className="p-4 rounded-2xl transition-all duration-500 animate-fade-in-scale"
                  style={{
                    animationDelay: `${idx * 80}ms`,
                    ...(filled ? {
                      background: '#f8faff',
                      border: '1px solid rgba(63,107,255,0.15)',
                    } : {
                      background: '#FAFBFC',
                      border: '1px dashed #E2E8F0',
                      opacity: 0.7,
                    }),
                  }}
                >
                  <div
                    className="text-xs uppercase tracking-wider mb-2"
                    style={{ color: '#3F6BFF' }}
                  >
                    {def.label}
                  </div>
                  <div
                    className={`text-sm leading-relaxed transition-all duration-300 ${filled ? '' : 'blur-[3px] select-none'}`}
                    style={{ color: filled ? '#1e293b' : '#94A3B8' }}
                  >
                    {filled ? formatValue(value) : '待补充'}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="text-3xl opacity-20">🏗️</div>
            <p className="text-xs text-center" style={{ color: '#334155' }}>
              开始对话后，回答会填充到这里
            </p>
          </div>
        )}

        {/* 已完成阶段 - 底部小标记 */}
        {pastStages.length > 0 && (
          <div
            className="mt-5 pt-4 flex items-center justify-center gap-5 flex-wrap"
            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            {pastStages.map(stage => {
              const defs = SLOTS.filter(s => s.stage === stage && s.domains.includes(domain))
              const filled = defs.filter(d => isFilled(slots[d.key])).length
              return (
                <div key={stage} className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }}
                  />
                  <span className="text-xs" style={{ color: '#334155' }}>
                    {STAGE_CN[stage]} {filled}/{defs.length}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
