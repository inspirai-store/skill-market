"""Open the reusable voice workbench, select a voice, and export narration."""

import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import server
import tts

NATURAL = "用标准普通话自然叙述，放松、清晰、有交流感。根据内容自然停顿，保留完整语义，英文技术词清楚发音。只朗读正文。"


def emit(value):
    print(json.dumps(value, ensure_ascii=False, indent=2), flush=True)


def api(port, path, body=None, timeout=15):
    request = urllib.request.Request(f"http://127.0.0.1:{port}" + path,
        data=json.dumps(body, ensure_ascii=False).encode() if body is not None else None,
        headers={"Content-Type": "application/json"} if body is not None else {})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        data = json.loads(error.read())
        raise ValueError(data.get("error", str(error.code))) from None


def running(port):
    try:
        value = api(port, "/api/health", timeout=1)
        return value if value.get("app_id") == server.APP_ID and value.get("data_dir") == str(tts.ROOT) else None
    except (OSError, ValueError):
        return None


def ensure(port):
    health = running(port)
    if health:
        return health
    log = tts.ROOT / "server.log"
    with log.open("ab") as output:
        process = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "--port", str(port), "serve"],
            cwd=tts.SKILL_ROOT, stdin=subprocess.DEVNULL, stdout=output, stderr=subprocess.STDOUT,
            start_new_session=True)
    for _ in range(40):
        health = running(port)
        if health:
            return health
        if process.poll() is not None:
            raise RuntimeError(f"试听台未能启动；检查端口 {port} 和 {log}")
        time.sleep(0.25)
    raise TimeoutError("试听台启动超时；已有进程未被终止")


def resolve_voice(value, voices):
    found = [v for v in voices if value in [v["id"], v["voice_id"], v["name"]]]
    if len(found) != 1:
        raise ValueError("音色名称不唯一或不存在，请用 voices 查询完整 ID")
    return found[0]


