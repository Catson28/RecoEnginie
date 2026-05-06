"""
ReconEngine — Configuração Centralizada
=========================================
Lê variáveis de ambiente e valida com Pydantic Settings.
Cobre todas as configurações do sistema de reconciliação bancária.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Base de dados principal ---
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/reconengine"

    # --- Motor de Matching ---
    # Tier 1 — Exact: ref_id + amount + date window
    TIER1_DATE_TOLERANCE_DAYS: int = 2       # ±2 dias
    TIER1_AMOUNT_TOLERANCE: float = 0.0      # exacto (sem tolerância)

    # Tier 2 — Fuzzy: descrição similar + amount
    TIER2_FUZZY_THRESHOLD: float = 85.0      # similaridade mínima %
    TIER2_DATE_TOLERANCE_DAYS: int = 5

    # Tier 3 — Probable: amount + date, sem ref
    TIER3_CONFIDENCE_MIN: int = 50
    TIER3_CONFIDENCE_MAX: int = 74
    TIER3_DATE_TOLERANCE_DAYS: int = 7

    # --- Thresholds de alerta ---
    ALERT_MIN_MATCH_RATE: float = 0.85       # alerta se match rate < 85%
    ALERT_MAX_OPEN_ITEMS: int = 50           # alerta se open items > 50
    ALERT_MAX_OPEN_VALUE: float = 100000.0   # alerta se valor em aberto > $100k

    # --- Notificações ---
    ENABLE_EMAIL_NOTIFICATIONS: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "alerts@reconengine.local"
    ALERT_TO_EMAILS: str = ""

    ENABLE_SLACK_NOTIFICATIONS: bool = False
    SLACK_WEBHOOK_URL: str = ""

    # --- App ---
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    SECRET_KEY: str = "change-me-in-production"

    # --- Performance ---
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    BATCH_SIZE: int = 5000


settings = Settings()
