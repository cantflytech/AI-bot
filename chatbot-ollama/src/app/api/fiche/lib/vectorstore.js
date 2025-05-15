import { ChromaClient } from "chromadb";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";

// Initialise la base
const client = new ChromaClient();
const collectionName = "cours_ai";
let collection = null;

// Initialise le modèle d'embedding (all-MiniLM)
let embedder = null;
async function loadEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

// Connecte ou crée la collection
export async function initCollection() {
  try {
    collection = await client.getOrCreateCollection({ name: collectionName });
  } catch (err) {
    console.error("Erreur init collection:", err);
  }
}

// Ajoute un ensemble de paragraphes dans la base
export async function addToVectorDB(theme, paragraphs) {
  await initCollection();
  const embed = await loadEmbedder();

  for (let i = 0; i < paragraphs.length; i++) {
    const id = `${theme}-${i}`;
    const text = paragraphs[i];
    const embedding = await embed(text, { pooling: "mean", normalize: true });

    await collection.add({
      ids: [id],
      embeddings: [embedding.data],
      documents: [text],
      metadatas: [{ theme }]
    });
  }
}

// Recherche les passages les plus proches d’une question
export async function searchInVectorDB(query, topK = 3) {
  await initCollection();
  const embed = await loadEmbedder();
  const embedding = await embed(query, { pooling: "mean", normalize: true });

  const results = await collection.query({
    queryEmbeddings: [embedding.data],
    nResults: topK
  });

  return results.documents.flat();
}
