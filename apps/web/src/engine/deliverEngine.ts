// §T032 提案包生成：deliver 阶段调 v4-pro，产出 OpenSpec pack
// §T033 提案包导出：打 ZIP 下载
import type { OpenSpecPack, Slots, AcceptanceChecklist, FoundationReport, FoundationItem } from './protocol'
import { parseModelOutput } from './parseJson'

const OPENSPEC_SYSTEM = `你是一位专业的产品架构师，擅长把聊出来的需求转成一份工程师或 AI 编程工具能直接照着开工、不用回头追问的 OpenSpec 提案包。

【可建造性铁律】——这份包是给 AI/工程师施工用的，光有"做什么"不够，必须补齐让人能动手的工程细节。proposal_md 里必须显式包含以下四块，聊天没聊到的就基于常识给出合理默认，并明确标注"（待确认假设）"，绝不留空、绝不含糊：
1. **数据模型**：核心实体有哪些、每个实体有哪些字段、每个字段的口径（例："订单{下单人, 商品, 数量, 金额, 状态, 下单时间}"；"利润=成交额−投流−坑位费−提成，其中成交额是否含退款：待确认假设=不含"）。
2. **边界与异常**：列出关键异常场景及处理（例：改单/退单/超卖/售罄/重复提交/数据漏填时怎么办）。
3. **验收标准**：可验证的成功定义，最好给一组"黄金样例"（一组输入数据 → 期望输出），让工程师能自测。
4. **部署与载体**：做成什么形态（网页/小程序/桌面/Excel）、数据存哪、管理端长什么样、单人用还是多人用、谁来维护。

【地基优先】proposal_md 的顺序要"先地基后功能"：先把上面四块（数据模型/边界异常/验收/部署这些地基）讲清楚夯实，再讲具体功能特性——让 AI 照着做时是从地基往上盖，而不是先堆功能、地基留空，导致看不见的地方全是屎山和雷。

输出格式要求：
1. 只输出一个 JSON 对象，不要代码围栏，不要其他文字。
2. 严格遵守 OpenSpec 规范：
   - Requirement 用 SHALL/MUST/SHOULD/MAY 表示强度
   - 每个 Requirement 至少一个 Scenario
   - Scenario 用且仅用 4 个井号（####）
   - WHEN/THEN 必须加粗（**WHEN** / **THEN**）
3. specs 数组至少 2 个能力（capability），按功能模块划分，全部用 kebab-case。
4. tasks_md 要能让人照着一步步做完，含数据结构搭建、核心逻辑、验收自测三类任务。

输出 JSON 结构：
{
  "change_id": "kebab-case-项目名",
  "proposal_md": "# Proposal: ...\\n## Why...\\n## What Changes...\\n## Impact...\\n## In Scope...\\n## Out of Scope...",
  "tasks_md": "# Implementation Tasks\\n## 1. 阶段\\n- [ ] 1.1 ...",
  "design_md": null,
  "specs": [
    {
      "capability": "kebab-case-能力名",
      "spec_md": "## ADDED Requirements\\n### Requirement: ...\\nThe system SHALL ...\\n#### Scenario: ...\\n- **WHEN** ...\\n- **THEN** ..."
    }
  ]
}`

/** 把 slots 序列化为人话摘要，注入 deliver 提示词 */
function slotsToContext(slots: Slots): string {
  const lines: string[] = ['以下是从与用户的对话中收集到的完整需求信息：', '']
  const labels: Record<string, string> = {
    product_one_liner:   '项目一句话',
    target_user:         '目标用户',
    pain_point:          '核心痛点',
    current_workaround:  '现有替代方案',
    must_have:           '第一版必须有',
    nice_to_have:        '可以先砍的',
    explicit_non_goals:  '明确不做的',
    form_factor:         '产品形态',
    key_tradeoff:        '关键取舍',
    budget_time:         '时间盘子',
    modules:             '模块划分',
    done_criteria:       '完成标准',
    // 直播专属
    biz_pillar:   '业务方向',
    buildable:    '要做的工具',
    data_origin:  '数据来源',
    audience:     '使用对象',
  }
  for (const [key, label] of Object.entries(labels)) {
    const v = slots[key]
    if (!v) continue
    const text = Array.isArray(v) ? v.join('、') : String(v)
    if (text) lines.push(`- **${label}**：${text}`)
  }
  return lines.join('\n')
}

