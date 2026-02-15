const digitContainer = document.getElementById("digits");
const noteEl = document.getElementById("running-note");
const totalEl = document.getElementById("total");
const digitCountEl = document.getElementById("digit-count");
const maxPriceEl = document.getElementById("max-price");
const applySetupBtn = document.getElementById("apply-setup");
const resultPanel = document.getElementById("result-panel");
const resultAmount = document.getElementById("result-amount");
const moodBox = document.getElementById("mood-box");
const moodEmoji = document.getElementById("mood-emoji");
const moodText = document.getElementById("mood-text");
const claimBtn = document.getElementById("claim-btn");
const claimBox = document.getElementById("claim-box");
const claimText = document.getElementById("claim-text");
const lineLink = document.getElementById("line-link");
const qr = document.getElementById("qr");

const unitName = {
  0: "個位",
  1: "十位",
  2: "百位",
  3: "千位",
  4: "萬位",
  5: "十萬位",
  6: "百萬位"
};

const state = {
  digitCount: 4,
  maxPrice: null,
  cards: []
};

function launchHeartBurst() {
  const icons = ["❤", "💛", "✨"];
  for (let i = 0; i < 22; i += 1) {
    const heart = document.createElement("span");
    heart.className = "heart";
    heart.textContent = pick(icons);
    heart.style.left = `${8 + Math.random() * 84}%`;
    heart.style.animationDelay = `${Math.random() * 0.25}s`;
    heart.style.fontSize = `${0.9 + Math.random() * 1.1}rem`;
    document.body.appendChild(heart);
    setTimeout(() => {
      heart.remove();
    }, 1400);
  }
}

