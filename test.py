import requests
import json

# URL de l'API Ollama
url = "http://localhost:11434/api/chat"

# Entrée utilisateur
prompt = input("Entrez votre question : ")

# Payload pour la requête
payload = {
    "model": "mistral",
    "messages": [
        {"role": "user", "content": prompt}
    ]
}

# Requête HTTP POST avec streaming
response = requests.post(url, json=payload, stream=True)

# Vérification de la réponse
if response.status_code == 200:
    print("Réponse d'Ollama :")
    for line in response.iter_lines(decode_unicode=True):
        if line.strip():  # Ignore les lignes vides
            try:
                data = json.loads(line)
                content = data.get("message", {}).get("content", "")
                print(content, end="", flush=True)
            except json.JSONDecodeError:
                print("\n[Erreur] Ligne JSON invalide :", line)
    print()
else:
    print(f"Erreur HTTP {response.status_code}")
    print(response.text)
