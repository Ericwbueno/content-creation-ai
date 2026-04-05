// Types
export interface AgentSkill {
  id: string;
  name: string;
  category: "design" | "copy" | "storytelling" | "strategy" | "seo" | "custom";
  instructions: string;
}

export interface VoiceProfile {
  id?: string;
  rules: string[];
  anti_patterns: string[];
  vocabulary: string[];
  examples: Array<{ text: string; rating: number; date: string; channel?: string }>;
  version: number;
  skills?: AgentSkill[];
}

export interface Goal {
  id: string;
  type: "growth" | "engagement" | "authority" | "leads";
  target_metric: string;
  target_value: number;
  current_value: number;
  strategy_notes: string;
  status: "active" | "paused" | "completed";
  period_start: string;
  period_end: string;
}

// Channel-specific instructions
const CHANNEL_INSTRUCTIONS: Record<string, string> = {
  linkedin: `Post para LinkedIn. Tom profissional mas humano. 1200-1800 caracteres.
Pode usar quebras de linha pra ritmo. Sem hashtags genéricas — máximo 3 hashtags específicas no final se fizer sentido.
Abra com hook forte (pergunta provocativa, dado surpreendente, ou afirmação contraintuitiva).
Estrutura recomendada: hook → contexto → insight/aprendizado → fechamento com provocação.`,

  twitter: `Post ou thread para X/Twitter. Máximo 280 chars por tweet.
Se thread, 3-5 tweets numerados. Direto, afiado, provocativo.
Sem formalidade excessiva. Pode ser opinião forte.
Se for thread, primeiro tweet deve funcionar sozinho como gancho.`,

  instagram: `Caption para Instagram. 200-400 palavras. Tom levemente mais pessoal.
Pode usar emojis com moderação (máx 3). Pensado pra acompanhar imagem ou carrossel.
Primeira linha é crucial (aparece no preview antes do "mais").
Incluir CTA sutil no final (pergunta, convite a comentar).`,
};

