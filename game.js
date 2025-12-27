// game.js: lógica de juego y renderizado con Three.js
import * as THREE from 'three';

// Definición de 10 personajes con estilos de combate distintos.
// Cada personaje tiene: name, style, color, stats, moves (light/heavy/special)
export const CHARACTERS = [
  { name: "Akira", style: "Karate", color: 0xff5c7c, speed: 6, hp: 100, moves: { light: { dmg:8, cost:6, wind:200 }, heavy: { dmg:18, cost:14, wind:500 }, special: { dmg:32, cost:30, wind:900 } } },
  { name: "Maya", style: "Taekwondo", color: 0x4fc1ff, speed: 7, hp: 95, moves: { light: { dmg:7, cost:5, wind:180 }, heavy: { dmg:20, cost:16, wind:520 }, special: { dmg:28, cost:26, wind:800 } } },
  { name: "Rex", style: "Boxing", color: 0xffd86b, speed: 5, hp: 110, moves: { light: { dmg:9, cost:5, wind:150 }, heavy: { dmg:22, cost:18, wind:600 }, special: { dmg:36, cost:36, wind:1000 } } },
  { name: "Lina", style: "Capoeira", color: 0x9b59ff, speed: 7.5, hp: 92, moves: { light: { dmg:6, cost:5, wind:160 }, heavy: { dmg:16, cost:12, wind:420 }, special: { dmg:30, cost:28, wind:780 } } },
  { name: "Gao", style: "Kung Fu", color: 0x46ffb3, speed: 6.5, hp: 100, moves: { light: { dmg:8, cost:6, wind:190 }, heavy: { dmg:19, cost:15, wind:480 }, special: { dmg:34, cost:32, wind:920 } } },
  { name: "Nova", style: "Muay Thai", color: 0xff7a29, speed: 5.8, hp: 106, moves: { light: { dmg:9, cost:6, wind:200 }, heavy: { dmg:21, cost:18, wind:580 }, special: { dmg:38, cost:34, wind:980 } } },
  { name: "Kira", style: "Judo", color: 0x7cd3ff, speed: 5.2, hp: 112, moves: { light: { dmg:7, cost:5, wind:170 }, heavy: { dmg:20, cost:17, wind:560 }, special: { dmg:40, cost:38, wind:1100 } } },
  { name: "Izan", style: "Aikido", color: 0x8dff7a, speed: 6, hp: 104, moves: { light: { dmg:6, cost:4, wind:150 }, heavy: { dmg:15, cost:11, wind:400 }, special: { dmg:26, cost:24, wind:750 } } },
  { name: "Vera", style: "Kickboxing", color: 0xff6fd8, speed: 6.2, hp: 98, moves: { light: { dmg:8, cost:6, wind:180 }, heavy: { dmg:18, cost:15, wind:500 }, special: { dmg:32, cost:30, wind:900 } } },
  { name: "Taro", style: "Wrestling", color: 0xd6ff4f, speed: 5.0, hp: 118, moves: { light: { dmg:10, cost:7, wind:220 }, heavy: { dmg:24, cost:20, wind:700 }, special: { dmg:42, cost:40, wind:1200 } } }
];

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

export class Game {
  constructor(hostEl, ui, store) {
    this.host = hostEl;
    this.ui = ui;
    this.store = store;
    this.width = hostEl.clientWidth;
    this.height = hostEl.clientHeight;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 2000);
    this.camera.position.set(0, 8, 18);
    this.renderer = new THREE.WebGLRenderer({ antialias:true });
    this.renderer.setSize(this.width, this.height);
    this.host.appendChild(this.renderer.domElement);

    // Light + arena
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(-5,10,5);
    this.scene.add(dir);

    this.raycaster = new THREE.Raycaster();

    this.controlsEnabled = true;

    this.clock = new THREE.Clock();
    this.lastTime = 0;

    this._setupArena();
    this._setupCharacters();

    this.bindInputs();

    this.selectedIdx = 0;
    this.selectCharacter(0);

    this.player = this._createPlayer(true);
    this.enemy = this._createPlayer(false);
    this.resetMatch();

