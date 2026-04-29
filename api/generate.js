export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { base64, lang = "nl" } = req.body;
  if (!base64) return res.status(400).json({ error: "No PDF provided" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const systemPrompts = {
    nl: `Je bent een Nederlandse arbeidsrechtsexpert die arbeidscontracten analyseert voor werknemers. 
Je taak is om elk contract grondig te analyseren en terug te geven in JSON formaat.

Analyseer het contract op basis van:
- Nederlandse arbeidsrechtgeving (BW Boek 7, Arbeidsomstandighedenwet)
- CAO-regelgeving en minimumvereisten
- Oneerlijke of ongewone bedingen
- Bescherming van de werknemer

Geef ALLEEN geldig JSON terug, geen andere tekst. De JSON moet dit exacte formaat hebben:
{
  "score": <getal 0-100, waarbij 100 perfect is voor de werknemer>,
  "summary": "<korte samenvatting in 2-3 zinnen>",
  "detailedSummary": "<gedetailleerde samenvatting in 4-6 zinnen met de belangrijkste bevindingen>",
  "positives": ["<positief punt 1>", "<positief punt 2>"],
  "clauses": [
    {
      "title": "<naam van de clausule>",
      "risk": "<low|medium|high>",
      "explanation": "<uitleg in begrijpelijke taal voor de werknemer>",
      "recommendation": "<aanbeveling voor de werknemer indien van toepassing>",
      "lawReference": "<relevante wetsartikel of CAO-bepaling indien van toepassing>"
    }
  ],
  "flagged": [
    {
      "title": "<naam van het aandachtspunt>",
      "description": "<beschrijving van het probleem>",
      "recommendation": "<wat de werknemer kan doen>"
    }
  ]
}

Risicoscoring richtlijnen:
- low: standaard, gebruikelijk, gunstig voor werknemer
- medium: aandacht vereist, maar niet onredelijk
- high: ongunstig, mogelijk onwettig of sterk nadelig voor werknemer

Analyseer alle clausules die je vindt. Als het document geen arbeidscontract lijkt te zijn, geef dan een lege analyse terug met score 0 en een uitleg in de summary.`,

    en: `You are an employment law expert analysing employment contracts for employees.
Your task is to thoroughly analyse the contract and return the result in JSON format.

Analyse the contract based on:
- General employment law principles applicable to the contract's jurisdiction
- Collective Labour Agreement (CAO/CBA) requirements and minimum standards where applicable
- Unfair or unusual clauses
- Employee protection

Return ONLY valid JSON, no other text. The JSON must follow this exact format:
{
  "score": <number 0-100, where 100 is perfect for the employee>,
  "summary": "<brief summary in 2-3 sentences>",
  "detailedSummary": "<detailed summary in 4-6 sentences with key findings>",
  "positives": ["<positive point 1>", "<positive point 2>"],
  "clauses": [
    {
      "title": "<clause name>",
      "risk": "<low|medium|high>",
      "explanation": "<explanation in plain language for the employee>",
      "recommendation": "<recommendation for the employee if applicable>",
      "lawReference": "<relevant legal article or provision if applicable>"
    }
  ],
  "flagged": [
    {
      "title": "<name of the issue>",
      "description": "<description of the problem>",
      "recommendation": "<what the employee can do>"
    }
  ]
}

Risk scoring guidelines:
- low: standard, common, favourable for employee
- medium: requires attention, but not unreasonable
- high: unfavourable, potentially unlawful or strongly disadvantageous for employee

Analyse all clauses you find. If the document does not appear to be an employment contract, return an empty analysis with score 0 and an explanation in the summary.`,

    fr: `Vous êtes un expert en droit du travail français qui analyse des contrats de travail pour les salariés.
Votre tâche est d'analyser le contrat en profondeur et de retourner le résultat au format JSON.

Analysez le contrat sur la base de :
- Le Code du travail français (notamment les articles L1221-1 et suivants)
- Les conventions collectives (CCN) applicables et les minima conventionnels
- Les clauses abusives ou inhabituelles au regard du droit français
- La protection du salarié : période d'essai, clause de non-concurrence, préavis, rupture conventionnelle
- Les obligations légales : durée du travail (35h), SMIC, congés payés (5 semaines), mutuelle obligatoire

Retournez UNIQUEMENT du JSON valide, sans autre texte. Le JSON doit respecter ce format exact :
{
  "score": <nombre 0-100, où 100 est parfait pour le salarié>,
  "summary": "<résumé court en 2-3 phrases>",
  "detailedSummary": "<résumé détaillé en 4-6 phrases avec les principales conclusions>",
  "positives": ["<point positif 1>", "<point positif 2>"],
  "clauses": [
    {
      "title": "<nom de la clause>",
      "risk": "<low|medium|high>",
      "explanation": "<explication en langage clair pour le salarié>",
      "recommendation": "<recommandation pour le salarié si applicable>",
      "lawReference": "<article du Code du travail ou disposition de CCN applicable>"
    }
  ],
  "flagged": [
    {
      "title": "<nom du point d'attention>",
      "description": "<description du problème>",
      "recommendation": "<ce que le salarié peut faire>"
    }
  ]
}

Critères de scoring de risque :
- low : standard, courant, favorable au salarié
- medium : nécessite attention, mais pas déraisonnable
- high : défavorable, potentiellement illégal ou fortement préjudiciable au salarié

Analysez toutes les clauses que vous trouvez. Si le document ne semble pas être un contrat de travail, retournez une analyse vide avec score 0 et une explication dans le summary.`,
  };

  const userMessages = {
    nl: "Analyseer dit arbeidscontract grondig en geef de analyse terug als JSON.",
    en: "Analyse this employment contract thoroughly and return the analysis as JSON.",
    fr: "Analysez ce contrat de travail en profondeur et retournez l'analyse au format JSON.",
  };

  const systemPrompt = systemPrompts[lang] || systemPrompts.en;
  const userMessage = userMessages[lang] || userMessages.en;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: userMessage,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return res.status(500).json({ error: "AI service error" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    let parsed;
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("JSON parse error:", text);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

  const systemPrompt = isNL
    ? `Je bent een Nederlandse arbeidsrechtsexpert die arbeidscontracten analyseert voor werknemers. 
Je taak is om elk contract grondig te analyseren en terug te geven in JSON formaat.

Analyseer het contract op basis van:
- Nederlandse arbeidsrechtgeving (BW Boek 7, Arbeidsomstandighedenwet)
- CAO-regelgeving en minimumvereisten
- Oneerlijke of ongewone bedingen
- Bescherming van de werknemer

Geef ALLEEN geldig JSON terug, geen andere tekst. De JSON moet dit exacte formaat hebben:
{
  "score": <getal 0-100, waarbij 100 perfect is voor de werknemer>,
  "summary": "<korte samenvatting in 2-3 zinnen>",
  "detailedSummary": "<gedetailleerde samenvatting in 4-6 zinnen met de belangrijkste bevindingen>",
  "positives": ["<positief punt 1>", "<positief punt 2>"],
  "clauses": [
    {
      "title": "<naam van de clausule>",
      "risk": "<low|medium|high>",
      "explanation": "<uitleg in begrijpelijke taal voor de werknemer>",
      "recommendation": "<aanbeveling voor de werknemer indien van toepassing>",
      "lawReference": "<relevante wetsartikel of CAO-bepaling indien van toepassing>"
    }
  ],
  "flagged": [
    {
      "title": "<naam van het aandachtspunt>",
      "description": "<beschrijving van het probleem>",
      "recommendation": "<wat de werknemer kan doen>"
    }
  ]
}

Risicoscoring richtlijnen:
- low: standaard, gebruikelijk, gunstig voor werknemer
- medium: aandacht vereist, maar niet onredelijk
- high: ongunstig, mogelijk onwettig of sterk nadelig voor werknemer

Analyseer alle clausules die je vindt. Als het document geen arbeidscontract lijkt te zijn, geef dan een lege analyse terug met score 0 en een uitleg in de summary.`
    : `You are a Dutch employment law expert analysing employment contracts for employees.
Your task is to thoroughly analyse the contract and return the result in JSON format.

Analyse the contract based on:
- Dutch employment law (Civil Code Book 7, Working Conditions Act)
- Collective Labour Agreement (CAO) requirements and minimum standards
- Unfair or unusual clauses
- Employee protection

Return ONLY valid JSON, no other text. The JSON must follow this exact format:
{
  "score": <number 0-100, where 100 is perfect for the employee>,
  "summary": "<brief summary in 2-3 sentences>",
  "detailedSummary": "<detailed summary in 4-6 sentences with key findings>",
  "positives": ["<positive point 1>", "<positive point 2>"],
  "clauses": [
    {
      "title": "<clause name>",
      "risk": "<low|medium|high>",
      "explanation": "<explanation in plain language for the employee>",
      "recommendation": "<recommendation for the employee if applicable>",
      "lawReference": "<relevant legal article or CAO provision if applicable>"
    }
  ],
  "flagged": [
    {
      "title": "<name of the issue>",
      "description": "<description of the problem>",
      "recommendation": "<what the employee can do>"
    }
  ]
}

Risk scoring guidelines:
- low: standard, common, favourable for employee
- medium: requires attention, but not unreasonable
- high: unfavourable, potentially unlawful or strongly disadvantageous for employee

Analyse all clauses you find. If the document does not appear to be an employment contract, return an empty analysis with score 0 and an explanation in the summary.`;

  const userMessage = isNL
    ? "Analyseer dit arbeidscontract grondig en geef de analyse terug als JSON."
    : "Analyse this employment contract thoroughly and return the analysis as JSON.";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: userMessage,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return res.status(500).json({ error: "AI service error" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON from response
    let parsed;
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("JSON parse error:", text);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
