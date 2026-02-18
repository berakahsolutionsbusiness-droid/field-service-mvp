from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    Text,
    DateTime,
    Enum
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import enum

Base = declarative_base()

# =================================================
# STATUS DA OS
# =================================================

class StatusOS(enum.Enum):
    EM_ABERTO = "EM_ABERTO"
    EM_ATENDIMENTO = "EM_ATENDIMENTO"
    AGUARDANDO = "AGUARDANDO"
    EM_CAMPO = "EM_CAMPO"
    CONCLUIDA = "CONCLUIDA"


# =================================================
# ETAPAS DO ATENDIMENTO
# =================================================

class Etapa(enum.Enum):
    INSPECAO = "INSPECAO"
    DIAGNOSTICO = "DIAGNOSTICO"
    ORCAMENTO = "ORCAMENTO"
    APROVACAO = "APROVACAO"
    EXECUCAO = "EXECUCAO"
    FINALIZACAO = "FINALIZACAO"


# =================================================
# TABELAS
# =================================================

class Tecnico(Base):
    __tablename__ = "tecnico"

    id = Column(Integer, primary_key=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    senha = Column(String, nullable=False)
    ativo = Column(Boolean, default=True)


class OS(Base):
    __tablename__ = "os"

    id = Column(Integer, primary_key=True)
    cliente = Column(String, nullable=False)
    endereco = Column(String, nullable=False)

    status = Column(Enum(StatusOS), default=StatusOS.EM_ABERTO)

    tecnico_id = Column(Integer, ForeignKey("tecnico.id"))
    criado_em = Column(DateTime, default=datetime.utcnow)

    tecnico = relationship("Tecnico")


class Atendimento(Base):
    __tablename__ = "atendimento"

    id = Column(Integer, primary_key=True)

    os_id = Column(Integer, ForeignKey("os.id"))
    tecnico_id = Column(Integer, ForeignKey("tecnico.id"))

    hora_inicio = Column(DateTime)
    hora_fim = Column(DateTime)

    etapa = Column(Enum(Etapa), default=Etapa.INSPECAO)

    os = relationship("OS")
    tecnico = relationship("Tecnico")


class EtapaHistorico(Base):
    __tablename__ = "etapa_historico"

    id = Column(Integer, primary_key=True)

    atendimento_id = Column(Integer, ForeignKey("atendimento.id"))

    etapa = Column(Enum(Etapa))
    descricao = Column(Text)
    foto = Column(Text)

    criado_em = Column(DateTime, default=datetime.utcnow)

    atendimento = relationship("Atendimento")
