import { useEffect, useState } from "react";
import { getOS, iniciarAtendimento } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function TecnicoPage() {
  const [ordens, setOrdens] = useState<any[]>([]);
  const [status, setStatus] = useState("Carregando...");
  const navigate = useNavigate();

  useEffect(() => {
    carregarOS();
  }, []);

  async function carregarOS() {
    try {
      const data = await getOS();
      setOrdens(data);
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("Erro ao carregar OS");
    }
  }

async function iniciar(osId: number) {
  try {
    const data = await iniciarAtendimento(osId);

    console.log("ATENDIMENTO:", data);

    // 🔥 navegação acontece aqui
    navigate(`/atendimento/${data.atendimento_id}`);

  } catch (err) {
    alert("Erro ao iniciar atendimento");
    console.error(err);
  }
}


  return (
    <div style={{ padding: 40 }}>
      <h2>Área do Técnico</h2>

      <button onClick={() => navigate("/historico")}>
  Ver meu histórico
</button>


      {status && <p>{status}</p>}

      {ordens.length === 0 && !status && (
        <p>Nenhuma OS disponível</p>
      )}

      {ordens.map((os) => (
        <div
          key={os.id}
          style={{
            border: "1px solid #ccc",
            padding: 20,
            marginBottom: 10,
          }}
        >
          <h3>{os.cliente}</h3>
          <p>{os.endereco}</p>

          <button onClick={() => iniciar(os.id)}>
            Iniciar Atendimento
          </button>
        </div>
      ))}
    </div>
  );
}
