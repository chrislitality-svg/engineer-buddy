import { useState, useEffect, useRef } from 'react'
import type { Stage, Domain } from '../engine/slots'
import { SLOTS } from '../engine/slots'
import type { Session } from '../engine/protocol'
import type { EffectiveRole } from '../roles/store'
import { DeckPanel } from './DeckPanel'
import { exportPackAsZip } from '../engine/deliverEngine'
import { IconRuler, IconMap, IconCheck, STAGE_ICON } from './icons'

interface Props { session: Session; role: EffectiveRole }

const STAGE_ORDER: Stage[] = ['discovery', 'scope', 'approach', 'plan', 'deliver']

const STAGE_CFG: Record<Stage, { label: string; color: string }> = {
  discovery: { label: '需求发现', color: '#3F6BFF' },
  scope:     { label: '功能范围', color: '#8b5cf6' },
  approach:  { label: '技术路线', color: '#d97706' },
  plan:      { label: '执行计划', color: '#10b981' },
  deliver:   { label: '交付产出', color: '#ec4899' },
}

function isFilled(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return false
  if (Array.isArray(v) && v.length === 0) return false
  return true
}
function fmt(v: unknown): string {
  if (Array.isArray(v)) return (v as string[]).join('、')
  return String(v)
}

// #rrggbb → rgba(r,g,b,a)，用于 CSS 变量（避免拼十六进制透明度失效）
function hexA(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return `rgba(63,107,255,${a})`
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`
}

// ── 进度环 ────────────────────────────────────────────────────────────────────
function ProgressRing({ pct, accent, size = 40 }: { pct: number; accent: string; size?: number }) {
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const off = c * (1 - pct)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 0.7s var(--ease-out)' }} />
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.26, fontWeight: 700, color: accent,
      }}>{Math.round(pct * 100)}</span>
    </div>
  )
}

// ── SVG 思维导图（科技感强化：引导环 + 连线绘制 + 中心进度 + 环绕光点）─────────────
function MindMapSVG({ slots, accent, accent2 }: { slots: Record<string, unknown>; domain: Domain; accent: string; accent2: string }) {
  const W = 760, H = 500, cx = 380, cy = 250
  const NODES: { key: string; angle: number; r: number; color: string; label: string }[] = [
    { key: 'target_user',        angle: -140, r: 150, color: '#3F6BFF', label: '目标用户' },
    { key: 'pain_point',         angle:  -90, r: 156, color: '#3F6BFF', label: '核心痛点' },
    { key: 'current_workaround', angle:  -40, r: 150, color: '#3F6BFF', label: '现有方案' },
    { key: 'must_have',          angle:    5, r: 156, color: '#8b5cf6', label: 'MVP 功能' },
    { key: 'nice_to_have',       angle:   50, r: 150, color: '#8b5cf6', label: '可选功能' },
    { key: 'form_factor',        angle:   95, r: 156, color: '#d97706', label: '产品形态' },
    { key: 'budget_time',        angle:  140, r: 150, color: '#d97706', label: '时间预算' },
    { key: 'modules',            angle: -175, r: 156, color: '#10b981', label: '模块拆分' },
  ]
  const nodes = NODES.map(n => {
    const rad = n.angle * (Math.PI / 180)
    const x = cx + n.r * Math.cos(rad)
    const y = cy + n.r * Math.sin(rad)
    const val = slots[n.key]
    const filled = isFilled(val)
    const raw = filled ? fmt(val) : ''
    const short = raw.length > 11 ? raw.slice(0, 11) + '…' : raw
    return { ...n, x, y, filled, short }
  })
  const title = isFilled(slots.product_one_liner) ? fmt(slots.product_one_liner) : '项目蓝图'
  const shortTitle = title.length > 12 ? title.slice(0, 12) + '…' : title
  const filledCount = nodes.filter(n => n.filled).length
  const cR = 58
  const arcC = 2 * Math.PI * (cR + 8)
  const arcOff = arcC * (1 - filledCount / nodes.length)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id="cg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity={0.98} />
          <stop offset="100%" stopColor={accent2} stopOpacity={0.9} />
        </radialGradient>
        <filter id="softglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* 引导同心环 */}
      {[110, 156, 200].map((rr, i) => (
        <circle key={rr} cx={cx} cy={cy} r={rr} fill="none" stroke={accent}
          strokeOpacity={0.09 - i * 0.02} strokeWidth={1} strokeDasharray="3 6" />
      ))}
      {/* 缓慢旋转的虚线环 */}
      <circle className="eb-ringrot" cx={cx} cy={cy} r={90} fill="none" stroke={accent}
        strokeOpacity={0.18} strokeWidth={1.4} strokeDasharray="2 10" style={{ transformOrigin: `${cx}px ${cy}px` }} />

      {/* 连线 */}
      {nodes.map(n => (
        <line key={n.key + '_l'} x1={cx} y1={cy} x2={n.x} y2={n.y}
          stroke={n.filled ? n.color : accent}
          strokeWidth={n.filled ? 1.8 : 1}
          strokeOpacity={n.filled ? 0.5 : 0.12}
          strokeDasharray={n.filled ? '340' : '4 4'}
          className={n.filled ? 'eb-draw' : undefined} />
      ))}

      {/* 环绕光点 */}
      <g className="eb-orbit" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx + 90} cy={cy} r={3} fill={accent} opacity={0.7} />
        <circle cx={cx - 90} cy={cy} r={2.2} fill={accent2} opacity={0.6} />
      </g>

      {/* 外围节点 */}
      {nodes.map((n, i) => {
        const CR = n.filled ? 40 : 27
        return (
          <g key={n.key} className={n.filled ? undefined : 'eb-nodepulse'}
            style={{ opacity: n.filled ? 1 : 0.5, transition: 'opacity 0.6s ease', animationDelay: `${i * 0.25}s`, transformOrigin: `${n.x}px ${n.y}px` }}>
            {n.filled && <circle cx={n.x} cy={n.y} r={CR + 4} fill={n.color} fillOpacity={0.08} />}
            <circle cx={n.x} cy={n.y} r={CR} fill={n.filled ? '#fff' : n.color} fillOpacity={n.filled ? 1 : 0.06}
              stroke={n.color} strokeWidth={n.filled ? 2 : 1.4} strokeOpacity={n.filled ? 0.9 : 0.35}
              filter={n.filled ? 'url(#softglow)' : undefined} />
            <text x={n.x} y={n.filled ? n.y - 8 : n.y + 4} textAnchor="middle" fill={n.color}
              fontSize={10.5} fontWeight={700} fontFamily="Inter, system-ui, sans-serif">{n.label}</text>
            {n.filled && (
              <text x={n.x} y={n.y + 10} textAnchor="middle" fill="#334155"
                fontSize={9} fontFamily="Inter, system-ui, sans-serif">{n.short}</text>
            )}
          </g>
        )
      })}

      {/* 中心进度弧 */}
      <circle cx={cx} cy={cy} r={cR + 8} fill="none" stroke="var(--surface-3)" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={cR + 8} fill="none" stroke={accent} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={arcC} strokeDashoffset={arcOff}
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dashoffset 0.8s var(--ease-out)' }} />
      {/* 中心 */}
      <circle className="eb-centerpulse" cx={cx} cy={cy} r={cR} fill="url(#cg)" filter="url(#softglow)" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={800} fontFamily="Inter, system-ui, sans-serif">项目</text>
      <text x={cx} y={cy + 5} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={9.5} fontFamily="Inter, system-ui, sans-serif">{shortTitle}</text>
      <text x={cx} y={cy + 20} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={9} fontFamily="Inter, system-ui, sans-serif">{filledCount}/{nodes.length} 已解析</text>
    </svg>
  )
}

// ── 阶段卡片块 ────────────────────────────────────────────────────────────────
function StageSection({ stage, slots, domain, isActive, isPast, isUpcoming, deliverables, decisions, accent }: {
  stage: Stage; slots: Record<string, unknown>; domain: Domain
  isActive: boolean; isPast: boolean; isUpcoming: boolean
  deliverables: Session['deliverables']; decisions: Session['decisions']; accent: string
}) {
  const cfg = STAGE_CFG[stage]
  const Icon = STAGE_ICON[stage]
  const defs = SLOTS.filter(s => s.stage === stage && s.domains.includes(domain))
  const filledDefs = defs.filter(d => isFilled(slots[d.key]))
  const isDeliver = stage === 'deliver'
  const deliverCount = deliverables.prompts.length + deliverables.openspec_packs.length + deliverables.showcases.length + (deliverables.checklists?.length ?? 0) + (deliverables.foundations?.length ?? 0)

  // 未来阶段不在画板里重复列出（左侧进度条已是完整阶段导航），避免两处重复
  if (isUpcoming) return null

  if (!isActive && !isPast) return null
  if (isPast && filledDefs.length === 0) return null

  return (
    <div style={{
      marginBottom: 16, borderRadius: 16,
      border: `1px solid ${isActive ? cfg.color + '3d' : 'var(--line)'}`,
      background: isActive ? `linear-gradient(180deg, ${cfg.color}0c, rgba(255,255,255,0.7))` : 'rgba(255,255,255,0.75)',
      overflow: 'hidden', animation: 'riseIn 0.5s var(--ease-out)',
      boxShadow: isActive ? `0 8px 26px ${cfg.color}16` : 'var(--shadow-sm)',
      backdropFilter: 'blur(6px)',
    }}>
      {isActive && <div className="eb-topline" style={{ height: 2, background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`, backgroundSize: '200% 100%' }} />}
      <div style={{ padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 9, borderBottom: `1px solid ${isActive ? cfg.color + '1f' : 'var(--line-soft)'}` }}>
        <span style={{ color: cfg.color }}><Icon size={16} /></span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-400)', marginLeft: 2 }}>
          {isDeliver ? `已生成 ${deliverCount} 项` : `${filledDefs.length}/${defs.length}`}
        </span>
        {isActive && !isDeliver && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 4 }}>
            <span className="eb-livedot" style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
            <span style={{ fontSize: 10.5, color: cfg.color, fontWeight: 500 }}>实时解析中</span>
          </span>
        )}
        <span style={{
          marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 3,
          background: isPast ? '#b08a5618' : cfg.color + '18', color: isPast ? '#059669' : cfg.color,
        }}>
          {isPast && <IconCheck size={11} strokeWidth={2.5} />}
          {isPast ? '完成' : '进行中'}
        </span>
      </div>

      {isDeliver ? (
        deliverCount === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--ink-400)', fontSize: 12, lineHeight: 1.8 }}>
            还没有生成任何交付物<br />
            在右侧生成：「提案包」给程序员/AI 建、<br />「地基体检」扫出看不见的隐患、「验收清单」给你自己核对
          </div>
        ) : (
          <div style={{ padding: '4px 4px 10px' }}>
            <DeckPanel prompts={deliverables.prompts} openspec_packs={deliverables.openspec_packs}
              showcases={deliverables.showcases} checklists={deliverables.checklists ?? []}
              foundations={deliverables.foundations ?? []}
              decisions={decisions} onExportZip={exportPackAsZip} />
          </div>
        )
      ) : (
        <div style={{ padding: 15, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {defs.map((def, i) => {
            const val = slots[def.key]
            const filled = isFilled(val)
            return (
              <div key={def.key}
                className={filled ? undefined : 'eb-waiting'}
                style={{
                  ['--acc' as string]: hexA(accent, 0.16),
                  position: 'relative', overflow: 'hidden',
                  padding: '10px 12px', borderRadius: 12,
                  background: filled ? '#fff' : 'rgba(255,255,255,0.55)',
                  border: filled ? `1px solid ${cfg.color}3d` : '1px dashed var(--line)',
                  transition: 'all 0.4s var(--ease-out)',
                  boxShadow: filled ? `0 3px 12px ${cfg.color}14` : 'none',
                  animation: filled ? `riseIn 0.5s var(--ease-out) ${i * 0.05}s both` : undefined,
                } as React.CSSProperties}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  {filled && <span style={{ color: cfg.color, display: 'inline-flex' }}><IconCheck size={11} strokeWidth={3} /></span>}
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.02em', color: filled ? cfg.color : 'var(--ink-400)' }}>{def.label}</span>
                </div>
                <div style={{ fontSize: 12.5, color: filled ? 'var(--ink-700)' : 'var(--ink-400)', lineHeight: 1.55 }}>
                  {filled ? fmt(val) : '等 AI 从对话里提取…'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 项目蓝图头（解析进度）────────────────────────────────────────────────────
function BlueprintHeader({ title, pct, count, total, accent, accent2 }: {
  title: string | null; pct: number; count: number; total: number; accent: string; accent2: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, padding: '16px 18px', borderRadius: 18,
      background: `linear-gradient(120deg, ${accent}0f, rgba(255,255,255,0.6))`,
      border: `1px solid ${accent}26`, boxShadow: 'var(--shadow-sm)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span className="eb-livedot" style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>项目蓝图 · 实时解析</span>
        </div>
        {title ? (
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: '-0.02em', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        ) : (
          <div className="eb-typing" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-400)' }}>
            等你说出想法，我来一句句拆成方案<span className="eb-caret" style={{ color: accent }}>▌</span>
          </div>
        )}
        <div style={{ marginTop: 8, height: 5, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 3, background: `linear-gradient(90deg, ${accent}, ${accent2})`, transition: 'width 0.7s var(--ease-out)' }} />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ProgressRing pct={pct} accent={accent} size={48} />
        <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>{count}/{total} 项</div>
      </div>
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export function CanvasBoard({ session, role }: Props) {
  const { slots, domain, currentStage, deliverables, decisions } = session
  const currentIdx = STAGE_ORDER.indexOf(currentStage as Stage)
  const projectTitle = isFilled(slots.product_one_liner) ? fmt(slots.product_one_liner) : null
  const [view, setView] = useState<'brief' | 'mindmap'>('brief')
  const accent = role.accent
  const accent2 = role.accent2

  const domainSlots = SLOTS.filter(s => s.domains.includes(domain as Domain))
  const filledCount = domainSlots.filter(s => isFilled(slots[s.key])).length
  const overallPct = domainSlots.length ? filledCount / domainSlots.length : 0

  const deliverCount = deliverables.prompts.length + deliverables.openspec_packs.length + deliverables.showcases.length + (deliverables.checklists?.length ?? 0) + (deliverables.foundations?.length ?? 0)
  const prevDeliverCount = useRef(deliverCount)
  useEffect(() => {
    if (deliverCount > prevDeliverCount.current) setView('brief')
    prevDeliverCount.current = deliverCount
  }, [deliverCount])

  return (
    <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)', minWidth: 0 }}>
      <style>{CANVAS_CSS}</style>

      {/* 工具条 */}
      <div style={{ height: 54, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.85)', borderBottom: '1px solid var(--line)', flexShrink: 0, backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: accent }}><IconRuler size={17} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-900)' }}>
            {projectTitle ? (projectTitle.length > 26 ? projectTitle.slice(0, 26) + '…' : projectTitle) : '方案画板'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ProgressRing pct={overallPct} accent={accent} size={30} />
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'var(--surface-3)' }}>
            {([['brief', '设计稿'], ['mindmap', '思维导图']] as const).map(([m, label]) => (
              <button key={m} onClick={() => setView(m)} className="btn-press" style={{
                padding: '5px 12px', fontSize: 11.5, borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                border: 'none', transition: 'all 0.15s',
                background: view === m ? '#fff' : 'transparent',
                color: view === m ? accent : 'var(--ink-400)',
                boxShadow: view === m ? 'var(--shadow-sm)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容（科技底纹） */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {/* 底纹层 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle at 50% 0%, ${accent}12, transparent 55%), radial-gradient(circle, rgba(15,18,34,0.045) 1px, transparent 1px)`,
          backgroundSize: 'auto, 22px 22px',
        }} />
        <div style={{ position: 'relative', padding: 20, minHeight: '100%' }}>
          {view === 'mindmap' ? (
            <div style={{
              background: 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '18px 16px 8px',
              border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', backdropFilter: 'blur(8px)',
              display: 'flex', flexDirection: 'column', minHeight: 'calc(100% - 0px)',
            }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-500)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                <IconMap size={15} /> 项目全景思维导图
                <span style={{ fontSize: 10.5, color: 'var(--ink-400)', fontWeight: 400 }}>— 随对话逐步成型</span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span className="eb-livedot" style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
                  <span style={{ fontSize: 10.5, color: accent, fontWeight: 500 }}>{filledCount}/{domainSlots.length} 已解析</span>
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MindMapSVG slots={slots} domain={domain as Domain} accent={accent} accent2={accent2} />
              </div>
            </div>
          ) : (
            <>
              <BlueprintHeader title={projectTitle} pct={overallPct} count={filledCount} total={domainSlots.length} accent={accent} accent2={accent2} />
              {STAGE_ORDER.map((stage, idx) => (
                <StageSection key={stage} stage={stage} slots={slots} domain={domain as Domain}
                  isActive={stage === currentStage} isPast={idx < currentIdx} isUpcoming={idx > currentIdx}
                  deliverables={deliverables} decisions={decisions} accent={accent} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const CANVAS_CSS = `
@keyframes eb-shimmerX { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes eb-draw { from{stroke-dashoffset:340} to{stroke-dashoffset:0} }
@keyframes eb-orbit { to{transform:rotate(360deg)} }
@keyframes eb-ringrot { to{transform:rotate(360deg)} }
@keyframes eb-cpulse { 0%,100%{filter:drop-shadow(0 0 3px rgba(63,107,255,0.35))} 50%{filter:drop-shadow(0 0 10px rgba(63,107,255,0.55))} }
@keyframes eb-npulse { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.06);opacity:.72} }
@keyframes eb-live { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
@keyframes eb-caret { 0%,100%{opacity:1} 50%{opacity:0} }
.eb-draw { animation: eb-draw 0.9s var(--ease-out) both; }
.eb-orbit { animation: eb-orbit 18s linear infinite; }
.eb-ringrot { animation: eb-ringrot 40s linear infinite; }
.eb-centerpulse { animation: eb-cpulse 3.4s ease-in-out infinite; }
.eb-nodepulse { animation: eb-npulse 3s ease-in-out infinite; }
.eb-livedot { animation: eb-live 1.4s ease-in-out infinite; }
.eb-caret { animation: eb-caret 1s step-end infinite; }
.eb-topline { animation: eb-shimmerX 2.6s linear infinite; }
.eb-waiting::after { content:''; position:absolute; inset:0; background:linear-gradient(100deg, transparent 38%, var(--acc, rgba(63,107,255,0.14)) 50%, transparent 62%); background-size:220% 100%; animation:eb-shimmerX 2.6s linear infinite; pointer-events:none; }
@media (prefers-reduced-motion: reduce){ .eb-orbit,.eb-ringrot,.eb-centerpulse,.eb-nodepulse,.eb-livedot,.eb-topline,.eb-waiting::after{animation:none !important} }
`
