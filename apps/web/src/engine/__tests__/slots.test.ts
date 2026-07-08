import { describe, it, expect } from 'vitest'
import { computeGaps, getRequiredSlots, SLOTS } from '../slots'

describe('SLOTS 词典', () => {
  it('所有 slot 都有合法 stage 和非空 label', () => {
    const VALID_STAGES = new Set(['discovery', 'scope', 'approach', 'plan', 'deliver'])
    for (const s of SLOTS) {
      expect(VALID_STAGES.has(s.stage), `${s.key} stage 非法`).toBe(true)
      expect(s.label.length, `${s.key} label 为空`).toBeGreaterThan(0)
    }
  })

  it('getRequiredSlots: product domain discovery 返回正确必填项', () => {
    const required = getRequiredSlots('discovery', 'product')
    const keys = required.map(s => s.key)
    expect(keys).toContain('product_one_liner')
    expect(keys).toContain('target_user')
    expect(keys).toContain('pain_point')
    // 直播专属 slot 不在 product 里
    expect(keys).not.toContain('biz_pillar')
    expect(keys).not.toContain('data_origin')
  })

  it('getRequiredSlots: livestream domain discovery 含直播专属 slot', () => {
    const required = getRequiredSlots('discovery', 'livestream')
    const keys = required.map(s => s.key)
    expect(keys).toContain('biz_pillar')
    expect(keys).toContain('buildable')
    expect(keys).toContain('data_origin')
  })
})

describe('computeGaps', () => {
  it('全空时返回所有必填 gap', () => {
    const gaps = computeGaps('discovery', 'product', {})
    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps.some(g => g.key === 'product_one_liner')).toBe(true)
  })

  it('填完必填后 gaps 为空', () => {
    const filled = {
      product_one_liner: '一个记账工具',
      target_user: '个人用户',
      pain_point: '记账太麻烦',
    }
    const gaps = computeGaps('discovery', 'product', filled)
    expect(gaps).toHaveLength(0)
  })

  it('空数组视为未填', () => {
    const filled = {
      product_one_liner: '工具',
      target_user: '用户',
      pain_point: '',          // 空字符串
    }
    const gaps = computeGaps('discovery', 'product', filled)
    expect(gaps.some(g => g.key === 'pain_point')).toBe(true)
  })

  it('scope 阶段 must_have 为空数组视为未填', () => {
    const filled = { must_have: [] }
    const gaps = computeGaps('scope', 'product', filled)
    expect(gaps.some(g => g.key === 'must_have')).toBe(true)
  })

  it('scope 阶段 must_have 有值时清除 gap', () => {
    const filled = { must_have: ['登录', '列表'] }
    const gaps = computeGaps('scope', 'product', filled)
    expect(gaps.some(g => g.key === 'must_have')).toBe(false)
  })
})
