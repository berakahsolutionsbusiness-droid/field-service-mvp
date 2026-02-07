import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOS, iniciarOS } from "../services/api";

export default function TecnicoPage() {
  const [osList, setOsList] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  const navigate = useNavigate();

  // carregar OS
  async function carregarOS() {
    try {
      const data = await getOS();
      setOsList(data);
    } catch {
      setStatus("Erro ao carregar OS");
    }
  }

  useEffect(() => {
    carregarOS();
  }, []);

  // aceitar OS
  async function aceitar(osId: number) {
    try {
      setStatus("Iniciando atendimento...");

      const res = await iniciarOS(osId);

      // 👉 vai para tela de atendimento
      navigate(`/atendimento/${res.atendimento_id}`);
    } catch {
      setStatus("Erro ao iniciar atendimento");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Área do Técnico</h2>

      {osList.map((os) => (
        <div
          key={os.id}
          style={{
            border: "1px solid #ccc",
            padding: 15,
            marginBottom: 10,
          }}
        >
          <b>Cliente:</b> {os.cliente} <br />
          <b>Endereço:</b> {os.endereco} <br /><br />

          {/* 👉 BOTÃO AQUI */}
          <button onClick={() => aceitar(os.id)}>
            Aceitar Atendimento
          </button>
        </div>
      ))}

      <p>{status}</p>
    </div>
  );
}
