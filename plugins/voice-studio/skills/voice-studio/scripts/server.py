"""Standalone HTTP service for the voice-studio workbench."""

import argparse
import array
import concurrent.futures
import copy
import hashlib
import json
import mimetypes
import os
import datetime
import re
import subprocess
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import tts

ROOT = tts.ROOT
BUILD = tts.SKILL_ROOT / "assets/web"
LIBRARY = ROOT / "library"
CACHE = ROOT / "cache"
PRESET = ROOT / "preset.json"
APP_ID = "voice-studio"
RECOMMENDED = [
    "bailian:xunanchuan_v3.1", "minimax:Chinese (Mandarin)_Gentleman",
    "bailian:longanlingxin_v3.1", "minimax:Chinese (Mandarin)_Sincere_Adult",
    "bailian:longanfengyue_v3.1", "minimax:Chinese (Mandarin)_Gentle_Senior",
    "bailian:longanhuan_v3.1", "minimax:Chinese (Mandarin)_Wise_Women",
]


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:24]


def context(text, speed=0.96, direction=None):
    text = text.strip().replace("KV Cache", "K V Cache")
    if not text:
        raise ValueError("请填写测试文稿")
    speed = round(float(speed), 2)
    if not 0.5 <= speed <= 2:
        raise ValueError("语速需在 0.5–2.0 之间")
    value = {"text": text, "speed": speed, "direction": direction or tts.DIRECTION}
    return digest(value), value


def preset():
    return json.loads(PRESET.read_text()) if PRESET.exists() else None


def save_preset(library, body):
    if body.get("voice_id") is None:
        PRESET.unlink(missing_ok=True)
        return None
    voice = library.by_id[body["voice_id"]]
    speed = body.get("speed", 0.96)
    context(tts.TEXT, speed)
    style = body.get("style", "teacher")
    if style not in ["teacher", "natural"]:
        raise ValueError("讲述方式需为 teacher 或 natural")
    value = {"voice_id": voice["id"], "name": voice["name"], "provider": voice["provider"],
             "model": voice["model"], "speed": float(speed), "style": style,
             "saved_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    temporary = PRESET.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(PRESET)
    return value


def catalog():
    voices = json.loads((tts.SKILL_ROOT / "assets/voices.json").read_text())["voices"]
    custom = ROOT / "custom-voices.json"
    if custom.exists():
        voices.extend(json.loads(custom.read_text()))
    for voice in voices:
        voice["recommended"] = voice.get("custom", False) or voice["id"] in RECOMMENDED
        voice["rank"] = 0.5 if voice.get("custom") else RECOMMENDED.index(voice["id"]) if voice["id"] in RECOMMENDED else 100
    return sorted(voices, key=lambda v: (v["rank"], v["provider"], v["name"]))


def waveform(path):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ar", "8000", "-ac", "1", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    samples = array.array("h", pcm)
    stride = max(1, len(samples) // 120)
    peaks = [max((abs(s) for s in samples[i * stride:(i + 1) * stride]), default=0) for i in range(120)]
    peak = max(peaks) or 1
    return [round(max(0.07, p / peak), 3) for p in peaks]


class VoiceLibrary:
    def __init__(self):
        self.voices = catalog()
        self.by_id = {v["id"]: v for v in self.voices}
        self.jobs = {}
        self.lock = threading.RLock()
        self.pool = concurrent.futures.ThreadPoolExecutor(max_workers=2)
        for folder in [LIBRARY / "audio", LIBRARY / "takes", CACHE]:
            folder.mkdir(parents=True, exist_ok=True)
        for file in (LIBRARY / "takes").glob("*.json"):
            value = json.loads(file.read_text())
            if (LIBRARY / "audio" / (value["id"] + ".mp3")).is_file():
                self.jobs[value["id"]] = value

    def save(self, record):
        with self.lock:
            self.jobs[record["id"]] = record
            if record["status"] == "ready":
                target = LIBRARY / "takes" / (record["id"] + ".json")
                target.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")

    def state(self, cid):
        with self.lock:
            return {"context_id": cid, "takes": {job["voice_id"]: dict(job) for job in self.jobs.values() if job["context_id"] == cid}}

    def enqueue(self, ids, text, speed, direction=None):
        cid, params = context(text, speed, direction)
        for voice_id in ids:
            if voice_id not in self.by_id:
                raise ValueError("音色不存在")
        with self.lock:
            for voice_id in ids:
                tid = digest({"context": cid, "voice": voice_id})
                if self.jobs.get(tid, {}).get("status") in ["queued", "generating", "ready"]:
                    continue
                self.jobs[tid] = {"id": tid, "context_id": cid, "voice_id": voice_id, "status": "queued"}
                self.pool.submit(self.generate, tid, self.by_id[voice_id], cid, params)
        return self.state(cid)

    def generate(self, tid, voice, cid, params):
        record = {"id": tid, "context_id": cid, "voice_id": voice["id"], "status": "generating"}
        self.save(record)
        try:
            provider = voice["provider"]
            config = copy.deepcopy(tts.CONFIG[provider])
            config["request"]["model"] = voice["model"]
            if provider == "bailian":
                config["request"]["input"].update(text=params["text"], voice=voice["voice_id"],
                    rate=params["speed"], instruction=params["direction"])
            else:
                config["request"]["text"] = params["text"]
                config["request"]["voice_setting"].update(voice_id=voice["voice_id"], speed=params["speed"])
            raw = CACHE / (tid + ".wav")
            response = CACHE / (tid + ".response.json")
            recover = False
            if response.exists():
                prior = json.loads(response.read_text())
                recover = bool(prior.get("output", {}).get("audio", {}).get("url") or prior.get("data", {}).get("audio"))
            request_id = tts.request_audio(provider, config, raw, response, recover)
            target = LIBRARY / "audio" / (tid + ".mp3")
            tts.normalize(raw, target)
            duration = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(target)], capture_output=True, text=True, check=True).stdout)
            record.update(status="ready", duration=duration, waveform=waveform(target),
                          audio_url="/audio/" + tid + ".mp3", model=voice["model"])
            (CACHE / (tid + ".request.json")).write_text(json.dumps({"request": config["request"], "request_id": request_id}, ensure_ascii=False, indent=2))
            print("READY", voice["name"], round(duration, 2), flush=True)
        except Exception as error:
            record.update(status="error", error=tts.sanitized(error))
            print("FAILED", voice["name"], record["error"], flush=True)
        self.save(record)


