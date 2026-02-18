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

# =============================================
# CONFIGURAÇÃO DE LOGGING
# =============================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Log no console
        # logging.FileHandler('app.log')  # Opcional: log em arquivo
    ]
)
logger = logging.getLogger(__name__)

# =============================================
# INICIALIZAÇÃO DO FASTAPI
# =============================================

app = FastAPI(
    title="MVP Field Service API",
    description="API para gerenciamento de ordens de serviço e atendimentos",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc UI
)

# =============================================
# CONFIGURAÇÃO CORS
# =============================================

# Lista de origens permitidas (adicione mais conforme necessário)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Adicione aqui o domínio de produção quando tiver
    # "https://seu-dominio.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests por 1 hora
)

# =============================================
# FUNÇÕES DE VERIFICAÇÃO DO BANCO DE DADOS
# =============================================

def verificar_conexao_banco():
    """Verifica se a conexão com o banco está funcionando"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("✅ Conexão com banco de dados OK")
            return True
    except Exception as e:
        logger.error(f"❌ Erro de conexão com banco: {e}")
        return False

def verificar_e_criar_tabelas():
    """Verifica se as tabelas existem e cria se necessário"""
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
    """Verifica e corrige os enums do banco de dados"""
    logger.info("🔧 Verificando enums...")
    
    with engine.connect() as conn:
        # Inicia transação
        conn.execute(text("BEGIN"))
        
        try:
            # =========================================
            # VERIFICA ENUM STATUSOS
            # =========================================
            logger.info("  Verificando enum 'statusos'...")
            
            # Verifica se o enum existe
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
                # Valores necessários para statusos
                valores_statusos = ['AGUARDANDO', 'EM_CAMPO', 'CONCLUIDA']
                
                for valor in valores_statusos:
                    try:
                        conn.execute(text(f"ALTER TYPE statusos ADD VALUE IF NOT EXISTS '{valor}'"))
                        logger.info(f"    ✅ '{valor}' adicionado/verificado")
                    except Exception as e:
                        logger.warning(f"    ⚠️  '{valor}': {e}")
            
            # =========================================
            # VERIFICA ENUM ETAPA
            # =========================================
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
                # Verifica se todos os valores existem
                valores_etapa = ['INSPECAO', 'DIAGNOSTICO', 'ORCAMENTO', 'APROVACAO', 'EXECUCAO', 'FINALIZACAO']
                
                for valor in valores_etapa:
                    try:
                        conn.execute(text(f"ALTER TYPE etapa ADD VALUE IF NOT EXISTS '{valor}'"))
                        logger.info(f"    ✅ '{valor}' adicionado/verificado")
                    except Exception as e:
                        logger.warning(f"    ⚠️  '{valor}': {e}")
            
            # Commit das alterações
            conn.execute(text("COMMIT"))
            
            # =========================================
            # MOSTRA RESULTADO FINAL
            # =========================================
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
    """Cria índices para melhor performance"""
    logger.info("📊 Verificando índices...")
    
    indices = [
        {
            "nome": "idx_os_status",
            "sql": "CREATE INDEX IF NOT EXISTS idx_os_status ON os(status)"
        },
        {
            "nome": "idx_os_tecnico",
            "sql": "CREATE INDEX IF NOT EXISTS idx_os_tecnico ON os(tecnico_id)"
        },
        {
            "nome": "idx_atendimento_tecnico",
            "sql": "CREATE INDEX IF NOT EXISTS idx_atendimento_tecnico ON atendimento(tecnico_id)"
        },
        {
            "nome": "idx_atendimento_os",
            "sql": "CREATE INDEX IF NOT EXISTS idx_atendimento_os ON atendimento(os_id)"
        },
        {
            "nome": "idx_atendimento_ativo",
            "sql": "CREATE INDEX IF NOT EXISTS idx_atendimento_ativo ON atendimento(tecnico_id) WHERE hora_fim IS NULL"
        },
        {
            "nome": "idx_historico_atendimento",
            "sql": "CREATE INDEX IF NOT EXISTS idx_historico_atendimento ON etapa_historico(atendimento_id)"
        },
        {
            "nome": "idx_tecnico_email",
            "sql": "CREATE INDEX IF NOT EXISTS idx_tecnico_email ON tecnico(email)"
        }
    ]
    
    with engine.connect() as conn:
        for idx in indices:
            try:
                conn.execute(text(idx["sql"]))
                logger.info(f"  ✅ Índice '{idx['nome']}' OK")
            except Exception as e:
                logger.warning(f"  ⚠️  Erro ao criar índice '{idx['nome']}': {e}")
        
        conn.commit()
    
    return True

def verificar_tecnico_admin():
    """Verifica se existe pelo menos um técnico admin"""
    from sqlalchemy.orm import Session
    from app.db.models import Tecnico
    from app.auth import hash_password
    
    db = Session(engine)
    
    try:
        # Verifica se existe algum técnico
        tecnico = db.query(Tecnico).first()
        
        if not tecnico:
            logger.warning("⚠️  Nenhum técnico encontrado. Criando técnico padrão...")
            
            admin = Tecnico(
                nome="Administrador",
                email="admin@sistema.com",
                senha=hash_password("admin123"),
                ativo=True
            )
            db.add(admin)
            db.commit()
            
            logger.info("  ✅ Técnico admin criado:")
            logger.info("     Email: admin@sistema.com")
            logger.info("     Senha: admin123")
            logger.info("  ⚠️  ALTERE A SENHA EM PRODUÇÃO!")
        else:
            logger.info(f"  ✅ Técnicos encontrados: {db.query(Tecnico).count()}")
            
    except Exception as e:
        logger.error(f"  ❌ Erro ao verificar técnico admin: {e}")
    finally:
        db.close()

# =============================================
# EVENTO DE STARTUP
# =============================================

@app.on_event("startup")
async def startup_event():
    """Executado quando a aplicação inicia"""
    logger.info("=" * 50)
    logger.info("🚀 INICIANDO MVP FIELD SERVICE API")
    logger.info("=" * 50)
    
    # 1. Verifica conexão com banco
    if not verificar_conexao_banco():
        logger.error("❌ Falha na conexão com banco. Aplicação não pode iniciar.")
        return
    
    # 2. Verifica e cria tabelas se necessário
    verificar_e_criar_tabelas()
    
    # 3. Verifica e corrige enums
    verificar_e_corrigir_enums()
    
    # 4. Cria índices
    criar_indices()
    
    # 5. Verifica técnico admin
    verificar_tecnico_admin()
    
    logger.info("=" * 50)
    logger.info("✅ APLICAÇÃO PRONTA!")
    logger.info(f"📅 Iniciada em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info(f"📚 Documentação: http://localhost:8000/docs")
    logger.info(f"📖 ReDoc: http://localhost:8000/redoc")
    logger.info("=" * 50)

# =============================================
# EVENTO DE SHUTDOWN
# =============================================

@app.on_event("shutdown")
async def shutdown_event():
    """Executado quando a aplicação é encerrada"""
    logger.info("=" * 50)
    logger.info("🛑 Encerrando aplicação...")
    logger.info(f"📅 Finalizada em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info("=" * 50)

# =============================================
# ROTAS
# =============================================

# Inclui as rotas da aplicação
app.include_router(router, prefix="/api")

# =============================================
# ROTAS DE TESTE/HEALTH CHECK
# =============================================

@app.get("/")
async def root():
    """Rota raiz para verificar se API está funcionando"""
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
    """Health check para monitoramento"""
    try:
        # Verifica banco de dados
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

@app.get("/api/status")
async def api_status():
    """Status detalhado da API"""
    from sqlalchemy import inspect
    
    inspector = inspect(engine)
    tabelas = inspector.get_table_names()
    
    with engine.connect() as conn:
        # Conta registros
        stats = {}
        for tabela in tabelas:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {tabela}"))
            stats[tabela] = result.scalar()
    
    return {
        "app_name": "MVP Field Service API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "database": {
            "tables": tabelas,
            "records": stats
        },
        "enums": {
            "statusos": [e.value for e in StatusOS] if 'StatusOS' in globals() else [],
            "etapa": [e.value for e in Etapa] if 'Etapa' in globals() else []
        },
        "timestamp": datetime.now().isoformat()
    }

# =============================================
# TRATAMENTO DE ERROS
# =============================================

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Erro interno: {exc}")
    return {
        "detail": "Erro interno do servidor",
        "timestamp": datetime.now().isoformat()
    }

# Importa os enums para o status
from app.db.models import StatusOS, Etapa

# =============================================
# FIM DO ARQUIVO
# =============================================