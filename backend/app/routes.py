# routes.py
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
import logging

# Configurar logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.database import SessionLocal
from app.db.models import (
    Tecnico,
    OS,
    Atendimento,
    EtapaHistorico,
    StatusOS,
    Etapa
)

from app.auth import verify_password, create_token, decode_token

router = APIRouter()


# =================================================
# DB
# =================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =================================================
# AUTH
# =================================================

def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    token = authorization.replace("Bearer ", "")
    user_id = decode_token(token)

    user = db.get(Tecnico, user_id)

    if not user:
        raise HTTPException(401, "Usuário não autorizado")

    return user


# =================================================
# LOGIN
# =================================================

@router.post("/login")
def login(email: str, senha: str, db: Session = Depends(get_db)):
    user = db.query(Tecnico).filter(
        Tecnico.email == email
    ).first()

    if not user or not verify_password(senha, user.senha):
        raise HTTPException(401, "Credenciais inválidas")

    return {"token": create_token(user.id)}


# =================================================
# LISTAR OS
# =================================================

@router.get("/os/abertas")
def listar_os(
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lista = db.query(OS).filter(
        OS.status != StatusOS.CONCLUIDA
    ).all()

    resultado = []

    for o in lista:
        if o.status == StatusOS.EM_ATENDIMENTO and o.tecnico_id != user.id:
            continue
            
        if o.status == StatusOS.EM_CAMPO and o.tecnico_id != user.id:
            continue

        resultado.append({
            "id": o.id,
            "cliente": o.cliente,
            "endereco": o.endereco,
            "status": o.status.value,
            "tecnico_id": o.tecnico_id
        })

    return resultado


# =================================================
# INICIAR ATENDIMENTO
# =================================================

class IniciarAtendimentoInput(BaseModel):
    latitude: Optional[float] = 0
    longitude: Optional[float] = 0

@router.post("/os/{os_id}/iniciar")
def iniciar_atendimento(
    os_id: int,
    data: IniciarAtendimentoInput,
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    os = db.get(OS, os_id)
    if not os:
        raise HTTPException(404, "OS não encontrada")
    
    if os.status in [StatusOS.EM_ATENDIMENTO, StatusOS.EM_CAMPO] and os.tecnico_id != user.id:
        raise HTTPException(400, "Esta OS já está sendo atendida por outro técnico")
    
    atendimento_existente = db.query(Atendimento).filter(
        Atendimento.os_id == os_id,
        Atendimento.hora_fim.is_(None)
    ).first()
    
    if atendimento_existente:
        if atendimento_existente.tecnico_id != user.id:
            raise HTTPException(400, "Esta OS já possui um atendimento em andamento")
        return {"id": atendimento_existente.id, "mensagem": "Atendimento já existe"}
    
    atendimento = Atendimento(
        os_id=os.id,
        tecnico_id=user.id,
        hora_inicio=datetime.utcnow(),
        etapa=Etapa.INSPECAO
    )
    
    os.status = StatusOS.EM_ATENDIMENTO
    os.tecnico_id = user.id
    
    db.add(atendimento)
    db.commit()
    db.refresh(atendimento)
    
    historico = EtapaHistorico(
        atendimento_id=atendimento.id,
        etapa=Etapa.INSPECAO,
        descricao="Início do atendimento",
        foto=""
    )
    db.add(historico)
    db.commit()
    
    return {"id": atendimento.id, "mensagem": "Atendimento iniciado com sucesso"}


# =================================================
# AVANÇAR ETAPA
# =================================================

class EtapaInput(BaseModel):
    etapa: str
    descricao: str = ""
    foto: str = ""


@router.post("/atendimento/{id}/etapa")
def avancar_etapa(
    id: int,
    data: EtapaInput,
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    atendimento = db.get(Atendimento, id)
    if not atendimento:
        raise HTTPException(404, "Atendimento não encontrado")
    
    if atendimento.tecnico_id != user.id:
        raise HTTPException(403, "Você não tem permissão para este atendimento")
    
    try:
        nova_etapa = Etapa[data.etapa]
    except KeyError:
        raise HTTPException(400, f"Etapa inválida: {data.etapa}")
    
    etapas_ordem = list(Etapa)
    etapa_atual_index = etapas_ordem.index(atendimento.etapa)
    nova_etapa_index = etapas_ordem.index(nova_etapa)
    
    if nova_etapa_index <= etapa_atual_index and nova_etapa != atendimento.etapa:
        raise HTTPException(400, f"Não é possível voltar para {nova_etapa.value}")
    
    atendimento.etapa = nova_etapa
    
    hist = EtapaHistorico(
        atendimento_id=id,
        etapa=nova_etapa,
        descricao=data.descricao,
        foto=data.foto
    )
    db.add(hist)
    
    if nova_etapa in [Etapa.ORCAMENTO, Etapa.APROVACAO]:
        atendimento.os.status = StatusOS.AGUARDANDO
    elif nova_etapa == Etapa.EXECUCAO:
        atendimento.os.status = StatusOS.EM_CAMPO
    elif nova_etapa == Etapa.FINALIZACAO:
        atendimento.hora_fim = datetime.utcnow()
        atendimento.os.status = StatusOS.CONCLUIDA
    else:
        atendimento.os.status = StatusOS.EM_ATENDIMENTO
    
    db.commit()
    
    return {
        "etapa": nova_etapa.value,
        "mensagem": f"Etapa avançada para {nova_etapa.value}"
    }


# =================================================
# ATENDIMENTO ATIVO
# =================================================

@router.get("/atendimento/ativo")
def atendimento_ativo(
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    atendimento = db.query(Atendimento).filter(
        Atendimento.tecnico_id == user.id,
        Atendimento.hora_fim.is_(None)
    ).first()

    if not atendimento:
        return None

    return {
        "id": atendimento.id,
        "etapa": atendimento.etapa.value,
        "os": {
            "id": atendimento.os.id,
            "cliente": atendimento.os.cliente,
            "endereco": atendimento.os.endereco,
            "status": atendimento.os.status.value
        }
    }


# =================================================
# HISTÓRICO COMPLETO
# =================================================

@router.get("/atendimentos/historico")
def listar_historico_completo(
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"📊 Buscando histórico completo para técnico {user.id}")
    
    try:
        atendimentos = db.query(Atendimento).filter(
            Atendimento.tecnico_id == user.id
        ).order_by(Atendimento.hora_inicio.desc()).all()
        
        logger.info(f"✅ Encontrados {len(atendimentos)} atendimentos")
        
        resultado = []
        
        for atendimento in atendimentos:
            try:
                etapas = db.query(EtapaHistorico).filter(
                    EtapaHistorico.atendimento_id == atendimento.id
                ).order_by(EtapaHistorico.criado_em).all()
                
                resultado.append({
                    "id": atendimento.id,
                    "os_id": atendimento.os_id,
                    "cliente": atendimento.os.cliente if atendimento.os else "Cliente não encontrado",
                    "endereco": atendimento.os.endereco if atendimento.os else "Endereço não encontrado",
                    "etapa_atual": atendimento.etapa.value if atendimento.etapa else None,
                    "hora_inicio": atendimento.hora_inicio.isoformat() if atendimento.hora_inicio else None,
                    "hora_fim": atendimento.hora_fim.isoformat() if atendimento.hora_fim else None,
                    "status": "concluido" if atendimento.hora_fim else "em_andamento",
                    "etapas": [
                        {
                            "id": e.id,
                            "etapa": e.etapa.value if e.etapa else None,
                            "descricao": e.descricao,
                            "foto": e.foto,
                            "criado_em": e.criado_em.isoformat() if e.criado_em else None
                        }
                        for e in etapas
                    ]
                })
            except Exception as e:
                logger.error(f"❌ Erro ao processar atendimento {atendimento.id}: {e}")
                continue
        
        logger.info(f"✅ Histórico processado com sucesso: {len(resultado)} itens")
        return resultado
        
    except Exception as e:
        logger.error(f"❌ Erro ao buscar histórico: {e}")
        raise HTTPException(500, f"Erro ao buscar histórico: {str(e)}")


# =================================================
# ETAPAS DE UM ATENDIMENTO
# =================================================

@router.get("/atendimento/{id}/etapas")
def get_etapas_historico(
    id: int,
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    atendimento = db.get(Atendimento, id)
    if not atendimento:
        raise HTTPException(404, "Atendimento não encontrado")
    
    historico = db.query(EtapaHistorico).filter(
        EtapaHistorico.atendimento_id == id
    ).order_by(EtapaHistorico.criado_em).all()

    return [
        {
            "id": h.id,
            "etapa": h.etapa.value if h.etapa else None,
            "descricao": h.descricao,
            "foto": h.foto,
            "criado_em": h.criado_em.isoformat() if h.criado_em else None
        }
        for h in historico
    ]


# =================================================
# HISTÓRICO (COMPATIBILIDADE)
# =================================================

@router.get("/atendimento/{id}/historico")
def historico_completo(
    id: int, 
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_etapas_historico(id, user, db)


# =================================================
# MEUS ATENDIMENTOS
# =================================================

@router.get("/tecnicos/meus-atendimentos")
def meus_atendimentos(
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    atendimentos = db.query(Atendimento).filter(
        Atendimento.tecnico_id == user.id
    ).order_by(Atendimento.hora_inicio.desc()).all()
    
    return [
        {
            "id": a.id,
            "os_id": a.os_id,
            "cliente": a.os.cliente if a.os else None,
            "etapa": a.etapa.value if a.etapa else None,
            "status_os": a.os.status.value if a.os and a.os.status else None,
            "hora_inicio": a.hora_inicio.isoformat() if a.hora_inicio else None,
            "hora_fim": a.hora_fim.isoformat() if a.hora_fim else None,
            "ativo": a.hora_fim is None
        }
        for a in atendimentos
    ]