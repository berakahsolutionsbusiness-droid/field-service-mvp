from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

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
    # Busca todas as OS não concluídas
    lista = db.query(OS).filter(
        OS.status != StatusOS.CONCLUIDA
    ).all()

    resultado = []

    for o in lista:
        # Regras de visibilidade:
        # - OS EM_ABERTO: todos veem
        # - OS EM_ATENDIMENTO: só o técnico responsável vê
        # - OS AGUARDANDO: todos veem (para pegar quando liberar)
        # - OS EM_CAMPO: só o técnico responsável vê
        
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
# VERIFICAR SE PODE INICIAR ATENDIMENTO
# =================================================

def pode_iniciar_atendimento(user_id: int, db: Session):
    """
    Verifica se o técnico pode iniciar um novo atendimento.
    Só NÃO pode se tiver um atendimento em EXECUÇÃO ou FINALIZAÇÃO ativo.
    """
    atendimento_em_execucao = db.query(Atendimento).filter(
        Atendimento.tecnico_id == user_id,
        Atendimento.hora_fim.is_(None),
        Atendimento.etapa.in_([Etapa.EXECUCAO, Etapa.FINALIZACAO])
    ).first()
    
    return atendimento_em_execucao is None


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
    # Verifica se pode iniciar (não ter EXECUÇÃO/FINALIZAÇÃO ativa)
    if not pode_iniciar_atendimento(user.id, db):
        raise HTTPException(400, "Você já tem um atendimento em EXECUÇÃO. Finalize-o antes de iniciar outro.")
    
    # Busca a OS
    os = db.get(OS, os_id)
    if not os:
        raise HTTPException(404, "OS não encontrada")
    
    # Verifica se a OS já está sendo atendida por outro técnico
    if os.status in [StatusOS.EM_ATENDIMENTO, StatusOS.EM_CAMPO] and os.tecnico_id != user.id:
        raise HTTPException(400, "Esta OS já está sendo atendida por outro técnico")
    
    # Verifica se já existe um atendimento para esta OS (etapas anteriores)
    atendimento_existente = db.query(Atendimento).filter(
        Atendimento.os_id == os_id,
        Atendimento.hora_fim.is_(None)
    ).first()
    
    if atendimento_existente:
        # Se existe e é de outro técnico, não permite
        if atendimento_existente.tecnico_id != user.id:
            raise HTTPException(400, "Esta OS já possui um atendimento em andamento")
        # Se é do mesmo técnico, retorna o atendimento existente
        return {"id": atendimento_existente.id, "mensagem": "Atendimento já existe"}
    
    # Cria novo atendimento
    atendimento = Atendimento(
        os_id=os.id,
        tecnico_id=user.id,
        hora_inicio=datetime.utcnow(),
        etapa=Etapa.INSPECAO  # Começa sempre em INSPECAO
    )
    
    # Atualiza status da OS
    os.status = StatusOS.EM_ATENDIMENTO
    os.tecnico_id = user.id
    
    db.add(atendimento)
    db.commit()
    db.refresh(atendimento)
    
    # Cria primeiro histórico
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
    # Busca o atendimento
    atendimento = db.get(Atendimento, id)
    if not atendimento:
        raise HTTPException(404, "Atendimento não encontrado")
    
    # Verifica se o atendimento é do usuário
    if atendimento.tecnico_id != user.id:
        raise HTTPException(403, "Você não tem permissão para este atendimento")
    
    # Converte a etapa string para Enum
    try:
        nova_etapa = Etapa[data.etapa]
    except KeyError:
        raise HTTPException(400, f"Etapa inválida: {data.etapa}")
    
    # Valida sequência de etapas
    etapas_ordem = list(Etapa)
    etapa_atual_index = etapas_ordem.index(atendimento.etapa)
    nova_etapa_index = etapas_ordem.index(nova_etapa)
    
    # Permite avançar ou voltar? Vamos permitir apenas avançar
    if nova_etapa_index <= etapa_atual_index and nova_etapa != atendimento.etapa:
        raise HTTPException(400, f"Não é possível voltar para {nova_etapa.value}. Etapa atual: {atendimento.etapa.value}")
    
    # Atualiza etapa do atendimento
    atendimento.etapa = nova_etapa
    
    # Cria histórico
    hist = EtapaHistorico(
        atendimento_id=id,
        etapa=nova_etapa,
        descricao=data.descricao,
        foto=data.foto
    )
    db.add(hist)
    
    # Atualiza status da OS baseado na etapa
    if nova_etapa in [Etapa.ORCAMENTO, Etapa.APROVACAO]:
        atendimento.os.status = StatusOS.AGUARDANDO
    elif nova_etapa == Etapa.EXECUCAO:
        atendimento.os.status = StatusOS.EM_CAMPO
    elif nova_etapa == Etapa.FINALIZACAO:
        atendimento.hora_fim = datetime.utcnow()
        atendimento.os.status = StatusOS.CONCLUIDA
    else:  # INSPECAO, DIAGNOSTICO
        atendimento.os.status = StatusOS.EM_ATENDIMENTO
    
    db.commit()
    
    return {
        "etapa": nova_etapa.value,
        "mensagem": f"Etapa avançada para {nova_etapa.value}"
    }


