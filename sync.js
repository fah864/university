/* ============================================================================
   🎓 مُساعد الجامعة — sync.js (المزامنة السحابية وربط بوت تلقرام)
   ============================================================================ */

/* ============================================================
   21) حالة المزامنة
============================================================ */
function renderSyncStatus(){
  const el = document.getElementById('syncStatusContent');
  if(!el) return;
  const chatId = getMyChatId();
  let lastSync = 0; try{ lastSync = parseInt(localStorage.getItem('localModified') || '0'); }catch(_){}
  const lastSyncTime = lastSync ? new Date(lastSync) : null;
  let timeStr = '—';
  if(lastSyncTime){
    const diff = Math.round((Date.now() - lastSyncTime.getTime()) / 1000);
    if(diff < 60) timeStr = 'الآن';
    else if(diff < 3600) timeStr = `قبل ${Math.round(diff/60)} دقيقة`;
    else if(diff < 86400) timeStr = `قبل ${Math.round(diff/3600)} ساعة`;
    else timeStr = `قبل ${Math.round(diff/86400)} يوم`;
  }
  const openTasks = live(state.tasks).filter(t => !t.done).length;
  const upcomingExams = live(state.exams).filter(e => !e.done && daysUntil(e.date) >= 0).length;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:${chatId ? 'var(--ok-bg)' : 'var(--warn-bg)'};border-radius:12px;margin-bottom:14px">
      <span style="font-size:24px">${chatId ? '✅' : '⚠️'}</span>
      <div>
        <b style="display:block;font-size:14.5px;color:${chatId ? 'var(--ok)' : 'var(--warn)'}">${chatId ? 'مربوط بسحابة تلقرام' : 'غير مربوط بالسحابة'}</b>
        <span style="font-size:12px;color:var(--muted);font-weight:600">${chatId ? 'آخر مزامنة: ' + timeStr : 'اربط من قسم تلقرام أدناه لتفعيل الإشعارات والمزامنة'}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
      <div style="background:var(--hover);padding:12px 8px;border-radius:10px"><div style="font-size:22px;font-weight:900;font-family:'Cairo',system-ui,sans-serif;color:var(--p)">${live(state.courses).length}</div><div style="font-size:11px;color:var(--muted);font-weight:700">مقرر</div></div>
      <div style="background:var(--hover);padding:12px 8px;border-radius:10px"><div style="font-size:22px;font-weight:900;font-family:'Cairo',system-ui,sans-serif;color:var(--warn)">${openTasks}</div><div style="font-size:11px;color:var(--muted);font-weight:700">مهمة متبقية</div></div>
      <div style="background:var(--hover);padding:12px 8px;border-radius:10px"><div style="font-size:22px;font-weight:900;font-family:'Cairo',system-ui,sans-serif;color:var(--danger)">${upcomingExams}</div><div style="font-size:11px;color:var(--muted);font-weight:700">اختبار قادم</div></div>
    </div>
    ${chatId ? `<button class="btn btn-ghost btn-block" style="margin-top:14px" onclick="doSync(false)">🔄 مزامنة فورية الآن</button>` : ''}
  `;
}

/* ============================================================
   26) تلقرام والمزامنة السحابية
============================================================ */
let pollTimer = null;
let syncTimeout = null;
let syncBadgeHideTimer = null;
function getMyChatId(){ try{ return localStorage.getItem('tg_chat_id') || ''; }catch(e){ return ''; } }
function setMyChatId(id){ try{ localStorage.setItem('tg_chat_id', id); }catch(e){} }
function getMyToken(){ try{ return localStorage.getItem('tg_token') || ''; }catch(e){ return ''; } }
function setMyToken(t){ try{ if(t) localStorage.setItem('tg_token', t); }catch(e){} }
function authHeaders(){
  const t = getMyToken();
  return t ? { 'Authorization': 'Bearer ' + t } : {};
}
function authObj(){
  const t = getMyToken();
  return t ? { token: t } : {};
}
function syncToTelegram(silent = true){
  const chatId = getMyChatId();
  if(!chatId) return;
  if(syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => doSync(silent), 800);
}
async function doSync(silent = true){
  if(!getMyChatId()) return;
  const useForce = window.__forceSync === true;
  window.__forceSync = false;
  try{
    showSyncBadge('loading');
    fixUnsafeIds();
    const saveRes = await fetch(TG_WORKER + '/save', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        ...authObj(),
        tasks: state.tasks, exams: state.exams, courses: state.courses,
        schedule: state.schedule, attendance: state.attendance,
        gpaCourses: state.gpaCourses, wellness: state.wellness,
        health: state.health, money: state.money,
        archive: state.archive,
        studyLog: state.studyLog, settings: state.settings,
        pomoActive: pomo.running === true,
        force: useForce
      })
    });
    if(saveRes.status === 401){
      showSyncBadge('error');
      toast('⚠️ انتهت جلسة الربط — يرجى إعادة ربط تلقرام');
      return false;
    }
    if(saveRes.status === 409){
      showSyncBadge('error');
      toast('⛔ تم منع المزامنة: بياناتك المحلية فارغة والسحابة تحتوي على بيانات');
      return false;
    }
    if(saveRes.status === 422 || saveRes.status === 413){
      showSyncBadge('error');
      let why = '';
      try{ const j = await saveRes.json(); why = j.detail || j.error || ''; }catch(_){}
      toast('⛔ السيرفر رفض البيانات: ' + why);
      return false;
    }
    if(!saveRes.ok) throw new Error('save failed');
    localStorage.setItem('localModified', Date.now().toString());
    showSyncBadge('success');
    if(!silent) toast('✅ تمت المزامنة السحابية');
    renderSyncStatus();
  }catch(e){
    showSyncBadge('error');
    if(!silent) toast('⚠️ فشلت المزامنة — تحقق من الاتصال');
  }
}
async function syncAttendanceFromServer(){
  if(!getMyChatId()) return;
  try{
    const r = await fetch(TG_WORKER + '/get-attendance', { headers: authHeaders() });
    const serverAtt = await r.json();
    if(!Array.isArray(serverAtt)) return;
    let changed = false;
    for(const s of serverAtt){
      if(!s || !s.classId || !s.date) continue;
      const sTs = Number(s.updatedAt) || 0;
      const local = state.attendance.find(a => a.classId === s.classId && a.date === s.date);
      if(!local){
        if(!s.deleted){
          state.attendance.push({ id: s.id || uid(), classId: s.classId, date: s.date, status: s.status, note: s.note || '', updatedAt: sTs || Date.now() });
          changed = true;
        }
      } else {
        const lTs = Number(local.updatedAt) || 0;
        if(sTs >= lTs){
          if(s.deleted && !local.deleted){ local.deleted = true; local.updatedAt = sTs || Date.now(); changed = true; }
          else if(!s.deleted){
            if(local.deleted){ delete local.deleted; changed = true; }
            if(local.status !== s.status){ local.status = s.status; local.updatedAt = sTs || Date.now(); changed = true; }
            if(s.note && local.note !== s.note){ local.note = s.note; local.updatedAt = sTs || Date.now(); changed = true; }
          }
        }
      }
    }
    if(changed){
      save();
      renderSchedule();
      renderAttendancePage();
    }
  }catch(e){}
}
async function loadFromCloud(){
  if(!getMyChatId()) return;
  const myEpoch = _stateEpoch;
  showSyncBadge('loading');
  try{
    const r = await fetch(TG_WORKER + '/load', { headers: authHeaders() });
    if(myEpoch !== _stateEpoch) return;
    if(r.status === 401){
      showSyncBadge('error');
      toast('⚠️ انتهى الربط — اربط تلقرام من جديد');
      return;
    }
    const data = await r.json();
    if(myEpoch !== _stateEpoch) return;
    if(!data || !data.lastSync){ await doSync(true); return; }
    const cleanCloud = sanitizeAndValidateSchema(data, { allowEmpty: true });
    const localModified = parseInt(localStorage.getItem('localModified') || '0');
    const cloudModified = new Date(data.lastSync).getTime() || 0;
    const beforeJSON = JSON.stringify(state);
    state = mergeFullState(state, cleanCloud);
    const afterJSON = JSON.stringify(state);
    const mergedTs = Math.max(localModified, cloudModified, Date.now());
    localStorage.setItem('localModified', String(mergedTs));
    save(false);
    if(afterJSON !== beforeJSON || cloudModified > localModified){
      applySettings(); renderAll();
      renderWeekBadge();
      renderSchedule();
      renderAcademicStrip();
      toast('✅ تم دمج ومزامنة أحدث بياناتك مع السحابة');
    }
    showSyncBadge('success');
    renderSyncStatus();
    if(localModified > cloudModified || afterJSON !== JSON.stringify(cleanCloud)){
      await doSync(true);
    }
  }catch(e){ showSyncBadge('error'); }
}
function showSyncBadge(status){
  const badge = document.getElementById('syncBadge');
  const icon = document.getElementById('syncIcon');
  const text = document.getElementById('syncText');
  if(!badge) return;
  if(syncBadgeHideTimer) clearTimeout(syncBadgeHideTimer);
  badge.classList.remove('hidden', 'loading', 'error');
  if(status === 'loading'){ badge.classList.add('loading'); icon.textContent = '⏳'; text.textContent = 'جاري'; }
  else if(status === 'success'){ icon.textContent = '✅'; text.textContent = 'مزامن'; syncBadgeHideTimer = setTimeout(() => badge.classList.add('hidden'), 3000); }
  else if(status === 'error'){ badge.classList.add('error'); icon.textContent = '⚠️'; text.textContent = 'فشل'; syncBadgeHideTimer = setTimeout(() => badge.classList.add('hidden'), 5000); }
}
let autoSyncTimer = null;
async function checkCloudUpdates(){
  if(document.hidden) return;
  if(!getMyChatId()) return;
  let lastSync = 0; try{ lastSync = parseInt(localStorage.getItem('localModified') || '0'); }catch(_){}
  if(Date.now() - lastSync < 3000) return;
  const myEpoch = _stateEpoch;
  try{
    const r = await fetch(TG_WORKER + '/load', { headers: authHeaders() });
    const data = await r.json();
    if(myEpoch !== _stateEpoch) return;
    if(!data || !data.lastSync) return;
    const cloudModified = new Date(data.lastSync).getTime();
    const lastChecked = parseInt(localStorage.getItem('lastCloudCheck') || '0');
    if(cloudModified > lastChecked){
      if(cloudModified > lastSync + 2000){
        const cleanCloud = sanitizeAndValidateSchema(data, { allowEmpty: true });
        state = mergeFullState(state, cleanCloud);
        const mergedTs = Math.max(lastSync, cloudModified);
        localStorage.setItem('localModified', String(mergedTs));
        localStorage.setItem('lastCloudCheck', String(cloudModified));
        save(false);
        applySettings(); renderAll();
        renderWeekBadge(); renderSchedule(); renderAcademicStrip(); renderSyncStatus();
        toast('🔄 تم دمج التحديثات الجديدة من السحابة');
        showSyncBadge('success');
      }
      localStorage.setItem('lastCloudCheck', String(cloudModified));
    }
  }catch(e){}
}
function startAutoSync(){
  if(autoSyncTimer) clearInterval(autoSyncTimer);
  autoSyncTimer = setInterval(() => {
    if(!document.hidden && getMyChatId()) checkCloudUpdates();
  }, 180000);
}
function stopAutoSync(){
  if(autoSyncTimer){ clearInterval(autoSyncTimer); autoSyncTimer = null; }
}

document.addEventListener('visibilitychange', () => {
  if(document.hidden){ stopAutoSync(); return; }
  startAutoSync();
  pomoRender();
  renderDashHealth();
  renderTeeth();
  renderAcademicStrip();
  updateTgStatus();
  if(getMyChatId()){
    syncAttendanceFromServer();
    checkCloudUpdates();
  }
});
window.addEventListener('focus', () => {
  pomoRender();
  updateTgStatus();
});

async function testTelegram(){
  if(!getMyChatId()){ toast('⚠️ اربط حسابك أولاً'); return; }
  try{
    const r = await fetch(TG_WORKER + '/test', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ ...authObj() }) });
    if(r.ok) toast('✅ تم إرسال إشعار تجريبي إلى تلقرام');
    else toast('⚠️ تعذّر الإرسال — تأكد من صلاحية الجلسة');
  }catch(e){ toast('⚠️ فشل الاتصال بالسيرفر'); }
}
function secureCode(len = 6){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let s = '';
  for(let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}
function connectTelegram(){
  const code = secureCode(6);
  localStorage.setItem('tg_pending', code);
  localStorage.setItem('tg_pending_time', Date.now().toString());
  startPoll(code);
  openModal('📱 ربط تلقرام', `
    <div style="text-align:center;padding:6px 0">
      <div style="font-size:14px;color:var(--muted);font-weight:700;margin-bottom:14px">
        انسخ الكود ثم أرسله للبوت في تلقرام
      </div>
      <div style="font-family:'Cairo',system-ui,sans-serif;font-size:42px;font-weight:900;letter-spacing:8px;color:var(--p);background:var(--p-light);padding:18px;border-radius:14px;margin-bottom:14px;user-select:all;-webkit-user-select:all">
        ${code}
      </div>
      <button class="btn btn-primary btn-block" onclick="copyTextSafe('${code}', this)" style="margin-bottom:16px">
        📋 نسخ الكود
      </button>
      <div style="background:var(--warn-bg);color:var(--warn);padding:12px;border-radius:11px;font-size:12.5px;font-weight:700;line-height:1.9;margin-bottom:14px;text-align:start">
        <b>💡 خطوات الربط السريع:</b><br>
        1. اضغط <b>📋 نسخ الكود</b> أعلاه<br>
        2. اضغط <b>📱 فتح تلقرام</b> بالأسفل<br>
        3. اضغط <b>START</b> أو الصق الكود وأرسله للبوت<br>
        4. ارجع للموقع — سيتم الربط والمزامنة تلقائياً ✅
      </div>
      <div style="font-size:12px;color:var(--muted);font-weight:600">
        ⏱️ صلاحية الكود: 10 دقائق
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="window.open('https://t.me/${TG_BOT}?start=${code}','_blank')">📱 فتح تلقرام</button>
  `);
}
function startPoll(code){
  if(pollTimer) clearInterval(pollTimer);
  const start = Date.now();
  pollTimer = setInterval(async () => {
    if(Date.now() - start > 600000){
      clearInterval(pollTimer);
      localStorage.removeItem('tg_pending');
      localStorage.removeItem('tg_pending_time');
      return;
    }
    try{
      const r = await fetch(TG_WORKER + '/poll?code=' + code);
      const d = await r.json();
      if(d.chatId){
        clearInterval(pollTimer);
        setMyChatId(String(d.chatId));
        if(d.token) setMyToken(String(d.token));
        localStorage.removeItem('tg_pending');
        localStorage.removeItem('tg_pending_time');
        closeModal();
        updateTgStatus();
        await loadFromCloud();
        renderSyncStatus();
        toast('🎉 تم الربط بنجاح!');
      }
    }catch(e){}
  }, 2000);
}
async function unlinkTelegram(){
  const ok = await appConfirm('فك الربط بتلقرام؟ لن تصلك إشعارات حتى تربط مرة ثانية.', {
    title: 'فك الربط', emoji: '🔓', okText: 'فك الربط', variant: 'warn'
  });
  if(!ok) return;

  const oldToken = getMyToken();
  if(pomo.running){
    pomo.running = false;
    pomo.endTimestamp = null;
    pomo.pausedRemaining = pomo.total;
    clearInterval(pomo.intervalId);
    pomoSaveState();
  }
  syncPomoCancelToServer();

  if(oldToken){
    try{
      await fetch(TG_WORKER + '/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: oldToken }),
        keepalive: true
      });
    }catch(e){}
  }

  localStorage.removeItem('tg_chat_id');
  localStorage.removeItem('tg_token');
  localStorage.removeItem('tg_pending');
  localStorage.removeItem('tg_pending_time');
  if(pollTimer) clearInterval(pollTimer);

  updateTgStatus();
  renderSyncStatus();
  toast('🔓 تم فك الربط');
}
function updateTgStatus(){
  const el = document.getElementById('tgStatus');
  if(!el) return;
  const id = getMyChatId();
  const pending = localStorage.getItem('tg_pending');
  if(id){
    el.innerHTML = '✅ <b>مربوط بنجاح مع بوت تلقرام</b>';
    el.style.background = 'var(--ok-bg)';
    el.style.color = 'var(--ok)';
  } else if(pending){
    el.innerHTML = '⏳ <b>بانتظار إرسال الكود في تلقرام...</b>';
    el.style.background = 'var(--warn-bg)';
    el.style.color = 'var(--warn)';
  } else {
    el.innerHTML = '⚠️ <b>غير مربوط حالياً</b>';
    el.style.background = 'var(--hover)';
    el.style.color = 'var(--muted)';
  }
  const c = document.getElementById('tgConnectBtn');
  if(c){
    c.textContent = id ? '🔄 إعادة ربط' : (pending ? '⏳ عرض الكود' : '🔗 ربط تلقرام');
    const uBtn = document.getElementById('tgUnlinkBtn');
    const tBtn = document.getElementById('tgTestBtn');
    const rBtn = document.getElementById('tgRenewBtn');
    if(uBtn) uBtn.style.display = id ? '' : 'none';
    if(tBtn) tBtn.style.display = id ? '' : 'none';
    if(rBtn) rBtn.style.display = id ? '' : 'none';
  }
}

function renewToken(){
  if(!getMyChatId()){ toast('⚠️ اربط أولاً'); return; }
  connectTelegram();
}

