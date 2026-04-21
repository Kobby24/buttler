import base64
import io

from PIL import Image


def remove_background(image_bytes: bytes) -> str:
    try:
        from rembg import remove
    except SystemExit as exc:
        raise RuntimeError(
            "rembg requires the onnxruntime backend; install rembg[cpu] or rembg[gpu]"
        ) from exc

    output = remove(Image.open(io.BytesIO(image_bytes)))
    buf = io.BytesIO()
    output.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()
