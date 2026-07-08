// §4.1 + §4.4 核心类型定义
import type { Stage, Domain } from './slots'

// ─── 交互控件 ────────────────────────────────────────────────────────────────

export type InteractionType = 'single_select' | 'multi_select' | 'slider' | 'text' | 'none'

export interface SliderConfig {
  min: number
  max: number
  minLabel: string
  maxLabel: string
  default: number
}

export interface OptionDetail {
  value: string          // 必须与 options[] 里的字符串一致
  plain?: string         // 大白话：这个选项到底是啥、选了得到什么（给不懂技术的人）
  pros: string[]         // 优势（具体）
  cons: string[]         // 劣势/代价（落到时间/钱/难度）
  fit?: string           // 什么样的你适合选这个（一句话）
  branch_impact: string  // 一句话：选这个后续会怎样
}

// 搭子的推荐：给没主意的人一个靠得住的默认
export interface Recommendation {
  pick: string           // 推荐的选项 value（须是 options 之一）
  why: string            // 为什么推荐它，大白话
}

export interface Interaction {
  type: InteractionType
  key: string
  label: string
  options?: string[]
  option_details?: OptionDetail[]  // single_select / multi_select 时 AI 须提供
  recommendation?: Recommendation  // 搭子推荐哪个选项
  slider?: SliderConfig
  placeholder?: string
}

// ─── 产出物 ──────────────────────────────────────────────────────────────────

export interface SpecEntry {
  capability: string
  spec_md: string
}

export interface OpenSpecPack {
  change_id: string
  proposal_md: string
  tasks_md: string
  design_md: string | null
  specs: SpecEntry[]
}

export interface Milestone {
  when: string
  what: string
}

export interface Showcase {
  summary: string
  mermaid: string
  milestones: Milestone[]
  risks: string[]
}

// ─── 验收清单（借鉴 Kun 的 /review 验收闭环，翻成给不懂技术的人核对的大白话清单）───
export interface ChecklistItem {
  what: string          // 检查什么（大白话，非技术）
  how: string           // 怎么算通过（一个能亲眼看到/试出来的判断标准）
}
export interface ChecklistGroup {
  module: string        // 分组：哪个模块/哪方面
  items: ChecklistItem[]
}
export interface AcceptanceChecklist {
  title: string
  intro: string         // 一句话说明这份清单怎么用
  groups: ChecklistGroup[]
}

// ─── 地基体检（核心差异化：把小白看不见的"金字塔地基"显性化，避免屎山/隐患）───
export interface FoundationItem {
  area: string          // 分类，如"数据与隐私""性能与加速"
  plain: string         // 这块是啥、为什么对你这个项目重要（大白话）
  ifIgnored: string     // 不管它会埋什么雷 / 变成什么屎山 / 以后出什么问题
  todo: string          // 打地基该怎么做（让 AI 从这往上盖）
  risk: 'high' | 'medium' | 'low'   // 对你这个项目的风险等级
}
export interface FoundationReport {
  title: string
  intro: string         // 一句话：这份体检在帮你看什么
  items: FoundationItem[]
}

export interface Deliverables {
  prompt: string | null
  openspec_pack: OpenSpecPack | null
  showcase: Showcase | null
}

// ─── 决策树节点 ──────────────────────────────────────────────────────────────

export interface DecisionNode {
  id: string
  stage: Stage
  question: string
  option_details: OptionDetail[]
  chosen: string | string[]
}

// ─── 对话协议 ────────────────────────────────────────────────────────────────

export interface Turn {
  stage: Stage
  stage_progress: number
  gaps: string[]
  slots_update: Record<string, unknown>
  message: string
  interaction: Interaction
  deliverables: Deliverables
}

// ─── 会话 ────────────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type Slots = Record<string, unknown>

export interface Session {
  id: string
  domain: Domain
  roleId?: string        // 选定的搭子角色 id（老存档可能没有）
  title?: string         // 自定义标题（后台重命名），缺省则取 product_one_liner
  createdAt: string
  updatedAt: string
  messages: Message[]
  slots: Slots
  currentStage: Stage
  frozenSystem: string
  deliverables: {
    prompts: string[]
    openspec_packs: OpenSpecPack[]
    showcases: Showcase[]
    checklists: AcceptanceChecklist[]
    foundations: FoundationReport[]
  }
  decisions: DecisionNode[]  // 决策树：每次用户在选择题作答后追加
}

export interface SessionMeta {
  id: string
  domain: Domain
  roleId?: string
  createdAt: string
  updatedAt: string
  currentStage: Stage
  title: string
}
