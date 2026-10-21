# -*- coding: utf-8 -*-
# Copyright (c) 2025 relakkes@gmail.com
#
# This file is part of MediaCrawler project.
# Repository: https://github.com/NanmiCoder/MediaCrawler/blob/main/tests/test_pipeline_analysis.py
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
Unit tests for the analysis pipeline's handling of publication time.

The arXiv/GitHub adapters in media_platform/research/core.py emit ``published_at``,
while the social platform stores emit ``create_time``.  Both must reach the
normalized item, otherwise ``refresh_trends`` silently degrades from the
"published" basis to the "incremental" basis and reports crawl time as trend.
"""

from datetime import datetime, timedelta, timezone

import pytest

from pipeline.analysis_service import (
    _build_research_intelligence,
    _is_recent,
    _normalize,
    _rule_analysis,
    _analysis_taxonomy,
)

ADVERSARIAL_TOPIC = "对抗攻击与越狱"


def _iso(days_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat().replace("+00:00", "Z")


@pytest.fixture
def arxiv_row():
    """Shaped exactly like ArxivCrawler._write() in media_platform/research/core.py."""
    return {
        "platform": "arxiv",
        "title": "Adversarial Examples: Attacks and Defenses for Deep Learning",
        "content": "Deep neural networks are vulnerable to adversarial examples.",
        "abstract": "Deep neural networks are vulnerable to adversarial examples.",
        "author": "Xiaoyong Yuan, Pan He",
        "url": "http://arxiv.org/abs/1712.07107v3",
        "categories": ["cs.LG", "cs.CR"],
        "published_at": "2017-12-19T18:44:07Z",
        "updated_at": "2018-07-07T02:32:57Z",
        "original_keyword": "对抗样本",
        "actual_query": "adversarial examples",
        "__source_platform": "arxiv",
    }


@pytest.fixture
def github_row():
    """Shaped exactly like GithubCrawler._write() in media_platform/research/core.py."""
    return {
        "platform": "github",
        "title": "cleverhans-lab/cleverhans",
        "content": "An adversarial example library.",
        "description": "An adversarial example library.",
        "author": "cleverhans-lab",
        "url": "https://github.com/cleverhans-lab/cleverhans",
        "stars": 6458,
        "forks": 1390,
        "language": "Jupyter Notebook",
        "topics": ["benchmarking", "security"],
        "published_at": "2016-09-15T00:28:04Z",
        "updated_at": "2026-10-17T07:14:26Z",
        "original_keyword": "对抗样本",
        "actual_query": "adversarial examples",
        "__source_platform": "github",
    }


class TestNormalizePublicationDate:
    """_normalize must not drop the publication date any adapter provides."""

    def test_arxiv_published_at_is_preserved(self, arxiv_row):
        assert _normalize(arxiv_row)["published_at"] == "2017-12-19T18:44:07Z"

    def test_github_published_at_is_preserved(self, github_row):
        assert _normalize(github_row)["published_at"] == "2016-09-15T00:28:04Z"

    def test_github_published_at_is_creation_not_last_push(self, github_row):
        """published_at must stay the creation date; updated_at is the last push."""
        normalized = _normalize(github_row)
        assert normalized["published_at"] == "2016-09-15T00:28:04Z"
        assert normalized["published_at"] != github_row["updated_at"]

    def test_social_create_time_still_used(self):
        """Regression guard: the social platform stores emit create_time."""
        row = {"title": "笔记", "desc": "内容", "nickname": "用户", "note_url": "https://x/u/1",
               "create_time": 1700000000, "__source_platform": "xhs"}
        assert _normalize(row)["published_at"] == "1700000000"

    def test_social_time_field_still_used(self):
        """Regression guard: xhs content rows use `time`."""
        row = {"title": "笔记", "desc": "内容", "time": 1700000000, "__source_platform": "xhs"}
        assert _normalize(row)["published_at"] == "1700000000"

    def test_publish_time_still_used(self):
        row = {"title": "视频", "content": "正文", "publish_time": "2024-05-01T00:00:00Z"}
        assert _normalize(row)["published_at"] == "2024-05-01T00:00:00Z"

    def test_explicit_published_at_wins_over_create_time(self):
        row = {"title": "t", "content": "c", "published_at": "2020-01-01T00:00:00Z",
               "create_time": 1700000000}
        assert _normalize(row)["published_at"] == "2020-01-01T00:00:00Z"

    def test_unknown_date_field_yields_empty(self):
        """Boundary: a date under an unrecognized key is dropped, not guessed."""
        row = {"title": "t", "content": "c", "released_at": "2020-01-01T00:00:00Z"}
        assert _normalize(row)["published_at"] == ""


class TestAnalyzedItemCarriesPublicationDate:
    """The date must survive into the item that ingest_analysis writes to SQLite."""

    def test_rule_analysis_output_keeps_published_at(self, arxiv_row):
        normalized = _normalize(arxiv_row)
        item = _rule_analysis(normalized, _analysis_taxonomy(None, None))
        assert item["published_at"] == "2017-12-19T18:44:07Z"
        assert item["analysis_method"] == "rules"

    def test_adversarial_text_maps_to_adversarial_topic(self, arxiv_row):
        normalized = _normalize(arxiv_row)
        item = _rule_analysis(normalized, _analysis_taxonomy(None, None))
        assert ADVERSARIAL_TOPIC in item["research_domains"]


class TestTrendSignalDrivenByPublicationDate:
    """recent_count / trend must respond to publication date, not to crawl date."""

    @staticmethod
    def _item(published_at: str) -> dict:
        return {
            "title": "Adversarial perturbation study",
            "text": "An adversarial perturbation study with enough text to be counted.",
            "source_platform": "arxiv",
            "published_at": published_at,
            "keywords": ["adversarial"],
            "evidence": ["Adversarial perturbations transfer across models."],
            "research_domains": [ADVERSARIAL_TOPIC],
            "source_quality": 0.9,
            "quality_score": 0.8,
            "content_type": "research",
        }

    def _topic(self, dates):
        intelligence = _build_research_intelligence([self._item(d) for d in dates])
        topics = [t for t in intelligence["topics"] if t["topic"] == ADVERSARIAL_TOPIC]
        assert len(topics) == 1
        return topics[0]

    def test_recent_publications_are_rising(self):
        topic = self._topic([_iso(3), _iso(10), _iso(20)])
        assert topic["recent_count"] == 3
        assert topic["trend"] == "rising"

    def test_old_publications_are_stable(self):
        topic = self._topic(["2016-09-15T00:28:04Z", "2017-12-19T18:44:07Z", "2018-07-07T02:32:57Z"])
        assert topic["recent_count"] == 0
        assert topic["trend"] == "stable"

    def test_missing_dates_are_stable(self):
        """Pre-fix behaviour: empty dates can never make a topic rise."""
        topic = self._topic(["", "", ""])
        assert topic["recent_count"] == 0
        assert topic["trend"] == "stable"

    def test_trend_changes_score(self):
        rising = self._topic([_iso(3), _iso(10), _iso(20)])
        stable = self._topic(["2016-09-15T00:28:04Z"] * 3)
        directions_rising = _build_research_intelligence([self._item(_iso(3))] * 3)["research_directions"]
        directions_stable = _build_research_intelligence([self._item("2016-09-15T00:28:04Z")] * 3)["research_directions"]
        assert rising["trend"] != stable["trend"]
        assert directions_rising[0]["score"] > directions_stable[0]["score"]


class TestIsRecent:
    """_is_recent is the predicate the trend signal rests on."""

    def test_recent_iso_date(self):
        assert _is_recent(_iso(5), datetime.now(timezone.utc), 45) is True

    def test_old_iso_date(self):
        assert _is_recent("2017-12-19T18:44:07Z", datetime.now(timezone.utc), 45) is False

    def test_unix_timestamp(self):
        now = datetime.now(timezone.utc)
        recent = int((now - timedelta(days=5)).timestamp())
        assert _is_recent(str(recent), now, 45) is True

    def test_empty_and_garbage_are_not_recent(self):
        now = datetime.now(timezone.utc)
        assert _is_recent("", now, 45) is False
        assert _is_recent(None, now, 45) is False
        assert _is_recent("not-a-date", now, 45) is False
