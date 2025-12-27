// store.js: sistema de tienda y micropagos (modo local y opción Stripe)
// Modo por defecto: LOCAL_MODE = true -> las "compras" se guardan en localStorage.
// Si quieres integrar Stripe, setea REAL_PAYMENTS = true y configura backend /api/create-checkout-session

export class Store {
  constructor() {
    this.LOCAL_MODE = true; // Cambia a false para activar compras reales (requiere backend)
    this.REAL_PAYMENTS = false;
    this.backendUrl = ""; // Si ejecutas backend en otra URL, ponla aquí (ej: http://localhost:4242)
    this.coinsKey = "fightbox_coins";
    this.ownedKey = "fightbox_owned_styles";
    this.prices = {
      "neon-style": 1.99,
      "gold-skin": 2.99,
      "shadow-trail": 1.49
    };
    this.init();
  }

  init() {
    if (!localStorage.getItem(this.coinsKey)) localStorage.setItem(this.coinsKey, "10"); // monedas iniciales
    if (!localStorage.getItem(this.ownedKey)) localStorage.setItem(this.ownedKey, JSON.stringify([]));
  }

  getCoins() {
    return Number(localStorage.getItem(this.coinsKey) || 0);
  }

  setCoins(n) {
    localStorage.setItem(this.coinsKey, String(n));
  }

  isOwned(styleId) {
    const arr = JSON.parse(localStorage.getItem(this.ownedKey) || "[]");
    return arr.includes(styleId);
  }

  unlockLocal(styleId) {
    const arr = JSON.parse(localStorage.getItem(this.ownedKey) || "[]");
    if (!arr.includes(styleId)) {
      arr.push(styleId);
      localStorage.setItem(this.ownedKey, JSON.stringify(arr));
    }
  }

  purchaseStyle(styleId) {
    // Si LOCAL_MODE, consumimos "monedas" y desbloqueamos
    if (this.LOCAL_MODE) {
      const price = Math.ceil((this.prices[styleId] || 1) * 10); // convertimos a "coins" (ej)
      const coins = this.getCoins();
      if (coins < price) return { ok: false, message: "No tienes suficientes monedas. Usa 'Top up'."};
      this.setCoins(coins - price);
      this.unlockLocal(styleId);
      return { ok: true };
    } else if (this.REAL_PAYMENTS) {
      // Llamar backend para iniciar checkout (Stripe)
      return this.startStripeCheckout(styleId);
    } else {
      return { ok: false, message: "Pagos desactivados en configuración."};
    }
  }

  async startStripeCheckout(styleId) {
    // Requiere backend con /api/create-checkout-session que devuelva url de checkout
    const price = this.prices[styleId] || 1.99;
    try {
      const resp = await fetch((this.backendUrl || "") + "/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price,
          styleId,
          successUrl: window.location.href + "?purchase=success&style=" + styleId,
          cancelUrl: window.location.href + "?purchase=cancel"
        })
      });
      const j = await resp.json();
      if (j.url) {
        window.location.href = j.url;
      } else return { ok: false, message: j.error || "No se pudo crear sesión" };
    } catch (err) {
      return { ok: false, message: err.message || String(err) };
    }
  }

  topUp(coins) {
    // En modo local, añade monedas (simula compra)
    const c = this.getCoins();
    this.setCoins(c + coins);
  }
}
