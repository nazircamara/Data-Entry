/* renderer.js was created during a tooling change and is now intentionally left minimal to restore original project state. */
/* Original inline script remains in index.html. */
let grades = JSON.parse(localStorage.getItem("grades")) || ["Category 1"];
let currentGrade = localStorage.getItem("currentGrade") || "Category 1";
let recordTime = JSON.parse(localStorage.getItem("recordTime")) || false;
let exportTitle = localStorage.getItem("exportTitle") || "";

if (!grades.includes(currentGrade)) {
    currentGrade = grades[0];
    localStorage.setItem("currentGrade", currentGrade);
}

let fields = JSON.parse(localStorage.getItem(`fields_${currentGrade}`)) || ["Full Name","Email"];
let data = [];

// IndexedDB wrapper (async, non-blocking persistence)
const IDB_NAME = 'recordhub';
const IDB_VERSION = 1;
let __idb = null;
function openIDB(){
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return resolve(null);
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('rows')) db.createObjectStore('rows', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => { __idb = e.target.result; resolve(__idb); };
    req.onerror = e => { console.warn('IDB open error', e); resolve(null); };
  });
}

function idbGetKV(key){
  return new Promise((resolve) => {
    if (!__idb) return resolve(null);
    const tx = __idb.transaction('kv', 'readonly');
    const store = tx.objectStore('kv');
    const rq = store.get(key);
    rq.onsuccess = () => resolve(rq.result ? rq.result.value : null);
    rq.onerror = () => resolve(null);
  });
}
function idbSetKV(key, value){
  return new Promise((resolve) => {
    if (!__idb) return resolve(false);
    /* GLOBAL STATE */
    let lang = localStorage.getItem("lang") || "en";
    let grades = JSON.parse(localStorage.getItem("grades")) || ["Category 1"];
    let currentGrade = localStorage.getItem("currentGrade") || "Category 1";
    let recordTime = JSON.parse(localStorage.getItem("recordTime")) || false;
    let exportTitle = localStorage.getItem("exportTitle") || "";

    if (!grades.includes(currentGrade)) {
        currentGrade = grades[0];
        localStorage.setItem("currentGrade", currentGrade);
    }

    let fields = JSON.parse(localStorage.getItem(`fields_${currentGrade}`)) || ["Full Name","Email"];
    // `data` is an array of { id: <dbId>, values: [...], time: "" }
    let data = [];

    // IndexedDB wrapper (async, non-blocking persistence)
    const IDB_NAME = 'recordhub';
    const IDB_VERSION = 1;
    let __idb = null;
    function openIDB(){
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) return resolve(null);
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
          if (!db.objectStoreNames.contains('rows')) db.createObjectStore('rows', { keyPath: 'id', autoIncrement: true });
        };
        req.onsuccess = e => { __idb = e.target.result; resolve(__idb); };
        req.onerror = e => { console.warn('IDB open error', e); resolve(null); };
      });
    }

    function idbGetKV(key){
      return new Promise((resolve) => {
        if (!__idb) return resolve(null);
        const tx = __idb.transaction('kv', 'readonly');
        const store = tx.objectStore('kv');
        const rq = store.get(key);
        rq.onsuccess = () => resolve(rq.result ? rq.result.value : null);
        rq.onerror = () => resolve(null);
      });
    }
    function idbSetKV(key, value){
      return new Promise((resolve) => {
        if (!__idb) return resolve(false);
        const tx = __idb.transaction('kv', 'readwrite');
        const store = tx.objectStore('kv');
        store.put({ key, value });
        tx.oncomplete = () => resolve(true);
        tx.onabort = tx.onerror = () => resolve(false);
      });
    }
    function idbRemoveKV(key){
      return new Promise((resolve) => {
        if (!__idb) return resolve(false);
        const tx = __idb.transaction('kv', 'readwrite');
        const store = tx.objectStore('kv');
        const rq = store.delete(key);
        rq.onsuccess = () => resolve(true);
        rq.onerror = () => resolve(false);
      });
    }

    function addRowToDB(grade, row){
      return new Promise((resolve, reject) => {
        if (!__idb) return resolve(null);
        const tx = __idb.transaction('rows', 'readwrite');
        const store = tx.objectStore('rows');
        const item = Object.assign({ grade }, row);
        const rq = store.add(item);
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => { console.warn('addRowToDB error', rq.error); resolve(null); };
      });
    }

    function updateRowInDB(id, row){
      return new Promise((resolve) => {
        if (!__idb) return resolve(false);
        const tx = __idb.transaction('rows', 'readwrite');
        const store = tx.objectStore('rows');
        const rq = store.put(Object.assign({ id }, row));
        rq.onsuccess = () => resolve(true);
        rq.onerror = () => { console.warn('updateRowInDB error', rq.error); resolve(false); };
      });
    }

    function getRowsForGrade(grade){
      return new Promise((resolve) => {
        if (!__idb) return resolve([]);
        const tx = __idb.transaction('rows', 'readonly');
        const store = tx.objectStore('rows');
        const out = [];
        store.openCursor().onsuccess = function(e){
          const cursor = e.target.result;
          if (!cursor) { resolve(out); return; }
          const v = cursor.value;
          if (v.grade === grade) out.push({ id: v.id, values: v.values, time: v.time });
          cursor.continue();
        };
      });
    }

    function clearRowsForGrade(grade){
      return new Promise((resolve) => {
        if (!__idb) return resolve(false);
        const tx = __idb.transaction('rows', 'readwrite');
        const store = tx.objectStore('rows');
        const toDelete = [];
        store.openCursor().onsuccess = function(e){
          const cursor = e.target.result;
          if (!cursor) {
            // delete collected keys
            if (toDelete.length === 0) return resolve(true);
            let cnt = 0;
            toDelete.forEach(k => { const r = store.delete(k); r.onsuccess = () => { cnt++; if (cnt === toDelete.length) resolve(true); }; r.onerror = () => { cnt++; if (cnt === toDelete.length) resolve(false); }; });
            return;
          }
          const v = cursor.value;
          if (v.grade === grade) toDelete.push(v.id);
          cursor.continue();
        };
      });
    }

    const form = document.getElementById("form");
    const thead = document.getElementById("thead");
    const tbody = document.getElementById("tbody");

    const i18n = {
      en: {
        title: "📁 RecordHub",
        gradeTitle: "📂 Current Category",
        setup: "⚙️ Form Fields",
        records: "📋 Registered Records",
        addField: "Add",
        newGrade: "＋ New Category",
        language: "Language",
        print: "🖨 Print",
        export: "📄 Excel",
        clear: "🗑 Clear Grade",
        exportTitlePlaceholder: "Report title (appears in Excel)",
        timeToggleLabel: "Record Time",
        deleteCurrentGradeTitle: "Delete Current Category",
        mustHaveOne: "You must have at least one category.",
        placeholderGrade: "e.g. Category A",
        placeholderField: "Add a field",
        register: "Complete Registration",
        confirmClear: "Delete all records for this grade?",
        confirmDeleteField: "Delete this field?",
        confirmDeleteGrade: "Delete the ENTIRE grade and all its students? This cannot be undone.",
        searchPlaceholder: "🔍 Search entries...",
        time: "Time"
      },
      ar: {
        title: "📁 RecordHub",
        gradeTitle: "📂 المرحلة / الفئة الحالية",
        setup: "⚙️ حقول النموذج",
        records: "📋 السجلات المسجلة",
        addField: "إضافة",
        newGrade: "فئة جديدة ＋",
        print: "🖨 طباعة",
        export: "📄 إكسل",
        clear: "🗑 مسح الصف",
        exportTitlePlaceholder: "عنوان التقرير (يظهر في الإكسل)",
        timeToggleLabel: "تسجيل الوقت",
        deleteCurrentGradeTitle: "حذف الفئة الحالية",
        placeholderGrade: "مثلاً: الصف 10",
        placeholderField: "إضافة حقل",
        register: "إتمام التسجيل",
        confirmClear: "مسح جميع السجلات لهذا الصف؟",
        mustHaveOne: "يجب أن يكون لديك فئة واحدة على الأقل.",
        confirmDeleteField: "حذف هذا الحقل؟",
        confirmDeleteGrade: "هل تريد حذف هذا الصف بالكامل مع جميع طلابه؟ لا يمكن التراجع عن هذا الإجراء.",
        searchPlaceholder: "🔍 بحث...",
        time: "Time"
      }
    };

    /* GRADE MANAGEMENT */
    function applyLang(){
      const t = i18n[lang];
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      const titleEl = document.getElementById("title"); if (titleEl) titleEl.innerText = t.title;
      const gradeTitleEl = document.getElementById("gradeTitle"); if (gradeTitleEl) gradeTitleEl.innerText = t.gradeTitle;
      const setupEl = document.getElementById("setupTitle"); if (setupEl) setupEl.innerText = t.setup;
      const recordsEl = document.getElementById("recordsTitle"); if (recordsEl) recordsEl.innerText = t.records;
      const addFieldBtn = document.getElementById("addFieldBtn"); if (addFieldBtn) addFieldBtn.innerText = t.addField;
      const btnAddGrade = document.getElementById("btnAddGrade"); if (btnAddGrade) btnAddGrade.innerText = t.newGrade;
      const newGradeName = document.getElementById("newGradeName"); if (newGradeName) newGradeName.placeholder = t.placeholderGrade;
      const newField = document.getElementById("newField"); if (newField) newField.placeholder = t.placeholderField;
      const timeLabelEl = document.getElementById("timeToggleLabel"); if (timeLabelEl) timeLabelEl.innerText = t.timeToggleLabel || "";
      const langBtnTextEl = document.getElementById("langBtnText"); if (langBtnTextEl) langBtnTextEl.innerText = t.language || "";
      const exportTitleEl = document.getElementById("exportTitle"); if (exportTitleEl) exportTitleEl.placeholder = t.exportTitlePlaceholder || "";
      const btnDelGradeEl = document.getElementById("btnDelGrade"); if (btnDelGradeEl) btnDelGradeEl.title = t.deleteCurrentGradeTitle || "";
      const btnPrintEl = document.getElementById("btnPrint"); if (btnPrintEl) btnPrintEl.innerText = t.print || btnPrintEl.innerText;
      const searchEl = document.getElementById("searchInput"); if (searchEl) searchEl.placeholder = t.searchPlaceholder || searchEl.placeholder;
      const btnExport = document.getElementById("btnExport"); if (btnExport) btnExport.innerText = t.export || btnExport.innerText;
      const btnClear = document.getElementById("btnClear"); if (btnClear) btnClear.innerText = t.clear || btnClear.innerText;
      const timeToggleEl = document.getElementById("timeToggle"); if (timeToggleEl) timeToggleEl.checked = !!recordTime;
      if (exportTitleEl) exportTitleEl.value = exportTitle || "";
    }
    function updateGradeDropdown() {
      const select = document.getElementById("gradeSelect");
      select.innerHTML = grades.map(g => `<option value="${g}" ${g === currentGrade ? 'selected' : ''}>${g}</option>`).join("");
    }

    function addGrade() {
      const name = document.getElementById("newGradeName").value.trim();
      if(!name || grades.includes(name)) return;
      grades.push(name);
      localStorage.setItem("grades", JSON.stringify(grades));
      currentGrade = name;
      localStorage.setItem("currentGrade", currentGrade);
      // initialize data/fields for the new category
      fields = JSON.parse(localStorage.getItem(`fields_${currentGrade}`)) || ["Full Name","Email"];
      data = JSON.parse(localStorage.getItem(`data_${currentGrade}`)) || [];
      init();
    }

    function switchGrade() {
      (async function(){
        currentGrade = document.getElementById("gradeSelect").value;
        if (__idb) await idbSetKV('currentGrade', currentGrade);
        else localStorage.setItem("currentGrade", currentGrade);
        const storedFields = __idb ? await idbGetKV(`fields_${currentGrade}`) : JSON.parse(localStorage.getItem(`fields_${currentGrade}`));
        fields = storedFields || ["Full Name","Email"];
        data = await getRowsForGrade(currentGrade) || [];
        applyLang();
        updateGradeDropdown();
        renderFieldList();
        renderForm();
        renderTable();
        refreshAllRows();
      })();
    }

    async function deleteGrade() {
      if (grades.length <= 1) { setStatus(i18n[lang].mustHaveOne); return; }
        if (confirm(i18n[lang].confirmDeleteGrade)) {
        // remove records for the grade from IDB and remove fields
        await clearRowsForGrade(currentGrade);
        if (__idb) await idbRemoveKV(`fields_${currentGrade}`);
        grades = grades.filter(g => g !== currentGrade);
        if (__idb) await idbSetKV('grades', grades);
      currentGrade = grades[0];
      if (__idb) await idbSetKV('currentGrade', currentGrade);
      fields = JSON.parse(localStorage.getItem(`fields_${currentGrade}`)) || ["Full Name","Email"];
      data = [];
      init();
        }
    }

    function getEnglishTimestamp() {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${h}:${m}`;
    }

    async function init() {
      await openIDB();
      // load saved language preference from IDB if present
      const storedLang = await idbGetKV('lang');
      if (storedLang) lang = storedLang;
      // Load persisted state from IDB when available (fallback to localStorage)
      const storedGrades = await idbGetKV('grades');
      if (storedGrades) grades = storedGrades;
      const storedCurrent = await idbGetKV('currentGrade');
      if (storedCurrent) currentGrade = storedCurrent;
      const storedRecordTime = await idbGetKV('recordTime');
      if (typeof storedRecordTime === 'boolean') recordTime = storedRecordTime;
      const storedExportTitle = await idbGetKV('exportTitle');
      if (storedExportTitle) exportTitle = storedExportTitle;
      const storedFields = await idbGetKV(`fields_${currentGrade}`);
      if (storedFields) fields = storedFields;

      // load rows for current grade
      const rows = await getRowsForGrade(currentGrade);
      data = rows || [];

      applyLang();
      updateGradeDropdown();
      renderFieldList();
      renderForm();
      renderTable();
      refreshAllRows();
    }

    // Toggle language and persist preference
    function toggleLang(){
      lang = lang === 'en' ? 'ar' : 'en';
      if (__idb) idbSetKV('lang', lang);
      else localStorage.setItem('lang', lang);
      applyLang();
    }

    function renderFieldList() {
      const list = document.getElementById("fieldList");
      list.innerHTML = "";
      fields.forEach((f, index) => {
        const chip = document.createElement("div");
        chip.className = "field-chip";
        chip.innerHTML = `${f} <span onclick="deleteField(${index})">&times;</span>`;
        list.appendChild(chip);
      });
    }

    function addField(){
      const input = document.getElementById("newField");
      if(!input.value) return;
      const value = input.value;
      if (!value) return;
      fields.push(value);
      input.value = "";
      // Add empty slot to each row in chunks to avoid blocking
      if (data.length === 0) {
        saveImmediate();
        init();
        return;
      }
      showBusy('Adding field to records...');
      const total = data.length;
      let idx = 0;
      const chunk = 500;
      function addChunk() {
        (async function(){
          for (let i = 0; i < chunk && idx < total; i++, idx++) {
            data[idx].values.push("");
            if (data[idx].id) await updateRowInDB(data[idx].id, data[idx]);
            else {
              const newId = await addRowToDB(currentGrade, data[idx]);
              if (newId) data[idx].id = newId;
            }
          }
          if (idx < total) setTimeout(addChunk, 0);
          else {
            await idbSetKV(`fields_${currentGrade}`, fields);
            hideBusy();
            init();
          }
        })();
      }
      addChunk();
    }

    function deleteField(index) {
      if (!confirm(i18n[lang].confirmDeleteField)) return;
      // Remove the field descriptor first
      fields.splice(index, 1);
      // Process row value removals in chunks to avoid UI freeze
      if (data.length === 0) { saveImmediate(); init(); return; }
      showBusy('Removing field from records...');
      const total = data.length;
      let idx = 0;
      const chunk = 500;
      function removeChunk() {
        (async function(){
          for (let i = 0; i < chunk && idx < total; i++, idx++) {
            if (data[idx] && Array.isArray(data[idx].values)) {
              data[idx].values.splice(index, 1);
              if (data[idx].id) await updateRowInDB(data[idx].id, data[idx]);
              else {
                const newId = await addRowToDB(currentGrade, data[idx]);
                if (newId) data[idx].id = newId;
              }
            }
          }
          if (idx < total) setTimeout(removeChunk, 0);
          else {
            await idbSetKV(`fields_${currentGrade}`, fields);
            hideBusy();
            init();
          }
        })();
      }
      removeChunk();
    }

    function renderForm(){
      form.innerHTML="";
      fields.forEach(f=>{
        const input = document.createElement("input");
        input.placeholder = f;
        input.required = true;
        form.appendChild(input);
      });
      const btn = document.createElement("button");
      btn.className = "primary";
      btn.innerText = i18n[lang].register;
      form.appendChild(btn);
    }

    form.onsubmit = async e => {
      e.preventDefault();
      const values = [...form.querySelectorAll("input")].map(i => i.value);
      const row = { values, time: recordTime ? getEnglishTimestamp() : "" };
      // Persist row to IDB and update in-memory list
      const id = await addRowToDB(currentGrade, row);
      row.id = id;
      data.push(row);
      addRow(row, data.length - 1);
      // Persist metadata (fields/grades) shortly
      save();
      form.reset();
    };

    function renderTable(){
      thead.innerHTML = `<th>#</th>` + fields.map(f => `<th>${f}</th>`).join("") + (recordTime ? `<th>${i18n[lang].time}</th>` : "");
      tbody.innerHTML="";
    }

    function addRow(row, index){
      const tr = tbody.insertRow();
      const idxTd = document.createElement("td");
      idxTd.innerText = index + 1;
      tr.appendChild(idxTd);
      row.values.forEach((v, vIdx) => {
        const td = document.createElement("td");
        td.contentEditable = true;
        td.innerText = v;
        td.oninput = async () => {
          // update in-memory and persist only this row
          data[index].values[vIdx] = td.innerText;
          save();
          if (data[index].id) await updateRowInDB(data[index].id, data[index]);
        };
        tr.appendChild(td);
      });
      if (recordTime) {
        const timeTd = document.createElement("td");
        timeTd.innerText = row.time || "";
        tr.appendChild(timeTd);
      }
    }

    function refreshAllRows() {
      // Chunked rendering for large datasets to avoid blocking the UI.
      tbody.innerHTML = "";
      const total = data.length;
      const chunkSize = total > 1000 ? 200 : 200; // keep chunk size moderate
      let idx = 0;

      function showBusy(msg) {
        const el = document.getElementById('busyOverlay');
        if (el) { el.innerText = msg || 'Working…'; el.style.display = 'flex'; }
      }
      function hideBusy() { const el = document.getElementById('busyOverlay'); if (el) el.style.display = 'none'; }

      if (total === 0) { hideBusy(); return; }
      showBusy('Rendering records...');

      function renderChunk() {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < chunkSize && idx < total; i++, idx++) {
          const row = data[idx];
          const tr = document.createElement('tr');
          const idxTd = document.createElement('td');
          idxTd.innerText = idx + 1;
          tr.appendChild(idxTd);
          row.values.forEach((v, vIdx) => {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.innerText = v;
            // capture the row index for the handler
            const rIndex = idx;
            td.oninput = () => { data[rIndex].values[vIdx] = td.innerText; save(); };
            tr.appendChild(td);
          });
          if (recordTime) {
            const timeTd = document.createElement('td');
            timeTd.innerText = row.time || "";
            tr.appendChild(timeTd);
          }
          frag.appendChild(tr);
        }
        tbody.appendChild(frag);
        if (idx < total) {
          // yield to the event loop so the UI remains responsive
          setTimeout(renderChunk, 0);
        } else {
          hideBusy();
        }
      }

      renderChunk();
    }

    function searchRecords() {
        const term = document.getElementById("searchInput").value.toLowerCase();
        for (let row of tbody.rows) {
            row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
        }
    }

    // Debounced save to avoid blocking main thread when data is large.
    let __saveTimer = null;
    let __saveScheduled = false;
    function showBusy(msg) { const el = document.getElementById('busyOverlay'); if (el) { el.innerText = msg || 'Working…'; el.style.display = 'flex'; } }
    function hideBusy() { const el = document.getElementById('busyOverlay'); if (el) el.style.display = 'none'; }
    function setStatus(msg, ms){
      const s = document.getElementById('statusBar');
      if (!s) return;
      s.innerText = msg + (ms ? ` (${ms} ms)` : '');
      s.style.display = 'block';
      clearTimeout(s._t);
      s._t = setTimeout(()=>{ s.style.display = 'none'; }, 5000);
    }

    function saveImmediate() {
      try {
        const t0 = performance.now();
        showBusy('Saving...');
        localStorage.setItem(`fields_${currentGrade}`, JSON.stringify(fields));
        localStorage.setItem(`data_${currentGrade}`, JSON.stringify(data));
        localStorage.setItem("grades", JSON.stringify(grades));
        localStorage.setItem("currentGrade", currentGrade);
        localStorage.setItem("recordTime", JSON.stringify(recordTime));
        const titleEl = document.getElementById("exportTitle");
        if (titleEl) {
          exportTitle = titleEl.value || "";
          localStorage.setItem("exportTitle", exportTitle);
        }
        const t1 = performance.now();
        const dur = Math.round(t1 - t0);
        console.info('saveImmediate duration', dur, 'ms', 'items:', fields.length, data.length);
        hideBusy();
        setStatus('Saved', dur);
      } catch (e) {
        console.warn('Save failed:', e);
      }
    }

    function save(){
      // Schedule a periodic save to avoid frequent blocking; only one timer runs.
      if (__saveTimer) return; // already scheduled
      __saveTimer = setTimeout(() => { saveImmediate(); __saveTimer = null; __saveScheduled = false; }, 3000);
      __saveScheduled = true;
    }

    function exportCSV(){
      // Ensure recent changes are flushed before exporting
      saveImmediate();
      const title = localStorage.getItem("exportTitle") || document.getElementById("exportTitle")?.value || "";
      const includeTime = !!recordTime;

      const aoa = [];
      if (title) { aoa.push([title]); aoa.push([]); }
      const header = fields.slice();
      if (includeTime) header.push('Time');
      aoa.push(header);
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const r = row.values.map(v => v == null ? '' : v);
        if (includeTime) r.push(row.time || '');
        aoa.push(r);
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${currentGrade}_list.xlsx`;
      a.click();
    }

    async function clearData(){
      if(confirm(i18n[lang].confirmClear)){
      // Clear rows for current grade from IDB and memory
      await clearRowsForGrade(currentGrade);
      data = [];
      saveImmediate();
      refreshAllRows();
      }
  
    }

    function toggleRecordTime(){
      recordTime = !!document.getElementById("timeToggle").checked;
      localStorage.setItem("recordTime", JSON.stringify(recordTime));
      renderTable();
      refreshAllRows();
    }


    init();
