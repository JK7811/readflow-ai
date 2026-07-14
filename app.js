
let book;
let currentPage = Number(localStorage.getItem('readflow-page')) || 1;
let queueCancelled = false;
const $ = id => document.getElementById(id);

fetch('./book-data.json').then(r=>r.json()).then(data=>{
  book=data;
  buildPageSelect();
  updateLibrary();
});

function buildPageSelect(){
  $('pageSelect').innerHTML = Array.from({length:book.totalPages},(_,i)=>`<option value="${i+1}">Page ${i+1}</option>`).join('');
  $('pageSelect').addEventListener('change',e=>goToPage(Number(e.target.value)));
}
function progress(page){return (page/book.totalPages)*100}
function updateLibrary(){
  $('lastPageText').textContent=`Page ${currentPage} / ${book.totalPages}`;
  $('libraryProgress').style.width=`${progress(currentPage)}%`;
  const enhanced = document.querySelector('.bookInfo .row:nth-of-type(2) strong');
  if (enhanced) enhanced.textContent=`${book.enhancedPages.length} / ${book.totalPages}`;
}
function openReader(){
  $('library').classList.remove('active');$('reader').classList.add('active');$('backBtn').classList.remove('hidden');renderPage();window.scrollTo(0,0)
}
function showLibrary(){
  stopSpeech();$('reader').classList.remove('active');$('library').classList.add('active');$('backBtn').classList.add('hidden');updateLibrary();window.scrollTo(0,0)
}
function renderPage(){
  localStorage.setItem('readflow-page',currentPage);
  $('pageImage').src=`./assets/pages/page-${String(currentPage).padStart(2,'0')}.jpg`;
  $('pageCaption').textContent=`原刊第 ${currentPage} 页 · 完整保留`;
  $('pageCounter').textContent=`PAGE ${currentPage} / ${book.totalPages}`;
  $('readerProgress').style.width=`${progress(currentPage)}%`;
  $('pageSelect').value=String(currentPage);
  $('prev').disabled=currentPage===1;$('next').disabled=currentPage===book.totalPages;
  const data=book.pages[String(currentPage)] || book.pages[currentPage];
  if(data) renderEnhanced(data); else renderOriginalOnly();
  updateLibrary();
}
function renderOriginalOnly(){
  $('learningContent').innerHTML=`<div class="statusCard"><p class="eyebrow">ORIGINAL PAGE AVAILABLE</p><h2>Page ${currentPage}</h2><p>这一页已经完整导入，可以正常阅读和翻页。中英翻译、逐句发音与重点词汇会在下一阶段逐页补上。</p><p><strong>学习版进度：</strong>目前已完成第 ${book.enhancedPages.join('、')} 页。</p></div>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderEnhanced(data){
  const sentences=(data.sentences||[]).map((s,i)=>`<article class="sentence" id="sentence-${i}"><div class="sentenceTop"><button class="play" onclick="speakSentence(${i})">▶</button><p class="en">${esc(s[0])}</p></div><p class="zh">${esc(s[1])}</p></article>`).join('');
  const vocab=(data.vocabulary||[]).map(v=>`<div class="vocab"><div class="vocabHead"><button onclick='speakText(${JSON.stringify(v[0])})'>▶ ${esc(v[0])}</button>${v[2]?`<b>${esc(v[2])}</b>`:''}</div><span>（${esc(v[1])}）</span></div>`).join('');
  const grammar=(data.grammar||[]).map(g=>`<div class="learningItem"><strong>${esc(g.focus)}</strong><p>${esc(g.zh)}</p></div>`).join('');
  const notes=(data.notes||[]).map(n=>`<li>${esc(n)}</li>`).join('');
  $('learningContent').innerHTML=`
    <div class="statusCard"><p class="eyebrow">${esc(data.section)}</p><h2>${esc(data.title)}</h2><p>此页已完成中英学习版。</p></div>
    ${sentences}
    ${vocab?`<section class="vocabBox"><p class="eyebrow">VOCABULARY</p><h3>重点词汇</h3><div class="vocabGrid">${vocab}</div></section>`:''}
    ${grammar?`<section class="learningBox"><p class="eyebrow">GRAMMAR FOCUS</p><h3>句型与语法</h3>${grammar}</section>`:''}
    ${notes?`<section class="learningBox"><p class="eyebrow">READING NOTES</p><h3>阅读提示</h3><ul>${notes}</ul></section>`:''}`;
}
function voice(){
  const vs=speechSynthesis.getVoices();
  return vs.find(v=>/^en-(US|GB)/.test(v.lang)&&/Samantha|Daniel|Karen|Moira|Google|Microsoft/i.test(v.name))||vs.find(v=>/^en-/.test(v.lang))||null
}
function utter(text,index=null){
  const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=Number($('rate').value);const v=voice();if(v)u.voice=v;
  u.onstart=()=>{document.querySelectorAll('.sentence').forEach(x=>x.classList.remove('active'));if(index!==null){const el=$(`sentence-${index}`);if(el){el.classList.add('active');el.scrollIntoView({behavior:'smooth',block:'center'})}}};
  u.onend=()=>document.querySelectorAll('.sentence').forEach(x=>x.classList.remove('active'));
  return u
}
window.speakSentence=i=>{const d=book.pages[String(currentPage)]||book.pages[currentPage];if(!d)return;queueCancelled=true;speechSynthesis.cancel();setTimeout(()=>{queueCancelled=false;speechSynthesis.speak(utter(d.sentences[i][0],i))},70)}
window.speakText=text=>{queueCancelled=true;speechSynthesis.cancel();setTimeout(()=>{queueCancelled=false;speechSynthesis.speak(utter(text))},70)}
async function playAll(){
  const d=book.pages[String(currentPage)]||book.pages[currentPage];if(!d||!d.sentences?.length)return;
  stopSpeech();queueCancelled=false;
  for(let i=0;i<d.sentences.length;i++){if(queueCancelled)break;await new Promise(resolve=>{const u=utter(d.sentences[i][0],i);u.onend=resolve;u.onerror=resolve;speechSynthesis.speak(u)})}
}
function stopSpeech(){queueCancelled=true;speechSynthesis.cancel();document.querySelectorAll('.sentence').forEach(x=>x.classList.remove('active'))}
function goToPage(n){stopSpeech();currentPage=Math.max(1,Math.min(book.totalPages,n));renderPage();window.scrollTo({top:0,behavior:'smooth'})}
$('openBtn').onclick=openReader;$('backBtn').onclick=showLibrary;$('prev').onclick=()=>goToPage(currentPage-1);$('next').onclick=()=>goToPage(currentPage+1);$('playAll').onclick=playAll;$('stop').onclick=stopSpeech;$('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('readflow-theme',document.body.classList.contains('dark')?'dark':'light')};
if(localStorage.getItem('readflow-theme')==='dark')document.body.classList.add('dark');
speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();
