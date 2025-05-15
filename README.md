# 💡 EduBot – Chatbot IA pédagogique

EduBot est un assistant intelligent conçu pour accompagner les étudiants avec :
- 📚 une fiche de cours générée par scraping Wikipédia,
- 🧠 des réponses contextuelles via IA (LLM),
- 🎯 des QCM automatiques générés par intelligence artificielle.

---

## 🚀 Getting Started

### 1. Lancer le serveur de développement

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

### 2. Lancer les serveurs IA nécessaires

#### 🧠 Ollama (LLM local)
```bash
ollama run llama3
```

#### 🧠 ChromaDB (base vectorielle)
```bash
docker run -d -p 8000:8000 ghcr.io/chroma-core/chroma
```

---

## 🧠 Fonctionnalités IA

- ✅ Scraping intelligent de contenu éducatif (Wikipédia)
- ✅ Analyse et vectorisation (MiniLM)
- ✅ Stockage dans ChromaDB
- ✅ Recherche vectorielle intelligente
- ✅ Génération automatique de QCM à choix unique
- ✅ Interface interactive pour réponse + quiz

---

## 📁 Structure du projet

```
/src
  └── /app
      └── /api/fiche/route.js          # API scraping, vectorisation, QCM
      └── /api/fiche/lib/vectorstore.js # Gestion de la base vectorielle
/components
  └── ChatbotInterface.jsx             # Interface utilisateur complète
```

---

## 📦 Dépendances clés

```bash
npm install cheerio chromadb @xenova/transformers
```

> ⚠️ Node 18+ recommandé pour les modules ES et streaming

---

## 🔄 Fonctionnement API

```http
GET  /api/fiche?theme=html        → Récupération des paragraphes Wikipédia
POST /api/fiche (embedding)       → Vectorisation des paragraphes
POST /api/fiche (query)           → Recherche sémantique dans Chroma
POST /api/fiche (generate_qcm)    → Génération automatique d’un QCM
```

---

## 🖼️ Interface utilisateur

- Pose une question → Réponse contextualisée par Llama3
- 📥 Envoi vectoriel → Chroma
- 🎯 Génère un QCM IA → Interaction directe + feedback
- 📄 Affiche la fiche de cours scrappée

---
