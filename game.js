/* All artwork and sound are original procedural assets. No remote dependencies. */
'use strict';
const $ = s => document.querySelector(s);
const canvas = $('#world'), ctx = canvas.getContext('2d', { alpha: false });
const W = 1440, H = 900, FLOOR = 680;
const keys = new Set();
const acts = [
  { roman:'I', title:'忘れられた切符', line:'名前のない配達人に、宛先のない招待状。', objective:'受付を調べ、劇場に電気を戻す', width:3100, zoom:1.04 },
  { roman:'II', title:'空席の観客', line:'客席だけが、あの夜の順番を覚えている。', objective:'上演記録を読み、三つの照明を正しい順で灯す', width:3400, zoom:.79 },
  { roman:'III', title:'吊られた月', line:'幕の向こうで、誰かが開演を待っている。', objective:'舞台裏の記録を探し、釣合い錘を合わせる', width:3300, zoom:1.06 },
  { roman:'IV', title:'拍手の主', line:'振り返らない。明かりのある方へ。', objective:'走れ。倒れた装置を跳び越え、非常灯を点ける', width:3900, zoom:.87 },
  { roman:'V', title:'最後の合図', line:'終わらせるために、もう一度だけ幕を開ける。', objective:'三つの光を月に集め、終演の鐘を鳴らす', width:3400, zoom:.74 }
];
let mode='title', act=0, flags={}, notes=[], p={x:220,z:0,y:0,vy:0,dir:1,walk:0}, cam={x:1400,y:440,zoom:.8};
const visual={rig:0,curtain:0,light:0};
let time=0, last=performance.now(), subtitleTime=0, cardTime=0, cinematic=null, near=null, lampInput=[], weights=[0,0,0], focus=[0,0,0], chaseX=-200, chaseTime=0, stumble=0;
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, audio=null, muted=true, saveTimer=0, started=0, endingTime=0, recording=null;
const particles=Array.from({length:95},(_,i)=>({x:hash(i*3)*4200,y:hash(i*8+1)*780,r:hash(i+44)*1.6+.3,s:hash(i*2+4)}));
function hash(n){return (Math.sin(n*127.1+31.7)*43758.5453)%1+((Math.sin(n*127.1+31.7)*43758.5453)%1<0?1:0);}
function resize(){const d=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(innerWidth*d);canvas.height=Math.round(innerHeight*d);}
addEventListener('resize',resize);resize();
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function path(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function line(x,y,x2,y2,c,w=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();}
function ellipse(x,y,rx,ry,c){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}
function text(s,x,y,size=12,c='#b2ae91',align='center'){ctx.fillStyle=c;ctx.textAlign=align;ctx.font=`${size}px Georgia, "Yu Mincho", serif`;ctx.fillText(s,x,y);}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function arch(x,y,w,h,c,stroke){ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y+w/2);ctx.arc(x+w/2,y+w/2,w/2,Math.PI,0);ctx.lineTo(x+w,y+h);ctx.closePath();ctx.fillStyle=c;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}}
function beam(x,y,tx,ty,width,power=.15){ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createLinearGradient(x,y,tx,ty);g.addColorStop(0,`rgba(226,211,159,${power*.8})`);g.addColorStop(.75,`rgba(174,192,162,${power})`);g.addColorStop(1,'rgba(174,192,162,0)');path([[x-5,y],[x+5,y],[tx+width,ty],[tx-width,ty]],g);ellipse(tx,ty-4,width,13,`rgba(226,213,164,${power*.9})`);ctx.restore();}
function sound(freq=220,len=.2,type='sine',gain=.08){if(!audio||muted)return;const o=audio.ctx.createOscillator(),g=audio.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.ctx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.72,audio.ctx.currentTime+len);g.gain.setValueAtTime(0,audio.ctx.currentTime);g.gain.linearRampToValueAtTime(gain,audio.ctx.currentTime+.012);g.gain.exponentialRampToValueAtTime(.001,audio.ctx.currentTime+len);o.connect(g).connect(audio.master);o.start();o.stop(audio.ctx.currentTime+len);}
function initAudio(){if(audio){audio.ctx.resume();return;}const ac=new(window.AudioContext||window.webkitAudioContext)(),master=ac.createGain();master.gain.value=.5;master.connect(ac.destination);audio={ctx:ac,master};[49,73.42,98.15].forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;o.type='sine';g.gain.value=.022/(i+1);o.connect(g).connect(master);o.start();});}
function toggleSound(){initAudio();muted=!muted;audio.master.gain.setTargetAtTime(muted?0:.5,audio.ctx.currentTime,.2);$('#sound').textContent=muted?'SOUND OFF':'SOUND ON';}
$('#sound').onclick=toggleSound;
function say(s,d=5){$('#subtitle').textContent=s;$('#subtitle').style.opacity=1;subtitleTime=d;}
function save(){try{localStorage.setItem('last-cue-save',JSON.stringify({version:1,act,flags,notes,weights,focus,elapsed:time-started}));$('#save-note').textContent='◇ 記録しました';saveTimer=3;}catch{$('#save-note').textContent='保存できません（ストレージ無効）';}}
function load(){try{const s=JSON.parse(localStorage.getItem('last-cue-save'));return Rules.validSave(s)?s:null;}catch{return null;}}
if(load())$('#continue').hidden=false;
function updateHud(){$('#act-number').textContent='ACT '+acts[act].roman;$('#act-name').textContent=acts[act].title;$('#objective').textContent=acts[act].objective;$('#inventory').textContent=flags.fuse&&!flags.power?'◇ 陶器のヒューズ':flags.score?'◇ 最後の楽譜':'◇ 宛先のない招待状';}
function chapter(index,show=true){act=index;p={x:200,z:0,y:0,vy:0,dir:1,walk:0};chaseX=-260;chaseTime=0;stumble=0;cam={x:550,y:440,zoom:acts[act].zoom};lampInput=[];updateHud();save();$('#subtitle').textContent='';subtitleTime=0;if(show){const el=$('#chapter-card');el.hidden=true;void el.offsetWidth;el.hidden=false;el.querySelector('span').textContent='ACT '+acts[act].roman;el.querySelector('h2').textContent=acts[act].title;el.querySelector('p').textContent=acts[act].line;cardTime=4.6;}if(act===0)say('「終演までに、お届けください。」招待状にはそれだけ。',7);if(act===3)say('あれは、観客じゃない。走って。',6);}
function start(resume=false){initAudio();if(muted)toggleSound();mode='play';$('#title').hidden=true;$('#title-bottom').hidden=true;$('#hud').hidden=false;$('#ending').hidden=true;$('#touch').hidden=!matchMedia('(pointer:coarse)').matches;started=time;flags={};notes=[];weights=[0,0,0];focus=[0,0,0];let a=0;if(resume){const s=load();if(s){a=s.act;flags=s.flags;notes=s.notes;weights=Array.isArray(s.weights)&&s.weights.length===3?s.weights:[0,0,0];focus=Array.isArray(s.focus)&&s.focus.length===3?s.focus:[0,0,0];}}chapter(a);}
$('#start').onclick=()=>start();$('#continue').onclick=()=>start(true);$('#again').onclick=()=>start();
function cut(x,zoom,lineText,duration=3.5){cinematic={x,zoom,left:duration,duration};if(lineText)say(lineText,duration+1);sound(100,1,'sine',.18);}
function openModal(kicker,title,body,buttons=[]){mode='modal';keys.clear();$('#modal').hidden=false;$('#modal-kicker').textContent=kicker;$('#modal-title').textContent=title;$('#modal-body').innerHTML=body;$('#modal-actions').replaceChildren();buttons.forEach(([label,fn])=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;$('#modal-actions').append(b);});$('#modal-close').focus();}
function closeModal(){if(mode==='modal'){mode='play';$('#modal').hidden=true;keys.clear();}}
$('#modal-close').onclick=closeModal;
function note(id,title,body){if(!notes.includes(id))notes.push(id);openModal('ARCHIVE / '+String(id+1).padStart(2,'0'),title,body);save();}
const hints=[
  '受付の引き出し（入口の右）にヒューズがある。右端の配電盤に取り付けよう。',
  '「雨 → 灯 → 月」。照明の印を見よう。中央の雨、左の灯、右の月の順。',
  '奥の作業台に錘の記録がある。左から 2・4・1 に合わせる。',
  'Shift を押しながら右へ。木箱の手前で Space。右端の非常灯で E。',
  '舞台左の楽譜に「二・一・三」。光の角度を左から 2・1・3 に合わせ、鐘を鳴らす。'
];
function journal(){if(mode!=='play')return;openModal('THE COURIER’S NOTES','配達人の手帳',`<p>${acts[act].line}</p><p class="note">${acts[act].objective}</p><p>収集した記録：${notes.length} / 4<br>どの幕からでも、最後の合図へ進むことができます。</p>`,[['行き詰まったら',()=>{$('#modal-body').innerHTML+=`<p class="note">${hints[act]}</p>`;$('#modal-actions').replaceChildren();}]]);}
$('#journal-button').onclick=journal;
function pause(){if(mode==='play'){mode='pause';keys.clear();$('#pause').hidden=false;$('#resume').focus();}else if(mode==='pause'){mode='play';$('#pause').hidden=true;}}
$('#pause-button').onclick=pause;$('#resume').onclick=pause;$('#motion').onclick=()=>{reduced=!reduced;$('#motion').textContent='カメラの揺れ：'+(reduced?'なし':'あり');};$('#restart').onclick=()=>{pause();chapter(act,false);};
const objects=[
 [{x:520,name:'受付の引き出し',id:'fuse'},{x:1180,name:'置き去りの手紙',id:'letter'},{x:2580,name:'配電盤',id:'power'},{x:2920,name:'客席へ',id:'door0'}],
 [{x:500,name:'古い上演記録',id:'program'},{x:1100,name:'灯の照明',id:'lamp0'},{x:1680,name:'雨の照明',id:'lamp1'},{x:2260,name:'月の照明',id:'lamp2'},{x:3160,name:'舞台裏へ',id:'door1'}],
 [{x:700,name:'釣合い錘',id:'weights'},{x:2270,name:'舞台監督の記録',id:'rig-note'},{x:3060,name:'搬入口へ',id:'door2'}],
 [{x:3510,name:'非常灯のレバー',id:'emergency'},{x:3750,name:'大舞台へ',id:'door3'}],
 [{x:530,name:'最後の楽譜',id:'score'},{x:1420,name:'照明の角度',id:'focus'},{x:2390,name:'終演の鐘',id:'bell'},{x:3180,name:'夜明けへ',id:'exit'}]
];
function interact(){if(mode!=='play'||!near||cardTime>0||cinematic)return;const id=near.id;sound(320,.12,'triangle',.05);
if(id==='fuse'){if(!flags.fuse){flags.fuse=true;say('まだ使えそうな、陶器のヒューズ。');cut(2580,.84,'奥の配電盤まで、電線が続いている。');save();updateHud();}else say('引き出しは空だ。');}
else if(id==='letter')note(0,'配達されなかった手紙','<p class="note">最後のお客様へ。<br>灯りを落とす前に、月を空に戻してください。<br>舞台に取り残されたものは、暗闇では帰れません。</p><p>封筒の宛名は、雨で消えている。</p>');
else if(id==='power'){if(!flags.fuse)say('ヒューズがない。受付を探そう。');else if(!flags.power){flags.power=true;updateHud();cut(2890,.8,'電気が戻った。客席の扉が、ゆっくりと開く。');save();}else say('電気は流れている。右の扉へ。');}
else if(id==='door0'){if(flags.power)chapter(1);else say('電気錠が眠っている。');}
else if(id==='program')note(1,'第七夜「帰り道」','<p>照明係へ。客席の印に従って、合図を送ること。</p><p class="note">一、雨が街を包む。<br>二、灯が窓にともる。<br>三、月が帰り道を照らす。</p><p>間違えたら、最初の合図からやり直し。</p>');
else if(id.startsWith('lamp')){if(flags.lamps){say('三つの光が、舞台裏を照らしている。');return;}const n=Number(id.slice(-1));if(n===Rules.lampOrder[lampInput.length]){lampInput.push(n);sound(330+lampInput.length*110,.6,'sine',.13);say(['一つ目の合図。','二つ目。光がつながる。','最後の合図。'][lampInput.length-1],2);if(lampInput.length===3){flags.lamps=true;cut(3070,.68,'無人の客席から、一度だけ拍手が聞こえた。');save();}}else{lampInput=[];sound(60,.6,'sawtooth',.035);say('順番が違う。明かりが消えた。上演記録を思い出そう。');}}
else if(id==='door1'){if(flags.lamps)chapter(2);else say('奥の扉は、三つの合図を待っている。');}
else if(id==='rig-note')note(2,'釣合いの記録','<p>古い滑車は、正しい重さでなければ動かない。</p><p class="note">左：二枚の鉄板。<br>中央：四枚の鉄板。<br>右：一枚の鉄板。</p><p>月が昇れば、搬入口が開く。<br>音を立てないこと。あれは、開演の音を覚えている。</p>');
else if(id==='weights')weightModal();
else if(id==='door2'){if(flags.rig)chapter(3);else say('月の装置が、出口を塞いでいる。');}
else if(id==='emergency'){if(!flags.safe){flags.safe=true;cut(3220,.72,'光の中では、拍手の主も、ただの影だった。',4.5);save();}else say('もう、追ってこない。大舞台へ。');}
else if(id==='door3'){if(flags.safe)chapter(4);else say('先に、非常灯を！');}
else if(id==='score'){flags.score=true;updateHud();note(3,'最後の楽譜','<p class="note">月に、三つの光を。<br>左から、二・一・三。<br>光が重なるとき、鐘を一度。<br>それが、終演の合図。</p><p>楽譜の下に、小さく「ありがとう」と書かれていた。</p>');}
else if(id==='focus')focusModal();
else if(id==='bell'){if(!flags.focus)say('月はまだ暗い。三つの光を集めよう。');else if(!flags.final){flags.final=true;cut(2520,.61,'最後の鐘が、劇場の記憶をほどいていく。',7);[260,390,520,780].forEach((f,i)=>setTimeout(()=>sound(f,3,'sine',.12),i*350));save();}else say('幕が開いた。右の出口から、夜明けへ。');}
else if(id==='exit'){if(flags.final){mode='ending';endingTime=time;$('#hud').hidden=true;$('#touch').hidden=true;$('#ending').hidden=false;try{localStorage.removeItem('last-cue-save');}catch{} }else say('最後の上演を、終わらせなくては。');}}
function weightModal(){if(flags.rig){say('錘は釣り合っている。右の搬入口へ。');return;}openModal('STAGE MACHINERY / 03','月を吊るすもの',`<p>左・中央・右の錘を調整する。目盛りは 0 から 4。</p><div class="puzzle-display">${weights.map(n=>`<span>${n}</span>`).join('')}</div>`,[['左 ＋',()=>{weights[0]=(weights[0]+1)%5;sound(100,.2,'triangle');weightModal();}],['中央 ＋',()=>{weights[1]=(weights[1]+1)%5;sound(110,.2,'triangle');weightModal();}],['右 ＋',()=>{weights[2]=(weights[2]+1)%5;sound(120,.2,'triangle');weightModal();}],['滑車を引く',()=>{if(Rules.matches(weights,Rules.weights)){flags.rig=true;closeModal();cut(2450,.72,'吊られた月が、音もなく持ち上がる。',4);save();}else{$('#modal-body').innerHTML+='<p class="note">まだ釣り合わない。奥の作業台に記録がある。</p>';sound(60,.4,'sawtooth',.03);}}]]);}
function focusModal(){if(flags.focus){say('三つの光が揃った。右の鐘を鳴らそう。');return;}openModal('LIGHTING DESK / 05','月に光を',`<p>三台の灯体を回し、楽譜の角度へ合わせる。</p><div class="puzzle-display">${focus.map(n=>`<span>${n}</span>`).join('')}</div>`,[['左 ↻',()=>{focus[0]=(focus[0]+1)%4;focusModal();}],['中央 ↻',()=>{focus[1]=(focus[1]+1)%4;focusModal();}],['右 ↻',()=>{focus[2]=(focus[2]+1)%4;focusModal();}],['点灯',()=>{if(Rules.matches(focus,Rules.focus)){flags.focus=true;closeModal();cut(2050,.69,'月が、夜を思い出した。',4);save();}else{$('#modal-body').innerHTML+='<p class="note">光がすれ違う。楽譜の「二・一・三」を確かめよう。</p>';sound(80,.3);}}]]);}
$('#interact').onclick=interact;
addEventListener('keydown',e=>{if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();if(e.repeat)return;const k=e.key.length===1?e.key.toLowerCase():e.key;keys.add(k);if(k==='e')interact();if(k==='j')journal();if(k==='m')toggleSound();if(k==='Escape'){if(mode==='modal')closeModal();else pause();}if(k==='r'&&location.search.includes('capture'))beginCapture();});
addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
addEventListener('blur',()=>{keys.clear();if(mode==='play')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause();});
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);}
function beginCapture(){if(recording||mode!=='play')return;recording={frame:0,next:0,pending:[],small:document.createElement('canvas')};recording.small.width=768;recording.small.height=480;say('プレイ映像を12秒間記録しています。',2);}
async function captureFrame(dt){if(!recording)return;recording.next-=dt;if(recording.next>0)return;recording.next+=.1;const r=recording;r.small.getContext('2d').drawImage(canvas,0,0,768,480);const frame=r.frame++;r.pending.push(new Promise(resolve=>r.small.toBlob(async blob=>{try{const resp=await fetch('/capture?frame='+frame,{method:'POST',body:blob});resolve(resp.ok);}catch{resolve(false);}},'image/png')));if(r.frame>=120){recording=null;const results=await Promise.all(r.pending);say(results.every(Boolean)?'記録完了：120フレーム':'記録に失敗したフレームがあります。',4);}}
function update(dt){time+=dt;if(mode!=='play')return;if(cardTime>0){cardTime-=dt;if(cardTime<=0)$('#chapter-card').hidden=true;}if(subtitleTime>0){subtitleTime-=dt;if(subtitleTime<=0)$('#subtitle').style.opacity=0;}if(saveTimer>0){saveTimer-=dt;if(saveTimer<=0)$('#save-note').textContent='';}
if(cinematic){cinematic.left-=dt;if(cinematic.left<=0)cinematic=null;}
const canMove=cardTime<=0&&!cinematic;
let move=canMove?((keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0)):0;
const run=keys.has('Shift'),speed=(run?285:170)*(stumble>0?.35:1);stumble=Math.max(0,stumble-dt);
if(move){p.dir=move;p.walk+=dt*(run?14:9);const prev=Math.floor(p.walk/Math.PI);p.x+=move*speed*dt;if(Math.floor((p.walk+dt*10)/Math.PI)!==prev&&p.y===0)sound(65+hash(p.x)*30,.07,'triangle',.035);}
if(canMove){p.z+=((keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0))*100*dt;p.z=Math.max(-75,Math.min(75,p.z));if(keys.has(' ')&&p.y===0){p.vy=420;sound(140,.14,'triangle',.03);}}
p.y+=p.vy*dt;p.vy-=1000*dt;if(p.y<0){p.y=0;p.vy=0;}p.x=Math.max(100,Math.min(acts[act].width-100,p.x));
if(act===3&&!flags.safe&&canMove){if(chaseTime===0&&!move)return;chaseTime+=dt;chaseX+=dt*278;if(Rules.obstacleHit(p.x,p.y,[1150,1950,2750])&&stumble===0){stumble=.85;p.x+=p.dir*50;say('Space で飛び越える！',2);sound(70,.25,'sawtooth',.05);}if(chaseX>p.x-25){chaseX=p.x-420;stumble=0;say('影が迫る。走って、光へ。',3);if(chaseTime>8){p.x=200;chaseX=-300;chaseTime=0;say('幕が巻き戻る。Shift で走り、Space で装置を跳ぶ。',5);}}}
near=objects[act].filter(o=>Math.abs(o.x-p.x)<115).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0]||null;
$('#interact').hidden=!near||!!cinematic||cardTime>0;if(near)$('#interact span').textContent=near.name;
const scene=acts[act],look=move*(run?160:90),cx=cinematic?cinematic.x:Math.max(520,Math.min(scene.width-500,p.x+look+(act===3?150:0))),cz=cinematic?cinematic.zoom:scene.zoom+(act===0&&p.x<800?.09:0)+(act===3&&run?-.05:0);
const damp=1-Math.exp(-dt*(cinematic?1.7:3));cam.x+=(cx-cam.x)*damp;cam.zoom+=(cz-cam.zoom)*(1-Math.exp(-dt*1.5));cam.y+=(455+p.z*.1-cam.y)*damp;
}
function wall(a){const width=acts[a].width;const bg=ctx.createLinearGradient(0,-100,0,760);bg.addColorStop(0,'#0d191d');bg.addColorStop(.65,a===2?'#27302c':'#263637');bg.addColorStop(1,'#131e20');rect(-1200,-500,width+2400,1500,bg);
// Plaster, water stains and picture rails.
for(let i=0;i<70;i++){const x=hash(i+9)*width;rect(x,90+hash(i+1)*180,1+hash(i+2)*4,180+hash(i+8)*220,'#070d0f13');}
for(let y of [155,180,550,562]){line(-300,y,width+300,y,'#ac9c6a20',2);}
for(let x=0;x<width;x+=280){rect(x,182,2,367,'#9a936422');rect(x+18,200,242,330,'#05121620');line(x+18,200,x+260,200,'#a99d7425');}
}
function floor(a){const width=acts[a].width;path([[-1000,610],[width+1000,610],[width+1600,1100],[-1600,1100]],'#1b2526');
for(let y=620;y<1050;y+=22){line(-1500,y,width+1500,y,'#a49b7320');line(-1500,y+2,width+1500,y+2,'#080e1190');}
for(let x=-800;x<width+1000;x+=135)line(x,610,x+(x-cam.x)*.6,1100,'#060e1370');
if(a===0||a===1){path([[-400,650],[width+400,650],[width+500,730],[-500,730]],'#492b2c');line(-400,655,width+500,655,'#ba915341',2);line(-400,725,width+500,725,'#ba915341',2);for(let x=0;x<width;x+=85)path([[x,685],[x+14,673],[x+28,685],[x+14,697]],null,'#b0956c27');}
for(let i=0;i<25;i++){const x=hash(i+31)*width,y=625+hash(i+71)*80;path([[x,y],[x+13,y-2],[x+18,y+6],[x+3,y+7]],'#a49b7430');}
}
function column(x){rect(x-22,120,44,490,'#182629');rect(x-15,130,9,470,'#77807724');rect(x+10,135,7,460,'#050d1255');rect(x-36,110,72,18,'#51584b');rect(x-30,133,60,9,'#91856344');rect(x-34,595,68,20,'#101c20');rect(x-40,612,80,12,'#38413a');}
function lamp(x,y,on=true){line(x,y-80,x,y,'#091418',3);path([[x-19,y],[x+19,y],[x+28,y+26],[x-28,y+26]],'#161c1c','#7d7651',2);rect(x-24,y+25,48,3,on?'#d6c595':'#695f42');if(on){glow(x,y+27,110,'#c0b47216');beam(x,y+28,x+50,680,150,.105);}}
function poster(x,y,title,sub){rect(x-64,y-4,128,175,'#0a171a');rect(x-60,y,120,165,'#9c9672');rect(x-54,y+6,108,152,'#182d30');ctx.strokeStyle='#b0a278';ctx.lineWidth=1;ctx.strokeRect(x-48,y+12,96,140);text('THÉÂTRE',x,y+31,9);text('Z A N K Y O',x,y+45,10);ellipse(x,y+84,24,24,'#a59e79');ellipse(x+9,y+78,21,22,'#182d30');text(title,x,y+126,16,'#c3ba92');text(sub,x,y+143,8,'#8c9d91');}
function door(x,on,label){arch(x-90,315,180,295,'#080f14','#6f755d');rect(x-67,360,134,249,on?'#6c827458':'#122024');rect(x-60,370,55,214,'#071114');rect(x+5,370,55,214,'#091518');line(x,366,x,610,'#96815b',2);ellipse(x+12,485,3,3,'#bba570');text(label,x,303,12,on?'#c0b68a':'#778475');if(on){beam(x,360,x+40,710,105,.12);glow(x,470,170,'#9aab6c18');}rect(x-100,610,200,10,'#5b604d');}
function curtain(x,y,w,h,open=.15){const amount=w*(.47-open*.25);for(let side of [0,1]){ctx.save();if(side){ctx.translate(x+w,0);ctx.scale(-1,1);}else ctx.translate(x,0);const g=ctx.createLinearGradient(0,0,amount,0);g.addColorStop(0,'#161b20');g.addColorStop(.25,'#45272c');g.addColorStop(.5,'#623734');g.addColorStop(.8,'#36262c');g.addColorStop(1,'#182025');path([[0,y],[amount,y],[amount*.85,y+h*.5],[amount*.55,y+h],[0,y+h]],g);for(let f=10;f<amount;f+=21){ctx.beginPath();ctx.moveTo(f,y);ctx.bezierCurveTo(f*.98,y+h*.3,f*.7,y+h*.7,f*.54,y+h);ctx.strokeStyle=f%3?'#bb77621b':'#080e1455';ctx.lineWidth=7;ctx.stroke();}line(0,y+h-12,amount*.55,y+h-12,'#b0955c55',3);ctx.restore();}path([[x,y],[x+w,y],[x+w*.86,y+80],[x+w*.65,y+110],[x+w*.5,y+82],[x+w*.35,y+110],[x+w*.14,y+80]],'#482b2d','#a38b552f',3);}
function seat(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,8,33,7,'#07101466');arch(-24,-45,48,54,'#352b2b','#605344');rect(-25,-7,50,13,'#4b3430');rect(-32,-21,8,30,'#161f20');rect(24,-21,8,30,'#161f20');line(-19,6,-21,22,'#0a151a',4);line(19,6,21,22,'#0a151a',4);ctx.restore();}
function spool(x,y){rect(x-64,y,128,18,'#494938');rect(x-53,y+18,10,75,'#1c2524');rect(x+43,y+18,10,75,'#1c2524');ellipse(x,y-16,23,23,'#7e785c');ellipse(x,y-16,16,16,'#202d2a');for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ellipse(x+Math.cos(a)*10,y-16+Math.sin(a)*10,4,4,'#a39a73');}rect(x+30,y-9,26,8,'#b4ad8d');}
function apparatus(x,y,label,on=false){rect(x-30,y-68,60,68,'#172728');ctx.strokeStyle='#95865f66';ctx.strokeRect(x-30,y-68,60,68);ellipse(x,y-42,12,12,on?'#d0c18e':'#546655');line(x,y-42,x+14,y-60,'#b5a476',4);rect(x-35,y,70,8,'#111c20');text(label,x,y-85,15,on?'#dfd1a0':'#a6b299');if(on)glow(x,y-42,65,'#cab96c22');}
function scene(a){wall(a);const width=acts[a].width;
if(a===0){for(let x=300;x<width;x+=680){arch(x-140,200,280,400,'#0f2025','#54604f');column(x-160);column(x+160);}poster(1180,340,'最終公演','THE LAST PERFORMANCE');rect(380,445,280,170,'#182829');rect(390,430,260,20,'#8a805a');for(let x=400;x<650;x+=35)rect(x,310,3,120,'#807957');arch(420,290,200,140,'#0b181d','#9e8e61');rect(380,445,280,15,'#66684d');text('B I L L E T S',520,477,13);rect(460,535,120,40,'#354035');rect(515,550,24,4,'#b4a273');lamp(560,245,true);lamp(1900,250,!!flags.power);apparatus(2580,590,'POWER',!!flags.power);door(2920,!!flags.power,'AUDITORIUM');}
if(a===1){for(let row=0;row<4;row++){let y=450+row*43;for(let x=750;x<2800;x+=80)seat(x+(row%2)*40,y,.6+row*.08);}for(let x=100;x<width;x+=520){arch(x,170,400,220,'#0c1c22','#7b77584f');line(x,375,x+400,375,'#a38c5c88',4);for(let b=x+15;b<x+400;b+=30)line(b,330,b,375,'#8a815c',2);column(x-30);}poster(500,360,'帰り道','RAIN / LIGHT / MOON');[1100,1680,2260].forEach((x,i)=>{lamp(x,190,flags.lamps||lampInput.includes(i));apparatus(x,620,['灯','雨','月'][i],flags.lamps||lampInput.includes(i));});door(3160,!!flags.lamps,'BACKSTAGE');}
if(a===2){for(let x=150;x<width;x+=400){rect(x,120,12,490,'#0c1b20');line(x,130,x+360,590,'#374139',5);line(x+360,130,x,590,'#374139',5);}for(let x=560;x<900;x+=140){line(x,130,x,510,'#9c947455',3);ellipse(x,150,22,22,'#182523');ellipse(x,150,16,16,'#75806a');line(x-16,150,x-16,520,'#b0a07a',2);for(let i=0;i<4;i++)rect(x-36,420+i*22,40,18,'#566051');}apparatus(700,615,'COUNTERWEIGHT',!!flags.rig);spool(2270,536);lamp(2270,230);const moonY=500-250*visual.rig;line(2650,80,2650,moonY,'#8d8e6d',2);ellipse(2650,moonY,96,96,'#a4ad8c');ellipse(2681,moonY-25,87,87,'#253333');door(3060,!!flags.rig,'LOADING BAY');}
if(a===3){for(let x=120;x<width;x+=370){rect(x,100,16,510,'#0a191e');rect(x-12,100,40,18,'#6c715a');lamp(x+80,250,flags.safe||x%3===0);line(x,540,x+330,540,'#627060',4);rect(x+175,395,98,215,'#172328');line(x+180,400,x+266,600,'#4b5141',3);}for(let x of [1150,1950,2750]){rect(x-40,642,80,38,'#514a35');path([[x-40,642],[x-28,632],[x+52,632],[x+40,642]],'#6e6346');line(x-34,648,x+34,676,'#9c8b5b',3);line(x+34,648,x-34,676,'#9c8b5b',3);}text('非常灯 →',3360,410,28,'#a0b49a');apparatus(3510,610,'EMERGENCY',!!flags.safe);door(3750,!!flags.safe,'STAGE');if(flags.safe){beam(3350,160,3200,710,370,.3);} }
if(a===4){arch(790,50,2160,570,'#09151d','#827b57');arch(870,115,2000,490,'#0b1920','#b19a5c55');for(let x of [820,2920]){column(x);column(x+45);}for(let x=1000;x<2900;x+=120){line(x,125,x,180,'#b0a47366');ellipse(x,185,4,4,'#baaa77');}const moonY=300;glow(2050,moonY,300,flags.focus?'#c7cf9d21':'#657f8713');ellipse(2050,moonY,112,112,flags.focus?'#bcc6aa':'#667d79');ellipse(2090,moonY-32,99,99,'#0c1a21');for(let i=0;i<20;i++){let x=1100+hash(i+2)*1700,y=200+hash(i+3)*280;ellipse(x,y,1.8,1.8,'#94a68a55');}curtain(850,85,2050,530,.3+visual.curtain*.9);spool(530,540);apparatus(1420,620,'LIGHTING',!!flags.focus);for(let [i,x]of [1200,1800,2590].entries()){lamp(x,170,false);if(flags.focus)beam(x,197,2050,615,140,.12);else beam(x,197,x+(focus[i]-1)*130,650,100,.035);}line(2390,300,2390,600,'#ae9a6a',2);path([[2370,350],[2410,350],[2422,386],[2358,386]],'#a89665');ellipse(2390,388,34,6,'#61563c');door(3180,!!flags.final,'SORTIE');if(flags.final){beam(3180,320,2900,750,360,.35);glow(3180,500,400,'#cecd9629');}}
floor(a);
// Small readable pools of light anchor every interaction in the space.
for(const o of objects[a]){ellipse(o.x,682,32,4,'#b4b58412');if(mode==='play'&&near===o){path([[o.x,520],[o.x+5,526],[o.x,532],[o.x-5,526]],'#d4c59b');}}
}
function person(x,y,scale=1,shadow=false){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);if(shadow){const sway=Math.sin(time*2)*7;path([[-24,-136],[-35,-60],[-52,-8],[38,-8],[24,-78],[17,-135]],'#060f15');ellipse(-3,-148,17,23,'#081219');line(-26,-111,-55-sway,-39,'#071018',10);line(20,-111,46+sway,-44,'#071018',10);line(-12,-20,-18+Math.sin(time*9)*13,12,'#071018',10);line(15,-20,18-Math.sin(time*9)*13,12,'#071018',10);ellipse(2,-151,2,2,'#d2c79a');ctx.restore();return;}
const moving=mode==='play'&&(keys.has('a')||keys.has('d')||keys.has('ArrowLeft')||keys.has('ArrowRight'))&&!cinematic&&cardTime<=0;const stride=moving?Math.sin(p.walk)*13:Math.sin(time*2)*1.4,bob=moving?Math.abs(Math.sin(p.walk))*2:Math.sin(time*2)*1;
ctx.translate(0,-bob);ctx.scale(p.dir,1);line(-7,-30,-9+stride,0,'#15232a',8);line(8,-30,10-stride,0,'#132028',8);line(-9+stride,0,-1+stride,0,'#11191e',6);line(10-stride,0,18-stride,0,'#11191e',6);
const coat=ctx.createLinearGradient(-18,-70,20,-20);coat.addColorStop(0,'#67716c');coat.addColorStop(.5,'#8d9682');coat.addColorStop(1,'#364a49');path([[-12,-72],[12,-72],[20,-27],[-21,-27]],coat);line(-3,-64,-3,-30,'#bac0a166');path([[-10,-74],[0,-63],[10,-75]],'#afad89');line(12,-63,21+stride*.25,-43,'#73847a',7);ellipse(21+stride*.25,-41,4,4,'#b8ad89');path([[-13,-66],[-23,-40],[-16,-37],[-5,-63]],'#455a58');ellipse(0,-86,12,15,'#b0ac8a');path([[-14,-88],[-10,-100],[5,-102],[14,-92],[5,-90],[4,-82],[-9,-79]],'#263536');path([[-15,-91],[13,-91],[16,-87],[-17,-87]],'#344744');ellipse(9,-85,1.2,1.6,'#203033');line(-13,-68,13,-35,'#b6a372',3);rect(5,-39,22,19,'#7b6444');line(6,-33,25,-33,'#ac9261');glow(25,-44,42,'#f7d18110');ellipse(27,-44,3,5,'#cbbc87');ctx.restore();}
function foreground(a){ctx.save();const width=acts[a].width;if(a===1||a===4){for(let x=-200;x<width+200;x+=118)seat(x,850,1.8);}else{for(let x=0;x<width;x+=1300){rect(x-40,0,65,1000,'#071116dd');line(x+30,0,x+30,900,'#60706533',2);if(a===2){for(let j=0;j<5;j++)line(x+70+j*15,0,x+75+j*15,850,'#07131799',4);}}}ctx.restore();}
function render(){visual.rig+=(Number(!!flags.rig)-visual.rig)*.018;visual.curtain+=(Number(!!flags.final)-visual.curtain)*.009;visual.light+=(Number(!!flags.focus)-visual.light)*.025;const sx=canvas.width/W,sy=canvas.height/H;ctx.setTransform(sx,0,0,sy,0,0);rect(0,0,W,H,'#101b20');
let a=act,cx=cam.x,cy=cam.y,z=cam.zoom;
if(mode==='title'){a=4;cx=1900+Math.sin(time*.12)*24;cy=430;z=.64;}
if(mode==='ending'){a=4;cx=2850;cy=420;z=.65;}
// Camera space, parallax and filmic reframing; simulation is independent of viewport.
const shake=act===3&&!flags.safe&&mode==='play'&&!reduced?Math.sin(time*25)*1.2:0;
ctx.save();ctx.translate(W/2+shake,H/2);ctx.scale(z,z);ctx.translate(-cx,-cy);scene(a);
if(mode==='title'){ellipse(2230,FLOOR+6,42,7,'#050b1199');person(2230,FLOOR,1.1);}else{ellipse(p.x,FLOOR+p.z*.35+5,30-p.y*.08,7,'#07101588');person(p.x,FLOOR+p.z*.35-p.y,1+p.z*.001);if(act===3&&!flags.safe){glow(chaseX,FLOOR-100,170,'#020710aa');person(chaseX,FLOOR,2.1,true);}}
ctx.save();ctx.globalCompositeOperation='screen';for(const q of particles){let x=(q.x+time*(q.s*5+2))%(acts[a].width+500)-100;let y=q.y+Math.sin(time*.3+q.x)*7;ellipse(x,y,q.r,q.r,'#d7d9ae'+(q.s>.6?'40':'19'));}ctx.restore();
// Low haze, with layers moving at different speeds.
for(let i=0;i<7;i++){const x=(i*630+Math.sin(time*.06+i)*130);const fog=ctx.createRadialGradient(x,660,0,x,660,370);fog.addColorStop(0,'#9abca00c');fog.addColorStop(1,'transparent');ctx.fillStyle=fog;ctx.fillRect(x-370,520,740,280);}
ctx.restore();
ctx.save();ctx.translate(W/2,H/2);ctx.scale(z*1.16,z*1.16);ctx.translate(-cx,-cy);foreground(a);ctx.restore();
// Lens falloff and letterbox; unobstructed central playable band.
const v=ctx.createRadialGradient(W*.57,H*.47,200,W*.52,H*.48,850);v.addColorStop(0,'#07101400');v.addColorStop(1,'#03090ed9');rect(0,0,W,H,v);
if(mode==='title'){const g=ctx.createLinearGradient(0,0,1000,0);g.addColorStop(0,'#071216ed');g.addColorStop(.43,'#071216a8');g.addColorStop(1,'#07121600');rect(0,0,W,H,g);text('THE LAST PERFORMANCE',1015,764,9,'#b9b28d65');}
let bar=mode==='title'?0:cinematic?68:34;rect(0,0,W,bar,'#070d11');rect(0,H-bar,W,bar,'#070d11');
if(act===3&&!flags.safe&&mode==='play'){const danger=Math.max(0,1-(p.x-chaseX)/450);rect(0,0,8,H,`rgba(159,73,52,${danger*.6})`);}
}
function loop(now){const dt=Math.min((now-last)/1000,.05);last=now;update(dt);if(mode==='title'||mode==='ending')time+=dt;render();captureFrame(dt);requestAnimationFrame(loop);}requestAnimationFrame(loop);
// Explicit local QA entry. This does not exist in the normal player interface.
if(new URLSearchParams(location.search).has('qa')){
  const b=document.createElement('button');b.className='text-button';b.textContent='QA：追跡の再検証';
  b.onclick=()=>{start();chapter(3,false);cardTime=0;$('#chapter-card').hidden=true;};
  $('#title').append(b);
}
