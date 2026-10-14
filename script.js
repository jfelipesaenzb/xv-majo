'use strict';
// ===== Config =====
const EVENT_DATE = new Date(2026, 10, 14, 19, 0, 0); // 14 nov 2026, 7:00 pm
const WHATSAPP_NUMBER = "573196831795"; // +57 319 683 1795 (formato internacional, sin "+")

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const root = document.documentElement;
const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

// ===== Modo liviano: equipos con poca memoria/CPU o con "reducir movimiento" =====
// (se puede forzar con ?lite o ?full al final de la dirección)
const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = /[?&]lite/.test(location.search) ||
  (!/[?&]full/.test(location.search) && (rm || (navigator.deviceMemory || 4) <= 4 || (navigator.hardwareConcurrency || 4) <= 4));
const DUR = rm ? .01 : lite ? 1.4 : 1.8;
root.classList.toggle('lite', lite);
root.style.setProperty('--dur', DUR + 's');

// ===== Escenas =====
const stages = [...document.querySelectorAll('.stage')], N = stages.length;
const stops = stages.map(s => ({img: s.dataset.img, fx: +s.dataset.fx/100, fy: +s.dataset.fy/100, s: +s.dataset.s}));
stages.forEach(st => [...st.children].forEach((c, k) => c.style.setProperty('--k', k)));
let W = innerWidth, H = innerHeight, cur = -1;

// una capa de fondo por imagen
const bgs = $('bgs'), L = {};
[...new Set(stops.map(s => s.img))].forEach(src => {
  const d = document.createElement('div'); d.className = 'bg'; d.style.backgroundImage = `url(${src})`;
  bgs.appendChild(d); L[src] = d;
});
// transform que lleva el punto de interés al centro sin mostrar bordes vacíos
function aim(fx, fy, s){
  s = Math.max(1, s);
  const x = clamp(W/2 - fx*W*s, W - W*s, 0), y = clamp(H/2 - fy*H*s, H - H*s, 0);
  return `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(3)})`;
}

// ===== Puntos de navegación (abajo). Es la ÚNICA forma de avanzar: no hay scroll ni deslizamiento =====
const dots = document.createElement('nav'); dots.id = 'dots'; dots.setAttribute('aria-label', 'Recorrido por el bosque');
stages.forEach((st, i) => {
  const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', st.dataset.t || 'Sección ' + (i+1));
  d.onclick = () => { if(i !== cur) show(i); };
  dots.appendChild(d);
});
document.body.appendChild(dots);

// ===== Cámara: solo se escribe estilo al cambiar de escena; el navegador anima con transiciones CSS =====
const rayLvl = [.35,.5,.95,.55,.35,.45,.9,.55];
const CD = 2; let cdOn = false;
function show(n, instant){
  const A = stops[cur], B = stops[n], cross = !instant && A && A.img !== B.img;
  if(instant) for(const k in L) L[k].style.transition = 'none';
  for(const k in L){
    const el = L[k];
    if(k === B.img){
      // al entrar a otra imagen, arranca más "lejos" para dar sensación de adentrarse en el bosque
      if(cross && +getComputedStyle(el).opacity < .05){
        el.style.transition = 'none'; el.style.transform = aim(B.fx, B.fy, B.s*.72); void el.offsetWidth; el.style.transition = '';
      }
      el.style.transform = aim(B.fx, B.fy, B.s); el.style.opacity = 1; el.style.zIndex = 2; el.classList.add('on');
    } else if(cross && k === A.img){
      el.style.transform = aim(A.fx, A.fy, A.s*2.1); el.style.opacity = 0; el.style.zIndex = 1; el.classList.remove('on');
    } else { el.style.opacity = 0; el.classList.remove('on'); }
  }
  if(instant){ void bgs.offsetWidth; for(const k in L) L[k].style.transition = ''; }
  stages.forEach((st, i) => st.classList.toggle('on', i === n));
  [...dots.children].forEach((d, i) => { d.classList.toggle('a', i === n); i === n ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current'); });
  root.style.setProperty('--near', (.5 + B.s*.35).toFixed(2));
  root.style.setProperty('--lp', (n/(N-1)).toFixed(2));
  root.style.setProperty('--ray', rayLvl[Math.min(n, rayLvl.length-1)]);
  cdOn = n === CD; if(cdOn) tick();
  const prev = cur; cur = n;
  if(!instant){ zoneSound(n); if(prev !== -1) swoop(); }
}
let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { W = innerWidth; H = innerHeight; if(cur > -1) show(cur, true); }, 150); });
document.addEventListener('visibilitychange', () => {
  root.classList.toggle('paused', document.hidden);
  if(document.hidden){ music.pause(); ac && ac.suspend(); }
  else if(on){ music.muted = false; music.play().catch(() => {}); ac && ac.resume(); }
});

