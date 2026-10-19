(() => {
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeZh={Coursework:'授课型',Research:'研究型','Mixed Mode':'混合型',Clinical:'临床型','待核实':'官网未标明'};
const degreeZh={'Language Course':'语言课程',Foundation:'预科课程',Diploma:'文凭课程',Certificate:'证书课程',Bachelor:'本科',Master:'硕士',Doctorate:'博士','Postgraduate Diploma':'研究生文凭','Postgraduate Certificate':'研究生证书'};
const monthZh={January:'1月',February:'2月',March:'3月',April:'4月',May:'5月',June:'6月',July:'7月',August:'8月',September:'9月',October:'10月',November:'11月',December:'12月','Year-round':'全年'};
const money=r=>(r.tuition_fee_currency==='MYR'?'RM':r.tuition_fee_currency||'RM')+' '+Number(r.tuition_fee_amount).toLocaleString()+({per_year:' / 年',per_semester:' / 学期',total:' / 全程',from_total:' 起 / 全程',minimum_total:' / 最低学制参考总额'}[r.tuition_fee_scope]||' ');
function detailSummary(r){
  const s=r.summaries||{},parts=[
    ['background','学历与专业背景',s.background],
    ['cgpa','学术条件',s.cgpa,r.cgpa_min!=null?`CGPA ${r.cgpa_min}`:''],
    ['language','语言成绩',s.language,r.ielts_min!=null?`IELTS ${r.ielts_min}`:''],
    ['experience','工作经验',s.experience],
    ['duration','学制',s.duration,durationText(r)],
    ['intake','入学时间',s.intake,(r.intakes||[]).map(x=>monthZh[x]||x).join('、')],
    ['fee','学费',s.fee,r.tuition_fee_amount!=null?`${r.tuition_fee_year?`${r.tuition_fee_year}年参考：`:''}${money(r)}`:'']
  ].map(([key,title,value,fallback])=>[key,title,String(value||fallback||'').trim()]).filter(([, ,value])=>value);
  return parts.length?`<section class=requirements><h3>专业与申请信息</h3>${parts.map(([key,title,value])=>`<div class=summary-item><h4>${esc(title)}</h4><p>${esc(value)}</p>${(r.sources?.[key]||[]).map((url,i)=>`<p class=source><a href="${esc(url)}" target=_blank rel=noopener>${r.university_abbr==='SEGI'&&url.includes('/assets/segi-fee-source-')?'招生资料截图':key==='fee'&&r.university_abbr==='SEGI'?'费用资料':'院校说明'}${i?' '+(i+1):''}</a></p>`).join('')}</div>`).join('')}</section>`:'';
}
function durationText(r){return r.duration_min_months!=null?`${r.duration_max_months==null?'至少':''}${r.duration_min_months}${r.duration_max_months!=null&&r.duration_max_months!==r.duration_min_months?'–'+r.duration_max_months:''}个月`:'';}

function curriculumDetails(r){
  const c=r.curriculum;if(!c)return '';
  const heading='课程与培养内容';
  const itemLabel=c.content_type==='transfer_structure'?'可衔接专业方向':c.content_type==='research_structure'?'研究或培养内容':c.content_type==='clinical_structure'?'课程与临床培养内容':'课程名称';
  const overview=[c.academic_year?`${c.academic_year} 学年手册`:c.source_label||'官方课程结构',c.duration_years!=null?`${c.duration_years} 年`:'',c.semesters!=null?`${c.semesters} 个学期`:'',c.total_credits!=null?`毕业 ${c.total_credits} 学分`:c.maximum_credits!=null?`最多 ${c.maximum_credits} 学分`:''].filter(Boolean).join(' · ');
  const groups=c.groups.map((group,index)=>{
    const codes=group.courses.some(course=>course.code),credits=group.courses.some(course=>course.credits!=null);
    return `<details${index===0?' open':''}><summary>${esc(group.title)}${group.credits!=null?` · ${esc(group.credits)} 学分`:''}</summary>${group.requirement?`<p>${esc(group.requirement)}</p>`:''}<table${group.courses.length?'':' hidden'} class="${!codes?'course-names ':''}${!credits?'no-credit':''}"><thead><tr>${codes?'<th scope=col>课程代码</th>':''}<th scope=col>${esc(itemLabel)}</th>${credits?'<th scope=col>学分</th>':''}</tr></thead><tbody>${group.courses.map(course=>`<tr>${codes?`<td>${esc(course.code||'—')}</td>`:''}<td>${esc(course.name_cn||course.name_en)}${course.name_cn&&course.name_en?`<span class=en>${esc(course.name_en)}</span>`:''}${course.note?`<span class=en>${esc(course.note)}</span>`:''}</td>${credits?`<td>${esc(course.credits??'—')}</td>`:''}</tr>`).join('')}</tbody></table>${group.source_url?`<p class=source><a href="${esc(group.source_url)}" target=_blank rel=noopener>本组课程来源</a></p>`:''}</details>`;
  }).join('');
  const pages=c.source_pdf_pages,source=c.source_url+(pages?`#page=${pages[0]}`:'');
  const pageLabel=pages?.length===2?`${pages[0]}–${pages[1]}`:pages?.join('、');
  return `<section class="requirements curriculum"><h3>${esc(heading)}</h3><p>${esc(overview)}</p>${c.credit_structure?`<p>${esc(c.credit_structure)}</p>`:''}${(c.notes||[]).map(note=>`<p class=source>${esc(note)}</p>`).join('')}${groups}${c.selection_notes?.length?`<details><summary>原文选课说明</summary>${c.selection_notes.map(note=>`<p class=source>${esc(note)}</p>`).join('')}</details>`:''}<p class=source>课程来源：<a href="${esc(source)}" target=_blank rel=noopener>${esc(c.source_title)}</a>${pages?` · PDF 第 ${esc(pageLabel)} 页`:''}${c.recorded_at?` · 读取日期：${esc(c.recorded_at)}`:''}</p></section>`;
}


function academicPreview(r){
  if(r.academic_preview_cn)return r.academic_preview_cn;
  if(r.cgpa_min!=null)return `CGPA ${r.cgpa_min}`;
  const text=String(r.academic_requirement_cn||'').trim();
  if(/不同前置学历分列要求/.test(text))return '多学历路径，分别评估';
  return text.split(/[；;。\n]/)[0]
    .replace(/^高中学历路径：高中成绩均分至少\s*/, '高中均分 ≥ ')
    .replace(/^申请人须满足所选专业针对/, '')
    .replace(/设置的科目与成绩要求$/, '科目及成绩要求')
    .replace(/^须持有官网认可的/, '须具备');
}
function facts(r,showAcademicLink=true){const academic=academicPreview(r),rows=[['学院',r.faculty_cn||r.faculty],['类型',`${[degreeZh[r.degree_level]||r.degree_level,typeZh[r.programme_type]||r.programme_type].filter(Boolean).join(' · ')}`],['学制',durationText(r)||r.duration_requirement_cn],['语言',r.ielts_min?`IELTS ${r.ielts_min}`:r.language_requirement_cn],['学术',academic,r.academic_requirement_cn],[r.fee_preview?'费用参考':r.tuition_fee_year?`${r.tuition_fee_year}年参考学费`:'参考学费',r.tuition_fee_amount?money(r):r.fee_preview],['入学月份',(r.intakes||[]).map(x=>monthZh[x]||x).join('、')||null]].filter(([,value])=>value);return `<dl class=facts>${rows.map(([label,value,full])=>`<div><dt>${esc(label)}</dt><dd>${label==='学术'?`<span class=academic-preview title="${esc(full||value)}">${esc(value)}</span>${showAcademicLink&&full&&full!==value?`<button class=fact-more onclick="openDetail('${encodeURIComponent(r.file_path)}')">完整条件</button>`:''}`:esc(value)}</dd></div>`).join('')}</dl>`}

let detailVersion=0,currentEncoded='',returnFocus,returnScroll=0;
function detailCards(){return [...document.querySelectorAll('.course-card[data-programme]')];}
function selectDetail(encoded){
  currentEncoded=encoded;
  const cards=detailCards(),index=cards.findIndex(card=>card.dataset.programme===encoded);
  cards.forEach(card=>card.classList.toggle('is-selected',card.dataset.programme===encoded));
  for(const [id,offset] of [['previousDetail',-1],['nextDetail',1]]){
    const button=$(id);if(button)button.disabled=index<0||!cards[index+offset];
  }
}
async function openDetail(encoded){
  const version=++detailVersion,dialog=$('detail');
  selectDetail(encoded);
  $('detailBody').innerHTML='<div class="detail-loading" role="status" aria-live="polite"><p>正在加载专业资料…</p><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
  showDialog(dialog);
  let r;
  try{r=await loadJSON('/api/programme?file='+encoded)}
  catch(error){if(version===detailVersion)$('detailBody').innerHTML=`<div class=empty-state><h2>详情暂时加载失败</h2><p>请检查网络后重试。</p><button type=button onclick="openDetail('${esc(String(encoded).replace(/'/g,'%27'))}')">重新加载</button></div>`;return}
  if(version!==detailVersion)return;
  const update=()=>{$('detailBody').innerHTML=`<div class="detail-school">${window.StudyUI?.schoolBadge(r)||''}<div><p>${esc(r.university_cn)}<small>${esc(r.faculty_cn||r.faculty)}</small></p></div></div><h2 id="detailTitle">${esc(r.programme_name_cn)}</h2><p class=en>${esc(r.programme_name)}</p>${facts(r,false)}${detailSummary(r)}${curriculumDetails(r)}<div class=actions><button class=secondary onclick="copyResult('${encoded}')">复制摘要</button></div><p class=source>官方来源：<a href="${esc(r.source_url)}" target=_blank rel=noopener>查看院校官网</a></p>`;};
  if(window.StudyUI)window.StudyUI.transition(update,$('detailBody'));else update();
}
async function copyResult(encoded){
  let r;try{r=await loadJSON('/api/programme?file='+encoded)}catch(error){notify('资料加载失败，请检查网络后重试。');return}
  const lines=[`${r.university_cn}｜${r.programme_name_cn}`,`学院：${r.faculty_cn||r.faculty}`,`类型：${[degreeZh[r.degree_level]||r.degree_level,typeZh[r.programme_type]||r.programme_type].filter(Boolean).join(' / ')}`,r.ielts_min?`IELTS：${r.ielts_min}`:'',r.academic_preview_cn&&r.summaries?.cgpa?`学术要求：${r.summaries.cgpa}`:r.cgpa_min?`CGPA：${r.cgpa_min}`:'',r.university_abbr==='SEGI'?r.summaries?.fee?`费用说明：${r.summaries.fee}`:'':r.tuition_fee_amount?`${r.tuition_fee_year?r.tuition_fee_year+'年参考学费':'参考学费'}：${money(r)}`:'',r.academic_preview_cn&&r.sources?.cgpa?.length?`学术来源：${r.sources.cgpa.join('；')}`:'',`来源：${r.source_url}`].filter(Boolean);
  await copyText(lines.join('\n'));
}
async function loadJSON(url){
  if(window.hostedKB)return window.hostedKB(url);
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok)throw new Error('资料加载失败');
      return await response.json();
    }catch(error){lastError=error;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))}
  }
  throw lastError;
}
let toastTimer;
function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500)}
function showDialog(dialog){
  const wasOpen=dialog.open;
  const isDetail=dialog===$('detail'),desktop=isDetail&&typeof matchMedia==='function'&&matchMedia('(min-width:1100px)').matches&&typeof dialog.show==='function';
  if(isDetail&&!wasOpen){returnFocus=document.activeElement;returnScroll=typeof scrollY==='number'?scrollY:0;}
  const selected=isDetail?detailCards().find(card=>card.dataset.programme===currentEncoded):null;
  const anchor=selected?.getBoundingClientRect?.().top;
  if(dialog.dataset)dialog.dataset.mode=desktop?'panel':'modal';
  if(desktop){if(!wasOpen)dialog.show();}
  else if(typeof dialog.showModal==='function'){if(!wasOpen)dialog.showModal();}
  else{dialog.setAttribute('open','');dialog.setAttribute('data-fallback','true');dialog.setAttribute('aria-modal','true');dialog.setAttribute('role','dialog')}
  if(!desktop)document.body.classList.add('modal-open');
  if(isDetail)document.body.classList.add('detail-open');
  if(desktop&&!wasOpen&&anchor!=null&&window.scrollBy)window.scrollBy({top:selected.getBoundingClientRect().top-anchor,behavior:'instant'});
  dialog.scrollTop=0;
  window.StudyUI?.present(dialog,wasOpen);
}
async function closeDialog(dialog){
  if(dialog===$('detail'))++detailVersion;
  if(window.StudyUI)await window.StudyUI.dismiss(dialog);
  else if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
  if(!document.querySelector('dialog:modal, dialog[data-fallback][open]'))document.body.classList.remove('modal-open');
  if(dialog===$('detail')&&!dialog.open){
    document.body.classList.remove('detail-open');
    detailCards().forEach(card=>card.classList.remove('is-selected'));
    if(window.scrollTo)window.scrollTo({top:returnScroll,behavior:'instant'});
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  }
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);notify('已复制')}
  catch(error){$('copyText').value=text;showDialog($('copyFallback'));$('copyText').focus();$('copyText').select()}
}
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('.close').onclick=()=>closeDialog(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog)});
  dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open')});
});
for(const [id,offset] of [['previousDetail',-1],['nextDetail',1]])$(id)?.addEventListener('click',()=>{
  const cards=detailCards(),index=cards.findIndex(card=>card.dataset.programme===currentEncoded),next=cards[index+offset];
  if(next){openDetail(next.dataset.programme);if($('detail').dataset?.mode==='panel')next.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
});
document.addEventListener?.('keydown',event=>{
  if(event.key==='Escape'&&$('detail').open&&$('detail').dataset?.mode==='panel'){event.preventDefault();closeDialog($('detail'));}
});
if(typeof matchMedia==='function')matchMedia('(min-width:1100px)').addEventListener?.('change',()=>{if($('detail').open)closeDialog($('detail'));});

window.openDetail=openDetail;
window.copyResult=copyResult;
window.StudyDetail={syncSelection:()=>selectDetail(currentEncoded)};
})();
