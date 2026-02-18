# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect
from app.routes import router
from app.database import engine
from app.db.models import Base
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

# Inicialização do FastAPI
app = FastAPI(
    title="MVP Field Service API",
    description="API para gerenciamento de ordens de serviço e atendimentos",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configuração CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


# =============================================
# FUNÇÕES DE VERIFICAÇÃO DO BANCO
# =============================================

def verificar_conexao_banco():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("✅ Conexão com banco de dados OK")
            return True
    except Exception as e:
        logger.error(f"❌ Erro de conexão com banco: {e}")
        return False


def verificar_e_criar_tabelas():
    logger.info("📋 Verificando tabelas...")
    
    inspector = inspect(engine)
    tabelas_existentes = inspector.get_table_names()
    
    tabelas_necessarias = ['tecnico', 'os', 'atendimento', 'etapa_historico']
    
    for tabela in tabelas_necessarias:
        if tabela not in tabelas_existentes:
            logger.warning(f"⚠️  Tabela '{tabela}' não encontrada. Criando...")
            Base.metadata.create_all(bind=engine, tables=[Base.metadata.tables[tabela]])
            logger.info(f"  ✅ Tabela '{tabela}' criada")
        else:
            logger.info(f"  ✅ Tabela '{tabela}' OK")
    
    return True


def verificar_e_corrigir_enums():
    logger.info("🔧 Verificando enums...")
    
    with engine.connect() as conn:
        conn.execute(text("BEGIN"))
        
        try:
            # Verifica statusos
            logger.info("  Verificando enum 'statusos'...")
            
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'statusos'
                )
            """))
            enum_existe = result.scalar()
            
            if not enum_existe:
                logger.warning("  ⚠️  Enum 'statusos' não existe. Recriando tabelas...")
                Base.metadata.create_all(bind=engine)
            else:
                valores_statusos = ['AGUARDANDO', 'EM_CAMPO', 'CONCLUIDA']
                
                for valor in valores_statusos:
                    try:
                        conn.execute(text(f"ALTER TYPE statusos ADD VALUE IF NOT EXISTS '{valor}'"))
                        logger.info(f"    ✅ '{valor}' adicionado/verificado")
                    except Exception as e:
                        logger.warning(f"    ⚠️  '{valor}': {e}")
            
            # Verifica etapa
            logger.info("  Verificando enum 'etapa'...")
            
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'etapa'
                )
            """))
            enum_existe = result.scalar()
            
            if not enum_existe:
                logger.warning("  ⚠️  Enum 'etapa' não existe. Recriando tabelas...")
                Base.metadata.create_all(bind=engine)
            else:
                valores_etapa = ['INSPECAO', 'DIAGNOSTICO', 'ORCAMENTO', 'APROVACAO', 'EXECUCAO', 'FINALIZACAO']
                
                for valor in valores_etapa:
                    try:
                        conn.execute(text(f"ALTER TYPE etapa ADD VALUE IF NOT EXISTS '{valor}'"))
                        logger.info(f"    ✅ '{valor}' adicionado/verificado")
                    except Exception as e:
                        logger.warning(f"    ⚠️  '{valor}': {e}")
            
            conn.execute(text("COMMIT"))
            
            # Mostra resultado
            result = conn.execute(text("SELECT unnest(enum_range(NULL::statusos))"))
            statusos = [r[0] for r in result]
            logger.info(f"  📊 StatusOS final: {statusos}")
            
            result = conn.execute(text("SELECT unnest(enum_range(NULL::etapa))"))
            etapas = [r[0] for r in result]
            logger.info(f"  📊 Etapas final: {etapas}")
            
            return True
            
        except Exception as e:
            logger.error(f"  ❌ Erro ao verificar enums: {e}")
            conn.execute(text("ROLLBACK"))
            return False


def criar_indices():
    logger.info("📊 Verificando índices...")
    
    indices = [
        "CREATE INDEX IF NOT EXISTS idx_os_status ON os(status)",
        "CREATE INDEX IF NOT EXISTS idx_os_tecnico ON os(tecnico_id)",
        "CREATE INDEX IF NOT EXISTS idx_atendimento_tecnico ON atendimento(tecnico_id)",
        "CREATE INDEX IF NOT EXISTS idx_atendimento_os ON atendimento(os_id)",
        "CREATE INDEX IF NOT EXISTS idx_atendimento_ativo ON atendimento(tecnico_id) WHERE hora_fim IS NULL",
        "CREATE INDEX IF NOT EXISTS idx_historico_atendimento ON etapa_historico(atendimento_id)",
        "CREATE INDEX IF NOT EXISTS idx_tecnico_email ON tecnico(email)"
    ]
    
    with engine.connect() as conn:
        for idx in indices:
            try:
                conn.execute(text(idx))
                logger.info(f"  ✅ Índice criado")
            except Exception as e:
                logger.warning(f"  ⚠️  Erro ao criar índice: {e}")
        
        conn.commit()
    
    return True


# =============================================
# EVENTO DE STARTUP
# =============================================

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 50)
    logger.info("🚀 INICIANDO MVP FIELD SERVICE API")
    logger.info("=" * 50)
    
    if not verificar_conexao_banco():
        logger.error("❌ Falha na conexão com banco. Aplicação não pode iniciar.")
        return
    
    verificar_e_criar_tabelas()
    verificar_e_corrigir_enums()
    criar_indices()
    
    logger.info("=" * 50)
    logger.info("✅ APLICAÇÃO PRONTA!")
    logger.info(f"📅 Iniciada em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info(f"📚 Documentação: http://localhost:8000/docs")
    logger.info("=" * 50)


# =============================================
# EVENTO DE SHUTDOWN
# =============================================

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("=" * 50)
    logger.info("🛑 Encerrando aplicação...")
    logger.info("=" * 50)


# =============================================
# ROTAS
# =============================================

app.include_router(router, prefix="/api")


# =============================================
# ROTAS DE TESTE
# =============================================

@app.get("/")
async def root():
    return {
        "message": "MVP Field Service API",
        "version": "1.0.0",
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        }
    }


@app.get("/health")
async def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "database": db_status,
            "api": "healthy"
        }
    }