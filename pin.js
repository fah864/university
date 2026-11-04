/* ============================================================================
   🎓 مُساعد الجامعة — pin.js (قفل الخصوصية PBKDF2-SHA256، قفل المحاولات، والاستعادة الآمنة)
   ============================================================================ */

/* ============================================================
   32) 🔐 نظام قفل الخصوصية (PIN Lock — PBKDF2 + Lockout)
============================================================ */
let currentPinInput = '';
let _pinVerifying = false;
let _pinLockoutTimer = null;

function bytesToHex(bytes){
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex){
  const clean = String(hex || '').replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for(let i = 0; i < out.length; i++){
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
function constantTimeEqual(a, b){
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  let diff = sa.length ^ sb.length;
  const maxLen = Math.max(sa.length, sb.length);
  for(let i = 0; i < maxLen; i++){
    diff |= (sa.charCodeAt(i) || 0) ^ (sb.charCodeAt(i) || 0);
  }
  return diff === 0;
}
async function hashPinPBKDF2(pin, saltHex, iterations = PIN_PBKDF2_ITER){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(String(pin)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations: Number(iterations) || PIN_PBKDF2_ITER,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}
async function createPinRecord(pin){
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = bytesToHex(saltBytes);
  const hashHex = await hashPinPBKDF2(pin, saltHex, PIN_PBKDF2_ITER);
  return {
    v: 2,
    algo: 'PBKDF2-SHA256',
    iter: PIN_PBKDF2_ITER,
    salt: saltHex,
    hash: hashHex
  };
}
function parsePinRecord(raw){
  if(!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if(/^\d{4}$/.test(trimmed)){
    return { v: 1, legacyPlain: trimmed };
  }
  try{
    const obj = JSON.parse(trimmed);
    if(obj && obj.v === 2 && typeof obj.salt === 'string' && typeof obj.hash === 'string'){
      return obj;
    }
  }catch(e){}
  return null;
}
function getSavedPin(){
  try{ return localStorage.getItem(PIN_STORE_KEY) || ''; }catch(e){ return ''; }
}
function hasSavedPin(){
  return Boolean(parsePinRecord(getSavedPin()));
}
async function verifyAndMigratePin(candidatePin){
  const rec = parsePinRecord(getSavedPin());
  if(!rec) return false;
  if(rec.v === 1){
    const matched = constantTimeEqual(String(candidatePin), rec.legacyPlain);
    if(matched){
      try{
        const upgraded = await createPinRecord(String(candidatePin));
        localStorage.setItem(PIN_STORE_KEY, JSON.stringify(upgraded));
      }catch(e){}
    }
    return matched;
  }
  if(rec.v === 2){
    const derived = await hashPinPBKDF2(String(candidatePin), rec.salt, rec.iter || PIN_PBKDF2_ITER);
    return constantTimeEqual(derived, rec.hash);
  }
  return false;
}
function getPinLockout(){
  try{
    const raw = localStorage.getItem(PIN_LOCKOUT_KEY);
    if(!raw) return { attempts: 0, lockUntil: 0 };
    const d = JSON.parse(raw);
    return {
      attempts: Math.max(0, parseInt(d?.attempts, 10) || 0),
      lockUntil: Math.max(0, parseInt(d?.lockUntil, 10) || 0)
    };
  }catch(e){
    return { attempts: 0, lockUntil: 0 };
  }
}
function savePinLockout(attempts, lockUntil){
  try{
    localStorage.setItem(PIN_LOCKOUT_KEY, JSON.stringify({ attempts, lockUntil }));
  }catch(e){}
}
function clearPinLockout(){
  if(_pinLockoutTimer){ clearInterval(_pinLockoutTimer); _pinLockoutTimer = null; }
  try{ localStorage.removeItem(PIN_LOCKOUT_KEY); }catch(e){}
}
const MAX_PIN_LOCKOUT_SEC = 3600; // الحد الأقصى لمدة قفل المحاولات: ساعة واحدة (3600 ثانية)
function recordPinFailure(){
  const cur = getPinLockout();
  const attempts = cur.attempts + 1;
  let lockUntil = 0;
  let lockSec = 0;
  if(attempts >= 5){
    lockSec = Math.min(MAX_PIN_LOCKOUT_SEC, 30 * Math.pow(2, attempts - 5));
    lockUntil = Date.now() + lockSec * 1000;
  }
  savePinLockout(attempts, lockUntil);
  return { attempts, lockUntil, lockSec };
}
function updatePinLockoutUI(){
  const msg = document.getElementById('pinPromptMsg');
  const { lockUntil } = getPinLockout();
  const remMs = lockUntil - Date.now();
  if(remMs > 0){
    const remSec = Math.ceil(remMs / 1000);
    if(msg){
      msg.textContent = `⏳ تم إيقاف المحاولات مؤقتاً — انتظر ${remSec} ثانية`;
      msg.style.color = 'var(--danger)';
    }
    return true;
  }
  if(_pinLockoutTimer){
    clearInterval(_pinLockoutTimer);
    _pinLockoutTimer = null;
    if(msg){
      msg.textContent = 'أدخل الرمز السري المكون من 4 أرقام للمتابعة';
      msg.style.color = '';
    }
  }
  return false;
}
function startPinLockoutTicker(){
  if(_pinLockoutTimer) clearInterval(_pinLockoutTimer);
  updatePinLockoutUI();
  _pinLockoutTimer = setInterval(updatePinLockoutUI, 500);
}
function renderPinSettingsUI(){
  const active = hasSavedPin();
  const statusBox = document.getElementById('pinStatusBox');
  const setBtn = document.getElementById('setPinBtn');
  const remBtn = document.getElementById('removePinBtn');
  const lockNow = document.getElementById('lockNowBtn');
  if(statusBox){
    statusBox.innerHTML = active
      ? '<span style="color:var(--ok)">✅ قفل الخصوصية مفعّل (مشفر بـ PBKDF2)</span>'
      : '<span style="color:var(--muted)">🔓 قفل الخصوصية غير مفعّل</span>';
  }
  if(setBtn) setBtn.textContent = active ? '🔑 تغيير رمز القفل' : '🔒 تعيين رمز قفل';
  if(remBtn) remBtn.style.display = active ? '' : 'none';
  if(lockNow) lockNow.style.display = active ? 'grid' : 'none';
}
function openPinSetupModal(){
  openModal('🔐 إعداد قفل الخصوصية', `
    <div class="field">
      <label for="newPinInput">أدخل رمزاً سرياً من 4 أرقام</label>
      <input id="newPinInput" type="password" inputmode="numeric" maxlength="4" placeholder="••••" style="text-align:center;font-size:24px;letter-spacing:10px;font-weight:800">
    </div>
    <p style="font-size:12px;color:var(--muted);margin-top:10px;line-height:1.7">
      يُحفظ الرمز مشفراً بمعيار PBKDF2-SHA256. يحمي هذا القفل خصوصيتك من التطفل العابر، ويمكنك دائماً تصدير نسخة احتياطية وإعادة ضبطه إذا نسيته.
    </p>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="saveNewPin()">💾 تفعيل قفل الخصوصية</button>
  `);
}
async function saveNewPin(){
  const val = (document.getElementById('newPinInput')?.value || '').trim();
  if(!/^\d{4}$/.test(val)){
    toast('⚠️ يجب أن يتكون الرمز من 4 أرقام بالضبط');
    return;
  }
  try{
    const rec = await createPinRecord(val);
    localStorage.setItem(PIN_STORE_KEY, JSON.stringify(rec));
    clearPinLockout();
  }catch(e){
    toast('❌ تعذّر تشفير وحفظ الرمز');
    return;
  }
  closeModal();
  renderPinSettingsUI();
  toast('🔒 تم تفعيل قفل الخصوصية بنجاح');
}
async function removePinLock(){
  const ok = await appConfirm('إلغاء قفل الخصوصية بالرمز السري؟', {
    title: 'إلغاء قفل الخصوصية', emoji: '🔓', okText: 'إلغاء القفل', variant: 'warn'
  });
  if(!ok) return;
  try{ localStorage.removeItem(PIN_STORE_KEY); }catch(e){}
  clearPinLockout();
  renderPinSettingsUI();
  toast('🔓 تم إلغاء قفل الخصوصية');
}
function lockAppNow(){
  if(!hasSavedPin()) return;
  currentPinInput = '';
  updatePinDotsUI();
  const ov = document.getElementById('pinOverlay');
  if(ov){ ov.classList.add('open'); syncBodyScrollLock(); }
  const { lockUntil } = getPinLockout();
  if(lockUntil > Date.now()) startPinLockoutTicker();
}
async function pressPinKey(digit){
  if(!hasSavedPin() || _pinVerifying) return;
  if(updatePinLockoutUI()){
    startPinLockoutTicker();
    return;
  }
  if(currentPinInput.length >= 4) return;
  currentPinInput += String(digit);
  updatePinDotsUI();
  if(currentPinInput.length === 4){
    _pinVerifying = true;
    const candidate = currentPinInput;
    try{
      const ok = await verifyAndMigratePin(candidate);
      if(ok){
        clearPinLockout();
        const msg = document.getElementById('pinPromptMsg');
        if(msg){
          msg.textContent = 'أدخل الرمز السري المكون من 4 أرقام للمتابعة';
          msg.style.color = '';
        }
        setTimeout(() => {
          document.getElementById('pinOverlay')?.classList.remove('open');
          currentPinInput = '';
          updatePinDotsUI();
          syncBodyScrollLock();
        }, 120);
      } else {
        const fail = recordPinFailure();
        const dots = document.querySelectorAll('#pinDots .pin-dot');
        dots.forEach(d => d.classList.add('error'));
        const msg = document.getElementById('pinPromptMsg');
        if(fail.lockUntil > Date.now()){
          startPinLockoutTicker();
        } else if(msg){
          msg.textContent = `❌ الرمز غير صحيح (المحاولة ${fail.attempts} من 5)`;
          msg.style.color = 'var(--danger)';
        }
        setTimeout(() => {
          currentPinInput = '';
          updatePinDotsUI();
        }, 550);
      }
    }finally{
      _pinVerifying = false;
    }
  }
}
function backspacePinKey(){
  if(_pinVerifying || updatePinLockoutUI()) return;
  currentPinInput = currentPinInput.slice(0, -1);
  updatePinDotsUI();
}
function clearPinEntry(){
  if(_pinVerifying || updatePinLockoutUI()) return;
  currentPinInput = '';
  updatePinDotsUI();
}
function updatePinDotsUI(){
  const dots = document.querySelectorAll('#pinDots .pin-dot');
  dots.forEach((d, idx) => {
    d.classList.remove('error');
    d.classList.toggle('filled', idx < currentPinInput.length);
  });
}
async function forgotPinEscape(){
  const ok = await appConfirm(
    'هل نسيت رمز قفل الخصوصية؟ سيتم تحميل نسخة احتياطية كاملة (JSON) من بياناتك على جهازك أولاً، ثم إزالة القفل وإعادة ضبط البيانات المحلية لتتمكن من الدخول واستيراد نسختك بأمان.',
    { title: 'استعادة الدخول وتصدير نسخة احتياطية', emoji: '🛟', okText: 'تصدير وإعادة ضبط القفل', variant: 'warn' }
  );
  if(!ok) return;
  try{ exportData(); }catch(e){}
  try{
    localStorage.removeItem(PIN_STORE_KEY);
    localStorage.removeItem(PIN_LOCKOUT_KEY);
    localStorage.removeItem(STORE_KEY);
  }catch(e){}
  clearPinLockout();
  state = defaultState();
  currentPinInput = '';
  updatePinDotsUI();
  document.getElementById('pinOverlay')?.classList.remove('open');
  syncBodyScrollLock();
  applySettings();
  renderAll();
  toast('✅ تم تحميل النسخة الاحتياطية وإلغاء القفل — يمكنك استيرادها من الإعدادات');
}

