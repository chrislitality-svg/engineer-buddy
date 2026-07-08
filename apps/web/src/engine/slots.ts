// §4.2 slot 词典 — gaps 判定、模板 required_slots、deliver 依据全量 slots 的唯一权威来源

export type SlotType = 'text' | 'number' | 'string[]' | 'single' | 'multi'
export type Stage = 'discovery' | 'scope' | 'approach' | 'plan' | 'deliver'
export type Domain = 'product' | 'livestream'

export interface SlotDef {
  key: string
  type: SlotType
  stage: Stage
  domains: Domain[]
  required: boolean     // 本阶段必填 → 驱动 gaps / 推进闸门
  label: string         // 大白话问题，显示给用户
}

export const SLOTS: SlotDef[] = [
  // —— discovery ——
  { key: 'product_one_liner',   type: 'text',   stage: 'discovery', domains: ['product', 'livestream'], required: true,  label: '一句话说说你想做个啥' },
  { key: 'target_user',         type: 'text',   stage: 'discovery', domains: ['product', 'livestream'], required: true,  label: '给谁用' },
  { key: 'pain_point',          type: 'text',   stage: 'discovery', domains: ['product', 'livestream'], required: true,  label: '解决什么烦恼' },
  { key: 'current_workaround',  type: 'text',   stage: 'discovery', domains: ['product', 'livestream'], required: false, label: '现在没这东西时你怎么凑合的' },
  // 直播专属（开场二级路由）
  { key: 'biz_pillar',  type: 'single', stage: 'discovery', domains: ['livestream'], required: true,  label: '想给哪块经营搭工具（业务流量/财务对账/主播话术/团队管理/还说不清）' },
  { key: 'buildable',   type: 'single', stage: 'discovery', domains: ['livestream'], required: true,  label: '具体造什么（见七类可建造物）' },
  { key: 'data_origin', type: 'single', stage: 'discovery', domains: ['livestream'], required: true,  label: '数据从哪来：手填 / 导出Excel / 有接口' },
  { key: 'audience',    type: 'single', stage: 'discovery', domains: ['livestream'], required: false, label: '给谁看：自己 / 老板 / 品牌方 / 团队' },

  // —— scope ——
  { key: 'must_have',          type: 'string[]', stage: 'scope', domains: ['product', 'livestream'], required: true,  label: '第一版必须有的' },
  { key: 'nice_to_have',       type: 'string[]', stage: 'scope', domains: ['product', 'livestream'], required: false, label: '可以先砍的' },
  { key: 'explicit_non_goals', type: 'string[]', stage: 'scope', domains: ['product', 'livestream'], required: false, label: '明确不做的' },

  // —— approach ——
  { key: 'form_factor',  type: 'single', stage: 'approach', domains: ['product', 'livestream'], required: true,  label: '做成啥形态：网页 / 小程序 / 桌面工具 / 表格' },
  { key: 'key_tradeoff', type: 'text',   stage: 'approach', domains: ['product', 'livestream'], required: false, label: '有没有必须保的、或愿意妥协的' },
  { key: 'budget_time',  type: 'single', stage: 'approach', domains: ['product', 'livestream'], required: false, label: '时间盘子：两三天 / 一两周 / 一个月+' },

  // —— plan ——
  { key: 'modules',       type: 'string[]', stage: 'plan', domains: ['product', 'livestream'], required: true, label: '大概分几块' },
  { key: 'done_criteria', type: 'text',     stage: 'plan', domains: ['product', 'livestream'], required: true, label: '每块做到什么样算合格' },

  // deliver 阶段不新增 slot，仅触发产出
]

// 按 stage + domain 过滤必填 slots（驱动 gaps 计算）
export function getRequiredSlots(stage: Stage, domain: Domain): SlotDef[] {
  return SLOTS.filter(s => s.stage === stage && s.domains.includes(domain) && s.required)
}

// 计算当前 stage 还缺哪些必填 slot（前端确定性 gaps 计算，不依赖模型）
export function computeGaps(stage: Stage, domain: Domain, filled: Record<string, unknown>): SlotDef[] {
  return getRequiredSlots(stage, domain).filter(s => {
    const v = filled[s.key]
    if (v === undefined || v === null || v === '') return true
    if (Array.isArray(v) && v.length === 0) return true
    return false
  })
}
