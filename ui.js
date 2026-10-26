(() => {
  const schools = new Set(['SUNWAY','CITY','TAYLORS','APU','INTI','MUM','SEGI','UCSI','UKM','UM','UNM','UPM','USM','UTM','HELP','UPSI']);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const version = document.currentScript?.src?.split('?')[1] || '';
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transitions=new WeakMap(),resizes=new WeakMap();
  function transition(update,target){
    const previous=transitions.get(target);
    const start=previous&&typeof getComputedStyle==='function'?{opacity:getComputedStyle(target).opacity,transform:getComputedStyle(target).transform}:{opacity:.76,transform:'translateY(5px)'};
    previous?.cancel();transitions.delete(target);
    update();
    if(reducedMotion()||!target?.animate)return;
    const animation=target.animate([start,{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'cubic-bezier(.22,1,.36,1)'});
    transitions.set(target,animation);animation.finished?.catch(()=>{});
  }
  async function resize(target,update,to,fromHeight){
    if(!target?.animate||!target.getBoundingClientRect){update();return;}
    const from=fromHeight??target.getBoundingClientRect().height;
    resizes.get(target)?.cancel();resizes.delete(target);
    update();
    const height=to??target.getBoundingClientRect().height;
    if(reducedMotion()||Math.abs(height-from)<1){target.style.overflow='';return;}
    target.style.overflow='hidden';
    const animation=target.animate([{height:from+'px'},{height:height+'px'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
    resizes.set(target,animation);
    await animation.finished.catch(()=>{});
    if(resizes.get(target)!==animation)return;
    animation.cancel();resizes.delete(target);target.style.overflow='';
  }
  function schoolBadge(row) {
    const abbr = row.university_abbr || '院校', name = row.university_cn || row.university || abbr;
    const extension = {CITY:'png',SUNWAY:'png',TAYLORS:'svg',HELP:'png',UPSI:'png'}[abbr] || 'webp';
    return `<div class="match-school" title="${esc(name)}">${schools.has(abbr)?`<img class="school-logo" src="./assets/school-${abbr}.${extension}${version?'?'+version:''}" alt="${esc(name)}校标" width="72" height="48" loading="lazy" decoding="async">`:`<span>${esc(name)}</span>`}</div>`;
  }
  function studyModeLabel(value){const labels={Research:'研究型',Coursework:'授课型','Mixed Mode':'混合型','Mix Mode':'混合型','Full-time':'全日制','Part-time':'非全日制'};return String(value||'').split('/').map(x=>labels[x.trim()]||x.trim()).filter(Boolean).join(' / ')}
  function courseCard(row,{query=false,arriving=false}={}) {
    const file=encodeURIComponent(row.file_path).replace(/'/g,'%27');
    const degree={'Language Course':'语言课程',Bachelor:'本科',Master:'硕士',Doctorate:'博士',Foundation:'预科',Diploma:'文凭课程','Postgraduate Diploma':'研究生文凭','Postgraduate Certificate':'研究生证书',Certificate:'证书课程'}[row.degree_level]||row.degree_level||'';
    const type={Coursework:'授课型',Research:'研究型','Mixed Mode':'混合型',Clinical:'临床型','待核实':''}[row.programme_type]??(row.programme_type||studyModeLabel((row.programme_types||[]).join(' / '))||studyModeLabel(row.study_mode));
    const duration=row.duration_min_months!=null?`${row.duration_max_months==null?'至少 ':''}${row.duration_min_months}${row.duration_max_months!=null&&row.duration_max_months!==row.duration_min_months?'–'+row.duration_max_months:''} 个月`:row.duration_card_cn||row.duration_requirement_cn||'';
    const fee=row.university_abbr==='HELP'&&row.fee_preview_card_cn?row.fee_preview_card_cn:row.tuition_fee_amount!=null?`${row.tuition_fee_currency==='MYR'?'RM':row.tuition_fee_currency||'RM'} ${Number(row.tuition_fee_amount).toLocaleString()}${{per_year:' / 年',per_semester:' / 学期',total:' / 全程',from_total:' 起 / 全程',minimum_total:' / 最低学制参考总额'}[row.tuition_fee_scope]||''}`:row.university_abbr==='HELP'?'请向招生处确认':row.university_abbr==='CITY'?'向校方索取最新收费表':row.fee_preview_card_cn||row.fee_preview;
    const feeLabel=row.university_abbr==='CITY'?(row.tuition_fee_amount!=null?`${row.tuition_fee_year||2026}年国际生学费`:'国际生学费待确认'):row.university_abbr==='UPSI'?(row.tuition_fee_year?`${row.tuition_fee_year}年国际生学费`:'国际生费用参考'):row.university_abbr==='HELP'?(row.tuition_fee_amount!=null?'国际生费用参考':'国际生费用待确认'):(row.tuition_fee_year?`${row.tuition_fee_year}年参考费用`:'参考费用');
    const clean=value=>{const text=String(value||'').trim();return /本次语言要求表未提供|尚未收录/.test(text)?'':text};
    const fullLanguage=clean(row.language_requirement_cn||row.summaries?.language);
    const fullAcademic=clean(row.academic_requirement_cn||row.entry_requirement_cn||row.summaries?.cgpa);
    const months=(row.intakes||[]).map(month=>({January:'1月',February:'2月',March:'3月',April:'4月',May:'5月',June:'6月',July:'7月',August:'8月',September:'9月',October:'10月',November:'11月',December:'12月','Year-round':'全年'}[month]||month)).join('、');
    const intake=row.university_abbr==='CITY'?months:clean(row.intake_requirement_cn||row.summaries?.intake||months);
    const compact=(value,limit=110)=>{
      if(!value)return '';
      if(value.length<=limit)return value;
      const prefix=value.slice(0,limit),boundary=Math.max(prefix.lastIndexOf('；'),prefix.lastIndexOf('。'),prefix.lastIndexOf('，'));
      return `${prefix.slice(0,boundary>=limit*.55?boundary+1:limit-1).trimEnd()}…`;
    };
    const cardRequirementLimit=row.university_abbr==='CITY'?56:110;
    const academicText=compact(clean(row.academic_preview_cn)||(row.cgpa_min!=null?`CGPA ${row.cgpa_min}`:fullAcademic),cardRequirementLimit);
    const facts=[
      ['语言',row.ielts_min!=null?`IELTS ${row.ielts_min}`:compact(fullLanguage,cardRequirementLimit),fullLanguage],
      ['学术',academicText,fullAcademic],
      ['学制',duration,''],
      ['入学月份',intake,'']
    ].filter(([,value])=>value).slice(0,3);
    return `<article class="course-card match-card${query?' query-card':''}${arriving?' arriving':''}" data-programme="${esc(file)}"><div class="course-school">${schoolBadge(row)}<div><p class="school-name">${esc(row.university_cn||row.university||row.university_abbr)}</p><span class="course-degree">${esc([degree,type].filter(Boolean).join(' · '))}</span></div></div><div class="programme-content"><h3><button class="programme-title" type="button" onclick="openDetail('${file}')">${esc(row.programme_name_cn||row.programme_name)}</button></h3><p class="match-program-meta">${esc(row.programme_name)}</p></div><dl class="course-facts facts-${facts.length}">${facts.map(([label,value,full])=>`<div><dt>${label}</dt><dd>${esc(value)}${full&&full!==value?`<details class="course-fact-more"><summary>展开完整要求</summary><p>${esc(full)}</p></details>`:''}</dd></div>`).join('')}</dl>${row.requested_field&&row.answer?`<div class="answer"><h4>${esc(row.requested_field)}</h4>${esc(row.answer)}</div>`:''}<div class="course-footer"><div>${fee?`<span class="fee-label">${esc(feeLabel)}</span><p class="course-fee">${esc(fee)}</p>${row.university_abbr==='CITY'?'<a class="fee-source" href="https://city.edu.my/admission-scholarships/international-students/" target="_blank" rel="noopener">查看官网收费说明</a>':''}`:'<span class="fee-label">完整条件与费用见详情</span>'}</div><div class="course-actions">${window.StudyCompare?.button(row)||''}<button class="course-open secondary" type="button" onclick="openDetail('${file}')">查看详情</button></div></div></article>`;
  }
  function present(dialog,wasOpen=false){
    const panel=dialog.classList?.contains('detail-panel');
    const start=wasOpen&&typeof getComputedStyle==='function'?{opacity:getComputedStyle(dialog).opacity,transform:getComputedStyle(dialog).transform}:{opacity:0,transform:panel?'translateX(40px)':'translateY(12px) scale(.99)'};
    const previous=transitions.get(dialog),interrupted=previous?.playState==='running';
    previous?.cancel();transitions.delete(dialog);
    if(reducedMotion()||!dialog.animate||(wasOpen&&!interrupted))return;
    const animation=dialog.animate([start,{opacity:1,transform:'translate(0) scale(1)'}],{duration:panel?300:220,easing:'cubic-bezier(.22,1,.36,1)'});
    transitions.set(dialog,animation);animation.finished.catch(()=>{});
  }
  async function dismiss(dialog) {
    if(!dialog.open)return;
    const start=typeof getComputedStyle==='function'?{opacity:getComputedStyle(dialog).opacity,transform:getComputedStyle(dialog).transform}:{opacity:1,transform:'none'};
    transitions.get(dialog)?.cancel();transitions.delete(dialog);
    let animation;
    if(dialog.animate&&!reducedMotion()){
      animation=dialog.animate([start,{opacity:0,transform:dialog.classList?.contains('detail-panel')?'translateX(24px)':'translateY(8px) scale(.995)'}],{duration:160,easing:'ease-out',fill:'both'});
      transitions.set(dialog,animation);
      await animation.finished.catch(()=>{});
      if(transitions.get(dialog)!==animation)return;
    }
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    animation?.cancel();transitions.delete(dialog);
  }
  function initFilter(panel) {
    const summary=panel.querySelector('summary'),content=panel.querySelector('.filter-content');
    if(!summary?.addEventListener||!content?.animate)return;
    let desired=panel.open,sequence=0;
    panel.dataset.expanded=String(desired);
    summary.addEventListener('click',async event=>{
      event.preventDefault();const current=++sequence;
      const from=panel.open?content.getBoundingClientRect().height:0;
      desired=!desired;panel.dataset.expanded=String(desired);
      await resize(content,()=>{panel.open=true;},desired?undefined:0,from);
      if(current===sequence)panel.open=desired;
    });
  }
  window.StudyTheme?.bind();
  window.StudyUI = {transition,resize,schoolBadge,courseCard,present,dismiss,initFilter};
})();
