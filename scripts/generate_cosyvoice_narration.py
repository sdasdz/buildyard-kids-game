"""Generate offline story and concise hint narration with local CosyVoice 3."""

from __future__ import annotations

import ast
import re
from pathlib import Path

ROOT = Path(r"E:\儿子游戏")
COSY_ROOT = Path(r"E:\AI\CosyVoice")
MODEL = COSY_ROOT / "pretrained_models" / "Fun-CosyVoice3-0.5B"
PROMPT_WAV = COSY_ROOT / "asset" / "zero_shot_prompt.wav"
OUTPUT = ROOT / "public" / "audio"

HINT_LINES = {
    "dig": "小提示：装上挖斗，再准备轮子或履带。",
    "lift": "小提示：选择能升高的吊臂或升降台。",
    "carry": "小提示：准备能装货的车身，再装好移动部件。",
    "drill": "小提示：装上钻头，让钻尖朝向车辆前方。",
    "smash": "小提示：装上工程大摆锤，再选择宽而稳定的底盘。",
    "roll": "小提示：让压路滚筒靠近地面。",
    "push": "小提示：把宽推铲安装在车辆前端。",
    "tow": "小提示：把拖钩或绞盘安装在车身后部。",
    "farm": "小提示：让农田工具贴近地面，再沿田垄前进。",
    "clear": "小提示：抓斗、推铲或清障臂都能清理道路。",
    "water": "小提示：水箱和喷水设备要一起带上。",
    "clean": "小提示：把旋转清扫刷安装在接近地面的位置。",
    "snow": "小提示：雪铲要在车头前面，履带走雪地更稳。",
    "rough": "小提示：选择履带或越野轮，崎岖路面会更稳定。",
    "bridge": "小提示：把折叠桥放在稳定的承载平台上。",
    "light": "小提示：把探照灯装高一点，并朝向车辆前方。",
    "fire": "小提示：带上水箱和消防水炮，并在安全位置喷水。",
    "mix": "小提示：搅拌筒需要结实的车身来承载。",
    "rescue": "小提示：带上救援平台、绞盘或救生设备。",
    "fork": "小提示：让货叉朝前，并使用紧凑稳定的底盘。",
}


def read_stories() -> list[tuple[str, str]]:
    source = (ROOT / "app" / "page.tsx").read_text(encoding="utf-8")
    stories: list[tuple[str, str]] = []
    blocks = re.findall(r"const (?:EVENT_SEEDS|EXTRA_EVENT_SEEDS) = \[(.*?)\r?\n\] as const;", source, re.S)
    if len(blocks) != 2:
        raise RuntimeError("Both story seed blocks were not found")
    for block in blocks:
        for line in block.splitlines():
            value = line.strip().removesuffix(",")
            if not value.startswith("["):
                continue
            row = ast.literal_eval(value)
            stories.append((row[2], row[4]))
    if len(stories) < 100:
        raise RuntimeError(f"Expected 100 stories, found {len(stories)}")
    return stories


def main() -> None:
    import argparse
    import sys
    import torchaudio

    sys.path.insert(0, str(COSY_ROOT / "third_party" / "Matcha-TTS"))
    sys.path.insert(0, str(COSY_ROOT))
    from cosyvoice.cli.cosyvoice import AutoModel

    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--hints-only", action="store_true")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    voice = AutoModel(model_dir=str(MODEL))
    instruction = (
        "You are a helpful assistant. "
        "请用自然、温暖、活泼、声情并茂的中文儿童故事旁白语气，"
        "像亲切的幼儿园老师讲故事；语速稍慢，句子有轻柔起伏，绝不使用播报腔。"
        "<|endofprompt|>"
    )
    if args.hints_only:
        for index, (key, text) in enumerate(HINT_LINES.items(), start=1):
            target = OUTPUT / f"hint-{key}.wav"
            if target.exists() and target.stat().st_size > 4096:
                print(f"[{index:02}/{len(HINT_LINES)}] exists: {target.name}", flush=True)
                continue
            chunks = list(voice.inference_instruct2(text, instruction, str(PROMPT_WAV), stream=False))
            if not chunks:
                raise RuntimeError(f"No audio generated for {target.name}")
            torchaudio.save(str(target), chunks[0]["tts_speech"], voice.sample_rate)
            print(f"[{index:02}/{len(HINT_LINES)}] wrote: {target.name}", flush=True)
        return

    stories = read_stories()[: args.limit]
    for index, (character, story) in enumerate(stories, start=1):
        target = OUTPUT / f"mission-{index}.wav"
        if target.exists() and target.stat().st_size > 4096:
            print(f"[{index:02}/{len(stories)}] exists: {target.name}", flush=True)
            continue
        text = f"{character}来求助啦！{story}"
        chunks = list(
            voice.inference_instruct2(
                text,
                instruction,
                str(PROMPT_WAV),
                stream=False,
            )
        )
        if not chunks:
            raise RuntimeError(f"No audio generated for mission-{index}")
        waveform = chunks[0]["tts_speech"]
        torchaudio.save(str(target), waveform, voice.sample_rate)
        print(f"[{index:02}/{len(stories)}] wrote: {target.name}", flush=True)


if __name__ == "__main__":
    main()