class Handler(BaseHTTPRequestHandler):
    library = None

    def log_message(self, format, *args):
        pass

    def json(self, value, status=200):
        data = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self.json({"error": "需要 JSON 请求"}, 415)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            if self.path == "/api/preset":
                return self.json({"preset": save_preset(self.library, body)})
            if self.path == "/api/resolve":
                cid, _ = context(body["text"], body.get("speed", 0.96), body.get("direction"))
                return self.json(self.library.state(cid))
            if self.path == "/api/generate":
                return self.json(self.library.enqueue(body["voice_ids"], body["text"], body.get("speed", 0.96), body.get("direction")))
            return self.json({"error": "未找到接口"}, 404)
        except (ValueError, KeyError, TypeError) as error:
            return self.json({"error": tts.sanitized(error)}, 400)

    def do_GET(self):
        url = urllib.parse.urlsplit(self.path)
        if url.path == "/api/health":
            return self.json({"app_id": APP_ID, "version": 1, "pid": os.getpid(), "data_dir": str(ROOT)})
        if url.path == "/api/preset":
            return self.json({"preset": preset()})
        if url.path == "/api/catalog":
            return self.json({"app_id": APP_ID, "voices": self.library.voices, "default_text": tts.TEXT,
                              "default_speed": 0.96, "preset": preset()})
        if url.path == "/api/jobs":
            cid = urllib.parse.parse_qs(url.query).get("context", [""])[0]
            return self.json(self.library.state(cid))
        if url.path.startswith("/audio/"):
            name = url.path.removeprefix("/audio/")
            if not re.fullmatch(r"[a-f0-9]{24}\.mp3", name):
                return self.send_error(404)
            file = LIBRARY / "audio" / name
        else:
            relative = urllib.parse.unquote(url.path).lstrip("/") or "index.html"
            file = (BUILD / relative).resolve()
            if not file.is_relative_to(BUILD.resolve()):
                return self.send_error(404)
        if not file.is_file():
            return self.send_error(404)
        size = file.stat().st_size
        start, end = 0, size - 1
        range_header = self.headers.get("Range", "")
        match = re.fullmatch(r"bytes=(\d+)-(\d*)", range_header)
        if match:
            start, requested_end = match.groups()
            start = int(start)
            end = min(int(requested_end), end) if requested_end else end
            if start > end:
                return self.send_error(416)
        self.send_response(206 if match else 200)
        self.send_header("Content-Type", mimetypes.guess_type(file.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        if match:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        try:
            with file.open("rb") as stream:
                stream.seek(start)
                remaining = end - start + 1
                while remaining:
                    chunk = stream.read(min(65536, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8767)
    parser.add_argument("--prepare", action="store_true")
    args = parser.parse_args()
    Handler.library = VoiceLibrary()
    if args.prepare:
        Handler.library.enqueue(RECOMMENDED, tts.TEXT, 0.96)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"VOICE_LAB http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
