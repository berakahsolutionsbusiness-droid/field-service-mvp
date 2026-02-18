from db.database import SessionLocal
from db.models import Tecnico
from auth import hash_password

db = SessionLocal()

senha_hash = hash_password("1111")

novo = Tecnico(
    nome="romulo",
    email="romulo11@teste.com",
    senha=senha_hash
)

db.add(novo)
db.commit()
db.close()

print("Usuário criado")
