"""Generate the game's 60 offline story narrations with local CosyVoice 3."""

from __future__ import annotations

import ast
import re
from pathlib import Path

ROOT = Path(r"E:\儿子游戏")
COSY_ROOT = Path(r"E:\AI\CosyVoice")
MODEL = COSY_ROOT / "pretrained_models" / "Fun-CosyVoice3-0.5B"
PROMPT_WAV = COSY_ROOT / "asset" / "zero_shot_prompt.wav"
OUTPUT = ROOT / "public" / "audio"


def read_stories() -> list[tuple[str, str]]:
    source = (ROOT / "app" / "page.tsx").read_text(encoding="utf-8")
    block = re.search(r"const EVENT_SEEDS = \[(.*?)\r?\n\] as const;", source, re.S)
    if not block:
        raise RuntimeError("EVENT_SEEDS was not found")
    stories: list[tuple[str, str]] = []
    for line in block.group(1).splitlines():
        value = line.strip().removesuffix(",")
        if not value.startswith("["):
            continue
        row = ast.literal_eval(value)
        stories.append((row[2], row[4]))
    if len(stories) < 60:
        raise RuntimeError(f"Expected 60 stories, found {len(stories)}")
    return stories


def main() -> None:
    import argparse
    import sys
    import torchaudio

    sys.path.insert(0, str(COSY_ROOT / "third_party" / "Matcha-TTS"))
    sys.path.insert(0, str(COSY_ROOT))
    from cosyvoice.cli.cosyvoice import AutoModel

    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=60)
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    voice = AutoModel(model_dir=str(MODEL))
    instruction = (
        "You are a helpful assistant. "
        "请用自然、温暖、活泼、声情并茂的中文儿童故事旁白语气，"
        "像亲切的幼儿园老师讲故事；语速稍慢，句子有轻柔起伏，绝不使用播报腔。"
        "<|endofprompt|>"
    )
    for index, (character, story) in enumerate(read_stories()[: args.limit], start=1):
        target = OUTPUT / f"mission-{index}.wav"
        if target.exists() and target.stat().st_size > 4096:
            print(f"[{index:02}/60] exists: {target.name}", flush=True)
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
        print(f"[{index:02}/60] wrote: {target.name}", flush=True)


if __name__ == "__main__":
    main()
