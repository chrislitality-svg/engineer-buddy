// 角色覆盖存储：管理员在后台改的提示词/文案 → 服务端全局生效，服务端不可用时降级到本地
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ROLE_DEFS, defaultSystemPrompt, type Role } from './roster'

// 管理员可改的字段（其余视觉身份如配色、缩写保持默认）
export interface RoleOverride {
  name?: string
  title?: string
  tagline?: string
  greeting?: string
  persona?: string        // 【角色设定】覆盖——决定这个搭子的性格与专长，团队对话也用它
  systemPrompt?: string   // 完整系统提示词覆盖（可选；缺省则由 persona 拼出）
}
export type RoleOverrides = Record<string, RoleOverride>

// 生效角色：默认身份 + 覆盖文案 + 解析出的完整系统提示词
export interface EffectiveRole extends Role {
  systemPrompt: string
  edited: boolean         // 是否被后台改过
}

const LS_KEY = 'eb:role_overrides'
// 复用已被 nginx 路由的 /api/chat 通道（用特殊 scope），避免动共享 nginx
const CHAT_ENDPOINT = '/api/chat'

function readLocalOverrides(): RoleOverrides {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') }
  catch { return {} }
}
function writeLocalOverrides(o: RoleOverrides): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(o)) } catch { /* 配额满忽略 */ }
}

/** 合并默认花名册 + 覆盖 → 生效花名册 */
export function buildRoster(overrides: RoleOverrides): EffectiveRole[] {
  return ROLE_DEFS.map(def => {
    const o = overrides[def.id] ?? {}
    const touched = Object.keys(o).some(k => (o as Record<string, unknown>)[k] != null && (o as Record<string, unknown>)[k] !== '')
    const persona = (o.persona && o.persona.trim()) ? o.persona : def.persona
    return {
      ...def,
      persona,
      name:    o.name    ?? def.name,
      title:   o.title   ?? def.title,
      tagline: o.tagline ?? def.tagline,
      greeting: o.greeting ?? def.greeting,
      systemPrompt: (o.systemPrompt && o.systemPrompt.trim()) ? o.systemPrompt : defaultSystemPrompt({ persona, domain: def.domain }),
      edited: touched,
    }
  })
}

/** 拉取全局覆盖：优先服务端，失败则用本地缓存 */
export async function fetchOverrides(): Promise<RoleOverrides> {
  try {
    const r = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'roles_get' }),
    })
    if (r.ok) {
      const data = await r.json() as { roles?: RoleOverrides }
      const roles = data?.roles && typeof data.roles === 'object' ? data.roles : {}
      writeLocalOverrides(roles)   // 缓存一份，离线也能用
      return roles
    }
  } catch { /* 网络/旧代理不支持 → 走本地 */ }
  return readLocalOverrides()
}

export type SaveScope = 'global' | 'local'

/**
 * 保存覆盖。先写本地（这台浏览器立即生效），再尝试推服务端（全局生效）。
 * @returns 'global' 表示已全局保存；'local' 表示服务端暂不可用、仅本机生效
 * @throws  密码错误时抛 'auth'
 */
export async function saveOverrides(overrides: RoleOverrides, password: string): Promise<SaveScope> {
  writeLocalOverrides(overrides)   // 本机立即生效，避免丢失编辑
  try {
    const r = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'roles_save', token: password, roles: overrides }),
    })
    if (r.status === 401 || r.status === 403) throw new Error('auth')
    if (r.ok) return 'global'
  } catch (e) {
    if (e instanceof Error && e.message === 'auth') throw e
    // 其它网络错误 → 降级本地
  }
  return 'local'
}

/** 花名册 hook：首屏用本地缓存秒出，再异步用服务端刷新 */
export function useRoster(): { roster: EffectiveRole[]; overrides: RoleOverrides; loading: boolean; reload: () => Promise<void> } {
  const [overrides, setOverrides] = useState<RoleOverrides>(() => readLocalOverrides())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const o = await fetchOverrides()
    setOverrides(o)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const roster = useMemo(() => buildRoster(overrides), [overrides])
  return { roster, overrides, loading, reload: load }
}
