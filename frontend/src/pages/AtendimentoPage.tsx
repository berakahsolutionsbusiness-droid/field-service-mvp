import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getAtendimentoAtivo,
  salvarEtapa,
  getEtapas,
} from "../services/api";

const etapas = [
  "INSPECAO",
  "DIAGNOSTICO",
  "ORCAMENTO",
  "APROVACAO",
  "EXECUCAO",
  "FINALIZACAO",
];

export default function AtendimentoPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [etapaAtual, setEtapaAtual] = useState("");
  const [descricao, setDescricao] = useState("");
  const [foto, setFoto] = useState("");
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // CARREGAR ATENDIMENTO
  // =========================

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const ativo = await getAtendimentoAtivo();

      if (!ativo) {
        navigate("/tecnico");
        return;
      }

      setEtapaAtual(ativo.etapa);

      await carregarHistorico();

    } catch {
      alert("Erro ao carregar atendimento");
      navigate("/tecnico");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // HISTÓRICO
  // =========================

  async function carregarHistorico() {
    try {
      const data = await getEtapas(Number(id));
      setHistorico(data);
    } catch {
      console.warn("Erro histórico etapas");
    }
  }

  // =========================
  // FOTO → BASE64
  // =========================

  function handleFoto(e: any) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setFoto(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  // =========================
  // SALVAR ETAPA
  // =========================

  async function salvar() {
    if (!etapaAtual) return;

    try {
      await salvarEtapa(Number(id), {
        etapa: etapaAtual,
        descricao,
        foto,
      });

      alert("Etapa salva");

      setDescricao("");
      setFoto("");

      await carregarHistorico();

    } catch {
      alert("Erro ao salvar etapa");
    }
  }

  // =========================
  // AVANÇAR ETAPA
  // =========================

  function avancar() {
    const index = etapas.indexOf(etapaAtual);
    const proxima = etapas[index + 1];

    if (!proxima) {
      alert("Atendimento concluído!");
      navigate("/tecnico");
      return;
    }

    setEtapaAtual(proxima);
  }

  // =========================
  // LOADING
  // =========================

  if (loading) return <p style={{ padding: 40 }}>Carregando...</p>;

  // =========================
  // UI
  // =========================

  return (
    <div style={{ padding: 40 }}>

      <h2>Fluxo de Atendimento</h2>

      {/* timeline */}
      {etapas.map((e, i) => (
        <div key={i}>
          {e === etapaAtual
            ? `⏳ ${e}`
            : etapas.indexOf(e) < etapas.indexOf(etapaAtual)
            ? `✔ ${e}`
            : `⬜ ${e}`}
        </div>
      ))}

      <hr />

      <h3>Registrar etapa</h3>

      <textarea
        placeholder="Descrição da etapa..."
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        rows={4}
        style={{ width: "100%" }}
      />

      <br /><br />

      <input type="file" onChange={handleFoto} />

      <br /><br />

      <button onClick={salvar}>
        💾 Salvar etapa
      </button>

      <button
        style={{ marginLeft: 10 }}
        onClick={avancar}
      >
        ▶ Avançar etapa
      </button>

      <hr />

      <h3>Histórico</h3>

      {historico.length === 0 && <p>Sem registros</p>}

      {historico.map((r, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <strong>{r.etapa}</strong>
          <p>{r.descricao}</p>

          {r.foto && (
            <img
              src={r.foto}
              width={200}
              alt="foto"
            />
          )}
        </div>
      ))}

      <br />

      <button onClick={() => navigate("/tecnico")}>
        ← Voltar
      </button>

    </div>
  );
}
