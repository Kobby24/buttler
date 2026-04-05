from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import base64
import requests
import json
from rembg import remove
from PIL import Image
import io
from dotenv import load_dotenv
import os

def resolve_url(url):
    """ამოწმებს გადამისამართებებს და აბრუნებს საბოლოო URL-ს"""
    try:
        # ვიყენებთ requests-ს, რომ მივყვეთ გადამისამართებებს (მაგ. amzn.eu -> amazon.com)
        resp = requests.head(url, allow_redirects=True, timeout=5, 
                             headers={"User-Agent": "Mozilla/5.0"})
        return resp.url
    except Exception:
        # თუ რამე შეცდომა მოხდა, ვაბრუნებთ ორიგინალ ლინკს
        return url

load_dotenv(override=True)
app = Flask(__name__)
CORS(app)

# OpenRouter კონფიგურაცია
client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=os.getenv("OPENROUTER_API_KEY"),
)

def file_to_base64(file_storage):
    file_storage.seek(0)
    data = file_storage.read()
    mime = file_storage.content_type or "image/jpeg"
    file_storage.seek(0)
    return base64.b64encode(data).decode("utf-8"), mime

@app.route("/validate-person", methods=["POST"])
def validate_person():
    file = request.files["image"]
    img_b64, mime = file_to_base64(file)

    try:
        response = client.chat.completions.create(
            model="google/gemini-2.0-flash-001", # სრულიად უფასო Vision მოდელი
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Is there a human in this image? Respond ONLY JSON: {\"has_person\": true/false}"},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{img_b64}"}}
                ]
            }]
        )
        result = json.loads(response.choices[0].message.content)
        return jsonify({"valid": result.get("has_person", False), "message": "Result processed"})
    except Exception as e:
        return jsonify({"valid": False, "message": str(e)}), 500

@app.route("/process", methods=["POST"])
def process_image():
    file = request.files["image"]
    try:
        output = remove(Image.open(file.stream))
        buf = io.BytesIO()
        output.save(buf, format="PNG")
        return jsonify({"image": base64.b64encode(buf.getvalue()).decode()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/validate-clothing-url", methods=["POST", "OPTIONS"])
def validate_clothing_url():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json()
    url = (data or {}).get("url", "").strip()

    if not url:
        return jsonify({"valid": False, "message": "No URL provided"}), 400

    # ლინკის "გაშლა" (რომ amzn.eu-მ არ დააბნიოს)
    resolved_url = resolve_url(url)

    try:
        # ვიყენებთ უფრო ძლიერ მოდელს ტექსტის ანალიზისთვის
        response = client.chat.completions.create(
            model="google/gemini-2.0-flash-001", 
            messages=[{
                "role": "user",
                "content": (
                    f"Analyze this URL: {resolved_url}\n"
                    "Determine if this is a product page for clothing, shoes, or fashion accessories. "
                    "If it is an iPhone, laptop, or anything else, mark it as false.\n"
                    "Respond ONLY with this JSON format:\n"
                    '{"is_clothing": true, "product_name": "Short description"} or '
                    '{"is_clothing": false, "reason": "Short reason why"}'
                ),
            }],
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        if result.get("is_clothing"):
            return jsonify({
                "valid": True, 
                "product_name": result.get("product_name", "Clothing")
            })
        else:
            return jsonify({
                "valid": False, 
                "message": f"❌ This is not fashion: {result.get('reason', 'Invalid link')}"
            })

    except Exception as e:
        # თუ AI-მ ვერ უპასუხა, მაგრამ ლინკში აშკარად ჩანს ტანსაცმლის სიტყვები, მაინც გავატაროთ
        clothing_keywords = ['t-shirt', 'shirt', 'dress', 'pants', 'jeans', 'clothing', 'apparel', 'shoes', 'jacket']
        if any(word in resolved_url.lower() for word in clothing_keywords):
            return jsonify({"valid": True, "product_name": "Clothing detected"})
            
        return jsonify({"valid": False, "message": "Server error during validation"})

@app.route("/check-fit", methods=["POST", "OPTIONS"])
def check_fit():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    height = request.form.get("height", "")
    weight = request.form.get("weight", "")
    product_url = request.form.get("product_url", "").strip()

    if "image" not in request.files or not height or not weight:
        return jsonify({"error": "Missing required data"}), 400

    file = request.files["image"]
    img_b64, mime = file_to_base64(file)
    resolved_url = resolve_url(product_url)

    try:
        response = client.chat.completions.create(
            model="google/gemini-2.0-flash-001",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": (
                            f"User: {height}cm, {weight}kg. Product: {resolved_url}\n"
                            "Act as a fashion expert. Analyze the photo and body proportions.\n"
                            "Respond ONLY in JSON format with English text:\n"
                            "{"
                            "  \"fit_score\": 0-100,"
                            "  \"size\": \"Recommended size (S/M/L/etc)\","
                            "  \"body_type\": \"Body shape description\","
                            "  \"analysis\": \"Detailed explanation in English about the fit and sizing.\""
                            "}"
                        )
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{img_b64}"}
                    }
                ]
            }],
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        return jsonify({
            "fit_score": result.get("fit_score", 0),
            "size": result.get("size", "N/A"),
            "body_type": result.get("body_type", "Unknown"),
            "analysis": result.get("analysis", "Analysis failed.")
        })

    except Exception as e:
        print(f"Check-fit error: {e}")
        return jsonify({"error": "Server error"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)