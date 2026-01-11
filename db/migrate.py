from database import engine
from models import Base

def run_migrations():
    print("📦 Criando tabelas...")
    Base.metadata.create_all(engine)
    print("✅ Banco pronto.")

if __name__ == "__main__":
    run_migrations()
