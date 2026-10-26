(() => {
  const $ = id => document.getElementById(id);
  const preset = ['学历与培养类型','学习方式','学制','入学时间','学术条件','语言条件','参考费用'];
  const storageKey = 'study-comparison-export-fields-v1';
  const font = '"PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  const lineHeight = 35, padding = 20, columnWidth = 420, labelWidth = 200, margin = 40;
  let rows = [], fields = [], urls = [], sequence = 0, timer;
  function wrap(context, value, width) {
    const lines = [];
    for (const paragraph of String(value ?? '').replace(/\r/g, '').split('\n')) {
      let line = '';
      const tokens = paragraph.match(/[A-Za-z0-9]+(?:[’'./+–—-][A-Za-z0-9]+)*|[^\S\n]+|[^\n]/gu) || [];
      for (const token of tokens) {
        const pieces = context.measureText(token).width > width ? Array.from(token) : [token];
        for (const piece of pieces) {
          if (line && context.measureText(line + piece).width > width) { lines.push(line); line = piece; }
          else line += piece;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  // Split tall rows by complete lines; each continuation repeats the programme headers.
  function paginate(items, capacity) {
    if (!Number.isInteger(capacity) || capacity < 2) throw Error('Invalid page capacity');
    const pages = []; let page = [], remaining = capacity;
    for (const item of items) {
      const count = Math.max(2, ...item.cells.map(cell => cell.length));
      let offset = 0;
      while (offset < count) {
        if (remaining < 2) { pages.push(page); page = []; remaining = capacity; }
        const take = Math.min(count - offset, remaining);
        page.push({label:item.label + (offset ? '（续）' : ''), cells:item.cells.map(cell => cell.slice(offset, offset + take)), lines:Math.max(2, take)});
        remaining -= Math.max(2, take) + 2; offset += take;
        if (remaining < 1) remaining = 0;
      }
    }
    if (page.length) pages.push(page);
    return pages;
  }
  function textFromHTML(html) {
    const box = document.createElement('div'); box.innerHTML = html;
    box.querySelectorAll('.compare-sources,button').forEach(node => node.remove());
    box.querySelectorAll('small,br,p,div').forEach(node => { node.before(document.createTextNode('\n')); node.append(document.createTextNode('\n')); });
    return box.textContent.trim();
  }
  function briefText(text, includeOriginal) {
    if (includeOriginal) return text;
    // Only explicit, separately labelled originals have an existing Chinese overview.
    // Unlabelled English and conditional clauses remain intact.
    const match = text.match(/\n\s*\n(?:学历路径及附加条件|英语条件)（官网原文）：/);
    if (!match || !/[\u4e00-\u9fff]/.test(text.slice(0, match.index))) return text;
    return text.slice(0, match.index).trim() + '\n（中文概述；其他等同资格、豁免及附加条件见院校官网完整要求。）';
  }
  function curriculumText(row, includeOriginal = false) {
    const c = row.curriculum;
    if (!c) return '尚未收录课程资料';
    return [({partial_courses:'部分课程／适用范围受限',not_published:'未公布固定课表／待核实'})[c.content_type],
      c.academic_year && `${c.academic_year} 学年`, c.total_credits != null && `毕业 ${c.total_credits} 学分`,
      c.maximum_credits != null && `最多 ${c.maximum_credits} 学分`, c.credit_structure, ...(c.notes || []),
      ...(c.groups || []).flatMap(group => [group.title + (group.credits != null ? ` · ${group.credits} 学分` : ''), group.requirement,
        ...(group.courses || []).map(course => [course.code,course.name_cn || course.name_en,
          includeOriginal && course.name_cn && course.name_en !== course.name_cn && course.name_en,
          course.credits != null && `${course.credits} 学分`,course.note].filter(Boolean).join(' · '))]),
      ...(c.selection_notes || []), c.source_title && `课程来源：${c.source_title}`, c.recorded_at && `资料读取日期：${c.recorded_at}`
    ].filter(Boolean).join('\n');
  }
  function cellText(row, field, includeOriginal) {
    if (field[0] === '课程与培养') return curriculumText(row, includeOriginal);
    if (field[0] === '院校官网') return /^https?:\/\//i.test(row.source_url || '') ? row.source_url : '未提供可用官网链接';
    const text = textFromHTML(field[1](row));
    // Fee context is inseparable from the quote, even in the brief preset.
    if (field[0] === '参考费用') {
      const note = row.summaries?.fee || row.tuition_fee_requirement_cn || row.fee_preview;
      return [text, note && note !== text ? note : ''].filter(Boolean).join('\n');
    }
    return briefText(text, includeOriginal);
  }
  function choices() { return [...$('compareExportFields').querySelectorAll('input:checked')].map(input => input.value); }
  function clearImages() {
    $('compareExportPreview').replaceChildren();
    urls.forEach(url => URL.revokeObjectURL(url)); urls = [];
  }
  function loadLogo(row) {
    const box = document.createElement('div'); box.innerHTML = window.StudyUI.schoolBadge(row);
    const src = box.querySelector('img')?.getAttribute('src');
    if (!src) return Promise.resolve(null);
    return new Promise(resolve => {
      const img = new Image(), timeout = setTimeout(() => resolve(null), 4000);
      img.onload = () => { clearTimeout(timeout); resolve(img); };
      img.onerror = () => { clearTimeout(timeout); resolve(null); }; img.src = src;
    });
  }
  const setFont = (c, size = 23, weight = 400) => { c.font = `${weight} ${size}px ${font}`; };
  function drawLines(c, lines, x, y, size = 23, weight = 400, color = '#17233a', height = lineHeight) {
    setFont(c, size, weight); c.fillStyle = color;
    lines.forEach((line, i) => c.fillText(line, x, y + i * height));
  }
  async function generate(current) {
    const chosen = choices();
    const snapshot = rows.slice(), selectedFields = fields.filter(field => chosen.includes(field[0]));
    if (!selectedFields.length) { $('compareExportStatus').textContent = '请至少勾选一个栏目。'; return; }
    $('compareExportStatus').textContent = '正在生成图片预览…';
    const canvas = document.createElement('canvas'), c = canvas.getContext('2d');
    try {
      if (!c) throw Error('Canvas unavailable');
      await document.fonts?.ready;
      const logos = await Promise.all(snapshot.map(loadLogo));
      if (current !== sequence) return;
      setFont(c);
      const items = selectedFields.map(field => ({label:field[0], cells:snapshot.map(row => wrap(c, cellText(row, field, chosen.includes('附带官网原文')), columnWidth - padding * 2))}));
      const headers = snapshot.map(row => {
        setFont(c, 26, 650);
        const name = wrap(c, row.programme_name_cn || row.programme_name, columnWidth - 40);
        setFont(c, 21);
        const english = row.programme_name && row.programme_name !== row.programme_name_cn ? wrap(c, row.programme_name, columnWidth - 40) : [];
        const school = wrap(c, row.university_cn || row.university_abbr, columnWidth - 40);
        return {name, english, school};
      });
      const headerHeight = Math.max(...headers.map(h => 128 + (h.name.length + h.school.length) * 35 + h.english.length * 30));
      const headerBottom = 140 + headerHeight;
      const capacity = Math.floor((2320 - headerBottom - 130) / lineHeight);
      if (capacity < 3) throw Error('Header too long');
      const pages = paginate(items, capacity);
      const width = margin * 2 + labelWidth + snapshot.length * columnWidth;
      const date = new Date().toLocaleDateString('zh-CN');
      const filename = `专业对比-${snapshot.map(r => r.university_abbr || '院校').join('-')}-${new Date().toISOString().slice(0,10)}`;
      for (const [index, page] of pages.entries()) {
        if (current !== sequence) return;
        const bodyHeight = page.reduce((sum, row) => sum + row.lines * lineHeight + padding * 2, 0);
        canvas.width = width; canvas.height = headerBottom + bodyHeight + 112;
        c.fillStyle = '#fff'; c.fillRect(0, 0, width, canvas.height); c.textBaseline = 'top';
        c.fillStyle = '#3159d9'; c.fillRect(margin, 36, 6, 60);
        drawLines(c, ['专业对比'], margin + 22, 36, 34, 700);
        drawLines(c, ['欧亚之桥留学'], margin + 22, 82, 21, 400, '#647087');
        drawLines(c, [`${snapshot.length} 个专业 · ${date}`], width - 360, 53, 22, 400, '#647087');
        c.fillStyle = '#edf2ff'; c.fillRect(margin, 140, width - margin * 2, headerHeight);
        drawLines(c, ['对比项目'], margin + padding, 166, 24, 650, '#3159d9');
        headers.forEach((h, i) => {
          const x = margin + labelWidth + i * columnWidth;
          const logo = logos[i];
          if (logo) {
            const scale = Math.min((columnWidth - 40) / logo.width, 60 / logo.height);
            if (snapshot[i].university_abbr === 'SUNWAY') { c.fillStyle = '#213b6b'; c.fillRect(x + padding - 5, 153, logo.width * scale + 10, logo.height * scale + 10); }
            c.drawImage(logo, x + padding, 158, logo.width * scale, logo.height * scale);
          }
          let y = 232;
          drawLines(c, h.school, x + padding, y, 21, 600, '#3159d9'); y += h.school.length * 35 + 10;
          drawLines(c, h.name, x + padding, y, 26, 650); y += h.name.length * 35 + 10;
          drawLines(c, h.english, x + padding, y, 21, 400, '#647087', 30);
        });
        let y = headerBottom;
        page.forEach((row, i) => {
          const height = row.lines * lineHeight + padding * 2;
          c.fillStyle = i % 2 ? '#f8faff' : '#fff'; c.fillRect(margin, y, width - margin * 2, height);
          c.fillStyle = '#f0f3fa'; c.fillRect(margin, y, labelWidth, height);
          drawLines(c, wrap(c, row.label, labelWidth - 40), margin + padding, y + padding, 22, 600, '#3159d9');
          row.cells.forEach((lines, j) => drawLines(c, lines, margin + labelWidth + j * columnWidth + padding, y + padding));
          c.strokeStyle = '#dce3f0'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(margin, y + height); c.lineTo(width - margin, y + height); c.stroke();
          y += height;
        });
        c.strokeStyle = '#dce3f0';
        for (let i = 0; i <= snapshot.length; i++) { const x = margin + labelWidth + columnWidth * i; c.beginPath(); c.moveTo(x, 140); c.lineTo(x, y); c.stroke(); }
        drawLines(c, ['申请条件与费用以院校最新官方要求为准'], margin, y + 30, 20, 400, '#647087');
        drawLines(c, [`${index + 1} / ${pages.length}`], width - margin - 100, y + 30, 20, 400, '#647087');
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (current !== sequence) return;
        if (!blob) throw Error('PNG unavailable');
        const url = URL.createObjectURL(blob); urls.push(url);
        const figure = document.createElement('figure'), img = document.createElement('img'), link = document.createElement('a');
        img.src = url; img.alt = `专业对比第 ${index + 1} / ${pages.length} 张预览`; img.width = width; img.height = canvas.height;
        link.href = url; link.download = `${filename}-${index + 1}.png`; link.className = 'compare-download';
        link.textContent = pages.length === 1 ? '下载 PNG 图片' : `下载第 ${index + 1} 张 PNG`;
        figure.append(img, link); $('compareExportPreview').append(figure);
        $('compareExportStatus').textContent = `正在生成 ${index + 1} / ${pages.length} 张…`;
      }
      if (current === sequence) $('compareExportStatus').textContent = `已生成 ${pages.length} 张图片，可在下方预览并下载。`;
    } catch {
      if (current === sequence) { clearImages(); $('compareExportStatus').textContent = '图片生成失败，请点击“重新生成”重试。'; }
    } finally { canvas.width = canvas.height = 1; }
  }
  function refresh() {
    clearTimeout(timer); const current = ++sequence; clearImages();
    try { localStorage.setItem(storageKey, JSON.stringify(choices())); } catch {}
    $('compareExportStatus').textContent = '正在更新预览…';
    timer = setTimeout(() => generate(current), 150);
  }
  function mount() {
    if ($('compareExportDialog')) return;
    document.body.insertAdjacentHTML('beforeend', `<dialog id="compareExportDialog" class="compare-export-dialog" aria-labelledby="compareExportTitle" aria-describedby="compareExportHint">
      <header class="compare-heading"><div><h2 id="compareExportTitle">导出专业对比</h2><p id="compareExportHint">勾选需要生成的栏目，内容过长时自动分页。</p></div><button id="compareExportClose" class="close" type="button" aria-label="关闭图片导出" autofocus>×</button></header>
      <div class="compare-export-layout"><aside class="compare-export-options"><p>学校与专业名称固定保留</p><fieldset id="compareExportFields"><legend>选择导出栏目</legend></fieldset><button id="compareExportReset" class="secondary" type="button">恢复客户简版</button><p class="compare-export-note">默认使用已收录的中文概述，可附带官网原文。费用保留币种、收费周期与说明。</p></aside>
      <section class="compare-export-result" aria-label="图片预览"><p id="compareExportStatus" role="status" aria-live="polite"></p><div id="compareExportPreview"></div></section></div>
      <footer class="compare-dialog-footer"><span>下载后可直接发送给客户</span><button id="compareExportRetry" class="secondary" type="button">重新生成</button></footer></dialog>`);
    $('compareExportClose').addEventListener('click', () => $('compareExportDialog').close());
    $('compareExportDialog').addEventListener('close', () => {
      ++sequence; clearTimeout(timer); clearImages(); $('compareExport').focus({preventScroll:true});
    });
    $('compareExportFields').addEventListener('change', refresh);
    $('compareExportRetry').addEventListener('click', refresh);
    $('compareExportReset').addEventListener('click', () => {
      $('compareExportFields').querySelectorAll('input').forEach(input => { input.checked = preset.includes(input.value); }); refresh();
    });
  }
  function open(programmes, definitions) {
    mount(); rows = programmes.slice(); fields = definitions.filter(([label]) => label !== '费用说明');
    let saved = preset;
    try { const value = JSON.parse(localStorage.getItem(storageKey)); if (Array.isArray(value)) saved = value; } catch {}
    const group = $('compareExportFields'); group.replaceChildren();
    const legend = document.createElement('legend'); legend.textContent = '选择导出栏目'; group.append(legend);
    for (const [label] of [...fields, ['附带官网原文']]) {
      const option = document.createElement('label'), input = document.createElement('input');
      input.type = 'checkbox'; input.value = label; input.checked = saved.includes(label);
      option.append(input, document.createTextNode(label)); group.append(option);
    }
    $('compareExportDialog').showModal(); refresh();
  }
  window.StudyCompareExport = {open, _test:{cellText,wrap, paginate, curriculumText, briefText}};
})();