# =================================================
# ATENDIMENTO ATIVO
# =================================================

# =================================================
# ATENDIMENTO ATIVO
# =================================================

@router.get("/atendimento/ativo")
def atendimento_ativo(
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Busca atendimento ativo (qualquer etapa, desde que não finalizado)
    atendimento = db.query(Atendimento).filter(
        Atendimento.tecnico_id == user.id,
        Atendimento.hora_fim.is_(None)
    ).first()

    if not atendimento:
        # Retorna null em vez de 404
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
# HISTÓRICO DE ETAPAS (CORRIGIDO - ENDPOINT CORRETO)
# =================================================

@router.get("/atendimento/{id}/etapas")
def get_etapas_historico(
    id: int,
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retorna o histórico de etapas de um atendimento"""
    
    # Verifica se o atendimento existe
    atendimento = db.get(Atendimento, id)
    if not atendimento:
        raise HTTPException(404, "Atendimento não encontrado")
    
    # Verifica permissão (opcional - pode permitir ver qualquer um?)
    # if atendimento.tecnico_id != user.id:
    #     raise HTTPException(403, "Sem permissão para ver este histórico")
    
    # Busca histórico
    historico = db.query(EtapaHistorico).filter(
        EtapaHistorico.atendimento_id == id
    ).order_by(EtapaHistorico.criado_em).all()

    return [
        {
            "id": h.id,
            "etapa": h.etapa.value,
            "descricao": h.descricao,
            "foto": h.foto,
            "criado_em": h.criado_em.isoformat() if h.criado_em else None
        }
        for h in historico
    ]


# =================================================
# HISTÓRICO COMPLETO (mantido para compatibilidade)
# =================================================

@router.get("/atendimento/{id}/historico")
def historico_completo(
    id: int, 
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Alias para /etapas (mantido por compatibilidade)"""
    return get_etapas_historico(id, user, db)


# =================================================
# LISTAR ATENDIMENTOS DO TÉCNICO
# =================================================

@router.get("/tecnicos/meus-atendimentos")
def meus_atendimentos(
    user: Tecnico = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista todos os atendimentos do técnico"""
    
    atendimentos = db.query(Atendimento).filter(
        Atendimento.tecnico_id == user.id
    ).order_by(Atendimento.hora_inicio.desc()).all()
    
    return [
        {
            "id": a.id,
            "os_id": a.os_id,
            "cliente": a.os.cliente,
            "etapa": a.etapa.value,
            "status_os": a.os.status.value,
            "hora_inicio": a.hora_inicio.isoformat() if a.hora_inicio else None,
            "hora_fim": a.hora_fim.isoformat() if a.hora_fim else None,
            "ativo": a.hora_fim is None
        }
        for a in atendimentos
    ]