// ===== Chispas (reutilizadas, sin crear ni borrar elementos) =====
const magic = $('magic');
const PN = lite ? 10 : 20, pool = []; let pi = 0;
for(let i = 0; i < PN; i++){ const s = document.createElement('i'); s.className = 'spark'; magic.appendChild(s); pool.push(s); }
function burst(x, y, n){
  n = n || (lite ? 6 : 12);
  for(let i = 0; i < n; i++){
    const s = pool[pi++ % PN], a = Math.random()*6.283, d = 30 + Math.random()*50;
    s.style.left = x + 'px'; s.style.top = y + 'px';
    if(s.anim) s.anim.cancel();
    s.anim = s.animate([{transform:'translate3d(0,0,0) scale(1)', opacity:1}, {transform:`translate3d(${Math.cos(a)*d}px,${Math.sin(a)*d}px,0) scale(.1)`, opacity:0}], {duration:650, easing:'ease-out'});
  }
}

// ===== Hadas y luciérnagas: movimiento 100 % CSS (cero JS por fotograma) =====
const fairySVG = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="url(#g)"/><g class="wing"><path d="M24 26C10 24 2 10 6 5c8-1 17 8 18 21z" fill="rgba(200,255,250,.8)"/></g><g class="wing b"><path d="M24 26c14-2 22-16 18-21-8-1-17 8-18 21z" fill="rgba(255,235,170,.85)"/></g><circle cx="24" cy="12" r="4" fill="#ffe9c8"/><path d="M24 16c-4 4-4 12 0 18 4-6 4-14 0-18z" fill="#ffd27a"/></svg>';
const rnd = (a, b) => a + Math.random()*(b - a);
function spawn(cls, n){
  for(let i = 0; i < n; i++){
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'fly ' + cls; b.setAttribute('aria-label', cls === 'fairy' ? 'Hada' : 'Luciérnaga');
    if(cls === 'fairy') b.innerHTML = fairySVG;
    const big = cls === 'fairy';
    b.style.cssText = `left:${rnd(0,92)}vw;top:${rnd(0,88)}vh;--dx:${rnd(-1,1)*(big?160:90)}px;--dy:${rnd(-1,1)*(big?120:70)}px;--r:${big?rnd(-14,14):0}deg;--t:${big?rnd(7,13):rnd(9,17)}s;--dl:${-rnd(0,12)}s;--b:${rnd(2,5)}s`;
    magic.appendChild(b);
  }
}
spawn('ff', lite ? 10 : 20); spawn('fairy', lite ? 3 : 5);
magic.addEventListener('click', e => {
  if(!e.target.closest('.fly')) return;
  burst(e.clientX, e.clientY); chime(); vib(12);
});

// hada guía: cruza la pantalla en cada cambio de escena y vuelve a su rincón
const guide = document.createElement('button'); guide.type = 'button'; guide.className = 'fly fairy guide'; guide.setAttribute('aria-label', 'Hada guía');
guide.innerHTML = fairySVG; magic.appendChild(guide);
let trail;
function swoop(){
  if(rm || !guide.animate) return;
  const kf = [{transform:'translate3d(0,0,0)'}, {transform:`translate3d(${-W*.35}px,${-H*.45}px,0)`, offset:.35}, {transform:`translate3d(${-W*.72}px,${-H*.28}px,0)`, offset:.65}, {transform:'translate3d(0,0,0)'}];
  guide.animate(kf, {duration: DUR*1000, easing:'ease-in-out'});
  clearInterval(trail);
  trail = setInterval(() => { const r = guide.getBoundingClientRect(); burst(r.left + 30, r.top + 30, lite ? 1 : 2); }, lite ? 220 : 120);
  setTimeout(() => clearInterval(trail), DUR*1000);
}

// hojas que caen (pocas; el oscurecido ya viene en la imagen)
const fall = $('fall');
for(let i = 0, n = lite ? 4 : 7; i < n; i++){
  const l = new Image(); l.src = 'hoja.webp'; l.alt = ''; l.decoding = 'async';
  l.style.cssText = `left:${rnd(0,100)}vw;--w:${rnd(14,30)}px;--d:${rnd(14,26)}s;--dl:${-rnd(0,20)}s`; fall.appendChild(l);
}

