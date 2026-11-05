/* ============================================================================
   🎓 مُساعد الجامعة — state.js (الثوابت، إدارة الحالة، الترحيل، الدمج، والتقويم الأكاديمي)
   ============================================================================ */
window.__UNI_MODULES_LOADED__ = true;

/* ============================================================
   1) الثوابت
============================================================ */
const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const DAYS_SHORT = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const COLORS = ['#0d9488','#4f46e5','#db2777','#ea580c','#0891b2','#7c3aed','#059669','#d97706','#dc2626','#2563eb'];
const TASK_TYPES = ['واجب','كويز','مشروع','تقرير','عرض تقديمي','بحث','أخرى'];
const EXAM_TYPES = ['كويز','ميدتيرم','فاينل','اختبار عملي','مناقشة مشروع'];
const HOUR_START = 7, HOUR_END = 21, HOUR_H = 58;
const NUM_LOCALE = 'ar-EG-u-nu-latn';
const STORE_KEY = 'uni_helper_v1';
const PIN_STORE_KEY = 'uni_pin_code_v1';
const PIN_LOCKOUT_KEY = 'uni_pin_lockout_v1';
const PIN_PBKDF2_ITER = 120000;
const TOMBSTONE_TTL_MS = 30 * 86400 * 1000;
const ATT = {
  excused:  { label:'غايب بعذر',     ico:'🟡', color:'#d97706' },
  absent:   { label:'غايب بدون عذر', ico:'🔴', color:'#dc2626' },
  late:     { label:'متأخر',         ico:'⏰', color:'#7c3aed' },
  cancelled:{ label:'ملغي',          ico:'🚫', color:'#64748b' }
};
const GRADE_POINTS = { 'A+':5,'A':4.75,'B+':4.5,'B':4,'C+':3.5,'C':3,'D+':2.5,'D':2,'F':0 };
const GRADE_POINTS_4 = { 'A+':4,'A':3.75,'B+':3.5,'B':3,'C+':2.5,'C':2,'D+':1.5,'D':1,'F':0 };
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
const INCOME_SOURCES = [
  { id:'allowance', name:'مكافأة / مصروف', ico:'💵', color:'#059669' },
  { id:'transfer', name:'تحويل أهلي', ico:'🏦', color:'#0d9488' },
  { id:'freelance', name:'عمل حر / مشروع', ico:'💻', color:'#4f46e5' },
  { id:'reward', name:'مكافأة تفوق / حافز', ico:'🏆', color:'#f59e0b' },
  { id:'gift', name:'هدية / عيدية', ico:'🎁', color:'#db2777' },
  { id:'other', name:'إضافة أخرى', ico:'➕', color:'#0891b2' }
];

