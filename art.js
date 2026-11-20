/* MoonHongTRUMP — 카드 그림. 이 사이트를 위해 새로 그린 SVG.
 * 카드 판은 250 × 350 (5 : 7, 일반 트럼프 비율).
 * 무늬 모양은 100 × 100 안에 가운데(50,50)를 기준으로 그렸다.
 */
const SUIT_PATH = {
  H: "M50 90C22 68 5 50 5 31 5 16 16 7 29 7c9 0 17 5 21 14 4-9 12-14 21-14 13 0 24 9 24 24 0 19-17 37-45 59z",
  D: "M50 4C60 22 74 38 90 50 74 62 60 78 50 96 40 78 26 62 10 50 26 38 40 22 50 4z",
  S: "M50 5C66 26 95 40 95 62c0 13-10 21-21 21-9 0-16-4-20-11 1 10 5 18 13 24H33c8-6 12-14 13-24-4 7-11 11-20 11C15 83 5 75 5 62 5 40 34 26 50 5z",
  C: "M50 6a20 20 0 0 1 17 30.5A20 20 0 1 1 55 72c1 10 5 17 12 24H33c7-7 11-14 12-24a20 20 0 1 1-12-35.5A20 20 0 0 1 50 6z",
};
const INK = { red: "#c4313e", black: "#1c2033" };
const ACCENT = { H: "#d9586a", D: "#e0893a", C: "#2f8a7a", S: "#3c4f9c" };
const GOLD = "#d4a537";
const SKIN = "#f4dcc2";

function pip(s, x, y, size, flip) {
  const k = size / 100;
  const rot = flip ? ` rotate(180 ${x} ${y})` : "";
  return `<path d="${SUIT_PATH[s]}" fill="${INK[SUITS[s].color]}" transform="${rot} translate(${x - 50 * k} ${y - 50 * k}) scale(${k})"/>`;
}

const L = 82, C = 125, R = 168;
const PIPS = {
  2: [[C, 72], [C, 278]],
  3: [[C, 72], [C, 175], [C, 278]],
  4: [[L, 72], [R, 72], [L, 278], [R, 278]],
  5: [[L, 72], [R, 72], [C, 175], [L, 278], [R, 278]],
  6: [[L, 72], [R, 72], [L, 175], [R, 175], [L, 278], [R, 278]],
  7: [[L, 72], [R, 72], [C, 123], [L, 175], [R, 175], [L, 278], [R, 278]],
  8: [[L, 72], [R, 72], [C, 123], [L, 175], [R, 175], [C, 227], [L, 278], [R, 278]],
  9: [[L, 72], [R, 72], [L, 140], [R, 140], [C, 175], [L, 210], [R, 210], [L, 278], [R, 278]],
  10: [[L, 72], [R, 72], [C, 106], [L, 140], [R, 140], [L, 210], [R, 210], [C, 244], [L, 278], [R, 278]],
};

function corner(card) {
  const s = card.suit, col = INK[SUITS[s].color];
  const narrow = card.label === "10" ? ' textLength="30" lengthAdjust="spacingAndGlyphs"' : "";
  const one = `<g><text x="25" y="42" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="32" fill="${col}"${narrow}>${card.label}</text>${pip(s, 25, 62, 20)}</g>`;
  return one + `<g transform="rotate(180 125 175)">${one.replace(/^<g>|<\/g>$/g, "")}</g>`;
}

function frame(inner) {
  return `<svg class="card-svg" viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg" role="img">
<rect x="1" y="1" width="248" height="348" rx="16" fill="#fbf7ee" stroke="#d8cfbd" stroke-width="2"/>${inner}</svg>`;
}

function aceArt(card) {
  const s = card.suit, acc = ACCENT[s];
  let out = `<circle cx="125" cy="175" r="78" fill="none" stroke="${acc}" stroke-width="1.5" stroke-dasharray="2 6" opacity=".7"/>`;
  out += `<circle cx="125" cy="175" r="64" fill="none" stroke="${GOLD}" stroke-width="1" opacity=".8"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, x = 125 + Math.cos(a) * 78, y = 175 + Math.sin(a) * 78;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${GOLD}"/>`;
  }
  if (s === "S") {
    // 스페이드 A: 큰 무늬 위에 초승달 하나 (MoonHong 표식)
    out += pip(s, 125, 172, 96);
    out += `<path d="M131 140a15 15 0 1 1-9 26 12 12 0 1 0 9-26z" fill="${GOLD}"/>`;
  } else {
    out += pip(s, 125, 175, 74);
  }
  return out;
}

