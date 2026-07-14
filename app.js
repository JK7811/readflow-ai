
const state = {
  book: window.READFLOW_BOOKS[0],
  currentPage: Number(localStorage.getItem("readflow-shocker-41-page")) || 2,
  queueCancelled: false
};

const els = {
  libraryView: document.getElementById("libraryView"),
  readerView: document.getElementById("readerView"),
  libraryGrid: document.getElementById("libraryGrid"),
  backButton: document.getElementById("backButton"),
  themeButton: document.getElementById("themeButton"),
  libraryNav: document.getElementById("libraryNav"),
  readerNav: document.getElementById("readerNav"),
  pageImage: document.getElementById("pageImage"),
  pageCaption: document.getElementById("pageCaption"),
  pageCounter: document.getElementById("pageCounter"),
  readerProgressBar: document.getElementById("readerProgressBar"),
  sectionName: document.getElementById("sectionName"),
  articleTitle: document.getElementById("articleTitle"),
  sentenceList: document.getElementById("sentenceList"),
  vocabularyGrid: document.getElementById("vocabularyGrid"),
  previousButton: document.getElementById("previousButton"),
  nextButton: document.getElementById("nextButton"),
  playAllButton: document.getElementById("playAllButton"),
  stopButton: document.getElementById("stopButton"),
  rateSelect: document.getElementById("rateSelect"),
  availabilityNote: document.getElementById("availabilityNote")
};

function progressPercent(page) {
  return Math.max(0, Math.min(100, (page / state.book.totalPages) * 100));
}

function renderLibrary() {
  const page = state.currentPage;
  els.libraryGrid.innerHTML = `
    <article class="book-card">
      <div class="book-cover-wrap">
        <img class="book-cover" src="${state.book.cover}" alt="${state.book.title}">
        <span class="cover-badge">正在阅读</span>
      </div>
      <div class="book-info">
        <p class="book-series">${state.book.category}</p>
        <h3>${state.book.title}</h3>
        <p class="muted">${state.book.subtitle}</p>
        <div class="progress-row"><span>阅读进度</span><strong>Page ${page} / ${state.book.totalPages}</strong></div>
        <div class="progress-track"><div class="progress-fill" style="width:${progressPercent(page)}%"></div></div>
        <button class="primary-button" id="openBookButton">继续阅读</button>
      </div>
    </article>
  `;
  document.getElementById("openBookButton").addEventListener("click", openReader);
}

function availableIndex() {
  return state.book.availablePages.indexOf(state.currentPage);
}

function renderPage() {
  const page = state.book.pages[state.currentPage];
  if (!page) {
    state.currentPage = state.book.availablePages[0];
    return renderPage();
  }

  localStorage.setItem("readflow-shocker-41-page", String(state.currentPage));
  els.pageImage.src = page.image;
  els.pageCaption.textContent = `原刊第 ${state.currentPage} 页 · 图片保留`;
  els.pageCounter.textContent = `PAGE ${state.currentPage} / ${state.book.totalPages}`;
  els.readerProgressBar.style.width = `${progressPercent(state.currentPage)}%`;
  els.sectionName.textContent = page.section;
  els.articleTitle.textContent = page.title;

  els.sentenceList.innerHTML = page.sentences.map((item, index) => `
    <article class="sentence-card" id="sentence-${index}">
      <div class="sentence-top">
        <button class="play-button" onclick="speakSentence(${index})" aria-label="播放英文句子">▶</button>
        <p class="english">${item.en}</p>
      </div>
      <p class="chinese">${item.zh}</p>
    </article>
  `).join("");

  els.vocabularyGrid.innerHTML = page.vocabulary.map(item => `
    <div class="vocabulary-item">
      <button class="word-button" onclick="speakWord(${JSON.stringify(item.word)})">▶ ${item.word}</button>
      <span class="word-meaning">（${item.meaning}）</span>
    </div>
  `).join("");

  const index = availableIndex();
  els.previousButton.disabled = index <= 0;
  els.nextButton.disabled = index >= state.book.availablePages.length - 1;
  els.availabilityNote.textContent = `正式版目前已完成第 ${state.book.availablePages.join("、")} 页；下一步继续加入后面的页面。`;
  renderLibrary();
}

function openReader() {
  els.libraryView.classList.remove("active");
  els.readerView.classList.add("active");
  els.backButton.classList.remove("hidden");
  setNav("reader");
  renderPage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showLibrary() {
  stopSpeech();
  els.readerView.classList.remove("active");
  els.libraryView.classList.add("active");
  els.backButton.classList.add("hidden");
  setNav("library");
  renderLibrary();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setNav(view) {
  els.libraryNav.classList.toggle("active", view === "library");
  els.readerNav.classList.toggle("active", view === "reader");
}

function clearActiveSentence() {
  document.querySelectorAll(".sentence-card").forEach(card => card.classList.remove("active"));
}

function preferredVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find(v => /^en-(US|GB)/.test(v.lang) && /Samantha|Daniel|Karen|Moira|Google|Microsoft/i.test(v.name))
    || voices.find(v => /^en-/.test(v.lang))
    || null;
}

function makeUtterance(text, index = null) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = Number(els.rateSelect.value);
  const voice = preferredVoice();
  if (voice) utterance.voice = voice;

  utterance.onstart = () => {
    clearActiveSentence();
    if (index !== null) {
      const card = document.getElementById(`sentence-${index}`);
      if (card) {
        card.classList.add("active");
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };
  utterance.onend = clearActiveSentence;
  utterance.onerror = clearActiveSentence;
  return utterance;
}

window.speakSentence = function(index) {
  const page = state.book.pages[state.currentPage];
  state.queueCancelled = true;
  speechSynthesis.cancel();
  setTimeout(() => {
    state.queueCancelled = false;
    speechSynthesis.speak(makeUtterance(page.sentences[index].en, index));
  }, 80);
};

window.speakWord = function(word) {
  state.queueCancelled = true;
  speechSynthesis.cancel();
  setTimeout(() => {
    state.queueCancelled = false;
    speechSynthesis.speak(makeUtterance(word));
  }, 80);
};

async function playAll() {
  stopSpeech();
  state.queueCancelled = false;
  const page = state.book.pages[state.currentPage];

  for (let index = 0; index < page.sentences.length; index += 1) {
    if (state.queueCancelled) break;
    await new Promise(resolve => {
      const utterance = makeUtterance(page.sentences[index].en, index);
      utterance.onend = () => { clearActiveSentence(); resolve(); };
      utterance.onerror = () => { clearActiveSentence(); resolve(); };
      speechSynthesis.speak(utterance);
    });
  }
}

function stopSpeech() {
  state.queueCancelled = true;
  speechSynthesis.cancel();
  clearActiveSentence();
}

function movePage(offset) {
  stopSpeech();
  const index = availableIndex();
  const target = state.book.availablePages[index + offset];
  if (!target) return;
  state.currentPage = target;
  renderPage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("readflow-theme", document.body.classList.contains("dark") ? "dark" : "light");
}

els.previousButton.addEventListener("click", () => movePage(-1));
els.nextButton.addEventListener("click", () => movePage(1));
els.playAllButton.addEventListener("click", playAll);
els.stopButton.addEventListener("click", stopSpeech);
els.backButton.addEventListener("click", showLibrary);
els.libraryNav.addEventListener("click", showLibrary);
els.readerNav.addEventListener("click", openReader);
els.themeButton.addEventListener("click", toggleTheme);

if (localStorage.getItem("readflow-theme") === "dark") document.body.classList.add("dark");

renderLibrary();
speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}
