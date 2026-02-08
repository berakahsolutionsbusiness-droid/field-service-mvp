import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { finalizarAtendimento } from "../services/api";

export default function AtendimentoPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState("");

  async function finalizar() {
    try {
      setStatus("Finalizando...");

      const dados = {
        observacao: descricao,
        latitude: -23.55, // mock GPS
        longitude: -46.63,
        foto: "base64_fake_imagem",
      };

      await finalizarAtendimento(Number(id), dados);

      alert("Atendimento concluído!");

      navigate("/tecnico");
    } catch (err) {
      console.error(err);
      setStatus("Erro ao finalizar");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Execução do Atendimento</h2>

      <textarea
        placeholder="Descrição da atividade..."
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        rows={6}
        style={{ width: "100%" }}
      />

      <br /><br />

      <button onClick={finalizar}>
        Finalizar Atendimento
      </button>

      <p>{status}</p>
    </div>
  );
}
