"use client";
import { useState } from "react";

export default function ChatbotInterface() {
  const [theme, setTheme] = useState("html");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [qcmStep, setQcmStep] = useState(false);
  const [qcmFeedback, setQcmFeedback] = useState("");
  const [ficheSections, setFicheSections] = useState([]);
  const [showFiche, setShowFiche] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [qcmContent, setQcmContent] = useState(null); // QCM complet {question, options, answer}
  const [userQcmAnswer, setUserQcmAnswer] = useState(null); // a, b, c


  const askBot = async () => {
    if (!question) return;
    setLoading(true);
    setQcmStep(false);
    setQcmFeedback("");

    try {
      const res = await fetch("/api/fiche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "query", question })
      });

      const data = await res.json();
      const context = data.results.join("\n\n");

      const payload = {
        model: "llama3:latest",
        prompt: `Tu es professeur. Voici des extraits du cours pouvant aider à répondre :\n\n"${context}".\n\nQuestion : ${question}`
      };

      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const reader = response.body.getReader();
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
            console.error("Erreur JSON:", line);
          }
        }
      }
console.log("📚 Résultats vectoriels :", data.results);

      setChatHistory((prev) => [
        ...prev,
        { role: "user", message: question },
        { role: "bot", message: botReply }
      ]);
      setQuestion("");
      setQcmStep(true);
    } catch (e) {
      console.error("Erreur API:", e);
      setChatHistory((prev) => [
        ...prev,
        { role: "user", message: question },
        { role: "bot", message: "Erreur de connexion avec Ollama." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadFiche = async () => {
    if (showFiche) {
      setShowFiche(false);
      return;
    }

    try {
      const res = await fetch(`/api/fiche?theme=${theme}`);
      const data = await res.json();
      setFicheSections(data.sections || []);
      setShowFiche(true);
    } catch (err) {
      setFicheSections([{ section: "Erreur", content: ["Impossible de charger la fiche."] }]);
      setShowFiche(true);
    }
  };
const generateQcmFromVector = async () => {
  try {
    const res = await fetch("/api/fiche", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_qcm", theme })
    });
    const data = await res.json();

    const qcm = data.qcm.trim();
    const questionMatch = qcm.match(/Question\s*:\s*(.+)/i);
    const aMatch = qcm.match(/a\)\s*(.+)/i);
    const bMatch = qcm.match(/b\)\s*(.+)/i);
    const cMatch = qcm.match(/c\)\s*(.+)/i);
    const answerMatch = qcm.match(/Réponse\s*:\s*([abc])/i);

    if (questionMatch && aMatch && bMatch && cMatch && answerMatch) {
      setQcmContent({
        question: questionMatch[1],
        options: {
          a: aMatch[1],
          b: bMatch[1],
          c: cMatch[1],
        },
        answer: answerMatch[1]
      });
      setUserQcmAnswer(null);
    } else {
      alert("Erreur lors de l'analyse du QCM généré.");
    }
  } catch (err) {
    console.error("Erreur QCM IA:", err);
    alert("❌ Erreur génération QCM");
  }
};


  const sendToVectorDB = async () => {
    try {
      const res = await fetch(`/api/fiche?theme=${theme}`);
      const data = await res.json();
      await fetch("/api/fiche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "embedding", theme, sections: data.sections })
      });
      alert("✅ Fiche envoyée à la base vectorielle !");
    } catch (err) {
      console.error("Erreur vector DB:", err);
      alert("❌ Erreur envoi vector DB");
    }
  };

  const handleQcm = (answer) => {
    const correct = theme === "html" ? "b" : theme === "css" ? "c" : "c";
    setQcmFeedback(answer === correct ? "✅ Bonne réponse !" : `❌ Mauvais choix. La bonne réponse était '${correct}'.`);
    setQcmStep(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-gray-100 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">💡 EduBot - Assistant IA</h1>

      {chatHistory.length > 0 && (
        <div className="bg-white border border-gray-300 p-4 rounded mb-6 shadow-sm">
          <h2 className="font-semibold mb-4 text-lg text-gray-800">🧠 Historique :</h2>
          {chatHistory.map((entry, i) => (
            <div key={i} className="mb-3">
              <span className={`font-semibold ${entry.role === "user" ? "text-blue-600" : "text-green-600"}`}>
                {entry.role === "user" ? "👤" : "🤖"}
              </span>{" "}
              <span className="text-sm text-gray-700 whitespace-pre-line">{entry.message}</span>
            </div>
          ))}
        </div>
      )}
<button
  onClick={generateQcmFromVector}
  className="px-6 py-3 rounded text-white bg-orange-600 hover:bg-orange-700"
>
  🎯 Générer un QCM IA
</button>

{qcmContent && (
  <div className="bg-white border border-gray-300 p-4 rounded shadow-md mb-6">
    <h2 className="font-semibold mb-4 text-lg text-orange-700">🎯 QCM IA :</h2>
    <p className="mb-4 font-medium text-gray-800">{qcmContent.question}</p>
    {["a", "b", "c"].map((key) => (
      <button
        key={key}
        onClick={() => setUserQcmAnswer(key)}
        className={`block mb-2 w-full text-left px-4 py-2 rounded ${
          userQcmAnswer === key
            ? key === qcmContent.answer
              ? "bg-green-200"
              : "bg-red-200"
            : "bg-gray-200 hover:bg-gray-300"
        }`}
      >
        {key}) {qcmContent.options[key]}
      </button>
    ))}
    {userQcmAnswer && (
      <p className="mt-2 font-semibold text-sm text-gray-700">
        {userQcmAnswer === qcmContent.answer ? "✅ Bonne réponse !" : `❌ Mauvaise réponse. La bonne était ${qcmContent.answer}) ${qcmContent.options[qcmContent.answer]}`}
      </p>
    )}
  </div>
)}



      {qcmFeedback && (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-800">{qcmFeedback}</div>
      )}

      <div className="mb-6">
        <label className="font-medium text-gray-800 mb-2 block">Thème :</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full p-3 border border-gray-300 rounded">
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="python">Python</option>
        </select>
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Pose ta question ici..."
        className="w-full p-3 border border-gray-300 rounded mb-6 h-24"
      />

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={askBot}
          disabled={loading}
          className={`px-6 py-3 rounded text-white ${loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {loading ? "Envoi..." : "Poser la question"}
        </button>

        <button onClick={loadFiche} className="px-6 py-3 rounded text-white bg-green-600 hover:bg-green-700">
          {showFiche ? "❌ Fermer la fiche" : "📄 Voir la fiche de cours"}
        </button>

        <button onClick={sendToVectorDB} className="px-6 py-3 rounded text-white bg-purple-600 hover:bg-purple-700">
          📥 Envoyer fiche vers IA
        </button>
      </div>

      {showFiche && ficheSections.length > 0 && (
        <div className="bg-white border p-4 rounded mb-4">
          <h3 className="text-lg font-semibold mb-2">📘 Fiche de cours</h3>
          {ficheSections.map((sec, i) => (
            <div key={i} className="mb-4">
              <p className="font-semibold text-blue-600">📌 {sec.section}</p>
              {sec.content.map((para, j) => (
                <p key={j} className="text-sm text-gray-800 mb-1">{para}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
