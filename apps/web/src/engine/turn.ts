// §4.1 + §5.2 turn 循环 — 拼 messages、调代理、收 JSON、冻结 system 前缀
import type { Turn, Message, Slots, Session } from './protocol'
import type { Domain, Stage } from './slots'
import { computeGaps } from './slots'
import { parseModelOutput } from './parseJson'
import { mergeSlots } from './slotsReducer'
import { buildSystemPrompt } from '../prompts/base'

const STAGE_ORDER: Stage[] = ['discovery', 'scope', 'approach', 'plan', 'deliver']

export interface TurnResult {
  turn: Turn
  updatedSession: Session
}

/**
 * 执行一轮对话。
 * system 在 Session 创建时生成并冻结（§0 铁律 6），这里直接用 session.frozenSystem。
 */
export async function runTurn(
  session: Session,
  userContent: string,
  userAnswer?: Record<string, unknown>,
): Promise<TurnResult> {
  // 追加用户消息
  const userMessage: Message = { role: 'user', content: userContent }
  const messages: Message[] = [...session.messages, userMessage]

  // 调薄代理（scope=chat → deepseek-v4-flash）
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: 'chat',
      system: session.frozenSystem,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: '网络错误' }))
    throw new Error((err as { error: string }).error ?? '请求失败')
  }

  const apiResult = await response.json() as {
    choices?: Array<{ message: { content: string } }>
    error?: { message: string }
  }

  if (apiResult.error) throw new Error(apiResult.error.message)

  const rawContent = apiResult.choices?.[0]?.message?.content ?? ''
  const turn = parseModelOutput(rawContent)

  // 追加 assistant 消息（回传原始内容，保持稳定前缀）
  const assistantMessage: Message = { role: 'assistant', content: rawContent }
  const newMessages = [...messages, assistantMessage]

  // 更新 slots：模型补充 → 用户答案覆盖
  const newSlots: Slots = mergeSlots(session.slots, turn.slots_update, userAnswer)

  // ── 阶段闸门（§0）：不信任模型自报的 stage，防止"一轮跳到结尾" ────────────────
  // 规则：每轮最多推进一格；且只有当前阶段的必填槽真的收齐了，才允许往下一格。
  const curIdx = STAGE_ORDER.indexOf(session.currentStage as Stage)
  const gapsClosed = computeGaps(session.currentStage as Stage, session.domain, newSlots).length === 0
  const nextIdx = (gapsClosed && curIdx < STAGE_ORDER.length - 1) ? curIdx + 1 : curIdx
  const gatedStage = STAGE_ORDER[nextIdx]
  const stageAdvanced = nextIdx > curIdx

  const updatedSession: Session = {
    ...session,
    messages: newMessages,
    slots: newSlots,
    currentStage: gatedStage,   // 用闸门后的阶段，而非模型自报的 turn.stage
    updatedAt: new Date().toISOString(),
  }

  // 把闸门结论回写进 turn，供上层判断（是否刚完成一个阶段、真实所处阶段）
  turn.stage = gatedStage
  ;(turn as Turn & { _stageAdvanced?: boolean; _gapsClosed?: boolean })._stageAdvanced = stageAdvanced
  ;(turn as Turn & { _stageAdvanced?: boolean; _gapsClosed?: boolean })._gapsClosed = gapsClosed

  return { turn, updatedSession }
}

/**
 * 创建新会话，生成并冻结 system 提示词。
 * @param opts.systemPrompt 角色的完整系统提示词（后台可能已改）；缺省则按 domain 生成默认
 * @param opts.roleId       选定的搭子角色 id
 */
export function createSession(
  domain: Domain,
  opts?: { roleId?: string; systemPrompt?: string },
): Session {
  const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()
  return {
    id,
    domain,
    roleId: opts?.roleId,
    createdAt: now,
    updatedAt: now,
    messages: [],
    slots: {},
    currentStage: 'discovery',
    // §0 铁律 6：路由后冻结，整场不再重拼
    frozenSystem: opts?.systemPrompt ?? buildSystemPrompt(domain),
    deliverables: { prompts: [], openspec_packs: [], showcases: [], checklists: [], foundations: [] },
    decisions: [],
  }
}
