export async function login(email: string, senha: string) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/login?email=${email}&senha=${senha}`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Login inválido");
  }

  return response.json();
}
