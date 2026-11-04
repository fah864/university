/* ============================================================================
   🎓 مُساعد الجامعة — ai.js (المساعد الذكي الشامل Omni-AI، المحلل المحلي، وتهيئة التطبيق)
   ============================================================================ */

/* ============================================================
   22) الإضافة السريعة والمحرك الذكي الشامل (Omni-Agent AI)
============================================================ */
function quickAdd(){
  openModal('⚡ إضافة سريعة', `
    <div style="display:grid;gap:10px">
      <button class="btn btn-primary btn-block" style="justify-content:center;padding:16px;font-size:15px;background:linear-gradient(135deg,#0d9488,#0891b2);box-shadow:0 8px 24px rgba(13,148,136,.35)" onclick="closeModal();openAiModal()">
        🤖 <span style="margin-inline-start:6px">المساعد الذكي الشامل (يسوي كل شيء!)</span>
      </button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px" onclick="closeModal();openTaskForm()">📝 مهمة</button>
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px" onclick="closeModal();openExamForm()">⏰ اختبار</button>
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px" onclick="closeModal();openClassForm()">📅 محاضرة</button>
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px" onclick="closeModal();openCourseForm()">📚 مقرر</button>
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px;color:var(--danger)" onclick="closeModal();openExpenseForm()">💸 مصروف</button>
        <button class="btn btn-ghost btn-block" style="justify-content:center;padding:14px;font-size:13.5px;color:var(--ok)" onclick="closeModal();openIncomeForm()">➕ زيادة فلوس</button>
      </div>
    </div>
  `, `<button class="btn btn-ghost btn-block" onclick="closeModal()">إغلاق</button>`);
}

let aiFileData = null;
let aiAbortController = null;

function setAiChipPrompt(txt){
  const el = document.getElementById('aiText');
  if(el){ el.value = txt; el.focus(); }
}

function openAiModal(){
  aiFileData = null;
  openModal('🤖 المساعد الذكي الشامل (Omni-AI)', `
    <div style="background:linear-gradient(135deg,#0d948820,#0891b220);padding:14px 16px;border-radius:14px;margin-bottom:14px;border:1px solid #0d948840">
      <div style="font-size:13.5px;line-height:1.8;font-weight:700;color:var(--text)">
        ✨ <b>اكتب أي شيء (حتى لو عدة طلبات معاً!)</b> أو <b>ارفع صورة</b> — والذكاء الاصطناعي ينفذها فوراً:
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
        <button type="button" class="chip" style="font-size:11.5px;padding:5px 10px" onclick="setAiChipPrompt('تغديت بـ 40 ريال، وأبوي حول لي 300 ريال، وعندي واجب تفاضل بكرة')">💸 مصروف + زيادة فلوس + واجب</button>
        <button type="button" class="chip" style="font-size:11.5px;padding:5px 10px" onclick="setAiChipPrompt('أضف مقرر فيزياء عامة 3 ساعات، ومحاضرته كل أحد وثلاثاء من 9 إلى 10:30 قاعة 204')">📚 مقرر + محاضراته</button>
        <button type="button" class="chip" style="font-size:11.5px;padding:5px 10px" onclick="setAiChipPrompt('نمت 7 ساعات وشربت 6 أكواب موية وفرشت أسناني الصباح وذاكرت ساعتين')">💪 نوم + ماء + مذاكرة</button>
        <button type="button" class="chip" style="font-size:11.5px;padding:5px 10px" onclick="setAiChipPrompt('جبت 28 من 30 في ميدتيرم التفاضل (وزنه 30%)')">🎓 رصد درجة</button>
      </div>
    </div>

    <div class="field" style="margin-bottom:14px">
      <label for="aiText">📝 اكتب طلبك أو أوامرك المركبة (اختياري إذا رفعت صورة)</label>
      <textarea id="aiText" placeholder="مثال: جاتني 500 ريال هدية، وصرفت 25 قهوة، وسجل غياب اليوم في الفيزياء..." style="min-height:100px;resize:vertical"></textarea>
    </div>

    <div class="field" style="margin-bottom:14px">
      <label for="aiImage">📸 أو ارفع صورة (جدول دراسي كامل، تقويم أكاديمي، إيصال، درجات)</label>
      <input type="file" id="aiImage" accept="image/*" style="padding:10px;font-size:16px" onchange="aiImageSelected(this)">
      <div id="aiImagePreview" style="display:none;margin-top:10px;position:relative">
        <img id="aiImageThumb" alt="معاينة الصورة" style="width:100%;border-radius:12px;max-height:200px;object-fit:cover;border:2px solid var(--p)">
        <button type="button" onclick="aiRemoveImage()" style="position:absolute;top:8px;inset-inline-end:8px;background:var(--danger);color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 10px rgba(220,38,38,.4)">✕</button>
      </div>
    </div>

    <div id="aiLoading" style="display:none;text-align:center;padding:16px">
      <div style="display:inline-block;width:30px;height:30px;border:3px solid var(--p-light);border-top-color:var(--p);border-radius:50%;animation:spin 1s linear infinite"></div>
      <div style="font-size:13px;color:var(--muted);font-weight:700;margin-top:8px">جاري التحليل والتنفيذ عبر Gemini AI...</div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
    <button class="btn btn-primary" id="aiSubmitBtn" onclick="submitAiInput()" style="background:linear-gradient(135deg,#0d9488,#0891b2)">✨ تحليل وتنفيذ فوري</button>
  `);
}

