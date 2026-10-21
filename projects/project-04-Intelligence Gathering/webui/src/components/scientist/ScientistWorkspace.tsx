import { useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  FlaskConical,
  Lightbulb,
  ListChecks,
  Loader2,
  Microscope,
  PenLine,
  Play,
  RefreshCw,
  ScrollText,
  SearchCheck,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { scientistApi, type BaseProjectRecommendation, type GeneratedIdeasResult, type IdeaFile, type ProductionTask, type ScientistCheck } from '@/lib/api'
import { Button } from '@/components/ui/button'

const stages = [
  { icon: Lightbulb, label: '想法生成', desc: '从热点与文献生成 idea.json' },
  { icon: FlaskConical, label: '实验执行', desc: 'Stage 0-4 验证框架并跑实验' },
  { icon: PenLine, label: '论文撰写', desc: '聚合图表并生成论文 PDF' },
  { icon: SearchCheck, label: '模拟审稿', desc: 'NeurIPS 风格评分与审稿意见' },
]

function statusText(task: ProductionTask): string {
  if (task.status === 'queued') return '排队中'
  if (task.status === 'running') return '运行中'
  if (task.status === 'completed') return '已完成'
  if (task.status === 'cancelled') return '已取消'
  return '失败'
}

function statusColor(task: ProductionTask): string {
  if (task.status === 'running') return 'bg-amber-400'
  if (task.status === 'completed') return 'bg-emerald-400'
  if (task.status === 'failed') return 'bg-rose-400'
  if (task.status === 'cancelled') return 'bg-zinc-400'
  return 'bg-zinc-500'
}

function trendLabel(value: unknown): string {
  if (value === 'rising') return '升温'
  if (value === 'falling') return '降温'
  if (value === 'stable') return '稳定'
  return '暂无判断'
}

function CheckRow({ check }: { check: ScientistCheck }) {
  const color = check.ok ? 'text-emerald-300' : check.severity === 'warning' ? 'text-amber-300' : 'text-rose-300'
  return (
    <div className="flex items-start gap-2 py-1.5">
      {check.ok ? <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} /> : check.severity === 'warning' ? <CircleAlert className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} /> : <CircleAlert className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />}
      <div className="min-w-0">
        <span className="text-xs font-mono text-zinc-400">{check.name}</span>
        <p className="text-xs leading-5 text-zinc-300">{check.message}</p>
      </div>
    </div>
  )
}