    window.addEventListener('resize', ()=> this.onResize());
  }

  start() {
    this.running = true;
    this.animate();
  }

  onResize(){
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  _setupArena(){
    const g = new THREE.PlaneGeometry(40, 24);
    const mat = new THREE.MeshStandardMaterial({ color:0x0b1630, roughness:0.8 });
    const floor = new THREE.Mesh(g, mat);
    floor.rotation.x = -Math.PI/2;
    this.scene.add(floor);
    // ring
    const edge = new THREE.RingGeometry(12.5, 13, 64);
    const emat = new THREE.MeshBasicMaterial({ color:0x13263f, side:THREE.DoubleSide });
    const ring = new THREE.Mesh(edge, emat);
    ring.rotation.x = -Math.PI/2;
    ring.position.y = 0.01;
    this.scene.add(ring);
  }

  _setupCharacters(){
    this.characterPrototypes = CHARACTERS.map(c => {
      // prototipo visual: grupo con torso, head, arms, legs
      const g = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4,2.2,0.8), new THREE.MeshStandardMaterial({ color:c.color }));
      torso.position.y = 2.2;
      g.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8,8), new THREE.MeshStandardMaterial({ color:0xffddb4 }));
      head.position.y = 3.6;
      g.add(head);
      const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.4,1.6,0.4), new THREE.MeshStandardMaterial({ color:c.color }));
      rArm.position.set(1.0,2.6,0);
      g.add(rArm);
      const lArm = rArm.clone(); lArm.position.x = -1.0; g.add(lArm);
      const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5,1.8,0.5), new THREE.MeshStandardMaterial({ color:0x111111 }));
      rLeg.position.set(0.45,0.8,0);
      g.add(rLeg);
      const lLeg = rLeg.clone(); lLeg.position.x = -0.45; g.add(lLeg);
      return { charData: c, mesh: g };
    });
  }

  _createPlayer(isPlayer){
    const obj = {
      isPlayer,
      charIdx: this.selectedIdx,
      group: this.characterPrototypes[this.selectedIdx].mesh.clone(),
      hp: 100,
      stamina: 100,
      pos: new THREE.Vector3(isPlayer ? -6 : 6, 0, 0),
      vel: new THREE.Vector3(),
      facing: isPlayer ? 1 : -1,
      state: 'idle', // idle, moving, attacking, stunned
      attackCooldown: 0,
      lastMoveTime: 0,
      specialReady: true
    };
    obj.group.position.copy(obj.pos);
    this.scene.add(obj.group);
    return obj;
  }

  resetMatch() {
    // remove old groups
    if (this.player.group) this.scene.remove(this.player.group);
    if (this.enemy.group) this.scene.remove(this.enemy.group);
    this.player = this._createPlayer(true);
    this.enemy = this._createPlayer(false);
    // init HP from selected chars
    this.player.charIdx = this.selectedIdx;
    this.player.hp = CHARACTERS[this.player.charIdx].hp;
    this.enemy.charIdx = (this.selectedIdx + 1) % CHARACTERS.length;
    this.enemy.hp = CHARACTERS[this.enemy.charIdx].hp;
    this.player.stamina = 100; this.enemy.stamina = 100;
    this.ui.showMessage("Combate iniciado", 1200);
  }

  selectCharacter(idx) {
    this.selectedIdx = idx;
    // if game running, update visuals of player
    if (this.player) {
      this.player.charIdx = idx;
      // swap mesh
      if (this.player.group) this.scene.remove(this.player.group);
      this.player.group = this.characterPrototypes[idx].mesh.clone();
      this.player.group.position.copy(this.player.pos);
      this.scene.add(this.player.group);
    }
  }

  bindInputs() {
    this.keys = {};
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    // simple touch buttons
    // create overlay buttons on mobile
    const touchDiv = document.createElement('div');
    touchDiv.style.position='absolute';
    touchDiv.style.right='16px';
    touchDiv.style.bottom='16px';
    touchDiv.className='touch-controls';
    touchDiv.innerHTML = `<button class="touch-btn" id="t-light">Light</button><button class="touch-btn" id="t-heavy">Heavy</button><button class="touch-btn" id="t-spec">Special</button><button class="touch-btn" id="t-block">Block</button>`;
    this.host.appendChild(touchDiv);
    touchDiv.querySelector('#t-light').addEventListener('click', ()=> this.inputAttack('light'));
    touchDiv.querySelector('#t-heavy').addEventListener('click', ()=> this.inputAttack('heavy'));
    touchDiv.querySelector('#t-spec').addEventListener('click', ()=> this.inputAttack('special'));
    touchDiv.querySelector('#t-block').addEventListener('click', ()=> this.keys['shift'] = true);
    touchDiv.querySelector('#t-block').addEventListener('touchend', ()=> this.keys['shift'] = false);
  }

  inputAttack(type) {
    if (type === 'light') this.keys['j'] = true;
    if (type === 'heavy') this.keys['k'] = true;
    if (type === 'special') this.keys['l'] = true;
    setTimeout(()=>{ this.keys['j']=this.keys['k']=this.keys['l']=false }, 80);
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame(()=>this.animate());
    const dt = this.clock.getDelta() * 1000;
    this.update(dt);
    TWEEN.update();
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    // Player controls
    this._updatePlayerControl(this.player, dt);
    // Simple AI for enemy
    this._updateAI(this.enemy, this.player, dt);
    // Movement and collision
    this._movementStep(this.player, dt);
    this._movementStep(this.enemy, dt);
    // Update HUD
    const pPct = clamp((this.player.hp / CHARACTERS[this.player.charIdx].hp) * 100, 0, 100);
    const ePct = clamp((this.enemy.hp / CHARACTERS[this.enemy.charIdx].hp) * 100, 0, 100);
    this.ui.updateHUD({hp:pPct, stamina:this.player.stamina}, {hp:ePct, stamina:this.enemy.stamina});
    // Check win/lose
    if (this.player.hp <= 0 || this.enemy.hp <=0) {
      const winner = this.player.hp > 0 ? "Jugador gana!" : "Oponente gana!";
      this.ui.showMessage(winner, 2500);
      this.resetMatch();
    }
  }

  _updatePlayerControl(player, dt) {
    // movement
    const speed = CHARACTERS[player.charIdx].speed;
    let move = 0;
    if (this.keys['a'] || this.keys['arrowleft']) move -= 1;
    if (this.keys['d'] || this.keys['arrowright']) move += 1;
    player.vel.x = move * speed * 0.02 * dt;
    if (move !== 0) {
      player.facing = move > 0 ? 1 : -1;
      player.state = 'moving';
    } else player.state = 'idle';

    // attacks
    if ((this.keys['j'] || false) && player.attackCooldown <= 0) {
      this._performAttack(player, this.enemy, 'light');
    }
    if ((this.keys['k'] || false) && player.attackCooldown <= 0) {
      this._performAttack(player, this.enemy, 'heavy');
    }
    if ((this.keys['l'] || false) && player.attackCooldown <= 0) {
      this._performAttack(player, this.enemy, 'special');
    }
    // block
    player.isBlocking = !!this.keys['shift'];
    // regen stamina
    player.stamina = clamp(player.stamina + 0.02 * dt, 0, 100);
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.group.position.x = clamp(player.group.position.x + player.vel.x, -12, 12);
    player.pos.copy(player.group.position);
    // visual facing
    player.group.rotation.y = player.facing < 0 ? Math.PI : 0;
  }

  _updateAI(ai, target, dt) {
    // simple state machine
    const dist = target.group.position.distanceTo(ai.group.position);
    const moveDir = Math.sign(target.group.position.x - ai.group.position.x);
    if (ai.attackCooldown <= 0 && dist < 4.2) {
      // attack choice based on stamina
      const choice = Math.random();
      if (choice < 0.6) this._performAttack(ai, target, 'light');
      else this._performAttack(ai, target, 'heavy');
    } else {
      // move towards player
      ai.vel.x = moveDir * CHARACTERS[ai.charIdx].speed * 0.02 * dt * 0.8;
      ai.group.position.x = clamp(ai.group.position.x + ai.vel.x, -12, 12);
      ai.pos.copy(ai.group.position);
      ai.facing = moveDir > 0 ? 1 : -1;
      ai.group.rotation.y = ai.facing < 0 ? Math.PI : 0;
    }
    ai.stamina = clamp(ai.stamina + 0.02 * dt * 0.8, 0, 100);
    ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);
  }

  _movementStep(obj, dt) {
    // simple gravity / floor alignment
    obj.group.position.y = 0; // locked to floor for prototype
    // add simple bob animation
    const bob = Math.sin(Date.now() * 0.002 + (obj.isPlayer?0:1)) * 0.05;
    obj.group.position.y = bob + 0.1;
  }

  _performAttack(attacker, defender, type) {
    const char = CHARACTERS[attacker.charIdx];
    const mv = char.moves[type];
    if (!mv) return;
    if (attacker.stamina < mv.cost) {
      this.ui.showMessage("Sin stamina", 800);
      return;
    }
    attacker.stamina -= mv.cost;
    attacker.attackCooldown = mv.wind;
    // attack animation: simple forward lunge and recoil
    const fromX = attacker.group.position.x;
    const toX = fromX + attacker.facing * 0.8;
    new TWEEN.Tween(attacker.group.position).to({ x: toX }, mv.wind * 0.5).easing(TWEEN.Easing.Cubic.Out).yoyo(true).repeat(1).start();
    // check collision (distance) after short delay
    setTimeout(()=> {
      const dist = attacker.group.position.distanceTo(defender.group.position);
      if (dist < 3.2) {
        // apply damage considering blocking
        let dmg = mv.dmg;
        if (defender.isBlocking) dmg = Math.max(1, dmg * 0.35);
        defender.hp = Math.max(0, defender.hp - dmg);
        // stun / knockback
        defender.group.position.x += attacker.facing * 0.6;
      }
    }, mv.wind * 0.25);
    // visual effect: brief color flash
    const mat = attacker.group.children[0].material;
    const orig = mat.color.getHex();
    mat.emissive = new THREE.Color(0x222222);
    setTimeout(()=>{ mat.emissive = new THREE.Color(0x000000); }, 120);
  }
}
