"""Canonical AI-safety topic taxonomy shared by analysis and idea generation."""

from __future__ import annotations

import hashlib
import re
from typing import Any


TAXONOMY_VERSION = "2026-08"

# `id` is deliberately stable; labels and aliases may evolve without breaking
# longitudinal trend data or links from an idea back to its evidence.
TOPIC_TAXONOMY: dict[str, dict[str, list[str] | str]] = {
    "模型对齐与可靠性": {"id": "ai-safety.alignment-reliability", "aliases": ["对齐", "鲁棒性", "可解释", "价值学习", "可信", "alignment", "reliability"]},
    "对抗攻击与越狱": {"id": "ai-safety.adversarial-jailbreak", "aliases": ["对抗样本", "越狱", "jailbreak", "攻击", "红队", "adversarial"]},
    "Prompt Injection": {"id": "ai-safety.prompt-injection", "aliases": ["提示注入", "prompt injection", "提示攻击", "越权"]},
    "Agent 与工具调用安全": {"id": "ai-safety.agent-tool-security", "aliases": ["agent", "智能体", "工具调用", "tool", "浏览器", "agentic"]},
    "数据投毒与供应链安全": {"id": "ai-safety.data-supply-chain", "aliases": ["数据投毒", "投毒", "供应链", "后门", "data poisoning"]},
    "隐私泄露与机器遗忘": {"id": "ai-safety.privacy-unlearning", "aliases": ["隐私", "成员推断", "机器遗忘", "数据泄露", "privacy", "unlearning"]},
    "RAG 与知识库安全": {"id": "ai-safety.rag-security", "aliases": ["rag", "检索增强", "知识库", "向量库", "retrieval augmented"]},
    "多模态安全": {"id": "ai-safety.multimodal-security", "aliases": ["多模态", "视觉", "图像", "音频", "视频", "multimodal"]},
    "模型评测与红队": {"id": "ai-safety.evaluation-red-teaming", "aliases": ["评测", "基准", "benchmark", "红队测试", "evaluation"]},
    "AI 治理与审计": {"id": "ai-safety.governance-audit", "aliases": ["治理", "审计", "合规", "伦理", "风险评估", "governance"]},
    "人工智能安全（其他）": {"id": "ai-safety.general", "aliases": ["人工智能安全", "ai safety", "ai security", "可信人工智能"]},
}


def topic_catalog() -> list[dict[str, Any]]:
    return [{"id": value["id"], "label": label, "aliases": value["aliases"], "version": TAXONOMY_VERSION} for label, value in TOPIC_TAXONOMY.items()]


def canonical_topic(label: str) -> dict[str, str]:
    cleaned = re.sub(r"\s+", " ", str(label or "")).strip()[:80] or "人工智能安全（其他）"
    for known_label, spec in TOPIC_TAXONOMY.items():
        values = [known_label, *spec["aliases"]]
        if any(cleaned.casefold() == str(value).casefold() for value in values):
            return {"id": str(spec["id"]), "label": known_label, "version": TAXONOMY_VERSION}
    slug = re.sub(r"[^a-z0-9]+", "-", cleaned.casefold()).strip("-")
    if not slug:
        slug = hashlib.sha1(cleaned.encode("utf-8")).hexdigest()[:12]
    return {"id": f"custom.{slug}", "label": cleaned, "version": TAXONOMY_VERSION}


def match_topic(value: str, topic_id: str = "", label: str = "") -> bool:
    query = str(value or "").casefold().strip()
    if not query:
        return True
    topic = canonical_topic(query)
    return query in {str(topic_id).casefold(), str(label).casefold(), topic["id"].casefold(), topic["label"].casefold()}
