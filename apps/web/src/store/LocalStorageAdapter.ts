// §T040 LocalStorageAdapter — v1 浏览器存储实现
// 所有业务代码通过 StorageAdapter 接口调用，v2 换 Postgres 只需换实现
import type { Session, SessionMeta, Deliverables } from '../engine/protocol'
import type { StorageAdapter } from './StorageAdapter'
import { sessionToMeta } from './StorageAdapter'

const KEY_INDEX = 'eb:sessions:index'
const sessionKey = (id: string) => `eb:sessions:${id}`

function readIndex(): SessionMeta[] {
  try { return JSON.parse(localStorage.getItem(KEY_INDEX) ?? '[]') }
  catch { return [] }
}

function writeIndex(metas: SessionMeta[]): void {
  localStorage.setItem(KEY_INDEX, JSON.stringify(metas))
}

export const localStorageAdapter: StorageAdapter = {
  async saveSession(session: Session): Promise<void> {
    localStorage.setItem(sessionKey(session.id), JSON.stringify(session))
    const metas = readIndex()
    const meta = sessionToMeta(session)
    const idx = metas.findIndex(m => m.id === session.id)
    if (idx >= 0) metas[idx] = meta
    else metas.unshift(meta)           // 最新在前
    writeIndex(metas)
  },

  async loadSession(id: string): Promise<Session | null> {
    try {
      const raw = localStorage.getItem(sessionKey(id))
      if (!raw) return null
      return JSON.parse(raw) as Session
    } catch { return null }
  },

  async listSessions(): Promise<SessionMeta[]> {
    return readIndex()
  },

  async deleteSession(id: string): Promise<void> {
    localStorage.removeItem(sessionKey(id))
    writeIndex(readIndex().filter(m => m.id !== id))
  },

  async renameSession(id: string, title: string): Promise<void> {
    const session = await this.loadSession(id)
    if (!session) return
    session.title = title.trim()
    await this.saveSession(session)
  },

  async saveDeliverable(sessionId: string, d: Partial<Deliverables>): Promise<void> {
    const session = await this.loadSession(sessionId)
    if (!session) return
    if (d.prompt)         session.deliverables.prompts.push(d.prompt)
    if (d.openspec_pack)  session.deliverables.openspec_packs.push(d.openspec_pack)
    if (d.showcase)       session.deliverables.showcases.push(d.showcase)
    await this.saveSession(session)
  },
}
