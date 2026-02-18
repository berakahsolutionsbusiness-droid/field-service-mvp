// HistoricoPage.tsx
import { useEffect, useState } from "react";
import { getHistorico, AtendimentoHistorico } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<AtendimentoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function carregarHistorico() {
    setCarregando(true);
    setErro(null);
    
    try {
      console.log("📊 Carregando histórico...");
      
      const dados = await getHistorico();
      console.log("📦 Dados recebidos:", dados);
      
      setHistorico(dados);
      
    } catch (error: any) {
      console.error("❌ Erro ao carregar histórico:", error);
      setErro(error.message || "Erro ao carregar histórico");
      setHistorico([]);
    } finally {
      setCarregando(false);
    }
  }

  function formatarData(dataStr: string | null | undefined): string {
    if (!dataStr) return "Data não disponível";
    
    try {
      const data = new Date(dataStr);
      if (isNaN(data.getTime())) return dataStr;
      
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dataStr;
    }
  }

  function getStatusBadge(status: string = "em_andamento") {
    const styles: Record<string, { bg: string; color: string; text: string }> = {
      concluido: { bg: "#d4edda", color: "#155724", text: "Concluído" },
      em_andamento: { bg: "#fff3cd", color: "#856404", text: "Em Andamento" },
      cancelado: { bg: "#f8d7da", color: "#721c24", text: "Cancelado" }
    };
    
    const style = styles[status] || styles.em_andamento;
    
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "bold",
        display: "inline-block"
      }}>
        {style.text}
      </span>
    );
  }

  function toggleExpandir(id: number) {
    setExpandido(expandido === id ? null : id);
  }

  function voltar() {
    navigate("/tecnico");
  }

  if (carregando) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh"
      }}>
        <div style={{ 
          fontSize: 48, 
          marginBottom: 20,
          animation: "spin 1s linear infinite"
        }}>⏳</div>
        <h3>Carregando histórico...</h3>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      {/* Cabeçalho */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 30,
        flexWrap: "wrap",
        gap: 15
      }}>
        <div>
          <h1 style={{ margin: 0, color: "#2c3e50" }}>
            📜 Histórico de Atendimentos
          </h1>
          <p style={{ color: "#7f8c8d", marginTop: 5 }}>
            {historico.length} {historico.length === 1 ? "atendimento encontrado" : "atendimentos encontrados"}
          </p>
        </div>
        
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={voltar}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>←</span>
            Voltar
          </button>
          
          <button
            onClick={carregarHistorico}
            style={{
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>🔄</span>
            Atualizar
          </button>
        </div>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div style={{
          backgroundColor: "#f8d7da",
          color: "#721c24",
          padding: 15,
          borderRadius: 8,
          marginBottom: 20,
          border: "1px solid #f5c6cb"
        }}>
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {/* Lista de atendimentos */}
      {historico.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: 60,
          backgroundColor: "#f8f9fa",
          borderRadius: 12,
          border: "2px dashed #dee2e6"
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📭</div>
          <h3 style={{ color: "#6c757d", marginBottom: 10 }}>
            Nenhum atendimento encontrado
          </h3>
          <p style={{ color: "#adb5bd", marginBottom: 20 }}>
            Você ainda não realizou nenhum atendimento.
          </p>
          <button
            onClick={voltar}
            style={{
              padding: "12px 24px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold"
            }}
          >
            Iniciar Primeiro Atendimento
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {historico.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #dee2e6",
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
              }}
            >
              {/* Cabeçalho do atendimento */}
              <div
                onClick={() => toggleExpandir(item.id)}
                style={{
                  padding: 20,
                  backgroundColor: "#f8f9fa",
                  cursor: "pointer",
                  borderBottom: expandido === item.id ? "1px solid #dee2e6" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 15
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                  <span style={{ fontSize: 24 }}>
                    {item.status === "concluido" ? "✅" : "🔄"}
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, color: "#2c3e50" }}>
                      {item.cliente || "Cliente não identificado"}
                    </h3>
                    <p style={{ margin: "5px 0 0 0", color: "#6c757d", fontSize: 14 }}>
                      OS #{item.os_id} • {item.endereco || "Endereço não informado"}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                  {getStatusBadge(item.status)}
                  <span style={{ fontSize: 20, color: "#6c757d" }}>
                    {expandido === item.id ? "▼" : "▶"}
                  </span>
                </div>
              </div>

              {/* Detalhes expandidos */}
              {expandido === item.id && (
                <div style={{ padding: 20 }}>
                  {/* Informações gerais */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 15,
                    marginBottom: 20,
                    padding: 15,
                    backgroundColor: "#f8f9fa",
                    borderRadius: 8
                  }}>
                    <div>
                      <strong>Início:</strong>
                      <p style={{ margin: "5px 0 0 0" }}>
                        {formatarData(item.hora_inicio)}
                      </p>
                    </div>
                    
                    {item.hora_fim && (
                      <div>
                        <strong>Término:</strong>
                        <p style={{ margin: "5px 0 0 0" }}>
                          {formatarData(item.hora_fim)}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <strong>Etapa atual:</strong>
                      <p style={{ margin: "5px 0 0 0" }}>
                        {item.etapa_atual || "N/A"}
                      </p>
                    </div>
                    
                    <div>
                      <strong>Total de etapas:</strong>
                      <p style={{ margin: "5px 0 0 0" }}>
                        {item.etapas?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Timeline de etapas */}
                  {item.etapas && item.etapas.length > 0 ? (
                    <div>
                      <h4 style={{ marginBottom: 15, color: "#2c3e50" }}>
                        📋 Etapas realizadas
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {item.etapas.map((etapa, index) => (
                          <div
                            key={etapa.id}
                            style={{
                              display: "flex",
                              gap: 15,
                              padding: 15,
                              backgroundColor: index % 2 === 0 ? "#fff" : "#fafafa",
                              borderRadius: 8,
                              borderLeft: "4px solid #3498db"
                            }}
                          >
                            <div style={{ minWidth: 120 }}>
                              <strong>{etapa.etapa || "Etapa"}</strong>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, color: "#2c3e50" }}>
                                {etapa.descricao || "Sem descrição"}
                              </p>
                              <small style={{ color: "#95a5a6" }}>
                                {formatarData(etapa.criado_em)}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p style={{ 
                      color: "#95a5a6", 
                      textAlign: "center", 
                      padding: 20,
                      backgroundColor: "#f8f9fa",
                      borderRadius: 8
                    }}>
                      Nenhuma etapa registrada para este atendimento
                    </p>
                  )}

                  {/* Botão ver detalhes */}
                  <div style={{ 
                    marginTop: 20, 
                    display: "flex", 
                    gap: 10,
                    justifyContent: "flex-end"
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/atendimento/${item.id}`);
                      }}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#3498db",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <span>🔍</span>
                      Ver Detalhes
                    </button>
                    
                    {item.status === "em_andamento" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/atendimento/${item.id}`);
                        }}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <span>▶</span>
                        Continuar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}