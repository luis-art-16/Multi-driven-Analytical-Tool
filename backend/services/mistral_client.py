"""
===============================================================================
Module: Mistral AI API Client (mistral_client.py)
Description: 
    Provides a unified, globally accessible client for the Mistral AI API.
    Configured with an extended timeout (5 minutes) to accommodate complex, 
    long-running LLM generation tasks such as analytical modeling and 
    JSON schema structuring.
===============================================================================
"""

import os
import logging
from mistralai.async_client import MistralAsyncClient
from mistralai.models.chat_completion import ChatMessage
from core.config import settings

logger = logging.getLogger("pipeline_api")

# 1. Vai buscar a chave ao ficheiro .env
api_key = os.environ.get("MISTRAL_API_KEY")

# 2. INICIALIZA O CLIENT AQUI! (Usando a versão Async e com o timeout de 5 minutos que querias)
client = MistralAsyncClient(api_key=api_key, timeout=300)

async def call_mistral_api(prompt: str, temperature: float = None, model: str = None, response_format: dict = None ) -> str:
    """
    Universal function to call Mistral AI at any stage of the project.
    """
    temp = temperature if temperature is not None else settings.MISTRAL_TEMPERATURE_DEFAULT
    selected_model = model or settings.MISTRAL_MODEL
    
    logger.info(f"Calling Mistral API (Model: {selected_model}, Temp: {temp})")
    
    try:
        messages = [
            ChatMessage(role="system", content="You are a senior data architect and requirements engineer."),
            ChatMessage(role="user", content=prompt)
        ]
        
        # O teu código agora já conhece a variável 'client' e usa o 'await' corretamente
        response = await client.chat(
            model=selected_model,
            messages=messages,
            temperature=temp,
	    response_format=response_format
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Error in Mistral API: {str(e)}")
        raise e
