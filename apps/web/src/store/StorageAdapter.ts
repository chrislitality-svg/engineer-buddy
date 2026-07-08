// §T040 StorageAdapter 接口 — 业务代码只依赖此接口（§0 铁律 8：禁止直接 localStorage.xxx）
import type { Session, SessionMeta, Deliverables } from '../engine/protocol'

export interface StorageAdapter {
  saveSession(session: Session): Promise<void>
  loadSession(id: string): Promise<Session | null>
  listSessions(): Promise<SessionMeta[]>
  deleteSession(id: string): Promise<void>
  renameSession(id: string, title: string): Promise<void>
  saveDeliverable(sessionId: string, d: Partial<Deliverables>): Promise<void>
}

/** 从 Session 提取 SessionMeta（标题优先自定义，其次 product_one_liner 前 20 字，无则"新对话"） */
export function sessionToMeta(s: Session): SessionMeta {
  const title =
    (s.title && s.title.trim()) ||
    String(s.slots?.product_one_liner ?? '').slice(0, 20) ||
    '新对话'
  return { id: s.id, domain: s.domain, roleId: s.roleId, createdAt: s.createdAt, updatedAt: s.updatedAt, currentStage: s.currentStage, title }
}
