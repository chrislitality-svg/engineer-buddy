// §T031 阶段指令生成器：填充模板 → deliverables.prompt
import type { Slots } from './protocol'
import type { Domain, Stage } from './slots'
import { getTemplates } from '../templates'

/** 把 slots 填进 body_template（{{key}} 占位符替换） */
function fillSlots(template: string, slots: Slots): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = slots[key]
    if (Array.isArray(val)) return val.join('、')
    if (val !== undefined && val !== null && val !== '') return String(val)
    return ''
  })
}

/** 生成单张卡的阶段指令 */
function buildPromptFromCard(
  cardPrompt: string,
  cardTitle: string,
  slots: Slots,
): string {
  // 上下文前缀（人话描述，让 coding 工具理解背景）
  const lines: string[] = ['## 项目上下文']
  if (slots.product_one_liner) lines.push(`- **想做什么**：${slots.product_one_liner}`)
  if (slots.target_user)       lines.push(`- **目标用户**：${slots.target_user}`)
  if (slots.pain_point)        lines.push(`- **核心痛点**：${slots.pain_point}`)
  if (slots.current_workaround) lines.push(`- **现在的做法**：${slots.current_workaround}`)
  if (slots.must_have)         lines.push(`- **必须实现**：${Array.isArray(slots.must_have) ? (slots.must_have as string[]).join('、') : String(slots.must_have)}`)
  if (slots.form_factor)       lines.push(`- **产品形态**：${slots.form_factor}`)
  if (slots.budget_time)       lines.push(`- **时间盘子**：${slots.budget_time}`)
  if (slots.modules)           lines.push(`- **模块划分**：${Array.isArray(slots.modules) ? (slots.modules as string[]).join(' / ') : String(slots.modules)}`)

  lines.push('', `## ${cardTitle} 指令`, '', fillSlots(cardPrompt, slots))
  return lines.join('\n')
}

/**
 * 按当前 stage + domain + slots 生成阶段指令集合。
 * 每个阶段最多产出 3 张相关卡（避免过多）。
 * 如果 forcedPrompt 非空（模型已给），直接用之。
 */
export function generateStagePrompts(
  stage: Stage,
  domain: Domain,
  slots: Slots,
  forcedPrompt?: string | null,
): string[] {
  if (forcedPrompt) return [forcedPrompt]

  const templates = getTemplates(stage, domain)
  if (templates.length === 0) return []

  // 优先选 required_slots 都已填的模板，取前 3 张
  const eligible = templates
    .filter(t => t.required_slots.every(k => {
      const v = slots[k]
      if (v === undefined || v === null || v === '') return false
      if (Array.isArray(v) && v.length === 0) return false
      return true
    }))
    .slice(0, 3)

  return eligible.map(t => buildPromptFromCard(t.card.prompt, t.title, slots))
}
