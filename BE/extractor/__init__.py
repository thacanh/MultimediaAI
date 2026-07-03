"""
extractor/__init__.py
Convenience imports for all 12 feature extractors.

Note: speech_rate exposes two APIs:
  - extract_speech_rate()              legacy, single-segment (backward compat)
  - transcribe_full_audio()            transcribe once for whole video
  - extract_speech_rate_from_result()  map timestamp → score per segment
The main pipeline (analyzer.py) imports the new APIs directly.
"""
from .visual_dynamics import extract_visual_dynamics
from .motion_level import extract_motion_level
from .scene_variation import extract_scene_variation
from .cut_frequency import extract_cut_frequency
from .text_density import extract_text_density
from .readability import extract_readability
from .visual_focus import extract_visual_focus
from .clutter_level import extract_clutter_level
from .audio_energy import extract_audio_energy
from .pitch_variation import extract_pitch_variation
from .sync_alignment import extract_sync_alignment

__all__ = [
    "extract_visual_dynamics",
    "extract_motion_level",
    "extract_scene_variation",
    "extract_cut_frequency",
    "extract_text_density",
    "extract_readability",
    "extract_visual_focus",
    "extract_clutter_level",
    "extract_audio_energy",
    "extract_pitch_variation",
    "extract_sync_alignment",
]

