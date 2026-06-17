(function () {
  const state = {
    enabled: false,
    app: null,
    auth: null,
    db: null
  };

  async function boot() {
    if (!window.firebaseConfig || window.firebaseConfig.apiKey === "SUA_API_KEY") {
      return state;
    }

    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

    state.app = appModule.initializeApp(window.firebaseConfig);
    state.auth = authModule.getAuth(state.app);
    state.db = firestoreModule.getFirestore(state.app);
    state.GoogleAuthProvider = authModule.GoogleAuthProvider;
    state.signInWithPopup = authModule.signInWithPopup;
    state.createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
    state.signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
    state.signOut = authModule.signOut;
    state.enabled = true;
    return state;
  }

  window.CEOFirebase = {
    state,
    boot,
    async signInWithGoogle() {
      await boot();
      if (!state.enabled) return null;
      const provider = new state.GoogleAuthProvider();
      return state.signInWithPopup(state.auth, provider);
    },
    async signInWithEmail(email, password) {
      await boot();
      if (!state.enabled) return null;
      return state.signInWithEmailAndPassword(state.auth, email, password);
    },
    async createAccount(email, password) {
      await boot();
      if (!state.enabled) return null;
      return state.createUserWithEmailAndPassword(state.auth, email, password);
    },
    async signOut() {
      await boot();
      if (!state.enabled) return null;
      return state.signOut(state.auth);
    }
  };
})();
