/* ============================================================================
   🎓 مُساعد الجامعة — money.js (الميزانية، دورة المكافأة، الدخل الإضافي، المصاريف، والأهداف)
   ============================================================================ */

/* ============================================================
   17.5) المصروف + الفلوس المضافة (الدخل) + الميزانية والأهداف
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
  if(base > today) return null;
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
  const exps = live(state.money.expenses);
  const last = getLastSalaryDate();
  if(!last) return exps;
  const lastISO = todayISO(last);
  const next = getNextSalaryDate();
  const nextISO = next ? todayISO(next) : '9999-12-31';
  return exps.filter(e => e.date >= lastISO && e.date < nextISO);
}
function getCurrentMonthIncomes(){
  const incs = live(state.money.incomes);
  const last = getLastSalaryDate();
  if(!last) return incs;
  const lastISO = todayISO(last);
  const next = getNextSalaryDate();
  const nextISO = next ? todayISO(next) : '9999-12-31';
  return incs.filter(inc => inc.date >= lastISO && inc.date < nextISO);
}
function getCycleLabel(){
  const last = getLastSalaryDate();
  if(!last) return 'كل العمليات المسجلة';
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return `من ${last.getDate()} ${months[last.getMonth()]} إلى الآن`;
}
function getTotalGoalSaved(){
  const last = getLastSalaryDate();
  const lastTs = last ? last.getTime() : 0;
  return live(state.money.goals).reduce((sum, g) => {
    if(!Array.isArray(g.txs) || !g.txs.length) return sum + Math.max(0, +g.saved || 0);
    const cycleNet = g.txs
      .filter(tx => tx.ts >= lastTs)
      .reduce((a, tx) => a + (+tx.amount || 0), 0);
    return sum + cycleNet;
  }, 0);
}
function getTotalSpent(){ return getCurrentMonthExpenses().reduce((a,b) => a + (+b.amount||0), 0); }
function getTotalAddedIncome(){ return getCurrentMonthIncomes().reduce((a,b) => a + (+b.amount||0), 0); }
function getTotalBudget(){ return (state.money.salary || 0) + getTotalAddedIncome(); }
function getRemaining(){ return getTotalBudget() - getTotalSpent() - getTotalGoalSaved(); }

function renderBalance(){
  const el = document.getElementById('balanceContent');
  if(!el) return;
  const salary = state.money.salary || 0;
  const addedIncome = getTotalAddedIncome();
  const totalBudget = salary + addedIncome;
  const rawSpent = getTotalSpent() + getTotalGoalSaved();
  const spent = Math.max(0, rawSpent);
  const remaining = totalBudget - rawSpent;
  const pct = totalBudget > 0 ? Math.min(100, Math.max(0, Math.round((spent / totalBudget) * 100))) : 0;
  const daysToSalary = getDaysToSalary();
  const cycleLabel = getCycleLabel();

  if(totalBudget === 0 && !live(state.money.expenses).length){
    el.innerHTML = `
      <div class="card" style="padding:40px;text-align:center">
        <div style="font-size:56px;margin-bottom:12px">💰</div>
        <h3 style="font-size:19px;margin-bottom:8px">ابدأ بإعداد راتبك أو أضف مبلغاً لميزانيتك</h3>
        <p style="color:var(--muted);margin-bottom:20px">حدد المكافأة الشهرية أو أضف أي مبلغ (حوالة، هدية، دخل إضافي) لتبدأ التتبع</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="openSalaryForm()">⚙️ إعداد الراتب الشهري</button>
          <button class="btn btn-primary" style="background:var(--ok)" onclick="openIncomeForm()">➕ زيادة فلوس / دخل</button>
        </div>
      </div>`;
    return;
  }

  if(salary > 0 && state.money.salaryExactDate && !getLastSalaryDate()){
    el.innerHTML = `
      <div class="card" style="border-inline-start:4px solid var(--warn);padding:40px;text-align:center">
        <div style="font-size:56px;margin-bottom:12px">⚠️</div>
        <h3 style="font-size:19px;margin-bottom:8px">تاريخ الراتب في المستقبل</h3>
        <p style="color:var(--muted);margin-bottom:20px">
          التاريخ المُسجَّل (${state.money.salaryExactDate}) لم يأتِ بعد.
          حدّثه إلى آخر راتب استلمته فعلاً.
        </p>
        <button class="btn btn-primary" onclick="openSalaryForm()">⚙️ تعديل التاريخ</button>
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

  const monthIncomes = getCurrentMonthIncomes().slice(-4).reverse();
  const incRows = monthIncomes.map(inc => {
    const src = getIncomeSrcById(inc.source);
    return `<div class="cd-item" onclick="openIncomeForm('${esc(inc.id)}')" style="cursor:pointer">
      <div class="ci-ico">${src.ico}</div>
      <div class="ci-main"><b>${esc(inc.note || src.name)}</b><span>${src.name} · ${fmtDate(inc.date)}</span></div>
      <div class="ci-side" style="background:var(--ok-bg);color:var(--ok)">+${fmtMoney(inc.amount)} ر.س</div>
    </div>`;
  }).join('');

  const activeGoals = live(state.money.goals).filter(g => (g.saved||0) < g.target).slice(0, 3);
  const goalsHTML = activeGoals.length ? activeGoals.map(g => {
    const p = Math.min(100, Math.round(((g.saved||0)/g.target)*100));
    return `<div class="cd-item" onclick="go('goals')" style="cursor:pointer">
      <div class="ci-ico">${esc(g.emoji||'🎯')}</div>
      <div class="ci-main"><b>${esc(g.name)}</b><span>${fmtMoney(g.saved||0)} / ${fmtMoney(g.target)} ر.س</span></div>
      <div class="ci-side" style="background:var(--p-light);color:var(--p-dark)">${p}%</div>
    </div>`;
  }).join('') : '';

  el.innerHTML = `
    <div class="money-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <div class="money-label">💰 الرصيد المتبقي حالياً</div>
          <div class="money-amount">${fmtMoney(remaining)} ر.س</div>
        </div>
        <button class="btn btn-sm" style="background:rgba(255,255,255,.22);color:#fff;backdrop-filter:blur(6px)" onclick="openIncomeForm()">➕ زيادة فلوس</button>
      </div>
      <div class="money-label" style="margin-top:4px;font-size:12px;opacity:.9">
        الراتب الأساسي: <b>${fmtMoney(salary)} ر.س</b>
        ${addedIncome > 0 ? ` · ➕ مضاف بالدورة: <b>+${fmtMoney(addedIncome)} ر.س</b>` : ''}
      </div>
      ${daysToSalary > 0 ? `<div class="money-label" style="margin-top:6px">📅 باقي ${daysToSalary} يوم على الراتب الجاي</div>` : ''}
      <div class="money-label" style="margin-top:4px;font-size:11px;opacity:.75">🔄 ${cycleLabel}</div>
      <div class="money-row" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
        <div class="money-item"><b>${fmtMoney(totalBudget)}</b><span>🏦 إجمالي الميزانية</span></div>
        <div class="money-item"><b>${fmtMoney(spent)}</b><span>💸 المصروف والمُدّخر</span></div>
        <div class="money-item"><b>+${fmtMoney(addedIncome)}</b><span>💰 فلوس مضافة</span></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <h3 style="font-size:17px">📊 تقدم الصرف من إجمالي الميزانية</h3>
        <span style="background:${statusBg};color:${barColor};padding:5px 12px;border-radius:20px;font-size:12.5px;font-weight:800">${statusText} · ${pct}%</span>
      </div>
      <div class="prog" style="height:14px"><i style="width:${pct}%;background:${barColor}"></i></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);font-weight:700;margin-top:8px">
        <span>0 ر.س</span><span>${fmtMoney(totalBudget)} ر.س</span>
      </div>
    </div>

    ${incRows ? `
      <div class="card" style="margin-bottom:16px">
        <div class="sec-head" style="margin-bottom:12px">
          <h3 style="font-size:17px">💰 آخر الإضافات المالية (الدخل الإضافي)</h3>
          <button class="btn btn-ghost btn-sm" onclick="expenseFilter='incomes';go('expenses')">عرض الكل</button>
        </div>
        ${incRows}
      </div>` : ''}

    ${catRows ? `
      <div class="card" style="margin-bottom:16px">
        <h3 style="font-size:17px;margin-bottom:14px">📈 توزيع المصروفات (الدورة الحالية)</h3>
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
      <button class="btn btn-primary" style="flex:1" onclick="openExpenseForm()">💸 إضافة مصروف</button>
      <button class="btn btn-primary" style="flex:1;background:var(--ok)" onclick="openIncomeForm()">➕ زيادة فلوس</button>
      <button class="btn btn-ghost" onclick="go('expenses')">📋 كل العمليات</button>
    </div>
  `;
}

function openSalaryForm(){
  const m = state.money;
  openModal('💰 الراتب / المكافأة الأساسية', `
    <div class="form-grid">
      <div class="field full"><label>المبلغ الشهري الثابت (ر.س) <span class="req">*</span></label>
        <input id="salaryAmount" type="number" min="0" step="0.01" value="${m.salary || ''}" placeholder="990"></div>
      <div class="field full">
        <label>تاريخ نزول الراتب الحالي <span class="req">*</span></label>
        <input id="salaryExactDate" type="date" value="${m.salaryExactDate || todayISO()}">
        <div style="font-size:12px;color:var(--muted);font-weight:600;margin-top:6px;line-height:1.7">
          💡 كل المصاريف والفلوس المضافة من هذا التاريخ تُحسب ضمن الدورة الحالية، وتتجدد الدورة تلقائياً كل شهر.<br>
          ➕ لإضافة مبلغ طارئ أو هدية أو تحويل بدون تغيير الراتب الثابت، استخدم زر <b>"زيادة فلوس"</b>.
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
  touchField(state.money, 'salary');
  touchField(state.money, 'salaryExactDate');
  save(); closeModal(); renderBalance(); renderExpenses();
  toast('✅ تم حفظ إعدادات الراتب');
}

/* ============ 💰 زيادة فلوس / إضافة دخل إضافي ============ */
function openIncomeForm(id){
  const inc = id ? live(state.money.incomes).find(x => x.id === id) : null;
  let selectedSrc = inc?.source || 'transfer';
  const srcBtns = INCOME_SOURCES.map(s => `
    <button type="button" data-src="${s.id}" class="src-btn ${selectedSrc === s.id ? 'sel' : ''}" style="background:${s.color}15;color:${s.color};border:2px solid ${selectedSrc === s.id ? s.color : 'transparent'};padding:10px 6px;border-radius:12px;font-weight:700;font-size:12.5px;transition:all .2s;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px">
      <span style="font-size:22px">${s.ico}</span>
      <span>${s.name}</span>
    </button>
  `).join('');

  openModal(inc ? 'تعديل المبلغ المضاف' : '💰 زيادة فلوس / دخل إضافي', `
    <div style="background:var(--ok-bg);color:var(--ok);padding:11px 14px;border-radius:12px;font-size:12.5px;font-weight:700;margin-bottom:14px">
      ✨ هذا المبلغ يُضاف مباشرة إلى رصيدك المتاح وميزانيتك الحالية دون المساس براتبك الأساسي.
    </div>
    <div class="form-grid">
      <div class="field full"><label>المبلغ المضاف (ر.س) <span class="req">*</span></label>
        <input id="incAmount" type="number" min="0" step="0.01" value="${inc?.amount || ''}" placeholder="200"></div>
      <div class="field full"><label>الوصف / المصدر (اختياري)</label>
        <input id="incNote" placeholder="مثال: تحويل من الوالد / مكافأة" value="${esc(inc?.note||'')}"></div>
      <div class="field full"><label>التاريخ</label>
        <input id="incDate" type="date" value="${inc?.date || todayISO()}"></div>
      <div class="field full"><label>نوع الإضافة <span class="req">*</span></label>
        <div id="srcGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${srcBtns}</div>
      </div>
    </div>
  `, `${inc ? `<button class="btn btn-danger" onclick="deleteIncome('${esc(id)}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" style="background:var(--ok)" onclick="saveIncome('${esc(id||'')}')">💾 إضافة للرصيد</button>`);

  const grid = document.getElementById('srcGrid');
  grid.querySelectorAll('.src-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSrc = btn.dataset.src;
      grid.querySelectorAll('.src-btn').forEach(b => {
        const s = getIncomeSrcById(b.dataset.src);
        const isSel = b.dataset.src === selectedSrc;
        b.style.borderColor = isSel ? s.color : 'transparent';
      });
    });
  });
  window._selectedIncSrc = () => selectedSrc;
}
function saveIncome(id){
  const amount = +document.getElementById('incAmount').value || 0;
  const note = document.getElementById('incNote').value.trim();
  const date = document.getElementById('incDate').value || todayISO();
  const source = window._selectedIncSrc ? window._selectedIncSrc() : 'transfer';
  if(amount <= 0){ toast('⚠️ أدخل مبلغاً صحيحاً'); return; }
  if(!Array.isArray(state.money.incomes)) state.money.incomes = [];
  if(id){
    const it = live(state.money.incomes).find(x => x.id === id);
    if(it){ Object.assign(it, { amount, note, date, source }); touchItem(it); }
  } else {
    state.money.incomes.push({ id: uid(), amount, note, date, source, created: Date.now(), updatedAt: Date.now() });
  }
  save(); closeModal();
  renderBalance(); renderExpenses();
  toast(`💰 تمت إضافة +${fmtMoney(amount)} ر.س إلى رصيدك!`);
}
async function deleteIncome(id){
  const ok = await appConfirm('حذف هذا المبلغ المضاف من رصيدك؟', {
    title: 'حذف مبلغ مضاف', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  (state.money.incomes || []).forEach(inc => { if(inc.id === id) tombstoneItem(inc); });
  save(); closeModal(); renderBalance(); renderExpenses(); toast('🗑️ تم الحذف');
}

function openExpenseForm(id){
  const e = id ? live(state.money.expenses).find(x => x.id === id) : null;
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
        <input id="expAmount" type="number" min="0" step="0.01" value="${e?.amount || ''}" placeholder="45"></div>
      <div class="field full"><label>الوصف (اختياري)</label>
        <input id="expNote" placeholder="مثال: غداء مع الشباب" value="${esc(e?.note||'')}"></div>
      <div class="field full"><label>التاريخ</label>
        <input id="expDate" type="date" value="${e?.date || todayISO()}"></div>
      <div class="field full"><label>التصنيف <span class="req">*</span></label>
        <div id="catGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${catBtns}</div>
      </div>
    </div>
  `, `${e ? `<button class="btn btn-danger" onclick="deleteExpense('${esc(id)}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveExpense('${esc(id||'')}')">💾 حفظ</button>`);

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
  if(amount <= 0){ toast('⚠️ أدخل مبلغاً صحيحاً'); return; }
  if(id){
    const it = live(state.money.expenses).find(x => x.id === id);
    if(it){ Object.assign(it, { amount, note, date, category }); touchItem(it); }
  } else {
    state.money.expenses.push({ id: uid(), amount, note, date, category, created: Date.now(), updatedAt: Date.now() });
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
  (state.money.expenses || []).forEach(e => { if(e.id === id) tombstoneItem(e); });
  save(); closeModal(); renderBalance(); renderExpenses(); toast('🗑️ تم');
}

function renderExpenses(){
  const list = document.getElementById('expensesList');
  if(!list) return;

  document.querySelectorAll('#expenseFilters .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.f === expenseFilter);
  });

  const expList = live(state.money.expenses).map(e => ({ ...e, txType: 'expense' }));
  const incList = live(state.money.incomes).map(i => ({ ...i, txType: 'income' }));
  let all = [...expList, ...incList].sort((a,b) => (b.date||'').localeCompare(a.date||'') || (b.created||0) - (a.created||0));

  const today = todayISO();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 6*86400000);
  const weekStart = todayISO(weekAgo);

  let items = all;
  if(expenseFilter === 'expenses') items = all.filter(x => x.txType === 'expense');
  else if(expenseFilter === 'incomes') items = all.filter(x => x.txType === 'income');
  else if(expenseFilter === 'today') items = all.filter(x => x.date === today);
  else if(expenseFilter === 'week') items = all.filter(x => x.date >= weekStart);
  else if(expenseFilter === 'cycle'){
    const cycExp = getCurrentMonthExpenses().map(e => ({ ...e, txType: 'expense' }));
    const cycInc = getCurrentMonthIncomes().map(i => ({ ...i, txType: 'income' }));
    items = [...cycExp, ...cycInc].sort((a,b) => (b.date||'').localeCompare(a.date||'') || (b.created||0) - (a.created||0));
  }

  const totalSpentShown = items.filter(x => x.txType === 'expense').reduce((a,b) => a + (+b.amount||0), 0);
  const totalIncShown = items.filter(x => x.txType === 'income').reduce((a,b) => a + (+b.amount||0), 0);

  document.getElementById('expensesCount').textContent = items.length
    ? `${items.length} عملية · المصاريف: ${fmtMoney(totalSpentShown)} ر.س${totalIncShown > 0 ? ` · المضاف: +${fmtMoney(totalIncShown)} ر.س` : ''}`
    : 'لا توجد عمليات مسجلة';

  if(!items.length){
    list.innerHTML = `<div class="empty"><div class="e-ico">💸</div><b>لا توجد عمليات هنا</b><p>سجّل مصروفاً جديداً أو أضف مبلغاً إلى رصيدك</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" onclick="openExpenseForm()">💸 إضافة مصروف</button><button class="btn btn-primary" style="background:var(--ok)" onclick="openIncomeForm()">➕ زيادة فلوس</button></div></div>`;
    return;
  }

  list.innerHTML = items.map(item => {
    if(item.txType === 'income'){
      const src = getIncomeSrcById(item.source);
      return `<div class="exp-item" style="border-inline-start:4px solid var(--ok)">
        <div class="exp-ico" style="background:var(--ok-bg);color:var(--ok)">${src.ico}</div>
        <div class="exp-main">
          <b>${esc(item.note || src.name)}</b>
          <span>${src.name} · ${fmtDate(item.date)}</span>
        </div>
        <div class="exp-amount" style="color:var(--ok)">+${fmtMoney(item.amount)}</div>
        <button class="mini-btn" onclick="openIncomeForm('${esc(item.id)}')" title="تعديل">✏️</button>
        <button class="mini-btn del" onclick="deleteIncome('${esc(item.id)}')" title="حذف">🗑️</button>
      </div>`;
    }
    const cat = getCatById(item.category);
    return `<div class="exp-item">
      <div class="exp-ico" style="background:${cat.color}22;color:${cat.color}">${cat.ico}</div>
      <div class="exp-main">
        <b>${esc(item.note || cat.name)}</b>
        <span>${cat.name} · ${fmtDate(item.date)}</span>
      </div>
      <div class="exp-amount" style="color:var(--danger)">-${fmtMoney(item.amount)}</div>
      <button class="mini-btn" onclick="openExpenseForm('${esc(item.id)}')" title="تعديل">✏️</button>
      <button class="mini-btn del" onclick="deleteExpense('${esc(item.id)}')" title="حذف">🗑️</button>
    </div>`;
  }).join('');
}