// ===== Sonido: grillos + viento + campanitas (sintetizado) + canción =====
let ac, master, on = false, chimeTimer, crk = [], windG, chimeGap = 6000;
const scale = [523.25,587.33,659.25,783.99,880,1046.5];
function chime(){
  if(!ac || !on) return;
  const f = scale[Math.floor(Math.random()*scale.length)], t = ac.currentTime;
  [1, 2.01].forEach((m, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f*m;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18/(i+1), t+.01); g.gain.exponentialRampToValueAtTime(.001, t+1.8);
    o.connect(g).connect(master); o.start(t); o.stop(t+1.9);
  });
}
function startAudio(){
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
  // viento suave (ruido corto en bucle)
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
  for(let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
  const n = ac.createBufferSource(); n.buffer = buf; n.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  windG = ac.createGain(); windG.gain.value = .13;
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .12; lg.gain.value = .06;
  lfo.connect(lg).connect(windG.gain); n.connect(lp).connect(windG).connect(master); n.start(); lfo.start();
  // grillos (uno solo en modo liviano)
  [4300, 4650].slice(0, lite ? 1 : 2).forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain(), am = ac.createOscillator(), ag = ac.createGain();
    o.frequency.value = f; g.gain.value = 0; am.type = 'square'; am.frequency.value = 22 + i*3; ag.gain.value = .012;
    const sl = ac.createOscillator(), sg = ac.createGain(); sl.frequency.value = .35 + i*.17; sg.gain.value = .012;
    sl.connect(sg).connect(g.gain); am.connect(ag).connect(g.gain);
    o.connect(g).connect(master); o.start(); am.start(); sl.start(); crk.push(ag.gain, sg.gain);
  });
}
function loopChimes(){ chime(); chimeTimer = setTimeout(loopChimes, chimeGap*(.6 + Math.random()*.8)); }
const music = $('music'), MUSIC_VOL = .45; let fadeT, mv = 0;
// El volumen se lleva en una variable propia: en iPhone/iPad `music.volume` es de solo lectura,
// y si el apagado dependiera de él la canción nunca se pausaría.
function setMV(v){ mv = clamp(v, 0, MUSIC_VOL); try { music.volume = mv; } catch(e) {} }
function fadeMusic(up){
  clearInterval(fadeT);
  if(up){
    music.muted = false; setMV(mv);
    const p = music.play();
    if(p && p.catch) p.catch(() => { if(on) setSound(false); }); // si el navegador la bloquea, el botón no queda en "activado" sin sonar
  }
  fadeT = setInterval(() => {
    setMV(mv + (up ? .03 : -.05));
    if(up ? mv >= MUSIC_VOL : mv <= 0){ clearInterval(fadeT); if(!up){ music.pause(); music.muted = true; } }
  }, 100);
}
const btn = $('sound');
function setSound(v){
  if(!ac) startAudio();
  on = v; ac.resume();
  master.gain.linearRampToValueAtTime(on ? .9 : 0, ac.currentTime + 1);
  btn.textContent = on ? '🔊 Sonido' : '🔇 Sonido'; btn.setAttribute('aria-pressed', on);
  clearTimeout(chimeTimer); if(on) loopChimes();
  fadeMusic(on);
}
btn.addEventListener('click', () => setSound(!on));
// ambiente de cada zona: [grillos, viento, pausa entre campanitas]
const zoneSnd = [[.8,1,6000],[.5,1.4,5000],[.3,.7,2200],[1.3,.8,6500],[.6,.6,2600],[.4,.5,2000],[.2,.5,3500],[.5,.8,4000]];
function zoneSound(z){
  if(!ac) return;
  const [c, w, g] = zoneSnd[Math.min(z, zoneSnd.length-1)], t = ac.currentTime;
  crk.forEach(p => p.setTargetAtTime(.012*c, t, 1.2)); windG.gain.setTargetAtTime(.13*w, t, 1.2); chimeGap = g; chime();
}

// ===== Cuenta regresiva (solo corre mientras se ve su escena) =====
const cd = ['cd-d','cd-h','cd-m','cd-s'].map($), cdv = ['','','',''];
function tick(){
  if(!cdOn || document.hidden) return;
  const diff = Math.max(0, EVENT_DATE - Date.now()), p = n => String(n).padStart(2, '0');
  [Math.floor(diff/864e5), Math.floor(diff/36e5%24), Math.floor(diff/6e4%60), Math.floor(diff/1e3%60)].map(p).forEach((v, i) => { if(v !== cdv[i]){ cdv[i] = v; cd[i].textContent = v; } });
}
setInterval(tick, 1000);

// ===== Confirmación por WhatsApp =====
$('rsvp').addEventListener('submit', e => {
  e.preventDefault();
  const msg = `Hola! Confirmo mi asistencia a los XV años de María José.\nNombre: ${$('name').value.trim()}\nAsistencia: ${document.querySelector('input[name=att]:checked').value}\nAcompañantes: ${$('guests').value}`;
  const a = $('wa'); a.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`; a.hidden = false; a.click();
});

// ===== Entrada =====
show(0, true);
stages[0].classList.remove('on'); // la portada aparece solo después de entrar
$('enter').addEventListener('click', () => {
  const i = $('intro'); i.classList.add('go'); setTimeout(() => i.remove(), 1400);
  root.classList.remove('intro-on');
  setSound(true); vib(20); chime();
  stages[0].classList.add('on');
});
