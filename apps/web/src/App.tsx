// 主应用：挑搭子 → 五阶段对话 → 三种产出
import { useState, useCallback, useEffect } from 'react'
import type { Session, Turn, Deliverables, OpenSpecPack, SessionMeta, DecisionNode } from './engine/protocol'
import type { Stage } from './engine/slots'
import { createSession, runTurn } from './engine/turn'
import { normalizeAnswer } from './engine/slotsReducer'
import { parseModelOutput } from './engine/parseJson'
import { generateStagePrompts } from './engine/templateEngine'
import { generateOpenSpecPack, generateChecklist, generateFoundationReport } from './engine/deliverEngine'
import { localStorageAdapter } from './store/LocalStorageAdapter'
import { useRoster, type EffectiveRole } from './roles/store'
import { findRole } from './roles/roster'
import { assembleTeamPrompt } from './prompts/base'
import { RoleSelect } from './components/RoleSelect'

// 团队开场白（主搭子胡一村主持，需要时叫队友）—— 专业、可信、又不端着
const TEAM_GREETING = '你好，我是这边的产品经理。\n\n我们是一支完整的产品团队：我全程陪你把需求理清楚；涉及技术选型、底层架构、落地拆解的环节，会交给对应的专家（技术架构师、体验设计师、交付负责人），你不必自己判断该找谁。\n\n我们要一起完成的，是把一个还模糊的想法，聊成一份工程师或 AI 能直接照着开工、而且地基扎实的完整方案。\n\n先用一句话说说：你想做的，是一个什么样的东西？'
import { ProgressPanel } from './components/ProgressPanel'
import { CanvasBoard } from './components/CanvasBoard'
import { ConversationPanel } from './components/ConversationPanel'

interface DisplayMsg { role: 'user' | 'assistant'; content: string }

// ── 主对话界面（三栏布局）────────────────────────────────────────────────────
interface ChatViewProps {
  session: Session
  role: EffectiveRole
  displayMsgs: DisplayMsg[]
  currentTurn: Turn | null
  loading: boolean
  error: string
  onAnswer: (value: string | string[] | number) => void
  onReset: () => void
  onGeneratePack: () => void
  packGenerating: boolean
  onGenerateChecklist: () => void
  checklistGenerating: boolean
  onGenerateFoundation: () => void
  foundationGenerating: boolean
}

function ChatView({ session, role, displayMsgs, currentTurn, loading, error, onAnswer, onReset, onGeneratePack, packGenerating, onGenerateChecklist, checklistGenerating, onGenerateFoundation, foundationGenerating }: ChatViewProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-2)' }}>
      <ProgressPanel currentStage={session.currentStage as Stage} role={role} onReset={onReset} />
      <CanvasBoard session={session} role={role} />
      <ConversationPanel
        role={role}
        displayMsgs={displayMsgs}
        currentTurn={currentTurn}
        loading={loading}
        error={error}
        onAnswer={onAnswer}
        onGeneratePack={onGeneratePack}
        packGenerating={packGenerating}
        onGenerateChecklist={onGenerateChecklist}
        checklistGenerating={checklistGenerating}
        onGenerateFoundation={onGenerateFoundation}
        foundationGenerating={foundationGenerating}
        currentStage={session.currentStage}
        slots={session.slots}
      />
    </div>
  )
}

