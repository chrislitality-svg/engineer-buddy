// §T030 模板库：prompthub 50 卡映射到 engineer-buddy 五阶段
// stage 映射：哪个阶段聊透后触发此卡 → 生成阶段指令
// required_slots：需要填充的 slot key（必须是 §4.2 词典里已定义的 key）
import type { Stage, Domain } from '../engine/slots'
import cardsRaw from './cards.json'

export interface CardData {
  id: string
  title: string
  phase: string
  tags: string[]
  prompt: string
}

export interface TemplateCard {
  id: string
  title: string
  stage: Stage
  domains: Domain[]
  required_slots: string[]
  card: CardData
}

const cards: CardData[] = cardsRaw as CardData[]
const byId = Object.fromEntries(cards.map(c => [c.id, c]))

// 阶段 + 域 + 必填 slot 映射表
// stage: 哪个对话阶段完成后触发此卡
const MAPPING: Array<{
  id: string
  stage: Stage
  domains: Domain[]
  required_slots: string[]
}> = [
  // ── discovery（摸清想法）→ 需求分析类指令 ─────────────────────────────────
  { id: 'P01', stage: 'discovery', domains: ['product'],               required_slots: ['product_one_liner', 'target_user'] },
  { id: 'P02', stage: 'discovery', domains: ['product'],               required_slots: ['product_one_liner', 'target_user'] },
  { id: 'P03', stage: 'discovery', domains: ['product', 'livestream'], required_slots: ['product_one_liner', 'target_user', 'pain_point'] },
  { id: 'P48', stage: 'discovery', domains: ['product', 'livestream'], required_slots: ['product_one_liner', 'pain_point'] },
  { id: 'P47', stage: 'discovery', domains: ['product', 'livestream'], required_slots: ['product_one_liner', 'target_user'] },

  // ── scope（划定范围）→ 功能规划类指令 ────────────────────────────────────
  { id: 'P04', stage: 'scope',     domains: ['product', 'livestream'], required_slots: ['must_have', 'product_one_liner', 'target_user'] },

  // ── approach（挑选做法）→ 技术设计类指令 ──────────────────────────────────
  { id: 'P05', stage: 'approach',  domains: ['product'],               required_slots: ['form_factor', 'must_have'] },
  { id: 'P33', stage: 'approach',  domains: ['product'],               required_slots: ['product_one_liner', 'must_have', 'form_factor'] },
  { id: 'P06', stage: 'approach',  domains: ['product'],               required_slots: ['must_have', 'form_factor'] },
  { id: 'P07', stage: 'approach',  domains: ['product'],               required_slots: ['must_have', 'form_factor'] },
  { id: 'P34', stage: 'approach',  domains: ['product'],               required_slots: ['form_factor'] },
  { id: 'P35', stage: 'approach',  domains: ['product'],               required_slots: ['form_factor'] },
  { id: 'P36', stage: 'approach',  domains: ['product'],               required_slots: ['form_factor', 'target_user'] },

  // ── plan（拆成步骤）→ 实现类指令 ─────────────────────────────────────────
  { id: 'P08', stage: 'plan',      domains: ['product'],               required_slots: ['modules', 'form_factor'] },
  { id: 'P09', stage: 'plan',      domains: ['product', 'livestream'], required_slots: ['modules', 'must_have'] },
  { id: 'P37', stage: 'plan',      domains: ['product'],               required_slots: ['modules'] },
  { id: 'P38', stage: 'plan',      domains: ['product'],               required_slots: ['modules'] },
  { id: 'P39', stage: 'plan',      domains: ['product', 'livestream'], required_slots: ['modules'] },
  { id: 'P40', stage: 'plan',      domains: ['product'],               required_slots: ['modules'] },
  { id: 'P29', stage: 'plan',      domains: ['product', 'livestream'], required_slots: ['product_one_liner', 'target_user'] },

  // ── deliver（打包交付）→ 质量/上线类指令 ──────────────────────────────────
  { id: 'P10', stage: 'deliver',   domains: ['product'],               required_slots: ['modules'] },
  { id: 'P11', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P12', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P13', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P14', stage: 'deliver',   domains: ['product', 'livestream'], required_slots: ['target_user'] },
  { id: 'P15', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P16', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P17', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P18', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P19', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P20', stage: 'deliver',   domains: ['product', 'livestream'], required_slots: ['product_one_liner'] },
  { id: 'P21', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P22', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P23', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P24', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P25', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P26', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P27', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P28', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P30', stage: 'deliver',   domains: ['product', 'livestream'], required_slots: ['target_user'] },
  { id: 'P31', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P32', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P41', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P42', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P43', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P44', stage: 'deliver',   domains: ['product'],               required_slots: ['product_one_liner'] },
  { id: 'P45', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P46', stage: 'deliver',   domains: ['product'],               required_slots: [] },
  { id: 'P49', stage: 'deliver',   domains: ['product', 'livestream'], required_slots: ['must_have'] },
  { id: 'P50', stage: 'deliver',   domains: ['product'],               required_slots: [] },
]

import { LIVESTREAM_TEMPLATES } from './livestream'

// 完整模板列表（product 50 张 + livestream 7 张专属）
export const TEMPLATES: TemplateCard[] = [
  ...MAPPING.map(m => ({
    ...m,
    title: byId[m.id]?.title ?? m.id,
    card: byId[m.id],
  })).filter(t => t.card),
  ...LIVESTREAM_TEMPLATES,
]

/** 按 stage + domain 查候选模板 */
export function getTemplates(stage: Stage, domain: Domain): TemplateCard[] {
  return TEMPLATES.filter(t => t.stage === stage && t.domains.includes(domain))
}

/** 按 id 查模板 */
export function getTemplateById(id: string): TemplateCard | undefined {
  return TEMPLATES.find(t => t.id === id)
}
