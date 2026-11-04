/* ============================================================================
   🎓 مُساعد الجامعة — pomodoro.js (مؤقّت بومودورو وسجل ساعات المذاكرة)
   ============================================================================ */

/* ============================================================
   18) بومودورو
============================================================ */
const RING_C = 552.92;
let pomo = {
  mode: 'work',
  running: false,
  endTimestamp: null,
  pausedRemaining: null,
  total: 25 * 60,
  intervalId: null,
  workCount: 0,
  courseId: '',
  startedDate: null
};

function pomoDuration(mode){ const p = state.settings.pomo; return (mode === 'work' ? p.work : mode === 'short' ? p.short : p.long) * 60; }
function pomoLabel(mode){ return mode === 'work' ? 'وقت التركيز' : mode === 'short' ? 'راحة قصيرة' : 'راحة طويلة'; }
function pomoGetRemaining(){
  if(pomo.running && pomo.endTimestamp) return Math.max(0, Math.round((pomo.endTimestamp - Date.now()) / 1000));
  if(pomo.pausedRemaining !== null) return pomo.pausedRemaining;
  return pomo.total;
}
function pomoSaveState(){
  try{
    const selCourse = document.getElementById('pomoCourse')?.value;
    if(selCourse !== undefined) pomo.courseId = selCourse;
    localStorage.setItem(POMO_STORE_KEY, JSON.stringify({
      mode: pomo.mode, running: pomo.running, endTimestamp: pomo.endTimestamp,
      pausedRemaining: pomo.pausedRemaining, total: pomo.total, workCount: pomo.workCount || 0,
      courseId: pomo.courseId || '', startedDate: pomo.startedDate || todayISO()
    }));
  }catch(e){}
}
function pomoLoadState(){
  try{ const raw = localStorage.getItem(POMO_STORE_KEY); if(!raw) return null; return JSON.parse(raw); }
  catch(e){ return null; }
}
function pomoFormat(sec){
  const m = Math.floor(sec / 60); const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function pomoRender(){
  const remaining = pomoGetRemaining();
  const timeStr = pomoFormat(remaining);
  const timeEl = document.getElementById('pomoTime');
  const labelEl = document.getElementById('pomoLabel');
  const startBtn = document.getElementById('pomoStart');
  const ringFg = document.getElementById('ringFg');
  if(timeEl) timeEl.textContent = timeStr;
  if(labelEl){
    const base = pomoLabel(pomo.mode);
    const cnt = pomo.mode === 'work' ? ` (${pomo.workCount || 0}/2)` : '';
    labelEl.textContent = base + cnt;
  }
  if(ringFg){
    const prog = pomo.total ? (pomo.total - remaining) / pomo.total : 0;
    ringFg.style.strokeDashoffset = (RING_C * prog).toFixed(2);
  }
  if(startBtn) startBtn.textContent = pomo.running ? '⏸ إيقاف مؤقت' : '▶ ابدأ';
}

function syncPomoCancelToServer(){
  if(!getMyChatId()) return;
  const payload = JSON.stringify({ ...authObj() });
  try{
    if(navigator.sendBeacon){
      const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
      if(navigator.sendBeacon(TG_WORKER + '/pomo-cancel', blob)) return;
    }
  }catch(e){}
  try{
    fetch(TG_WORKER + '/pomo-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(() => {});
  }catch(e){}
}
function syncPomoStartToServer(mode, total, endTimestamp){
  if(!getMyChatId()) return;
  try{
    fetch(TG_WORKER + '/pomo-start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...authObj(), mode, total, endTimestamp })
    }).catch(() => {});
  }catch(e){}
}
async function loadPomoFromServer(){
  if(!getMyChatId()) return null;
  try{
    const r = await fetch(TG_WORKER + '/pomo-status', { headers: authHeaders() });
    const data = await r.json();
    if(data && data.endTimestamp && data.endTimestamp > Date.now()) return data;
  }catch(e){}
  return null;
}

function pomoStartTimer(){
  if(pomo.running) return;
  const remaining = pomoGetRemaining();
  if(remaining <= 0) return;
  pomo.endTimestamp = Date.now() + remaining * 1000;
  pomo.running = true;
  pomo.pausedRemaining = null;
  pomo.startedDate = todayISO();
  const selCourse = document.getElementById('pomoCourse')?.value;
  if(selCourse !== undefined) pomo.courseId = selCourse;
  clearInterval(pomo.intervalId);
  pomo.intervalId = setInterval(pomoTick, 1000);
  pomoSaveState();
  syncPomoStartToServer(pomo.mode, pomo.total, pomo.endTimestamp);
  pomoRender();
}
function pomoPauseTimer(){
  if(!pomo.running) return;
  pomo.pausedRemaining = pomoGetRemaining();
  pomo.running = false;
  pomo.endTimestamp = null;
  clearInterval(pomo.intervalId);
  pomoSaveState();
  syncPomoCancelToServer();
  syncToTelegram(true);
  pomoRender();
}
function pomoToggle(){
  if(pomo.running) pomoPauseTimer();
  else pomoStartTimer();
}
function pomoSetMode(mode, silent){
  clearInterval(pomo.intervalId);
  const wasRunning = pomo.running;
  pomo.mode = mode;
  pomo.running = false;
  pomo.endTimestamp = null;
  pomo.total = pomoDuration(mode);
  pomo.pausedRemaining = pomo.total;
  document.querySelectorAll('#view-study .pomo-modes .chip').forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
  if(!silent) pomoSaveState();
  if(wasRunning){
    syncPomoCancelToServer();
    syncToTelegram(true);
  }
  pomoRender();
}
async function pomoResetCurrent(){
  const ok = await appConfirm('تصفير المؤقّت وإيقاف الدورة التلقائية؟', {
    title: 'تصفير المؤقّت', emoji: '🔄', okText: 'تصفير', variant: 'warn'
  });
  if(!ok) return;
  pomo.workCount = 0;
  pomoSetMode('work', false);
  try{ localStorage.removeItem(POMO_STORE_KEY); }catch(e){}
  syncPomoCancelToServer();
  syncToTelegram(true);
  toast('↺ تم التصفير — اضغط ابدأ للبدء من جديد');
}

async function sendPomoNotification(mode, minutes){
  if(!getMyChatId()) return;
  try{
    await fetch(TG_WORKER + '/pomo-done', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...authObj(), mode, minutes })
    });
  }catch(e){ console.log('pomo notify error:', e); }
}

