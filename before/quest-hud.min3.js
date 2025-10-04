/* quest-hud.min.js — Dialog system + HP counter/deltas + DOM observers + unload guard
   Updates:
   1) Autoplay dialog+audio immediately on each section change (once per section, per session).
   2) Dialog backdrop z-index handled in CSS to cover page nav buttons so they’re hidden while dialog is open. */

(()=>{

const $ = (sel, root=document)=>root.querySelector(sel);
const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));
const raf = (fn)=>requestAnimationFrame(fn);

/* ------------ Section Tracker ------------ */
const SCROLLER = document.getElementById('scroller') || window;
let SECTIONS = $$('#scroller > section');
let currentSectionId = SECTIONS[1]?.id || SECTIONS[0]?.id || '';

function getScrollTop(){ return (SCROLLER===window) ? window.scrollY : SCROLLER.scrollTop; }
function sectionTop(el){
  const base = (SCROLLER===window)? 0 : SCROLLER.getBoundingClientRect().top;
  return el.getBoundingClientRect().top - base + getScrollTop();
}
function pickCurrentSection(){
  const st = getScrollTop();
  let best=null, dist=1e9;
  for(const s of SECTIONS){
    const d = Math.abs(sectionTop(s)-st);
    if(d<dist){ dist=d; best=s; }
  }
  if(best && best.id!==currentSectionId){
    currentSectionId = best.id;
    document.dispatchEvent(new CustomEvent('sectionchange', { detail:{ sectionId: currentSectionId }}));
  }
}
let _scrollTick=false;
(SCROLLER===window? window: SCROLLER).addEventListener('scroll', ()=>{
  if(_scrollTick) return; _scrollTick=true;
  raf(()=>{ _scrollTick=false; pickCurrentSection(); });
});

/* ------------ Emoji FX ------------ */
function attachEmojiFX(root=document){
  root.addEventListener('mouseenter', e=>{
    const t = e.target.closest('[data-emoji="true"]'); if(!t) return;
    if(t.dataset.animating==='1') return;
    t.dataset.animating='1'; t.classList.add('popshake');
  }, true);
  root.addEventListener('click', e=>{
    const t = e.target.closest('[data-emoji="true"]'); if(!t) return;
    if(t.dataset.animating==='1') return;
    t.dataset.animating='1'; t.classList.add('popshake');
  }, true);
  root.addEventListener('animationend', e=>{
    const t = e.target; if(t.classList.contains('popshake')){
      t.classList.remove('popshake'); t.dataset.animating='';
    }
  }, true);
}

/* ------------ HP System ------------ */
const HP_KEYS = { HSCROLLS:'hp_hidden_scrolls' };
const IGNORE_TYPES = new Set(['hidden','button','file','image','reset','submit']);
function isCountableControl(el){
  if(!(el instanceof HTMLElement)) return false;
  if(el.matches('textarea')) return !el.disabled && !el.readOnly;
  if(el.matches('select')) return !el.disabled && !el.readOnly;
  if(el.matches('input')){
    const ty=(el.getAttribute('type')||'text').toLowerCase();
    if(IGNORE_TYPES.has(ty)) return false;
    return !el.disabled && !el.readOnly;
  }
  return false;
}
let baseInputs=0;
let hiddenScrolls=Math.max(0, parseInt(sessionStorage.getItem(HP_KEYS.HSCROLLS)||'0',10)||0);
function computeBaseInputs(){ baseInputs=$$('input,select,textarea').filter(isCountableControl).length; }
function hpValue(){ return baseInputs+hiddenScrolls; }
function renderHP(){ const n=$('#hp-num'); if(n) n.textContent=String(hpValue()); }
function showDelta(n){
  if(!n) return;
  const d=document.createElement('div');
  d.className='hp-delta '+(n>0?'add':'sub');
  d.textContent=(n>0?'+':'−')+Math.abs(n);
  document.body.appendChild(d);
  d.addEventListener('animationend', ()=>d.remove());
}
function hpAddHiddenScroll(n=1){
  const old=hiddenScrolls;
  hiddenScrolls=Math.max(0, hiddenScrolls+Math.max(1,n));
  sessionStorage.setItem(HP_KEYS.HSCROLLS,String(hiddenScrolls));
  renderHP(); showDelta(hiddenScrolls-old);
}
function hpRemoveHiddenScroll(n=1){
  const old=hiddenScrolls;
  hiddenScrolls=Math.max(0, hiddenScrolls-Math.max(1,n));
  sessionStorage.setItem(HP_KEYS.HSCROLLS,String(hiddenScrolls));
  renderHP(); showDelta(hiddenScrolls-old);
}
Object.assign(window,{ hpAddHiddenScroll, hpRemoveHiddenScroll });

