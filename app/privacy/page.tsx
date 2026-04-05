export default function PrivacyPage() {
  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 680, margin: "60px auto", padding: "0 24px", color: "#1a1a1a", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Política de Privacidade</h1>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>Última atualização: abril de 2026</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32 }}>1. Quem somos</h2>
      <p>Este aplicativo é uma ferramenta pessoal de criação e agendamento de conteúdo para redes sociais, desenvolvida e operada por Eric William Bueno.</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32 }}>2. Dados coletados</h2>
      <p>O aplicativo pode acessar as seguintes informações quando você autoriza via OAuth (LinkedIn ou Instagram/Facebook):</p>
      <ul style={{ paddingLeft: 20 }}>
        <li>Nome e foto de perfil público</li>
        <li>Endereço de e-mail (somente leitura)</li>
        <li>Permissão para publicar conteúdo em seu nome</li>
      </ul>
      <p>Nenhum dado é compartilhado com terceiros. Os tokens de acesso são armazenados apenas localmente no seu navegador.</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32 }}>3. Uso dos dados</h2>
      <p>Os dados são usados exclusivamente para:</p>
      <ul style={{ paddingLeft: 20 }}>
        <li>Autenticar sua sessão nas plataformas LinkedIn e Instagram</li>
        <li>Publicar conteúdo aprovado por você nas suas contas pessoais</li>
        <li>Exibir métricas das suas publicações</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32 }}>4. Retenção de dados</h2>
      <p>Não armazenamos dados pessoais em servidores próprios além dos necessários para o funcionamento do app (via Supabase, sob controle do próprio usuário). Os tokens OAuth expiram automaticamente conforme as políticas de cada plataforma.</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32 }}>5. Seus direitos</h2>
      <p>Você pode revogar o acesso do aplicativo a qualquer momento nas configurações de privacidade do LinkedIn ou do Facebook/Instagram. Para solicitar exclusão de dados, acesse <a href="/data-deletion" style={{ color: "#4f46e5" }}>nossa página de exclusão de dados</a>.</p>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32 }}>6. Contato</h2>
      <p>Dúvidas: <a href="mailto:eric@trigodourado.com" style={{ color: "#4f46e5" }}>eric@trigodourado.com</a></p>
    </main>
  );
}
