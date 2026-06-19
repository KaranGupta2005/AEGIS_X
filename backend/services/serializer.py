"""
Why text instead of raw numbers?
    MiniLM was trained on natural language (Wikipedia, books, web text).
    Numbers like 3.4, 3.5, 3.6 have NO semantic meaning to the model.
    But "typing speed is normal" and "moderate typing rhythm" DO carry meaning.
    Semantically similar descriptions produce similar embeddings — this is the
    core insight that makes behavioral drift detection via cosine similarity work.
"""

from typing import Dict, List, Optional


class BehavioralSerializer:
    """
    Translates numerical behavioral features into structured natural language
    descriptions suitable for transformer embedding.

    Each feature is mapped to a descriptive phrase based on threshold bins
    calibrated against the behavioral distributions from Phase 1 data generation.
    The thresholds are tuned to produce maximally discriminative descriptions
    across the 4 attack scenarios (normal, takeover, social engineering, malware).
    """

    def serialize(self, features: Dict[str, float]) -> str:
        """
        Convert a feature dictionary into a behavioral description string.

        Args:
            features: Dictionary with 16 behavioral features (from FeatureEngineer).

        Returns:
            Human-readable behavioral description string for MiniLM embedding.
        """
        segments: List[str] = []

        # ─── TYPING BEHAVIOR ───────────────────────────────────────────────
        segments.append(self._describe_typing_speed(features))
        segments.append(self._describe_typing_rhythm(features))
        segments.append(self._describe_typing_pressure(features))

        # ─── SWIPE BEHAVIOR ────────────────────────────────────────────────
        segments.append(self._describe_swipe_velocity(features))
        segments.append(self._describe_swipe_consistency(features))
        segments.append(self._describe_swipe_straightness(features))

        # ─── TOUCH DYNAMICS ────────────────────────────────────────────────
        segments.append(self._describe_touch_duration(features))
        segments.append(self._describe_touch_variability(features))
        segments.append(self._describe_touch_area(features))

        # ─── HESITATION & COGNITIVE SIGNALS ────────────────────────────────
        segments.append(self._describe_hesitation(features))
        segments.append(self._describe_hesitation_frequency(features))

        # ─── CORRECTION BEHAVIOR ───────────────────────────────────────────
        segments.append(self._describe_corrections(features))

        # ─── NAVIGATION & MOTION ───────────────────────────────────────────
        segments.append(self._describe_scroll_behavior(features))
        segments.append(self._describe_device_motion(features))

        # ─── SESSION CONTEXT ───────────────────────────────────────────────
        segments.append(self._describe_session_duration(features))
        segments.append(self._describe_interaction_intensity(features))

        # Filter out empty segments and join
        return " ".join(s for s in segments if s)

    # ═══════════════════════════════════════════════════════════════════════
    # TYPING DESCRIPTORS
    # ═══════════════════════════════════════════════════════════════════════

    def _describe_typing_speed(self, f: Dict) -> str:
        """Typing cadence: chars per second."""
        v = f.get("typing_speed_cps", 0)
        if v < 1.5:
            return "Typing speed is extremely slow, indicating hesitation or distraction."
        elif v < 2.5:
            return "Typing speed is slow, suggesting uncertainty or divided attention."
        elif v < 4.5:
            return "Typing speed is within normal human range."
        elif v < 7.0:
            return "Typing speed is fast, suggesting familiarity or urgency."
        else:
            return "Typing speed is abnormally fast, exceeding typical human capability."

    def _describe_typing_rhythm(self, f: Dict) -> str:
        """Inter-key timing variance: higher = more erratic."""
        v = f.get("typing_rhythm_variance", 0)
        if v < 5.0:
            return "Typing rhythm is extremely uniform, suggesting automated input."
        elif v < 20.0:
            return "Typing rhythm has low variance, indicating mechanical precision."
        elif v < 60.0:
            return "Typing rhythm shows natural human variation."
        elif v < 150.0:
            return "Typing rhythm is erratic, indicating distraction or stress."
        else:
            return "Typing rhythm is highly irregular, suggesting extreme distress or confusion."

    def _describe_typing_pressure(self, f: Dict) -> str:
        """Touch pressure during typing."""
        v = f.get("typing_pressure_mean", 0)
        if v < 0.3:
            return "Typing pressure is unusually light."
        elif v < 0.5:
            return "Typing pressure is moderate."
        elif v < 0.7:
            return "Typing pressure is within normal range."
        elif v < 0.85:
            return "Typing pressure is elevated, suggesting tension."
        else:
            return "Typing pressure is very high, indicating physical stress or forceful interaction."

    # ═══════════════════════════════════════════════════════════════════════
    # SWIPE DESCRIPTORS
    # ═══════════════════════════════════════════════════════════════════════

    def _describe_swipe_velocity(self, f: Dict) -> str:
        """Mean swipe speed."""
        v = f.get("swipe_velocity_mean", 0)
        if v < 0.4:
            return "Swipe movements are very slow and hesitant."
        elif v < 0.8:
            return "Swipe velocity is below average, suggesting caution."
        elif v < 1.5:
            return "Swipe velocity is normal and fluid."
        elif v < 2.2:
            return "Swipe velocity is fast, indicating decisiveness or urgency."
        else:
            return "Swipe velocity is abnormally high, suggesting programmatic control."

    def _describe_swipe_consistency(self, f: Dict) -> str:
        """Variance in swipe speeds across the window."""
        v = f.get("swipe_velocity_variance", 0)
        if v < 0.02:
            return "Swipe speed is perfectly consistent, atypical for human interaction."
        elif v < 0.1:
            return "Swipe consistency is stable with minor natural variation."
        elif v < 0.3:
            return "Swipe speeds show moderate variation, within normal range."
        elif v < 0.6:
            return "Swipe speeds are inconsistent, suggesting agitation."
        else:
            return "Swipe behavior is highly erratic and unpredictable."

    def _describe_swipe_straightness(self, f: Dict) -> str:
        """Linearity of swipe paths (1.0 = perfectly straight)."""
        v = f.get("swipe_straightness", 0)
        if v > 0.97:
            return "Swipe paths are perfectly linear, characteristic of automated gestures."
        elif v > 0.88:
            return "Swipe paths are very straight with minimal deviation."
        elif v > 0.75:
            return "Swipe paths show normal human curvature."
        elif v > 0.6:
            return "Swipe paths are notably curved, suggesting imprecise motor control."
        else:
            return "Swipe paths are highly irregular, indicating tremor or instability."

    # ═══════════════════════════════════════════════════════════════════════
    # TOUCH DYNAMICS DESCRIPTORS
    # ═══════════════════════════════════════════════════════════════════════

    def _describe_touch_duration(self, f: Dict) -> str:
        """Mean finger-on-screen time in ms."""
        v = f.get("touch_duration_mean", 0)
        if v < 55:
            return "Touch duration is extremely brief, suggesting rapid automated taps."
        elif v < 90:
            return "Touch duration is short, indicating quick decisive actions."
        elif v < 160:
            return "Touch duration is within normal interactive range."
        elif v < 250:
            return "Touch duration is prolonged, suggesting deliberation or freezing."
        else:
            return "Touch duration is abnormally long, indicating hesitation or paralysis."

    def _describe_touch_variability(self, f: Dict) -> str:
        """Variance in touch durations."""
        v = f.get("touch_duration_variance", 0)
        if v < 30:
            return "Touch timing is extremely uniform, atypical for organic interaction."
        elif v < 300:
            return "Touch timing variability is low and consistent."
        elif v < 1000:
            return "Touch timing shows natural variation between interactions."
        elif v < 2500:
            return "Touch timing is notably variable, suggesting divided attention."
        else:
            return "Touch timing is extremely erratic, indicating severe cognitive disruption."

    def _describe_touch_area(self, f: Dict) -> str:
        """Mean touch contact area (finger size/pressure indicator)."""
        v = f.get("touch_area_mean", 0)
        if v < 0.25:
            return "Touch contact area is very small, possibly fingernail or stylus input."
        elif v < 0.38:
            return "Touch contact area is below average."
        elif v < 0.55:
            return "Touch contact area is within normal fingertip range."
        elif v < 0.72:
            return "Touch contact area is larger than typical, suggesting thumb or pressed grip."
        else:
            return "Touch contact area is abnormally large, indicating pressed or stressed grip."

    # ═══════════════════════════════════════════════════════════════════════
    # HESITATION & COGNITIVE DESCRIPTORS
    # ═══════════════════════════════════════════════════════════════════════

    def _describe_hesitation(self, f: Dict) -> str:
        """Fraction of 2s window spent idle (no interaction)."""
        v = f.get("hesitation_ratio", 0)
        if v < 0.03:
            return "No hesitation detected, continuous interaction throughout."
        elif v < 0.12:
            return "Minimal hesitation, natural brief pauses between actions."
        elif v < 0.25:
            return "Moderate hesitation, with noticeable thinking pauses."
        elif v < 0.5:
            return "Significant hesitation, user frequently pausing mid-action."
        elif v < 0.7:
            return "High hesitation, extended idle periods suggesting internal conflict."
        else:
            return "Extreme hesitation, user is frozen or severely conflicted."

    def _describe_hesitation_frequency(self, f: Dict) -> str:
        """Number of distinct pause events (>500ms gaps) in window."""
        v = f.get("hesitation_count", 0)
        if v == 0:
            return "Zero pause events in this window."
        elif v <= 1:
            return "One brief pause event detected."
        elif v <= 3:
            return "A few natural pause events observed."
        elif v <= 6:
            return "Frequent pause events, indicating repeated hesitation."
        else:
            return "Very frequent pauses, suggesting extreme uncertainty or distress."

    # ═══════════════════════════════════════════════════════════════════════
    # CORRECTION DESCRIPTORS
    # ═══════════════════════════════════════════════════════════════════════

    def _describe_corrections(self, f: Dict) -> str:
        """Backspace/undo rate per character typed."""
        v = f.get("correction_rate", 0)
        if v < 0.01:
            return "Zero corrections made, no backspace or undo events."
        elif v < 0.06:
            return "Very few corrections, typical for confident typing."
        elif v < 0.15:
            return "Moderate correction frequency, within normal range."
        elif v < 0.3:
            return "Elevated correction rate, suggesting nervousness or distraction."
        elif v < 0.5:
            return "High correction rate, indicating significant uncertainty or panic."
        else:
            return "Extreme correction frequency, user is making and undoing actions repeatedly."

    # ═══════════════════════════════════════════════════════════════════════
    # NAVIGATION & DEVICE MOTION DESCRIPTORS
    # ═══════════════════════════════════════════════════════════════════════

    def _describe_scroll_behavior(self, f: Dict) -> str:
        """Mean scroll velocity."""
        v = f.get("scroll_speed_mean", 0)
        if v < 0.2:
            return "Minimal scrolling activity."
        elif v < 0.6:
            return "Light scrolling, user focused on current view."
        elif v < 1.1:
            return "Normal scroll speed, natural content browsing."
        elif v < 1.8:
            return "Fast scrolling, user navigating quickly."
        else:
            return "Very rapid scrolling, programmatic or agitated behavior."

    def _describe_device_motion(self, f: Dict) -> str:
        """Gyroscope variance (hand tremor / device stability)."""
        v = f.get("gyroscope_variance", 0)
        if v < 0.002:
            return "Device is extremely stable, likely placed on surface or remotely controlled."
        elif v < 0.008:
            return "Device is very steady, minimal hand movement."
        elif v < 0.02:
            return "Normal device motion from natural hand holding."
        elif v < 0.04:
            return "Elevated device movement, user may be walking or nervous."
        elif v < 0.07:
            return "Significant device instability, suggesting hand tremor or physical stress."
        else:
            return "Extreme device shaking, indicating severe physical agitation or tremor."

    # ═══════════════════════════════════════════════════════════════════════
    # SESSION CONTEXT DESCRIPTORS
    # ═══════════════════════════════════════════════════════════════════════

    def _describe_session_duration(self, f: Dict) -> str:
        """Time elapsed since session start."""
        v = f.get("session_time_elapsed", 0)
        if v < 15:
            return "Very early in session, initial interaction phase."
        elif v < 60:
            return "Short session duration, quick task execution."
        elif v < 180:
            return "Moderate session length, typical banking interaction."
        elif v < 400:
            return "Extended session, longer than typical transaction flow."
        else:
            return "Very long session, significantly exceeding normal interaction time."

    def _describe_interaction_intensity(self, f: Dict) -> str:
        """Total touch/tap events in the 2-second window."""
        v = f.get("interaction_intensity", 0)
        if v <= 2:
            return "Very low interaction density, mostly idle."
        elif v <= 5:
            return "Low interaction activity, deliberate sparse actions."
        elif v <= 10:
            return "Normal interaction density for active use."
        elif v <= 18:
            return "High interaction density, rapid successive actions."
        else:
            return "Extremely high interaction rate, suggesting automated rapid input."
