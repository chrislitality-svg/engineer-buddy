// §4.1 slots 账本 — 写入/累积/贯穿，用户答案为权威（覆盖模型值）
import type { Slots } from './protocol'

/**
 * 合并一轮新数据到 slots。
 * 优先级：userAnswer > existing > modelUpdate
 *
 * @param current     当前 slots 状态
 * @param modelUpdate 模型 slots_update 字段（补充，不覆盖用户已答）
 * @param userAnswer  本轮用户答案 { slotKey: value }（最高优先级）
 */
export function mergeSlots(
  current: Slots,
  modelUpdate: Record<string, unknown>,
  userAnswer?: Record<string, unknown>,
): Slots {
  // 先把模型更新补进去（只填空缺，不改已有值）
  const afterModel: Slots = { ...current }
  for (const [k, v] of Object.entries(modelUpdate)) {
    if (afterModel[k] === undefined || afterModel[k] === null || afterModel[k] === '') {
      afterModel[k] = v
    }
  }

  // 用户答案最高优先级，直接覆盖
  if (userAnswer) {
    return { ...afterModel, ...userAnswer }
  }
  return afterModel
}

/**
 * 把一次 interaction 的用户回答规范化为 { slotKey: value }。
 * 支持 single_select / multi_select / slider / text。
 */
export function normalizeAnswer(
  interactionKey: string,
  rawValue: string | string[] | number,
): Record<string, unknown> {
  if (rawValue === '' || rawValue === undefined || rawValue === null) return {}
  return { [interactionKey]: rawValue }
}