function pow10(n) {
  return 10 ** n;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getBaseRange(position) {
  if (position === 0) return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  if (position === state.digitCount - 1 && state.digitCount === 4) return [0, 1, 2, 3, 4, 5, 6];
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
}

function findCard(position) {
  return state.cards.find((c) => c.position === position);
}

function ruleBasedRange(position, baseRange) {
  let range = [...baseRange];

  if (state.digitCount === 4 && position === 1) {
    const d3 = findCard(3);
    const d2 = findCard(2);
    if (d3 && d2 && d3.flipped && d2.flipped && d3.value === 0 && d2.value === 0) {
      range = [6, 7, 8, 9];
    }
  }

  if (state.digitCount === 4 && position === 0) {
    const d3 = findCard(3);
    const d2 = findCard(2);
    const d1 = findCard(1);
    if (d3 && d2 && d1 && d3.flipped && d2.flipped && d1.flipped && d3.value === 5 && d2.value === 2 && d1.value === 0) {
      range = [9];
    }
  }

  return range;
}

function canFitMaxPrice(position, candidate) {
  if (state.maxPrice == null) return true;

  let minTotal = 0;
  for (let p = state.digitCount - 1; p >= 0; p -= 1) {
    const card = findCard(p);
    const weight = pow10(p);

    if (p === position) {
      minTotal += candidate * weight;
      continue;
    }

    if (card && card.flipped) {
      minTotal += card.value * weight;
      continue;
    }

    const minDigit = p === 0 ? 1 : 0;
    minTotal += minDigit * weight;
  }

  return minTotal <= state.maxPrice;
}

function getAllowedRange(position) {
  const base = getBaseRange(position);
  const afterRule = ruleBasedRange(position, base);
  return afterRule.filter((d) => canFitMaxPrice(position, d));
}

function parseSetup() {
  const digitCount = Number(digitCountEl.value);
  const rawMax = maxPriceEl.value.trim();

  if (rawMax === "") {
    return { digitCount, maxPrice: null };
  }

  const parsed = Number(rawMax);
  if (!Number.isFinite(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
    return null;
  }

  return { digitCount, maxPrice: parsed };
}

function stopSpin(card, lockValue = null) {
  if (!card.spinning) return;

  clearInterval(card.timerId);
  card.timerId = null;
  card.spinning = false;

  const allowed = getAllowedRange(card.position);
  if (allowed.length === 0) {
    card.value = null;
    card.digitEl.textContent = "?";
    card.drawBtn.textContent = "開始抽數字";
    card.flipBtn.disabled = true;
    noteEl.textContent = `${unitName[card.position]}在目前上限下無可用數字，請調整上限或位數。`;
    return;
  }

  card.value = lockValue == null ? pick(allowed) : lockValue;
  card.digitEl.textContent = "?";
  card.digitEl.classList.remove("spinning");
  card.drawBtn.textContent = "重抽";
  card.flipBtn.disabled = false;
  noteEl.textContent = `${unitName[card.position]}已停下，可翻牌或重抽。`;
}

function startSpin(card) {
  if (card.flipped) return;

  const allowed = getAllowedRange(card.position);
  if (allowed.length === 0) {
    noteEl.textContent = `${unitName[card.position]}在目前上限下無可用數字，請調整上限或位數。`;
    return;
  }

  card.spinning = true;
  card.drawBtn.textContent = "停止";
  card.flipBtn.disabled = true;
  card.digitEl.classList.add("spinning");

  card.timerId = setInterval(() => {
    const nowAllowed = getAllowedRange(card.position);
    if (nowAllowed.length === 0) {
      stopSpin(card);
      return;
    }
    card.value = pick(nowAllowed);
    card.digitEl.textContent = "?";
  }, 100);

  noteEl.textContent = `${unitName[card.position]}滾動中，按一次「停止」可停下。`;
}

function flipCard(card) {
  if (card.flipped) return;
  if (card.spinning) return;
  if (card.value == null) {
    noteEl.textContent = `請先抽出 ${unitName[card.position]}數字後再翻牌。`;
    return;
  }

  if (!canFitMaxPrice(card.position, card.value)) {
    noteEl.textContent = `此數字會超過最高價格，請重抽 ${unitName[card.position]}。`;
    return;
  }

  card.flipped = true;
  card.drawBtn.disabled = true;
  card.flipBtn.disabled = true;
  card.drawBtn.textContent = "已鎖定";
  card.digitEl.classList.remove("spinning");
  card.digitEl.classList.add("flipped");
  card.digitEl.textContent = String(card.value);

  updateProgress();
}

function updateProgress() {
  const flipped = state.cards.filter((c) => c.flipped).length;
  noteEl.textContent = `已翻牌 ${flipped}/${state.cards.length} 位。`;

  if (flipped === state.cards.length) {
    finalize();
  }
}

function computeTotal() {
  let total = 0;
  for (const card of state.cards) {
    total += card.value * pow10(card.position);
  }
  return total;
}

function finalize() {
  const total = computeTotal();

  if (state.maxPrice != null && total > state.maxPrice) {
    noteEl.textContent = `結果 ${total} 元超過上限 ${state.maxPrice} 元，請調整設定重玩。`;
    return;
  }

  totalEl.textContent = String(total);
  resultAmount.textContent = `最終金額：${total} 元`;
  moodBox.classList.remove("surprise", "mock");
  if (state.maxPrice != null) {
    const half = state.maxPrice / 2;
    if (total > half) {
      moodBox.classList.add("surprise");
      moodEmoji.textContent = "🎉";
      moodText.textContent = "哭阿!我的錢包";
    } else {
      moodBox.classList.add("mock");
      moodEmoji.textContent = "😜";
      moodText.textContent = "爽啦，下次加油~";
    }
    moodBox.classList.remove("hidden");
  } else {
    moodBox.classList.add("hidden");
  }
  resultPanel.classList.remove("hidden");
  resultPanel.classList.add("show");
  launchHeartBurst();
  noteEl.textContent = "所有位數已翻牌完成，請領取紅包。";
}

function claimEnvelope() {
  const total = computeTotal();
  const ordered = [...state.cards].sort((a, b) => b.position - a.position);
  const digits = ordered.map((c) => String(c.value)).join("");
  const msg = `我抽到了紅包 ${digits}，總金額 ${total} 元！`;

  claimText.textContent = msg;
  const encoded = encodeURIComponent(msg);
  const lineUrl = `https://line.me/R/msg/text/?${encoded}`;
  lineLink.href = lineUrl;
  lineLink.textContent = "用 LINE 傳送結果";
  qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(lineUrl)}`;
  claimBox.classList.remove("hidden");
}

function buildCard(position) {
  const wrap = document.createElement("article");
  wrap.className = "digit-card";

  const digitEl = document.createElement("div");
  digitEl.className = "digit";
  digitEl.textContent = "?";

  const labelEl = document.createElement("div");
  labelEl.className = "label";
  labelEl.textContent = unitName[position] || `${position}位`;

  const actions = document.createElement("div");
  actions.className = "actions";

  const drawBtn = document.createElement("button");
  drawBtn.className = "draw-btn";
  drawBtn.textContent = "開始抽數字";

  const flipBtn = document.createElement("button");
  flipBtn.className = "flip-btn";
  flipBtn.textContent = "翻牌";
  flipBtn.disabled = true;

  actions.append(drawBtn, flipBtn);
  wrap.append(digitEl, labelEl, actions);

  const card = {
    position,
    value: null,
    flipped: false,
    spinning: false,
    timerId: null,
    digitEl,
    drawBtn,
    flipBtn
  };

  drawBtn.addEventListener("click", () => {
    if (card.flipped) return;
    if (card.spinning) {
      stopSpin(card, card.value);
      return;
    }
    startSpin(card);
  });

  flipBtn.addEventListener("click", () => {
    flipCard(card);
  });

  return { element: wrap, card };
}

function resetView() {
  resultPanel.classList.add("hidden");
  resultPanel.classList.remove("show");
  moodBox.classList.add("hidden");
  claimBox.classList.add("hidden");
  totalEl.textContent = "____";
}

function initGame() {
  const setup = parseSetup();
  if (!setup) {
    noteEl.textContent = "最高價格格式錯誤，請輸入正整數或留空。";
    return;
  }

  state.digitCount = setup.digitCount;
  state.maxPrice = setup.maxPrice;
  state.cards = [];

  digitContainer.innerHTML = "";
  resetView();

  for (let p = state.digitCount - 1; p >= 0; p -= 1) {
    const built = buildCard(p);
    built.element.style.animationDelay = `${(state.digitCount - 1 - p) * 70}ms`;
    state.cards.push(built.card);
    digitContainer.appendChild(built.element);
  }

  const maxText = state.maxPrice == null ? "不限制" : `${state.maxPrice} 元`;
  noteEl.textContent = `設定完成：${state.digitCount} 位數，最高價格 ${maxText}。`;
}

applySetupBtn.addEventListener("click", initGame);
claimBtn.addEventListener("click", claimEnvelope);

initGame();
