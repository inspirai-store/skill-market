"""TTS providers used by the standalone voice-studio skill; credentials stay in user data."""

import http.client
import json
import pathlib
import os
import subprocess
import urllib.parse
import urllib.request

SKILL_ROOT = pathlib.Path(__file__).resolve().parents[1]
ROOT = pathlib.Path(os.environ.get("VOICE_STUDIO_DATA", str(pathlib.Path.home() / ".local/share/voice-studio"))).expanduser().resolve()
ROOT.mkdir(parents=True, exist_ok=True)
TEXT = (SKILL_ROOT / "assets/default-text.txt").read_text().strip()
DIRECTION = (
    "用标准普通话，像有经验的技术老师给懂软件开发的学生讲解。"
    "温和、耐心、有交流感，声音自然放松，语速从容而连贯。"
    "转折处自然承接，关键结论略微强调，概念之间留出理解的停顿。"
    "Q、K、V 按英文字母清楚读出，英文技术词自然发音。"
    "只朗读正文，保持日常讲课的语气。"
)
CONFIG = {
    "bailian": {
        "host": "dashscope.aliyuncs.com",
        "path": "/api/v1/services/audio/tts/SpeechSynthesizer",
        "key": "DASHSCOPE_API_KEY",
        "request": {
            "model": "qwen-audio-3.1-tts-plus",
            "input": {
                "text": TEXT,
                "voice": "xunanchuan_v3.1",
                "instruction": DIRECTION,
                "language_hints": ["zh"],
                "rate": 0.96,
                "format": "wav",
                "sample_rate": 48000,
            },
        },
    },
    "minimax": {
        "host": "api.minimax.cn",
        "path": "/v1/t2a_v2",
        "key": "MINIMAX_API_KEY",
        "request": {
            "model": "speech-2.8-hd",
            "text": TEXT,
            "stream": False,
            "language_boost": "Chinese",
            "voice_setting": {
                "voice_id": "Chinese (Mandarin)_Gentleman",
                "speed": 0.96,
                "vol": 1,
                "pitch": 0,
                "emotion": "fluent",
            },
            "audio_setting": {
                "format": "wav",
                "sample_rate": 32000,
                "channel": 1,
            },
            "output_format": "hex",
        },
    },
}


def credentials():
    values = {}
    path = ROOT / "credentials.env"
    if not path.exists():
        return values
    for line in path.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            name, value = line.split("=", 1)
            values[name] = json.loads(value)
    return values


KEYS = credentials()


def sanitized(message):
    text = str(message)
    for value in KEYS.values():
        if value:
            text = text.replace(value, "[REDACTED]")
    return text[:800]


def normalize(raw, final):
    base = ["ffmpeg", "-v", "info", "-i", str(raw)]
    measurement = subprocess.run(
        base + ["-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    m = json.loads(measurement[measurement.rfind("{") : measurement.rfind("}") + 1])
    filt = (
        "loudnorm=I=-16:TP=-1.5:LRA=11:linear=true"
        f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
        f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
        f":offset={m['target_offset']}"
    )
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", filt,
         "-ar", "48000", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "192k", str(final)],
        check=True,
    )
    return m


def request_audio(provider, config, raw, cached_response, recover=False):
    if recover:
        data = json.loads(cached_response.read_text())
    else:
        conn = http.client.HTTPSConnection(config["host"], timeout=180)
        conn.request(
            "POST", config["path"],
            body=json.dumps(config["request"], ensure_ascii=False).encode(),
            headers={"Authorization": "Bearer " + KEYS[config["key"]],
                     "Content-Type": "application/json; charset=utf-8"},
        )
        response = conn.getresponse()
        data = json.loads(response.read())
        conn.close()
        safe_response = json.dumps(data, ensure_ascii=False)
        for key in KEYS.values():
            if key:
                safe_response = safe_response.replace(key, "[REDACTED]")
        cached_response.write_text(safe_response)
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}: " + sanitized(data.get("message", data.get("error", data.get("code", "request rejected")))))
    if provider == "bailian":
        audio = data.get("output", {}).get("audio", {})
        url = audio.get("url")
        if url:
            parsed = urllib.parse.urlsplit(url)
            if parsed.scheme == "http" and (parsed.hostname or "").endswith(".aliyuncs.com"):
                url = urllib.parse.urlunsplit(parsed._replace(scheme="https"))
        if not url or urllib.parse.urlparse(url).scheme != "https":
            raise RuntimeError(sanitized({"top_level_fields": list(data),
                **{k: data.get(k) for k in ["code", "message", "error"]}}))
        # No authentication header is forwarded to the signed audio URL.
        with urllib.request.urlopen(url, timeout=90) as download:
            raw.write_bytes(download.read())
        request_id = data.get("request_id")
    else:
        result = data.get("base_resp", {})
        if result.get("status_code") != 0:
            raise RuntimeError(sanitized(result))
        raw.write_bytes(bytes.fromhex(data["data"]["audio"]))
        request_id = data.get("trace_id")
    return request_id