function aiImageSelected(input){
  const file = input.files && input.files[0];
  if(!file) return;
  if(file.size > 5 * 1024 * 1024){
    toast('⚠️ الصورة كبيرة — الحد الأقصى 5MB');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64Full = e.target.result;
    const base64 = base64Full.split(',')[1];
    aiFileData = { data: base64, mimeType: file.type };
    const thumb = document.getElementById('aiImageThumb');
    const prev = document.getElementById('aiImagePreview');
    if(thumb) thumb.src = base64Full;
    if(prev) prev.style.display = 'block';
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
  if(!text && !aiFileData){ toast('⚠️ اكتب نصاً أو ارفع صورة أولاً'); return; }

  const btn = document.getElementById('aiSubmitBtn');
  const loader = document.getElementById('aiLoading');
  if(btn) btn.style.display = 'none';
  if(loader) loader.style.display = 'block';

  aiAbortController = new AbortController();
  try{
    const res = await fetch(TG_WORKER + '/ai-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...authObj(),
        text,
        image: aiFileData,
        courses: live(state.courses).map(c => ({ id: c.id, name: c.name, code: c.code })),
        goals: live(state.money.goals).map(g => ({ id: g.id, name: g.name })),
        today: todayISO()
      }),
      signal: aiAbortController.signal
    });
    const data = await res.json();
    if(res.status === 401){
      throw new Error(data.error || '⚠️ يرجى ربط حسابك بتلقرام من الإعدادات أولاً لاستخدام المساعد الذكي');
    }
    if(!data.ok) throw new Error(data.error || 'فشل التحليل');
    if(!modalBg.classList.contains('open')) return;
    handleAiResult(data);
  }catch(e){
    if(e.name === 'AbortError') return;
    console.error(e);
    if(btn) btn.style.display = 'inline-flex';
    if(loader) loader.style.display = 'none';
    toast('❌ ' + (e.message || 'تعذّر التحليل — حاول مرة ثانية'));
  }finally{
    aiAbortController = null;
  }
}

function isValidISO(s){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d.getTime());
}

function resolveAiCourseId(d, autoCreate = false){
  if(d.courseId && getCourse(d.courseId)) return d.courseId;
  if(d.courseName){
    const target = String(d.courseName).trim().toLowerCase();
    const activeCourses = live(state.courses);
    const found = activeCourses.find(c =>
      c.name.toLowerCase().includes(target) ||
      target.includes(c.name.toLowerCase()) ||
      (c.code && c.code.toLowerCase() === target)
    );
    if(found) return found.id;
    if(autoCreate){
      const newC = {
        id: uid(),
        name: String(d.courseName).trim(),
        code: d.code ? String(d.code).trim() : '',
        credits: 3,
        teacher: '',
        color: COLORS[activeCourses.length % COLORS.length],
        grades: [],
        updatedAt: Date.now()
      };
      state.courses.push(newC);
      return newC.id;
    }
  }
  return '';
}

