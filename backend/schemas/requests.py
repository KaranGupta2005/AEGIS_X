from pydantic import BaseModel, Field
from typing import Optional


class StartSessionRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)


class EndSessionRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: Optional[str] = None


class BehavioralEventRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    typing_speed_cps: float = Field(..., ge=0, le=15)
    typing_rhythm_variance: float = Field(..., ge=0, le=500)
    typing_pressure_mean: float = Field(..., ge=0, le=1)
    swipe_velocity_mean: float = Field(..., ge=0, le=5)
    swipe_velocity_variance: float = Field(..., ge=0, le=2)
    swipe_straightness: float = Field(..., ge=0, le=1)
    touch_duration_mean: float = Field(..., ge=0, le=1000)
    touch_duration_variance: float = Field(..., ge=0, le=10000)
    touch_area_mean: float = Field(..., ge=0, le=1)
    hesitation_ratio: float = Field(..., ge=0, le=1)
    hesitation_count: int = Field(..., ge=0, le=30)
    correction_rate: float = Field(..., ge=0, le=1)
    scroll_speed_mean: float = Field(..., ge=0, le=5)
    gyroscope_variance: float = Field(..., ge=0, le=0.5)
    session_time_elapsed: float = Field(..., ge=0, le=7200)
    interaction_intensity: int = Field(..., ge=0, le=100)
    transaction_amount: float = Field(default=0.0, ge=0)
    is_new_beneficiary: bool = Field(default=False)

    def to_event_dict(self) -> dict:
        return {
            "typing_speed_cps": self.typing_speed_cps,
            "typing_rhythm_variance": self.typing_rhythm_variance,
            "typing_pressure_mean": self.typing_pressure_mean,
            "swipe_velocity_mean": self.swipe_velocity_mean,
            "swipe_velocity_variance": self.swipe_velocity_variance,
            "swipe_straightness": self.swipe_straightness,
            "touch_duration_mean": self.touch_duration_mean,
            "touch_duration_variance": self.touch_duration_variance,
            "touch_area_mean": self.touch_area_mean,
            "hesitation_ratio": self.hesitation_ratio,
            "hesitation_count": self.hesitation_count,
            "correction_rate": self.correction_rate,
            "scroll_speed_mean": self.scroll_speed_mean,
            "gyroscope_variance": self.gyroscope_variance,
            "session_time_elapsed": self.session_time_elapsed,
            "interaction_intensity": self.interaction_intensity,
        }