/* ============================================================
   2) إدارة الحالة (State Management)
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
      incomes: [],
      goals: []
    },
    settings: {
      theme:'light',
      pomo:{ work:25, short:5, long:15 },
      semesterStart: '2026-08-23',
      semesterWeeks: 16,
      customAcademicEvents: [],
      gpaScale: 5,
      absenceLimit: 25,
      defaultWeights: { hw: 20, quiz: 10, midterm: 30, final: 40 },
      lastExportAt: 0,
      onboardingDismissed: false,
      backupReminderDismissedAt: 0
    }
  };
}
function isAlive(it){
  return Boolean(it && typeof it === 'object' && it.deleted !== true);
}
function live(arr){
  return Array.isArray(arr) ? arr.filter(isAlive) : [];
}
function legacyDeterministicId(prefix, rawStr){
  const s = String(rawStr || '');
  let h1 = 2166136261 >>> 0;
  let h2 = 16777619 >>> 0;
  for(let i = 0; i < s.length; i++){
    const ch = s.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 ^= (ch + i);
    h2 = Math.imul(h2, 2166136261) >>> 0;
  }
  return `${prefix}_${h1.toString(36)}_${h2.toString(36)}`.slice(0, 48);
}
function migrateItem(it, keyField = 'id', prefix = 'item'){
  if(!it || typeof it !== 'object') return null;
  if(keyField === 'id'){
    const idRe = /^[A-Za-z0-9_-]{1,64}$/;
    if(!it.id || !idRe.test(String(it.id))){
      if(prefix === 'gpa'){
        it.id = legacyDeterministicId('gpa', `${it.name||''}_${it.credits||0}_${it.grade||''}`);
      } else if(prefix === 'att'){
        it.id = legacyDeterministicId('att', `${it.classId||''}_${it.date||''}`);
      } else {
        it.id = (Date.now().toString(36) + Math.random().toString(36).slice(2,7));
      }
    }
  }
  if(it.updatedAt == null || !Number.isFinite(+it.updatedAt) || +it.updatedAt < 0){
    it.updatedAt = 0;
  } else {
    it.updatedAt = Math.floor(+it.updatedAt);
  }
  if(it.deleted === true) it.deleted = true;
  else delete it.deleted;
  return it;
}
function touchItem(it){
  if(!it || typeof it !== 'object') return it;
  it.updatedAt = Date.now();
  delete it.deleted;
  return it;
}
function tombstoneItem(it){
  if(!it || typeof it !== 'object') return it;
  it.deleted = true;
  it.updatedAt = Date.now();
  return it;
}
function touchField(obj, fieldName, ts = Date.now()){
  if(!obj || typeof obj !== 'object') return;
  obj.updatedAt = ts;
  if(!obj._fieldTs || typeof obj._fieldTs !== 'object') obj._fieldTs = {};
  if(fieldName) obj._fieldTs[fieldName] = ts;
}
function purgeExpiredTombstonesInArray(arr, now = Date.now()){
  if(!Array.isArray(arr)) return [];
  return arr.filter(it => {
    if(!it || typeof it !== 'object') return false;
    if(it.deleted === true){
      const ts = Number(it.updatedAt) || 0;
      if(ts <= 0) return false;
      if(now - ts > TOMBSTONE_TTL_MS) return false;
    }
    return true;
  });
}
function normalizeAndMigrateState(s){
  const def = defaultState();
  const merged = { ...def, ...(s || {}) };
  merged.settings = { ...def.settings, ...((s && s.settings) || {}) };
  merged.settings.pomo = { ...def.settings.pomo, ...((s && s.settings && s.settings.pomo) || {}) };
  merged.settings.defaultWeights = { ...def.settings.defaultWeights, ...((s && s.settings && s.settings.defaultWeights) || {}) };
  merged.settings.gpaScale = (+merged.settings.gpaScale === 4) ? 4 : 5;
  merged.settings.absenceLimit = Math.max(5, Math.min(50, +merged.settings.absenceLimit || 25));
  merged.settings.lastExportAt = Math.max(0, Math.floor(+merged.settings.lastExportAt || 0));
  merged.settings.onboardingDismissed = Boolean(merged.settings.onboardingDismissed);
  merged.settings.backupReminderDismissedAt = Math.max(0, Math.floor(+merged.settings.backupReminderDismissedAt || 0));
  if(!Array.isArray(merged.settings.customAcademicEvents)) merged.settings.customAcademicEvents = [];
  merged.wellness = { ...def.wellness, ...((s && s.wellness) || {}) };
  if(!Array.isArray(merged.wellness.log)) merged.wellness.log = [];
  merged.health = { ...def.health, ...((s && s.health) || {}) };
  if(!Array.isArray(merged.health.teethLog)) merged.health.teethLog = [];
  merged.money = { ...def.money, ...((s && s.money) || {}) };
  if(!Array.isArray(merged.money.expenses)) merged.money.expenses = [];
  if(!Array.isArray(merged.money.incomes)) merged.money.incomes = [];
  if(!Array.isArray(merged.money.goals)) merged.money.goals = [];
  for(const k of ['courses','schedule','tasks','exams','studyLog','attendance','gpaCourses','archive']){
    if(!Array.isArray(merged[k])) merged[k] = [];
  }
  const now = Date.now();
  const listSpecs = [
    [merged, 'courses', 'id', 'crs'],
    [merged, 'schedule', 'id', 'sch'],
    [merged, 'tasks', 'id', 'tsk'],
    [merged, 'exams', 'id', 'exm'],
    [merged, 'studyLog', 'id', 'std'],
    [merged, 'attendance', 'id', 'att'],
    [merged, 'gpaCourses', 'id', 'gpa'],
    [merged, 'archive', 'id', 'arc'],
    [merged.money, 'expenses', 'id', 'exp'],
    [merged.money, 'incomes', 'id', 'inc'],
    [merged.money, 'goals', 'id', 'gol'],
    [merged.wellness, 'log', 'date', 'wlg'],
    [merged.health, 'teethLog', 'date', 'tlg']
  ];
  for(const [holder, key, keyField, prefix] of listSpecs){
    holder[key] = purgeExpiredTombstonesInArray(
      holder[key].map(it => migrateItem(it, keyField, prefix)).filter(Boolean),
      now
    );
  }
  for(const sub of [merged.settings, merged.money, merged.wellness, merged.health]){
    if(sub && typeof sub === 'object'){
      sub.updatedAt = Number.isFinite(+sub.updatedAt) && +sub.updatedAt > 0 ? Math.floor(+sub.updatedAt) : 0;
      if(!sub._fieldTs || typeof sub._fieldTs !== 'object') sub._fieldTs = {};
    }
  }
  return merged;
}
function mergeArrayById(localArr, cloudArr, keyField = 'id', prefix = 'item'){
  const now = Date.now();
  const a = Array.isArray(localArr) ? localArr : [];
  const b = Array.isArray(cloudArr) ? cloudArr : [];
  const map = new Map();
  const ingest = (rawIt) => {
    if(!rawIt || typeof rawIt !== 'object') return;
    const it = migrateItem({ ...rawIt }, keyField, prefix);
    if(!it) return;
    const k = String(it[keyField] || '').trim();
    if(!k) return;
    if(it.deleted === true){
      const ts = Number(it.updatedAt) || 0;
      if(ts <= 0 || (now - ts > TOMBSTONE_TTL_MS)) return;
    }
    const prev = map.get(k);
    if(!prev){
      map.set(k, it);
    } else {
      const prevTs = Number(prev.updatedAt) || 0;
      const curTs = Number(it.updatedAt) || 0;
      if(curTs > prevTs || (curTs === prevTs && it.deleted === true && prev.deleted !== true)){
        map.set(k, it);
      }
    }
  };
  for(const x of a) ingest(x);
  for(const x of b) ingest(x);
  let merged = Array.from(map.values());
  if(prefix === 'att'){
    const slotMap = new Map();
    for(const att of merged){
      const slotKey = (att.classId && att.date) ? `${att.classId}__${att.date}` : att.id;
      const prev = slotMap.get(slotKey);
      if(!prev){
        slotMap.set(slotKey, att);
      } else {
        const prevTs = Number(prev.updatedAt) || 0;
        const curTs = Number(att.updatedAt) || 0;
        if(curTs > prevTs || (curTs === prevTs && att.deleted === true && prev.deleted !== true)){
          slotMap.set(slotKey, att);
        }
      }
    }
    merged = Array.from(slotMap.values());
  }
  return purgeExpiredTombstonesInArray(merged, now);
}
function mergeObjectFieldWise(localObj, cloudObj, scalarKeys, defObj){
  const l = (localObj && typeof localObj === 'object') ? localObj : {};
  const c = (cloudObj && typeof cloudObj === 'object') ? cloudObj : {};
  const d = (defObj && typeof defObj === 'object') ? defObj : {};
  const lFieldTs = (l._fieldTs && typeof l._fieldTs === 'object') ? l._fieldTs : {};
  const cFieldTs = (c._fieldTs && typeof c._fieldTs === 'object') ? c._fieldTs : {};
  const lObjTs = Number(l.updatedAt) || 0;
  const cObjTs = Number(c.updatedAt) || 0;
  const out = { ...d, ...l };
  const outFieldTs = { ...lFieldTs };
  const hasLFieldTs = Object.keys(lFieldTs).length > 0;
  const hasCFieldTs = Object.keys(cFieldTs).length > 0;
  for(const k of scalarKeys){
    const lTs = Number(lFieldTs[k] !== undefined ? lFieldTs[k] : (hasLFieldTs ? 0 : lObjTs)) || 0;
    const cTs = Number(cFieldTs[k] !== undefined ? cFieldTs[k] : (hasCFieldTs ? 0 : cObjTs)) || 0;
    if(c[k] !== undefined){
      if(cTs > lTs){
        out[k] = JSON.parse(JSON.stringify(c[k]));
        if(cTs > 0) outFieldTs[k] = cTs;
      } else if(cTs === lTs && l[k] === undefined){
        out[k] = JSON.parse(JSON.stringify(c[k]));
      } else if(cTs === lTs && JSON.stringify(l[k]) === JSON.stringify(d[k]) && JSON.stringify(c[k]) !== JSON.stringify(d[k])){
        out[k] = JSON.parse(JSON.stringify(c[k]));
      }
    }
  }
  out.updatedAt = Math.max(lObjTs, cObjTs);
  out._fieldTs = outFieldTs;
  return out;
}
function mergeFullState(localState, cloudState){
  const def = defaultState();
  const l = normalizeAndMigrateState(localState);
  const c = normalizeAndMigrateState(cloudState);
  const merged = defaultState();
  merged.courses    = mergeArrayById(l.courses,    c.courses,    'id', 'crs');
  merged.schedule   = mergeArrayById(l.schedule,   c.schedule,   'id', 'sch');
  merged.tasks      = mergeArrayById(l.tasks,      c.tasks,      'id', 'tsk');
  merged.exams      = mergeArrayById(l.exams,      c.exams,      'id', 'exm');
  merged.studyLog   = mergeArrayById(l.studyLog,   c.studyLog,   'id', 'std');
  merged.attendance = mergeArrayById(l.attendance, c.attendance, 'id', 'att');
  merged.gpaCourses = mergeArrayById(l.gpaCourses, c.gpaCourses, 'id', 'gpa');
  merged.archive    = mergeArrayById(l.archive,    c.archive,    'id', 'arc');

  merged.money = mergeObjectFieldWise(l.money, c.money, ['salary', 'salaryExactDate'], def.money);
  merged.money.expenses = mergeArrayById(l.money.expenses, c.money.expenses, 'id', 'exp');
  merged.money.incomes  = mergeArrayById(l.money.incomes,  c.money.incomes,  'id', 'inc');
  merged.money.goals    = mergeArrayById(l.money.goals,    c.money.goals,    'id', 'gol');

  merged.wellness = mergeObjectFieldWise(l.wellness, c.wellness, ['sleepGoal', 'waterGoal'], def.wellness);
  merged.wellness.log = mergeArrayById(l.wellness.log, c.wellness.log, 'date', 'wlg');

  merged.health = mergeObjectFieldWise(l.health, c.health, [], def.health);
  merged.health.teethLog = mergeArrayById(l.health.teethLog, c.health.teethLog, 'date', 'tlg');

  merged.settings = mergeObjectFieldWise(
    l.settings,
    c.settings,
    ['theme', 'semesterStart', 'semesterWeeks', 'customAcademicEvents', 'gpaScale', 'absenceLimit', 'defaultWeights', 'lastExportAt', 'onboardingDismissed', 'backupReminderDismissedAt'],
    def.settings
  );
  merged.settings.pomo = mergeObjectFieldWise(
    l.settings.pomo,
    c.settings.pomo,
    ['work', 'short', 'long'],
    def.settings.pomo
  );
  return merged;
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultState();
    const s = JSON.parse(raw);
    return normalizeAndMigrateState(s);
  }catch(e){ return defaultState(); }
}
let state = loadState();
try{ Object.defineProperty(window, 'state', { get: () => state, set: v => { state = v; }, configurable: true }); }catch(_){}
let taskFilter = 'all';
let expenseFilter = 'all';
let currentCourseId = null;
let _stateEpoch = 0;

/* ============================================================
   3) دوال مساعدة وأدوات آمنة
============================================================ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

function copyTextSafe(text, btnEl){
  const doneUI = () => {
    if(btnEl){
      const orig = btnEl.dataset.origText || btnEl.textContent;
      btnEl.dataset.origText = orig;
      btnEl.textContent = '✅ تم النسخ';
      setTimeout(() => { btnEl.textContent = orig; }, 1600);
    } else {
      toast('📋 تم النسخ');
    }
  };
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(doneUI).catch(() => fallbackCopy(text, doneUI));
      return;
    }
  }catch(e){}
  fallbackCopy(text, doneUI);
}
function fallbackCopy(text, cb){
  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if(cb) cb();
  }catch(e){
    toast('⚠️ انسخ الكود يدوياً');
  }
}

const EXPECTED_STATE_KEYS = new Set([
  'courses','schedule','tasks','exams','studyLog','attendance','gpaCourses','archive',
  'wellness','health','money','settings'
]);
const ALLOWED_ENVELOPE_KEYS = new Set([
  ...EXPECTED_STATE_KEYS,
  'version','exportedAt','state','lastSync','pomoActive','chatId','ok','force','token','updatedAt','_fieldTs'
]);

function isPlainObject(v){
  return Boolean(v && typeof v === 'object' && !Array.isArray(v));
}

function cleanBoundedString(val, maxLen, fieldLabel){
  if(val === undefined || val === null) return '';
  if(typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean'){
    throw new Error(`قيمة نصية غير صالحة في الحقل "${fieldLabel}"`);
  }
  const str = String(val);
  if(str.length > 10000){
    throw new Error(`النص في الحقل "${fieldLabel}" يتجاوز الحد الأقصى المسموح`);
  }
  return str.slice(0, maxLen);
}

function normalizeDigits(val){
  return String(val ?? '')
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u066B\u060C]/g, '.');
}
function parseNum(val, fallback = 0){
  const s = normalizeDigits(val).trim();
  if(!s) return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function cleanFiniteNumber(val, defVal, fieldLabel, allowEmpty = false){
  if(val === undefined || val === null || (allowEmpty && val === '')){
    return allowEmpty ? '' : defVal;
  }
  if(typeof val === 'boolean' || Array.isArray(val) || typeof val === 'object'){
    throw new Error(`قيمة رقمية غير صالحة في الحقل "${fieldLabel}"`);
  }
  const norm = typeof val === 'string' ? normalizeDigits(val).trim() : val;
  if(allowEmpty && norm === '') return '';
  const n = Number(norm);
  if(!Number.isFinite(n)){
    throw new Error(`قيمة رقمية غير محدودة (NaN/Infinity) في الحقل "${fieldLabel}"`);
  }
  return n;
}

function sanitizeAndValidateSchema(rawInput, opts = {}){
  const MAX_ITEMS = 5000;
  const idRe = /^[A-Za-z0-9_-]{1,64}$/;
  const optIdRe = /^[A-Za-z0-9_-]{0,64}$/;
  const colorRe = /^[#A-Za-z0-9(),.%\s-]{0,64}$/;

  if(!isPlainObject(rawInput)){
    throw new Error('ملف غير صالح — البيانات ليست كائناً صالحاً');
  }
  const s = isPlainObject(rawInput.state) ? rawInput.state : rawInput;
  if(!isPlainObject(s)){
    throw new Error('بنية البيانات الداخلية غير صالحة');
  }

  // التحقق من وجود مفتاح واحد على الأقل من مفاتيح الحالة المتوقعة
  const inputKeys = Object.keys(s);
  const hasKnownKey = inputKeys.some(k => EXPECTED_STATE_KEYS.has(k) || k === 'lastSync');
  if(!opts.allowEmpty && (inputKeys.length === 0 || !hasKnownKey)){
    throw new Error('الملف لا يحتوي على مفاتيح بيانات التطبيق المتوقعة');
  }

  // التحقق من أن الحقول الكائنية ليست مصفوفات أو قيماً بدائية خاطئة
  for(const objKey of ['money','wellness','health','settings']){
    if(s[objKey] !== undefined && s[objKey] !== null && !isPlainObject(s[objKey])){
      throw new Error(`الحقل "${objKey}" يجب أن يكون كائناً`);
    }
  }

  const m = isPlainObject(s.money) ? s.money : {};
  const w = isPlainObject(s.wellness) ? s.wellness : {};
  const h = isPlainObject(s.health) ? s.health : {};
  const st = isPlainObject(s.settings) ? s.settings : {};

  const arrayChecks = [
    ['courses', s.courses],
    ['schedule', s.schedule],
    ['tasks', s.tasks],
    ['exams', s.exams],
    ['studyLog', s.studyLog],
    ['attendance', s.attendance],
    ['gpaCourses', s.gpaCourses],
    ['archive', s.archive],
    ['money.expenses', m.expenses],
    ['money.incomes', m.incomes],
    ['money.goals', m.goals],
    ['wellness.log', w.log],
    ['health.teethLog', h.teethLog],
    ['settings.customAcademicEvents', st.customAcademicEvents]
  ];

  for(const [name, arr] of arrayChecks){
    if(arr === undefined || arr === null) continue;
    if(!Array.isArray(arr)){
      throw new Error(`الحقل "${name}" يجب أن يكون مصفوفة`);
    }
    if(arr.length > MAX_ITEMS){
      throw new Error(`الملف يحتوي ${arr.length} عنصر في "${name}" — الحد ${MAX_ITEMS}`);
    }
    for(const it of arr){
      if(!isPlainObject(it)){
        throw new Error(`عنصر غير صالح في المصفوفة "${name}"`);
      }
      if(it.id !== undefined && it.id !== null && String(it.id) !== ''){
        if(!idRe.test(String(it.id))) throw new Error(`الملف يحتوي معرّفات غير آمنة في "${name}"`);
      }
      for(const fk of ['courseId','classId']){
        if(it[fk] !== undefined && it[fk] !== null && String(it[fk]) !== ''){
          if(!optIdRe.test(String(it[fk]))) throw new Error(`الملف يحتوي معرّفات فرعية غير آمنة في "${name}.${fk}"`);
        }
      }
      if(it.color !== undefined && it.color !== null){
        if(!colorRe.test(String(it.color))) throw new Error(`الملف يحتوي ألوان غير آمنة في "${name}"`);
      }
    }
  }

  const cleanMetaFields = (it) => {
    const meta = {};
    if(it.updatedAt !== undefined && it.updatedAt !== null){
      meta.updatedAt = Math.max(0, Math.floor(cleanFiniteNumber(it.updatedAt, 0, 'updatedAt')));
    }
    if(it.deleted === true) meta.deleted = true;
    return meta;
  };

  const def = defaultState();
  const out = defaultState();

  // 1) courses
  if(Array.isArray(s.courses)){
    out.courses = s.courses.map(it => {
      const c = {
        ...(it.id ? { id: String(it.id) } : {}),
        name: cleanBoundedString(it.name, 200, 'courses.name'),
        code: cleanBoundedString(it.code, 60, 'courses.code'),
        credits: cleanFiniteNumber(it.credits, 3, 'courses.credits'),
        teacher: cleanBoundedString(it.teacher, 200, 'courses.teacher'),
        color: it.color ? cleanBoundedString(it.color, 64, 'courses.color') : COLORS[0],
        grades: Array.isArray(it.grades) ? it.grades.slice(0, 100).map(g => {
          if(!isPlainObject(g)) throw new Error('مكوّن درجات غير صالح');
          return {
            name: cleanBoundedString(g.name, 150, 'grades.name'),
            weight: cleanFiniteNumber(g.weight, 0, 'grades.weight'),
            score: cleanFiniteNumber(g.score, '', 'grades.score', true)
          };
        }) : [],
        ...cleanMetaFields(it)
      };
      if(it.manualLetter && GRADE_OPTIONS.includes(String(it.manualLetter))){
        c.manualLetter = String(it.manualLetter);
      }
      return c;
    });
  }

  // 2) schedule
  if(Array.isArray(s.schedule)){
    out.schedule = s.schedule.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      courseId: cleanBoundedString(it.courseId, 64, 'schedule.courseId'),
      day: cleanFiniteNumber(it.day, 0, 'schedule.day'),
      start: cleanBoundedString(it.start || '08:00', 20, 'schedule.start'),
      end: cleanBoundedString(it.end || '09:00', 20, 'schedule.end'),
      room: cleanBoundedString(it.room, 120, 'schedule.room'),
      ...cleanMetaFields(it)
    }));
  }

  // 3) tasks
  if(Array.isArray(s.tasks)){
    out.tasks = s.tasks.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      title: cleanBoundedString(it.title, 300, 'tasks.title'),
      courseId: cleanBoundedString(it.courseId, 64, 'tasks.courseId'),
      type: cleanBoundedString(it.type || 'واجب', 60, 'tasks.type'),
      due: cleanBoundedString(it.due, 30, 'tasks.due'),
      priority: ['high','med','low'].includes(it.priority) ? it.priority : 'med',
      notes: cleanBoundedString(it.notes, 4000, 'tasks.notes'),
      done: Boolean(it.done),
      created: cleanBoundedString(it.created, 40, 'tasks.created'),
      ...cleanMetaFields(it)
    }));
  }

  // 4) exams
  if(Array.isArray(s.exams)){
    out.exams = s.exams.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      title: cleanBoundedString(it.title, 300, 'exams.title'),
      courseId: cleanBoundedString(it.courseId, 64, 'exams.courseId'),
      type: cleanBoundedString(it.type || 'ميدتيرم', 60, 'exams.type'),
      date: cleanBoundedString(it.date, 30, 'exams.date'),
      time: cleanBoundedString(it.time, 20, 'exams.time'),
      place: cleanBoundedString(it.place, 200, 'exams.place'),
      notes: cleanBoundedString(it.notes, 4000, 'exams.notes'),
      done: Boolean(it.done),
      ...cleanMetaFields(it)
    }));
  }

  // 5) studyLog
  if(Array.isArray(s.studyLog)){
    out.studyLog = s.studyLog.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      date: cleanBoundedString(it.date, 30, 'studyLog.date'),
      courseId: cleanBoundedString(it.courseId, 64, 'studyLog.courseId'),
      minutes: cleanFiniteNumber(it.minutes, 0, 'studyLog.minutes'),
      ...cleanMetaFields(it)
    }));
  }

  // 6) attendance
  if(Array.isArray(s.attendance)){
    out.attendance = s.attendance.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      classId: cleanBoundedString(it.classId, 64, 'attendance.classId'),
      date: cleanBoundedString(it.date, 30, 'attendance.date'),
      status: ['present','absent','excused','late','cancelled'].includes(it.status) ? it.status : 'absent',
      note: cleanBoundedString(it.note, 1000, 'attendance.note'),
      ...cleanMetaFields(it)
    }));
  }

  // 7) gpaCourses
  if(Array.isArray(s.gpaCourses)){
    out.gpaCourses = s.gpaCourses.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      name: cleanBoundedString(it.name, 200, 'gpaCourses.name'),
      credits: cleanFiniteNumber(it.credits, 3, 'gpaCourses.credits'),
      grade: GRADE_OPTIONS.includes(String(it.grade)) ? String(it.grade) : 'A+',
      ...cleanMetaFields(it)
    }));
  }

  // 8) archive
  if(Array.isArray(s.archive)){
    out.archive = s.archive.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      name: cleanBoundedString(it.name, 200, 'archive.name'),
      created: cleanBoundedString(it.created, 60, 'archive.created'),
      data: isPlainObject(it.data) ? it.data : {},
      ...cleanMetaFields(it)
    }));
  }

  // 9) money
  out.money = {
    salary: cleanFiniteNumber(m.salary, 0, 'money.salary'),
    salaryExactDate: m.salaryExactDate ? cleanBoundedString(m.salaryExactDate, 30, 'money.salaryExactDate') : null,
    expenses: Array.isArray(m.expenses) ? m.expenses.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      amount: cleanFiniteNumber(it.amount, 0, 'expenses.amount'),
      category: cleanBoundedString(it.category || 'other', 60, 'expenses.category'),
      note: cleanBoundedString(it.note, 500, 'expenses.note'),
      date: cleanBoundedString(it.date, 30, 'expenses.date'),
      created: it.created !== undefined ? cleanFiniteNumber(it.created, 0, 'expenses.created') : 0,
      ...cleanMetaFields(it)
    })) : [],
    incomes: Array.isArray(m.incomes) ? m.incomes.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      amount: cleanFiniteNumber(it.amount, 0, 'incomes.amount'),
      source: cleanBoundedString(it.source || 'other', 60, 'incomes.source'),
      note: cleanBoundedString(it.note, 500, 'incomes.note'),
      date: cleanBoundedString(it.date, 30, 'incomes.date'),
      created: it.created !== undefined ? cleanFiniteNumber(it.created, 0, 'incomes.created') : 0,
      ...cleanMetaFields(it)
    })) : [],
    goals: Array.isArray(m.goals) ? m.goals.map(it => ({
      ...(it.id ? { id: String(it.id) } : {}),
      name: cleanBoundedString(it.name, 200, 'goals.name'),
      target: cleanFiniteNumber(it.target, 0, 'goals.target'),
      saved: cleanFiniteNumber(it.saved, 0, 'goals.saved'),
      emoji: cleanBoundedString(it.emoji || '🎯', 16, 'goals.emoji'),
      created: it.created !== undefined ? cleanFiniteNumber(it.created, 0, 'goals.created') : 0,
      txs: Array.isArray(it.txs) ? it.txs.slice(0, 2000).map(tx => ({
        ts: cleanFiniteNumber(tx?.ts, 0, 'goals.txs.ts'),
        amount: cleanFiniteNumber(tx?.amount, 0, 'goals.txs.amount')
      })) : undefined,
      ...cleanMetaFields(it)
    })) : [],
    updatedAt: m.updatedAt !== undefined ? cleanFiniteNumber(m.updatedAt, 0, 'money.updatedAt') : 0,
    _fieldTs: isPlainObject(m._fieldTs) ? m._fieldTs : {}
  };

  // 10) wellness
  out.wellness = {
    sleepGoal: cleanFiniteNumber(w.sleepGoal, 8, 'wellness.sleepGoal'),
    waterGoal: cleanFiniteNumber(w.waterGoal, 8, 'wellness.waterGoal'),
    log: Array.isArray(w.log) ? w.log.map(it => ({
      date: cleanBoundedString(it.date, 30, 'wellness.log.date'),
      sleep: cleanFiniteNumber(it.sleep, 0, 'wellness.log.sleep'),
      water: cleanFiniteNumber(it.water, 0, 'wellness.log.water'),
      ...cleanMetaFields(it)
    })) : [],
    updatedAt: w.updatedAt !== undefined ? cleanFiniteNumber(w.updatedAt, 0, 'wellness.updatedAt') : 0,
    _fieldTs: isPlainObject(w._fieldTs) ? w._fieldTs : {}
  };

  // 11) health
  out.health = {
    teethLog: Array.isArray(h.teethLog) ? h.teethLog.map(it => ({
      date: cleanBoundedString(it.date, 30, 'health.teethLog.date'),
      morning: Boolean(it.morning),
      night: Boolean(it.night),
      ...cleanMetaFields(it)
    })) : [],
    updatedAt: h.updatedAt !== undefined ? cleanFiniteNumber(h.updatedAt, 0, 'health.updatedAt') : 0,
    _fieldTs: isPlainObject(h._fieldTs) ? h._fieldTs : {}
  };

  // 12) settings
  const pm = isPlainObject(st.pomo) ? st.pomo : {};
  const dw = isPlainObject(st.defaultWeights) ? st.defaultWeights : {};
  out.settings = {
    theme: st.theme === 'dark' ? 'dark' : 'light',
    pomo: {
      work: cleanFiniteNumber(pm.work, def.settings.pomo.work, 'settings.pomo.work'),
      short: cleanFiniteNumber(pm.short, def.settings.pomo.short, 'settings.pomo.short'),
      long: cleanFiniteNumber(pm.long, def.settings.pomo.long, 'settings.pomo.long'),
      updatedAt: pm.updatedAt !== undefined ? cleanFiniteNumber(pm.updatedAt, 0, 'settings.pomo.updatedAt') : 0,
      _fieldTs: isPlainObject(pm._fieldTs) ? pm._fieldTs : {}
    },
    semesterStart: cleanBoundedString(st.semesterStart || def.settings.semesterStart, 30, 'settings.semesterStart'),
    semesterWeeks: cleanFiniteNumber(st.semesterWeeks, def.settings.semesterWeeks, 'settings.semesterWeeks'),
    customAcademicEvents: Array.isArray(st.customAcademicEvents) ? st.customAcademicEvents.map(ev => {
      const date = cleanBoundedString(ev.date, 30, 'customAcademicEvents.date');
      const rawEnd = (ev.endDate !== undefined && ev.endDate !== null) ? String(ev.endDate).trim() : '';
      let endDate = '';
      if(rawEnd){
        endDate = cleanBoundedString(rawEnd, 30, 'customAcademicEvents.endDate');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || (date && endDate < date)){
          endDate = '';
        }
      }
      return {
        date,
        endDate: endDate || undefined,
        title: cleanBoundedString(ev.title, 200, 'customAcademicEvents.title'),
        type: ['info','holiday','exam'].includes(ev.type) ? ev.type : 'info',
        ico: cleanBoundedString(ev.ico || '📌', 16, 'customAcademicEvents.ico')
      };
    }) : [],
    gpaScale: (+st.gpaScale === 4) ? 4 : 5,
    absenceLimit: Math.max(5, Math.min(50, cleanFiniteNumber(st.absenceLimit, def.settings.absenceLimit, 'settings.absenceLimit'))),
    defaultWeights: {
      hw: Math.max(0, Math.min(100, cleanFiniteNumber(dw.hw, def.settings.defaultWeights.hw, 'settings.defaultWeights.hw'))),
      quiz: Math.max(0, Math.min(100, cleanFiniteNumber(dw.quiz, def.settings.defaultWeights.quiz, 'settings.defaultWeights.quiz'))),
      midterm: Math.max(0, Math.min(100, cleanFiniteNumber(dw.midterm, def.settings.defaultWeights.midterm, 'settings.defaultWeights.midterm'))),
      final: Math.max(0, Math.min(100, cleanFiniteNumber(dw.final, def.settings.defaultWeights.final, 'settings.defaultWeights.final')))
    },
    lastExportAt: st.lastExportAt !== undefined ? Math.max(0, cleanFiniteNumber(st.lastExportAt, 0, 'settings.lastExportAt')) : 0,
    onboardingDismissed: Boolean(st.onboardingDismissed),
    backupReminderDismissedAt: st.backupReminderDismissedAt !== undefined ? Math.max(0, cleanFiniteNumber(st.backupReminderDismissedAt, 0, 'settings.backupReminderDismissedAt')) : 0,
    updatedAt: st.updatedAt !== undefined ? cleanFiniteNumber(st.updatedAt, 0, 'settings.updatedAt') : 0,
    _fieldTs: isPlainObject(st._fieldTs) ? st._fieldTs : {}
  };

  return normalizeAndMigrateState(out);
}

function assertSafeImport(s){
  return sanitizeAndValidateSchema(s);
}
function fixUnsafeIds(){
  const idRe = /^[A-Za-z0-9_-]{0,64}$/;
  let changed = false;
  for(const arr of [state.tasks, state.exams, state.schedule, state.studyLog]){
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
function getGpaScale(){
  return (+state?.settings?.gpaScale === 4) ? 4 : 5;
}
function getAbsenceLimitPercent(){
  const n = Number(state?.settings?.absenceLimit);
  return (Number.isFinite(n) && n >= 5 && n <= 50) ? n : 25;
}
function getDefaultGradeWeights(){
  const dw = state?.settings?.defaultWeights;
  return {
    hw: Number.isFinite(+dw?.hw) ? +dw.hw : 20,
    quiz: Number.isFinite(+dw?.quiz) ? +dw.quiz : 10,
    midterm: Number.isFinite(+dw?.midterm) ? +dw.midterm : 30,
    final: Number.isFinite(+dw?.final) ? +dw.final : 40
  };
}
function fmtDate(iso){
  if(!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(NUM_LOCALE, { day:'numeric', month:'long' });
}
function fmtDateRange(startIso, endIso){
  if(!startIso) return '—';
  if(!endIso || endIso === startIso) return fmtDate(startIso);
  const d1 = new Date(startIso + 'T00:00:00');
  const d2 = new Date(endIso + 'T00:00:00');
  if(isNaN(d1.getTime()) || isNaN(d2.getTime())) return fmtDate(startIso);
  const sameYear = d1.getFullYear() === d2.getFullYear();
  const sameMonth = sameYear && d1.getMonth() === d2.getMonth();
  if(sameMonth){
    const d1Num = d1.toLocaleDateString(NUM_LOCALE, { day: 'numeric' });
    const d2Str = d2.toLocaleDateString(NUM_LOCALE, { day: 'numeric', month: 'long' });
    return `${d1Num} - ${d2Str}`;
  }
  const d1Str = d1.toLocaleDateString(NUM_LOCALE, { day: 'numeric', month: 'long' });
  const d2Str = d2.toLocaleDateString(NUM_LOCALE, { day: 'numeric', month: 'long' });
  return `${d1Str} - ${d2Str}`;
}
function fmtMoney(n){ return parseNum(n, 0).toLocaleString(NUM_LOCALE, { maximumFractionDigits: 2 }); }
function getCourse(id){ return state.courses.find(c => !c.deleted && c.id === id); }
function courseName(id){ const c = getCourse(id); return c ? c.name : 'عام'; }
function courseColor(id){ const c = getCourse(id); return c ? c.color : '#64748b'; }
function getCatById(id){ return EXPENSE_CATS.find(c => c.id === id) || EXPENSE_CATS[EXPENSE_CATS.length-1]; }
function getIncomeSrcById(id){ return INCOME_SOURCES.find(s => s.id === id) || INCOME_SOURCES[INCOME_SOURCES.length-1]; }
function toast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('show'), 2800);
}
function toMin(t){ const [h,m] = String(t||'00:00').split(':').map(Number); return (h||0)*60 + (m||0); }
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
  const now = Date.now();
  const cutoff = todayISO(new Date(now - 365*86400000));
  for(const k of ['courses','schedule','tasks','exams','studyLog','attendance','gpaCourses','archive']){
    if(Array.isArray(state[k])) state[k] = purgeExpiredTombstonesInArray(state[k], now);
  }
  if(state.money){
    state.money.expenses = purgeExpiredTombstonesInArray(state.money.expenses, now);
    state.money.incomes  = purgeExpiredTombstonesInArray(state.money.incomes,  now);
    state.money.goals    = purgeExpiredTombstonesInArray(state.money.goals,    now);
  }
  if(state.wellness) state.wellness.log = purgeExpiredTombstonesInArray(state.wellness.log, now);
  if(state.health) state.health.teethLog = purgeExpiredTombstonesInArray(state.health.teethLog, now);
  state.studyLog = state.studyLog.filter(l => l.deleted || !l.date || l.date >= cutoff);
  state.wellness.log = state.wellness.log.filter(l => l.deleted || !l.date || l.date >= cutoff);
  state.health.teethLog = state.health.teethLog.filter(l => l.deleted || !l.date || l.date >= cutoff);
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
  updateNavBadges();
  if(sync && typeof syncToTelegram === 'function' && getMyChatId()) syncToTelegram(true);
}
window.addEventListener('storage', (e) => {
  if(e.key !== STORE_KEY || e.newValue === null || e.storageArea !== localStorage) return;
  try{
    const fresh = JSON.parse(e.newValue);
    state = normalizeAndMigrateState(fresh);
    applySettings();
    renderAll();
    renderAcademicStrip();
    toast('🔄 تم التحديث من تبويب آخر');
  }catch(_){}
});

/* ============================================================
   3.8) التقويم الأكاديمي (ديناميكي + مخصص)
============================================================ */
const ACADEMIC_START = '2026-08-23';
const ACADEMIC_EVENTS_TEMPLATE = [
  { offset: -6,                  title:'عودة هيئة التدريس',        ico:'👥', type:'info'    },
  { offset: 0,                   title:'بداية الدراسة',             ico:'📚', type:'info'    },
  { offset: 3,                   title:'نهاية الحذف والإضافة',      ico:'✏️', type:'info'    },
  { offset: 9,                   title:'نهاية التأجيل',             ico:'📋', type:'info'    },
  { offset: 31,                  title:'اليوم الوطني',              ico:'🇸🇦', type:'holiday' },
  { offset: 32,                  title:'اليوم الوطني',              ico:'🇸🇦', type:'holiday' },
  { offset: 88,  endOffset: 97,  title:'إجازة منتصف الفصل',         ico:'🎉', type:'holiday' },
  { offset: 98,                  title:'استئناف الدراسة',           ico:'📖', type:'info'    },
  { offset: 109,                 title:'نهاية الاعتذار',            ico:'🚫', type:'info'    },
  { offset: 119, endOffset: 135, title:'بداية الاختبارات النهائية', ico:'📝', type:'exam'    },
  { offset: 135,                 title:'نهاية الاختبارات',          ico:'🏁', type:'exam'    },
  { offset: 137, endOffset: 146, title:'إجازة منتصف العام',         ico:'🎉', type:'holiday' },
  { offset: 140,                 title:'رصد الدرجات',               ico:'📊', type:'info'    },
  { offset: 147,                 title:'بداية الفصل الثاني',        ico:'🚀', type:'info'    }
];
let acadSelectedWeek = null;

