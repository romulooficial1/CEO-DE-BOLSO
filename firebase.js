(function () {
  const demoKey = "ceo-demo-user";
  const businessKey = "ceo-demo-business";
  const profileKey = "ceo-demo-profile";
  const historyKey = "ceo-demo-history";
  const hasConfig = Boolean(window.firebaseConfig && window.firebaseConfig.apiKey && window.firebaseConfig.apiKey !== "SUA_API_KEY");

  const state = {
    ready: false,
    demo: !hasConfig,
    app: null,
    auth: null,
    db: null,
    modules: null,
    user: null
  };

  function monthKey() {
    return new Date().toISOString().slice(0, 7);
  }

  function demoUser() {
    const email = localStorage.getItem(demoKey);
    return email ? { uid: "demo-user", email, displayName: "Usuario demo", demo: true } : null;
  }

  function getJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "") || fallback;
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function boot() {
    if (state.ready || !hasConfig) {
      state.ready = true;
      return state;
    }

    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

    state.app = appModule.initializeApp(window.firebaseConfig);
    state.auth = authModule.getAuth(state.app);
    state.db = firestoreModule.getFirestore(state.app);
    state.modules = { authModule, firestoreModule };
    state.ready = true;
    return state;
  }

  async function ensureProfile(user) {
    await boot();
    if (!user) return null;
    if (state.demo) {
      const profile = getJson(profileKey, {});
      const next = {
        uid: user.uid,
        email: user.email,
        premium: Boolean(profile.premium),
        usage: profile.usage || {},
        createdAt: profile.createdAt || new Date().toISOString()
      };
      setJson(profileKey, next);
      return next;
    }

    const { doc, getDoc, setDoc, serverTimestamp } = state.modules.firestoreModule;
    const ref = doc(state.db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        {
          email: user.email || "",
          premium: false,
          usage: {},
          createdAt: serverTimestamp()
        },
        { merge: true }
      );
      return { email: user.email || "", premium: false, usage: {} };
    }
    return snap.data();
  }

  async function getProfile() {
    await boot();
    const user = state.user || demoUser();
    if (!user) return null;
    if (state.demo) return getJson(profileKey, { email: user.email, premium: false, usage: {} });
    const { doc, getDoc } = state.modules.firestoreModule;
    const snap = await getDoc(doc(state.db, "users", user.uid));
    return snap.exists() ? snap.data() : ensureProfile(user);
  }

  async function saveProfile(data) {
    await boot();
    const user = state.user || demoUser();
    if (!user) return null;
    if (state.demo) {
      const current = getJson(profileKey, {});
      const next = { ...current, ...data };
      setJson(profileKey, next);
      return next;
    }
    const { doc, setDoc, serverTimestamp } = state.modules.firestoreModule;
    await setDoc(doc(state.db, "users", user.uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return getProfile();
  }

  async function getBusiness() {
    await boot();
    const user = state.user || demoUser();
    if (!user) return null;
    if (state.demo) return getJson(businessKey, null);
    const { doc, getDoc } = state.modules.firestoreModule;
    const snap = await getDoc(doc(state.db, "users", user.uid, "business", "current"));
    return snap.exists() ? snap.data() : null;
  }

  async function saveBusiness(data) {
    await boot();
    const user = state.user || demoUser();
    if (!user) throw new Error("Usuario nao autenticado.");
    const clean = { ...data, updatedAt: new Date().toISOString() };
    if (state.demo) {
      setJson(businessKey, clean);
      return clean;
    }
    const { doc, setDoc, serverTimestamp } = state.modules.firestoreModule;
    await setDoc(doc(state.db, "users", user.uid, "business", "current"), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return getBusiness();
  }

  async function saveHistory(item) {
    await boot();
    const user = state.user || demoUser();
    if (!user) return;
    if (state.demo) {
      const history = getJson(historyKey, []);
      history.unshift({ ...item, createdAt: new Date().toISOString() });
      setJson(historyKey, history.slice(0, 40));
      return;
    }
    const { collection, addDoc, serverTimestamp } = state.modules.firestoreModule;
    await addDoc(collection(state.db, "users", user.uid, "aiHistory"), { ...item, createdAt: serverTimestamp() });
  }

  async function incrementUsage() {
    const profile = (await getProfile()) || {};
    const usage = profile.usage || {};
    const key = monthKey();
    usage[key] = Number(usage[key] || 0) + 1;
    await saveProfile({ usage });
    return usage[key];
  }

  window.CEOFirebase = {
    state,
    hasConfig,
    monthKey,
    boot,
    async onAuth(callback) {
      await boot();
      if (state.demo) {
        state.user = demoUser();
        callback(state.user);
        return () => {};
      }
      const { onAuthStateChanged } = state.modules.authModule;
      return onAuthStateChanged(state.auth, async (user) => {
        state.user = user;
        if (user) await ensureProfile(user);
        callback(user);
      });
    },
    async signInEmail(email, password) {
      await boot();
      if (state.demo) {
        localStorage.setItem(demoKey, email);
        state.user = demoUser();
        await ensureProfile(state.user);
        return state.user;
      }
      const { signInWithEmailAndPassword } = state.modules.authModule;
      const result = await signInWithEmailAndPassword(state.auth, email, password);
      await ensureProfile(result.user);
      return result.user;
    },
    async signUpEmail(email, password) {
      await boot();
      if (state.demo) {
        localStorage.setItem(demoKey, email);
        state.user = demoUser();
        await ensureProfile(state.user);
        return state.user;
      }
      const { createUserWithEmailAndPassword } = state.modules.authModule;
      const result = await createUserWithEmailAndPassword(state.auth, email, password);
      await ensureProfile(result.user);
      fetch("/api/send-welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }).catch(() => {});
      return result.user;
    },
    async signInGoogle() {
      await boot();
      if (state.demo) {
        localStorage.setItem(demoKey, "demo@ceodebolso.ai");
        state.user = demoUser();
        await ensureProfile(state.user);
        return state.user;
      }
      const { GoogleAuthProvider, signInWithPopup } = state.modules.authModule;
      const result = await signInWithPopup(state.auth, new GoogleAuthProvider());
      await ensureProfile(result.user);
      return result.user;
    },
    async resetPassword(email) {
      await boot();
      if (state.demo) return true;
      const { sendPasswordResetEmail } = state.modules.authModule;
      await sendPasswordResetEmail(state.auth, email);
      return true;
    },
    async logout() {
      await boot();
      if (state.demo) {
        localStorage.removeItem(demoKey);
        state.user = null;
        return;
      }
      await state.modules.authModule.signOut(state.auth);
    },
    async getToken() {
      await boot();
      if (state.demo || !state.auth?.currentUser) return "";
      return state.auth.currentUser.getIdToken();
    },
    currentUser() {
      return state.user || demoUser();
    },
    ensureProfile,
    getProfile,
    saveProfile,
    getBusiness,
    saveBusiness,
    saveHistory,
    incrementUsage
  };
})();