function executeSingleAiAction(item){
  if(!item || typeof item !== 'object') return null;
  const action = item.action;
  const d = item.data || item;

  if(action === 'add_expense'){
    const amt = +d.amount || 0;
    if(amt <= 0) return null;
    state.money.expenses.push({
      id: uid(),
      amount: amt,
      category: EXPENSE_CATS.some(c => c.id === d.category) ? d.category : 'other',
      note: d.note || '',
      date: isValidISO(d.date) ? d.date : todayISO(),
      created: Date.now(),
      updatedAt: Date.now()
    });
    return { view: 'expenses', msg: `💸 مصروف: ${amt} ر.س` };
  }

  if(action === 'add_income'){
    const amt = +d.amount || 0;
    if(amt <= 0) return null;
    if(!Array.isArray(state.money.incomes)) state.money.incomes = [];
    state.money.incomes.push({
      id: uid(),
      amount: amt,
      source: INCOME_SOURCES.some(s => s.id === d.source) ? d.source : 'other',
      note: d.note || 'إضافة رصيد بالـ AI',
      date: isValidISO(d.date) ? d.date : todayISO(),
      created: Date.now(),
      updatedAt: Date.now()
    });
    return { view: 'balance', msg: `💰 زيادة رصيد: +${amt} ر.س` };
  }

  if(action === 'set_salary'){
    const sal = +d.salary || +d.amount || 0;
    if(sal <= 0) return null;
    state.money.salary = sal;
    state.money.salaryExactDate = isValidISO(d.date) ? d.date : (state.money.salaryExactDate || todayISO());
    touchField(state.money, 'salary');
    touchField(state.money, 'salaryExactDate');
    return { view: 'balance', msg: `🏦 ضبط الراتب: ${sal} ر.س` };
  }

  if(action === 'add_goal'){
    const target = +d.target || +d.amount || 0;
    if(!d.name || target <= 0) return null;
    const saved = Math.max(0, +d.saved || 0);
    const g = { id: uid(), name: String(d.name).trim(), target, saved, emoji: d.emoji || '🎯', created: Date.now(), updatedAt: Date.now(), txs: [] };
    reconcileGoalTxs(g);
    state.money.goals.push(g);
    return { view: 'goals', msg: `🎯 هدف جديد: ${g.name}` };
  }

  if(action === 'goal_transaction'){
    const amt = +d.amount || 0;
    if(amt <= 0) return null;
    const activeGoals = live(state.money.goals);
    let g = activeGoals.find(x => x.id === d.goalId);
    if(!g && d.goalName){
      const gn = String(d.goalName).toLowerCase();
      g = activeGoals.find(x => x.name.toLowerCase().includes(gn) || gn.includes(x.name.toLowerCase()));
    }
    if(!g && activeGoals.length === 1) g = activeGoals[0];
    if(!g) return null;
    g.txs = Array.isArray(g.txs) ? g.txs : [];
    if(d.type === 'withdraw'){
      const w = Math.min(g.saved || 0, amt);
      g.saved = Math.max(0, (g.saved || 0) - amt);
      if(w > 0) g.txs.push({ ts: Date.now(), amount: -w });
      touchItem(g);
      reconcileGoalTxs(g);
      return { view: 'goals', msg: `➖ سحب ${w} ر.س من ${g.name}` };
    } else {
      g.saved = (g.saved || 0) + amt;
      g.txs.push({ ts: Date.now(), amount: amt });
      touchItem(g);
      reconcileGoalTxs(g);
      return { view: 'goals', msg: `➕ إيداع ${amt} ر.س في ${g.name}` };
    }
  }

  if(action === 'add_course'){
    const name = String(d.name || d.courseName || '').trim();
    if(!name) return null;
    const activeCourses = live(state.courses);
    const existing = activeCourses.find(c => c.name.toLowerCase() === name.toLowerCase());
    if(existing){
      if(d.code) existing.code = d.code;
      if(d.credits != null) existing.credits = +d.credits || 3;
      if(d.teacher) existing.teacher = d.teacher;
      touchItem(existing);
      return { view: 'courses', msg: `📚 تحديث مقرر: ${name}` };
    }
    state.courses.push({
      id: uid(),
      name,
      code: d.code ? String(d.code).trim() : '',
      credits: d.credits != null ? (+d.credits || 0) : 3,
      teacher: d.teacher ? String(d.teacher).trim() : '',
      color: COLORS[activeCourses.length % COLORS.length],
      grades: [],
      updatedAt: Date.now()
    });
    return { view: 'courses', msg: `📚 مقرر جديد: ${name}` };
  }

  if(action === 'add_class'){
    let cid = resolveAiCourseId(d, true);
    const activeCourses = live(state.courses);
    if(!cid && activeCourses.length) cid = activeCourses[0].id;
    if(!cid) return null;
    const day = clamp(parseInt(d.day, 10) || 0, 0, 6);
    const start = d.start || '08:00';
    const end = d.end || '09:00';
    state.schedule.push({ id: uid(), courseId: cid, day, start, end, room: d.room || '', updatedAt: Date.now() });
    return { view: 'schedule', msg: `📅 محاضرة: ${courseName(cid)} (${DAYS[day]})` };
  }

  if(action === 'add_exam'){
    const cid = resolveAiCourseId(d, true);
    state.exams.push({
      id: uid(),
      title: d.title || 'اختبار',
      courseId: cid,
      type: EXAM_TYPES.includes(d.type) ? d.type : 'ميدتيرم',
      date: isValidISO(d.date) ? d.date : todayISO(),
      time: d.time || '',
      place: d.place || '',
      notes: d.notes || 'أُضيف بواسطة المساعد الذكي 🤖',
      done: false,
      updatedAt: Date.now()
    });
    return { view: 'tasks', msg: `⏰ اختبار: ${d.title || ''}` };
  }

  if(action === 'add_task'){
    const cid = resolveAiCourseId(d, true);
    state.tasks.push({
      id: uid(),
      title: d.title || 'مهمة',
      courseId: cid,
      type: TASK_TYPES.includes(d.type) ? d.type : 'واجب',
      due: isValidISO(d.due) ? d.due : todayISO(),
      priority: ['high','med','low'].includes(d.priority) ? d.priority : 'med',
      notes: d.notes || 'أُضيف بواسطة المساعد الذكي 🤖',
      done: false,
      created: todayISO(),
      updatedAt: Date.now()
    });
    return { view: 'tasks', msg: `📝 مهمة: ${d.title || ''}` };
  }

  if(action === 'log_attendance'){
    const cid = resolveAiCourseId(d, false);
    const date = isValidISO(d.date) ? d.date : todayISO();
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const activeSched = live(state.schedule);
    let cls = activeSched.find(s => (!cid || s.courseId === cid) && +s.day === dayOfWeek);
    if(!cls && cid) cls = activeSched.find(s => s.courseId === cid);
    if(!cls) return null;
    const status = ['present','absent','excused','late','cancelled'].includes(d.status) ? d.status : 'absent';
    const existingAtt = getAttFor(cls.id, date);
    if(status === 'present' && !d.note){
      if(existingAtt) tombstoneItem(existingAtt);
    } else if(existingAtt){
      existingAtt.status = status;
      existingAtt.note = d.note || '';
      touchItem(existingAtt);
    } else {
      state.attendance.push({ id: uid(), classId: cls.id, date, status, note: d.note || '', updatedAt: Date.now() });
    }
    return { view: 'attendance', msg: `📋 تسجيل حضور/غياب: ${courseName(cls.courseId)}` };
  }

  if(action === 'log_study'){
    const mins = +d.minutes || 0;
    if(mins <= 0) return null;
    const cid = resolveAiCourseId(d, false);
    const date = isValidISO(d.date) ? d.date : todayISO();
    state.studyLog.push({ id: uid(), date, courseId: cid, minutes: mins, updatedAt: Date.now() });
    return { view: 'study', msg: `🍅 مذاكرة: ${mins} دقيقة` };
  }

  if(action === 'log_wellness'){
    const date = isValidISO(d.date) ? d.date : todayISO();
    let wLog = state.wellness.log.find(l => !l.deleted && l.date === date);
    if(!wLog){ wLog = { date, sleep: 0, water: 0, updatedAt: Date.now() }; state.wellness.log.push(wLog); }
    if(d.sleep != null && +d.sleep >= 0) wLog.sleep = +d.sleep;
    if(d.water != null && +d.water >= 0) wLog.water = +d.water;
    touchItem(wLog);

    if(d.teethMorning != null || d.teethNight != null){
      let tLog = state.health.teethLog.find(l => !l.deleted && l.date === date);
      if(!tLog){ tLog = { date, morning: false, night: false, updatedAt: Date.now() }; state.health.teethLog.push(tLog); }
      if(d.teethMorning != null) tLog.morning = !!d.teethMorning;
      if(d.teethNight != null) tLog.night = !!d.teethNight;
      touchItem(tLog);
    }
    return { view: 'wellness', msg: `💪 تحديث متابع الصحة` };
  }

  if(action === 'add_grade'){
    const cid = resolveAiCourseId(d, true);
    const c = getCourse(cid);
    if(!c) return null;
    if(d.componentName && d.score != null){
      c.grades = Array.isArray(c.grades) ? c.grades : [];
      c.grades.push({
        name: String(d.componentName),
        weight: +d.weight || 20,
        score: +d.score
      });
      delete c.manualLetter;
      touchItem(c);
      return { view: 'grades', msg: `🎓 رصد درجة ${d.componentName} في ${c.name}` };
    }
    if(d.letter && GRADE_OPTIONS.includes(d.letter)){
      c.manualLetter = d.letter;
      touchItem(c);
      return { view: 'grades', msg: `🎓 رصد تقدير ${d.letter} في ${c.name}` };
    }
    return null;
  }

  if(action === 'setup_semester'){
    if(d.startDate && isValidISO(d.startDate)){
      state.settings.semesterStart = d.startDate;
      touchField(state.settings, 'semesterStart');
    }
    if(d.weeks){
      state.settings.semesterWeeks = clamp(+d.weeks || 16, 8, 30);
      touchField(state.settings, 'semesterWeeks');
    }
    if(Array.isArray(d.events) && d.events.length){
      const cleanEvents = d.events
        .filter(ev => ev && isValidISO(ev.date) && ev.title)
        .map(ev => ({
          date: ev.date,
          title: String(ev.title).slice(0, 80),
          type: ['info','holiday','exam'].includes(ev.type) ? ev.type : 'info',
          ico: ev.type === 'holiday' ? '🎉' : ev.type === 'exam' ? '📝' : '📌'
        }));
      if(cleanEvents.length){
        state.settings.customAcademicEvents = cleanEvents;
        touchField(state.settings, 'customAcademicEvents');
      }
    }
    return { view: 'schedule', msg: `📅 تحديث التقويم الأكاديمي` };
  }

  return null;
}

