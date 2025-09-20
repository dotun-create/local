"""
Cache Manager Service
Provides caching functionality using Redis for performance optimization
"""

import redis
import json
import pickle
import logging
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Optional, Union, Callable
from flask import current_app
import hashlib

logger = logging.getLogger(__name__)

class CacheManager:
    """
    Cache Manager for handling Redis operations with fallback to in-memory cache
    """

    def __init__(self):
        self.redis_client = None
        self.memory_cache = {}  # Fallback in-memory cache
        self.use_redis = False
        self._initialize_redis()

    def _initialize_redis(self):
        """Initialize Redis connection with error handling"""
        try:
            # Get Redis configuration from environment or use defaults
            redis_host = current_app.config.get('REDIS_HOST', 'localhost')
            redis_port = current_app.config.get('REDIS_PORT', 6379)
            redis_db = current_app.config.get('REDIS_DB', 0)
            redis_password = current_app.config.get('REDIS_PASSWORD', None)

            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                password=redis_password,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True
            )

            # Test connection
            self.redis_client.ping()
            self.use_redis = True
            logger.info("Redis cache initialized successfully")

        except Exception as e:
            logger.warning(f"Redis unavailable, falling back to memory cache: {str(e)}")
            self.use_redis = False

    def get(self, key: str, default=None) -> Any:
        """
        Get value from cache

        Args:
            key: Cache key
            default: Default value if key not found

        Returns:
            Cached value or default
        """
        try:
            if self.use_redis:
                value = self.redis_client.get(key)
                if value is not None:
                    return self._deserialize(value)
            else:
                # Memory cache fallback
                if key in self.memory_cache:
                    item = self.memory_cache[key]
                    if datetime.utcnow() < item['expires']:
                        return item['value']
                    else:
                        del self.memory_cache[key]

        except Exception as e:
            logger.error(f"Cache get error for key {key}: {str(e)}")

        return default

    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """
        Set value in cache

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds

        Returns:
            True if successful, False otherwise
        """
        try:
            if self.use_redis:
                serialized_value = self._serialize(value)
                return self.redis_client.setex(key, ttl, serialized_value)
            else:
                # Memory cache fallback
                self.memory_cache[key] = {
                    'value': value,
                    'expires': datetime.utcnow() + timedelta(seconds=ttl)
                }
                return True

        except Exception as e:
            logger.error(f"Cache set error for key {key}: {str(e)}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete key from cache

        Args:
            key: Cache key to delete

        Returns:
            True if successful, False otherwise
        """
        try:
            if self.use_redis:
                return bool(self.redis_client.delete(key))
            else:
                # Memory cache fallback
                if key in self.memory_cache:
                    del self.memory_cache[key]
                    return True

        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {str(e)}")

        return False

    def clear_pattern(self, pattern: str) -> int:
        """
        Clear all keys matching pattern

        Args:
            pattern: Pattern to match (e.g., "availability:*")

        Returns:
            Number of keys deleted
        """
        deleted_count = 0
        try:
            if self.use_redis:
                keys = self.redis_client.keys(pattern)
                if keys:
                    deleted_count = self.redis_client.delete(*keys)
            else:
                # Memory cache fallback
                import fnmatch
                keys_to_delete = [key for key in self.memory_cache.keys()
                                if fnmatch.fnmatch(key, pattern)]
                for key in keys_to_delete:
                    del self.memory_cache[key]
                deleted_count = len(keys_to_delete)

        except Exception as e:
            logger.error(f"Cache clear pattern error for {pattern}: {str(e)}")

        return deleted_count

    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache

        Args:
            key: Cache key

        Returns:
            True if key exists, False otherwise
        """
        try:
            if self.use_redis:
                return bool(self.redis_client.exists(key))
            else:
                # Memory cache fallback
                if key in self.memory_cache:
                    item = self.memory_cache[key]
                    if datetime.utcnow() < item['expires']:
                        return True
                    else:
                        del self.memory_cache[key]

        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {str(e)}")

        return False

    def get_ttl(self, key: str) -> int:
        """
        Get time to live for key

        Args:
            key: Cache key

        Returns:
            TTL in seconds, -1 if key doesn't exist
        """
        try:
            if self.use_redis:
                return self.redis_client.ttl(key)
            else:
                # Memory cache fallback
                if key in self.memory_cache:
                    item = self.memory_cache[key]
                    remaining = item['expires'] - datetime.utcnow()
                    return max(0, int(remaining.total_seconds()))

        except Exception as e:
            logger.error(f"Cache TTL error for key {key}: {str(e)}")

        return -1

    def _serialize(self, value: Any) -> str:
        """
        Serialize value for storage

        Args:
            value: Value to serialize

        Returns:
            Serialized string
        """
        try:
            # Try JSON first for simple types
            return json.dumps(value)
        except (TypeError, ValueError):
            # Fallback to pickle for complex objects
            import base64
            pickled = pickle.dumps(value)
            return f"PICKLE:{base64.b64encode(pickled).decode()}"

    def _deserialize(self, value: str) -> Any:
        """
        Deserialize value from storage

        Args:
            value: Serialized string

        Returns:
            Deserialized value
        """
        try:
            if value.startswith("PICKLE:"):
                # Handle pickled data
                import base64
                pickled_data = base64.b64decode(value[7:])
                return pickle.loads(pickled_data)
            else:
                # Handle JSON data
                return json.loads(value)
        except Exception as e:
            logger.error(f"Cache deserialize error: {str(e)}")
            return None

    def cache_key(self, *args, **kwargs) -> str:
        """
        Generate cache key from arguments

        Args:
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Cache key string
        """
        # Create a unique key from all arguments
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()

    def cleanup_expired(self) -> int:
        """
        Clean up expired keys from memory cache

        Returns:
            Number of keys cleaned up
        """
        if self.use_redis:
            # Redis handles expiration automatically
            return 0

        expired_keys = []
        current_time = datetime.utcnow()

        for key, item in self.memory_cache.items():
            if current_time >= item['expires']:
                expired_keys.append(key)

        for key in expired_keys:
            del self.memory_cache[key]

        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired cache keys")

        return len(expired_keys)

    def get_stats(self) -> dict:
        """
        Get cache statistics

        Returns:
            Dictionary with cache stats
        """
        stats = {
            'type': 'redis' if self.use_redis else 'memory',
            'available': self.use_redis
        }

        try:
            if self.use_redis:
                info = self.redis_client.info()
                stats.update({
                    'used_memory': info.get('used_memory_human'),
                    'connected_clients': info.get('connected_clients'),
                    'keyspace_hits': info.get('keyspace_hits', 0),
                    'keyspace_misses': info.get('keyspace_misses', 0),
                })

                # Calculate hit rate
                hits = stats['keyspace_hits']
                misses = stats['keyspace_misses']
                total = hits + misses
                if total > 0:
                    stats['hit_rate'] = round((hits / total) * 100, 2)
                else:
                    stats['hit_rate'] = 0
            else:
                stats.update({
                    'memory_keys': len(self.memory_cache),
                    'memory_usage': f"{len(str(self.memory_cache))} chars"
                })

        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")

        return stats


# Decorator for caching function results
def cached(ttl: int = 3600, key_prefix: str = ""):
    """
    Decorator to cache function results

    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache keys

    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{cache_manager.cache_key(*args, **kwargs)}"

            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result

            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl)
            logger.debug(f"Cache miss for {cache_key}, result cached")

            return result

        return wrapper
    return decorator


# Global cache manager instance
cache_manager = CacheManager()