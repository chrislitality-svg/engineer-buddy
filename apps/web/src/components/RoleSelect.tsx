// 开场页：一个产品团队陪你，从想法到能动手的方案（左右分栏 · 一屏放下 · 专业口径）
import { useRef } from 'react'
import type { EffectiveRole } from '../roles/store'
import type { SessionMeta } from '../engine/protocol'
import { IconSpark, IconArrow, IconLock, IconChevron } from './icons'
import { ROLE_DEFS } from '../roles/roster'
import hero from '../assets/hero.webp'

const PRODUCT_NAME = '方案工坊'
const STAGE_CN: Record<string, string> = {
  discovery: '摸清想法', scope: '划定范围', approach: '挑选做法', plan: '拆成步骤', deliver: '打包交付',
}

interface Props {
  roster: EffectiveRole[]
  onStart: () => void
  sessionList: SessionMeta[]
  onRestore: (id: string) => void
  onOpenAdmin: () => void
  showHistory: boolean
  onToggleHistory: () => void
}

function Avatar({ role, size = 40 }: { role: EffectiveRole; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3, flexShrink: 0,
      background: `linear-gradient(145deg, ${role.accent}, ${role.accent2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.42, fontWeight: 700,
      boxShadow: `0 5px 14px ${role.accent}3a`,
    }}>
      {role.short}
    </div>
  )
}

// 右侧展示用的动态思维导图：中心是"你的想法"，团队不断把它拆成方案
function HeroMindmap() {
  const cx = 280, cy = 165, R = 116
  const nodes = [
    { a: -90, label: '目标用户', c: '#3F6BFF' },
    { a: -30, label: '核心痛点', c: '#3454D1' },
    { a: 30,  label: '功能范围', c: '#8b5cf6' },
    { a: 90,  label: '产品形态', c: '#d97706' },
    { a: 150, label: '模块拆分', c: '#10b981' },
    { a: 210, label: '落地方案', c: '#ec4899' },
  ].map((n, i) => { const r = n.a * Math.PI / 180; return { ...n, x: cx + R * Math.cos(r), y: cy + R * Math.sin(r), i } })
  return (
    <svg viewBox="0 0 560 330" style={{ width: '100%', display: 'block' }} aria-hidden>
      <defs>
        <radialGradient id="hm-c" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3F6BFF" /><stop offset="100%" stopColor="#3454D1" />
        </radialGradient>
        <filter id="hm-g" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {[78, 116, 158].map((r, i) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="#3F6BFF" strokeOpacity={0.12 - i * 0.03} strokeDasharray="3 7" />
      ))}
      <circle className="eb-ringrot" cx={cx} cy={cy} r={95} fill="none" stroke="#3454D1" strokeOpacity={0.22} strokeWidth={1.3} strokeDasharray="2 11" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      {nodes.map(n => (
        <line key={'l' + n.i} className="eb-flow" x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={n.c} strokeOpacity={0.4} strokeWidth={1.5} style={{ animationDelay: `${n.i * 0.3}s` }} />
      ))}
      <g className="eb-orbit" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx + 95} cy={cy} r={3} fill="#3454D1" opacity={0.6} />
        <circle cx={cx - 95} cy={cy} r={2.2} fill="#3F6BFF" opacity={0.5} />
      </g>
      {nodes.map(n => (
        <g key={n.i} className="eb-breathe" style={{ transformOrigin: `${n.x}px ${n.y}px`, animationDelay: `${n.i * 0.4}s` }}>
          <circle cx={n.x} cy={n.y} r={31} fill="#fff" stroke={n.c} strokeWidth={1.6} strokeOpacity={0.9} filter="url(#hm-g)" />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fill={n.c} fontSize={12} fontWeight={700} fontFamily="Inter, system-ui, sans-serif">{n.label}</text>
        </g>
      ))}
      <circle className="eb-centerpulse" cx={cx} cy={cy} r={48} fill="url(#hm-c)" filter="url(#hm-g)" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      <text x={cx} y={cy - 3} textAnchor="middle" fill="#fff" fontSize={14.5} fontWeight={800} fontFamily="Inter, system-ui, sans-serif">你的想法</text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={9.5} fontFamily="Inter, system-ui, sans-serif">团队一点点拆成方案…</text>
    </svg>
  )
}

// 团队成员（岗位展示，不可点，紧凑 2×2）
function TeamMember({ role, index }: { role: EffectiveRole; index: number }) {
  return (
    <div className="animate-fade-in-up" style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 13,
      background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(15,18,34,0.06)',
      boxShadow: 'var(--shadow-sm)',
      animationDelay: `${240 + index * 70}ms`,
    }}>
      <Avatar role={role} size={32} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>{role.name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 1 }}>{role.title}</div>
      </div>
    </div>
  )
}

export function RoleSelect({ roster, onStart, sessionList, onRestore, onOpenAdmin, showHistory, onToggleHistory }: Props) {
  const glowRef = useRef<HTMLDivElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = glowRef.current
    if (el) { el.style.left = `${e.clientX}px`; el.style.top = `${e.clientY}px` }
  }

  return (
    <div onMouseMove={onMove} style={{ height: '100vh', minHeight: 640, position: 'relative', overflowY: 'auto', overflowX: 'hidden', background: '#fbfbfd', display: 'flex', flexDirection: 'column' }}>
      {/* 全屏低透明度暖光背景（不占布局高度） */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img src={hero} alt="" aria-hidden style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(251,251,253,0.55), rgba(251,251,253,0.82))' }} />
      </div>
      <div ref={glowRef} style={{
        position: 'fixed', left: '50%', top: '38%', width: 520, height: 520, marginLeft: -260, marginTop: -260,
        pointerEvents: 'none', zIndex: 1, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(63,107,255,0.13), rgba(59,130,246,0.08) 40%, transparent 66%)',
        filter: 'blur(36px)', transition: 'left .4s var(--ease-out), top .4s var(--ease-out)',
      }} />

      {/* 后台入口 */}
      <button onClick={onOpenAdmin} title="管理后台" className="btn-press" style={{
        position: 'fixed', top: 18, right: 20, zIndex: 20,
        width: 32, height: 32, borderRadius: 9, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(15,18,34,0.06)',
        color: 'var(--ink-300)', backdropFilter: 'blur(8px)',
      }}><IconLock size={15} /></button>

      {/* 顶部品牌条 */}
      <div className="animate-fade-in-up" style={{
        position: 'relative', zIndex: 5, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10, padding: '20px 40px 0',
      }}>
        <div className="animate-float-soft" style={{
          width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(145deg, #3F6BFF, #3454D1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          boxShadow: '0 8px 22px rgba(63,107,255,0.35)',
        }}><IconSpark size={18} /></div>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)', letterSpacing: '-0.01em' }}>{PRODUCT_NAME}</span>
      </div>

      {/* 左右分栏主区：一屏放下，不滚动 */}
      <div style={{ position: 'relative', zIndex: 5, flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', padding: '8px 40px' }}>
        <div className="flex flex-col lg:flex-row items-center" style={{ width: '100%', maxWidth: 1180, margin: '0 auto', gap: 32 }}>

          {/* 左：文案 + CTA + 团队 */}
          <div className="text-center lg:text-left items-center lg:items-start" style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', maxWidth: 540 }}>
            <h1 className="animate-fade-in-up anim-d100" style={{
              fontSize: 'clamp(1.7rem, 2.7vw, 2.5rem)', fontWeight: 650, textAlign: 'inherit',
              letterSpacing: '-0.025em', lineHeight: 1.18, color: 'var(--ink-900)', margin: 0,
            }}>
              把模糊的想法，聊成<br /><span className="text-gradient">能直接动手的方案</span>
            </h1>
            <p className="animate-fade-in-up anim-d200" style={{
              fontSize: 14.5, color: 'var(--ink-500)', textAlign: 'inherit',
              marginTop: 14, marginBottom: 20, lineHeight: 1.65, maxWidth: 460,
            }}>
              不懂技术也没关系。用大白话跟一支产品团队聊几轮，拿到一份能照着做的方案。
            </p>

            <button onClick={onStart} className="btn-press animate-fade-in-up anim-d300" style={{
              padding: '13px 34px', fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'inherit',
              color: '#fff', background: 'linear-gradient(135deg, #3F6BFF, #3454D1)', border: 'none',
              borderRadius: 13, boxShadow: '0 10px 26px rgba(63,107,255,0.38)',
            }}>
              开始梳理需求 <IconArrow size={18} />
            </button>

            {/* 团队：2×2 紧凑网格 */}
            <div className="animate-fade-in-up anim-d400" style={{ width: '100%', marginTop: 26 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-400)', marginBottom: 10 }}>
                一个人主领全程，需要时对应岗位出场
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 9 }}>
                {roster.map((role, i) => <TeamMember key={role.id} role={role} index={i} />)}
              </div>
            </div>

            {/* 历史：悬浮弹出，不占布局高度 */}
            {sessionList.length > 0 && (
              <div className="animate-fade-in-up anim-d500" style={{ position: 'relative', marginTop: 14 }}>
                <button onClick={onToggleHistory} className="btn-press" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  fontSize: 12, color: 'var(--ink-400)', background: 'transparent', border: 'none', padding: '4px 2px',
                }}>
                  <span style={{ transition: 'transform .2s', transform: showHistory ? 'rotate(180deg)' : 'none', display: 'inline-flex' }}>
                    <IconChevron size={13} />
                  </span>
                  {showHistory ? '收起' : `继续之前的方案（${sessionList.length}）`}
                </button>
                {showHistory && (
                  <div className="animate-fade-in-scale" style={{
                    position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, zIndex: 30,
                    width: 340, maxHeight: 280, overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 7, padding: 10, borderRadius: 14,
                    background: '#fff', border: '1px solid var(--line)', boxShadow: 'var(--shadow-xl)',
                  }}>
                    {sessionList.slice(0, 6).map((s, idx) => {
                      const role = ROLE_DEFS.find(r => r.id === s.roleId)
                      const accent = role?.accent ?? '#3F6BFF'
                      return (
                        <button key={s.id} onClick={() => onRestore(s.id)} className="btn-press" style={{
                          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
                          background: 'var(--surface-2)', border: '1px solid transparent',
                          borderRadius: 11, padding: '8px 11px', animationDelay: `${idx * 40}ms`,
                        }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                            background: `linear-gradient(145deg, ${accent}, ${role?.accent2 ?? '#3454D1'})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700,
                          }}>{role?.short ?? '案'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 1 }}>
                              {STAGE_CN[s.currentStage] ?? s.currentStage} · {s.updatedAt.slice(0, 10)}
                            </div>
                          </div>
                          <span style={{ color: 'var(--ink-300)', flexShrink: 0 }}><IconArrow size={14} /></span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右：思维导图 */}
          <div className="animate-fade-in-up anim-d300" style={{ flex: '1 1 0', minWidth: 0, width: '100%', maxWidth: 520 }}>
            <HeroMindmap />
          </div>
        </div>
      </div>
    </div>
  )
}
