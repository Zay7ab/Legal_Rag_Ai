# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import ConsultationRequest, Lawyer
from routers.auth import get_current_user

router = APIRouter()

# NOTE: These endpoints persist a consultation REQUEST a signed-in user drafted,
# so it survives across devices. They do NOT book anything on a lawyer's calendar
# -- Legal Rag Ai has no such link. Guests (not signed in) keep their drafts in
# localStorage on the frontend; only signed-in users get server-side sync.


class BookingIn(BaseModel):
    lawyerId: Optional[int] = None
    lawyerName: str = ""
    date: str = ""
    time: str = ""
    mode: str = "In person"
    matter: str = Field(default="", max_length=4000)


@router.get("")
def list_bookings(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = (
        db.query(ConsultationRequest)
        .filter(ConsultationRequest.user_id == user.id)
        .order_by(ConsultationRequest.created_at.desc())
        .all()
    )
    return [r.to_dict() for r in rows]


@router.post("")
def create_booking(body: BookingIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not body.matter.strip():
        raise HTTPException(status_code=422, detail="Please describe the matter.")

    # Snapshot the lawyer name so the request stays readable even if the listing
    # later changes or is removed.
    lawyer_name = body.lawyerName.strip()
    if body.lawyerId and not lawyer_name:
        lw = db.query(Lawyer).filter(Lawyer.id == body.lawyerId).first()
        if lw:
            lawyer_name = lw.name

    row = ConsultationRequest(
        user_id=user.id,
        lawyer_id=body.lawyerId,
        lawyer_name=lawyer_name or "—",
        date=body.date, time=body.time, mode=body.mode,
        matter=body.matter.strip(), status="drafted",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row.to_dict()


@router.patch("/{booking_id}")
def update_status(booking_id: int, status: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if status not in ("drafted", "sent", "cancelled"):
        raise HTTPException(status_code=422, detail="Invalid status.")
    row = (
        db.query(ConsultationRequest)
        .filter(ConsultationRequest.id == booking_id, ConsultationRequest.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Request not found.")
    row.status = status
    db.commit()
    return row.to_dict()


@router.delete("/{booking_id}")
def delete_booking(booking_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = (
        db.query(ConsultationRequest)
        .filter(ConsultationRequest.id == booking_id, ConsultationRequest.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Request not found.")
    db.delete(row)
    db.commit()
    return {"deleted": booking_id}
