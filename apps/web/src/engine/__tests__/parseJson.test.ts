import { describe, it, expect } from 'vitest'
import { parseModelOutput } from '../parseJson'

const VALID_TURN = {
  stage: 'discovery',
  stage_progress: 30,
  gaps: ['还没问清痛点'],
  slots_update: { product_one_liner: '一个记账小工具' },
  message: '好的，你想做个记账小工具，给谁用呢？',
  interaction: { type: 'text', key: 'target_user', label: '给谁用' },
  deliverables: { prompt: null, openspec_pack: null, showcase: null },
}

describe('parseModelOutput', () => {
  it('正常 JSON 直接解析', () => {
    const raw = JSON.stringify(VALID_TURN)
    const result = parseModelOutput(raw)
    expect(result.stage).toBe('discovery')
    expect(result.stage_progress).toBe(30)
    expect(result.message).toBe('好的，你想做个记账小工具，给谁用呢？')
    expect(result.slots_update).toEqual({ product_one_liner: '一个记账小工具' })
  })

  it('剥 json 代码围栏', () => {
    const raw = '```json\n' + JSON.stringify(VALID_TURN) + '\n```'
    const result = parseModelOutput(raw)
    expect(result.stage).toBe('discovery')
    expect(result.message).toBe('好的，你想做个记账小工具，给谁用呢？')
  })

  it('剥普通代码围栏', () => {
    const raw = '```\n' + JSON.stringify(VALID_TURN) + '\n```'
    const result = parseModelOutput(raw)
    expect(result.stage).toBe('discovery')
  })

  it('抽取最外层大括号（前缀垃圾文字）', () => {
    const raw = '好的，以下是 JSON：\n' + JSON.stringify(VALID_TURN) + '\n希望有帮助。'
    const result = parseModelOutput(raw)
    expect(result.stage).toBe('discovery')
    expect(result.message).toBe('好的，你想做个记账小工具，给谁用呢？')
  })

  it('完全无法解析时不白屏，原文当 message', () => {
    const raw = '对不起，我无法生成 JSON。'
    const result = parseModelOutput(raw)
    expect(result.message).toBe(raw)
    expect(result.stage).toBe('discovery')
    expect(result.interaction.type).toBe('text')
    expect(result.deliverables.prompt).toBeNull()
  })

  it('缺字段时补默认值', () => {
    const raw = JSON.stringify({ message: '你好' })
    const result = parseModelOutput(raw)
    expect(result.stage).toBe('discovery')
    expect(result.stage_progress).toBe(0)
    expect(result.gaps).toEqual([])
    expect(result.slots_update).toEqual({})
    expect(result.interaction.type).toBe('text')
  })

  it('stage_progress 非数字时补 0', () => {
    const raw = JSON.stringify({ ...VALID_TURN, stage_progress: 'high' })
    const result = parseModelOutput(raw)
    expect(result.stage_progress).toBe(0)
  })

  it('gaps 非数组时补 []', () => {
    const raw = JSON.stringify({ ...VALID_TURN, gaps: 'some gap' })
    const result = parseModelOutput(raw)
    expect(result.gaps).toEqual([])
  })
})
