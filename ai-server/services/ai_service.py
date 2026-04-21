import base64
import json

import httpx
from fastapi import UploadFile
from fastapi.concurrency import run_in_threadpool
from openai import OpenAI

from core.config import get_settings


settings = get_settings()
client = OpenAI(
    base_url=settings.openrouter_base_url,
    api_key=settings.openrouter_api_key,
)


async def resolve_url(url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as http_client:
            response = await http_client.head(url, headers={"User-Agent": "Mozilla/5.0"})
            if response.status_code >= 400 or response.status_code == 405:
                response = await http_client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            return str(response.url)
    except Exception:
        return url


async def file_to_base64(file: UploadFile) -> tuple[str, str]:
    await file.seek(0)
    data = await file.read()
    mime = file.content_type or "image/jpeg"
    await file.seek(0)
    return base64.b64encode(data).decode("utf-8"), mime


async def create_chat_completion(**kwargs):
    return await run_in_threadpool(client.chat.completions.create, **kwargs)


async def validate_person_with_ai(img_b64: str, mime: str) -> dict:
    response = await create_chat_completion(
        model=settings.openrouter_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Is there a human in this image? Respond ONLY JSON: {\"has_person\": true/false}",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{img_b64}"},
                    },
                ],
            }
        ],
    )
    return json.loads(response.choices[0].message.content)


async def validate_clothing_url_with_ai(resolved_url: str) -> dict:
    response = await create_chat_completion(
        model=settings.openrouter_model,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Analyze this URL: {resolved_url}\\n"
                    "Determine if this is a product page for clothing, shoes, or fashion accessories. "
                    "If it is an iPhone, laptop, or anything else, mark it as false.\\n"
                    "Respond ONLY with this JSON format:\\n"
                    '{"is_clothing": true, "product_name": "Short description"} or '
                    '{"is_clothing": false, "reason": "Short reason why"}'
                ),
            }
        ],
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


async def check_fit_with_ai(height: str, weight: str, resolved_url: str, img_b64: str, mime: str) -> dict:
    response = await create_chat_completion(
        model=settings.openrouter_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"User: {height}cm, {weight}kg. Product: {resolved_url}\\n"
                            "Act as a fashion expert. Analyze the photo and body proportions.\\n"
                            "Respond ONLY in JSON format with English text:\\n"
                            "{"
                            "  \\\"fit_score\\\": 0-100,"
                            "  \\\"size\\\": \\\"Recommended size (S/M/L/etc)\\\","
                            "  \\\"body_type\\\": \\\"Body shape description\\\","
                            "  \\\"analysis\\\": \\\"Detailed explanation in English about the fit and sizing.\\\""
                            "}"
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{img_b64}"},
                    },
                ],
            }
        ],
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)
