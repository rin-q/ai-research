import { KeyRound, LockKeyhole, QrCode } from 'lucide-react'
import { useCrawlerStore } from '@/store/crawlerStore'

const selectClass = 'h-10 w-full rounded-md border border-white/10 bg-[#262626] px-3 text-sm text-zinc-100 outline-none focus:border-cyan-400/70'

export function AccountSettings() {
  const config = useCrawlerStore((state) => state.config)
  const updateConfig = useCrawlerStore((state) => state.updateConfig)

  return <div className="max-w-3xl mx-auto space-y-5">
    <div><h1 className="text-xl font-semibold">账号设置</h1></div>
    <section className="rounded-xl border border-white/[0.08] bg-[#202020] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-3"><KeyRound className="w-5 h-5 text-cyan-300" /><div><h2 className="font-medium">平台登录</h2><p className="text-xs text-zinc-500 mt-1">登录状态保存在项目自己的浏览器目录，不会影响日常 Chrome。</p></div></div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <label className="space-y-2"><span className="block text-xs text-zinc-400">默认平台</span><select className={selectClass} value={config.platform} onChange={(e) => updateConfig({ platform: e.target.value, platforms: [e.target.value] })}><option value="xhs">小红书</option><option value="dy">抖音</option><option value="ks">快手</option><option value="bili">哔哩哔哩</option><option value="wb">微博</option><option value="tieba">百度贴吧</option><option value="zhihu">知乎</option><option value="github">GitHub</option><option value="arxiv">arXiv</option></select></label>
        <label className="space-y-2"><span className="block text-xs text-zinc-400">登录方式</span><select className={selectClass} value={config.login_type} onChange={(e) => updateConfig({ login_type: e.target.value, cookies: e.target.value === 'cookie' ? config.cookies : '' })}><option value="qrcode">扫码登录（推荐）</option><option value="cookie">Cookie 登录</option></select></label>
      </div>
      {config.login_type === 'qrcode' ? <div className="mx-5 mb-5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] p-4 flex gap-3"><QrCode className="w-5 h-5 shrink-0 text-cyan-300" /><p className="text-sm leading-6 text-zinc-300">点击开始采集后，系统会打开项目专用 Chrome。如尚未登录，会显示对应平台二维码；完成一次扫码后，登录状态会自动复用。请勿在任务运行时关闭该浏览器窗口。</p></div> : <div className="mx-5 mb-5 space-y-2"><label className="block text-xs text-zinc-400">Cookie</label><textarea value={config.cookies} onChange={(e) => updateConfig({ cookies: e.target.value })} placeholder="粘贴平台 Cookie，例如 web_session=..." className="min-h-28 w-full rounded-md border border-white/10 bg-[#171717] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400/70" /><p className="flex gap-2 text-xs leading-5 text-amber-300"><LockKeyhole className="w-4 h-4 shrink-0 mt-0.5" />Cookie 仅保留在当前浏览器内存中，刷新页面后需要重新填写。请只在自己的本机使用，不要发送给他人。</p></div>}
    </section>
    <section className="rounded-xl border border-white/[0.08] bg-[#202020] p-5"><h2 className="font-medium">登录状态说明</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-400"><li>扫码成功后会保存到 <code className="text-cyan-300">browser_data</code> 下对应平台的目录。</li><li>平台会自行让登录状态失效；这时下次启动任务需要重新扫码，这是平台的安全机制。</li><li>若出现滑块或验证码，请在自动打开的浏览器窗口中手动完成验证。</li></ul></section>
  </div>
}
