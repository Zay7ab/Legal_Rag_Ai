import os
import time
import logging
from typing import List, Dict, Generator
from groq import Groq, RateLimitError, APIError

logger = logging.getLogger(__name__)

_client = None


import json
from pathlib import Path

def get_groq_api_key() -> str:
    """Get the Groq API key from data/config.json or fallback to environment variables."""
    try:
        backend_dir = Path(__file__).resolve().parent.parent
        config_path = backend_dir / "data" / "config.json"
        if config_path.exists():
            config = json.loads(config_path.read_text())
            key = config.get("GROQ_API_KEY")
            if key and key.strip():
                return key.strip()
    except Exception:
        pass
    return os.getenv("GROQ_API_KEY", "").strip()


def reset_client() -> None:
    """Reset the singleton Groq client so it re-initializes on the next request."""
    global _client
    _client = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = get_groq_api_key()
        if not api_key or api_key == "your_groq_api_key_here":
            raise ValueError(
                "GROQ_API_KEY is not set or is using the placeholder. "
                "Please configure your real Groq API key in backend/.env or via the Admin Panel.\n"
                "Get a free key at: https://console.groq.com"
            )
        _client = Groq(api_key=api_key)
    return _client


class LLMService:
    """
    Groq LLaMA 3-70B wrapper with retry, streaming, and token tracking.
    """

    def __init__(
        self,
        model: str = "llama-3.3-70b-versatile",
        max_tokens: int = 1500,
        temperature: float = 0.15,   # Low for factual legal responses
        max_retries: int = 3,
        retry_delay: float = 2.0,
    ):
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.max_retries = max_retries
        self.retry_delay = retry_delay

        # Token usage tracking
        self._total_prompt_tokens = 0
        self._total_completion_tokens = 0

    # ── Main chat method ───────────────────────────────────────────────────────

    def chat(self, system_prompt: str, messages: List[Dict]) -> str:
        """
        Send a chat request to Groq LLaMA 3-70B with retry on rate limit.

        Args:
            system_prompt : System instructions
            messages      : List of {"role": "user"/"assistant", "content": "..."}

        Returns:
            Model's response as a string.
        """
        payload = [
            {"role": "system", "content": system_prompt},
            *messages,
        ]

        for attempt in range(1, self.max_retries + 1):
            try:
                client = _get_client()
                response = client.chat.completions.create(
                    model=self.model,
                    messages=payload,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature,
                )

                # Track usage
                if response.usage:
                    self._total_prompt_tokens += response.usage.prompt_tokens
                    self._total_completion_tokens += response.usage.completion_tokens
                    logger.debug(
                        "Tokens — prompt: %d, completion: %d, total session: %d",
                        response.usage.prompt_tokens,
                        response.usage.completion_tokens,
                        self._total_prompt_tokens + self._total_completion_tokens,
                    )

                return response.choices[0].message.content

            except RateLimitError as e:
                if attempt < self.max_retries:
                    wait = self.retry_delay * attempt
                    logger.warning("Rate limit hit. Retrying in %.1fs (attempt %d/%d)", wait, attempt, self.max_retries)
                    time.sleep(wait)
                else:
                    raise RuntimeError(
                        "Groq rate limit exceeded. Please wait a moment and try again."
                    ) from e

            except APIError as e:
                logger.error("Groq API error: %s", e)
                raise RuntimeError(f"LLM API error: {e}") from e

    # ── Streaming ──────────────────────────────────────────────────────────────

    def stream(self, system_prompt: str, messages: List[Dict]) -> Generator[str, None, None]:
        """
        Stream the response token by token (for future Streamlit streaming UI).

        Usage:
            for chunk in llm_service.stream(system, msgs):
                print(chunk, end="", flush=True)
        """
        client = _get_client()
        payload = [
            {"role": "system", "content": system_prompt},
            *messages,
        ]
        stream = client.chat.completions.create(
            model=self.model,
            messages=payload,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    # ── One-shot completion ────────────────────────────────────────────────────

    def complete(self, prompt: str) -> str:
        """Single-turn completion — no conversation history."""
        return self.chat(
            system_prompt="You are a concise and accurate legal assistant for Pakistani law.",
            messages=[{"role": "user", "content": prompt}],
        )

    # ── Usage stats ────────────────────────────────────────────────────────────

    @property
    def token_usage(self) -> Dict[str, int]:
        return {
            "prompt_tokens": self._total_prompt_tokens,
            "completion_tokens": self._total_completion_tokens,
            "total_tokens": self._total_prompt_tokens + self._total_completion_tokens,
        }