function getAcademicEvents(){
  const custom = state.settings.customAcademicEvents;
  if(Array.isArray(custom) && custom.length > 0){
    return custom.map(ev => {
      const date = ev.date;
      const rawEnd = (ev.endDate !== undefined && ev.endDate !== null) ? String(ev.endDate).trim() : '';
      const endDate = (rawEnd && rawEnd >= date) ? rawEnd : date;
      return {
        date,
        endDate,
        title: ev.title,
        type: ev.type || 'info',
        ico: ev.ico || (ev.type === 'holiday' ? '🎉' : ev.type === 'exam' ? '📝' : '📌')
      };
    });
  }
  const base = state.settings.semesterStart || ACADEMIC_START;
  const start = new Date(base + 'T00:00:00');
  return ACADEMIC_EVENTS_TEMPLATE.map(ev => {
    const d1 = new Date(start);
    d1.setDate(d1.getDate() + ev.offset);
    const endOff = (ev.endOffset !== undefined && ev.endOffset !== null) ? ev.endOffset : ev.offset;
    const d2 = new Date(start);
    d2.setDate(d2.getDate() + endOff);
    const date = todayISO(d1);
    const endDate = todayISO(d2);
    return { date, endDate, title: ev.title, ico: ev.ico, type: ev.type };
  });
}
function getExamsStartDate(){
  const evs = getAcademicEvents();
  const examEv = evs.find(e => e.type === 'exam');
  if(examEv && examEv.date) return new Date(examEv.date + 'T00:00:00');
  const base = state.settings.semesterStart || ACADEMIC_START;
  const start = new Date(base + 'T00:00:00');
  start.setDate(start.getDate() + 119);
  return start;
}
function getExamsEndWeek(){
  const base = state.settings.semesterStart || ACADEMIC_START;
  const start = new Date(base + 'T00:00:00');
  const evs = getAcademicEvents();
  let latestExamEnd = null;
  for(const e of evs){
    if(e.type === 'exam'){
      const ed = e.endDate || e.date;
      if(!latestExamEnd || ed > latestExamEnd) latestExamEnd = ed;
    }
  }
  if(!latestExamEnd){
    const d = new Date(start);
    d.setDate(d.getDate() + 135);
    latestExamEnd = todayISO(d);
  }
  const examEndDate = new Date(latestExamEnd + 'T00:00:00');
  const diffDays = Math.floor((examEndDate - start) / 86400000);
  const examEndWeek = Math.floor(diffDays / 7) + 1;
  const semWeeks = state.settings.semesterWeeks || 16;
  return Math.max(semWeeks + 1, examEndWeek);
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
  const wStartIso = todayISO(start);
  const wEndIso = todayISO(end);
  const allEvents = getAcademicEvents();
  const overlapping = [];

  for(const ev of allEvents){
    const evStart = ev.date;
    const evEnd = ev.endDate || ev.date;
    if(evStart <= wEndIso && evEnd >= wStartIso){
      let studyDays = 0;
      for(let dayIdx = 0; dayIdx < 5; dayIdx++){
        const d = new Date(start);
        d.setDate(d.getDate() + dayIdx);
        const dayIso = todayISO(d);
        if(dayIso >= evStart && dayIso <= evEnd){
          studyDays++;
        }
      }
      overlapping.push({
        ...ev,
        studyDays,
        startsThisWeek: evStart >= wStartIso && evStart <= wEndIso,
        endsThisWeek: evEnd >= wStartIso && evEnd <= wEndIso
      });
    }
  }
  return overlapping;
}
function renderAcademicStrip(){
  const weeks = state.settings.semesterWeeks || 16;
  const maxWeek = getExamsEndWeek();
  const curWeek = currentAcademicWeek();
  const selected = acadSelectedWeek || Math.min(Math.max(curWeek, 1), maxWeek);
  const { start, end } = getWeekRange(selected);
  const titleEl = document.getElementById('acadTitle');
  const rangeEl = document.getElementById('acadRange');
  const countEl = document.getElementById('acadCountdown');
  const scrollEl = document.getElementById('acadScroll');
  const eventsEl = document.getElementById('acadEventsBar');
  if(!scrollEl) return;
  const fmtShort = d => d.toLocaleDateString(NUM_LOCALE, { day:'numeric', month:'short' });
  titleEl.innerHTML = `📅 الأسبوع <span class="week-num">${selected}</span>`;
  rangeEl.textContent = `من ${fmtShort(start)} إلى ${fmtShort(end)}`;
  const daysToExams = Math.ceil((getExamsStartDate() - new Date()) / 86400000);
  if(daysToExams > 30){ countEl.className = 'acad-countdown'; countEl.textContent = `⏳ ${daysToExams} يوم للاختبارات`; }
  else if(daysToExams > 7){ countEl.className = 'acad-countdown warn'; countEl.textContent = `⚠️ ${daysToExams} يوم للاختبارات`; }
  else if(daysToExams > 0){ countEl.className = 'acad-countdown danger'; countEl.textContent = `🚨 ${daysToExams} يوم للاختبارات`; }
  else if(daysToExams > -20){ countEl.className = 'acad-countdown danger'; countEl.textContent = `📝 فترة الاختبارات`; }
  else { countEl.className = 'acad-countdown'; countEl.textContent = `✅ انتهى الفصل`; }

  let html = '';
  for(let w = 1; w <= maxWeek; w++){
    const wr = getWeekRange(w);
    const isPast = w < curWeek;
    const isCurrent = w === curWeek;
    const isSelected = w === selected;
    const events = getEventsForWeek(w);

    const hasFullExam = events.some(e => e.type === 'exam' && (e.studyDays >= 3 || (e.studyDays > 0 && events.filter(x => x.type === 'exam').reduce((acc, cur) => acc + cur.studyDays, 0) >= 3)));
    const hasFullHoliday = !hasFullExam && events.some(e => e.type === 'holiday' && (e.studyDays >= 3 || (e.studyDays > 0 && events.filter(x => x.type === 'holiday').reduce((acc, cur) => acc + cur.studyDays, 0) >= 3)));

    const hasPartialExam = !hasFullExam && events.some(e => e.type === 'exam' && e.studyDays >= 1 && e.studyDays < 3);
    const hasPartialHoliday = !hasFullHoliday && !hasFullExam && events.some(e => e.type === 'holiday' && e.studyDays >= 1 && e.studyDays < 3);

    let cls = 'acad-week';
    if(isPast) cls += ' past';
    if(isSelected) cls += ' current';
    else if(isCurrent) cls += ' today';
    if(hasFullExam) cls += ' exam';
    else if(hasFullHoliday) cls += ' holiday';
    else if(hasPartialExam || hasPartialHoliday) cls += ' partial';

    const evIcos = events.slice(0, 3).map(e => {
      const isPartial = !hasFullExam && !hasFullHoliday && (hasPartialExam || hasPartialHoliday) && (e.type === 'holiday' || e.type === 'exam');
      return isPartial ? `<span class="partial-ico" title="${esc(e.title)}">${e.ico}</span>` : e.ico;
    }).join('');

    html += `<div class="${cls}" data-week="${w}" onclick="selectAcadWeek(${w})">
      <div class="acad-week-num">${w}${w === weeks + 1 ? ' (مراجعة)' : ''}</div>
      <div class="acad-week-dates">${fmtShort(wr.start)}</div>
      <div class="acad-week-events">${evIcos}</div>
    </div>`;
  }
  scrollEl.innerHTML = html;

  const events = getEventsForWeek(selected);
  if(!events.length){
    eventsEl.innerHTML = `<span style="color:var(--muted);font-weight:600">لا توجد أحداث مسجلة في هذا الأسبوع</span>`;
  } else {
    eventsEl.innerHTML = events.map(e => {
      const cls = e.type === 'holiday' ? 'holiday' : e.type === 'exam' ? 'exam' : 'info';
      const rangeText = fmtDateRange(e.date, e.endDate);
      return `<span class="acad-event-chip ${cls}">${e.ico} ${esc(e.title)} (${rangeText})</span>`;
    }).join('');
  }
  const curEl = scrollEl.querySelector('.acad-week.current');
  if(curEl) curEl.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
  const prevBtn = document.getElementById('acadPrev');
  const nextBtn = document.getElementById('acadNext');
  if(prevBtn) prevBtn.disabled = selected <= 1;
  if(nextBtn) nextBtn.disabled = selected >= maxWeek;
}
function selectAcadWeek(w){
  acadSelectedWeek = w;
  renderAcademicStrip();
  renderSchedule();
}
document.getElementById('acadPrev')?.addEventListener('click', () => {
  if(!acadSelectedWeek) acadSelectedWeek = currentAcademicWeek();
  if(acadSelectedWeek > 1){ acadSelectedWeek--; renderAcademicStrip(); renderSchedule(); }
});
document.getElementById('acadNext')?.addEventListener('click', () => {
  const maxWeek = getExamsEndWeek();
  if(!acadSelectedWeek) acadSelectedWeek = currentAcademicWeek();
  if(acadSelectedWeek < maxWeek){ acadSelectedWeek++; renderAcademicStrip(); renderSchedule(); }
});

