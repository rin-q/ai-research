import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, KeyRound, MessageSquare, Play, Search, Settings2, SlidersHorizontal, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useCrawlerStore } from '@/store/crawlerStore'
import { defaultConfigOptions, defaultPlatforms, useConfigOptions, usePlatforms, useStartCrawler, useStopCrawler } from '@/hooks/useCrawler'

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="space-y-1.5 block"><span className="text-xs font-medium text-cyber-text-secondary">{label}</span>{children}{hint && <span className="block text-[11px] text-cyber-text-muted">{hint}</span>}</label>
}

const selectClass = 'h-10 w-full rounded-md border border-cyber-border-DEFAULT bg-cyber-bg-tertiary px-3 text-sm text-cyber-text-primary focus:outline-none focus:border-cyber-neon-cyan/70'

const safetyKeywordGroups = [
  { label: '基础方向', keywords: ['人工智能安全', 'AI Safety', '可信人工智能', '大模型安全'] },
  { label: '模型可靠性', keywords: ['AI 对齐', '价值学习', '模型鲁棒性', '可解释性'] },
  { label: '攻击与防御', keywords: ['对抗样本', '机器学习安全', '提示注入', '越狱攻击', '红队测试'] },
  { label: '隐私与数据', keywords: ['隐私保护', '联邦学习安全', '数据投毒', '数据治理', '机器遗忘'] },
  { label: '生成式 AI', keywords: ['生成式 AI 安全', 'LLM 安全', 'RAG 安全', 'AI Agent 安全', '多模态安全'] },
  { label: '治理与评估', keywords: ['AI 风险评估', '模型评测', 'AI 治理', '算法审计', 'AI 伦理'] },
]

const academicPlatformValues = new Set(['github', 'arxiv'])

