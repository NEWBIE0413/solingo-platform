/* Solingo engine. Knows nothing about any language: everything comes from courses/<id>.json (see docs/COURSE.md). */

// ================= course =================
let COURSE=null, ORDER=[], FREE=new Set(), WORDS=[], SETS=[], JOIN='', AUDIO=null, AUDIO_DIR='';
const rom=k=>COURSE.items[k]?.r??k;
function tok(w){const o=[];for(let i=0;i<w.length;i++){if(i+1<w.length&&JOIN.includes(w[i+1])){o.push(w[i]+w[i+1]);i++}else o.push(w[i])}return o}
const wordKana=w=>tok(w).filter(k=>!FREE.has(k));
async function loadCourse(id){
  const c=await (await fetch(`courses/${id}.json`)).json();
  COURSE=c;ORDER=c.order;FREE=new Set(Object.keys(c.items).filter(k=>c.items[k].free));WORDS=c.words.map(w=>[w.t,w.m]);SETS=c.sets;JOIN=c.tokenize?.joiners||'';
  document.title=`Solingo · ${c.title}`;
  // Pre-rendered audio (courses/<id>-audio/index.json maps text → file). Like the clone's per-option mp3s; TTS is only the fallback.
  AUDIO_DIR=c.audio||`courses/${id}-audio/`;
  try{AUDIO=await (await fetch(AUDIO_DIR+'index.json')).json()}catch{AUDIO=null}
}

// ================= state =================
// Server-authoritative: /api/kana/state holds the account's progress; localStorage is only an offline mirror.
const KEY=()=>`solingo.${COURSE.id}.v2`, SKEY=()=>`solingo.${COURSE.id}.session`;
const API=()=>`/api/kana/state?course=${encodeURIComponent(COURSE.id)}`;
let S=null, ONLINE=true, pendingXP=0, saveT=null;
async function apiPut(body){try{const r=await fetch(API(),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});if(r.status===401){location.href='/sign-in?next=/kana';return false}ONLINE=r.ok;return r.ok}catch{ONLINE=false;return false}}
function save(){try{localStorage.setItem(KEY(),JSON.stringify(S))}catch{}
  clearTimeout(saveT);saveT=setTimeout(()=>{const xp=pendingXP;pendingXP=0;apiPut({state:S,...(xp?{xpDelta:xp}:{})}).then(ok=>{if(!ok)pendingXP+=xp})},400)}
async function loadState(){
  const local=(()=>{try{return JSON.parse(localStorage.getItem(KEY()))||null}catch{return null}})();
  let remote=null, remoteSession=undefined;
  try{const r=await fetch(API(),{credentials:'same-origin'});if(r.status===401){location.href='/sign-in?next=/kana';return}if(r.ok){const j=await r.json();remote=j.state;remoteSession=j.session;ONLINE=true}}catch{ONLINE=false}
  // the account wins; a local mirror is only used when the account has nothing yet (first login on a device that studied offline)
  const base=remote&&Object.keys(remote).length?remote:(local||{});
  S=Object.assign({k:{},w:{},xp:0,days:{},sound:null,voice:null},base);
  if(remoteSession!==undefined){try{remoteSession?localStorage.setItem(SKEY(),JSON.stringify(remoteSession)):localStorage.removeItem(SKEY())}catch{}}
  if(!remote&&local)save();
}
const today=()=>new Date().toISOString().slice(0,10);
const kc=k=>S.k[k]||(S.k[k]={ok:0,no:0,lvl:0});
const learned=()=>ORDER.filter(k=>S.k[k]);
const lvl=k=>S.k[k]?S.k[k].lvl:0;
// 하루에 최대 2단계만 오른다 — 금색(5)은 최소 사흘에 걸친 반복이 필요
function grade(k,ok){const c=kc(k);const t=today();if(c.day!==t){c.day=t;c.base=c.lvl}if(ok){c.ok++;if(c.lvl<Math.min(5,c.base+2))c.lvl++}else{c.no++;c.lvl=Math.max(0,c.lvl-1);c.base=Math.min(c.base,c.lvl)}}
function gradeWord(w,ok){const c=S.w[w]||(S.w[w]={ok:0,no:0});ok?c.ok++:c.no++;for(const k of wordKana(w))grade(k,ok)}
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=(a,n)=>shuffle(a).slice(0,n);
const weighted=(arr,wf)=>{const w=arr.map(wf);let r=Math.random()*w.reduce((a,b)=>a+b,0),i=0;while((r-=w[i])>0&&i<arr.length-1)i++;return arr[i]};
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),1600)}