function openAcadEventsModal(){
  const evs = getAcademicEvents();
  const rows = evs.map((e, i) => {
    const rangeText = (e.endDate && e.endDate !== e.date)
      ? `${esc(e.date)} ← ${esc(e.endDate)}`
      : `${esc(e.date)}`;
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:var(--hover);border-radius:10px;margin-bottom:6px;font-size:13px;font-weight:700">
      <span>${esc(e.ico)} ${esc(e.title)} <span style="color:var(--muted);font-size:11.5px">(${rangeText})</span></span>
      <button class="mini-btn del" style="width:28px;height:28px" onclick="deleteAcadEvent(${i})">✕</button>
    </div>
  `;
  }).join('');
  openModal('📌 أحداث التقويم الأكاديمي', `
    <div class="form-grid" style="margin-bottom:14px;background:var(--hover);padding:14px;border-radius:12px">
      <div class="field full"><label>عنوان الحدث</label><input id="aeTitle" placeholder="مثال: إجازة مطولة"></div>
      <div class="field"><label>تاريخ البداية</label><input type="date" id="aeDate" value="${todayISO()}"></div>
      <div class="field"><label>تاريخ النهاية (اختياري)</label><input type="date" id="aeEndDate" placeholder="نفس تاريخ البداية إذا ترك فارغاً"></div>
      <div class="field full"><label>النوع</label>
        <select id="aeType">
          <option value="info">📌 حدث أكاديمي</option>
          <option value="holiday">🎉 إجازة</option>
          <option value="exam">📝 اختبارات</option>
        </select>
      </div>
      <div class="field full"><button class="btn btn-primary btn-sm btn-block" onclick="addAcadEvent()">➕ إضافة حدث للتقويم</button></div>
    </div>
    <div style="max-height:260px;overflow-y:auto">${rows}</div>
  `, `
    <button class="btn btn-ghost btn-sm" onclick="resetAcadEventsDefault()">↺ استعادة الافتراضي</button>
    <button class="btn btn-primary" onclick="closeModal()">تم</button>
  `);
}
function addAcadEvent(){
  const title = document.getElementById('aeTitle')?.value.trim();
  const date = document.getElementById('aeDate')?.value;
  const rawEndDate = document.getElementById('aeEndDate')?.value;
  const endDate = rawEndDate && rawEndDate.trim() ? rawEndDate.trim() : '';
  const type = document.getElementById('aeType')?.value || 'info';
  if(!title || !date){ toast('⚠️ أدخل العنوان وتاريخ البداية'); return; }
  if(endDate && endDate < date){ toast('⚠️ تاريخ النهاية يجب أن يكون بعد أو نفس تاريخ البداية'); return; }
  const current = getAcademicEvents();
  const newEv = {
    date,
    title,
    type,
    ico: type === 'holiday' ? '🎉' : type === 'exam' ? '📝' : '📌'
  };
  if(endDate && endDate !== date){
    newEv.endDate = endDate;
  }
  current.push(newEv);
  current.sort((a,b) => a.date.localeCompare(b.date));
  state.settings.customAcademicEvents = current;
  touchField(state.settings, 'customAcademicEvents');
  save(); renderAcademicStrip(); openAcadEventsModal(); toast('✅ أُضيف الحدث');
}
function deleteAcadEvent(idx){
  const current = getAcademicEvents();
  current.splice(idx, 1);
  state.settings.customAcademicEvents = current;
  touchField(state.settings, 'customAcademicEvents');
  save(); renderAcademicStrip(); openAcadEventsModal();
}
function resetAcadEventsDefault(){
  state.settings.customAcademicEvents = [];
  touchField(state.settings, 'customAcademicEvents');
  save(); renderAcademicStrip(); openAcadEventsModal(); toast('↺ تمت استعادة التقويم الافتراضي');
}


function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
