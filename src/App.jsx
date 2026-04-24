import { useState, useEffect, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CHECKOUT_URL = "https://nexiotools.lemonsqueezy.com/checkout/buy/810771d8-f28e-4eb6-9624-d6e8f6a6e46f";
const FREE_LIMIT = 1;
const STORAGE_KEY = "contract2check_uses";
const WHITELIST_KEY = "contract2check_whitelisted";

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  nl: {
    logo: "Contract2Check",
    tagline: "Begrijp wat je tekent.",
    subtitle: "Upload je arbeidscontract. Onze AI legt elke clausule uit in begrijpelijke taal, signaleert oneerlijke voorwaarden en vergelijkt met de Nederlandse wetgeving.",
    uploadLabel: "Sleep je contract hierheen",
    uploadSub: "of klik om te bladeren · PDF tot 10MB",
    uploadBtn: "Selecteer PDF",
    analyseBtn: "Analyseer mijn contract →",
    analysing: "Contract wordt geanalyseerd...",
    freeLeft: (n) => `${n} gratis analyse resterend`,
    noFree: "Gratis limiet bereikt",
    overall: "Algemene beoordeling",
    overallScore: "Contractscore",
    summary: "Samenvatting",
    clauses: "Clausules",
    flagged: "Aandachtspunten",
    risk: { low: "Laag risico", medium: "Gemiddeld risico", high: "Hoog risico" },
    riskLabel: "Risico",
    lawRef: "Wettelijke referentie",
    explanation: "Uitleg",
    recommendation: "Aanbeveling",
    copyBtn: "📋 Kopieer analyse",
    copied: "✓ Gekopieerd",
    newAnalysis: "Nieuw contract analyseren",
    disclaimer: "Contract2Check biedt geen juridisch advies. De analyse is indicatief en gebaseerd op algemene Nederlandse arbeidsrechtprincipes. Raadpleeg een jurist voor specifiek advies.",
    footerBy: "Contract2Check door",
    footerRates: "Gebaseerd op Nederlands arbeidsrecht",
    paywallTitle: "Je gratis analyse is gebruikt",
    paywallSub: "Eenmalige betaling. Geen abonnement.",
    features: ["Onbeperkte contractanalyses", "Clausule-voor-clausule uitleg", "Risicoscoring per clausule", "Vergelijking met Nederlandse wet", "Aandachtspunten gemarkeerd"],
    alreadyPaid: "Al betaald? Voer je e-mail in om te ontgrendelen",
    emailPlaceholder: "jouw@email.com",
    unlockBtn: "Ontgrendelen",
    checking: "...",
    unlocked: "✓",
    emailError: "Geen actieve aankoop gevonden voor dit e-mailadres.",
    emailExpired: "Je toegang is verlopen. Koop een nieuw plan.",
    emailSuccess: (d) => `✓ Toegang verleend! ${d} dagen resterend.`,
    hasCode: "Heb je een toegangscode?",
    codeError: "Ongeldige code. Probeer opnieuw.",
    codeSuccess: "✓ Toegang verleend!",
    accessGranted: "✓ Toegang verleend",
    privacyNote: "Je contract wordt veilig verwerkt en nooit opgeslagen.",
    lang: "NL",
  },
  en: {
    logo: "Contract2Check",
    tagline: "Understand what you sign.",
    subtitle: "Upload your employment contract. Our AI explains every clause in plain language, flags unfair terms and compares against Dutch law.",
    uploadLabel: "Drop your contract here",
    uploadSub: "or click to browse · PDF up to 10MB",
    uploadBtn: "Select PDF",
    analyseBtn: "Analyse my contract →",
    analysing: "Analysing contract...",
    freeLeft: (n) => `${n} free analysis remaining`,
    noFree: "Free limit reached",
    overall: "Overall assessment",
    overallScore: "Contract score",
    summary: "Summary",
    clauses: "Clauses",
    flagged: "Points of attention",
    risk: { low: "Low risk", medium: "Medium risk", high: "High risk" },
    riskLabel: "Risk",
    lawRef: "Legal reference",
    explanation: "Explanation",
    recommendation: "Recommendation",
    copyBtn: "📋 Copy analysis",
    copied: "✓ Copied",
    newAnalysis: "Analyse new contract",
    disclaimer: "Contract2Check does not provide legal advice. The analysis is indicative and based on general Dutch employment law principles. Consult a lawyer for specific advice.",
    footerBy: "Contract2Check by",
    footerRates: "Based on Dutch employment law",
    paywallTitle: "Your free analysis has been used",
    paywallSub: "One-time payment. No subscription.",
    features: ["Unlimited contract analyses", "Clause-by-clause explanation", "Risk score per clause", "Comparison with Dutch law", "Flagged points of attention"],
    alreadyPaid: "Already paid? Enter your email to unlock",
    emailPlaceholder: "your@email.com",
    unlockBtn: "Unlock",
    checking: "...",
    unlocked: "✓",
    emailError: "No active purchase found for this email.",
    emailExpired: "Your access has expired. Please purchase a new plan.",
    emailSuccess: (d) => `✓ Access granted! ${d} days remaining.`,
    hasCode: "Have an access code?",
    codeError: "Invalid code. Please try again.",
    codeSuccess: "✓ Access granted!",
    accessGranted: "✓ Access granted",
    privacyNote: "Your contract is processed securely and never stored.",
    lang: "EN",
  },
};

