#!/usr/bin/env python3
"""
Step 1: Automated GitHub & CDN 3D .glb Asset Downloader + glTF 2.0 Binary Validator.

Searches public GitHub repositories / trees (mrdoob/three.js, KhronosGroup/glTF-Sample-Models,
and open CC0 KayKit / Quaternius / Kenney mirrors), downloads Three.js r128 companion modules
into src/vendor/, validates every downloaded .glb header & JSON chunk (meshes, nodes,
materials, animations), rejects HTML/corrupt or Draco/Meshopt-locked files, and generates
assets/models/manifest.json.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "assets" / "models"
VENDOR_DIR = ROOT / "src" / "vendor"
MANIFEST_PATH = MODELS_DIR / "manifest.json"

GLTF_MAGIC = 0x46546C67   # b"glTF" little-endian
CHUNK_JSON = 0x4E4F534A   # b"JSON" little-endian
CHUNK_BIN = 0x004E4942    # b"BIN\x00" little-endian

UNSUPPORTED_REQUIRED_EXTS = {
    "KHR_draco_mesh_compression",
    "EXT_meshopt_compression",
}

TARGET_HEIGHTS: Dict[str, float] = {
    "wizard": 1.8,
    "fairy_worker": 1.3,
    "customer": 1.6,
    "slime_normal": 1.2,
    "slime_king": 3.2,
    "tree": 4.5,
    "cauldron": 2.2,
    "sales_stall": 2.5,
    "gem_pedestal": 0.85,
    "harvester_cart": 1.6,
    "rock_crystal": 1.35,
    "berry_bush": 1.25,
    "fence": 1.4,
    "stack_block": 0.22,
    "mana_gem": 0.18,
}

VENDOR_MODULES: List[Dict[str, Any]] = [
    {
        "filename": "GLTFLoader.js",
        "urls": [
            "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
            "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/loaders/GLTFLoader.js",
        ],
        "expect_symbol": "GLTFLoader",
    },
    {
        "filename": "SkeletonUtils.js",
        "urls": [
            "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js",
            "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/utils/SkeletonUtils.js",
        ],
        "expect_symbol": "SkeletonUtils",
    },
    {
        "filename": "RoomEnvironment.js",
        "urls": [
            "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js",
            "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/js/environments/RoomEnvironment.js",
            "https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/environments/RoomEnvironment.js",
            "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/jsm/environments/RoomEnvironment.js",
        ],
        "expect_symbol": "RoomEnvironment",
    },
]

# Static curated fallback/primary URLs per role (verified Three.js r128 & Khronos glTF-Sample-Models)
STATIC_CANDIDATES: Dict[str, List[str]] = {
    "wizard": [
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
        "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Soldier.glb",
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Xbot.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/CesiumMan/glTF-Binary/CesiumMan.glb",
    ],
    "fairy_worker": [
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Parrot.glb",
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Flamingo.glb",
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Stork.glb",
    ],
    "customer": [
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Soldier.glb",
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Xbot.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/CesiumMan/glTF-Binary/CesiumMan.glb",
    ],
    "slime_normal": [
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Fox/glTF-Binary/Fox.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb",
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Stork.glb",
    ],
    "slime_king": [
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Horse.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Fox/glTF-Binary/Fox.glb",
    ],
    "cauldron": [
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/PrimaryIonDrive.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Lantern/glTF-Binary/Lantern.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoomBox/glTF-Binary/BoomBox.glb",
    ],
    "sales_stall": [
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/SheenChair/glTF-Binary/SheenChair.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/AntiqueCamera/glTF-Binary/AntiqueCamera.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoxTextured/glTF-Binary/BoxTextured.glb",
    ],
    "gem_pedestal": [
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Lantern/glTF-Binary/Lantern.glb",
    ],
    "harvester_cart": [
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/ToyCar/glTF-Binary/ToyCar.glb",
    ],
    "tree": [
        "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/models/gltf/Flamingo.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Lantern/glTF-Binary/Lantern.glb",
    ],
    "rock_crystal": [
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoomBox/glTF-Binary/BoomBox.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoxTextured/glTF-Binary/BoxTextured.glb",
    ],
    "berry_bush": [
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BarramundiFish/glTF-Binary/BarramundiFish.glb",
    ],
    "fence": [
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoxTextured/glTF-Binary/BoxTextured.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb",
    ],
    "stack_block": [
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/WaterBottle/glTF-Binary/WaterBottle.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoxTextured/glTF-Binary/BoxTextured.glb",
    ],
    "mana_gem": [
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb",
        "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb",
    ],
}

ROLE_KEYWORDS: Dict[str, List[str]] = {
    "wizard": ["mage", "wizard", "witch", "sorcer", "robotexpressive"],
    "fairy_worker": ["fairy", "pixie", "parrot", "butterfly", "hummingbird", "bee"],
    "customer": ["villager", "peasant", "knight", "ranger", "soldier", "adventurer", "xbot"],
    "slime_normal": ["slime", "goblin", "crab", "frog", "blob", "fox"],
    "slime_king": ["king", "golem", "dragon", "demon", "yeti", "giant", "cyclops", "boss", "horse"],
    "cauldron": ["cauldron", "pot", "kettle", "alchemy", "anvil", "fountain", "primaryiondrive"],
    "sales_stall": ["market", "stall", "booth", "counter", "shop"],
    "gem_pedestal": ["chest_open", "pedestal", "altar", "shrine", "chest", "plinth"],
    "harvester_cart": ["cart", "wagon", "wheelbarrow", "barrow", "carriage"],
    "tree": ["tree", "oak", "pine", "willow", "birch", "sakura"],
    "rock_crystal": ["crystal", "rock", "ore", "mineral"],
    "berry_bush": ["bush", "berry", "mushroom", "shrub", "avocado", "plant"],
    "fence": ["fence", "palisade", "railing", "hedge"],
    "stack_block": ["potion", "crate", "barrel", "bottle", "vial", "flask"],
    "mana_gem": ["gem", "diamond", "ruby", "coin", "boxanimated"],
}

EXCLUDE_PATH_SUBSTRINGS = (
    "-transformed.glb",
    "space_pack",
    "sci_fi",
    "street_pack",
    "streets_all",
    "torch",
    "spaceship",
    "mech_",
    "astronaut",
    "fish",
    "gun",
    "rifle",
)


def make_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    return ctx


def http_get_bytes(url: str, timeout: int = 20, headers: Optional[Dict[str, str]] = None) -> bytes:
    req_headers = {
        "User-Agent": "FairyAlchemyAssetFetcher/2.0 (Python urllib)",
        "Accept": "*/*",
    }
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    with urllib.request.urlopen(req, timeout=timeout, context=make_ssl_context()) as resp:
        status = getattr(resp, "status", 200)
        if status != 200:
            raise RuntimeError(f"HTTP {status} for {url}")
        return resp.read()


def http_get_json(url: str, timeout: int = 12) -> Any:
    raw = http_get_bytes(url, timeout=timeout, headers={"Accept": "application/vnd.github+json"})
    return json.loads(raw.decode("utf-8"))


def parse_and_validate_glb(data: bytes) -> Dict[str, Any]:
    """
    Strictly validates a binary glTF 2.0 (.glb) buffer and extracts JSON chunk metadata.
    Rejects HTML error pages, corrupt headers, truncated chunks, zero-mesh payloads,
    or GLBs requiring Draco / Meshopt decoders unavailable in base Three.js r128.
    """
    if not isinstance(data, (bytes, bytearray)) or len(data) < 28:
        raise ValueError("Payload too small to be a valid .glb binary")

    head_preview = data[:64].lstrip()
    if head_preview.startswith(b"<") or b"<html" in head_preview.lower() or b"<!doctype" in head_preview.lower():
        raise ValueError("Received HTML document instead of binary .glb")

    magic, version, total_len = struct.unpack("<III", data[:12])
    if magic != GLTF_MAGIC:
        raise ValueError(f"Invalid GLB magic: 0x{magic:08x} (expected 0x{GLTF_MAGIC:08x})")
    if version != 2:
        raise ValueError(f"Unsupported glTF version: {version}")
    if total_len > len(data) or total_len < 28:
        raise ValueError(f"Corrupt or truncated GLB length: header={total_len}, actual={len(data)}")

    chunk_len, chunk_type = struct.unpack("<II", data[12:20])
    if chunk_type != CHUNK_JSON:
        raise ValueError(f"Chunk 0 is not JSON (0x{chunk_type:08x})")
    if 20 + chunk_len > len(data):
        raise ValueError(f"JSON chunk overflows buffer ({20 + chunk_len} > {len(data)})")

    json_bytes = data[20 : 20 + chunk_len]
    gltf = json.loads(json_bytes.decode("utf-8"))
    if not isinstance(gltf, dict):
        raise ValueError("Parsed glTF JSON root is not an object")

    req_exts = set(gltf.get("extensionsRequired") or [])
    blocked = req_exts.intersection(UNSUPPORTED_REQUIRED_EXTS)
    if blocked:
        raise ValueError(f"Requires unsupported r128 extension(s): {sorted(blocked)}")

    raw_meshes = gltf.get("meshes") or []
    if not raw_meshes:
        raise ValueError("glTF JSON contains zero meshes")

    # Ensure self-contained binary (no external relative .bin or .png/.jpg URI dependencies)
    for buf in gltf.get("buffers") or []:
        uri = buf.get("uri")
        if uri and not str(uri).startswith("data:"):
            raise ValueError(f"GLB references external buffer URI: {uri}")
    for img in gltf.get("images") or []:
        uri = img.get("uri")
        if uri and not str(uri).startswith("data:"):
            raise ValueError(f"GLB references external image URI: {uri}")

    meshes = [m.get("name") or f"mesh_{i}" for i, m in enumerate(raw_meshes)]
    nodes = [n.get("name") or f"node_{i}" for i, n in enumerate(gltf.get("nodes") or [])]
    materials = [m.get("name") or f"mat_{i}" for i, m in enumerate(gltf.get("materials") or [])]
    animations = [a.get("name") or f"anim_{i}" for i, a in enumerate(gltf.get("animations") or [])]

    return {
        "version": version,
        "totalLength": total_len,
        "meshes": meshes,
        "nodes": nodes,
        "materials": materials,
        "animations": animations,
        "extensionsUsed": gltf.get("extensionsUsed") or [],
        "extensionsRequired": list(req_exts),
    }


def convert_esm_room_env_if_needed(js_text: str) -> str:
    """
    If RoomEnvironment.js was fetched from examples/jsm/ (ES module), convert it cleanly
    to an IIFE attaching THREE.RoomEnvironment so classic <script> loading works.
    """
    if "THREE.RoomEnvironment" in js_text and "export" not in js_text:
        return js_text

    body = re.sub(r"^\s*import\s+\{[^}]+\}\s+from\s+['\"][^'\"]+['\"];?\s*$", "", js_text, flags=re.MULTILINE)
    body = re.sub(r"\bexport\s+class\s+RoomEnvironment\b", "class RoomEnvironment", body)
    body = re.sub(r"\bexport\s*\{[^}]+\}\s*;?", "", body)

    wrapped = (
        "(function () {\n"
        "  'use strict';\n"
        "  if (typeof THREE === 'undefined') return;\n"
        "  var BackSide = THREE.BackSide,\n"
        "      BoxGeometry = THREE.BoxGeometry,\n"
        "      Mesh = THREE.Mesh,\n"
        "      MeshBasicMaterial = THREE.MeshBasicMaterial,\n"
        "      MeshStandardMaterial = THREE.MeshStandardMaterial,\n"
        "      PointLight = THREE.PointLight,\n"
        "      Scene = THREE.Scene;\n\n"
        + body
        + "\n  THREE.RoomEnvironment = RoomEnvironment;\n})();\n"
    )
    return wrapped


def download_vendor_modules() -> Dict[str, str]:
    VENDOR_DIR.mkdir(parents=True, exist_ok=True)
    saved: Dict[str, str] = {}
    for mod in VENDOR_MODULES:
        fname = mod["filename"]
        dest = VENDOR_DIR / fname
        last_err: Optional[Exception] = None
        for url in mod["urls"]:
            try:
                raw = http_get_bytes(url, timeout=20)
                text = raw.decode("utf-8")
                if len(text) < 200 or text.lstrip().startswith("<"):
                    raise ValueError("Invalid JS module payload")
                if fname == "RoomEnvironment.js":
                    text = convert_esm_room_env_if_needed(text)
                if mod["expect_symbol"] not in text:
                    raise ValueError(f"Expected symbol {mod['expect_symbol']} missing")
                dest.write_text(text, encoding="utf-8")
                saved[fname] = url
                print(f"[vendor] Saved {fname} ({len(text)} chars) from {url}")
                break
            except Exception as exc:
                last_err = exc
        if fname not in saved:
            raise RuntimeError(f"Failed to download vendor module {fname}: {last_err}")
    return saved


def discover_github_cc0_candidates() -> Dict[str, List[str]]:
    """
    Queries GitHub REST API for public CC0 .glb packs (KayKit / Kenney / Quaternius / Three.js
    / KhronosGroup) and maps discovered .glb paths into game role candidate queues.
    Failures degrade cleanly to STATIC_CANDIDATES.
    """
    discovered: Dict[str, List[str]] = {role: [] for role in TARGET_HEIGHTS}

    repos_to_scan: List[Tuple[str, str]] = [
        ("mrdoob/three.js", "r128"),
        ("KhronosGroup/glTF-Sample-Models", "main"),
    ]

    # Search GitHub public repositories for CC0 KayKit / Quaternius / Kenney GLB mirrors
    search_queries = [
        "kaykit glb in:name,description,topics",
        "quaternius glb in:name,description,topics",
        "kenney nature glb in:name,description,topics",
    ]
    seen_repos = {r[0] for r in repos_to_scan}
    for q in search_queries:
        try:
            url = (
                "https://api.github.com/search/repositories?q="
                + urllib.parse.quote(q)
                + "&sort=stars&order=desc&per_page=3"
            )
            res = http_get_json(url, timeout=10)
            for item in res.get("items") or []:
                full_name = item.get("full_name")
                branch = item.get("default_branch") or "main"
                if full_name and full_name not in seen_repos:
                    seen_repos.add(full_name)
                    repos_to_scan.append((full_name, branch))
        except Exception as exc:
            print(f"[discover] GitHub search skipped ({q}): {exc}")

    for full_name, branch in repos_to_scan:
        try:
            tree_url = f"https://api.github.com/repos/{full_name}/git/trees/{branch}?recursive=1"
            tree_data = http_get_json(tree_url, timeout=12)
            entries = tree_data.get("tree") or []
            glb_paths = [
                e["path"]
                for e in entries
                if isinstance(e, dict)
                and e.get("type") == "blob"
                and str(e.get("path", "")).lower().endswith(".glb")
                and (e.get("size") or 0) <= 6_000_000
            ]
            if not glb_paths:
                continue
            print(f"[discover] {full_name}@{branch}: found {len(glb_paths)} .glb files")
            is_sample_repo = full_name in ("mrdoob/three.js", "KhronosGroup/glTF-Sample-Models")
            for p in glb_paths:
                low_path = p.lower()
                if any(bad in low_path for bad in EXCLUDE_PATH_SUBSTRINGS):
                    continue
                stem = Path(p).stem.lower()
                cdn_url = f"https://cdn.jsdelivr.net/gh/{full_name}@{branch}/{urllib.parse.quote(p)}"
                raw_url = f"https://raw.githubusercontent.com/{full_name}/{branch}/{urllib.parse.quote(p)}"
                # Use jsDelivr CDN for multi-asset repos to avoid GitHub raw 429 throttling
                chosen = cdn_url if not is_sample_repo else raw_url
                for role, kw_list in ROLE_KEYWORDS.items():
                    if any(re.search(r"(?:^|[_-])" + re.escape(kw) + r"(?:\d|$|[_-])", stem) for kw in kw_list):
                        if not is_sample_repo:
                            discovered[role].insert(0, chosen)
                        else:
                            discovered[role].append(chosen)
        except Exception as exc:
            print(f"[discover] Tree lookup skipped ({full_name}): {exc}")

    return discovered


def download_all_models() -> Dict[str, Any]:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    discovered = discover_github_cc0_candidates()
    manifest_models: Dict[str, Any] = {}
    used_urls: set = set()

    for role, target_height in TARGET_HEIGHTS.items():
        candidates: List[str] = []
        # Take at most 6 discovered CC0 candidates so curated STATIC_CANDIDATES always remain reachable
        for url in discovered.get(role, [])[:6]:
            if url not in candidates:
                candidates.append(url)
        for url in STATIC_CANDIDATES.get(role, []):
            if url not in candidates:
                candidates.append(url)

        dest_path = MODELS_DIR / f"{role}.glb"
        chosen_meta: Optional[Dict[str, Any]] = None
        chosen_url: str = ""
        chosen_bytes: Optional[bytes] = None

        requires_anim = role in ("wizard", "fairy_worker", "customer")
        fallback_non_anim: Optional[Tuple[str, bytes, Dict[str, Any]]] = None
        fallback_reused: Optional[Tuple[str, bytes, Dict[str, Any]]] = None

        for url in candidates:
            try:
                raw = http_get_bytes(url, timeout=25)
                if len(raw) < 256:
                    raise ValueError(f"File too small ({len(raw)} bytes)")
                info = parse_and_validate_glb(raw)
                if url in used_urls:
                    if fallback_reused is None:
                        fallback_reused = (url, raw, info)
                    continue
                if requires_anim and not info["animations"]:
                    if fallback_non_anim is None:
                        fallback_non_anim = (url, raw, info)
                    continue
                chosen_url = url
                chosen_bytes = raw
                chosen_meta = info
                break
            except Exception as exc:
                print(f"[glb] Candidate rejected for {role} ({url}): {exc}")

        if chosen_bytes is None and fallback_non_anim is not None:
            chosen_url, chosen_bytes, chosen_meta = fallback_non_anim
        elif chosen_bytes is None and fallback_reused is not None:
            chosen_url, chosen_bytes, chosen_meta = fallback_reused

        if chosen_bytes is None or chosen_meta is None:
            raise RuntimeError(f"Could not download a valid .glb asset for role '{role}'")

        used_urls.add(chosen_url)

        dest_path.write_bytes(chosen_bytes)
        rel_path = f"assets/models/{role}.glb"
        manifest_models[role] = {
            "role": role,
            "file": rel_path,
            "sourceUrl": chosen_url,
            "byteSize": len(chosen_bytes),
            "targetHeight": target_height,
            "meshes": chosen_meta["meshes"],
            "nodes": chosen_meta["nodes"],
            "materials": chosen_meta["materials"],
            "animations": chosen_meta["animations"],
            "extensionsUsed": chosen_meta["extensionsUsed"],
        }
        print(
            f"[glb] Verified {role} -> {rel_path} ({len(chosen_bytes)} bytes, "
            f"meshes={len(chosen_meta['meshes'])}, anims={chosen_meta['animations']})"
        )

    manifest = {
        "version": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "models": manifest_models,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest


def run_self_test() -> None:
    """Offline unit test verifying strict GLB Chunk-0 parsing, rejection rules, and ESM wrap."""
    sample_gltf = {
        "asset": {"version": "2.0"},
        "meshes": [{"name": "WizardMesh"}],
        "nodes": [{"name": "RootNode"}, {"name": "Wand"}],
        "materials": [{"name": "RobeMat"}],
        "animations": [{"name": "Idle"}, {"name": "Walking"}, {"name": "Punch"}],
    }
    json_raw = json.dumps(sample_gltf).encode("utf-8")
    pad = (4 - (len(json_raw) % 4)) % 4
    json_padded = json_raw + b" " * pad
    bin_padded = b"\x00\x00\x00\x00"
    total_len = 12 + 8 + len(json_padded) + 8 + len(bin_padded)
    glb = (
        struct.pack("<III", GLTF_MAGIC, 2, total_len)
        + struct.pack("<II", len(json_padded), CHUNK_JSON)
        + json_padded
        + struct.pack("<II", len(bin_padded), CHUNK_BIN)
        + bin_padded
    )

    parsed = parse_and_validate_glb(glb)
    assert parsed["meshes"] == ["WizardMesh"]
    assert parsed["animations"] == ["Idle", "Walking", "Punch"]

    # Reject HTML error page
    try:
        parse_and_validate_glb(b"<!DOCTYPE html><html>404</html>" + b" " * 64)
        raise AssertionError("HTML payload should have failed")
    except ValueError:
        pass

    # Reject Draco-required GLB
    draco_gltf = dict(sample_gltf, extensionsRequired=["KHR_draco_mesh_compression"])
    d_raw = json.dumps(draco_gltf).encode("utf-8")
    d_pad = d_raw + b" " * ((4 - len(d_raw) % 4) % 4)
    d_glb = (
        struct.pack("<III", GLTF_MAGIC, 2, 12 + 8 + len(d_pad))
        + struct.pack("<II", len(d_pad), CHUNK_JSON)
        + d_pad
    )
    try:
        parse_and_validate_glb(d_glb)
        raise AssertionError("Draco GLB should have been rejected")
    except ValueError:
        pass

    wrapped = convert_esm_room_env_if_needed("import { Scene } from 'three';\nexport class RoomEnvironment extends Scene {}\n")
    assert "THREE.RoomEnvironment = RoomEnvironment" in wrapped

    print(
        json.dumps(
            {
                "selfTestPassed": True,
                "rolesCount": len(TARGET_HEIGHTS),
                "parsedMeshes": parsed["meshes"],
                "parsedAnimations": parsed["animations"],
            }
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Download & verify CC0/open-source .glb assets")
    parser.add_argument("--self-test", action="store_true", help="Run offline GLB binary validator tests")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return 0

    vendor_map = download_vendor_modules()
    manifest = download_all_models()
    print(
        json.dumps(
            {
                "ok": True,
                "vendorModules": list(vendor_map.keys()),
                "modelsDownloaded": len(manifest["models"]),
                "manifestPath": str(MANIFEST_PATH),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
