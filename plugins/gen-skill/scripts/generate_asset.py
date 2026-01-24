#!/usr/bin/env python3
"""
AI Asset Generator - 使用 Gemini Nano Banana Pro 生成 UI 素材
支持智能分类、风格预设、批量生成

API Key 读取优先级：
1. 命令行参数 --api-key
2. 项目 .env 文件中的 GEMINI_API_KEY
3. 项目 .asset-style.json 中的 apiKey 字段
4. 全局环境变量 GEMINI_API_KEY
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("ERROR: google-genai not installed. Run: pip install google-genai")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: pillow not installed. Run: pip install pillow")
    sys.exit(1)


# 默认风格模板
DEFAULT_STYLES = {
    "modern": {
        "name": "现代简约",
        "base_prompt": "clean modern design, minimal style, professional, solid colors, simple shapes, no gradients, white or light background"
    },
    "flat": {
        "name": "扁平设计",
        "base_prompt": "flat design, solid colors, no shadows, geometric shapes, bold colors, transparent background"
    },
    "glass": {
        "name": "玻璃拟态",
        "base_prompt": "glassmorphism, frosted glass effect, blur background, subtle shadows, transparency, modern UI"
    },
    "neon": {
        "name": "霓虹赛博",
        "base_prompt": "cyberpunk neon style, glowing edges, dark background, vibrant gradients, futuristic, holographic"
    },
    "handdrawn": {
        "name": "手绘风格",
        "base_prompt": "hand-drawn style, organic shapes, sketch-like, warm colors, friendly appearance, paper texture"
    }
}

# 类型配置
TYPE_CONFIG = {
    "icon": {
        "keywords": ["icon", "图标", "logo"],
        "default_size": (64, 64),
        "prompt_suffix": "minimal icon, clean vector style, simple shapes, centered",
        "subdir": "icons"
    },
    "background": {
        "keywords": ["bg", "background", "背景", "wallpaper"],
        "default_size": (1920, 1080),
        "prompt_suffix": "seamless pattern, high resolution, 4K quality",
        "subdir": "backgrounds"
    },
    "component": {
        "keywords": ["button", "card", "panel", "按钮", "卡片", "面板", "组件"],
        "default_size": (400, 200),
        "prompt_suffix": "UI element, clean design, web component",
        "subdir": "components"
    },
    "illustration": {
        "keywords": ["illustration", "插图", "装饰", "decoration"],
        "default_size": (800, 600),
        "prompt_suffix": "illustration style, decorative element",
        "subdir": "illustrations"
    }
}


def load_env_file(env_path: str) -> dict:
    """
    加载 .env 文件，返回键值对字典
    支持格式：
    - KEY=value
    - KEY="value"
    - KEY='value'
    - # 注释行
    """
    env_vars = {}
    path = Path(env_path)

    if not path.exists():
        return env_vars

    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()

                # 跳过空行和注释
                if not line or line.startswith('#'):
                    continue

                # 解析 KEY=value
                if '=' in line:
                    key, _, value = line.partition('=')
                    key = key.strip()
                    value = value.strip()

                    # 去除引号
                    if (value.startswith('"') and value.endswith('"')) or \
                       (value.startswith("'") and value.endswith("'")):
                        value = value[1:-1]

                    env_vars[key] = value
    except Exception as e:
        print(f"WARNING: Failed to load .env file: {e}")

    return env_vars


def get_api_key(args_api_key: Optional[str], style_config: Optional[dict], env_file: str = ".env") -> Optional[str]:
    """
    按优先级获取 API Key：
    1. 命令行参数 --api-key
    2. 项目 .env 文件中的 GEMINI_API_KEY
    3. 项目 .asset-style.json 中的 apiKey 字段
    4. 全局环境变量 GEMINI_API_KEY
    """
    # 1. 命令行参数
    if args_api_key:
        print("API Key source: command line argument")
        return args_api_key

    # 2. 项目 .env 文件
    env_vars = load_env_file(env_file)
    if 'GEMINI_API_KEY' in env_vars:
        print(f"API Key source: {env_file}")
        return env_vars['GEMINI_API_KEY']

    # 3. 项目配置文件 .asset-style.json
    if style_config and 'apiKey' in style_config:
        print("API Key source: .asset-style.json")
        return style_config['apiKey']

    # 4. 全局环境变量
    global_key = os.environ.get('GEMINI_API_KEY')
    if global_key:
        print("API Key source: global environment variable")
        return global_key

    return None


def load_config(config_path: str) -> Optional[dict]:
    """加载项目风格配置"""
    path = Path(config_path)
    if path.exists():
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None


def detect_type(prompt: str) -> str:
    """根据 prompt 检测素材类型"""
    prompt_lower = prompt.lower()
    for type_name, config in TYPE_CONFIG.items():
        for keyword in config["keywords"]:
            if keyword in prompt_lower:
                return type_name
    return "component"  # 默认类型


def build_full_prompt(user_prompt: str, asset_type: str, style_config: Optional[dict]) -> str:
    """构建完整的生成 prompt"""
    parts = []

    # 添加用户描述
    parts.append(user_prompt)

    # 添加类型特定的 prompt 后缀
    type_config = TYPE_CONFIG.get(asset_type, {})
    if "prompt_suffix" in type_config:
        parts.append(type_config["prompt_suffix"])

    # 添加项目风格
    if style_config and "style" in style_config:
        style = style_config["style"]
        if "base_prompt" in style:
            parts.append(style["base_prompt"])

        # 添加类型预设
        type_presets = style_config.get("typePresets", {})
        if asset_type in type_presets and "prompt_suffix" in type_presets[asset_type]:
            parts.append(type_presets[asset_type]["prompt_suffix"])

    # 添加通用质量提示
    parts.append("high quality, professional design, PNG format with transparency where appropriate")

    return ", ".join(parts)


def get_output_path(prompt: str, asset_type: str, style_config: Optional[dict], custom_output: Optional[str]) -> Path:
    """确定输出路径"""
    if custom_output:
        return Path(custom_output)

    # 确定基础目录
    base_dir = Path(".")
    if style_config and "outputDir" in style_config:
        base_dir = Path(style_config["outputDir"])
    else:
        base_dir = Path("assets")

    # 确定子目录
    subdir = TYPE_CONFIG.get(asset_type, {}).get("subdir", "misc")

    # 生成文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # 从 prompt 提取简短描述
    desc = re.sub(r'[^a-zA-Z0-9\u4e00-\u9fa5]', '_', prompt[:30]).strip('_')
    desc = re.sub(r'_+', '_', desc)

    filename = f"{asset_type}_{desc}_{timestamp}.png"

    output_path = base_dir / subdir / filename
    output_path.parent.mkdir(parents=True, exist_ok=True)

    return output_path


def get_size(asset_type: str, style_config: Optional[dict], custom_size: Optional[str]) -> tuple:
    """确定输出尺寸"""
    if custom_size:
        try:
            w, h = custom_size.lower().split('x')
            return (int(w), int(h))
        except ValueError:
            pass

    # 从项目配置获取
    if style_config:
        type_presets = style_config.get("typePresets", {})
        if asset_type in type_presets and "size" in type_presets[asset_type]:
            size_str = type_presets[asset_type]["size"]
            try:
                w, h = size_str.lower().split('x')
                return (int(w), int(h))
            except ValueError:
                pass

    # 使用默认尺寸
    return TYPE_CONFIG.get(asset_type, {}).get("default_size", (512, 512))


def generate_image(prompt: str, api_key: str, model: str = "gemini-2.5-flash-image") -> Optional[bytes]:
    """调用 Gemini API 生成图片"""
    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE']
            )
        )

        # 提取图片数据
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                return part.inline_data.data

        print(f"WARNING: No image generated. Response: {response.text if hasattr(response, 'text') else 'N/A'}")
        return None

    except Exception as e:
        print(f"ERROR: API call failed: {e}")
        return None


def resize_image(image_data: bytes, target_size: tuple) -> bytes:
    """调整图片尺寸"""
    from io import BytesIO

    img = Image.open(BytesIO(image_data))

    # 如果尺寸不匹配，调整大小
    if img.size != target_size:
        img = img.resize(target_size, Image.Resampling.LANCZOS)

    # 保存为 PNG
    output = BytesIO()
    img.save(output, format='PNG', optimize=True)
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description='AI Asset Generator using Gemini Nano Banana Pro')
    parser.add_argument('--prompt', '-p', required=True, help='Image description')
    parser.add_argument('--type', '-t', choices=['icon', 'background', 'component', 'illustration'],
                        help='Asset type (auto-detected if not specified)')
    parser.add_argument('--size', '-z', help='Output size (WxH, e.g., 64x64)')
    parser.add_argument('--output', '-o', help='Custom output path')
    parser.add_argument('--config', '-c', default='.asset-style.json', help='Style config file')
    parser.add_argument('--env', '-e', default='.env', help='Environment file path (default: .env)')
    parser.add_argument('--api-key', '-k', help='Gemini API Key (overrides all other sources)')
    parser.add_argument('--batch', '-b', type=int, default=1, help='Number of variants to generate')
    parser.add_argument('--model', '-m', default='gemini-2.5-flash-image',
                        choices=['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'],
                        help='Gemini model to use')
    parser.add_argument('--style', '-s', choices=list(DEFAULT_STYLES.keys()),
                        help='Use default style template')

    args = parser.parse_args()

    # 加载项目配置
    style_config = load_config(args.config)

    # 获取 API Key（按优先级）
    api_key = get_api_key(args.api_key, style_config, args.env)

    if not api_key:
        print("ERROR: GEMINI_API_KEY not found.")
        print("Please set it via one of the following methods:")
        print("  1. Command line: --api-key YOUR_KEY")
        print("  2. Project .env file: GEMINI_API_KEY=YOUR_KEY")
        print("  3. Project .asset-style.json: \"apiKey\": \"YOUR_KEY\"")
        print("  4. Global environment variable: export GEMINI_API_KEY=YOUR_KEY")
        sys.exit(1)

    # 如果指定了默认风格模板
    if args.style and not style_config:
        style_config = {
            "style": DEFAULT_STYLES[args.style]
        }

    # 检测素材类型
    asset_type = args.type or detect_type(args.prompt)
    print(f"Asset type: {asset_type}")

    # 构建完整 prompt
    full_prompt = build_full_prompt(args.prompt, asset_type, style_config)
    print(f"Full prompt: {full_prompt[:100]}...")

    # 确定尺寸
    target_size = get_size(asset_type, style_config, args.size)
    print(f"Target size: {target_size[0]}x{target_size[1]}")

    # 生成图片
    generated_files = []
    for i in range(args.batch):
        print(f"\nGenerating image {i+1}/{args.batch}...")

        image_data = generate_image(full_prompt, api_key, args.model)

        if image_data:
            # 调整尺寸
            image_data = resize_image(image_data, target_size)

            # 确定输出路径
            if args.batch > 1:
                base_output = args.output
                if base_output:
                    p = Path(base_output)
                    output_path = p.parent / f"{p.stem}_{i+1}{p.suffix}"
                else:
                    output_path = get_output_path(f"{args.prompt}_{i+1}", asset_type, style_config, None)
            else:
                output_path = get_output_path(args.prompt, asset_type, style_config, args.output)

            # 保存文件
            with open(output_path, 'wb') as f:
                f.write(image_data)

            print(f"GENERATED: {output_path}")
            generated_files.append(str(output_path))
        else:
            print(f"FAILED: Could not generate image {i+1}")

    # 输出摘要
    print(f"\n{'='*50}")
    print(f"Generated {len(generated_files)}/{args.batch} images:")
    for f in generated_files:
        print(f"  - {f}")

    return 0 if generated_files else 1


if __name__ == '__main__':
    sys.exit(main())
