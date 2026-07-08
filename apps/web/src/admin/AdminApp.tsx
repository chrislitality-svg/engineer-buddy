// 管理后台：登录门禁 → 提示词编辑 + 对话管理（账号见 ADMIN_EMAIL / 环境变量）
import { useState, useEffect, useCallback } from 'react'
import { ROLE_DEFS } from '../roles/roster'
import { fetchOverrides, saveOverrides, buildRoster, type RoleOverrides, type RoleOverride } from '../roles/store'
import { localStorageAdapter } from '../store/LocalStorageAdapter'
import type { SessionMeta, Session } from '../engine/protocol'
import {
  IconSpark, IconLock, IconShield, IconEdit, IconTrash, IconRefresh, IconArrow,
  IconCheck, IconSliders, IconChat, IconClose, IconUser,
} from '../components/icons'

const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PW = 'change_me'          // 前端软门禁；服务端另有 x-admin-token 校验（生产改这里/走环境变量）
const SS_AUTH = 'eb:admin_authed'
const SS_PW = 'eb:admin_pw'

const STAGE_CN: Record<string, string> = {
  discovery: '摸清想法', scope: '划定范围', approach: '挑选做法', plan: '拆成步骤', deliver: '打包交付',
}

// ── 登录 ─────────────────────────────────────────────────────────────────────
function AdminLogin({ onAuth }: { onAuth: (pw: string) => void }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)

  const submit = () => {
    if (email.trim().toLowerCase() === ADMIN_EMAIL && pw === ADMIN_PW) {
      setErr(''); onAuth(pw)
    } else {
      setErr('账号或密码不对'); setShake(true); setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--surface-2)' }}>
      <div aria-hidden style={{
        position: 'fixed', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(63,107,255,0.18) 0%, transparent 65%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      <div className="animate-rise" style={{
        position: 'relative', width: '100%', maxWidth: 380, padding: '30px 32px 34px', borderRadius: 20,
        background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
        transform: shake ? 'translateX(0)' : undefined,
        animation: shake ? 'menuIn .1s' : undefined,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, marginBottom: 14,
            background: 'linear-gradient(145deg, #3F6BFF, #3454D1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 10px 30px rgba(63,107,255,0.35)',
          }}><IconShield size={26} /></div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink-900)', margin: 0 }}>方案工坊 · 管理后台</h1>
          <p style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 6 }}>请用管理员账号登录</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 13, top: 12, color: 'var(--ink-400)' }}><IconUser size={17} /></span>
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="admin@example.com" autoComplete="username"
              style={inputStyle}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 13, top: 12, color: 'var(--ink-400)' }}><IconLock size={17} /></span>
            <input
              value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              type="password" placeholder="密码" autoComplete="current-password"
              style={inputStyle}
            />
          </div>
          {err && <p style={{ fontSize: 12, color: '#dc2626', margin: '2px 0 0', textAlign: 'center' }}>{err}</p>}
          <button onClick={submit} className="btn-press" style={{
            marginTop: 6, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #3F6BFF, #3454D1)', color: '#fff', fontSize: 14, fontWeight: 600,
            boxShadow: '0 8px 24px rgba(63,107,255,0.35)',
          }}>进入后台</button>
          <a href="#/" style={{ fontSize: 12, color: 'var(--ink-400)', textAlign: 'center', textDecoration: 'none', marginTop: 4 }}>
            ← 返回方案工坊
          </a>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px 11px 40px', borderRadius: 12, fontSize: 14,
  background: 'var(--surface-3)', border: '1px solid var(--line)', color: 'var(--ink-900)',
  outline: 'none',
}

