from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from services.ai_service import (
    check_fit_with_ai,
    file_to_base64,
    resolve_url,
    validate_clothing_url_with_ai,
    validate_person_with_ai,
)
from services.image_service import remove_background


router = APIRouter(tags=["analysis"])


class URLValidationRequest(BaseModel):
    url: str


@router.post("/validate-person")
async def validate_person(image: UploadFile = File(...)):
    img_b64, mime = await file_to_base64(image)

    try:
        result = await validate_person_with_ai(img_b64=img_b64, mime=mime)
        return {"valid": result.get("has_person", False), "message": "Person not detected"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"valid": False, "message": str(exc)}) from exc


@router.post("/process")
async def process_image(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()
        encoded = await run_in_threadpool(remove_background, image_bytes)
        return {"image": encoded}
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": str(exc)}) from exc


@router.post("/validate-clothing-url")
async def validate_clothing_url(payload: URLValidationRequest):
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail={"valid": False, "message": "No URL provided"})

    resolved_url = await resolve_url(url)

    try:
        result = await validate_clothing_url_with_ai(resolved_url=resolved_url)
        if result.get("is_clothing"):
            return {"valid": True, "product_name": result.get("product_name", "Clothing")}

        return {
            "valid": False,
            "message": f"This is not fashion: {result.get('reason', 'Invalid link')}",
        }
    except Exception:
        clothing_keywords = [
            "t-shirt",
            "shirt",
            "dress",
            "pants",
            "jeans",
            "clothing",
            "apparel",
            "shoes",
            "jacket",
        ]

        if any(word in resolved_url.lower() for word in clothing_keywords):
            return {"valid": True, "product_name": "Clothing detected"}

        raise HTTPException(
            status_code=500,
            detail={"valid": False, "message": "Server error during validation"},
        )


@router.post("/check-fit")
async def check_fit(
    image: UploadFile = File(...),
    height: str = Form(...),
    weight: str = Form(...),
    product_url: str = Form(""),
):
    if not height or not weight:
        raise HTTPException(status_code=400, detail={"error": "Missing required data"})

    img_b64, mime = await file_to_base64(image)
    resolved_url = await resolve_url(product_url.strip())

    try:
        result = await check_fit_with_ai(
            height=height,
            weight=weight,
            resolved_url=resolved_url,
            img_b64=img_b64,
            mime=mime,
        )
        return {
            "fit_score": result.get("fit_score", 0),
            "size": result.get("size", "N/A"),
            "body_type": result.get("body_type", "Unknown"),
            "analysis": result.get("analysis", "Analysis failed."),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": f"Server error: {str(exc)}"}) from exc
