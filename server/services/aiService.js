const env = require("../config/env");

const RISK_PATTERNS = [
  {
    label: "No Explicit Termination Clause",
    test: (content) => !/termination|terminate|cancel/i.test(content),
  },
  {
    label: "No Confidentiality Clause",
    test: (content) => !/confidential|non-disclosure|nda/i.test(content),
  },
  {
    label: "No Governing Law Mention",
    test: (content) => !/governing law|jurisdiction/i.test(content),
  },
  {
    label: "No Dispute Resolution Clause",
    test: (content) => !/dispute|arbitration|mediation/i.test(content),
  },
  {
    label: "No Payment Terms Found",
    test: (content) => !/payment|fees|amount|invoice/i.test(content),
  },
];

const normalizeWhitespace = (text = "") => String(text).replace(/\s+/g, " ").trim();

const extractSimpleSummary = (title, content) => {
  const cleaned = normalizeWhitespace(content);
  if (!cleaned) {
    return `${title || "This document"} appears to be empty. Add clear clauses before signing.`;
  }

  const firstSentence = cleaned.match(/[^.!?]+[.!?]?/)?.[0] || cleaned.slice(0, 180);
  return `${title || "This document"}: ${firstSentence.slice(0, 260)}`;
};

const buildHeuristicInsights = ({ title, content, status, expiresAt }) => {
  const normalized = normalizeWhitespace(content);
  const risks = RISK_PATTERNS.filter((item) => item.test(normalized)).map((item) => item.label);
  const recommendations = [];

  if (risks.includes("No Explicit Termination Clause")) {
    recommendations.push("Add a termination condition with notice period and valid exit events.");
  }
  if (risks.includes("No Confidentiality Clause")) {
    recommendations.push("Define confidentiality obligations and data handling responsibilities.");
  }
  if (risks.includes("No Governing Law Mention")) {
    recommendations.push("Specify governing law and jurisdiction for legal clarity.");
  }
  if (risks.includes("No Dispute Resolution Clause")) {
    recommendations.push("Add arbitration or mediation rules for dispute handling.");
  }
  if (risks.includes("No Payment Terms Found")) {
    recommendations.push("Include payment amount, due dates, and penalties for delays.");
  }
  if (status === "draft") {
    recommendations.push("Perform a legal review before sending the draft for signatures.");
  }
  if (expiresAt) {
    recommendations.push("Ensure all parties sign before the expiry date to avoid re-issuance.");
  }

  const confidence = Math.max(0.45, 0.9 - risks.length * 0.07);

  return {
    provider: "heuristic-local",
    summary: extractSimpleSummary(title, normalized),
    risks,
    recommendations: recommendations.slice(0, 5),
    confidence: Number(confidence.toFixed(2)),
  };
};

const buildPrompt = ({ title, content, status, expiresAt }) => {
  return [
    "You analyze legal/contract documents for a SaaS workflow.",
    "Return strict JSON only with keys: summary (string), risks (string[]), recommendations (string[]), confidence (number 0-1).",
    "Keep summary under 80 words. Keep risks/recommendations concise.",
    `Title: ${title || "Untitled"}`,
    `Status: ${status || "unknown"}`,
    `ExpiresAt: ${expiresAt || "none"}`,
    "Document Content:",
    content || "",
  ].join("\n");
};

const parseModelJson = (rawText) => {
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model returned non-JSON output");
    parsed = JSON.parse(match[0]);
  }

  return {
    summary: String(parsed.summary || "").trim(),
    risks: Array.isArray(parsed.risks) ? parsed.risks.map((r) => String(r).trim()).filter(Boolean) : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((r) => String(r).trim()).filter(Boolean)
      : [],
    confidence: Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7,
  };
};

const analyzeWithOpenAI = async (payload) => {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const model = env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a legal document assistant for risk highlighting.",
        },
        {
          role: "user",
          content: buildPrompt(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  const parsed = parseModelJson(raw);

  return {
    provider: `openai:${model}`,
    ...parsed,
  };
};

const analyzeDocument = async (payload) => {
  const provider = (env.AI_PROVIDER || "heuristic").toLowerCase();

  if (provider === "openai") {
    try {
      return await analyzeWithOpenAI(payload);
    } catch {
      return buildHeuristicInsights(payload);
    }
  }

  return buildHeuristicInsights(payload);
};

module.exports = {
  analyzeDocument,
};
