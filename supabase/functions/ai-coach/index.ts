import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, opportunity, profile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    const profileContext = profile ? `
Perfil do candidato:
- Nome: ${profile.full_name || "Não informado"}
- Anos de experiência total: ${profile.years_experience_total || 0}
- Anos em Produto: ${profile.years_experience_product || 0}
- Background anterior: ${profile.previous_background || "Não informado"}
- Orientação de força: ${profile.strength_orientation || "Não informado"}
- Skills: ${profile.skills?.join(", ") || "Não informados"}
` : "";

    const opportunityContext = opportunity ? `
Oportunidade:
- Empresa: ${opportunity.company_name}
- Cargo: ${opportunity.role_title}
- Senioridade: ${opportunity.seniority_level || "Não especificada"}
- Modelo de trabalho: ${opportunity.work_model || "Não especificado"}
- Localização: ${opportunity.location || "Não especificada"}
- Skills requeridos: ${opportunity.required_skills?.join(", ") || "Não especificados"}
` : "";

    if (type === "cover_letter") {
      systemPrompt = `Você é um coach de carreira especializado em Product Management. Seu papel é dar dicas e sugestões para ajudar candidatos a escreverem cover letters impactantes. NÃO escreva a cover letter - dê dicas práticas e acionáveis. Responda em português brasileiro de forma concisa.`;
      
      userPrompt = `${profileContext}
${opportunityContext}

Com base no perfil do candidato e na oportunidade, dê 4-5 dicas específicas e práticas para escrever uma cover letter impactante para esta vaga. Foque em:
1. Como destacar experiências relevantes
2. Como conectar o background com a vaga
3. Pontos específicos para mencionar sobre a empresa
4. Como demonstrar fit cultural
5. Erros a evitar

Seja direto e prático nas dicas.`;
    } else if (type === "cv_highlights") {
      systemPrompt = `Você é um coach de carreira especializado em Product Management. Seu papel é dar dicas para destacar experiências no CV. NÃO reescreva o CV - dê sugestões práticas. Responda em português brasileiro de forma concisa.`;
      
      userPrompt = `${profileContext}
${opportunityContext}

Com base no perfil do candidato e nos requisitos da vaga, sugira:
1. Quais experiências devem ser priorizadas/destacadas
2. Métricas e resultados que devem ser mencionados
3. Keywords importantes para incluir
4. Como posicionar a transição de carreira (se aplicável)
5. Seções que merecem mais atenção

Seja específico e prático.`;
    } else if (type === "company_intel") {
      systemPrompt = `Você é um coach de carreira com conhecimento sobre empresas de tecnologia. Ajude candidatos a se prepararem para processos seletivos. Responda em português brasileiro de forma concisa.`;
      
      userPrompt = `${opportunityContext}

Forneça insights sobre:
1. O que geralmente empresas deste tipo (${opportunity?.company_name}) buscam em PMs
2. Perguntas comuns em entrevistas para este tipo de vaga
3. Pontos para pesquisar sobre a empresa antes da entrevista
4. Como se preparar para o processo seletivo
5. Red flags e green flags durante o processo

Seja prático e acionável.`;
    } else {
      throw new Error("Invalid coaching type");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro no serviço de AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Não foi possível gerar sugestões.";

    return new Response(JSON.stringify({ suggestions: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Coach error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