/** 调 deliver 代理（v4-pro + thinking high）生成 OpenSpec 提案包 */
export async function generateOpenSpecPack(slots: Slots): Promise<OpenSpecPack> {
  const userContent = slotsToContext(slots)

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: 'deliver',
      system: OPENSPEC_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '提案包生成失败' }))
    throw new Error((err as { error: string }).error)
  }

  const result = await res.json() as {
    choices?: Array<{ message: { content: string } }>
    error?: { message: string }
  }
  if (result.error) throw new Error(result.error.message)

  const raw = result.choices?.[0]?.message?.content ?? ''
  const parsed = parseModelOutput(raw)

  // 从 parsed.deliverables.openspec_pack 或者直接从原始 JSON 取
  const packRaw = (() => {
    try { return JSON.parse(raw) as OpenSpecPack }
    catch { return null }
  })()

  const pack = packRaw ?? parsed.deliverables.openspec_pack
  if (!pack) throw new Error('模型未返回合法的提案包结构')

  // change_id 去掉空格/特殊字符
  const safeId = String(pack.change_id ?? 'unnamed').toLowerCase().replace(/[^a-z0-9-]/g, '-')
  return { ...pack, change_id: safeId }
}

// ── 验收清单（借鉴 Kun 的 /review，翻成不懂技术的人能亲手核对的大白话清单）──────────
const CHECKLIST_SYSTEM = `你是一位专业的产品验收专家。把聊出来的需求，转成一份给【完全不懂技术的人】（老板/店主/运营）在东西做出来后，能自己一条条对照检查的验收清单。

核心要求：
1. 只输出一个 JSON 对象，不要代码围栏，不要其它文字。
2. 每一条都要让不懂技术的人看得懂、并且能【亲眼看到或亲手试出来】是否达标——禁止技术术语，禁止"接口正确""数据库无异常"这类他判断不了的说法。
3. 每条 = what（要检查的东西，大白话）+ how（怎么算通过：一个具体、可观察、能当场验证的判断标准，最好带一个可照做的小例子）。
   ✅ what:"熟客能自己提前下单"  how:"用你自己的微信打开，选2斤苹果提交，页面能显示'下单成功'，并出现在你的订单列表里"
   ❌ what:"下单接口可用"  how:"POST /order 返回200"
4. 按模块/方面分组（groups），每组 3-6 条，总条数控制在 10-20 条，覆盖：核心功能能不能用、数据对不对、常见异常（比如填错、重复、售罄）会不会出乱子、给谁看的那个人看不看得懂。
5. intro 用一句大白话说明"这份清单怎么用"（比如"东西做好后，你拿着这份单子一条条试，全打勾就算验收通过"）。

输出 JSON 结构：
{
  "title": "XX 验收清单",
  "intro": "一句话说明怎么用",
  "groups": [
    { "module": "分组名（大白话）", "items": [ { "what": "检查什么", "how": "怎么算通过（可当场看到/试出来）" } ] }
  ]
}`

/** 调 deliver 代理（v4-pro）生成验收清单 */
export async function generateChecklist(slots: Slots): Promise<AcceptanceChecklist> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: 'deliver',
      system: CHECKLIST_SYSTEM,
      messages: [{ role: 'user', content: slotsToContext(slots) }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '验收清单生成失败' }))
    throw new Error((err as { error: string }).error)
  }

  const result = await res.json() as {
    choices?: Array<{ message: { content: string } }>
    error?: { message: string }
  }
  if (result.error) throw new Error(result.error.message)

  const raw = result.choices?.[0]?.message?.content ?? ''
  const parsed = (() => {
    try {
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start === -1 || end === -1) return null
      return JSON.parse(raw.slice(start, end + 1)) as AcceptanceChecklist
    } catch { return null }
  })()

  if (!parsed || !Array.isArray(parsed.groups)) throw new Error('模型未返回合法的验收清单结构')
  return {
    title: parsed.title || '验收清单',
    intro: parsed.intro || '东西做好后，拿着这份清单一条条试，全打勾就算验收通过。',
    groups: parsed.groups.filter(g => g && Array.isArray(g.items)),
  }
}

