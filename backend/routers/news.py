"""
news.py — Pakistani Legal News Feed
Place in: backend/routers/news.py
Then in main.py add:
    from routers.news import router as news_router
    app.include_router(news_router)
Install dep: pip install feedparser
"""

# pyrefly: ignore [missing-import]
import re
import feedparser
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
from functools import lru_cache
import time

router = APIRouter(prefix="/api/news", tags=["news"])

# ─────────────────────────────────────────────
# RSS Feed Sources — Pakistani Legal News
# ─────────────────────────────────────────────
FEEDS = [
    {
        "id": "dawn_law",
        "name": "Dawn — Law & Courts",
        "url": "https://www.dawn.com/feeds/latest-news",
        "category": "General",
        "logo": "🌅",
        "keywords": ["court", "supreme court", "high court", "law", "legal", "verdict",
                     "judgment", "ordinance", "legislation", "FIR", "bail", "lawyer",
                     "judiciary", "bench", "constitution", "CJP", "PTI", "NAB"],
    },
    {
        "id": "geo_news",
        "name": "Geo News",
        "url": "https://www.geo.tv/rss/1/7",   # Geo Pakistan feed
        "category": "General",
        "logo": "📡",
        "keywords": ["court", "supreme court", "high court", "law", "legal", "verdict",
                     "ordinance", "sentence", "acquitted", "arrested", "FIR", "NAB",
                     "election commission", "constitution", "CJP"],
    },
    {
        "id": "ary_news",
        "name": "ARY News",
        "url": "https://arynews.tv/feed/",
        "category": "General",
        "logo": "📺",
        "keywords": ["court", "supreme court", "high court", "law", "verdict",
                     "judgment", "bail", "sentence", "arrested", "FIR", "NAB",
                     "ordinance", "legislation", "CJP", "judiciary"],
    },
    {
        "id": "tribune_law",
        "name": "Express Tribune",
        "url": "https://tribune.com.pk/feed",
        "category": "General",
        "logo": "📰",
        "keywords": ["court", "supreme court", "high court", "law", "legal", "verdict",
                     "ordinance", "legislation", "FIR", "bail", "lawyer",
                     "judiciary", "bench", "constitution", "CJP", "NAB"],
    },
    {
        "id": "pakistan_today",
        "name": "Pakistan Today",
        "url": "https://www.pakistantoday.com.pk/feed/",
        "category": "General",
        "logo": "🗞️",
        "keywords": ["court", "supreme court", "high court", "verdict", "judgment",
                     "ordinance", "constitution", "law", "legal", "FIR", "NAB", "bail"],
    },
]

# ─────────────────────────────────────────────
# Category Tags — auto-assigned from keywords
# ─────────────────────────────────────────────
CATEGORY_RULES = [
    ("Supreme Court",   ["supreme court", "CJP", "chief justice", "apex court", "full bench"]),
    ("High Court",      ["high court", "LHC", "SHC", "PHC", "IHC", "BHC"]),
    ("Criminal Law",    ["FIR", "arrested", "bail", "murder", "robbery", "sentence",
                         "acquitted", "conviction", "criminal", "PPC"]),
    ("Family Law",      ["divorce", "khula", "custody", "marriage", "MFLO", "family court"]),
    ("Constitution",    ["constitution", "constitutional", "fundamental rights",
                         "article 10", "article 19", "petition"]),
    ("Legislation",     ["ordinance", "legislation", "parliament", "senate", "assembly",
                         "bill passed", "act 202", "amendment"]),
    ("NAB / Anti-Corruption", ["NAB", "corruption", "accountability", "money laundering",
                               "assets", "references"]),
    ("Cyber Law",       ["PECA", "cybercrime", "FIA", "cyber", "social media", "online"]),
    ("Election Law",    ["election", "ECP", "election commission", "PTI", "vote"]),
]

