
const sentences = [
  {
    en: "Jacqueline Sheehan disappeared in the early hours of April 15, 1998, after a night that began like hundreds before it.",
    zh: "1998年4月15日凌晨，Jacqueline Sheehan 在一个看似与过去无数夜晚没有不同的晚上失踪。"
  },
  {
    en: "She had gone dancing with her boyfriend, Rodney Bice, and her mother at Suzie’s in Deltona, Florida.",
    zh: "她当晚与男友 Rodney Bice 及母亲一起，到佛罗里达州 Deltona 的 Suzie’s 跳舞。"
  },
  {
    en: "Friends later said she was in good spirits that night.",
    zh: "朋友后来表示，她那晚心情很好。"
  },
  {
    en: "She laughed, drank, danced, and for a few hours seemed free from the turbulence that had defined much of her relationship with Bice.",
    zh: "她笑着、喝酒、跳舞，在短短几个小时里，仿佛暂时摆脱了长期笼罩她与 Bice 关系的动荡。"
  },
  {
    en: "But when the couple returned to the Willow Park Apartments in Altamonte Springs, the atmosphere changed.",
    zh: "但当两人回到 Altamonte Springs 的 Willow Park Apartments 后，气氛发生了变化。"
  },
  {
    en: "According to investigators, the two argued over a car.",
    zh: "调查人员称，两人因为一辆车发生争吵。"
  },
  {
    en: "Sometime around 2:30 a.m., Jacqueline stormed out of the apartment.",
    zh: "大约凌晨2时30分，Jacqueline 怒气冲冲地离开公寓。"
  },
  {
    en: "Rodney Bice later claimed she walked to a nearby pay phone after leaving in anger.",
    zh: "Rodney Bice 后来声称，她生气离开后走向附近的公共电话。"
  },
  {
    en: "That was the last time anyone officially reported seeing her alive.",
    zh: "那是最后一次有人正式报告看到她还活着。"
  }
];

const vocabulary = [
  { word: "turbulence", meaning: "动荡、不稳定" },
  { word: "investigators", meaning: "调查人员" },
  { word: "stormed out", meaning: "怒气冲冲地离开" },
  { word: "pay phone", meaning: "公共电话" }
];

const sentenceList = document.getElementById("sentenceList");
const vocabularyGrid = document.getElementById("vocabularyGrid");
const libraryView = document.getElementById("libraryView");
const readerView = document.getElementById("readerView");
const backButton = document.getElementById("backButton");
const themeButton = document.getElementById("themeButton");
const navItems = document.querySelectorAll(".nav-item");
let queueCancelled = false;

function renderSentences() {
  sentenceList.innerHTML = sentences.map((item, index) => `
    <article class="sentence-card" id="sentence-${index}">
      <div class="sentence-top">
        <button class="play-button" onclick="speakSentence(${index})" aria-label="播放英文句子">▶</button>
        <p class="english">${item.en}</p>
      </div>
      <p class="chinese">${item.zh}</p>
    </article>
  `).join("");
}

function renderVocabulary() {
  vocabularyGrid.innerHTML = vocabulary.map(item => `
    <div class="vocabulary-item">
      <button class="word-button" onclick="speakWord('${item.word.replaceAll("'", "\\'")}')">▶ ${item.word}</button>
      <span class="word-meaning">（${item.meaning}）</span>
    </div>
  `).join("");
}

function showLibrary() {
  stopSpeech();
  libraryView.classList.add("active");
  readerView.classList.remove("active");
  backButton.classList.add("hidden");
  setActiveNav(0);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openReader() {
  libraryView.classList.remove("active");
  readerView.classList.add("active");
  backButton.classList.remove("hidden");
  setActiveNav(1);
  localStorage.setItem("readflow-last-view", "reader");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setActiveNav(index) {
  navItems.forEach((item, i) => item.classList.toggle("active", i === index));
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
  utterance.rate = Number(document.getElementById("rateSelect").value);
  const voice = preferredVoice();
  if (voice) utterance.voice = voice;

  utterance.onstart = () => {
    clearActiveSentence();
    if (index !== null) {
      const element = document.getElementById(`sentence-${index}`);
      if (element) {
        element.classList.add("active");
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };
  utterance.onend = clearActiveSentence;
  utterance.onerror = clearActiveSentence;
  return utterance;
}

window.speakSentence = function(index) {
  queueCancelled = true;
  speechSynthesis.cancel();
  setTimeout(() => {
    queueCancelled = false;
    speechSynthesis.speak(makeUtterance(sentences[index].en, index));
  }, 80);
};

window.speakWord = function(word) {
  queueCancelled = true;
  speechSynthesis.cancel();
  setTimeout(() => {
    queueCancelled = false;
    speechSynthesis.speak(makeUtterance(word));
  }, 80);
};

async function playAll() {
  stopSpeech();
  queueCancelled = false;
  for (let index = 0; index < sentences.length; index += 1) {
    if (queueCancelled) break;
    await new Promise(resolve => {
      const utterance = makeUtterance(sentences[index].en, index);
      utterance.onend = () => {
        clearActiveSentence();
        resolve();
      };
      utterance.onerror = () => {
        clearActiveSentence();
        resolve();
      };
      speechSynthesis.speak(utterance);
    });
  }
}

function stopSpeech() {
  queueCancelled = true;
  speechSynthesis.cancel();
  clearActiveSentence();
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("readflow-theme", document.body.classList.contains("dark") ? "dark" : "light");
}

document.getElementById("openBookButton").addEventListener("click", openReader);
document.getElementById("continueNav").addEventListener("click", openReader);
document.getElementById("playAllButton").addEventListener("click", playAll);
document.getElementById("stopButton").addEventListener("click", stopSpeech);
backButton.addEventListener("click", showLibrary);
themeButton.addEventListener("click", toggleTheme);

if (localStorage.getItem("readflow-theme") === "dark") {
  document.body.classList.add("dark");
}

renderSentences();
renderVocabulary();
speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
