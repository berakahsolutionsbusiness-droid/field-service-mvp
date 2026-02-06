from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import SessionLocal
from app.db.models import Tecnico, OS, Atendimento, StatusOS
from app.auth import verify_password, create_token, decode_token


router = APIRouter()

# ======================
# DB Dependency
# ======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ======================
# Auth Dependency
# ======================
def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")

    token = authorization.replace("Bearer ", "")
    user_id = decode_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.get(Tecnico, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não existe")

    return user

# ======================
# Login
# ======================
@router.post("/login")
def login(email: str, senha: str, db: Session = Depends(get_db)):
    user = db.query(Tecnico).filter(Tecnico.email == email).first()

    if not user or not verify_password(senha, user.senha):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    return {"token": create_token(user.id)}

# ======================
# OS
# ======================
@router.get("/os/abertas")
def listar_os(
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(OS).filter(OS.status == StatusOS.EM_ABERTO).all()

@router.post("/os/{os_id}/iniciar")
def iniciar_atendimento(
    os_id: int,
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    os = db.get(OS, os_id)

    if not os or os.status != StatusOS.EM_ABERTO:
        raise HTTPException(400, "OS indisponível")

    ativo = db.query(Atendimento).filter(
        Atendimento.tecnico_id == user.id,
        Atendimento.hora_fim.is_(None)
    ).first()

    if ativo:
        raise HTTPException(400, "Você já está em atendimento")

    os.status = StatusOS.EM_ATENDIMENTO
    os.tecnico_id = user.id

    atendimento = Atendimento(
        os_id=os.id,
        tecnico_id=user.id,
        hora_inicio=datetime.utcnow()
    )

    db.add(atendimento)
    db.commit()
    db.refresh(atendimento)

    return {
        "message": "Atendimento iniciado",
        "atendimento_id": atendimento.id
    }

@router.post("/atendimento/{id}/finalizar")
def finalizar_atendimento(
    id: int,
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    atendimento = db.get(Atendimento, id)

    if not atendimento or atendimento.tecnico_id != user.id:
        raise HTTPException(403, "Acesso negado")

    atendimento.hora_fim = datetime.utcnow()
    atendimento.os.status = StatusOS.CONCLUIDA

    db.commit()

    return {"message": "Atendimento finalizado"}
