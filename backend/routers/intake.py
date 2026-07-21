# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import UserIntake
from routers.auth import get_current_user

router = APIRouter()


class SaveIntakeRequest(BaseModel):
    full_name:             Optional[str] = None
    cnic:                  Optional[str] = None
    dob:                   Optional[str] = None
    gender:                Optional[str] = None
    city:                  Optional[str] = None
    address:               Optional[str] = None
    nationality:           Optional[str] = None
    profession:            Optional[str] = None
    income_band:           Optional[str] = None
    affordability:         Optional[str] = None
    stress_level:          Optional[int] = None
    impact_description:    Optional[str] = None
    is_unsafe:             Optional[bool] = None
    opponent_type:         Optional[str] = None
    opponent_relationship: Optional[str] = None
    dispute_description:   Optional[str] = None
    prior_history:         Optional[str] = None
    past_cases:            Optional[str] = None
    ongoing_case:          Optional[str] = None
    prior_consultation:    Optional[str] = None
    goal:                  Optional[str] = None
    timeline:              Optional[str] = None
    expected_outcome:      Optional[str] = None
    full_story:            Optional[str] = None
    documents_held:        Optional[str] = None
    consent:               Optional[bool] = None
    completed:             Optional[bool] = None


@router.get("")
def get_intake(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    intake = db.query(UserIntake).filter(UserIntake.user_id == current_user.id).first()
    if not intake:
        return {"completed": False, "intake": None}
    return {"completed": intake.completed, "intake": intake.to_dict()}


@router.post("/save")
def save_intake(req: SaveIntakeRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    intake = db.query(UserIntake).filter(UserIntake.user_id == current_user.id).first()
    if not intake:
        intake = UserIntake(user_id=current_user.id)
        db.add(intake)
    
    # Update provided fields
    for k, v in req.dict(exclude_unset=True).items():
        setattr(intake, k, v)
        
    db.commit()
    db.refresh(intake)
    
    # If consent is False and completed is True, or if the user denies consent at the end, delete row.
    if intake.completed and not intake.consent:
        db.delete(intake)
        db.commit()
        return {"completed": False, "intake": None, "deleted": True}
        
    return {"completed": intake.completed, "intake": intake.to_dict()}


@router.post("/reset")
def reset_intake(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    intake = db.query(UserIntake).filter(UserIntake.user_id == current_user.id).first()
    if intake:
        db.delete(intake)
        db.commit()
    return {"ok": True}
