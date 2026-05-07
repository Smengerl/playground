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
const ttsChapterSelect = document.getElementById('tts-chapter-select');
const ttsStartBtn      = document.getElementById('tts-start-btn');
const ttsPauseBtn      = document.getElementById('tts-pause-btn');
const ttsStopBtn       = document.getElementById('tts-stop-btn');
const ttsStatus        = document.getElementById('tts-status');
const breadcrumb    = document.querySelector('#topbar .breadcrumb');
const welcomeScreen = document.getElementById('welcome');
const startBtn      = document.querySelector('#welcome .start-btn');

let currentIndex = -1;   // -1 = welcome screen
let voices = [];
const isTtsSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

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

  ttsChapterSelect.innerHTML = '';
  CHAPTERS.forEach((ch, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = `${ch.label}: ${ch.title}`;
    ttsChapterSelect.appendChild(option);
  });
}

function setTtsStatus(text) {
  ttsStatus.textContent = text;
}

function setTtsControlsEnabled(enabled) {
  const disabled = !enabled || !isTtsSupported;
  voiceSelect.disabled = disabled;
  ttsChapterSelect.disabled = disabled;
  ttsStartBtn.disabled = disabled;
  ttsPauseBtn.disabled = disabled;
  ttsStopBtn.disabled = disabled;
}

function stopTts(statusText = 'Gestoppt') {
  if (!isTtsSupported) return;
  window.speechSynthesis.cancel();
  setTtsStatus(statusText);
}

function populateVoiceSelect() {
  if (!isTtsSupported) return;

  const loadedVoices = window.speechSynthesis.getVoices();
  if (!loadedVoices.length) return;

  const previousSelection = voiceSelect.value;
  voices = loadedVoices;
  voiceSelect.innerHTML = '';

  voices.forEach((voice) => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    option.lang = voice.lang;
    voiceSelect.appendChild(option);
  });

  if (!voices.length) return;
  const hasPrevious = voices.some((voice) => voice.name === previousSelection);
  voiceSelect.value = hasPrevious ? previousSelection : voices[0].name;
}

async function startTts() {
  if (!isTtsSupported) return;

  const selectedIndex = Number(ttsChapterSelect.value);
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= CHAPTERS.length) {
    setTtsStatus('Ungültiges Kapitel');
    return;
  }

  if (selectedIndex !== currentIndex) {
    await loadChapter(selectedIndex);
  }

  const text = contentArea.innerText.trim();
  if (!text) {
    setTtsStatus('Kein Inhalt verfügbar');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';

  const selectedVoice = voices.find((voice) => voice.name === voiceSelect.value);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onstart = () => setTtsStatus('Läuft');
  utterance.onend = () => setTtsStatus('Fertig');
  utterance.onerror = () => setTtsStatus('Fehler');
  window.speechSynthesis.speak(utterance);
}

function getUnavailableStatus() {
  return isTtsSupported ? '' : 'Nicht verfügbar';
}

// ── Load & render a chapter ──────────────────
async function loadChapter(idx) {
  const chapter = CHAPTERS[idx];
  if (!chapter) return;

  currentIndex = idx;
  stopTts(getUnavailableStatus());
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
  ttsChapterSelect.value = String(idx);
  setTtsControlsEnabled(true);
  setTtsStatus(isTtsSupported ? 'Bereit' : 'Nicht verfügbar');
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
  stopTts(getUnavailableStatus());

  chapterList.querySelectorAll('a').forEach(a => a.classList.remove('active'));
  breadcrumb.innerHTML = '<span>Willkommen</span>';

  welcomeScreen.style.display  = 'block';
  contentArea.style.display    = 'none';
  ttsControls.style.display    = 'none';
  chapterNav.style.display     = 'none';
  setTtsControlsEnabled(false);
  setTtsStatus(isTtsSupported ? 'Kapitel wählen' : 'Nicht verfügbar');

  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showContent() {
  welcomeScreen.style.display  = 'none';
  contentArea.style.display    = 'block';
  ttsControls.style.display    = 'flex';
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
ttsStartBtn.addEventListener('click', startTts);
ttsPauseBtn.addEventListener('click', () => {
  if (!isTtsSupported) return;

  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    setTtsStatus('Pausiert');
  } else if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    setTtsStatus('Läuft');
  } else {
    setTtsStatus('Keine aktive Wiedergabe');
  }
});
ttsStopBtn.addEventListener('click', () => stopTts('Gestoppt'));
ttsChapterSelect.addEventListener('change', () => {
  if (!isTtsSupported) return;
  if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
    stopTts('Bereit');
  }
});

// ── Logo / title click → welcome ─────────────
document.querySelector('#sidebar-header').addEventListener('click', showWelcome);

if (isTtsSupported) {
  populateVoiceSelect();
  window.speechSynthesis.addEventListener('voiceschanged', populateVoiceSelect);
}

// ── Init ──────────────────────────────────────
buildNav();
showWelcome();