function ensureHPHud(){
  if($('#hp-hud')) return;
  const hud=document.createElement('div'); hud.id='hp-hud';
  hud.innerHTML=`
    <span class="emoji dragon" data-emoji="true" aria-hidden="true">🐉</span>
    <span class="sep">HP</span>
    <span class="emoji scroll" data-emoji="true" aria-hidden="true">📜</span>
    <strong id="hp-num" class="hpnum" aria-live="polite">0</strong>
    <button id="hp-replay" title="Enter/→ next • hold Space = 2× • press once to skip current line" aria-label="Replay dialog">▶</button>
  `;
  document.body.appendChild(hud);
  attachEmojiFX(hud);
  $('#hp-replay').addEventListener('click', ()=>playCurrentSectionDialog(true));
}
function _emphasizeHPTriplet(){
  const hud=$('#hp-hud'); if(!hud) return;
  hud.classList.add('wave-dragon');
  setTimeout(()=>{ hud.classList.remove('wave-dragon'); hud.classList.add('wave-scroll'); },180);
  setTimeout(()=>{ hud.classList.remove('wave-scroll'); hud.classList.add('wave-flash'); },360);
  setTimeout(()=>{ hud.classList.remove('wave-flash'); },760);
}
Object.assign(window,{ _emphasizeHPTriplet });

function watchSlots(){
  const slots=$$('#slots .slot'); if(!slots.length) return;
  const state=new Map();
  const isFilled=(el)=>!!el.querySelector('.inside')?.children.length;
  function check(el){
    const prev=state.get(el)||false, now=isFilled(el);
    if(now!==prev){
      state.set(el,now);
      if(now && !prev) hpAddHiddenScroll(1);
      else if(!now && prev) hpRemoveHiddenScroll(1);
    }
  }
  const mo=new MutationObserver(muts=>{
    const seen=new Set();
    muts.forEach(m=>{
      const slot=m.target.closest?.('.slot'); if(slot && !seen.has(slot)){ seen.add(slot); check(slot); }
    });
  });
  slots.forEach(s=>{ state.set(s,isFilled(s)); mo.observe(s,{childList:true,subtree:true}); });
}

/* ------------ Unload Guard ------------ */
function hasAnyUserInputNow(){
  const fields=$$('input,select,textarea').filter(isCountableControl);
  for(const el of fields){
    if(el.matches('textarea, input[type="text"], input[type="search"], input[type="url"], input[type="tel"], input[type="email"], input[type="password"], input[type="number"], input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"]')){
      if((el.value||'').trim().length) return true;
    }else if(el.matches('select')){
      if((el.value||'').trim().length) return true;
    }else if(el.matches('input[type="checkbox"], input[type="radio"]')){
      if(el.checked) return true;
    }
  }
  return false;
}
window.addEventListener('beforeunload', (e)=>{ if(hasAnyUserInputNow()){ e.returnValue=''; }});

