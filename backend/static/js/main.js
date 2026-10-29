const initData = JSON.parse(document.getElementById('init-data').textContent);
const LINH_VUC_OPTIONS = initData.LINH_VUC_OPTIONS;
const TRANG_THAI_OPTIONS = initData.TRANG_THAI_OPTIONS;
const CATEGORIES = initData.CATEGORIES;

let allRecords = [];
let editingKey = null;
let selectedKey = null;
let activeCategory = null;
let activeFileName = null;
let uploadTargetKey = null;
let uploadTargetCategory = null;
let currentViewMode = 'cards'; // default to cards
let expandedGroups = new Set();
let quill = null;

// Initialize Quill Editor
document.addEventListener('DOMContentLoaded', () => {
  quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Nhập ghi chú...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
      ]
    }
  });
});

function onGroupToggle(ev, groupKey) {
  if (ev.target.open) expandedGroups.add(groupKey);
  else expandedGroups.delete(groupKey);
}

function setViewMode(mode) {
  currentViewMode = mode;
  document.getElementById('btnViewCards').classList.toggle('active', mode === 'cards');
  document.getElementById('btnViewTree').classList.toggle('active', mode === 'tree');
  document.getElementById('cardsRoot').style.display = mode === 'cards' ? 'flex' : 'none';
  document.getElementById('treeRoot').style.display = mode === 'tree' ? 'block' : 'none';
  renderList();
}

function togglePanel(which) {
  const isList = which === 'list';
  const panel = document.getElementById(isList ? 'listPanel' : 'timelinePanel');
  const btn = document.getElementById(isList ? 'listPanelToggle' : 'timelinePanelToggle');
  const collapsed = panel.classList.toggle('collapsed');
  
  if (isList) {
    btn.innerHTML = collapsed ? '<i class="fa-solid fa-chevron-right"></i>' : '<i class="fa-solid fa-chevron-left"></i>';
  } else {
    btn.innerHTML = collapsed ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-right"></i>';
  }
  btn.title = collapsed ? 'Mở rộng' : 'Thu gọn';
}

function fillSelect(id, options, withEmpty) {
  const sel = document.getElementById(id);
  if (withEmpty) sel.innerHTML = '<option value="">— Chọn —</option>';
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o;
    sel.appendChild(opt);
  });
}

fillSelect('f_linhvuc', LINH_VUC_OPTIONS, false);
fillSelect('f_trangthai', TRANG_THAI_OPTIONS, false);

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

const FILE_ICONS = {
  pdf: '<i class="fa-solid fa-file-pdf" style="color: #ef4444;"></i>',
  doc: '<i class="fa-solid fa-file-word" style="color: #3b82f6;"></i>', 
  docx: '<i class="fa-solid fa-file-word" style="color: #3b82f6;"></i>',
  xls: '<i class="fa-solid fa-file-excel" style="color: #22c55e;"></i>', 
  xlsx: '<i class="fa-solid fa-file-excel" style="color: #22c55e;"></i>',
  ppt: '<i class="fa-solid fa-file-powerpoint" style="color: #f97316;"></i>', 
  pptx: '<i class="fa-solid fa-file-powerpoint" style="color: #f97316;"></i>',
  jpg: '<i class="fa-solid fa-file-image" style="color: #8b5cf6;"></i>', 
  jpeg: '<i class="fa-solid fa-file-image" style="color: #8b5cf6;"></i>', 
  png: '<i class="fa-solid fa-file-image" style="color: #8b5cf6;"></i>', 
  gif: '<i class="fa-solid fa-file-image" style="color: #8b5cf6;"></i>',
  txt: '<i class="fa-solid fa-file-lines" style="color: #6b7280;"></i>', 
  rtf: '<i class="fa-solid fa-file-lines" style="color: #6b7280;"></i>',
  zip: '<i class="fa-solid fa-file-zipper" style="color: #eab308;"></i>', 
  rar: '<i class="fa-solid fa-file-zipper" style="color: #eab308;"></i>',
};
function fileExt(fileName) {
  const m = /\.([a-z0-9]+)$/i.exec(fileName || '');
  return m ? m[1].toLowerCase() : '';
}
function fileIcon(fileName) { return FILE_ICONS[fileExt(fileName)] || '<i class="fa-solid fa-file" style="color: #9ca3af;"></i>'; }
function isPdfFile(fileName) { return fileExt(fileName) === 'pdf'; }