// ── 提示词编辑器 ──────────────────────────────────────────────────────────────
function PromptManager({ password }: { password: string }) {
  const [overrides, setOverrides] = useState<RoleOverrides>({})
  const [selId, setSelId] = useState(ROLE_DEFS[0].id)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { fetchOverrides().then(setOverrides) }, [])

  const roster = buildRoster(overrides)
  const sel = roster.find(r => r.id === selId) ?? roster[0]
  const def = ROLE_DEFS.find(r => r.id === selId)!

  const patch = (field: keyof RoleOverride, value: string) => {
    setOverrides(prev => ({ ...prev, [selId]: { ...prev[selId], [field]: value } }))
  }
  const resetField = (field: keyof RoleOverride) => {
    setOverrides(prev => {
      const next = { ...prev, [selId]: { ...prev[selId] } }
      delete (next[selId] as Record<string, unknown>)[field]
      if (Object.keys(next[selId]).length === 0) delete next[selId]
      return next
    })
  }
  const resetAll = () => {
    if (!confirm(`把「${def.name}」的所有改动恢复成默认？`)) return
    setOverrides(prev => { const n = { ...prev }; delete n[selId]; return n })
  }

  const save = useCallback(async () => {
    setSaving(true); setToast('')
    try {
      const scope = await saveOverrides(overrides, password)
      setToast(scope === 'global' ? '✓ 已全局保存，所有访客生效' : '✓ 已保存到本机（服务端暂不可用，仅本浏览器生效）')
    } catch (e) {
      setToast(e instanceof Error && e.message === 'auth' ? '✗ 密码校验失败，未能保存到服务端' : '✗ 保存失败')
    } finally {
      setSaving(false)
      setTimeout(() => setToast(''), 5000)
    }
  }, [overrides, password])

  const curPersona = sel.persona
  const isPersonaEdited = !!overrides[selId]?.persona

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* 左：角色列表 */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {roster.map(r => (
          <button key={r.id} onClick={() => setSelId(r.id)} className="btn-press" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
            textAlign: 'left', transition: 'all .15s',
            background: r.id === selId ? `${r.accent}0f` : 'var(--surface)',
            border: `1px solid ${r.id === selId ? r.accent + '55' : 'var(--line)'}`,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `linear-gradient(145deg, ${r.accent}, ${r.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>{r.short}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-400)' }}>{r.title}</div>
            </div>
            {r.edited && <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.accent, flexShrink: 0 }} title="已改动" />}
          </button>
        ))}
      </div>

      {/* 右：编辑区 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(145deg, ${sel.accent}, ${sel.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 17, fontWeight: 700 }}>{sel.short}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)' }}>{sel.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>底层轨道：{sel.domain === 'livestream' ? '直播运营' : '产品开发'}</div>
          </div>
          <button onClick={resetAll} className="btn-press" style={ghostBtn}>
            <IconRefresh size={14} /> 全部恢复默认
          </button>
        </div>

        {/* 展示字段 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="显示名称" value={sel.name} defVal={def.name} onChange={v => patch('name', v)} onReset={() => resetField('name')} edited={!!overrides[selId]?.name} />
          <Field label="头衔" value={sel.title} defVal={def.title} onChange={v => patch('title', v)} onReset={() => resetField('title')} edited={!!overrides[selId]?.title} />
        </div>
        <Field label="卖点标语" value={sel.tagline} defVal={def.tagline} onChange={v => patch('tagline', v)} onReset={() => resetField('tagline')} edited={!!overrides[selId]?.tagline} />
        <Field label="开场白" value={sel.greeting} defVal={def.greeting} onChange={v => patch('greeting', v)} onReset={() => resetField('greeting')} edited={!!overrides[selId]?.greeting} multiline rows={3} />

        {/* 角色设定 persona（核心：决定这个搭子的性格与专长；团队对话也用它） */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-800)' }}>角色设定（性格与专长）</span>
            {isPersonaEdited && <span style={{ fontSize: 10, color: sel.accent, background: `${sel.accent}14`, padding: '1px 7px', borderRadius: 999 }}>已改动</span>}
            <span style={{ flex: 1 }} />
            {isPersonaEdited && <button onClick={() => resetField('persona')} className="btn-press" style={{ ...ghostBtn, fontSize: 11 }}>恢复默认</button>}
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-400)', margin: '0 0 8px', lineHeight: 1.6 }}>
            这段决定这个岗位的性格、信念和核心方法。改它就改了它的脾气——现在是"一个团队一起陪聊"，这段也会用进团队对话。
            下面的五步节奏、技能工具箱、输出协议是全团队共用的，程序自动拼进去，你不用管。
          </p>
          <textarea
            value={curPersona}
            onChange={e => patch('persona', e.target.value)}
            spellCheck={false}
            style={{
              width: '100%', minHeight: 300, padding: 14, borderRadius: 14, resize: 'vertical',
              fontSize: 12.5, lineHeight: 1.7, fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              color: 'var(--ink-800)', background: 'var(--surface)', border: `1px solid ${isPersonaEdited ? sel.accent + '55' : 'var(--line)'}`,
              outline: 'none',
            }}
          />
        </div>

        {/* 保存条 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', bottom: 0 }}>
          <button onClick={save} disabled={saving} className="btn-press" style={{
            padding: '11px 22px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
            background: 'linear-gradient(135deg, #3F6BFF, #3454D1)', color: '#fff', fontSize: 14, fontWeight: 600,
            boxShadow: '0 8px 22px rgba(63,107,255,0.35)', opacity: saving ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <IconCheck size={16} /> {saving ? '保存中…' : '保存全部改动'}
          </button>
          {toast && <span style={{ fontSize: 12.5, color: toast.startsWith('✓') ? '#059669' : '#dc2626', fontWeight: 500 }}>{toast}</span>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, defVal, onChange, onReset, edited, multiline, rows = 1 }: {
  label: string; value: string; defVal: string; onChange: (v: string) => void; onReset: () => void; edited: boolean; multiline?: boolean; rows?: number
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)' }}>{label}</span>
        {edited && <button onClick={onReset} style={{ fontSize: 10.5, color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>恢复默认</button>}
      </div>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={defVal}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.6, resize: 'vertical', color: 'var(--ink-800)', background: 'var(--surface)', border: '1px solid var(--line)', outline: 'none', fontFamily: 'inherit' }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={defVal}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, color: 'var(--ink-800)', background: 'var(--surface)', border: '1px solid var(--line)', outline: 'none' }} />
      )}
    </div>
  )
}

// ── 对话管理 ─────────────────────────────────────────────────────────────────
function ConversationManager() {
  const [list, setList] = useState<SessionMeta[]>([])
  const [detail, setDetail] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    localStorageAdapter.listSessions().then(l => { setList(l); setLoading(false) })
  }, [])
  useEffect(() => { reload() }, [reload])

  const rename = async (m: SessionMeta) => {
    const name = prompt('新的对话名称：', m.title)
    if (name == null) return
    await localStorageAdapter.renameSession(m.id, name)
    reload()
  }
  const remove = async (m: SessionMeta) => {
    if (!confirm(`删除对话「${m.title}」？此操作不可撤销。`)) return
    await localStorageAdapter.deleteSession(m.id)
    if (detail?.id === m.id) setDetail(null)
    reload()
  }
  const view = async (m: SessionMeta) => {
    const s = await localStorageAdapter.loadSession(m.id)
    setDetail(s)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <p style={{ fontSize: 12.5, color: 'var(--ink-400)', margin: 0, flex: 1, lineHeight: 1.6 }}>
          共 {list.length} 条对话。注意：对话保存在<strong style={{ color: 'var(--ink-600,#334155)' }}>当前浏览器本地</strong>，此处管理的是这台电脑上的对话。
        </p>
        <button onClick={reload} className="btn-press" style={ghostBtn}><IconRefresh size={14} /> 刷新</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>加载中…</div>
      ) : list.length === 0 ? (
        <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>这台浏览器还没有任何对话</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `linear-gradient(145deg, ${roleAccent(m.roleId)}, ${roleAccent2(m.roleId)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>{roleShort(m.roleId)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 1 }}>
                  {roleName(m.roleId)} · {STAGE_CN[m.currentStage] ?? m.currentStage} · 更新于 {m.updatedAt.slice(0, 16).replace('T', ' ')}
                </div>
              </div>
              <button onClick={() => view(m)} className="btn-press" style={iconBtn} title="查看"><IconChat size={16} /></button>
              <button onClick={() => rename(m)} className="btn-press" style={iconBtn} title="改名"><IconEdit size={16} /></button>
              <button onClick={() => remove(m)} className="btn-press" style={{ ...iconBtn, color: '#dc2626' }} title="删除"><IconTrash size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {/* 详情抽屉 */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,18,34,0.4)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} className="animate-slide-in-r" style={{ width: 460, maxWidth: '92vw', height: '100%', background: 'var(--surface)', boxShadow: 'var(--shadow-xl)', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', flex: 1 }}>对话详情</span>
              <button onClick={() => setDetail(null)} className="btn-press" style={iconBtn}><IconClose size={16} /></button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.9, marginBottom: 16 }}>
              <div><strong>岗位：</strong>{roleName(detail.roleId)}</div>
              <div><strong>阶段：</strong>{STAGE_CN[detail.currentStage] ?? detail.currentStage}</div>
              <div><strong>创建：</strong>{detail.createdAt.slice(0, 16).replace('T', ' ')}</div>
              <div><strong>消息数：</strong>{detail.messages.length}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-700)', marginBottom: 8 }}>已收集的需求（slots）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(detail.slots).length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>暂无</span>
              ) : Object.entries(detail.slots).map(([k, v]) => (
                <div key={k} style={{ padding: '8px 10px', borderRadius: 9, background: 'var(--surface-2)', fontSize: 12 }}>
                  <div style={{ color: 'var(--ink-400)', fontSize: 10.5 }}>{k}</div>
                  <div style={{ color: 'var(--ink-800)' }}>{Array.isArray(v) ? v.join('、') : String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 角色查表小工具（对话管理里显示用）
function roleShort(id?: string) { return ROLE_DEFS.find(r => r.id === id)?.short ?? '案' }
function roleName(id?: string) { return ROLE_DEFS.find(r => r.id === id)?.name ?? '（未记录）' }
function roleAccent(id?: string) { return ROLE_DEFS.find(r => r.id === id)?.accent ?? '#3F6BFF' }
function roleAccent2(id?: string) { return ROLE_DEFS.find(r => r.id === id)?.accent2 ?? '#3454D1' }

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, cursor: 'pointer',
  fontSize: 12, fontWeight: 500, color: 'var(--ink-500)', background: 'var(--surface)', border: '1px solid var(--line)',
}
const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 9, cursor: 'pointer', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--ink-500)', background: 'var(--surface-2)', border: '1px solid var(--line)',
}

// ── 控制台 ───────────────────────────────────────────────────────────────────
function AdminConsole({ password, onLogout }: { password: string; onLogout: () => void }) {
  const [tab, setTab] = useState<'prompts' | 'convos'>('prompts')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)' }}>
      {/* 顶栏 */}
      <div style={{
        height: 58, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14,
        background: 'var(--surface)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(145deg, #3F6BFF, #3454D1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><IconSpark size={17} /></div>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)' }}>管理后台</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 18, padding: 3, borderRadius: 11, background: 'var(--surface-3)' }}>
          {([['prompts', '提示词', IconSliders], ['convos', '对话管理', IconChat]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className="btn-press" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, border: 'none', transition: 'all .15s',
              background: tab === k ? 'var(--surface)' : 'transparent',
              color: tab === k ? '#3F6BFF' : 'var(--ink-400)',
              boxShadow: tab === k ? 'var(--shadow-sm)' : 'none',
            }}><Icon size={15} /> {label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <a href="#/" className="btn-press" style={{ ...ghostBtn, textDecoration: 'none' }}><IconArrow size={14} /> 去前台</a>
        <button onClick={onLogout} className="btn-press" style={ghostBtn}>退出</button>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 24px 60px' }}>
        {tab === 'prompts' ? <PromptManager password={password} /> : <ConversationManager />}
      </div>
    </div>
  )
}

// ── 入口 ─────────────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SS_AUTH) === '1')
  const [password, setPassword] = useState(() => sessionStorage.getItem(SS_PW) ?? '')

  const onAuth = (pw: string) => {
    sessionStorage.setItem(SS_AUTH, '1')
    sessionStorage.setItem(SS_PW, pw)
    setPassword(pw); setAuthed(true)
  }
  const onLogout = () => {
    sessionStorage.removeItem(SS_AUTH); sessionStorage.removeItem(SS_PW)
    setAuthed(false); setPassword('')
    window.location.hash = '#/'
  }

  if (!authed) return <AdminLogin onAuth={onAuth} />
  return <AdminConsole password={password} onLogout={onLogout} />
}
