from flask import Flask, request, jsonify
from bs4 import BeautifulSoup
import requests
import json
import os

app = Flask(__name__)

# URLs à scraper*
urls = {
    "html": "https://fr.wikipedia.org/wiki/Hypertext_Markup_Language",
    "css": "https://fr.wikipedia.org/wiki/Feuilles_de_style_en_cascade",
    "python": "https://fr.wikipedia.org/wiki/Python_(langage)"
}

# Fichier de sauvegarde des scores
SCORE_FILE = "historique_scores.json"

# Scraping intelligent d'une fiche
def scrape_fiche(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.content, "html.parser")
    paragraphs = soup.select("p")
    for p in paragraphs:
        text = p.get_text().strip()
        if len(text) > 100 and not text.lower().startswith("cet article") and "est un" in text.lower():
            return text
    return "Contenu non trouvé."

@app.route("/scrape", methods=["GET"])
def get_fiche():
    theme = request.args.get("theme")
    if not theme or theme not in urls:
        return jsonify({"error": "Thème manquant ou invalide"}), 400
    content = scrape_fiche(urls[theme])
    return jsonify({"theme": theme, "fiche": content})

@app.route("/score", methods=["POST"])
def post_score():
    data = request.get_json()
    user = data.get("user")
    theme = data.get("theme")
    score = data.get("score")

    if not user or not theme or score is None:
        return jsonify({"error": "Champs manquants"}), 400

    # Charger historique existant
    if os.path.exists(SCORE_FILE):
        with open(SCORE_FILE, "r", encoding="utf-8") as f:
            historique = json.load(f)
    else:
        historique = {}

    # Enregistrer score
    if user not in historique:
        historique[user] = []
    historique[user].append({"theme": theme, "score": score})

    with open(SCORE_FILE, "w", encoding="utf-8") as f:
        json.dump(historique, f, ensure_ascii=False, indent=2)

    return jsonify({"message": "Score enregistré avec succès"})

@app.route("/result", methods=["GET"])
def get_result():
    user = request.args.get("user")
    if not user:
        return jsonify({"error": "Nom d'utilisateur manquant"}), 400

    if os.path.exists(SCORE_FILE):
        with open(SCORE_FILE, "r", encoding="utf-8") as f:
            historique = json.load(f)
        return jsonify(historique.get(user, []))
    else:
        return jsonify({"error": "Aucun score trouvé"}), 404

if __name__ == "__main__":
    app.run(debug=True)
