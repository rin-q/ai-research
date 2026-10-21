from __future__ import annotations

import asyncio
import html
import re
from typing import Any, Dict, Optional

import httpx
from playwright.async_api import BrowserContext, BrowserType, Playwright

import config
from base.base_crawler import AbstractCrawler
from tools.async_file_writer import AsyncFileWriter
from tools import utils
from var import crawler_type_var, source_keyword_var


# Public research platforms are predominantly English.  The UI can remain
# Chinese-first while these adapters issue the corresponding research queries.
RESEARCH_KEYWORD_EXPANSIONS = {
    "人工智能安全": ["AI safety", "AI security", "trustworthy AI"],
    "可信人工智能": ["trustworthy AI", "responsible AI"],
    "大模型安全": ["LLM security", "large language model safety"],
    "AI 对齐": ["AI alignment", "alignment research"],
    "价值学习": ["value learning", "preference learning"],
    "模型鲁棒性": ["model robustness", "adversarial robustness"],
    "可解释性": ["AI interpretability", "explainable AI"],
    "对抗样本": ["adversarial examples", "adversarial attack"],
    "机器学习安全": ["machine learning security", "ML security"],
    "提示注入": ["prompt injection", "indirect prompt injection"],
    "越狱攻击": ["LLM jailbreak", "jailbreak attack"],
    "红队测试": ["AI red teaming", "LLM red teaming"],
    "隐私保护": ["privacy preserving machine learning", "AI privacy"],
    "联邦学习安全": ["federated learning security"],
    "数据投毒": ["data poisoning", "training data poisoning"],
    "数据治理": ["AI data governance", "data governance"],
    "机器遗忘": ["machine unlearning"],
    "生成式 AI 安全": ["generative AI safety", "generative AI security"],
    "LLM 安全": ["LLM security", "large language model security"],
    "RAG 安全": ["RAG security", "retrieval augmented generation security"],
    "AI Agent 安全": ["AI agent security", "agent security"],
    "多模态安全": ["multimodal AI safety", "multimodal security"],
    "AI 风险评估": ["AI risk assessment", "AI risk management"],
    "模型评测": ["AI safety evaluation", "LLM benchmark"],
    "AI 治理": ["AI governance"],
    "算法审计": ["algorithmic audit", "AI audit"],
    "AI 伦理": ["AI ethics"],
}


def expanded_research_queries(keywords: list[str]) -> list[tuple[str, str]]:
    """Return (original keyword, actual query), preserving user English terms."""
    queries: list[tuple[str, str]] = []
    seen: set[str] = set()
    for keyword in keywords:
        for query in [keyword, *RESEARCH_KEYWORD_EXPANSIONS.get(keyword, [])]:
            normalized = query.casefold().strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                queries.append((keyword, query))
    return queries


_CJK_PATTERN = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]")


def contains_cjk(value: str) -> bool:
    return bool(_CJK_PATTERN.search(value or ""))


def arxiv_search_queries(keywords: list[str]) -> list[tuple[str, str]]:
    """Drop CJK queries: arXiv indexes English, so they return zero hits, or
    silently match only the ASCII fragment ("RAG 安全" matches plain "RAG")
    while actual_query still records the full CJK string."""
    return [pair for pair in expanded_research_queries(keywords) if not contains_cjk(pair[1])]


def arxiv_phrase(query: str) -> str:
    """Quote the query so arXiv matches the phrase, not loose word conjunctions.

    Unquoted `all:data poisoning` is parsed as an AND over the words "data" and
    "poisoning", so it returned astrophysics and remote-sensing papers.  Quoting
    returns actual data-poisoning literature.  Quotes inside the term are
    stripped because they would terminate the phrase."""
    cleaned = str(query or "").replace('"', " ").strip()
    return f'all:"{cleaned}"'


class _ResearchCrawler(AbstractCrawler):
    platform = "research"

    async def launch_browser(self, chromium: BrowserType, playwright_proxy: Optional[Dict], user_agent: Optional[str], headless: bool = True) -> BrowserContext:
        raise NotImplementedError("This public API crawler does not use a browser")

    async def launch_browser_with_cdp(self, playwright: Playwright, playwright_proxy: Optional[Dict], user_agent: Optional[str], headless: bool = True) -> BrowserContext:
        raise NotImplementedError("This public API crawler does not use a browser")

    async def _write(self, item: dict[str, Any], item_type: str = "contents") -> None:
        writer = AsyncFileWriter(platform=self.platform, crawler_type=crawler_type_var.get() or "search")
        await writer.write_to_jsonl(item, item_type)


