(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const params = new URLSearchParams(location.search);
  const root = document.getElementById('schoolContent');
  const scriptVersion = new URL(document.currentScript.src).searchParams.get('v');
  const profileURL = id => './schools.html?' + new URLSearchParams({id});
  const queryURL = (id, extra = {}) => './index.html?' + new URLSearchParams({university:id,...extra});
  const badge = school => window.StudyUI.schoolBadge({university_abbr:school.id,university_cn:school.name});
  const ordinary = row => !isOnlineStudy(row);
  function qs(school) {
    const ranking = school.qs;
    return `<a href="${esc(ranking.source_url)}" target="_blank" rel="noopener">${ranking.year} · ${ranking.rank ? '#' + esc(ranking.rank.replace('-', '–')) : '未查得世界排名'}</a>${ranking.scope === 'parent' ? `<small>母校整体排名：${esc(ranking.ranked_entity)}</small>` : ''}`;
  }
  function renderDirectory(schools, rows) {
    root.innerHTML = `<div class="explore-heading"><h1 class="directory-title">学校介绍</h1></div><form id="search" role="search"><input id="schoolSearch" type="search" aria-label="搜索学校名称或简称" placeholder="搜索学校名称或简称"><button type="submit">搜索</button></form><p id="schoolCount" class="source" role="status" aria-live="polite"></p><div id="schoolList" class="faculty"></div>`;
    const input = document.getElementById('schoolSearch');
    function render() {
      const term = input.value.trim().toLowerCase();
      const found = schools.filter(school => [school.name,school.english,school.id,...school.aliases].join(' ').toLowerCase().includes(term));
      document.getElementById('schoolCount').textContent = `共 ${schools.length} 所学校，当前显示 ${found.length} 所`;
      document.getElementById('schoolList').innerHTML = found.map(school => `<article class="course-card school-intro-card"><div class="course-school">${badge(school)}<div><h2>${esc(school.name)}</h2><span class="course-degree">${esc(school.type)} · ${esc(school.id)}</span></div></div><p class="en">${esc(school.english)}</p><p class="school-summary">${esc(school.summary)}</p><dl class="course-facts school-intro-facts"><div><dt>地理位置</dt><dd>${esc(school.location)}</dd></div><div><dt>QS 世界大学排名</dt><dd>${qs(school)}</dd></div></dl><div class="course-footer"><a class="page-link" href="${profileURL(school.id)}">了解学校 →</a><a class="page-link" href="${queryURL(school.id)}">查看专业 · ${rows.filter(row=>row.university_abbr===school.id).length}</a></div></article>`).join('') || '<div class="empty-state"><h2>没有找到学校</h2><p>请换一个学校名称或简称。</p></div>';
    }
    document.getElementById('search').addEventListener('submit',event=>{event.preventDefault();render();});
    input.addEventListener('input',render);
    render();
  }
  function renderProfile(school, allRows) {
    if (!school) {
      root.innerHTML = '<div class="empty-state"><h1>未找到这所学校</h1><a href="./schools.html">返回学校介绍</a></div>';
      return;
    }
    const rows = allRows.filter(row=>row.university_abbr===school.id);
    const examples = [...rows.filter(row=>row.degree_level==='Bachelor'),...rows.filter(row=>row.degree_level!=='Bachelor')].slice(0,6);
    document.title = school.name + '｜学校介绍';
    root.innerHTML = `<a class="page-link school-back" href="./schools.html">← 返回学校介绍</a><article class="school-profile course-card"><header class="course-school">${badge(school)}<div><h1>${esc(school.name)}</h1><span class="course-degree">${esc(school.english)} · ${esc(school.id)}</span></div></header><p class="school-summary">${esc(school.summary)}</p><dl class="facts"><div><dt>院校类型</dt><dd>${esc(school.type)}</dd></div><div><dt>地理位置</dt><dd>${esc(school.location)}</dd></div><div><dt>QS 世界大学排名</dt><dd>${qs(school)}</dd></div><div><dt>当前可查询专业</dt><dd>${rows.length} 个</dd></div></dl>${school.qs.note?`<p class="source">${esc(school.qs.note)}</p>`:''}<section class="requirements"><h2>学校概况</h2><p class="school-overview">${esc(school.overview)}</p>${school.highlights.map(item=>`<div class="summary-item"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div>`).join('')}</section><section class="requirements"><h2>专业与申请</h2><p>各专业的入学批次、学历与语言要求、学费分别列在专业详情中，可进入该校查询查看。</p><a class="page-link school-query-link" href="${queryURL(school.id)}">查看该校全部专业 →</a><div class="school-faculties">${examples.map(row=>`<a class="page-link" href="${queryURL(school.id,{programme:row.file_path})}">${esc(row.programme_name_cn||row.programme_name)} →</a>`).join('')}</div></section><section class="requirements"><h2>资料来源</h2><ul class="school-sources"><li><a href="${esc(school.website)}" target="_blank" rel="noopener">学校官方网站</a></li>${school.profile_sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.title)}</a></li>`).join('')}<li><a href="${esc(school.qs.source_url)}" target="_blank" rel="noopener">QS 官方院校排名页面</a></li></ul><p class="source">学校介绍资料查阅：${esc(school.profile_verified_at)}；QS 排名核对：${esc(school.qs.verified_at)}。</p></section></article>`;
  }
  async function load() {
    try {
      const [response, programmes] = await Promise.all([fetch('./schools-data.json' + (scriptVersion ? '?v=' + encodeURIComponent(scriptVersion) : '')),window.hostedKB('/api/search?q=')]);
      if (!response.ok) throw new Error('schools unavailable');
      const data = await response.json(), rows = programmes.filter(ordinary);
      document.getElementById('dataDate').textContent = window.knowledgeDataDate ? '资料更新时间：' + window.knowledgeDataDate.slice(0,10) : '';
      if (params.has('id')) renderProfile(data.schools.find(school=>school.id===params.get('id')),rows);
      else renderDirectory(data.schools,rows);
    } catch {
      root.innerHTML = '<div class="empty-state"><h1>学校资料暂时加载失败</h1><p>请刷新页面重试。</p><a class="page-link" href="./schools.html">重新加载</a></div>';
    }
  }
  load();
})();