def _assign_category(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for cat, kws in CATEGORY_RULES:
        if any(k.lower() in text for k in kws):
            return cat
    return "Legal News"

# ── Keyword matching ──────────────────────────────────────────────────────────
# Whole words only. The previous version did `keyword.lower() in text`, which is
# substring matching, and short legal abbreviations are substrings of extremely
# common English:
#
#     "FIR"   -> con(fir)med, (fir)st, (fir)m, (fir)e
#     "NAB"   -> (nab)bed, kid(nap)ping
#     "bail"  -> (bail)out
#     "court" -> (court)esy, (court)ship
#
# That is how "GTA 6: Release date, price, map ... everything confirmed so far"
# ended up on a page titled "Legal news" -- "confirmed" contains "fir". Five of
# seven sample headlines were false positives; the filter was letting nearly
# everything through.
#
# Compiled once per keyword list rather than per article: this runs across five
# feeds x 40 entries on every cache miss.
_PATTERN_CACHE: dict = {}


def _keyword_pattern(keywords: tuple) -> "re.Pattern":
    key = keywords
    if key not in _PATTERN_CACHE:
        # \b around each keyword; escape so "Cr.P.C" style entries stay literal.
        alts = "|".join(re.escape(k) for k in sorted(keywords, key=len, reverse=True))
        _PATTERN_CACHE[key] = re.compile(rf"\b(?:{alts})\b", re.I)
    return _PATTERN_CACHE[key]


# Words that make an item non-legal no matter what else matched. Sport and
# entertainment feeds are the same RSS as the news feed on most Pakistani
# outlets, and they are where the false positives come from.
EXCLUDE = re.compile(
    r"\b(cricket|psl|t20|odi|test match|wicket|batsman|bowler|squad|"
    r"football|fifa|olympic|hockey|kabaddi|"
    r"gta|playstation|xbox|netflix|trailer|box office|album|drama serial|"
    r"recipe|horoscope|weather forecast|gold rate|petrol price)\b",
    re.I,
)


def _is_legal(title: str, summary: str, keywords: list) -> bool:
    text = f"{title} {summary}"
    if EXCLUDE.search(text):
        return False
    return bool(_keyword_pattern(tuple(keywords)).search(text))

def _parse_date(entry) -> str:
    """Parse various RSS date formats into ISO string."""
    for attr in ("published_parsed", "updated_parsed", "created_parsed"):
        val = getattr(entry, attr, None)
        if val:
            try:
                dt = datetime(*val[:6], tzinfo=timezone.utc)
                return dt.isoformat()
            except Exception:
                pass
    return datetime.now(timezone.utc).isoformat()

def _fetch_feed(feed_cfg: dict) -> list:
    """Fetch and parse a single RSS feed, filter for legal content."""
    try:
        parsed = feedparser.parse(feed_cfg["url"])
        items = []
        for entry in parsed.entries[:40]:  # check top 40 entries per feed
            title   = getattr(entry, "title",   "") or ""
            summary = getattr(entry, "summary", "") or ""
            link    = getattr(entry, "link",    "") or ""

            # Strip HTML tags from summary
            summary = re.sub(r"<[^>]+>", "", summary).strip()
            summary = summary[:280] + "…" if len(summary) > 280 else summary

            if not _is_legal(title, summary, feed_cfg["keywords"]):
                continue

            items.append({
                "id":       f"{feed_cfg['id']}_{hash(link) % 999999}",
                "title":    title,
                "summary":  summary,
                "url":      link,
                "source":   feed_cfg["name"],
                "source_id":feed_cfg["id"],
                "logo":     feed_cfg["logo"],
                "category": _assign_category(title, summary),
                "date":     _parse_date(entry),
            })

        return items

    except Exception as e:
        logger.warning("[NEWS] Feed error (%s): %s", feed_cfg["id"], e)
        return []

# ─────────────────────────────────────────────
# Simple in-memory cache (5 minute TTL)
# ─────────────────────────────────────────────
_cache = {"data": [], "ts": 0}
CACHE_TTL = 300  # seconds

def _get_all_news(force: bool = False) -> list:
    global _cache
    now = time.time()
    if not force and _cache["data"] and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    all_items = []
    for feed in FEEDS:
        all_items.extend(_fetch_feed(feed))

    # Sort by date descending, deduplicate by title similarity
    all_items.sort(key=lambda x: x["date"], reverse=True)

    # Simple dedup — same title from different sources
    seen_titles = set()
    deduped = []
    for item in all_items:
        key = item["title"][:60].lower().strip()
        if key not in seen_titles:
            seen_titles.add(key)
            deduped.append(item)

    _cache = {"data": deduped, "ts": now}
    return deduped

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@router.get("/")
async def get_news(
    category: Optional[str] = Query(None, description="Filter by category"),
    source:   Optional[str] = Query(None, description="Filter by source_id"),
    q:        Optional[str] = Query(None, description="Search keyword"),
    limit:    int           = Query(30,   ge=1, le=100),
    refresh:  bool          = Query(False),
):
    """
    Get Pakistani legal news from RSS feeds.
    Cached for 5 minutes. Use ?refresh=true to force refetch.
    """
    loop = asyncio.get_event_loop()
    items = await loop.run_in_executor(None, _get_all_news, refresh)

    # Filter
    if category and category != "all":
        items = [i for i in items if i["category"] == category]
    if source and source != "all":
        items = [i for i in items if i["source_id"] == source]
    if q:
        q_lower = q.lower()
        items = [i for i in items
                 if q_lower in i["title"].lower() or q_lower in i["summary"].lower()]

    categories = sorted({i["category"] for i in _cache["data"]}) if _cache["data"] else []

    return {
        "items":       items[:limit],
        "total":       len(items),
        "categories":  categories,
        "sources":     [{"id": f["id"], "name": f["name"], "logo": f["logo"]} for f in FEEDS],
        "cached_at":   datetime.fromtimestamp(_cache["ts"], tz=timezone.utc).isoformat() if _cache["ts"] else None,
    }


@router.get("/trending")
async def get_trending():
    """Return top 5 most recent items — for homepage ticker or widget."""
    loop = asyncio.get_event_loop()
    items = await loop.run_in_executor(None, _get_all_news, False)
    return {"items": items[:5]}


@router.get("/categories")
async def get_categories():
    """Return all available categories."""
    loop = asyncio.get_event_loop()
    items = await loop.run_in_executor(None, _get_all_news, False)
    cats = sorted({i["category"] for i in items})
    counts = {c: sum(1 for i in items if i["category"] == c) for c in cats}
    return {"categories": [{"name": c, "count": counts[c]} for c in cats]}
