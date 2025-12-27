// ui.js: Manejo de interfaz: selección de personaje, tienda, HUD.
import { CHARACTERS } from "./game.js";

export class UI {
  constructor(leftPanelEl, hudEl, store) {
    this.left = leftPanelEl;
    this.hud = hudEl;
    this.store = store;
    this.game = null;
    this.buildLeft();
    this.buildHUD();
  }

  bindGame(game) {
    this.game = game;
    this.populateCharacters();
  }

  buildLeft() {
    this.left.innerHTML = `
      <div class="panel-section">
        <h3>Seleccionar Personaje</h3>
        <div id="char-list" class="selectable"></div>
      </div>
      <div class="panel-section">
        <h3>Tienda (estilos)</h3>
        <div id="store-list"></div>
      </div>
      <div class="panel-section">
        <h3>Monedas</h3>
        <div class="small">Balance: <span id="coin-balance">0</span> coins</div>
        <div style="margin-top:8px">
          <button id="btn-topup" class="btn">Top up +10 (simulado)</button>
        </div>
      </div>
      <div class="panel-section">
        <h3>Modo de prueba</h3>
        <div class="small">Todas las compras en este prototipo se simulan localmente por defecto.</div>
      </div>
    `;
    this.left.querySelector('#btn-topup').addEventListener('click', () => {
      this.store.topUp(10);
      this.updateCoins();
    });
    this.updateCoins();
    this.buildStore();
  }

  populateCharacters() {
    const holder = this.left.querySelector('#char-list');
    holder.innerHTML = '';
    CHARACTERS.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.className = 'char-btn';
      btn.innerText = `${c.name} (${c.style})`;
      btn.addEventListener('click', () => {
        if (this.game) this.game.selectCharacter(idx);
      });
      holder.appendChild(btn);
    });
  }

  buildStore() {
    const storeList = this.left.querySelector('#store-list');
    storeList.innerHTML = '';
    const items = [
      { id: 'neon-style', label: 'Neon Glow', price: 1.99 },
      { id: 'gold-skin', label: 'Golden Armor', price: 2.99 },
      { id: 'shadow-trail', label: 'Shadow Trail', price: 1.49 }
    ];
    items.forEach(it => {
      const d = document.createElement('div');
      d.className = 'store-item';
      d.innerHTML = `<div>${it.label}</div><div><button class="btn buy" data-id="${it.id}">Buy $${it.price}</button></div>`;
      storeList.appendChild(d);
    });
    storeList.querySelectorAll('.buy').forEach(b => b.addEventListener('click', async (ev) => {
      const id = ev.currentTarget.dataset.id;
      const res = this.store.purchaseStyle(id);
      if (res && res.then) {
        // promise (stripe)
        const rr = await res;
        if (!rr.ok) alert(rr.message || 'Error');
      } else {
        if (!res.ok) alert(res.message || 'Error en compra');
        else {
          alert('Estilo desbloqueado!');
          this.updateCoins();
        }
      }
    }));
  }

  updateCoins() {
    const el = this.left.querySelector('#coin-balance');
    el.innerText = String(this.store.getCoins());
  }

  buildHUD() {
    this.hud.innerHTML = `
      <div class="hud-bar">
        <div class="status">
          <div><strong>Jugador</strong></div>
          <div class="bar" id="player-health"><i style="width:100%;background:linear-gradient(90deg,#ff4d4d,#ff8a8a)"></i></div>
          <div class="bar" id="player-stamina"><i style="width:100%;background:linear-gradient(90deg,#4cffc8,#00a37a)"></i></div>
        </div>
        <div style="margin-left:24px" class="status">
          <div><strong>Oponente</strong></div>
          <div class="bar" id="enemy-health"><i style="width:100%;background:linear-gradient(90deg,#ff4d4d,#ff8a8a)"></i></div>
          <div class="bar" id="enemy-stamina"><i style="width:100%;background:linear-gradient(90deg,#4cffc8,#00a37a)"></i></div>
        </div>
      </div>
    `;
  }

  updateHUD(player, enemy) {
    const pHealth = Math.max(0, Math.round(player.hp));
    const pStam = Math.max(0, Math.round(player.stamina));
    const eHealth = Math.max(0, Math.round(enemy.hp));
    const eStam = Math.max(0, Math.round(enemy.stamina));
    this.hud.querySelector('#player-health i').style.width = `${pHealth}%`;
    this.hud.querySelector('#player-stamina i').style.width = `${pStam}%`;
    this.hud.querySelector('#enemy-health i').style.width = `${eHealth}%`;
    this.hud.querySelector('#enemy-stamina i').style.width = `${eStam}%`;
  }

  showMessage(txt, timeout=1500) {
    const el = document.createElement('div');
    el.className = 'center';
    el.style.position='absolute';
    el.style.left='50%';
    el.style.top='12%';
    el.style.transform='translateX(-50%)';
    el.style.padding='8px 12px';
    el.style.background='rgba(0,0,0,0.5)';
    el.style.border='1px solid rgba(255,255,255,0.05)';
    el.innerText = txt;
    document.getElementById('canvas-wrap').appendChild(el);
    setTimeout(()=>el.remove(), timeout);
  }
}
