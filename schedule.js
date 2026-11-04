/* ============================================================================
   🎓 مُساعد الجامعة — schedule.js (الجدول الدراسي، التبديل المتجاوب، والحضور والغياب)
   ============================================================================ */

/* ============================================================
   9) المحاضرات والجدول
============================================================ */
function courseOptions(sel){
  const cs = live(state.courses);
  if(!cs.length) return `<option value="">— أضف مقرراً أولاً —</option>`;
  return cs.map(c => `<option value="${esc(c.id)}" ${c.id===sel?'selected':''}>${esc(c.name)}</option>`).join('');
}
function openClassForm(id, presetDay){
  if(!live(state.courses).length){ toast('⚠️ أضف مقرراً أولاً'); go('courses'); return; }
  const s = id ? live(state.schedule).find(x => x.id === id) : null;
  const dayOpts = DAYS.map((d,i) => `<option value="${i}" ${(s?.day ?? presetDay ?? 0) == i ? 'selected':''}>${d}</option>`).join('');
  openModal(s ? 'تعديل محاضرة' : 'إضافة محاضرة', `
    <div class="form-grid">
      <div class="field full"><label>المقرر <span class="req">*</span></label><select id="clCourse">${courseOptions(s?.courseId)}</select></div>
      <div class="field"><label>اليوم <span class="req">*</span></label><select id="clDay">${dayOpts}</select></div>
      <div class="field"><label>القاعة</label><input id="clRoom" placeholder="قاعة 204" value="${esc(s?.room||'')}"></div>
      <div class="field"><label>من <span class="req">*</span></label><input type="time" id="clStart" value="${s?.start||'08:00'}"></div>
      <div class="field"><label>إلى <span class="req">*</span></label><input type="time" id="clEnd" value="${s?.end||'09:00'}"></div>
    </div>
  `, `${s ? `<button class="btn btn-danger" onclick="deleteClass('${esc(id)}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveClass('${esc(id||'')}')">💾 حفظ</button>`);
}
function hasScheduleConflict(day, start, end, ignoreId = '', extraList = []){
  const sMin = toMin(start), eMin = toMin(end);
  const all = [...live(state.schedule), ...extraList];
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
  if(id){ const it = live(state.schedule).find(x => x.id === id); if(it){ Object.assign(it, { courseId, day, start, end, room }); touchItem(it); } }
  else{ state.schedule.push({ id: uid(), courseId, day, start, end, room, updatedAt: Date.now() }); }
  save(); closeModal(); renderAll(); toast('✅ تم الحفظ');
}
async function deleteClass(id){
  const attCount = live(state.attendance).filter(a => a.classId === id).length;
  const msg = attCount > 0
    ? `حذف هذه المحاضرة؟ سيُحذف معها ${attCount} سجل حضور/غياب.`
    : 'حذف هذه المحاضرة؟';
  const ok = await appConfirm(msg, {
    title: 'حذف المحاضرة', emoji: '🗑️', okText: 'حذف',
    variant: attCount > 0 ? 'warn' : 'danger'
  });
  if(!ok) return;
  state.schedule.forEach(s => { if(s.id === id) tombstoneItem(s); });
  state.attendance.forEach(a => { if(a.classId === id) tombstoneItem(a); });
  save(); closeModal(); renderAll(); toast('🗑️ تم الحذف');
}

/* ============================================================
   14) رندرة الجدول الدراسي والحضور
============================================================ */
function classDateThisWeek(dayIdx){
  const w = acadSelectedWeek || currentAcademicWeek();
  const ws = getWeekMonday(w);
  const d = new Date(ws);
  d.setDate(ws.getDate() + ((dayIdx - ws.getDay() + 7) % 7));
  return todayISO(d);
}
let schedSelectedDay = new Date().getDay();
let schedMobileMode = 'day'; // 'day' (يوم واحد على الجوال) أو 'week' (كل الأسبوع مع التمرير)

function getAttFor(cid, date){ return state.attendance.find(a => !a.deleted && a.classId === cid && a.date === date); }

function isPhoneViewport(){
  if(typeof window === 'undefined') return false;
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  return w < 744 || (w <= 960 && h <= 500);
}
function isIpadPortraitRailViewport(){
  if(typeof window === 'undefined') return false;
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  if(h <= 500) return false;
  return (w >= 744 && w <= 1023) || (w >= 744 && w <= 1024 && h > w);
}

function getIpadWindowStartDay(){
  return Math.min(3, Math.max(0, schedSelectedDay - 3));
}

function selectSchedDay(dayOrMode){
  if(dayOrMode === 'week'){
    schedMobileMode = 'week';
  } else {
    const d = parseInt(dayOrMode, 10);
    if(!isNaN(d) && d >= 0 && d <= 6){
      schedSelectedDay = d;
      if(isPhoneViewport() || isIpadPortraitRailViewport()) schedMobileMode = 'day';
    }
  }
  renderSchedule();
}

function renderSchedDaySwitcher(){
  const sw = document.getElementById('schedDaySwitcher');
  if(!sw) return;
  const nowDay = new Date().getDay();
  const activeSched = live(state.schedule);
  const windowed = isPhoneViewport() || isIpadPortraitRailViewport();
  const dayBtns = DAYS.map((d, i) => {
    const cnt = activeSched.filter(s => +s.day === i).length;
    const isAct = (!windowed || schedMobileMode === 'day') && schedSelectedDay === i;
    const isTod = i === nowDay;
    return `<button type="button" role="tab" aria-selected="${isAct}" class="sched-day-btn ${isAct ? 'active' : ''} ${isTod ? 'today' : ''}" onclick="selectSchedDay(${i})">${d}${cnt ? ` <span style="font-size:11px;opacity:.85">(${cnt})</span>` : ''}</button>`;
  }).join('');
  const weekBtn = windowed
    ? `<button type="button" role="tab" aria-selected="${schedMobileMode === 'week'}" class="sched-day-btn ${schedMobileMode === 'week' ? 'active' : ''}" onclick="selectSchedDay('week')">🗓️ كل الأسبوع</button>`
    : '';
  sw.innerHTML = dayBtns + weekBtn;
}

function syncScheduleViewportMode(){
  const wrap = document.getElementById('schedWrap') || document.querySelector('.sched-wrap');
  if(!wrap) return;
  const singleDay = isPhoneViewport() && schedMobileMode === 'day';
  const fourDay = isIpadPortraitRailViewport() && schedMobileMode === 'day';
  wrap.classList.toggle('single-day-mode', singleDay);
  wrap.classList.toggle('four-day-mode', fourDay);
  const winStart = getIpadWindowStartDay();
  wrap.querySelectorAll('.sched-day, .sched-col').forEach(el => {
    const d = parseInt(el.dataset.day, 10);
    if(!isNaN(d)){
      el.classList.toggle('in-window', d >= winStart && d < winStart + 4);
      el.classList.toggle('selected-day', d === schedSelectedDay);
    }
  });
}

function renderSchedule(){
  const legEl = document.getElementById('attLegend');
  if(legEl && !legEl.innerHTML){
    legEl.innerHTML = Object.entries(ATT).map(([k,v]) => {
      const col = v.color || '#0d9488';
      return `<span style="display:inline-flex;align-items:center;gap:5px;color:${col}"><span style="width:11px;height:11px;border-radius:3px;background:${col}"></span>${v.label}</span>`;
    }).join('') + '<span style="color:var(--muted);font-weight:600;margin-inline-start:auto">اضغط على أي محاضرة لتسجيل الحضور</span>';
  }
  renderSchedDaySwitcher();
  syncScheduleViewportMode();
  const nowDay = new Date().getDay();
  let minHour = HOUR_START, maxHour = HOUR_END;
  live(state.schedule).forEach(s => {
    const sh = Math.floor(toMin(s.start) / 60);
    const eh = Math.ceil(toMin(s.end) / 60);
    if(sh < minHour) minHour = Math.max(0, sh);
    if(eh > maxHour) maxHour = Math.min(24, eh);
  });
  const hours = [];
  for(let h = minHour; h < maxHour; h++) hours.push(h);
  const colHeight = hours.length * HOUR_H;
  const winStart = getIpadWindowStartDay();
  const head = `<div class="sched-head"><div></div><div class="sched-days">${DAYS.map((d,i) => `<div class="sched-day ${i===nowDay?'today':''} ${i===schedSelectedDay?'selected-day':''} ${(i>=winStart && i<winStart+4)?'in-window':''}" data-day="${i}" onclick="selectSchedDay(${i})" style="cursor:pointer">${d}</div>`).join('')}</div></div>`;
  const times = `<div class="sched-times">${hours.map(h => `<div class="sched-time">${to12(String(h).padStart(2,'0') + ':00')}</div>`).join('')}</div>`;
  const cols = `<div class="sched-cols">
    ${DAYS.map((_,di) => {
      const lines = hours.map((_,i) => `<div class="hour-line" style="top:${i*HOUR_H}px"></div>`).join('');
      const dayDate = classDateThisWeek(di);
      const dayItems = live(state.schedule).filter(s => +s.day === di).sort((a,b) => toMin(a.start) - toMin(b.start));
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
        const posStyle = ovCount > 1 ? `inset-inline-start:calc(${rightPct}% + 2px);inset-inline-end:auto;width:calc(${widthPct}% - 4px);` : '';
        const att = getAttFor(s.id, dayDate);
        const status = att ? att.status : 'present';
        const st = ATT[status];
        let color = courseColor(s.courseId);
        let extra = '';
        if(status !== 'present' && st){
          color = st.color;
          if(status === 'cancelled') extra = 'opacity:.55;text-decoration:line-through;';
        }
        return `<div class="cls" style="top:${top}px;height:${Math.max(hgt,28)}px;background:${color};${posStyle}${extra}" onclick="event.stopPropagation();openAttPopup('${esc(s.id)}','${esc(dayDate)}')">
          <b>${esc(courseName(s.courseId))}</b><span>${to12(s.start)} - ${to12(s.end)}${s.room ? ' · ' + esc(s.room) : ''}</span>
          ${status !== 'present' && st ? `<span style="position:absolute;top:3px;inset-inline-end:5px;font-size:12px">${st.ico}</span>` : ''}</div>`;
      }).join('');
      return `<div class="sched-col ${di===schedSelectedDay?'selected-day':''} ${(di>=winStart && di<winStart+4)?'in-window':''}" data-day="${di}" style="min-height:${colHeight}px" onclick="openClassForm(null,${di})">${lines}${blocks}</div>`;
    }).join('')}
  </div>`;
  const inner = document.getElementById('schedInner');
  if(inner) inner.innerHTML = head + `<div class="sched-body">${times}${cols}</div>`;
}
function openAttPopup(classId, date, draftNote){
  const s = live(state.schedule).find(x => x.id === classId);
  if(!s) return;
  const existing = getAttFor(classId, date);
  const cur = existing ? existing.status : 'present';
  const noteVal = draftNote !== undefined ? draftNote : (existing?.note || '');
  const presentActive = cur === 'present';
  const presentBtn = `<button class="att-status-btn" data-status="present" onclick="setAtt('${esc(classId)}','${esc(date)}','present')" style="grid-column:1/-1;padding:11px;border-radius:12px;font-weight:700;font-size:13.5px;background:${presentActive ? 'var(--ok)' : 'var(--hover)'};color:${presentActive ? '#fff' : 'var(--text)'};border:2px solid ${presentActive ? 'var(--ok)' : 'transparent'};transition:all .2s;font-family:inherit;cursor:pointer">✅ حاضر (الافتراضي)</button>`;
  const btns = presentBtn + Object.entries(ATT).map(([k,v]) => {
    const active = cur === k;
    const bg = v.color || courseColor(s.courseId);
    return `<button class="att-status-btn" data-status="${k}" onclick="setAtt('${esc(classId)}','${esc(date)}','${esc(k)}')" style="padding:13px;border-radius:12px;font-weight:700;font-size:13.5px;background:${active ? bg : 'var(--hover)'};color:${active ? '#fff' : 'var(--text)'};border:2px solid ${active ? bg : 'transparent'};transition:all .2s;font-family:inherit;cursor:pointer">${v.ico} ${v.label}</button>`;
  }).join('');
  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'});
  const isToday = date === todayISO();
  openModal('📋 الحضور وتعديل المحاضرة', `
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:17px;font-weight:800;font-family:'Cairo',system-ui,sans-serif;margin-bottom:5px;color:${courseColor(s.courseId)}">${esc(courseName(s.courseId))}</div>
      <div style="font-size:12.5px;color:var(--muted);font-weight:700">${dateStr}${isToday ? ' <span style="color:var(--p)">(اليوم)</span>' : ''} · ${to12(s.start)} - ${to12(s.end)}${s.room ? ' · ' + esc(s.room) : ''}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="closeModal();openClassForm('${esc(classId)}')">✏️ تعديل وقت / قاعة المحاضرة أو حذفها</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${btns}</div>
    <div class="field" style="margin-top:16px"><label>ملاحظة (اختياري)</label>
      <textarea id="attNote" placeholder="سبب الغياب أو ملاحظة..." style="min-height:70px">${esc(noteVal)}</textarea></div>
  `, `${existing ? `<button class="btn btn-danger btn-sm" onclick="clearAtt('${esc(classId)}','${esc(date)}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button><button class="btn btn-primary" onclick="saveAttNote('${esc(classId)}','${esc(date)}')">💾 حفظ</button>`);
}
function setAtt(classId, date, status){
  const n = document.getElementById('attNote');
  const note = n ? n.value.trim() : '';
  if(status === 'present' && !note){
    state.attendance.forEach(a => {
      if(!a.deleted && a.classId === classId && a.date === date) tombstoneItem(a);
    });
  } else {
    const att = getAttFor(classId, date);
    if(att){ att.status = status; att.note = note; touchItem(att); }
    else{ state.attendance.push({ id:uid(), classId, date, status, note, updatedAt: Date.now() }); }
  }
  save(); renderSchedule(); renderAttendancePage();

  const sch = live(state.schedule).find(x => x.id === classId);
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
  const attMap = calcAttendance();
  const cAtt = sch ? attMap[sch.courseId] : null;
  if((status === 'absent' || status === 'excused') && cAtt && cAtt.percent >= 20){
    toast(`⚠️ تنبيه: غيابك في ${courseName(sch.courseId)} وصل ${cAtt.percent.toFixed(1)}% (الحد ${getAbsenceLimitPercent()}%)`);
  } else {
    toast('✅ تم تحديث الحضور');
  }
}
function saveAttNote(classId, date){
  const n = document.getElementById('attNote');
  if(!n) return;
  const note = n.value.trim();
  const att = getAttFor(classId, date);
  if(att){
    att.note = note;
    if(att.status === 'present' && !note) tombstoneItem(att);
    else touchItem(att);
    save(); renderSchedule(); renderAttendancePage(); closeModal(); toast('💾 تم الحفظ');
  } else if(note){
    state.attendance.push({ id: uid(), classId, date, status: 'present', note, updatedAt: Date.now() });
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
  state.attendance.forEach(a => {
    if(!a.deleted && a.classId === classId && a.date === date) tombstoneItem(a);
  });
  save(); renderSchedule(); renderAttendancePage(); closeModal(); toast('🗑️ تم');
}

/* ============================================================
   25) الإضافة السريعة للجدول الأسبوعي
============================================================ */
let qaItems = [];
function openQuickAdd(){
  if(!live(state.courses).length){ toast('⚠️ أضف مقرراً أولاً'); go('courses'); return; }
  qaItems = [];
  openModal('⚡ إضافة سريعة للجدول', `
    <div style="background:var(--p-light);padding:12px 14px;border-radius:12px;font-size:13px;margin-bottom:16px;line-height:1.7">
      💡 اختر المقرر مرة واحدة، ثم أضف كل محاضراته المتتالية بسرعة.
    </div>
    <div class="form-grid">
      <div class="field full"><label>المقرر <span class="req">*</span></label><select id="qaCourse">${courseOptions()}</select></div>
      <div class="field"><label>اليوم <span class="req">*</span></label><select id="qaDay">${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select></div>
      <div class="field"><label>القاعة</label><input id="qaRoom" placeholder="اختياري"></div>
      <div class="field"><label>من <span class="req">*</span></label><input type="time" id="qaStart" value="08:00"></div>
      <div class="field"><label>إلى <span class="req">*</span></label><input type="time" id="qaEnd" value="09:30"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="qaAdd()" style="margin-top:14px">➕ أضف للقائمة واستمر</button>
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
  if(toMin(end) <= toMin(start)){ toast('⚠️ وقت النهاية يجب أن يكون بعد البداية'); return; }
  if(hasScheduleConflict(day, start, end, '', qaItems)){ toast('⚠️ يوجد تعارض في الوقت مع محاضرة أخرى في نفس اليوم'); return; }
  qaItems.push({ courseId, day, start, end, room });
  const dur = toMin(end) - toMin(start);
  const next = toMin(end);
  document.getElementById('qaStart').value = minToTime(next);
  document.getElementById('qaEnd').value = minToTime(next + dur);
  qaRender(); toast('✅ تمت الإضافة للقائمة');
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
  if(!qaItems.length){ toast('⚠️ لم تُضف أي محاضرة'); return; }
  qaItems.forEach(it => state.schedule.push({ id: uid(), ...it, updatedAt: Date.now() }));
  save();
  const n = qaItems.length;
  qaItems = [];
  closeModal(); renderAll();
  toast(`✅ تم حفظ ${n} محاضرة`);
}
async function qaClose(){
  if(qaItems.length){
    const ok = await appConfirm(`عندك ${qaItems.length} محاضرة لم تُحفظ. تريد الإغلاق؟`, {
      title: 'محاضرات غير محفوظة', emoji: '⚠️', okText: 'إغلاق', variant: 'warn'
    });
    if(!ok) return;
  }
  qaItems = []; closeModal();
}

/* ============================================================
   27) الحضور والغياب (حد الحرمان 25%)
============================================================ */
function calcAttendance(){
  const limitPct = getAbsenceLimitPercent();
  const MAX_PERCENT = limitPct / 100;
  const res = {};
  const weeks = state.settings.semesterWeeks || 16;

  live(state.courses).forEach(c => {
    const courseClasses = live(state.schedule).filter(s => s.courseId === c.id);
    const uniqueSlots = new Set();
    courseClasses.forEach(s => uniqueSlots.add(`${s.day}_${s.start}`));
    const daysPerWeek = uniqueSlots.size;
    const totalDays = daysPerWeek * weeks;

    const absentKeys = new Set();
    const lateKeys = new Set();
    live(state.attendance).forEach(a => {
      if(a.status !== 'absent' && a.status !== 'excused' && a.status !== 'late') return;
      const sch = courseClasses.find(s => s.id === a.classId);
      if(!sch) return;
      const key = `${sch.day}_${sch.start}_${a.date}`;
      if(a.status === 'late') lateKeys.add(key);
      else absentKeys.add(key);
    });

    const absences = absentKeys.size;
    const lates = lateKeys.size;
    const percent = totalDays > 0 ? (absences / totalDays) * 100 : 0;
    const maxAbsences = Math.floor(totalDays * MAX_PERCENT);

    res[c.id] = {
      course: c, total: totalDays, daysPerWeek,
      absences, lates, max: maxAbsences,
      percent, remaining: Math.max(0, maxAbsences - absences)
    };
  });
  return res;
}
function renderAttendancePage(){
  const el = document.getElementById('attendanceContent');
  if(!el) return;
  const activeCourses = live(state.courses);
  const data = calcAttendance();
  if(!activeCourses.length){
    el.innerHTML = `<div class="empty"><div class="e-ico">📋</div><b>لا توجد مقررات</b><p>أضف مقرراتك أولاً لتتبع الحضور والغياب</p><button class="btn btn-primary" onclick="go('courses');openCourseForm()">➕ إضافة مقرر</button></div>`;
    return;
  }
  const limitPct = getAbsenceLimitPercent();
  const warnPct = Math.min(20, limitPct * 0.8);
  const totalAbsences = Object.values(data).reduce((a, x) => a + x.absences, 0);
  el.innerHTML = `
    <div class="stats" style="margin-bottom:20px">
      <div class="stat"><div class="stat-ico" style="background:var(--danger-bg)">⚠️</div><div><b>${totalAbsences}</b><span>إجمالي أيام غيابك</span></div></div>
      <div class="stat"><div class="stat-ico" style="background:var(--p-light)">📅</div><div><b>${activeCourses.length}</b><span>مقرر متابع</span></div></div>
      <div class="stat"><div class="stat-ico" style="background:var(--warn-bg)">🎯</div><div><b>${limitPct}%</b><span>حد الحرمان</span></div></div>
    </div>
    <div style="background:var(--p-light);padding:12px 16px;border-radius:12px;margin-bottom:20px;font-size:13px;line-height:1.9;font-weight:600">
      💡 <b>طريقة الحساب:</b> كل محاضرة غائبة = غياب واحد · النسبة = (عدد الغيابات ÷ إجمالي محاضرات المقرر في الفصل) × 100 · يظهر تنبيه تحذيري عند وصول الغياب إلى <b>20%</b>.
    </div>
    <div style="display:grid;gap:14px">
      ${Object.values(data).map(d => {
        const used = d.percent;
        const color = used >= warnPct ? 'var(--danger)' : used >= (limitPct * 0.5) ? 'var(--warn)' : 'var(--ok)';
        const bg = used >= warnPct ? 'var(--danger-bg)' : used >= (limitPct * 0.5) ? 'var(--warn-bg)' : 'var(--ok-bg)';
        const emoji = used >= warnPct ? '🚨' : used >= (limitPct * 0.5) ? '⚠️' : '✅';
        const barPercent = Math.min((used / limitPct) * 100, 100);
        return `<div class="card" style="padding:20px;border-inline-start:4px solid ${color}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">
            <div><h3 style="font-size:17px;color:${d.course.color};margin-bottom:4px;cursor:pointer" onclick="openCourseDetail('${esc(d.course.id)}')">${esc(d.course.name)} →</h3>
              <span style="font-size:12.5px;color:var(--muted);font-weight:700">${d.daysPerWeek} محاضرة أسبوعياً · ${d.total} محاضرة في الفصل</span></div>
            <div style="background:${bg};color:${color};padding:10px 16px;border-radius:12px;text-align:center;min-width:90px">
              <b style="font-family:'Cairo',system-ui,sans-serif;font-size:22px;display:block;line-height:1">${d.percent.toFixed(2)}%</b>
              <span style="font-size:10.5px;font-weight:700">${emoji}</span>
            </div></div>
          <div class="prog" style="height:12px;margin-bottom:14px"><i style="width:${barPercent}%;background:${color}"></i></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:12.5px;font-weight:700;text-align:center">
            <div style="background:var(--hover);padding:8px;border-radius:9px"><div style="color:var(--muted);font-size:10.5px;margin-bottom:3px">غياباتك</div><div style="color:${color};font-size:15px;font-family:'Cairo',system-ui,sans-serif">${d.absences}</div></div>
            <div style="background:var(--hover);padding:8px;border-radius:9px"><div style="color:var(--muted);font-size:10.5px;margin-bottom:3px">الحد (${limitPct}%)</div><div style="color:var(--danger);font-size:15px;font-family:'Cairo',system-ui,sans-serif">${d.max}</div></div>
            <div style="background:var(--hover);padding:8px;border-radius:9px"><div style="color:var(--muted);font-size:10.5px;margin-bottom:3px">متبقي</div><div style="color:var(--ok);font-size:15px;font-family:'Cairo',system-ui,sans-serif">${d.remaining}</div></div>
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;font-weight:700;margin-top:12px">
            <span style="color:var(--warn)">⏰ تأخير: <b>${d.lates}</b></span>
            ${d.percent >= limitPct ? `<span style="color:var(--danger)">🚨 وصلت أو تجاوزت حد الحرمان (${limitPct}%)!</span>` : (d.percent >= 20 || d.percent >= warnPct ? `<span style="color:var(--danger)">🚨 تحذير: وصلت نسبة الغياب إلى ${d.percent.toFixed(1)}% (تجاوزت 20% واقتربت من حد الحرمان)!</span>` : '')}
          </div></div>`;
      }).join('')}
    </div>`;
}