const alias = document.getElementById("alias");
/* ------------ Dialog Engine ------------ */
/* Full story script from your last message. */
const DIALOG_SCRIPTS = {
  'sec-gate': [
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Halt!',
      onLine: _mentionsScrollsHook },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Who goes there?',
      onLine: _mentionsScrollsHook },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Start the story? Enter your PIN provided by the Master.',
      onLine: _mentionsScrollsHook },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'If you need to hear any dialog for a second time, just press the play button in the top right of the screen, and it\'ll play again for you.',
      onLine: _mentionsScrollsHook }
  ],
  'sec-intro': [
    { emoji:'🐉', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'I am no villain. Yet the Wizard binds me with his sigils. My wings carry fire against my will.' },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Behold, mortals. I am Spooklek of Saurcrez. From the void I come to claim the scrolls of your magic.',
      onLine: _mentionsScrollsHook },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Yielding this dragon, I will take what is mine!',
      onLine: _mentionsScrollsHook },
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:'Your greed ends here, sorcerer. These scrolls are the lifeblood of our kingdom. Traveler, speak your alias and true name, and we might trust you.',
      onLine: _mentionsScrollsHook }
  ],
  'sec-what': [
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:'Five sessions, five works of originality. One must be a freebie — a craft of your own choosing.' },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Create them if you must. In the end, all scrolls will be mine to command.',
      onLine: _mentionsScrollsHook },
    { emoji:'🐉', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'I am forced to bear his threats between realms. Each creation swells the hoard he covets.' }
  ],
  'sec-rules': [
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:'Hear the rules of fairness. Swear to them and check the vow, or the challenge cannot continue.' },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Break them and watch your hard-won points turn to dust.' },
    { emoji:'🐉', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'The sigils lash at me when deceit is near. He forces me to strike, though my heart is not in it.' }
  ],
  'sec-overview': [
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:'Choose your crafts with care — word searches, crosswords, notes, puzzles, and the destined freebie.' },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Sameness is weakness. Your choices reveal patterns I can exploit.' },
    { emoji:'🐉', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Each choice is another scroll placed upon the scales.',
      onLine: _mentionsScrollsHook },
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:`${alias}, see the dragon’s HP — the number of scrolls across the kingdom. Guard it well.`,
      onLine: _emphasizeHPTriplet }
  ],
  'sec-grid': [
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:'Now set your sessions in order. Every scroll must take its rightful place.',
      onLine: _mentionsScrollsHook },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Arrange them poorly and your scrolls fall into my grasp.',
      onLine: _mentionsScrollsHook },
    { emoji:'🐉', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'I feel the tug of battle in each placement. Free me through wisdom, not folly.' }
  ],
  'sec-details': [
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:'Pour detail into your works: themes, counts, difficulties, and plans.' },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'The more you reveal, the easier to bind them to my will.' },
    { emoji:'🐉', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'Yet these same details chip at my chains. Complete them and I may be freed.' }
  ],
  'sec-submit': [
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:`${alias}, sign with your initial. Seal your legend. Then print your proof and deliver it.` },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'At the seal, I shall seize all that you have written! The fairies’ knowledge will be mine.' },
    { emoji:'🐉', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'No… the sigils crack with your originality. My chains shatter!' },
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:'Stand, Dragon. Guard, not destroy.' },
    { emoji:'🐉', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'I cast his staff into the abyss! The fire is no longer his.' },
    { emoji:'🧙‍♂️', voicePrefs:['Google UK English Male','Daniel','Alex'],
      text:'No! Your novelty unravels my runes! This cannot—Aaaaagh!' },
    { emoji:'🧚‍♀️', voicePrefs:['Google US English','Samantha','Victoria'],
      text:'The Wizard is undone. The Dragon is free. The scrolls of knowledge are safe. Our kingdom endures.',
      onLine: _mentionsScrollsHook }
  ]
};

function _mentionsScrollsHook(){ try{ _emphasizeHPTriplet(); }catch{} }

/* Runtime for dialog */
let dlg = {
  backdrop:null, box:null, emoji:null, text:null, btn:null, hint:null,
  typing:false, speaking:false, holdSpeed:false,
  charIndex:0, lineIndex:0, lines:[],
  voices:[], voiceReady:false, ttsUtter:null,
  skipArmed:false,
};

