import { useEffect, useState } from "react";
import { getHistorico } from "../services/api";

export default function HistoricoPage() {
  const [dados, setDados] = useState<any>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const data = await getHistorico();
    setDados(data);
  }

  if (!dados) return <p>Carregando...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h2>Histórico do Técnico</h2>

      {dados.historico.map((item: any, i: number) => (
        <div key={i} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
          <strong>{item.os}</strong>
          <p>Horas: {item.horas}</p>
        </div>
      ))}

      <hr />

      <h3>Total horas: {dados.total_horas}</h3>
      <h3>💰 Previsão: R$ {dados.previsao_pagamento}</h3>
    </div>
  );
}
