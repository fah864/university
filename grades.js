/* ============================================================================
   🎓 مُساعد الجامعة — grades.js (المعدل التراكمي، الدرجات، والمكونات التقييمية)
   ============================================================================ */

/* ============================================================
   17) الدرجات والمعدل التراكمي
============================================================ */
function scoreToPoints(p){
  const l = scoreToLetter(p);
  return letterToPoints(l);
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
function letterToPoints(letter){
  const map = getGpaScale() === 4 ? GRADE_POINTS_4 : GRADE_POINTS;
  return map[letter] ?? 0;
}
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
  live(state.courses).forEach(c => {
    const g = getCourseGrade(c);
    allRows.push({ source:'course', id:c.id, name:c.name, code:c.code, credits:+c.credits||0, color:c.color, teacher:c.teacher, type: g ? g.type : 'empty', score: g ? g.score : null, letter: (g && !g.ungraded) ? g.letter : null, grades: c.grades || [] });
  });
  live(state.gpaCourses).forEach((gc, idx) => {
    allRows.push({ source:'external', id:gc.id, idx, name:gc.name, code:'', credits:+gc.credits||0, color:'#64748b', teacher:'', type:'letter', score:null, letter:gc.grade, grades:[] });
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
    <div class="stat"><div class="stat-ico" style="background:var(--p-light)">🎯</div><div><b>${gpa.toFixed(2)}</b><span>المعدل التقديري (من ${getGpaScale()})</span></div></div>
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
    actions = `<button class="btn btn-ghost btn-sm" onclick="toggleGradeExpand('${esc(rowId)}')">📝 تعديل المكونات</button>`;
  } else if(r.type === 'letter'){
    statusBadge = `
      <select onchange="updateLetterGrade('${esc(r.source)}', ${isExternal ? r.idx : i}, this.value)" style="padding:6px 12px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);font-weight:800;font-size:16px;color:var(--p);cursor:pointer">
        ${!isExternal ? `<option value="">— إلغاء التقدير —</option>` : ''}
        ${GRADE_OPTIONS.map(g => `<option value="${g}" ${g === r.letter ? 'selected':''}>${g}</option>`).join('')}
      </select>`;
    actions = isExternal
      ? `<button class="mini-btn del" onclick="removeExternalGrade(${r.idx})">✕</button>`
      : `<button class="btn btn-ghost btn-sm" onclick="addComponentsToCourse('${esc(r.id)}')">📝 تفصيلي</button>`;
  } else {
    statusBadge = `<span style="font-size:12.5px;color:var(--muted);font-weight:700">لم تُدخل درجة</span>`;
    actions = `
      <select onchange="updateLetterGrade('${esc(r.source)}', ${i}, this.value)" style="padding:6px 10px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);font-weight:700;font-size:16px;cursor:pointer">
        <option value="">— تقدير —</option>
        ${GRADE_OPTIONS.map(g => `<option>${g}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="addComponentsToCourse('${esc(r.id)}')">📝 تفصيلي</button>`;
  }
  let detailsHTML = '';
  if(r.type === 'detailed' && r.grades.length){
    const totalW = r.grades.reduce((a, x) => a + (+x.weight || 0), 0);
    detailsHTML = `
      <div id="${rowId}" style="display:none;padding:16px;border-top:1px solid var(--border);background:var(--hover)">
        <div class="comp-row comp-hd"><div>المكوّن</div><div>الوزن %</div><div>الدرجة %</div><div></div></div>
        ${r.grades.map((x, j) => `<div class="comp-row">
          <input value="${esc(x.name)}" oninput="updateComp('${esc(r.id)}',${j},'name',this.value)" placeholder="اسم المكوّن">
          <input type="number" value="${esc(x.weight)}" min="0" max="100" oninput="updateComp('${esc(r.id)}',${j},'weight',this.value)" placeholder="الوزن">
          <input type="number" value="${esc(x.score)}" min="0" max="100" oninput="updateComp('${esc(r.id)}',${j},'score',this.value)" placeholder="الدرجة">
          <button class="mini-btn del" onclick="removeComp('${esc(r.id)}',${j})">✕</button>
        </div>`).join('')}
        <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-ghost btn-sm" onclick="addComp('${esc(r.id)}')">➕ إضافة مكوّن</button>
          <span id="totalW-${rowId}" style="font-size:12.5px;color:var(--muted);font-weight:700">مجموع الأوزان: ${totalW}%</span>
          <span style="font-size:12px;color:var(--ok);font-weight:700">✓</span>
        </div>
      </div>`;
  }
  return `
    <div class="card" style="padding:0;margin-bottom:12px;border-inline-start:4px solid ${r.color};overflow:hidden">
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
    const c = live(state.courses)[idx];
    if(!c) return;
    if(!letter){
      delete c.manualLetter;
      touchItem(c);
      save(); renderGrades(); toast('↺ تم مسح التقدير');
      return;
    }
    if(!c.grades || !c.grades.length){ c.manualLetter = letter; touchItem(c); save(); renderGrades(); toast('✅ تم الحفظ'); }
  } else {
    if(!letter) return;
    const gc = live(state.gpaCourses)[idx];
    if(!gc) return;
    gc.grade = letter;
    touchItem(gc);
    save(); renderGrades(); toast('✅ تم الحفظ');
  }
}
function addComponentsToCourse(courseId){
  const c = getCourse(courseId);
  if(!c) return;
  if(!c.grades) c.grades = [];
  if(!c.grades.length){
    const dw = getDefaultGradeWeights();
    c.grades.push({ name:'واجبات', weight:dw.hw, score:'' });
    c.grades.push({ name:'كويز',   weight:dw.quiz, score:'' });
    c.grades.push({ name:'ميدتيرم', weight:dw.midterm, score:'' });
    c.grades.push({ name:'نهائي',   weight:dw.final, score:'' });
    delete c.manualLetter;
    touchItem(c);
    save(); renderGrades();
    setTimeout(() => {
      live(state.courses).forEach((cc, i) => {
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
  const gc = live(state.gpaCourses)[i];
  if(gc) tombstoneItem(gc);
  save(); renderGrades(); toast('🗑️ تم');
}
function preserveGradeOpen(cid, renderFn){
  const wasOpen = {};
  live(state.courses).forEach((cc, idx) => {
    const el = document.getElementById(`grade-row-course-${idx}`);
    if(el) wasOpen[cc.id] = el.style.display === 'block';
  });
  renderFn();
  setTimeout(() => {
    live(state.courses).forEach((cc, idx) => {
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
  c.grades.push({ name:'', weight:10, score:'' });
  touchItem(c);
  save();
  preserveGradeOpen(cid, () => renderGrades());
}
function removeComp(cid, i){
  const c = getCourse(cid);
  if(!c.grades) return;
  c.grades.splice(i, 1);
  if(!c.grades.length) delete c.grades;
  touchItem(c);
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
  touchItem(c);
  if(_compSaveTimer) clearTimeout(_compSaveTimer);
  _compSaveTimer = setTimeout(() => { try{ save(); }catch(e){} }, 600);
  const total = courseTotal(c);
  live(state.courses).forEach((cc, idx) => {
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
  live(state.courses).forEach((cc, idx) => {
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
  state.gpaCourses.push({ id: uid(), name, credits, grade, updatedAt: Date.now() });
  save(); closeModal(); renderGrades(); toast('✅ تمت الإضافة');
}

