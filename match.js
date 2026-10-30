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
  function unknownCandidates(rows,profile){return rows.map(row=>evaluate(row,profile)).filter(item=>item&&!item.misses.length&&((profile.cgpa&&item.unknown.includes('CGPA'))||(profile.ielts&&item.unknown.includes('IELTS'))));}
  function factTags(row){return [row.cgpa_min!=null?`CGPA ${row.cgpa_min}`:'',row.ielts_min!=null?`IELTS ${row.ielts_min}`:''].filter(Boolean)}
  const form=$('matchForm'),steps=[...document.querySelectorAll('.match-step')],progress=[...document.querySelectorAll('[data-go-step]')];
  let step=0,furthestStep=0,matchVersion=0;
  const stepTitles=['申请目标','学术背景','语言成绩'];
  function selected(name){return form.querySelector(`input[name="${name}"]:checked`);}
  function answerLabels(){
    const degree={Bachelor:'本科',Master:'硕士',Doctorate:'博士'}[selected('degree')?.value]||'未选择学历';
    const field=selected('field'),direction=field?.closest('label').querySelector('span')?.firstChild.textContent||'暂不限制';
    const type=selected('scoreType')?.value,academic=selected('academicScore');
    const score=type==='unknown'?'暂不确定成绩':academic?`${type==='cgpa'?'CGPA':'均分'} ${academic.closest('label').querySelector('span').textContent}`:'尚未选择成绩';
    const language=selected('ielts')?.value;
    return [`${degree} · ${direction}`,score,language?`IELTS ${language}`:'尚未取得 IELTS 成绩'];
  }
  function updateAnswers(){
    if(!steps.length)return;
    const labels=answerLabels();
    ['targetAnswer','academicAnswer','languageAnswer'].forEach((id,index)=>$(id).textContent=labels[index]);
  }
  function setStep(index,focus=true){
    ++matchVersion;
    step=index;furthestStep=Math.max(furthestStep,index);
    steps.forEach((section,i)=>section.hidden=i!==index);
    progress.forEach((button,i)=>{button.disabled=i>furthestStep;if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    $('stepCounter').textContent=`0${index+1} / 03`;$('stepTitle').textContent=stepTitles[index];
    $('matchBack').hidden=index===0;$('matchNext').hidden=index===2;form.querySelector('.match-submit').hidden=index!==2;
    $('matchError').hidden=true;updateAnswers();
    window.StudyUI?.transition(()=>{},steps[index]);
    if(focus){
      $('stepTitle').focus({preventScroll:true});
      const rect=$('stepTitle').getBoundingClientRect();
      if(rect.top<24||rect.bottom>innerHeight)$('stepTitle').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
  }
  function validateStep(index){
    let error='',target;
    if(index===0&&!selected('degree')){error='请先选择申请阶段。';target=form.querySelector('input[name="degree"]');}
    if(index===1&&selected('scoreType')?.value!=='unknown'&&!selected('academicScore')){error='请选择目前的成绩，或将成绩形式改为“暂不确定”。';target=form.querySelector('#scoreQuestion input:not(:disabled)');}
    if(error){setStep(index);$('matchError').hidden=false;$('matchError').textContent=error;target?.focus();return false;}
    return true;
  }
  $('matchNext')?.addEventListener('click',()=>{if(validateStep(step))setStep(step+1);});
  $('matchBack')?.addEventListener('click',()=>setStep(Math.max(0,step-1)));
  progress.forEach(button=>button.addEventListener('click',()=>{const next=Number(button.dataset.goStep);if(next<=step||validateStep(step))setStep(next);}));
  form.addEventListener('change',()=>{++matchVersion;updateAnswers();});
  if(steps.length){form.noValidate=true;setStep(0,false);}
  let eligible=[],currentProfile,visibleCount=24,unknownCount=0;
  function render(items,profile,reset=true,animateFrom=0){
    if(reset){eligible=items.filter(x=>!x.misses.length);currentProfile=profile;visibleCount=24}
    const shown=eligible.slice(0,visibleCount);
    $('matchTitle').textContent=`初步筛选出 ${eligible.length} 个专业`;
    $('matchNote').textContent=`当前显示 ${shown.length} 个。${unknownCount?`另有 ${unknownCount} 个专业因所填成绩的门槛资料不完整未列入结果，需人工核对；这不代表不符合申请条件。`:''}`;
    $('matchScoreNote').hidden=currentProfile.scoreType!=='average'||!currentProfile.average;
    $('matchScoreNote').textContent=currentProfile.average?`百分制均分 ${currentProfile.average} 分段，按约 ${currentProfile.cgpa}/4.0 进行初筛；最终以申请院校审核为准。`:'';
    const html=shown.length?(reset?shown:shown.slice(animateFrom)).map(({row})=>window.StudyUI.courseCard(row,{arriving:!reset})).join(''):'<div class="empty-state"><h2>暂时没有匹配结果</h2><p>可以放宽专业方向或修改成绩，也可以回到专业查询继续浏览。</p></div>';
    if(reset)$('matchList').innerHTML=html;else $('matchList').insertAdjacentHTML('beforeend',html);
    $('matchMore').hidden=shown.length===eligible.length;
    $('matchMore').textContent=`显示更多（剩余 ${eligible.length-shown.length} 个）`;
    if(reset){
      $('answerSummary').innerHTML=answerLabels().map((label,index)=>`<button type="button" data-edit-step="${index}" aria-label="修改${esc(label)}">${esc(label)} · 修改</button>`).join('');
      const update=()=>{$('matchForm').hidden=true;$('matchLayout').hidden=true;$('matchResults').hidden=false;};
      return Promise.resolve(window.StudyUI?window.StudyUI.transition(update,$('matchResults')):update()).then(()=>{const top=$('matchResults').getBoundingClientRect().top+scrollY;scrollTo({top:Math.max(0,top-24),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('matchTitle').focus({preventScroll:true});});
    }
  }
  $('matchForm').addEventListener('submit',async event=>{
    event.preventDefault();
    if(step<2){if(validateStep(step))setStep(step+1);return;}
    if(!validateStep(0)||!validateStep(1))return;
    const data=new FormData(event.currentTarget),scoreType=data.get('scoreType'),score=Number(data.get('academicScore'))||0,profile={field:data.get('field'),scoreType,average:scoreType==='average'?score:0,cgpa:scoreType==='average'?averageToCgpa(score):scoreType==='cgpa'?score:0,ielts:Number(data.get('ielts'))||0};
    const version=++matchVersion,button=event.currentTarget.querySelector('.match-submit');button.disabled=true;button.textContent='正在匹配…';
    try{const rows=await window.hostedKB(`/api/search?q=&degree_level=${encodeURIComponent(data.get('degree'))}`);if(version===matchVersion){unknownCount=unknownCandidates(rows,profile).length;await render(matchRows(rows,profile),profile);}}
    catch(error){if(version===matchVersion){button.textContent='重新匹配';$('matchError').hidden=false;$('matchError').textContent='资料加载失败，请检查网络后重试。';}}
    finally{button.disabled=false;if(button.textContent!=='重新匹配')button.textContent='查看匹配结果'}
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
  function editAnswers(index=0){const update=()=>{$('matchResults').hidden=true;$('matchForm').hidden=false;$('matchLayout').hidden=false;setStep(index);};Promise.resolve(window.StudyUI?window.StudyUI.transition(update,$('matchForm')):update()).then(()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}
  $('editAnswers').addEventListener('click',()=>editAnswers());
  $('answerSummary')?.addEventListener('click',event=>{const button=event.target.closest('[data-edit-step]');if(button)editAnswers(Number(button.dataset.editStep));});
  globalThis.StudyMatcher={evaluate,matchRows,unknownCandidates,averageToCgpa,factTags};
})();
