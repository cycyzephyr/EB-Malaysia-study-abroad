(() => {
  const subjectPatterns = {
    '建筑学':/建筑学|architecture/i, '会计':/会计|accounting/i,
    '计算机科学':/计算机科学|computer science/i, '心理学':/心理学|psychology/i,
    '教育学':/教育学|教育|education/i, '金融':/金融|finance|financial/i,
    '人工智能':/人工智能|artificial intelligence|\bAI\b/i, '旅游':/旅游|tourism/i
  };
  const subjects = Object.keys(subjectPatterns);
  const backgrounds = ['双非一本','双非二本','211本科','普通本科','专升本（已取得本科学历）'];
  const scores = [72,75,78,81,84,87,90];
  const languages = [null,null,5.5,6,6.5];
  const pick = (values, random = Math.random) => values[Math.floor(random() * values.length)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function profile(random = Math.random, options = {}) {
    const background=options.upgrade?backgrounds[backgrounds.length-1]:pick(backgrounds,random);
    const bachelorSubject=pick(subjects,random), cross=options.cross||random()<0.4;
    const subject=cross?null:bachelorSubject;
    return {background,bachelorSubject,subject,cross,average:pick(scores,random),ielts:pick(languages,random)};
  }
  function candidates(rows, student, random = Math.random) {
    const subject=subjectPatterns[student.cross ? student.bachelorSubject : student.subject];
    const shuffled = rows.filter(row => {
      const name=[row.programme_name_cn,row.programme_name,...(row.aliases||[])].join(' ');
      const direction=student.cross ? Array.isArray(row.cross_major_paths) && row.cross_major_paths.length && subject && !subject.test(name) : subject && subject.test(name);
      return direction && row.degree_level === 'Master' && !isOnlineStudy(row) && (!student.ielts || row.ielts_min == null || Number(row.ielts_min) <= student.ielts);
    }).slice();
    for (let i=shuffled.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
    const selected=[], schools=new Set(), files=new Set();
    function add(row) {
      if (!row || !row.university_abbr || selected.includes(row) || (row.file_path && files.has(row.file_path))) return;
      selected.push(row); schools.add(row.university_abbr); if (row.file_path) files.add(row.file_path);
    }
    for (const type of ['公立大学','私立大学']) add(shuffled.find(row=>row.school_type===type));
    for (const row of shuffled) if (selected.length<8 && !schools.has(row.university_abbr)) add(row);
    for (const row of shuffled) if (selected.length<8) add(row);
    return selected;
  }
  globalThis.StudyLive = {profile,candidates};
  const button=document.getElementById('liveGenerate');
  if (!button) return;
  const output=document.getElementById('liveOutput'), error=document.getElementById('liveError');
  button.addEventListener('click',async () => {
    button.disabled=true;button.textContent='正在挑选…';error.hidden=true;
    const student=profile(Math.random,{upgrade:document.getElementById('liveUpgrade').checked,cross:document.getElementById('liveCross').checked});
    try {
      const rows=await window.hostedKB('/api/search?q='+encodeURIComponent(student.subject||'')+'&degree_level=Master');
      const selected=candidates(rows,student);
      document.getElementById('liveProfile').textContent=`${student.background} · ${student.bachelorSubject}本科 · 均分 ${student.average} · ${student.ielts ? 'IELTS '+student.ielts : '雅思未考'} · ${student.cross ? '希望跨专业申请硕士（方向不限）' : '同方向申请'+student.subject+'硕士'}`;
      document.getElementById('liveNote').textContent='虚构示例，仅用于直播讲解。均分不自动换算为 CGPA；'+(student.background.startsWith('专升本')?'专升本学历认可及具体要求须核对；':'学校背景及专业要求须核对；')+(student.cross?'跨专业是否接受、先修课与工作经验须按项目核对。':'其他申请条件须按项目核对。');
      document.getElementById('liveCount').textContent=`${new Set(selected.map(row=>row.university_abbr)).size} 所学校 · ${selected.length} 个专业`;
      document.getElementById('liveHelp').textContent=student.cross?'根据已收录的非相关背景申请路径拓展方向；有雅思成绩时排除已录最低要求更高的项目。背景、先修课、工作经验和成绩等条件仍须核对。':'按申请专业方向筛选，雅思成绩已知时排除明确高于该成绩的项目。均分、学历背景及其他要求需逐项核对，不代表符合录取条件。';
      const missing=['公立大学','私立大学'].filter(type=>!selected.some(row=>row.school_type===type));
      if (missing.length) document.getElementById('liveHelp').textContent+=` 当前条件下未找到可确认的${missing.join('、')}候选。`;
      document.getElementById('liveList').innerHTML=selected.length?selected.map(row => {
        const language=student.ielts ? row.ielts_min == null ? '语言要求待核对' : `已知 IELTS ${row.ielts_min}；单项及其他条件待核` : row.ielts_min == null ? '雅思未考，语言要求待核对' : `雅思未考；参考要求 IELTS ${row.ielts_min}`;
        const paths=student.cross ? `<details class="live-path"><summary>查看跨专业路径</summary>${row.cross_major_paths.map(path=>`<p>${escape(path)}。</p>`).join('')}<a href="${escape(row.cross_major_source||row.source_url)}" target="_blank" rel="noopener noreferrer">查看院校来源</a></details>` : '';
        return `<div class="live-item"><p class="live-reason">${escape(row.school_type||'学校类型待核对')} · ${student.cross?'资料列有非相关背景路径':'申请方向相关'} · ${escape(language)} · ${student.cross?'跨专业要求待核对':'学术及背景待核对'}</p>${window.StudyUI.courseCard(row)}${paths}</div>`;
      }).join(''):'<div class="empty-state"><h2>暂未找到可展示的候选</h2><p>可以再生成一位学生，或通过专业查询查看完整资料。</p></div>';
      output.hidden=false;button.textContent='再生成一位';
    } catch (_) {error.textContent='资料加载失败，请检查网络后重试。';error.hidden=false;button.textContent='重新生成';}
    finally {button.disabled=false;}
  });
})();
