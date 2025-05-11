# PageSure

PageSure est une plateforme permettant aux utilisateurs tunisiens de rechercher des pages Facebook et d'y laisser des avis fiables.

## 🚀 Fonctionnalités

- Recherche et analyse de pages Facebook
- Système d'avis avec notes et commentaires
- Authentification via Google
- Interface moderne et responsive
- Gestion des avis personnels

## 🛠️ Technologies utilisées

### Frontend
- React avec TypeScript
- Material-UI (MUI)
- Firebase Authentication
- Firebase Firestore

### Backend
- Python Flask
- Playwright pour le scraping
- BeautifulSoup4

## 📋 Prérequis

- Node.js (v16+)
- Python 3.8+
- Compte Firebase
- Compte Google pour l'authentification

## 🔧 Installation

### Frontend

1. Naviguer dans le dossier frontend :
```bash
cd frontend
```

2. Installer les dépendances :
```bash
npm install
```

3. Créer un fichier `.env` :
```env
REACT_APP_FIREBASE_API_KEY=votre_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=votre_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=votre_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=votre_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=votre_app_id
REACT_APP_BACKEND_URL=http://localhost:5000
```

4. Lancer le serveur de développement :
```bash
npm start
```

### Backend

1. Naviguer dans le dossier backend :
```bash
cd backend
```

2. Créer un environnement virtuel :
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Installer les dépendances :
```bash
pip install -r requirements.txt
```

4. Créer un fichier `.env` :
```env
FLASK_APP=app.py
FLASK_ENV=development
```

5. Lancer le serveur :
```bash
flask run
```

## 📝 Guide utilisateur

1. **Accueil**
   - Entrez l'URL d'une page Facebook dans le champ de recherche
   - Cliquez sur "Analyser" pour voir les détails de la page

2. **Authentification**
   - Cliquez sur le bouton de connexion Google
   - Autorisez l'application à accéder à votre compte

3. **Avis**
   - Une fois connecté, vous pouvez laisser un avis sur une page
   - Notez la page de 1 à 5 étoiles
   - Ajoutez un commentaire détaillé
   - Vous pouvez modifier ou supprimer votre avis ultérieurement

4. **Mes avis**
   - Accédez à vos avis via le menu utilisateur
   - Consultez l'historique de vos évaluations
   - Cliquez sur un avis pour retourner à la page correspondante

## 🔒 Sécurité

- Les clés API et les informations sensibles sont stockées dans des variables d'environnement
- L'authentification est gérée par Firebase
- Les données sont stockées de manière sécurisée dans Firestore

## 📄 Licence

Ce projet est sous licence MIT. "# Pagesure-app" 
