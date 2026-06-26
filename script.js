// ==================== INDEXEDDB ENGINE ====================
let db;
const DB_NAME = "CoreVaultDB", DB_VER = 10;
const stores = ['people','houses','cars','family','timeline','gallery','settings'];

const openDB = () => new Promise((res, rej) => {
  const req = indexedDB.open(DB_NAME, DB_VER);
  req.onupgradeneeded = (e) => {
    const database = e.target.result;
    stores.forEach(s => {
      if (!database.objectStoreNames.contains(s))
        database.createObjectStore(s, { keyPath: 'id', autoIncrement: true });
    });
  };
  req.onsuccess = (e) => { db = e.target.result; res(db); };
  req.onerror = (e) => rej(e.target.error);
});

const tx = (store, mode = 'readonly') => db.transaction(store, mode).objectStore(store);
const all = (store) => new Promise((res, rej) => { const r = tx(store).getAll(); r.onsuccess = () => res(r.result); r.onerror = rej; });
const one = (store, id) => new Promise((res, rej) => { const r = tx(store).get(id); r.onsuccess = () => res(r.result); r.onerror = rej; });
const add = (store, data) => new Promise((res, rej) => { const r = tx(store, 'readwrite').add(data); r.onsuccess = () => { logEvent(store, r.result, 'افزودن'); res(r.result); }; r.onerror = rej; });
const update = (store, id, data) => new Promise((res, rej) => { data.id = id; const r = tx(store, 'readwrite').put(data); r.onsuccess = () => { logEvent(store, id, 'ویرایش'); res(); }; r.onerror = rej; });
const remove = (store, id) => new Promise((res, rej) => { const r = tx(store, 'readwrite').delete(id); r.onsuccess = () => { logEvent(store, id, 'حذف'); res(); }; r.onerror = rej; });
const logEvent = (type, recId, action) => { tx('timeline', 'readwrite').add({ type, recordId: recId, action, time: new Date().toISOString() }); };

// ==================== AUTH ====================
function authenticate() {
  if (document.getElementById('master-pass').value === 'admin') {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    localStorage.setItem('cv_auth', '1');
    switchView('dashboard');
  } else alert('رمز عبور اشتباه');
}
function guestLogin() {
  localStorage.setItem('cv_guest', '1');
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  switchView('dashboard');
}

// ==================== THEMES ====================
let starCanvas = null;
function changeTheme(val) {
  document.body.className = val;
  localStorage.setItem('theme', val);
  if (starCanvas) { starCanvas.remove(); starCanvas = null; }
  if (val === 'space') {
    starCanvas = document.createElement('canvas');
    starCanvas.id = 'starfield';
    starCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    document.body.prepend(starCanvas);
    initStarfield();
  }
}
function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  const stars = [];
  function resize() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 200; i++) {
    stars.push({ x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 1.5 + 0.5, speed: Math.random() * 0.5 + 0.1, color: `hsl(${Math.random() * 60 + 200}, 80%, 70%)` });
  }
  function draw() {
    if (document.body.className !== 'space') return;
    ctx.clearRect(0, 0, width, height);
    stars.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI*2); ctx.fillStyle = s.color; ctx.fill(); s.y -= s.speed; if (s.y < -10) { s.y = height + 10; s.x = Math.random() * width; } });
    requestAnimationFrame(draw);
  }
  draw();
}

// ==================== ROUTING ====================
let currentView = 'dashboard';
function switchView(view) {
  currentView = view;
  const c = document.getElementById('view-container');
  const views = { people, houses, cars, family, timeline, dashboard, gallery, settings, compare };
  if (views[view]) views[view](c);
}

// ==================== HELPERS ====================
function validateNationalId(id) { if (!/^\d{10}$/.test(id)) return false; const check = parseInt(id[9]); const sum = [...id.slice(0,9)].reduce((a,v,i) => a + parseInt(v)*(10-i), 0); const rem = sum % 11; return (rem < 2 && check === rem) || (rem >= 2 && check === 11 - rem); }
function getProvinceFromNid(id) { const map = {"001":"آذربایجان شرقی","002":"آذربایجان غربی","003":"اردبیل","004":"اصفهان","005":"ایلام","006":"بوشهر","007":"تهران","008":"چهارمحال بختیاری","009":"خراسان رضوی","010":"خوزستان","011":"زنجان","012":"سمنان","013":"سیستان و بلوچستان","014":"فارس","015":"قزوین","016":"قم","017":"کردستان","018":"کرمان","019":"کرمانشاه","020":"کهگیلویه و بویراحمد","021":"گلستان","022":"گیلان","023":"لرستان","024":"مازندران","025":"مرکزی","026":"هرمزگان","027":"همدان","028":"یزد"}; return map[id.slice(0,3)] || ''; }
function gregorianToJalali(gy,gm,gd){const g=[31,28,31,30,31,30,31,31,30,31,30,31],j=[31,31,31,31,31,31,30,30,30,30,30,29];let days=0;for(let i=1;i<gm;i++)days+=g[i-1];days+=gd;if(gm>2&&((gy%4==0&&gy%100!=0)||gy%400==0))days++;days+=(gy-1)*365+Math.floor((gy-1)/4)-Math.floor((gy-1)/100)+Math.floor((gy-1)/400);let jy=1;while(true){let jyd=(jy%4==3)?366:365;if(days<=jyd)break;days-=jyd;jy++;}let jm=1;while(true){let jmd=j[jm-1];if(jm==12&&jy%4==3)jmd=30;if(days<=jmd)break;days-=jmd;jm++;}return{jy,jm,jd:days};}
function jalaliToGregorian(jy,jm,jd){const j=[31,31,31,31,31,31,30,30,30,30,30,29];let days=jd;for(let i=1;i<jm;i++)days+=j[i-1];if(jm==12&&jy%4==3)days++;days+=(jy-1)*365+Math.floor((jy-1)/4);let gy=1,gm=1,gd=1;while(days>366+((gy%4==0&&gy%100!=0)||gy%400==0?1:0)){days-=365+((gy%4==0&&gy%100!=0)||gy%400==0?1:0);gy++;}while(true){let md=31;if(gm==2)md=((gy%4==0&&gy%100!=0)||gy%400==0)?29:28;else if([4,6,9,11].includes(gm))md=30;if(days<=md)break;days-=md;gm++;}gd=days;return new Date(gy,gm-1,gd);}
function formatJalaliDate(str){if(!str)return'';const[d,m,y]=str.split('/').map(Number);const months=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];return`${d} ${months[m-1]} ${y}`;}
function calculateAgeFromJalali(jBirth){if(!jBirth)return'';const[d,m,y]=jBirth.split('/').map(Number);const today=new Date();const tj=gregorianToJalali(today.getFullYear(),today.getMonth()+1,today.getDate());let age=tj.jy-y;if(tj.jm<m||(tj.jm==m&&tj.jd<d))age--;return age;}
function nextBirthdayFromJalali(jBirth){if(!jBirth)return'';const[bd,bm,by]=jBirth.split('/').map(Number);const today=new Date();const tj=gregorianToJalali(today.getFullYear(),today.getMonth()+1,today.getDate());let nextYear=tj.jy;if(tj.jm>bm||(tj.jm==bm&&tj.jd>bd))nextYear++;const nd=jalaliToGregorian(nextYear,bm,bd);return Math.ceil((nd-today)/(1000*60*60*24));}
function dataHealth(obj){const fields=['firstName','lastName','city','nationalId','job','education'];const filled=fields.filter(f=>obj[f]).length;if(obj.phones&&obj.phones.length>0)filled++;return Math.round((filled/(fields.length+1))*100);}
function formatPlate(plate){if(!plate)return'';const cleaned=plate.replace(/[^\dآ-ی]/g,'');if(cleaned.length<7)return plate;return`${cleaned.slice(0,2)} ${cleaned[2]} ${cleaned.slice(3,6)} ${cleaned.slice(6,8)}`;}
function levenshtein(a,b){const m=a.length,n=b.length,dp=Array.from({length:m+1},()=>Array(n+1).fill(0));for(let i=0;i<=m;i++)dp[i][0]=i;for(let j=0;j<=n;j++)dp[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]!==b[j-1]?1:0));return dp[m][n];}
function getSearchableText(item, type) {
  let text = '';
  const fields = ['firstName','lastName','alias','city','nationalId','job','education','workplace','position','skills','interests','dislikes','favoriteMusic','favoriteMovie','favoriteBook','personality','fatherName','motherName','emergencyPhone','spouseName','degree','fieldOfStudy','university','maritalStatus','employmentStatus','bloodGroup','languages','nationality','habits','phoneModel','color','allergies','tags','category'];
  if (type === 'people') {
    fields.forEach(f => { if (item[f]) text += ` ${item[f]}`; });
    if (item.phones) item.phones.forEach(p => text += ` ${p.type} ${p.number}`);
    if (item.customFields) Object.values(item.customFields).forEach(v => text += ` ${v}`);
    const age = calculateAgeFromJalali(item.birthDate);
    if (age) text += ` ${age} ساله`;
  } else if (type === 'houses') {
    text = `${item.address||''} ${item.city||''} ${item.type||''} ${item.description||''}`;
  } else if (type === 'cars') {
    text = `${item.brand||''} ${item.model||''} ${item.plate||''} ${item.color||''} ${item.fuel||''} ${item.status||''} ${item.description||''}`;
  } else if (type === 'family') {
    text = `${item.name||''}`;
  }
  return text.trim();
}