function getSelectedRecord() {
  return allRecords.find(x => x['Tên thư mục hồ sơ'] === selectedKey) || null;
}

function firstAvailablePdf(r) {
  for (const cat of CATEGORIES) {
    const files = (r.pdfs && r.pdfs[cat]) || [];
    if (files.length) return { category: cat, file: files[0] };
  }
  return null;
}

async function loadData() {
  const res = await fetch('/api/ho_so');
  allRecords = await res.json();
  renderStats();
  renderList();
  renderRecordHeader();
  renderPreview();
  renderTimeline();
}

function renderStats() {
  const total = allRecords.length;
  const done = allRecords.filter(r => r['Trạng thái'] === 'Đã hoàn thành').length;
  const withPdf = allRecords.filter(r => r.pdfs && CATEGORIES.some(c => (r.pdfs[c]||[]).length > 0)).length;
  document.getElementById('statsLine').innerHTML =
    `Tổng hợp · <b class="stat-total">${total}</b> hồ sơ · <b class="stat-done">${done}</b> đã hoàn thành · <b class="stat-pending">${total - done}</b> đang xử lý · <b class="stat-pdf">${withPdf}</b> có tệp tin`;
}

function countPdfs(r) {
  if (!r.pdfs) return 0;
  return CATEGORIES.reduce((sum, c) => sum + (r.pdfs[c] || []).length, 0);
}