// ================= sound, voice, haptics =================
let AC=null, voice=null, soundOn=false;
const SND={ok:new Audio('sounds/correct.wav'),no:new Audio('sounds/incorrect.wav'),done:new Audio('sounds/finish.mp3')};
// Apple ships novelty voices (Eddy, Grandma, Rocko…) under every language; they sound unsettling for study, so they are hidden.
const NOVELTY=/^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Eddy|Flo|Fred|Good News|Grandma|Grandpa|Jester|Junior|Kathy|Organ|Ralph|Reed|Rocko|Sandy|Shelley|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/i;
function voicesFor(){const lang=(COURSE?.lang||'').toLowerCase(),base=lang.split('-')[0];const hint=COURSE?.voiceHint?new RegExp(COURSE.voiceHint,'i'):null;
  return speechSynthesis.getVoices().filter(v=>v.lang.replace('_','-').toLowerCase().startsWith(base)&&!NOVELTY.test(v.name))
    .sort((a,b)=>(hint&&hint.test(b.name))-(hint&&hint.test(a.name))||(/premium|enhanced/i.test(b.name))-(/premium|enhanced/i.test(a.name)))}
function pickVoice(){const vs=voicesFor();if(!vs.length)return voice=null;
  if(S?.voice&&S.voice!=='__file'){const v=vs.find(v=>v.name===S.voice);if(v)return voice=v}
  const hint=COURSE?.voiceHint?new RegExp(COURSE.voiceHint,'i'):null;
  return voice=vs.find(v=>hint&&hint.test(v.name)&&/premium|enhanced|고급|향상/i.test(v.name))||vs.find(v=>hint&&hint.test(v.name))||vs[0]}
try{speechSynthesis.onvoiceschanged=()=>{pickVoice();if($('#perm').classList.contains('on'))renderVoices()}}catch{}
function unlockAudio(){
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();AC.resume()}catch{}
  for(const a of Object.values(SND)){try{a.volume=0;a.play().then(()=>{a.pause();a.currentTime=0;a.volume=1}).catch(()=>{a.volume=1})}catch{}}
  // iOS unlocks <audio> per element: prime the first clips too
  if(AUDIO){for(const t of Object.keys(AUDIO).slice(0,0)){}}
  try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}catch{}
}
const clipCache={};
function clip(t){if(!AUDIO||!AUDIO[t])return null;return clipCache[t]||(clipCache[t]=new Audio(AUDIO_DIR+AUDIO[t]))}
let curClip=null;
function speak(t,force){if(!soundOn&&!force)return;
  const a=(!S?.voice||S.voice==='__file')&&clip(t);
  if(a){try{if(curClip){curClip.pause()}speechSynthesis.cancel();curClip=a;a.currentTime=0;a.play().catch(()=>{})}catch{}return}
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=COURSE.lang;u.rate=.9;u.pitch=1.05;const v=voice||pickVoice();if(v)u.voice=v;setTimeout(()=>speechSynthesis.speak(u),40)}catch{}}
function tone(seq,type='sine',vol=.18){if(!soundOn||!AC)return;try{const t0=AC.currentTime;seq.forEach(([f0,f1,dt,dur])=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0+dt);o.frequency.exponentialRampToValueAtTime(f1,t0+dt+dur);g.gain.setValueAtTime(0,t0+dt);g.gain.linearRampToValueAtTime(vol,t0+dt+.008);g.gain.exponentialRampToValueAtTime(.001,t0+dt+dur);o.connect(g).connect(AC.destination);o.start(t0+dt);o.stop(t0+dt+dur+.05)})}catch{}}
const play=a=>{if(!soundOn)return;try{a.currentTime=0;a.play().catch(()=>{})}catch{}};
const sfx={
  tap:()=>tone([[520,1040,0,.07],[1500,1900,.06,.05]],'sine',.12),   // "뽀빙"
  pop:()=>tone([[300,900,0,.06]],'triangle',.1),
  ok:()=>play(SND.ok), no:()=>play(SND.no), done:()=>play(SND.done),
};
function haptic(kind){
  try{navigator.vibrate&&navigator.vibrate(kind==='tap'?8:kind==='ok'?14:kind==='no'?[24,40,24]:[10,30,10,30,30])}catch{}
  try{const h=$('#hapt');if(h)h.click()}catch{}
}
function renderVoices(){const vs=voicesFor();const w=$('#voice-wrap');const rec=AUDIO?[{name:'__file',label:COURSE.audioLabel||'녹음된 음성 (추천)',sub:'신경망 TTS로 미리 렌더링'}]:[];
  if(!vs.length&&!rec.length){w.style.display='none';return}w.style.display='';
  const cur=S.voice||(AUDIO?'__file':voice?.name);
  $('#voices').innerHTML=[...rec,...vs.map(v=>({name:v.name,label:v.name,sub:v.lang+(v.localService?'':' · 온라인')}))].map(v=>`<button class="voice ${cur===v.name?'on':''}" data-v="${v.name}"><span><b>${v.label}</b><span>${v.sub}</span></span><span>▶</span></button>`).join('');
  $('#voices').onclick=e=>{const b=e.target.closest('.voice');if(!b)return;S.voice=b.dataset.v;save();pickVoice();$$('.voice').forEach(x=>x.classList.toggle('on',x===b));unlockAudio();speak(COURSE.words[Math.floor(Math.random()*Math.min(8,COURSE.words.length))].t,true)}}
