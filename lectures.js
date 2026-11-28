/* Lectures: slide viewer with optional YouTube video that follows the slides. */
(function(){
const root=document.getElementById('lecRoot');if(!root)return;
const data=window.LECTURES||[];
const $=(s,r=root)=>r.querySelector(s);
const pad=n=>String(n).padStart(3,'0');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=s=>{s=Math.max(0,s|0);const h=s/3600|0,m=(s%3600)/60|0,x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const store={get(k){try{return localStorage.getItem('uobcom-lec-'+k)}catch(e){return null}},set(k,v){try{localStorage.setItem('uobcom-lec-'+k,v)}catch(e){}}};
const BASE='https://www.youtube-nocookie.com/embed/';
let teardown=null, post=()=>{};

function setHash(h){try{history.replaceState(null,'',h)}catch(e){}}

function showList(){
 if(teardown){teardown();teardown=null}
 post=()=>{};
 const groups=[];data.forEach(l=>{let g=groups.find(x=>x.s===l.subject);if(!g)groups.push(g={s:l.subject,items:[]});g.items.push(l)});
 root.innerHTML=`<div class="pagehead lecs-head"><div><h2>Lectures</h2><div class="sub">Slides with video, right in your browser · المحاضرات</div></div></div>`+
 (groups.length?groups.map(g=>`<div class="lecgroup"><h3>${esc(g.s)}</h3><div class="lecrows">${g.items.map(l=>`<button class="lecrow" data-id="${esc(l.id)}"><span><b>${esc(l.title)}</b><small>${l.slides} slides${l.video?'<span class="vtag">Video</span>':''}</small></span><span class="go" aria-hidden="true">→</span></button>`).join('')}</div></div>`).join(''):'<div class="lecempty">No lectures yet. They will appear here.</div>');
 root.querySelectorAll('.lecrow').forEach(b=>b.onclick=()=>{open(b.dataset.id);scrollTo({top:0})});
 if(location.hash.startsWith('#lectures/'))setHash('#lectures');
}

function open(id,startSlide){
 const lec=data.find(l=>l.id===id);if(!lec)return showList();
 if(teardown){teardown();teardown=null}
 const n=lec.slides,dir=`lectures/${lec.id}/`;
 const sync=(lec.sync||[]).map(a=>({slide:+a[0],t:+a[1],label:a[2]||''})).sort((a,b)=>a.slide-b.slide);
 const clamp=v=>Math.min(n,Math.max(1,v|0||1));
 let i=clamp(startSlide||store.get(id)||1);
 root.innerHTML=`
 <div class="lv-bar"><button class="lvbtn" id="lvBack" type="button">‹ All lectures</button><div><h2>${esc(lec.title)}</h2><div class="sub">${esc(lec.subject)} · ${n} slides</div></div></div>
 <div class="lv-grid ${lec.video?'has-video':''}">
  <div class="lv-main">
   <div class="stage" id="stage" role="group" aria-label="Slide viewer" style="aspect-ratio:${lec.aspect||'16/9'}">
    <img id="slide" alt="">
    <button class="nb prev" id="nbPrev" type="button" aria-label="Previous slide">‹</button>
    <button class="nb next" id="nbNext" type="button" aria-label="Next slide">›</button>
    <span class="badge-n tnum" id="badge"></span>
   </div>
   <div class="ctrl">
    <button class="lvbtn" id="cPrev" type="button" aria-label="Previous slide">‹</button>
    <span class="cnt" id="cnt" aria-live="polite"></span>
    <button class="lvbtn" id="cNext" type="button" aria-label="Next slide">›</button>
    <input class="scrub" id="scrub" type="range" min="1" max="${n}" value="${i}" aria-label="Slide number">
    <button class="lvbtn" id="fs" type="button" aria-label="Full screen">⛶</button>
   </div>
   <div class="thumbs" id="thumbs">${Array.from({length:n},(_,k)=>`<button class="thumb" type="button" data-n="${k+1}" aria-label="Go to slide ${k+1}"><img loading="lazy" decoding="async" alt="" src="${dir}t-${pad(k+1)}.webp"><i>${k+1}</i></button>`).join('')}</div>
   <p class="hint">Arrow keys to move · F for full screen</p>
  </div>
  ${lec.video?`<aside class="lv-video"><div class="vwrap"><iframe id="yt" title="Lecture video" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" src="${BASE}${esc(lec.video)}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1"></iframe></div>
   ${sync.length?`<label class="follow"><input type="checkbox" id="follow" checked> Video follows slides</label>
   <ul class="chapters" id="chapters">${sync.map((s,k)=>`<li><button type="button" data-k="${k}"><time>${fmt(s.t)}</time><span class="ch-label">Slide ${s.slide}${s.label?' · '+esc(s.label):''}</span></button></li>`).join('')}</ul>`:''}
  </aside>`:''}
 </div>`;
 const img=$('#slide'),stage=$('#stage'),yt=$('#yt'),follow=$('#follow');
 let ready=false,lastEntry=null,dirn='next',first=true;
 if(yt)yt.addEventListener('load',()=>{ready=true});
 post=(func,args=[])=>{if(yt&&ready&&yt.contentWindow)yt.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),'*')};
 const entryFor=s=>{let e=null;for(const x of sync)if(x.slide<=s)e=x;return e};
 function seek(force){if(!follow||!follow.checked||!sync.length)return;const e=entryFor(i);if(e&&(force||e!==lastEntry)){lastEntry=e;post('seekTo',[e.t,true])}}
 function paintChapters(){const e=entryFor(i);root.querySelectorAll('#chapters button').forEach((b,k)=>b.setAttribute('aria-current',sync[k]===e))}
 function paint(){
  img.classList.remove('in-next','in-prev');void img.offsetWidth;
  if(!first)img.classList.add(dirn==='next'?'in-next':'in-prev');
  img.src=`${dir}s-${pad(i)}.webp`;img.alt=`Slide ${i} of ${n}`;
  $('#cnt').textContent=`${i} / ${n}`;$('#badge').textContent=`${i} / ${n}`;$('#scrub').value=i;
  [$('#nbPrev'),$('#cPrev')].forEach(b=>b.disabled=i<=1);[$('#nbNext'),$('#cNext')].forEach(b=>b.disabled=i>=n);
  root.querySelectorAll('.thumb').forEach(t=>t.setAttribute('aria-current',+t.dataset.n===i));
  const th=root.querySelector(`.thumb[data-n="${i}"]`);if(th&&th.scrollIntoView)th.scrollIntoView({inline:'center',block:'nearest',behavior:first?'auto':'smooth'});
  [i-1,i+1].forEach(k=>{if(k>=1&&k<=n){const p=new Image();p.src=`${dir}s-${pad(k)}.webp`}});
  store.set(id,i);setHash(`#lectures/${id}/${i}`);paintChapters();first=false;
 }
 function go(k,force){k=clamp(k);if(k===i&&!force)return;dirn=k>i?'next':'prev';i=k;paint();seek(false)}
 $('#lvBack').onclick=()=>{showList();scrollTo({top:0})};
 ['#nbPrev','#cPrev'].forEach(s=>$(s).onclick=()=>go(i-1));
 ['#nbNext','#cNext'].forEach(s=>$(s).onclick=()=>go(i+1));
 $('#scrub').oninput=e=>go(+e.target.value);
 root.querySelectorAll('.thumb').forEach(t=>t.onclick=()=>go(+t.dataset.n));
 $('#fs').onclick=()=>{document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen&&stage.requestFullscreen()};
 if(follow)follow.onchange=()=>{if(follow.checked)seek(true)};
 root.querySelectorAll('#chapters button').forEach(b=>b.onclick=()=>{const s=sync[+b.dataset.k];lastEntry=null;go(s.slide,true);lastEntry=s;post('seekTo',[s.t,true]);post('playVideo')});
 // keyboard + swipe
 const key=e=>{
  if(document.getElementById('lectures').classList.contains('hidden'))return;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName||''))&&e.target.type!=='range')return;
  if(e.key==='ArrowRight'){e.preventDefault();go(i+1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(i-1)}
  else if(e.key==='Home'){go(1)}else if(e.key==='End'){go(n)}
  else if(e.key==='f'||e.key==='F'){$('#fs').click()}
 };
 document.addEventListener('keydown',key);
 let sx=null;
 stage.addEventListener('touchstart',e=>{sx=e.touches[0].clientX},{passive:true});
 stage.addEventListener('touchend',e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>50)go(i+(dx<0?1:-1))},{passive:true});
 teardown=()=>{document.removeEventListener('keydown',key);if(document.fullscreenElement)document.exitFullscreen()};
 paint();
}

// pause video when leaving the Lectures tab
document.addEventListener('tabchange',e=>{if(e.detail!=='lectures')post('pauseVideo')});

const m=location.hash.match(/^#lectures\/([\w-]+)(?:\/(\d+))?/);
if(m&&data.some(l=>l.id===m[1]))open(m[1],+m[2]||0);else showList();
})();