// ── 根组件 ────────────────────────────────────────────────────────────────────
export default function App() {
  const { roster } = useRoster()
  const [role, setRole] = useState<EffectiveRole | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [displayMsgs, setDisplayMsgs] = useState<DisplayMsg[]>([])
  const [currentTurn, setCurrentTurn] = useState<Turn | null>(null)
  const [loading, setLoading] = useState(false)
  const [packGenerating, setPackGenerating] = useState(false)
  const [checklistGenerating, setChecklistGenerating] = useState(false)
  const [foundationGenerating, setFoundationGenerating] = useState(false)
  const [error, setError] = useState('')
  const [sessionList, setSessionList] = useState<SessionMeta[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    localStorageAdapter.listSessions().then(setSessionList)
  }, [])

  useEffect(() => {
    if (!session) return
    localStorageAdapter.saveSession(session).then(() =>
      localStorageAdapter.listSessions().then(setSessionList)
    )
  }, [session])

  // 开始：一个团队会话（主搭子胡一村主持，队友按情况出场；用户不用选）
  const startSession = useCallback(() => {
    const host = findRole(roster, 'pm')
    const teamPrompt = assembleTeamPrompt(roster.map(r => ({
      name: r.name, title: r.title, strengths: r.strengths, persona: r.persona, domain: r.domain,
    })))
    const s = createSession(host.domain, { roleId: host.id, systemPrompt: teamPrompt })
    setRole(host)
    setSession(s)
    setError('')
    setCurrentTurn({
      stage: 'discovery',
      stage_progress: 0,
      gaps: [],
      slots_update: {},
      message: TEAM_GREETING,
      interaction: { type: 'text', key: 'product_one_liner', label: '' },
      deliverables: { prompt: null, openspec_pack: null, showcase: null },
    })
    setDisplayMsgs([{ role: 'assistant', content: TEAM_GREETING }])
  }, [roster])

  const handleAnswer = useCallback(async (value: string | string[] | number) => {
    if (!session || !currentTurn) return
    const displayText = Array.isArray(value) ? value.join('、') : String(value)
    const userAnswer = normalizeAnswer(currentTurn.interaction.key, value)

    setDisplayMsgs(prev => [...prev, { role: 'user', content: displayText }])
    setLoading(true)
    setError('')

    try {
      const { turn, updatedSession } = await runTurn(session, displayText, userAnswer)
      const newDeliverables = { ...updatedSession.deliverables }

      // 只有真正走到 deliver 阶段，才接受模型内联产出的展示书/提案包（防止提前冒出交付物）
      if (updatedSession.currentStage === 'deliver') {
        accumulateDeliverables(turn.deliverables, newDeliverables)
      }

      // 每真正走完一个阶段（闸门放行），才生成刚完成那个阶段的阶段指令
      const stageAdvanced = (turn as Turn & { _stageAdvanced?: boolean })._stageAdvanced
      if (stageAdvanced) {
        const completedStage = session.currentStage as Stage
        const stagePrompts = generateStagePrompts(completedStage, updatedSession.domain, updatedSession.slots)
        for (const p of stagePrompts) {
          if (!newDeliverables.prompts.includes(p)) newDeliverables.prompts.push(p)
        }
      }

      // 记录决策节点：用户在 select 题上作答 + AI 提供了 option_details
      const prevInteraction = currentTurn?.interaction
      let newDecisions: DecisionNode[] = updatedSession.decisions ?? []
      if (
        prevInteraction &&
        (prevInteraction.type === 'single_select' || prevInteraction.type === 'multi_select') &&
        prevInteraction.option_details && prevInteraction.option_details.length > 0 &&
        typeof value !== 'number'
      ) {
        const node: DecisionNode = {
          id: `d_${Date.now()}`,
          stage: session.currentStage as Stage,
          question: prevInteraction.label,
          option_details: prevInteraction.option_details,
          chosen: value,
        }
        newDecisions = [...newDecisions, node]
      }

      const finalSession = { ...updatedSession, deliverables: newDeliverables, decisions: newDecisions }
      setSession(finalSession)
      setCurrentTurn(turn)
      setDisplayMsgs(prev => [...prev, { role: 'assistant', content: turn.message }])
    } catch (e) {
      setError(e instanceof Error ? e.message : '出错了，请重试')
    } finally {
      setLoading(false)
    }
  }, [session, currentTurn])

  const handleGeneratePack = useCallback(async () => {
    if (!session) return
    setPackGenerating(true)
    setError('')
    try {
      const pack: OpenSpecPack = await generateOpenSpecPack(session.slots)
      setSession(prev => {
        if (!prev) return prev
        return { ...prev, deliverables: { ...prev.deliverables, openspec_packs: [...prev.deliverables.openspec_packs, pack] } }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '提案包生成失败')
    } finally {
      setPackGenerating(false)
    }
  }, [session])

  const handleGenerateChecklist = useCallback(async () => {
    if (!session) return
    setChecklistGenerating(true)
    setError('')
    try {
      const checklist = await generateChecklist(session.slots)
      setSession(prev => {
        if (!prev) return prev
        return { ...prev, deliverables: { ...prev.deliverables, checklists: [...prev.deliverables.checklists, checklist] } }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '验收清单生成失败')
    } finally {
      setChecklistGenerating(false)
    }
  }, [session])

  const handleGenerateFoundation = useCallback(async () => {
    if (!session) return
    setFoundationGenerating(true)
    setError('')
    try {
      const report = await generateFoundationReport(session.slots)
      setSession(prev => {
        if (!prev) return prev
        return { ...prev, deliverables: { ...prev.deliverables, foundations: [...prev.deliverables.foundations, report] } }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '地基体检生成失败')
    } finally {
      setFoundationGenerating(false)
    }
  }, [session])

  const restoreSession = useCallback(async (id: string) => {
    const raw = await localStorageAdapter.loadSession(id)
    if (!raw) return
    const s: Session = {
      ...raw,
      decisions: raw.decisions ?? [],
      deliverables: {
        ...raw.deliverables,
        checklists: raw.deliverables?.checklists ?? [],
        foundations: raw.deliverables?.foundations ?? [],
      },
    }  // 兼容旧存档
    const r = findRole(roster, s.roleId ?? 'pm')
    setRole(r)
    setSession(s)
    setShowHistory(false)
    setError('')

    const bubbles: DisplayMsg[] = [{ role: 'assistant', content: TEAM_GREETING }]
    for (const m of s.messages) {
      if (m.role === 'user') {
        bubbles.push({ role: 'user', content: m.content })
      } else if (m.role === 'assistant') {
        try {
          const parsed = JSON.parse(m.content) as { message?: string }
          bubbles.push({ role: 'assistant', content: parsed.message ?? m.content })
        } catch {
          bubbles.push({ role: 'assistant', content: m.content })
        }
      }
    }
    setDisplayMsgs(bubbles)

    // 从最后一条 AI 消息重建 currentTurn，恢复后强制文本输入让用户继续聊
    const lastAIMsg = [...s.messages].reverse().find(m => m.role === 'assistant')
    if (lastAIMsg) {
      const parsed = parseModelOutput(lastAIMsg.content)
      setCurrentTurn({ ...parsed, interaction: { type: 'text', key: '_raw', label: '继续聊' } })
    } else {
      setCurrentTurn({
        stage: 'discovery', stage_progress: 0, gaps: [], slots_update: {},
        message: TEAM_GREETING,
        interaction: { type: 'text', key: 'product_one_liner', label: '' },
        deliverables: { prompt: null, openspec_pack: null, showcase: null },
      })
    }
  }, [roster])

  const reset = useCallback(() => {
    setSession(null)
    setRole(null)
    setDisplayMsgs([])
    setCurrentTurn(null)
    setError('')
    setShowHistory(false)
  }, [])

  const openAdmin = useCallback(() => { window.location.hash = '#/admin' }, [])

  if (!session || !role) return (
    <RoleSelect
      roster={roster}
      onStart={startSession}
      sessionList={sessionList}
      onRestore={restoreSession}
      onOpenAdmin={openAdmin}
      showHistory={showHistory}
      onToggleHistory={() => setShowHistory(v => !v)}
    />
  )

  return (
    <ChatView
      session={session}
      role={role}
      displayMsgs={displayMsgs}
      currentTurn={currentTurn}
      loading={loading}
      error={error}
      onAnswer={handleAnswer}
      onReset={reset}
      onGeneratePack={handleGeneratePack}
      packGenerating={packGenerating}
      onGenerateChecklist={handleGenerateChecklist}
      checklistGenerating={checklistGenerating}
      onGenerateFoundation={handleGenerateFoundation}
      foundationGenerating={foundationGenerating}
    />
  )
}

function accumulateDeliverables(d: Deliverables, target: Session['deliverables']) {
  if (d.prompt)         target.prompts.push(d.prompt)
  if (d.openspec_pack)  target.openspec_packs.push(d.openspec_pack)
  if (d.showcase)       target.showcases.push(d.showcase)
}
