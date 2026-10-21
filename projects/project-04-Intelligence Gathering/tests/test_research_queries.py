# -*- coding: utf-8 -*-
# Copyright (c) 2025 relakkes@gmail.com
#
# This file is part of MediaCrawler project.
# Repository: https://github.com/NanmiCoder/MediaCrawler/blob/main/tests/test_research_queries.py
# GitHub: https://github.com/NanmiCoder
# Licensed under NON-COMMERCIAL LEARNING LICENSE 1.1
#
# 声明：本代码仅供学习和研究目的使用。使用者应遵守以下原则：
# 1. 不得用于任何商业用途。
# 2. 使用时应遵守目标平台的使用条款和robots.txt规则。
# 3. 不得进行大规模爬取或对平台造成运营干扰。
# 4. 应合理控制请求频率，避免给目标平台带来不必要的负担。
# 5. 不得用于任何非法或不当的用途。
#
# 详细许可条款请参阅项目根目录下的LICENSE文件。
# 使用本代码即表示您同意遵守上述原则和LICENSE中的所有条款。

"""
Unit tests for the arXiv/GitHub research adapters' query construction.

Two defects are guarded here:

* GitHub search was sorted by stars, which ranks popularity over relevance.
  For "RAG security" that put two generic RAG engines above PoisonedRAG
  (USENIX Security 2025), and for "AI security" it surfaced a Windows
  debloat script.
* arXiv indexes English only.  A CJK query returns zero hits, or silently
  matches just its ASCII fragment -- "RAG 安全" returns general RAG papers
  while actual_query still records "RAG 安全", so the provenance field lies.
"""

import pytest

import media_platform.research.core as core
from media_platform.research.core import (
    GithubCrawler,
    ArxivCrawler,
    arxiv_search_queries,
    contains_cjk,
    expanded_research_queries,
)


class TestContainsCjk:
    @pytest.mark.parametrize("value", ["对抗样本", "RAG 安全", "人工智能安全", "ひらがな", "カタカナ"])
    def test_cjk_detected(self, value):
        assert contains_cjk(value) is True

    @pytest.mark.parametrize("value", ["adversarial examples", "RAG security", "prompt injection", ""])
    def test_ascii_not_flagged(self, value):
        assert contains_cjk(value) is False

    def test_none_is_safe(self):
        assert contains_cjk(None) is False


class TestExpandedQueriesUnchanged:
    """GitHub has no CJK word segmentation but does index Chinese text, so with
    relevance ranking a Chinese query is still useful there.  Expansion must
    therefore keep emitting the original CJK keyword."""

    def test_cjk_keyword_yields_original_plus_english(self):
        pairs = expanded_research_queries(["对抗样本"])
        assert pairs == [
            ("对抗样本", "对抗样本"),
            ("对抗样本", "adversarial examples"),
            ("对抗样本", "adversarial attack"),
        ]

    def test_english_keyword_is_preserved(self):
        assert expanded_research_queries(["prompt injection"]) == [("prompt injection", "prompt injection")]

    def test_duplicates_are_collapsed_case_insensitively(self):
        pairs = expanded_research_queries(["LLM 安全", "LLM security"])
        queries = [query for _, query in pairs]
        assert len(queries) == len(set(q.casefold() for q in queries))


class TestArxivQueriesDropCjk:
    def test_only_english_expansions_reach_arxiv(self):
        assert [q for _, q in arxiv_search_queries(["对抗样本"])] == [
            "adversarial examples",
            "adversarial attack",
        ]

    def test_mixed_cjk_query_is_dropped_whole(self):
        """"RAG 安全" must not reach arXiv as a bare "RAG" match."""
        assert "RAG 安全" not in [q for _, q in arxiv_search_queries(["RAG 安全"])]
        assert [q for _, q in arxiv_search_queries(["RAG 安全"])] == [
            "RAG security",
            "retrieval augmented generation security",
        ]

    def test_pure_english_keyword_is_kept(self):
        assert [q for _, q in arxiv_search_queries(["prompt injection"])] == ["prompt injection"]

    def test_original_keyword_provenance_is_kept(self):
        """The CJK keyword the user typed must still be recorded as the origin."""
        assert [k for k, _ in arxiv_search_queries(["对抗样本"])] == ["对抗样本", "对抗样本"]

    def test_unexpandable_cjk_keyword_yields_nothing(self):
        """Boundary: a custom CJK term with no English expansion gives arXiv no
        usable query.  ArxivCrawler.search must warn and return, not silently
        report a successful empty crawl."""
        assert arxiv_search_queries(["某个没有扩展词的中文主题"]) == []


class _FakeResponse:
    def __init__(self, items=None):
        self._items = items if items is not None else []

    def raise_for_status(self):
        return None

    def json(self):
        return {"items": self._items}

    @property
    def text(self):
        return "<feed></feed>"


class _RecordingClient:
    """Stands in for httpx.AsyncClient and records every request's params."""

    calls: list = []

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, params=None):
        type(self).calls.append({"url": url, "params": params or {}})
        return _FakeResponse()


@pytest.fixture
def recording_client(monkeypatch):
    _RecordingClient.calls = []
    monkeypatch.setattr(core.httpx, "AsyncClient", _RecordingClient)
    monkeypatch.setattr(core.config, "CRAWLER_MAX_SLEEP_SEC", 0)
    return _RecordingClient


class TestGithubCrawlerRequest:
    @pytest.mark.asyncio
    async def test_search_omits_star_sorting(self, recording_client, monkeypatch):
        monkeypatch.setattr(core.config, "KEYWORDS", "adversarial examples")
        monkeypatch.setattr(core.config, "CRAWLER_MAX_NOTES_COUNT", 5)
        await GithubCrawler().search()
        assert len(recording_client.calls) == 1
        params = recording_client.calls[0]["params"]
        assert "sort" not in params
        assert "order" not in params
        assert params["q"] == "adversarial examples"
        assert params["per_page"] == 5

    @pytest.mark.asyncio
    async def test_cjk_query_is_still_sent_to_github(self, recording_client, monkeypatch):
        """Unlike arXiv, GitHub indexes Chinese text, so the CJK query stays."""
        monkeypatch.setattr(core.config, "KEYWORDS", "对抗样本")
        monkeypatch.setattr(core.config, "CRAWLER_MAX_NOTES_COUNT", 5)
        await GithubCrawler().search()
        sent = [call["params"]["q"] for call in recording_client.calls]
        assert "对抗样本" in sent
        assert "adversarial examples" in sent


class TestArxivCrawlerRequest:
    @pytest.mark.asyncio
    async def test_cjk_query_never_reaches_arxiv(self, recording_client, monkeypatch):
        monkeypatch.setattr(core.config, "KEYWORDS", "对抗样本,RAG 安全")
        monkeypatch.setattr(core.config, "CRAWLER_MAX_NOTES_COUNT", 5)
        await ArxivCrawler().search()
        sent = [call["params"]["search_query"] for call in recording_client.calls]
        assert sent == [
            "all:adversarial examples",
            "all:adversarial attack",
            "all:RAG security",
            "all:retrieval augmented generation security",
        ]
        assert not any(contains_cjk(q) for q in sent)

    @pytest.mark.asyncio
    async def test_no_usable_query_makes_no_request(self, recording_client, monkeypatch):
        monkeypatch.setattr(core.config, "KEYWORDS", "某个没有扩展词的中文主题")
        monkeypatch.setattr(core.config, "CRAWLER_MAX_NOTES_COUNT", 5)
        await ArxivCrawler().search()
        assert recording_client.calls == []