function renderGoals(){
  const list = document.getElementById('goalsList');
  if(!list) return;
  const goals = live(state.money.goals);
  const active = goals.filter(g => (g.saved||0) < g.target);
  const done = goals.filter(g => (g.saved||0) >= g.target);
  document.getElementById('goalsCount').textContent = goals.length
    ? `${goals.length} هدف · ${done.length} مكتمل`
    : 'لا توجد أهداف';

  if(!goals.length){
    list.innerHTML = `<div class="empty"><div class="e-ico">🎯</div><b>لا توجد أهداف</b><p>حدد أهدافك المالية وابدأ بالادخار</p><button class="btn btn-primary" onclick="openGoalForm()">➕ هدف جديد</button></div>`;
    return;
  }

  const renderGoal = (g) => {
    const p = Math.min(100, Math.round(((g.saved||0)/g.target)*100));
    const remain = Math.max(0, g.target - (g.saved||0));
    const isDone = p >= 100;
    return `<div class="goal-card">
      <div class="goal-head">
        <div class="goal-title">
          <span style="font-size:26px">${esc(g.emoji || '🎯')}</span>
          <span>${esc(g.name)}</span>
          ${isDone ? '<span style="background:var(--ok-bg);color:var(--ok);padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:800">✅ مكتمل</span>' : ''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="mini-btn" onclick="openGoalForm('${esc(g.id)}')">✏️</button>
          <button class="mini-btn del" onclick="deleteGoal('${esc(g.id)}')">🗑️</button>
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
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="addToGoal('${esc(g.id)}')">➕ إيداع</button>
        ${(g.saved||0) > 0 ? `<button class="btn btn-ghost btn-sm" onclick="withdrawFromGoal('${esc(g.id)}')">➖ سحب</button>` : ''}
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
  const g = id ? live(state.money.goals).find(x => x.id === id) : null;
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
  `, `${g ? `<button class="btn btn-danger" onclick="deleteGoal('${esc(id)}')">🗑️</button>` : ''}<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="saveGoal('${esc(id||'')}')">💾 حفظ</button>`);

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
  const savedRaw = document.getElementById('gSaved').value;
  const saved = Math.max(0, +savedRaw || 0);
  const emoji = window._selectedGoalEmoji ? window._selectedGoalEmoji() : '🎯';
  if(!name){ toast('⚠️ اكتب اسم الهدف'); return; }
  if(target <= 0){ toast('⚠️ أدخل المبلغ المطلوب'); return; }

  let g;
  if(id){
    g = live(state.money.goals).find(x => x.id === id);
    if(g){ Object.assign(g, { name, target, saved, emoji }); touchItem(g); }
  } else {
    g = { id: uid(), name, target, saved, emoji, created: Date.now(), updatedAt: Date.now(), txs: [] };
    state.money.goals.push(g);
  }
  reconcileGoalTxs(g);
  save(); closeModal(); renderGoals(); renderBalance(); toast('✅ تم الحفظ');
}
async function deleteGoal(id){
  const ok = await appConfirm('حذف هذا الهدف؟', {
    title: 'حذف الهدف', emoji: '🗑️', okText: 'حذف'
  });
  if(!ok) return;
  (state.money.goals || []).forEach(g => { if(g.id === id) tombstoneItem(g); });
  save(); closeModal(); renderGoals(); renderBalance(); toast('🗑️ تم');
}
function addToGoal(id){
  const g = live(state.money.goals).find(x => x.id === id);
  if(!g) return;
  openModal(`💰 إيداع في: ${g.name}`, `
    <div class="field"><label>المبلغ (ر.س)</label>
      <input id="depAmt" type="number" min="1" step="0.01" value="100"></div>
    <div style="background:var(--p-light);padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:700;margin-top:12px;color:var(--p-dark)">
      💡 باقي: ${fmtMoney(Math.max(0, g.target - (g.saved||0)))} ر.س للوصول للهدف
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="doDeposit('${esc(id)}')">💾 إيداع</button>`);
}
function doDeposit(id){
  const amt = +document.getElementById('depAmt').value || 0;
  if(amt <= 0){ toast('⚠️ أدخل مبلغاً صحيحاً'); return; }
  const g = live(state.money.goals).find(x => x.id === id);
  if(!g) return;
  g.saved = (g.saved||0) + amt;
  g.txs = Array.isArray(g.txs) ? g.txs : [];
  g.txs.push({ ts: Date.now(), amount: amt });
  touchItem(g);
  reconcileGoalTxs(g);
  save(); closeModal(); renderGoals(); renderBalance();
  if((g.saved||0) >= g.target) toast('🎉 مبروك! حققت هدفك!');
  else toast(`✅ تم إيداع ${fmtMoney(amt)} ر.س`);
}
function withdrawFromGoal(id){
  const g = live(state.money.goals).find(x => x.id === id);
  if(!g) return;
  openModal(`➖ سحب من: ${g.name}`, `
    <div class="field"><label>المبلغ (ر.س)</label>
      <input id="wdrAmt" type="number" min="1" step="0.01" value="${g.saved||0}"></div>
    <div style="background:var(--warn-bg);padding:10px 14px;border-radius:10px;font-size:12.5px;font-weight:700;margin-top:12px;color:var(--warn)">
      ⚠️ المُوفَّر حالياً: ${fmtMoney(g.saved||0)} ر.س
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-primary" onclick="doWithdraw('${esc(id)}')">سحب</button>`);
}
function doWithdraw(id){
  const amt = +document.getElementById('wdrAmt').value || 0;
  if(amt <= 0){ toast('⚠️ أدخل مبلغاً صحيحاً'); return; }
  const g = live(state.money.goals).find(x => x.id === id);
  if(!g) return;
  const actualWithdrawn = Math.min(g.saved || 0, amt);
  g.saved = Math.max(0, (g.saved||0) - amt);
  if(actualWithdrawn > 0){
    g.txs = Array.isArray(g.txs) ? g.txs : [];
    g.txs.push({ ts: Date.now(), amount: -actualWithdrawn });
  }
  touchItem(g);
  reconcileGoalTxs(g);
  save(); closeModal(); renderGoals(); renderBalance(); toast('↩️ تم السحب');
}

document.getElementById('expenseFilters')?.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if(!chip) return;
  document.querySelectorAll('#expenseFilters .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  expenseFilter = chip.dataset.f;
  renderExpenses();
});

function migrateGoalsTx(){
  let changed = false;
  (state.money.goals || []).forEach(g => {
    if(!Array.isArray(g.txs)){
      if((g.saved || 0) > 0){
        g.txs = [{ ts: 1, amount: +g.saved }];
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

function reconcileGoalTxs(g){
  if(!g) return;
  g.txs = Array.isArray(g.txs) ? g.txs : [];
  const txsSum = g.txs.reduce((a, t) => a + (+t.amount || 0), 0);
  const diff = (+g.saved || 0) - txsSum;
  if(Math.abs(diff) > 0.001){
    g.txs.push({ ts: Date.now(), amount: diff });
  }
}

