"""
Central configuration, loaded from environment variables / .env file.

Nothing here is used for DB or MQTT connections yet (Sessions 2 & 3) —
Session 1 only establishes the pattern so later sessions plug straight in.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"

    # Reserved for Session 2 (Database)
    database_url: str = "postgresql://postgres:postgres@localhost:5432/urban_sentinel"

    # Reserved for Session 3 (MQTT)
    mqtt_broker_host: str = "localhost"
    mqtt_broker_port: int = 1883
    mqtt_topic_prefix: str = "urban_sentinel/sensors"

    # Reserved for Session 10 (Firebase push notifications)
    firebase_credentials_path: str = ""

    # Session 6 (Auth)
    secret_key: str = "dev-secret-key-change-this-before-any-real-deployment"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days — mobile app stays logged in

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