export function ScientistWorkspace() {
  const queryClient = useQueryClient()
  const [ideaFile, setIdeaFile] = useState('')
  const [ideaIdx, setIdeaIdx] = useState(0)
  const [mode, setMode] = useState<'experiment' | 'full'>('experiment')
  const [activeTab, setActiveTab] = useState<'records' | 'trends' | 'candidates'>('trends')
  const [selectedTask, setSelectedTask] = useState('')
  const [launchMessage, setLaunchMessage] = useState('')
  const [ideaCount, setIdeaCount] = useState(5)
  const [ideaTheme, setIdeaTheme] = useState('')
  const [ideaStrategy, setIdeaStrategy] = useState<'v2_reflection' | 'v2_novelty'>('v2_reflection')
  const [reflectionRounds, setReflectionRounds] = useState(2)
  const [allowRuleFallback, setAllowRuleFallback] = useState(false)
  const [generationMessage, setGenerationMessage] = useState('')
  const [generated, setGenerated] = useState<GeneratedIdeasResult | null>(null)
  const [expandedIdea, setExpandedIdea] = useState<number | null>(null)
  const [baseProject, setBaseProject] = useState<BaseProjectRecommendation | null>(null)

  const overviewQuery = useQuery({ queryKey: ['scientistOverview'], queryFn: async () => (await scientistApi.overview()).data, refetchInterval: 15000 })
  const preflightQuery = useQuery({ queryKey: ['scientistPreflight'], queryFn: async () => (await scientistApi.preflight()).data, refetchInterval: 15000 })
  const ideasQuery = useQuery({ queryKey: ['scientistIdeas'], queryFn: async () => (await scientistApi.ideas()).data })
  const recommendationsQuery = useQuery({ queryKey: ['ideaRecommendations', ideaFile, ideaIdx], queryFn: async () => (await scientistApi.ideaRecommendations(ideaFile, ideaIdx)).data, enabled: false, retry: 1 })
  const ideaThemesQuery = useQuery({ queryKey: ['scientistIdeaThemes'], queryFn: async () => (await scientistApi.ideaThemes()).data })
  const ideaStrategiesQuery = useQuery({ queryKey: ['scientistIdeaStrategies'], queryFn: async () => (await scientistApi.ideaStrategies()).data })
  const ideaBasisQuery = useQuery({ queryKey: ['scientistIdeaBasis', ideaTheme], queryFn: async () => (await scientistApi.ideaBasisPreview(ideaTheme)).data })
  const recordsQuery = useQuery({ queryKey: ['scientistRecords'], queryFn: async () => (await scientistApi.records(100)).data.records, enabled: activeTab === 'records' })
  const trendsQuery = useQuery({ queryKey: ['scientistTrends'], queryFn: async () => (await scientistApi.trends(100)).data.trends, enabled: activeTab === 'trends' })
  const candidatesQuery = useQuery({ queryKey: ['scientistCandidates'], queryFn: async () => (await scientistApi.candidates(100)).data.candidates, enabled: activeTab === 'candidates' })
  const tasksQuery = useQuery({ queryKey: ['scientistTasks'], queryFn: async () => (await scientistApi.productionTasks()).data.tasks, refetchInterval: 4000 })
  const logQuery = useQuery({ queryKey: ['scientistLog', selectedTask], queryFn: async () => (await scientistApi.productionLog(selectedTask)).data.log, enabled: Boolean(selectedTask), refetchInterval: 4000 })

  const launch = useMutation({
    mutationFn: () => scientistApi.startProduction({ idea_file: ideaFile, idea_idx: ideaIdx, mode, attempt_id: 1, base_project: baseProject?.url || '' }),
    onSuccess: (result) => {
      setLaunchMessage(`已启动：${result.data.candidate_title}`)
      setSelectedTask(result.data.id)
      queryClient.invalidateQueries({ queryKey: ['scientistTasks'] })
      queryClient.invalidateQueries({ queryKey: ['scientistOverview'] })
    },
    onError: (error: Error) => setLaunchMessage(`启动失败：${error.message}`),
  })

  const generate = useMutation({
    mutationFn: () => scientistApi.generateIdeas({ count: ideaCount, theme: ideaTheme, strategy: ideaStrategy, reflections: reflectionRounds, allow_rule_fallback: allowRuleFallback }),
    onSuccess: (result) => {
      setGenerated(result.data)
      setIdeaFile(result.data.file)
      setIdeaIdx(0)
      setLaunchMessage('')
      setGenerationMessage(result.data.method === 'ai' ? 'AI 已完成生成与复核。' : (result.data.basis.fallback_reason || '已使用规则兜底生成。'))
      queryClient.invalidateQueries({ queryKey: ['scientistIdeas'] })
      queryClient.invalidateQueries({ queryKey: ['scientistOverview'] })
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail
      setGenerationMessage(`AI 生成失败：${detail || (error as Error).message || '未知错误'}`)
    },
  })

  const deleteIdea = useMutation({
    mutationFn: () => scientistApi.deleteIdea(ideaFile),
    onSuccess: (result) => {
      setIdeaFile('')
      setIdeaIdx(0)
      setGenerated(null)
      setExpandedIdea(null)
      setLaunchMessage(`已删除 Idea 文件：${result.data.name}`)
      queryClient.invalidateQueries({ queryKey: ['scientistIdeas'] })
    },
    onError: (error: Error) => setLaunchMessage(`删除失败：${error.message}`),
  })

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => scientistApi.deleteProductionTask(taskId),
    onSuccess: (_, taskId) => {
      if (selectedTask === taskId) setSelectedTask('')
      queryClient.invalidateQueries({ queryKey: ['scientistTasks'] })
      queryClient.invalidateQueries({ queryKey: ['scientistOverview'] })
    },
  })
  const cancelTask = useMutation({
    mutationFn: (taskId: string) => scientistApi.cancelProductionTask(taskId),
    onSuccess: (_, taskId) => {
      setLaunchMessage('已请求取消任务。')
      if (selectedTask === taskId) queryClient.invalidateQueries({ queryKey: ['scientistLog', taskId] })
      queryClient.invalidateQueries({ queryKey: ['scientistTasks'] })
    },
    onError: (error: Error) => setLaunchMessage(`取消失败：${error.message}`),
  })
  const retryTask = useMutation({
    mutationFn: (taskId: string) => scientistApi.retryProductionTask(taskId),
    onSuccess: (result) => {
      setSelectedTask(result.data.id)
      setLaunchMessage(`已重新启动：${result.data.candidate_title}`)
      queryClient.invalidateQueries({ queryKey: ['scientistTasks'] })
      queryClient.invalidateQueries({ queryKey: ['scientistOverview'] })
    },
    onError: (error: Error) => setLaunchMessage(`重试失败：${error.message}`),
  })

  const ideas: IdeaFile[] = ideasQuery.data?.files || []
  const selectedIdeas = ideas.find((item) => item.file === ideaFile)?.ideas || []
  const checks = preflightQuery.data?.checks || overviewQuery.data?.checks || []
  const counts = overviewQuery.data?.counts
  const tasks: ProductionTask[] = tasksQuery.data || []
  const canLaunch = Boolean(ideaFile && preflightQuery.data?.ready && !launch.isPending)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <FlaskConical className="w-6 h-6 text-violet-300" />
          <h1 className="text-xl font-semibold">科研自动化</h1>
        </div>
        <p className="mt-2 text-sm text-zinc-500">将热点与文献转化为可运行的研究实验，连接 AI-Scientist-v2 的想法、实验、写作与审稿流程。</p>
      </div>

      <section className="rounded-xl border border-white/[0.08] bg-[#202020] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-300" />
            <h2 className="font-medium">工作流</h2>
          </div>
          <span className={`flex items-center gap-2 text-xs ${overviewQuery.data?.ready ? 'text-emerald-300' : 'text-amber-300'}`}>
            <span className={`w-2 h-2 rounded-full ${overviewQuery.data?.ready ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {overviewQuery.data?.ready ? '环境就绪' : '待配置'}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stages.map((stage) => (
            <div key={stage.label} className="rounded-lg border border-white/[0.07] bg-[#171717] p-4">
              <stage.icon className="w-5 h-5 text-violet-300" />
              <h3 className="mt-2 text-sm font-medium">{stage.label}</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{stage.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {counts && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '知识记录', value: counts.records, icon: ScrollText, color: 'text-cyan-300' },
            { label: '热点趋势', value: counts.trends, icon: TrendingUp, color: 'text-emerald-300' },
            { label: '候选方向', value: counts.candidates, icon: Lightbulb, color: 'text-amber-300' },
            { label: '生产任务', value: counts.production_tasks, icon: Microscope, color: 'text-violet-300' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/[0.07] bg-[#1d1d1d] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{item.label}</span>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold">{item.value}</div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-xl border border-white/[0.08] bg-[#202020] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-cyan-300" />
            <h2 className="font-medium">环境预检</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['scientistPreflight'] })} disabled={preflightQuery.isFetching}>
            <RefreshCw className={`w-4 h-4 ${preflightQuery.isFetching ? 'animate-spin' : ''}`} />
            重新检测
          </Button>
        </div>
        <p className="text-xs text-zinc-500 mb-2">项目目录：{preflightQuery.data?.root || '...'}</p>
        {checks.length > 0 ? (
          <div className="rounded-lg border border-white/[0.06] bg-[#171717] p-4 divide-y divide-white/[0.05]">
            {checks.map((check) => <CheckRow key={check.name} check={check} />)}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">正在读取预检结果…</p>
        )}
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-[#202020] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h2 className="font-medium">生成研究想法</h2>
          </div>
          <div className="flex flex-wrap justify-end items-center gap-2">
            <select value={ideaStrategy} onChange={(e) => setIdeaStrategy(e.target.value as 'v2_reflection' | 'v2_novelty')} className="h-9 max-w-48 rounded-md border border-violet-400/30 bg-[#171717] px-2 text-sm text-zinc-100 outline-none focus:border-violet-300" title="选择 AI-Scientist-v2 的 API 生成路线">
              {(ideaStrategiesQuery.data?.strategies || []).map((strategy) => <option key={strategy.value} value={strategy.value}>{strategy.label}</option>)}
            </select>
            <select value={ideaTheme} onChange={(e) => setIdeaTheme(e.target.value)} className="h-9 max-w-44 rounded-md border border-white/10 bg-[#171717] px-2 text-sm text-zinc-100 outline-none focus:border-cyan-400/70" title="选择生成想法时使用的主题范围">
              <option value="">全部主题</option>
              {(ideaThemesQuery.data?.themes || []).map((theme) => <option key={theme} value={theme}>{theme}</option>)}
            </select>
            <select value={ideaCount} onChange={(e) => setIdeaCount(Number(e.target.value))} className="h-9 rounded-md border border-white/10 bg-[#171717] px-2 text-sm text-zinc-100 outline-none focus:border-cyan-400/70">
              {[3, 5, 8, 10].map((value) => <option key={value} value={value}>{value} 个</option>)}
            </select>
            {ideaStrategy === 'v2_reflection' && <select value={reflectionRounds} onChange={(e) => setReflectionRounds(Number(e.target.value))} className="h-9 rounded-md border border-white/10 bg-[#171717] px-2 text-sm text-zinc-100 outline-none focus:border-cyan-400/70" title="内部生成与修订轮数">
              {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value} 轮反思</option>)}
            </select>}
            <Button onClick={() => { setGenerationMessage(''); generate.mutate() }} disabled={generate.isPending} className="bg-amber-500 text-slate-950 hover:bg-amber-400">
              {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generate.isPending ? '生成中…' : '生成想法'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-2">两条路线均使用已配置的 DeepSeek API，不调用 Codex CLI 或消耗 Codex 账号额度。{ideaStrategiesQuery.data?.strategies.find((item) => item.value === ideaStrategy)?.description}</p>
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-zinc-400"><input type="checkbox" checked={allowRuleFallback} onChange={(event) => setAllowRuleFallback(event.target.checked)} className="accent-amber-400" />AI 请求失败时允许使用规则模板兜底</label>
        {generationMessage && <p className={`mb-3 text-xs ${generationMessage.startsWith('AI 生成失败') ? 'text-rose-300' : 'text-emerald-300'}`}>{generationMessage}</p>}
        {ideaBasisQuery.data && (
          <div className="mb-4 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-cyan-200">本次生成依据 · {ideaBasisQuery.data.theme}</p>
              <div className="flex flex-wrap gap-1.5 text-[10px] text-zinc-300">
                {Object.entries(ideaBasisQuery.data.counts).map(([key, value]) => <span key={key} className="rounded-full bg-white/[0.06] px-2 py-0.5">{{ trends: '趋势', records: '记录', candidates: '候选方向', directions: '分析方向', topics: '主题' }[key]} {value}</span>)}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">{ideaBasisQuery.data.note}</p>
            {ideaBasisQuery.data.topic_alignment && ideaBasisQuery.data.fusion_scores && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                <div className="rounded border border-violet-400/20 bg-violet-400/[0.04] p-2"><p className="text-violet-200">主题对齐</p><p className="mt-1 text-zinc-300">{ideaBasisQuery.data.topic_alignment.label}</p><p className="font-mono text-zinc-500">{ideaBasisQuery.data.topic_alignment.topic_id}</p></div>
                <div className="rounded border border-cyan-400/20 bg-cyan-400/[0.04] p-2"><p className="text-cyan-200">AI-Scientist-v2 · 学术基础</p><p className="mt-1 text-lg text-zinc-100">{ideaBasisQuery.data.fusion_scores.ai_scientist_academic}</p><p className="text-zinc-500">权重 {Math.round(ideaBasisQuery.data.fusion_scores.weights.ai_scientist_academic * 100)}%</p></div>
                <div className="rounded border border-amber-400/20 bg-amber-400/[0.04] p-2"><p className="text-amber-200">MediaCrawler · 热点证据</p><p className="mt-1 text-lg text-zinc-100">{ideaBasisQuery.data.fusion_scores.mediacrawler_evidence}</p><p className="text-zinc-500">综合 {ideaBasisQuery.data.fusion_scores.combined} · 权重 {Math.round(ideaBasisQuery.data.fusion_scores.weights.mediacrawler_evidence * 100)}%</p></div>
              </div>
            )}
            {ideaBasisQuery.data.cards.length > 0 ? <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">{ideaBasisQuery.data.cards.map((card, index) => <div key={`${card.kind}-${index}`} className="rounded border border-white/[0.06] bg-[#171717] px-2 py-1.5"><p className="text-[10px] text-cyan-300">{card.kind}</p>{card.url ? <a href={card.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-cyan-100 hover:underline">{card.title}</a> : <p className="truncate text-xs text-zinc-200">{card.title}</p>}<p className="line-clamp-2 text-[11px] text-zinc-500">{card.detail}</p></div>)}</div> : <p className="mt-2 text-xs text-amber-300">该主题暂无已分析的研究情报；建议先完成内容分析后再生成。</p>}
          </div>
        )}
        {generated && (
          <div>
            <p className="text-xs text-emerald-300 mb-2">已生成 {generated.count} 个想法（{generated.basis.strategy_label || (generated.method === 'ai' ? 'AI 生成' : '规则生成')}），已写入 {generated.name}。点击可选用。</p>
            {generated.basis.workshop && <div className="mb-2 rounded border border-violet-400/20 bg-violet-400/[0.04] p-2 text-[11px]"><span className="text-violet-200">AI-Scientist-v2 主输入：</span><span className="text-zinc-400">已生成标准 workshop.md，含 {generated.basis.workshop.reference_count} 条采集参考；{generated.basis.knowledge_base?.note}</span>{generated.basis.knowledge_base && <span className="ml-1 text-zinc-500">知识库匹配 {generated.basis.knowledge_base.papers.length} 篇（最多取最相关的 4 篇进入本次上下文）。</span>}{generated.basis.knowledge_base?.auto_update && <p className={`mt-1 ${generated.basis.knowledge_base.auto_update.status === 'completed' ? 'text-emerald-300' : 'text-amber-300'}`}>{generated.basis.knowledge_base.auto_update.status === 'completed' ? `已自动检索并入库 ${generated.basis.knowledge_base.auto_update.imported} 篇相关论文（跳过 ${generated.basis.knowledge_base.auto_update.skipped} 篇重复；每次最多检索 10 篇）。` : `论文库自动更新未完成：${generated.basis.knowledge_base.auto_update.reason || '请检查网络或知识库路径。'}`}</p>}</div>}
            {generated.basis.openalex && <p className="mb-2 text-[11px] text-violet-200">OpenAlex 新颖性校验：{generated.basis.openalex.length ? `已检索 ${generated.basis.openalex.length} 篇相关论文，结果已作为排重约束输入。` : '本次未取得检索结果，生成时已保留该风险提示。'}</p>}
            <div className="space-y-2 max-h-72 overflow-auto">
              {generated.ideas.map((idea) => (
                <div key={idea.index} className={`rounded-lg border ${ideaFile === generated.file && ideaIdx === idea.index ? 'border-amber-400/50 bg-[#1c1a13]' : 'border-white/[0.06] bg-[#171717]'} transition-colors`}>
                  <button type="button" onClick={() => { setIdeaFile(generated.file); setIdeaIdx(idea.index); setExpandedIdea(expandedIdea === idea.index ? null : idea.index) }} className="w-full text-left p-3 hover:border-amber-400/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-zinc-100">{idea.title}</h3>
                      <span className="shrink-0 flex items-center gap-2">
                        {idea.source && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">{idea.source}</span>}
                        <span className="text-[11px] text-zinc-500">#{idea.index}</span>
                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expandedIdea === idea.index ? 'rotate-180' : ''}`} />
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{idea.hypothesis}</p>
                  </button>
                  {expandedIdea === idea.index && (
                    <div className="px-3 pb-3 pt-0 space-y-2 border-t border-white/[0.06]">
                      {idea.related_work && <p className="text-xs leading-5 text-zinc-400"><span className="text-zinc-300">溯源：</span>{idea.related_work}</p>}
                      {idea.abstract && <p className="text-xs leading-5 text-zinc-400"><span className="text-zinc-300">摘要：</span>{idea.abstract}</p>}
                      {idea.experiments && <p className="text-xs leading-5 text-zinc-400"><span className="text-zinc-300">实验：</span>{idea.experiments}</p>}
                      {idea.risks && <p className="text-xs leading-5 text-zinc-500"><span className="text-zinc-300">风险：</span>{idea.risks}</p>}
                      {idea.evidence && idea.evidence.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">{idea.evidence.slice(0, 6).map((term) => <span key={term} className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">#{term}</span>)}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-[#202020] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-emerald-300" />
          <h2 className="font-medium">启动实验</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-zinc-400">Idea 文件</span><button type="button" onClick={() => { if (ideaFile && window.confirm('确认删除当前 Idea 文件？此操作不可恢复。')) deleteIdea.mutate() }} disabled={!ideaFile || deleteIdea.isPending} className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" />{deleteIdea.isPending ? '删除中…' : '删除'}</button></div>
            <select value={ideaFile} onChange={(e) => { setIdeaFile(e.target.value); setIdeaIdx(0); setBaseProject(null) }} className="h-10 w-full rounded-md border border-white/10 bg-[#171717] px-3 text-sm text-zinc-100 outline-none focus:border-cyan-400/70">
              <option value="">请选择 idea 文件</option>
              {ideas.map((item) => <option key={item.file} value={item.file}>{item.name.replace(/\.json$/, '')} · {item.count} 个想法</option>)}
            </select>
          </div>
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-zinc-400">想法序号</span>
            <select value={ideaIdx} onChange={(e) => { setIdeaIdx(Number(e.target.value)); setBaseProject(null) }} disabled={!ideaFile} className="h-10 w-full rounded-md border border-white/10 bg-[#171717] px-3 text-sm text-zinc-100 outline-none focus:border-cyan-400/70 disabled:opacity-50">
              {selectedIdeas.map((idea) => <option key={idea.index} value={idea.index}>{idea.index} · {idea.title || idea.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => recommendationsQuery.refetch()} disabled={!ideaFile || recommendationsQuery.isFetching}>
            {recommendationsQuery.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchCheck className="w-4 h-4" />}
            推荐基础项目
          </Button>
          <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[#171717] p-1">
            <button type="button" onClick={() => setMode('experiment')} className={`rounded px-3 py-1 text-xs transition-colors ${mode === 'experiment' ? 'bg-cyan-400/15 text-cyan-200' : 'text-zinc-400 hover:text-zinc-200'}`}>仅实验</button>
            <button type="button" onClick={() => setMode('full')} className={`rounded px-3 py-1 text-xs transition-colors ${mode === 'full' ? 'bg-cyan-400/15 text-cyan-200' : 'text-zinc-400 hover:text-zinc-200'}`}>完整流程</button>
          </div>
          <Button onClick={() => launch.mutate()} disabled={!canLaunch} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
            {launch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {launch.isPending ? '正在启动…' : '启动 AI Scientist'}
          </Button>
          {launchMessage && <p className="text-sm text-zinc-400">{launchMessage}</p>}
        </div>
        {!preflightQuery.data?.ready && <p className="mt-3 text-xs text-amber-300">请先完成上方环境预检中的错误项，启动入口会保持禁用。</p>}
        {recommendationsQuery.data && <div className="mt-4 rounded-lg border border-white/[0.08] bg-[#171717] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-zinc-400">GitHub 检索：<span className="text-cyan-200">{recommendationsQuery.data.query}</span></p>{baseProject && <p className="text-xs text-emerald-300">已选：{baseProject.full_name}</p>}</div>{recommendationsQuery.data.warning ? <p className="mt-2 text-xs text-amber-300">{recommendationsQuery.data.warning}</p> : <div className="mt-3 space-y-2">{recommendationsQuery.data.repositories.map((repo) => <div key={repo.url} className={`rounded border p-3 ${baseProject?.url === repo.url ? 'border-emerald-400/50 bg-emerald-400/[0.06]' : 'border-white/[0.07]'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><a href={repo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-cyan-200 hover:underline">{repo.full_name}<ExternalLink className="w-3.5 h-3.5" /></a><p className="mt-1 text-xs leading-5 text-zinc-400">{repo.description || '未提供项目说明。'}</p><p className="mt-2 text-[11px] text-zinc-500">匹配：{repo.matched_terms.join('、') || '主题相关'} · ★ {repo.stars.toLocaleString()} {repo.language ? `· ${repo.language}` : ''}</p></div><button type="button" onClick={() => setBaseProject(repo)} className={`shrink-0 rounded px-2 py-1 text-xs ${baseProject?.url === repo.url ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/[0.07] text-zinc-300 hover:bg-white/[0.12]'}`}>{baseProject?.url === repo.url ? '已选用' : '选为基础'}</button></div></div>)}</div>}</div>}
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-[#202020] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Microscope className="w-5 h-5 text-violet-300" />
          <h2 className="font-medium">生产任务</h2>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无生产任务。选择一个 idea 并启动实验。</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-white/[0.07] bg-[#171717] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusColor(task)}`} />
                    <h3 className="truncate text-sm font-medium">{task.candidate_title}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-500">{task.mode === 'full' ? '完整流程' : '仅实验'}</span>
                    <span className="text-xs text-zinc-400">{statusText(task)}</span>
                    {(task.status === 'queued' || task.status === 'running') && <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`确认取消生产任务“${task.candidate_title}”？`)) cancelTask.mutate(task.id) }} disabled={cancelTask.isPending} className="h-7 px-2 text-xs text-amber-200 hover:text-amber-100">取消</Button>}
                    {(task.status === 'failed' || task.status === 'cancelled') && <Button variant="ghost" size="sm" onClick={() => retryTask.mutate(task.id)} disabled={retryTask.isPending} className="h-7 px-2 text-xs text-cyan-200 hover:text-cyan-100"><RefreshCw className="w-3.5 h-3.5" />重试</Button>}
                    <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`确认删除生产任务“${task.candidate_title}”及其日志吗？`)) deleteTask.mutate(task.id) }} disabled={task.status === 'queued' || task.status === 'running' || deleteTask.isPending} title={task.status === 'queued' || task.status === 'running' ? '运行中的任务不能删除' : '删除任务和日志'} className="h-7 px-2 text-xs text-rose-300 hover:text-rose-200"><Trash2 className="w-3.5 h-3.5" />删除</Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTask(selectedTask === task.id ? '' : task.id)} className="h-7 px-2 text-xs">日志</Button>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-zinc-600">创建于 {task.created_at}</p>
                {task.exit_code !== null && task.exit_code !== undefined && <p className="mt-1 text-[11px] text-zinc-500">退出码 {task.exit_code}</p>}
                {selectedTask === task.id && (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-white/[0.06] bg-black/40 p-3 text-[11px] leading-5 text-zinc-300 whitespace-pre-wrap">{logQuery.isLoading ? '正在读取日志…' : (logQuery.data || '暂无日志')}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-[#202020] p-5">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-5 h-5 text-cyan-300" />
          <h2 className="font-medium">知识库</h2>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {([['trends', '热点趋势'], ['candidates', '候选方向'], ['records', '知识记录']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`rounded-md px-3 py-1.5 text-xs transition-colors ${activeTab === key ? 'bg-cyan-400/15 text-cyan-200' : 'text-zinc-400 hover:text-zinc-200'}`}>{label}</button>
          ))}
        </div>
        {activeTab === 'records' && <KnowledgeList loading={recordsQuery.isLoading} rows={(recordsQuery.data || []).map((row) => ({ title: String(row.title || '未命名记录'), sub: String(row.platform || row.source_type || ''), extra: String(row.summary || row.source_url || ''), terms: Array.isArray(row.keywords) ? (row.keywords as string[]) : [] }))} />}
        {activeTab === 'trends' && <KnowledgeList loading={trendsQuery.isLoading} rows={(trendsQuery.data || []).map((row) => ({ title: String(row.topic || row.label || '未命名主题'), sub: `${trendLabel(row.trend)} · 近 ${String(row.window_days || 30)} 天`, extra: `${String(row.document_count ?? 0)} 条内容 · ${String(row.platform_count ?? 0)} 个平台 · ${String(row.evidence_count ?? 0)} 条证据${row.velocity !== undefined && row.velocity !== null ? ` · 变化 ${String(row.velocity)}` : ''}`, terms: Array.isArray(row.keywords) ? (row.keywords as string[]) : [] }))} />}
        {activeTab === 'candidates' && <KnowledgeList loading={candidatesQuery.isLoading} rows={(candidatesQuery.data || []).map((row) => ({ title: String(row.title || '候选方向'), sub: `评分 ${String(row.score ?? '-')} · ${String(row.status || 'draft')}`, extra: String(row.why_now || row.question || ''), terms: Array.isArray(row.evidence_topics) ? (row.evidence_topics as string[]) : (Array.isArray(row.tags) ? (row.tags as string[]) : []) }))} />}
      </section>
    </div>
  )
}

function KnowledgeList({ loading, rows }: { loading: boolean; rows: { title: string; sub: string; extra: string; terms?: string[] }[] }) {
  if (loading) return <p className="text-sm text-zinc-500">正在加载…</p>
  if (rows.length === 0) return <p className="text-sm text-zinc-500">暂无数据。</p>
  return (
    <div className="space-y-2 max-h-[440px] overflow-auto">
      {rows.map((row, index) => (
        <div key={`${row.title}-${index}`} className="rounded-lg border border-white/[0.06] bg-[#171717] p-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-medium text-zinc-100">{row.title}</h3>
            <span className="shrink-0 text-[11px] text-cyan-300">{row.sub}</span>
          </div>
          {row.extra && <p className="mt-1 text-xs leading-5 text-zinc-500">{row.extra}</p>}
          {row.terms && row.terms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">{row.terms.slice(0, 5).map((term) => <span key={term} className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-200">#{term}</span>)}</div>
          )}
        </div>
      ))}
    </div>
  )
}
