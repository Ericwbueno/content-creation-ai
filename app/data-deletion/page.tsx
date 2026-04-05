export default function DataDeletionPage() {
  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 680, margin: "60px auto", padding: "0 24px", color: "#1a1a1a", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Exclusão de Dados do Usuário</h1>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>Última atualização: abril de 2026</p>

      <p>Este aplicativo é uma ferramenta pessoal de uso do próprio desenvolvedor e não armazena dados pessoais de terceiros em servidores próprios.</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32 }}>Como revogar acesso</h2>
      <p>Se você autorizou este aplicativo via Facebook/Instagram ou LinkedIn e deseja remover o acesso:</p>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24 }}>Facebook / Instagram</h3>
      <ol style={{ paddingLeft: 20 }}>
        <li>Acesse <a href="https://www.facebook.com/settings?tab=applications" target="_blank" rel="noopener" style={{ color: "#4f46e5" }}>Configurações → Aplicativos e Sites</a> no Facebook</li>
        <li>Encontre este aplicativo na lista</li>
        <li>Clique em "Remover" para revogar todos os acessos e deletar os dados associados</li>
      </ol>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24 }}>LinkedIn</h3>
      <ol style={{ paddingLeft: 20 }}>
        <li>Acesse <a href="https://www.linkedin.com/psettings/permitted-services" target="_blank" rel="noopener" style={{ color: "#4f46e5" }}>Configurações → Privacidade → Serviços permitidos</a></li>
        <li>Encontre este aplicativo e clique em "Remover"</li>
      </ol>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32 }}>Dados locais</h2>
      <p>Tokens de acesso e conteúdos são armazenados no banco Supabase sob controle exclusivo do proprietário do app. Não há dados de terceiros armazenados.</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32 }}>Contato</h2>
      <p>Para solicitações adicionais de exclusão de dados, entre em contato: <a href="mailto:eric@trigodourado.com" style={{ color: "#4f46e5" }}>eric@trigodourado.com</a></p>
    </main>
  );
}
