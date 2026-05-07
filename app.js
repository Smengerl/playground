// =============================================
// Flitz – Story Reader  |  app.js
// =============================================

// Chapter registry – add new .md files here
const CHAPTERS = [
  {
    file: 'kapitel-01-die-kleine-fabrik.md',
    title: 'Die kleine Fabrik am Sonnenhügel',
    label: 'Kapitel 1',
  },
  {
    file: 'kapitel-02-das-geheimnis-der-montagestrasse.md',
    title: 'Das Geheimnis der Montagestraße',
    label: 'Kapitel 2',
  },
  {
    file: 'kapitel-03-die-pruefhalle-der-guten-ideen.md',
    title: 'Die Prüfhalle der guten Ideen',
    label: 'Kapitel 3',
  },
  {
    file: 'kapitel-04-die-erste-fahrt-zur-stadt.md',
    title: 'Die erste Fahrt zur Stadt',
    label: 'Kapitel 4',
  },
  {
    file: 'kapitel-05-ein-guter-platz-fuer-flitz.md',
    title: 'Ein guter Platz für Flitz',
    label: 'Kapitel 5',
  },
];

// ── DOM references ───────────────────────────
const sidebar       = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle    = document.getElementById('menu-toggle');
const chapterList   = document.getElementById('chapter-list');
const mainArea      = document.getElementById('main');
const contentArea   = document.getElementById('content-area');
const chapterNav    = document.getElementById('chapter-nav');
const ttsControls   = document.getElementById('tts-controls');
const voiceSelect   = document.getElementById('voice-select');
const speakBtn      = document.getElementById('speak-btn');
const stopSpeakBtn  = document.getElementById('stop-speak-btn');
const breadcrumb    = document.querySelector('#topbar .breadcrumb');
const welcomeScreen = document.getElementById('welcome');
const startBtn      = document.querySelector('#welcome .start-btn');

let currentIndex = -1;   // -1 = welcome screen
let voices = [];
const supportsSpeech = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

function stopSpeaking() {
  if (supportsSpeech) window.speechSynthesis.cancel();
}

function populateVoiceSelect() {
  if (!supportsSpeech) return;

  const loadedVoices = window.speechSynthesis.getVoices();
  if (!loadedVoices.length) return;

  const previousSelection = voiceSelect.value;
  voices = loadedVoices;
  voiceSelect.innerHTML = '';

  voices.forEach((voice) => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });

  if (!voices.length) return;
  const hasPrevious = voices.some((voice) => voice.name === previousSelection);
  voiceSelect.value = hasPrevious ? previousSelection : voices[0].name;
}

function speakCurrentChapter() {
  if (!supportsSpeech) return;
  const text = contentArea.innerText.trim();
  if (!text) return;

  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = voices.find((voice) => voice.name === voiceSelect.value);
  if (selectedVoice) utterance.voice = selectedVoice;
  window.speechSynthesis.speak(utterance);
}

// ── Build sidebar navigation ─────────────────
function buildNav() {
  chapterList.innerHTML = '';
  CHAPTERS.forEach((ch, idx) => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = '#';

    const numSpan = document.createElement('span');
    numSpan.className = 'ch-num';
    numSpan.textContent = idx + 1;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = `${ch.label}: ${ch.title}`;

    a.appendChild(numSpan);
    a.appendChild(titleSpan);
    a.addEventListener('click', (e) => { e.preventDefault(); loadChapter(idx); });
    li.appendChild(a);
    chapterList.appendChild(li);
  });
}

// ── Load & render a chapter ──────────────────
async function loadChapter(idx) {
  const chapter = CHAPTERS[idx];
  if (!chapter) return;

  currentIndex = idx;
  stopSpeaking();
  closeSidebar();
  showContent();

  // Update active link in sidebar
  chapterList.querySelectorAll('a').forEach((a, i) => {
    a.classList.toggle('active', i === idx);
  });

  // Breadcrumb
  breadcrumb.innerHTML = `${chapter.label}: <span>${chapter.title}</span>`;

  // Show loading state
  contentArea.innerHTML = '<p class="state-msg">⏳ Wird geladen…</p>';
  chapterNav.innerHTML  = '';

  try {
    const res  = await fetch(chapter.file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    // Render markdown → HTML using marked (loaded via CDN)
    contentArea.innerHTML = marked.parse(text);
  } catch (err) {
    contentArea.innerHTML = `<p class="state-msg">⚠️ Kapitel konnte nicht geladen werden.<br><small>${err.message}</small></p>`;
  }

  // Scroll to top of content
  mainArea.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Prev / Next buttons
  renderNav(idx);
}

// ── Prev / Next navigation ────────────────────
function renderNav(idx) {
  chapterNav.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '← Zurück';
  prevBtn.disabled  = idx === 0;
  prevBtn.addEventListener('click', () => loadChapter(idx - 1));

  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = 'Weiter →';
  nextBtn.disabled  = idx === CHAPTERS.length - 1;
  nextBtn.addEventListener('click', () => loadChapter(idx + 1));

  chapterNav.appendChild(prevBtn);
  chapterNav.appendChild(nextBtn);
}

// ── Welcome screen ───────────────────────────
function showWelcome() {
  currentIndex = -1;
  stopSpeaking();

  chapterList.querySelectorAll('a').forEach(a => a.classList.remove('active'));
  breadcrumb.innerHTML = '<span>Willkommen</span>';

  welcomeScreen.style.display  = 'block';
  contentArea.style.display    = 'none';
  ttsControls.style.display    = 'none';
  chapterNav.style.display     = 'none';

  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showContent() {
  welcomeScreen.style.display  = 'none';
  contentArea.style.display    = 'block';
  ttsControls.style.display    = supportsSpeech ? 'flex' : 'none';
  chapterNav.style.display     = 'flex';
}

// ── Mobile sidebar ────────────────────────────
menuToggle.addEventListener('click', () => {
  const isOpen = sidebar.classList.contains('open');
  isOpen ? closeSidebar() : openSidebar();
});

sidebarOverlay.addEventListener('click', closeSidebar);

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
}

// ── Start button ──────────────────────────────
startBtn.addEventListener('click', () => loadChapter(0));
speakBtn.addEventListener('click', speakCurrentChapter);
stopSpeakBtn.addEventListener('click', stopSpeaking);

// ── Logo / title click → welcome ─────────────
document.querySelector('#sidebar-header').addEventListener('click', showWelcome);

if (supportsSpeech) {
  populateVoiceSelect();
  window.speechSynthesis.addEventListener('voiceschanged', populateVoiceSelect);
}

// ── Init ──────────────────────────────────────
buildNav();
showWelcome();
