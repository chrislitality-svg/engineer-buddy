// §T020 StageSpine：五阶段脊柱 — Apple 风格配色 + 大行距
import type { Stage, SlotDef } from '../engine/slots'

const STAGE_LABELS: Record<Stage, string> = {
  discovery: '摸清想法',
  scope:     '划定范围',
  approach:  '挑选做法',
  plan:      '拆成步骤',
  deliver:   '打包交付',
}

const STAGE_ICON: Record<Stage, string> = {
  discovery: '💬',
  scope:     '🎯',
  approach:  '⚡',
  plan:      '📋',
  deliver:   '📦',
}

const STAGE_STEPS: Record<Stage, string[]> = {
  discovery: ['核心想法', '目标用户', '要解决的痛点', '现有替代方案'],
  scope:     ['必须有的功能', '可以先砍的', '明确不做的', '范围确认'],
  approach:  ['产品形态', '核心取舍', '时间预算', '技术路线'],
  plan:      ['功能模块划分', '验收标准', '开发优先级', '里程碑'],
  deliver:   ['阶段指令', 'OpenSpec 包', '展示书导出'],
}

const STAGE_ORDER: Stage[] = ['discovery', 'scope', 'approach', 'plan', 'deliver']

// Apple 色板
const APPLE_BLUE   = '#007AFF'
const APPLE_GREEN  = '#34C759'
const APPLE_BLUE_L = 'rgba(0,122,255,0.18)'
const APPLE_GREEN_L= 'rgba(52,199,89,0.2)'

interface Props {
  currentStage: Stage
  stageProgress: number
  gaps: SlotDef[]
}

export function StageSpine({ currentStage, stageProgress, gaps }: Props) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage)

  return (
    <div className="py-5 px-3.5 select-none">
      {/* Header */}
      <div className="text-[10px] font-semibold uppercase tracking-widest mb-5 px-1" style={{ color: '#aeaeb2' }}>
        进度
      </div>

      {STAGE_ORDER.map((stage, i) => {
        const isCurrent = stage === currentStage
        const isDone    = i < currentIndex
        const isFuture  = i > currentIndex
        const isLast    = i === STAGE_ORDER.length - 1
        const steps     = STAGE_STEPS[stage]

        return (
          <div key={stage} className="flex gap-2.5">
            {/* Left: dot + line */}
            <div className="flex flex-col items-center w-5 flex-shrink-0">
              {/* Dot */}
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-500"
                style={
                  isDone
                    ? { background: APPLE_GREEN }
                    : isCurrent
                    ? {
                        background: APPLE_BLUE,
                        boxShadow: `0 0 0 3px ${APPLE_BLUE_L}`,
                      }
                    : { background: '#e5e5ea' }
                }
              >
                {isDone && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isCurrent && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className="w-px flex-1 my-1 rounded-full transition-all duration-700"
                  style={{
                    minHeight: 16,
                    background: isDone
                      ? `linear-gradient(to bottom, ${APPLE_GREEN}, ${APPLE_GREEN_L})`
                      : isCurrent
                      ? `linear-gradient(to bottom, ${APPLE_BLUE_L}, #e5e5ea)`
                      : '#e5e5ea',
                  }}
                />
              )}
            </div>

            {/* Right: content */}
            <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
              {/* Stage title */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="text-sm font-semibold leading-none transition-all duration-300"
                  style={
                    isDone
                      ? { color: '#aeaeb2', textDecoration: 'line-through', textDecorationColor: '#c7c7cc' }
                      : isCurrent
                      ? { color: APPLE_BLUE }
                      : { color: '#c7c7cc' }
                  }
                >
                  {STAGE_LABELS[stage]}
                </span>
                {isCurrent && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold text-white leading-none"
                    style={{ background: APPLE_BLUE }}
                  >
                    进行中
                  </span>
                )}
              </div>

              {/* Current stage detail */}
              {isCurrent && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {/* Progress bar */}
                  <div className="h-[3px] rounded-full overflow-hidden" style={{ background: APPLE_BLUE_L }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${stageProgress}%`,
                        background: APPLE_BLUE,
                        boxShadow: stageProgress > 0 ? `0 0 6px rgba(0,122,255,0.45)` : 'none',
                      }}
                    />
                  </div>

                  {/* Sub-steps */}
                  {steps.map((step, si) => {
                    const doneThresh = ((si + 1) / steps.length) * 100
                    const activThresh = (si / steps.length) * 100
                    const done   = stageProgress >= doneThresh
                    const active = !done && stageProgress > activThresh
                    return (
                      <div
                        key={si}
                        className="flex items-center gap-1 text-[11px] leading-[1.7] transition-colors duration-300"
                        style={{
                          color: done ? APPLE_GREEN : active ? APPLE_BLUE : '#c7c7cc',
                          fontWeight: active ? 500 : 400,
                        }}
                      >
                        <span className="flex-shrink-0 w-3 text-center">
                          {done ? '✓' : active ? '›' : '·'}
                        </span>
                        <span style={done ? { textDecoration: 'line-through', textDecorationColor: APPLE_GREEN_L } : {}}>
                          {step}
                        </span>
                      </div>
                    )
                  })}

                  {/* Gaps */}
                  {gaps.length > 0 && (
                    <div className="flex flex-col gap-1 mt-0.5">
                      {gaps.map(gap => (
                        <div
                          key={gap.key}
                          className="flex items-center gap-1 text-[10px] rounded-md px-1.5 py-0.5 border leading-[1.65]"
                          style={{
                            color: '#ff9f0a',
                            background: 'rgba(255,159,10,0.08)',
                            borderColor: 'rgba(255,159,10,0.2)',
                          }}
                        >
                          <span className="flex-shrink-0 font-bold">!</span>
                          <span className="truncate">{gap.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {gaps.length === 0 && stageProgress === 100 && (
                    <div className="text-[11px] font-semibold" style={{ color: APPLE_GREEN }}>
                      ✓ 阶段完成
                    </div>
                  )}
                </div>
              )}

              {/* Future stages preview */}
              {isFuture && (
                <div className="flex flex-col gap-0.5 mt-1.5">
                  {steps.map((step, si) => (
                    <div key={si} className="flex items-center gap-1 text-[10px] leading-[1.65]" style={{ color: '#d1d1d6' }}>
                      <span className="flex-shrink-0 w-3 text-center">·</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Done stage summary */}
              {isDone && (
                <div className="text-[10px] mt-0.5 leading-[1.65]" style={{ color: '#aeaeb2' }}>
                  {STAGE_ICON[stage]} {steps.length} 项已完成
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
