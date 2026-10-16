/* ============================================================
   1) الثوابت
============================================================ */
const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const DAYS_SHORT = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const COLORS = ['#0d9488','#4f46e5','#db2777','#ea580c','#0891b2','#7c3aed','#059669','#d97706','#dc2626','#2563eb'];
const TASK_TYPES = ['واجب','كويز','مشروع','تقرير','عرض تقديمي','بحث','أخرى'];
const EXAM_TYPES = ['كويز','ميدتيرم','فاينل','اختبار عملي','مناقشة مشروع'];
const HOUR_START = 7, HOUR_END = 21, HOUR_H = 58;
const STORE_KEY = 'uni_helper_v1';
const ATT = {
  excused:  { label:'غايب بعذر',     ico:'🟡', color:'#d97706' },
  absent:   { label:'غايب بدون عذر', ico:'🔴', color:'#dc2626' },
  late:     { label:'متأخر',         ico:'⏰', color:'#7c3aed' },
  cancelled:{ label:'ملغي',          ico:'🚫', color:'#64748b' }
};
const GRADE_POINTS = { 'A+':5,'A':4.75,'B+':4.5,'B':4,'C+':3.5,'C':3,'D+':2.5,'D':2,'F':0 };
const GRADE_OPTIONS = ['A+','A','B+','B','C+','C','D+','D','F'];
const TG_WORKER = 'https://floral-firefly-f4de.fahadnaih6.workers.dev';
const TG_BOT = 'MyMuHelperBot';
const POMO_STORE_KEY = 'uni_pomo_state';
const EXPENSE_CATS = [
  { id:'food', name:'أكل ومطاعم', ico:'🍔', color:'#f59e0b' },
  { id:'coffee', name:'قهوة', ico:'☕', color:'#92400e' },
  { id:'transport', name:'مواصلات', ico:'🚗', color:'#0891b2' },
  { id:'books', name:'كتب وقرطاسية', ico:'📚', color:'#7c3aed' },
  { id:'clothes', name:'ملابس', ico:'👕', color:'#db2777' },
  { id:'entertainment', name:'ترفيه', ico:'🎬', color:'#dc2626' },
  { id:'subscriptions', name:'اشتراكات', ico:'📱', color:'#0d9488' },
  { id:'bills', name:'فواتير', ico:'🏠', color:'#4f46e5' },
  { id:'health', name:'صحة', ico:'💊', color:'#059669' },
  { id:'gifts', name:'هدايا', ico:'🎁', color:'#ea580c' },
  { id:'other', name:'أخرى', ico:'🚨', color:'#64748b' }
];

/* ============================================================
   1.5) Custom Confirm Dialog
============================================================ */
function appConfirm(message, options = {}){
  return new Promise(resolve => {
    const bg = document.getElementById('confirmBg');
    const icoWrap = document.getElementById('confirmIcoWrap');
    const ico = document.getElementById('confirmIco');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMsg');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    const variant = options.variant || 'danger';
    icoWrap.className = 'confirm-ico-wrap ' + variant;
    ico.textContent = options.emoji || (variant === 'danger' ? '🗑️' : variant === 'warn' ? '⚠️' : variant === 'ok' ? '✅' : '❓');
    titleEl.textContent = options.title || 'تأكيد';
    msgEl.textContent = message;
    okBtn.textContent = options.okText || 'موافق';
    cancelBtn.textContent = options.cancelText || 'إلغاء';

    if(variant === 'danger'){
      okBtn.className = 'btn btn-danger-solid';
    } else {
      okBtn.className = 'btn btn-primary';
    }

    let resolved = false;
    const doResolve = (val) => {
      if(resolved) return;
      resolved = true;
      document.removeEventListener('keydown', escHandler);
      bg.classList.remove('open');
      resolve(val);
    };

    const escHandler = (e) => { if(e.key === 'Escape') doResolve(false); };

    okBtn.onclick = () => doResolve(true);
    cancelBtn.onclick = () => doResolve(false);
    bg.onclick = (e) => { if(e.target === bg) doResolve(false); };
    document.addEventListener('keydown', escHandler);

    bg.classList.add('open');
  });
}

/* ============================================================
   2) الحالة
============================================================ */
function defaultState(){
  return {
    courses: [], schedule: [], tasks: [], exams: [],
    studyLog: [], attendance: [], gpaCourses: [], archive: [],
    wellness: { sleepGoal:8, waterGoal:8, log:[] },
    health: { teethLog: [] },
    money: {
      salary: 0,
      salaryExactDate: null,
      expenses: [],
      goals: []
    },
    settings: {
      theme:'light',
      pomo:{ work:25, short:5, long:15 },
      semesterStart: '2026-08-23',
      semesterWeeks: 16
    }
  };
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultState();
    const s = JSON.parse(raw);
    const def = defaultState();
    const merged = { ...def, ...s };
    merged.settings = { ...def.settings, ...(s.settings || {}) };
    merged.settings.pomo = { ...def.settings.pomo, ...((s.settings && s.settings.pomo) || {}) };
    merged.wellness = { ...def.wellness, ...(s.wellness || {}) };
    if(!Array.isArray(merged.wellness.log)) merged.wellness.log = [];
    merged.health = { ...def.health, ...(s.health || {}) };
    if(!Array.isArray(merged.health.teethLog)) merged.health.teethLog = [];
    merged.money = { ...def.money, ...(s.money || {}) };
    if(!Array.isArray(merged.money.expenses)) merged.money.expenses = [];
    if(!Array.isArray(merged.money.goals)) merged.money.goals = [];
    if(!Array.isArray(merged.courses)) merged.courses = [];
    if(!Array.isArray(merged.schedule)) merged.schedule = [];
    if(!Array.isArray(merged.tasks)) merged.tasks = [];
    if(!Array.isArray(merged.exams)) merged.exams = [];
    if(!Array.isArray(merged.studyLog)) merged.studyLog = [];
    if(!Array.isArray(merged.attendance)) merged.attendance = [];
    if(!Array.isArray(merged.gpaCourses)) merged.gpaCourses = [];
    if(!Array.isArray(merged.archive)) merged.archive = [];
    return merged;
  }catch(e){ return defaultState(); }
}
let state = loadState();
let taskFilter = 'all';
let expenseFilter = 'all';
let currentCourseId = null;

/* ============================================================
   3) دوال مساعدة
============================================================ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
function assertSafeImport(s){
  const MAX_ITEMS = 5000;
  // ✅ FIX 3: was /^[A-Za-z0-9_-]*$/ — the '*' allowed empty IDs
  const idRe = /^[A-Za-z0-9_-]{1,64}$/;
  const colorRe = /^[#A-Za-z0-9(),.%\s-]*$/;
  const m = s.money || {};
  const w = s.wellness || {};
  const h = s.health || {};
  const namedLists = [
    ['tasks', s.tasks], ['exams', s.exams], ['courses', s.courses],
    ['schedule', s.schedule], ['attendance', s.attendance],
    ['gpaCourses', s.gpaCourses], ['archive', s.archive],
    ['studyLog', s.studyLog], ['money.expenses', m.expenses],
    ['money.goals', m.goals], ['wellness.log', w.log],
    ['health.teethLog', h.teethLog]
  ];
  for(const [name, arr] of namedLists){
    if(!Array.isArray(arr)) continue;
    if(arr.length > MAX_ITEMS) throw new Error(`الملف يحتوي ${arr.length} عنصر في "${name}" — الحد ${MAX_ITEMS}`);
    for(const it of arr){
      if(!it || typeof it !== 'object') continue;
      for(const k of ['id','courseId','classId']){
        if(it[k] != null && !idRe.test(String(it[k]))) throw new Error('الملف يحتوي معرّفات غير آمنة');
      }
      if(it.color != null && !colorRe.test(String(it.color))) throw new Error('الملف يحتوي ألوان غير آمنة');
    }
  }
}
function fixUnsafeIds(){
  const idRe = /^[A-Za-z0-9_-]{0,64}$/;
  let changed = false;
  for(const arr of [state.tasks, state.exams, state.schedule]){
    if(!Array.isArray(arr)) continue;
    for(const it of arr){
      if(it && it.courseId != null && !idRe.test(String(it.courseId))){ it.courseId = ''; changed = true; }
    }
  }
  if(changed){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){} }
}
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayISO(d = new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function daysUntil(iso){ const t = new Date(); t.setHours(0,0,0,0); const d = new Date(iso + 'T00:00:00'); return Math.round((d - t) / 86400000); }
function fmtDate(iso){ if(!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('ar-EG', { day:'numeric', month:'long' }); }
function fmtMoney(n){ return Number(n||0).toLocaleString('ar-EG', { maximumFractionDigits: 2 }); }
function getCourse(id){ return state.courses.find(c => c.id === id); }
function courseName(id){ const c = getCourse(id); return c ? c.name : 'عام'; }
function courseColor(id){ const c = getCourse(id); return c ? c.color : '#64748b'; }
function getCatById(id){ return EXPENSE_CATS.find(c => c.id === id) || EXPENSE_CATS[EXPENSE_CATS.length-1]; }
function toast(msg){ const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 2400); }
function toMin(t){ const [h,m] = t.split(':').map(Number); return h*60 + m; }
function minToTime(m){ return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
function to12(time24){
  if(!time24 || typeof time24 !== 'string') return time24 || '';
  const parts = time24.split(':');
  if(parts.length < 2) return time24;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if(isNaN(h)) return time24;
  const ampm = h >= 12 ? 'م' : 'ص';
  h = h % 12;
  if(h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/* ============================================================
   3.5) pruneOldLogs + save
============================================================ */
function pruneOldLogs(){
  const cutoff = todayISO(new Date(Date.now() - 365*86400000));
  state.studyLog = state.studyLog.filter(l => l.date >= cutoff);
  state.wellness.log = state.wellness.log.filter(l => l.date >= cutoff);
  state.health.teethLog = state.health.teethLog.filter(l => l.date >= cutoff);
}
function save(sync = true){
  try{
    pruneOldLogs();
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    if(sync) localStorage.setItem('localModified', Date.now().toString());
  }catch(e){
    if(!window.__saveWarned){
      window.__saveWarned = true;
      try{ toast('⚠️ تعذّر الحفظ على الجهاز (التخزين ممتلئ أو التصفح خاص). صدّر نسخة احتياطية!'); }catch(_){}
    }
  }
  if(sync && typeof syncToTelegram === 'function' && getMyChatId()) syncToTelegram(true);
}

/* ============ التقويم الأكاديمي (ديناميكي) ============ */
const ACADEMIC_START = '2026-08-23';
const ACADEMIC_EVENTS_TEMPLATE = [
  { offset: -6,  title:'عودة هيئة التدريس',        ico:'👥', type:'info'    },
  { offset: 0,   title:'بداية الدراسة',             ico:'📚', type:'info'    },
  { offset: 3,   title:'نهاية الحذف والإضافة',      ico:'✏️', type:'info'    },
  { offset: 9,   title:'نهاية التأجيل',             ico:'📋', type:'info'    },
  { offset: 31,  title:'اليوم الوطني',              ico:'🇸🇦', type:'holiday' },
  { offset: 32,  title:'اليوم الوطني',              ico:'🇸🇦', type:'holiday' },
  { offset: 88,  title:'إجازة منتصف الفصل',         ico:'🎉', type:'holiday' },
  { offset: 98,  title:'استئناف الدراسة',           ico:'📖', type:'info'    },
  { offset: 109, title:'نهاية الاعتذار',            ico:'🚫', type:'info'    },
  { offset: 119, title:'بداية الاختبارات النهائية', ico:'📝', type:'exam'    },
  { offset: 135, title:'نهاية الاختبارات',          ico:'🏁', type:'exam'    },
  { offset: 137, title:'إجازة منتصف العام',         ico:'🎉', type:'holiday' },
  { offset: 140, title:'رصد الدرجات',               ico:'📊', type:'info'    },
  { offset: 147, title:'بداية الفصل الثاني',        ico:'🚀', type:'info'    }
];
let acadSelectedWeek = null;

function getAcademicEvents(){
  const base = state.settings.semesterStart || ACADEMIC_START;
  const start = new Date(base + 'T00:00:00');
  return ACADEMIC_EVENTS_TEMPLATE.map(ev => {
    const d = new Date(start);
    d.setDate(d.getDate() + ev.offset);
    return { date: todayISO(d), title: ev.title, ico: ev.ico, type: ev.type };
  });
}
function getExamsStartDate(){
  const base = state.settings.semesterStart || ACADEMIC_START;
  const start = new Date(base + 'T00:00:00');
  start.setDate(start.getDate() + 119);
  return start;
}

function getWeekMonday(weekNum){
  const base = state.settings.semesterStart || ACADEMIC_START;
  const start = new Date(base + 'T00:00:00');
  const d = new Date(start);
  d.setDate(d.getDate() + (weekNum - 1) * 7);
  return d;
}
function getWeekRange(weekNum){
  const start = getWeekMonday(weekNum);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}
function currentAcademicWeek(){
  const base = state.settings.semesterStart || ACADEMIC_START;
  const start = new Date(base + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((today - start) / 86400000);
  if(diff < 0) return 1;
  return Math.floor(diff / 7) + 1;
}
function getEventsForWeek(weekNum){
  const { start, end } = getWeekRange(weekNum);
  const s = todayISO(start), e = todayISO(end);
  return getAcademicEvents().filter(ev => ev.date >= s && ev.date <= e);
}
function renderAcademicStrip(){
  const weeks = state.settings.semesterWeeks || 16;
  const curWeek = currentAcademicWeek();
  const selected = acadSelectedWeek || Math.min(Math.max(curWeek, 1), weeks);
  const { start, end } = getWeekRange(selected);
  const titleEl = document.getElementById('acadTitle');
  const rangeEl = document.getElementById('acadRange');
  const countEl = document.getElementById('acadCountdown');
  const scrollEl = document.getElementById('acadScroll');
  const eventsEl = document.getElementById('acadEventsBar');
  if(!scrollEl) return;
  const fmtShort = d => d.toLocaleDateString('ar-EG', { day:'numeric', month:'short' });
  titleEl.innerHTML = `📅 الأسبوع <span class="week-num">${selected}</span>`;
  rangeEl.textContent = `من ${fmtShort(start)} إلى ${fmtShort(end)}`;
  const daysToExams = Math.ceil((getExamsStartDate() - new Date()) / 86400000);
  if(daysToExams > 30){ countEl.className = 'acad-countdown'; countEl.textContent = `⏳ ${daysToExams} يوم للاختبارات`; }
  else if(daysToExams > 7){ countEl.className = 'acad-countdown warn'; countEl.textContent = `⚠️ ${daysToExams} يوم للاختبارات`; }
  else if(daysToExams > 0){ countEl.className = 'acad-countdown danger'; countEl.textContent = `🚨 ${daysToExams} يوم للاختبارات`; }
  else if(daysToExams > -20){ countEl.className = 'acad-countdown danger'; countEl.textContent = `📝 فترة الاختبارات`; }
  else { countEl.className = 'acad-countdown'; countEl.textContent = `✅ انتهى الفصل`; }
  let html = '';
  for(let w = 1; w <= weeks + 1; w++){
    const wr = getWeekRange(w);
    const isPast = w < curWeek;
    const isCurrent = w === curWeek;
    const isSelected = w === selected;
    const events = getEventsForWeek(w);
    const hasHoliday = events.some(e => e.type === 'holiday');
    const hasExam = events.some(e => e.type === 'exam');
    let cls = 'acad-week';
    if(isPast) cls += ' past';
    if(isSelected){
      cls += ' current';
    } else if(isCurrent){
      cls += ' today';
    }
    if(hasHoliday) cls += ' holiday';
    if(hasExam) cls += ' exam';
    const evIcos = events.slice(0, 3).map(e => e.ico).join('');
    html += `<div class="${cls}" data-week="${w}" onclick="selectAcadWeek(${w})">
      <div class="acad-week-num">${w}${w === weeks + 1 ? ' (مراجعة)' : ''}</div>
      <div class="acad-week-dates">${fmtShort(wr.start)}</div>
      <div class="acad-week-events">${evIcos}</div>
    </div>`;
  }
  scrollEl.innerHTML = html;
  const events = getEventsForWeek(selected);
  if(!events.length){
    eventsEl.innerHTML = `<span style="color:var(--muted);font-weight:600">لا توجد أحداث في هذا الأسبوع</span>`;
  } else {
    eventsEl.innerHTML = events.map(e => {
      const cls = e.type === 'holiday' ? 'holiday' : e.type === 'exam' ? 'exam' : 'info';
      return `<span class="acad-event-chip ${cls}">${e.ico} ${e.title}</span>`;
    }).join('');
  }
  const curEl = scrollEl.querySelector('.acad-week.current');
  if(curEl) curEl.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
  const prevBtn = document.getElementById('acadPrev');
  const nextBtn = document.getElementById('acadNext');
  if(prevBtn) prevBtn.disabled = selected <= 1;
  if(nextBtn) nextBtn.disabled = selected >= weeks + 1;
}
function selectAcadWeek(w){
  acadSelectedWeek = w;
  renderAcademicStrip();
  renderSchedule();
}
document.getElementById('acadPrev')?.addEventListener('click', () => {
  if(acadSelectedWeek > 1){ acadSelectedWeek--; renderAcademicStrip(); renderSchedule(); }
});
document.getElementById('acadNext')?.addEventListener('click', () => {
  const weeks = state.settings.semesterWeeks || 16;
  if(acadSelectedWeek < weeks + 1){ acadSelectedWeek++; renderAcademicStrip(); renderSchedule(); }
});

/* ============================================================
   4) التنقل
============================================================ */
const VIEW_META = {
  dashboard: ['لوحة اليوم','نظرة عامة على يومك الدراسي'],
  schedule:  ['الجدول الدراسي','محاضراتك خلال الأسبوع'],
  courses:   ['المقررات','كل مقرراتك في مكان واحد'],
  'course-detail': ['تفاصيل المقرر','نظرة شاملة على المقرر'],
  tasks:     ['المهام والاختبارات','تابع كل ما عليك تسليمه والاختبارات القادمة'],
  grades:    ['المعدل والدرجات','احسب معدلك وتابع درجاتك التفصيلية'],
  study:     ['مؤقّت المذاكرة','تقنية بومودورو للتركيز'],
  teeth:     ['نظافة الأسنان','تفريش الصباح والمساء'],
  wellness:  ['النوم والماء','صحتك أولاً'],
  balance:   ['الرصيد','نظرة على مصروفك'],
  expenses:  ['المصاريف','سجل كل مصروف'],
  goals:     ['الأهداف المالية','أهدافك وحصالتك'],
  attendance:['الحضور والغياب','تتبع غياباتك وحد الحرمان'],
  archive:   ['أرشيف الفصول','سجل كل فصولك السابقة'],
  settings:  ['الإعدادات','تخصيص التطبيق والبيانات']
};
function go(view){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById('view-' + view);
  if(!targetView){ console.warn('view not found:', view); return; }
  targetView.classList.add('active');
  const hl = (view === 'course-detail') ? 'courses' : view;
  document.querySelectorAll('.nav-btn, .home-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === hl);
  });
  const [t,s] = VIEW_META[view] || ['',''];
  document.getElementById('pageTitle').textContent = t;
  document.getElementById('pageSub').textContent = s;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  document.body.style.overflow = '';
  window.scrollTo({ top:0, behavior:'smooth' });
  if(view !== 'course-detail'){ try{ location.hash = view; }catch(e){} }
  document.querySelectorAll('.nav-group').forEach(g => {
    if(g.querySelector(`[data-view="${view}"]`)) g.classList.remove('collapsed');
  });
  setTimeout(() => {
    try{
      if(view === 'attendance') renderAttendancePage();
      if(view === 'wellness') renderWellness();
      if(view === 'teeth') renderTeeth();
      if(view === 'archive') renderArchive();
      if(view === 'grades') renderGrades();
      if(view === 'settings') renderSyncStatus();
      if(view === 'course-detail') renderCourseDetail();
      if(view === 'courses') renderCourses();
      if(view === 'schedule') renderAcademicStrip();
      if(view === 'balance') renderBalance();
      if(view === 'expenses') renderExpenses();
      if(view === 'goals') renderGoals();
    }catch(e){ console.error(e); }
  }, 60);
}
document.body.addEventListener('click', function(e){
  const target = e.target.closest('[data-view]');
  if(!target || !target.dataset.view) return;
  e.preventDefault();
  go(target.dataset.view);
});