function handleAiResult(result){
  closeModal();

  // دعم مصفوفة actions المتعددة أو action المفرد
  const actionsList = Array.isArray(result.actions) && result.actions.length
    ? result.actions
    : (result.action && result.action !== 'unknown' ? [{ action: result.action, data: result.data || {} }] : []);

  if(!actionsList.length){
    toast('🤖 ' + (result.reply || result.message || 'لم أفهم الطلب — جرّب صياغته بشكل أوضح'));
    return;
  }

  const executed = [];
  let targetView = null;
  for(const item of actionsList){
    const outcome = executeSingleAiAction(item);
    if(outcome){
      executed.push(outcome.msg);
      targetView = outcome.view;
    }
  }

  if(!executed.length){
    toast('🤖 ' + (result.reply || result.message || 'لم أتمكن من تنفيذ الأمر — تأكد من البيانات'));
    return;
  }

  save();
  applySettings();
  renderAll();
  renderWeekBadge();
  renderAcademicStrip();

  if(targetView) go(targetView);

  if(result.reply){
    toast('✨ ' + result.reply);
  } else if(executed.length === 1){
    toast('✅ تم: ' + executed[0]);
  } else {
    toast(`✅ تم تنفيذ ${executed.length} أوامر بنجاح!`);
  }
}