// ─── PAYWALL MODAL ────────────────────────────────────────────────────────────
function PaywallModal({ onClose, onWhitelisted, t }) {
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("idle");
  const [daysLeft, setDaysLeft] = useState(null);
  const [showEmailEntry, setShowEmailEntry] = useState(false);
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState("idle");
  const [showCodeEntry, setShowCodeEntry] = useState(false);

  const handleValidateEmail = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setEmailStatus("checking");
    try {
      const res = await fetch("/api/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setEmailStatus("success");
        setDaysLeft(data.daysLeft);
        try {
          localStorage.setItem(WHITELIST_KEY, "1");
          localStorage.setItem(WHITELIST_KEY + "_email", email.trim().toLowerCase());
          localStorage.setItem(WHITELIST_KEY + "_expires", String(data.expiresAt));
          if (data.plan) localStorage.setItem(WHITELIST_KEY + "_plan", data.plan);
        } catch {}
        setTimeout(() => { onWhitelisted(data.plan, data.daysLeft); onClose(); }, 1000);
      } else if (data.expired) {
        setEmailStatus("expired");
        setTimeout(() => setEmailStatus("idle"), 3000);
      } else {
        setEmailStatus("error");
        setTimeout(() => setEmailStatus("idle"), 2000);
      }
    } catch {
      setEmailStatus("error");
      setTimeout(() => setEmailStatus("idle"), 2000);
    }
  };

  const handleValidateCode = async () => {
    if (!code.trim()) return;
    setCodeStatus("checking");
    try {
      const res = await fetch("/api/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setCodeStatus("success");
        try { localStorage.setItem(WHITELIST_KEY, "1"); } catch {}
        setTimeout(() => { onWhitelisted(); onClose(); }, 800);
      } else {
        setCodeStatus("error");
        setTimeout(() => setCodeStatus("idle"), 2000);
      }
    } catch {
      setCodeStatus("error");
      setTimeout(() => setCodeStatus("idle"), 2000);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0f0f12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 36, maxWidth: 420, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 18, cursor: "pointer" }}>✕</button>

        {/* Logo mark */}
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,79,79,0.1)", border: "1px solid rgba(255,79,79,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="#0f0f12"/>
            <rect x="6" y="6" width="5" height="20" rx="1.4" fill="white"/>
            <rect x="21" y="6" width="5" height="20" rx="1.4" fill="white"/>
            <polygon points="11,6 16,6 26,26 21,26" fill="#ff4f4f"/>
          </svg>
        </div>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#f0ece8", marginBottom: 6, letterSpacing: "-0.4px" }}>{t.paywallTitle}</h2>
        <p style={{ fontSize: 13, color: "rgba(240,236,232,0.5)", marginBottom: 24 }}>{t.paywallSub}</p>

        {/* Features */}
        <div style={{ marginBottom: 24 }}>
          {t.features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, background: "#ff4f4f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: "white", fontWeight: 700 }}>✓</span>
              </div>
              <span style={{ fontSize: 13, color: "rgba(240,236,232,0.8)" }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Pricing tiers */}
        {[
          { label: "Starter", period: t.lang === "NL" ? "3 maanden" : "3 months", price: "€15" },
          { label: "Pro", period: t.lang === "NL" ? "1 jaar" : "1 year", price: "€39", popular: true },
          { label: "Lifetime", period: t.lang === "NL" ? "Voor altijd" : "Forever", price: "€79" },
        ].map((tier) => (
          <a key={tier.label} href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: tier.popular ? "#1a1a1a" : "rgba(255,255,255,0.03)", border: `1px solid ${tier.popular ? "#ff4f4f" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8, textDecoration: "none", cursor: "pointer", position: "relative" }}>
            {tier.popular && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#ff4f4f", color: "white", fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 100, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{t.lang === "NL" ? "MEEST GEKOZEN" : "MOST POPULAR"}</div>}
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#f0ece8" }}>{tier.label}</div>
              <div style={{ fontSize: 11, color: "rgba(240,236,232,0.4)", marginTop: 2 }}>{tier.period}</div>
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: tier.popular ? "#ff4f4f" : "#f0ece8" }}>{tier.price}</div>
          </a>
        ))}

        <p style={{ textAlign: "center", color: "rgba(240,236,232,0.25)", fontSize: 11, marginTop: 12 }}>
          Secure checkout · Lemon Squeezy · VAT included
        </p>

        {/* Email unlock */}
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          {!showEmailEntry ? (
            <button onClick={() => { setShowEmailEntry(true); setShowCodeEntry(false); }} style={{ background: "transparent", border: "none", color: "rgba(240,236,232,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", display: "block", margin: "0 auto" }}>
              {t.alreadyPaid}
            </button>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleValidateEmail()} placeholder={t.emailPlaceholder}
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${emailStatus === "error" || emailStatus === "expired" ? "rgba(255,80,80,0.4)" : emailStatus === "success" ? "rgba(80,200,120,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "10px 14px", color: "#f0ece8", fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none" }} />
                <button onClick={handleValidateEmail} disabled={emailStatus === "checking" || emailStatus === "success"}
                  style={{ background: emailStatus === "success" ? "rgba(80,200,120,0.2)" : "rgba(255,79,79,0.15)", border: `1px solid ${emailStatus === "success" ? "rgba(80,200,120,0.3)" : "rgba(255,79,79,0.3)"}`, color: emailStatus === "success" ? "#50c878" : "#ff4f4f", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
                  {emailStatus === "checking" ? t.checking : emailStatus === "success" ? t.unlocked : t.unlockBtn}
                </button>
              </div>
              {emailStatus === "error" && <p style={{ color: "#ff8080", fontSize: 11, marginTop: 6, textAlign: "center" }}>{t.emailError}</p>}
              {emailStatus === "expired" && <p style={{ color: "#ff8080", fontSize: 11, marginTop: 6, textAlign: "center" }}>{t.emailExpired}</p>}
              {emailStatus === "success" && daysLeft && <p style={{ color: "#50c878", fontSize: 11, marginTop: 6, textAlign: "center" }}>{t.emailSuccess(daysLeft)}</p>}
            </div>
          )}
        </div>

        {/* Access code */}
        {!showCodeEntry ? (
          <button onClick={() => { setShowCodeEntry(true); setShowEmailEntry(false); }} style={{ background: "transparent", border: "none", color: "rgba(240,236,232,0.2)", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", display: "block", margin: "8px auto 0" }}>
            {t.hasCode}
          </button>
        ) : (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleValidateCode()} placeholder={t.lang === "NL" ? "Toegangscode" : "Access code"}
                style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${codeStatus === "error" ? "rgba(255,80,80,0.4)" : codeStatus === "success" ? "rgba(80,200,120,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "10px 14px", color: "#f0ece8", fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none" }} />
              <button onClick={handleValidateCode} disabled={codeStatus === "checking" || codeStatus === "success"}
                style={{ background: codeStatus === "success" ? "rgba(80,200,120,0.2)" : "rgba(255,79,79,0.15)", border: `1px solid ${codeStatus === "success" ? "rgba(80,200,120,0.3)" : "rgba(255,79,79,0.3)"}`, color: codeStatus === "success" ? "#50c878" : "#ff4f4f", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
                {codeStatus === "checking" ? t.checking : codeStatus === "success" ? t.unlocked : t.lang === "NL" ? "Toepassen" : "Apply"}
              </button>
            </div>
            {codeStatus === "error" && <p style={{ color: "#ff8080", fontSize: 11, marginTop: 6, textAlign: "center" }}>{t.codeError}</p>}
            {codeStatus === "success" && <p style={{ color: "#50c878", fontSize: 11, marginTop: 6, textAlign: "center" }}>{t.codeSuccess}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RISK BADGE ───────────────────────────────────────────────────────────────
function RiskBadge({ level, t }) {
  const colors = {
    low:    { bg: "rgba(80,200,120,0.1)",  border: "rgba(80,200,120,0.25)",  text: "#50c878" },
    medium: { bg: "rgba(255,200,80,0.1)",  border: "rgba(255,200,80,0.25)",  text: "#ffc850" },
    high:   { bg: "rgba(255,79,79,0.1)",   border: "rgba(255,79,79,0.25)",   text: "#ff4f4f" },
  };
  const c = colors[level] || colors.low;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {level === "high" ? "⚠ " : level === "medium" ? "◆ " : "✓ "}{t.risk[level]}
    </span>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#50c878" : score >= 40 ? "#ffc850" : "#ff4f4f";
  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>/100</span>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("nl");
  const t = T[lang];

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [usesCount, setUsesCount] = useState(0);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [accessPlan, setAccessPlan] = useState(null);
  const [accessDaysLeft, setAccessDaysLeft] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      setUsesCount(stored);
      if (localStorage.getItem(WHITELIST_KEY) === "1") {
        const expiresAt = localStorage.getItem(WHITELIST_KEY + "_expires");
        if (expiresAt && parseInt(expiresAt) < Date.now()) {
          localStorage.removeItem(WHITELIST_KEY);
          localStorage.removeItem(WHITELIST_KEY + "_email");
          localStorage.removeItem(WHITELIST_KEY + "_expires");
          localStorage.removeItem(WHITELIST_KEY + "_plan");
        } else {
          setIsWhitelisted(true);
          const plan = localStorage.getItem(WHITELIST_KEY + "_plan");
          const exp = localStorage.getItem(WHITELIST_KEY + "_expires");
          if (plan) setAccessPlan(plan);
          if (exp && plan !== "Lifetime") {
            const days = Math.ceil((parseInt(exp) - Date.now()) / (1000 * 60 * 60 * 24));
            setAccessDaysLeft(days);
          }
        }
      }
    } catch { setUsesCount(0); }

    // Auto-unlock from redirect
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      fetch("/api/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam.trim() }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            try {
              localStorage.setItem(WHITELIST_KEY, "1");
              localStorage.setItem(WHITELIST_KEY + "_email", emailParam.trim().toLowerCase());
              localStorage.setItem(WHITELIST_KEY + "_expires", String(data.expiresAt));
              if (data.plan) localStorage.setItem(WHITELIST_KEY + "_plan", data.plan);
            } catch {}
            setIsWhitelisted(true);
            if (data.plan) setAccessPlan(data.plan);
            if (data.daysLeft) setAccessDaysLeft(data.daysLeft);
            window.history.replaceState({}, "", window.location.pathname);
          }
        })
        .catch(() => {});
    }

    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  const handleFile = (f) => {
    if (!f || f.type !== "application/pdf") { setError(lang === "nl" ? "Alleen PDF bestanden zijn toegestaan." : "Only PDF files are allowed."); return; }
    if (f.size > 10 * 1024 * 1024) { setError(lang === "nl" ? "Bestand is te groot. Maximum is 10MB." : "File too large. Maximum is 10MB."); return; }
    setFile(f);
    setFileName(f.name);
    setError("");
    setResult(null);
  };

  const handleAnalyse = async () => {
    if (!file) return;
    if (!isWhitelisted && usesCount >= FREE_LIMIT) { setShowPaywall(true); return; }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1];

        abortRef.current = new AbortController();
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, lang }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("API error");
        const data = await res.json();

        if (!isWhitelisted) {
          const newCount = usesCount + 1;
          setUsesCount(newCount);
          try { localStorage.setItem(STORAGE_KEY, String(newCount)); } catch {}
        }

        setResult(data);
        setActiveTab("summary");
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(lang === "nl" ? "Er is een fout opgetreden. Probeer het opnieuw." : "An error occurred. Please try again.");
        setLoading(false);
      }
    }
  };

  const openPaywall = () => {
    if (!isWhitelisted && usesCount >= FREE_LIMIT) setShowPaywall(true);
  };

  const copyResult = () => {
    if (!result) return;
    const text = [
      `Contract2Check analyse`,
      `Score: ${result.score}/100`,
      ``,
      result.summary,
      ``,
      ...(result.clauses || []).map(c => `${c.title}\nRisico: ${c.risk}\n${c.explanation}`),
    ].join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remaining = Math.max(0, FREE_LIMIT - usesCount);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans', sans-serif", color: "#f0ece8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        .wrap { max-width: 720px; margin: 0 auto; padding: 0 20px 80px; }
        .header { padding: 36px 0 32px; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-text { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: #f0ece8; letter-spacing: -0.3px; }
        .logo-text span { color: #ff4f4f; }
        .header-right { display: flex; align-items: center; gap: 12px; }
        .lang-seg { display: flex; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden; }
        .lang-btn { padding: 5px 12px; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; cursor: pointer; border: none; background: transparent; color: rgba(240,236,232,0.45); transition: all 0.18s; }
        .lang-btn.active { background: #ff4f4f; color: white; }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(80,200,120,0.1); border: 1px solid rgba(80,200,120,0.2); color: #50c878; font-size: 11px; padding: 5px 12px; border-radius: 20px; }
        .hero { padding: 48px 0 40px; }
        h1 { font-family: 'Syne', sans-serif; font-size: clamp(32px, 6vw, 52px); font-weight: 800; line-height: 1.05; letter-spacing: -0.04em; margin-bottom: 16px; }
        h1 em { font-style: normal; color: #ff4f4f; }
        .subtitle { font-size: 16px; font-weight: 300; color: rgba(240,236,232,0.55); line-height: 1.7; max-width: 560px; }
        .upload-area { border: 1.5px dashed rgba(255,255,255,0.12); border-radius: 16px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.2s; margin: 32px 0 0; background: rgba(255,255,255,0.02); }
        .upload-area:hover, .upload-area.drag { border-color: #ff4f4f; background: rgba(255,79,79,0.04); }
        .upload-area.has-file { border-color: rgba(80,200,120,0.4); background: rgba(80,200,120,0.04); }
        .upload-icon { font-size: 32px; margin-bottom: 12px; }
        .upload-label { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: #f0ece8; margin-bottom: 6px; }
        .upload-sub { font-size: 12px; color: rgba(240,236,232,0.35); }
        .upload-file-name { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: #50c878; margin-top: 8px; }
        .analyse-btn { width: 100%; background: #ff4f4f; color: white; border: none; border-radius: 12px; padding: 16px; font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 16px; transition: opacity 0.2s, transform 0.2s; letter-spacing: -0.3px; }
        .analyse-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .analyse-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .privacy-note { text-align: center; font-size: 11px; color: rgba(240,236,232,0.25); margin-top: 10px; }
        .free-counter { display: flex; justify-content: center; margin-top: 8px; }
        .free-pill { background: rgba(255,79,79,0.08); border: 1px solid rgba(255,79,79,0.15); color: rgba(255,79,79,0.7); font-size: 11px; padding: 4px 12px; border-radius: 100px; }
        .error { background: rgba(255,79,79,0.08); border: 1px solid rgba(255,79,79,0.2); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #ff8080; margin-top: 12px; }
        /* Result */
        .result-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 28px; margin-top: 32px; animation: up 0.5s ease both; }
        .overall-row { display: flex; align-items: center; gap: 24px; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .overall-text { flex: 1; }
        .overall-label { font-size: 11px; font-weight: 600; color: rgba(240,236,232,0.4); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
        .overall-summary { font-size: 15px; font-weight: 300; color: rgba(240,236,232,0.75); line-height: 1.7; }
        /* Tabs */
        .tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.04); border-radius: 10px; padding: 4px; margin-bottom: 24px; }
        .tab { flex: 1; padding: 9px; text-align: center; border-radius: 7px; border: none; background: transparent; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: rgba(240,236,232,0.45); cursor: pointer; transition: all 0.18s; }
        .tab.active { background: rgba(255,255,255,0.08); color: #f0ece8; }
        /* Clause card */
        .clause-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 20px; margin-bottom: 10px; transition: border-color 0.2s; }
        .clause-card:hover { border-color: rgba(255,255,255,0.12); }
        .clause-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .clause-title { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: #f0ece8; flex: 1; }
        .clause-section { margin-bottom: 10px; }
        .clause-section-label { font-size: 10px; font-weight: 600; color: rgba(240,236,232,0.35); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
        .clause-section-text { font-size: 13px; font-weight: 300; color: rgba(240,236,232,0.7); line-height: 1.65; }
        .clause-law { font-size: 11px; color: #ff4f4f; margin-top: 8px; }
        /* Flagged */
        .flagged-item { display: flex; gap: 12px; background: rgba(255,79,79,0.05); border: 1px solid rgba(255,79,79,0.15); border-radius: 12px; padding: 16px; margin-bottom: 10px; }
        .flagged-icon { width: 28px; height: 28px; background: rgba(255,79,79,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
        .flagged-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #f0ece8; margin-bottom: 4px; }
        .flagged-text { font-size: 12px; color: rgba(240,236,232,0.6); line-height: 1.6; }
        /* Actions */
        .action-row { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
        .btn-secondary { display: flex; align-items: center; gap: 6px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(240,236,232,0.5); border-radius: 8px; padding: 9px 16px; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.2); color: #f0ece8; }
        .btn-secondary.copied { border-color: rgba(80,200,120,0.3); color: #50c878; }
        .disclaimer { background: rgba(255,255,255,0.02); border-radius: 10px; padding: 12px 14px; margin-top: 12px; font-size: 11px; color: rgba(240,236,232,0.25); line-height: 1.6; }
        .footer { text-align: center; padding-top: 40px; font-size: 11px; color: rgba(240,236,232,0.2); }
        .footer a { color: rgba(240,236,232,0.3); text-decoration: none; }
        .footer a:hover { color: rgba(240,236,232,0.6); }
        @keyframes up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.2); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
        @media (max-width: 480px) { .overall-row { flex-direction: column; } }
      `}</style>

      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onWhitelisted={(plan, daysLeft) => { setIsWhitelisted(true); if (plan) setAccessPlan(plan); if (daysLeft) setAccessDaysLeft(daysLeft); }}
          t={t}
        />
      )}

      <div className="wrap">
        <div className="header">
          <div className="logo">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="7" fill="#0f0f12"/>
              <rect x="6" y="6" width="5" height="20" rx="1.4" fill="white"/>
              <rect x="21" y="6" width="5" height="20" rx="1.4" fill="white"/>
              <polygon points="11,6 16,6 26,26 21,26" fill="#ff4f4f"/>
            </svg>
            <span className="logo-text">Contract<span>2</span>Check</span>
          </div>
          <div className="header-right">
            {isWhitelisted && (
              <span className="badge">
                ✓ {accessPlan || t.accessGranted.replace("✓ ", "")}{accessPlan && accessPlan !== "Lifetime" && accessDaysLeft ? ` · ${accessDaysLeft} days left` : accessPlan === "Lifetime" ? " · Lifetime" : ""}
              </span>
            )}
            <div className="lang-seg">
              <button className={`lang-btn${lang === "nl" ? " active" : ""}`} onClick={() => setLang("nl")}>🇳🇱 NL</button>
              <button className={`lang-btn${lang === "en" ? " active" : ""}`} onClick={() => setLang("en")}>🇬🇧 EN</button>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="hero">
          <h1>{lang === "nl" ? <>Begrijp wat je<br /><em>tekent.</em></> : <>Understand what<br /><em>you sign.</em></>}</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>

        {/* Upload */}
        {!result && (
          <>
            <div
              className={`upload-area${dragOver ? " drag" : ""}${file ? " has-file" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <div className="upload-icon">{file ? "📄" : "📋"}</div>
              {file ? (
                <>
                  <div className="upload-label">{lang === "nl" ? "Contract geselecteerd" : "Contract selected"}</div>
                  <div className="upload-file-name">{fileName}</div>
                  <div className="upload-sub" style={{ marginTop: 6 }}>{lang === "nl" ? "Klik om een ander bestand te kiezen" : "Click to select a different file"}</div>
                </>
              ) : (
                <>
                  <div className="upload-label">{t.uploadLabel}</div>
                  <div className="upload-sub">{t.uploadSub}</div>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {error && <div className="error">{error}</div>}

            <button className="analyse-btn" onClick={handleAnalyse} disabled={!file || loading}>
              {loading ? <><span className="spinner" /> {t.analysing}</> : t.analyseBtn}
            </button>

            <p className="privacy-note">🔒 {t.privacyNote}</p>

            {!isWhitelisted && (
              <div className="free-counter">
                <span className="free-pill" onClick={openPaywall} style={{ cursor: remaining === 0 ? "pointer" : "default" }}>
                  {remaining > 0 ? t.freeLeft(remaining) : t.noFree}
                </span>
              </div>
            )}
          </>
        )}

        {/* Result */}
        {result && (
          <div className="result-card">
            <div className="overall-row">
              <div className="overall-text">
                <div className="overall-label">{t.overall}</div>
                <p className="overall-summary">{result.summary}</p>
              </div>
              <ScoreRing score={result.score} />
            </div>

            <div className="tabs">
              <button className={`tab${activeTab === "summary" ? " active" : ""}`} onClick={() => setActiveTab("summary")}>{t.summary}</button>
              <button className={`tab${activeTab === "clauses" ? " active" : ""}`} onClick={() => setActiveTab("clauses")}>{t.clauses} ({(result.clauses || []).length})</button>
              <button className={`tab${activeTab === "flagged" ? " active" : ""}`} onClick={() => setActiveTab("flagged")}>{t.flagged} ({(result.flagged || []).length})</button>
            </div>

            {activeTab === "summary" && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,236,232,0.7)", lineHeight: 1.75 }}>{result.detailedSummary || result.summary}</p>
                {result.positives && result.positives.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(240,236,232,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{lang === "nl" ? "Positieve punten" : "Positive points"}</div>
                    {result.positives.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                        <span style={{ color: "#50c878", fontSize: 14, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 13, color: "rgba(240,236,232,0.65)", lineHeight: 1.6 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "clauses" && (
              <div>
                {(result.clauses || []).map((clause, i) => (
                  <div key={i} className="clause-card">
                    <div className="clause-header">
                      <div className="clause-title">{clause.title}</div>
                      <RiskBadge level={clause.risk} t={t} />
                    </div>
                    <div className="clause-section">
                      <div className="clause-section-label">{t.explanation}</div>
                      <div className="clause-section-text">{clause.explanation}</div>
                    </div>
                    {clause.recommendation && (
                      <div className="clause-section">
                        <div className="clause-section-label">{t.recommendation}</div>
                        <div className="clause-section-text">{clause.recommendation}</div>
                      </div>
                    )}
                    {clause.lawReference && (
                      <div className="clause-law">⚖ {clause.lawReference}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "flagged" && (
              <div>
                {(result.flagged || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(240,236,232,0.4)", fontSize: 14 }}>
                    {lang === "nl" ? "Geen aandachtspunten gevonden." : "No points of attention found."}
                  </div>
                ) : (
                  (result.flagged || []).map((item, i) => (
                    <div key={i} className="flagged-item">
                      <div className="flagged-icon">⚠</div>
                      <div>
                        <div className="flagged-title">{item.title}</div>
                        <div className="flagged-text">{item.description}</div>
                        {item.recommendation && <div className="flagged-text" style={{ marginTop: 6, color: "#ffc850" }}>{item.recommendation}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="action-row">
              <button className={`btn-secondary${copied ? " copied" : ""}`} onClick={copyResult}>{copied ? t.copied : t.copyBtn}</button>
              <button className="btn-secondary" onClick={() => { setResult(null); setFile(null); setFileName(""); }}>{t.newAnalysis}</button>
            </div>

            <div className="disclaimer">{t.disclaimer}</div>
          </div>
        )}

        <div className="footer">
          <p>{t.footerBy} <a href="https://nexiotools.nl" target="_blank" rel="noopener noreferrer">nexiotools.nl</a> &mdash; {t.footerRates}</p>
          <p style={{ marginTop: 6 }}>
            {lang === "nl" ? "Je contract wordt veilig verwerkt en nooit opgeslagen." : "Your contract is processed securely and never stored."} &nbsp;
            <a href="https://nexiotools.nl/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            &nbsp;·&nbsp;
            <a href="https://nexiotools.nl/terms.html" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
}
