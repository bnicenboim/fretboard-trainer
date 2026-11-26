'use strict';
/* The version shown at the bottom of the page. Changes are listed in CHANGELOG.md. */
const VERSION='1.0.0';
/* ---------- music data ---------- */
const OPEN=[64,59,55,50,45,40], SNAME=['e','B','G','D','A','E'], SLAB=['E4','B3','G3','D3','A2','E2'];
const LET='CDEFGAB', LPC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const NATS=['C','D','E','F','G','A','B'];
const D7=[0,1,2,3,4,5,6];
const SCALES={
  major:{l:'Major',iv:[0,2,4,5,7,9,11],dg:D7},
  minor:{l:'Natural minor',iv:[0,2,3,5,7,8,10],dg:D7},
  harmonic:{l:'Harmonic minor',iv:[0,2,3,5,7,8,11],dg:D7},
  melodic:{l:'Melodic minor',iv:[0,2,3,5,7,9,11],dg:D7},
  dorian:{l:'Dorian',iv:[0,2,3,5,7,9,10],dg:D7},
  mixolydian:{l:'Mixolydian',iv:[0,2,4,5,7,9,10],dg:D7},
  majpent:{l:'Major pentatonic',iv:[0,2,4,7,9],dg:[0,1,2,4,5]},
  minpent:{l:'Minor pentatonic',iv:[0,3,5,7,10],dg:[0,2,3,4,6]}
};
const TONICS=['C','C#','Db','D','Eb','E','F','F#','Gb','G','Ab','A','Bb','B'];
const mod12=n=>((n%12)+12)%12;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function nm(n){let a=0;for(const ch of n.slice(1))a+=ch==='#'?1:-1;return{L:n[0],a,pc:mod12(LPC[n[0]]+a)}}
function pretty(n){const{L,a}=nm(n);return L+(a===2?'𝄪':a===-2?'𝄫':a===1?'♯':a===-1?'♭':'')}
function withOct(n,midi){const{a}=nm(n);return pretty(n)+(Math.floor((midi-a)/12)-1)}
function ord(n){return n+(n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th')}

/* ---------- settings ---------- */
const DEF={maxFret:22,sel:null,poolMode:'types',nat:true,sharp:false,flat:false,
  tonic:'G',scale:'major',custom:['C','F','G'],mode:'find',target:'any',nearDir:'any',ans_find:'mic',ans_name:'mic',ans_ear:'mic',ans_near:'mic',pause:'3',
  octaveStrict:true,timing:'free',bpm:50,beats:4,showNotes:'off',sens:0.012};
function allCells(M){const o=[];for(let s=0;s<6;s++)for(let f=0;f<=M;f++)o.push(s+'-'+f);return o}
const S=Object.assign({},DEF,load());
if(!['find','name','near','ear'].includes(S.mode))S.mode=DEF.mode;if(!SCALES[S.scale])S.scale=DEF.scale;if(!Array.isArray(S.custom))S.custom=DEF.custom.slice();if(!TONICS.includes(S.tonic))S.tonic=DEF.tonic;if(!['types','scale','custom'].includes(S.poolMode))S.poolMode='types';if(!S.sel||!Array.isArray(S.sel))S.sel=allCells(S.maxFret);const SEL=new Set(S.sel);
function syncSel(){S.sel=[...SEL]}
function load(){try{return JSON.parse(localStorage.getItem('fretTrainer.v3'))||{}}catch(e){return{}}}
function save(){try{localStorage.setItem('fretTrainer.v3',JSON.stringify(S))}catch(e){}}
const answerBy=()=>S['ans_'+S.mode];

function poolNames(){
  if(S.poolMode==='custom')return S.custom.slice();
  if(S.poolMode==='scale'){
    const t=nm(S.tonic),sc=SCALES[S.scale],li=LET.indexOf(t.L);
    return sc.iv.map((iv,i)=>{const L=LET[(li+sc.dg[i])%7];let a=mod12(t.pc+iv-LPC[L]);if(a>6)a-=12;
      return L+(a>0?'#'.repeat(a):'b'.repeat(-a))});
  }
  const o=[];if(S.nat)o.push(...NATS);if(S.sharp)o.push(...SHARP.filter(n=>n.length>1));if(S.flat)o.push(...FLAT.filter(n=>n.length>1));
  return o;
}
function ascName(pc){const p=poolNames().find(n=>nm(n).pc===pc);return p||((S.flat&&!S.sharp)?FLAT:SHARP)[pc]}
function pcName(pc){const all=poolNames().filter(n=>nm(n).pc===pc);return all.length>1?[...new Set(all.map(pretty))].join('/'):pretty(ascName(pc))}
function octOf(midi){return Math.floor(midi/12)-1}
function inRegion(s,f){return f<=S.maxFret&&SEL.has(s+'-'+f)}
function isWhole(){for(let s=0;s<6;s++)for(let f=0;f<=S.maxFret;f++)if(!SEL.has(s+'-'+f))return false;return true}
function regionPositions(){const o=[];for(let s=0;s<6;s++)for(let f=0;f<=S.maxFret;f++)if(SEL.has(s+'-'+f))o.push({s,f,midi:OPEN[s]+f,pc:mod12(OPEN[s]+f)});return o}

/* ---------- fretboard drawing ---------- */
const NS='http://www.w3.org/2000/svg', svg=document.getElementById('board');
const X0=118,X1=1188,TOP=26,SP=36,OPENX=84;
function el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function wx(f){if(f<=0)return X0;const M=S.maxFret,real=(1-2**(-f/12))/(1-2**(-M/12));return X0+(X1-X0)*(0.6*real+0.4*f/M)}
function nx(f){return f===0?OPENX:(wx(f-1)+wx(f))/2}
function sy(s){return TOP+s*SP}
function cellX(f){return f===0?[56,X0-6]:[wx(f-1),wx(f)]}
let LAY={};
function drawBoard(){
  svg.innerHTML='';
  const base=el('g',{},svg);
  el('rect',{x:X0,y:TOP-18,width:X1-X0,height:5*SP+36,rx:3,class:'wood'},base);
  const M=S.maxFret,yMid=(sy(2)+sy(3))/2;
  for(let f=1;f<=M;f++){
    const cx=(wx(f-1)+wx(f))/2;
    if([3,5,7,9,15,17,19,21].includes(f))el('circle',{cx,cy:yMid,r:7,class:'inl'},base);
    if(f===12||f===24){el('circle',{cx,cy:sy(1)+SP/2,r:7,class:'inl'},base);el('circle',{cx,cy:sy(3)+SP/2,r:7,class:'inl'},base)}
    el('line',{x1:wx(f),x2:wx(f),y1:TOP-18,y2:TOP+5*SP+18,class:'fretw'},base);
  }
  el('rect',{x:X0-7,y:TOP-18,width:8,height:5*SP+36,class:'nut'},base);
  for(let s=0;s<6;s++)el('line',{x1:56,x2:X1,y1:sy(s),y2:sy(s),class:'str'+(s>=3?' w':''),'stroke-width':(0.9+s*0.42).toFixed(2)},base);
  for(let f=0;f<=M;f++){const t=el('text',{x:nx(f),y:TOP+5*SP+40,class:'fnum'+([3,5,7,9,12,15,17,19,21,24].includes(f)?' dot':'')},base);t.textContent=f}
  for(let s=0;s<6;s++){
    const g=el('g',{'data-string':s,role:'button',tabindex:0,'aria-label':'Toggle string '+(s+1)},base);
    el('rect',{x:2,y:sy(s)-SP/2,width:50,height:SP,class:'slabbg'},g);
    el('text',{x:27,y:sy(s),class:'slab'},g).textContent=SLAB[s];
  }
  LAY.dim=el('g',{},svg);LAY.marks=el('g',{},svg);LAY.sel=el('g',{},svg);LAY.hits=el('g',{},svg);
  for(let s=0;s<6;s++)for(let f=0;f<=M;f++){const[a,b]=cellX(f);el('rect',{x:a,y:sy(s)-SP/2,width:b-a,height:SP,class:'hit','data-s':s,'data-f':f},LAY.hits)}
  drawDim();drawMarks();
}
function drawDim(){
  LAY.dim.innerHTML='';
  /* One path for all cells: separate overlapping rects left seams that looked like extra strings. */
  let d='';
  for(let s=0;s<6;s++)for(let f=0;f<=S.maxFret;f++)if(!inRegion(s,f)){const[a,b]=cellX(f);d+=`M${a} ${sy(s)-SP/2}h${b-a+0.6}v${SP+0.6}h${-(b-a+0.6)}z`}
  if(d)el('path',{d,class:'dimc'},LAY.dim);
  svg.querySelectorAll('[data-string]').forEach(g=>{const st=+g.dataset.string;let any=false;for(let f=0;f<=S.maxFret;f++)if(SEL.has(st+'-'+f)){any=true;break}g.querySelector('text').classList.toggle('off',!any)});
}
function drawMarks(){
  LAY.marks.innerHTML='';
  const taken=new Set(G.marks.map(m=>m.s+'-'+m.f));
  const list=[];
  const quizOpen=G.running&&((G.q&&!G.q.answered)||G.phase==='pickstart');
  if(S.showNotes&&S.showNotes!=='off'&&!quizOpen){const pcs=new Set(poolNames().map(n=>nm(n).pc));for(const p of regionPositions())if(pcs.has(p.pc)&&!taken.has(p.s+'-'+p.f))list.push({s:p.s,f:p.f,cls:'study',label:pcName(p.pc)+(S.showNotes==='oct'?octOf(p.midi):'')})}
  list.push(...G.marks,...G.taps);
  for(const m of list){const g=el('g',{class:'mk '+m.cls},LAY.marks);const L=(m.label||'').length,w=Math.max(26,L*7.6+10),h=26;el('rect',{x:nx(m.f)-w/2,y:sy(m.s)-h/2,width:w,height:h,rx:h/2,class:'bg'},g);const t=el('text',{x:nx(m.f),y:sy(m.s)+0.5},g);t.textContent=m.label||'';if(L>4)t.setAttribute('font-size','10px')}
}

/* ---------- audio ---------- */
let actx=null;
function ac(){if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();return actx}
const pluckCache={};
function pluck(midi){
  const c=ac();let b=pluckCache[midi];
  if(!b){
    const sr=c.sampleRate,f=440*2**((midi-69)/12),N=Math.max(2,Math.round(sr/f-0.5)),len=Math.floor(sr*2.2);
    b=c.createBuffer(1,len,sr);const d=b.getChannelData(0),r=new Float32Array(N);
    for(let i=0;i<N;i++)r[i]=Math.random()*2-1;
    for(let k=0;k<2;k++)for(let i=0;i<N;i++)r[i]=0.5*(r[i]+r[(i+1)%N]);
    let pk=0;for(let i=0;i<N;i++)pk=Math.max(pk,Math.abs(r[i]));for(let i=0;i<N;i++)r[i]/=pk||1;
    const decay=Math.min(0.9996,0.9955+(midi-40)*0.00009);
    for(let i=0;i<len;i++){const j=i%N;d[i]=r[j];r[j]=decay*0.5*(r[j]+r[(j+1)%N])}
    pluckCache[midi]=b;
  }
  const src=c.createBufferSource(),g=c.createGain();src.buffer=b;g.gain.value=0.55;src.connect(g).connect(c.destination);src.start();
  mic.ignoreUntil=performance.now()+600;mic.last=midi;mic.hist=[];mic.armed=false;
}
function click(t,accent){
  const c=ac(),o=c.createOscillator(),g=c.createGain();
  o.frequency.value=accent?1760:1100;o.type='sine';
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(accent?0.55:0.32,t+0.002);g.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
  o.connect(g).connect(c.destination);o.start(t);o.stop(t+0.06);
}

/* ---------- quiz state ---------- */
const G={running:false,q:null,phase:'idle',beatInQ:0,countin:0,marks:[],taps:[],timers:[],lastKey:'',
  log:[],st:{n:0,ok:0,streak:0,best:0,times:[],notes:{}}};
function clearTimers(){G.timers.forEach(clearTimeout);G.timers=[]}
const $=id=>document.getElementById(id);
function setPrompt(t,s){$('prompt').textContent=t;$('sub').textContent=s||''}

function ordinalLabel(r,n){const top=n-1-r;if(r===0)return'lowest';if(top===0)return'highest';return r<=top?ord(r+1)+' lowest':ord(top+1)+' highest'}

function mkFind(valid,pool){
  const avail=pool.filter(n=>valid.some(p=>p.pc===nm(n).pc));
  const name=pick(avail),pc=nm(name).pc,P=pretty(name);
  const matches=valid.filter(p=>p.pc===pc);
  const midis=[...new Set(matches.map(p=>p.midi))].sort((a,b)=>a-b);
  const viaMic=answerBy()==='mic';
  let spec=S.target;
  if(spec==='mix')spec=pick(viaMic?['any','exact','ordinal']:['any','every','exact','ordinal']);
  if(spec==='ordinal'&&midis.length<2)spec='any';
  const q={type:'find',name,pc,spec,matches,key:'f'+name+spec};
  if(spec==='any'){
    q.text='Find '+P;q.sub=matches.length>1?`Any of the ${matches.length} spots in the area counts.`:'There is one in the area.';
    q.ok=p=>p.pc===pc;q.okMidi=m=>mod12(m)===pc;q.label=p=>P;
  }else if(spec==='every'){
    q.text='Find every '+P;q.label=p=>withOct(name,p.midi);
    q.sub=viaMic?`${midis.length} different ${P} pitches in the area. Play each one, in any order.`:`There are ${matches.length} in the area. Click them all.`;
    q.midis=midis;q.okMidi=m=>midis.includes(m);q.ok=p=>p.pc===pc;
  }else{
    let m;
    if(spec==='exact'){m=pick(midis);q.text='Find '+withOct(name,m);q.sub='Exact pitch. If it sits on two strings, either is right.'}
    else{const r=Math.floor(Math.random()*midis.length);m=midis[r];q.text=`Find the ${ordinalLabel(r,midis.length)} ${P}`;q.sub=`${midis.length} different ${P} pitches in the area.`}
    q.midi=m;q.key+=m;q.ok=p=>p.midi===m;q.okMidi=x=>x===m;q.label=p=>withOct(name,p.midi);
  }
  q.answers=()=>(spec==='exact'||spec==='ordinal')?matches.filter(p=>p.midi===q.midi):matches;
  return q;
}
function mkName(valid,pool){
  const p=pick(valid),name=pick(pool.filter(n=>nm(n).pc===p.pc));
  const q={type:'name',pos:p,name,pc:p.pc,midi:p.midi,key:'n'+p.s+'-'+p.f,text:'Name this note',
    sub:`String ${p.s+1} (${SNAME[p.s]}), ${p.f===0?'open':'fret '+p.f}`};
  q.okMidi=m=>S.octaveStrict?m===p.midi:mod12(m)===p.pc;
  q.marks0=[{s:p.s,f:p.f,cls:'target',label:'?'}];
  const byPc={};for(const n of pool){const k=nm(n).pc;if(k!==p.pc)(byPc[k]=byPc[k]||[]).push(n)}
  let others=shuffle(Object.keys(byPc)).slice(0,3).map(k=>pick(byPc[k]));
  if(others.length<3){const used=new Set([p.pc,...others.map(n=>nm(n).pc)]);for(const n of shuffle(SHARP.slice()))if(others.length<3&&!used.has(nm(n).pc)){others.push(n);used.add(nm(n).pc)}}
  q.options=shuffle([name,...others]);
  q.list=pool.slice().sort((a,b)=>nm(a).pc-nm(b).pc||a.localeCompare(b));
  if(S.octaveStrict&&answerBy()==='mic')q.sub+=' · play it in this octave';
  return q;
}
function mkEar(valid,pool){
  const p=pick(valid),name=pick(pool.filter(n=>nm(n).pc===p.pc));
  const q={type:'ear',pos:p,name,pc:p.pc,midi:p.midi,key:'e'+p.midi,text:'Listen, then find it'};
  q.sub=(answerBy()==='mic'?'Play the same note on your guitar.':'Click where it is.')+(S.octaveStrict?' Same octave.':' Any octave counts.');
  q.ok=x=>S.octaveStrict?x.midi===p.midi:x.pc===p.pc;
  q.okMidi=m=>S.octaveStrict?m===p.midi:mod12(m)===p.pc;
  q.answers=()=>valid.filter(x=>q.ok(x));
  q.label=x=>withOct(name,x.midi);
  return q;
}

function mkNear(valid,pool){
  const all=regionPositions();
  for(let tries=0;tries<40;tries++){
    const ref=(G.nearRef&&tries<30)?G.nearRef:pick(all),name=pick(pool),pc=nm(name).pc,P=pretty(name);
    let cands=valid.filter(p=>p.pc===pc&&!(p.s===ref.s&&p.f===ref.f)),dir='';
    const wantDir=S.nearDir==='dir'||(S.nearDir==='mix'&&Math.random()<0.5);
    if(pc===ref.pc||wantDir){
      const hi=cands.filter(p=>p.midi>ref.midi),lo=cands.filter(p=>p.midi<ref.midi),opts=[];
      if(hi.length)opts.push('higher');if(lo.length)opts.push('lower');
      if(!opts.length)continue;dir=pick(opts);cands=dir==='higher'?hi:lo;
    }
    if(!cands.length)continue;
    const dist=p=>Math.hypot(p.f-ref.f,p.s-ref.s);
    const best=Math.min(...cands.map(dist)),ans=cands.filter(p=>dist(p)<best+1e-6);
    const q={type:'near',name,pc,ref,spec:dir||'nearest',key:'r'+ref.s+'-'+ref.f+name+dir,
      text:`Nearest ${dir?dir+' ':''}${P}`,
      sub:`From ${midiName(ref.midi)} on the ${SLAB[ref.s]} string, ${ref.f===0?'open':'fret '+ref.f}.${dir?' Nearest '+P+' that sounds '+dir+' than where you are.':''}${ans.length>1?' '+ans.length+' spots are equally near; any counts.':''}`,
      marks0:[{s:ref.s,f:ref.f,cls:'target',label:midiName(ref.midi)}]};
    q.ok=p=>ans.some(a=>a.s===p.s&&a.f===p.f);
    q.okMidi=m=>ans.some(a=>a.midi===m);
    q.answers=()=>ans;q.label=p=>withOct(name,p.midi);q.midi=ans[0].midi;
    return q;
  }
  return mkFind(valid,pool);
}
function validPositions(){const pcs=new Set(poolNames().map(n=>nm(n).pc));return regionPositions().filter(p=>pcs.has(p.pc))}
function newQuestion(){
  clearTimers();
  const pool=poolNames(),pcs=new Set(pool.map(n=>nm(n).pc));
  const valid=regionPositions().filter(p=>pcs.has(p.pc));
  if(!valid.length){stop();setPrompt('Nothing to ask','No spot in the selected area matches your notes. Widen the area or add notes.');return}
  let q;
  for(let i=0;i<10;i++){q=S.mode==='find'?mkFind(valid,pool):S.mode==='name'?mkName(valid,pool):S.mode==='near'?mkNear(valid,pool):mkEar(valid,pool);if(q.key!==G.lastKey)break}
  G.lastKey=q.key;q.answered=false;q.found=new Set();q.t0=performance.now();
  G.q=q;G.phase='question';G.beatInQ=0;G.marks=(q.marks0||[]).slice();
  setPrompt(q.text,q.sub);$('feedback').textContent='';$('feedback').className='feedback';
  renderAnswers();drawMarks();renderBeats();
  $('replayBtn').hidden=q.type!=='ear';$('skipBtn').hidden=S.timing!=='free';$('nextBtn').hidden=true;
  if(q.type==='ear')pluck(q.midi);
  mic.ignoreUntil=Math.max(mic.ignoreUntil,performance.now()+400);mic.armed=false;mic.hist=[];
}

function renderAnswers(){
  const box=$('answers');box.innerHTML='';const q=G.q;if(!q)return;const ab=answerBy();
  if(q.type==='name'&&(ab==='choices'||ab==='list')){
    (ab==='choices'?q.options:q.list).forEach((n,i)=>{
      const b=document.createElement('button');b.dataset.name=n;
      b.innerHTML=(i<9?`<span class="k">${i+1}</span>`:'')+pretty(n);
      b.onclick=()=>onChoice(n,b);box.appendChild(b);
    });
  }else if(ab==='mic'){
    const p=document.createElement('p');
    if(mic.on){p.className='hint';p.textContent='Listening…'}else{p.className='warn';p.textContent='Turn the microphone on (right) to answer by playing.'}
    box.appendChild(p);
  }
}

function onChoice(n,btn){
  const q=G.q;if(!G.running||!q||q.answered||G.phase!=='question')return;
  const right=nm(n).pc===q.pc;
  btn.classList.add(right?'good':'bad');
  if(!right)$('answers').querySelectorAll('button').forEach(b=>{if(nm(b.dataset.name).pc===q.pc)b.classList.add('good')});
  finish(right,{said:n});
}
function onCell(s,f){
  const p={s,f,midi:OPEN[s]+f,pc:mod12(OPEN[s]+f)},q=G.q;
  if(G.running&&G.phase==='pickstart'){pluck(p.midi);setStart(p);return}
  const clickMode=(S.mode==='find'||S.mode==='ear'||S.mode==='near')&&answerBy()==='click';
  if(!G.running||!q||q.answered||G.phase!=='question'||!clickMode){tap(p);return}
  if(!inRegion(s,f))return;
  if(q.type==='find'&&q.spec==='every'){
    const k=s+'-'+f;
    if(p.pc===q.pc){if(!q.found.has(k)){q.found.add(k);G.marks.push({s,f,cls:'good',label:pretty(q.name)});drawMarks();
      $('feedback').textContent=`${q.found.size} of ${q.matches.length}`;$('feedback').className='feedback good';
      if(q.found.size===q.matches.length)finish(true)}}
    else{q.mistakes=(q.mistakes||0)+1;const m={s,f,cls:'bad',label:pcName(p.pc)};G.marks.push(m);drawMarks();setTimeout(()=>{G.marks=G.marks.filter(x=>x!==m);drawMarks()},900);
      $('feedback').textContent=`✗ ${q.found.size} of ${q.matches.length} so far`;$('feedback').className='feedback bad'}
    return;
  }
  const right=q.ok(p);
  G.marks.push({s,f,cls:right?'good':'bad',label:right?q.label(p):(q.type==='find'&&q.spec==='any'?pcName(p.pc):withOct(ascName(p.pc),p.midi))});
  finish(right,{clicked:p});
}
function tap(p){
  pluck(p.midi);const m={s:p.s,f:p.f,cls:'tap',label:midiName(p.midi)};
  G.taps=G.taps.filter(t=>!(t.s===p.s&&t.f===p.f));G.taps.push(m);drawMarks();
  setTimeout(()=>{G.taps=G.taps.filter(t=>t!==m);drawMarks()},1400);
}
function onMicNote(m){
  if(G.running&&G.phase==='pickstart'){
    const p=regionPositions().find(x=>x.midi===m);
    if(p){$('feedback').textContent=`Starting from ${SLAB[p.s]} string, ${p.f===0?'open':'fret '+p.f}`;$('feedback').className='feedback';setStart(p)}else{$('feedback').textContent=`Heard ${midiName(m)}, which is not in the area.`;$('feedback').className='feedback bad'}
    return;
  }
  const q=G.q;if(!G.running||!q||q.answered||G.phase!=='question'||answerBy()!=='mic')return;
  if(q.type==='near'&&m===q.ref.midi)return; // the starting note is still ringing or was replayed: not an answer
  if(!(q.type==='find'&&q.spec==='every')){
    if(q.okMidi(m)){clearTimeout(q.pendingWrong);finish(true,{heard:m});return}
    // a wrong reading at the attack often settles into the right note: give it a moment
    if(!q.pendingWrong){q.pendingWrong=setTimeout(()=>{q.pendingWrong=null;finish(false,{heard:m})},350);G.timers.push(q.pendingWrong)}
    return;
  }
  if(q.type==='find'&&q.spec==='every'){
    if(!q.okMidi(m)){q.mistakes=(q.mistakes||0)+1;$('feedback').textContent=`✗ heard ${midiName(m)} · ${q.found.size} of ${q.midis.length} so far`;$('feedback').className='feedback bad';return}
    if(q.found.has(m))return;q.found.add(m);
    // the same pitch can sit on two strings, so nothing is marked until the end: only the count
    $('feedback').textContent=`${q.found.size} of ${q.midis.length} found`;$('feedback').className='feedback good';
    if(q.found.size===q.midis.length)finish(true);
    return;
  }
}
function midiName(m){return pcName(mod12(m))+octOf(m)}

function finish(right,info={}){
  const q=G.q;if(!q||q.answered)return;q.answered=true;
  const ms=performance.now()-q.t0,st=G.st;
  st.n++;if(right){st.ok++;st.streak++;st.best=Math.max(st.best,st.streak);st.times.push(ms)}else st.streak=0;
  const key=pretty(q.name),rec=st.notes[key]=st.notes[key]||{n:0,miss:0};rec.n++;if(!right)rec.miss++;
  // show where the answer was
  if(q.type==='name'){
    G.marks=[{s:q.pos.s,f:q.pos.f,cls:right?'good':'reveal',label:withOct(q.name,q.midi)}];
  }else{
    const taken=new Set(G.marks.map(m=>m.s+'-'+m.f));
    for(const p of q.answers())if(!taken.has(p.s+'-'+p.f))G.marks.push({s:p.s,f:p.f,cls:right?'also':'reveal',label:q.label(p)});
  }
  if(q.type==='near'){
    const A=q.answers();let nxt=null;
    if(right&&info.clicked)nxt=A.find(a=>a.s===info.clicked.s&&a.f===info.clicked.f);
    if(right&&info.heard!=null)nxt=A.find(a=>a.midi===info.heard);
    G.nearRef=nxt||A[0];
  }
  drawMarks();
  const fb=$('feedback');fb.className='feedback '+(right?'good':'bad');
  const ans=q.type==='find'?(q.spec==='exact'||q.spec==='ordinal'?withOct(q.name,q.midi):pretty(q.name)):q.type==='near'?q.answers().map(p=>withOct(q.name,p.midi)).join('/'):withOct(q.name,q.midi);
  let msg;
  if(right)msg=`✓ ${ans} · ${(ms/1000).toFixed(1)} s`+(q.mistakes?` · ${q.mistakes} wrong note${q.mistakes>1?'s':''} on the way`:'');
  else if(info.timeout)msg=`Time's up`;
  else if(info.skipped)msg=``;
  else if(info.heard!=null)msg=`✗ heard ${midiName(info.heard)}`;
  else msg=`✗`;
  fb.textContent=msg;
  G.log.push({time:new Date().toISOString(),quiz:S.mode,asked:q.text,note:pretty(q.name),target:(q.type==='find'||q.type==='near')?q.spec:'',reference:q.type==='near'?`${SLAB[q.ref.s]} fret ${q.ref.f} (${midiName(q.ref.midi)})`:'',
    correct:q.type==='name'?withOct(q.name,q.midi):q.answers().map(p=>`${SLAB[p.s]} fret ${p.f} (${withOct(q.name,p.midi)})`).join(' | '),
    answer:info.timeout?'timeout':info.skipped?'skipped':info.clicked?`${SLAB[info.clicked.s]} fret ${info.clicked.f} (${midiName(info.clicked.midi)})`:info.said?pretty(info.said):info.heard!=null?midiName(info.heard):'',
    answer_by:answerBy(),right:right?1:0,seconds:(ms/1000).toFixed(2),
    area:isWhole()?'whole':[...SEL].sort().join(' '),notes_pool:poolNames().join(' '),pool_mode:S.poolMode,scale:S.poolMode==='scale'?S.tonic+' '+SCALES[S.scale].l:'',
    mistakes:q.mistakes||0,octave_strict:S.octaveStrict?1:0,timing:S.timing,bpm:S.timing==='metro'?S.bpm:'',beats:S.timing==='metro'?S.beats:'',neck:S.maxFret});
  renderStats();
  if(S.timing==='free'&&G.running){if(S.pause==='wait')$('nextBtn').hidden=false;else G.timers.push(setTimeout(newQuestion,+S.pause*1000+(right?0:1500)))}
}

/* ---------- metronome ---------- */
const MET={timer:null,next:0,ui:[]};
function predictAccent(){return G.phase==='reveal'||(G.phase==='countin'&&G.countin===0)||(G.phase==='question'&&G.beatInQ+1>=S.beats)}
function startMetro(){const c=ac();MET.next=c.currentTime+0.15;MET.timer=setInterval(schedule,25)}
function stopMetro(){clearInterval(MET.timer);MET.timer=null;MET.ui.forEach(clearTimeout);MET.ui=[]}
function schedule(){
  const c=actx;
  if(MET.next<c.currentTime-0.05)MET.next=c.currentTime+0.05;   // tab was asleep: drop missed beats instead of replaying them
  while(MET.next<c.currentTime+0.12){
    const t=MET.next;click(t,predictAccent());
    MET.ui.push(setTimeout(onBeat,Math.max(0,(t-c.currentTime)*1000)));
    if(MET.ui.length>16)MET.ui=MET.ui.slice(-8);
    MET.next+=60/S.bpm;
  }
}
function onBeat(){
  if(!G.running)return;
  if(G.phase==='countin'){if(G.countin>0){setPrompt(String(G.countin),'Count-in');G.countin--}else newQuestion();return}
  if(G.phase==='reveal'){newQuestion();return}
  if(G.phase==='question'){
    G.beatInQ++;
    if(G.beatInQ>=S.beats){if(!G.q.answered){finish(false,{timeout:true});G.phase='reveal';renderBeats(true)}else newQuestion()}
    else renderBeats();
  }
}
function renderBeats(clear){
  const b=$('beats');b.innerHTML='';if(S.timing!=='metro'||!G.running)return;
  for(let i=0;i<S.beats;i++){const d=document.createElement('i');if(i===0)d.className='down';if(!clear&&i<=G.beatInQ)d.classList.add('on');b.appendChild(d)}
}

/* ---------- start / stop ---------- */
function start(){
  ac();G.running=true;$('startBtn').textContent='Stop';$('startBtn').classList.add('on');
  if(!validPositions().length){stop();setPrompt('Nothing to ask','No spot in the selected area matches your notes. Widen the area or add notes.');return}
  if(S.mode==='near'&&!G.nearRef){
    G.phase='pickstart';G.q=null;G.marks=[];drawMarks();$('answers').innerHTML='';$('feedback').textContent='';
    setPrompt('Where do you start?','Click a spot in the area, or play a note. Each question then starts from the note you should have found.');
    return;
  }
  begin();
}
function setStart(p){
  if(!inRegion(p.s,p.f)){$('feedback').textContent='That spot is outside the area.';$('feedback').className='feedback bad';return}
  G.nearRef=p;mic.ignoreUntil=performance.now()+1200;mic.hist=[];begin();
}
function begin(){
  if(S.timing==='metro'){G.phase='countin';G.countin=Math.max(S.beats,2);G.marks=[];drawMarks();setPrompt('Get ready','');$('answers').innerHTML='';startMetro()}
  else newQuestion();
}
function stop(){
  G.running=false;stopMetro();clearTimers();G.phase='idle';G.q=null;G.marks=[];G.nearRef=null;
  $('startBtn').textContent='Start';$('startBtn').classList.remove('on');
  setPrompt('Press Start','Set the area, notes, quiz and tempo below, or keep the defaults.');
  $('answers').innerHTML='';$('feedback').textContent='';$('replayBtn').hidden=true;$('skipBtn').hidden=true;$('nextBtn').hidden=true;$('beats').innerHTML='';
  drawMarks();
}
function renderStats(){
  const s=G.st;$('stOk').textContent=s.ok;$('stBad').textContent=s.n-s.ok;
  $('stAcc').textContent=s.n?Math.round(100*s.ok/s.n)+'%':'–';$('stStreak').textContent=s.streak;
  $('stAvg').textContent=s.times.length?(s.times.reduce((a,b)=>a+b,0)/s.times.length/1000).toFixed(1)+'s':'–';
  const w=Object.entries(s.notes).filter(([,r])=>r.miss>0).sort((a,b)=>b[1].miss/b[1].n-a[1].miss/a[1].n||b[1].miss-a[1].miss).slice(0,8);
  const ul=$('weak');ul.innerHTML='';
  if(!w.length){const li=document.createElement('li');li.style.display='block';li.className='hint';li.textContent='Notes you miss will be listed here, worst first.';ul.appendChild(li);return}
  for(const[k,r]of w){const li=document.createElement('li');const pct=Math.round(100*r.miss/r.n);
    li.innerHTML=`<span class="n">${k}</span><span class="bar"><i style="width:${pct}%"></i></span><span class="p">${r.miss}/${r.n} missed</span>`;ul.appendChild(li)}
}

/* ---------- microphone & pitch detection (YIN) ---------- */
const mic={on:false,starting:false,stream:null,an:null,buf:null,timer:null,hist:[],last:null,lastAt:0,prev:0,peak:0,quiet:0,armed:true,ignoreUntil:0,d:null,cm:null};
async function micStart(){
  if(mic.starting||mic.on)return;mic.starting=true;
  try{
    const c=ac();
    mic.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const src=c.createMediaStreamSource(mic.stream);mic.an=c.createAnalyser();mic.an.fftSize=4096;src.connect(mic.an);
    mic.buf=new Float32Array(4096);mic.d=new Float32Array(2048);mic.cm=new Float32Array(2048);mic.stream.getTracks()[0].onended=micStop;
    mic.timer=setInterval(micTick,30);mic.on=true;$('micBtn').textContent='Turn mic off';$('micBtn').classList.add('on');
    $('micHint').textContent='Pitch is judged to the nearest semitone. Headphones keep the app’s own sounds out of the mic.';
  }catch(e){
    $('micHint').innerHTML='<span class="warn">The microphone could not start ('+(e.name||'error')+'). Allow microphone access for this page in your browser and try again.</span>';
  }
  mic.starting=false;
  if(G.q&&!G.q.answered)renderAnswers();
}
function micStop(){clearInterval(mic.timer);if(mic.stream)mic.stream.getTracks().forEach(t=>t.stop());mic.on=false;
  $('micBtn').textContent='Turn mic on';$('micBtn').classList.remove('on');$('heardNote').textContent='—';$('heardCents').textContent='';$('meterFill').style.width='0';
  if(G.q&&!G.q.answered)renderAnswers()}
function yin(x,sr){
  const W=2048,tmin=Math.max(2,Math.floor(sr/1400)),tmax=Math.min(Math.floor(sr/60),x.length-W-1,2047);
  const d=mic.d,cm=mic.cm;
  for(let t=1;t<=tmax;t++){let s=0;for(let j=0;j<W;j++){const v=x[j]-x[j+t];s+=v*v}d[t]=s}
  let run=0;cm[0]=1;for(let t=1;t<=tmax;t++){run+=d[t];cm[t]=run?d[t]*t/run:1}
  let tau=-1;for(let t=tmin;t<=tmax;t++){if(cm[t]<0.12){while(t+1<=tmax&&cm[t+1]<cm[t])t++;tau=t;break}}
  if(tau<1)return null;
  const a=cm[tau-1],b=cm[tau],c=tau+1<=tmax?cm[tau+1]:b,den=a+c-2*b,sh=den?(a-c)/(2*den):0;
  return{f:sr/(tau+sh),conf:1-b};
}
function micTick(){
  const x=mic.buf;mic.an.getFloatTimeDomainData(x);
  let s=0;for(let i=0;i<x.length;i++)s+=x[i]*x[i];const rms=Math.sqrt(s/x.length);
  $('meterFill').style.width=Math.min(100,rms/0.08*100)+'%';
  const thr=S.sens;
  mic.peak=Math.max(rms,mic.peak*0.97);
  if(rms<thr){
    if(++mic.quiet>4){$('heardNote').textContent='—';$('heardCents').textContent=''}
    if(mic.quiet>10&&rms<thr*0.6){mic.last=null;mic.armed=true}   // real silence: the next note is a new note
    mic.hist=[];mic.prev=rms;return}
  mic.quiet=0;
  // a new attack: level jumps well above the previous tick and above the decaying envelope of the last note
  if(mic.prev>0&&rms>mic.prev*1.8&&rms>thr*1.5&&rms>mic.peak*0.6){mic.last=null;mic.hist=[];mic.armed=true}
  mic.prev=rms;
  const r=yin(x,actx.sampleRate);if(!r||r.conf<0.8){mic.hist=[];return}
  const mf=69+12*Math.log2(r.f/440),m=Math.round(mf),cents=Math.round((mf-m)*100);
  if(m<38||m>92){mic.hist=[];return}
  $('heardNote').textContent=midiName(m);$('heardCents').textContent=(cents>=0?'+':'')+cents+'¢';
  if(Math.abs(cents)>40){mic.hist=[];return}   // between two semitones: not settled yet
  mic.hist.push(m);if(mic.hist.length>5)mic.hist.shift();
  const now=performance.now(),stable=mic.hist.length===5&&mic.hist.every(v=>v===m);
  const octaveOfLast=mic.last!=null&&[12,19,24,-12,-19,-24].includes(m-mic.last);
  if(stable&&m!==mic.last&&now>mic.ignoreUntil&&now-mic.lastAt>250&&(mic.armed||!octaveOfLast)){mic.armed=false;mic.last=m;mic.lastAt=now;onMicNote(m)}
}

/* ---------- controls ---------- */
function setSeg(id,v){document.querySelectorAll('#'+id+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===v))}
const ANS={find:[['mic','Playing it on the guitar'],['click','Clicking the fretboard']],
  name:[['mic','Playing it on the guitar'],['choices','Multiple choice (4)'],['list','Choosing from all notes']],
  ear:[['mic','Playing it on the guitar'],['click','Clicking the fretboard']],
  near:[['mic','Playing it on the guitar'],['click','Clicking the fretboard']]};
function sync(){
  $('maxFret').value=S.maxFret;$('showNotes').value=S.showNotes===true?'name':(S.showNotes||'off');
  const R=regionPositions();
  let txt;
  if(!R.length)txt='Quiz area: <b>nothing selected</b> — drag across the neck';
  else if(isWhole())txt='Quiz area: <b>whole fretboard</b>';
  else{const ss=[...new Set(R.map(p=>p.s))].sort(),fs=R.map(p=>p.f),f0=Math.min(...fs),f1=Math.max(...fs);
    txt=`Quiz area: <b>${R.length} spots</b> · ${ss.length===6?'all strings':ss.map(i=>SLAB[i]).join(' ')} · ${f0===f1?'fret '+f0:`frets ${f0}–${f1}`}`}
  $('selText').innerHTML=txt;
  setSeg('poolSeg',S.poolMode);$('typeRow').hidden=S.poolMode!=='types';$('scaleRow').hidden=S.poolMode!=='scale';$('customRow').hidden=S.poolMode!=='custom';
  const cr=$('customRow');cr.innerHTML='';
  for(const n of [...NATS,...SHARP.filter(n=>n.length>1),...FLAT.filter(n=>n.length>1)]){const b=document.createElement('button');b.className='chip'+(S.custom.includes(n)?' on':'');b.textContent=pretty(n);b.setAttribute('aria-pressed',S.custom.includes(n));
    b.onclick=()=>{const i=S.custom.indexOf(n);if(i>=0)S.custom.splice(i,1);else S.custom.push(n);changed()};cr.appendChild(b)}
  $('nat').checked=S.nat;$('sharp').checked=S.sharp;$('flat').checked=S.flat;$('tonic').value=S.tonic;$('scale').value=S.scale;
  const pool=poolNames();$('poolPreview').textContent=pool.length?pool.map(pretty).join('  '):'No notes chosen yet.';
  setSeg('modeSeg',S.mode);$('targetRow').hidden=S.mode!=='find';$('target').value=S.target;$('nearRow').hidden=S.mode!=='near';$('nearDir').value=S.nearDir;
  const ab=$('answerBy');ab.innerHTML='';for(const[v,l]of ANS[S.mode]){const o=document.createElement('option');o.value=v;o.textContent=l;ab.appendChild(o)}ab.value=answerBy();
  $('octRow').hidden=!(S.mode==='ear'||(S.mode==='name'&&answerBy()==='mic'));$('octaveStrict').checked=S.octaveStrict;
  setSeg('timingSeg',S.timing);$('bpmRow').hidden=$('beatsRow').hidden=S.timing!=='metro';
  $('bpm').value=S.bpm;$('bpmR').value=S.bpm;$('beatsSel').value=S.beats;$('pause').value=S.pause;$('pauseRow').hidden=S.timing!=='free';
  $('tempoHint').textContent=S.timing==='metro'?`${(60/S.bpm*S.beats).toFixed(1)} s per question. Answer before the next downbeat.`:'Take as long as you need.';
  $('sens').value=S.sens;$('meterThr').style.left=Math.min(100,S.sens/0.08*100)+'%';
}
function changed(redraw,keepRunning){save();if(G.running&&!keepRunning)stop();sync();if(redraw)drawBoard();else{drawDim();drawMarks()}}
function stringFull(s){for(let f=0;f<=S.maxFret;f++)if(!SEL.has(s+'-'+f))return false;return true}
function toggleString(s){const whole=isWhole(),full=!whole&&stringFull(s);if(whole)SEL.clear();for(let f=0;f<=S.maxFret;f++){if(full)SEL.delete(s+'-'+f);else SEL.add(s+'-'+f)}syncSel();changed()}

TONICS.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=pretty(t);$('tonic').appendChild(o)});
Object.entries(SCALES).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.l;$('scale').appendChild(o)});

