import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { crawlerApi, configApi } from '@/lib/api'
import { useCrawlerStore } from '@/store/crawlerStore'
import type { CrawlerConfig } from '@/types/crawler'
import type { ConfigOption, Platform } from '@/lib/api'

export const defaultPlatforms: Platform[] = [
  { value: 'xhs', label: '小红书', icon: 'book-open' },
  { value: 'dy', label: '抖音', icon: 'music' },
  { value: 'ks', label: '快手', icon: 'video' },
  { value: 'bili', label: '哔哩哔哩', icon: 'tv' },
  { value: 'wb', label: '微博', icon: 'message-circle' },
  { value: 'tieba', label: '百度贴吧', icon: 'messages-square' },
  { value: 'zhihu', label: '知乎', icon: 'help-circle' },
  { value: 'github', label: 'GitHub', icon: 'github' },
  { value: 'arxiv', label: 'arXiv', icon: 'book-open' },
]

export const defaultConfigOptions = {
  login_types: [{ value: 'qrcode', label: '扫码登录' }, { value: 'cookie', label: 'Cookie 登录' }] as ConfigOption[],
  crawler_types: [{ value: 'search', label: '搜索模式' }, { value: 'detail', label: '详情模式' }, { value: 'creator', label: '创作者模式' }] as ConfigOption[],
  save_options: [{ value: 'jsonl', label: 'JSONL 文件' }, { value: 'json', label: 'JSON 文件' }, { value: 'csv', label: 'CSV 文件' }, { value: 'excel', label: 'Excel 文件' }] as ConfigOption[],
}

export function useCrawlerStatus() {
  const setStatus = useCrawlerStore((state) => state.setStatus)
  const setRunningInfo = useCrawlerStore((state) => state.setRunningInfo)

  return useQuery({
    queryKey: ['crawlerStatus'],
    queryFn: async () => {
      const { data } = await crawlerApi.getStatus()
      setStatus(data.status)
      setRunningInfo(data.platform, data.crawler_type, data.started_at)
      return data
    },
    refetchInterval: 2000,
  })
}

export function useStartCrawler() {
  const queryClient = useQueryClient()
  const setStatus = useCrawlerStore((state) => state.setStatus)
  const clearLogs = useCrawlerStore((state) => state.clearLogs)

  return useMutation({
    mutationFn: (config: CrawlerConfig) => crawlerApi.start(config),
    onMutate: () => {
      clearLogs()
      setStatus('running')
    },
    onSuccess: () => {
      toast.success('Crawler started successfully')
      queryClient.invalidateQueries({ queryKey: ['crawlerStatus'] })
    },
    onError: (error: Error) => {
      setStatus('idle')
      toast.error(`Failed to start crawler: ${error.message}`)
    },
  })
}

export function useStopCrawler() {
  const queryClient = useQueryClient()
  const setStatus = useCrawlerStore((state) => state.setStatus)

  return useMutation({
    mutationFn: () => crawlerApi.stop(),
    onMutate: () => {
      setStatus('stopping')
    },
    onSuccess: () => {
      toast.success('Crawler stopped')
      setStatus('idle')
      queryClient.invalidateQueries({ queryKey: ['crawlerStatus'] })
    },
    onError: (error: Error) => {
      setStatus('idle')
      toast.error(`Failed to stop crawler: ${error.message}`)
    },
  })
}

export function useCrawlerLogs() {
  const setLogs = useCrawlerStore((state) => state.setLogs)

  return useQuery({
    queryKey: ['crawlerLogs'],
    queryFn: async () => {
      const { data } = await crawlerApi.getLogs(500)
      setLogs(data.logs)
      return data.logs
    },
    refetchInterval: false, // Use WebSocket instead
  })
}

export function usePlatforms() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const { data } = await configApi.getPlatforms()
      return data.platforms
    },
    placeholderData: defaultPlatforms,
    retry: 1,
    staleTime: Infinity,
  })
}

export function useConfigOptions() {
  return useQuery({
    queryKey: ['configOptions'],
    queryFn: async () => {
      const { data } = await configApi.getOptions()
      return data
    },
    placeholderData: defaultConfigOptions,
    retry: 1,
    staleTime: Infinity,
  })
}