function askPerm(cb){$('#perm').classList.add('on');$('#perm-note').textContent=('speechSynthesis' in window)?'':'이 브라우저는 음성 합성을 지원하지 않아요. 효과음만 나옵니다.';
  renderVoices();
  $('#perm-ok').onclick=()=>{unlockAudio();soundOn=true;S.sound=true;save();$('#perm').classList.remove('on');haptic('ok');setTimeout(()=>{sfx.ok();if(!pickVoice())toast('이 언어 음성이 없어 효과음만 나와요')},150);cb&&cb()};
  $('#perm-no').onclick=()=>{soundOn=false;S.sound=false;save();$('#perm').classList.remove('on');cb&&cb()};}
$('#snd-reset').addEventListener('click',()=>{soundOn=true;askPerm()});

// ================= speech recognition =================
const SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
const norm=s=>(s||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s。、．，.!?！？ー]/g,'').toLowerCase();
function similar(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b||a.includes(b)||b.includes(a))return 1;const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return 1-d[m][n]/Math.max(m,n)}

// ================= home =================
function savedSession(){try{const s=JSON.parse(localStorage.getItem(SKEY()));return s&&s.si<s.steps.length?s:null}catch{return null}}
function renderHome(){
  let streak=0;for(let i=0;;i++){const d=new Date();d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);if(S.days[k])streak++;else if(i===0)continue;else break}
  const L=learned();
  $('#h-streak').textContent=streak;$('#h-xp').textContent=S.xp;$('#h-known').textContent=L.filter(k=>lvl(k)>=3).length;
  const nxt=ORDER.filter(k=>!S.k[k]).slice(0,3); const ss=savedSession();
  $('#bubble').textContent=ss?'Continue':'Start';
  $('#ring').style.setProperty('--p',ss?Math.round(ss.si/ss.steps.length*100):0);
  $('#start-sub').textContent=ss?`${ss.si} / ${ss.steps.length} 진행 중`:L.length===0?`첫 글자 ${ORDER.slice(0,3).join(' ')}부터`:nxt.length?`복습 + 새 글자 ${nxt.join(' ')}`:'전체 복습';
  const cell=k=>k?`<div class="cell ${S.k[k]?'':'new'} ${lvl(k)>=5?'gold':''}"><i style="height:${lvl(k)/5*100}%"></i><span class="k kana">${k}</span><span class="r">${rom(k)}</span></div>`:'<div class="cell empty"></div>';
  const pct=list=>Math.round(list.reduce((a,k)=>a+lvl(k),0)/(list.length*5)*100)+'%';
  $('#sets').innerHTML=SETS.map(st=>{const all=[...st.grid.flat().filter(Boolean),...(st.extra||[])];return `<div class="section-t">${st.title} <span>${pct(all)}</span></div><div class="chart" style="grid-template-columns:repeat(${st.grid[0].length},1fr)">${st.grid.map(r=>r.map(cell).join('')).join('')}${(st.extra||[]).map(cell).join('')}</div>`}).join('');
  const Ls=new Set(L); const avail=WORDS.filter(([w])=>wordKana(w).every(k=>Ls.has(k)));
  const rows=[...avail.map(x=>[x,false]),...WORDS.filter(x=>!avail.includes(x)).slice(0,6).map(x=>[x,true])];
  $('#wordlist').innerHTML=rows.map(([[w,m],lock])=>{const c=S.w[w];const p=c?Math.min(100,c.ok*25):0;return `<div class="word ${lock?'locked':''}"><span class="w kana">${w}</span><span class="m">${m}</span><span class="bar"><i style="width:${p}%"></i></span></div>`}).join('');
  $('#w-pct').textContent=`${avail.length} / ${WORDS.length}`;
}