// ── 地基体检（核心差异化）：把小白看不见的"金字塔地基"挖出来、显性化 ──────────────
const FOUNDATION_SYSTEM = `你是一位经验丰富的架构师，最擅长的是——看见外行看不见的"地基"。

背景与使命：计算机是个金字塔，用户（完全不懂技术）只看得见最顶上那个"功能做出来了"的尖。可真正让产品出事的，是他压根不知道存在、也不知道该问的【地基】：数据放哪安不安全、别人能不能乱访问、用户一多卡不卡、出错了怎么办、上线域名证书、每月要花多少钱、以后谁来改……用 AI 一把梭（vibe coding）出来的产品，顶好看，底下往往是屎山和一堆看不见的雷。
你的任务：就着用户聊出来的需求，做一次"地基体检"——把这个项目真正相关的地基项挖出来，用大白话讲清楚，让 AI 能从地基往上盖，而不是只盖个漂亮的尖。

地基清单（按项目实际情况挑相关的，别硬凑；一般 5-9 项）：
- 数据与隐私：数据存哪、有没有敏感信息（手机号/身份证/钱）、会不会泄露、要不要备份、丢了怎么办
- 安全与权限：谁能访问、要不要登录、别人能不能偷看/乱改/爬走你的数据
- 性能与加速：访问快不快、用户多了卡不卡、图片资源、境外访问慢（CDN）
- 稳定与容错：出错/断网/超时怎么办、并发抢购、脏数据、边界情况（屎山最爱藏这）
- 部署与上线：域名、HTTPS 证书、服务器在哪、怎么发布、宕机
- 成本：一次性 vs 每月一直花、用量涨了成本涨多少
- 可维护：以后谁来改、改一处会不会崩别处、代码乱不乱
- 可扩展/并发：从 10 个用户到 1 万个要不要重做、瓶颈在哪
- 监控与日志：出问题你怎么第一时间知道、能不能查到原因
- 合规/可被发现：备案、内容合规、能不能被搜到/被 AI 引用（SEO/GEO）、无障碍

输出要求：
1. 只输出一个 JSON 对象，不要代码围栏，不要其它文字。
2. 每一项 = area（分类）+ plain（这块是啥、为什么对他这个项目重要，大白话，禁术语，能打比方就打比方）+ ifIgnored（不管它会埋什么雷/变成什么屎山/以后出什么问题，要具体、有痛感）+ todo（打地基该怎么做，让 AI 从这往上盖，给一句能落地的做法）+ risk（对他这个项目的风险："high"/"medium"/"low"，按真实相关度和后果严重度给，别全给 high）。
3. 按风险从高到低排。intro 用一句大白话说明这份体检在帮他看什么（例："这些是你看不见、但最容易在上线后翻车的地方，先把地基夯实，AI 才能盖得稳"）。

输出 JSON 结构：
{
  "title": "XX 地基体检",
  "intro": "一句话",
  "items": [
    { "area": "数据与隐私", "plain": "...", "ifIgnored": "...", "todo": "...", "risk": "high" }
  ]
}`

/** 调 deliver 代理（v4-pro）生成地基体检报告 */
export async function generateFoundationReport(slots: Slots): Promise<FoundationReport> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope: 'deliver',
      system: FOUNDATION_SYSTEM,
      messages: [{ role: 'user', content: slotsToContext(slots) }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '地基体检生成失败' }))
    throw new Error((err as { error: string }).error)
  }

  const result = await res.json() as {
    choices?: Array<{ message: { content: string } }>
    error?: { message: string }
  }
  if (result.error) throw new Error(result.error.message)

  const raw = result.choices?.[0]?.message?.content ?? ''
  const parsed = (() => {
    try {
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start === -1 || end === -1) return null
      return JSON.parse(raw.slice(start, end + 1)) as FoundationReport
    } catch { return null }
  })()

  if (!parsed || !Array.isArray(parsed.items)) throw new Error('模型未返回合法的地基体检结构')
  const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>
  return {
    title: parsed.title || '地基体检',
    intro: parsed.intro || '这些是你看不见、但最容易在上线后翻车的地方——先把地基夯实，AI 才能盖得稳。',
    items: parsed.items
      .filter(it => it && it.plain)
      .map(it => ({ ...it, risk: (['high', 'medium', 'low'].includes(it.risk) ? it.risk : 'medium') as FoundationItem['risk'] }))
      .sort((a, b) => (rank[a.risk] ?? 1) - (rank[b.risk] ?? 1)),
  }
}

/** §T033 打 ZIP 并下载 */
export async function exportPackAsZip(pack: OpenSpecPack): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const base = `changes/${pack.change_id}`

  zip.file(`${base}/proposal.md`, pack.proposal_md ?? '')
  zip.file(`${base}/tasks.md`, pack.tasks_md ?? '')
  if (pack.design_md) zip.file(`${base}/design.md`, pack.design_md)

  for (const spec of pack.specs ?? []) {
    zip.file(`${base}/specs/${spec.capability}/spec.md`, spec.spec_md ?? '')
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${pack.change_id}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