function pomoNotify(title, body){
  try{
    if('Notification' in window && Notification.permission === 'granted'){
      new Notification(title, { body, tag: 'pomo_' + Date.now() });
    }
  }catch(e){}
}

function pomoComplete(isStale = false){
  clearInterval(pomo.intervalId);
  const completedMode = pomo.mode;
  const wasWork = completedMode === 'work';
  const completedTotal = pomo.total;
  const completedMins = Math.round(completedTotal / 60);
  const logDate = pomo.startedDate || todayISO();

  pomo.running = false;
  pomo.endTimestamp = null;
  pomo.pausedRemaining = null;

  if(!isStale) sendPomoNotification(completedMode, completedMins);

  if(wasWork){
    let cid = document.getElementById('pomoCourse')?.value || pomo.courseId || '';
    if(cid && !getCourse(cid)) cid = '';
    state.studyLog.push({ id: uid(), date: logDate, courseId: cid, minutes: completedMins, updatedAt: Date.now() });
    save();
    if(document.getElementById('studyToday')) renderStudy();
    if(document.getElementById('dashStats')) renderDashboard();
    if(!isStale){
      pomoNotify('🎉 انتهى وقت التركيز', `أكملت ${completedMins} دقيقة — خذ راحة الآن!`);
      toast(`🎉 أنهيت ${completedMins} دقيقة تركيز!`);
    } else {
      toast(`✅ تم تسجيل جلسة مذاكرة سابقة (${completedMins} دقيقة)`);
    }
    pomo.workCount = (pomo.workCount || 0) + 1;
  } else if(!isStale && completedMode === 'short'){
    pomoNotify('☕ انتهت الراحة القصيرة', 'يلا نرجع للتركيز 💪');
    toast('☕ انتهت الراحة — يلا نرجع!');
  } else if(!isStale && completedMode === 'long'){
    pomoNotify('🛋️ انتهت الراحة الطويلة', 'وقت التركيز من جديد 💪');
    toast('🛋️ انتهت الراحة — يلا نرجع!');
  }

  let nextMode;
  if(wasWork){
    if(pomo.workCount >= 2){ nextMode = 'long'; pomo.workCount = 0; }
    else { nextMode = 'short'; }
  } else { nextMode = 'work'; }

  pomo.mode = nextMode;
  pomo.total = pomoDuration(nextMode);
  pomo.pausedRemaining = pomo.total;
  document.querySelectorAll('#view-study .pomo-modes .chip').forEach(c => c.classList.toggle('active', c.dataset.mode === nextMode));
  pomoSaveState();
  pomoRender();

  if(!isStale){
    setTimeout(() => {
      if(!pomo.running && pomo.pausedRemaining === pomo.total){
        pomoStartTimer();
        const emoji = nextMode === 'work' ? '🎯' : nextMode === 'short' ? '☕' : '🛋️';
        const label = nextMode === 'work' ? 'تركيز' : nextMode === 'short' ? 'راحة قصيرة' : 'راحة طويلة';
        toast(`${emoji} بدأ ${label} تلقائياً`);
      }
    }, 2000);
  }
}
function pomoTick(){
  const remaining = pomoGetRemaining();
  if(remaining <= 0 && pomo.running){ pomoComplete(false); return; }
  pomoRender();
}
async function pomoResumeIfNeeded(){
  const saved = pomoLoadState();
  if(saved){
    pomo.workCount = saved.workCount || 0;
    pomo.courseId = saved.courseId || '';
    pomo.startedDate = saved.startedDate || todayISO();
  }
  const serverTimer = await loadPomoFromServer();
  if(serverTimer){
    pomo.mode = serverTimer.mode || 'work';
    pomo.total = serverTimer.total || pomoDuration(pomo.mode);
    pomo.running = true;
    pomo.endTimestamp = serverTimer.endTimestamp;
    clearInterval(pomo.intervalId);
    pomo.intervalId = setInterval(pomoTick, 1000);
    pomoSaveState();
    document.querySelectorAll('#view-study .pomo-modes .chip').forEach(c => c.classList.toggle('active', c.dataset.mode === pomo.mode));
    pomoRender();
    return;
  }
  if(!saved) return;
  if(saved.endTimestamp && saved.endTimestamp > Date.now()){
    pomo.mode = saved.mode || 'work';
    pomo.total = saved.total || pomoDuration(pomo.mode);
    pomo.running = true;
    pomo.endTimestamp = saved.endTimestamp;
    clearInterval(pomo.intervalId);
    pomo.intervalId = setInterval(pomoTick, 1000);
  } else if(saved.endTimestamp && saved.endTimestamp <= Date.now()){
    pomo.mode = saved.mode || 'work';
    pomo.total = saved.total || pomoDuration(pomo.mode);
    const isStale = (Date.now() - saved.endTimestamp) > 60000;
    setTimeout(() => pomoComplete(isStale), 300);
  } else if(saved.pausedRemaining !== null && saved.pausedRemaining < (saved.total || 0)){
    pomo.mode = saved.mode || 'work';
    pomo.total = saved.total || pomoDuration(pomo.mode);
    pomo.pausedRemaining = saved.pausedRemaining;
  }
  document.querySelectorAll('#view-study .pomo-modes .chip').forEach(c => c.classList.toggle('active', c.dataset.mode === pomo.mode));
  pomoRender();
}

