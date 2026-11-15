#!/usr/bin/env python3
"""
Phase 2 Hero AI Sprite Generator (Gemini gemini-nano-banana-2.1 · Interactions API)
---------------------------------------------------------------------------------
Generates 512x512 transparent 3D-illustrated PNG hero sprites into assets/
when a valid Google Gemini API key is available in GEMINI_API_KEY / GOOGLE_API_KEY,
then delegates/triggers scripts/generate_3d_assets.js for the full 35-asset pack
and assets/asset_bundle.js synchronization.
"""

import base64
import collections
import io
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "assets" / "asset_manifest.json"
MODEL_NAME = "gemini-nano-banana-2.1"

HERO_PROMPTS = {
    "wizard_idle": (
        "3D stylized mobile hyper-casual fantasy chibi wizard character holding a glowing "
        "cyan crystal wand upright, pastel sky-blue starry pointed hat with golden trim, "
        "cute expressive eyes, chunky cel-shaded 3D lighting with deep plum #241434 outline, "
        "isometric three-quarter front view, isolated centered on solid pure white background, "
        "no floor text, no UI."
    ),
    "cauldron_station": (
        "3D stylized enchanted giant golden-bronze alchemy cauldron overflowing with glowing "
        "magenta rainbow potion bubbles, carved star runes, rim lighting, deep plum #241434 "
        "stylized outline, isometric 3/4 view, isolated centered on solid pure white background."
    ),
    "sales_stall": (
        "3D stylized cozy fairy-forest wooden shop stall with coral-and-cream striped fabric awning, "
        "polished oak counter and golden star lantern accents, mobile casual game art style with "
        "deep plum #241434 outline, isometric 3/4 view, isolated centered on solid pure white background."
    ),
    "slime_king": (
        "3D stylized boss monster King Slime made of glossy translucent rose-magenta jelly wearing an "
        "ornate faceted golden crown studded with cyan gems, cute fierce brow, specular highlights, "
        "deep plum #241434 outline, isometric 3/4 view, isolated centered on solid pure white background."
    ),
    "fairy_tree_1": (
        "3D stylized storybook magical cherry blossom tree with layered fluffy pink and lavender clouds "
        "canopy, warm gnarled bark trunk, tiny glowing star lantern hanging from branch, cel-shaded 3D "
        "mobile game style, deep plum #241434 outline, isolated centered on solid pure white background."
    ),
}


def flood_fill_remove_bg(img_bytes: bytes, tolerance: int = 34) -> bytes:
    """Removes uniform studio background starting from corners using Pillow if installed."""
    from PIL import Image

    im = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    im = im.resize((512, 512), Image.LANCZOS)
    px = im.load()
    w, h = im.size

    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    bg_samples = [px[cx, cy][:3] for cx, cy in corners]
    avg_r = sum(c[0] for c in bg_samples) // 4
    avg_g = sum(c[1] for c in bg_samples) // 4
    avg_b = sum(c[2] for c in bg_samples) // 4

    visited = set()
    q = collections.deque(corners)
    for pt in corners:
        visited.add(pt)

    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        dist = abs(r - avg_r) + abs(g - avg_g) + abs(b - avg_b)
        if dist <= tolerance * 3:
            px[x, y] = (r, g, b, 0)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    q.append((nx, ny))

    out = io.BytesIO()
    im.save(out, format="PNG")
    return out.getvalue()


def _decode_image_data(data) -> bytes:
    if isinstance(data, (bytes, bytearray)) and bytes(data).startswith(b"\x89PNG"):
        return bytes(data)
    return base64.b64decode(data)


def generate_gemini_sprite(api_key: str, prompt: str) -> bytes:
    """Generates a 1:1 sprite image via the Gemini Interactions API (`gemini-nano-banana-2.1`)."""
    try:
        from google import genai
    except ImportError:
        genai = None

    if genai is not None:
        client = genai.Client(api_key=api_key)
        interaction = client.interactions.create(
            model=MODEL_NAME,
            input=prompt,
            response_format={"type": "image", "aspect_ratio": "1:1"},
        )
        output_image = getattr(interaction, "output_image", None)
        if output_image and getattr(output_image, "data", None):
            return flood_fill_remove_bg(_decode_image_data(output_image.data))
        for step in getattr(interaction, "steps", None) or []:
            if getattr(step, "type", None) == "model_output":
                for block in getattr(step, "content", None) or []:
                    if getattr(block, "type", None) == "image" and getattr(block, "data", None):
                        return flood_fill_remove_bg(_decode_image_data(block.data))
        raise RuntimeError("No image bytes returned in Gemini Interactions SDK response")

    url = "https://generativelanguage.googleapis.com/v1beta/interactions"
    payload = {
        "model": MODEL_NAME,
        "input": prompt,
        "response_format": {
            "type": "image",
            "aspect_ratio": "1:1",
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
            "Api-Revision": "2026-05-20",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    for step in body.get("steps", []):
        if step.get("type") == "model_output":
            for block in step.get("content", []):
                if block.get("type") == "image" and block.get("data"):
                    raw_bytes = _decode_image_data(block["data"])
                    return flood_fill_remove_bg(raw_bytes)
    raise RuntimeError("No image bytes returned in Gemini Interactions REST response")


def main() -> int:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    by_id = {entry["id"]: entry for entry in manifest["assets"]}

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
    if not api_key.startswith("AIza"):
        print(
            "[gen_ai_sprites] Valid Google GEMINI_API_KEY ('AIza...') not found in environment; "
            "invoking local 3D shader baker scripts/generate_3d_assets.js."
        )
        return subprocess.call(["node", str(ROOT / "scripts" / "generate_3d_assets.js")])

    # First ensure all 35 base procedural 3D assets exist
    subprocess.check_call(["node", str(ROOT / "scripts" / "generate_3d_assets.js")])

    # Upgrade the 5 hero sprites via Gemini Image API
    for asset_id, prompt in HERO_PROMPTS.items():
        target_rel = by_id[asset_id]["path"]
        out_path = ROOT / target_rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            print(f"[gen_ai_sprites] Generating {asset_id} -> {target_rel} via {MODEL_NAME}...")
            png_bytes = generate_gemini_sprite(api_key, prompt)
            out_path.write_bytes(png_bytes)
        except Exception as exc:
            print(f"[gen_ai_sprites] Fallback retained for {asset_id}: {exc}", file=sys.stderr)

    # Re-sync bundle with any hero PNG overrides
    return subprocess.call(["node", str(ROOT / "scripts" / "generate_3d_assets.js"), "--bundle-only"])


if __name__ == "__main__":
    raise SystemExit(main())
