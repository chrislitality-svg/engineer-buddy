import { describe, it, expect } from 'vitest'
import { mergeSlots, normalizeAnswer } from '../slotsReducer'

describe('mergeSlots', () => {
  it('空 current + 模型更新 → 接受模型值', () => {
    const result = mergeSlots({}, { product_one_liner: '记账工具', target_user: '个人用户' })
    expect(result.product_one_liner).toBe('记账工具')
    expect(result.target_user).toBe('个人用户')
  })

  it('用户答案覆盖模型值', () => {
    const current = { product_one_liner: '记账工具' }
    const modelUpdate = { product_one_liner: '模型猜的其他值' }
    const userAnswer = { product_one_liner: '用户说的才是准的' }
    const result = mergeSlots(current, modelUpdate, userAnswer)
    expect(result.product_one_liner).toBe('用户说的才是准的')
  })

  it('模型不覆盖用户已填的值', () => {
    const current = { target_user: '用户已填' }
    const modelUpdate = { target_user: '模型想改' }
    const result = mergeSlots(current, modelUpdate)
    expect(result.target_user).toBe('用户已填')
  })

  it('模型可以补充用户未填的 slot', () => {
    const current = { product_one_liner: '记账工具' }
    const modelUpdate = { target_user: '个人用户', pain_point: '记账麻烦' }
    const result = mergeSlots(current, modelUpdate)
    expect(result.product_one_liner).toBe('记账工具')
    expect(result.target_user).toBe('个人用户')
    expect(result.pain_point).toBe('记账麻烦')
  })

  it('null / 空字符串视为空，模型可填', () => {
    const current = { pain_point: '' }
    const modelUpdate = { pain_point: '记账麻烦' }
    const result = mergeSlots(current, modelUpdate)
    expect(result.pain_point).toBe('记账麻烦')
  })

  it('不改变其他已有 slot', () => {
    const current = { product_one_liner: '工具', target_user: '个人' }
    const modelUpdate = { pain_point: '麻烦' }
    const result = mergeSlots(current, modelUpdate)
    expect(result.product_one_liner).toBe('工具')
    expect(result.target_user).toBe('个人')
    expect(result.pain_point).toBe('麻烦')
  })

  it('不传 userAnswer 时只合并模型值', () => {
    const result = mergeSlots({ a: '1' }, { b: '2' })
    expect(result).toEqual({ a: '1', b: '2' })
  })
})

describe('normalizeAnswer', () => {
  it('文本回答', () => {
    expect(normalizeAnswer('target_user', '个人用户')).toEqual({ target_user: '个人用户' })
  })

  it('单选回答', () => {
    expect(normalizeAnswer('form_factor', '网页')).toEqual({ form_factor: '网页' })
  })

  it('多选回答（数组）', () => {
    expect(normalizeAnswer('must_have', ['登录', '列表'])).toEqual({ must_have: ['登录', '列表'] })
  })

  it('滑块（数字）', () => {
    expect(normalizeAnswer('complexity', 3)).toEqual({ complexity: 3 })
  })

  it('空值返回空对象', () => {
    expect(normalizeAnswer('key', '')).toEqual({})
  })
})
