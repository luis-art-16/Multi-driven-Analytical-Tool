"""
===============================================================================
Module: Configuration Management (config.py)
Description: 
    Centralized configuration management for the Multi-driven Analytical Tool Pipeline Backend.
    Uses Pydantic BaseSettings to securely load and validate environment 
    variables from the .env file. Also initializes global logging configurations.
===============================================================================
"""

import os
import logging
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # --- Database Settings ---
    MONGO_URL: str = "mongodb://mongo:27017"
    MONGO_DB_NAME: str = "pipeline_db"
    
    # --- LLM Integration (Mistral AI) ---
    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "open-mistral-7b"
    MISTRAL_TEMPERATURE_DEFAULT: float = 0.2
    
    # --- Security & Authentication (Legacy/Placeholder) ---
    SECRET_KEY: str = "default_secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    GOOGLE_CLIENT: str = ""
    
    # --- Email Notifications (Resend API) ---
    EMAIL_ENABLED: bool = True
    RESEND_API_KEY: str = ""
    EMAIL_FROM_NAME: str = "Multi-driven Analytical Tool Pipeline"
    EMAIL_SENDER: str = "onboarding@resend.dev"
    
    class Config:
        env_file = "../.env"
        extra = "ignore" # Ignores extra variables present in the .env file

# Instantiate global settings
settings = Settings()

# --- Global Logging Configuration ---
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("pipeline_api")