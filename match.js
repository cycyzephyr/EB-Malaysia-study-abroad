(() => {
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fieldWords={
    business:['business','management','finance','account','economic','marketing','commerce','商','管理','金融','会计','经济','市场'],
    computing:['computer','computing','software','data','artificial intelligence','information technology','cybersecurity','计算机','软件','数据','人工智能','信息技术','网络安全'],
    engineering:['engineering','mechanical','electrical','electronic','civil','chemical','manufacturing','aerospace','工程','机械','电气','电子','土木','化工','制造','航空'],
    architecture:['architecture','built environment','urban','planning','landscape','quantity survey','建筑','规划','景观','测量','设计'],
    science:['science','mathematics','statistics','physics','chemistry','biology','biotechnology','geology','marine','数学','统计','物理','化学','生物','地质','海洋','理学'],
    education:['education','language','linguistic','tesol','teaching','教育','语言','语言学','教学'],
    health:['medicine','medical','health','pharmacy','nursing','dentistry','nutrition','医学','医疗','健康','药学','护理','牙科','营养'],
    humanities:['psychology','sociology','anthropology','history','philosophy','political','international relations','social','humanities','心理','社会','人类','历史','哲学','政治','国际关系','人文'],
    law:['law','legal','policy','governance','public administration','法律','法学','政策','治理','行政'],
    media:['media','communication','journalism','creative','film','music','art','multimedia','传媒','传播','新闻','创意','电影','音乐','艺术','多媒体'],
    agriculture:['agriculture','agricultural','food','forestry','environment','sustainability','plant','animal science','aquaculture','农业','食品','林业','环境','可持续','植物','动物','水产'],
    hospitality:['hospitality','tourism','hotel','culinary','event management','旅游','酒店','餐饮','会展','活动管理']
  };
  function averageToCgpa(score){score=Number(score);return score>=90?3.75:score>=85?3.5:score>=80?3:score>=75?2.75:score>=70?2.5:score>=65?2.25:score>=60?2:0}
  function evaluate(row,profile){
    if(isOnlineStudy(row))return null;
    const text=[row.programme_name,row.programme_name_cn,row.faculty,row.faculty_cn,row.field].join(' ').toLowerCase();
    if(profile.field&&!fieldWords[profile.field].some(word=>text.includes(word)))return null;
    const misses=[],unknown=[];
    if(profile.cgpa&&row.cgpa_min!=null&&Number(row.cgpa_min)>profile.cgpa)misses.push(`CGPA 要求 ${row.cgpa_min}`);
    if(profile.ielts&&row.ielts_min!=null&&Number(row.ielts_min)>profile.ielts)misses.push(`IELTS 要求 ${row.ielts_min}`);
    if(row.cgpa_min==null)unknown.push('CGPA');
    if(row.ielts_min==null)unknown.push('IELTS');
    return {row,misses,unknown,rank:misses.length?2:unknown.length?1:0};
  }
  function matchRows(rows,profile){return rows.map(row=>evaluate(row,profile)).filter(item=>item&&(!profile.cgpa||!item.unknown.includes('CGPA'))&&(!profile.ielts||!item.unknown.includes('IELTS'))).sort((a,b)=>a.rank-b.rank||a.unknown.length-b.unknown.length||(a.row.programme_name_cn||'').localeCompare(b.row.programme_name_cn||'','zh-CN'));}
  function factTags(row){return [row.cgpa_min!=null?`CGPA ${row.cgpa_min}`:'',row.ielts_min!=null?`IELTS ${row.ielts_min}`:''].filter(Boolean)}
  let eligible=[],currentProfile,visibleCount=24;
  function render(items,profile,reset=true,animateFrom=0){
    if(reset){eligible=items.filter(x=>!x.misses.length);currentProfile=profile;visibleCount=24}
    const shown=eligible.slice(0,visibleCount);
    $('matchTitle').textContent=`初步筛选出 ${eligible.length} 个专业`;
    $('matchNote').textContent=`当前显示 ${shown.length} 个。`;
    $('matchScoreNote').hidden=currentProfile.scoreType!=='average'||!currentProfile.average;
    $('matchScoreNote').textContent=currentProfile.average?`百分制均分 ${currentProfile.average} 分段，按约 ${currentProfile.cgpa}/4.0 进行初筛；最终以申请院校审核为准。`:'';
    $('matchList').innerHTML=shown.length?shown.map(({row},i)=>{const tags=factTags(row);return `<article class="match-card${!reset&&i<animateFrom?' settled':''}" style="--reveal-delay:${Math.min(Math.max(0,i-animateFrom),6)*35}ms">${window.StudyUI?.schoolBadge(row)||`<div class="match-school">${esc(row.university_abbr||'院校')}</div>`}<div><h3>${esc(row.programme_name_cn)}</h3><p class="match-program-meta"><span>${esc(row.programme_name)}</span></p>${tags.length?`<div class="match-reasons">${tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>`:''}</div><button class="page-link" type="button" onclick="openDetail('${encodeURIComponent(row.file_path)}')">查看详情</button></article>`}).join(''):'<div class="empty-state"><h2>暂时没有匹配结果</h2><p>可以放宽专业方向，或返回知识库直接搜索。</p></div>';
    $('matchMore').hidden=shown.length===eligible.length;
    $('matchMore').textContent=`显示更多（剩余 ${eligible.length-shown.length} 个）`;
    if(reset){const update=()=>{$('matchForm').hidden=true;$('matchResults').hidden=false};return Promise.resolve(window.StudyUI?window.StudyUI.transition(update,$('matchFlow')):update()).then(()=>{const top=$('matchResults').getBoundingClientRect().top+scrollY;scrollTo({top:Math.max(0,top-24),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})})}
  }
  $('matchForm').addEventListener('submit',async event=>{
    event.preventDefault();const data=new FormData(event.currentTarget),scoreType=data.get('scoreType'),score=Number(data.get('academicScore'))||0,profile={field:data.get('field'),scoreType,average:scoreType==='average'?score:0,cgpa:scoreType==='average'?averageToCgpa(score):scoreType==='cgpa'?score:0,ielts:Number(data.get('ielts'))||0};
    const button=event.submitter;button.disabled=true;button.textContent='正在匹配…';
    try{const rows=await window.hostedKB(`/api/search?q=&degree_level=${encodeURIComponent(data.get('degree'))}`);await render(matchRows(rows,profile),profile)}
    catch(error){button.textContent='加载失败，请重试'}
    finally{button.disabled=false;if(button.textContent!=='加载失败，请重试')button.textContent='查看匹配结果'}
  });
  function setScoreType(type){
    $('scoreQuestion').hidden=type==='unknown';
    for(const [id,visible] of [['cgpaChoices',type==='cgpa'],['averageChoices',type==='average']]){
      $(id).hidden=!visible;
      $(id).querySelectorAll('input').forEach(input=>{input.disabled=!visible;input.required=visible;if(!visible)input.checked=false});
    }
  }
  document.querySelectorAll('input[name="scoreType"]').forEach(input=>input.addEventListener('change',()=>setScoreType(input.value)));
  setScoreType('unknown');
  $('matchMore').addEventListener('click',()=>{const firstNew=visibleCount;visibleCount+=24;render(eligible,currentProfile,false,firstNew)});
  $('editAnswers').addEventListener('click',()=>{const update=()=>{$('matchResults').hidden=true;$('matchForm').hidden=false};Promise.resolve(window.StudyUI?window.StudyUI.transition(update,$('matchFlow')):update()).then(()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}))});
  globalThis.StudyMatcher={evaluate,matchRows,averageToCgpa,factTags};
})();
