# E-Prayog — Netlify & Firebase Live Deployment

## 🚀 Live Site Information
- **Netlify Site:** [https://e-prayog09.netlify.app](https://e-prayog09.netlify.app)
- **GitHub Repository:** [https://github.com/sushantshetty09/E-Prayog](https://github.com/sushantshetty09/E-Prayog)
- **Team / Account:** Innovision Syndicate (`sushantshetty09@gmail.com`)

---

## 🔐 Configured Environment Variables on Netlify
The following environment variables have been synchronized to Netlify:

| Environment Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `e-prayog09.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `e-prayog09` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `e-prayog09.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `380562436070` |
| `VITE_FIREBASE_APP_ID` | `1:380562436070:web:75bd98e76da508dd96b027` |
| `VITE_GEMINI_API_KEY` | Google Gemini AI Key for Tutor & Quiz Generator |

---

## ⚠️ Required Action: Authorize Domain in Firebase Console
Firebase Authentication restricts sign-in/sign-up requests to authorized domains.

To ensure students and teachers can authenticate on the live site:
1. Open the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **`e-prayog09`**
3. In the left navigation, click **Authentication**
4. Click on the **Settings** tab
5. Select **Authorized domains**
6. Click **Add domain** and enter:
   ```text
   e-prayog09.netlify.app
   ```
7. Click **Save**