export function CrawlerConfigPanel() {
  const config = useCrawlerStore((state) => state.config)
  const updateConfig = useCrawlerStore((state) => state.updateConfig)
  const status = useCrawlerStore((state) => state.status)
  const [advanced, setAdvanced] = useState(false)
  const { data: platformData } = usePlatforms()
  const { data: optionData } = useConfigOptions()
  const platforms = platformData?.length ? platformData : defaultPlatforms
  const options = optionData || defaultConfigOptions
  const { mutate: start, isPending: starting } = useStartCrawler()
  const { mutate: stop, isPending: stopping } = useStopCrawler()
  const running = status === 'running' || status === 'stopping'
  const canStart = config.crawler_type === 'search' ? config.keywords.trim().length > 0 : (config.specified_ids.trim().length > 0 || config.creator_ids.trim().length > 0)
  const update = (key: keyof typeof config, value: unknown) => updateConfig({ [key]: value })
  const selectedPlatforms = config.platforms?.length ? config.platforms : [config.platform]
  const socialPlatforms = platforms.filter((platform) => !academicPlatformValues.has(platform.value))
  const academicPlatforms = platforms.filter((platform) => academicPlatformValues.has(platform.value))
  const togglePlatform = (value: string) => {
    const next = selectedPlatforms.includes(value) ? selectedPlatforms.filter((item) => item !== value) : [...selectedPlatforms, value]
    if (!next.length) return
    updateConfig({ platforms: next, platform: next[0] })
  }
  const toggleKeyword = (keyword: string) => {
    const keywords = config.keywords.split(',').map((item) => item.trim()).filter(Boolean)
    const next = keywords.includes(keyword) ? keywords.filter((item) => item !== keyword) : [...keywords, keyword]
    update('keywords', next.join(', '))
  }
  const selectedKeywords = new Set(config.keywords.split(',').map((item) => item.trim()).filter(Boolean))

  return <section className="rounded-xl border border-cyber-border-subtle bg-cyber-bg-panel/80 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-cyber-border-subtle flex items-center justify-between gap-4">
      <div><div className="flex items-center gap-2"><Search className="w-5 h-5 text-cyber-neon-cyan" /><h1 className="text-lg font-semibold text-cyber-text-primary">新建采集任务</h1></div><p className="mt-1 text-xs text-cyber-text-muted">输入关键词，选择平台，开始收集公开内容</p></div>
      <div className="hidden sm:flex items-center gap-2 text-xs text-cyber-text-muted"><span className={`h-2 w-2 rounded-full ${running ? 'bg-cyber-neon-green animate-pulse' : 'bg-cyber-text-muted'}`} />{running ? '任务运行中' : '准备就绪'}</div>
    </div>
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
        <Field label="搜索关键词" hint="可输入多个关键词，使用逗号分隔；也可以点击下方预设方向"><Input value={config.keywords} onChange={(e) => update('keywords', e.target.value)} placeholder="例如：人工智能安全, 大模型安全" disabled={running || config.crawler_type !== 'search'} className="h-11 text-sm" />
          <div className="mt-3 space-y-2.5 rounded-lg border border-cyber-border-subtle bg-cyber-bg-tertiary/60 p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-medium text-cyber-text-secondary">AI 安全科研方向</span><span className="text-[10px] text-cyber-text-muted">点击标签加入 / 取消</span></div>
            {safetyKeywordGroups.map((group) => <div key={group.label} className="flex flex-wrap items-center gap-1.5"><span className="w-20 shrink-0 text-[10px] text-cyber-text-muted">{group.label}</span>{group.keywords.map((keyword) => <button key={keyword} type="button" onClick={() => toggleKeyword(keyword)} disabled={running || config.crawler_type !== 'search'} className={`rounded-md border px-2 py-1 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selectedKeywords.has(keyword) ? 'border-cyber-neon-cyan/70 bg-cyber-neon-cyan/15 text-cyber-neon-cyan' : 'border-cyber-border-DEFAULT text-cyber-text-secondary hover:border-cyber-neon-cyan/50 hover:text-cyber-neon-cyan'}`}>{keyword}</button>)}</div>)}
          </div>
        </Field>
        <Field label="采集平台" hint="可多选，系统会按选择顺序依次检索并分别保存结果；GitHub 与 arXiv 会自动扩展中文 AI 安全词为英文研究查询">
          <div className="space-y-2">
            {[
              { title: '社交媒体', platforms: socialPlatforms },
              { title: '学术与开源', platforms: academicPlatforms },
            ].map((group) => <div key={group.title} className="min-h-24 rounded-md border border-cyber-border-DEFAULT bg-cyber-bg-tertiary p-2.5">
              <p className="mb-2 text-[11px] font-medium text-cyber-text-muted">{group.title}</p>
              <div className="flex flex-wrap gap-1.5">{group.platforms.map((platform) => <button key={platform.value} type="button" onClick={() => togglePlatform(platform.value)} disabled={running} className={`rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${selectedPlatforms.includes(platform.value) ? 'border-cyber-neon-cyan/70 bg-cyber-neon-cyan/15 text-cyber-neon-cyan' : 'border-cyber-border-DEFAULT text-cyber-text-secondary hover:border-cyber-neon-cyan/50'}`}>{platform.label}</button>)}</div>
            </div>)}
          </div>
        </Field>
      </div>
      {config.crawler_type !== 'search' && <Field label={config.crawler_type === 'detail' ? '内容链接或 ID' : '创作者 ID'}><textarea value={config.crawler_type === 'detail' ? config.specified_ids : config.creator_ids} onChange={(e) => update(config.crawler_type === 'detail' ? 'specified_ids' : 'creator_ids', e.target.value)} disabled={running} placeholder="每行一个，也可以用逗号分隔" className="min-h-20 w-full rounded-md border border-cyber-border-DEFAULT bg-cyber-bg-tertiary px-3 py-2 text-sm text-cyber-text-primary outline-none focus:border-cyber-neon-cyan/70 resize-y" /></Field>}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => running ? stop() : start(config)} disabled={starting || stopping || (!running && !canStart)} className={`h-11 px-6 font-semibold ${running ? 'bg-cyber-neon-pink text-white hover:bg-cyber-neon-pink/90' : 'bg-cyber-neon-cyan text-cyber-bg-primary hover:bg-cyber-neon-cyan/90'}`}>{running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}{running ? (stopping ? '正在停止…' : '停止任务') : (starting ? '正在启动…' : '开始采集')}</Button>
        {!canStart && !running && <span className="text-xs text-cyber-neon-orange">请先输入关键词</span>}
        <button type="button" onClick={() => setAdvanced(!advanced)} className="ml-auto inline-flex items-center gap-2 text-xs text-cyber-text-secondary hover:text-cyber-neon-cyan transition-colors"><SlidersHorizontal className="w-4 h-4" />更多设置<ChevronDown className={`w-4 h-4 transition-transform ${advanced ? 'rotate-180' : ''}`} /></button>
      </div>
      {advanced && <div className="pt-4 border-t border-cyber-border-subtle grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="采集模式"><select className={selectClass} value={config.crawler_type} onChange={(e) => update('crawler_type', e.target.value)} disabled={running}>{options?.crawler_types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="登录方式"><select className={selectClass} value={config.login_type} onChange={(e) => update('login_type', e.target.value)} disabled={running}>{options?.login_types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="保存格式"><select className={selectClass} value={config.save_option} onChange={(e) => update('save_option', e.target.value)} disabled={running}>{options?.save_options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="起始页"><Input type="number" min={1} value={config.start_page} onChange={(e) => update('start_page', Number(e.target.value) || 1)} disabled={running} className="h-10" /></Field>
        <div className="md:col-span-2 lg:col-span-4 flex flex-wrap gap-5 pt-1"><label className="flex items-center gap-2 text-sm text-cyber-text-secondary"><Checkbox checked={config.enable_comments} onCheckedChange={(v) => update('enable_comments', v === true)} disabled={running} /><MessageSquare className="w-4 h-4" />采集评论</label><label className="flex items-center gap-2 text-sm text-cyber-text-secondary"><Checkbox checked={config.enable_sub_comments} onCheckedChange={(v) => update('enable_sub_comments', v === true)} disabled={running || !config.enable_comments} />采集二级评论</label><label className="flex items-center gap-2 text-sm text-cyber-text-secondary"><Checkbox checked={config.headless} onCheckedChange={(v) => update('headless', v === true)} disabled={running} /><Settings2 className="w-4 h-4" />后台运行</label><span className="flex items-center gap-2 text-[11px] text-cyber-text-muted"><KeyRound className="w-3.5 h-3.5" />首次使用会在浏览器中扫码登录</span></div>
      </div>}
    </div>
  </section>
}