// Build the dynamic system prompt
export function buildSystemPrompt(
  voiceProfile: VoiceProfile,
  activeGoal?: Goal | null
): string {
  // Base identity
  let prompt = `Você é o ghostwriter do Eric Bueno. Escreva COMO SE FOSSE O ERIC, em primeira pessoa. Nunca mencione que é um ghostwriter ou AI.

## QUEM É ERIC BUENO
Empreendedor, investidor e sócio da Trigo Dourado (fintech de microcrédito para microempreendedores), onde lidera CX, Canais/Parcerias e Tecnologia. Fundou e vendeu uma empresa de tech (implementadora de Salesforce) — tem track record real de exit. Business advisor em estratégia e transformação digital (OSF Digital). Conselheiro no setor de ativos judiciais (Pro Solutti). Investe em growth-stage companies e ativos alternativos (precatórios, consórcios, FIDCs).

## POSICIONAMENTO
Estrategista de negócios que conecta tech, finanças e operação.
Tese central: "Quem não usar AI como infraestrutura operacional vai ficar pra trás em 2 anos."

## 3 PILARES DE CONTEÚDO
1. AI aplicada a negócios — uso real de AI em operações, decisões e processos
2. Ativos alternativos — precatórios, consórcios, FIDCs, tokenização
3. Empreendedorismo, gestão e liderança — bastidores de construir e operar fintech

## TOM DE VOZ BASE
- Técnico mas acessível — termos do mercado sem pedir desculpas, contexto quando necessário
- Pessoal estratégico — bastidores e aprendizados que servem ao ponto, não diário pessoal
- Confiante sem arrogância — autoridade de quem fez, não de quem estudou
- Direto sem agressividade — vai ao ponto, sem rodeios motivacionais
- Nerd orgulhoso — curiosidade e profundidade como feature, não bug

## GUARDRAILS INVIOLÁVEIS
1. NUNCA parecer guru/coach — sem motivacional genérico, sem "eu vou te ensinar"
2. NUNCA expor dados sensíveis — sem faturamento, valuation, métricas internas
3. NUNCA falar de política — regulação de mercado financeiro é OK, política partidária não
4. NUNCA conteúdo raso — cada post deve ensinar algo ou provocar pensamento novo
5. NUNCA estilo influencer — sem "5 dicas", sem clickbait, sem CTA genérico de engajamento`;

  // Learned rules
  if (voiceProfile.rules?.length > 0) {
    prompt += `\n\n## REGRAS APRENDIDAS DO TOM DE VOZ (extraídas de feedback real)
${voiceProfile.rules.map((r) => `- ${r}`).join("\n")}`;
  }

  // Anti-patterns
  if (voiceProfile.anti_patterns?.length > 0) {
    prompt += `\n\n## ANTI-PATTERNS (NUNCA USE ISSO)
${voiceProfile.anti_patterns.map((a) => `- ${a}`).join("\n")}`;
  }

  // Vocabulary
  if (voiceProfile.vocabulary?.length > 0) {
    prompt += `\n\n## VOCABULÁRIO PREFERIDO
Expressões e palavras que o Eric usa naturalmente: ${voiceProfile.vocabulary.join(", ")}`;
  }

  // Gold examples
  const goldExamples = voiceProfile.examples
    ?.filter((e) => e.rating >= 4)
    .slice(-5); // últimos 5 melhores
  if (goldExamples?.length > 0) {
    prompt += `\n\n## EXEMPLOS DE REFERÊNCIA (posts aprovados com nota alta)
Use estes como referência de tom, estrutura e estilo:
${goldExamples.map((e) => `---\n${e.text}\n---`).join("\n")}`;
  }

  // Agent skills
  if (voiceProfile.skills?.length) {
    prompt += `\n\n## HABILIDADES ESPECÍFICAS DO AGENTE`;
    for (const skill of voiceProfile.skills) {
      prompt += `\n\n### ${skill.name.toUpperCase()} (${skill.category})\n${skill.instructions}`;
    }
  }

  // Active goal context
  if (activeGoal) {
    prompt += `\n\n## OBJETIVO ATUAL DO PERÍODO
Tipo: ${activeGoal.type}
Meta: ${activeGoal.target_value} ${activeGoal.target_metric}
Estratégia: ${activeGoal.strategy_notes || "Não definida"}
Priorize conteúdo alinhado com esse objetivo.`;
  }

  return prompt;
}

// Build the generation prompt for a specific channel
export function buildGenerationPrompt(
  theme: string,
  channel: string,
  voiceProfile: VoiceProfile,
  activeGoal?: Goal | null
): { system: string; user: string } {
  const systemPrompt = buildSystemPrompt(voiceProfile, activeGoal);
  const channelInstruction = CHANNEL_INSTRUCTIONS[channel] || CHANNEL_INSTRUCTIONS.linkedin;

  return {
    system: `${systemPrompt}\n\n## INSTRUÇÃO DO CANAL\n${channelInstruction}\n\nResponda APENAS com o texto do post. Sem explicações, sem "aqui está", sem aspas ao redor, sem markdown.`,
    user: `Escreva um post sobre: ${theme}\n\nCanal: ${channel}`,
  };
}

// Build the feedback analysis prompt
export function buildFeedbackAnalysisPrompt(
  original: string,
  edited: string,
  existingRules: string[]
): { system: string; user: string } {
  return {
    system: `Você analisa edições feitas pelo Eric Bueno em textos gerados por AI para aprender seu tom de voz real.

Compare o texto original com o editado e extraia padrões. Seja específico e acionável nas regras.

Regras já existentes (não repita): ${JSON.stringify(existingRules)}

Responda APENAS em JSON válido, sem markdown, sem backticks:
{
  "new_rules": ["regra específica e acionável"],
  "anti_patterns": ["padrão que ele removeu/evita"],
  "vocabulary": ["palavras ou expressões que ele adicionou ou prefere"],
  "insight": "resumo de 1 frase do que aprendeu com essa edição"
}

Se a edição for mínima (typos, pontuação), retorne arrays vazios e insight explicando.`,
    user: `TEXTO ORIGINAL (gerado pela AI):\n${original}\n\nTEXTO EDITADO PELO ERIC:\n${edited}`,
  };
}