document.getElementById('fab')?.addEventListener('click', quickAdd);

/* ============================================================
   37) التهيئة النهائية وتشغيل التطبيق
============================================================ */
async function init(){
  if(hasSavedPin()){
    lockAppNow();
  }

  migrateGoalsTx();
  setupVisualViewportKeyboardHandler();
  acadSelectedWeek = currentAcademicWeek();
  applySettings();
  updateTgStatus();
  renderAll();
  renderAcademicStrip();

  const h = location.hash.slice(1);
  if(h && document.getElementById('view-' + h) && h !== 'course-detail'){
    go(h);
  }

  const pending = localStorage.getItem('tg_pending');
  const pendingTime = parseInt(localStorage.getItem('tg_pending_time') || '0');
  if(pending && Date.now() - pendingTime < 600000){
    startPoll(pending);
  } else if(pending){
    localStorage.removeItem('tg_pending');
    localStorage.removeItem('tg_pending_time');
  }

  if(getMyChatId()){
    startAutoSync();
    loadFromCloud().catch(e => console.error('Cloud sync failed on init', e));
    syncAttendanceFromServer().catch(() => {});
  }
  pomoResumeIfNeeded().catch(() => {});

  if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
    if(location.search.includes('nosw=1')){
      unregisterServiceWorkerSafe();
    } else {
      setupServiceWorkerWithUpdateToast();
    }
  }
}

