import { useState } from "react";
import { login } from "../services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin() {
    try {
      setStatus("Conectando...");

      const data = await login(email, senha);

      setStatus("✅ Login OK");
      console.log("TOKEN:", data.token);
    } catch (err) {
      setStatus("❌ Falha no login");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Login Técnico</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Senha"
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      <br /><br />

      <button onClick={handleLogin}>
        Entrar
      </button>

      <p>{status}</p>
    </div>
  );
}
