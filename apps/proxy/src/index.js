// 薄代理：藏 Key + 转发 + 限流 + 花费熔断
// chat scope: 有 CLAUDE_API_KEY → claude-opus-4-8；无 → deepseek-v4-flash
// 2026-07 增：角色提示词覆盖读写（roles_get / roles_save，复用 /api/chat 路由，不动 nginx）
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'

const PORT = Number(process.env.PROXY_PORT ?? 3001)
const ROLES_FILE = process.env.EB_ROLES_FILE ?? './data/eb-roles.json'
const ADMIN_PASSWORD = process.env.EB_ADMIN_PASSWORD ?? 'change_me'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? ''
const CLAUDE_API_KEY   = process.env.CLAUDE_API_KEY ?? ''
const DAILY_LIMIT_USD  = Number(process.env.DAILY_LIMIT_USD ?? 5)
const RATE_RPM         = Number(process.env.RATE_RPM ?? 20)
const MAX_CONCURRENT   = Number(process.env.MAX_CONCURRENT ?? 5)
const ALLOWED_ORIGIN   = process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000'

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// §2 scope → model 映射（chat 优先 Opus 4.8，无 Claude key 降级 DeepSeek）
function resolveModel(scope) {
  // 全部走 DeepSeek V4-Pro，不使用任何 Claude 模型
  if (scope === 'chat')    return 'deepseek-v4-pro'
  if (scope === 'deliver') return 'deepseek-v4-pro'
  return null
}

// 是否走 Anthropic API
function isClaudeModel(model) {
  return model.startsWith('claude-')
}

// DeepSeek 额外参数
function deepseekParams(scope) {
  // 聊天：每轮要结构化 JSON、要快，不开思考（避免逐轮长延迟）
  if (scope === 'chat') {
    return {
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
    }
  }
  // deliver：生成提案包/清单/地基体检，重质量，开思考
  return {
    thinking: { type: 'enabled' },
    reasoning_effort: 'high',
  }
}

// 保守估算：USD / token
const TOKEN_PRICE = {
  'deepseek-v4-flash': { in: 0.000000027,  out: 0.00000011 },
  'deepseek-v4-pro':   { in: 0.00000027,   out: 0.0000011  },
  'claude-opus-4-8':   { in: 0.000015,     out: 0.000075   },
}

// 日花费追踪
let dayKey = todayKey()
let dailyUSD = 0

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function trackSpend(model, usage) {
  const today = todayKey()
  if (today !== dayKey) { dayKey = today; dailyUSD = 0 }
  const p = TOKEN_PRICE[model]
  if (!p || !usage) return
  const inTokens  = usage.prompt_tokens  ?? usage.input_tokens  ?? 0
  const outTokens = usage.completion_tokens ?? usage.output_tokens ?? 0
  dailyUSD += inTokens * p.in + outTokens * p.out
  console.log(`[proxy] model=${model} in=${inTokens} out=${outTokens} spend=$${dailyUSD.toFixed(4)}/$${DAILY_LIMIT_USD}`)
  if (dailyUSD >= DAILY_LIMIT_USD) {
    console.warn('[proxy] DAILY LIMIT REACHED — rejecting new requests until midnight')
  }
}

// 滑动窗口限流：per IP
const rateMap = new Map()

function checkRate(ip) {
  const now = Date.now()
  let hits = (rateMap.get(ip) ?? []).filter(t => now - t < 60_000)
  if (hits.length >= RATE_RPM) return false
  hits.push(now)
  rateMap.set(ip, hits)
  return true
}

let concurrent = 0

// ─── helpers ────────────────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw)) }
      catch { reject(new Error('invalid json')) }
    })
    req.on('error', reject)
  })
}

