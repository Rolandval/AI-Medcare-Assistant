"""Medical documents endpoints"""

from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Query
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.models.medical_document import MedicalDocument

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    title: Optional[str] = Form(None),
    current_user: CurrentUser = None,
    db: DB = None,
):
    from app.services.storage import StorageService
    storage = StorageService()
    url = await storage.upload_file(
        file=file,
        folder=f"documents/{current_user.id}",
        allowed_types=["application/pdf", "image/jpeg", "image/png", "image/webp"],
    )

    doc = MedicalDocument(
        user_id=current_user.id,
        doc_type=doc_type,
        title=title or file.filename,
        file_url=url,
        file_name=file.filename,
        file_type=file.content_type,
        file_size_bytes=0,  # Updated after upload
        ocr_status="pending",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Trigger OCR + AI analysis in background
    from app.tasks.ai_tasks import process_document_task
    process_document_task.delay(str(doc.id))

    return {"id": str(doc.id), "status": "processing", "file_url": url}


@router.get("/", response_model=List[dict])
async def list_documents(
    current_user: CurrentUser,
    db: DB,
    doc_type: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
):
    query = select(MedicalDocument).where(MedicalDocument.user_id == current_user.id)
    if doc_type:
        query = query.where(MedicalDocument.doc_type == doc_type)
    query = query.order_by(MedicalDocument.created_at.desc()).limit(limit)
    result = await db.execute(query)
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "doc_type": d.doc_type,
            "title": d.title,
            "ocr_status": d.ocr_status,
            "has_ai_analysis": d.ai_analysis is not None,
            "ai_flags": d.ai_flags,
            "created_at": d.created_at,
        }
        for d in docs
    ]


@router.get("/{doc_id}")
async def get_document(doc_id: str, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(MedicalDocument).where(
            MedicalDocument.id == doc_id,
            MedicalDocument.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
