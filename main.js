// ====================================================
// DADOS DO JOGO
// ====================================================

const WORDS = {
  "Figuras de Linguagem": [
    'Metáfora', 'Metonímia', 'Comparação', 'Catacrese', 'Sinestesia', 'Perífrase', 'Hipérbole', 'Eufemismo', 'Ironia', 'Antítese', 'Prosopopeia', 'Gradação', 'Pleonasmo', 'Anáfora', 'Onomatopeia', 'Aliteração', 'Paronomásia'
  ],
  "Formação de Palavras": [
    'Derivação','Composição Por Justaposição', 'Composição Por Aglutinação', 'Abreviação', 'Sigla', 'Hibridismo', 'Estrangeirismo'
  ]
};

const ROLE_CONFIG = {
  6: { inocentes: 4, impostores: 1, coringas: 1 },
  8: { inocentes: 5, impostores: 2, coringas: 1 },
  10: { inocentes: 6, impostores: 2, coringas: 2 }
};

const OBJECTIVES = {
  inocente: {
    principal: "Eliminar todos os Impostores.",
    extra: "Não eliminar o Coringa durante a partida."
  },
  impostor: {
    principal: "Sobreviver até o final da partida.",
    extra: "Se sobreviver, usar a palavra corretamente em uma frase."
  },
  coringa: {
    principal: "Ser eliminado pelos demais jogadores.",
    extra: "Ser eliminado na primeira rodada."
  }
};

// ====================================================
// ESTADO GLOBAL
// ====================================================

let state = {
  players: [],       // { name, role, alive, points, mainObj, extraObj, eliminated }
  word: "",
  wordCategory: "",
  revealIndex: 0,
  eliminated: [],
  phase: "reveal"    // reveal | passagem | end
};

// ====================================================
// UTILITÁRIOS
// ====================================================

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }

}

// ====================================================
// TELA DE JOGADORES
// ====================================================

let playerNames = [];

function addPlayer() {
  const input = document.getElementById('playerNameInput');
  const name = input.value.trim();
  if (!name) return;
  if (playerNames.length >= 10) { alert('Máximo de 10 jogadores!'); return; }
  if (playerNames.includes(name)) { alert('Nome já cadastrado!'); return; }
  playerNames.push(name);
  input.value = '';
  renderPlayerList();
  input.focus();
}

function removePlayer(idx) {
  playerNames.splice(idx, 1);
  renderPlayerList();
}

function renderPlayerList() {
  const list = document.getElementById('playerList');
  const count = playerNames.length;
  const valid = [6, 8, 10].includes(count);

  if (count === 0) {
    list.innerHTML = '<div class="dim italic" style="font-size:0.9rem; text-align:center; padding:12px 0;">Nenhum jogador ainda</div>';
  } else {
    list.innerHTML = playerNames.map((n, i) => `
      <div class="player-chip pop">
        <span class="player-chip-num">${i + 1}</span>
        <span class="player-chip-name">${n}</span>
        <button class="remove-btn" onclick="removePlayer(${i})">✕</button>
      </div>
    `).join('');
  }

  document.getElementById('playerCount').textContent = count;
  document.getElementById('countNum').textContent = `${count}/10`;
  document.getElementById('countNum').className = 'count-num ' + (valid ? 'count-valid' : 'count-invalid');

  const notice = document.getElementById('startGameNotice');
  notice.style.display = valid ? '' : 'none';
  document.getElementById('startGameBtn').disabled = !valid;

  const statusMsg = document.getElementById('countStatus').querySelector('span:first-child');
  if (valid) {
    statusMsg.textContent = `✅ Perfeito! ${count} jogadores prontos.`;
  } else {
    const needed = [6, 8, 10];
    const next = needed.find(n => n > count);
    if (next) statusMsg.textContent = `Adicione ${next - count} jogador(es) para chegar a ${next}.`;
    else statusMsg.textContent = 'Número máximo atingido.';
  }
}

// ====================================================
// INICIAR PARTIDA
// ====================================================

