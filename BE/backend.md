# CreativeIQ AI — Full Feature Specification (12 Core Features)

# 1. `visual_dynamics`

## Category

Visual Rhythm & Dynamics

## Objective

Measure the intensity of visual change over time.

## Detects

* static visuals
* lack of pacing
* visually unengaging segments

## Input

Sequential video frames within a segment.

## Required Tools

* OpenCV
* numpy

## Output

Normalized score:

* 0 = extremely static
* 10 = highly dynamic

---

# 2. `motion_level`

## Category

Visual Motion

## Objective

Measure the amount of movement inside the frame.

## Detects

* low movement
* low visual energy
* inactive camera/object motion

## Input

Consecutive video frames.

## Required Tools

* OpenCV Optical Flow

## Output

Normalized score:

* 0 = no movement
* 10 = high movement activity

---

# 3. `scene_variation`

## Category

Scene Diversity

## Objective

Measure variation between scenes and visual compositions.

## Detects

* repetitive visuals
* monotonous sequences
* low scene diversity

## Input

Frame sequence and scene transitions.

## Required Tools

* OpenCV histogram analysis

## Output

Normalized score:

* 0 = repetitive visuals
* 10 = highly varied scenes

---

# 4. `cut_frequency`

## Category

Editing Rhythm

## Objective

Measure frequency of cuts and transitions.

## Detects

* slow pacing
* excessive cuts
* unstable editing rhythm

## Input

Scene transition timeline.

## Required Tools

* PySceneDetect

## Output

Normalized score:

* 0 = extremely slow transitions
* 10 = extremely rapid transitions

---

# 5. `text_density`

## Category

Information Density

## Objective

Measure the amount of on-screen text.

## Detects

* information overload
* excessive captions
* visually crowded text presentation

## Input

Extracted video frames.

## Required Tools

* EasyOCR

## Output

Normalized score:

* 0 = minimal text
* 10 = excessive text density

---

# 6. `readability`

## Category

Text Clarity

## Objective

Measure how easily on-screen text can be read.

## Detects

* low contrast text
* small text
* poor readability
* difficult visual accessibility

## Input

OCR text regions and frame visuals.

## Required Tools

* EasyOCR
* OpenCV

## Output

Normalized score:

* 0 = unreadable
* 10 = highly readable

---

# 7. `visual_focus`

## Category

Visual Attention

## Objective

Measure clarity of visual focal points.

## Detects

* unclear attention direction
* missing focal hierarchy
* scattered visual attention

## Input

Frame saliency information.

## Required Tools

* OpenCV Saliency

## Output

Normalized score:

* 0 = no clear focus
* 10 = strong focal clarity

---

# 8. `clutter_level`

## Category

Visual Complexity

## Objective

Measure visual clutter and noise.

## Detects

* overcrowded visuals
* excessive detail
* visual confusion

## Input

Frame structure and edge information.

## Required Tools

* OpenCV edge analysis

## Output

Normalized score:

* 0 = very clean visuals
* 10 = highly cluttered visuals

---

# 9. `audio_energy`

## Category

Audio Engagement

## Objective

Measure vocal and audio energy intensity.

## Detects

* weak voice delivery
* low vocal presence
* low engagement audio

## Input

Audio waveform.

## Required Tools

* librosa

## Output

Normalized score:

* 0 = very weak energy
* 10 = highly energetic audio

---

# 10. `pitch_variation`

## Category

Voice Dynamics

## Objective

Measure variation in vocal pitch.

## Detects

* monotone speaking
* emotionally flat narration
* low vocal expressiveness

## Input

Voice frequency contour.

## Required Tools

* librosa pitch extraction

## Output

Normalized score:

* 0 = completely monotone
* 10 = highly expressive voice variation

---

# 11. `speech_rate`

## Category

Speech Delivery

## Objective

Measure speaking speed.

## Detects

* excessively fast speech
* excessively slow speech
* poor pacing delivery

## Input

Speech transcript and timing.

## Required Tools

* Whisper tiny/base

## Output

Normalized score:

* 0 = extremely slow
* 10 = extremely fast

---

# 12. `sync_alignment`

## Category

Audio-Visual Synchronization

## Objective

Measure alignment between visual rhythm and audio rhythm.

## Detects

* disconnected pacing
* mismatched editing rhythm
* incoherent viewing experience

## Input

Visual rhythm timeline + audio rhythm timeline.

## Required Tools

* custom temporal analysis

## Output

Normalized score:

* 0 = highly unsynchronized
* 10 = strongly synchronized

---

# Derived Scores

## `visual_engagement_score`

Derived from:

* visual_dynamics
* motion_level
* scene_variation
* cut_frequency

---

## `cognitive_load_score`

Derived from:

* text_density
* readability
* clutter_level

---

## `audio_engagement_score`

Derived from:

* audio_energy
* pitch_variation
* speech_rate

---

## `retention_risk_score`

Derived from:

* visual metrics
* audio metrics
* overload metrics
* synchronization metrics

---

# System Philosophy

CreativeIQ AI does NOT evaluate creativity itself.

CreativeIQ AI measures technical and perceptual signals that affect:

* viewer attention
* clarity
* pacing
* retention
* viewing experience

The system acts as:

* a video quality control layer
* an explainable creative analysis system
* a pre-publish content review assistant.