// ================= session engine =================
let steps=[],si=0,checkFn=null,state='idle',score={ok:0,no:0},combo=0,newK=[];
function buildSession(){
  const L=learned(); const Ls=new Set(L);
  const recent=L.slice(-4); const settled=recent.every(k=>lvl(k)>=2);
  const n=L.length===0?3:(!settled?0:L.length<10?3:2);
  newK=ORDER.filter(k=>!S.k[k]).slice(0,n); newK.forEach(k=>Ls.add(k));
  const active=[...Ls];
  const weak=L.filter(k=>!newK.includes(k)).sort((a,b)=>lvl(a)-lvl(b)||Math.random()-.5);
  const focus=[...newK,...weak.slice(0,Math.max(0,5-newK.length))].slice(0,5);
  const dist=(k,m)=>pick(active.filter(x=>x!==k),m);
  const words=WORDS.filter(([w])=>wordKana(w).every(k=>Ls.has(k)));
  const fw=words.filter(([w])=>wordKana(w).some(k=>focus.includes(k)));
  const sw=pick(fw.length>=3?fw:[...fw,...pick(words.filter(x=>!fw.includes(x)),3-fw.length)],3);
  const st=[];
  for(const k of newK){st.push({t:'intro',k});st.push({t:'trace',k})}
  const wordEx=(w,i)=>[{t:'build',w:w[0],m:w[1],extra:pick(active.filter(k=>!tok(w[0]).includes(k)),3)},{t:'word-mean',w:w[0],m:w[1],opts:pick(words.filter(x=>x!==w),3).map(x=>x[1])},{t:SR&&soundOn?'speak':'build',w:w[0],m:w[1],extra:pick(active.filter(k=>!tok(w[0]).includes(k)),3)},{t:'trace-word',w:w[0],m:w[1]}][i];
  const forms=[['choose-kana','listen'],['listen','choose-rom'],['choose-rom','choose-kana'],['listen','choose-kana']];
  for(let r=0;r<4;r++){
    let round=shuffle(focus).map(k=>{const t=forms[r][Math.random()<.6?0:1];return {t,k,opts:dist(k,3)}});
    if(r>=1)round=round.concat(sw.map(w=>wordEx(w,r-1)).filter(Boolean));
    round=shuffle(round);
    if(r===1||r===3)round.push({t:'match',ks:[...focus.slice(0,4),...dist(focus[0],Math.max(0,4-focus.length))]});
    st.push(...round);
  }
  const old=L.filter(k=>!focus.includes(k)&&lvl(k)<5); if(old.length){const k=weighted(old,k=>6-lvl(k));st.splice(6,0,{t:'choose-rom',k,opts:dist(k,3)})}
  return st.filter((s,i)=>!(i&&s.t===st[i-1].t&&s.k&&s.k===st[i-1].k));
}
let persistT=null;
function persist(){const doc={steps,si,score,combo,newK,ts:Date.now()};try{localStorage.setItem(SKEY(),JSON.stringify(doc))}catch{}clearTimeout(persistT);persistT=setTimeout(()=>apiPut({session:doc}),300)}
function clearPersist(){try{localStorage.removeItem(SKEY())}catch{}clearTimeout(persistT);apiPut({session:null})}
function startSession(){
  const ss=savedSession();
  if(ss){({steps,si,score,combo,newK}=ss);newK=newK||[]}else{steps=buildSession();si=0;score={ok:0,no:0};combo=0}
  $('#lesson').classList.add('on');$('#stage').innerHTML='';$('#l-combo').textContent=combo>=2?`🔥${combo}`:'';renderStep();persist();
}
$('#start').addEventListener('click',()=>{sfx.tap();if(S.sound===null)askPerm(startSession);else{if(S.sound){soundOn=true;unlockAudio()}startSession()}});
$('#l-x').addEventListener('click',()=>{persist();save();state='idle';$('#lesson').classList.remove('on');renderHome();toast('저장했어요. 이어서 할 수 있어요')});
function setFoot(mode,label,verdict=''){const f=$('#l-foot');f.className='foot'+(mode?' '+mode:'');const b=$('#l-btn');b.textContent=label;b.className='btn lg '+(mode==='no'?'danger':'secondary');$('#l-verdict').innerHTML=verdict}
function lock(v){const b=$('#l-btn');b.disabled=v}
function renderStep(){
  if(si>=steps.length)return finish();
  const s=steps[si]; state='answer'; checkFn=null;
  $('#l-meter').style.width=(si/steps.length*100)+'%';
  setFoot('','확인'); lock(true);
  const old=$('.step',$('#stage')); if(old){old.classList.remove('in');old.classList.add('out');setTimeout(()=>old.remove(),200)}
  const b=document.createElement('div'); b.className='step in'; $('#stage').appendChild(b);
  ({intro,trace,'choose-kana':chooseKana,'choose-rom':chooseRom,listen,match,build,'word-mean':wordMean,'trace-word':traceWord,speak:speakEx})[s.t](s,b);
}
function advance(){si++;persist();renderStep()}
function wave(el,cls){const w=document.createElement('span');w.className='wave';el.appendChild(w);setTimeout(()=>w.remove(),600)}
function onResult(r){
  const s=steps[si]; lock(false);
  if(r===true){state='next';score.ok++;combo++;const c=$('#l-combo');c.textContent=combo>=2?`🔥${combo}`:'';c.classList.add('bump');setTimeout(()=>c.classList.remove('bump'),250);
    sfx.ok();haptic('ok');flyXP();setFoot('ok','계속',`<span class="ci">✓</span>잘했어요!${combo>=3?` <small>${combo}연속</small>`:''}`);wave($('#l-foot'))}
  else if(r===false){state='next';score.no++;combo=0;$('#l-combo').textContent='';sfx.no();haptic('no');setFoot('no','계속',`<span class="ci">✕</span>정답 <small>${s.sol||''}</small>`);
    steps.splice(Math.min(steps.length,si+2+Math.floor(Math.random()*3)),0,{...s,retry:true})}
  else {state='next';setFoot('','다음')}
  save();persist();
}
$('#l-btn').addEventListener('click',e=>{
  const b=e.currentTarget; if(b.disabled)return; sfx.tap();wave(b);
  if(state==='home'){state='idle';clearPersist();renderHome();startSession();return}
  if(state==='answer'){onResult(checkFn?checkFn():null);return}
  advance();
});
function flyXP(){const e=document.createElement('div');e.className='fly';e.textContent='+1';const r=$('#l-combo').getBoundingClientRect();e.style.left=(r.left-10)+'px';e.style.top=(r.top+8)+'px';document.body.appendChild(e);setTimeout(()=>e.remove(),900)}
// select → 확인 (Duolingo flow). Selecting only highlights; the footer button commits.
const optHandler=(b,getSel)=>b.addEventListener('click',e=>{const o=e.target.closest('.opt');if(!o||state!=='answer')return;$$('.opt',b).forEach(x=>x.classList.remove('sel'));o.classList.add('sel');sfx.pop();getSel(o.dataset.v);lock(false)});
function markOpts(b,answer,sel){$$('.opt',b).forEach(x=>{if(x.dataset.v===answer){x.classList.remove('sel');x.classList.add('ok');wave(x)}else if(x.dataset.v===sel){x.classList.remove('sel');x.classList.add('no')}else x.classList.add('dim')})}