/* 그림 카드: 위 절반에 인물을 그리고, 아래 절반은 180도 돌려 붙인다(양두 그림). */
function figure(card) {
  const s = card.suit, r = card.rank, acc = ACCENT[s], ink = INK[SUITS[s].color], line = "#2b2433";
  let g = "";
  // 옷 (어깨에서 판 가운데까지)
  g += `<path d="M66 175c2-26 16-40 38-46h42c22 6 36 20 38 46z" fill="${acc}" stroke="${line}" stroke-width="1.6"/>`;
  // 옷깃과 장식 띠
  g += `<path d="M104 129l21 30 21-30" fill="#fbf7ee" stroke="${line}" stroke-width="1.4"/>`;
  g += `<path d="M84 175c3-16 9-27 20-34M166 175c-3-16-9-27-20-34" fill="none" stroke="${GOLD}" stroke-width="4"/>`;
  g += `<path d="M84 175c3-16 9-27 20-34M166 175c-3-16-9-27-20-34" fill="none" stroke="${line}" stroke-width="1" stroke-dasharray="1 5"/>`;
  // 가슴의 무늬
  g += pip(s, 125, 160, 18);
  // 목과 얼굴
  g += `<rect x="117" y="116" width="16" height="16" fill="${SKIN}" stroke="${line}" stroke-width="1.2"/>`;
  if (r === 12) {
    // 퀸: 어깨까지 내려오는 머리
    g += `<path d="M101 104c0-22 48-22 48 0v28c-6 4-12 3-15-2h-18c-3 5-9 6-15 2z" fill="${line}" opacity=".85"/>`;
  }
  g += `<ellipse cx="125" cy="104" rx="17" ry="20" fill="${SKIN}" stroke="${line}" stroke-width="1.4"/>`;
  // 눈·입
  g += `<path d="M116 102q3-3 6 0M128 102q3-3 6 0" fill="none" stroke="${line}" stroke-width="1.4" stroke-linecap="round"/>`;
  g += `<path d="M121 114q4 3 8 0" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
  if (r === 13) {
    // 킹: 수염과 왕관
    g += `<path d="M108 108c2 16 9 22 17 22s15-6 17-22c-4 5-9 7-17 7s-13-2-17-7z" fill="#8a6a4a" stroke="${line}" stroke-width="1.2"/>`;
    g += `<path d="M104 88l4-26 10 14 7-20 7 20 10-14 4 26z" fill="${GOLD}" stroke="${line}" stroke-width="1.4"/>`;
    g += `<rect x="103" y="84" width="44" height="8" rx="2" fill="${GOLD}" stroke="${line}" stroke-width="1.2"/>`;
    g += `<circle cx="125" cy="88" r="2.6" fill="${acc}"/><circle cx="125" cy="58" r="3" fill="${acc}"/>`;
    // 홀(지팡이)
    g += `<path d="M168 175V98" stroke="${line}" stroke-width="4"/><path d="M168 175V98" stroke="${GOLD}" stroke-width="2"/>`;
    g += pip(s, 168, 92, 20);
  } else if (r === 12) {
    // 퀸: 둥근 끝 작은 관과 꽃
    g += `<path d="M107 88q6-16 9 0q4-18 9-18t9 18q3-16 9 0z" fill="${GOLD}" stroke="${line}" stroke-width="1.3"/>`;
    g += `<circle cx="125" cy="72" r="3" fill="${acc}"/>`;
    g += `<path d="M78 175c-2-14 2-24 10-30" stroke="#5c8a4a" stroke-width="2.4" fill="none"/>`;
    g += `<circle cx="90" cy="142" r="7" fill="${acc}" stroke="${line}" stroke-width="1.2"/><circle cx="90" cy="142" r="2.6" fill="${GOLD}"/>`;
  } else {
    // 잭: 깃털 달린 모자와 짧은 머리
    g += `<path d="M106 96c-2-18 10-26 19-26s21 8 19 26c-6-6-12-8-19-8s-13 2-19 8z" fill="${line}" opacity=".8"/>`;
    g += `<path d="M100 90c4-16 46-16 50 0z" fill="${acc}" stroke="${line}" stroke-width="1.4"/>`;
    g += `<rect x="100" y="86" width="50" height="6" rx="3" fill="${GOLD}" stroke="${line}" stroke-width="1"/>`;
    g += `<path d="M146 86c10-12 20-16 30-14-8 2-14 8-20 16" fill="#fbf7ee" stroke="${line}" stroke-width="1.2"/>`;
    // 들고 있는 작은 무늬 깃발
    g += `<path d="M82 175V108" stroke="${line}" stroke-width="2.4"/>`;
    g += `<path d="M82 108h26v18H82z" fill="#fbf7ee" stroke="${line}" stroke-width="1.2"/>` + pip(s, 95, 117, 12);
  }
  return g;
}

function courtArt(card) {
  const acc = ACCENT[card.suit];
  // 인물은 위 절반(y 40~175) 안에서만 그리므로 잘라 낼 필요가 없다.
  const top = figure(card);
  let out = `<rect x="52" y="40" width="146" height="270" rx="4" fill="#f3ecdc" stroke="${acc}" stroke-width="2"/>`;
  out += `<g>${top}</g>`;
  out += `<g transform="rotate(180 125 175)">${top}</g>`;
  out += `<path d="M52 175h146" stroke="${acc}" stroke-width="1.5"/>`;
  out += `<rect x="52" y="40" width="146" height="270" rx="4" fill="none" stroke="#2b2433" stroke-width="1"/>`;
  return out;
}

function jokerArt() {
  const line = "#2b2433";
  let g = "";
  g += `<text x="28" y="40" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="17" fill="#c4313e" writing-mode="tb" letter-spacing="2">JOKER</text>`;
  g += `<g transform="rotate(180 125 175)"><text x="28" y="40" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="17" fill="#1c2033" writing-mode="tb" letter-spacing="2">JOKER</text></g>`;
  g += `<circle cx="125" cy="175" r="92" fill="#1b2340"/>`;
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39996, d = 30 + (i * 37) % 58;
    g += `<circle cx="${(125 + Math.cos(a) * d).toFixed(1)}" cy="${(175 + Math.sin(a) * d).toFixed(1)}" r="${i % 3 ? 1.2 : 2}" fill="#f4eefb"/>`;
  }
  // 초승달 얼굴의 광대
  g += `<path d="M150 112a62 62 0 1 0 0 124a80 80 0 0 1 0-124z" fill="${GOLD}" stroke="${line}" stroke-width="1.6"/>`;
  g += `<path d="M99 164q5-4 10 0" fill="none" stroke="${line}" stroke-width="2.2" stroke-linecap="round"/>`;
  g += `<path d="M94 196q9 8 19 1" fill="none" stroke="#c4313e" stroke-width="2.6" stroke-linecap="round"/>`;
  g += `<circle cx="100" cy="182" r="4" fill="#e8909a" opacity=".7"/>`;
  // 세 갈래 모자
  g += `<path d="M96 122c-8-22-26-30-40-26 14 4 20 14 22 30zM112 110c0-26 10-40 24-44-6 12-8 24-6 40zM104 116c-14-18-12-36-4-48 2 16 10 28 22 38z" fill="#c4313e" stroke="${line}" stroke-width="1.4"/>`;
  g += `<circle cx="56" cy="96" r="5" fill="${GOLD}" stroke="${line}"/><circle cx="136" cy="66" r="5" fill="${GOLD}" stroke="${line}"/><circle cx="100" cy="68" r="5" fill="${GOLD}" stroke="${line}"/>`;
  g += `<path d="M88 128q22-14 44-8" fill="none" stroke="${GOLD}" stroke-width="6" stroke-linecap="round"/>`;
  return g;
}

function cardSVG(id) {
  const card = CARDS[id];
  if (!card.suit) return frame(jokerArt());
  let inner = corner(card);
  if (card.rank === 1) inner += aceArt(card);
  else if (card.rank >= 11) inner += courtArt(card);
  else inner += PIPS[card.rank].map(([x, y]) => pip(card.suit, x, y, card.rank >= 9 ? 38 : 42, y > 176)).join("");
  return frame(inner);
}

function backSVG() {
  let dots = "";
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) {
    const cx = 45 + x * 40, cy = 55 + y * 40;
    dots += `<path d="M${cx} ${cy - 6}l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" class="b-star"/>`;
  }
  return `<svg class="back-art" viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<rect x="1" y="1" width="248" height="348" rx="16" class="b-ground"/>
<rect x="14" y="14" width="222" height="322" rx="9" class="b-frame"/>
<rect x="22" y="22" width="206" height="306" rx="6" class="b-frame thin"/>
<g opacity=".55">${dots}</g>
<circle cx="125" cy="175" r="54" class="b-disc"/>
<circle cx="125" cy="175" r="54" class="b-ring"/>
<path d="M136 140a37 37 0 1 1-22 66 30 30 0 1 0 22-66z" class="b-moon"/>
<path d="M125 108v-10M125 252v-10M58 175h10M182 175h10" class="b-tick"/>
</svg>`;
}
