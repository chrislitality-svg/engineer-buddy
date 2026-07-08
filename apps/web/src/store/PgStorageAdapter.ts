// §T042 PgStorageAdapter — v2 预留空实现
// v2 接法：
//   1. 安装 @neondatabase/serverless 或 postgres.js
//   2. 建表：sessions(id, domain, created_at, updated_at, current_stage, slots jsonb,
//             messages jsonb, frozen_system text, deliverables jsonb)
//   3. 把下面每个方法替换为对应 SQL（SELECT / INSERT ON CONFLICT DO UPDATE / DELETE）
//   4. 在 main.tsx 把 adapter 换成 pgStorageAdapter
// 注意：LocalStorageAdapter 在移动端会受 5–10MB 上限限制；Postgres 无此问题。
import type { Session, SessionMeta, Deliverables } from '../engine/protocol'
import type { StorageAdapter } from './StorageAdapter'

export const pgStorageAdapter: StorageAdapter = {
  async saveSession(_session: Session): Promise<void> {
    throw new Error('PgStorageAdapter: not implemented — see v2 注释')
  },
  async loadSession(_id: string): Promise<Session | null> {
    throw new Error('PgStorageAdapter: not implemented')
  },
  async listSessions(): Promise<SessionMeta[]> {
    throw new Error('PgStorageAdapter: not implemented')
  },
  async deleteSession(_id: string): Promise<void> {
    throw new Error('PgStorageAdapter: not implemented')
  },
  async renameSession(_id: string, _title: string): Promise<void> {
    throw new Error('PgStorageAdapter: not implemented')
  },
  async saveDeliverable(_sessionId: string, _d: Partial<Deliverables>): Promise<void> {
    throw new Error('PgStorageAdapter: not implemented')
  },
}