def export(args):
    out = Path(args.out).expanduser().resolve()
    if out.suffix.lower() not in [".mp3", ".wav", ".m4a"]:
        raise ValueError("输出格式支持 mp3、wav 或 m4a")
    if out.exists() and not args.overwrite:
        raise ValueError("输出文件已存在；换一个文件名，或在确认覆盖后加 --overwrite")
    text = Path(args.text_file).expanduser().read_text().strip()
    if not text:
        raise ValueError("文稿为空")
    ensure(args.port)
    data = api(args.port, "/api/catalog")
    selected = data.get("preset") or {}
    if not args.voice and not selected.get("voice_id"):
        raise ValueError("尚未设置常用声线，请指定 --voice，或在试听台选择后设为常用")
    voice = resolve_voice(args.voice or selected.get("voice_id", ""), data["voices"])
    speed = args.speed if args.speed is not None else selected.get("speed", .96)
    style = args.style or selected.get("style", "teacher")
    direction = Path(args.direction_file).expanduser().read_text().strip() if args.direction_file else NATURAL if style == "natural" else tts.DIRECTION
    body = {"text": text, "speed": speed, "direction": direction}
    before = api(args.port, "/api/resolve", body)
    cached = before["takes"].get(voice["id"], {}).get("status") == "ready"
    state = api(args.port, "/api/generate", {**body, "voice_ids": [voice["id"]]})
    deadline = time.monotonic() + args.wait_seconds
    while True:
        take = state["takes"][voice["id"]]
        if take["status"] == "ready":
            break
        if take["status"] == "error":
            raise RuntimeError(take["error"])
        if time.monotonic() >= deadline:
            raise TimeoutError("生成仍在后台进行；重复相同命令可继续等待，已有任务会复用")
        time.sleep(1)
        state = api(args.port, "/api/jobs?context=" + state["context_id"])
    source = tts.ROOT / "library/audio" / (take["id"] + ".mp3")
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix.lower() == ".mp3":
        shutil.copyfile(source, out)
    else:
        codec = ["-c:a", "pcm_s16le"] if out.suffix.lower() == ".wav" else ["-c:a", "aac", "-b:a", "192k"]
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-threads", "2", "-i", str(source), *codec, str(out)], check=True)
    seconds = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)], text=True))
    manifest = out.with_suffix(out.suffix + ".json")
    record = {"voice_id": voice["id"], "voice_name": voice["name"], "provider": voice["provider"],
              "model": voice["model"], "speed": speed, "style": style, "direction": direction,
              "direction_applied": voice["provider"] == "bailian", "text": text,
              "spoken_text": text.replace("KV Cache", "K V Cache"), "take_id": take["id"],
              "duration_seconds": seconds, "cached": cached, "audio_path": str(out),
              "sha256": hashlib.sha256(out.read_bytes()).hexdigest(),
              "created_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    manifest.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    emit({k: record[k] for k in ["voice_name", "provider", "cached", "duration_seconds", "audio_path"]} | {"manifest_path": str(manifest)})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8767)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("status")
    sub.add_parser("serve")
    sub.add_parser("stop")
    opening = sub.add_parser("open")
    opening.add_argument("--voice")
    listing = sub.add_parser("voices")
    listing.add_argument("--query", default="")
    sub.add_parser("preset")
    sub.add_parser("clear-preset")
    sub.add_parser("configure-keys")
    select = sub.add_parser("select")
    select.add_argument("--voice", required=True)
    select.add_argument("--speed", type=float, default=.96)
    select.add_argument("--style", choices=["teacher", "natural"], default="teacher")
    generation = sub.add_parser("generate")
    generation.add_argument("--text-file", required=True)
    generation.add_argument("--out", required=True)
    generation.add_argument("--voice")
    generation.add_argument("--speed", type=float)
    generation.add_argument("--style", choices=["teacher", "natural"])
    generation.add_argument("--direction-file")
    generation.add_argument("--wait-seconds", type=int, default=600)
    generation.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    if args.command == "serve":
        sys.argv = [str(Path(server.__file__)), "--port", str(args.port)]
        return server.main()
    if args.command == "status":
        return emit({"app_id": server.APP_ID, "url": f"http://127.0.0.1:{args.port}/", "running": bool(running(args.port)),
            "voices": len(server.catalog()), "saved_takes": len(list((server.LIBRARY / "takes").glob("*.json"))),
            "configured_providers": {provider: bool(tts.KEYS.get(config["key"])) for provider, config in tts.CONFIG.items()},
            "ffmpeg": bool(shutil.which("ffmpeg")), "data_dir": str(tts.ROOT), "preset": server.preset()})
    if args.command == "voices":
        voices = server.catalog()
        return emit([v for v in voices if args.query.lower() in (v["name"] + " " + v["id"] + " " + v["description"]).lower()])
    if args.command == "preset":
        return emit({"preset": server.preset()})
    if args.command == "configure-keys":
        return subprocess.run(["swift", str(tts.SKILL_ROOT / "scripts/configure_keys.swift"), str(tts.ROOT / "credentials.env")], check=True).returncode
    if args.command == "stop":
        health = running(args.port)
        if health:
            os.kill(health["pid"], signal.SIGTERM)
        return emit({"stopped": bool(health)})
    if args.command == "open":
        ensure(args.port)
        url = f"http://127.0.0.1:{args.port}/"
        if args.voice:
            voice = resolve_voice(args.voice, server.catalog())
            url += "?" + urllib.parse.urlencode({"voice": voice["id"]})
        return emit({"url": url, "preset": server.preset()})
    if args.command in ["select", "clear-preset"]:
        ensure(args.port)
        body = {"voice_id": None} if args.command == "clear-preset" else {
            "voice_id": resolve_voice(args.voice, server.catalog())["id"], "speed": args.speed, "style": args.style}
        return emit(api(args.port, "/api/preset", body))
    return export(args)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": tts.sanitized(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
