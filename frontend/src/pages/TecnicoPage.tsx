import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOS, iniciarAtendimento } from "../services/api";

export default function TecnicoPage() {
  const [lista, setLista] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const data = await getOS();
    setLista(data);
  }

  async function iniciar(osId: number) {
    try {
      const resp = await iniciarAtendimento(osId);

      navigate(`/atendimento/${resp.atendimento_id}`);

    } catch {
      alert("⚠️ Você já está em atendimento. Finalize antes de iniciar outro.");
    }
  }

  return (
    <div style={{ padding: 40 }}>

      <h2>Área do Técnico</h2>

      {/* 🔵 BOTÃO HISTÓRICO */}
      <button
        onClick={() => navigate("/historico")}
        style={{
          marginBottom: 20,
          padding: 10,
          background: "#2d6cdf",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        📊 Histórico
      </button>

      {lista.length === 0 && <p>Nenhuma OS aberta.</p>}

      {lista.map((os) => (
        <div
          key={os.id}
          style={{
            border: "1px solid #ccc",
            padding: 15,
            marginBottom: 10,
          }}
        >
          <strong>{os.cliente}</strong>
          <p>{os.endereco}</p>

          <button onClick={() => iniciar(os.id)}>
            Iniciar Atendimento
          </button>
        </div>
      ))}
    </div>
  );
}
