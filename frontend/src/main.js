import { Game } from "./game.js";
import { UI } from "./ui.js";
import { Store } from "./store.js";

window.addEventListener('load', () => {
  const root = document.getElementById('root');
  // Header + layout
  root.innerHTML = `
    <div class="header">
      <h1>FightBox — Prototipo</h1>
      <div class="small">Controles: A/D = moverse • J = Light • K = Heavy • L = Special • Shift = Block</div>
    </div>
    <div class="container">
      <div class="left-panel" id="left-panel"></div>
      <div class="canvas-wrap" id="canvas-wrap" style="position:relative;">
        <div id="canvas-host" class="canvas3d" style="width:100%;height:80vh"></div>
        <div id="hud" class="hud"></div>
      </div>
    </div>
  `;

  const store = new Store(); // modo local por defecto
  const ui = new UI(document.getElementById('left-panel'), document.getElementById('hud'), store);
  const game = new Game(document.getElementById('canvas-host'), ui, store);
  ui.bindGame(game);
  game.start();
});
