import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { initCollection, addToVectorDB, searchInVectorDB } from "./lib/vectorstore";

const urls = {
  html: "https://fr.wikipedia.org/wiki/Hypertext_Markup_Language",
  css: "https://fr.wikipedia.org/wiki/Feuilles_de_style_en_cascade",
  python: "https://fr.wikipedia.org/wiki/Python_(langage)"
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get("theme") || "html";
  const url = urls[theme];

  if (!url) return NextResponse.json({ error: "Thème invalide" }, { status: 400 });

  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const sections = [];
    let currentSection = { section: "Introduction", content: [] };

    $("h1, h2, h3, p").each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      const text = $(el).text().trim();

      if (tag?.match(/^h[1-3]$/)) {
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { section: text, content: [] };
      } else if (tag === "p" && text.length > 50) {
        currentSection.content.push(text);
      }
    });

    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return NextResponse.json({ theme, sections });
  } catch (err) {
    return NextResponse.json({ error: "Scraping échoué", details: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { action, theme, sections, question } = await req.json();

  if (action === "embedding") {
    if (!theme || !sections) {
      return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    const allParagraphs = sections.flatMap(sec => sec.content);
    await addToVectorDB(theme, allParagraphs);

    return NextResponse.json({ message: "Ajout vectoriel terminé ✅" });
  }

  if (action === "query") {
    if (!question) {
      return NextResponse.json({ error: "Question manquante" }, { status: 400 });
    }

    const results = await searchInVectorDB(question, 3);
    return NextResponse.json({ results });
  }

  if (action === "generate_qcm") {
    if (!theme) {
      return NextResponse.json({ error: "Thème manquant" }, { status: 400 });
    }

    const contextParagraphs = await searchInVectorDB("contenu général " + theme, 3);
    const context = contextParagraphs.join("\n\n");

    const payload = {
      model: "llama3:latest",
      prompt: `
Tu es un professeur qui doit générer un QCM à choix unique.
À partir du contenu suivant :

"""${context}"""

Génère :
1. Une question simple mais précise.
2. Trois propositions : a), b), c).
3. Indique la bonne réponse par lettre (ex: Réponse: b)

Formate exactement comme :

Question : ...
a) ...
b) ...
c) ...
Réponse : x
`
    };

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let botReply = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          botReply += json.response;
        } catch (e) {
          console.error("⛔ Ligne ignorée (non JSON)", line);
        }
      }
    }

    return NextResponse.json({ qcm: botReply.trim() });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