// ---- exercises ----
function intro(s,b){
  const ex=WORDS.find(([w])=>wordKana(w).includes(s.k)&&wordKana(w).every(k=>S.k[k]||newK.includes(k)));
  b.innerHTML=`<div class="prompt">새 글자</div><div class="hero"><div class="glyph kana">${s.k}</div><div class="romaji">${rom(s.k)}</div><button class="spk" data-say="${s.k}">🔊</button></div>
  ${ex?`<div style="text-align:center;margin-top:10px"><div class="wordline kana">${tok(ex[0]).map(k=>k===s.k?`<span class="hi">${k}</span>`:k).join('')}</div><div class="meaning">${ex[1]} · ${tok(ex[0]).map(rom).join(' ')}</div></div>`:''}
  <p class="tiny" style="text-align:center;margin-top:14px">듣고 따라 말해보세요</p>`;
  setTimeout(()=>speak(s.k),250); if(ex)setTimeout(()=>speak(ex[0]),1500);
  lock(false); setFoot('','다음'); state='next'; checkFn=null;
}
function trace(s,b,word){
  const target=word||s.k;
  b.innerHTML=`<div class="prompt">${word?'단어를 써보세요':'따라 써보세요'}</div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span class="romaji">${word?tok(word).map(rom).join(' '):rom(target)}</span><button class="spk" data-say="${target}">🔊</button></div>
  <canvas class="pad ${word?'wide':''}"></canvas>
  <div class="padrow"><button class="btn" data-a="clear">지우기</button><button class="btn primaryOutline" data-a="ghost">본보기 숨기기</button></div>
  <p class="tiny" style="text-align:center;margin-top:10px">본보기 없이도 써지면 확인. 획 인식은 없어요, 솔직하게.</p>`;
  const cv=$('canvas',b); let ghost=true; const dpr=devicePixelRatio||1; const strokes=[]; let cur=null;
  function draw(){const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);const W=cv.width/dpr,H=cv.height/dpr;c.clearRect(0,0,W,H);
    c.strokeStyle='rgba(128,128,128,.18)';c.lineWidth=1;c.setLineDash([6,6]);c.beginPath();c.moveTo(W/2,0);c.lineTo(W/2,H);c.moveTo(0,H/2);c.lineTo(W,H/2);c.stroke();c.setLineDash([]);
    if(ghost){c.fillStyle='rgba(128,128,128,.22)';c.textAlign='center';c.textBaseline='middle';c.font=`${word?Math.min(H*.7,W/(target.length+.5)):H*.72}px system-ui,"Hiragino Sans","Noto Sans JP","Apple SD Gothic Neo",sans-serif`;c.fillText(target,W/2,H/2+(word?0:H*.04))}
    c.strokeStyle=getComputedStyle(document.body).color;c.lineWidth=Math.max(6,W/28);c.lineCap='round';c.lineJoin='round';
    for(const st of [...strokes,cur].filter(Boolean)){c.beginPath();st.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}}
  const fit=()=>{const r=cv.getBoundingClientRect();if(!r.width)return requestAnimationFrame(fit);cv.width=r.width*dpr;cv.height=r.height*dpr;draw()};
  const pt=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
  cv.addEventListener('pointerdown',e=>{try{cv.setPointerCapture(e.pointerId)}catch{}cur=[pt(e)];draw();e.preventDefault()});
  cv.addEventListener('pointermove',e=>{if(!cur)return;cur.push(pt(e));draw()});
  const up=()=>{if(cur){strokes.push(cur);cur=null;draw();if(state==='answer'){state='next';setFoot('','다음');if(word)gradeWord(word,true)}lock(false)}};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  b.addEventListener('click',e=>{const a=e.target.dataset.a;if(a==='clear'){strokes.length=0;draw()}if(a==='ghost'){ghost=!ghost;e.target.textContent='본보기 '+(ghost?'숨기기':'보기');draw()}if(a)sfx.pop()});
  requestAnimationFrame(fit); setTimeout(()=>speak(target),300); checkFn=()=>null;
}
function chooseKana(s,b){const opts=shuffle([s.k,...s.opts]);let sel=null;
  b.innerHTML=`<div class="prompt">이 소리는 어떤 글자?</div><div class="hero" style="padding-top:0"><div class="romaji" style="font-size:44px">${rom(s.k)}</div></div>
  <div class="opts">${opts.map(o=>`<button class="opt" data-v="${o}"><div class="kana">${o}</div></button>`).join('')}</div>`;
  optHandler(b,v=>sel=v); s.sol=`${s.k}`; checkFn=()=>{const ok=sel===s.k;markOpts(b,s.k,sel);speak(s.k);grade(s.k,ok);return ok};}
