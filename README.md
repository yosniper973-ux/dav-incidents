# DAV Incidents

Application mobile Android de suivi des prêts de blouse au DAV — CHU de Cayenne.

---

## 1. Développement et test navigateur

```bash
cd dav-incidents
npm install          # installe tout + copie sql-wasm.wasm dans public/
npm run dev          # ouvre http://localhost:5173
```

**Ce que vous pouvez tester dans le navigateur :**
- Créer un agent (bouton + en bas à droite)
- Saisir un solde négatif → bandeau rouge ⛔ STOP
- Saisir un solde positif → bandeau vert ✅ OK
- Enregistrer un prêt de blouse
- Voir l'agent bloqué dans la liste de rappel
- Générer l'Excel à deux feuilles (téléchargement direct)

Les données sont sauvegardées dans IndexedDB, elles persistent d'une session à l'autre.

---

## 2. Déclarer ANDROID_HOME dans ~/.zshrc

Android Studio installe le SDK dans `~/Library/Android/sdk` par défaut.

```bash
# Ouvrir ~/.zshrc
open -e ~/.zshrc
```

Ajouter ces lignes à la fin :

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Appliquer immédiatement :

```bash
source ~/.zshrc
```

Vérifier :

```bash
adb version          # doit afficher la version d'adb
sdkmanager --list    # doit lister les packages SDK
```

---

## 3. Construire l'APK — étape par étape

### 3.1 — Installer les dépendances et builder le web

```bash
cd dav-incidents
npm install
npm run build        # génère le dossier dist/
```

### 3.2 — Ajouter la plateforme Android (première fois seulement)

```bash
npx cap add android
```

### 3.3 — Synchroniser le code web vers Android

À faire **après chaque** `npm run build` :

```bash
npx cap sync android
```

### 3.4 — Compiler l'APK de debug via Gradle

```bash
cd android
./gradlew assembleDebug
```

La compilation dure 2 à 5 minutes la première fois (Gradle télécharge ses dépendances).

### 3.5 — Trouver l'APK généré

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Installer l'APK sur le téléphone

### Via câble USB

1. Activer les **Options développeur** sur Android :  
   Paramètres → À propos du téléphone → tapez 7 fois sur « Numéro de build »

2. Activer le **Débogage USB** dans Options développeur

3. Brancher le câble USB et accepter la connexion sur le téléphone

4. Installer :

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Réinstaller si l'app est déjà présente :

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Sans câble (Wi-Fi — téléphone et Mac sur le même réseau)

**Android 11+ :**

1. Options développeur → activer **Débogage sans fil**
2. Ouvrir « Débogage sans fil » → « Associer l'appareil avec un code d'association »
3. Récupérer l'adresse IP, le port et le code affichés sur le téléphone

```bash
adb pair <IP_TELEPHONE>:<PORT_ASSOCIATION>
# entrer le code affiché sur le téléphone
adb connect <IP_TELEPHONE>:<PORT_DEBUG>
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Méthode universelle (envoyer le fichier directement) :**

- Transférer `app-debug.apk` par Gmail, WhatsApp ou Google Drive
- Ouvrir le fichier sur le téléphone
- Accepter l'installation depuis des sources inconnues si demandé

---

## 5. Permissions Android requises

Le fichier `android/app/src/main/AndroidManifest.xml` doit contenir (ajouté automatiquement par `cap sync`) :

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

Si l'export Excel échoue sur Android, vérifiez que ces permissions sont présentes.

---

## 6. Résumé des commandes au quotidien

| Étape | Commande |
|---|---|
| Modifier le code | `npm run dev` |
| Builder pour Android | `npm run build` |
| Synchroniser | `npx cap sync android` |
| Compiler APK | `cd android && ./gradlew assembleDebug` |
| Installer (câble) | `adb install -r android/.../app-debug.apk` |

---

## 7. Structure du projet

```
src/
  types/index.ts          — interfaces TypeScript
  services/
    database.ts           — SQLite (local, offline-first)
    exportService.ts      — Export Excel + partage Android
  components/
    CreateAgentModal.tsx  — Création d'une fiche agent
    SoldeModal.tsx        — Saisie du solde Polytex
    LoanModal.tsx         — Enregistrement d'un prêt
  pages/
    Home.tsx              — Accueil : recherche + liste de rappel
    AgentDetail.tsx       — Fiche agent complète
  App.tsx                 — Navigation + init base de données
  main.tsx                — Point d'entrée
```