document.getElementById('pomoStart')?.addEventListener('click', () => {
  if('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  pomoToggle();
});
document.getElementById('pomoReset')?.addEventListener('click', pomoResetCurrent);
document.querySelectorAll('#view-study .pomo-modes .chip').forEach(c => c.addEventListener('click', async () => {
  if(c.dataset.mode === pomo.mode) return;
  if(pomo.running || (pomo.pausedRemaining !== null && pomo.pausedRemaining < pomo.total)){
    const ok = await appConfirm(`تغيير الوضع إلى "${pomoLabel(c.dataset.mode)}"؟ (سيفقد الوقت الحالي)`, {
      title: 'تغيير الوضع', emoji: '🔄', okText: 'تغيير', variant: 'warn'
    });
    if(!ok) return;
  }
  pomoSetMode(c.dataset.mode);
}));

/* ============================================================
   19) سجل المذاكرة
============================================================ */
document.getElementById('pomoCourse')?.addEventListener('change', e => {
  pomo.courseId = e.target.value || '';
  pomoSaveState();
});
function renderStudy(){
  const sel = document.getElementById('pomoCourse');
  const activeCourses = live(state.courses);
  const activeLogs = live(state.studyLog);
  if(sel){
    const cur = sel.value || pomo.courseId || '';
    sel.innerHTML = `<option value="">— بدون تحديد —</option>` + activeCourses.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    if(cur && getCourse(cur)) sel.value = cur;
  }
  const today = todayISO();
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStart = todayISO(weekAgo);
  const todayMin = activeLogs.filter(l => l.date === today).reduce((a,b) => a + (+b.minutes||0), 0);
  const weekMin = activeLogs.filter(l => l.date >= weekStart).reduce((a,b) => a + (+b.minutes||0), 0);
  const totalMin = activeLogs.reduce((a,b) => a + (+b.minutes||0), 0);
  const st = document.getElementById('studyToday');
  const sw = document.getElementById('studyWeek');
  const stt = document.getElementById('studyTotal');
  if(st) st.textContent = todayMin;
  if(sw) sw.textContent = weekMin;
  if(stt) stt.textContent = totalMin;
  const bars = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = todayISO(d);
    const mins = activeLogs.filter(l => l.date === iso).reduce((a,b) => a + (+b.minutes||0), 0);
    bars.push({ iso, mins, day: DAYS_SHORT[d.getDay()] });
  }
  const max = Math.max(...bars.map(b => b.mins), 60);
  const wb = document.getElementById('weekBars');
  if(wb){
    wb.innerHTML = bars.map(b => `<div class="wbar"><span class="wbar-val">${b.mins || ''}</span><div class="wbar-fill" style="height:${Math.max((b.mins/max)*100, 3)}%"></div><span class="wbar-lbl">${b.day}</span></div>`).join('');
  }
  const recentEl = document.getElementById('studyRecentList');
  if(recentEl){
    const recent = [...activeLogs].slice(-5).reverse();
    recentEl.innerHTML = recent.length ? `
      <div style="font-size:12.5px;font-weight:800;color:var(--muted);margin-bottom:8px">🕒 آخر جلسات المذاكرة</div>
      ${recent.map(l => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--hover);border-radius:10px;margin-bottom:6px;font-size:12.5px;font-weight:700">
        <span>📚 ${esc(courseName(l.courseId))} · <span style="color:var(--muted)">${fmtDate(l.date)}</span></span>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="color:var(--p)">${l.minutes} د</span>
          <button class="mini-btn del" style="width:26px;height:26px;font-size:12px" onclick="deleteStudyLog('${esc(l.id)}')" title="حذف الجلسة">✕</button>
        </div>
      </div>`).join('')}
    ` : '';
  }
}
async function deleteStudyLog(id){
  const ok = await appConfirm('حذف هذه الجلسة من سجل المذاكرة؟', {
    title: 'حذف جلسة', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  state.studyLog.forEach(l => { if(l.id === id) tombstoneItem(l); });
  save(); renderStudy(); renderDashboard(); toast('🗑️ تم الحذف');
}
function openManualLog(){
  openModal('إضافة وقت مذاكرة يدوياً', `
    <div class="form-grid">
      <div class="field full"><label>المقرر</label><select id="mlCourse"><option value="">— بدون تحديد —</option>${courseOptions()}</select></div>
      <div class="field"><label>التاريخ</label><input type="date" id="mlDate" value="${todayISO()}"></div>
      <div class="field"><label>عدد الدقائق</label><input type="number" id="mlMin" value="60" min="1" max="600"></div>
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveManualLog()">💾 حفظ</button>`);
}
function saveManualLog(){
  const minutes = +document.getElementById('mlMin').value || 0;
  if(minutes <= 0){ toast('⚠️ أدخل عدد دقائق صحيح'); return; }
  state.studyLog.push({ id: uid(), date: document.getElementById('mlDate').value || todayISO(), courseId: document.getElementById('mlCourse').value, minutes, updatedAt: Date.now() });
  save(); closeModal(); renderStudy(); renderDashboard(); toast('✅ تم الحفظ');
}