function startGame() {
  const n = playerNames.length;
  const cfg = ROLE_CONFIG[n];
  if (!cfg) return;

  // sortear palavra
  const categories = Object.keys(WORDS);
  state.wordCategory = rand(categories);
  state.word = rand(WORDS[state.wordCategory]);

  // montar papéis
  let roles = [];
  for (let i = 0; i < cfg.inocentes; i++)  roles.push('inocente');
  for (let i = 0; i < cfg.impostores; i++) roles.push('impostor');
  for (let i = 0; i < cfg.coringas; i++)   roles.push('coringa');
  roles = shuffle(roles);

  state.players = playerNames.map((name, i) => ({
    name,
    role: roles[i],
    alive: true,
    points: 0,
    mainObj: false,
    extraObj: false,
    eliminated: false
  }));

  state.revealIndex = 0;
  state.eliminated = [];
  state.phase = 'reveal';

  showPassagem(); // começa pela tela de passagem antes do primeiro jogador
}

// ====================================================
// TELA DE PASSAGEM (entre jogadores)
// ====================================================

function showPassagem() {
  const idx = state.revealIndex;
  const total = state.players.length;
  const player = state.players[idx];

  const passagemCard = document.getElementById('passagemCard');
  passagemCard.innerHTML = `
    <div class="passagem-inner">
      <div class="passagem-progress">${idx + 1} de ${total}</div>
      <div class="passagem-icon">🔒</div>
      <div class="passagem-title">Vez de</div>
      <div class="passagem-name">${player.name}</div>
      <div class="passagem-hint">Passe o celular para <strong>${player.name}</strong> — sem mostrar a tela!</div>
    </div>
  `;

  // barra de progresso
  const pct = Math.round((idx / total) * 100);
  document.getElementById('passagemBar').style.width = pct + '%';

  showScreen('screen-passagem');
}

function confirmarPassagem() {
  showReveal();
  showScreen('screen-reveal');
}

// ====================================================
// TELA DE REVELAÇÃO
// ====================================================

function showReveal() {
  const idx = state.revealIndex;
  const player = state.players[idx];
  const total = state.players.length;
  const card = document.getElementById('revealCard');
  const nav = document.getElementById('revealNav');

  const role = player.role;
  const isLast = idx === total - 1;

  const roleLabel = { inocente: '🟢 Inocente', impostor: '🔴 Impostor', coringa: '🟡 Coringa' }[role];
  const roleClass = { inocente: 'role-inocente', impostor: 'role-impostor', coringa: 'role-coringa' }[role];
  const obj = OBJECTIVES[role];

  const canSeeWord = role !== 'impostor';

  const wordBlock = canSeeWord
    ? `<div class="word-reveal">
        <div class="word-category">${state.wordCategory}</div>
        <div class="word-label">Palavra Sorteada</div>
        <div class="word-value">${state.word}</div>
       </div>`
    : `<div class="wait-block">
        <div class="wait-block-icon">🕵️</div>
        <div class="wait-block-title">Você é o Impostor!</div>
        <div class="wait-block-text">Você <strong>não</strong> conhece a palavra. Ouça as pistas dos outros para descobri-la sem revelar sua identidade.</div>
       </div>`;

  card.innerHTML = `
    <div class="reveal-header" style="text-align:center; margin-bottom:16px;">
      <div class="reveal-turn">Jogador ${idx + 1} de ${total}</div>
      <div class="reveal-player-name">${player.name}</div>
      <div style="margin-top:8px;"><span class="role-badge ${roleClass}">${roleLabel}</span></div>
    </div>

    ${wordBlock}

    <div class="sep" style="margin:16px 0 12px;"></div>

    <div class="card-title">Seus Objetivos</div>
    <div class="objectives-list">
      <div class="obj-item">
        <span class="obj-icon">🎯</span>
        <div>
          <div class="obj-label">Principal (+1 pt)</div>
          <div>${obj.principal}</div>
        </div>
      </div>
      <div class="obj-item">
        <span class="obj-icon">⭐</span>
        <div>
          <div class="obj-label">Extra (+1 pt)</div>
          <div>${obj.extra}</div>
        </div>
      </div>
    </div>
  `;

  nav.innerHTML = `
    <div class="flip-btn-wrap">
      <div class="flip-hint">Memorize suas informações e clique para continuar</div>
      <button class="btn btn-primary" onclick="nextReveal()">
        ${isLast ? '🎮 Todos prontos — Iniciar Discussão' : 'Memorizado — Próximo jogador →'}
      </button>
    </div>
  `;
}

function nextReveal() {
  state.revealIndex++;
  if (state.revealIndex >= state.players.length) {
    // todos revelados — vai direto pra tela de jogo/discussão
    showIniciarDiscussao();
  } else {
    showPassagem(); // tela intermediária antes do próximo
  }
}

