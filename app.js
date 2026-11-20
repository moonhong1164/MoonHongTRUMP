/* MoonHongTRUMP
 * 흐름: 배열 고르기 → 섞기 → 컷(세 더미 중 하나를 위로) → 뽑기 → 뒤집기 → 풀이.
 * 특수 카드점(몬테카를로·피라미드)은 컷 뒤에 놀이판을 띄운다.
 */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const SPREAD_BY_ID = Object.fromEntries(SPREADS.map((s) => [s.id, s]));
  const TONE_NAME = { pos: "좋은 카드", neu: "중립 카드", neg: "조심 카드" };
  const svgCache = {};
  const face = (id) => (svgCache[id] ||= cardSVG(id));
  const BACK = backSVG();
  const sym = (s) => `<i class="sym ${SUITS[s].color}">${SUITS[s].sym}</i>`;
  const cardName = (id) => {
    const c = CARDS[id];
    return c.suit ? `${sym(c.suit)} ${esc(c.name)}` : "조커";
  };

  function rand(n) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }
  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    kind: "spread", spread: null, game: null, topic: "all", mcMode: "love", joker: false, question: "",
    deck: [], picks: [], flipped: new Set(), run: 0,
  };

  /* ── 고르기 화면 ─────────────────────────── */
  function miniLayout(sp) {
    if (sp.week) {
      return `<span class="mini mini-week" aria-hidden="true">${"<i></i>".repeat(1)}<br>${"<i></i>".repeat(3)}<br>${"<i></i>".repeat(7)}</span>`;
    }
    const small = sp.count > 9;
    const cells = sp.slots.map((s, i) => `<i style="grid-column:${s.at[0]};grid-row:${s.at[1]}">${small ? "" : i + 1}</i>`).join("");
    return `<span class="mini ${small ? "is-small" : ""}" style="grid-template-columns:repeat(${sp.cols},${small ? 9 : 14}px)" aria-hidden="true">${cells}</span>`;
  }

  function spreadOption(sp, value, checked) {
    return `
      <label class="spread-option">
        <input type="radio" name="spread" value="${value}" ${checked ? "checked" : ""}>
        <span class="spread-card">
          ${miniLayout(sp)}
          <span><strong>${esc(sp.name)}</strong> <em>${sp.count}장</em><p>${esc(sp.blurb)}</p></span>
        </span>
      </label>`;
  }

  function renderSetup() {
    $("#spreadOptions").innerHTML = SPREADS.filter((sp) => !sp.family).map((sp, i) => spreadOption(sp, sp.id, i === 0)).join("");
    $("#euroOptions").innerHTML = SPREADS.filter((sp) => sp.family === "euro").map((sp) => spreadOption(sp, sp.id, false)).join("");
    $("#calOptions").innerHTML = CALENDARS.map((c) => `
      <label class="spread-option">
        <input type="radio" name="spread" value="cal:${c.id}">
        <span class="spread-card">
          <span class="mini-cal ${c.id}" aria-hidden="true">${"<i></i>".repeat(c.id === "year" ? 52 : 12)}</span>
          <span><strong>${esc(c.name)}</strong> <em>${c.count}장</em><p>${esc(c.blurb)}</p></span>
        </span>
      </label>`).join("");

    $("#sigCard").innerHTML += SUIT_ORDER.map((su) => `<optgroup label="${SUITS[su].sym} ${SUITS[su].name}">${
      [13, 12, 11].map((r) => `<option value="${su}${r}">${SUITS[su].name} ${RANKS[r].label} — ${{ 13: "남성", 12: "여성", 11: "젊은이" }[r]}</option>`).join("")}</optgroup>`).join("");

    $("#gameOptions").innerHTML = GAMES.map((g) => `
      <label class="spread-option">
        <input type="radio" name="spread" value="game:${g.id}">
        <span class="spread-card">
          <span class="mini-game ${g.id}" aria-hidden="true">${g.id === "pyramid"
            ? "<i></i><br><i></i><i></i><br><i></i><i></i><i></i>"
            : "<i></i><i></i><i></i><br><i></i><i></i><i></i><br><i></i><i></i><i></i>"}</span>
          <span><strong>${esc(g.name)}</strong> <em>52장</em><p>${esc(g.blurb)}</p></span>
        </span>
      </label>`).join("");

    $("#setup").addEventListener("change", syncSetup);
    syncSetup();
  }

  function syncSetup() {
    const f = $("#setup");
    const v = f.spread.value;
    const isGame = v.startsWith("game:"), isCal = v.startsWith("cal:");
    const sp = SPREAD_BY_ID[v];
    $("#topicField").hidden = isGame || isCal;
    $("#jokerField").hidden = !sp || !!sp.week;
    $("#deck32Field").hidden = !sp;
    $("#sigField").hidden = !sp || sp.count < 3;
    $("#mcField").hidden = v !== "game:montecarlo";
    $("#calField").hidden = !isCal;
    $("#calNowLabel").textContent = v === "cal:months" ? "이번 달부터" : "이번 주부터";
    $("#calYearLabel").textContent = v === "cal:months" ? "1월부터" : "올해 첫 주부터";
    $("#birthField").hidden = !isCal || f.calStart.value !== "birth";
    const q = $("#question");
    q.placeholder = v === "yesno" ? "예) 이번 달 안에 연락이 올까요?"
      : v === "game:montecarlo" ? "예) 그 사람은 나를 어떻게 생각할까요?"
      : v === "week" ? "예) 이번 주는 어떻게 흘러갈까요?"
      : isCal ? "예) 올해 마음에 둔 일, 언제 움직이면 좋을까요?"
      : "예) 지금 하는 일, 계속해도 될까요?";
  }

  /* ── 시작: 섞기와 컷 ─────────────────────── */
  async function start() {
    const f = $("#setup");
    const v = f.spread.value;
    state.kind = v.startsWith("game:") ? "game" : v.startsWith("cal:") ? "cal" : "spread";
    state.spread = state.kind === "spread" ? SPREAD_BY_ID[v] : null;
    state.game = state.kind === "game" ? v.slice(5) : null;
    state.cal = state.kind === "cal" ? v.slice(4) : null;
    state.topic = f.topic.value;
    state.mcMode = f.mc.value;
    state.joker = state.kind === "spread" && !state.spread.week && $("#useJoker").checked;
    state.deck32 = state.kind === "spread" && $("#use32").checked;
    state.sig = state.kind === "spread" && state.spread.count >= 3 ? $("#sigCard").value || null : null;
    state.calStart = f.calStart.value;
    if (state.kind === "cal" && state.calStart === "birth") {
      const b = $("#birth");
      b.required = true;
      if (!b.value) { b.reportValidity(); b.focus(); return; }
      state.birth = b.value;
    }
    state.question = $("#question").value.trim();
    state.picks = [];
    state.flipped = new Set();
    const run = ++state.run;

    const table = $("#table");
    table.hidden = false;
    $("#spreadTitle").textContent = state.kind === "game" ? GAMES.find((g) => g.id === state.game).name
      : state.kind === "cal" ? CALENDARS.find((c) => c.id === state.cal).name : state.spread.name;
    const asked = $("#asked");
    asked.hidden = !state.question;
    asked.textContent = state.question;
    for (const id of ["deck", "deckActions", "tableActions", "game", "together", "sigBox"]) $("#" + id).hidden = true;
    $("#layout").innerHTML = "";
    $("#readings").innerHTML = "";
    if (journal) journal.hide();
    table.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

    let base = state.kind === "cal" && state.cal === "months" ? COURTS : state.deck32 ? DECK32 : DECK52;
    if (state.sig) base = base.filter((id) => id !== state.sig);
    if (state.joker) base = [...base, "JK"];
    state.deck = shuffled(base);
    await ritual(run);
    if (run !== state.run) return;
    if (state.kind === "game") startGame();
    else if (state.kind === "cal") renderCalendar();
    else beginPick();
  }

  function setStatus(t) { $("#status").textContent = t; }

  async function ritual(run) {
    const box = $("#ritual"), stack = $("#shuffleStack"), cut = $("#cut");
    box.hidden = false;
    cut.hidden = true;
    stack.hidden = false;
    stack.innerHTML = Array.from({ length: 7 }, (_, i) => `<span class="sh" style="--i:${i}">${BACK}</span>`).join("");
    setStatus("카드를 섞고 있습니다. 질문을 마음에 담아 두세요.");
    await wait(reduceMotion ? 300 : 1800);
    if (run !== state.run) return;

    stack.hidden = true;
    const n = state.deck.length;
    const a = Math.round(n / 3) + rand(5) - 2, b = Math.round((2 * n) / 3) + rand(5) - 2;
    const piles = [state.deck.slice(0, a), state.deck.slice(a, b), state.deck.slice(b)];
    cut.innerHTML = piles.map((p, i) => `
      <button type="button" class="pile" data-i="${i}" aria-label="${i + 1}번 더미, ${p.length}장">
        <span class="pile-cards">${BACK}${BACK}${BACK}</span><span class="pile-n">${p.length}장</span>
      </button>`).join("");
    cut.hidden = false;
    setStatus("컷: 세 더미 가운데 마음이 가는 하나를 고르세요. 그 더미가 맨 위로 올라갑니다.");

    await new Promise((resolve) => {
      cut.onclick = (e) => {
        const btn = e.target.closest(".pile");
        if (!btn) return;
        const i = +btn.dataset.i;
        state.deck = [...piles[i], ...piles.filter((_, k) => k !== i).flat()];
        cut.onclick = null;
        resolve();
      };
    });
    box.hidden = true;
  }

  /* ── 뽑기 ───────────────────────────────── */
  function beginPick() {
    const sp = state.spread;
    renderLayout();
    const deck = $("#deck");
    if (sp.week) {
      deck.hidden = true;
      $("#autoPick").textContent = "덱 위에서부터 25장 놓기";
      setStatus("카토만시는 덱 위에서 한 장씩 놓고, 마지막 25번째 카드만 덱 맨 아래에서 뽑습니다.");
    } else {
      deck.innerHTML = state.deck.map((id, i) =>
        `<button type="button" class="deck-card" data-i="${i}" style="--i:${i}" aria-label="뒤집힌 카드 ${i + 1}">${BACK}</button>`).join("");
      deck.hidden = false;
      $("#autoPick").textContent = sp.count > 1 ? "남은 자리 자동으로 채우기" : "아무 카드나 한 장";
      setStatus(sp.count > 1 ? `끌리는 카드 ${sp.count}장을 차례로 고르세요.` : "끌리는 카드 한 장을 고르세요.");
    }
    $("#deckActions").hidden = false;
    $("#flipAll").hidden = false;
  }

  function takeFromDeck(i) {
    if (state.picks.length >= state.spread.count) return;
    const id = state.deck[i];
    if (!id) return;
    state.deck[i] = null;
    const btn = $(`#deck .deck-card[data-i="${i}"]`);
    if (btn) btn.classList.add("is-taken");
    place(id);
  }

  function place(id) {
    const n = state.picks.push(id) - 1;
    const slot = $(`#layout .slot[data-n="${n}"]`);
    slot.querySelector(".slot-body").innerHTML =
      `<button type="button" class="flip" data-n="${n}" aria-label="${n + 1}번 카드 뒤집기"><span class="flip-inner"><span class="side back">${BACK}</span><span class="side front">${face(id)}</span></span></button>`;
    const sp = state.spread;
    const left = sp.count - state.picks.length;
    if (left > 0) {
      setStatus(`${sp.slots[n + 1].name} 자리에 놓을 카드를 고르세요. (${left}장 남음)`);
    } else {
      $("#deck").hidden = true;
      $("#deckActions").hidden = true;
      $("#tableActions").hidden = false;
      setStatus(sp.count > 1 ? "카드를 눌러 하나씩 뒤집거나, ‘모두 뒤집기’를 누르세요." : "카드를 눌러 뒤집으세요.");
    }
  }

  async function autoPick() {
    const sp = state.spread;
    const run = state.run;
    if (sp.week) {
      // 1~24번은 위에서, 25번은 맨 아래에서
      $("#autoPick").disabled = true;
      const top = state.deck.slice(0, 24), bottom = state.deck[state.deck.length - 1];
      for (const id of [...top, bottom]) {
        if (run !== state.run) return;
        place(id);
        await wait(reduceMotion ? 0 : 45);
      }
      $("#autoPick").disabled = false;
      return;
    }
    const free = state.deck.map((id, i) => (id ? i : -1)).filter((i) => i >= 0);
    const need = sp.count - state.picks.length;
    for (const i of shuffled(free).slice(0, need)) {
      if (run !== state.run) return;
      takeFromDeck(i);
      await wait(reduceMotion ? 0 : 140);
    }
  }

  function renderLayout() {
    const sp = state.spread;
    const lay = $("#layout");
    lay.dataset.size = sp.size;
    const compact = sp.size === "xs";
    lay.classList.toggle("is-week", compact);
    lay.style.setProperty("--cols", sp.cols);
    lay.innerHTML = sp.slots.map((s, n) => `
      <div class="slot" data-n="${n}" style="grid-column:${s.at[0]};grid-row:${s.at[1]}">
        <p class="slot-label"><b>${n + 1}</b>${esc(compact ? s.short ?? s.name : s.name)}</p>
        <div class="slot-body"><span class="slot-hole">${n + 1}</span></div>
        <p class="slot-name"></p>
      </div>`).join("");
    const box = $("#sigBox");
    if (state.sig) {
      const c = CARDS[state.sig];
      box.innerHTML = `<button type="button" class="sig-card" data-card="${state.sig}" aria-label="${esc(c.name)} 자세히 보기">${face(state.sig)}</button>
        <p><b>대표 카드 · 나</b>${cardName(state.sig)} — ${esc(c.title)}. 이 카드는 덱에서 빼 두었습니다. 펼친 카드들을 ‘나’와 견주어 읽어 보세요.</p>`;
      box.hidden = false;
    }
  }

  function flip(n) {
    if (state.flipped.has(n) || n >= state.picks.length) return;
    state.flipped.add(n);
    const btn = $(`#layout .flip[data-n="${n}"]`);
    btn.classList.add("is-flipped");
    btn.setAttribute("aria-label", `${n + 1}번 카드: ${CARDS[state.picks[n]].name}`);
    const id = state.picks[n], c = CARDS[id];
    const nameEl = $(`#layout .slot[data-n="${n}"] .slot-name`);
    nameEl.innerHTML = state.spread.size === "xs" ? cardName(id) : `<span class="dot tone-${c.tone}"></span>${cardName(id)}`;
    renderReadings();
    if (state.flipped.size === state.spread.count) {
      setStatus("모든 카드를 뒤집었습니다. 아래 풀이를 읽어 보세요.");
      renderTogether();
      if (journal) journal.show();
    } else {
      setStatus(`${state.spread.count - state.flipped.size}장 남았습니다.`);
    }
  }

  async function flipAll() {
    const run = state.run;
    for (let n = 0; n < state.picks.length; n++) {
      if (run !== state.run) return;
      if (state.flipped.has(n)) continue;
      flip(n);
      await wait(reduceMotion ? 0 : state.spread.count > 9 ? 60 : 220);
    }
  }

  /* ── 풀이 ───────────────────────────────── */
  function topicBlocks(c) {
    const out = [];
    if (state.topic !== "work") out.push(`<div><p class="sub">연애 · 관계</p><p>${esc(c.love)}</p></div>`);
    if (state.topic !== "love") out.push(`<div><p class="sub">일 · 돈</p><p>${esc(c.work)}</p></div>`);
    return out.join("");
  }

  function tags(c) {
    const t = [];
    if (c.suit) t.push(`<span class="tag">${sym(c.suit)} ${SUITS[c.suit].theme}</span>`);
    t.push(`<span class="tag tone-${c.tone}">${TONE_NAME[c.tone]}</span>`);
    return `<div class="tags">${t.join("")}</div>`;
  }

  function readingHTML(id, posHTML) {
    const c = CARDS[id];
    return `<article class="reading">
      <button type="button" class="reading-card" data-card="${id}" aria-label="${esc(c.name)} 자세히 보기">${face(id)}</button>
      <div class="reading-body">
        ${posHTML}
        <h3>${cardName(id)} <span>${esc(c.title)}</span></h3>
        ${tags(c)}
        <ul class="kw">${c.kw.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>
        <p>${esc(c.text)}</p>
        ${topicBlocks(c)}
        <p class="advice"><b>조언</b>${esc(c.advice)}</p>
      </div>
    </article>`;
  }

  function renderReadings() {
    const sp = state.spread;
    if (sp.week) return renderWeekReadings();
    if (sp.groups) return renderGroupReadings();
    const order = [...state.flipped].sort((a, b) => a - b);
    $("#readings").innerHTML = order.map((n) => {
      const s = sp.slots[n];
      const pos = `<p class="pos"><b>${n + 1}</b>${esc(s.name)} — ${esc(s.desc)}</p>`;
      let extra = "";
      if (sp.yesno) extra = yesNoHTML(state.picks[n]);
      return extra + readingHTML(state.picks[n], pos);
    }).join("");
  }

  function yesNoHTML(id) {
    const c = CARDS[id];
    let word, note;
    if (!c.suit) { word = "아직 몰라요"; note = "조커는 판을 뒤집는 변수입니다. 지금은 답이 정해지지 않았으니, 상황이 바뀐 뒤 다시 물어보세요."; }
    else if (id === "H9") { word = "예!"; note = "소원 카드가 나왔습니다. 가장 강한 ‘예’입니다."; }
    else if (id === "S9") { word = "아니오"; note = "가장 무거운 카드입니다. 지금은 밀어붙이지 말고 때를 기다리세요."; }
    else {
      const red = SUITS[c.suit].color === "red";
      if (c.tone === "pos") { word = "예"; note = red ? "빨간 무늬에 좋은 카드입니다. 흐름이 당신 편입니다." : "검은 무늬지만 좋은 카드입니다. 노력하면 이루어집니다."; }
      else if (c.tone === "neg") { word = "아니오"; note = red ? "빨간 무늬지만 조심 카드입니다. 기대만큼 쉽지는 않습니다." : "검은 무늬에 조심 카드입니다. 지금은 아니라는 신호입니다."; }
      else { word = red ? "아마도 예" : "아마도 아니오"; note = red ? "중립 카드라 조건이 붙습니다. 빨간 무늬라 ‘예’ 쪽으로 조금 기웁니다." : "중립 카드라 조건이 붙습니다. 검은 무늬라 ‘아니오’ 쪽으로 조금 기웁니다."; }
    }
    return `<div class="yesno tone-${c.tone}"><p class="yn-word">${word}</p><p>${note}</p></div>`;
  }

  function renderWeekReadings() {
    const sp = state.spread;
    const has = (n) => state.flipped.has(n);
    let html = "";
    const top = [24, 21, 22, 23].filter(has);
    html += top.map((n) => readingHTML(state.picks[n], `<p class="pos"><b>${n + 1}</b>${esc(sp.slots[n].name)} — ${esc(sp.slots[n].desc)}</p>`)).join("");

    const days = ["월", "화", "수", "목", "금", "토", "일"];
    const dayHTML = days.map((d, i) => {
      const ns = [i, i + 7, i + 14];
      if (!ns.every(has)) return "";
      return groupBlock(`${d}요일`, ns.map((n) => state.picks[n]), true);
    }).join("");
    if (dayHTML) html += `<section class="week-days"><h3>요일별 운세</h3><p class="section-lead">요일마다 위 카드가 가장 크게, 아래로 갈수록 작게 작용합니다. 카드를 누르면 자세한 풀이가 열립니다.</p><div class="days">${dayHTML}</div></section>`;
    $("#readings").innerHTML = html;
  }

  const firstSentence = (t) => t.split(". ")[0].replace(/\.?$/, ".");

  /* 세 장 묶음 하나. weighted 면 첫 장이 가장 크게(일주일 운세), 아니면 셋을 고르게 읽는다(집시). */
  function groupBlock(title, ids, weighted, desc = "") {
    const w = weighted ? [3, 2, 1] : [1, 1, 1];
    const score = ids.reduce((s, id, k) => s + (CARDS[id].tone === "pos" ? 1 : CARDS[id].tone === "neg" ? -1 : 0) * w[k], 0);
    const lim = weighted ? 2 : 1;
    const mood = score >= lim ? ["pos", "맑음"] : score <= -lim ? ["neg", "조심"] : ["neu", "보통"];
    const main = CARDS[ids[0]];
    return `<article class="day tone-${mood[0]}">
        <header><h4>${esc(title)}</h4><span class="mood">${mood[1]}</span></header>
        ${desc ? `<p class="day-desc">${esc(desc)}</p>` : ""}
        <div class="day-cards">${ids.map((id, k) => `<button type="button" class="mini-card t${weighted ? k : 0}" data-card="${id}" aria-label="${esc(CARDS[id].name)}">${face(id)}</button>`).join("")}</div>
        <p class="day-main"><strong>${cardName(ids[0])}</strong> ${esc(main.title)}</p>
        <p>${esc(firstSentence(main.text))}</p>
        <p class="day-sub">함께: ${ids.slice(1).map((id) => `${cardName(id)} <span>(${esc(CARDS[id].kw[0])})</span>`).join(", ")}</p>
      </article>`;
  }

  function renderGroupReadings() {
    const html = GYPSY_GROUPS.map((g, i) => {
      const ns = [i, i + 7, i + 14];
      if (!ns.every((n) => state.flipped.has(n))) return "";
      return groupBlock(`${i + 1}. ${g.name}`, ns.map((n) => state.picks[n]), false, g.desc);
    }).join("");
    $("#readings").innerHTML = html
      ? `<section class="week-days"><h3>일곱 묶음 읽기</h3><p class="section-lead">세로 한 줄(세 장)이 한 묶음입니다. 맨 위 카드가 이야기의 중심이고, 아래 두 장이 그 뜻을 거듭니다. 카드를 누르면 자세한 풀이가 열립니다.</p><div class="days">${html}</div></section>`
      : "";
  }

  function renderTogether() {
    const sp = state.spread;
    const box = $("#together");
    if (sp.count < 3) { box.hidden = true; return; }
    const ids = state.picks;
    const real = ids.filter((id) => CARDS[id].suit);
    const bySuit = Object.fromEntries(SUIT_ORDER.map((s) => [s, real.filter((id) => CARDS[id].suit === s).length]));
    const red = bySuit.H + bySuit.D, black = bySuit.C + bySuit.S;
    const tone = { pos: 0, neu: 0, neg: 0 };
    ids.forEach((id) => tone[CARDS[id].tone]++);
    const people = real.filter((id) => CARDS[id].rank >= 11);

    const lines = [];
    const top = SUIT_ORDER.slice().sort((a, b) => bySuit[b] - bySuit[a]);
    if (bySuit[top[0]] > bySuit[top[1]]) {
      const s = top[0];
      const why = { H: "마음과 관계가 이번 이야기의 중심입니다.", D: "돈, 소식, 거래가 이번 이야기의 중심입니다.", C: "일과 노력, 함께하는 사람들이 이번 이야기의 중심입니다.", S: "넘어야 할 고비가 있습니다. 경고를 미리 듣고 대비하라는 뜻입니다." }[s];
      lines.push(`${sym(s)} <b>${SUITS[s].name}</b>${s === "C" ? "이" : "가"} 가장 많습니다(${bySuit[s]}장). ${why}`);
    } else {
      lines.push("네 무늬가 고르게 섞여 있습니다. 한 가지 일보다 여러 일이 함께 움직입니다.");
    }
    if (red > black) lines.push(`빨간 카드 ${red}장, 검은 카드 ${black}장. 전체 흐름이 밝은 편입니다.`);
    else if (black > red) lines.push(`검은 카드 ${black}장, 빨간 카드 ${red}장. 노력과 조심이 필요한 흐름입니다.`);
    else lines.push(`빨간 카드와 검은 카드가 ${red}장씩 맞섭니다. 어느 쪽으로 기울지는 나의 선택에 달렸습니다.`);
    if (people.length) lines.push(`그림 카드 ${people.length}장(${people.map(cardName).join(", ")}). 이 일에는 사람이 깊이 얽혀 있습니다.`);
    if (ids.includes("JK")) lines.push("조커가 섞여 있습니다. 예상하지 못한 변수가 판을 바꿀 수 있습니다.");
    if (ids.includes("H9")) lines.push("소원 카드(하트 9)가 나왔습니다. 바라는 일이 이루어질 기운이 있습니다.");
    if (ids.includes("S9")) lines.push("스페이드 9가 나왔습니다. 무리하지 말고 걱정을 하나씩 덜어 내세요.");
    if (state.sig) {
      const sc = CARDS[state.sig];
      const same = real.filter((id) => CARDS[id].suit === sc.suit).length;
      lines.push(`대표 카드 ${cardName(state.sig)}와 같은 무늬가 ${same}장입니다. ${same >= Math.ceil(real.length / 3)
        ? "펼친 일 가운데 많은 부분이 나와 같은 결이라, 내가 이끌어 갈 수 있는 일입니다."
        : "나와 다른 결의 일이 많아, 주변과 상황의 힘을 함께 살펴야 합니다."}`);
      if (people.length) lines.push("대표 카드 말고 나온 그림 카드는 내 주변 사람입니다. 그 사람의 무늬가 그가 맡은 역할을 말해 줍니다.");
    }

    const ranks = {};
    real.forEach((id) => { const r = CARDS[id].rank; ranks[r] = (ranks[r] || 0) + 1; });
    const combos = Object.entries(ranks).filter(([, k]) => k >= 2).map(([r, k]) =>
      `<li><b>${RANKS[r].label} ${k}장</b> ${esc(COMBOS[r][Math.min(k, 4) - 2])}</li>`);

    let verdict = "";
    if (sp.yesno3) {
      const reds = real.filter((id) => SUITS[CARDS[id].suit].color === "red").length;
      const v = [["neg", "아니오", "세 장 모두 검은 카드입니다. 분명한 ‘아니오’입니다."],
        ["neg", "아마도 아니오", "빨간 카드가 한 장뿐입니다. 지금 그대로라면 쉽지 않습니다."],
        ["pos", "아마도 예", "빨간 카드가 두 장입니다. ‘예’ 쪽으로 기웁니다. 검은 한 장이 붙는 조건을 말해 줍니다."],
        ["pos", "예", "세 장 모두 빨간 카드입니다. 분명한 ‘예’입니다."]][Math.min(reds, 3)];
      verdict = `<div class="yesno tone-${v[0]}"><p class="yn-word">${v[1]}</p><p>${v[2]}${ids.includes("JK") ? " 조커는 세지 않았습니다." : ""}</p></div>`;
    }
    box.innerHTML = `${verdict}<h3>함께 읽기</h3>
      <p class="tally"><span class="tone-pos">좋은 카드 ${tone.pos}</span><span class="tone-neu">중립 ${tone.neu}</span><span class="tone-neg">조심 ${tone.neg}</span>
      ${SUIT_ORDER.map((s) => `<span class="suit-n">${sym(s)} ${bySuit[s]}</span>`).join("")}</p>
      <ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>
      ${combos.length ? `<p class="sub combo-h">같은 숫자가 겹쳤습니다</p><ul class="combos">${combos.join("")}</ul>` : ""}`;
    box.hidden = false;
  }

  /* ── 1년 · 열두 달 ───────────────────────── */
  const DAY = 86400000;
  const LUCKY = new Set(["H9", "H10", "D10", "C10", "H1", "D1", "C1"]);
  const HEAVY = new Set(["S9", "S10", "S1"]);
  const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  function mondayOf(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function lastBirthday(today) {
    const [, m, d] = state.birth.split("-").map(Number);
    let b = new Date(today.getFullYear(), m - 1, d);
    if (b > today) b = new Date(today.getFullYear() - 1, m - 1, d);
    return b;
  }
  function moodOf(ids) {
    const score = ids.reduce((s, id) => s + (CARDS[id].tone === "pos" ? 1 : CARDS[id].tone === "neg" ? -1 : 0), 0);
    const k = score / ids.length;
    return k >= 0.25 ? ["pos", "밝음"] : k <= -0.15 ? ["neg", "조심"] : ["neu", "보통"];
  }

  function renderCalendar() {
    const today = new Date();
    const ids = state.deck.slice(0, state.cal === "year" ? 52 : 12);
    $("#tableActions").hidden = false;
    $("#flipAll").hidden = true;
    const box = $("#together");
    let html = "", now = -1, nowLabel = "";

    if (state.cal === "year") {
      let start;
      if (state.calStart === "now") start = mondayOf(today);
      else if (state.calStart === "birth") start = mondayOf(lastBirthday(today));
      else {
        start = new Date(today.getFullYear(), 0, 1);
        start.setDate(start.getDate() + ((8 - start.getDay()) % 7)); // 1월의 첫 월요일
      }
      const weeks = ids.map((id, i) => {
        const a = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7);
        const b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6);
        return { id, n: i + 1, a, b };
      });
      now = weeks.findIndex((w) => today >= w.a && today < new Date(w.b.getTime() + DAY));
      const quarters = [0, 1, 2, 3].map((q) => {
        const part = weeks.slice(q * 13, q * 13 + 13);
        const mood = moodOf(part.map((w) => w.id));
        return `<section class="cal-block tone-${mood[0]}">
          <h4>${q * 13 + 1}~${q * 13 + 13}주 <span>${md(part[0].a)} ~ ${md(part[12].b)}</span><em class="mood">${mood[1]}</em></h4>
          <ol class="cal-weeks">${part.map((w) => `
            <li class="${w.n - 1 === now ? "is-now" : ""}" style="--i:${w.n}">
              <button type="button" class="mini-card" data-card="${w.id}" aria-label="${esc(CARDS[w.id].name)}">${face(w.id)}</button>
              <span class="wk">${w.n}주차${w.n - 1 === now ? " · 이번 주" : ""}</span>
              <span class="dt">${md(w.a)} ~ ${md(w.b)}</span>
              <span class="nm"><span class="dot tone-${CARDS[w.id].tone}"></span>${cardName(w.id)}</span>
              <span class="tt">${esc(CARDS[w.id].title)}</span>
            </li>`).join("")}</ol>
        </section>`;
      }).join("");
      const lucky = weeks.filter((w) => LUCKY.has(w.id)), heavy = weeks.filter((w) => HEAVY.has(w.id));
      const list = (ws) => ws.map((w) => `${w.n}주차(${md(w.a)}) ${cardName(w.id)}`).join(", ");
      const startText = { now: "이번 주", year: "올해 1월의 첫 월요일", birth: "지난 생일이 든 주" }[state.calStart];
      html = `<div class="cal-grid">${quarters}</div>`;
      box.innerHTML = `<h3>한 해의 흐름</h3>
        <p>${startText}부터 52주에 카드를 한 장씩 놓았습니다. 13주씩 넷으로 나누어 계절마다의 흐름을 봅니다.</p>
        <ul>
          ${lucky.length ? `<li><b>힘이 실리는 주</b> ${list(lucky)}</li>` : ""}
          ${heavy.length ? `<li><b>조심할 주</b> ${list(heavy)} — 큰 결정은 앞뒤 주로 옮겨 보세요.</li>` : ""}
          <li>달력은 대략의 흐름을 보는 도구입니다. 좋은 카드가 곧 좋은 일, 무거운 카드가 곧 나쁜 일은 아닙니다.</li>
        </ul>`;
      if (now >= 0) nowLabel = `<p class="pos"><b>${now + 1}주차</b>이번 주 — ${md(weeks[now].a)} ~ ${md(weeks[now].b)}</p>`;
      setStatus("카드를 52주에 한 장씩 놓았습니다. 카드를 누르면 풀이가 열립니다.");
    } else {
      const lb = state.calStart === "birth" ? lastBirthday(today) : null;
      const startMonth = state.calStart === "now" ? new Date(today.getFullYear(), today.getMonth(), 1)
        : lb ? new Date(lb.getFullYear(), lb.getMonth(), 1)
        : new Date(today.getFullYear(), 0, 1);
      const role = { 11: "소식과 새 얼굴이 일을 움직이는 달입니다.", 12: "돌보고 받아 주는 사람이 곁에 서는 달입니다.", 13: "결정권을 쥔 사람이 열쇠가 되는 달입니다." };
      const months = ids.map((id, i) => ({ id, d: new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1) }));
      now = months.findIndex((m) => m.d.getFullYear() === today.getFullYear() && m.d.getMonth() === today.getMonth());
      html = `<ol class="cal-months">${months.map((m, i) => {
        const c = CARDS[m.id];
        return `<li class="${i === now ? "is-now" : ""} tone-${c.tone}" style="--i:${i}">
          <button type="button" class="mini-card" data-card="${m.id}" aria-label="${esc(c.name)}">${face(m.id)}</button>
          <div>
            <p class="wk">${m.d.getFullYear()}년 ${m.d.getMonth() + 1}월${i === now ? " · 이번 달" : ""}</p>
            <p class="nm">${cardName(m.id)} <span>${esc(c.title)}</span></p>
            <p>${esc(role[c.rank])} ${esc(firstSentence(c.text))}</p>
          </div>
        </li>`;
      }).join("")}</ol>`;
      const bySuit = SUIT_ORDER.map((su) => `${sym(su)} ${SUITS[su].name} (${SUITS[su].theme}): ${months.filter((m) => CARDS[m.id].suit === su).map((m) => `${m.d.getMonth() + 1}월`).join(" · ")}`);
      box.innerHTML = `<h3>열두 달의 사람들</h3>
        <p>인물 카드 열두 장을 한 달에 한 장씩 놓았습니다. 무늬는 그 달에 힘이 실리는 분야입니다.</p>
        <ul>${bySuit.map((t) => `<li>${t}</li>`).join("")}</ul>`;
      if (now >= 0) nowLabel = `<p class="pos"><b>${today.getMonth() + 1}월</b>이번 달</p>`;
      setStatus("열두 달에 인물 카드를 한 장씩 놓았습니다. 카드를 누르면 풀이가 열립니다.");
    }
    box.hidden = false;
    $("#readings").innerHTML = html + (now >= 0 ? readingHTML(ids[now], nowLabel) : "");
  }

  /* ── 특수 카드점 ─────────────────────────── */
  let G = null;

  function startGame() {
    $("#game").hidden = false;
    $("#together").hidden = true;
    if (state.game === "montecarlo") mcStart();
    else pyStart();
  }

  function cardBtn(id, attrs, extraClass = "") {
    return `<button type="button" class="gcard ${extraClass}" ${attrs} aria-label="${esc(CARDS[id].name)}">${face(id)}</button>`;
  }

  function gameActions(btns) {
    $("#gameActions").innerHTML = btns.map(([id, label, dis]) => `<button type="button" class="ghost" data-act="${id}" ${dis ? "disabled" : ""}>${label}</button>`).join("")
      + `<button type="button" class="ghost" data-act="again">다시 하기</button><a class="ghost" href="#draw">점 바꾸기</a>`;
  }

  function flash(els) {
    els.forEach((el) => { el.classList.remove("is-hint"); void el.offsetWidth; el.classList.add("is-hint"); });
  }
  function shake(el) {
    if (!el) return;
    el.classList.remove("is-wrong"); void el.offsetWidth; el.classList.add("is-wrong");
  }

  /* 몬테카를로 */
  const MC_N = 5;
  function mcNeighbors(i) {
    const r = Math.floor(i / MC_N), c = i % MC_N, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < MC_N && cc >= 0 && cc < MC_N) out.push(rr * MC_N + cc);
    }
    return out;
  }
  function mcFindPair() {
    for (let i = 0; i < 25; i++) {
      if (!G.grid[i]) continue;
      for (const j of mcNeighbors(i)) if (j > i && G.grid[j] && CARDS[G.grid[i]].rank === CARDS[G.grid[j]].rank) return [i, j];
    }
    return null;
  }

  function mcStart() {
    G = { type: "mc", grid: state.deck.slice(0, 25), stock: state.deck.slice(25), sel: null, pairs: 0, done: false, busy: false };
    $("#gameBoard").className = "game-board mc";
    setStatus("붙어 있는(위아래·좌우·대각선) 같은 숫자 두 장을 차례로 눌러 치우세요.");
    mcRender();
  }

  function mcRender() {
    $("#gameBoard").innerHTML = G.grid.map((id, i) => id
      ? cardBtn(id, `data-i="${i}"`, G.sel === i ? "is-sel" : "")
      : `<span class="gcard empty" aria-hidden="true"></span>`).join("");
    const empties = G.grid.filter((x) => !x).length;
    $("#gameSide").innerHTML = `<p class="counter"><span><b>${G.stock.length}</b>장 손에 남음</span><span><b>${G.pairs}</b>쌍 치움</span><span><b>${empties}</b>칸 빔</span></p>`;
    gameActions([
      ["fill", "빈자리 채우기", G.done || !empties || !G.stock.length],
      ["hint", "짝 찾아 주기", G.done],
      ["auto", "끝까지 자동으로", G.done],
    ]);
  }

  function mcClick(i) {
    if (G.done || G.busy || !G.grid[i]) return;
    if (G.sel === null || G.sel === i) {
      G.sel = G.sel === i ? null : i;
      return mcRender();
    }
    const a = G.sel;
    if (mcNeighbors(a).includes(i) && CARDS[G.grid[a]].rank === CARDS[G.grid[i]].rank) {
      G.grid[a] = G.grid[i] = null;
      G.pairs++;
      G.sel = null;
      mcRender();
      mcCheck();
    } else {
      G.sel = i;
      mcRender();
      shake($(`#gameBoard [data-i="${i}"]`));
      setStatus("붙어 있는 같은 숫자끼리만 치울 수 있습니다. 방금 누른 카드를 새로 골랐습니다.");
    }
  }

  function mcFill() {
    for (let i = 24; i >= 0 && G.stock.length; i--) if (!G.grid[i]) G.grid[i] = G.stock.shift();
    G.sel = null;
    mcRender();
    mcCheck();
  }

  function mcCheck() {
    const pair = mcFindPair();
    const empties = G.grid.filter((x) => !x).length;
    if (pair) return setStatus(`짝이 남아 있습니다. 계속 치워 보세요. (손에 ${G.stock.length}장)`);
    if (empties && G.stock.length) return setStatus("더 치울 짝이 없습니다. ‘빈자리 채우기’를 누르세요.");
    mcFinish();
  }

  function mcFinish() {
    G.done = true;
    mcRender();
    const n = G.stock.length;
    const labels = MC_LABELS[state.mcMode];
    const what = state.mcMode === "love" ? "연애점" : "소원점";
    let body;
    if (!n) {
      body = `<p class="big-answer tone-pos">${state.mcMode === "love" ? "궁합이 아주 좋습니다" : "이루어질 가능성이 매우 높습니다"}</p>
        <p>손에 들었던 27장을 모두 써 버렸습니다. 몬테카를로에서 가장 좋은 결과입니다.</p>`;
    } else {
      const k = (n - 1) % 5;
      const seq = Array.from({ length: n }, (_, i) => `<li class="${i === n - 1 ? "is-last" : ""}"><b>${i + 1}</b>${labels[i % 5]}</li>`).join("");
      body = `<p>손에 <b>${n}장</b>이 남았습니다. 남은 카드를 다섯 가지 답에 차례로 세어 봅니다.</p>
        <ol class="count-seq">${seq}</ol>
        <p class="big-answer tone-${k >= 3 ? "pos" : k === 0 || k === 2 ? "neg" : "neu"}">${labels[k]}</p>`;
    }
    const box = $("#together");
    box.innerHTML = `<h3>${what} 결과</h3>${body}<p class="fine">${G.pairs}쌍을 치웠습니다. 결과가 마음에 들지 않더라도 같은 질문을 바로 다시 묻지는 마세요.</p>`;
    box.hidden = false;
    setStatus("더 치울 수 없습니다. 결과를 확인하세요.");
    box.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }

  async function mcAuto() {
    G.busy = true;
    const run = state.run;
    while (!G.done && run === state.run) {
      const p = mcFindPair();
      if (p) {
        G.grid[p[0]] = G.grid[p[1]] = null;
        G.pairs++;
      } else if (G.grid.some((x) => !x) && G.stock.length) {
        for (let i = 24; i >= 0 && G.stock.length; i--) if (!G.grid[i]) G.grid[i] = G.stock.shift();
      } else break;
      G.sel = null;
      mcRender();
      await wait(reduceMotion ? 0 : 160);
    }
    G.busy = false;
    if (run === state.run && !G.done) mcFinish();
  }

  /* 피라미드: 28장을 앞면으로 쌓고, 위아래로 맞닿은 두 장의 합이 13이면(또는 K 한 장) 치운 뒤
   * 빈자리를 손의 카드로 위에서부터 채운다. 손의 24장을 다 쓰는 것이 목표. */
  const PY_ROWS = 7;
  const pyIdx = (r, c) => (r * (r + 1)) / 2 + c;
  const PY_POS = [];
  for (let r = 0; r < PY_ROWS; r++) for (let c = 0; c <= r; c++) PY_POS.push([r, c]);
  const pyBelow = (i) => { const [r, c] = PY_POS[i]; return r < PY_ROWS - 1 ? [pyIdx(r + 1, c), pyIdx(r + 1, c + 1)] : []; };
  const pyAdj = (a, b) => pyBelow(a).includes(b) || pyBelow(b).includes(a);
  const rank = (id) => CARDS[id].rank;

  function pyFindMove() {
    for (let i = 0; i < G.py.length; i++) {
      if (!G.py[i]) continue;
      if (rank(G.py[i]) === 13) return [i];
      for (const j of pyBelow(i)) if (G.py[j] && rank(G.py[i]) + rank(G.py[j]) === 13) return [i, j];
    }
    return null;
  }

  function pyStart() {
    G = { type: "py", py: state.deck.slice(0, 28), stock: state.deck.slice(28), sel: null, removed: 0, done: false, busy: false };
    $("#gameBoard").className = "game-board py";
    setStatus("위아래로 맞닿은 두 장의 합이 13이면 차례로 눌러 치웁니다. K는 한 장만 눌러도 치워집니다.");
    pyRender();
  }

  function pyRender() {
    const cards = G.py.map((id, i) => {
      const [r, c] = PY_POS[i];
      const pos = `style="--r:${r};--c:${c}"`;
      return id
        ? `<button type="button" class="gcard pyc ${G.sel === i ? "is-sel" : ""}" ${pos} data-i="${i}" aria-label="${esc(CARDS[id].name)}">${face(id)}</button>`
        : `<span class="gcard pyc empty" ${pos} aria-hidden="true"></span>`;
    }).join("");
    const empties = G.py.filter((x) => !x).length;
    $("#gameBoard").innerHTML = `<div class="pyramid">${cards}</div>`;
    $("#gameSide").innerHTML = `<p class="counter"><span><b>${G.stock.length}</b>장 손에 남음</span><span><b>${G.removed}</b>장 치움</span><span><b>${empties}</b>칸 빔</span></p>`;
    gameActions([
      ["fill", "빈자리 채우기", G.done || !empties || !G.stock.length],
      ["hint", "짝 찾아 주기", G.done],
      ["auto", "끝까지 자동으로", G.done],
    ]);
  }

  function pyClick(i) {
    if (G.done || G.busy || !G.py[i]) return;
    const id = G.py[i];
    if (rank(id) === 13) {
      G.py[i] = null;
      G.removed++;
      G.sel = null;
      pyRender();
      return pyCheck();
    }
    if (G.sel === null || G.sel === i) {
      G.sel = G.sel === i ? null : i;
      return pyRender();
    }
    const a = G.sel, sum = rank(G.py[a]) + rank(id);
    if (pyAdj(a, i) && sum === 13) {
      G.py[a] = G.py[i] = null;
      G.removed += 2;
      G.sel = null;
      pyRender();
      pyCheck();
    } else {
      G.sel = i;
      pyRender();
      shake($(`#gameBoard [data-i="${i}"]`));
      setStatus(pyAdj(a, i)
        ? `${CARDS[G.py[a]].label} + ${CARDS[id].label} = ${sum}. 합이 13이어야 합니다. 방금 누른 카드를 새로 골랐습니다.`
        : "위아래로 맞닿은 카드끼리만 짝지을 수 있습니다. 방금 누른 카드를 새로 골랐습니다.");
    }
  }

  function pyFillNow() {
    for (let i = 0; i < G.py.length && G.stock.length; i++) if (!G.py[i]) G.py[i] = G.stock.shift();
  }
  function pyFill() {
    pyFillNow();
    G.sel = null;
    pyRender();
    pyCheck();
  }

  function pyCheck() {
    const empties = G.py.filter((x) => !x).length;
    if (pyFindMove()) return setStatus(`치울 카드가 남아 있습니다. (손에 ${G.stock.length}장)`);
    if (empties && G.stock.length) return setStatus("더 치울 카드가 없습니다. ‘빈자리 채우기’를 누르세요. 위쪽 빈칸부터 채워집니다.");
    pyFinish();
  }

  function pyFinish() {
    G.done = true;
    pyRender();
    const n = G.stock.length;
    let answer, tone, text;
    if (n === 0) { answer = "운이 아주 좋습니다"; tone = "pos"; text = "손의 카드를 모두 썼습니다. 바라는 일이 이루어질 가능성이 매우 높습니다."; }
    else if (n <= 3) { answer = "가능성이 있습니다"; tone = "neu"; text = "기대만큼 쉽게 이루어지지는 않지만, 충분한 가능성이 있습니다. 어려움이 있어도 포기하지 마세요."; }
    else { answer = "아직 때가 아닙니다"; tone = "neg"; text = "지금은 바람이 이루어질 시기가 아닐 수 있습니다. 몸과 마음에 여유를 가진 뒤 다시 해 보세요."; }
    const box = $("#together");
    box.innerHTML = `<h3>피라미드 결과</h3>
      <p>손에 남은 카드 <b>${n}장</b> · 치운 카드 ${G.removed}장</p>
      <p class="big-answer tone-${tone}">${answer}</p><p>${text}</p>
      <p class="fine">0장: 아주 좋음 · 1~3장: 가능성 있음 · 4장 이상: 아직 때가 아님. 피라미드는 몬테카를로보다 어려워서, 손의 카드를 다 쓰는 일이 드뭅니다.</p>`;
    box.hidden = false;
    setStatus("더 치울 수 없습니다. 결과를 확인하세요.");
    box.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }

  async function pyAuto() {
    G.busy = true;
    const run = state.run;
    while (!G.done && run === state.run) {
      const mv = pyFindMove();
      if (mv) { mv.forEach((i) => { G.py[i] = null; }); G.removed += mv.length; }
      else if (G.py.some((x) => !x) && G.stock.length) pyFillNow();
      else break;
      G.sel = null;
      pyRender();
      await wait(reduceMotion ? 0 : 160);
    }
    G.busy = false;
    if (run === state.run && !G.done) pyFinish();
  }

  function gameHint() {
    const mv = G.type === "mc" ? mcFindPair() : pyFindMove();
    if (mv) {
      flash(mv.map((i) => $(`#gameBoard [data-i="${i}"]`)));
      setStatus(mv.length === 1 ? "K는 한 장만 눌러도 치워집니다." : G.type === "mc" ? "반짝이는 두 장이 짝입니다." : "반짝이는 두 장의 합이 13입니다.");
    } else if (G.type === "mc") mcCheck();
    else pyCheck();
  }

  /* ── 대화상자 · 도감 · 안내 ───────────────── */
  function openCard(id) {
    const c = CARDS[id];
    const suitBlock = c.suit
      ? `<div><p class="sub">무늬 · ${sym(c.suit)} ${SUITS[c.suit].name}</p><p>${esc(SUITS[c.suit].text)}</p></div>
         <div><p class="sub">숫자 · ${RANKS[c.rank].label} (${RANKS[c.rank].word})</p><p>${esc(RANKS[c.rank].text)}</p></div>
         <div><p class="sub">타로로 옮기면</p><p>${esc(SUITS[c.suit].tarot)} ${esc(TAROT_RANK[c.rank] || c.rank)}${c.rank === 11 ? " — 타로의 기사는 트럼프에 없어서, J를 시종이나 기사 어느 쪽으로 읽을지는 해석자마다 다릅니다" : ""}${c.rank >= 2 && c.rank <= 6 ? " · 대륙식 32장 덱에는 없는 카드" : ""}</p></div>`
      : "";
    $("#dialogBody").innerHTML = `<div class="dialog-grid">
      <div class="dialog-card">${face(id)}</div>
      <div class="dialog-sections">
        <h3 id="dialogTitle">${cardName(id)} <span>${esc(c.title)}</span></h3>
        ${tags(c)}
        <ul class="kw">${c.kw.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>
        <p>${esc(c.text)}</p>
        <div><p class="sub">연애 · 관계</p><p>${esc(c.love)}</p></div>
        <div><p class="sub">일 · 돈</p><p>${esc(c.work)}</p></div>
        <p class="advice"><b>조언</b>${esc(c.advice)}</p>
        ${suitBlock}
      </div></div>`;
    const dlg = $("#cardDialog");
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }

  function renderLibrary() {
    const lib = SUIT_ORDER.map((s) => `
      <section class="suit-book" data-suit="${s}">
        <h3>${sym(s)} ${SUITS[s].name} <span>${SUITS[s].theme}</span></h3>
        <div class="card-grid">${DECK52.filter((id) => CARDS[id].suit === s).map((id) => `
          <button type="button" class="lib-card" data-card="${id}">
            <span class="lib-face">${face(id)}</span>
            <span class="lib-name"><span class="dot tone-${CARDS[id].tone}"></span>${esc(CARDS[id].label)} <small>${esc(CARDS[id].kw[0])}</small></span>
          </button>`).join("")}</div>
      </section>`).join("")
      + `<section class="suit-book" data-suit="JK"><h3>조커 <span>뜻밖의 변수</span></h3><div class="card-grid">
          <button type="button" class="lib-card" data-card="JK"><span class="lib-face">${face("JK")}</span><span class="lib-name"><span class="dot tone-neu"></span>JOKER <small>판을 바꾸는 카드</small></span></button>
        </div></section>`;
    $("#suitBooks").innerHTML = lib;

    $("#filters").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const v = chip.dataset.suit;
      $$("#filters .chip").forEach((c) => { const on = c === chip; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", on); });
      $$("#suitBooks .suit-book").forEach((b) => { b.hidden = v !== "all" && b.dataset.suit !== v; });
    });
  }

  function renderGuide() {
    $("#suitGuide").innerHTML = SUIT_ORDER.map((s) => {
      const u = SUITS[s];
      return `<article class="suit-card ${u.color}">
        <p class="big-sym">${u.sym}</p>
        <h3>${u.name}</h3>
        <p class="suit-theme">${u.theme}</p>
        <p>${esc(u.text)}</p>
        <p class="fine">타로의 ${u.tarot} · ${u.element} · ${u.season}</p>
      </article>`;
    }).join("");
    $("#rankGuide").innerHTML = Object.values(RANKS).map((r) =>
      `<div><dt>${r.label}</dt><dd><b>${esc(r.word)}</b> ${esc(r.text)}</dd></div>`).join("");

    $("#spreadList").innerHTML = SPREADS.map((sp) => `
      <article class="spread-entry">
        <h4>${esc(sp.name)} <span>${sp.count}장${sp.family === "euro" ? " · 유럽 전통" : ""}</span></h4>
        <p>${esc(sp.blurb)}</p>
        ${sp.week
          ? `<p>덱 위에서부터 1~7번을 셋째 줄(월~일), 8~14번을 넷째 줄, 15~21번을 다섯째 줄에 놓고, 22~24번을 둘째 줄에 놓습니다. 마지막 25번은 반드시 덱의 <b>맨 아래</b>에서 뽑아 맨 윗줄에 놓습니다.</p>
             <ol><li><b>25 환경</b> — 한 주 동안 큰 영향을 주는 사람이나 사건</li><li><b>22 롱 레인지</b> — 한 주의 방향, 가장 관심을 둘 곳</li><li><b>23 플루토</b> — 넘어야 할 고비</li><li><b>24 리절트</b> — 고비를 마무리하는 해답</li><li><b>1~21</b> — 요일별 운세. 위 줄일수록 영향이 큽니다</li></ol>`
          : sp.groups
            ? `<p>덱 위에서 일곱 장씩 세 줄로 깔고, 세로 한 줄(세 장)을 한 묶음으로 읽습니다.</p><ol>${GYPSY_GROUPS.map((g) => `<li><b>${esc(g.name)}</b> — ${esc(g.desc)}</li>`).join("")}</ol>`
            : `<ol>${sp.slots.filter((s, i, a) => a.findIndex((x) => x.desc === s.desc) === i).map((s) => `<li><b>${esc(s.name.replace(/ ①$/, ""))}</b> — ${esc(s.desc)}</li>`).join("")}</ol>`}
      </article>`).join("");
  }

  /* ── 이벤트 ─────────────────────────────── */
  function bind() {
    $("#setup").addEventListener("submit", (e) => { e.preventDefault(); start(); });
    $("#deck").addEventListener("click", (e) => {
      const b = e.target.closest(".deck-card");
      if (b) takeFromDeck(+b.dataset.i);
    });
    $("#autoPick").addEventListener("click", autoPick);
    $("#layout").addEventListener("click", (e) => {
      const b = e.target.closest(".flip");
      if (!b) return;
      const n = +b.dataset.n;
      if (state.flipped.has(n)) openCard(state.picks[n]);
      else flip(n);
    });
    $("#flipAll").addEventListener("click", flipAll);
    $("#redraw").addEventListener("click", start);

    $("#gameBoard").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || !G) return;
      if (G.type === "mc") mcClick(+b.dataset.i);
      else pyClick(+b.dataset.i);
    });
    $("#gameActions").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b || !G) return;
      const act = b.dataset.act;
      if (act === "again") return start();
      if (G.busy) return;
      if (act === "hint") gameHint();
      else if (act === "fill") G.type === "mc" ? mcFill() : pyFill();
      else if (act === "auto") G.type === "mc" ? mcAuto() : pyAuto();
    });

    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-card]");
      if (b) openCard(b.dataset.card);
    });
    const dlg = $("#cardDialog");
    $("#dialogClose").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  }

  /* ── 리딩 일지에 저장 (허브의 journal-box.js를 못 불러오면 아무것도 하지 않는다) ── */
  /* 배열 리딩만 저장한다. 1년 달력과 몬테카를로·피라미드는 카드 목록이 아닌 결과라 저장 상자를 띄우지 않는다.
   * 대표 카드를 골랐으면 맨 앞에 '대표 카드 · 나'로 남긴다. 트럼프는 방향이 없다(null) */
  var journal = window.MoonHongJournal && window.MoonHongJournal.box ? window.MoonHongJournal.box({
    deck: "트럼프 카드", deckId: "trump", after: $("#readings"),
    read: () => {
      const sp = state.spread;
      if (state.kind !== "spread" || !sp || state.flipped.size < sp.count) return null;
      const cards = state.picks.map((id, n) => ({ name: CARDS[id].name, position: sp.slots[n].name, orientation: null }));
      if (state.sig) cards.unshift({ name: CARDS[state.sig].name, position: "대표 카드 · 나", orientation: null });
      return { spread: sp.name + (state.deck32 ? " · 32장" : ""), question: state.question, cards };
    },
  }) : null;

  renderSetup();
  renderLibrary();
  renderGuide();
  bind();
})();