// ==================== GALLERY ====================
async function gallery(container) {
  const items = await all('gallery');
  let currentTab = 'add';
  let previewData = null;
  function render() {
    const listHtml = items.length ? items.map(item => `
      <div class="card glass" style="display:inline-block;width:150px;margin:8px;vertical-align:top;text-align:center;">
        ${item.type === 'video' ? `<video src="${item.data}" controls style="width:100%;height:100px;object-fit:cover;border-radius:12px;"></video>` : `<img src="${item.data}" style="width:100%;height:100px;object-fit:cover;border-radius:12px;">`}
        <p style="font-size:0.8rem;margin:4px 0;">${item.name||'بدون نام'}</p>
        <button onclick="navigator.clipboard.writeText('${item.data.slice(0,30)}...')">📋</button>
        <button onclick="editGalleryName(${item.id})">✏️</button>
        <button onclick="remove('gallery',${item.id}).then(()=>switchView('gallery'))">🗑</button>
      </div>`).join('') : '<p style="color:var(--text-secondary);text-align:center;">هیچ رسانه‌ای ذخیره نشده است.</p>';
    container.innerHTML = `
      <div class="section-title">🖼️ گالری</div>
      <div style="display:flex;gap:8px;margin-bottom:20px;background:var(--glass-bg);border-radius:14px;padding:6px;border:1px solid var(--border);">
        <button class="tab-btn ${currentTab==='add'?'active':''}" onclick="switchGalleryTab('add')">📤 افزودن فایل</button>
        <button class="tab-btn ${currentTab==='paste'?'active':''}" onclick="switchGalleryTab('paste')">📥 وارد کردن Base64</button>
      </div>
      <div id="gallery-tab-content"></div>
      <div style="margin-top:25px;">
        <h3 style="color:var(--accent);margin-bottom:12px;">📚 کتابخانه (${items.length} مورد)</h3>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">${listHtml}</div>
      </div>`;
    renderTab();
  }
  window.switchGalleryTab = function(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn.${tab}`)?.classList.add('active');
    renderTab();
  };
  function renderTab() {
    const tabContent = document.getElementById('gallery-tab-content');
    if (!tabContent) return;
    if (currentTab === 'add') {
      tabContent.innerHTML = `
        <div class="upload-zone glass" id="gallery-upload-zone" style="border:2px dashed var(--border);border-radius:18px;padding:40px;text-align:center;cursor:pointer;">
          <span style="font-size:3rem;">☁️</span>
          <p style="font-weight:600;">فایل را اینجا رها کنید یا کلیک کنید</p>
          <p style="color:var(--text-secondary);font-size:0.85rem;">پشتیبانی: JPG, PNG, GIF, WebP, MP4, WebM — حداکثر ۲۰ مگابایت</p>
          <input type="file" id="gallery-file-input" accept="image/*,video/*" style="display:none;" multiple>
        </div>
        <div id="gallery-preview" style="display:none;margin-top:15px;text-align:center;"></div>
        <div id="gallery-add-btn-row" style="display:none;margin-top:15px;text-align:center;">
          <button class="primary" id="btn-add-gallery">💾 ذخیره در گالری</button>
          <button class="btn-glass" onclick="resetGalleryAdd()">✕ لغو</button>
        </div>`;
      const uploadZone = document.getElementById('gallery-upload-zone');
      const fileInput = document.getElementById('gallery-file-input');
      uploadZone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
      uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
      uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
      uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
    } else {
      tabContent.innerHTML = `
        <div class="textarea-wrapper">
          <textarea id="gallery-b64-input" placeholder="کد Base64 را اینجا بچسبانید..." style="min-height:130px;direction:ltr;"></textarea>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
          <label class="primary" style="cursor:pointer;">📁 بارگذاری فایل txt<input type="file" id="gallery-txt-input" accept=".txt" style="display:none;" onchange="loadTxtFile(this)"></label>
          <span style="color:var(--text-secondary);font-size:0.85rem;">فایل txt حاوی Base64</span>
        </div>
        <button class="primary" id="btn-decode-gallery" style="margin-top:12px;">🔍 پیش‌نمایش</button>
        <div id="gallery-paste-preview" style="margin-top:15px;display:none;text-align:center;"></div>
        <div id="gallery-paste-btn-row" style="display:none;margin-top:15px;text-align:center;">
          <button class="primary" id="btn-add-paste-gallery">💾 ذخیره در گالری</button>
          <button class="btn-glass" onclick="resetGalleryPaste()">✕ لغو</button>
        </div>`;
      document.getElementById('btn-decode-gallery').addEventListener('click', decodePastedBase64);
    }
  }
  window.handleFiles = function(files) {
    const file = files[0];
    if (!file) return;
    if (file.size > 20*1024*1024) { alert('حجم فایل زیاد است'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      previewData = { type: file.type.startsWith('video/') ? 'video' : 'image', data: e.target.result, name: file.name };
      document.getElementById('gallery-preview').style.display = 'block';
      document.getElementById('gallery-preview').innerHTML = previewData.type === 'video'
        ? `<video src="${previewData.data}" controls style="max-width:100%;max-height:250px;border-radius:16px;"></video>`
        : `<img src="${previewData.data}" style="max-width:100%;max-height:250px;border-radius:16px;">`;
      document.getElementById('gallery-add-btn-row').style.display = 'block';
    };
    reader.readAsDataURL(file);
  };
  window.resetGalleryAdd = () => { previewData = null; document.getElementById('gallery-preview').style.display = 'none'; document.getElementById('gallery-add-btn-row').style.display = 'none'; document.getElementById('gallery-file-input').value = ''; };
  window.resetGalleryPaste = () => { previewData = null; document.getElementById('gallery-paste-preview').style.display = 'none'; document.getElementById('gallery-paste-btn-row').style.display = 'none'; document.getElementById('gallery-b64-input').value = ''; document.getElementById('gallery-txt-input').value = ''; };
  window.decodePastedBase64 = () => {
    const raw = document.getElementById('gallery-b64-input').value.trim();
    if (!raw) return alert('کد را وارد کنید.');
    let mime = 'image/png', pure = raw;
    const match = raw.match(/^data:(image\/\w+|video\/\w+);base64,(.+)$/i);
    if (match) { mime = match[1]; pure = match[2]; }
    try {
      const bytes = Uint8Array.from(atob(pure), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const isVideo = mime.startsWith('video/');
      previewData = { type: isVideo ? 'video' : 'image', data: raw, name: 'base64_' + Date.now() };
      document.getElementById('gallery-paste-preview').style.display = 'block';
      document.getElementById('gallery-paste-preview').innerHTML = isVideo
        ? `<video src="${url}" controls style="max-width:100%;max-height:250px;border-radius:16px;"></video>`
        : `<img src="${url}" style="max-width:100%;max-height:250px;border-radius:16px;">`;
      document.getElementById('gallery-paste-btn-row').style.display = 'block';
    } catch { alert('کد نامعتبر'); }
  };
  window.loadTxtFile = (input) => { const file = input.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { document.getElementById('gallery-b64-input').value = e.target.result; }; reader.readAsText(file); };
  window.editGalleryName = async (id) => { const item = await one('gallery', id); if (!item) return; const newName = prompt('نام جدید:', item.name || ''); if (newName !== null) { item.name = newName; await update('gallery', id, item); switchView('gallery'); } };
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'btn-add-gallery' && previewData) { await add('gallery', previewData); switchView('gallery'); }
    if (e.target.id === 'btn-add-paste-gallery' && previewData) { await add('gallery', previewData); switchView('gallery'); }
  });
  render();
}

// ==================== PEOPLE ====================
async function people(container) {
  const ppl = await all('people');
  container.innerHTML = `<div class="section-title">👤 مدیریت افراد</div>
    <div id="people-list">${ppl.map(p => personCard(p)).join('')}</div>
    <button class="primary" onclick="showPersonForm()">+ افزودن فرد جدید</button>
    <div id="person-form" class="hidden"></div>`;
}
function personCard(p) {
  const age = calculateAgeFromJalali(p.birthDate);
  const nextBd = nextBirthdayFromJalali(p.birthDate);
  const phoneList = (p.phones && p.phones.length > 0) ? p.phones.map(ph => `${ph.type||'تلفن'}: ${ph.number}`).join(' | ') : '';
  return `
    <div class="id-card glass">
      <div style="display:flex; align-items:center; gap:12px; flex:1;">
        ${p.photo ? `<img src="${p.photo}" style="width:70px;height:70px;border-radius:50%;border:2px solid var(--accent);object-fit:cover;margin:0;">` : `<div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:2rem;color:#000;">${(p.firstName?.[0]||'')+(p.lastName?.[0]||'')}</div>`}
        <div>
          <div style="font-size:1.1rem;font-weight:bold;">${p.firstName||''} ${p.lastName||''} ${p.alias ? `"${p.alias}"` : ''}</div>
          <div style="font-size:0.8rem;opacity:0.7;">${age!=='' ? `${age} ساله` : ''} ${p.city ? '| ' + p.city : ''}</div>
          <div style="font-size:0.75rem;margin-top:4px;display:flex;flex-wrap:wrap;gap:5px;">
            ${p.nationalId ? `<span style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;">🆔 ${p.nationalId}</span>` : ''}
            ${phoneList ? `<span style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;">📞 ${phoneList}</span>` : ''}
            ${p.job ? `<span style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;">💼 ${p.job}</span>` : ''}
          </div>
          ${nextBd ? `<div style="font-size:0.7rem;margin-top:4px;">🎂 ${nextBd} روز تا تولد</div>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        <button class="btn-glass" onclick="editPerson(${p.id})">✏️</button>
        <button class="btn-glass" onclick="viewPersonModal(${p.id})">👁️</button>
        <button class="btn-glass" onclick="remove('people',${p.id}).then(()=>switchView('people'))">🗑</button>
      </div>
    </div>`;
}

window.showPersonForm = async function(person=null) {
  const [cars, houses, galleryItems, allPeople] = await Promise.all([all('cars'), all('houses'), all('gallery'), all('people')]);
  const ownedCar = person ? cars.find(c => c.ownerId === person.id) : null;
  const ownedHouse = person ? houses.find(h => h.ownerId === person.id) : null;
  const carOpts = '<option value="">بدون خودرو</option>' + cars.map(c => `<option value="${c.id}" ${ownedCar?.id===c.id?'selected':''}>${c.brand} ${c.model} - ${formatPlate(c.plate)}</option>`).join('');
  const houseOpts = '<option value="">بدون خانه</option>' + houses.map(h => `<option value="${h.id}" ${ownedHouse?.id===h.id?'selected':''}>${h.address} ${h.city||''}</option>`).join('');
  const galleryOpts = galleryItems.map(g => `<option value="${g.id}" data-type="${g.type}" data-data="${g.data}">${g.name||'بدون نام'}</option>`).join('');
  const peopleOpts = '<option value="">انتخاب</option>' + allPeople.filter(p => p.id !== person?.id).map(p => `<option value="${p.id}">${p.firstName} ${p.lastName}</option>`).join('');

  const p = person || {};
  let day='', month='', year='';
  if (p.birthDate) [day, month, year] = p.birthDate.split('/');
  const phones = p.phones || [{type:'موبایل', number:''}];
  let phonesHtml = phones.map(ph => `
    <div class="phone-entry" style="display:flex;gap:8px;align-items:center;">
      <input placeholder="نوع (موبایل، منزل...)" value="${ph.type||''}" class="phone-type">
      <input placeholder="شماره" value="${ph.number||''}" class="phone-number">
      <button onclick="this.parentElement.remove()" style="background:transparent;border:1px solid var(--accent);color:var(--accent);padding:5px 10px;">✕</button>
    </div>`).join('');
  phonesHtml += `<button class="btn-glass" id="add-phone-btn" onclick="addPhoneRow()" style="margin-top:8px;">+ افزودن شماره جدید</button>`;

  const formDiv = document.getElementById('person-form');
  formDiv.innerHTML = `
    <div class="card glass">
      <h3>${person ? 'ویرایش فرد' : 'افزودن فرد جدید'}</h3>
      <div style="display:flex;gap:4px;margin-bottom:15px;flex-wrap:wrap;">
        <button class="tab-btn active" onclick="switchFormTab('general', event)">اطلاعات کلی</button>
        <button class="tab-btn" onclick="switchFormTab('family', event)">خانوادگی</button>
        <button class="tab-btn" onclick="switchFormTab('education', event)">تحصیلی</button>
        <button class="tab-btn" onclick="switchFormTab('job', event)">شغلی</button>
        <button class="tab-btn" onclick="switchFormTab('financial', event)">مالی و مدارک</button>
        <button class="tab-btn" onclick="switchFormTab('social', event)">شبکه‌های اجتماعی</button>
        <button class="tab-btn" onclick="switchFormTab('other', event)">سایر</button>
      </div>
      <div id="form-tab-content"></div>
      <div style="margin-top:15px"><button class="primary" onclick="${person?`saveEditPerson(${person.id})`:'saveNewPerson()'}">💾 ذخیره</button> <button class="btn-glass" onclick="document.getElementById('person-form').classList.add('hidden')">✕ لغو</button></div>
    </div>`;
  formDiv.classList.remove('hidden');

  window._personData = p;
  window._allPeople = allPeople;
  window._peopleOpts = peopleOpts;

  window.switchFormTab = function(tab, event) {
    if (event) {
      document.querySelectorAll('#person-form .tab-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
    }
    const content = document.getElementById('form-tab-content');
    const d = window._personData;
    switch(tab) {
      case 'general':
        content.innerHTML = `
          <div class="grid-2">
            <input id="p-fn" placeholder="نام" value="${d.firstName||''}">
            <input id="p-ln" placeholder="نام خانوادگی" value="${d.lastName||''}">
            <input id="p-alias" placeholder="نام مستعار / لقب" value="${d.alias||''}">
            <select id="p-gender"><option ${d.gender==='مرد'?'selected':''}>مرد</option><option ${d.gender==='زن'?'selected':''}>زن</option><option ${d.gender==='سایر'?'selected':''}>سایر</option></select>
            <div><label>تاریخ تولد (شمسی)</label><div style="display:flex;gap:5px;"><input id="p-bday" type="number" min="1" max="31" placeholder="روز" value="${day}" style="width:70px;"><select id="p-bmonth">${['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((m,i)=>`<option value="${i+1}" ${month==i+1?'selected':''}>${m}</option>`).join('')}</select><input id="p-byear" type="number" min="1300" max="1450" placeholder="سال" value="${year}" style="width:80px;"></div></div>
            <div id="age-preview" style="color:var(--accent)">${d.birthDate ? 'سن: ' + calculateAgeFromJalali(d.birthDate) + ' سال' : ''}</div>
            <input id="p-city" placeholder="شهر" value="${d.city||''}">
            <div><label>شماره‌های تماس</label><div id="phones-container">${phonesHtml}</div></div>
            <input id="p-national" placeholder="کد ملی" value="${d.nationalId||''}" onblur="checkNid()"><div id="nid-prov" style="color:var(--accent)">${d.nationalId&&validateNationalId(d.nationalId)?getProvinceFromNid(d.nationalId):''}</div>
            <input id="p-phone-model" placeholder="مدل گوشی" value="${d.phoneModel||''}">
            <input id="p-color" placeholder="رنگ مورد علاقه" value="${d.color||''}">
            <input id="p-blood" placeholder="گروه خونی" value="${d.bloodGroup||''}">
            <input id="p-height" type="number" placeholder="قد (سانتی‌متر)" value="${d.height||''}">
            <input id="p-weight" type="number" placeholder="وزن (کیلوگرم)" value="${d.weight||''}">
            <input id="p-languages" placeholder="زبان‌ها" value="${d.languages||''}">
            <input id="p-nationality" placeholder="ملیت" value="${d.nationality||''}">
            <textarea id="p-allergies" placeholder="بیماری / حساسیت / آلرژی">${d.allergies||''}</textarea>
          </div>`;
        document.getElementById('p-bday').addEventListener('input', updateAgePreview);
        document.getElementById('p-bmonth').addEventListener('change', updateAgePreview);
        document.getElementById('p-byear').addEventListener('input', updateAgePreview);
        break;
      case 'family':
        content.innerHTML = `
          <div class="grid-2">
            <select id="p-marital"><option value="">وضعیت تأهل</option>
              <option ${d.maritalStatus==='مجرد'?'selected':''}>مجرد</option>
              <option ${d.maritalStatus==='متأهل'?'selected':''}>متأهل</option>
              <option ${d.maritalStatus==='جدا شده'?'selected':''}>جدا شده</option>
              <option ${d.maritalStatus==='همسر فوت شده'?'selected':''}>همسر فوت شده</option>
            </select>
            <select id="p-spouse">${window._peopleOpts.replace('value=""','value="0"').replace('انتخاب','بدون همسر')}</select>
            <input id="p-children" type="number" placeholder="تعداد فرزندان" value="${d.childrenCount||''}">
            <input id="p-father" placeholder="نام پدر" value="${d.fatherName||''}">
            <input id="p-mother" placeholder="نام مادر" value="${d.motherName||''}">
            <input id="p-emergency" placeholder="شماره اضطراری" value="${d.emergencyPhone||''}">
            <div><label>دوستان</label>
              <div id="friends-container">
                ${(d.friends||[]).map(f => `<div style="display:flex;gap:8px;"><input value="${f}" class="friend-input" style="flex:1"><button onclick="this.parentElement.remove()">✕</button></div>`).join('')}
                <button onclick="addFriendRow()">+ افزودن دوست</button>
              </div>
            </div>
          </div>`;
        if (d.spouseId) document.getElementById('p-spouse').value = d.spouseId;
        window.addFriendRow = () => {
          const div = document.createElement('div'); div.style.cssText='display:flex;gap:8px;';
          div.innerHTML = `<input class="friend-input" style="flex:1" placeholder="نام یا انتخاب از افراد..."><button onclick="this.parentElement.remove()">✕</button>`;
          document.getElementById('friends-container').insertBefore(div, document.querySelector('#friends-container button'));
        };
        break;
      case 'education':
        content.innerHTML = `
          <div class="grid-2">
            <select id="p-degree"><option value="">آخرین مدرک</option>
              <option ${d.degree==='دیپلم'?'selected':''}>دیپلم</option>
              <option ${d.degree==='فوق دیپلم'?'selected':''}>فوق دیپلم</option>
              <option ${d.degree==='لیسانس'?'selected':''}>لیسانس</option>
              <option ${d.degree==='فوق لیسانس'?'selected':''}>فوق لیسانس</option>
              <option ${d.degree==='دکتری'?'selected':''}>دکتری</option>
              <option ${d.degree==='حوزوی'?'selected':''}>حوزوی</option>
            </select>
            <input id="p-field" placeholder="رشته تحصیلی" value="${d.fieldOfStudy||''}">
            <input id="p-uni" placeholder="دانشگاه / مدرسه" value="${d.university||''}">
            <input id="p-grad-year" type="number" placeholder="سال فارغ‌التحصیلی" value="${d.graduationYear||''}">
          </div>`;
        break;
      case 'job':
        content.innerHTML = `
          <div class="grid-2">
            <input id="p-job" placeholder="شغل" value="${d.job||''}">
            <input id="p-workplace" placeholder="محل کار" value="${d.workplace||''}">
            <input id="p-position" placeholder="سمت" value="${d.position||''}">
            <input id="p-salary" type="number" placeholder="حقوق" value="${d.salary||''}">
            <input id="p-hire-date" type="date" placeholder="تاریخ استخدام (میلادی)" value="${d.hireDate||''}">
            <select id="p-emp-status"><option value="">وضعیت اشتغال</option>
              <option ${d.employmentStatus==='شاغل'?'selected':''}>شاغل</option>
              <option ${d.employmentStatus==='بیکار'?'selected':''}>بیکار</option>
              <option ${d.employmentStatus==='بازنشسته'?'selected':''}>بازنشسته</option>
              <option ${d.employmentStatus==='دانشجو'?'selected':''}>دانشجو</option>
              <option ${d.employmentStatus==='سرباز'?'selected':''}>سرباز</option>
            </select>
          </div>`;
        break;
      case 'financial':
        content.innerHTML = `
          <div class="grid-2">
            <input id="p-shaba" placeholder="شماره شبا" value="${d.shaba||''}">
            <input id="p-account" placeholder="شماره حساب" value="${d.accountNumber||''}">
            <input id="p-card" placeholder="شماره کارت (۱۶ رقم)" value="${d.cardNumber ? decryptData(d.cardNumber) : ''}" oninput="formatCardNumber(this)">
            <div style="display:flex;gap:10px;">
              <input id="p-expm" placeholder="ماه انقضا" maxlength="2" value="${d.cardExpMonth||''}">
              <input id="p-expy" placeholder="سال انقضا" maxlength="4" value="${d.cardExpYear||''}">
            </div>
            <input id="p-cvv" placeholder="CVV2" type="password" value="${d.cardCVV ? decryptData(d.cardCVV) : ''}">
            <input id="p-card-holder" placeholder="نام روی کارت" value="${d.cardHolder||''}">
            <input id="p-card-pin" placeholder="رمز کارت" type="password" value="${d.cardPin ? decryptData(d.cardPin) : ''}">
            <input id="p-card-pin2" placeholder="رمز دوم" type="password" value="${d.cardPin2 ? decryptData(d.cardPin2) : ''}">
            <label>مدارک (از گالری)</label>
            <select id="p-id-card"><option value="">تصویر کارت ملی</option>${galleryOpts}</select>
            <select id="p-passport"><option value="">پاسپورت</option>${galleryOpts}</select>
            <select id="p-license"><option value="">گواهینامه</option>${galleryOpts}</select>
            <label>امضا</label>
            <select id="p-signature-img"><option value="">عکس امضا از گالری</option>${galleryOpts}</select>
            <canvas id="signature-pad" class="signature-canvas" width="300" height="100"></canvas>
            <button class="btn-glass" onclick="clearSignature()">پاک کردن امضا</button>
            <input type="hidden" id="p-signature" value="${d.signature||''}">
          </div>`;
        initSignaturePad();
        break;
      case 'social':
        content.innerHTML = `
          <div class="grid-2">
            <input id="p-telegram" placeholder="تلگرام" value="${d.telegram||''}">
            <input id="p-instagram" placeholder="اینستاگرام" value="${d.instagram||''}">
            <input id="p-tiktok" placeholder="تیک‌تاک" value="${d.tiktok||''}">
            <input id="p-twitter" placeholder="ایکس (توییتر)" value="${d.twitter||''}">
            <input id="p-discord" placeholder="دیسکورد" value="${d.discord||''}">
            <input id="p-website" placeholder="وب‌سایت شخصی" value="${d.website||''}">
          </div>`;
        break;
      case 'other':
        content.innerHTML = `
          <div class="grid-2">
            <input id="p-interests" placeholder="علایق" value="${d.interests||''}">
            <input id="p-dislikes" placeholder="تنفرها" value="${d.dislikes||''}">
            <input id="p-fav-music" placeholder="موسیقی مورد علاقه" value="${d.favoriteMusic||''}">
            <input id="p-fav-movie" placeholder="فیلم مورد علاقه" value="${d.favoriteMovie||''}">
            <input id="p-fav-book" placeholder="کتاب مورد علاقه" value="${d.favoriteBook||''}">
            <input id="p-personality" placeholder="تیپ شخصیتی" value="${d.personality||''}">
            <select id="p-contact-way"><option value="">نحوه ارتباط ترجیحی</option>
              <option ${d.preferredContact==='تماس'?'selected':''}>تماس</option>
              <option ${d.preferredContact==='پیامک'?'selected':''}>پیامک</option>
              <option ${d.preferredContact==='ایمیل'?'selected':''}>ایمیل</option>
              <option ${d.preferredContact==='تلگرام'?'selected':''}>تلگرام</option>
              <option ${d.preferredContact==='واتساپ'?'selected':''}>واتساپ</option>
            </select>
            <input id="p-suitable-hours" placeholder="ساعات مناسب تماس" value="${d.suitableHours||''}">
            <input id="p-habits" placeholder="عادت‌های مهم" value="${d.habits||''}">
            <div>
              <label>برچسب‌ها (با کاما جدا کنید)</label>
              <input id="p-tags" placeholder="مثلاً: خانواده, VIP" value="${(d.tags||[]).join(', ')}">
            </div>
            <select id="p-category"><option value="">دسته‌بندی</option>
              <option ${d.category==='خانواده'?'selected':''}>خانواده</option>
              <option ${d.category==='دوست'?'selected':''}>دوست</option>
              <option ${d.category==='همکار'?'selected':''}>همکار</option>
              <option ${d.category==='مشتری'?'selected':''}>مشتری</option>
              <option ${d.category==='سایر'?'selected':''}>سایر</option>
            </select>
            <input id="p-score" type="number" min="1" max="5" placeholder="امتیاز دستی (۱-۵)" value="${d.manualScore||''}">
            <label>وضعیت</label>
            <input type="checkbox" id="p-active" ${d.active !== false ? 'checked' : ''}> فعال
          </div>`;
        break;
    }
  };
  switchFormTab('general');
};

window.addPhoneRow = function() {
  const container = document.getElementById('phones-container');
  const addBtn = document.getElementById('add-phone-btn');
  if (!container || !addBtn) return;
  const div = document.createElement('div'); div.className = 'phone-entry'; div.style.cssText = 'display:flex;gap:8px;align-items:center;';
  div.innerHTML = `<input placeholder="نوع (موبایل، منزل...)" class="phone-type"><input placeholder="شماره" class="phone-number"><button onclick="this.parentElement.remove()" style="background:transparent;border:1px solid var(--accent);color:var(--accent);padding:5px 10px;">✕</button>`;
  container.insertBefore(div, addBtn);
};
window.updateAgePreview = () => {
  const day = document.getElementById('p-bday').value, month = document.getElementById('p-bmonth').value, year = document.getElementById('p-byear').value;
  const age = (day && month && year) ? calculateAgeFromJalali(`${day}/${month}/${year}`) : '';
  document.getElementById('age-preview').textContent = age ? 'سن: ' + age + ' سال' : '';
};
window.checkNid = () => {
  const nid = document.getElementById('p-national').value;
  const prov = document.getElementById('nid-prov');
  if(!validateNationalId(nid)) { prov.textContent = 'کد ملی نامعتبر'; prov.style.color='red'; }
  else { prov.textContent = getProvinceFromNid(nid); prov.style.color='var(--accent)'; }
};
window.formatCardNumber = (input) => { let val = input.value.replace(/\D/g,''); if(val.length>16) val=val.slice(0,16); let formatted=''; for(let i=0;i<val.length;i++){ if(i>0&&i%4===0) formatted+=' '; formatted+=val[i]; } input.value=formatted; };

const ENC_KEY = "C0r3V4u1tS3cur3K3y";
function encryptData(text){ let result=''; for(let i=0;i<text.length;i++) result+=String.fromCharCode(text.charCodeAt(i)^ENC_KEY.charCodeAt(i%ENC_KEY.length)); return btoa(result); }
function decryptData(enc){ try{ const decoded=atob(enc); let result=''; for(let i=0;i<decoded.length;i++) result+=String.fromCharCode(decoded.charCodeAt(i)^ENC_KEY.charCodeAt(i%ENC_KEY.length)); return result; }catch(e){return'';} }

function initSignaturePad() {
  const canvas = document.getElementById('signature-pad');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;
  canvas.onmousedown = canvas.ontouchstart = (e) => { drawing = true; ctx.beginPath(); const rect = canvas.getBoundingClientRect(); const x = e.offsetX || e.touches[0].clientX - rect.left; const y = e.offsetY || e.touches[0].clientY - rect.top; ctx.moveTo(x, y); };
  canvas.onmousemove = canvas.ontouchmove = (e) => { if(!drawing) return; const rect = canvas.getBoundingClientRect(); const x = e.offsetX || e.touches[0].clientX - rect.left; const y = e.offsetY || e.touches[0].clientY - rect.top; ctx.lineTo(x, y); ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(); ctx.stroke(); };
  canvas.onmouseup = canvas.ontouchend = () => { drawing = false; document.getElementById('p-signature').value = canvas.toDataURL(); };
}
window.clearSignature = () => { const canvas = document.getElementById('signature-pad'); canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height); document.getElementById('p-signature').value = ''; };

function getPersonData() {
  const d = window._personData || {};
  const get = (id) => document.getElementById(id)?.value || '';
  const phones = []; document.querySelectorAll('.phone-entry').forEach(entry => { const type = entry.querySelector('.phone-type')?.value.trim(), number = entry.querySelector('.phone-number')?.value.trim(); if(number) phones.push({type:type||'موبایل', number}); });
  const friends = []; document.querySelectorAll('.friend-input').forEach(inp => { if(inp.value.trim()) friends.push(inp.value.trim()); });
  return {
    firstName: get('p-fn'), lastName: get('p-ln'), alias: get('p-alias'), gender: get('p-gender'),
    birthDate: (get('p-bday')&&get('p-bmonth')&&get('p-byear')) ? `${get('p-bday')}/${get('p-bmonth')}/${get('p-byear')}` : '',
    city: get('p-city'), phones,
    nationalId: get('p-national'), phoneModel: get('p-phone-model'), color: get('p-color'),
    bloodGroup: get('p-blood'), height: get('p-height'), weight: get('p-weight'),
    languages: get('p-languages'), nationality: get('p-nationality'), allergies: get('p-allergies'),
    maritalStatus: get('p-marital'), spouseId: get('p-spouse') ? parseInt(get('p-spouse')) : null,
    childrenCount: get('p-children'), fatherName: get('p-father'), motherName: get('p-mother'), emergencyPhone: get('p-emergency'),
    friends, degree: get('p-degree'), fieldOfStudy: get('p-field'), university: get('p-uni'), graduationYear: get('p-grad-year'),
    job: get('p-job'), workplace: get('p-workplace'), position: get('p-position'), salary: get('p-salary'), hireDate: get('p-hire-date'),
    employmentStatus: get('p-emp-status'),
    shaba: get('p-shaba'), accountNumber: get('p-account'),
    cardNumber: get('p-card').replace(/\s/g,'') ? encryptData(get('p-card').replace(/\s/g,'')) : '',
    cardExpMonth: get('p-expm'), cardExpYear: get('p-expy'),
    cardCVV: get('p-cvv') ? encryptData(get('p-cvv')) : '',
    cardHolder: get('p-card-holder'),
    cardPin: get('p-card-pin') ? encryptData(get('p-card-pin')) : '',
    cardPin2: get('p-card-pin2') ? encryptData(get('p-card-pin2')) : '',
    idCardPhoto: get('p-id-card'), passportPhoto: get('p-passport'), licensePhoto: get('p-license'),
    signature: get('p-signature'),
    telegram: get('p-telegram'), instagram: get('p-instagram'), tiktok: get('p-tiktok'), twitter: get('p-twitter'), discord: get('p-discord'), website: get('p-website'),
    interests: get('p-interests'), dislikes: get('p-dislikes'), favoriteMusic: get('p-fav-music'), favoriteMovie: get('p-fav-movie'), favoriteBook: get('p-fav-book'),
    personality: get('p-personality'), preferredContact: get('p-contact-way'), suitableHours: get('p-suitable-hours'), habits: get('p-habits'),
    tags: get('p-tags').split(',').map(t=>t.trim()).filter(Boolean), category: get('p-category'),
    manualScore: get('p-score') ? parseInt(get('p-score')) : null,
    active: document.getElementById('p-active')?.checked ?? true,
    photo: d.photo || '', mediaType: d.mediaType || 'image'
  };
}
async function updateOwnership(personId, carId, houseId) {
  if (carId) { const car = await one('cars', parseInt(carId)); if (car) await update('cars', car.id, {...car, ownerId: personId}); }
  if (houseId) { const house = await one('houses', parseInt(houseId)); if (house) await update('houses', house.id, {...house, ownerId: personId}); }
}
window.saveNewPerson = async () => { const pid = await add('people', getPersonData()); await updateOwnership(pid, document.getElementById('p-car')?.value, document.getElementById('p-house')?.value); switchView('people'); };
window.editPerson = async (id) => { const p = await one('people', id); if (p) showPersonForm(p); };
window.saveEditPerson = async (id) => { await update('people', id, getPersonData()); await updateOwnership(id, document.getElementById('p-car')?.value, document.getElementById('p-house')?.value); switchView('people'); };

window.viewPersonModal = async (id) => {
  const person = await one('people', id);
  if (!person) return;
  const allPeople = await all('people');
  const spouse = person.spouseId ? allPeople.find(p => p.id === person.spouseId) : null;
  let html = `
    <div class="modal-overlay" onclick="this.remove()">
      <div class="modal-content glass" style="max-width:700px;" onclick="event.stopPropagation()">
        <button onclick="this.closest('.modal-overlay').remove()" style="float:left; background:transparent; border:1px solid var(--accent); color:var(--accent); padding:5px 10px; border-radius:8px;">✕</button>
        <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px;">
          ${person.photo ? (person.mediaType==='video'?`<video src="${person.photo}" controls style="width:80px;height:80px;border-radius:50%;"></video>`:`<img src="${person.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">`) : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:2rem;">${(person.firstName?.[0]||'')+(person.lastName?.[0]||'')}</div>`}
          <div><h2>${person.firstName} ${person.lastName} ${person.alias ? '"'+person.alias+'"' : ''}</h2> ${calculateAgeFromJalali(person.birthDate) ? `<p style="color:var(--accent);">${calculateAgeFromJalali(person.birthDate)} سال</p>` : ''}</div>
        </div>
        <div class="info-row"><span class="info-label">خلاصه</span><span class="info-value">${getProfileSummary(person)}</span></div>
        ${person.city ? `<div class="info-row"><span class="info-label">📍 شهر</span><span class="info-value">${person.city}</span></div>` : ''}
        ${person.phones?.length ? `<div class="info-row"><span class="info-label">📞 تلفن</span><span class="info-value">${person.phones.map(ph=>`${ph.type}: ${ph.number}`).join(' | ')}</span></div>` : ''}
        ${person.nationalId ? `<div class="info-row"><span class="info-label">🆔 کد ملی</span><span class="info-value">${person.nationalId} ${validateNationalId(person.nationalId)?'(معتبر)':'(نامعتبر)'} ${getProvinceFromNid(person.nationalId)||''}</span></div>` : ''}
        ${person.bloodGroup ? `<div class="info-row"><span class="info-label">🩸 گروه خونی</span><span class="info-value">${person.bloodGroup}</span></div>` : ''}
        ${person.height ? `<div class="info-row"><span class="info-label">📏 قد</span><span class="info-value">${person.height} سانتی‌متر</span></div>` : ''}
        ${person.weight ? `<div class="info-row"><span class="info-label">⚖️ وزن</span><span class="info-value">${person.weight} کیلوگرم</span></div>` : ''}
        ${person.languages ? `<div class="info-row"><span class="info-label">🗣️ زبان‌ها</span><span class="info-value">${person.languages}</span></div>` : ''}
        ${person.nationality ? `<div class="info-row"><span class="info-label">🌍 ملیت</span><span class="info-value">${person.nationality}</span></div>` : ''}
        ${person.phoneModel ? `<div class="info-row"><span class="info-label">📱 مدل گوشی</span><span class="info-value">${person.phoneModel}</span></div>` : ''}
        ${person.color ? `<div class="info-row"><span class="info-label">🎨 رنگ مورد علاقه</span><span class="info-value">${person.color}</span></div>` : ''}
        ${person.allergies ? `<div class="info-row"><span class="info-label">🤧 بیماری/آلرژی</span><span class="info-value">${person.allergies}</span></div>` : ''}
        ${person.maritalStatus ? `<div class="info-row"><span class="info-label">💍 تأهل</span><span class="info-value">${person.maritalStatus}${spouse ? ` (همسر: ${spouse.firstName} ${spouse.lastName})` : ''}</span></div>` : ''}
        ${person.childrenCount ? `<div class="info-row"><span class="info-label">👶 فرزندان</span><span class="info-value">${person.childrenCount}</span></div>` : ''}
        ${person.fatherName ? `<div class="info-row"><span class="info-label">👨 پدر</span><span class="info-value">${person.fatherName}</span></div>` : ''}
        ${person.motherName ? `<div class="info-row"><span class="info-label">👩 مادر</span><span class="info-value">${person.motherName}</span></div>` : ''}
        ${person.emergencyPhone ? `<div class="info-row"><span class="info-label">🆘 اضطراری</span><span class="info-value">${person.emergencyPhone}</span></div>` : ''}
        ${person.friends?.length ? `<div class="info-row"><span class="info-label">👥 دوستان</span><span class="info-value">${person.friends.join(', ')}</span></div>` : ''}
        ${person.degree ? `<div class="info-row"><span class="info-label">🎓 مدرک</span><span class="info-value">${person.degree} ${person.fieldOfStudy ? ' - ' + person.fieldOfStudy : ''} ${person.university ? ' - ' + person.university : ''} ${person.graduationYear ? ' (' + person.graduationYear + ')' : ''}</span></div>` : ''}
        ${person.job ? `<div class="info-row"><span class="info-label">💼 شغل</span><span class="info-value">${person.job} ${person.position ? ' - ' + person.position : ''} ${person.workplace ? ' در ' + person.workplace : ''} ${person.salary ? ' (حقوق: ' + person.salary + ')' : ''}</span></div>` : ''}
        ${person.employmentStatus ? `<div class="info-row"><span class="info-label">📊 وضعیت</span><span class="info-value">${person.employmentStatus}</span></div>` : ''}
        ${person.interests ? `<div class="info-row"><span class="info-label">❤️ علایق</span><span class="info-value">${person.interests}</span></div>` : ''}
        ${person.dislikes ? `<div class="info-row"><span class="info-label">👎 تنفرها</span><span class="info-value">${person.dislikes}</span></div>` : ''}
        ${person.favoriteMusic ? `<div class="info-row"><span class="info-label">🎵 موسیقی</span><span class="info-value">${person.favoriteMusic}</span></div>` : ''}
        ${person.favoriteMovie ? `<div class="info-row"><span class="info-label">🎬 فیلم</span><span class="info-value">${person.favoriteMovie}</span></div>` : ''}
        ${person.favoriteBook ? `<div class="info-row"><span class="info-label">📚 کتاب</span><span class="info-value">${person.favoriteBook}</span></div>` : ''}
        ${person.personality ? `<div class="info-row"><span class="info-label">🧠 تیپ شخصیتی</span><span class="info-value">${person.personality}</span></div>` : ''}
        ${person.preferredContact ? `<div class="info-row"><span class="info-label">📞 ارتباط ترجیحی</span><span class="info-value">${person.preferredContact}</span></div>` : ''}
        ${person.suitableHours ? `<div class="info-row"><span class="info-label">⏰ ساعات تماس</span><span class="info-value">${person.suitableHours}</span></div>` : ''}
        ${person.habits ? `<div class="info-row"><span class="info-label">📝 عادت‌ها</span><span class="info-value">${person.habits}</span></div>` : ''}
        ${person.tags?.length ? `<div class="info-row"><span class="info-label">🏷️ برچسب‌ها</span><span class="info-value">${person.tags.join(', ')}</span></div>` : ''}
        ${person.category ? `<div class="info-row"><span class="info-label">📂 دسته</span><span class="info-value">${person.category}</span></div>` : ''}
        ${person.manualScore ? `<div class="info-row"><span class="info-label">⭐ امتیاز</span><span class="info-value">${'★'.repeat(person.manualScore)}${'☆'.repeat(5-person.manualScore)}</span></div>` : ''}
        ${person.idCardPhoto ? `<div class="info-row"><span class="info-label">🪪 کارت ملی</span><span class="info-value"><img src="${person.idCardPhoto}" style="max-width:100px;"></span></div>` : ''}
        ${person.passportPhoto ? `<div class="info-row"><span class="info-label">🛂 پاسپورت</span><span class="info-value"><img src="${person.passportPhoto}" style="max-width:100px;"></span></div>` : ''}
        ${person.licensePhoto ? `<div class="info-row"><span class="info-label">🚗 گواهینامه</span><span class="info-value"><img src="${person.licensePhoto}" style="max-width:100px;"></span></div>` : ''}
        ${person.signature ? `<div class="info-row"><span class="info-label">✍️ امضا</span><span class="info-value"><img src="${person.signature}" style="max-width:150px;"></span></div>` : ''}
        <h4>💳 کارت بانکی</h4>
        <div class="bank-card glass" style="background:linear-gradient(135deg,#1a1a2e,#16213e); padding:20px; border-radius:16px; color:#fff; margin:10px 0;">
          <div style="font-size:1.5rem; letter-spacing:3px;">
            <span id="bank-number-${person.id}">${person.cardNumber ? maskCardNumber(decryptData(person.cardNumber)) : '---- ---- ---- ----'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:15px;">
            <div><small>انقضا</small><br>${person.cardExpMonth||'??'}/${person.cardExpYear||'??'}</div>
            <div><small>CVV2</small><br><span id="bank-cvv-${person.id}">***</span></div>
          </div>
          <div>${person.cardHolder || 'نام دارنده'}</div>
          <button class="btn-glass" onclick="toggleBankInfo(${person.id})" style="margin-top:10px;">
            <span id="bank-toggle-icon-${person.id}">🔍</span> نمایش اطلاعات محرمانه
          </button>
        </div>
        <h4>QR Code</h4>
        <canvas id="qrcode-${person.id}" width="100" height="100"></canvas>
        <script>new QRious({element:document.getElementById('qrcode-${person.id}'),value:JSON.stringify({id:person.id,name:person.firstName+' '+person.lastName}),size:100});<\/script>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

function getProfileSummary(p) {
  const age = calculateAgeFromJalali(p.birthDate);
  let parts = [];
  if (p.gender) parts.push(p.gender);
  if (age) parts.push(`${age} ساله`);
  if (p.city) parts.push(`ساکن ${p.city}`);
  if (p.job) parts.push(`شاغل در ${p.job}`);
  return parts.join('، ') || 'بدون شرح';
}

function maskCardNumber(num) { return num ? `**** **** **** ${num.slice(-4)}` : '**** **** **** ****'; }

window.toggleBankInfo = async function(id) {
  const numSpan = document.getElementById(`bank-number-${id}`);
  const cvvSpan = document.getElementById(`bank-cvv-${id}`);
  const icon = document.getElementById(`bank-toggle-icon-${id}`);
  const p = await one('people', id);
  if (numSpan.textContent.startsWith('****')) {
    numSpan.textContent = formatCardNumberForDisplay(decryptData(p.cardNumber) || '---- ---- ---- ----');
    cvvSpan.textContent = decryptData(p.cardCVV) || '***';
    icon.textContent = '🙈';
  } else {
    numSpan.textContent = p.cardNumber ? maskCardNumber(decryptData(p.cardNumber)) : '---- ---- ---- ----';
    cvvSpan.textContent = '***';
    icon.textContent = '🔍';
  }
};

function formatCardNumberForDisplay(num) {
  if (!num) return '---- ---- ---- ----';
  let formatted = '';
  for (let i = 0; i < num.length; i++) {
    if (i > 0 && i % 4 === 0) formatted += ' ';
    formatted += num[i];
  }
  return formatted;
}

// ==================== HOUSES ====================
async function houses(container) {
  const [houses, people] = await Promise.all([all('houses'), all('people')]);
  container.innerHTML = `
    <div class="section-title">🏠 خانه‌ها</div>
    ${houses.map(h => {
      const owner = people.find(p => p.id === h.ownerId);
      let info = '';
      if (h.address) info += `<strong>${h.address}</strong>`;
      if (h.city) info += ` - ${h.city}`;
      if (owner) info += ` | مالک: ${owner.firstName} ${owner.lastName}`;
      return `<div class="card glass">
        ${h.photo ? (h.mediaType === 'video' ? `<video src="${h.photo}" controls style="width:60px;border-radius:12px;float:left;margin-left:10px;"></video>` : `<img src="${h.photo}" style="width:60px;border-radius:12px;float:left;margin-left:10px;">`) : ''}
        ${info}
        <div style="margin-top:8px;"><button onclick="editHouse(${h.id})">✏️</button><button onclick="remove('houses',${h.id}).then(()=>switchView('houses'))">🗑</button></div>
      </div>`;
    }).join('')}
    <button class="primary" onclick="showHouseForm()">+ خانه جدید</button>
    <div id="house-form" class="hidden"></div>
  `;
}
window.showHouseForm = async function(house = null) {
  const [people, galleryItems] = await Promise.all([all('people'), all('gallery')]);
  const opts = '<option value="">بدون مالک</option>' + people.map(p => `<option value="${p.id}" ${house?.ownerId===p.id?'selected':''}>${p.firstName} ${p.lastName}</option>`).join('');
  const galleryOpts = galleryItems.map(g => `<option value="${g.id}" data-type="${g.type}" data-data="${g.data}">${g.name||'بدون نام'}</option>`).join('');
  document.getElementById('house-form').innerHTML = `
    <div class="card glass">
      <h3>${house ? 'ویرایش خانه' : 'افزودن خانه'}</h3>
      <input id="h-addr" placeholder="آدرس" value="${house?.address||''}">
      <input id="h-city" placeholder="شهر" value="${house?.city||''}">
      <select id="h-type">
        <option ${house?.type==='آپارتمان'?'selected':''}>آپارتمان</option>
        <option ${house?.type==='ویلایی'?'selected':''}>ویلایی</option>
        <option ${house?.type==='زمین'?'selected':''}>زمین</option>
        <option ${house?.type==='مغازه'?'selected':''}>مغازه</option>
      </select>
      <input id="h-area" placeholder="متراژ" value="${house?.area||''}">
      <input id="h-rooms" placeholder="تعداد اتاق" value="${house?.rooms||''}">
      <input id="h-floor" placeholder="طبقه" value="${house?.floor||''}">
      <input id="h-year" placeholder="سال ساخت" value="${house?.year||''}">
      <textarea id="h-desc" placeholder="توضیحات">${house?.description||''}</textarea>
      <label>عکس/ویدیو از گالری</label>
      <select id="h-gallery" onchange="previewHouseMedia()"><option value="">بدون انتخاب</option>${galleryOpts}</select>
      <div id="h-media-preview" style="max-width:150px;margin-top:8px;">
        ${house?.photo ? (house.mediaType === 'video' ? `<video src="${house.photo}" controls style="max-width:100%;border-radius:12px;"></video>` : `<img src="${house.photo}" style="max-width:100%;border-radius:12px;">`) : ''}
      </div>
      <input type="hidden" id="h-photo" value="${house?.photo||''}">
      <input type="hidden" id="h-media-type" value="${house?.mediaType||'image'}">
      <select id="h-owner">${opts}</select>
      <button class="primary" onclick="${house ? `saveEditHouse(${house.id})` : 'saveNewHouse()'}">💾 ذخیره</button>
      <button class="btn-glass" onclick="document.getElementById('house-form').classList.add('hidden')">✕ لغو</button>
    </div>`;
  document.getElementById('house-form').classList.remove('hidden');
};
window.previewHouseMedia = () => {
  const sel = document.getElementById('h-gallery');
  if (!sel.value) { document.getElementById('h-media-preview').innerHTML=''; document.getElementById('h-photo').value=''; document.getElementById('h-media-type').value='image'; return; }
  const opt = sel.options[sel.selectedIndex];
  document.getElementById('h-photo').value = opt.dataset.data;
  document.getElementById('h-media-type').value = opt.dataset.type;
  document.getElementById('h-media-preview').innerHTML = opt.dataset.type==='video' ? `<video src="${opt.dataset.data}" controls></video>` : `<img src="${opt.dataset.data}">`;
};
function getHouseData() {
  return {
    address: document.getElementById('h-addr').value,
    city: document.getElementById('h-city').value,
    type: document.getElementById('h-type').value,
    area: document.getElementById('h-area').value,
    rooms: document.getElementById('h-rooms').value,
    floor: document.getElementById('h-floor').value,
    year: document.getElementById('h-year').value,
    description: document.getElementById('h-desc').value,
    photo: document.getElementById('h-photo').value,
    mediaType: document.getElementById('h-media-type').value,
    ownerId: parseInt(document.getElementById('h-owner').value) || null
  };
}
window.saveNewHouse = async () => { await add('houses', getHouseData()); switchView('houses'); };
window.editHouse = async (id) => { const h = await one('houses', id); if (h) showHouseForm(h); };
window.saveEditHouse = async (id) => { await update('houses', id, getHouseData()); switchView('houses'); };

// ==================== CARS ====================
async function cars(container) {
  const [cars, people] = await Promise.all([all('cars'), all('people')]);
  container.innerHTML = `
    <div class="section-title">🚗 خودروها</div>
    ${cars.map(c => {
      const owner = people.find(p => p.id === c.ownerId);
      return `<div class="card glass">
        <strong>${c.brand||''} ${c.model||''}</strong> | پلاک: <span class="plate-formatted">${formatPlate(c.plate)}</span> ${c.color ? '| رنگ: '+c.color : ''}
        ${owner ? '| مالک: '+owner.firstName+' '+owner.lastName : ''}
        <div style="margin-top:5px;font-size:0.8rem;">${c.status ? 'وضعیت: '+c.status : ''} ${c.fuel ? '⛽'+c.fuel : ''}</div>
        <button onclick="editCar(${c.id})">✏️</button>
        <button onclick="remove('cars',${c.id}).then(()=>switchView('cars'))">🗑</button>
      </div>`;
    }).join('')}
    <button class="primary" onclick="showCarForm()">+ خودرو جدید</button>
    <div id="car-form" class="hidden"></div>
  `;
}
window.showCarForm = async function(car = null) {
  const people = await all('people');
  const opts = '<option value="">بدون مالک</option>' + people.map(p => `<option value="${p.id}" ${car?.ownerId===p.id?'selected':''}>${p.firstName} ${p.lastName}</option>`).join('');
  let plate2='', plateL='', plate3='', plateLast2='';
  if (car && car.plate) {
    const cleaned = car.plate.replace(/[^\dآ-ی]/g, '');
    if (cleaned.length >= 7) {
      plate2 = cleaned.slice(0,2); plateL = cleaned[2]; plate3 = cleaned.slice(3,6); plateLast2 = cleaned.slice(6,8);
    }
  }
  document.getElementById('car-form').innerHTML = `
    <div class="card glass">
      <h3>${car ? 'ویرایش خودرو' : 'افزودن خودرو'}</h3>
      <div class="grid-2">
        <input id="c-brand" placeholder="برند" value="${car?.brand||''}">
        <input id="c-model" placeholder="مدل" value="${car?.model||''}">
        <div><label>پلاک</label><div class="plate-inputs">
          <input id="c-plate2" placeholder="۱۲" maxlength="2" value="${plate2}">
          <input id="c-plateL" placeholder="ب" maxlength="1" value="${plateL}">
          <input id="c-plate3" placeholder="۳۴۵" maxlength="3" value="${plate3}">
          <input id="c-plateLast" placeholder="۶۷" maxlength="2" value="${plateLast2}">
        </div></div>
        <input id="c-color" placeholder="رنگ" value="${car?.color||''}">
        <input id="c-year" type="number" placeholder="سال ساخت" value="${car?.year||''}">
        <select id="c-fuel">
          <option ${car?.fuel==='بنزین'?'selected':''}>بنزین</option>
          <option ${car?.fuel==='دیزل'?'selected':''}>دیزل</option>
          <option ${car?.fuel==='گاز'?'selected':''}>گاز</option>
          <option ${car?.fuel==='برقی'?'selected':''}>برقی</option>
          <option ${car?.fuel==='دوگانه'?'selected':''}>دوگانه</option>
        </select>
        <select id="c-gear">
          <option ${car?.gearbox==='دستی'?'selected':''}>دستی</option>
          <option ${car?.gearbox==='اتوماتیک'?'selected':''}>اتوماتیک</option>
        </select>
        <select id="c-status">
          <option ${car?.status==='فعال'?'selected':''}>فعال</option>
          <option ${car?.status==='در تعمیرگاه'?'selected':''}>در تعمیرگاه</option>
          <option ${car?.status==='فروخته شده'?'selected':''}>فروخته شده</option>
        </select>
        <textarea id="c-desc" placeholder="توضیحات">${car?.description||''}</textarea>
      </div>
      <select id="c-owner">${opts}</select>
      <button class="primary" onclick="${car ? `saveEditCar(${car.id})` : 'saveNewCar()'}">💾 ذخیره</button>
      <button class="btn-glass" onclick="document.getElementById('car-form').classList.add('hidden')">✕ لغو</button>
    </div>`;
  document.getElementById('car-form').classList.remove('hidden');
};
function getCarData() {
  const p2 = document.getElementById('c-plate2').value.trim();
  const pL = document.getElementById('c-plateL').value.trim();
  const p3 = document.getElementById('c-plate3').value.trim();
  const pLast = document.getElementById('c-plateLast').value.trim();
  const plate = (p2 && pL && p3 && pLast) ? `${p2}${pL}${p3}-${pLast}` : '';
  return {
    brand: document.getElementById('c-brand').value, model: document.getElementById('c-model').value,
    plate, color: document.getElementById('c-color').value, year: document.getElementById('c-year').value,
    fuel: document.getElementById('c-fuel').value, gearbox: document.getElementById('c-gear').value,
    status: document.getElementById('c-status').value, description: document.getElementById('c-desc').value,
    ownerId: parseInt(document.getElementById('c-owner').value) || null
  };
}
window.saveNewCar = async () => { await add('cars', getCarData()); switchView('cars'); };
window.editCar = async (id) => { const c = await one('cars', id); if (c) showCarForm(c); };
window.saveEditCar = async (id) => { await update('cars', id, getCarData()); switchView('cars'); };

// ==================== FAMILY ====================
async function family(container) {
  const [families, people] = await Promise.all([all('family'), all('people')]);
  container.innerHTML = `
    <div class="section-title">👨‍👩‍👧 خانواده‌ها</div>
    ${families.map(f => {
      const members = (f.members || []).map(m => {
        const p = people.find(p => p.id === m.personId);
        return p ? `${p.firstName} (${m.relation})` : '';
      }).join('، ');
      return `<div class="card glass"><strong>${f.name||''}</strong> | ${members}
        <button onclick="editFamily(${f.id})">✏️</button>
        <button onclick="remove('family',${f.id}).then(()=>switchView('family'))">🗑</button>
      </div>`;
    }).join('')}
    <button class="primary" onclick="showFamilyForm()">+ خانواده جدید</button>
    <div id="family-form" class="hidden"></div>
  `;
}
window.showFamilyForm = async function(family = null) {
  const people = await all('people');
  let members = family ? [...(family.members || [])] : [];
  const formDiv = document.getElementById('family-form');
  const renderMembersList = () => {
    let membersHtml = members.map((m, idx) => {
      const person = people.find(p => p.id === m.personId);
      return `
        <div style="display:flex;align-items:center;gap:10px;margin:5px 0;">
          <span>${person ? person.firstName + ' ' + person.lastName : 'نامشخص'}</span>
          <input class="rel-inp" placeholder="نسبت" value="${m.relation||''}" data-idx="${idx}" onchange="updateMemberRelation(${idx}, this.value)">
          <button onclick="removeMember(${idx})" style="background:transparent;border:1px solid var(--accent);color:var(--accent);padding:5px 10px;">✕</button>
        </div>`;
    }).join('');
    membersHtml += `
      <div style="display:flex;gap:10px;margin-top:10px;">
        <select id="new-member-select">
          <option value="">انتخاب فرد</option>
          ${people.filter(p => !members.some(m => m.personId === p.id)).map(p => `<option value="${p.id}">${p.firstName} ${p.lastName}</option>`).join('')}
        </select>
        <button onclick="addMember()" class="primary" style="padding:8px 16px;">+ افزودن</button>
      </div>`;
    formDiv.innerHTML = `
      <div class="card glass">
        <h3>${family ? 'ویرایش خانواده' : 'خانواده جدید'}</h3>
        <input id="f-name" placeholder="نام خانواده" value="${family?.name||''}">
        <div style="max-height:300px;overflow-y:auto;margin:10px 0;">${membersHtml}</div>
        <button class="primary" onclick="${family ? `saveEditedFamily(${family.id})` : 'saveNewFamily()'}">💾 ذخیره</button>
        <button class="btn-glass" onclick="document.getElementById('family-form').classList.add('hidden')">✕ لغو</button>
      </div>`;
  };
  window.addMember = () => {
    const select = document.getElementById('new-member-select');
    if (!select.value) return;
    members.push({ personId: parseInt(select.value), relation: '' });
    renderMembersList();
  };
  window.removeMember = (idx) => { members.splice(idx, 1); renderMembersList(); };
  window.updateMemberRelation = (idx, value) => { members[idx].relation = value; };
  window.saveEditedFamily = async (id) => { const name = document.getElementById('f-name').value; await update('family', id, { name, members }); switchView('family'); };
  window.saveNewFamily = async () => { const name = document.getElementById('f-name').value; await add('family', { name, members }); switchView('family'); };
  renderMembersList();
  document.getElementById('family-form').classList.remove('hidden');
};

// ==================== TIMELINE ====================
async function timeline(container) {
  const logs = await all('timeline');
  logs.sort((a,b) => new Date(b.time) - new Date(a.time));
  const recent = logs.slice(0, 100);
  let html = `<div class="section-title">⏳ تایم‌لاین (${logs.length} رویداد)</div>`;
  if (logs.length > 100) html += `<p style="color:var(--accent);">نمایش ۱۰۰ رویداد اخیر از ${logs.length}</p>`;
  html += recent.map(l => `<div class="card glass">${new Date(l.time).toLocaleString('fa-IR')} - ${l.type} (${l.recordId}) ${l.action}</div>`).join('');
  container.innerHTML = html;
}

// ==================== DASHBOARD ====================
async function dashboard(container) {
  const [p, h, c, f] = await Promise.all([all('people'), all('houses'), all('cars'), all('family')]);
  container.innerHTML = `
    <div class="section-title">📊 داشبورد</div>
    <div class="kpi-row">
      <div class="kpi glass">👤 ${p.length}</div><div class="kpi glass">🏠 ${h.length}</div>
      <div class="kpi glass">🚗 ${c.length}</div><div class="kpi glass">👨‍👩‍👧 ${f.length}</div>
    </div>
    <canvas id="cityChart" width="400" height="200"></canvas>`;
  const cities = {};
  p.forEach(per => { if (per.city) cities[per.city] = (cities[per.city]||0) + 1; });
  new Chart(document.getElementById('cityChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(cities),
      datasets: [{ label: 'تعداد افراد', data: Object.values(cities), backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() }]
    }
  });
}

// ==================== SETTINGS ====================
async function settings(container) {
  const galleryItems = await all('gallery');
  const currentBg = localStorage.getItem('customBg') || '';
  const currentTheme = localStorage.getItem('theme') || 'space';
  const themes = [
    { id: 'hacker', name: 'هکر سبز' }, { id: 'gold', name: 'طلایی' }, { id: 'blue', name: 'آبی' },
    { id: 'red', name: 'قرمز' }, { id: 'purple', name: 'بنفش' }, { id: 'space', name: 'فضایی' }
  ];
  container.innerHTML = `
    <div class="section-title">⚙️ تنظیمات</div>
    <div class="card glass" style="margin-bottom:15px;">
      <h3>🎨 انتخاب تم</h3>
      <select id="theme-select">${themes.map(t => `<option value="${t.id}" ${currentTheme===t.id?'selected':''}>${t.name}</option>`).join('')}</select>
      <button class="primary" onclick="applyTheme()">اعمال تم</button>
    </div>
    <div class="card glass">
      <h3>🖼️ پس‌زمینه سفارشی</h3>
      <select id="bg-select"><option value="">پیش‌فرض</option>
        ${galleryItems.map(g => `<option value="${g.data}" ${currentBg===g.data?'selected':''}>${g.name||'بدون نام'}</option>`).join('')}
      </select>
      <button class="primary" onclick="applyBackground()">اعمال</button>
    </div>`;
  window.applyTheme = () => { const val = document.getElementById('theme-select').value; changeTheme(val); alert('تم تغییر کرد'); };
  window.applyBackground = () => {
    const bg = document.getElementById('bg-select').value;
    localStorage.setItem('customBg', bg);
    if (bg) { document.body.style.backgroundImage = `url(${bg})`; document.body.style.backgroundSize = 'cover'; }
    else { document.body.style.backgroundImage = ''; }
    alert('پس‌زمینه اعمال شد');
  };
}

// ==================== COMPARE ====================
async function compare(container) {
  const people = await all('people');
  const opts = people.map(p => `<option value="${p.id}">${p.firstName} ${p.lastName}</option>`).join('');
  container.innerHTML = `
    <div class="section-title">⚖️ مقایسه دو پروفایل</div>
    <select id="cmp1">${opts}</select>
    <select id="cmp2">${opts}</select>
    <button class="primary" onclick="doCompare()">مقایسه</button>
    <div id="compare-result" style="margin-top:20px;"></div>
  `;
}
window.doCompare = async () => {
  const id1 = document.getElementById('cmp1').value, id2 = document.getElementById('cmp2').value;
  if (!id1 || !id2) return;
  const [p1, p2] = await Promise.all([one('people', parseInt(id1)), one('people', parseInt(id2))]);
  const result = document.getElementById('compare-result');
  result.innerHTML = `
    <div class="card glass"><h3>${p1.firstName} ${p1.lastName} ↔ ${p2.firstName} ${p2.lastName}</h3>
      <p>نسبت احتمالی: ${detectRelation(p1, p2)}</p>
    </div>`;
};
function detectRelation(p1, p2) {
  if (p1.spouseId === p2.id || p2.spouseId === p1.id) return 'همسر';
  if (p1.fatherName && p2.fatherName && p1.fatherName === p2.fatherName) return 'خواهر/برادر';
  if (p1.id === p2.fatherName || p2.id === p1.fatherName) return 'فرزند';
  return 'نامشخص';
}

// ==================== SEARCH ====================
async function performSearch(query) {
  if (!query) return switchView(currentView);
  const allData = [];
  const people = await all('people'), houses = await all('houses'), cars = await all('cars'), families = await all('family');
  people.forEach(p => allData.push({type:'people', item:p, text: getSearchableText(p, 'people')}));
  houses.forEach(h => allData.push({type:'houses', item:h, text: getSearchableText(h, 'houses')}));
  cars.forEach(c => allData.push({type:'cars', item:c, text: getSearchableText(c, 'cars')}));
  families.forEach(f => allData.push({type:'family', item:f, text: getSearchableText(f, 'family')}));
  const lowerQ = query.toLowerCase();
  const results = allData.filter(({text}) => {
    if (text.includes(lowerQ)) return true;
    const words = text.split(/\s+/);
    return words.some(w => levenshtein(w, lowerQ) <= 2);
  });
  document.getElementById('view-container').innerHTML = `
    <div class="section-title">🔍 نتایج برای "${query}"</div>
    ${results.map(r => `<div class="card glass">${JSON.stringify(r.item, null, 2)}</div>`).join('') || '<p>نتیجه‌ای یافت نشد.</p>'}`;
}

// ==================== BACKUP ====================
async function exportBackup() {
  const backup = {};
  for (const s of stores) backup[s] = await all(s);
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `corevault_backup_${Date.now()}.json`;
  a.click();
}
function importBackup() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    const text = await file.text();
    const backup = JSON.parse(text);
    for (const s of stores) {
      const t = db.transaction(s, 'readwrite').objectStore(s);
      await new Promise(resolve => { t.clear().onsuccess = () => { for (const item of backup[s] || []) t.add(item); resolve(); }; });
    }
    switchView('dashboard');
  };
  input.click();
}

// ==================== INIT ====================
openDB().then(() => {
  const theme = localStorage.getItem('theme') || 'space';
  changeTheme(theme);
  const bg = localStorage.getItem('customBg');
  if (bg) { document.body.style.backgroundImage = `url(${bg})`; document.body.style.backgroundSize = 'cover'; }
  if (localStorage.getItem('cv_auth') === '1' || localStorage.getItem('cv_guest') === '1') {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    switchView('dashboard');
  }
});