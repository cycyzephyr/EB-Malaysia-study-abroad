const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeZh={Coursework:'授课型',Research:'研究型','Mixed Mode':'混合型',Clinical:'临床型','待核实':'官网未标明'};
const degreeZh={Foundation:'预科课程',Diploma:'文凭课程',Certificate:'证书课程',Bachelor:'本科',Master:'硕士',Doctorate:'博士','Postgraduate Diploma':'研究生文凭','Postgraduate Certificate':'研究生证书'};
const monthZh={January:'1月',February:'2月',March:'3月',April:'4月',May:'5月',June:'6月',July:'7月',August:'8月',September:'9月',October:'10月',November:'11月',December:'12月','Year-round':'全年'};
const money=r=>(r.tuition_fee_currency==='MYR'?'RM':r.tuition_fee_currency||'RM')+' '+Number(r.tuition_fee_amount).toLocaleString()+({per_year:' / 年',per_semester:' / 学期',total:' / 全程',from_total:' 起 / 全程',minimum_total:' / 最低学制参考总额'}[r.tuition_fee_scope]||' ');
let allRows=[],rows=[],searchVersion=0,ready=false,visibleCount=20;

function directoryRows(){return allRows.filter(r=>!isOnlineStudy(r))}
function durationText(r){return r.duration_min_months!=null?`${r.duration_max_months==null?'至少':''}${r.duration_min_months}${r.duration_max_months!=null&&r.duration_max_months!==r.duration_min_months?'–'+r.duration_max_months:''}个月`:'';}

function refreshUniversities(){const current=$("university").value,schools=[...new Set(directoryRows().map(r=>r.university_abbr).filter(Boolean))].sort();$("university").innerHTML='<option value="">全部学校</option>'+schools.map(s=>`<option>${esc(s)}</option>`).join('');if(schools.includes(current))$("university").value=current}

function refreshFaculties(){const school=$('university').value,current=$('faculty').value,fac=[...new Map(directoryRows().filter(r=>!school||r.university_abbr===school).map(r=>[r.faculty,r.faculty_cn||r.faculty||'其他'])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'zh-CN'));$('faculty').innerHTML='<option value="">全部学院</option>'+fac.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');if(fac.some(([v])=>v===current))$('faculty').value=current;window.StudyFilters?.sync()}

function groupByFaculty(list){const grouped=new Map();for(const r of list){const key=r.faculty_cn||r.faculty||'其他';if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r)}return grouped}
function cardTags(r){return [
  [degreeZh[r.degree_level]||r.degree_level,typeZh[r.programme_type]||r.programme_type].filter(Boolean).join(' · '),
  r.cgpa_min!=null?`CGPA ${r.cgpa_min}`:'',r.ielts_min!=null?`IELTS ${r.ielts_min}`:'',durationText(r),
  r.tuition_fee_amount?`${r.tuition_fee_year?r.tuition_fee_year+'年参考 · ':''}${money(r)}`:r.fee_preview
].filter(Boolean)}
function render(list,reset=true,animateFrom=0){
  rows=list;if(reset)visibleCount=20;
  const shown=[...groupByFaculty(list).values()].flat().slice(0,visibleCount),grouped=groupByFaculty(shown);
  let index=0;
  const html=[...grouped].map(([faculty,items])=>`<section class=faculty><h2>${esc(faculty)} <small>${items.length}个专业</small></h2>${items.map(r=>{
    const i=index++,delay=Math.min(Math.max(0,i-animateFrom),6)*35;
    return `<article class="card match-card query-card${!reset&&i<animateFrom?' settled':''}" style="--reveal-delay:${delay}ms">${window.StudyUI?.schoolBadge(r)||`<div class=match-school>${esc(r.university_abbr||'院校')}</div>`}<div class=programme-content><h3>${esc(r.programme_name_cn)}</h3><p class=match-program-meta>${esc(r.programme_name)}</p><p class=school-name>${esc(r.university_cn||r.university)}</p><div class=match-reasons>${cardTags(r).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>${r.requested_field&&r.answer?`<h4>${esc(r.requested_field)}</h4><div class=answer>${esc(r.answer)}</div>`:''}</div><div class="actions card-actions"><button onclick="openDetail('${encodeURIComponent(r.file_path)}')">查看详情</button><button class=secondary onclick="copyResult('${encodeURIComponent(r.file_path)}')">复制摘要</button></div></article>`;
  }).join('')}</section>`).join('');
  const update=()=>{$('count').textContent=`找到 ${list.length} 个专业，当前显示 ${shown.length} 个`;$('results').innerHTML=html;$('loadMore').hidden=shown.length===list.length};
  return reset&&window.StudyUI?window.StudyUI.transition(update,$('results')):update();
}
function loadMore(){const firstNew=visibleCount;visibleCount=Math.min(visibleCount+20,rows.length);render(rows,false,firstNew);document.querySelectorAll('.card')[firstNew]?.scrollIntoView({block:'nearest'})}

async function run(e){
  e?.preventDefault();
  if(!ready){await bootstrap();if(!ready)return}
  const version=++searchVersion,p=new URLSearchParams({q:$('q').value});
  [['university','university'],['degree','degree_level'],['type','programme_type'],['ielts','ielts_max'],['cgpa','cgpa_max']].forEach(([id,k])=>{if($(id).value)p.set(k,$(id).value)});
  const fac=$('faculty').value;if(fac)p.set('faculty',fac);
  if(![...p.values()].some(Boolean)){await render(directoryRows());history.replaceState(null,'',location.pathname);return}
  $('count').textContent='正在查询…';
  try {
    const request=new URLSearchParams(p);request.delete('faculty');
    let found=await loadJSON('/api/search?'+request);
    if(version!==searchVersion)return;
    found=found.filter(r=>!isOnlineStudy(r));
    if(fac)found=found.filter(r=>r.faculty===fac);
    await render(found);
    history.replaceState(null,'','?'+p);
  } catch(error) { if(version===searchVersion)$('count').textContent='查询失败，请检查网络后点击搜索重试。'; }
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
$('search').addEventListener('submit',run);
$('university').addEventListener('change',()=>{refreshFaculties();run()});
$('faculty').addEventListener('change',run);
document.querySelectorAll('#degree,#type,#ielts,#cgpa').forEach(x=>x.addEventListener('change',run));
$('loadMore').addEventListener('click',loadMore);
if(matchMedia('(max-width: 720px)').matches)$('filterPanel').open=false;
window.StudyUI?.initFilter($('filterPanel'));
const initial=new URLSearchParams(location.search);
[['q','q'],['university','university'],['degree','degree_level'],['type','programme_type'],['ielts','ielts_max'],['cgpa','cgpa_max']].forEach(([id,key])=>{if(initial.has(key))$(id).value=initial.get(key)});
async function bootstrap(){
  $('count').textContent='正在加载专业资料…';
  try{
    allRows=await loadJSON('/api/search?q=');refreshUniversities();refreshFaculties();
    if(initial.has('faculty'))$('faculty').value=initial.get('faculty');
    window.StudyFilters?.init();ready=true;[...initial.values()].some(Boolean)?await run():await render(directoryRows());
    $('dataDate').textContent=window.knowledgeDataDate?`资料更新时间：${window.knowledgeDataDate.slice(0,10)}`:'';
    if(initial.has('programme'))await openDetail(encodeURIComponent(initial.get('programme')));
  }catch(error){$('count').textContent='资料加载失败，请检查网络后点击搜索重试。'}
}
bootstrap();