function setCORS(res, origin) {
  const allowed = ALLOWED_ORIGIN.split(',').map(s => s.trim())
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// Anthropic 响应 → OpenAI 格式（前端 parseJson.ts 不感知差异）
function transformAnthropicToOpenAI(result) {
  const text = (result.content ?? []).find(c => c.type === 'text')?.text ?? ''
  return {
    choices: [{ message: { role: 'assistant', content: text } }],
    usage: {
      prompt_tokens:     result.usage?.input_tokens  ?? 0,
      completion_tokens: result.usage?.output_tokens ?? 0,
    },
  }
}

// ─── server ─────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const origin = req.headers['origin'] ?? ''
  setCORS(res, origin)

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.url === '/api/health' && req.method === 'GET') {
    const today = todayKey()
    if (today !== dayKey) { dayKey = today; dailyUSD = 0 }
    send(res, 200, {
      ok: true,
      daily_usd: dailyUSD.toFixed(4),
      daily_limit_usd: DAILY_LIMIT_USD,
      concurrent,
      claude_key_set: !!CLAUDE_API_KEY,
    })
    return
  }

  if (req.method !== 'POST' || req.url !== '/api/chat') {
    send(res, 404, { error: 'not found' }); return
  }

  // 先解析 body：管理端角色读写复用本路由，需在限流/熔断之前处理
  let body
  try { body = await parseBody(req) }
  catch { send(res, 400, { error: 'invalid json' }); return }

  // ── 管理端：角色提示词覆盖（读/写），不计入限流与花费 ──────────────────────────
  if (body && body.scope === 'roles_get') {
    try {
      const parsed = JSON.parse(await readFile(ROLES_FILE, 'utf8'))
      send(res, 200, parsed && typeof parsed === 'object' ? parsed : { roles: {} })
    } catch { send(res, 200, { roles: {} }) }
    return
  }
  if (body && body.scope === 'roles_save') {
    if (body.token !== ADMIN_PASSWORD) { send(res, 401, { error: 'unauthorized' }); return }
    const roles = (body.roles && typeof body.roles === 'object') ? body.roles : {}
    try {
      await writeFile(ROLES_FILE, JSON.stringify({ roles, updatedAt: new Date().toISOString() }, null, 2), 'utf8')
      send(res, 200, { ok: true })
    } catch (e) { send(res, 500, { error: 'write failed: ' + (e && e.message) }) }
    return
  }

  const ip = req.socket.remoteAddress ?? 'unknown'

  if (!checkRate(ip)) {
    send(res, 429, { error: '请求太频繁，请稍后再试' }); return
  }

  { const today = todayKey(); if (today !== dayKey) { dayKey = today; dailyUSD = 0 } }
  if (dailyUSD >= DAILY_LIMIT_USD) {
    send(res, 429, { error: '今日额度已用完，明日再来吧' }); return
  }

  if (concurrent >= MAX_CONCURRENT) {
    send(res, 503, { error: '当前请求太多，请稍后再试' }); return
  }

  const { scope, system, messages } = body
  if (!scope || !Array.isArray(messages) || messages.length === 0) {
    send(res, 400, { error: 'scope 和 messages 必填' }); return
  }

  const model = resolveModel(scope)
  if (!model) { send(res, 400, { error: `未知 scope: ${scope}` }); return }

  const useClaude = isClaudeModel(model)

  // API key 检查
  if (useClaude && !CLAUDE_API_KEY) {
    send(res, 500, { error: 'CLAUDE_API_KEY 未配置' }); return
  }
  if (!useClaude && !DEEPSEEK_API_KEY) {
    send(res, 500, { error: 'DEEPSEEK_API_KEY 未配置' }); return
  }

  const timeoutMs = scope === 'deliver' ? 180_000 : 60_000
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)

  concurrent++
  try {
    let upstreamRes, result

    if (useClaude) {
      // ── Anthropic API ──────────────────────────────────────────────────────
      const anthropicMessages = messages.filter(m => m.role !== 'system')
      const anthropicBody = {
        model,
        max_tokens: 4096,
        messages: anthropicMessages,
        ...(system ? { system } : {}),
      }

      upstreamRes = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(anthropicBody),
        signal: ctrl.signal,
      })

      clearTimeout(timer)
      const raw = await upstreamRes.json()

      if (!upstreamRes.ok) {
        console.error('[proxy] Anthropic error:', JSON.stringify(raw))
        send(res, upstreamRes.status, { error: raw.error?.message ?? '上游错误' })
        return
      }

      if (raw.usage) trackSpend(model, raw.usage)
      result = transformAnthropicToOpenAI(raw)

    } else {
      // ── DeepSeek API ──────────────────────────────────────────────────────
      const payload = {
        model,
        messages: system
          ? [{ role: 'system', content: system }, ...messages]
          : messages,
        ...deepseekParams(scope),
      }

      upstreamRes = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      })

      clearTimeout(timer)
      result = await upstreamRes.json()

      if (result.usage) trackSpend(model, result.usage)
    }

    res.writeHead(useClaude ? 200 : upstreamRes.status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(result))

  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      send(res, 504, { error: '生成超时，请重试' })
    } else {
      console.error('[proxy] upstream error:', err.message)
      send(res, 502, { error: '上游服务暂时不可用' })
    }
  } finally {
    concurrent--
  }
})

server.listen(PORT, () => {
  console.log(`[proxy] 启动 http://localhost:${PORT}`)
  if (!DEEPSEEK_API_KEY) console.warn('[proxy] ⚠️  DEEPSEEK_API_KEY 未设置')
  if (CLAUDE_API_KEY)    console.log(`[proxy] ✅ CLAUDE_API_KEY 已配置 — chat scope → claude-opus-4-8`)
  else                   console.log(`[proxy] ℹ️  CLAUDE_API_KEY 未配置 — chat scope → deepseek-v4-flash (降级)`)
})