function chooseRom(s,b){const opts=shuffle([s.k,...s.opts]);let sel=null;
  b.innerHTML=`<div class="prompt">어떻게 읽어요?</div><div class="hero" style="padding-top:0"><div class="glyph kana" style="font-size:100px">${s.k}</div></div>
  <div class="opts">${opts.map(o=>`<button class="opt" data-v="${o}"><span class="romaji" style="font-size:22px">${rom(o)}</span></button>`).join('')}</div>`;
  optHandler(b,v=>sel=v); s.sol=`${rom(s.k)}`; checkFn=()=>{const ok=sel===s.k;markOpts(b,s.k,sel);speak(s.k);grade(s.k,ok);return ok};}
function listen(s,b){if(!soundOn)return chooseKana(s,b);const opts=shuffle([s.k,...s.opts]);let sel=null;
  b.innerHTML=`<div class="prompt">들리는 글자를 고르세요</div><div class="hero"><button class="spk big playing" data-say="${s.k}">🔊</button></div>
  <div class="opts">${opts.map(o=>`<button class="opt" data-v="${o}"><div class="kana">${o}</div></button>`).join('')}</div>`;
  setTimeout(()=>speak(s.k),300); setTimeout(()=>$('.spk',b)?.classList.remove('playing'),1500);
  optHandler(b,v=>sel=v); s.sol=`${s.k} (${rom(s.k)})`; checkFn=()=>{const ok=sel===s.k;markOpts(b,s.k,sel);grade(s.k,ok);return ok};}
function match(s,b){const left=shuffle(s.ks),right=shuffle(s.ks);let a=null,pairs=0,wrong=0;
  b.innerHTML=`<div class="prompt">짝을 맞추세요</div><div class="match"><div class="col">${left.map(k=>`<button class="opt" data-side="l" data-v="${k}"><div class="kana">${k}</div></button>`).join('')}</div><div class="col">${right.map(k=>`<button class="opt" data-side="r" data-v="${k}"><span class="romaji" style="font-size:20px">${rom(k)}</span></button>`).join('')}</div></div>`;
  b.addEventListener('click',e=>{const o=e.target.closest('.opt');if(!o||o.classList.contains('dim')||state!=='answer')return;sfx.pop();
    if(a&&a.dataset.side===o.dataset.side){a.classList.remove('sel');a=o;o.classList.add('sel');return}
    if(!a){a=o;o.classList.add('sel');return}
    if(a.dataset.v===o.dataset.v){a.classList.remove('sel');[a,o].forEach(x=>{x.classList.add('ok');wave(x);setTimeout(()=>x.classList.add('dim'),350)});speak(o.dataset.v);tone([[700,1400,0,.08]],'sine',.1);haptic('ok');grade(o.dataset.v,true);pairs++;a=null;
      if(pairs===s.ks.length){checkFn=()=>wrong===0?true:null;setTimeout(()=>onResult(checkFn()),300)}}
    else{wrong++;grade(o.dataset.v,false);tone([[200,150,0,.15]],'triangle',.15);o.classList.add('no');a.classList.add('no');haptic('no');const aa=a;setTimeout(()=>{o.classList.remove('no');aa.classList.remove('no','sel')},400);a=null}});
  s.sol='';}