let _waitingSwWorker = null;
let _swRefreshing = false;

function showSwUpdateToast(worker){
  _waitingSwWorker = worker || _waitingSwWorker;
  toast('🔄 تحديث جديد متاح — أعد التحميل');
  let banner = document.getElementById('swUpdateBanner');
  if(!banner && document.body && typeof document.createElement === 'function'){
    banner = document.createElement('div');
    banner.id = 'swUpdateBanner';
    document.body.appendChild(banner);
  }
  if(banner){
    banner.style.cssText = 'position:fixed;bottom:20px;inset-inline-start:20px;z-index:1200;background:var(--card);color:var(--text);border:2px solid var(--p);padding:12px 16px;border-radius:14px;box-shadow:var(--shadow-lg);display:flex;align-items:center;gap:12px;font-size:13px;font-weight:800';
    banner.innerHTML = '<span>🔄 تحديث جديد متاح — أعد التحميل</span><button type="button" class="btn btn-primary btn-sm" onclick="applySwUpdate()">تحديث الآن</button>';
  }
}

function applySwUpdate(){
  if(_waitingSwWorker && typeof _waitingSwWorker.postMessage === 'function'){
    _waitingSwWorker.postMessage({ type: 'SKIP_WAITING' });
  } else {
    location.reload();
  }
}

async function unregisterServiceWorkerSafe(){
  try{
    if('serviceWorker' in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      for(const r of regs) await r.unregister();
    }
    if(typeof caches !== 'undefined' && caches.keys){
      const keys = await caches.keys();
      for(const k of keys) await caches.delete(k);
    }
    toast('✅ تم إلغاء تسجيل Service Worker ومسح الكاش المؤقت');
  }catch(e){}
}

function setupServiceWorkerWithUpdateToast(){
  try{
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if(_swRefreshing) return;
      _swRefreshing = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(reg => {
      if(reg.waiting){
        showSwUpdateToast(reg.waiting);
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if(!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
            showSwUpdateToast(newWorker);
          }
        });
      });
    }).catch(() => {});
  }catch(e){}
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