function matchesSearch(r, q) {
  if (!q) return true;
  const hay = [
    r['Tiêu đề công việc'], r['Số hiệu VB đến'], r['Trích yếu VB đến'],
    r['Kết quả xử lý / VB tham mưu'], r['Tên thư mục hồ sơ']
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

function getSemanticCategory(linhVuc) {
  const lv = (linhVuc || '').toUpperCase().trim();
  if (lv.includes('GÓP Ý') || lv.includes('AN NINH') || lv.includes('SECURITY')) {
    return 'security';
  }
  if (lv.includes('TRIỂN KHAI') || lv.includes('CẢNH SÁT') || lv.includes('POLICE')) {
    return 'police';
  }
  return 'master_hq';
}

function renderList() {
  if (currentViewMode === 'cards') {
    renderCards();
  } else {
    renderTree();
  }
}

/* ===== Cột 1: Dạng Thẻ ===== */
function renderCards() {
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const fTrangThai = document.getElementById('filterTrangThai').value;
  const container = document.getElementById('cardsRoot');
  
  const filtered = allRecords.filter(r => {
    if (fTrangThai && r['Trạng thái'] !== fTrangThai) return false;
    return matchesSearch(r, q);
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `<div class="tree-empty">Không có hồ sơ phù hợp</div>`;
    return;
  }
  
  // Sắp xếp theo ngày văn bản đến (mới nhất trước)
  filtered.sort((a, b) => (b['Ngày VB đến'] || '').localeCompare(a['Ngày VB đến'] || ''));
  
  container.innerHTML = filtered.map(r => {
    const key = r['Tên thư mục hồ sơ'];
    const isDone = r['Trạng thái'] === 'Đã hoàn thành';
    const isSel = key === selectedKey;
    const pdfCount = countPdfs(r);
    const semanticCat = getSemanticCategory(r['Lĩnh vực']);
    const soHieu = r['Số hiệu VB đến'] || '—';
    const ngay = formatDateVN(r['Ngày VB đến']) || '—';
    
    return `
      <div class="hoso-card category-${semanticCat} ${isSel ? 'selected' : ''}" onclick="selectRecord('${escapeAttr(key)}')">
        <div class="hoso-card-header">
          <span class="badge-semantic">${escapeHtml(r['Lĩnh vực'] || 'CHƯA PHÂN LOẠI')}</span>
          <span class="badge-status ${isDone ? 'done' : 'pending'}">
            <i class="fa-solid ${isDone ? 'fa-circle-check' : 'fa-circle-dot'}"></i>
            ${escapeHtml(r['Trạng thái'] || '—')}
          </span>
        </div>
        <h3 class="hoso-card-title">${escapeHtml(r['Tiêu đề công việc'] || key)}</h3>
        <div class="hoso-card-meta">
          <div class="meta-item">
            <span class="meta-label">Số hiệu</span>
            <span class="meta-value">${escapeHtml(soHieu)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Ngày đến</span>
            <span class="meta-value">${escapeHtml(ngay)}</span>
          </div>
        </div>
        <div class="hoso-card-footer">
          <span class="file-count-indicator">
            <i class="fa-solid fa-file-pdf"></i>
            ${pdfCount} tệp
          </span>
          ${r['_year'] ? `<span>Năm ${escapeHtml(r['_year'])}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

/* ===== Cột 1: Dạng Cây ===== */
function renderTree() {
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const fTrangThai = document.getElementById('filterTrangThai').value;
  const root = document.getElementById('treeRoot');

  const filtered = allRecords.filter(r => {
    if (fTrangThai && r['Trạng thái'] !== fTrangThai) return false;
    return matchesSearch(r, q);
  });

  if (filtered.length === 0) {
    root.innerHTML = `<div class="tree-empty">Không có hồ sơ phù hợp</div>`;
    return;
  }

  const byYear = {};
  filtered.forEach(r => {
    const year = r['_year'] || '—';
    const lv = r['Lĩnh vực'] || 'CHƯA PHÂN LOẠI';
    byYear[year] = byYear[year] || {};
    byYear[year][lv] = byYear[year][lv] || [];
    byYear[year][lv].push(r);
  });

  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));

  root.innerHTML = years.map(year => {
    const lvMap = byYear[year];
    const lvNames = Object.keys(lvMap).sort((a, b) => {
      const ia = LINH_VUC_OPTIONS.indexOf(a);
      const ib = LINH_VUC_OPTIONS.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    const yearCount = lvNames.reduce((s, lv) => s + lvMap[lv].length, 0);
    const lvHtml = lvNames.map(lv => {
      const records = lvMap[lv].slice().sort((a, b) => (b['Ngày VB đến']||'').localeCompare(a['Ngày VB đến']||''));
      const leaves = records.map(r => {
        const key = r['Tên thư mục hồ sơ'];
        const isDone = r['Trạng thái'] === 'Đã hoàn thành';
        const isSel = key === selectedKey;
        const pdfCount = countPdfs(r);
        return `
          <div class="tree-leaf ${isSel ? 'selected' : ''}" onclick="selectRecord('${escapeAttr(key)}')">
            <span class="dot ${isDone ? 'done' : 'pending'}"></span>
            <span class="leaf-title" title="${escapeAttr(r['Tiêu đề công việc'] || key)}">${escapeHtml(r['Tiêu đề công việc'] || key)}</span>
            ${pdfCount ? `<span class="pdf-count"><i class="fa-solid fa-file-pdf"></i> ${pdfCount}</span>` : ''}
          </div>`;
      }).join('');
      const groupKey = `${year}::${lv}`;
      const isOpen = expandedGroups.has(groupKey);
      return `
        <details ${isOpen ? 'open' : ''} ontoggle="onGroupToggle(event, '${escapeAttr(groupKey)}')">
          <summary> <i class="fa-solid fa-folder"></i> ${escapeHtml(lv)} <span class="count">(${records.length})</span></summary>
          ${leaves}
        </details>`;
    }).join('');
    return `
      <details open>
        <summary><i class="fa-solid fa-calendar-days"></i> Năm ${escapeHtml(year)} <span class="count">(${yearCount})</span></summary>
        ${lvHtml}
      </details>`;
  }).join('');
}

function selectRecord(key) {
  selectedKey = key;
  const r = getSelectedRecord();
  const auto = r ? firstAvailablePdf(r) : null;
  activeCategory = auto ? auto.category : null;
  activeFileName = auto ? auto.file.fileName : null;
  renderList();
  renderRecordHeader();
  renderPreview();
  renderTimeline();
}

/* ===== Định dạng ngày tháng ===== */
function formatDateVN(s) {
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/* ===== Cột 3 (Đầu): metadata hồ sơ ===== */
function renderRecordHeader() {
  const box = document.getElementById('recordHeader');
  const r = getSelectedRecord();

  if (!selectedKey || !r) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  const isDone = r['Trạng thái'] === 'Đã hoàn thành';
  const soHieu = r['Số hiệu VB đến'] || '—';
  const ngay = formatDateVN(r['Ngày VB đến']) || '—';
  const noiGui = r['Nơi gửi'] || '—';
  const trichYeu = r['Trích yếu VB đến'] || '—';
  const key = r['Tên thư mục hồ sơ'];
  const semanticCat = getSemanticCategory(r['Lĩnh vực']);

  box.style.display = '';
  box.innerHTML = `
    <div class="badge-row">
      <div class="badge-row-tags">
        <span class="badge-semantic category-${semanticCat}">${escapeHtml(r['Lĩnh vực'] || '—')}</span>
        <span class="badge-status ${isDone ? 'done' : 'pending'}">
          <i class="fa-solid ${isDone ? 'fa-circle-check' : 'fa-circle-dot'}"></i>
          ${escapeHtml(r['Trạng thái'] || '—')}
        </span>
      </div>
      <div class="rh-actions">
        <button type="button" class="icon-btn" data-key="${escapeAttr(key)}" onclick="copyFolderKey(this)" title="Sao chép tên thư mục">
          <i class="fa-solid fa-copy"></i>
        </button>
        <button type="button" class="icon-btn" onclick="openFolder('${escapeAttr(key)}', this)" title="Mở thư mục lưu hồ sơ">
          <i class="fa-solid fa-folder-open"></i>
        </button>
        <button type="button" class="icon-btn" onclick='openForm(${JSON.stringify(r)})' title="Sửa hồ sơ">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button type="button" class="icon-btn danger" onclick="deleteRecord('${escapeAttr(key)}')" title="Xóa hồ sơ">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
    <h2>${escapeHtml(r['Tiêu đề công việc'] || '(chưa có tiêu đề)')}</h2>
    <div class="rh-meta">
      <div class="rh-meta-item">
        <span class="rh-meta-label">Số hiệu</span>
        <span class="rh-meta-value">${escapeHtml(soHieu)}</span>
      </div>
      <div class="rh-meta-item">
        <span class="rh-meta-label">Ngày ban hành</span>
        <span class="rh-meta-value">${escapeHtml(ngay)}</span>
      </div>
      <div class="rh-meta-item">
        <span class="rh-meta-label">Nơi gửi</span>
        <span class="rh-meta-value">${escapeHtml(noiGui)}</span>
      </div>
    </div>
    <p class="rh-trichyeu"><b>Trích yếu:</b> ${escapeHtml(trichYeu)}</p>
    ${r['Ghi chú'] ? `
      <div class="rh-ghichu" style="margin-top: 12px; padding: 12px; background: #fafafa; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px;">
        <span class="rh-meta-label" style="display: block; font-size: 9px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Ghi chú</span>
        <div class="ql-editor" style="padding: 0; min-height: unset; max-height: unset; font-size: 13px; line-height: 1.5; color: var(--text-main); font-family: inherit; user-select: text;">${r['Ghi chú']}</div>
      </div>
    ` : ''}
    <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 12px; justify-content: center; border-color: var(--primary); color: var(--primary);" onclick="openDetailedTimeline('${escapeAttr(key)}')">
      <i class="fa-solid fa-timeline"></i> Xem Tiến Trình Chi Tiết
    </button>
  `;
}

function copyFolderKey(el) {
  const key = el.dataset.key;
  if (!key || !navigator.clipboard) return;
  navigator.clipboard.writeText(key).then(() => {
    const originalTitle = el.getAttribute('title');
    el.classList.add('copied');
    el.innerHTML = '<i class="fa-solid fa-check"></i>';
    el.setAttribute('title', 'Đã sao chép!');
    setTimeout(() => {
      el.classList.remove('copied');
      el.innerHTML = '<i class="fa-solid fa-copy"></i>';
      el.setAttribute('title', originalTitle);
    }, 1200);
  });
}

/* ===== Cột 2: xem trước PDF ===== */
function renderPreview() {
  const panel = document.getElementById('previewPanel');
  const r = getSelectedRecord();

  if (!selectedKey || !r) {
    selectedKey = null;
    panel.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <p>Chọn một hồ sơ bên trái để xem chi tiết và tài liệu</p>
      </div>`;
    return;
  }

  const activeFiles = (activeCategory && r.pdfs) ? (r.pdfs[activeCategory] || []) : [];
  const activeFile = activeFiles.find(f => f.fileName === activeFileName) || activeFiles[0] || null;

  let body;
  if (!activeFile) {
    body = `
      <div class="empty-state">
        <i class="fa-solid fa-file-circle-question"></i>
        <p>Hồ sơ chưa có tài liệu nào — bấm <b>+ Tải lên</b> ở timeline bên phải để đính kèm.</p>
      </div>`;
  } else if (isPdfFile(activeFile.fileName)) {
    body = `<iframe class="detail-pdf-frame" id="detailPdfFrame" src="${escapeAttr(activeFile.url)}"></iframe>`;
  } else {
    body = `
      <div class="file-preview-card">
        <div class="file-preview-icon">${fileIcon(activeFile.fileName)}</div>
        <div class="file-preview-name">${escapeHtml(activeFile.fileName)}</div>
        <div class="file-preview-hint">Trình duyệt không xem trước trực tiếp được loại file này.</div>
        <a class="btn btn-primary btn-sm" href="${escapeAttr(activeFile.url)}" target="_blank" rel="noopener">
          <i class="fa-solid fa-download"></i> Tải xuống file
        </a>
      </div>`;
  }

  const fileTitle = activeFile ? activeFile.fileName : 'Xem trước tài liệu';

  panel.innerHTML = `
    <div class="preview-header">
      <div class="preview-header-title">
        <i class="fa-solid fa-file-lines"></i>
        <span>${escapeHtml(fileTitle)}</span>
      </div>
      ${activeFile ? `
        <a class="btn btn-secondary btn-sm" href="${escapeAttr(activeFile.url)}" target="_blank" rel="noopener" title="Mở trong tab mới">
          <i class="fa-solid fa-up-right-from-square"></i> Mở tab mới
        </a>
      ` : ''}
    </div>
    <div class="preview-body">
      <div class="preview-frame-wrap">${body}</div>
    </div>
  `;
}

/* ===== Cột 3: timeline văn bản ===== */
function renderTimeline() {
  const body = document.getElementById('timelineBody');
  const r = getSelectedRecord();

  if (!selectedKey || !r) {
    body.innerHTML = `
      <div class="timeline-empty">
        <i class="fa-solid fa-timeline" style="font-size: 24px; opacity: 0.5; margin-bottom: 8px;"></i>
        <p>Chọn một hồ sơ để xem timeline</p>
      </div>`;
    return;
  }

  const showCategories = Object.keys(r.pdfs || {});

  let html = '';
  CATEGORIES.forEach(cat => {
    if (showCategories.includes(cat)) {
      const files = (r.pdfs && r.pdfs[cat]) || [];
      const isEmpty = files.length === 0;
      const nodes = files.length
        ? files.map(f => {
            const isActive = cat === activeCategory && f.fileName === activeFileName;
            return `
              <div class="tl-node ${isActive ? 'active' : ''}" onclick="selectPdf('${escapeAttr(cat)}', '${escapeAttr(f.fileName)}')">
                <span class="tl-node-name">
                  ${fileIcon(f.fileName)}
                  <span>${escapeHtml(f.fileName)}</span>
                </span>
                <span class="tl-del" title="Xóa file này" onclick="event.stopPropagation(); deletePdf('${escapeAttr(cat)}', '${escapeAttr(f.fileName)}')">
                  <i class="fa-solid fa-xmark"></i>
                </span>
              </div>`;
          }).join('')
        : `<div class="tl-empty-node">Chưa có ${escapeHtml(cat.toLowerCase())}</div>`;

      html += `
        <div class="tl-stage">
          <div class="tl-stage-head ${isEmpty ? 'empty' : ''}">
            <span>${escapeHtml(cat)}</span>
            <span class="tl-count">(${files.length})</span>
          </div>
          ${nodes}
          <button class="btn btn-secondary btn-sm tl-add" onclick="triggerUpload('${escapeAttr(cat)}')">
            <i class="fa-solid fa-upload"></i> Tải lên
          </button>
        </div>`;
    } else if (cat === "Báo cáo của các đơn vị") {
      html += `
        <div class="tl-stage-action-wrap" style="padding: 12px 0; border-top: 1px dashed var(--border); margin-top: 8px; margin-bottom: 8px;">
          <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center; border-color: var(--primary); color: var(--primary); background: #fffcf8;" onclick="createCategoryFolder('Báo cáo của các đơn vị')">
            <i class="fa-solid fa-folder-plus"></i> Tạo thư mục: Báo cáo của các đơn vị
          </button>
        </div>`;
    }
  });

  body.innerHTML = html;
}

function selectPdf(category, fileName) {
  activeCategory = category;
  activeFileName = fileName;
  renderPreview();
  renderTimeline();
}

async function createCategoryFolder(category) {
  if (!selectedKey) return;
  const res = await fetch(`/api/ho_so/${encodeURIComponent(selectedKey)}/create_category`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ category })
  });
  const data = await res.json();
  if (!res.ok) {
    alert('Lỗi tạo thư mục: ' + (data.error || 'Không xác định'));
  } else {
    await loadData();
    activeCategory = category;
    activeFileName = null;
    renderPreview();
    renderTimeline();
  }
}

function openForm(record) {
  editingKey = record ? record['Tên thư mục hồ sơ'] : null;
  document.getElementById('formTitle').textContent = record ? 'Sửa hồ sơ' : 'Thêm hồ sơ';
  document.getElementById('formError').style.display = 'none';

  const map = {
    f_key: 'Tên thư mục hồ sơ', f_title: 'Tiêu đề công việc',
    f_linhvuc: 'Lĩnh vực', f_trangthai: 'Trạng thái',
    f_sohieu: 'Số hiệu VB đến', f_ngayvbden: 'Ngày VB đến',
    f_noigui: 'Nơi gửi', f_trichyeu: 'Trích yếu VB đến',
    f_ketqua: 'Kết quả xử lý / VB tham mưu', f_ngaytao: 'Ngày tạo hồ sơ',
    f_hanxuly: 'Hạn xử lý', f_ghichu: 'Ghi chú'
  };
  Object.entries(map).forEach(([id, field]) => {
    document.getElementById(id).value = record ? (record[field] || '') : '';
  });
  if (quill) {
    quill.root.innerHTML = document.getElementById('f_ghichu').value || '';
  }
  document.getElementById('f_key').disabled = false;

  document.getElementById('formOverlay').classList.add('show');
}

function closeForm() {
  document.getElementById('formOverlay').classList.remove('show');
}

async function submitForm() {
  if (quill) {
    const html = quill.root.innerHTML;
    const text = quill.getText().trim();
    document.getElementById('f_ghichu').value = text === '' ? '' : html;
  }
  const map = {
    'Tên thư mục hồ sơ': 'f_key', 'Tiêu đề công việc': 'f_title',
    'Lĩnh vực': 'f_linhvuc', 'Trạng thái': 'f_trangthai',
    'Số hiệu VB đến': 'f_sohieu', 'Ngày VB đến': 'f_ngayvbden',
    'Nơi gửi': 'f_noigui', 'Trích yếu VB đến': 'f_trichyeu',
    'Kết quả xử lý / VB tham mưu': 'f_ketqua', 'Ngày tạo hồ sơ': 'f_ngaytao',
    'Hạn xử lý': 'f_hanxuly', 'Ghi chú': 'f_ghichu'
  };
  const payload = {};
  Object.entries(map).forEach(([field, id]) => payload[field] = document.getElementById(id).value.trim());

  const errBox = document.getElementById('formError');
  errBox.style.display = 'none';

  let res;
  if (editingKey) {
    res = await fetch(`/api/ho_so/${encodeURIComponent(editingKey)}`, {
      method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
    });
  } else {
    res = await fetch('/api/ho_so', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
    });
  }
  const data = await res.json();
  if (!res.ok) {
    errBox.textContent = data.error || 'Có lỗi xảy ra';
    errBox.style.display = 'block';
    return;
  }
  closeForm();
  selectedKey = payload['Tên thư mục hồ sơ'] || selectedKey;
  loadData();
}

async function deleteRecord(key) {
  if (!confirm('Xóa hồ sơ này khỏi danh mục? (Thư mục PDF trên đĩa sẽ KHÔNG bị xóa)')) return;
  await fetch(`/api/ho_so/${encodeURIComponent(key)}`, { method: 'DELETE' });
  if (selectedKey === key) selectedKey = null;
  loadData();
}

async function openRootFolder() {
  const btn = document.querySelector('button[onclick="openRootFolder()"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '📂 Đang mở...';
  btn.disabled = true;
  try {
    const res = await fetch('/api/ho_so/open_root', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert('Lỗi khi mở kho hồ sơ: ' + (data.error || 'Không xác định'));
      btn.innerHTML = originalText;
      btn.disabled = false;
    } else {
      btn.innerHTML = '📂 Đã mở!';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 1500);
    }
  } catch (err) {
    alert('Không thể kết nối đến server: ' + err.message);
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function openFolder(key, btn) {
  const originalTitle = btn.getAttribute('title');
  btn.classList.add('copied');
  btn.setAttribute('title', 'Đang mở...');
  try {
    const res = await fetch(`/api/ho_so/${encodeURIComponent(key)}/open_folder`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert('Lỗi khi mở thư mục hồ sơ: ' + (data.error || 'Không xác định'));
      btn.classList.remove('copied');
      btn.setAttribute('title', originalTitle);
    } else {
      btn.setAttribute('title', 'Đã mở thư mục!');
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.setAttribute('title', originalTitle);
      }, 1500);
    }
  } catch (err) {
    alert('Không thể kết nối đến server: ' + err.message);
    btn.classList.remove('copied');
    btn.setAttribute('title', originalTitle);
  }
}

function exportJson() {
  window.location.href = '/api/ho_so/export';
}

async function importJson(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/ho_so/import', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) {
    alert('Lỗi nhập JSON: ' + (data.error || 'Không xác định'));
  } else {
    const msg = `Đã nhập/cập nhật thành công.\n` +
                `- Tổng số hồ sơ hiện tại: ${data.count}\n` +
                `- Thêm mới: ${data.added || 0}\n` +
                `- Cập nhật: ${data.updated || 0}`;
    alert(msg);
  }
  ev.target.value = '';
  loadData();
}

function triggerUpload(category) {
  if (!selectedKey) return;
  uploadTargetKey = selectedKey;
  uploadTargetCategory = category;
  const input = document.getElementById('pdfUploadInput');
  input.value = '';
  input.click();
}

async function onPdfInputChange(ev) {
  const files = ev.target.files;
  const key = uploadTargetKey;
  const category = uploadTargetCategory;
  if (!files || !files.length || !key || !category) return;

  const fd = new FormData();
  fd.append('category', category);
  for (const f of files) fd.append('files', f);

  const res = await fetch(`/api/ho_so/${encodeURIComponent(key)}/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) {
    alert('Lỗi tải file lên: ' + (data.error || 'Không xác định'));
  } else {
    if (data.saved && data.saved.length) {
      activeCategory = category;
      activeFileName = data.saved[0];
    }
    if (data.skipped && data.skipped.length) {
      alert('Bỏ qua ' + data.skipped.length + ' file không đúng định dạng cho phép:\n' + data.skipped.join('\n'));
    }
  }
  ev.target.value = '';
  uploadTargetKey = null;
  uploadTargetCategory = null;

  await loadData();
}

async function deletePdf(category, filename) {
  if (!selectedKey) return;
  if (!confirm(`Xóa file "${filename}" khỏi mục "${category}"? (Không thể hoàn tác)`)) return;

  const res = await fetch(`/api/ho_so/${encodeURIComponent(selectedKey)}/pdf/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) {
    alert('Lỗi xóa file: ' + (data.error || 'Không xác định'));
    return;
  }
  await loadData();

  const r = getSelectedRecord();
  if (r) {
    const stillActiveHasFile = activeCategory && (r.pdfs[activeCategory] || []).some(f => f.fileName === activeFileName);
    if (!stillActiveHasFile) {
      const auto = firstAvailablePdf(r);
      activeCategory = auto ? auto.category : null;
      activeFileName = auto ? auto.file.fileName : null;
      renderPreview();
      renderTimeline();
    }
  }
}

async function openDetailedTimeline(key) {
  const overlay = document.getElementById('timelineOverlay');
  const container = document.getElementById('timelineDetailContainer');
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: var(--text-muted); gap: 12px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <p>Đang tải dữ liệu timeline chi tiết...</p>
    </div>
  `;
  
  overlay.classList.add('show');
  
  try {
    const res = await fetch(`/api/ho_so/${encodeURIComponent(key)}/timeline_details`);
    const data = await res.json();
    
    if (!res.ok) {
      container.innerHTML = `
        <div style="padding: 24px; color: #dc2626; text-align: center;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; margin-bottom: 12px;"></i>
          <p>${escapeHtml(data.error || 'Lỗi khi tải timeline.')}</p>
        </div>
      `;
      return;
    }
    
    if (!data.found) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          <i class="fa-solid fa-circle-info" style="font-size: 32px; color: var(--text-faint); margin-bottom: 12px;"></i>
          <p>${escapeHtml(data.message)}</p>
        </div>
      `;
      return;
    }
    
    document.getElementById('timelineModalTitle').textContent = `Timeline Chi Tiết: ${data.title}`;
    
    if (!data.events || data.events.length === 0) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          <p>Hồ sơ chưa có tiến trình ghi nhận.</p>
        </div>
      `;
      return;
    }
    
    const itemsHtml = data.events.map(e => {
      return `
        <div class="timeline-detail-item type-${escapeAttr(e.type)}">
          <div class="timeline-detail-icon">
            <i class="fa-solid ${escapeAttr(e.icon)}"></i>
          </div>
          <div class="timeline-detail-content">
            <div class="timeline-detail-header">
              <span class="timeline-detail-title">${escapeHtml(e.title)}</span>
              <span class="timeline-detail-date">${escapeHtml(e.formatted_date)}</span>
            </div>
            <div class="timeline-detail-body">
              ${e.content}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = `<div class="timeline-detail-list">${itemsHtml}</div>`;
    
  } catch (err) {
    container.innerHTML = `
      <div style="padding: 24px; color: #dc2626; text-align: center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; margin-bottom: 12px;"></i>
        <p>Lỗi kết nối đến máy chủ: ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function closeTimelineModal() {
  document.getElementById('timelineOverlay').classList.remove('show');
}

loadData();