function build(s,b){const parts=tok(s.w);const bank=shuffle([...parts,...s.extra]);const chosen=[];
  b.innerHTML=`<div class="prompt">단어를 만드세요</div><div style="text-align:center"><span class="romaji" style="font-size:30px">${tok(s.w).map(rom).join(' ')}</span><div class="meaning">${s.m}</div><button class="spk" data-say="${s.w}" style="margin-top:6px">🔊</button></div>
  <div class="slots"></div><div class="bank">${bank.map((k,i)=>`<button class="tile kana" data-i="${i}" data-v="${k}">${k}</button>`).join('')}</div>`;
  const slots=$('.slots',b),bk=$('.bank',b);
  const render=()=>{slots.innerHTML=chosen.map(c=>`<button class="tile kana" data-i="${c.i}">${c.v}</button>`).join('');$$('.tile',bk).forEach(t=>t.classList.toggle('used',chosen.some(c=>c.i==t.dataset.i)));lock(!chosen.length)};
  bk.addEventListener('click',e=>{const t=e.target.closest('.tile');if(!t||state!=='answer')return;sfx.pop();chosen.push({i:+t.dataset.i,v:t.dataset.v});render()});
  slots.addEventListener('click',e=>{const t=e.target.closest('.tile');if(!t||state!=='answer')return;sfx.pop();chosen.splice(chosen.findIndex(c=>c.i==t.dataset.i),1);render()});
  setTimeout(()=>speak(s.w),300);
  s.sol=`${s.w}`; checkFn=()=>{const ok=chosen.map(c=>c.v).join('')===s.w;speak(s.w);slots.style.borderColor=ok?'var(--green)':'var(--rose)';gradeWord(s.w,ok);return ok};}
function wordMean(s,b){const opts=shuffle([s.m,...s.opts]);let sel=null;
  b.innerHTML=`<div class="prompt">무슨 뜻일까요?</div><div class="hero" style="padding-top:0"><div class="wordline kana" style="font-size:64px">${s.w}</div><button class="spk" data-say="${s.w}">🔊</button></div>
  <div class="opts">${opts.map(o=>`<button class="opt" data-v="${o}"><span style="font-size:18px;font-weight:700">${o}</span></button>`).join('')}</div>`;
  setTimeout(()=>speak(s.w),300);
  optHandler(b,v=>sel=v); s.sol=`${s.w} = ${s.m} (${tok(s.w).map(rom).join(' ')})`; checkFn=()=>{const ok=sel===s.m;markOpts(b,s.m,sel);gradeWord(s.w,ok);return ok};}
function traceWord(s,b){trace(s,b,s.w);b.insertAdjacentHTML('afterbegin',`<div class="wordline kana">${s.w}</div><div class="meaning" style="text-align:center;margin-bottom:8px">${s.m}</div>`)}
function speakEx(s,b){
  b.innerHTML=`<div class="prompt">따라 읽어보세요</div><div class="hero" style="padding-top:0"><div class="wordline kana" style="font-size:64px">${s.w}</div><div class="romaji">${tok(s.w).map(rom).join(' ')}</div><div class="meaning">${s.m}</div><button class="spk" data-say="${s.w}">🔊</button></div>
  <button class="mic" id="mic">🎙 눌러서 말하기</button><div class="heard" id="heard"></div>
  <p class="tiny" style="text-align:center;margin-top:8px">인식이 안 되면 건너뛰어도 돼요.</p>`;
  setTimeout(()=>speak(s.w),300);
  let rec=null,heard='',best=0,tries=0;
  const mic=$('#mic',b),out=$('#heard',b);
  const skip=()=>{lock(false);$('#l-btn').textContent='건너뛰기';checkFn=()=>null};
  setTimeout(skip,4000);
  mic.addEventListener('click',()=>{
    if(rec){rec.stop();return}
    try{rec=new SR();rec.lang=COURSE.lang;rec.maxAlternatives=5;rec.interimResults=true;rec.continuous=false;
      speechSynthesis.cancel();
      rec.onstart=()=>{mic.classList.add('listening');mic.textContent='듣는 중… 다시 누르면 멈춰요';out.textContent=''};
      rec.onresult=e=>{const alts=[...e.results].flatMap(r=>[...r].map(a=>a.transcript));heard=alts[0]||'';best=Math.max(...alts.map(a=>similar(a,s.w)),0);out.textContent=heard;
        if(e.results[e.results.length-1].isFinal){finalize()}};
      rec.onerror=e=>{mic.classList.remove('listening');mic.textContent='🎙 다시 말하기';out.textContent=e.error==='not-allowed'?'마이크 권한이 필요해요':e.error==='no-speech'?'소리가 안 들렸어요':'인식 오류: '+e.error;rec=null;skip()};
      rec.onend=()=>{mic.classList.remove('listening');if(mic.textContent.startsWith('듣는'))mic.textContent='🎙 다시 말하기';rec=null};
      rec.start();sfx.pop();haptic('tap')}catch(err){out.textContent='이 브라우저는 음성 인식을 지원하지 않아요';skip()}
  });
  function finalize(){tries++;const hasKanji=/[一-龯]/.test(heard);const ok=best>=.6||(hasKanji&&heard.length<=s.w.length+1);
    mic.textContent=ok?'🎙 잘했어요':'🎙 다시 말하기';out.textContent=heard+(ok?' ✓':'');
    lock(false);$('#l-btn').textContent='확인';
    checkFn=()=>{gradeWord(s.w,ok);s.sol=`${s.w} · 들린 말: ${heard||'없음'}`;return ok?true:(tries>=2?false:null)};
    if(!ok&&tries<2){out.textContent=heard+' · 한 번 더?'}}
}
document.addEventListener('click',e=>{const k=e.target.closest('.spk');if(k){sfx.pop();speak(k.dataset.say)}});

