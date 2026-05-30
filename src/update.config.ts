// ─────────────────────────────────────────────────────────────────────────────
// Configuration des mises à jour automatiques
//
// 1. Créez un GitHub Gist (https://gist.github.com) avec ce contenu :
//    {
//      "version": "1.0.0",
//      "notes": "Description des changements",
//      "apkUrl": "https://lien-vers-votre-apk.apk"
//    }
//
// 2. Cliquez sur "Raw" dans le Gist → copiez l'URL → collez-la dans UPDATE_CHECK_URL.
//
// 3. Chaque fois que vous publiez une nouvelle version :
//    a. Incrémentez la version dans package.json (ex: "1.0.0" → "1.1.0")
//    b. Rebuilder l'APK et uploadez-le (Google Drive, email, etc.)
//    c. Mettez à jour le Gist avec la nouvelle version et l'URL de l'APK.
//    → L'app affichera automatiquement le bandeau de mise à jour au prochain démarrage.
// ─────────────────────────────────────────────────────────────────────────────

// URL du fichier version.json hébergé (laisser vide pour désactiver)
export const UPDATE_CHECK_URL = 'https://gist.githubusercontent.com/yosniper973-ux/0917b8e20da20231edbcd0772109b1c2/raw/version.json';