function svgPt(e){const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse())}
function cellAt(pt){
  const s=Math.max(0,Math.min(5,Math.round((pt.y-TOP)/SP)));
  let f=0;if(pt.x>=X0-6){f=1;while(f<S.maxFret&&pt.x>wx(f))f++}
  return{s,f};
}
let drag=null;
svg.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const sg=e.target.closest('[data-string]');if(sg){toggleString(+sg.dataset.string);return}
  if(!e.target.closest('.hit'))return;
  const pt=svgPt(e);drag={x:e.clientX,y:e.clientY,a:cellAt(pt),moved:false};svg.setPointerCapture(e.pointerId);
});
svg.addEventListener('pointermove',e=>{
  if(!drag)return;
  if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;
  drag.moved=true;const b=cellAt(svgPt(e));drag.b=b;
  const s0=Math.min(drag.a.s,b.s),s1=Math.max(drag.a.s,b.s),f0=Math.min(drag.a.f,b.f),f1=Math.max(drag.a.f,b.f);
  const [xa]=cellX(f0),[,xb]=cellX(f1);
  LAY.sel.innerHTML='';el('rect',{x:xa,y:sy(s0)-SP/2,width:xb-xa,height:(s1-s0+1)*SP,rx:4,class:'selrect'},LAY.sel);
});
function endDrag(e){
  if(!drag)return;const d=drag;drag=null;LAY.sel.innerHTML='';
  if(d.moved&&d.b){
    const s0=Math.min(d.a.s,d.b.s),s1=Math.max(d.a.s,d.b.s);
    const f0=Math.min(d.a.f,d.b.f),f1=Math.max(d.a.f,d.b.f);
    if(isWhole())SEL.clear();
    for(let i=s0;i<=s1;i++)for(let f=f0;f<=f1;f++)SEL.add(i+'-'+f);
    syncSel();changed();
  }else onCell(d.a.s,d.a.f);
}
svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',()=>{drag=null;LAY.sel.innerHTML=''});
svg.addEventListener('keydown',e=>{const sg=e.target.closest('[data-string]');if(sg&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();toggleString(+sg.dataset.string)}});
$('maxFret').onchange=e=>{const whole=isWhole();S.maxFret=+e.target.value;if(whole){SEL.clear();allCells(S.maxFret).forEach(k=>SEL.add(k))}else for(const k of [...SEL])if(+k.split('-')[1]>S.maxFret)SEL.delete(k);syncSel();changed(true)};
$('allBtn').onclick=()=>{SEL.clear();allCells(S.maxFret).forEach(k=>SEL.add(k));syncSel();changed()};
$('clearBtn').onclick=()=>{SEL.clear();syncSel();changed()};
$('showNotes').onchange=e=>{S.showNotes=e.target.value;changed(false,true)};
document.querySelectorAll('#poolSeg button').forEach(b=>b.onclick=()=>{S.poolMode=b.dataset.v;changed()});
['nat','sharp','flat'].forEach(k=>$(k).onchange=e=>{S[k]=e.target.checked;changed()});
$('tonic').onchange=e=>{S.tonic=e.target.value;changed()};$('scale').onchange=e=>{S.scale=e.target.value;changed()};
document.querySelectorAll('#modeSeg button').forEach(b=>b.onclick=()=>{S.mode=b.dataset.v;changed()});
$('target').onchange=e=>{S.target=e.target.value;changed()};
$('nearDir').onchange=e=>{S.nearDir=e.target.value;changed()};
$('answerBy').onchange=e=>{S['ans_'+S.mode]=e.target.value;changed()};
$('octaveStrict').onchange=e=>{S.octaveStrict=e.target.checked;changed()};
document.querySelectorAll('#timingSeg button').forEach(b=>b.onclick=()=>{S.timing=b.dataset.v;changed()});
const setBpm=v=>{S.bpm=Math.max(30,Math.min(160,+v||50));changed(false,true)};
$('bpm').onchange=e=>setBpm(e.target.value);$('bpmR').oninput=e=>setBpm(e.target.value);
$('beatsSel').onchange=e=>{S.beats=+e.target.value;changed()};
$('pause').onchange=e=>{S.pause=e.target.value;save();sync()};
$('nextBtn').onclick=()=>{if(G.running&&G.q&&G.q.answered){clearTimers();newQuestion()}};
$('sens').oninput=e=>{S.sens=+e.target.value;save();$('meterThr').style.left=Math.min(100,S.sens/0.08*100)+'%'};
$('startBtn').onclick=e=>{e.currentTarget.blur();G.running?stop():start()};
$('micBtn').onclick=()=>mic.on?micStop():micStart();
$('replayBtn').onclick=()=>{if(G.q&&G.q.type==='ear')pluck(G.q.midi)};
$('skipBtn').onclick=()=>{if(G.q&&!G.q.answered)finish(false,{skipped:true})};
function resetAll(){G.st={n:0,ok:0,streak:0,best:0,times:[],notes:{}};G.log=[];renderStats()}
$('resetBtn').onclick=resetAll;
$('restartBtn').onclick=()=>{stop();resetAll();start()};
$('csvBtn').onclick=()=>{
  if(!G.log.length){$('feedback').textContent='Nothing answered yet.';$('feedback').className='feedback';return}
  const cols=Object.keys(G.log[0]),esc=v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const csv=[cols.join(','),...G.log.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='fretboard-session-'+new Date().toISOString().slice(0,19).replace(/[T:]/g,'-')+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
};
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea')||e.target.closest('[data-string]'))return;
  if(e.key==='Enter'&&!$('nextBtn').hidden){e.preventDefault();$('nextBtn').click();return}
  if(e.key===' '&&!e.target.matches('button')){e.preventDefault();G.running?stop():start()}
  else if(e.key==='r'||e.key==='R')$('replayBtn').click();

  else if(/^[1-9]$/.test(e.key)){const b=$('answers').querySelectorAll('button')[+e.key-1];if(b)b.click()}
});

$('versionLbl').textContent='Fretboard Trainer v'+VERSION;
sync();drawBoard();renderStats();
