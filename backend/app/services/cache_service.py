"""Shared embedding cache interface and implementations (In-Memory + Redis).

Provides a single unified interface so single-process dev and multi-process
production operate identically without code branching in recognition service.
"""

from __future__ import annotations

import io
import json
import threading
from abc import ABC, abstractmethod
from typing import Dict, Optional, Tuple

import numpy as np

from app.config import settings
from app.utils.logging import logger


class EmbeddingCache(ABC):
    """Abstract interface for face embedding cache."""

    @abstractmethod
    def get_all(self) -> Dict[int, Tuple[int, np.ndarray]]:
        """Return {embedding_db_id: (student_id, np.ndarray[float32])}."""
        pass

    @abstractmethod
    def set_all(self, data: Dict[int, Tuple[int, np.ndarray]]) -> None:
        """Replace the cache with fresh data."""
        pass

    @abstractmethod
    def invalidate(self) -> None:
        """Mark cache dirty so next read triggers refresh."""
        pass

    @abstractmethod
    def is_dirty(self) -> bool:
        """Return True if cache needs reload from DB."""
        pass


class MemoryEmbeddingCache(EmbeddingCache):
    """Thread-safe in-process memory cache for single-process development."""

    def __init__(self):
        self._cache: Dict[int, Tuple[int, np.ndarray]] = {}
        self._lock = threading.Lock()
        self._dirty = True

    def get_all(self) -> Dict[int, Tuple[int, np.ndarray]]:
        with self._lock:
            # Return shallow copy of dict so callers don't mutate while reading
            return dict(self._cache)

    def set_all(self, data: Dict[int, Tuple[int, np.ndarray]]) -> None:
        with self._lock:
            self._cache = dict(data)
            self._dirty = False

    def invalidate(self) -> None:
        with self._lock:
            self._dirty = True

    def is_dirty(self) -> bool:
        with self._lock:
            return self._dirty


class RedisEmbeddingCache(EmbeddingCache):
    """Redis-backed shared embedding cache for multi-process production deployments."""

    def __init__(self, redis_url: str):
        import redis
        self.redis_url = redis_url
        self._client = redis.Redis.from_url(redis_url)
        self._key = "classroom:face_embeddings"
        self._dirty_key = "classroom:face_embeddings:dirty"
        self._lock = threading.Lock()

    def get_all(self) -> Dict[int, Tuple[int, np.ndarray]]:
        try:
            raw_hash = self._client.hgetall(self._key)
            result: Dict[int, Tuple[int, np.ndarray]] = {}
            for k, v in raw_hash.items():
                emb_id = int(k.decode() if isinstance(k, bytes) else k)
                # Payload format: 4 bytes student_id (int32) + float32 array bytes
                raw = v if isinstance(v, bytes) else v.encode()
                student_id = int(np.frombuffer(raw[:4], dtype=np.int32)[0])
                arr = np.frombuffer(raw[4:], dtype=np.float32).copy()
                result[emb_id] = (student_id, arr)
            return result
        except Exception as e:
            logger.warning(f"Redis get_all error: {e} — falling back to empty")
            return {}

    def set_all(self, data: Dict[int, Tuple[int, np.ndarray]]) -> None:
        try:
            pipe = self._client.pipeline()
            pipe.delete(self._key)
            if data:
                mapping = {}
                for emb_id, (student_id, arr) in data.items():
                    header = np.array([student_id], dtype=np.int32).tobytes()
                    body = arr.astype(np.float32).tobytes()
                    mapping[str(emb_id)] = header + body
                pipe.hset(self._key, mapping=mapping)
            pipe.set(self._dirty_key, "0")
            pipe.execute()
        except Exception as e:
            logger.warning(f"Redis set_all error: {e}")

    def invalidate(self) -> None:
        try:
            self._client.set(self._dirty_key, "1")
        except Exception as e:
            logger.warning(f"Redis invalidate error: {e}")

    def is_dirty(self) -> bool:
        try:
            val = self._client.get(self._dirty_key)
            if val is None or val == b"1" or val == "1":
                return True
            return False
        except Exception as e:
            logger.warning(f"Redis is_dirty error: {e}")
            return True


_global_cache: Optional[EmbeddingCache] = None
_global_cache_lock = threading.Lock()


def get_embedding_cache() -> EmbeddingCache:
    """Factory: return shared EmbeddingCache instance (Redis if configured, else Memory)."""
    global _global_cache
    with _global_cache_lock:
        if _global_cache is not None:
            return _global_cache

        if settings.REDIS_URL:
            try:
                rc = RedisEmbeddingCache(settings.REDIS_URL)
                # Test connectivity
                rc._client.ping()
                _global_cache = rc
                logger.info(f"Shared embedding cache: Redis ({settings.REDIS_URL})")
                return _global_cache
            except Exception as e:
                logger.warning(f"Redis connection failed ({e}) — falling back to MemoryEmbeddingCache")

        _global_cache = MemoryEmbeddingCache()
        logger.info("Shared embedding cache: In-Process Memory (single-process dev mode)")
        return _global_cache
