(() => {
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeZh={Coursework:'授课型',Research:'研究型','Mixed Mode':'混合型',Clinical:'临床型','待核实':'官网未标明'};
const degreeZh={Foundation:'预科课程',Diploma:'文凭课程',Certificate:'证书课程',Bachelor:'本科',Master:'硕士',Doctorate:'博士','Postgraduate Diploma':'研究生文凭','Postgraduate Certificate':'研究生证书'};
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
  return parts.length?`<section class=requirements><h3>专业与申请信息</h3>${parts.map(([key,title,value])=>`<div class=summary-item><h4>${esc(title)}</h4><p>${esc(value)}</p>${(r.sources?.[key]||[]).map((url,i)=>`<p class=source><a href="${esc(url)}" target=_blank rel=noopener>院校说明${i?' '+(i+1):''}</a></p>`).join('')}</div>`).join('')}</section>`:'';
}
function durationText(r){return r.duration_min_months!=null?`${r.duration_max_months==null?'至少':''}${r.duration_min_months}${r.duration_max_months!=null&&r.duration_max_months!==r.duration_min_months?'–'+r.duration_max_months:''}个月`:'';}

function academicPreview(r){
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

let detailVersion=0;
async function openDetail(encoded){const version=++detailVersion;let r;try{r=await loadJSON('/api/programme?file='+encoded)}catch(error){notify('详情加载失败，请检查网络后重试。');return}if(version!==detailVersion)return;$('detailBody').innerHTML=`<h2>${esc(r.programme_name_cn)}</h2><p class=en>${esc(r.programme_name)}</p><p>${esc(r.university_cn)} · ${esc(r.faculty_cn||r.faculty)}</p>${facts(r,false)}${detailSummary(r)}<div class=actions><button class=secondary onclick="copyResult('${encoded}')">复制摘要</button></div><p class=source>官方来源：<a href="${esc(r.source_url)}" target=_blank rel=noopener>查看院校官网</a></p>`;showDialog($('detail'))}
async function copyResult(encoded){
  let r;try{r=await loadJSON('/api/programme?file='+encoded)}catch(error){notify('资料加载失败，请检查网络后重试。');return}
  const lines=[`${r.university_cn}｜${r.programme_name_cn}`,`学院：${r.faculty_cn||r.faculty}`,`类型：${[degreeZh[r.degree_level]||r.degree_level,typeZh[r.programme_type]||r.programme_type].filter(Boolean).join(' / ')}`,r.ielts_min?`IELTS：${r.ielts_min}`:'',r.cgpa_min?`CGPA：${r.cgpa_min}`:'',r.tuition_fee_amount?`${r.tuition_fee_year?r.tuition_fee_year+'年参考学费':'参考学费'}：${money(r)}`:'',`来源：${r.source_url}`].filter(Boolean);
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
  if(typeof dialog.showModal==='function')dialog.showModal();
  else{dialog.setAttribute('open','');dialog.setAttribute('data-fallback','true');dialog.setAttribute('aria-modal','true');dialog.setAttribute('role','dialog')}
  document.body.classList.add('modal-open');
}
async function closeDialog(dialog){
  if(window.StudyUI)await window.StudyUI.dismiss(dialog);
  else if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
  if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');
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

window.openDetail=openDetail;
window.copyResult=copyResult;
})();
