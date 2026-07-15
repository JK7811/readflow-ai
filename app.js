
let book;
let currentPage = Number(localStorage.getItem('readflow-page')) || 1;
let queueCancelled = false;
const $ = id => document.getElementById(id);

fetch('./book-data.json').then(r=>{
  if(!r.ok) throw new Error(`Failed to load book data (${r.status})`);
  return r.json();
}).then(data=>{
  book=normaliseBook(data);
  currentPage=Math.max(1,Math.min(book.totalPages,currentPage));
  buildPageSelect();
  updateLibrary();
}).catch(error=>{
  console.error(error);
  $('lastPageText').textContent='Unable to load book';
});

function asArray(value){
  if(Array.isArray(value)) return value;
  if(value===undefined||value===null||value==='') return [];
  return [value];
}
function normaliseBook(data){
  const pages=data&&data.pages;
  const pageMap=Array.isArray(pages)
    ? Object.fromEntries(pages.map((page,index)=>[String(page?.page??page?.id??index+1),page]))
    : (pages&&typeof pages==='object'?pages:{});
  const total=Number(data?.totalPages)||Math.max(1,...Object.keys(pageMap).map(Number).filter(Number.isFinite));
  const enhanced=Array.isArray(data?.enhancedPages)
    ? data.enhancedPages
    : Object.keys(pageMap).filter(key=>pageMap[key]);
  return {...data,pages:pageMap,totalPages:total,enhancedPages:enhanced};
}
function pageData(page=currentPage){return book.pages[String(page)]||book.pages[page]}
function sentenceData(sentence){
  if(Array.isArray(sentence)) return {english:sentence[0]??'',translation:sentence[1]??''};
  return {english:sentence?.english??'',translation:sentence?.translation??''};
}
function vocabularyData(item){
  if(Array.isArray(item)) return {word:item[0]??'',meaning:item[1]??'',level:item[2]??''};
  return {word:item?.word??'',meaning:item?.meaning??'',level:item?.level??''};
}
function textItem(item){
  if(typeof item==='string'||typeof item==='number') return String(item);
  return item?.text??item?.description??item?.meaning??item?.translation??item?.example??item?.zh??'';
}

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
  const data=pageData();
  if(data) renderEnhanced(data); else renderOriginalOnly();
  updateLibrary();
}
function renderOriginalOnly(){
  $('learningContent').innerHTML=`<div class="statusCard"><p class="eyebrow">ORIGINAL PAGE AVAILABLE</p><h2>Page ${currentPage}</h2><p>这一页已经完整导入，可以正常阅读和翻页。中英翻译、逐句发音与重点词汇会在下一阶段逐页补上。</p><p><strong>学习版进度：</strong>目前已完成第 ${book.enhancedPages.join('、')} 页。</p></div>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderEnhanced(data){
  const sentences=asArray(data.sentences).map(sentenceData).map((s,i)=>`<article class="sentence" id="sentence-${i}"><div class="sentenceTop"><button class="play" onclick="speakSentence(${i})">▶</button><p class="en">${esc(s.english)}</p></div>${s.translation?`<p class="zh">${esc(s.translation)}</p>`:''}</article>`).join('');
  const vocab=asArray(data.vocabulary).map(vocabularyData).map(v=>`<div class="vocab"><div class="vocabHead"><button onclick="speakText(${esc(JSON.stringify(v.word))})">▶ ${esc(v.word)}</button>${v.level?`<b>${esc(v.level)}</b>`:''}</div>${v.meaning?`<span>（${esc(v.meaning)}）</span>`:''}</div>`).join('');
  const grammar=asArray(data.grammar).map(g=>typeof g==='object'
    ? `<div class="learningItem"><strong>${esc(g.focus??g.title??'')}</strong>${textItem(g)?`<p>${esc(textItem(g))}</p>`:''}</div>`
    : `<div class="learningItem"><p>${esc(g)}</p></div>`).join('');
  const readingNotes=asArray(data.readingNotes??data.notes).map(textItem).filter(Boolean).map(n=>`<li>${esc(n)}</li>`).join('');
  const nativeUsage=asArray(data.nativeUsage).map(textItem).filter(Boolean).map(n=>`<div class="learningItem"><p>${esc(n)}</p></div>`).join('');
  const todayTakeaway=asArray(data.todayTakeaway).map(textItem).filter(Boolean).map(n=>`<p>${esc(n)}</p>`).join('');
  $('learningContent').innerHTML=`
    <div class="statusCard"><p class="eyebrow">${esc(data.section??'LEARNING EDITION')}</p><h2>${esc(data.title??`Page ${currentPage}`)}</h2><p>此页已完成中英学习版。</p></div>
    ${sentences}
    ${vocab?`<section class="vocabBox"><p class="eyebrow">VOCABULARY</p><h3>重点词汇</h3><div class="vocabGrid">${vocab}</div></section>`:''}
    ${grammar?`<section class="learningBox"><p class="eyebrow">GRAMMAR FOCUS</p><h3>句型与语法</h3>${grammar}</section>`:''}
    ${nativeUsage?`<section class="learningBox"><p class="eyebrow">NATIVE USAGE</p><h3>地道用法</h3>${nativeUsage}</section>`:''}
    ${readingNotes?`<section class="learningBox"><p class="eyebrow">READING NOTES</p><h3>阅读提示</h3><ul>${readingNotes}</ul></section>`:''}
    ${todayTakeaway?`<section class="learningBox takeawayBox"><p class="eyebrow">TODAY'S TAKEAWAY</p><h3>今日收获</h3>${todayTakeaway}</section>`:''}`;
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
window.speakSentence=i=>{const d=pageData();if(!d)return;const s=sentenceData(asArray(d.sentences)[i]);queueCancelled=true;speechSynthesis.cancel();setTimeout(()=>{queueCancelled=false;speechSynthesis.speak(utter(s.english,i))},70)}
window.speakText=text=>{queueCancelled=true;speechSynthesis.cancel();setTimeout(()=>{queueCancelled=false;speechSynthesis.speak(utter(text))},70)}
async function playAll(){
  const d=pageData();const sentences=asArray(d?.sentences).map(sentenceData);if(!sentences.length)return;
  stopSpeech();queueCancelled=false;
  for(let i=0;i<sentences.length;i++){if(queueCancelled)break;await new Promise(resolve=>{const u=utter(sentences[i].english,i);u.onend=resolve;u.onerror=resolve;speechSynthesis.speak(u)})}
}
function stopSpeech(){queueCancelled=true;speechSynthesis.cancel();document.querySelectorAll('.sentence').forEach(x=>x.classList.remove('active'))}
function goToPage(n){stopSpeech();currentPage=Math.max(1,Math.min(book.totalPages,n));renderPage();window.scrollTo({top:0,behavior:'smooth'})}
$('openBtn').onclick=openReader;$('backBtn').onclick=showLibrary;$('prev').onclick=()=>goToPage(currentPage-1);$('next').onclick=()=>goToPage(currentPage+1);$('playAll').onclick=playAll;$('stop').onclick=stopSpeech;$('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('readflow-theme',document.body.classList.contains('dark')?'dark':'light')};
if(localStorage.getItem('readflow-theme')==='dark')document.body.classList.add('dark');
speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();
