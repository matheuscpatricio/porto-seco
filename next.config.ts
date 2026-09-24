import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Chrome abre o dev server pelo host do preview (*.agent.cvm.dev).
  // Sem isso o Next responde 403 nos arquivos /_next e a página fica só com o fundo escuro.
  allowedDevOrigins: ["127.0.0.1", "localhost", "**.agent.cvm.dev"],
};

export default nextConfig;
