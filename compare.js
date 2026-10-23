(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const key = 'study-programme-comparison-v1', limit = 4;
  const selected = new Map(), known = new Map(), details = new Map();
  let revision = 0, returnFocus;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) for (const row of saved.slice(0, limit)) {
      if (row && typeof row.file_path === 'string' && /^knowledge\/[A-Z]+\/[^/]+\.md$/.test(row.file_path) && typeof row.programme_name_cn === 'string' && row.programme_name_cn.length < 500 && typeof row.university_cn === 'string' && row.university_cn.length < 150) selected.set(row.file_path, row);
    }
  } catch {}
  document.body.insertAdjacentHTML('beforeend', `<section id="compareTray" class="compare-tray" aria-label="已选对比专业" hidden>
    <div class="compare-tray-heading"><strong id="compareCount" role="status"></strong><div class="compare-tray-actions"><button id="compareClear" class="secondary" type="button">清空</button><button id="compareOpen" type="button">开始对比</button></div></div>
    <div id="compareSelected" class="compare-selected"></div><p id="compareNotice" class="compare-notice" role="status" hidden></p>
  </section>
  <dialog id="compareDialog" class="compare-dialog" aria-labelledby="compareTitle" aria-describedby="compareHelp">
    <header class="compare-heading"><div><h2 id="compareTitle" tabindex="-1">专业对比</h2><p id="compareHelp">费用保留各自收费周期，请结合学制及费用说明比较。左右滑动可查看所有专业。</p></div><button id="compareClose" class="close" type="button" aria-label="关闭专业对比" autofocus>×</button></header>
    <div id="compareBody" class="compare-body"></div><footer class="compare-dialog-footer"><span id="compareDialogCount"></span><div class="compare-tray-actions"><button id="compareExport" type="button" disabled>导出图片</button><button id="compareContinue" class="secondary" type="button">继续选择专业</button></div></footer>
  </dialog>`);
  function remember() {
    try { sessionStorage.setItem(key, JSON.stringify([...selected.values()])); } catch {}
  }
  function button(row) {
    known.set(row.file_path, row);
    const on = selected.has(row.file_path), title = row.programme_name_cn || row.programme_name;
    return `<button type="button" class="secondary compare-toggle" data-compare-file="${esc(encodeURIComponent(row.file_path))}" aria-pressed="${on}" aria-label="${on?'移出对比':'加入对比'}：${esc(title)}">${on?'已加入对比':'加入对比'}</button>`;
  }
  function sync() {
    $('compareTray').hidden = selected.size === 0;
    document.body.classList.toggle('compare-active', selected.size > 0);
    $('compareCount').textContent = `专业对比 · 已选 ${selected.size} / ${limit}`;
    $('compareOpen').disabled = selected.size < 2;
    $('compareOpen').textContent = selected.size < 2 ? '再选 1 个专业' : `开始对比（${selected.size}）`;
    $('compareSelected').innerHTML = [...selected.values()].map(row => `<button type="button" class="compare-chip" data-compare-remove="${esc(encodeURIComponent(row.file_path))}" aria-label="移出对比：${esc(row.programme_name_cn)}" title="${esc(row.university_cn+' · '+row.programme_name_cn)}"><span>${esc(row.university_cn)} · ${esc(row.programme_name_cn)}</span><span aria-hidden="true">×</span></button>`).join('');
    for (const control of document.querySelectorAll('[data-compare-file]')) {
      const row = known.get(decodeURIComponent(control.dataset.compareFile));
      const on = selected.has(row?.file_path);
      control.setAttribute('aria-pressed', String(on));
      control.textContent = on ? '已加入对比' : '加入对比';
      if (row) control.setAttribute('aria-label', `${on?'移出对比':'加入对比'}：${row.programme_name_cn || row.programme_name}`);
    }
  }
  function remove(file) {
    selected.delete(file); $('compareNotice').hidden = true; remember(); sync();
    if ($('compareDialog').open) {
      if (!selected.size) close();
      else { render(); $('compareTitle').focus(); }
    }
  }
  function toggle(file) {
    if (selected.has(file)) return remove(file);
    const row = known.get(file);
    if (!row) return;
    if (selected.size === limit) {
      $('compareNotice').textContent = '最多对比 4 个专业，请先移除一个已选专业。';
      $('compareNotice').hidden = false; return;
    }
    selected.set(file, {file_path:file,programme_name_cn:row.programme_name_cn || row.programme_name,university_cn:row.university_cn || row.university_abbr});
    $('compareNotice').hidden = true; remember(); sync();
  }
  const plain = value => esc(value || '未提供统一信息，请查看院校要求。');
  const sourceLink = (url, label) => /^https?:\/\//i.test(url || '') ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : '';
  function requirement(row, field, fallback) {
    const text = row.summaries?.[field] || fallback;
    const links = [...new Set(row.sources?.[field] || [])].map((url, i) => sourceLink(url, `资料来源${i ? ' '+(i+1) : ''}`)).filter(Boolean);
    return `${plain(text)}${links.length?`<div class="compare-sources">${links.join(' · ')}</div>`:''}`;
  }
  function fee(row) {
    const scope = {total:'全程',from_total:'全程起价',per_year:'每年',per_semester:'每学期',minimum_total:'最低学制参考总额'}[row.tuition_fee_scope];
    if (row.tuition_fee_amount != null && row.tuition_fee_currency && scope) return `${esc(row.tuition_fee_currency === 'MYR' ? 'RM' : row.tuition_fee_currency)} ${esc(Number(row.tuition_fee_amount).toLocaleString('zh-CN'))} / ${scope}${row.tuition_fee_year?`<small>${esc(row.tuition_fee_year)} 年参考费用</small>`:''}`;
    return plain(row.fee_preview || row.summaries?.fee);
  }
  function curriculum(row) {
    if (!row.curriculum) return '<span class="compare-missing">尚未收录课程资料</span>';
    const status = {partial_courses:'部分课程／适用范围受限',not_published:'未公布固定课表／待核实'}[row.curriculum.content_type];
    return `${status?`<p class="compare-caveat">${status}</p>`:''}<details class="compare-curriculum"><summary>查看课程与培养内容</summary>${window.StudyDetail.curriculumDetails(row)}</details>`;
  }
  const fields = [
    ['学历与培养类型', r => plain([{'Language Course':'语言课程',Foundation:'预科',Diploma:'文凭',Bachelor:'本科',Master:'硕士',Doctorate:'博士','Postgraduate Diploma':'研究生文凭','Postgraduate Certificate':'研究生证书',Certificate:'证书'}[r.degree_level] || r.degree_level, {Coursework:'授课型',Research:'研究型','Mixed Mode':'混合型',Clinical:'临床型'}[r.programme_type] || r.programme_type].filter(Boolean).join(' · '))],
    ['学习方式', r => plain(window.isOnlineStudy?.(r) ? '在线／远程' : ({'Full-time':'全日制','Part-time':'非全日制','On Campus':'校园授课','Full-time / Part-time':'全日制／非全日制','Online':'在线／远程','Research (mode not specified)':'资料未注明具体学习方式','待核实':''}[r.study_mode] ?? r.study_mode))],
    ['学院／方向', r => plain(r.faculty_cn || r.faculty || r.field)],
    ['学制', r => requirement(r, 'duration', r.duration_requirement_cn)],
    ['入学时间', r => requirement(r, 'intake', r.intake_requirement_cn || (r.intakes || []).map(m => ({January:'1月',February:'2月',March:'3月',April:'4月',May:'5月',June:'6月',July:'7月',August:'8月',September:'9月',October:'10月',November:'11月',December:'12月','Year-round':'全年'}[m] || m)).join('、'))],
    ['学历与专业背景', r => requirement(r, 'background', r.entry_requirement_cn)],
    ['学术条件', r => requirement(r, 'cgpa', r.academic_requirement_cn || (r.cgpa_min != null ? `CGPA ≥ ${r.cgpa_min}` : ''))],
    ['语言条件', r => requirement(r, 'language', r.language_requirement_cn || (r.ielts_min != null ? `IELTS ${r.ielts_min}` : ''))],
    ['工作经验', r => requirement(r, 'experience', r.experience_requirement_cn)],
    ['参考费用', fee],
    ['费用说明', r => requirement(r, 'fee', r.tuition_fee_requirement_cn)],
    ['课程与培养', curriculum],
    ['院校官网', r => sourceLink(r.source_url, '查看院校官网') || '未提供可用官网链接']
  ];
  function table(files, failures = new Set()) {
    const headers = files.map(file => {
      const row = details.get(file) || selected.get(file);
      return `<th scope="col"><span class="compare-school">${esc(row.university_cn)}</span><strong>${esc(row.programme_name_cn)}</strong>${row.programme_name?`<small>${esc(row.programme_name)}</small>`:''}<button class="secondary compare-remove" type="button" data-compare-remove="${esc(encodeURIComponent(file))}" aria-label="移出对比：${esc(row.programme_name_cn)}">移出对比</button></th>`;
    }).join('');
    return `<div class="compare-scroll" role="region" aria-label="专业对比表，可左右滚动" tabindex="0"><table class="compare-grid"><caption class="compare-sr-only">${files.length} 个专业的申请条件、费用与课程对比</caption><colgroup><col class="compare-label-col">${files.map(() => '<col class="compare-programme-col">').join('')}</colgroup><thead><tr><th scope="col">对比项目</th>${headers}</tr></thead><tbody>${fields.map(([label, value]) => `<tr><th scope="row">${label}</th>${files.map(file => `<td>${details.has(file) ? value(details.get(file)) : failures.has(file) ? (label === fields[0][0] ? '<p>资料暂时加载失败</p><button type="button" class="secondary" data-compare-retry>重新加载</button>' : '<span class="compare-missing">暂时无法显示</span>') : '<span class="compare-missing">正在加载…</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  async function render() {
    const current = ++revision, files = [...selected.keys()];
    $('compareExport').disabled = true;
    $('compareBody').innerHTML = table(files);
    $('compareDialogCount').textContent = files.length < 2 ? '再选择一个专业即可继续对比' : `正在对比 ${files.length} 个专业`;
    const pending = files.filter(file => !details.has(file));
    if (!pending.length) { $('compareExport').disabled = files.length < 2; return; }
    $('compareBody').setAttribute('aria-busy', 'true');
    const results = await Promise.allSettled(pending.map(async file => window.hostedKB('/api/programme?file=' + encodeURIComponent(file))));
    if (current !== revision || !$('compareDialog').open) return;
    const failures = new Set();
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value?.file_path === pending[index]) details.set(pending[index], result.value);
      else failures.add(pending[index]);
    });
    $('compareBody').setAttribute('aria-busy', 'false');
    $('compareBody').innerHTML = table(files, failures);
    $('compareExport').disabled = files.length < 2 || failures.size > 0;
  }
  function open() {
    if (selected.size < 2) return;
    returnFocus = document.activeElement;
    $('compareDialog').showModal(); document.body.classList.add('compare-open');
    render();
  }
  function close() { $('compareDialog').close(); }
  $('compareDialog').addEventListener('close', () => {
    ++revision; document.body.classList.remove('compare-open');
    $('compareBody').setAttribute('aria-busy', 'false');
    if (returnFocus?.isConnected && !returnFocus.disabled && returnFocus.getClientRects().length) returnFocus.focus({preventScroll:true});
  });
  $('compareOpen').addEventListener('click', open);
  $('compareClose').addEventListener('click', close);
  $('compareContinue').addEventListener('click', close);
  $('compareExport').addEventListener('click', () => {
    const rows = [...selected.keys()].map(file => details.get(file));
    if (rows.length >= 2 && rows.every(Boolean)) window.StudyCompareExport.open(rows, fields);
  });
  $('compareClear').addEventListener('click', () => { selected.clear(); remember(); sync(); $('compareNotice').hidden = true; if ($('compareDialog').open) close(); });
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-compare-file], [data-compare-remove], [data-compare-retry]');
    if (!control) return;
    if (control.hasAttribute('data-compare-file')) toggle(decodeURIComponent(control.dataset.compareFile));
    else if (control.hasAttribute('data-compare-remove')) remove(decodeURIComponent(control.dataset.compareRemove));
    else render();
  });
  window.StudyCompare = {button};
  sync();
})();
