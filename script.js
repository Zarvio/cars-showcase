// script.js (FULL FIXED)

// ------------------ Firebase config ------------------
const firebaseConfig = {
  apiKey: "AIzaSyDUefeJbHKIAs-l3zvFlGaas6VD63vv4kI",
  authDomain: "inspire4ever-c60ad.firebaseapp.com",
  databaseURL: "https://inspire4ever-c60ad-default-rtdb.firebaseio.com",
  projectId: "inspire4ever-c60ad",
  storageBucket: "inspire4ever-c60ad.appspot.com",
  messagingSenderId: "125014633127",
  appId: "1:125014633127:web:d29e4c37628ab637f40982"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// DB reference for settings
const settingsRef = db.ref("settings");

// ------------------ Helpers ------------------
function $(id){ return document.getElementById(id); }

// -------- POPUP OPEN ----------
function openPopup() {
  const p = $('adminPopup');
  if (!p) { console.error("adminPopup not found"); return; }
  p.style.display = "flex";   // 🔥 popup will show
  p.setAttribute("aria-hidden", "false");
}

// -------- POPUP CLOSE ----------
function closePopup() {
  const p = $('adminPopup');
  if (!p) return;
  p.style.display = "none";   // 🔥 popup will hide
  p.setAttribute("aria-hidden", "true");
}

// -------- ENABLE CLOSE BUTTON ----------
document.addEventListener("DOMContentLoaded", () => {
  // popup should always start hidden
  $('adminPopup').style.display = "none";

  // add close button dynamically (if not present)
  const inner = document.querySelector(".popup-inner");
  if (inner && !document.getElementById("closePopupBtn")) {
    let btn = document.createElement("button");
    btn.id = "closePopupBtn";
    btn.textContent = "Close";
    btn.className = "btn";
    btn.style.marginTop = "10px";
    inner.appendChild(btn);
  }

  $("closePopupBtn")?.addEventListener("click", closePopup);
});

// -------- 5 CLICK TO OPEN ----------
let clickCount = 0;
document.addEventListener("click", () => {
  clickCount++;
  if (clickCount >= 5) {
    openPopup();
    clickCount = 0;
  }
});


// Canvas helper elements accessed later after DOM ready
let canvas, ctx, W, H;

// state arrays
let rockets = [], particles = [];

// runtime settings (kept in sync with DB)
let rocketEnabled = true;
let rocketCountVar = 1;
let rocketSpeedVar = 1.0;

// ------------------ Wait for DOM ------------------
document.addEventListener('DOMContentLoaded', () => {

  // UI element references (safely)
  const adminOpenBtn = $('adminOpen');
  const adminPopup = $('adminPopup');
  const adminLoginBtn = $('adminLoginBtn');
  const adminPassInput = $('adminPass');
  const adminOptionsBox = $('adminOptions');
  const saveSettingsBtn = $('saveSettingsBtn');
  const uploadBgBtn = $('uploadBgBtn');
  const bgFileInput = $('bgFile');
  const uploadStatus = $('uploadStatus');
  const rocketSwitchInput = $('rocketSwitch');
  const rocketCountInput = $('rocketCount');
  const rocketSpeedInput = $('rocketSpeed');

  // canvas setup
  canvas = $('fx');
  if (!canvas) {
    // create a fallback canvas if not present
    canvas = document.createElement('canvas');
    canvas.id = 'fx';
    document.body.appendChild(canvas);
  }
  ctx = canvas.getContext('2d');
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
  window.addEventListener('resize', ()=>{ W = canvas.width = innerWidth; H = canvas.height = innerHeight; });

  // ------------------ Admin open via meaningful 5 clicks ------------------
  let clickCount = 0;
  let clickTimer = null;

  document.addEventListener('click', (ev) => {
    // Ignore clicks that happen on UI controls so typing/buttons don't increment count
    const tag = (ev.target && ev.target.tagName) ? ev.target.tagName.toLowerCase() : '';
    const ignoreTags = ['input','textarea','button','a','select','option','label'];
    // also ignore clicks inside the admin popup itself
    if (ignoreTags.includes(tag) || ev.target.closest && ev.target.closest('.admin-popup')) {
      return;
    }

    clickCount++;
    // reset counter after 3 seconds of inactivity
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(()=>{ clickCount = 0; clickTimer = null; }, 3000);

    if (clickCount >= 5) {
      if (adminOpenBtn) adminOpenBtn.style.display = 'block';
      clickCount = 0;
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    }
  });

  // ------------------ Admin popup controls (safe registration) ------------------
  if (adminOpenBtn) adminOpenBtn.addEventListener('click', openPopup);
  if (adminLoginBtn) adminLoginBtn.addEventListener('click', checkAdmin);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveAdmin);
  if (uploadBgBtn) uploadBgBtn.addEventListener('click', uploadBackground);

  // ensure adminOptions hidden initially
  if (adminOptionsBox) adminOptionsBox.style.display = 'none';

  // open / close popup
  window.openPopup = function openPopup(){
    if (!adminPopup) return;
    adminPopup.style.display = 'flex';
    adminPopup.setAttribute('aria-hidden','false');
    // hide options until password entered
    if (adminOptionsBox) adminOptionsBox.style.display = 'none';
    // clear password field
    if (adminPassInput) adminPassInput.value = '';
  };

  window.closePopup = function closePopup(){
    if (!adminPopup) return;
    adminPopup.style.display = 'none';
    adminPopup.setAttribute('aria-hidden','true');
    if (adminPassInput) adminPassInput.value = '';
  };

  // Password check (custom modal)
  function checkAdmin(){
    if (!adminPassInput) return;
    const pass = (adminPassInput.value || '').trim();
    if(pass === 'grasim555'){
      if (adminOptionsBox) adminOptionsBox.style.display = 'block';
      // autofocus first control
      if (rocketSwitchInput) rocketSwitchInput.focus();
    } else {
      alert('Wrong Password');
      if (adminOptionsBox) adminOptionsBox.style.display = 'none';
    }
  }

  // Save settings to DB (does not handle bg upload)
  function saveAdmin(){
    const enabled = !!(rocketSwitchInput && rocketSwitchInput.checked);
    const count = Number(rocketCountInput ? rocketCountInput.value : 1) || 1;
    const speed = Number(rocketSpeedInput ? rocketSpeedInput.value : 1) || 1;

    settingsRef.update({
      enabled: enabled,
      count: count,
      speed: speed
    }).then(()=>{
      alert('Saved!');
    }).catch(err=>{
      console.error(err);
      alert('Failed to save: '+(err.message || err));
    });
  }

  // Upload background image to Firebase Storage and save URL to DB (improved)
  function uploadBackground(){
    if (!bgFileInput || !uploadStatus || !uploadBgBtn) return;
    uploadStatus.textContent = '';
    if(!bgFileInput.files || bgFileInput.files.length === 0){
      uploadStatus.textContent = 'Please choose an image file first.';
      return;
    }
    const file = bgFileInput.files[0];

    // client-side validation
    if(!file.type || !file.type.startsWith('image/')){
      uploadStatus.textContent = 'Selected file is not an image.';
      return;
    }
    const maxBytes = 8 * 1024 * 1024; // 8 MB limit
    if(file.size > maxBytes){
      uploadStatus.textContent = 'File too large. Try below 8 MB.';
      return;
    }

    const filename = 'bg_'+Date.now()+'_'+file.name.replace(/\s/g,'_');
    const ref = storage.ref().child('backgrounds/'+filename);

    uploadStatus.textContent = 'Starting upload...';
    uploadBgBtn.disabled = true;

    const uploadTask = ref.put(file);

    // stalled guard
    let lastProgress = -1;
    let stalledTimer = setTimeout(() => {
      uploadStatus.textContent = 'Still starting upload... if this continues, check network or Firebase Storage rules.';
    }, 5000);

    uploadTask.on('state_changed',
      snapshot => {
        if (stalledTimer) { clearTimeout(stalledTimer); stalledTimer = null; }
        const bytes = snapshot.bytesTransferred || 0;
        const total = snapshot.totalBytes || 0;
        let pct = 0;
        if(total > 0) pct = Math.round(bytes / total * 100);
        // update only on change
        if(pct !== lastProgress){
          lastProgress = pct;
          uploadStatus.textContent = `Uploading: ${pct}%`;
        }
      },
      err => {
        console.error('Upload error', err);
        uploadBtnEnable();
        let msg = 'Upload failed: ' + (err && (err.message || err.code) ? (err.message || err.code) : 'unknown error');
        // helpful hints
        if(err && (err.code === 'storage/unauthorized' || err.code === 'storage/forbidden')){
          msg += ' — permission denied. Check Firebase Storage rules or auth.';
        }
        uploadStatus.textContent = msg;
        if (stalledTimer) { clearTimeout(stalledTimer); stalledTimer = null; }
      },
      async () => {
        try{
          const url = await uploadTask.snapshot.ref.getDownloadURL();
          await settingsRef.update({ bgUrl: url });
          uploadStatus.textContent = 'Upload done & background saved.';
        } catch(e){
          console.error('Save downloadURL error', e);
          uploadStatus.textContent = 'Upload finished but saving background URL failed: ' + (e && (e.message||e.code) ? (e.message||e.code) : '');
        } finally {
          uploadBtnEnable();
          if (stalledTimer) { clearTimeout(stalledTimer); stalledTimer = null; }
        }
      }
    );

    function uploadBtnEnable(){
      try { uploadBgBtn.disabled = false; } catch(e){ /* ignore */ }
    }
  }

  // expose functions to global so HTML close link can call closePopup()
  window.checkAdmin = checkAdmin;
  window.saveAdmin = saveAdmin;
  window.uploadBackground = uploadBackground;

  // ------------------ FIREWORKS (canvas) ------------------
  // Rocket and Particle classes (same logic, using rocketSpeedVar/rocketCountVar)
  class Rocket {
    constructor(x,y,tx,ty){
      this.x = x; this.y = y; this.tx = tx; this.ty = ty;
      this.vx = (tx - x)/60 * rocketSpeedVar;
      this.vy = (ty - y)/60 * rocketSpeedVar;
      this.age = 0;
      this.color = Math.random()*360;
    }
    step(){
      this.x += this.vx;
      this.y += this.vy;
      this.age++;
      particles.push(new Particle(this.x,this.y,0,0,this.color,6,0.06,true));
      if(this.age > 55){
        explode(this.x,this.y,this.color);
        return false;
      }
      return true;
    }
    draw(){
      ctx.save();
      ctx.fillStyle = `hsl(${this.color},100%,60%)`;
      ctx.shadowBlur = 18;
      ctx.shadowColor = `hsl(${this.color},100%,60%)`;
      ctx.fillRect(this.x-2, this.y-12, 4, 18);
      ctx.restore();
    }
  }

  class Particle {
    constructor(x,y,vx,vy,h,s,d,sm){
      this.x = x; this.y = y; this.vx = vx; this.vy = vy;
      this.h = h; this.s = s; this.d = d; this.life = 1;
      this.dec = Math.random()*0.02 + 0.01;
      this.sm = sm;
    }
    step(){
      this.vx *= (1 - this.d);
      this.vy *= (1 - this.d);
      this.vy += 0.06;
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.dec;
      return (this.life > 0 && this.y < H + 60);
    }
    draw(){
      ctx.save();
      let a = this.life;
      ctx.beginPath();
      if(this.sm){
        ctx.fillStyle = `rgba(200,200,200,${0.08 * a})`;
        ctx.arc(this.x,this.y,this.s,0,Math.PI*2);
        ctx.fill();
      } else {
        ctx.fillStyle = `hsla(${this.h},100%,60%,${a})`;
        ctx.shadowBlur = 10;
        ctx.arc(this.x,this.y,this.s*(0.7 + Math.random()*0.4),0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function explode(x,y,c){
    for(let i=0;i<Math.random()*30+30;i++){
      let sp = Math.random()*4 + 2;
      let an = Math.random()*Math.PI*2;
      particles.push(new Particle(x,y,Math.cos(an)*sp,Math.sin(an)*sp,c,Math.random()*2+2,0.01,false));
    }
  }

  // main loop
  let frameCount = 0;
  function stepLoop(){
    requestAnimationFrame(stepLoop);

    // fill with slight transparency to create motion trail
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0,0,W,H);

    rockets = rockets.filter(r => { if(!r.step()) return false; r.draw(); return true; });
    particles = particles.filter(p => { if(!p.step()) return false; p.draw(); return true; });

    frameCount++;
    if(frameCount > 60){
      frameCount = 0;
      if(rocketEnabled){
        for(let i=0;i<rocketCountVar;i++){
          rockets.push(new Rocket(Math.random()*W, H + 20, Math.random()*W, Math.random()*H*0.45));
        }
      }
    }
  }
  stepLoop();

  // ------------------ Realtime DB listener ------------------
  settingsRef.on('value', snapshot => {
    const val = snapshot.val();
    if(!val) return;

    // enable/disable rockets
    if(typeof val.enabled !== 'undefined'){
      rocketEnabled = !!val.enabled;
      if (rocketSwitchInput) rocketSwitchInput.checked = rocketEnabled;
      if(!rocketEnabled){
        rockets = [];
        particles = [];
        ctx.clearRect(0,0,W,H);
      }
    }

    // count
    if(typeof val.count !== 'undefined'){
      rocketCountVar = Number(val.count) || 1;
      if (rocketCountInput) rocketCountInput.value = rocketCountVar;
    }

    // speed
    if(typeof val.speed !== 'undefined'){
      rocketSpeedVar = Number(val.speed) || 1;
      if (rocketSpeedInput) rocketSpeedInput.value = rocketSpeedVar;
    }

    // background URL
    if(typeof val.bgUrl === 'string' && val.bgUrl.length>0){
      document.body.style.background = `url('${val.bgUrl}') center/cover no-repeat fixed`;
      document.body.style.backgroundBlendMode = 'overlay';
    }
  });

  // ------------------ init: create default settings if missing ----
  settingsRef.once('value').then(snap=>{
    const v = snap.val();
    if(v){
      if(typeof v.enabled !== 'undefined') { rocketEnabled = !!v.enabled; if (rocketSwitchInput) rocketSwitchInput.checked = rocketEnabled; }
      if(typeof v.count !== 'undefined') { rocketCountVar = Number(v.count); if (rocketCountInput) rocketCountInput.value = rocketCountVar; }
      if(typeof v.speed !== 'undefined') { rocketSpeedVar = Number(v.speed); if (rocketSpeedInput) rocketSpeedInput.value = rocketSpeedVar; }
      if(typeof v.bgUrl === 'string' && v.bgUrl.length>0) {
        document.body.style.background = `url('${v.bgUrl}') center/cover no-repeat fixed`;
        document.body.style.backgroundBlendMode = 'overlay';
      }
    } else {
      // write initial defaults
      settingsRef.set({
        enabled: true,
        count: 1,
        speed: 1,
        bgUrl: ''
      }).catch(e=>console.warn('init settings error', e));
    }
  }).catch(err => console.error(err));

}); // DOMContentLoaded end
