/* ============================================================================
   🎓 مُساعد الجامعة — ui.js (التنقل، النوافذ، لوحة اليوم، المقررات، المهام، الصحة، الإعدادات، وتفويض الأحداث)
   ============================================================================ */

/* ============================================================
   1.5) نافذة التأكيد المخصصة (Custom Confirm Dialog)
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
    const inputWrap = document.getElementById('confirmInputWrap');
    const typeInput = document.getElementById('confirmTypeInput');
    const typeHint = document.getElementById('confirmTypeHint');

    if(!bg){ resolve(true); return; }

    const variant = options.variant || 'danger';
    const reqText = options.requireText ? String(options.requireText).trim() : '';
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

    if(inputWrap && typeInput){
      if(reqText){
        inputWrap.style.display = 'block';
        typeInput.value = '';
        typeInput.placeholder = options.placeholder || `اكتب "${reqText}" للتأكيد`;
        if(typeHint) typeHint.textContent = options.hintText || `للتأكيد، اكتب كلمة "${reqText}" في الحقل أدناه:`;
        okBtn.disabled = true;
        typeInput.oninput = () => {
          const val = typeInput.value.trim();
          okBtn.disabled = !(val === reqText || (reqText === 'حذف' && val.toUpperCase() === 'DELETE'));
        };
      } else {
        inputWrap.style.display = 'none';
        typeInput.value = '';
        typeInput.oninput = null;
        okBtn.disabled = false;
      }
    }

    let resolved = false;
    const doResolve = (val) => {
      if(resolved) return;
      resolved = true;
      document.removeEventListener('keydown', escHandler);
      if(inputWrap) inputWrap.style.display = 'none';
      if(typeInput){ typeInput.value = ''; typeInput.oninput = null; }
      okBtn.disabled = false;
      bg.classList.remove('open');
      if(typeof syncBodyScrollLock === 'function') syncBodyScrollLock();
      resolve(val);
    };

    const escHandler = (e) => { if(e.key === 'Escape') doResolve(false); };

    okBtn.onclick = () => {
      if(reqText && typeInput){
        const val = typeInput.value.trim();
        if(!(val === reqText || (reqText === 'حذف' && val.toUpperCase() === 'DELETE'))){
          toast(`⚠️ اكتب "${reqText}" للتأكيد أولاً`);
          return;
        }
      }
      doResolve(true);
    };
    cancelBtn.onclick = () => doResolve(false);
    bg.onclick = (e) => { if(e.target === bg) doResolve(false); };
    document.addEventListener('keydown', escHandler);

    bg.style.zIndex = document.getElementById('pinOverlay')?.classList.contains('open') ? '1100' : '';
    bg.classList.add('open');
    if(typeof syncBodyScrollLock === 'function') syncBodyScrollLock();
    if(reqText && typeInput){
      setTimeout(() => { try{ typeInput.focus(); }catch(_){} }, 40);
    }
  });
}

/* ============================================================
   4) التنقل (Navigation & Routing)
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
  balance:   ['الرصيد والميزانية','نظرة على مكافأتك، الفلوس المضافة، ومصروفك'],
  expenses:  ['المصاريف والعمليات','سجل كل مصروف أو فلوس مضافة بسهولة'],
  goals:     ['الأهداف المالية','أهدافك وحصالتك'],
  attendance:['الحضور والغياب','تتبع غياباتك وحد الحرمان'],
  archive:   ['أرشيف الفصول','سجل كل فصولك السابقة'],
  settings:  ['الإعدادات','تخصيص التطبيق والبيانات']
};

function updateNavBadges(){
  const openTasks = live(state.tasks).filter(t => !t.done).length;
  const upcomingExams = live(state.exams).filter(e => !e.done && daysUntil(e.date) >= 0).length;
  const totalOpen = openTasks + upcomingExams;
  const tasksBtn = document.querySelector('.nav-btn[data-view="tasks"]');
  if(tasksBtn){
    let badge = tasksBtn.querySelector('.badge');
    if(totalOpen > 0){
      if(!badge){
        badge = document.createElement('span');
        badge.className = 'badge';
        tasksBtn.appendChild(badge);
      }
      badge.textContent = totalOpen;
    } else if(badge){
      badge.remove();
    }
  }
  const mobTasksBtn = document.getElementById('mobTasksTab');
  if(mobTasksBtn){
    let mBadge = mobTasksBtn.querySelector('.mob-badge');
    if(totalOpen > 0){
      if(!mBadge){
        mBadge = document.createElement('span');
        mBadge.className = 'mob-badge';
        mobTasksBtn.appendChild(mBadge);
      }
      mBadge.textContent = totalOpen;
    } else if(mBadge){
      mBadge.remove();
    }
  }
}

function go(view){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById('view-' + view);
  if(!targetView){ console.warn('view not found:', view); return; }
  targetView.classList.add('active');
  const hl = (view === 'course-detail') ? 'courses' : view;
  document.querySelectorAll('.nav-btn, .home-btn, #settingsBtn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === hl);
  });
  const primaryMobViews = new Set(['dashboard', 'schedule', 'tasks', 'grades', 'balance']);
  const mobHl = (hl === 'expenses' || hl === 'goals') ? 'balance' : hl;
  document.querySelectorAll('#mobileBottomNav .mob-tab').forEach(b => {
    if(b.id === 'mobMoreBtn'){
      b.classList.toggle('active', !primaryMobViews.has(mobHl));
    } else {
      b.classList.toggle('active', b.dataset.view === mobHl);
    }
  });
  const [t,s] = VIEW_META[view] || ['',''];
  document.getElementById('pageTitle').textContent = t;
  document.getElementById('pageSub').textContent = s;
  document.getElementById('sidebar').classList.remove('open', 'rail-expanded');
  document.getElementById('overlay').classList.remove('show');
  syncBodyScrollLock();
  window.scrollTo({ top:0, behavior:'smooth' });
  if(view !== 'course-detail'){ try{ location.hash = view; }catch(e){} }
  document.querySelectorAll('.nav-group').forEach(g => {
    if(g.querySelector(`[data-view="${hl}"]`)) g.classList.remove('collapsed');
  });
  setTimeout(() => {
    try{
      if(view === 'attendance') renderAttendancePage();
      if(view === 'wellness') renderWellness();
      if(view === 'teeth') renderTeeth();
      if(view === 'archive') renderArchive();
      if(view === 'grades') renderGrades();
      if(view === 'settings'){ renderSyncStatus(); renderPinSettingsUI(); }
      if(view === 'course-detail') renderCourseDetail();
      if(view === 'courses') renderCourses();
      if(view === 'schedule'){ renderAcademicStrip(); renderSchedule(); }
      if(view === 'balance') renderBalance();
      if(view === 'expenses') renderExpenses();
      if(view === 'goals') renderGoals();
    }catch(e){ console.error(e); }
  }, 30);
}

window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if(h && document.getElementById('view-' + h) && h !== 'course-detail'){
    go(h);
  }
});

const DELEGATED_ACTIONS = {
  toggleSidebarRail: () => toggleSidebarRail(),
  lockAppNow: () => lockAppNow(),
  openAiModal: () => openAiModal(),
  doSyncNow: () => doSync(false),
  openAddForm: () => openAddForm(),
  openClassForm: () => openClassForm(),
  openQuickAdd: () => openQuickAdd(),
  openCourseForm: () => openCourseForm(),
  openTaskForm: () => openTaskForm(),
  openExamForm: () => openExamForm(),
  openAddGradeForm: () => openAddGradeForm(),
  openManualLog: () => openManualLog(),
  savePomoSettings: () => savePomoSettings(),
  toggleTeeth: (arg) => toggleTeeth(arg),
  openSalaryForm: () => openSalaryForm(),
  openIncomeForm: () => openIncomeForm(),
  openExpenseForm: () => openExpenseForm(),
  openGoalForm: () => openGoalForm(),
  saveSemesterSettings: () => saveSemesterSettings(),
  openAcadEventsModal: () => openAcadEventsModal(),
  saveAcademicPreferences: () => saveAcademicPreferences(),
  connectTelegram: () => connectTelegram(),
  unlinkTelegram: () => unlinkTelegram(),
  testTelegram: () => testTelegram(),
  renewToken: () => renewToken(),
  saveHealthGoals: () => saveHealthGoals(),
  openPinSetupModal: () => openPinSetupModal(),
  removePinLock: () => removePinLock(),
  runHealthCheck: () => runHealthCheck(),
  exportData: () => exportData(),
  triggerImportFile: () => document.getElementById('importFile')?.click(),
  partialDelete: (arg) => partialDelete(arg),
  clearAll: () => clearAll(),
  closeModal: () => closeModal(),
  pressPinKey: (arg) => pressPinKey(arg),
  clearPinEntry: () => clearPinEntry(),
  backspacePinKey: () => backspacePinKey(),
  forgotPinEscape: () => forgotPinEscape(),
  toggleMobileSidebarDrawer: () => toggleMobileSidebarDrawer()
};

document.body.addEventListener('click', function(e){
  const actionEl = e.target.closest('[data-action]');
  if(actionEl && actionEl.dataset.action){
    const fn = DELEGATED_ACTIONS[actionEl.dataset.action];
    if(typeof fn === 'function'){
      e.preventDefault();
      fn(actionEl.dataset.arg);
      return;
    }
  }
  const target = e.target.closest('[data-view]');
  if(!target || !target.dataset.view) return;
  e.preventDefault();
  go(target.dataset.view);
});

document.querySelectorAll('.nav-group-title').forEach(title => {
  title.addEventListener('click', () => {
    title.parentElement.classList.toggle('collapsed');
  });
});

/* ============================================================
   5) المظهر (Dark / Light Theme)
============================================================ */
function updateThemeColorMeta(t){
  const col = t === 'dark' ? '#090f1d' : '#0d9488';
  const mLight = document.getElementById('metaThemeLight');
  const mDark = document.getElementById('metaThemeDark');
  if(mLight && typeof mLight.setAttribute === 'function') mLight.setAttribute('content', col);
  if(mDark && typeof mDark.setAttribute === 'function') mDark.setAttribute('content', col);
}
function setTheme(t){
  state.settings.theme = t;
  touchField(state.settings, 'theme');
  document.documentElement.dataset.theme = t;
  updateThemeColorMeta(t);
  const sideBtn = document.getElementById('themeBtn');
  if(sideBtn) sideBtn.textContent = t === 'dark' ? '☀️' : '🌙';
  save();
}
document.getElementById('themeBtn').addEventListener('click', () => {
  setTheme(state.settings.theme === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   6) النوافذ المنبثقة (Modals)
============================================================ */
const modalBg = document.getElementById('modalBg');
function syncBodyScrollLock(){
  const modalOpen = document.getElementById('modalBg')?.classList.contains('open');
  const confirmOpen = document.getElementById('confirmBg')?.classList.contains('open');
  const sideOpen = document.getElementById('sidebar')?.classList.contains('open');
  const pinOpen = document.getElementById('pinOverlay')?.classList.contains('open');
  document.body.style.overflow = (modalOpen || confirmOpen || sideOpen || pinOpen) ? 'hidden' : '';
}
function openModal(title, bodyHTML, footHTML){
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFoot').innerHTML = footHTML || '';
  modalBg.classList.add('open');
  syncBodyScrollLock();
}
function closeModal(){
  modalBg.classList.remove('open');
  syncBodyScrollLock();
  if(typeof aiFileData !== 'undefined') aiFileData = null;
  if(aiAbortController){ aiAbortController.abort(); aiAbortController = null; }
}
modalBg.addEventListener('click', e => { if(e.target === modalBg) closeModal(); });
document.addEventListener('keydown', e => { if(e.key === 'Escape' && modalBg.classList.contains('open')) closeModal(); });

/* ============================================================
   7) المقررات الدراسية
============================================================ */
let pickedColor = COLORS[0];
function openCourseForm(id){
  const c = id ? getCourse(id) : null;
  pickedColor = c ? c.color : COLORS[live(state.courses).length % COLORS.length];
  const colorBtns = COLORS.map(col => `<button type="button" data-c="${col}" style="background:${col}" class="${col===pickedColor?'sel':''}" aria-label="لون ${col}"></button>`).join('');
  openModal(c ? 'تعديل مقرر' : 'إضافة مقرر جديد', `
    <div class="form-grid">
      <div class="field full"><label>اسم المقرر <span class="req">*</span></label>
        <input id="cName" placeholder="مثال: تفاضل وتكامل" value="${esc(c?.name||'')}"></div>
      <div class="field"><label>الرمز</label><input id="cCode" placeholder="MATH101" value="${esc(c?.code||'')}"></div>
      <div class="field"><label>عدد الساعات</label><input id="cCredits" type="number" min="0" max="10" value="${c?.credits ?? 3}"></div>
      <div class="field full"><label>اسم الدكتور</label><input id="cTeacher" placeholder="د. محمد أحمد" value="${esc(c?.teacher||'')}"></div>
      <div class="field full"><label>اللون المميز</label><div class="color-pick" id="colorPick">${colorBtns}</div></div>
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveCourse('${esc(id||'')}')">💾 حفظ</button>`);
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
  if(id){ const it = getCourse(id); if(it){ Object.assign(it, data); touchItem(it); } }
  else{ state.courses.push({ id: uid(), ...data, grades: [], updatedAt: Date.now() }); }
  save(); closeModal(); renderAll(); toast('✅ تم حفظ المقرر');
}
async function deleteCourse(id){
  const ok = await appConfirm('سيتم حذف المقرر وكل ما يتعلق به (المحاضرات، المهام، الاختبارات). متابعة؟', {
    title: 'حذف المقرر', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  const removedClassIds = new Set(state.schedule.filter(s => !s.deleted && s.courseId === id).map(s => s.id));
  state.courses.forEach(c => { if(c.id === id) tombstoneItem(c); });
  state.schedule.forEach(s => { if(s.courseId === id) tombstoneItem(s); });
  state.tasks.forEach(t => { if(t.courseId === id) tombstoneItem(t); });
  state.exams.forEach(e => { if(e.courseId === id) tombstoneItem(e); });
  state.attendance.forEach(a => { if(removedClassIds.has(a.classId)) tombstoneItem(a); });
  state.studyLog.forEach(l => { if(!l.deleted && l.courseId === id){ l.courseId = ''; touchItem(l); } });
  const wasInDetail = currentCourseId === id;
  if(wasInDetail) currentCourseId = null;
  save(); renderAll();
  if(wasInDetail) go('courses');
  toast('🗑️ تم الحذف');
}

/* ============================================================
   8) صفحة تفاصيل المقرر
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
  const lectures = live(state.schedule).filter(s => s.courseId === c.id).sort((a,b) => a.day - b.day || toMin(a.start) - toMin(b.start));
  const tasks = live(state.tasks).filter(t => t.courseId === c.id).sort((a,b) => a.due.localeCompare(b.due));
  const exams = live(state.exams).filter(e => e.courseId === c.id).sort((a,b) => a.date.localeCompare(b.date));
  const total = courseTotal(c);
  const openTasks = tasks.filter(t => !t.done).length;
  const statsHTML = `
    <div class="cd-stat"><b style="color:${c.color}">${lectures.length}</b><span>📅 محاضرة أسبوعياً</span></div>
    <div class="cd-stat"><b style="color:var(--warn)">${openTasks}</b><span>✅ مهمة متبقية</span></div>
    <div class="cd-stat"><b style="color:var(--danger)">${exams.filter(e => !e.done && daysUntil(e.date) >= 0).length}</b><span>⏰ اختبار قادم</span></div>
    <div class="cd-stat"><b style="color:var(--ok)">${total !== null ? total.toFixed(1) + '%' : '—'}</b><span>📊 معدل الدرجات</span></div>`;
  let lecturesHTML = '';
  if(!lectures.length){
    lecturesHTML = `<div class="empty" style="padding:22px"><div class="e-ico" style="font-size:34px">📅</div><b style="font-size:15px">لا توجد محاضرات</b></div>`;
  } else {
    lecturesHTML = lectures.map(s => `
      <div class="cd-item" style="cursor:pointer" onclick="openClassForm('${esc(s.id)}')">
        <div class="ci-ico">📅</div>
        <div class="ci-main"><b>${DAYS[s.day]}</b><span>${to12(s.start)} - ${to12(s.end)}${s.room ? ' · ' + esc(s.room) : ''}</span></div>
        <div class="ci-side" style="background:${c.color}22;color:${c.color}">${toMin(s.end) - toMin(s.start)} د</div>
        <button class="mini-btn" onclick="event.stopPropagation();openClassForm('${esc(s.id)}')" title="تعديل">✏️</button>
        <button class="mini-btn del" onclick="event.stopPropagation();deleteClass('${esc(s.id)}')" title="حذف">🗑️</button>
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
      return `<div class="cd-item" style="cursor:pointer;${t.done?'opacity:.6':''}" onclick="openTaskForm('${esc(t.id)}')">
        <div class="ci-ico" onclick="event.stopPropagation();toggleTask('${esc(t.id)}')" title="تبديل الإنجاز">${t.done ? '✅' : '📝'}</div>
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
      if(e.done){ txt = 'منجز'; bg = 'var(--ok-bg)'; col = 'var(--ok)'; }
      else if(d < 0){ txt = 'انتهى'; bg = 'var(--hover)'; col = 'var(--muted)'; }
      else if(d === 0){ txt = 'اليوم'; bg = 'var(--danger-bg)'; col = 'var(--danger)'; }
      else if(d === 1){ txt = 'غداً'; bg = 'var(--danger-bg)'; col = 'var(--danger)'; }
      else if(d <= 7){ txt = `بعد ${d}ي`; bg = 'var(--warn-bg)'; col = 'var(--warn)'; }
      else { txt = `بعد ${d}ي`; bg = 'var(--ok-bg)'; col = 'var(--ok)'; }
      return `<div class="cd-item" style="cursor:pointer" onclick="openExamForm('${esc(e.id)}')">
        <div class="ci-ico">⏰</div>
        <div class="ci-main"><b>${esc(e.title)}</b><span>${esc(e.type)} · ${fmtDate(e.date)}${e.time ? ' · ' + to12(e.time) : ''}${e.place ? ' · ' + esc(e.place) : ''}</span></div>
        <div class="ci-side" style="background:${bg};color:${col}">${txt}</div></div>`;
    }).join('');
  }
  let gradesHTML = '';
  const g = c.grades || [];
  if(!g.length){
    gradesHTML = `<div class="empty" style="padding:22px"><div class="e-ico" style="font-size:34px">📊</div><b style="font-size:15px">لا توجد درجات تفصيلية</b></div>`;
  } else {
    gradesHTML = g.map(x => {
      const hasScore = x.score !== '' && x.score !== null && x.score !== undefined;
      const scoreColor = !hasScore ? 'var(--muted)' : (+x.score >= 80) ? 'var(--ok)' : (+x.score >= 60) ? 'var(--warn)' : 'var(--danger)';
      return `<div class="cd-item"><div class="ci-ico">📝</div>
        <div class="ci-main"><b>${esc(x.name || 'مكوّن')}</b><span>الوزن: ${x.weight}%</span></div>
        <div class="ci-side" style="background:${scoreColor}22;color:${scoreColor}">${hasScore ? x.score + '%' : '—'}</div></div>`;
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
          <button class="btn btn-ghost btn-sm" onclick="openCourseForm('${esc(c.id)}')">✏️ تعديل المقرر</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCourse('${esc(c.id)}')">🗑️ حذف</button>
        </div>
      </div>
      <div class="cd-stat-row">${statsHTML}</div>
    </div>
    ${total !== null ? `
      <div class="grade-summary-box" style="--cd-color:${c.color}">
        <div><span>المعدل الحالي في المقرر</span><div><b>${total.toFixed(1)}%</b></div></div>
        <div style="text-align:center"><span>التقدير المتوقع</span>
          <div style="font-family:'Cairo',system-ui,sans-serif;font-size:26px;font-weight:800">${scoreToLetter(total)}</div></div>
      </div>` : ''}
    <div class="cd-section">
      <div class="cd-section-head"><h3>📅 المحاضرات (${lectures.length})</h3>
        <button class="btn btn-ghost btn-sm" onclick="openClassFormForCourse('${esc(c.id)}')">➕ إضافة محاضرة</button></div>
      ${lecturesHTML}
    </div>
    <div class="cd-section">
      <div class="cd-section-head"><h3>📋 المهام والاختبارات (${tasks.length + exams.length})</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="openTaskFormForCourse('${esc(c.id)}')">➕ إضافة مهمة</button>
          <button class="btn btn-ghost btn-sm" onclick="openExamFormForCourse('${esc(c.id)}')">➕ إضافة اختبار</button>
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
      <button class="add-type-btn" onclick="closeModal();openIncomeForm()">
        <div class="at-ico" style="background:var(--ok-bg);color:var(--ok)">💰</div>
        <div class="at-main"><b>زيادة فلوس / دخل إضافي</b><span>إضافة مبلغ على ميزانيتك ورصيدك</span></div>
      </button>
      <button class="add-type-btn" onclick="closeModal();openAiModal()">
        <div class="at-ico" style="background:var(--p-light);color:var(--p)">✨</div>
        <div class="at-main"><b>المساعد الذكي الشامل (AI)</b><span>اكتب أي شيء أو ارفع صورة وسينفذه فوراً</span></div>
      </button>
    </div>
  `, `<button class="btn btn-ghost btn-block" onclick="closeModal()">إلغاء</button>`);
}

/* ============================================================
   11) المهام
============================================================ */
function openTaskForm(id){
  const t = id ? live(state.tasks).find(x => x.id === id) : null;
  const typeOpts = TASK_TYPES.map(x => `<option ${t?.type===x?'selected':''}>${x}</option>`).join('');
  openModal(t ? 'تعديل مهمة' : 'إضافة مهمة', `
    <div class="form-grid">
      <div class="field full"><label>عنوان المهمة <span class="req">*</span></label><input id="tTitle" placeholder="مثال: حل واجب الفصل الثالث" value="${esc(t?.title||'')}"></div>
      <div class="field"><label>المقرر</label><select id="tCourse"><option value="">— عام —</option>${courseOptions(t?.courseId)}</select></div>
      <div class="field"><label>النوع</label><select id="tType">${typeOpts}</select></div>
      <div class="field"><label>تاريخ التسليم <span class="req">*</span></label><input type="date" id="tDue" value="${t?.due || todayISO()}"></div>
      <div class="field"><label>الأولوية</label><select id="tPriority">
        <option value="high" ${t?.priority==='high'?'selected':''}>🔴 عالية</option>
        <option value="med" ${(!t?.priority || t?.priority==='med')?'selected':''}>🟡 متوسطة</option>
        <option value="low" ${t?.priority==='low'?'selected':''}>🟢 منخفضة</option>
      </select></div>
      <div class="field full"><label>ملاحظات</label><textarea id="tNotes" placeholder="تفاصيل إضافية...">${esc(t?.notes||'')}</textarea></div>
    </div>
  `, `${t ? `<button class="btn btn-danger" onclick="deleteTask('${esc(id)}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveTask('${esc(id||'')}')">💾 حفظ</button>`);
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
  if(id){ const it = live(state.tasks).find(x => x.id === id); if(it){ Object.assign(it, data); touchItem(it); } }
  else{ state.tasks.push({ id: uid(), ...data, done:false, created: todayISO(), updatedAt: Date.now() }); }
  save(); closeModal(); renderAll(); toast('✅ تم حفظ المهمة');
}
async function deleteTask(id){
  const t = live(state.tasks).find(x => x.id === id);
  const ok = await appConfirm(`حذف المهمة "${t?.title || ''}"؟`, {
    title: 'حذف المهمة', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  state.tasks.forEach(x => { if(x.id === id) tombstoneItem(x); });
  save(); closeModal(); renderAll(); toast('🗑️ تم الحذف');
}
function toggleTask(id){ const t = live(state.tasks).find(x => x.id === id); if(t){ t.done = !t.done; touchItem(t); save(); renderAll(); } }
function toggleExam(id){ const e = live(state.exams).find(x => x.id === id); if(e){ e.done = !e.done; touchItem(e); save(); renderAll(); } }

/* ============================================================
   12) الاختبارات
============================================================ */
function openExamForm(id){
  const e = id ? live(state.exams).find(x => x.id === id) : null;
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
      <div class="field full">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:12px;background:var(--hover);border-radius:12px">
          <input type="checkbox" id="eDone" ${e?.done ? 'checked' : ''} style="width:auto;cursor:pointer">
          <span style="font-weight:700">✅ تم أداء هذا الاختبار</span>
        </label>
      </div>
    </div>
  `, `${e ? `<button class="btn btn-danger" onclick="deleteExam('${esc(id)}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveExam('${esc(id||'')}')">💾 حفظ</button>`);
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
    notes: document.getElementById('eNotes').value.trim(),
    done: document.getElementById('eDone')?.checked || false
  };
  if(id){ const it = live(state.exams).find(x => x.id === id); if(it){ Object.assign(it, data); touchItem(it); } }
  else{ state.exams.push({ id: uid(), ...data, updatedAt: Date.now() }); }
  save(); closeModal(); renderAll(); toast('✅ تم حفظ الاختبار');
}
async function deleteExam(id){
  const e = live(state.exams).find(x => x.id === id);
  const ok = await appConfirm(`حذف الاختبار "${e?.title || ''}"؟`, {
    title: 'حذف الاختبار', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  state.exams.forEach(x => { if(x.id === id) tombstoneItem(x); });
  save(); closeModal(); renderAll(); toast('🗑️ تم الحذف');
}

/* ============================================================
   13) رندرة لوحة اليوم
============================================================ */
function isStateEmptyForOnboarding(){
  return (
    live(state.courses).length === 0 &&
    live(state.schedule).length === 0 &&
    live(state.tasks).length === 0 &&
    live(state.exams).length === 0 &&
    !state.settings.onboardingDismissed
  );
}
function dismissOnboarding(){
  state.settings.onboardingDismissed = true;
  touchField(state.settings, 'onboardingDismissed');
  save();
  renderDashboard();
}
function dismissBackupReminder(){
  state.settings.backupReminderDismissedAt = Date.now();
  touchField(state.settings, 'backupReminderDismissedAt');
  save();
  renderDashboard();
}
function renderDashOnboarding(){
  const el = document.getElementById('dashOnboarding');
  if(!el) return;
  if(!isStateEmptyForOnboarding()){
    el.innerHTML = '';
    return;
  }
  const hasSem = Boolean(state.settings.semesterStart);
  const hasCourses = live(state.courses).length > 0;
  const hasSched = live(state.schedule).length > 0;
  el.innerHTML = `
    <div class="card" style="margin-bottom:20px;border:2px solid var(--p);background:linear-gradient(135deg, color-mix(in srgb, var(--p-light) 65%, var(--card)), var(--card))">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <div>
          <h2 style="font-size:18.5px;color:var(--p-dark);margin-bottom:4px">👋 أهلاً بك في مُساعد الجامعة! ابدأ في 3 خطوات سريعة</h2>
          <p style="font-size:13px;color:var(--muted);font-weight:600">أكمل هذه الخطوات لإعداد فصلك الدراسي، وستختفي هذه البطاقة تلقائياً بمجرد إضافة بياناتك.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" onclick="dismissOnboarding()">إخفاء الدليل ✕</button>
      </div>
      <div class="grid g3" style="gap:12px">
        <div style="background:var(--card);padding:14px;border-radius:14px;border:1px solid var(--border);display:flex;flex-direction:column;justify-content:space-between;gap:10px">
          <div>
            <div style="font-size:12px;font-weight:800;color:var(--p);margin-bottom:4px">الخطوة 1 ${hasSem ? '✅' : ''}</div>
            <b style="font-size:14.5px;display:block;margin-bottom:4px">📅 تاريخ بداية الفصل</b>
            <span style="font-size:12px;color:var(--muted);font-weight:600">حدد تاريخ أول يوم دراسي وعدد أسابيع الفصل لحساب الأسابيع تلقائياً.</span>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" onclick="go('settings')">⚙️ ضبط تواريخ الفصل</button>
        </div>
        <div style="background:var(--card);padding:14px;border-radius:14px;border:1px solid var(--border);display:flex;flex-direction:column;justify-content:space-between;gap:10px">
          <div>
            <div style="font-size:12px;font-weight:800;color:var(--p);margin-bottom:4px">الخطوة 2 ${hasCourses ? '✅' : ''}</div>
            <b style="font-size:14.5px;display:block;margin-bottom:4px">📚 إضافة المقررات</b>
            <span style="font-size:12px;color:var(--muted);font-weight:600">أضف مقرراتك مع عدد الساعات واللون المميز لكل مقرر.</span>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="openCourseForm()">➕ إضافة مقرر</button>
        </div>
        <div style="background:var(--card);padding:14px;border-radius:14px;border:1px solid var(--border);display:flex;flex-direction:column;justify-content:space-between;gap:10px">
          <div>
            <div style="font-size:12px;font-weight:800;color:var(--p);margin-bottom:4px">الخطوة 3 ${hasSched ? '✅' : ''}</div>
            <b style="font-size:14.5px;display:block;margin-bottom:4px">🗓️ بناء الجدول الأسبوعي</b>
            <span style="font-size:12px;color:var(--muted);font-weight:600">أضف أوقات محاضراتك لتتبع الحضور والغياب والتنبيهات.</span>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" onclick="go('schedule');openClassForm()">➕ إضافة محاضرة</button>
        </div>
      </div>
    </div>`;
}
function shouldShowBackupReminder(){
  const hasAnyData = live(state.courses).length > 0 || live(state.tasks).length > 0 || live(state.exams).length > 0 || live(state.money.expenses).length > 0;
  if(!hasAnyData) return false;
  const now = Date.now();
  const lastExp = Number(state.settings.lastExportAt) || 0;
  const lastDismiss = Number(state.settings.backupReminderDismissedAt) || 0;
  if(now - lastDismiss < 7 * 86400 * 1000) return false;
  return (now - lastExp) >= 30 * 86400 * 1000;
}
function renderDashBackupReminder(){
  const el = document.getElementById('dashBackupBanner');
  if(!el) return;
  if(!shouldShowBackupReminder()){
    el.innerHTML = '';
    return;
  }
  const lastExp = Number(state.settings.lastExportAt) || 0;
  const daysAgo = lastExp > 0 ? Math.floor((Date.now() - lastExp) / 86400000) : null;
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px;padding:14px 18px;border-inline-start:4px solid var(--warn);background:var(--warn-bg);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="font-size:13px;font-weight:700;color:var(--text)">
        💾 <b>تذكير النسخ الاحتياطي الدوري:</b> ${daysAgo !== null ? `مرّ ${daysAgo} يوماً منذ آخر نسخة احتياطية JSON.` : 'لم تقم بتصدير نسخة احتياطية JSON منذ أكثر من 30 يوماً.'} احتفظ بنسخة على جهازك لضمان أمان بياناتك.
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn btn-primary btn-sm" onclick="exportData()">📤 تصدير نسخة الآن</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="dismissBackupReminder()">تذكيري لاحقاً</button>
      </div>
    </div>`;
}
function renderDashboard(){
  renderDashOnboarding();
  renderDashBackupReminder();
  const activeTasks = live(state.tasks);
  const openTasks = activeTasks.filter(t => !t.done);
  const late = openTasks.filter(t => daysUntil(t.due) < 0);
  const upcomingExams = live(state.exams).filter(e => !e.done && daysUntil(e.date) >= 0);
  const totalMin = live(state.studyLog).reduce((a,b) => a + (+b.minutes||0), 0);
  const statsHTML = [
    { ico:'📚', bg:'var(--p-light)', val:live(state.courses).length, lbl:'مقرر مسجّل', act:"go('courses')" },
    { ico:'📋', bg:'var(--warn-bg)', val:openTasks.length + upcomingExams.length, lbl:'متبقي للإنجاز', act:"go('tasks')" },
    { ico:'⏰', bg:'var(--danger-bg)', val:upcomingExams.length, lbl:'اختبار قادم', act:"go('tasks')" },
    { ico:'🍅', bg:'var(--ok-bg)', val:(totalMin/60).toFixed(1) + 'h', lbl:'ساعات المذاكرة', act:"go('study')" }
  ].map(s => `<div class="stat" style="cursor:pointer" onclick="${s.act}"><div class="stat-ico" style="background:${s.bg}">${s.ico}</div><div><b>${s.val}</b><span>${s.lbl}</span></div></div>`).join('');
  document.getElementById('dashStats').innerHTML = statsHTML;

  const total = activeTasks.length;
  const done = activeTasks.filter(t => t.done).length;
  const pct = total ? Math.round(done/total*100) : 0;
  document.getElementById('dashProgBar').style.width = pct + '%';
  document.getElementById('dashProgTxt').textContent = total ? pct + '%' : '0%';
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
      let txt, bg, col;
      if(d < 0){ txt = `متأخر ${Math.abs(d)} يوم`; bg = 'var(--danger-bg)'; col = 'var(--danger)'; }
      else if(d === 0){ txt = 'اليوم'; bg = 'var(--danger-bg)'; col = 'var(--danger)'; }
      else if(d === 1){ txt = 'غداً'; bg = 'var(--warn-bg)'; col = 'var(--warn)'; }
      else { txt = `بعد ${d} يوم`; bg = 'var(--ok-bg)'; col = 'var(--ok)'; }
      const clickHandler = it.kind === 'task' ? `openTaskForm('${esc(it.id)}')` : `openExamForm('${esc(it.id)}')`;
      return `<div class="up-item" onclick="${clickHandler}"><div class="up-dot" style="background:${courseColor(it.courseId)}"></div>
        <div class="up-info"><b>${it.ico} ${esc(it.title)}</b><span>${it.kind === 'task' ? 'مهمة' : 'اختبار'} · ${esc(courseName(it.courseId))} · ${fmtDate(it.date)}</span></div>
        <div class="up-time" style="background:${bg};color:${col}">${txt}</div></div>`;
    }).join('');
  }

  const nowDay = new Date().getDay();
  const todays = live(state.schedule).filter(s => +s.day === nowDay).sort((a,b) => toMin(a.start) - toMin(b.start));
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

function renderDashHealth(){
  const el = document.getElementById('dashHealth');
  if(!el) return;
  const today = todayISO();
  const teethLog = live(state.health.teethLog).find(l => l.date === today) || { morning: false, night: false };
  const teethCount = (teethLog.morning?1:0) + (teethLog.night?1:0);
  const w = state.wellness;
  const wLog = live(w.log).find(l => l.date === today) || { sleep: 0, water: 0 };
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div style="background:var(--hover);padding:14px;border-radius:13px;text-align:center;cursor:pointer;border:1px solid var(--border)" onclick="go('teeth')">
        <div style="font-size:22px">🦷</div>
        <div style="font-size:11.5px;color:var(--muted);font-weight:700;margin-top:4px">تفريش الأسنان</div>
        <div style="font-family:'Cairo',system-ui,sans-serif;font-size:18px;font-weight:800;color:var(--p);margin-top:2px">${teethCount}/2</div>
      </div>
      <div style="background:var(--hover);padding:14px;border-radius:13px;text-align:center;cursor:pointer;border:1px solid var(--border)" onclick="go('wellness')">
        <div style="font-size:22px">😴</div>
        <div style="font-size:11.5px;color:var(--muted);font-weight:700;margin-top:4px">ساعات النوم</div>
        <div style="font-family:'Cairo',system-ui,sans-serif;font-size:18px;font-weight:800;color:var(--p);margin-top:2px">${wLog.sleep}/${w.sleepGoal}</div>
      </div>
      <div style="background:var(--hover);padding:14px;border-radius:13px;text-align:center;cursor:pointer;border:1px solid var(--border)" onclick="go('wellness')">
        <div style="font-size:22px">💧</div>
        <div style="font-size:11.5px;color:var(--muted);font-weight:700;margin-top:4px">أكواب الماء</div>
        <div style="font-family:'Cairo',system-ui,sans-serif;font-size:18px;font-weight:800;color:var(--p);margin-top:2px">${wLog.water}/${w.waterGoal}</div>
      </div>
    </div>
    <button class="btn btn-ghost btn-block" style="margin-top:12px" onclick="go('wellness')">فتح متابع الصحة اليومية →</button>`;
}

/* ============================================================
   15) رندرة المقررات
============================================================ */
function renderCourses(){
  const grid = document.getElementById('coursesGrid');
  if(!grid) return;
  const activeCourses = live(state.courses);
  const activeSchedule = live(state.schedule);
  const activeTasks = live(state.tasks);
  document.getElementById('coursesCount').textContent = activeCourses.length
    ? `${activeCourses.length} مقرر · ${activeCourses.reduce((a,c) => a + (+c.credits||0), 0)} ساعة معتمدة · اضغط أي بطاقة للتفاصيل`
    : 'لم تضف أي مقرر بعد';
  if(!activeCourses.length){
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="e-ico">📚</div><b>لا توجد مقررات</b><p>ابدأ بإضافة مقرراتك لهذا الفصل</p><button class="btn btn-primary" onclick="openCourseForm()">➕ إضافة مقرر</button></div>`;
    return;
  }
  grid.innerHTML = activeCourses.map(c => {
    const classes = activeSchedule.filter(s => s.courseId === c.id).length;
    const tasks = activeTasks.filter(t => t.courseId === c.id && !t.done).length;
    const total = courseTotal(c);
    return `<div class="course-card" onclick="openCourseDetail('${esc(c.id)}')">
      <div class="course-bar" style="background:${c.color}"></div>
      <div class="course-body">
        <h3>${esc(c.name)}</h3>
        <div class="code">${esc(c.code || '—')}${c.teacher ? ' · ' + esc(c.teacher) : ''}</div>
        <div class="course-meta">
          <span class="pill">${c.credits || 0} ساعات</span>
          <span class="pill">${classes} محاضرة</span>
          ${tasks ? `<span class="pill" style="background:var(--warn-bg);color:var(--warn);border-color:transparent">${tasks} مهمة</span>` : ''}
          ${total !== null ? `<span class="pill" style="background:var(--ok-bg);color:var(--ok);border-color:transparent">${total.toFixed(1)}%</span>` : ''}
        </div>
        <div class="course-actions">
          <button onclick="event.stopPropagation();openCourseForm('${esc(c.id)}')">✏️ تعديل</button>
          <button onclick="event.stopPropagation();deleteCourse('${esc(c.id)}')">🗑️ حذف</button>
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
  if(!list) return;
  const activeTasks = live(state.tasks);
  const activeExams = live(state.exams);
  const openTasksCount = activeTasks.filter(t => !t.done).length;
  const upcomingExamsCount = activeExams.filter(e => !e.done && daysUntil(e.date) >= 0).length;
  document.getElementById('tasksCount').textContent = `${activeTasks.length} مهمة · ${activeExams.length} اختبار · ${openTasksCount + upcomingExamsCount} متبقي`;
  let items = [];
  activeTasks.forEach(t => { items.push({ kind:'task', date:t.due, done:!!t.done, data:t }); });
  activeExams.forEach(e => { items.push({ kind:'exam', date:e.date, done:!!e.done, data:e }); });

  const q = (document.getElementById('taskSearchInput')?.value || '').trim().toLowerCase();
  if(q){
    items = items.filter(it => {
      const title = (it.data.title || '').toLowerCase();
      const cName = courseName(it.data.courseId).toLowerCase();
      const notes = (it.data.notes || '').toLowerCase();
      return title.includes(q) || cName.includes(q) || notes.includes(q);
    });
  }

  const td = todayISO();
  if(taskFilter === 'tasks') items = items.filter(x => x.kind === 'task');
  else if(taskFilter === 'exams') items = items.filter(x => x.kind === 'exam');
  else if(taskFilter === 'today') items = items.filter(x => x.date === td);
  else if(taskFilter === 'week') items = items.filter(x => { const d = daysUntil(x.date); return d >= 0 && d <= 7; });
  else if(taskFilter === 'late') items = items.filter(x => !x.done && daysUntil(x.date) < 0);
  else if(taskFilter === 'done') items = items.filter(x => x.done);

  items.sort((a,b) => {
    if(a.done !== b.done) return a.done ? 1 : -1;
    return (a.date || '').localeCompare(b.date || '');
  });
  if(!items.length){
    list.innerHTML = `<div class="empty"><div class="e-ico">📋</div><b>لا توجد نتائج مطابقة</b><p>أضف مهمة أو اختبار جديد، أو غيّر الفلتر</p><button class="btn btn-primary" onclick="openAddForm()">➕ إضافة جديدة</button></div>`;
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
  let dueTxt, dueBg, dueCol = 'var(--text)';
  if(t.done){ dueTxt = 'منجزة'; dueBg = 'var(--ok-bg)'; dueCol = 'var(--ok)'; }
  else if(d < 0){ dueTxt = `متأخر ${Math.abs(d)} يوم`; dueBg = 'var(--danger-bg)'; dueCol = 'var(--danger)'; }
  else if(d === 0){ dueTxt = 'اليوم'; dueBg = 'var(--danger-bg)'; dueCol = 'var(--danger)'; }
  else if(d === 1){ dueTxt = 'غداً'; dueBg = 'var(--warn-bg)'; dueCol = 'var(--warn)'; }
  else { dueTxt = `بعد ${d} يوم`; dueBg = 'var(--hover)'; dueCol = 'var(--muted)'; }
  const p = prioMap[t.priority] || prioMap.med;
  return `<div class="task ${t.done?'done':''}">
    <div class="chk" onclick="toggleTask('${esc(t.id)}')">✓</div>
    <div class="task-main">
      <div class="task-title">📝 ${esc(t.title)}</div>
      <div class="task-sub">
        <span class="tag" style="background:${courseColor(t.courseId)}22;color:${courseColor(t.courseId)}">${esc(courseName(t.courseId))}</span>
        <span class="tag" style="background:var(--hover);color:var(--muted)">${esc(t.type)}</span>
        <span class="tag" style="background:${p.bg};color:${p.c}">${p.t}</span>
        <span class="tag" style="background:${dueBg};color:${dueCol}">📅 ${fmtDate(t.due)} (${dueTxt})</span>
      </div>
      ${t.notes ? `<div style="font-size:12.5px;color:var(--muted);margin-top:8px">${esc(t.notes)}</div>` : ''}
    </div>
    <div class="task-actions">
      <button class="mini-btn" onclick="openTaskForm('${esc(t.id)}')" title="تعديل">✏️</button>
      <button class="mini-btn del" onclick="deleteTask('${esc(t.id)}')" title="حذف">🗑️</button>
    </div>
  </div>`;
}
function renderExamItem(e){
  const d = daysUntil(e.date);
  let dueTxt, dueBg, dueCol = 'var(--text)';
  if(e.done){ dueTxt = 'منجز'; dueBg = 'var(--ok-bg)'; dueCol = 'var(--ok)'; }
  else if(d < 0){ dueTxt = 'انتهى'; dueBg = 'var(--hover)'; dueCol = 'var(--muted)'; }
  else if(d === 0){ dueTxt = 'اليوم!'; dueBg = 'var(--danger-bg)'; dueCol = 'var(--danger)'; }
  else if(d === 1){ dueTxt = 'غداً'; dueBg = 'var(--danger-bg)'; dueCol = 'var(--danger)'; }
  else if(d <= 7){ dueTxt = `بعد ${d} يوم`; dueBg = 'var(--warn-bg)'; dueCol = 'var(--warn)'; }
  else { dueTxt = `بعد ${d} يوم`; dueBg = 'var(--ok-bg)'; dueCol = 'var(--ok)'; }
  return `<div class="exam-item ${e.done ? 'past' : ''}" style="${e.done ? 'opacity:.55' : ''}">
    <div class="chk ${e.done ? 'checked' : ''}" onclick="toggleExam('${esc(e.id)}')">✓</div>
    <div class="ex-ico">⏰</div>
    <div class="ex-main">
      <div class="ex-title" style="${e.done ? 'text-decoration:line-through' : ''}">${esc(e.title)}</div>
      <div class="ex-sub">
        <span class="tag" style="background:${courseColor(e.courseId)}22;color:${courseColor(e.courseId)}">${esc(courseName(e.courseId))}</span>
        <span class="tag" style="background:var(--hover);color:var(--muted)">${esc(e.type)}</span>
        <span class="tag" style="background:${dueBg};color:${dueCol}">📅 ${fmtDate(e.date)} (${dueTxt})</span>
        ${e.time ? `<span class="tag" style="background:var(--hover);color:var(--muted)">🕐 ${to12(e.time)}</span>` : ''}
        ${e.place ? `<span class="tag" style="background:var(--hover);color:var(--muted)">📍 ${esc(e.place)}</span>` : ''}
      </div>
      ${e.notes ? `<div style="font-size:12.5px;color:var(--muted);margin-top:8px">${esc(e.notes)}</div>` : ''}
    </div>
    <div class="task-actions">
      <button class="mini-btn" onclick="openExamForm('${esc(e.id)}')" title="تعديل">✏️</button>
      <button class="mini-btn del" onclick="deleteExam('${esc(e.id)}')" title="حذف">🗑️</button>
    </div>
  </div>`;
}

function savePomoSettings(){
  const nowTs = Date.now();
  state.settings.pomo = {
    work: Math.max(1, +document.getElementById('setWork').value || 25),
    short: Math.max(1, +document.getElementById('setShort').value || 5),
    long: Math.max(1, +document.getElementById('setLong').value || 15),
    updatedAt: nowTs,
    _fieldTs: { work: nowTs, short: nowTs, long: nowTs }
  };
  touchField(state.settings, 'pomo', nowTs);
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
    title: 'حذف كل البيانات',
    emoji: '⚠️',
    okText: 'حذف الكل نهائياً',
    variant: 'danger',
    requireText: 'حذف',
    placeholder: 'اكتب: حذف',
    hintText: 'للتأكيد على الحذف النهائي، اكتب كلمة "حذف" في الحقل أدناه:'
  });
  if(!ok) return;

  if(pomo.intervalId) clearInterval(pomo.intervalId);
  pomo.running = false;
  pomo.endTimestamp = null;
  pomo.workCount = 0;
  pomo.mode = 'work';
  pomo.total = pomoDuration('work');
  pomo.pausedRemaining = pomo.total;
  pomo.courseId = '';
  pomo.startedDate = null;

  if(getMyChatId()) syncPomoCancelToServer();

  _stateEpoch++;
  state = defaultState();
  currentCourseId = null;
  try{ localStorage.removeItem(POMO_STORE_KEY); }catch(e){}
  if(getMyChatId()){ window.__forceSync = true; setTimeout(() => { window.__forceSync = false; }, 3000); }
  save(); applySettings(); renderAll(); closeModal();
  toast('🗑️ تم حذف كل البيانات');
}

/* ============================================================
   20) applySettings
============================================================ */
function applySettings(){
  document.documentElement.dataset.theme = state.settings.theme || 'light';
  updateThemeColorMeta(state.settings.theme || 'light');
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
  const gpaScaleEl = document.getElementById('setGpaScale');
  if(gpaScaleEl) gpaScaleEl.value = String(getGpaScale());
  const absLimEl = document.getElementById('setAbsenceLimit');
  if(absLimEl) absLimEl.value = getAbsenceLimitPercent();
  const dw = getDefaultGradeWeights();
  const hwEl = document.getElementById('setWeightHw');
  const qzEl = document.getElementById('setWeightQuiz');
  const midEl = document.getElementById('setWeightMid');
  const finEl = document.getElementById('setWeightFinal');
  if(hwEl) hwEl.value = dw.hw;
  if(qzEl) qzEl.value = dw.quiz;
  if(midEl) midEl.value = dw.midterm;
  if(finEl) finEl.value = dw.final;
  const hijriEl = document.getElementById('setShowHijri');
  if(hijriEl) hijriEl.checked = Boolean(state.settings.showHijri);
  if(typeof renderWeekBadge === 'function') renderWeekBadge();
  renderPinSettingsUI();
}

/* ============================================================
   23) القائمة الجانبية، شريط الآيباد، والتجاوب الحي مع الدوران
============================================================ */
function toggleSidebarRail(){
  const sb = document.getElementById('sidebar');
  if(!sb) return;
  if(isIpadPortraitRailViewport()){
    sb.classList.toggle('rail-expanded');
  } else if(isPhoneViewport()){
    toggleMobileSidebarDrawer();
  }
}

function toggleMobileSidebarDrawer(){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  if(!sb || !ov) return;
  const willOpen = !sb.classList.contains('open');
  sb.classList.toggle('open', willOpen);
  ov.classList.toggle('show', willOpen);
  syncBodyScrollLock();
}

function handleViewportChange(){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  if(!isPhoneViewport() && sb && ov){
    if(sb.classList.contains('open') || ov.classList.contains('show')){
      sb.classList.remove('open');
      ov.classList.remove('show');
    }
  }
  if(!isIpadPortraitRailViewport() && sb){
    sb.classList.remove('rail-expanded');
  }
  syncBodyScrollLock();
  syncScheduleViewportMode();
  renderSchedDaySwitcher();
}

function setupVisualViewportKeyboardHandler(){
  try{
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize', () => {
        const vv = window.visualViewport;
        const kbHeight = Math.max(0, (window.innerHeight || vv.height) - vv.height);
        document.documentElement.style.setProperty('--kb-offset', kbHeight + 'px');
        if(kbHeight > 100 && document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)){
          setTimeout(() => {
            try{ document.activeElement.scrollIntoView({ block: 'center', behavior: 'smooth' }); }catch(_){}
          }, 60);
        }
      });
    }
    document.addEventListener('focusin', (e) => {
      const el = e.target;
      if(el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && isPhoneViewport()){
        setTimeout(() => {
          try{ el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }catch(_){}
        }, 180);
      }
    });
  }catch(_){}
}

window.addEventListener('resize', handleViewportChange);
window.addEventListener('orientationchange', () => { setTimeout(handleViewportChange, 80); });

document.getElementById('hamburger')?.addEventListener('click', () => {
  if(isIpadPortraitRailViewport()){
    toggleSidebarRail();
  } else {
    toggleMobileSidebarDrawer();
  }
});
document.getElementById('overlay')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.remove('open', 'rail-expanded');
  document.getElementById('overlay')?.classList.remove('show');
  syncBodyScrollLock();
});
document.getElementById('taskFilters')?.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if(!chip) return;
  document.querySelectorAll('#taskFilters .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  taskFilter = chip.dataset.f;
  renderTasks();
});

/* ============================================================
   24) رندرة شاملة لكل الواجهات
============================================================ */
function renderAll(){
  renderDashboard(); renderSchedule(); renderCourses(); renderTasks();
  renderGrades(); renderStudy(); pomoRender();
  renderBalance(); renderExpenses(); renderGoals();
  renderWellness(); renderTeeth(); renderAttendancePage(); renderArchive();
  updateNavBadges();
  if(currentCourseId) renderCourseDetail();
}

/* ============================================================
   28) النوم والماء
============================================================ */
function renderWellness(){
  const el = document.getElementById('wellnessContent');
  if(!el) return;
  try{
    const w = state.wellness;
    const activeWLog = live(w.log);
    const today = todayISO();
    const todayLog = activeWLog.find(l => l.date === today) || { sleep:0, water:0 };
    const sleepPct = Math.min(100, Math.round((todayLog.sleep / w.sleepGoal) * 100));
    const waterPct = Math.min(100, Math.round((todayLog.water / w.waterGoal) * 100));
    const last7 = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = todayISO(d);
      const log = activeWLog.find(l => l.date === iso) || { sleep:0, water:0 };
      last7.push({ day: DAYS_SHORT[d.getDay()], ...log });
    }
    const maxSleep = Math.max(...last7.map(x => x.sleep), w.sleepGoal);
    const maxWater = Math.max(...last7.map(x => x.water), w.waterGoal);
    el.innerHTML = `
      <div class="grid g2" style="margin-bottom:16px">
        <div class="card" style="padding:22px">
          <div style="text-align:center;margin-bottom:16px"><div style="font-size:52px;line-height:1">😴</div><h3 style="font-size:19px;margin-top:8px">النوم اليوم</h3></div>
          <div style="text-align:center;margin-bottom:14px"><b style="font-family:'Cairo',system-ui,sans-serif;font-size:42px;color:var(--p)">${todayLog.sleep}</b><span style="font-size:15px;color:var(--muted)"> / ${w.sleepGoal} ساعات</span></div>
          <div class="prog" style="height:10px;margin-bottom:16px"><i style="width:${sleepPct}%"></i></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${[4,5,6,7,8,9,10].map(h => `<button class="btn btn-ghost btn-sm" style="flex:1;min-width:40px" onclick="addSleep(${h})">${h}h</button>`).join('')}</div>
        </div>
        <div class="card" style="padding:22px">
          <div style="text-align:center;margin-bottom:16px"><div style="font-size:52px;line-height:1">💧</div><h3 style="font-size:19px;margin-top:8px">شرب الماء اليوم</h3></div>
          <div style="text-align:center;margin-bottom:14px"><b style="font-family:'Cairo',system-ui,sans-serif;font-size:42px;color:#0891b2">${todayLog.water}</b><span style="font-size:15px;color:var(--muted)"> / ${w.waterGoal} أكواب</span></div>
          <div class="prog" style="height:10px;margin-bottom:16px"><i style="width:${waterPct}%;background:#0891b2"></i></div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="flex:2" onclick="addWater(1)">🥤 + كوب</button>
            <button class="btn btn-ghost btn-sm" style="flex:1" onclick="addWater(-1)">➖</button>
            <button class="btn btn-ghost btn-sm" style="flex:1" onclick="resetWater()">↺ تصفير</button>
          </div>
        </div>
      </div>
      <div class="card" style="padding:20px;margin-bottom:16px">
        <h3 style="font-size:16px;margin-bottom:14px">📊 آخر 7 أيام — النوم</h3>
        <div class="week-bars">${last7.map(d => `<div class="wbar"><span class="wbar-val">${d.sleep || ''}</span><div class="wbar-fill" style="height:${Math.max((d.sleep/maxSleep)*100, 3)}%"></div><span class="wbar-lbl">${d.day}</span></div>`).join('')}</div>
      </div>
      <div class="card" style="padding:20px">
        <h3 style="font-size:16px;margin-bottom:14px">📊 آخر 7 أيام — الماء</h3>
        <div class="week-bars">${last7.map(d => `<div class="wbar"><span class="wbar-val" style="color:#0891b2">${d.water || ''}</span><div class="wbar-fill" style="height:${Math.max((d.water/maxWater)*100, 3)}%;background:linear-gradient(180deg,#0891b2,#0e7490)"></div><span class="wbar-lbl">${d.day}</span></div>`).join('')}</div>
      </div>`;
  }catch(e){ el.innerHTML = '<div class="empty"><b>خطأ في العرض</b></div>'; }
}
function getOrCreateTodayWellness(){
  const today = todayISO();
  let log = state.wellness.log.find(l => l.date === today);
  if(!log){ log = { date: today, sleep: 0, water: 0, updatedAt: Date.now() }; state.wellness.log.push(log); }
  else if(log.deleted){ log.sleep = 0; log.water = 0; touchItem(log); }
  return log;
}
function addSleep(h){ const log = getOrCreateTodayWellness(); log.sleep = h; touchItem(log); save(); renderWellness(); renderDashHealth(); toast(`😴 سجّلت ${h} ساعات نوم`); }
function addWater(delta = 1){ const log = getOrCreateTodayWellness(); log.water = Math.max(0, (log.water || 0) + delta); touchItem(log); save(); renderWellness(); renderDashHealth(); }
function resetWater(){ const log = getOrCreateTodayWellness(); log.water = 0; touchItem(log); save(); renderWellness(); renderDashHealth(); }

/* ============================================================
   29) نظافة الأسنان
============================================================ */
function renderTeeth(){
  const today = todayISO();
  const activeTeeth = live(state.health.teethLog);
  let log = activeTeeth.find(l => l.date === today);
  if(!log){ log = { date: today, morning: false, night: false }; }
  const mBtn = document.getElementById('teethMorningBtn');
  const nBtn = document.getElementById('teethNightBtn');
  if(mBtn){ mBtn.classList.toggle('done', log.morning); mBtn.innerHTML = `<span class="t-ico">🌅</span>تفريش الصباح${log.morning ? '<div style="font-size:11px;margin-top:6px">✓ تم اليوم</div>' : ''}`; }
  if(nBtn){ nBtn.classList.toggle('done', log.night); nBtn.innerHTML = `<span class="t-ico">🌙</span>تفريش الليل${log.night ? '<div style="font-size:11px;margin-top:6px">✓ تم اليوم</div>' : ''}`; }
  const statsEl = document.getElementById('teethStats');
  if(statsEl){
    const last7 = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = todayISO(d);
      const l = activeTeeth.find(x => x.date === iso) || { morning:false, night:false };
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
  if(!log){ log = { date: today, morning: false, night: false, updatedAt: Date.now() }; state.health.teethLog.push(log); }
  else if(log.deleted){ log.morning = false; log.night = false; delete log.deleted; }
  log[period] = !log[period];
  touchItem(log);
  save(); renderTeeth(); renderDashHealth();
  toast(log[period] ? '✅ تم التسجيل' : '↺ تم الإلغاء');
}

/* ============================================================
   30) أرشيف الفصول
============================================================ */
function renderArchive(){
  const el = document.getElementById('archiveContent');
  if(!el) return;
  const activeArchive = live(state.archive);
  el.innerHTML = `
    <div class="card" style="padding:22px;margin-bottom:20px">
      <h3 style="font-size:17px;margin-bottom:8px">💾 أرشفة الفصل الحالي</h3>
      <p style="font-size:13.5px;color:var(--muted);margin-bottom:14px;line-height:1.7">يحفظ نسخة كاملة من مقرراتك وجدولك ومهامك ودرجاتك الحالية للرجوع إليها لاحقاً.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input id="archiveName" placeholder="مثال: الفصل الأول 1448هـ" style="flex:2;min-width:180px;padding:11px 14px;border-radius:11px;border:1.5px solid var(--border);background:var(--bg);font-size:16px">
        <button class="btn btn-primary" onclick="createArchive()">💾 أرشفة الآن</button>
      </div>
    </div>
    ${activeArchive.length ? `
      <h3 style="font-size:17px;margin-bottom:14px">📚 الفصول المؤرشفة (${activeArchive.length})</h3>
      <div style="display:grid;gap:12px">
        ${activeArchive.map((a, i) => `<div class="card" style="padding:18px;border-inline-start:4px solid var(--p)">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div><h4 style="font-size:16.5px;margin-bottom:4px">${esc(a.name)}</h4>
              <span style="font-size:12.5px;color:var(--muted);font-weight:700">📅 ${new Date(a.created).toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'})}</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" onclick="viewArchive(${i})">👁️ عرض واستعادة</button>
              <button class="btn btn-danger btn-sm" onclick="deleteArchive(${i})">🗑️</button>
            </div></div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:12.5px;color:var(--muted);font-weight:700">
            <span>📚 ${a.data?.courses?.length || 0} مقرر</span>
            <span>📋 ${(a.data?.tasks?.length || 0) + (a.data?.exams?.length || 0)} مهمة واختبار</span>
          </div></div>`).join('')}
      </div>
    ` : `<div class="empty"><div class="e-ico">🗂️</div><b>لا يوجد أرشيف</b><p>أرشف فصلك الدراسي الحالي لحفظه في سجلك</p></div>`}`;
}
function createArchive(){
  const inp = document.getElementById('archiveName');
  const name = inp ? inp.value.trim() : '';
  if(!name){ toast('⚠️ اكتب اسم الفصل'); return; }
  state.archive.push({
    id: uid(), name, created: new Date().toISOString(), updatedAt: Date.now(),
    data: JSON.parse(JSON.stringify({
      courses: live(state.courses), schedule: live(state.schedule),
      tasks: live(state.tasks), exams: live(state.exams),
      studyLog: live(state.studyLog), attendance: live(state.attendance),
      gpaCourses: live(state.gpaCourses)
    }))
  });
  save(); renderArchive(); toast('✅ تمت أرشفة الفصل');
}
function viewArchive(i){
  const a = live(state.archive)[i]; if(!a) return;
  const d = a.data || {};
  openModal(`📚 ${a.name}`, `
    <div style="background:var(--hover);padding:16px;border-radius:12px;margin-bottom:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13.5px;font-weight:700">
        <div>📚 <b>${d.courses?.length || 0}</b> مقرر</div><div>📅 <b>${d.schedule?.length || 0}</b> محاضرة</div>
        <div>📝 <b>${d.tasks?.length || 0}</b> مهمة</div><div>⏰ <b>${d.exams?.length || 0}</b> اختبار</div>
      </div>
    </div>`, `<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button><button class="btn btn-primary" onclick="loadArchive(${i})">🔄 استعادة هذا الفصل</button>`);
}
async function loadArchive(i){
  const a = live(state.archive)[i]; if(!a) return;
  const ok = await appConfirm('سيتم استبدال البيانات الحالية ببيانات هذا الأرشيف. متابعة؟', {
    title: 'استعادة الأرشيف', emoji: '🔄', okText: 'استعادة', variant: 'warn'
  });
  if(!ok) return;
  const d = JSON.parse(JSON.stringify(a.data || {}));
  const nowTs = Date.now();
  for(const k of ['courses','schedule','tasks','exams','studyLog','attendance','gpaCourses']){
    (state[k] || []).forEach(it => tombstoneItem(it));
    const restored = Array.isArray(d[k]) ? d[k] : [];
    restored.forEach(it => {
      it.updatedAt = nowTs + 1;
      delete it.deleted;
      state[k].push(it);
    });
  }
  currentCourseId = null;
  save(); closeModal(); renderAll();
  toast('✅ تمت استعادة الفصل');
}
async function deleteArchive(i){
  const ok = await appConfirm('حذف هذا الأرشيف؟', {
    title: 'حذف الأرشيف', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  const a = live(state.archive)[i];
  if(a) tombstoneItem(a);
  save(); renderArchive(); toast('🗑️ تم');
}

/* ============================================================
   31) شارة الأسبوع الدراسي
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
    const gregStr = today.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    if(state.settings.showHijri){
      const hijriStr = formatHijriDate(today, { day:'numeric', month:'short' });
      wbDateBadge.textContent = hijriStr ? `${gregStr} · ${hijriStr}` : gregStr;
    } else {
      wbDateBadge.textContent = gregStr;
    }
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
function saveSemesterSettings(){
  const start = document.getElementById('setSemesterStart').value;
  const weeks = +document.getElementById('setSemesterWeeks').value || 16;
  if(!start){ toast('⚠️ اختر تاريخ بداية الفصل'); return; }
  state.settings.semesterStart = start;
  state.settings.semesterWeeks = Math.max(8, Math.min(30, weeks));
  touchField(state.settings, 'semesterStart');
  touchField(state.settings, 'semesterWeeks');
  save(); applySettings(); renderWeekBadge(); renderAcademicStrip(); renderDashboard();
  toast('✅ تم حفظ إعدادات الفصل');
}
function saveAcademicPreferences(){
  const scaleEl = document.getElementById('setGpaScale');
  const absEl = document.getElementById('setAbsenceLimit');
  const hwEl = document.getElementById('setWeightHw');
  const qzEl = document.getElementById('setWeightQuiz');
  const midEl = document.getElementById('setWeightMid');
  const finEl = document.getElementById('setWeightFinal');
  const hijriEl = document.getElementById('setShowHijri');

  const scale = (+scaleEl?.value === 4) ? 4 : 5;
  const absLimit = Math.max(5, Math.min(50, +absEl?.value || 25));
  const hw = Math.max(0, Math.min(100, +hwEl?.value || 0));
  const quiz = Math.max(0, Math.min(100, +qzEl?.value || 0));
  const midterm = Math.max(0, Math.min(100, +midEl?.value || 0));
  const finalW = Math.max(0, Math.min(100, +finEl?.value || 0));
  if(hw + quiz + midterm + finalW !== 100){
    toast(`⚠️ مجموع أوزان المكونات يجب أن يساوي 100% (الحالي: ${hw + quiz + midterm + finalW}%)`);
    return;
  }
  const nowTs = Date.now();
  state.settings.gpaScale = scale;
  state.settings.absenceLimit = absLimit;
  state.settings.defaultWeights = { hw, quiz, midterm, final: finalW };
  state.settings.showHijri = Boolean(hijriEl?.checked);
  touchField(state.settings, 'gpaScale', nowTs);
  touchField(state.settings, 'absenceLimit', nowTs);
  touchField(state.settings, 'defaultWeights', nowTs);
  touchField(state.settings, 'showHijri', nowTs);
  save();
  applySettings();
  renderAll();
  toast('✅ تم حفظ إعدادات المعدل والغياب والتقويم');
}

/* ============================================================
   33) اختصارات الكيبورد
============================================================ */
document.addEventListener('keydown', e => {
  const pinOpen = document.getElementById('pinOverlay')?.classList.contains('open');
  if(pinOpen){
    if(e.key >= '0' && e.key <= '9') pressPinKey(e.key);
    else if(e.key === 'Backspace') backspacePinKey();
    return;
  }
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
    e.preventDefault();
    quickAdd();
  }
});

/* ============================================================
   34) تصدير واستيراد JSON
============================================================ */
function exportData(){
  try{
    const data = {
      version: 2,
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
    state.settings.lastExportAt = Date.now();
    touchField(state.settings, 'lastExportAt');
    save(false);
    renderDashBackupReminder();
    toast('✅ تم تصدير النسخة الاحتياطية');
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
    let parsed;
    try{
      parsed = JSON.parse(text);
    }catch(_){
      throw new Error('صيغة JSON غير صالحة في الملف');
    }
    _stateEpoch++;
    state = sanitizeAndValidateSchema(parsed);
    save(false);
    try{ localStorage.setItem('localModified', Date.now().toString()); }catch(_){}
    applySettings();
    renderAll();
    renderSyncStatus();
    renderWeekBadge();
    renderAcademicStrip();
    toast('✅ تم استيراد البيانات بنجاح');
    if(getMyChatId()){
      if(syncTimeout) clearTimeout(syncTimeout);
      window.__forceSync = true;
      setTimeout(() => { window.__forceSync = true; doSync(true); }, 300);
    }
  }catch(e){
    console.error(e);
    toast('❌ فشل الاستيراد: ' + (e.message || 'ملف غير صالح'));
  }
  input.value = '';
}

/* ============================================================
   35) فحص الاتصال الشامل
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
    label: 'جلسة المصادقة (Token)',
    detail: token ? `${token.slice(0,8)}...` : 'غير متوفرة — اربط تلقرام لتفعيلها'
  });
  let serverOk = false;
  let serverTime = 0;
  try{
    const t0 = Date.now();
    const r = await fetch(TG_WORKER + (chatId ? '/load' : '/'), { headers: authHeaders() });
    serverTime = Date.now() - t0;
    serverOk = r.ok;
  }catch(e){ serverOk = false; }
  results.push({
    ok: serverOk,
    warn: !serverOk,
    label: 'استجابة سيرفر Worker',
    detail: serverOk ? `${serverTime}ms ✅` : 'تعذّر الاتصال بالسيرفر'
  });
  let lastSync = 0; try{ lastSync = parseInt(localStorage.getItem('localModified') || '0'); }catch(_){}
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
    label: 'آخر تحديث للبيانات',
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
    label: 'حجم التخزين المحلي',
    detail: `${sizeKB} KB`
  });
  results.push({
    ok: true,
    warn: false,
    label: 'ملخص السجلات',
    detail: `${live(state.courses).length} مقرر · ${live(state.tasks).length} مهمة · ${live(state.exams).length} اختبار · ${live(state.money.expenses).length} مصروف · ${live(state.money.incomes).length} إضافة رصيد`
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
   36) حذف جزئي وتجديد التوكن وأهداف الصحة
============================================================ */
async function partialDelete(section){
  const labels = {
    studyLog: 'سجل المذاكرة',
    wellness: 'سجل النوم والماء',
    teeth: 'سجل تفريش الأسنان',
    attendance: 'سجل الحضور والغياب',
    expenses: 'المصاريف',
    incomes: 'الفلوس المضافة (الدخل)',
    archive: 'الأرشيف'
  };
  const label = labels[section] || section;
  const ok = await appConfirm(`سيتم حذف كل ${label} نهائياً. متابعة؟`, {
    title: `حذف ${label}`, emoji: '🗑️', okText: 'حذف', variant: 'danger'
  });
  if(!ok) return;
  if(section === 'studyLog') (state.studyLog || []).forEach(it => tombstoneItem(it));
  else if(section === 'wellness') (state.wellness.log || []).forEach(it => tombstoneItem(it));
  else if(section === 'teeth') (state.health.teethLog || []).forEach(it => tombstoneItem(it));
  else if(section === 'attendance') (state.attendance || []).forEach(it => tombstoneItem(it));
  else if(section === 'expenses') (state.money.expenses || []).forEach(it => tombstoneItem(it));
  else if(section === 'incomes') (state.money.incomes || []).forEach(it => tombstoneItem(it));
  else if(section === 'archive') (state.archive || []).forEach(it => tombstoneItem(it));
  save();
  renderAll();
  renderSyncStatus();
  toast(`🗑️ تم حذف ${label}`);
}

function saveHealthGoals(){
  const sleepEl = document.getElementById('setSleepGoal');
  const waterEl = document.getElementById('setWaterGoal');
  const sleep = Math.max(1, Math.min(24, +sleepEl.value || 8));
  const water = Math.max(1, Math.min(30, +waterEl.value || 8));
  state.wellness.sleepGoal = sleep;
  state.wellness.waterGoal = water;
  touchField(state.wellness, 'sleepGoal');
  touchField(state.wellness, 'waterGoal');
  save();
  renderWellness();
  renderDashHealth();
  toast('✅ تم حفظ أهداف الصحة');
}