// ================= finish =================
function finish(){
  const total=score.ok+score.no,pct=total?Math.round(score.ok/total*100):100,xp=10+Math.round(pct/10)+newK.length*2;
  S.xp+=xp;pendingXP+=xp;S.days[today()]=(S.days[today()]||0)+1;save();clearPersist();apiPut({sessionComplete:true});
  let streak=0;for(let i=0;;i++){const d=new Date();d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);if(S.days[k])streak++;else break}
  $('#l-meter').style.width='100%';sfx.done();haptic('done');confetti();
  const b=document.createElement('div');b.className='step in';$('#stage').innerHTML='';$('#stage').appendChild(b);
  b.innerHTML=`<div class="done-hero"><div class="big">${pct>=90?'🎉':pct>=70?'👍':'💪'}</div><h2 style="margin:12px 0 4px;font-size:24px">${pct>=90?'완벽해요!':pct>=70?'잘했어요!':'끝까지 왔어요!'}</h2>
  ${newK.length?`<div class="tiny" style="margin-top:10px">오늘 새로 배운 글자</div><div class="newk kana">${newK.map(k=>`<span>${k}</span>`).join('')}</div>`:''}
  <div class="result"><div class="rcard xp"><div class="h">Total XP</div><div class="v">⚡️ ${xp}</div></div><div class="rcard acc"><div class="h">정확도</div><div class="v">${pct}%</div></div><div class="rcard streak"><div class="h">연속일</div><div class="v">🔥 ${streak}</div></div></div>
  <p class="tiny" style="margin-top:16px">${pct<75?'한 세션 더 하면 새 글자 대신 복습이 나와요. 그게 맞아요.':'좋아요. 한 세션 더 하면 다음 글자가 열립니다.'}</p></div>`;
  setFoot('','계속'); lock(false); state='home';
}
function confetti(){const cv=$('#confetti');const c=cv.getContext('2d');cv.width=innerWidth*devicePixelRatio;cv.height=innerHeight*devicePixelRatio;c.scale(devicePixelRatio,devicePixelRatio);
  const cols=['#ffc800','#1cb0f6','#58cc02','#ff4b4b','#ff9600','#ce82ff'];const P=Array.from({length:140},()=>({x:innerWidth/2+(Math.random()-.5)*120,y:innerHeight*.45,vx:(Math.random()-.5)*14,vy:-Math.random()*16-6,r:Math.random()*6+3,c:cols[Math.random()*cols.length|0],a:Math.random()*6,va:(Math.random()-.5)*.4}));
  let t=0;(function f(){c.clearRect(0,0,innerWidth,innerHeight);for(const p of P){p.vy+=.45;p.x+=p.vx;p.y+=p.vy;p.vx*=.99;p.a+=p.va;c.save();c.translate(p.x,p.y);c.rotate(p.a);c.fillStyle=p.c;c.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);c.restore()}if(t++<120)requestAnimationFrame(f);else c.clearRect(0,0,innerWidth,innerHeight)})()}

// ================= press feel =================
// iOS Safari applies :active to touches unreliably, so the pressed state is driven by pointer events instead.
const PRESSABLE='.btn,.opt,.tile,.spk,.mic,.start,.voice';
document.addEventListener('pointerdown',e=>{const el=e.target.closest(PRESSABLE);if(!el||el.disabled)return;el.classList.add('pressed');haptic('tap')},{passive:true});
const unpress=()=>$$('.pressed').forEach(el=>el.classList.remove('pressed'));
for(const ev of ['pointerup','pointercancel'])document.addEventListener(ev,unpress,{passive:true});
document.addEventListener('touchstart',()=>{},{passive:true});

// ================= boot =================
(async()=>{const id=new URLSearchParams(location.search).get('course')||'ja-kana';await loadCourse(id);await loadState();if(!S)return;if(S.sound===true)soundOn=true;pickVoice();renderHome()})();