/* ============================================================
   5) الثيم
============================================================ */
function setTheme(t){
  state.settings.theme = t;
  document.documentElement.dataset.theme = t;
  const sideBtn = document.getElementById('themeBtn');
  if(sideBtn) sideBtn.textContent = t === 'dark' ? '☀️' : '🌙';
  save();
}
document.getElementById('themeBtn').addEventListener('click', () => {
  setTheme(state.settings.theme === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   6) المودال
============================================================ */
const modalBg = document.getElementById('modalBg');
function openModal(title, bodyHTML, footHTML){
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFoot').innerHTML = footHTML || '';
  modalBg.classList.add('open');
}
// ✅ FIX 6: reset AI upload state on close
function closeModal(){
  modalBg.classList.remove('open');
  if (typeof aiFileData !== 'undefined') aiFileData = null;
}
modalBg.addEventListener('click', e => { if(e.target === modalBg) closeModal(); });
document.addEventListener('keydown', e => { if(e.key === 'Escape' && modalBg.classList.contains('open')) closeModal(); });

/* ============================================================
   7) المقررات
============================================================ */
let pickedColor = COLORS[0];
function openCourseForm(id){
  const c = id ? getCourse(id) : null;
  pickedColor = c ? c.color : COLORS[state.courses.length % COLORS.length];
  const colorBtns = COLORS.map(col => `<button type="button" data-c="${col}" style="background:${col}" class="${col===pickedColor?'sel':''}"></button>`).join('');
  openModal(c ? 'تعديل مقرر' : 'إضافة مقرر جديد', `
    <div class="form-grid">
      <div class="field full"><label>اسم المقرر <span class="req">*</span></label>
        <input id="cName" placeholder="مثال: تفاضل وتكامل" value="${esc(c?.name||'')}"></div>
      <div class="field"><label>الرمز</label><input id="cCode" placeholder="MATH101" value="${esc(c?.code||'')}"></div>
      <div class="field"><label>عدد الساعات</label><input id="cCredits" type="number" min="0" max="10" value="${c?.credits ?? 3}"></div>
      <div class="field full"><label>اسم الدكتور</label><input id="cTeacher" placeholder="د. محمد أحمد" value="${esc(c?.teacher||'')}"></div>
      <div class="field full"><label>اللون</label><div class="color-pick" id="colorPick">${colorBtns}</div></div>
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveCourse('${id||''}')">💾 حفظ</button>`);
  document.getElementById('colorPick').addEventListener('click', e => {
    const b = e.target.closest('button[data-c]');
    if(!b) return;
    pickedColor = b.dataset.c;
    document.querySelectorAll('#colorPick button').forEach(x => x.classList.toggle('sel', x === b));
  });
}
function saveCourse(id){
  const name = document.getElementById('cName').value.trim();
  if(!name){ toast('⚠️ اكتب اسم المقرر'); return; }
  const data = {
    name, code: document.getElementById('cCode').value.trim(),
    credits: +document.getElementById('cCredits').value || 0,
    teacher: document.getElementById('cTeacher').value.trim(),
    color: pickedColor
  };
  if(id){ const it = getCourse(id); if(it) Object.assign(it, data); }
  else{ state.courses.push({ id: uid(), ...data, grades: [] }); }
  save(); closeModal(); renderAll(); toast('✅ تم الحفظ');
}
async function deleteCourse(id){
  const ok = await appConfirm('سيتم حذف المقرر وكل ما يتعلق به (المحاضرات، المهام، الاختبارات). متابعة؟', {
    title: 'حذف المقرر', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  const removedClassIds = new Set(state.schedule.filter(s => s.courseId === id).map(s => s.id));
  state.courses = state.courses.filter(c => c.id !== id);
  state.schedule = state.schedule.filter(s => s.courseId !== id);
  state.tasks = state.tasks.filter(t => t.courseId !== id);
  state.exams = state.exams.filter(e => e.courseId !== id);
  state.attendance = state.attendance.filter(a => !removedClassIds.has(a.classId));
  state.studyLog.forEach(l => { if(l.courseId === id) l.courseId = ''; });
  const wasInDetail = currentCourseId === id;
  if(wasInDetail) currentCourseId = null;
  save(); renderAll();
  if(wasInDetail) go('courses');
  toast('🗑️ تم الحذف');
}

/* ============================================================
   8) تفاصيل المقرر
============================================================ */
function openCourseDetail(id){
  if(!getCourse(id)){ toast('⚠️ المقرر غير موجود'); return; }
  currentCourseId = id;
  go('course-detail');
}
function renderCourseDetail(){
  const el = document.getElementById('courseDetailContent');
  if(!el) return;
  if(!currentCourseId){ go('courses'); return; }
  const c = getCourse(currentCourseId);
  if(!c){ go('courses'); return; }
  const lectures = state.schedule.filter(s => s.courseId === c.id).sort((a,b) => a.day - b.day || toMin(a.start) - toMin(b.start));
  const tasks = state.tasks.filter(t => t.courseId === c.id).sort((a,b) => a.due.localeCompare(b.due));
  const exams = state.exams.filter(e => e.courseId === c.id).sort((a,b) => a.date.localeCompare(b.date));
  const total = courseTotal(c);
  const openTasks = tasks.filter(t => !t.done).length;
  const statsHTML = `
    <div class="cd-stat"><b style="color:${c.color}">${lectures.length}</b><span>📅 محاضرة أسبوعياً</span></div>
    <div class="cd-stat"><b style="color:var(--warn)">${openTasks}</b><span>✅ مهمة متبقية</span></div>
    <div class="cd-stat"><b style="color:var(--danger)">${exams.filter(e => daysUntil(e.date) >= 0).length}</b><span>⏰ اختبار قادم</span></div>
    <div class="cd-stat"><b style="color:var(--ok)">${total !== null ? total.toFixed(1) + '%' : '—'}</b><span>📊 معدل الدرجات</span></div>`;
  let lecturesHTML = '';
  if(!lectures.length){
    lecturesHTML = `<div class="empty" style="padding:22px"><div class="e-ico" style="font-size:34px">📅</div><b style="font-size:15px">لا توجد محاضرات</b></div>`;
  } else {
    lecturesHTML = lectures.map(s => `
      <div class="cd-item" style="cursor:pointer" onclick="openClassForm('${s.id}')">
        <div class="ci-ico">📅</div>
        <div class="ci-main"><b>${DAYS[s.day]}</b><span>${to12(s.start)} - ${to12(s.end)}${s.room ? ' · ' + esc(s.room) : ''}</span></div>
        <div class="ci-side" style="background:${c.color}22;color:${c.color}">${toMin(s.end) - toMin(s.start)} د</div>
        <button class="mini-btn" onclick="event.stopPropagation();openClassForm('${s.id}')" title="تعديل">✏️</button>
        <button class="mini-btn del" onclick="event.stopPropagation();deleteClass('${s.id}')" title="حذف">🗑️</button>
      </div>`).join('');
  }
  let tasksHTML = '';
  if(!tasks.length){
    tasksHTML = `<div class="empty" style="padding:22px"><div class="e-ico" style="font-size:34px">✅</div><b style="font-size:15px">لا توجد مهام</b></div>`;
  } else {
    tasksHTML = tasks.map(t => {
      const d = daysUntil(t.due);
      let txt, bg, col;
      if(t.done){ txt = 'منجزة'; bg = 'var(--ok-bg)'; col = 'var(--ok)'; }
      else if(d < 0){ txt = `متأخر ${Math.abs(d)}ي`; bg = 'var(--danger-bg)'; col = 'var(--danger)'; }
      else if(d === 0){ txt = 'اليوم'; bg = 'var(--danger-bg)'; col = 'var(--danger)'; }
      else if(d === 1){ txt = 'غداً'; bg = 'var(--warn-bg)'; col = 'var(--warn)'; }
      else { txt = `بعد ${d}ي`; bg = 'var(--hover)'; col = 'var(--muted)'; }
      return `<div class="cd-item" style="cursor:pointer;${t.done?'opacity:.6':''}" onclick="openTaskForm('${t.id}')">
        <div class="ci-ico" onclick="event.stopPropagation();toggleTask('${t.id}')" title="تبديل الإنجاز">${t.done ? '✅' : '📝'}</div>
        <div class="ci-main"><b style="${t.done?'text-decoration:line-through':''}">${esc(t.title)}</b><span>${esc(t.type)} · ${fmtDate(t.due)}</span></div>
        <div class="ci-side" style="background:${bg};color:${col}">${txt}</div></div>`;
    }).join('');
  }
  let examsHTML = '';
  if(!exams.length){
    examsHTML = `<div class="empty" style="padding:22px"><div class="e-ico" style="font-size:34px">⏰</div><b style="font-size:15px">لا توجد اختبارات</b></div>`;
  } else {
    examsHTML = exams.map(e => {
      const d = daysUntil(e.date);
      let txt, bg, col;
      if(d < 0){ txt = 'انتهى'; bg = 'var(--hover)'; col = 'var(--muted)'; }
      else if(d === 0){ txt = 'اليوم'; bg = 'var(--danger-bg)'; col = 'var(--danger)'; }
      else if(d === 1){ txt = 'غداً'; bg = 'var(--danger-bg)'; col = 'var(--danger)'; }
      else if(d <= 7){ txt = `بعد ${d}ي`; bg = 'var(--warn-bg)'; col = 'var(--warn)'; }
      else { txt = `بعد ${d}ي`; bg = 'var(--ok-bg)'; col = 'var(--ok)'; }
      return `<div class="cd-item" style="cursor:pointer" onclick="openExamForm('${e.id}')">
        <div class="ci-ico">⏰</div>
        <div class="ci-main"><b>${esc(e.title)}</b><span>${esc(e.type)} · ${fmtDate(e.date)}${e.time ? ' · ' + to12(e.time) : ''}${e.place ? ' · ' + esc(e.place) : ''}</span></div>
        <div class="ci-side" style="background:${bg};color:${col}">${txt}</div></div>`;
    }).join('');
  }
  let gradesHTML = '';
  const g = c.grades || [];
  if(!g.length){
    gradesHTML = `<div class="empty" style="padding:22px"><div class="e-ico" style="font-size:34px">📊</div><b style="font-size:15px">لا توجد درجات</b></div>`;
  } else {
    gradesHTML = g.map(x => {
      const scoreColor = (+x.score >= 80) ? 'var(--ok)' : (+x.score >= 60) ? 'var(--warn)' : 'var(--danger)';
      return `<div class="cd-item"><div class="ci-ico">📝</div>
        <div class="ci-main"><b>${esc(x.name || 'مكوّن')}</b><span>الوزن: ${x.weight}%</span></div>
        <div class="ci-side" style="background:${scoreColor}22;color:${scoreColor}">${x.score}%</div></div>`;
    }).join('');
  }
  el.innerHTML = `
    <button class="back-btn" onclick="go('courses')">→ رجوع للمقررات</button>
    <div class="cd-header" style="--cd-color:${c.color}">
      <div class="cd-top">
        <div class="cd-title">
          <h2>${esc(c.name)}</h2>
          <div class="cd-meta">
            ${c.code ? `🔖 ${esc(c.code)}` : ''}
            ${c.teacher ? ` · 👨‍🏫 ${esc(c.teacher)}` : ''}
            ${c.credits ? ` · 🎯 ${c.credits} ساعات` : ''}
          </div>
        </div>
        <div class="cd-actions">
          <button class="btn btn-ghost btn-sm" onclick="openCourseForm('${c.id}')">✏️ تعديل المقرر</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCourse('${c.id}')">🗑️ حذف</button>
        </div>
      </div>
      <div class="cd-stat-row">${statsHTML}</div>
    </div>
    ${total !== null ? `
      <div class="grade-summary-box" style="--cd-color:${c.color}">
        <div><span>المعدل الحالي في المقرر</span><div><b>${total.toFixed(1)}%</b></div></div>
        <div style="text-align:center"><span>التقدير المتوقع</span>
          <div style="font-family:'Tajawal';font-size:26px;font-weight:800">${scoreToLetter(total)}</div></div>
      </div>` : ''}
    <div class="cd-section">
      <div class="cd-section-head"><h3>📅 المحاضرات (${lectures.length})</h3>
        <button class="btn btn-ghost btn-sm" onclick="openClassFormForCourse('${c.id}')">➕ إضافة محاضرة</button></div>
      ${lecturesHTML}
    </div>
    <div class="cd-section">
      <div class="cd-section-head"><h3>📋 المهام والاختبارات (${tasks.length + exams.length})</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="openTaskFormForCourse('${c.id}')">➕ إضافة مهمة</button>
          <button class="btn btn-ghost btn-sm" onclick="openExamFormForCourse('${c.id}')">➕ إضافة اختبار</button>
        </div>
      </div>
      ${tasksHTML}
      ${examsHTML}
    </div>
    <div class="cd-section">
      <div class="cd-section-head"><h3>📊 الدرجات التفصيلية</h3>
        <button class="btn btn-ghost btn-sm" onclick="go('grades')">فتح المعدل والدرجات</button></div>
      ${gradesHTML}
    </div>`;
}
function openTaskFormForCourse(cid){ openTaskForm(); setTimeout(() => { const sel = document.getElementById('tCourse'); if(sel){ sel.value = cid; } }, 30); }
function openExamFormForCourse(cid){ openExamForm(); setTimeout(() => { const sel = document.getElementById('eCourse'); if(sel){ sel.value = cid; } }, 30); }
function openClassFormForCourse(cid){ openClassForm(); setTimeout(() => { const sel = document.getElementById('clCourse'); if(sel){ sel.value = cid; } }, 30); }

/* ============================================================
   9) المحاضرات
============================================================ */
function courseOptions(sel){
  if(!state.courses.length) return `<option value="">— أضف مقرراً أولاً —</option>`;
  return state.courses.map(c => `<option value="${c.id}" ${c.id===sel?'selected':''}>${esc(c.name)}</option>`).join('');
}
function openClassForm(id, presetDay){
  if(!state.courses.length){ toast('⚠️ أضف مقرراً أولاً'); go('courses'); return; }
  const s = id ? state.schedule.find(x => x.id === id) : null;
  const dayOpts = DAYS.map((d,i) => `<option value="${i}" ${(s?.day ?? presetDay ?? 0) == i ? 'selected':''}>${d}</option>`).join('');
  openModal(s ? 'تعديل محاضرة' : 'إضافة محاضرة', `
    <div class="form-grid">
      <div class="field full"><label>المقرر <span class="req">*</span></label><select id="clCourse">${courseOptions(s?.courseId)}</select></div>
      <div class="field"><label>اليوم <span class="req">*</span></label><select id="clDay">${dayOpts}</select></div>
      <div class="field"><label>القاعة</label><input id="clRoom" placeholder="قاعة 204" value="${esc(s?.room||'')}"></div>
      <div class="field"><label>من <span class="req">*</span></label><input type="time" id="clStart" value="${s?.start||'08:00'}"></div>
      <div class="field"><label>إلى <span class="req">*</span></label><input type="time" id="clEnd" value="${s?.end||'09:00'}"></div>
    </div>
  `, `${s ? `<button class="btn btn-danger" onclick="deleteClass('${id}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveClass('${id||''}')">💾 حفظ</button>`);
}
function hasScheduleConflict(day, start, end, ignoreId = '', extraList = []){
  const sMin = toMin(start), eMin = toMin(end);
  const all = [...state.schedule, ...extraList];
  return all.some(x => x.id !== ignoreId && +x.day === +day && sMin < toMin(x.end) && eMin > toMin(x.start));
}
function saveClass(id){
  const courseId = document.getElementById('clCourse').value;
  const day = +document.getElementById('clDay').value;
  const start = document.getElementById('clStart').value;
  const end = document.getElementById('clEnd').value;
  const room = document.getElementById('clRoom').value.trim();
  if(!courseId){ toast('⚠️ اختر المقرر'); return; }
  if(toMin(end) <= toMin(start)){ toast('⚠️ وقت النهاية يجب أن يكون بعد البداية'); return; }
  if(hasScheduleConflict(day, start, end, id)){ toast('⚠️ يوجد تعارض في الوقت مع محاضرة أخرى في نفس اليوم'); return; }
  if(id){ const it = state.schedule.find(x => x.id === id); if(it) Object.assign(it, { courseId, day, start, end, room }); }
  else{ state.schedule.push({ id: uid(), courseId, day, start, end, room }); }
  save(); closeModal(); renderAll(); toast('✅ تم الحفظ');
}
function deleteClass(id){
  state.schedule = state.schedule.filter(s => s.id !== id);
  state.attendance = state.attendance.filter(a => a.classId !== id);
  save(); closeModal(); renderAll(); toast('🗑️ تم الحذف');
}

/* ============================================================
   10) نموذج اختيار نوع الإضافة
============================================================ */
function openAddForm(){
  openModal('➕ إضافة جديدة', `
    <div class="add-type-grid">
      <button class="add-type-btn" onclick="closeModal();openTaskForm()">
        <div class="at-ico" style="background:var(--warn-bg);color:var(--warn)">📝</div>
        <div class="at-main"><b>مهمة / واجب</b><span>واجبات، مشاريع، تقارير، بحوث</span></div>
      </button>
      <button class="add-type-btn" onclick="closeModal();openExamForm()">
        <div class="at-ico" style="background:var(--danger-bg);color:var(--danger)">⏰</div>
        <div class="at-main"><b>اختبار / كويز</b><span>ميدتيرم، فاينل، كويز، اختبار عملي</span></div>
      </button>
    </div>
  `, `<button class="btn btn-ghost btn-block" onclick="closeModal()">إلغاء</button>`);
}

/* ============================================================
   11) المهام
============================================================ */
function openTaskForm(id){
  const t = id ? state.tasks.find(x => x.id === id) : null;
  const typeOpts = TASK_TYPES.map(x => `<option ${t?.type===x?'selected':''}>${x}</option>`).join('');
  openModal(t ? 'تعديل مهمة' : 'إضافة مهمة', `
    <div class="form-grid">
      <div class="field full"><label>عنوان المهمة <span class="req">*</span></label><input id="tTitle" placeholder="مثال: حل واجب الفصل الثالث" value="${esc(t?.title||'')}"></div>
      <div class="field"><label>المقرر</label><select id="tCourse"><option value="">— عام —</option>${courseOptions(t?.courseId)}</select></div>
      <div class="field"><label>النوع</label><select id="tType">${typeOpts}</select></div>
      <div class="field"><label>تاريخ التسليم <span class="req">*</span></label><input type="date" id="tDue" value="${t?.due || todayISO()}"></div>
      <div class="field"><label>الأولوية</label><select id="tPriority">
        <option value="high" ${t?.priority==='high'?'selected':''}>🔴 عالية</option>
        <option value="med" ${t?.priority==='med'?'selected':''}>🟡 متوسطة</option>
        <option value="low" ${t?.priority==='low'?'selected':''}>🟢 منخفضة</option>
      </select></div>
      <div class="field full"><label>ملاحظات</label><textarea id="tNotes" placeholder="تفاصيل إضافية...">${esc(t?.notes||'')}</textarea></div>
    </div>
  `, `${t ? `<button class="btn btn-danger" onclick="deleteTask('${id}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveTask('${id||''}')">💾 حفظ</button>`);
}
function saveTask(id){
  const title = document.getElementById('tTitle').value.trim();
  const due = document.getElementById('tDue').value;
  if(!title){ toast('⚠️ اكتب عنوان المهمة'); return; }
  if(!due){ toast('⚠️ حدد تاريخ التسليم'); return; }
  const data = {
    title, due,
    courseId: document.getElementById('tCourse').value,
    type: document.getElementById('tType').value,
    priority: document.getElementById('tPriority').value,
    notes: document.getElementById('tNotes').value.trim()
  };
  if(id){ const it = state.tasks.find(x => x.id === id); if(it) Object.assign(it, data); }
  else{ state.tasks.push({ id: uid(), ...data, done:false, created: todayISO() }); }
  save(); closeModal(); renderAll(); toast('✅ تم الحفظ');
}
function deleteTask(id){ state.tasks = state.tasks.filter(t => t.id !== id); save(); closeModal(); renderAll(); toast('🗑️ تم الحذف'); }
function toggleTask(id){ const t = state.tasks.find(x => x.id === id); if(t){ t.done = !t.done; save(); renderAll(); } }

/* ============================================================
   12) الاختبارات
============================================================ */
function openExamForm(id){
  const e = id ? state.exams.find(x => x.id === id) : null;
  const typeOpts = EXAM_TYPES.map(x => `<option ${e?.type===x?'selected':''}>${x}</option>`).join('');
  openModal(e ? 'تعديل اختبار' : 'إضافة اختبار', `
    <div class="form-grid">
      <div class="field full"><label>عنوان الاختبار <span class="req">*</span></label><input id="eTitle" placeholder="مثال: ميدتيرم الفصل الأول" value="${esc(e?.title||'')}"></div>
      <div class="field"><label>المقرر</label><select id="eCourse"><option value="">— عام —</option>${courseOptions(e?.courseId)}</select></div>
      <div class="field"><label>النوع</label><select id="eType">${typeOpts}</select></div>
      <div class="field"><label>التاريخ <span class="req">*</span></label><input type="date" id="eDate" value="${e?.date || todayISO()}"></div>
      <div class="field"><label>الوقت</label><input type="time" id="eTime" value="${e?.time||'08:00'}"></div>
      <div class="field full"><label>المكان / القاعة</label><input id="ePlace" placeholder="مبنى 5 - قاعة 102" value="${esc(e?.place||'')}"></div>
      <div class="field full"><label>ملاحظات / مواضيع المذاكرة</label><textarea id="eNotes" placeholder="الفصول المطلوبة...">${esc(e?.notes||'')}</textarea></div>
    </div>
  `, `${e ? `<button class="btn btn-danger" onclick="deleteExam('${id}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveExam('${id||''}')">💾 حفظ</button>`);
}
function saveExam(id){
  const title = document.getElementById('eTitle').value.trim();
  const date = document.getElementById('eDate').value;
  if(!title){ toast('⚠️ اكتب عنوان الاختبار'); return; }
  if(!date){ toast('⚠️ حدد التاريخ'); return; }
  const data = {
    title, date,
    courseId: document.getElementById('eCourse').value,
    type: document.getElementById('eType').value,
    time: document.getElementById('eTime').value,
    place: document.getElementById('ePlace').value.trim(),
    notes: document.getElementById('eNotes').value.trim()
  };
  if(id){ const it = state.exams.find(x => x.id === id); if(it) Object.assign(it, data); }
  else{ state.exams.push({ id: uid(), ...data }); }
  save(); closeModal(); renderAll(); toast('✅ تم الحفظ');
}
function deleteExam(id){ state.exams = state.exams.filter(e => e.id !== id); save(); closeModal(); renderAll(); toast('🗑️ تم الحذف'); }

/* ============================================================
   13) رندرة اللوحة
============================================================ */
function renderDashboard(){
  const openTasks = state.tasks.filter(t => !t.done);
  const late = openTasks.filter(t => daysUntil(t.due) < 0);
  const upcomingExams = state.exams.filter(e => daysUntil(e.date) >= 0);
  const totalMin = state.studyLog.reduce((a,b) => a + b.minutes, 0);
  const statsHTML = [
    { ico:'📚', bg:'var(--p-light)', val:state.courses.length, lbl:'مقرر مسجّل' },
    { ico:'📋', bg:'var(--warn-bg)', val:openTasks.length + upcomingExams.length, lbl:'متبقي' },
    { ico:'⏰', bg:'var(--danger-bg)', val:upcomingExams.length, lbl:'اختبار قادم' },
    { ico:'🍅', bg:'var(--ok-bg)', val:Math.round(totalMin/60) + 'h', lbl:'ساعات المذاكرة' }
  ].map(s => `<div class="stat"><div class="stat-ico" style="background:${s.bg}">${s.ico}</div><div><b>${s.val}</b><span>${s.lbl}</span></div></div>`).join('');
  document.getElementById('dashStats').innerHTML = statsHTML;
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const pct = total ? Math.round(done/total*100) : 0;
  document.getElementById('dashProgBar').style.width = pct + '%';
  document.getElementById('dashProgTxt').textContent = total ? pct + '%' : '';
  document.getElementById('dashDone').textContent = done;
  document.getElementById('dashLeft').textContent = total - done;
  document.getElementById('dashLate').textContent = late.length;
  const items = [
    ...openTasks.map(t => ({ kind:'task', id:t.id, ico:'📝', title:t.title, date:t.due, courseId:t.courseId })),
    ...upcomingExams.map(e => ({ kind:'exam', id:e.id, ico:'⏰', title:e.title, date:e.date, courseId:e.courseId }))
  ].sort((a,b) => a.date.localeCompare(b.date)).slice(0,6);
  const upEl = document.getElementById('dashUpcoming');
  if(!items.length){
    upEl.innerHTML = `<div class="empty" style="padding:28px 10px"><div class="e-ico">🎉</div><b>ما عندك شي قريب</b><p>استمتع بوقتك أو أضف مهاماً جديدة</p></div>`;
  }else{
    upEl.innerHTML = items.map(it => {
      const d = daysUntil(it.date);
      let txt, bg;
      if(d < 0){ txt = `متأخر ${Math.abs(d)} يوم`; bg = 'var(--danger-bg)'; }
      else if(d === 0){ txt = 'اليوم'; bg = 'var(--danger-bg)'; }
      else if(d === 1){ txt = 'غداً'; bg = 'var(--warn-bg)'; }
      else { txt = `بعد ${d} يوم`; bg = 'var(--ok-bg)'; }
      const clickHandler = it.kind === 'task' ? `openTaskForm('${it.id}')` : `openExamForm('${it.id}')`;
      return `<div class="up-item" onclick="${clickHandler}"><div class="up-dot" style="background:${courseColor(it.courseId)}"></div>
        <div class="up-info"><b>${it.ico} ${esc(it.title)}</b><span>${it.kind === 'task' ? 'مهمة' : 'اختبار'} · ${esc(courseName(it.courseId))} · ${fmtDate(it.date)}</span></div>
        <div class="up-time" style="background:${bg}">${txt}</div></div>`;
    }).join('');
  }
  const nowDay = new Date().getDay();
  const todays = state.schedule.filter(s => s.day === nowDay).sort((a,b) => toMin(a.start) - toMin(b.start));
  const tdEl = document.getElementById('dashToday');
  if(!todays.length){
    tdEl.innerHTML = `<div class="empty" style="padding:28px 10px"><div class="e-ico">🛌</div><b>ما فيه محاضرات اليوم</b><p>${DAYS[nowDay]} — يوم مريح!</p></div>`;
  }else{
    tdEl.innerHTML = todays.map(s => {
      const c = getCourse(s.courseId);
      return `<div class="up-item" onclick="go('schedule')"><div class="up-dot" style="background:${courseColor(s.courseId)}"></div>
        <div class="up-info"><b>${esc(courseName(s.courseId))}</b><span>${to12(s.start)} - ${to12(s.end)}${s.room ? ' · ' + esc(s.room) : ''}</span></div>
        <div class="up-time" style="background:var(--hover);color:var(--muted)">${c?.teacher ? esc(c.teacher) : ''}</div></div>`;
    }).join('');
  }
  renderDashHealth();
}

/* ============================================================
   13.5) بطاقة الصحة في اللوحة
============================================================ */
function renderDashHealth(){
  const el = document.getElementById('dashHealth');
  if(!el) return;
  const today = todayISO();
  const teethLog = state.health.teethLog.find(l => l.date === today) || { morning: false, night: false };
  const teethCount = (teethLog.morning?1:0) + (teethLog.night?1:0);
  const w = state.wellness;
  const wLog = w.log.find(l => l.date === today) || { sleep: 0, water: 0 };
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div style="background:var(--hover);padding:14px;border-radius:12px;text-align:center;cursor:pointer" onclick="go('teeth')">
        <div style="font-size:22px">🦷</div>
        <div style="font-size:11px;color:var(--muted);font-weight:700;margin-top:4px">تفريش الأسنان</div>
        <div style="font-family:'Tajawal';font-size:17px;font-weight:800;color:var(--p);margin-top:2px">${teethCount}/2</div>
      </div>
      <div style="background:var(--hover);padding:14px;border-radius:12px;text-align:center;cursor:pointer" onclick="go('wellness')">
        <div style="font-size:22px">😴</div>
        <div style="font-size:11px;color:var(--muted);font-weight:700;margin-top:4px">ساعات النوم</div>
        <div style="font-family:'Tajawal';font-size:17px;font-weight:800;color:var(--p);margin-top:2px">${wLog.sleep}/${w.sleepGoal}</div>
      </div>
      <div style="background:var(--hover);padding:14px;border-radius:12px;text-align:center;cursor:pointer" onclick="go('wellness')">
        <div style="font-size:22px">💧</div>
        <div style="font-size:11px;color:var(--muted);font-weight:700;margin-top:4px">أكواب الماء</div>
        <div style="font-family:'Tajawal';font-size:17px;font-weight:800;color:var(--p);margin-top:2px">${wLog.water}/${w.waterGoal}</div>
      </div>
    </div>
    <button class="btn btn-ghost btn-block" style="margin-top:12px" onclick="go('wellness')">فتح صفحة الصحة →</button>`;
}

/* ============================================================
   14) رندرة الجدول
============================================================ */
function classDateThisWeek(dayIdx){
  const w = acadSelectedWeek || currentAcademicWeek();
  const ws = getWeekMonday(w);
  const d = new Date(ws);
  d.setDate(ws.getDate() + ((dayIdx - ws.getDay() + 7) % 7));
  return todayISO(d);
}
function getAttFor(cid, date){ return state.attendance.find(a => a.classId === cid && a.date === date); }
function renderSchedule(){
  const nowDay = new Date().getDay();
  let minHour = HOUR_START, maxHour = HOUR_END;
  state.schedule.forEach(s => {
    const sh = Math.floor(toMin(s.start) / 60);
    const eh = Math.ceil(toMin(s.end) / 60);
    if(sh < minHour) minHour = Math.max(0, sh);
    if(eh > maxHour) maxHour = Math.min(24, eh);
  });
  const hours = [];
  for(let h = minHour; h < maxHour; h++) hours.push(h);
  const colHeight = hours.length * HOUR_H;
  const head = `<div class="sched-head"><div></div><div class="sched-days">${DAYS.map((d,i) => `<div class="sched-day ${i===nowDay?'today':''}">${d}</div>`).join('')}</div></div>`;
  const times = `<div class="sched-times">${hours.map(h => `<div class="sched-time">${to12(String(h).padStart(2,'0') + ':00')}</div>`).join('')}</div>`;
  const cols = `<div class="sched-cols">
    ${DAYS.map((_,di) => {
      const lines = hours.map((_,i) => `<div class="hour-line" style="top:${i*HOUR_H}px"></div>`).join('');
      const dayDate = classDateThisWeek(di);
      const dayItems = state.schedule.filter(s => s.day === di).sort((a,b) => toMin(a.start) - toMin(b.start));
      const blocks = dayItems.map(s => {
        const startMin = toMin(s.start), endMin = toMin(s.end);
        const top = (startMin - minHour*60) / 60 * HOUR_H;
        const hgt = (endMin - startMin) / 60 * HOUR_H - 4;
        if(top < -50 || top > colHeight) return '';
        const overlaps = dayItems.filter(o => toMin(o.start) < endMin && toMin(o.end) > startMin);
        const ovIdx = overlaps.indexOf(s);
        const ovCount = overlaps.length;
        const widthPct = 100 / ovCount;
        const rightPct = ovIdx * widthPct;
        const posStyle = ovCount > 1 ? `right:calc(${rightPct}% + 2px);left:auto;width:calc(${widthPct}% - 4px);` : '';
        const att = getAttFor(s.id, dayDate);
        const status = att ? att.status : 'present';
        const st = ATT[status];
        let color = courseColor(s.courseId);
        let extra = '';
        if(status !== 'present' && st){
          color = st.color;
          if(status === 'cancelled') extra = 'opacity:.55;text-decoration:line-through;';
        }
        return `<div class="cls" style="top:${top}px;height:${Math.max(hgt,26)}px;background:${color};${posStyle}${extra}" onclick="event.stopPropagation();openAttPopup('${s.id}','${dayDate}')">
          <b>${esc(courseName(s.courseId))}</b><span>${to12(s.start)} - ${to12(s.end)}${s.room ? ' · ' + esc(s.room) : ''}</span>
          ${status !== 'present' && st ? `<span style="position:absolute;top:3px;left:5px;font-size:12px">${st.ico}</span>` : ''}</div>`;
      }).join('');
      return `<div class="sched-col" data-day="${di}" style="min-height:${colHeight}px" onclick="openClassForm(null,${di})">${lines}${blocks}</div>`;
    }).join('')}
  </div>`;
  document.getElementById('schedInner').innerHTML = head + `<div class="sched-body">${times}${cols}</div>`;
}
function openAttPopup(classId, date, draftNote){
  const s = state.schedule.find(x => x.id === classId);
  if(!s) return;
  const existing = getAttFor(classId, date);
  const cur = existing ? existing.status : 'present';
  const noteVal = draftNote !== undefined ? draftNote : (existing?.note || '');
  const presentActive = cur === 'present';
  // ✅ FIX 5a: add att-status-btn class + data-status for in-place toggling
  const presentBtn = `<button class="att-status-btn" data-status="present" onclick="setAtt('${classId}','${date}','present')" style="grid-column:1/-1;padding:11px;border-radius:12px;font-weight:700;font-size:13.5px;background:${presentActive ? 'var(--ok)' : 'var(--hover)'};color:${presentActive ? '#fff' : 'var(--text)'};border:2px solid ${presentActive ? 'var(--ok)' : 'transparent'};transition:all .2s;font-family:inherit;cursor:pointer">✅ حاضر (الافتراضي)</button>`;
  const btns = presentBtn + Object.entries(ATT).map(([k,v]) => {
    const active = cur === k;
    const bg = v.color || courseColor(s.courseId);
    return `<button class="att-status-btn" data-status="${k}" onclick="setAtt('${classId}','${date}','${k}')" style="padding:13px;border-radius:12px;font-weight:700;font-size:13.5px;background:${active ? bg : 'var(--hover)'};color:${active ? '#fff' : 'var(--text)'};border:2px solid ${active ? bg : 'transparent'};transition:all .2s;font-family:inherit;cursor:pointer">${v.ico} ${v.label}</button>`;
  }).join('');
  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'});
  const isToday = date === todayISO();
  openModal('📋 الحضور وتعديل المحاضرة', `
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:17px;font-weight:800;font-family:'Tajawal';margin-bottom:5px;color:${courseColor(s.courseId)}">${esc(courseName(s.courseId))}</div>
      <div style="font-size:12.5px;color:var(--muted);font-weight:700">${dateStr}${isToday ? ' <span style="color:var(--p)">(اليوم)</span>' : ''} · ${to12(s.start)} - ${to12(s.end)}${s.room ? ' · ' + esc(s.room) : ''}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="closeModal();openClassForm('${classId}')">✏️ تعديل وقت / قاعة المحاضرة أو حذفها</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${btns}</div>
    <div class="field" style="margin-top:16px"><label>ملاحظة (اختياري)</label>
      <textarea id="attNote" placeholder="سبب الغياب أو ملاحظة..." style="min-height:70px">${esc(noteVal)}</textarea></div>
  `, `${existing ? `<button class="btn btn-danger btn-sm" onclick="clearAtt('${classId}','${date}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button><button class="btn btn-primary" onclick="saveAttNote('${classId}','${date}')">💾 حفظ</button>`);
}
// ✅ FIX 5a: no longer reopens the modal — updates buttons in-place
function setAtt(classId, date, status){
  const n = document.getElementById('attNote');
  const note = n ? n.value.trim() : '';
  if(status === 'present'){
    state.attendance = state.attendance.filter(a => !(a.classId === classId && a.date === date));
  } else {
    const att = getAttFor(classId, date);
    if(att){ att.status = status; att.note = note; }
    else{ state.attendance.push({ id:uid(), classId, date, status, note }); }
  }
  save(); renderSchedule(); renderAttendancePage();

  const sch = state.schedule.find(x => x.id === classId);
  const schColor = sch ? courseColor(sch.courseId) : '#0d9488';
  document.querySelectorAll('#modalBody .att-status-btn').forEach(btn => {
    const k = btn.dataset.status;
    const isActive = k === status;
    if(k === 'present'){
      btn.style.background = isActive ? 'var(--ok)' : 'var(--hover)';
      btn.style.color = isActive ? '#fff' : 'var(--text)';
      btn.style.borderColor = isActive ? 'var(--ok)' : 'transparent';
    } else {
      const v = ATT[k];
      const bg = (v && v.color) || schColor;
      btn.style.background = isActive ? bg : 'var(--hover)';
      btn.style.color = isActive ? '#fff' : 'var(--text)';
      btn.style.borderColor = isActive ? bg : 'transparent';
    }
  });

  toast('✅ تم');
}
// ✅ FIX 5b: create a 'present' record if a note is provided with no existing record
function saveAttNote(classId, date){
  const n = document.getElementById('attNote');
  if(!n) return;
  const note = n.value.trim();
  const att = getAttFor(classId, date);
  if(att){
    att.note = note;
    save(); renderSchedule(); renderAttendancePage(); closeModal(); toast('💾 تم الحفظ');
  } else if(note){
    state.attendance.push({ id: uid(), classId, date, status: 'present', note });
    save(); renderSchedule(); renderAttendancePage(); closeModal(); toast('💾 تم الحفظ');
  } else {
    closeModal();
  }
}
async function clearAtt(classId, date){
  const ok = await appConfirm('حذف سجل الحضور لهذا اليوم؟', {
    title: 'حذف السجل', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  state.attendance = state.attendance.filter(a => !(a.classId === classId && a.date === date));
  save(); renderSchedule(); closeModal(); toast('🗑️ تم');
}
(function legend(){
  const head = document.querySelector('#view-schedule .sec-head');
  if(!head || document.getElementById('attLegend')) return;
  const div = document.createElement('div');
  div.id = 'attLegend';
  div.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding:12px 14px;background:var(--card);border:1px solid var(--border);border-radius:12px;font-size:12.5px;font-weight:700';
  div.innerHTML = Object.entries(ATT).map(([k,v]) => {
    const col = v.color || '#0d9488';
    return `<span style="display:inline-flex;align-items:center;gap:5px;color:${col}"><span style="width:11px;height:11px;border-radius:3px;background:${col}"></span>${v.label}</span>`;
  }).join('') + '<span style="color:var(--muted);font-weight:600;margin-inline-start:auto">اضغط أي محاضرة</span>';
  head.parentNode.insertBefore(div, head.nextSibling);
})();

/* ============================================================
   15) رندرة المقررات
============================================================ */
function renderCourses(){
  const grid = document.getElementById('coursesGrid');
  document.getElementById('coursesCount').textContent = state.courses.length
    ? `${state.courses.length} مقرر · ${state.courses.reduce((a,c) => a + (+c.credits||0), 0)} ساعة معتمدة · اضغط أي بطاقة للتفاصيل`
    : 'لم تضف أي مقرر بعد';
  if(!state.courses.length){
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="e-ico">📚</div><b>لا توجد مقررات</b><p>ابدأ بإضافة مقرراتك لهذا الفصل</p><button class="btn btn-primary" onclick="openCourseForm()">➕ إضافة مقرر</button></div>`;
    return;
  }
  grid.innerHTML = state.courses.map(c => {
    const classes = state.schedule.filter(s => s.courseId === c.id).length;
    const tasks = state.tasks.filter(t => t.courseId === c.id && !t.done).length;
    const total = courseTotal(c);
    return `<div class="course-card" onclick="openCourseDetail('${c.id}')">
      <div class="course-bar" style="background:${c.color}"></div>
      <div class="course-body">
        <h3>${esc(c.name)}</h3>
        <div class="code">${esc(c.code || '—')}${c.teacher ? ' · ' + esc(c.teacher) : ''}</div>
        <div class="course-meta">
          <span class="pill">${c.credits || 0} ساعات</span>
          <span class="pill">${classes} محاضرة</span>
          ${tasks ? `<span class="pill" style="background:var(--warn-bg);color:var(--warn)">${tasks} مهمة</span>` : ''}
          ${total !== null ? `<span class="pill" style="background:var(--ok-bg);color:var(--ok)">${total.toFixed(1)}%</span>` : ''}
        </div>
        <div class="course-actions">
          <button onclick="event.stopPropagation();openCourseForm('${c.id}')">✏️ تعديل</button>
          <button onclick="event.stopPropagation();deleteCourse('${c.id}')">🗑️ حذف</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   16) رندرة المهام والاختبارات
============================================================ */
function renderTasks(){
  const list = document.getElementById('tasksList');
  const openTasksCount = state.tasks.filter(t => !t.done).length;
  const upcomingExamsCount = state.exams.filter(e => daysUntil(e.date) >= 0).length;
  document.getElementById('tasksCount').textContent = `${state.tasks.length} مهمة · ${state.exams.length} اختبار · ${openTasksCount + upcomingExamsCount} متبقي`;
  let items = [];
  state.tasks.forEach(t => { items.push({ kind:'task', date:t.due, done:!!t.done, data:t }); });
  state.exams.forEach(e => { const past = daysUntil(e.date) < 0; items.push({ kind:'exam', date:e.date, done:past, data:e }); });
  const td = todayISO();
  if(taskFilter === 'tasks') items = items.filter(x => x.kind === 'task');
  else if(taskFilter === 'exams') items = items.filter(x => x.kind === 'exam');
  else if(taskFilter === 'today') items = items.filter(x => x.date === td);
  else if(taskFilter === 'week') items = items.filter(x => { const d = daysUntil(x.date); return d >= 0 && d <= 7; });
  else if(taskFilter === 'late') items = items.filter(x => x.kind === 'task' && !x.data.done && daysUntil(x.date) < 0);
  else if(taskFilter === 'done') items = items.filter(x => x.done);
  items.sort((a,b) => {
    if(a.done !== b.done) return a.done ? 1 : -1;
    return a.date.localeCompare(b.date);
  });
  if(!items.length){
    list.innerHTML = `<div class="empty"><div class="e-ico">📋</div><b>لا يوجد شيء هنا</b><p>أضف مهمة أو اختبار جديد، أو غيّر الفلتر</p><button class="btn btn-primary" onclick="openAddForm()">➕ إضافة جديدة</button></div>`;
    return;
  }
  const prioMap = {
    high: { t:'🔴 عالية', bg:'var(--danger-bg)', c:'var(--danger)' },
    med:  { t:'🟡 متوسطة', bg:'var(--warn-bg)', c:'var(--warn)' },
    low:  { t:'🟢 منخفضة', bg:'var(--ok-bg)', c:'var(--ok)' }
  };
  list.innerHTML = items.map(it => {
    if(it.kind === 'task') return renderTaskItem(it.data, prioMap);
    return renderExamItem(it.data);
  }).join('');
}
function renderTaskItem(t, prioMap){
  const d = daysUntil(t.due);
  let dueTxt, dueBg;
  if(t.done){ dueTxt = 'منجزة'; dueBg = 'var(--ok-bg)'; }
  else if(d < 0){ dueTxt = `متأخر ${Math.abs(d)} يوم`; dueBg = 'var(--danger-bg)'; }
  else if(d === 0){ dueTxt = 'اليوم'; dueBg = 'var(--danger-bg)'; }
  else if(d === 1){ dueTxt = 'غداً'; dueBg = 'var(--warn-bg)'; }
  else { dueTxt = `بعد ${d} يوم`; dueBg = 'var(--hover)'; }
  const p = prioMap[t.priority] || prioMap.med;
  return `<div class="task ${t.done?'done':''}">
    <div class="chk" onclick="toggleTask('${t.id}')">✓</div>
    <div class="task-main">
      <div class="task-title">📝 ${esc(t.title)}</div>
      <div class="task-sub">
        <span class="tag" style="background:${courseColor(t.courseId)}22;color:${courseColor(t.courseId)}">${esc(courseName(t.courseId))}</span>
        <span class="tag" style="background:var(--hover);color:var(--muted)">${esc(t.type)}</span>
        <span class="tag" style="background:${p.bg};color:${p.c}">${p.t}</span>
        <span class="tag" style="background:${dueBg}">📅 ${fmtDate(t.due)}</span>
      </div>
      ${t.notes ? `<div style="font-size:12.5px;color:var(--muted);margin-top:8px">${esc(t.notes)}</div>` : ''}
    </div>
    <div class="task-actions">
      <button class="mini-btn" onclick="openTaskForm('${t.id}')">✏️</button>
      <button class="mini-btn del" onclick="deleteTask('${t.id}')">🗑️</button>
    </div>
  </div>`;
}
function renderExamItem(e){
  const d = daysUntil(e.date);
  let dueTxt, dueBg;
  if(d < 0){ dueTxt = 'انتهى'; dueBg = 'var(--hover)'; }
  else if(d === 0){ dueTxt = 'اليوم'; dueBg = 'var(--danger-bg)'; }
  else if(d === 1){ dueTxt = 'غداً'; dueBg = 'var(--danger-bg)'; }
  else if(d <= 7){ dueTxt = `بعد ${d} يوم`; dueBg = 'var(--warn-bg)'; }
  else { dueTxt = `بعد ${d} يوم`; dueBg = 'var(--ok-bg)'; }
  return `<div class="exam-item ${d < 0 ? 'past' : ''}">
    <div class="ex-ico">⏰</div>
    <div class="ex-main">
      <div class="ex-title">${esc(e.title)}</div>
      <div class="ex-sub">
        <span class="tag" style="background:${courseColor(e.courseId)}22;color:${courseColor(e.courseId)}">${esc(courseName(e.courseId))}</span>
        <span class="tag" style="background:var(--hover);color:var(--muted)">${esc(e.type)}</span>
        <span class="tag" style="background:${dueBg}">📅 ${fmtDate(e.date)}</span>
        ${e.time ? `<span class="tag" style="background:var(--hover);color:var(--muted)">🕐 ${to12(e.time)}</span>` : ''}
        ${e.place ? `<span class="tag" style="background:var(--hover);color:var(--muted)">📍 ${esc(e.place)}</span>` : ''}
      </div>
      ${e.notes ? `<div style="font-size:12.5px;color:var(--muted);margin-top:8px">${esc(e.notes)}</div>` : ''}
    </div>
    <div class="task-actions">
      <button class="mini-btn" onclick="openExamForm('${e.id}')">✏️</button>
      <button class="mini-btn del" onclick="deleteExam('${e.id}')">🗑️</button>
    </div>
  </div>`;
}

/* ============================================================
   17) الدرجات والمعدل
============================================================ */
function scoreToPoints(p){
  if(p >= 95) return 5.00; if(p >= 90) return 4.75; if(p >= 85) return 4.50;
  if(p >= 80) return 4.00; if(p >= 75) return 3.50; if(p >= 70) return 3.00;
  if(p >= 65) return 2.50; if(p >= 60) return 2.00; return 0;
}
function scoreToLetter(p){
  if(p >= 95) return 'A+'; if(p >= 90) return 'A';
  if(p >= 85) return 'B+'; if(p >= 80) return 'B';
  if(p >= 75) return 'C+'; if(p >= 70) return 'C';
  if(p >= 65) return 'D+'; if(p >= 60) return 'D';
  return 'F';
}
function courseTotal(c){
  const g = (c.grades || []).filter(x => x.score !== '' && x.score !== null && x.score !== undefined && (+x.weight || 0) > 0);
  if(!g.length) return null;
  const totalW = g.reduce((a,x) => a + (+x.weight||0), 0);
  if(!totalW) return null;
  return g.reduce((a,x) => a + (+x.score||0) * (+x.weight||0), 0) / totalW;
}
function letterToPoints(letter){ return GRADE_POINTS[letter] || 0; }
function getCourseGrade(c){
  if(c.grades && c.grades.length){
    const detailed = courseTotal(c);
    const safeScore = detailed !== null ? detailed : 0;
    return { type:'detailed', score: safeScore, letter: scoreToLetter(safeScore), ungraded: detailed === null };
  }
  if(c.manualLetter) return { type:'letter', score: null, letter: c.manualLetter };
  return null;
}
function collectGradeRows(){
  const allRows = [];
  state.courses.forEach(c => {
    const g = getCourseGrade(c);
    allRows.push({ source:'course', id:c.id, name:c.name, code:c.code, credits:+c.credits||0, color:c.color, teacher:c.teacher, type: g ? g.type : 'empty', score: g ? g.score : null, letter: (g && !g.ungraded) ? g.letter : null, grades: c.grades || [] });
  });
  state.gpaCourses.forEach((gc, idx) => {
    allRows.push({ source:'external', idx, name:gc.name, code:'', credits:+gc.credits||0, color:'#64748b', teacher:'', type:'letter', score:null, letter:gc.grade, grades:[] });
  });
  return allRows;
}
function renderGpaStats(rows){
  const statsEl = document.getElementById('gpaStats');
  if(!statsEl) return;
  const allRows = rows || collectGradeRows();
  let pts = 0, cr = 0;
  allRows.forEach(r => {
    if(!r.letter) return;
    const points = letterToPoints(r.letter);
    const credit = r.credits || 0;
    if(credit > 0){ pts += points * credit; cr += credit; }
  });
  const gpa = cr ? (pts / cr) : 0;
  const gradedCount = allRows.filter(r => r.letter).length;
  statsEl.innerHTML = `
    <div class="stat"><div class="stat-ico" style="background:var(--p-light)">🎯</div><div><b>${gpa.toFixed(2)}</b><span>المعدل التقديري (من 5)</span></div></div>
    <div class="stat"><div class="stat-ico" style="background:var(--ok-bg)">📖</div><div><b>${cr}</b><span>ساعة محسوبة</span></div></div>
    <div class="stat"><div class="stat-ico" style="background:var(--warn-bg)">📝</div><div><b>${gradedCount}/${allRows.length}</b><span>مقررات مُقيّمة</span></div></div>`;
}
function renderGrades(){
  const statsEl = document.getElementById('gpaStats');
  const listEl = document.getElementById('gradesList');
  if(!statsEl || !listEl) return;
  const allRows = collectGradeRows();
  renderGpaStats(allRows);
  if(!allRows.length){
    listEl.innerHTML = `<div class="empty"><div class="e-ico">📊</div><b>لا توجد مقررات</b><p>أضف مقرراً من قسم "المقررات" — أو مقرراً خارجياً</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" onclick="go('courses');openCourseForm()">➕ إضافة مقرر</button><button class="btn btn-ghost" onclick="openAddGradeForm()">➕ مقرر خارجي</button></div></div>`;
    return;
  }
  listEl.innerHTML = allRows.map((r, i) => buildGradeRow(r, i)).join('');
}
function buildGradeRow(r, i){
  const isExternal = r.source === 'external';
  const rowId = `grade-row-${r.source}-${i}`;
  const badgeId = `badge-${rowId}`;
  let statusBadge = '';
  let actions = '';
  if(r.type === 'detailed'){
    const letter = r.letter || '—';
    const pColor = letter.startsWith('A') ? 'var(--ok)' : letter.startsWith('B') ? 'var(--p)' : letter.startsWith('C') ? 'var(--warn)' : (letter === '—' ? 'var(--muted)' : 'var(--danger)');
    statusBadge = `<span id="${badgeId}" style="background:${pColor}22;color:${pColor};padding:6px 12px;border-radius:20px;font-weight:800;font-size:13px">${r.letter ? `${r.score.toFixed(1)}% · ${letter}` : 'بانتظار الدرجات'}</span>`;
    actions = `<button class="btn btn-ghost btn-sm" onclick="toggleGradeExpand('${rowId}')">📝 تعديل المكونات</button>`;
  } else if(r.type === 'letter'){
    statusBadge = `
      <select onchange="updateLetterGrade('${r.source}', ${isExternal ? r.idx : i}, this.value)" style="padding:6px 12px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);font-weight:800;font-size:14px;color:var(--p);cursor:pointer">
        ${!isExternal ? `<option value="">— إلغاء التقدير —</option>` : ''}
        ${GRADE_OPTIONS.map(g => `<option value="${g}" ${g === r.letter ? 'selected':''}>${g}</option>`).join('')}
      </select>`;
    actions = isExternal
      ? `<button class="mini-btn del" onclick="removeExternalGrade(${r.idx})">✕</button>`
      : `<button class="btn btn-ghost btn-sm" onclick="addComponentsToCourse('${r.id}')">📝 تفصيلي</button>`;
  } else {
    statusBadge = `<span style="font-size:12.5px;color:var(--muted);font-weight:700">لم تُدخل درجة</span>`;
    actions = `
      <select onchange="updateLetterGrade('${r.source}', ${i}, this.value)" style="padding:6px 10px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);font-weight:700;font-size:13px;cursor:pointer">
        <option value="">— تقدير —</option>
        ${GRADE_OPTIONS.map(g => `<option>${g}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="addComponentsToCourse('${r.id}')">📝 تفصيلي</button>`;
  }
  let detailsHTML = '';
  if(r.type === 'detailed' && r.grades.length){
    const totalW = r.grades.reduce((a, x) => a + (+x.weight || 0), 0);
    detailsHTML = `
      <div id="${rowId}" style="display:none;padding:16px;border-top:1px solid var(--border);background:var(--hover)">
        <div class="comp-row comp-hd"><div>المكوّن</div><div>الوزن %</div><div>الدرجة %</div><div></div></div>
        ${r.grades.map((x, j) => `<div class="comp-row">
          <input value="${esc(x.name)}" oninput="updateComp('${r.id}',${j},'name',this.value)" placeholder="اسم المكوّن">
          <input type="number" value="${x.weight}" min="0" max="100" oninput="updateComp('${r.id}',${j},'weight',this.value)" placeholder="الوزن">
          <input type="number" value="${x.score}" min="0" max="100" oninput="updateComp('${r.id}',${j},'score',this.value)" placeholder="الدرجة">
          <button class="mini-btn del" onclick="removeComp('${r.id}',${j})">✕</button>
        </div>`).join('')}
        <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-ghost btn-sm" onclick="addComp('${r.id}')">➕ إضافة مكوّن</button>
          <span id="totalW-${rowId}" style="font-size:12.5px;color:var(--muted);font-weight:700">مجموع الأوزان: ${totalW}%</span>
          <span style="font-size:12px;color:var(--ok);font-weight:700">✓</span>
        </div>
      </div>`;
  }
  return `
    <div class="card" style="padding:0;margin-bottom:12px;border-right:4px solid ${r.color};overflow:hidden">
      <div style="padding:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:180px">
          <h3 style="font-size:16px;color:${r.color};margin-bottom:2px">${esc(r.name)}${isExternal ? ' <span style="font-size:10.5px;background:var(--muted);color:#fff;padding:2px 8px;border-radius:20px;font-weight:700">خارجي</span>' : ''}</h3>
          <span style="font-size:12.5px;color:var(--muted);font-weight:600">${r.code ? esc(r.code) + ' · ' : ''}${r.credits} ساعات${r.teacher ? ' · ' + esc(r.teacher) : ''}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${statusBadge}${actions}</div>
      </div>
      ${detailsHTML}
    </div>`;
}
function toggleGradeExpand(rowId){
  const el = document.getElementById(rowId);
  if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function updateLetterGrade(source, idx, letter){
  if(source === 'course'){
    const c = state.courses[idx];
    if(!c) return;
    if(!letter){
      delete c.manualLetter;
      save(); renderGrades(); toast('↺ تم مسح التقدير');
      return;
    }
    if(!c.grades || !c.grades.length){ c.manualLetter = letter; save(); renderGrades(); toast('✅ تم الحفظ'); }
  } else {
    if(!letter) return;
    const gc = state.gpaCourses[idx];
    if(!gc) return;
    gc.grade = letter;
    save(); renderGrades(); toast('✅ تم الحفظ');
  }
}
function addComponentsToCourse(courseId){
  const c = getCourse(courseId);
  if(!c) return;
  if(!c.grades) c.grades = [];
  if(!c.grades.length){
    c.grades.push({ name:'واجبات', weight:20, score:0 });
    c.grades.push({ name:'كويز',   weight:10, score:0 });
    c.grades.push({ name:'ميدتيرم', weight:30, score:0 });
    c.grades.push({ name:'نهائي',   weight:40, score:0 });
    delete c.manualLetter;
    save(); renderGrades();
    setTimeout(() => {
      state.courses.forEach((cc, i) => {
        if(cc.id === courseId){
          const el = document.getElementById(`grade-row-course-${i}`);
          if(el) el.style.display = 'block';
        }
      });
    }, 50);
    toast('📝 أضفت المكونات — عدّل الدرجات');
  }
}
async function removeExternalGrade(i){
  const ok = await appConfirm('حذف هذا المقرر من الحساب؟', {
    title: 'حذف المقرر الخارجي', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  state.gpaCourses.splice(i, 1);
  save(); renderGrades(); toast('🗑️ تم');
}
function preserveGradeOpen(cid, renderFn){
  const wasOpen = {};
  state.courses.forEach((cc, idx) => {
    const el = document.getElementById(`grade-row-course-${idx}`);
    if(el) wasOpen[cc.id] = el.style.display === 'block';
  });
  renderFn();
  setTimeout(() => {
    state.courses.forEach((cc, idx) => {
      if(wasOpen[cc.id]){
        const el = document.getElementById(`grade-row-course-${idx}`);
        if(el) el.style.display = 'block';
      }
    });
  }, 10);
}
function addComp(cid){
  const c = getCourse(cid);
  if(!c) return;
  c.grades = c.grades || [];
  c.grades.push({ name:'', weight:10, score:0 });
  save();
  preserveGradeOpen(cid, () => renderGrades());
}
function removeComp(cid, i){
  const c = getCourse(cid);
  if(!c.grades) return;
  c.grades.splice(i, 1);
  if(!c.grades.length) delete c.grades;
  save();
  preserveGradeOpen(cid, () => renderGrades());
}
let _compSaveTimer = null;
function updateComp(cid, i, field, val){
  const c = getCourse(cid);
  if(!c.grades || !c.grades[i]) return;
  if(field === 'name'){
    c.grades[i].name = val;
  } else if(field === 'score' && String(val).trim() === ''){
    c.grades[i].score = '';
  } else {
    c.grades[i][field] = parseFloat(val) || 0;
  }
  if(_compSaveTimer) clearTimeout(_compSaveTimer);
  _compSaveTimer = setTimeout(() => { try{ save(); }catch(e){} }, 600);
  const total = courseTotal(c);
  state.courses.forEach((cc, idx) => {
    if(cc.id === cid){
      const badge = document.getElementById(`badge-grade-row-course-${idx}`);
      if(badge){
        if(total !== null){
          const letter = scoreToLetter(total);
          const pColor = letter.startsWith('A') ? 'var(--ok)' : letter.startsWith('B') ? 'var(--p)' : letter.startsWith('C') ? 'var(--warn)' : 'var(--danger)';
          badge.textContent = `${total.toFixed(1)}% · ${letter}`;
          badge.style.background = `${pColor}22`;
          badge.style.color = pColor;
        } else {
          badge.textContent = 'بانتظار الدرجات';
          badge.style.background = 'var(--hover)';
          badge.style.color = 'var(--muted)';
        }
      }
    }
  });
  const totalW = (c.grades || []).reduce((a, x) => a + (+x.weight || 0), 0);
  state.courses.forEach((cc, idx) => {
    if(cc.id === cid){
      const el = document.getElementById(`totalW-grade-row-course-${idx}`);
      if(el) el.textContent = `مجموع الأوزان: ${totalW}%`;
    }
  });
  renderGpaStats();
}
function openAddGradeForm(){
  openModal('➕ إضافة مقرر خارجي', `
    <div class="form-grid">
      <div class="field full"><label>اسم المقرر <span class="req">*</span></label>
        <input id="agName" placeholder="مثال: رياضيات الفصل السابق"></div>
      <div class="field"><label>الساعات <span class="req">*</span></label>
        <input id="agCredits" type="number" min="1" max="10" value="3"></div>
      <div class="field"><label>التقدير <span class="req">*</span></label>
        <select id="agGrade">${GRADE_OPTIONS.map(g => `<option>${g}</option>`).join('')}</select></div>
    </div>
    <div style="background:var(--p-light);padding:12px 14px;border-radius:12px;font-size:12.5px;line-height:1.8;margin-top:14px;font-weight:600">
      💡 استخدم هذا لـ <b>المقررات الخارجية</b> فقط (فصول سابقة، مقررات مُعادلة).
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveExternalGrade()">💾 حفظ</button>`);
}
function saveExternalGrade(){
  const name = document.getElementById('agName').value.trim();
  const credits = +document.getElementById('agCredits').value || 0;
  const grade = document.getElementById('agGrade').value;
  if(!name){ toast('⚠️ اكتب اسم المقرر'); return; }
  if(credits <= 0){ toast('⚠️ عدد ساعات غير صحيح'); return; }
  state.gpaCourses.push({ name, credits, grade });
  save(); closeModal(); renderGrades(); toast('✅ تمت الإضافة');
}

/* ============================================================
   17.5) المصروف
============================================================ */
function addMonthsClamped(baseDate, monthsToAdd){
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth() + monthsToAdd;
  const targetDay = baseDate.getDate();
  const firstOfTarget = new Date(y, m, 1);
  const maxDay = new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth() + 1, 0).getDate();
  return new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth(), Math.min(targetDay, maxDay));
}
function getLastSalaryDate(){
  const m = state.money;
  if(!m.salaryExactDate) return null;
  const base = new Date(m.salaryExactDate + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  if(base > today) return base;
  let months = 0;
  while(addMonthsClamped(base, months + 1) <= today){
    months++;
    if(months > 120) break;
  }
  return addMonthsClamped(base, months);
}
function getNextSalaryDate(){
  const m = state.money;
  if(!m.salaryExactDate) return null;
  const base = new Date(m.salaryExactDate + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  if(base > today) return base;
  let months = 1;
  while(addMonthsClamped(base, months) <= today){
    months++;
    if(months > 120) break;
  }
  return addMonthsClamped(base, months);
}
function getDaysToSalary(){
  const next = getNextSalaryDate();
  if(!next) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.max(0, Math.ceil((next - today) / 86400000));
}
function getCurrentMonthExpenses(){
  const last = getLastSalaryDate();
  if(!last) return state.money.expenses || [];
  const lastISO = todayISO(last);
  const next = getNextSalaryDate();
  const nextISO = next ? todayISO(next) : '9999-12-31';
  return (state.money.expenses || []).filter(e => e.date >= lastISO && e.date < nextISO);
}
function getCycleLabel(){
  const last = getLastSalaryDate();
  if(!last) return '';
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return `من ${last.getDate()} ${months[last.getMonth()]} إلى الآن`;
}
function getTotalGoalSaved(){
  const last = getLastSalaryDate();
  const lastTs = last ? last.getTime() : 0;
  return (state.money.goals || []).reduce((sum, g) => {
    if(!Array.isArray(g.txs) || !g.txs.length) return sum; // ما فيه سجل → تجاهل
    const cycleNet = g.txs
      .filter(tx => tx.ts >= lastTs)
      .reduce((a, tx) => a + (+tx.amount || 0), 0);
    return sum + Math.max(0, cycleNet);
  }, 0);
}
function getTotalSpent(){ return getCurrentMonthExpenses().reduce((a,b) => a + (+b.amount||0), 0); }
function getRemaining(){ return (state.money.salary || 0) - getTotalSpent() - getTotalGoalSaved(); }

function renderBalance(){
  const el = document.getElementById('balanceContent');
  if(!el) return;
  const salary = state.money.salary || 0;
  const spent = getTotalSpent() + getTotalGoalSaved();
  const remaining = salary - spent;
  const pct = salary > 0 ? Math.min(100, Math.round((spent / salary) * 100)) : 0;
  const daysToSalary = getDaysToSalary();
  const cycleLabel = getCycleLabel();

  if(salary === 0 || !state.money.salaryExactDate){
    el.innerHTML = `
      <div class="card" style="padding:40px;text-align:center">
        <div style="font-size:56px;margin-bottom:12px">💰</div>
        <h3 style="font-size:19px;margin-bottom:8px">ابدأ بإعداد راتبك</h3>
        <p style="color:var(--muted);margin-bottom:20px">حدد المبلغ وتاريخ نزول الراتب لتبدأ التتبع</p>
        <button class="btn btn-primary" onclick="openSalaryForm()">➕ إعداد الراتب</button>
      </div>`;
    return;
  }

  let barColor = 'var(--ok)', statusText = '✅ بخير', statusBg = 'var(--ok-bg)';
  if(pct >= 90){ barColor = 'var(--danger)'; statusText = '🚨 وقف!'; statusBg = 'var(--danger-bg)'; }
  else if(pct >= 75){ barColor = 'var(--danger)'; statusText = '⚠️ خفّف'; statusBg = 'var(--warn-bg)'; }
  else if(pct >= 50){ barColor = 'var(--warn)'; statusText = '🟡 متوسطة'; statusBg = 'var(--warn-bg)'; }

  const monthExp = getCurrentMonthExpenses();
  const byCat = {};
  monthExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + (+e.amount||0); });
  const catRows = Object.entries(byCat).sort((a,b) => b[1] - a[1]).map(([cid, amt]) => {
    const cat = getCatById(cid);
    const catPct = spent > 0 ? Math.round((amt/spent)*100) : 0;
    return `<div class="cd-item">
      <div class="ci-ico">${cat.ico}</div>
      <div class="ci-main"><b>${cat.name}</b><span>${catPct}% من مصروفك</span></div>
      <div class="ci-side" style="background:${cat.color}22;color:${cat.color}">${fmtMoney(amt)} ر.س</div>
    </div>`;
  }).join('');

  const activeGoals = (state.money.goals || []).filter(g => (g.saved||0) < g.target).slice(0, 3);
  const goalsHTML = activeGoals.length ? activeGoals.map(g => {
    const p = Math.min(100, Math.round(((g.saved||0)/g.target)*100));
    return `<div class="cd-item" onclick="go('goals')" style="cursor:pointer">
      <div class="ci-ico">${g.emoji||'🎯'}</div>
      <div class="ci-main"><b>${esc(g.name)}</b><span>${fmtMoney(g.saved||0)} / ${fmtMoney(g.target)} ر.س</span></div>
      <div class="ci-side" style="background:var(--p-light);color:var(--p-dark)">${p}%</div>
    </div>`;
  }).join('') : '';

  el.innerHTML = `
    <div class="money-card">
      <div class="money-label">💰 الراتب / المكافأة</div>
      <div class="money-amount">${fmtMoney(salary)} ر.س</div>
      ${daysToSalary > 0 ? `<div class="money-label" style="margin-top:8px">📅 باقي ${daysToSalary} يوم على الراتب الجاي</div>` : ''}
      <div class="money-label" style="margin-top:4px;font-size:11px;opacity:.75">🔄 ${cycleLabel}</div>
      <div class="money-row">
        <div class="money-item"><b>${fmtMoney(spent)}</b><span>💸 المصروف</span></div>
        <div class="money-item"><b>${fmtMoney(remaining)}</b><span>✅ المتبقي</span></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <h3 style="font-size:17px">📊 تقدم الصرف</h3>
        <span style="background:${statusBg};color:${barColor};padding:5px 12px;border-radius:20px;font-size:12.5px;font-weight:800">${statusText} · ${pct}%</span>
      </div>
      <div class="prog" style="height:14px"><i style="width:${pct}%;background:${barColor}"></i></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);font-weight:700;margin-top:8px">
        <span>0</span><span>${fmtMoney(salary)}</span>
      </div>
    </div>

    ${catRows ? `
      <div class="card" style="margin-bottom:16px">
        <h3 style="font-size:17px;margin-bottom:14px">📈 توزيع المصروفات</h3>
        ${catRows}
      </div>` : ''}

    ${goalsHTML ? `
      <div class="card" style="margin-bottom:16px">
        <div class="sec-head" style="margin-bottom:12px">
          <h3 style="font-size:17px">🎯 أهدافك</h3>
          <button class="btn btn-ghost btn-sm" onclick="go('goals')">عرض الكل</button>
        </div>
        ${goalsHTML}
      </div>` : ''}

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" style="flex:1" onclick="openExpenseForm()">➕ إضافة مصروف</button>
      <button class="btn btn-ghost" onclick="go('expenses')">📋 كل المصاريف</button>
    </div>
  `;
}

function openSalaryForm(){
  const m = state.money;
  openModal('💰 الراتب / المكافأة', `
    <div class="form-grid">
      <div class="field full"><label>المبلغ (ر.س) <span class="req">*</span></label>
        <input id="salaryAmount" type="number" min="0" step="0.01" value="${m.salary || ''}" placeholder="2000"></div>
      
      <div class="field full">
        <label>تاريخ نزول الراتب الحالي <span class="req">*</span></label>
        <input id="salaryExactDate" type="date" value="${m.salaryExactDate || todayISO()}">
        <div style="font-size:12px;color:var(--muted);font-weight:600;margin-top:6px;line-height:1.7">
          💡 <b>أنا أحدد</b> متى نزل الراتب — كل المصاريف من هذا التاريخ تُحسب<br>
          📅 لما ييجي الراتب الجديد، ارجع هنا وحدّث التاريخ
        </div>
      </div>
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveSalary()">💾 حفظ</button>`);
}
function saveSalary(){
  const amount = +document.getElementById('salaryAmount').value || 0;
  const exactDate = document.getElementById('salaryExactDate').value;
  if(!exactDate){ toast('⚠️ حدد تاريخ الراتب'); return; }
  state.money.salary = amount;
  state.money.salaryExactDate = exactDate;
  save(); closeModal(); renderBalance(); renderExpenses();
  toast('✅ تم الحفظ');
}

function openExpenseForm(id){
  const e = id ? state.money.expenses.find(x => x.id === id) : null;
  let selectedCat = e?.category || 'food';
  const catBtns = EXPENSE_CATS.map(c => `
    <button type="button" data-cat="${c.id}" class="cat-btn ${selectedCat === c.id ? 'sel' : ''}" style="background:${c.color}15;color:${c.color};border:2px solid ${selectedCat === c.id ? c.color : 'transparent'};padding:10px 6px;border-radius:12px;font-weight:700;font-size:12.5px;transition:all .2s;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px">
      <span style="font-size:22px">${c.ico}</span>
      <span>${c.name}</span>
    </button>
  `).join('');
  openModal(e ? 'تعديل مصروف' : '💸 إضافة مصروف', `
    <div class="form-grid">
      <div class="field full"><label>المبلغ (ر.س) <span class="req">*</span></label>
        <input id="expAmount" type="number" min="0" step="0.01" value="${e?.amount || ''}" placeholder="50"></div>
      <div class="field full"><label>الوصف (اختياري)</label>
        <input id="expNote" placeholder="مثال: غداء مع الشباب" value="${esc(e?.note||'')}"></div>
      <div class="field full"><label>التاريخ</label>
        <input id="expDate" type="date" value="${e?.date || todayISO()}"></div>
      <div class="field full"><label>التصنيف <span class="req">*</span></label>
        <div id="catGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${catBtns}</div>
      </div>
    </div>
  `, `${e ? `<button class="btn btn-danger" onclick="deleteExpense('${id}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveExpense('${id||''}')">💾 حفظ</button>`);

  const grid = document.getElementById('catGrid');
  grid.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCat = btn.dataset.cat;
      grid.querySelectorAll('.cat-btn').forEach(b => {
        const c = getCatById(b.dataset.cat);
        const isSel = b.dataset.cat === selectedCat;
        b.style.borderColor = isSel ? c.color : 'transparent';
      });
    });
  });
  window._selectedExpCat = () => selectedCat;
}
function saveExpense(id){
  const amount = +document.getElementById('expAmount').value || 0;
  const note = document.getElementById('expNote').value.trim();
  const date = document.getElementById('expDate').value || todayISO();
  const category = window._selectedExpCat ? window._selectedExpCat() : 'food';
  if(amount <= 0){ toast('⚠️ أدخل مبلغ صحيح'); return; }
  if(id){
    const it = state.money.expenses.find(x => x.id === id);
    if(it) Object.assign(it, { amount, note, date, category });
  } else {
    state.money.expenses.push({ id: uid(), amount, note, date, category, created: Date.now() });
  }
  save(); closeModal();
  renderBalance(); renderExpenses();
  toast('✅ تم الحفظ');
}
async function deleteExpense(id){
  const ok = await appConfirm('حذف هذا المصروف؟', {
    title: 'حذف المصروف', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  state.money.expenses = state.money.expenses.filter(e => e.id !== id);
  save(); closeModal(); renderBalance(); renderExpenses(); toast('🗑️ تم');
}

function renderExpenses(){
  const list = document.getElementById('expensesList');
  if(!list) return;
  const all = [...state.money.expenses].sort((a,b) => (b.date||'').localeCompare(a.date||''));
  const today = todayISO();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 6*86400000);
  const weekStart = todayISO(weekAgo);

  let items = all;
  if(expenseFilter === 'today') items = all.filter(e => e.date === today);
  else if(expenseFilter === 'week') items = all.filter(e => e.date >= weekStart);

  const totalShown = items.reduce((a,b) => a + (+b.amount||0), 0);
  document.getElementById('expensesCount').textContent = items.length
    ? `${items.length} مصروف · الإجمالي: ${fmtMoney(totalShown)} ر.س`
    : 'لا توجد مصاريف';

  if(!items.length){
    list.innerHTML = `<div class="empty"><div class="e-ico">💸</div><b>لا توجد مصاريف</b><p>ابدأ بتسجيل مصاريفك</p><button class="btn btn-primary" onclick="openExpenseForm()">➕ إضافة مصروف</button></div>`;
    return;
  }

  list.innerHTML = items.map(e => {
    const cat = getCatById(e.category);
    return `<div class="exp-item">
      <div class="exp-ico" style="background:${cat.color}22;color:${cat.color}">${cat.ico}</div>
      <div class="exp-main">
        <b>${esc(e.note || cat.name)}</b>
        <span>${cat.name} · ${fmtDate(e.date)}</span>
      </div>
      <div class="exp-amount" style="color:var(--danger)">-${fmtMoney(e.amount)}</div>
      <button class="mini-btn" onclick="openExpenseForm('${e.id}')">✏️</button>
      <button class="mini-btn del" onclick="deleteExpense('${e.id}')">🗑️</button>
    </div>`;
  }).join('');
}

function renderGoals(){
  const list = document.getElementById('goalsList');
  if(!list) return;
  const goals = state.money.goals || [];
  const active = goals.filter(g => (g.saved||0) < g.target);
  const done = goals.filter(g => (g.saved||0) >= g.target);
  document.getElementById('goalsCount').textContent = goals.length
    ? `${goals.length} هدف · ${done.length} مكتمل`
    : 'لا توجد أهداف';

  if(!goals.length){
    list.innerHTML = `<div class="empty"><div class="e-ico">🎯</div><b>لا توجد أهداف</b><p>حدد أهدافك المالية وابدأ بالتحويش</p><button class="btn btn-primary" onclick="openGoalForm()">➕ هدف جديد</button></div>`;
    return;
  }

  const renderGoal = (g) => {
    const p = Math.min(100, Math.round(((g.saved||0)/g.target)*100));
    const remain = Math.max(0, g.target - (g.saved||0));
    const isDone = p >= 100;
    return `<div class="goal-card">
      <div class="goal-head">
        <div class="goal-title">
          <span style="font-size:26px">${g.emoji || '🎯'}</span>
          <span>${esc(g.name)}</span>
          ${isDone ? '<span style="background:var(--ok-bg);color:var(--ok);padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:800">✅ مكتمل</span>' : ''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="mini-btn" onclick="openGoalForm('${g.id}')">✏️</button>
          <button class="mini-btn del" onclick="deleteGoal('${g.id}')">🗑️</button>
        </div>
      </div>
      <div class="goal-nums">
        <div style="color:${isDone ? 'var(--ok)' : 'var(--p)'}">💰 تم توفير: <b>${fmtMoney(g.saved||0)}</b> ر.س</div>
        <div style="color:var(--muted)">🎯 الهدف: <b>${fmtMoney(g.target)}</b> ر.س</div>
        <div style="color:var(--warn)">📉 باقي: <b>${fmtMoney(remain)}</b> ر.س</div>
      </div>
      <div class="prog" style="height:12px"><i style="width:${p}%;background:linear-gradient(90deg,${isDone?'var(--ok)':'var(--p)'},#2dd4bf)"></i></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);font-weight:700;margin-top:8px">
        <span>${p}%</span><span>${isDone ? '🎉 مبروك!' : 'استمر!'}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="addToGoal('${g.id}')">➕ إيداع</button>
        ${(g.saved||0) > 0 ? `<button class="btn btn-ghost btn-sm" onclick="withdrawFromGoal('${g.id}')">➖ سحب</button>` : ''}
      </div>
    </div>`;
  };

  list.innerHTML = `
    ${active.length ? active.map(renderGoal).join('') : ''}
    ${done.length ? `
      <h3 style="font-size:15px;margin:20px 0 12px;color:var(--ok)">✅ مكتملة (${done.length})</h3>
      ${done.map(renderGoal).join('')}
    ` : ''}
  `;
}

function openGoalForm(id){
  const g = id ? state.money.goals.find(x => x.id === id) : null;
  const emojiOpts = ['🎯','💰','📱','💻','🎮','🚗','✈️','📚','🎁','🏠','👟','⌚','🎧','📷'];
  const emojiBtns = emojiOpts.map(em => `
    <button type="button" data-em="${em}" style="font-size:22px;padding:6px;border-radius:10px;background:${(g?.emoji||'🎯') === em ? 'var(--p-light)' : 'var(--hover)'};border:2px solid ${(g?.emoji||'🎯') === em ? 'var(--p)' : 'transparent'};transition:all .2s;cursor:pointer">${em}</button>
  `).join('');
  openModal(g ? 'تعديل هدف' : '🎯 هدف جديد', `
    <div class="form-grid">
      <div class="field full"><label>اسم الهدف <span class="req">*</span></label>
        <input id="gName" placeholder="مثال: لابتوب جديد" value="${esc(g?.name||'')}"></div>
      <div class="field full"><label>المبلغ المطلوب (ر.س) <span class="req">*</span></label>
        <input id="gTarget" type="number" min="1" step="0.01" value="${g?.target||''}" placeholder="5000"></div>
      <div class="field full"><label>المبلغ المُوفَّر حالياً</label>
        <input id="gSaved" type="number" min="0" step="0.01" value="${g?.saved||0}"></div>
      <div class="field full"><label>الأيقونة</label>
        <div id="emojiGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">${emojiBtns}</div>
      </div>
    </div>
  `, `${g ? `<button class="btn btn-danger" onclick="deleteGoal('${id}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveGoal('${id||''}')">💾 حفظ</button>`);

  let selectedEmoji = g?.emoji || '🎯';
  const grid = document.getElementById('emojiGrid');
  grid.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedEmoji = btn.dataset.em;
      grid.querySelectorAll('button').forEach(b => {
        const isSel = b.dataset.em === selectedEmoji;
        b.style.background = isSel ? 'var(--p-light)' : 'var(--hover)';
        b.style.borderColor = isSel ? 'var(--p)' : 'transparent';
      });
    });
  });
  window._selectedGoalEmoji = () => selectedEmoji;
}
function saveGoal(id){
  const name = document.getElementById('gName').value.trim();
  const target = +document.getElementById('gTarget').value || 0;
  const saved = +document.getElementById('gSaved').value || 0;
  const emoji = window._selectedGoalEmoji ? window._selectedGoalEmoji() : '🎯';
  if(!name){ toast('⚠️ اكتب اسم الهدف'); return; }
  if(target <= 0){ toast('⚠️ أدخل المبلغ المطلوب'); return; }
  if(id){
    const it = state.money.goals.find(x => x.id === id);
    if(it) Object.assign(it, { name, target, saved, emoji });
  } else {
    state.money.goals.push({ id: uid(), name, target, saved, emoji, created: Date.now() });
  }
  save(); closeModal(); renderGoals(); renderBalance(); toast('✅ تم الحفظ');
}
async function deleteGoal(id){
  const ok = await appConfirm('حذف هذا الهدف؟', {
    title: 'حذف الهدف', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  state.money.goals = state.money.goals.filter(g => g.id !== id);
  save(); closeModal(); renderGoals(); renderBalance(); toast('🗑️ تم');
}
function addToGoal(id){
  const g = state.money.goals.find(x => x.id === id);
  if(!g) return;
  openModal(`💰 إيداع في: ${g.name}`, `
    <div class="field"><label>المبلغ (ر.س)</label>
      <input id="depAmt" type="number" min="1" step="0.01" value="100"></div>
    <div style="background:var(--p-light);padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:700;margin-top:12px;color:var(--p-dark)">
      💡 باقي: ${fmtMoney(Math.max(0, g.target - (g.saved||0)))} ر.س للوصول للهدف
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="doDeposit('${id}')">💾 إيداع</button>`);
}
function doDeposit(id){
  const amt = +document.getElementById('depAmt').value || 0;
  if(amt <= 0){ toast('⚠️ أدخل مبلغ صحيح'); return; }
  const g = state.money.goals.find(x => x.id === id);
  if(!g) return;
  g.saved = (g.saved||0) + amt;
  g.txs = Array.isArray(g.txs) ? g.txs : [];
  g.txs.push({ ts: Date.now(), amount: amt });
  save(); closeModal(); renderGoals(); renderBalance();
  if((g.saved||0) >= g.target) toast('🎉 مبروك! حققت هدفك!');
  else toast(`✅ تم إيداع ${fmtMoney(amt)} ر.س`);
}
function withdrawFromGoal(id){
  const g = state.money.goals.find(x => x.id === id);
  if(!g) return;
  openModal(`➖ سحب من: ${g.name}`, `
    <div class="field"><label>المبلغ (ر.س)</label>
      <input id="wdrAmt" type="number" min="1" step="0.01" value="${g.saved||0}"></div>
    <div style="background:var(--warn-bg);padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:700;margin-top:12px;color:var(--warn)">
      ⚠️ المُوفَّر حالياً: ${fmtMoney(g.saved||0)} ر.س
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="doWithdraw('${id}')">سحب</button>`);
}
function doWithdraw(id){
  const amt = +document.getElementById('wdrAmt').value || 0;
  if(amt <= 0){ toast('⚠️ أدخل مبلغ صحيح'); return; }
  const g = state.money.goals.find(x => x.id === id);
  if(!g) return;
  const actualWithdrawn = Math.min(g.saved || 0, amt);
  g.saved = Math.max(0, (g.saved||0) - amt);
  if(actualWithdrawn > 0){
    g.txs = Array.isArray(g.txs) ? g.txs : [];
    g.txs.push({ ts: Date.now(), amount: -actualWithdrawn });
  }
  save(); closeModal(); renderGoals(); renderBalance(); toast('↩️ تم السحب');
}

document.getElementById('expenseFilters').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if(!chip) return;
  document.querySelectorAll('#expenseFilters .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  expenseFilter = chip.dataset.f;
  renderExpenses();
});

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
  if(startBtn) startBtn.textContent = pomo.running ? '⏸ إيقاف' : '▶ ابدأ';
}

// 🔧 MOD 5: sendBeacon + keepalive لضمان وصول الإلغاء
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
  // ✅ FIX 4a: 250 → 1000 (timer is computed from endTimestamp so 1s granularity is enough)
  pomo.intervalId = setInterval(pomoTick, 1000);
  pomoSaveState();
  syncPomoStartToServer(pomo.mode, pomo.total, pomo.endTimestamp);
  pomoRender();
}
// 🔧 MOD 2: أضف syncToTelegram بعد إلغاء السيرفر
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
// 🔧 MOD 3: تتبّع wasRunning وأبلغ السيرفر بعد التبديل
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
// 🔧 MOD 4: أضف syncToTelegram بعد التصفير
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
    state.studyLog.push({ id: uid(), date: logDate, courseId: cid, minutes: completedMins });
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
    // ✅ FIX 4a: 250 → 1000
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
    // ✅ FIX 4a: 250 → 1000
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

document.getElementById('pomoStart').addEventListener('click', () => {
  if('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  pomoToggle();
});
document.getElementById('pomoReset').addEventListener('click', pomoResetCurrent);
document.querySelectorAll('#view-study .pomo-modes .chip').forEach(c => c.addEventListener('click', async () => {
  if(c.dataset.mode === pomo.mode) return;
  const ok = await appConfirm(`تغيير الوضع إلى "${pomoLabel(c.dataset.mode)}"؟ (سيفقد الوقت الحالي)`, {
    title: 'تغيير الوضع', emoji: '🔄', okText: 'تغيير', variant: 'warn'
  });
  if(ok) pomoSetMode(c.dataset.mode);
}));

/* ============================================================
   19) المذاكرة
============================================================ */
document.getElementById('pomoCourse')?.addEventListener('change', e => {
  pomo.courseId = e.target.value || '';
  pomoSaveState();
});
function renderStudy(){
  const sel = document.getElementById('pomoCourse');
  if(sel){
    const cur = sel.value || pomo.courseId || '';
    sel.innerHTML = `<option value="">— بدون تحديد —</option>` + state.courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    if(cur && getCourse(cur)) sel.value = cur;
  }
  const today = todayISO();
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStart = todayISO(weekAgo);
  const todayMin = state.studyLog.filter(l => l.date === today).reduce((a,b) => a + b.minutes, 0);
  const weekMin = state.studyLog.filter(l => l.date >= weekStart).reduce((a,b) => a + b.minutes, 0);
  const totalMin = state.studyLog.reduce((a,b) => a + b.minutes, 0);
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
    const mins = state.studyLog.filter(l => l.date === iso).reduce((a,b) => a + b.minutes, 0);
    bars.push({ iso, mins, day: DAYS_SHORT[d.getDay()] });
  }
  const max = Math.max(...bars.map(b => b.mins), 60);
  const wb = document.getElementById('weekBars');
  if(wb){
    wb.innerHTML = bars.map(b => `<div class="wbar"><span class="wbar-val">${b.mins || ''}</span><div class="wbar-fill" style="height:${Math.max((b.mins/max)*100, 3)}%"></div><span class="wbar-lbl">${b.day}</span></div>`).join('');
    let recentEl = document.getElementById('studyRecentList');
    if(!recentEl){
      recentEl = document.createElement('div');
      recentEl.id = 'studyRecentList';
      recentEl.style.marginTop = '14px';
      wb.parentNode.insertBefore(recentEl, wb.nextSibling);
    }
    const recent = [...state.studyLog].slice(-5).reverse();
    recentEl.innerHTML = recent.length ? `
      <div style="font-size:12.5px;font-weight:800;color:var(--muted);margin-bottom:8px">🕒 آخر جلسات المذاكرة</div>
      ${recent.map(l => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--hover);border-radius:10px;margin-bottom:6px;font-size:12.5px;font-weight:700">
        <span>📚 ${esc(courseName(l.courseId))} · <span style="color:var(--muted)">${fmtDate(l.date)}</span></span>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="color:var(--p)">${l.minutes} د</span>
          <button class="mini-btn del" style="width:26px;height:26px;font-size:12px" onclick="deleteStudyLog('${l.id}')" title="حذف الجلسة">✕</button>
        </div>
      </div>`).join('')}
    ` : '';
  }
}
function deleteStudyLog(id){
  state.studyLog = state.studyLog.filter(l => l.id !== id);
  save(); renderStudy(); renderDashboard(); toast('🗑️ تم حذف جلسة المذاكرة');
}
function openManualLog(){
  openModal('إضافة وقت مذاكرة', `
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
  state.studyLog.push({ id: uid(), date: document.getElementById('mlDate').value || todayISO(), courseId: document.getElementById('mlCourse').value, minutes });
  save(); closeModal(); renderStudy(); renderDashboard(); toast('✅ تم الحفظ');
}
function savePomoSettings(){
  state.settings.pomo = {
    work: Math.max(1, +document.getElementById('setWork').value || 25),
    short: Math.max(1, +document.getElementById('setShort').value || 5),
    long: Math.max(1, +document.getElementById('setLong').value || 15)
  };
  save();
  if(!pomo.running && (pomo.pausedRemaining === null || pomo.pausedRemaining === pomo.total)){
    pomo.total = pomoDuration(pomo.mode);
    pomo.pausedRemaining = pomo.total;
    pomoSaveState();
    pomoRender();
  }
  toast('✅ تم حفظ الإعدادات');
}
async function clearAll(){
  const ok = await appConfirm('سيتم حذف كل بياناتك نهائياً (المقررات، المهام، الدرجات، المصروف). هذا الإجراء لا يمكن التراجع عنه!', {
    title: 'حذف كل البيانات', emoji: '⚠️', okText: 'حذف الكل', variant: 'danger'
  });
  if(!ok) return;
  state = defaultState();
  currentCourseId = null;
  try{ localStorage.removeItem(POMO_STORE_KEY); }catch(e){}
  syncPomoCancelToServer();
  if(getMyChatId()){ window.__forceSync = true; setTimeout(() => { window.__forceSync = false; }, 3000); }
  save(); applySettings(); renderAll(); closeModal();
  toast('🗑️ تم حذف كل البيانات');
}

/* ============================================================
   20) applySettings
============================================================ */
function applySettings(){
  document.documentElement.dataset.theme = state.settings.theme || 'light';
  const sideBtn = document.getElementById('themeBtn');
  if(sideBtn) sideBtn.textContent = state.settings.theme === 'dark' ? '☀️' : '🌙';
  const p = state.settings.pomo;
  const wEl = document.getElementById('setWork');
  const sEl = document.getElementById('setShort');
  const lEl = document.getElementById('setLong');
  if(wEl) wEl.value = p.work;
  if(sEl) sEl.value = p.short;
  if(lEl) lEl.value = p.long;
  const semEl = document.getElementById('setSemesterStart');
  if(semEl) semEl.value = state.settings.semesterStart || '';
  const weeksEl = document.getElementById('setSemesterWeeks');
  if(weeksEl) weeksEl.value = state.settings.semesterWeeks || 16;
  const sleepEl = document.getElementById('setSleepGoal');
  const waterEl = document.getElementById('setWaterGoal');
  if(sleepEl) sleepEl.value = state.wellness.sleepGoal || 8;
  if(waterEl) waterEl.value = state.wellness.waterGoal || 8;
  pomo.total = pomoDuration(pomo.mode);
  if(!pomo.running && (pomo.pausedRemaining === null)) pomo.pausedRemaining = pomo.total;
  pomoRender();
  if(typeof renderWeekBadge === 'function') renderWeekBadge();
}

/* ============================================================
   21) حالة المزامنة
============================================================ */
function renderSyncStatus(){
  const el = document.getElementById('syncStatusContent');
  if(!el) return;
  const chatId = getMyChatId();
  const lastSync = parseInt(localStorage.getItem('localModified') || '0');
  const lastSyncTime = lastSync ? new Date(lastSync) : null;
  let timeStr = '—';
  if(lastSyncTime){
    const diff = Math.round((Date.now() - lastSyncTime.getTime()) / 1000);
    if(diff < 60) timeStr = 'الآن';
    else if(diff < 3600) timeStr = `قبل ${Math.round(diff/60)} دقيقة`;
    else if(diff < 86400) timeStr = `قبل ${Math.round(diff/3600)} ساعة`;
    else timeStr = `قبل ${Math.round(diff/86400)} يوم`;
  }
  const openTasks = state.tasks.filter(t => !t.done).length;
  const upcomingExams = state.exams.filter(e => daysUntil(e.date) >= 0).length;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:${chatId ? 'var(--ok-bg)' : 'var(--warn-bg)'};border-radius:12px;margin-bottom:14px">
      <span style="font-size:24px">${chatId ? '✅' : '⚠️'}</span>
      <div>
        <b style="display:block;font-size:14.5px;color:${chatId ? 'var(--ok)' : 'var(--warn)'}">${chatId ? 'مربوط بـ تلقرام' : 'غير مربوط'}</b>
        <span style="font-size:12px;color:var(--muted);font-weight:600">${chatId ? 'آخر مزامنة: ' + timeStr : 'اربط من قسم تلقرام أدناه'}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
      <div style="background:var(--hover);padding:12px 8px;border-radius:10px"><div style="font-size:22px;font-weight:900;font-family:'Tajawal';color:var(--p)">${state.courses.length}</div><div style="font-size:11px;color:var(--muted);font-weight:700">مقرر</div></div>
      <div style="background:var(--hover);padding:12px 8px;border-radius:10px"><div style="font-size:22px;font-weight:900;font-family:'Tajawal';color:var(--warn)">${openTasks}</div><div style="font-size:11px;color:var(--muted);font-weight:700">مهمة متبقية</div></div>
      <div style="background:var(--hover);padding:12px 8px;border-radius:10px"><div style="font-size:22px;font-weight:900;font-family:'Tajawal';color:var(--danger)">${upcomingExams}</div><div style="font-size:11px;color:var(--muted);font-weight:700">اختبار قادم</div></div>
    </div>
    ${chatId ? `<button class="btn btn-ghost btn-block" style="margin-top:14px" onclick="doSync(false)">🔄 مزامنة الآن</button>` : ''}
  `;
}

/* ============================================================
   22) الإضافة السريعة
============================================================ */
function quickAdd(){
  openModal('إضافة سريعة', `
    <div style="display:grid;gap:10px">
      <button class="btn btn-primary btn-block" style="justify-content:center;padding:16px;font-size:15px;background:linear-gradient(135deg,#0d9488,#0891b2);box-shadow:0 8px 24px rgba(13,148,136,.35)" onclick="closeModal();openAiModal()">
        🤖 <span style="margin-inline-start:6px">إضافة بالذكاء الاصطناعي</span>
      </button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px" onclick="closeModal();openTaskForm()">📝 مهمة</button>
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px" onclick="closeModal();openExamForm()">⏰ اختبار</button>
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px" onclick="closeModal();openClassForm()">📅 محاضرة</button>
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px" onclick="closeModal();openCourseForm()">📚 مقرر</button>
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px;grid-column:1/-1" onclick="closeModal();openExpenseForm()">💸 مصروف جديد</button>
      </div>
    </div>
  `, `<button class="btn btn-ghost btn-block" onclick="closeModal()">إغلاق</button>`);
}

/* ============================================================
   🤖 الذكاء الاصطناعي
============================================================ */
let aiFileData = null;

function openAiModal(){
  aiFileData = null;
  openModal('🤖 إضافة بالذكاء الاصطناعي', `
    <div style="background:linear-gradient(135deg,#0d948820,#0891b220);padding:14px 16px;border-radius:14px;margin-bottom:16px;border:1px solid #0d948840">
      <div style="font-size:13.5px;line-height:1.8;font-weight:600;color:var(--text)">
        💡 <b>اكتب</b> أو <b>ارفع صورة</b> — AI يفهم ويسجّل تلقائياً
      </div>
      <div style="font-size:12px;color:var(--muted);font-weight:600;margin-top:6px;line-height:1.7">
        • "تغديت مع الشباب بـ 45 ريال"<br>
        • "اختبار تمريض البالغين نظري يوم الأحد 8 ص"<br>
        • "صورة التقويم الأكاديمي" 📸
      </div>
    </div>

    <div class="field" style="margin-bottom:14px">
      <label>📝 النص (اختياري إذا رفعت صورة)</label>
      <textarea id="aiText" placeholder="اكتب هنا بأي لهجة..." style="min-height:100px;resize:vertical"></textarea>
    </div>

    <div class="field" style="margin-bottom:14px">
      <label>📸 أو ارفع صورة (اختياري)</label>
      <input type="file" id="aiImage" accept="image/*" style="padding:10px;font-size:13px" onchange="aiImageSelected(this)">
      <div id="aiImagePreview" style="display:none;margin-top:10px;position:relative">
        <img id="aiImageThumb" style="width:100%;border-radius:12px;max-height:200px;object-fit:cover;border:2px solid var(--p)">
        <button onclick="aiRemoveImage()" style="position:absolute;top:6px;left:6px;background:var(--danger);color:#fff;width:30px;height:30px;border-radius:50%;font-size:16px;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 10px rgba(220,38,38,.4)">✕</button>
      </div>
    </div>

    <div id="aiLoading" style="display:none;text-align:center;padding:16px">
      <div style="display:inline-block;width:30px;height:30px;border:3px solid var(--p-light);border-top-color:var(--p);border-radius:50%;animation:spin 1s linear infinite"></div>
      <div style="font-size:13px;color:var(--muted);font-weight:700;margin-top:8px">جاري التحليل...</div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" id="aiSubmitBtn" onclick="submitAiInput()" style="background:linear-gradient(135deg,#0d9488,#0891b2)">✨ تحليل</button>
  `);
}

function aiImageSelected(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 5 * 1024 * 1024){
    toast('⚠️ الصورة كبيرة — الحد 5MB');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64Full = e.target.result;
    const base64 = base64Full.split(',')[1];
    aiFileData = { data: base64, mimeType: file.type };
    document.getElementById('aiImageThumb').src = base64Full;
    document.getElementById('aiImagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function aiRemoveImage(){
  aiFileData = null;
  const inp = document.getElementById('aiImage');
  if(inp) inp.value = '';
  const prev = document.getElementById('aiImagePreview');
  if(prev) prev.style.display = 'none';
}

async function submitAiInput(){
  const textEl = document.getElementById('aiText');
  const text = textEl ? textEl.value.trim() : '';

  if(!text && !aiFileData){
    toast('⚠️ اكتب نص أو ارفع صورة');
    return;
  }

  const btn = document.getElementById('aiSubmitBtn');
  const loader = document.getElementById('aiLoading');
  if(btn) btn.style.display = 'none';
  if(loader) loader.style.display = 'block';

  try{
    const res = await fetch(TG_WORKER + '/ai-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...authObj(),
        text,
        image: aiFileData,
        courses: state.courses.map(c => ({ id: c.id, name: c.name, code: c.code })),
        today: todayISO()
      })
    });

    const data = await res.json();

    if(!data.ok){
      throw new Error(data.error || 'فشل التحليل');
    }

    handleAiResult(data);

  }catch(e){
    console.error(e);
    if(btn) btn.style.display = 'block';
    if(loader) loader.style.display = 'none';
    toast('❌ فشل — ' + (e.message || 'حاول مرة ثانية'));
  }
}

function handleAiResult(result){
  closeModal();

  const action = result.action;
  const d = result.data || {};

  if(action === 'add_expense'){
    state.money.expenses.push({
      id: uid(),
      amount: +d.amount || 0,
      category: d.category || 'other',
      note: d.note || '',
      date: d.date || todayISO(),
      created: Date.now()
    });
    save();
    renderBalance(); renderExpenses(); renderDashboard();
    toast('💰 تم إضافة مصروف: ' + d.amount + ' ر.س');
    go('expenses');
    return;
  }

  if(action === 'add_exam'){
    state.exams.push({
      id: uid(),
      title: d.title || 'اختبار',
      courseId: getCourse(d.courseId) ? d.courseId : '',
      type: d.type || 'ميدتيرم',
      date: d.date || todayISO(),
      time: d.time || '',
      place: d.place || '',
      notes: 'أُضيف بواسطة AI 🤖'
    });
    save();
    renderAll(); renderDashboard();
    toast('⏰ تم إضافة اختبار: ' + (d.title || ''));
    go('tasks');
    return;
  }

  if(action === 'add_task'){
    state.tasks.push({
      id: uid(),
      title: d.title || 'مهمة',
      courseId: getCourse(d.courseId) ? d.courseId : '',
      type: d.type || 'واجب',
      due: d.due || todayISO(),
      priority: d.priority || 'med',
      notes: 'أُضيف بواسطة AI 🤖',
      done: false,
      created: todayISO()
    });
    save();
    renderAll(); renderDashboard();
    toast('📝 تم إضافة مهمة: ' + (d.title || ''));
    go('tasks');
    return;
  }

  if(action === 'setup_semester'){
    if(d.startDate) state.settings.semesterStart = d.startDate;
    if(d.weeks) state.settings.semesterWeeks = d.weeks;
    save();
    applySettings(); renderWeekBadge(); renderAcademicStrip();
    toast('📅 تم إعداد الفصل: ' + (d.weeks || 16) + ' أسبوع');
    go('schedule');
    return;
  }

  toast('🤖 ' + (result.message || 'ما فهمت — حاول بصيغة أوضح'));
}

document.getElementById('fab').addEventListener('click', quickAdd);

/* ============================================================
   23) الهامبرغر + الفلاتر
============================================================ */
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
});
document.getElementById('overlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
});
document.getElementById('taskFilters').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if(!chip) return;
  document.querySelectorAll('#taskFilters .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  taskFilter = chip.dataset.f;
  renderTasks();
});

/* ============================================================
   24) رندرة كل شيء
============================================================ */
function renderAll(){
  renderDashboard(); renderSchedule(); renderCourses(); renderTasks();
  renderGrades(); renderStudy(); pomoRender();
  renderBalance(); renderExpenses(); renderGoals();
  if(currentCourseId) renderCourseDetail();
}

/* ============================================================
   25) الإضافة السريعة للجدول
============================================================ */
let qaItems = [];
function openQuickAdd(){
  if(!state.courses.length){ toast('⚠️ أضف مقرراً أولاً'); go('courses'); return; }
  qaItems = [];
  openModal('⚡ إضافة سريعة للجدول', `
    <div style="background:var(--p-light);padding:12px 14px;border-radius:12px;font-size:13px;margin-bottom:16px;line-height:1.7">
      💡 اختر المقرر مرة واحدة، ثم أضف كل محاضراته بسرعة.
    </div>
    <div class="form-grid">
      <div class="field full"><label>المقرر <span class="req">*</span></label><select id="qaCourse">${courseOptions()}</select></div>
      <div class="field"><label>اليوم <span class="req">*</span></label><select id="qaDay">${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select></div>
      <div class="field"><label>القاعة</label><input id="qaRoom" placeholder="اختياري"></div>
      <div class="field"><label>من <span class="req">*</span></label><input type="time" id="qaStart" value="08:00"></div>
      <div class="field"><label>إلى <span class="req">*</span></label><input type="time" id="qaEnd" value="09:30"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="qaAdd()" style="margin-top:14px">➕ أضف واستمر</button>
    <div id="qaList" style="margin-top:16px"></div>
  `, `<button class="btn btn-ghost" onclick="qaClose()">إلغاء</button><button class="btn btn-primary" onclick="qaSave()">💾 حفظ الكل</button>`);
  qaRender();
}
function qaAdd(){
  const courseId = document.getElementById('qaCourse').value;
  const day = +document.getElementById('qaDay').value;
  const start = document.getElementById('qaStart').value;
  const end = document.getElementById('qaEnd').value;
  const room = document.getElementById('qaRoom').value.trim();
  if(!courseId){ toast('⚠️ اختر المقرر'); return; }
  if(!start || !end){ toast('⚠️ حدد الوقت'); return; }
  if(toMin(end) <= toMin(start)){ toast('⚠️ وقت النهاية بعد البداية'); return; }
  if(hasScheduleConflict(day, start, end, '', qaItems)){ toast('⚠️ يوجد تعارض في الوقت مع محاضرة أخرى في نفس اليوم'); return; }
  qaItems.push({ courseId, day, start, end, room });
  const dur = toMin(end) - toMin(start);
  const next = toMin(end);
  document.getElementById('qaStart').value = minToTime(next);
  document.getElementById('qaEnd').value = minToTime(next + dur);
  qaRender(); toast('✅ تمت الإضافة');
}
function qaRender(){
  const list = document.getElementById('qaList');
  if(!list) return;
  if(!qaItems.length){
    list.innerHTML = `<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px;background:var(--hover);border-radius:12px">لم تُضف أي محاضرة بعد</div>`;
    return;
  }
  list.innerHTML = `<div style="font-size:13px;font-weight:800;margin-bottom:8px">📋 المضاف (${qaItems.length})</div>` +
    qaItems.map((it,i) => `<div style="display:flex;align-items:center;gap:10px;padding:11px 13px;background:var(--hover);border-radius:11px;margin-bottom:6px">
      <div style="width:9px;height:9px;border-radius:50%;background:${courseColor(it.courseId)};flex-shrink:0"></div>
      <div style="flex:1;font-size:13px;line-height:1.5"><b>${esc(courseName(it.courseId))}</b>
        <div style="color:var(--muted);font-size:12px">${DAYS[it.day]} · ${to12(it.start)} - ${to12(it.end)}${it.room ? ' · ' + esc(it.room) : ''}</div></div>
      <button class="mini-btn del" onclick="qaRemove(${i})">✕</button></div>`).join('');
}
function qaRemove(i){ qaItems.splice(i,1); qaRender(); }
function qaSave(){
  if(!qaItems.length){ toast('⚠️ لم تُضف شي'); return; }
  qaItems.forEach(it => state.schedule.push({ id: uid(), ...it }));
  save();
  const n = qaItems.length;
  qaItems = [];
  closeModal(); renderAll();
  toast(`✅ تم حفظ ${n} محاضرة`);
}
async function qaClose(){
  if(qaItems.length){
    const ok = await appConfirm(`عندك ${qaItems.length} محاضرة لم تُحفظ. تبي تغلق؟`, {
      title: 'محاضرات غير محفوظة', emoji: '⚠️', okText: 'إغلاق', variant: 'warn'
    });
    if(!ok) return;
  }
  qaItems = []; closeModal();
}
(function injectQA(){
  const head = document.querySelector('#view-schedule .sec-head');
  if(!head || document.getElementById('qaBtn')) return;
  const existing = head.querySelector(':scope > button');
  const btn = document.createElement('button');
  btn.id = 'qaBtn'; btn.className = 'btn btn-ghost btn-sm';
  btn.innerHTML = '⚡ إضافة سريعة';
  btn.addEventListener('click', openQuickAdd);
  if(existing){
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    existing.parentNode.insertBefore(wrap, existing);
    wrap.appendChild(existing); wrap.appendChild(btn);
  }else{ head.appendChild(btn); }
})();

/* ============================================================
   26) تلقرام + المزامنة
============================================================ */
let pollTimer = null;
let syncTimeout = null;
let syncBadgeHideTimer = null;
function getMyChatId(){ return localStorage.getItem('tg_chat_id') || ''; }
function setMyChatId(id){ localStorage.setItem('tg_chat_id', id); }
function getMyToken(){ return localStorage.getItem('tg_token') || ''; }
function setMyToken(t){ if(t) localStorage.setItem('tg_token', t); }
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
// 🔧 MOD 1: أضف pomoActive للـ payload
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
      toast('⚠️ انتهى الربط — اربط تلقرام من جديد');
      return false;
    }
    if(saveRes.status === 409){
      showSyncBadge('error');
      toast('⛔ تم منع المزامنة: بياناتك المحلية فاضية والسحابة فيها بيانات');
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
    if(!silent) toast('✅ تمت المزامنة');
    renderSyncStatus();
  }catch(e){
    showSyncBadge('error');
    if(!silent) toast('⚠️ فشلت المزامنة');
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
      const local = state.attendance.find(a => a.classId === s.classId && a.date === s.date);
      if(!local){
        state.attendance.push({ id: uid(), classId: s.classId, date: s.date, status: s.status, note: s.note || '' });
        changed = true;
      } else {
        if(local.status !== s.status){ local.status = s.status; changed = true; }
        if(s.note && local.note !== s.note){ local.note = s.note; changed = true; }
      }
    }
    if(changed){
      save();
      if(typeof renderSchedule === 'function') renderSchedule();
      if(typeof renderAttendancePage === 'function') renderAttendancePage();
    }
  }catch(e){}
}
async function loadFromCloud(){
  if(!getMyChatId()) return;
  showSyncBadge('loading');
  try{
    const r = await fetch(TG_WORKER + '/load', { headers: authHeaders() });
    if(r.status === 401){
      showSyncBadge('error');
      toast('⚠️ انتهى الربط — اربط تلقرام من جديد');
      return;
    }
    const data = await r.json();
    if(!data || !data.lastSync){ await doSync(true); return; }
    const localModified = parseInt(localStorage.getItem('localModified') || '0');
    const cloudModified = new Date(data.lastSync).getTime();
    if(cloudModified > localModified){
      state.tasks = data.tasks || [];
      state.exams = data.exams || [];
      state.courses = data.courses || [];
      state.schedule = data.schedule || [];
      state.attendance = data.attendance || [];
      state.gpaCourses = data.gpaCourses || [];
      if(data.wellness) state.wellness = { ...defaultState().wellness, ...data.wellness, log: Array.isArray(data.wellness.log) ? data.wellness.log : [] };
      if(data.health) state.health = { ...defaultState().health, ...data.health, teethLog: Array.isArray(data.health.teethLog) ? data.health.teethLog : [] };
      if(data.money) state.money = { ...defaultState().money, ...data.money };
      if(data.archive) state.archive = data.archive;
      if(data.studyLog) state.studyLog = data.studyLog;
      if(data.settings) state.settings = { ...state.settings, ...data.settings, pomo: { ...state.settings.pomo, ...(data.settings.pomo || {}) } };
      localStorage.setItem('localModified', String(cloudModified));
      save(false); applySettings(); renderAll();
      if(typeof renderWeekBadge === 'function') renderWeekBadge();
      if(typeof renderSchedule === 'function') renderSchedule();
      if(typeof renderAcademicStrip === 'function') renderAcademicStrip();
      toast('✅ تم تحديث بياناتك من السحابة');
      showSyncBadge('success');
      renderSyncStatus();
    } else if(localModified > cloudModified){
      await doSync(true);
    } else {
      showSyncBadge('success');
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
  else if(status === 'success'){ icon.textContent = '✅'; text.textContent = 'الآن'; syncBadgeHideTimer = setTimeout(() => badge.classList.add('hidden'), 3000); }
  else if(status === 'error'){ badge.classList.add('error'); icon.textContent = '⚠️'; text.textContent = 'فشل'; syncBadgeHideTimer = setTimeout(() => badge.classList.add('hidden'), 5000); }
}
let autoSyncTimer = null;
async function checkCloudUpdates(){
  if(document.hidden) return;
  if(!getMyChatId()) return;
  const lastSync = parseInt(localStorage.getItem('localModified') || '0');
  if(Date.now() - lastSync < 3000) return;
  try{
    const r = await fetch(TG_WORKER + '/load', { headers: authHeaders() });
    const data = await r.json();
    if(!data || !data.lastSync) return;
    const cloudModified = new Date(data.lastSync).getTime();
    const lastChecked = parseInt(localStorage.getItem('lastCloudCheck') || '0');
    if(cloudModified > lastChecked){
      if(cloudModified > lastSync + 2000){
        state.tasks = data.tasks || [];
        state.exams = data.exams || [];
        state.courses = data.courses || [];
        state.schedule = data.schedule || [];
        state.attendance = data.attendance || [];
        state.gpaCourses = data.gpaCourses || [];
        if(data.wellness) state.wellness = { ...defaultState().wellness, ...data.wellness, log: Array.isArray(data.wellness.log) ? data.wellness.log : [] };
        if(data.health) state.health = { ...defaultState().health, ...data.health, teethLog: Array.isArray(data.health.teethLog) ? data.health.teethLog : [] };
        if(data.money) state.money = { ...defaultState().money, ...data.money };
        if(data.archive) state.archive = data.archive;
        if(data.studyLog) state.studyLog = data.studyLog;
        if(data.settings) state.settings = { ...state.settings, ...data.settings, pomo: { ...state.settings.pomo, ...(data.settings.pomo || {}) } };
        localStorage.setItem('localModified', String(cloudModified));
        localStorage.setItem('lastCloudCheck', String(cloudModified));
        try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
        applySettings(); renderAll();
        if(typeof renderWeekBadge === 'function') renderWeekBadge();
        if(typeof renderSchedule === 'function') renderSchedule();
        if(typeof renderAcademicStrip === 'function') renderAcademicStrip();
        renderSyncStatus();
        toast('🔄 تم تحديث البيانات من جهاز آخر');
        showSyncBadge('success');
      }
      localStorage.setItem('lastCloudCheck', String(cloudModified));
    }
  }catch(e){}
}
function startAutoSync(){
  if(autoSyncTimer) clearInterval(autoSyncTimer);
  // ✅ FIX 4b: 45000 → 180000 (3 minutes)
  autoSyncTimer = setInterval(() => {
    if(!document.hidden && getMyChatId()) checkCloudUpdates();
  }, 180000);
}
function stopAutoSync(){
  if(autoSyncTimer){ clearInterval(autoSyncTimer); autoSyncTimer = null; }
}

// ✅ FIX 4c: single visibilitychange listener — also pauses/resumes auto sync
document.addEventListener('visibilitychange', () => {
  if(document.hidden){ stopAutoSync(); return; }
  startAutoSync();
  pomoRender();
  renderDashHealth();
  renderTeeth();
  renderAcademicStrip();
  updateTgStatus();
  if(getMyChatId()){
    syncToTelegram(true);
    syncAttendanceFromServer();
    checkCloudUpdates();
  }
});
window.addEventListener('focus', () => {
  pomoRender();
  updateTgStatus();
  if(getMyChatId()) syncToTelegram(true);
});

setTimeout(() => {
  if(getMyChatId()){
    loadFromCloud().then(() => {
      renderSyncStatus();
      startAutoSync();
    });
  }
}, 1500);

async function testTelegram(){
  if(!getMyChatId()){ toast('⚠️ اربط أولاً'); return; }
  try{
    await fetch(TG_WORKER + '/test', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ ...authObj() }) });
    toast('✅ تحقق من تلقرام');
  }catch(e){ toast('⚠️ فشل'); }
}
function connectTelegram(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  localStorage.setItem('tg_pending', code);
  localStorage.setItem('tg_pending_time', Date.now().toString());
  startPoll(code);
  openModal('📱 ربط تلقرام', `
    <div style="text-align:center;padding:6px 0">
      <div style="font-size:14px;color:var(--muted);font-weight:700;margin-bottom:14px">
        انسخ الكود ثم أرسله للبوت
      </div>
      <div style="font-family:'Tajawal';font-size:42px;font-weight:900;letter-spacing:8px;color:var(--p);background:var(--p-light);padding:18px;border-radius:14px;margin-bottom:14px;user-select:all;-webkit-user-select:all">
        ${code}
      </div>
      <button class="btn btn-primary btn-block" onclick="navigator.clipboard.writeText('${code}');this.textContent='✅ تم النسخ';setTimeout(()=>this.textContent='📋 نسخ الكود',1500)" style="margin-bottom:16px">
        📋 نسخ الكود
      </button>
      <div style="background:var(--warn-bg);color:var(--warn);padding:12px;border-radius:11px;font-size:12.5px;font-weight:700;line-height:1.9;margin-bottom:14px;text-align:right">
        <b>⚠️ على iOS لا يعمل الربط التلقائي:</b><br>
        1. اضغط <b>📋 نسخ الكود</b> أعلاه<br>
        2. اضغط <b>📱 فتح تلقرام</b> تحت<br>
        3. اضغط <b>START</b><br>
        4. الصق الكود في حقل الكتابة وأرسله<br>
        5. ارجع للموقع — سيتم الربط تلقائياً
      </div>
      <div style="font-size:12px;color:var(--muted);font-weight:600">
        ⏱️ صلاحية الكود: 10 دقائق
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="window.location.href='https://t.me/${TG_BOT}?start=${code}'">📱 فتح تلقرام</button>
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
        await loadFromCloud();
        toast('🎉 تم الربط! جاري تحديث الصفحة...');
        setTimeout(() => location.reload(), 900);
      }
    }catch(e){}
  }, 1500);
}
async function unlinkTelegram(){
  const ok = await appConfirm('فك الربط بتلقرام؟ لن تصلك إشعارات حتى تربط مرة ثانية.', {
    title: 'فك الربط', emoji: '🔓', okText: 'فك', variant: 'warn'
  });
  if(!ok) return;
  const oldToken = getMyToken();
  localStorage.removeItem('tg_chat_id');
  localStorage.removeItem('tg_token');
  localStorage.removeItem('tg_pending');
  localStorage.removeItem('tg_pending_time');
  if(pollTimer) clearInterval(pollTimer);
  if(oldToken){
    try{ fetch(TG_WORKER + '/unlink', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token: oldToken }) }).catch(() => {}); }catch(e){}
  }
  syncPomoCancelToServer();
  toast('🔓 تم الفك');
  setTimeout(() => location.reload(), 600);
}
function updateTgStatus(){
  const el = document.getElementById('tgStatus');
  if(!el) return;
  const id = getMyChatId();
  const pending = localStorage.getItem('tg_pending');
  if(id){ el.innerHTML = '✅ <b>مربوط بنجاح</b>'; el.style.background = 'var(--ok-bg)'; el.style.color = 'var(--ok)'; }
  else if(pending){ el.innerHTML = '⏳ <b>اضغط START في تلقرام</b>'; el.style.background = 'var(--warn-bg)'; el.style.color = 'var(--warn)'; }
  else{ el.innerHTML = '⚠️ <b>غير مربوط</b>'; el.style.background = 'var(--hover)'; el.style.color = 'var(--muted)'; }
}
(function resumePending(){
  const pending = localStorage.getItem('tg_pending');
  const t = parseInt(localStorage.getItem('tg_pending_time') || '0');
  if(pending && Date.now() - t < 600000) startPoll(pending);
  else if(pending){ localStorage.removeItem('tg_pending'); localStorage.removeItem('tg_pending_time'); }
})();
(function initTGUI(){
  updateTgStatus();
  let ticks = 0;
  const t = setInterval(() => {
    const linked = !!getMyChatId();
    const pending = localStorage.getItem('tg_pending');
    const c = document.getElementById('tgConnectBtn');
    if(c){
      c.textContent = linked ? '🔄 إعادة ربط' : (pending ? '⏳ فتح تلقرام' : '🔗 ربط تلقرام');
      document.getElementById('tgUnlinkBtn').style.display = linked ? '' : 'none';
      document.getElementById('tgTestBtn').style.display = linked ? '' : 'none';
      const renewBtn = document.getElementById('tgRenewBtn');
      if(renewBtn) renewBtn.style.display = linked ? '' : 'none';
    }
    updateTgStatus();
    if(linked || ++ticks > 40) clearInterval(t);
  }, 1500);
})();

/* ============================================================
   27) الحضور والغياب
============================================================ */
function calcAttendance(){
  const MAX_PERCENT = 0.25;
  const res = {};
  const weeks = state.settings.semesterWeeks || 16;
  (state.courses || []).forEach(c => {
    const courseClasses = (state.schedule || []).filter(s => s.courseId === c.id);
    const daysPerWeek = courseClasses.length;
    const totalDays = daysPerWeek * weeks;
    const absentKeys = new Set();
    (state.attendance || []).forEach(a => {
      if(a.status !== 'absent' && a.status !== 'excused') return;
      const sch = courseClasses.find(s => s.id === a.classId);
      if(!sch) return;
      absentKeys.add(a.classId + '_' + a.date);
    });
    const absences = absentKeys.size;
    const lateKeys = new Set();
    (state.attendance || []).forEach(a => {
      if(a.status !== 'late') return;
      const sch = courseClasses.find(s => s.id === a.classId);
      if(!sch) return;
      lateKeys.add(a.classId + '_' + a.date);
    });
    const lates = lateKeys.size;
    const percent = totalDays > 0 ? (absences / totalDays) * 100 : 0;
    const maxAbsences = Math.floor(totalDays * MAX_PERCENT);
    res[c.id] = { course: c, total: totalDays, daysPerWeek, absences, lates, max: maxAbsences, percent, remaining: Math.max(0, maxAbsences - absences) };
  });
  return res;
}
function renderAttendancePage(){
  const el = document.getElementById('attendanceContent');
  if(!el) return;
  const data = calcAttendance();
  if(!state.courses.length){
    el.innerHTML = `<div class="empty"><div class="e-ico">📋</div><b>لا توجد مقررات</b><p>أضف مقرراتك أولاً</p></div>`;
    return;
  }
  const totalAbsences = Object.values(data).reduce((a, x) => a + x.absences, 0);
  el.innerHTML = `
    <div class="stats" style="margin-bottom:20px">
      <div class="stat"><div class="stat-ico" style="background:var(--danger-bg)">⚠️</div><div><b>${totalAbsences}</b><span>إجمالي أيام غيابك</span></div></div>
      <div class="stat"><div class="stat-ico" style="background:var(--p-light)">📅</div><div><b>${state.courses.length}</b><span>مقرر متابع</span></div></div>
      <div class="stat"><div class="stat-ico" style="background:var(--warn-bg)">🎯</div><div><b>25%</b><span>حد الحرمان</span></div></div>
    </div>
    <div style="background:var(--p-light);padding:12px 16px;border-radius:12px;margin-bottom:20px;font-size:13px;line-height:1.9;font-weight:600">
      💡 <b>طريقة الحساب:</b><br>• كل <b>يوم محاضرة</b> = غياب واحد<br>• النسبة = (الأيام اللي غبتها ÷ إجمالي أيام الفصل) × 100
    </div>
    <div style="display:grid;gap:14px">
      ${Object.values(data).map(d => {
        const used = d.percent;
        const color = used >= 18.75 ? 'var(--danger)' : used >= 12.5 ? 'var(--warn)' : 'var(--ok)';
        const bg = used >= 18.75 ? 'var(--danger-bg)' : used >= 12.5 ? 'var(--warn-bg)' : 'var(--ok-bg)';
        const emoji = used >= 18.75 ? '🚨' : used >= 12.5 ? '⚠️' : '✅';
        const barPercent = Math.min((used / 25) * 100, 100);
        return `<div class="card" style="padding:20px;border-right:4px solid ${color}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">
            <div><h3 style="font-size:17px;color:${d.course.color};margin-bottom:4px;cursor:pointer" onclick="openCourseDetail('${d.course.id}')">${esc(d.course.name)} →</h3>
              <span style="font-size:12.5px;color:var(--muted);font-weight:700">${d.daysPerWeek} يوم أسبوعياً · ${d.total} يوم في الفصل</span></div>
            <div style="background:${bg};color:${color};padding:10px 16px;border-radius:12px;text-align:center;min-width:90px">
              <b style="font-family:'Tajawal';font-size:22px;display:block;line-height:1">${d.percent.toFixed(2)}%</b>
              <span style="font-size:10.5px;font-weight:700">${emoji}</span>
            </div></div>
          <div class="prog" style="height:12px;margin-bottom:14px"><i style="width:${barPercent}%;background:${color}"></i></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:12.5px;font-weight:700;text-align:center">
            <div style="background:var(--hover);padding:8px;border-radius:9px"><div style="color:var(--muted);font-size:10.5px;margin-bottom:3px">أيام غيابك</div><div style="color:${color};font-size:15px;font-family:'Tajawal'">${d.absences}</div></div>
            <div style="background:var(--hover);padding:8px;border-radius:9px"><div style="color:var(--muted);font-size:10.5px;margin-bottom:3px">الحد (25%)</div><div style="color:var(--danger);font-size:15px;font-family:'Tajawal'">${d.max}</div></div>
            <div style="background:var(--hover);padding:8px;border-radius:9px"><div style="color:var(--muted);font-size:10.5px;margin-bottom:3px">متبقي</div><div style="color:var(--ok);font-size:15px;font-family:'Tajawal'">${d.remaining}</div></div>
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;font-weight:700;margin-top:12px">
            <span style="color:var(--warn)">⏰ تأخير: <b>${d.lates}</b></span>
            ${d.percent >= 18.75 ? `<span style="color:var(--danger)">🚨 اقتربت من الحرمان!</span>` : ''}
          </div></div>`;
      }).join('')}
    </div>`;
}

/* ============================================================
   28) النوم والماء
============================================================ */
function renderWellness(){
  const el = document.getElementById('wellnessContent');
  if(!el) return;
  try{
    const w = state.wellness;
    const today = todayISO();
    const todayLog = w.log.find(l => l.date === today) || { sleep:0, water:0 };
    const sleepPct = Math.min(100, Math.round((todayLog.sleep / w.sleepGoal) * 100));
    const waterPct = Math.min(100, Math.round((todayLog.water / w.waterGoal) * 100));
    const last7 = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = todayISO(d);
      const log = w.log.find(l => l.date === iso) || { sleep:0, water:0 };
      last7.push({ day: DAYS_SHORT[d.getDay()], ...log });
    }
    const maxSleep = Math.max(...last7.map(x => x.sleep), w.sleepGoal);
    const maxWater = Math.max(...last7.map(x => x.water), w.waterGoal);
    el.innerHTML = `
      <div class="grid g2" style="margin-bottom:16px">
        <div class="card" style="padding:22px">
          <div style="text-align:center;margin-bottom:16px"><div style="font-size:52px;line-height:1">😴</div><h3 style="font-size:19px;margin-top:8px">النوم</h3></div>
          <div style="text-align:center;margin-bottom:14px"><b style="font-family:'Tajawal';font-size:42px;color:var(--p)">${todayLog.sleep}</b><span style="font-size:15px;color:var(--muted)"> / ${w.sleepGoal} ساعات</span></div>
          <div class="prog" style="height:10px;margin-bottom:16px"><i style="width:${sleepPct}%"></i></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${[4,5,6,7,8,9,10].map(h => `<button class="btn btn-ghost btn-sm" style="flex:1;min-width:40px" onclick="addSleep(${h})">${h}h</button>`).join('')}</div>
        </div>
        <div class="card" style="padding:22px">
          <div style="text-align:center;margin-bottom:16px"><div style="font-size:52px;line-height:1">💧</div><h3 style="font-size:19px;margin-top:8px">الماء</h3></div>
          <div style="text-align:center;margin-bottom:14px"><b style="font-family:'Tajawal';font-size:42px;color:#0891b2">${todayLog.water}</b><span style="font-size:15px;color:var(--muted)"> / ${w.waterGoal} أكواب</span></div>
          <div class="prog" style="height:10px;margin-bottom:16px"><i style="width:${waterPct}%;background:#0891b2"></i></div>
          <div style="text-align:center"><button class="btn btn-primary btn-block" onclick="addWater()">🥤 + كوب</button><button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="resetWater()">↺ تصفير</button></div>
        </div>
      </div>
      <div class="card" style="padding:20px;margin-bottom:16px">
        <h3 style="font-size:16px;margin-bottom:14px">📊 آخر 7 أيام - النوم</h3>
        <div class="week-bars">${last7.map(d => `<div class="wbar"><span class="wbar-val">${d.sleep || ''}</span><div class="wbar-fill" style="height:${Math.max((d.sleep/maxSleep)*100, 3)}%"></div><span class="wbar-lbl">${d.day}</span></div>`).join('')}</div>
      </div>
      <div class="card" style="padding:20px">
        <h3 style="font-size:16px;margin-bottom:14px">📊 آخر 7 أيام - الماء</h3>
        <div class="week-bars">${last7.map(d => `<div class="wbar"><span class="wbar-val" style="color:#0891b2">${d.water || ''}</span><div class="wbar-fill" style="height:${Math.max((d.water/maxWater)*100, 3)}%;background:linear-gradient(180deg,#0891b2,#0e7490)"></div><span class="wbar-lbl">${d.day}</span></div>`).join('')}</div>
      </div>`;
  }catch(e){ el.innerHTML = '<div class="empty"><b>خطأ في العرض</b></div>'; }
}
function getOrCreateTodayWellness(){
  const today = todayISO();
  let log = state.wellness.log.find(l => l.date === today);
  if(!log){ log = { date: today, sleep: 0, water: 0 }; state.wellness.log.push(log); }
  return log;
}
function addSleep(h){ const log = getOrCreateTodayWellness(); log.sleep = h; save(); renderWellness(); renderDashHealth(); toast(`😴 سجّلت ${h} ساعات`); }
function addWater(){ const log = getOrCreateTodayWellness(); log.water += 1; save(); renderWellness(); renderDashHealth(); }
function resetWater(){ const log = getOrCreateTodayWellness(); log.water = 0; save(); renderWellness(); renderDashHealth(); }

/* ============================================================
   29) نظافة الأسنان
============================================================ */
function renderTeeth(){
  const today = todayISO();
  let log = state.health.teethLog.find(l => l.date === today);
  if(!log){ log = { date: today, morning: false, night: false }; }
  const mBtn = document.getElementById('teethMorningBtn');
  const nBtn = document.getElementById('teethNightBtn');
  if(mBtn){ mBtn.classList.toggle('done', log.morning); mBtn.innerHTML = `<span class="t-ico">🌅</span>تفريش الصباح${log.morning ? '<div style="font-size:11px;margin-top:6px">✓ تم</div>' : ''}`; }
  if(nBtn){ nBtn.classList.toggle('done', log.night); nBtn.innerHTML = `<span class="t-ico">🌙</span>تفريش الليل${log.night ? '<div style="font-size:11px;margin-top:6px">✓ تم</div>' : ''}`; }
  const statsEl = document.getElementById('teethStats');
  if(statsEl){
    const last7 = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = todayISO(d);
      const l = state.health.teethLog.find(x => x.date === iso) || { morning:false, night:false };
      const cnt = (l.morning?1:0) + (l.night?1:0);
      last7.push({ day: DAYS_SHORT[d.getDay()], count: cnt });
    }
    const maxC = 2;
    statsEl.innerHTML = `<div class="week-bars">${last7.map(d => `<div class="wbar"><span class="wbar-val">${d.count || ''}</span><div class="wbar-fill" style="height:${Math.max((d.count/maxC)*100, 3)}%"></div><span class="wbar-lbl">${d.day}</span></div>`).join('')}</div>`;
  }
}
function toggleTeeth(period){
  const today = todayISO();
  let log = state.health.teethLog.find(l => l.date === today);
  if(!log){ log = { date: today, morning: false, night: false }; state.health.teethLog.push(log); }
  log[period] = !log[period];
  save(); renderTeeth(); renderDashHealth();
  toast(log[period] ? '✅ تم التسجيل' : '↺ تم الإلغاء');
}

/* ============================================================
   30) الأرشيف
============================================================ */
function renderArchive(){
  const el = document.getElementById('archiveContent');
  if(!el) return;
  el.innerHTML = `
    <div class="card" style="padding:22px;margin-bottom:20px">
      <h3 style="font-size:17px;margin-bottom:8px">💾 أرشفة الفصل الحالي</h3>
      <p style="font-size:13.5px;color:var(--muted);margin-bottom:14px;line-height:1.7">بيحفظ نسخة كاملة من بياناتك الحالية.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input id="archiveName" placeholder="اسم الفصل" style="flex:2;min-width:180px;padding:11px;border-radius:11px;border:1.5px solid var(--border);background:var(--bg)">
        <button class="btn btn-primary" onclick="createArchive()">💾 أرشفة</button>
      </div>
    </div>
    ${state.archive.length ? `
      <h3 style="font-size:17px;margin-bottom:14px">📚 المؤرشفة (${state.archive.length})</h3>
      <div style="display:grid;gap:12px">
        ${state.archive.map((a, i) => `<div class="card" style="padding:18px;border-right:4px solid var(--p)">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div><h4 style="font-size:16.5px;margin-bottom:4px">${esc(a.name)}</h4>
              <span style="font-size:12.5px;color:var(--muted);font-weight:700">📅 ${new Date(a.created).toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'})}</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" onclick="viewArchive(${i})">👁️ عرض</button>
              <button class="btn btn-danger btn-sm" onclick="deleteArchive(${i})">🗑️</button>
            </div></div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:12.5px;color:var(--muted);font-weight:700">
            <span>📚 ${a.data.courses?.length || 0} مقرر</span>
            <span>📋 ${(a.data.tasks?.length || 0) + (a.data.exams?.length || 0)} مهمة واختبار</span>
          </div></div>`).join('')}
      </div>
    ` : `<div class="empty"><div class="e-ico">🗂️</div><b>لا يوجد أرشيف</b><p>أرشف الفصل الحالي</p></div>`}`;
}
function createArchive(){
  const name = document.getElementById('archiveName').value.trim();
  if(!name){ toast('⚠️ اكتب اسم الفصل'); return; }
  state.archive.push({
    id: uid(), name, created: new Date().toISOString(),
    data: JSON.parse(JSON.stringify({
      courses: state.courses || [], schedule: state.schedule || [],
      tasks: state.tasks || [], exams: state.exams || [],
      studyLog: state.studyLog || [], attendance: state.attendance || [],
      gpaCourses: state.gpaCourses || []
    }))
  });
  save(); renderArchive(); toast('✅ تمت الأرشفة');
}
function viewArchive(i){
  const a = state.archive[i]; if(!a) return;
  const d = a.data;
  openModal(`📚 ${a.name}`, `
    <div style="background:var(--hover);padding:14px;border-radius:12px;margin-bottom:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13.5px;font-weight:700">
        <div>📚 <b>${d.courses?.length || 0}</b> مقرر</div><div>📅 <b>${d.schedule?.length || 0}</b> محاضرة</div>
        <div>📝 <b>${d.tasks?.length || 0}</b> مهمة</div><div>⏰ <b>${d.exams?.length || 0}</b> اختبار</div>
      </div>
    </div>`, `<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button><button class="btn btn-primary" onclick="loadArchive(${i})">🔄 استعادة</button>`);
}
async function loadArchive(i){
  const a = state.archive[i]; if(!a) return;
  const ok = await appConfirm('سيتم استبدال البيانات الحالية ببيانات الأرشيف. متابعة؟', {
    title: 'استعادة الأرشيف', emoji: '🔄', okText: 'استعادة', variant: 'warn'
  });
  if(!ok) return;
  const d = JSON.parse(JSON.stringify(a.data || {}));
  state.courses = d.courses || []; state.schedule = d.schedule || [];
  state.tasks = d.tasks || []; state.exams = d.exams || [];
  state.studyLog = d.studyLog || []; state.attendance = d.attendance || [];
  state.gpaCourses = d.gpaCourses || [];
  currentCourseId = null;
  save(); closeModal(); renderAll(); renderAttendancePage(); renderArchive();
  toast('✅ تمت الاستعادة');
}
async function deleteArchive(i){
  const ok = await appConfirm('حذف هذا الأرشيف؟', {
    title: 'حذف الأرشيف', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  state.archive.splice(i, 1); save(); renderArchive(); toast('🗑️ تم');
}

/* ============================================================
   31) إضافة الصفحات الديناميكية
============================================================ */
(function addPages(){
  const content = document.querySelector('.content');
  if(!content) return;
  const pages = [
    { id:'attendance', ico:'📋', title:'الحضور والغياب', sub:'تتبع غياباتك وحد الحرمان' },
    { id:'wellness', ico:'😴', title:'النوم والماء', sub:'صحتك أولاً' },
    { id:'archive', ico:'🗂️', title:'أرشيف الفصول', sub:'سجل كل فصولك' }
  ];
  pages.forEach(p => {
    if(document.getElementById('view-' + p.id)) return;
    const sec = document.createElement('section');
    sec.className = 'view'; sec.id = 'view-' + p.id;
    sec.innerHTML = `<div class="sec-head"><div><h2>${p.ico} ${p.title}</h2><p>${p.sub}</p></div></div><div id="${p.id}Content"></div>`;
    content.appendChild(sec);
    VIEW_META[p.id] = [p.title, p.sub];
  });
})();

/* ============================================================
   32) بناء القائمة الجانبية
============================================================ */
(function rebuildNav(){
  const nav = document.querySelector('.nav');
  if(!nav) return;
  const homeBtn = nav.querySelector('.home-btn');
  const existing = {};
  nav.querySelectorAll('.nav-btn').forEach(b => { existing[b.dataset.view] = b; b.remove(); });
  const newBtn = (view, ico, label) => {
    if(existing[view]) { existing[view].innerHTML = `<span class="ico">${ico}</span> ${label}`; return existing[view]; }
    const b = document.createElement('button');
    b.className = 'nav-btn'; b.dataset.view = view;
    b.innerHTML = `<span class="ico">${ico}</span> ${label}`;
    return b;
  };
  const groups = [
    { title:'📚 الدراسة', items:[
      ['schedule','📅','الجدول الدراسي'],
      ['courses','📚','المقررات'],
      ['tasks','📋','المهام والاختبارات']
    ]},
    { title:'📊 الأداء الأكاديمي', items:[
      ['grades','🎓','المعدل والدرجات'],
      ['attendance','📋','الحضور والغياب'],
      ['archive','🗂️','أرشيف الفصول']
    ]},
    { title:'🚀 الإنتاجية', items:[
      ['study','🍅','مؤقّت المذاكرة'],
      ['wellness','😴','النوم والماء'],
      ['teeth','🦷','نظافة الأسنان']
    ]},
    { title:'💰 المصروف', items:[
      ['balance','💵','الرصيد'],
      ['expenses','📋','المصاريف'],
      ['goals','🎯','الأهداف']
    ]}
  ];
  nav.innerHTML = '';
  if(homeBtn) nav.appendChild(homeBtn);
  groups.forEach(g => {
    const group = document.createElement('div');
    group.className = 'nav-group collapsed';
    const title = document.createElement('div');
    title.className = 'nav-group-title';
    title.textContent = g.title;
    title.addEventListener('click', () => group.classList.toggle('collapsed'));
    group.appendChild(title);
    g.items.forEach(([v, ico, label]) => {
      const b = newBtn(v, ico, label);
      b.dataset.view = v;
      group.appendChild(b);
    });
    nav.appendChild(group);
  });
  const current = (location.hash.slice(1) || 'dashboard');
  const target = current === 'course-detail' ? 'courses' : current;
  nav.querySelectorAll('.nav-group').forEach(g => {
    if(g.querySelector(`[data-view="${target}"]`)) g.classList.remove('collapsed');
  });
})();

/* ============================================================
   33) تحسينات الموبايل
============================================================ */
(function fixMobile(){
  const sidebar = document.getElementById('sidebar');
  if(!sidebar) return;
  const mo = new MutationObserver(() => {
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
  });
  mo.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
  const setVH = () => document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', () => setTimeout(setVH, 200));
})();

/* ============================================================
   34) شارة الأسبوع
============================================================ */
function getSemesterWeek(){
  const start = state.settings.semesterStart;
  if(!start) return null;
  const startDate = new Date(start + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diffDays = Math.floor((today - startDate) / 86400000);
  if(diffDays < 0) return { week: 0, beforeStart: true, daysLeft: Math.abs(diffDays) };
  const weeks = state.settings.semesterWeeks || 16;
  const week = Math.floor(diffDays / 7) + 1;
  return { week: Math.min(week, weeks), remaining: Math.max(0, weeks - week), current: week <= weeks, past: week > weeks };
}
function renderWeekBadge(){
  const wb = document.getElementById('weekBadge');
  const wbDateBadge = document.getElementById('wbDateBadge');
  if(!wb) return;
  if(wbDateBadge){
    const today = new Date();
    wbDateBadge.textContent = today.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
  }
  const w = getSemesterWeek();
  if(!w){ wb.textContent = '📅 حدد بداية'; wb.className = 'week-badge'; return; }
  if(w.beforeStart){ wb.textContent = `⏳ باقي ${w.daysLeft} يوم`; wb.className = 'week-badge'; return; }
  if(w.past){ wb.textContent = `✅ انتهى الفصل`; wb.className = 'week-badge'; return; }
  wb.textContent = `📅 الأسبوع ${w.week}`;
  if(w.week >= 13) wb.className = 'week-badge danger';
  else if(w.week >= 10) wb.className = 'week-badge warn';
  else wb.className = 'week-badge';
  wb.title = `باقي ${w.remaining} أسبوع`;
}
function saveSemesterStart(){
  const val = document.getElementById('setSemesterStart').value;
  if(!val){ toast('⚠️ اختر التاريخ'); return; }
  state.settings.semesterStart = val;
  save(); applySettings(); renderWeekBadge();
  toast('✅ تم حفظ بداية الفصل');
}
function saveSemesterSettings(){
  const start = document.getElementById('setSemesterStart').value;
  const weeks = +document.getElementById('setSemesterWeeks').value || 16;
  if(!start){ toast('⚠️ اختر التاريخ'); return; }
  state.settings.semesterStart = start;
  state.settings.semesterWeeks = Math.max(8, Math.min(30, weeks));
  save(); applySettings(); renderWeekBadge(); renderAcademicStrip();
  toast('✅ تم حفظ إعدادات الفصل');
}

/* ============================================================
   35) اختصارات الكيبورد
============================================================ */
document.addEventListener('keydown', e => {
  if((e.ctrlKey || e.metaKey) && e.key === 'k'){ e.preventDefault(); quickAdd(); }
});

/* ============================================================
   37) تصدير/استيراد JSON
============================================================ */
function exportData(){
  try{
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      state: state
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uni-helper-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('✅ تم تصدير النسخة');
  }catch(e){
    console.error(e);
    toast('❌ فشل التصدير');
  }
}
async function importData(input){
  const file = input.files && input.files[0];
  if(!file) return;
  if(file.size > 5 * 1024 * 1024){
    toast('⚠️ الملف كبير — الحد 5MB');
    input.value = '';
    return;
  }
  const ok = await appConfirm('سيتم استبدال كل بياناتك الحالية بالبيانات المستوردة. متابعة؟', {
    title: 'استيراد نسخة', emoji: '📥', okText: 'استيراد', variant: 'warn'
  });
  if(!ok){ input.value = ''; return; }
  try{
    const text = await file.text();
    const parsed = JSON.parse(text);
    const newState = parsed.state || parsed;
    if(!newState || typeof newState !== 'object'){
      throw new Error('ملف غير صالح');
    }
    assertSafeImport(newState);
    const def = defaultState();
    state = { ...def, ...newState };
    state.settings = { ...def.settings, ...(newState.settings || {}) };
    state.settings.pomo = { ...def.settings.pomo, ...((newState.settings && newState.settings.pomo) || {}) };
    state.wellness = { ...def.wellness, ...(newState.wellness || {}) };
    state.health = { ...def.health, ...(newState.health || {}) };
    state.money = { ...def.money, ...(newState.money || {}) };
    ['courses','schedule','tasks','exams','studyLog','attendance','gpaCourses','archive'].forEach(k => {
      if(!Array.isArray(state[k])) state[k] = [];
    });
    if(!Array.isArray(state.wellness.log)) state.wellness.log = [];
    if(!Array.isArray(state.health.teethLog)) state.health.teethLog = [];
    if(!Array.isArray(state.money.expenses)) state.money.expenses = [];
    if(!Array.isArray(state.money.goals)) state.money.goals = [];
    save();
    applySettings();
    renderAll();
    renderAttendancePage();
    renderWellness();
    renderTeeth();
    renderArchive();
    renderSyncStatus();
    renderBalance();
    renderExpenses();
    renderGoals();
    renderWeekBadge();
    renderAcademicStrip();
    toast('✅ تم الاستيراد بنجاح');
    if(getMyChatId()) setTimeout(() => doSync(true), 300);
  }catch(e){
    console.error(e);
    toast('❌ فشل الاستيراد: ' + (e.message || 'ملف غير صالح'));
  }
  input.value = '';
}

/* ============================================================
   38) فحص الاتصال
============================================================ */
async function runHealthCheck(){
  const el = document.getElementById('healthCheckResult');
  if(!el) return;
  el.innerHTML = `<div style="text-align:center;padding:14px"><div style="display:inline-block;width:26px;height:26px;border:3px solid var(--p-light);border-top-color:var(--p);border-radius:50%;animation:spin 1s linear infinite"></div></div>`;
  const results = [];
  results.push({
    ok: navigator.onLine,
    warn: false,
    label: 'الاتصال بالإنترنت',
    detail: navigator.onLine ? 'متصل ✅' : 'غير متصل'
  });
  const chatId = getMyChatId();
  results.push({
    ok: !!chatId,
    warn: !chatId,
    label: 'ربط تلقرام',
    detail: chatId ? `مربوط (${chatId.slice(-4)})` : 'غير مربوط'
  });
  const token = getMyToken();
  results.push({
    ok: !!token,
    warn: chatId && !token,
    label: 'التوكن',
    detail: token ? `${token.slice(0,8)}...` : 'مفقود — يُنصح بإعادة الربط'
  });
  let serverOk = false;
  let serverTime = 0;
  if(chatId){
    try{
      const t0 = Date.now();
      const r = await fetch(TG_WORKER + '/load', { headers: authHeaders() });
      serverTime = Date.now() - t0;
      serverOk = r.ok;
    }catch(e){ serverOk = false; }
  }
  results.push({
    ok: serverOk,
    warn: !chatId,
    label: 'استجابة السيرفر',
    detail: serverOk ? `${serverTime}ms ✅` : (chatId ? 'فشل الاتصال' : 'غير مربوط')
  });
  const lastSync = parseInt(localStorage.getItem('localModified') || '0');
  const diff = lastSync ? Math.round((Date.now() - lastSync) / 1000) : -1;
  let syncStr = '—';
  if(diff < 0) syncStr = 'لم تتم بعد';
  else if(diff < 60) syncStr = 'الآن';
  else if(diff < 3600) syncStr = `قبل ${Math.round(diff/60)} دقيقة`;
  else if(diff < 86400) syncStr = `قبل ${Math.round(diff/3600)} ساعة`;
  else syncStr = `قبل ${Math.round(diff/86400)} يوم`;
  const syncOk = diff >= 0 && diff < 86400;
  results.push({
    ok: syncOk,
    warn: lastSync > 0 && !syncOk,
    label: 'آخر مزامنة',
    detail: syncStr
  });
  let sizeKB = 0;
  try{
    const raw = localStorage.getItem(STORE_KEY) || '';
    sizeKB = Math.round((raw.length * 2) / 1024);
  }catch(e){}
  results.push({
    ok: sizeKB < 500,
    warn: sizeKB >= 500,
    label: 'حجم البيانات',
    detail: `${sizeKB} KB`
  });
  results.push({
    ok: true,
    warn: false,
    label: 'ملخص البيانات',
    detail: `${state.courses.length} مقرر · ${state.tasks.length} مهمة · ${state.exams.length} اختبار · ${state.money.expenses.length} مصروف`
  });
  const rowsHTML = results.map(r => {
    const ico = r.ok ? '✅' : (r.warn ? '⚠️' : '❌');
    const color = r.ok ? 'var(--ok)' : (r.warn ? 'var(--warn)' : 'var(--danger)');
    const bg = r.ok ? 'var(--ok-bg)' : (r.warn ? 'var(--warn-bg)' : 'var(--danger-bg)');
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${bg};border-radius:10px;margin-bottom:6px">
      <span style="font-size:16px">${ico}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:${color}">${r.label}</div>
        <div style="font-size:11.5px;color:var(--muted);font-weight:600;word-break:break-word">${esc(r.detail)}</div>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = `<div style="display:grid;gap:4px">${rowsHTML}</div>`;
}

/* ============================================================
   39) حذف جزئي
============================================================ */
async function partialDelete(section){
  const labels = {
    studyLog: 'سجل المذاكرة',
    wellness: 'سجل النوم والماء',
    teeth: 'سجل تفريش الأسنان',
    attendance: 'سجل الحضور والغياب',
    expenses: 'المصاريف',
    archive: 'الأرشيف'
  };
  const label = labels[section] || section;
  const ok = await appConfirm(`سيتم حذف كل ${label} نهائياً. متابعة؟`, {
    title: `حذف ${label}`, emoji: '🗑️', okText: 'حذف', variant: 'danger'
  });
  if(!ok) return;
  if(section === 'studyLog') state.studyLog = [];
  else if(section === 'wellness') state.wellness.log = [];
  else if(section === 'teeth') state.health.teethLog = [];
  else if(section === 'attendance') state.attendance = [];
  else if(section === 'expenses') state.money.expenses = [];
  else if(section === 'archive') state.archive = [];
  save();
  renderStudy(); renderWellness(); renderTeeth();
  renderSchedule(); renderAttendancePage(); renderBalance(); renderExpenses(); renderArchive();
  renderDashboard(); renderDashHealth();
  renderSyncStatus();
  toast(`🗑️ تم حذف ${label}`);
}

/* ============================================================
   40) تجديد التوكن
============================================================ */
function renewToken(){
  if(!getMyChatId()){ toast('⚠️ اربط أولاً'); return; }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  localStorage.setItem('tg_pending', code);
  localStorage.setItem('tg_pending_time', Date.now().toString());
  startPoll(code);
  openModal('🔑 تجديد التوكن', `
    <div style="text-align:center;padding:6px 0">
      <div style="font-size:14px;color:var(--muted);font-weight:700;margin-bottom:14px">
        انسخ الكود ثم أرسله للبوت لتجديد الجلسة
      </div>
      <div style="font-family:'Tajawal';font-size:42px;font-weight:900;letter-spacing:8px;color:var(--p);background:var(--p-light);padding:18px;border-radius:14px;margin-bottom:14px;user-select:all;-webkit-user-select:all">
        ${code}
      </div>
      <button class="btn btn-primary btn-block" onclick="navigator.clipboard.writeText('${code}');this.textContent='✅ تم النسخ';setTimeout(()=>this.textContent='📋 نسخ الكود',1500)" style="margin-bottom:16px">
        📋 نسخ الكود
      </button>
      <div style="background:var(--warn-bg);color:var(--warn);padding:12px;border-radius:11px;font-size:12.5px;font-weight:700;line-height:1.9;margin-bottom:14px;text-align:right">
        <b>⚠️ على iOS:</b><br>
        1. اضغط <b>📋 نسخ الكود</b> أعلاه<br>
        2. اضغط <b>📱 فتح تلقرام</b> تحت<br>
        3. اضغط <b>START</b> ثم الصق الكود وأرسله<br>
        4. ارجع للموقع — سيتم التجديد تلقائياً
      </div>
      <div style="font-size:12px;color:var(--muted);font-weight:600">
        ⏱️ صلاحية الكود: 10 دقائق
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" onclick="window.location.href='https://t.me/${TG_BOT}?start=${code}'">📱 فتح تلقرام</button>
  `);
}

/* ============================================================
   41) أهداف الصحة
============================================================ */
function saveHealthGoals(){
  const sleepEl = document.getElementById('setSleepGoal');
  const waterEl = document.getElementById('setWaterGoal');
  const sleep = Math.max(1, Math.min(24, +sleepEl.value || 8));
  const water = Math.max(1, Math.min(30, +waterEl.value || 8));
  state.wellness.sleepGoal = sleep;
  state.wellness.waterGoal = water;
  save();
  renderWellness();
  renderDashHealth();
  toast('✅ تم حفظ الأهداف');
}

// 🔄 Migration مرة واحدة: يحوّل الإيداعات القديمة لسجل بتاريخ قديم
function migrateGoalsTx(){
  let changed = false;
  (state.money.goals || []).forEach(g => {
    if(!Array.isArray(g.txs)){
      if((g.saved || 0) > 0){
        g.txs = [{ ts: 1, amount: +g.saved }]; // تاريخ 1970 → ما يُحسب بأي دورة
      } else {
        g.txs = [];
      }
      changed = true;
    }
  });
  if(changed){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
  }
}

/* ============================================================
   36) التهيئة النهائية
============================================================ */
async function init(){
  migrateGoalsTx();
  await pomoResumeIfNeeded();
  applySettings();
  renderAll();
  const h = location.hash.slice(1);
  if(h && document.getElementById('view-' + h) && h !== 'course-detail') go(h);
  try{ renderAttendancePage(); }catch(e){}
  try{ renderWellness(); }catch(e){}
  try{ renderTeeth(); }catch(e){}
  try{ renderArchive(); }catch(e){}
  try{ renderSyncStatus(); }catch(e){}
  try{ renderBalance(); }catch(e){}
  try{ renderExpenses(); }catch(e){}
  try{ renderGoals(); }catch(e){}
  renderWeekBadge();
  acadSelectedWeek = currentAcademicWeek();
  renderAcademicStrip();
}
init();

/* ============================================================
   ✅ FIX 1: تسجيل Service Worker (PWA)
============================================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