function ensureDialogUI(){
  if($('#dlg-backdrop')) return;
  const back=document.createElement('div'); back.id='dlg-backdrop';
  const box=document.createElement('div'); box.id='dlg-box'; box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true');
  box.innerHTML=`
    <div id="dlg-row">
      <div id="dlg-emoji" class="emoji" data-emoji="true" aria-hidden="true">🧙‍♂️</div>
      <div id="dlg-text" aria-live="polite"></div>
      <button id="dlg-advance" title="Enter/→ next • hold Space = 2× • press once to skip current line" aria-label="Advance">▶</button>
    </div>
    <div id="dlg-hint">Enter/→ next • hold Space = 2× • press once to skip current line</div>
  `;
  back.appendChild(box);
  document.body.appendChild(back);
  attachEmojiFX(back);
  dlg.backdrop=back; dlg.box=box;
  dlg.emoji=$('#dlg-emoji',box); dlg.text=$('#dlg-text',box); dlg.btn=$('#dlg-advance',box); dlg.hint=$('#dlg-hint',box);
  dlg.btn.addEventListener('click', onAdvanceInput);
  back.addEventListener('click', (e)=>{ if(e.target===back){ /* no dismiss */ }});
}
function openDialog(){ ensureDialogUI(); dlg.backdrop.classList.add('show'); }
function closeDialog(){ if(!dlg.backdrop) return; dlg.backdrop.classList.remove('show'); cancelTTS(); }
function loadVoicesOnce(){
  if(dlg.voiceReady) return;
  const grab=()=>{ dlg.voices=speechSynthesis.getVoices()||[]; dlg.voiceReady=true; };
  if('speechSynthesis' in window){
    speechSynthesis.onvoiceschanged=()=>{ grab(); };
    setTimeout(()=>{ if(!dlg.voiceReady) grab(); },1000);
  }else{ dlg.voiceReady=true; }
}
function pickVoice(prefs, emoji){
  if(!('speechSynthesis' in window)) return null;
  const voices = dlg.voices.length? dlg.voices : speechSynthesis.getVoices();
  if(!voices || !voices.length) return null;
  const byName = n=>voices.find(v=>v.name.toLowerCase()===String(n||'').toLowerCase());
  for(const p of (prefs||[])){ const v=byName(p); if(v) return v; }
  const female = voices.find(v=>/female|susan|sara|victoria|samantha|zoe|amy|emma/i.test(v.name));
  const male   = voices.find(v=>/male|daniel|brian|alex|matthew|mike|john|fred/i.test(v.name));
  if(emoji==='🧚‍♀️') return female || voices[0];
  if(emoji==='🧙‍♂️' || emoji==='🐉') return male || voices[0];
  return voices[0];
}
function cancelTTS(){
  try{
    if('speechSynthesis' in window){
      if(dlg.ttsUtter){ dlg.ttsUtter.onend=null; dlg.ttsUtter.onerror=null; }
      if(speechSynthesis.speaking) speechSynthesis.cancel();
    }
  }catch{}
  dlg.speaking=false; dlg.emoji && dlg.emoji.classList.remove('speaking');
}
function typeLine(full){
  dlg.typing=true; dlg.charIndex=0; dlg.text.textContent='';
  const base=22;
  cancelTTS(); speak(full); const tick=()=>{
    if(!dlg.typing) return;
    const step=Math.max(1, dlg.holdSpeed?2:1);
    dlg.charIndex += step;
    dlg.text.textContent = full.slice(0, dlg.charIndex);
    if(dlg.charIndex>=full.length){ dlg.typing=false; return; }
    setTimeout(()=>raf(tick), dlg.holdSpeed? base/2 : base);
  };
  tick();
}
function speak(text){
  if(!('speechSynthesis' in window)){ dlg.speaking=false; return; }
  cancelTTS();
  const line=dlg.lines[dlg.lineIndex]||{};
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(line.voicePrefs, line.emoji);
  if(v) u.voice = v;
  u.onend=()=>{ dlg.speaking=false; dlg.emoji && dlg.emoji.classList.remove('speaking'); dlg.skipArmed=true; };
  u.onerror=u.onend;
  dlg.speaking=true; dlg.emoji && dlg.emoji.classList.add('speaking');
  dlg.ttsUtter=u;
  try{ speechSynthesis.speak(u); }catch{ dlg.speaking=false; dlg.emoji && dlg.emoji.classList.remove('speaking'); }
}
function onAdvanceInput(){
  if(dlg.typing){
    const full=(dlg.lines[dlg.lineIndex]?.text)||'';
    dlg.typing=false; dlg.text.textContent=full; cancelTTS(); dlg.skipArmed=true; return;
  }
  if(dlg.speaking){ cancelTTS(); dlg.skipArmed=true; return; }
  if(dlg.skipArmed){ dlg.skipArmed=false; advanceLine(); } else { advanceLine(); }
}
function advanceLine(){
  dlg.lineIndex++;
  if(dlg.lineIndex>=dlg.lines.length){ closeDialog(); return; }
  const line=dlg.lines[dlg.lineIndex];
  dlg.emoji.textContent=line.emoji||'🧙‍♂️';
  dlg.text.textContent='';
  dlg.skipArmed=false;
  if(typeof line.onLine==='function'){ try{ line.onLine(dlg.lineIndex, line.text); }catch{} }
  typeLine(String(line.text||''));
}
function playDialogFor(sectionId, force=false){
  if(!sectionId) return;
  if(!force && sessionStorage.getItem(`dlg_ran_${sectionId}`)==='1') return;
  const lines=DIALOG_SCRIPTS[sectionId]; if(!lines || !lines.length) return;
  ensureDialogUI(); loadVoicesOnce();
  dlg.lines=lines; dlg.lineIndex=-1; openDialog(); advanceLine();
  sessionStorage.setItem(`dlg_ran_${sectionId}`,'1');
}
function playCurrentSectionDialog(force=false){ playDialogFor(currentSectionId, !!force); }
Object.assign(window,{ playCurrentSectionDialog });

