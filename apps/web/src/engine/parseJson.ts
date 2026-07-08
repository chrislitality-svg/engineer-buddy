// §4.1 JSON 容错解析器（必须实现，不白屏）
// 策略：原文 → 剥代码围栏 → 抽取最外层 {...} → 仍失败则包装为普通 message
import type { Turn, Deliverables, Interaction } from './protocol'

const FALLBACK_INTERACTION: Interaction = { type: 'text', key: '_raw', label: '请继续' }
const FALLBACK_DELIVERABLES: Deliverables = { prompt: null, openspec_pack: null, showcase: null }

function stripFences(raw: string): string {
  // 剥 ```json … ``` 或 ``` … ```
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

function extractOuterBrace(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

export function parseModelOutput(raw: string): Turn {
  const attempts = [
    () => JSON.parse(raw),
    () => JSON.parse(stripFences(raw)),
    () => {
      const extracted = extractOuterBrace(raw)
      if (!extracted) throw new Error('no brace')
      return JSON.parse(extracted)
    },
    () => {
      const extracted = extractOuterBrace(stripFences(raw))
      if (!extracted) throw new Error('no brace after strip')
      return JSON.parse(extracted)
    },
  ]

  for (const attempt of attempts) {
    try {
      const obj = attempt() as Partial<Turn>
      // 基础结构校验 + 补默认值
      return {
        stage:          obj.stage ?? 'discovery',
        stage_progress: typeof obj.stage_progress === 'number' ? obj.stage_progress : 0,
        gaps:           Array.isArray(obj.gaps) ? obj.gaps : [],
        slots_update:   obj.slots_update && typeof obj.slots_update === 'object' ? obj.slots_update as Record<string, unknown> : {},
        message:        typeof obj.message === 'string' ? obj.message : raw,
        interaction:    obj.interaction ?? FALLBACK_INTERACTION,
        deliverables:   obj.deliverables ?? FALLBACK_DELIVERABLES,
      }
    } catch {
      // 继续下一个策略
    }
  }

  // 全部失败：把原文当普通 message，加 text 控件让用户继续
  return {
    stage:          'discovery',
    stage_progress: 0,
    gaps:           [],
    slots_update:   {},
    message:        raw,
    interaction:    FALLBACK_INTERACTION,
    deliverables:   FALLBACK_DELIVERABLES,
  }
}
