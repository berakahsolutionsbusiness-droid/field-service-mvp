from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    Text,
    DateTime,
    Numeric,
    Enum
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import enum

Base = declarative_base()


# =========================
# ENUMS
# =========================

class StatusOS(enum.Enum):
    EM_ABERTO = "EM_ABERTO"
    EM_ATENDIMENTO = "EM_ATENDIMENTO"
    CONCLUIDA = "CONCLUIDA"


# =========================
# TABELAS
# =========================

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

    tecnico_id = Column(Integer, ForeignKey("tecnico.id"), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    tecnico = relationship("Tecnico")


class Atendimento(Base):
    __tablename__ = "atendimento"

    id = Column(Integer, primary_key=True)

    os_id = Column(Integer, ForeignKey("os.id"), nullable=False)
    tecnico_id = Column(Integer, ForeignKey("tecnico.id"), nullable=False)

    hora_inicio = Column(DateTime)
    hora_fim = Column(DateTime)

    lat_inicio = Column(Numeric)
    lng_inicio = Column(Numeric)
    lat_fim = Column(Numeric)
    lng_fim = Column(Numeric)

    observacao = Column(Text)
    foto = Column(Text)
    
    criado_em = Column(DateTime, default=datetime.utcnow)

    os = relationship("OS")
    tecnico = relationship("Tecnico")


class Foto(Base):
    __tablename__ = "foto"

    id = Column(Integer, primary_key=True)
    atendimento_id = Column(Integer, ForeignKey("atendimento.id"), nullable=False)
    url = Column(String, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow)

    atendimento = relationship("Atendimento")