// ====================================================
// TELA DE INÍCIO DE DISCUSSÃO
// ====================================================

function showIniciarDiscussao() {
  showScreen('screen-game');
  document.getElementById('gameContent').innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:2.5rem; margin-bottom:12px;">🗣️</div>
      <div class="card-title" style="font-size:1.2rem; margin-bottom:8px;">Todos receberam seus papéis!</div>
      <p style="color:var(--text-dim); font-size:0.9rem; margin:0 0 20px;">
        Agora é hora de discutir. Cada jogador dá uma dica sobre a palavra — sem dizer ela diretamente.<br><br>
        Ao final, o grupo decide por votação (à sua maneira) quem eliminar.
      </p>
      <div class="card" style="background:var(--surface-2, rgba(255,255,255,0.04)); margin-bottom:0;">
        <div class="card-title" style="font-size:0.75rem; color:var(--text-dim);">CATEGORIA DA RODADA</div>
        <div style="font-size:1.1rem; font-weight:600; color:var(--accent);">${state.wordCategory}</div>
      </div>
    </div>

    <div class="btn-row" style="margin-top:0;">
      <button class="btn btn-ghost" onclick="showScreen('screen-home')">🏠 Início</button>
      <button class="btn btn-primary" onclick="showResultadoFinal()">🏆 Ver Resultado</button>
    </div>
  `;
}

// ====================================================
// RESULTADO FINAL
// ====================================================

function showResultadoFinal() {
  endGame();
}

function endGame() {
  const impostores = state.players.filter(p => p.role === 'impostor');
  const coringas = state.players.filter(p => p.role === 'coringa');

  // Resultado simplificado: sem votação automática, o jogo não elimina ninguém programaticamente
  // Os jogadores decidem por conta própria e então clicam pra ver o reveal geral
  const anyImpostorAlive = impostores.some(p => p.alive);
  const allImpostoresDead = impostores.every(p => !p.alive);

  // pontuação — como não há votação no app, todos recebem pontos base por participar
  // e impostores ganham o ponto de sobrevivência (pois não foram eliminados no app)
  state.players.forEach(p => {
    p.points = 0;
    p.mainObj = false;
    p.extraObj = false;

    if (p.role === 'inocente') {
      // não tem como calcular automaticamente sem votação — deixar em aberto
    }
    if (p.role === 'impostor') {
      if (p.alive) { p.mainObj = true; p.points++; }
    }
    if (p.role === 'coringa') {
      if (!p.alive) { p.mainObj = true; p.points++; }
      const primeiroEliminado = state.eliminated[0];
      if (!p.alive && primeiroEliminado === p.name) { p.extraObj = true; p.points++; }
    }
  });

  renderResultScreen();
  showScreen('screen-result');
}

function renderResultScreen() {
  // Revela papéis de todos
  const banner = document.getElementById('victoryBanner');
  banner.innerHTML = `
    <div class="victory-emoji">📜</div>
    <div class="victory-title" style="color:var(--accent)">Revelação Final</div>
    <div class="victory-sub">Os papéis secretos de todos os jogadores</div>
  `;
  banner.style.border = '1px solid var(--accent)44';
  banner.style.background = 'var(--accent)11';

  document.getElementById('resultWordCategory').textContent = state.wordCategory;
  document.getElementById('resultWord').textContent = state.word;

  const list = document.getElementById('resultPlayerList');
  const roleLabel = r => ({ inocente: '🟢 Inocente', impostor: '🔴 Impostor', coringa: '🟡 Coringa' }[r]);
  const roleClass = r => ({ inocente: 'role-inocente', impostor: 'role-impostor', coringa: 'role-coringa' }[r]);

  list.innerHTML = state.players.map(p => `
    <div class="result-player-row">
      <span class="rpr-name">${p.name}</span>
      <span class="rpr-role role-badge ${roleClass(p.role)}" style="padding:3px 10px; font-size:0.65rem;">${roleLabel(p.role)}</span>
    </div>
  `).join('<div class="sep"></div>');
}

// ====================================================
// (Ranking removido — substituído pela tela de Regras)
// ====================================================

// ====================================================
// HELPERS
// ====================================================

function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '_');
}

// ====================================================
// INIT
// ====================================================
document.addEventListener('DOMContentLoaded', renderPlayerList);