class GithubCrawler(_ResearchCrawler):
    platform = "github"

    async def start(self) -> None:
        if config.CRAWLER_TYPE != "search":
            utils.logger.warning("GitHub adapter currently supports keyword search only")
            return
        await self.search()

    async def search(self) -> None:
        keywords = [item.strip() for item in config.KEYWORDS.split(",") if item.strip()]
        limit = max(1, min(config.CRAWLER_MAX_NOTES_COUNT, 100))
        token = getattr(config, "GITHUB_TOKEN", "") or ""
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "MediaCrawler"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        async with httpx.AsyncClient(timeout=30, headers=headers) as client:
            seen_repositories: set[str] = set()
            for original_keyword, query in expanded_research_queries(keywords):
                source_keyword_var.set(query)
                # GitHub's default relevance ranking.  Sorting by stars promoted
                # popular-but-off-topic repos above on-topic ones: "AI security"
                # returned a Windows-debloat script, and "RAG security" ranked
                # PoisonedRAG (USENIX Security 2025) below two generic RAG engines.
                response = await client.get("https://api.github.com/search/repositories", params={"q": query, "per_page": min(limit, 100)})
                response.raise_for_status()
                for repo in response.json().get("items", [])[:limit]:
                    repo_id = str(repo.get("id") or repo.get("full_name") or "")
                    if not repo_id or repo_id in seen_repositories:
                        continue
                    seen_repositories.add(repo_id)
                    await self._write({
                        "platform": "github", "title": repo.get("full_name", ""),
                        "content": repo.get("description") or "", "description": repo.get("description") or "",
                        "author": (repo.get("owner") or {}).get("login", ""), "url": repo.get("html_url", ""),
                        "stars": repo.get("stargazers_count", 0), "forks": repo.get("forks_count", 0),
                        "language": repo.get("language") or "", "topics": repo.get("topics") or [],
                        "published_at": repo.get("created_at") or "", "updated_at": repo.get("updated_at") or "",
                        "original_keyword": original_keyword, "actual_query": query,
                    })
                await asyncio.sleep(config.CRAWLER_MAX_SLEEP_SEC)


class ArxivCrawler(_ResearchCrawler):
    platform = "arxiv"

    async def start(self) -> None:
        if config.CRAWLER_TYPE != "search":
            utils.logger.warning("arXiv adapter currently supports keyword search only")
            return
        await self.search()

    async def search(self) -> None:
        keywords = [item.strip() for item in config.KEYWORDS.split(",") if item.strip()]
        limit = max(1, min(config.CRAWLER_MAX_NOTES_COUNT, 100))
        queries = arxiv_search_queries(keywords)
        skipped = [query for _, query in expanded_research_queries(keywords) if contains_cjk(query)]
        if skipped:
            utils.logger.warning(f"arXiv 为英文语料，已跳过中文查询：{', '.join(skipped)}；仅使用其英文扩展词")
        if not queries:
            utils.logger.warning("没有可用于 arXiv 的英文查询，本次不采集；请补充英文关键词")
            return
        async with httpx.AsyncClient(timeout=40, headers={"User-Agent": "MediaCrawler/1.0 research search"}) as client:
            seen_papers: set[str] = set()
            for original_keyword, query in queries:
                source_keyword_var.set(query)
                response = await client.get("https://export.arxiv.org/api/query", params={"search_query": arxiv_phrase(query), "start": 0, "max_results": limit, "sortBy": "relevance", "sortOrder": "descending"})
                response.raise_for_status()
                entries = re.findall(r"<entry>(.*?)</entry>", response.text, flags=re.DOTALL)
                for entry in entries[:limit]:
                    title = self._tag(entry, "title")
                    abstract = " ".join(self._tag(entry, "summary").split())
                    authors = re.findall(r"<author>.*?<name>(.*?)</name>.*?</author>", entry, flags=re.DOTALL)
                    link = self._link(entry)
                    if not link or link in seen_papers:
                        continue
                    seen_papers.add(link)
                    await self._write({
                        "platform": "arxiv", "title": title, "content": abstract, "abstract": abstract,
                        "author": ", ".join(html.unescape(name.strip()) for name in authors), "url": link,
                        "categories": re.findall(r"<category term=\"([^\"]+)\"", entry),
                        "published_at": self._tag(entry, "published"), "updated_at": self._tag(entry, "updated"),
                        "original_keyword": original_keyword, "actual_query": query,
                    })
                await asyncio.sleep(config.CRAWLER_MAX_SLEEP_SEC)

    @staticmethod
    def _tag(entry: str, tag: str) -> str:
        match = re.search(rf"<{tag}>(.*?)</{tag}>", entry, flags=re.DOTALL)
        return html.unescape(re.sub(r"\s+", " ", match.group(1)).strip()) if match else ""

    @staticmethod
    def _link(entry: str) -> str:
        match = re.search(r'<id>(.*?)</id>', entry, flags=re.DOTALL)
        return html.unescape(match.group(1).strip()) if match else ""