/* ---- Autoplay immediately on every section change (once per section) ---- */
document.addEventListener('sectionchange', (e)=>{
  const id=e.detail?.sectionId; if(!id) return;
  if(sessionStorage.getItem(`dlg_ran_${id}`)!=='1'){
    // No delay: start dialog+TTS right away when the new section becomes current.
    playCurrentSectionDialog(false);
  }
});

/* Dialog key controls */
document.addEventListener('keydown', (e)=>{
  if(!$('#dlg-backdrop')?.classList.contains('show')) return;
  if(e.key==='Enter' || e.key==='ArrowRight'){ e.preventDefault(); onAdvanceInput(); }
  if(e.code==='Space'){ e.preventDefault(); dlg.holdSpeed=true; onAdvanceInput(); }
});
document.addEventListener('keyup', (e)=>{ if(e.code==='Space'){ dlg.holdSpeed=false; }});

/* ------------ Bootstrap ------------ */
function init(){
  ensureHPHud(); computeBaseInputs(); renderHP();
  const _g=document.getElementById('sec-gate'); if(_g && _g.style.display!=='none'){ try{ currentSectionId='sec-gate'; }catch{} }
const mo=new MutationObserver(()=>{
    if(mo._t) return; mo._t=true; raf(()=>{ mo._t=false; computeBaseInputs(); renderHP(); });
  });
  mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['type','disabled','readonly']});
  document.addEventListener('input', e=>{ if(isCountableControl(e.target)) { computeBaseInputs(); renderHP(); }});
  attachEmojiFX(document);
  watchSlots();
  pickCurrentSection();
  // Kick off first section’s dialog if not yet played
  if(sessionStorage.getItem(`dlg_ran_${currentSectionId}`)!=='1'){
    playCurrentSectionDialog(false);
  }
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();

})();