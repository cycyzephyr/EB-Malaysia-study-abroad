const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const typeZh={Coursework:'授课型',Research:'研究型','Mixed Mode':'混合型',Clinical:'临床型','待核实':'官网未标明'};
const degreeZh={Foundation:'预科课程',Diploma:'文凭课程',Certificate:'证书课程',Bachelor:'本科',Master:'硕士',Doctorate:'博士','Postgraduate Diploma':'研究生文凭','Postgraduate Certificate':'研究生证书'};
const monthZh={January:'1月',February:'2月',March:'3月',April:'4月',May:'5月',June:'6月',July:'7月',August:'8月',September:'9月',October:'10月',November:'11月',December:'12月','Year-round':'全年'};
const money=r=>(r.tuition_fee_currency==='MYR'?'RM':r.tuition_fee_currency||'RM')+' '+Number(r.tuition_fee_amount).toLocaleString()+({per_year:' / 年',per_semester:' / 学期',total:' / 全程',from_total:' 起 / 全程',minimum_total:' / 最低学制参考总额'}[r.tuition_fee_scope]||' ');
let allRows=[],rows=[],searchVersion=0,ready=false,visibleCount=20;

const programmeDirections=[
  {id:'computing',name:'计算机与数据',hint:'计算机 · AI · 数据科学',words:['computer','computing','software','data','artificial intelligence','information technology','cybersecurity','计算机','软件','数据','人工智能','信息技术','网络安全']},
  {id:'business',name:'商科与管理',hint:'金融 · 会计 · 市场营销',words:['business','management','finance','accounting','economics','marketing','commerce','商','管理','金融','会计','经济','市场']},
  {id:'engineering',name:'工程技术',hint:'机械 · 电气 · 土木',words:['engineering','mechanical','electrical','electronic','civil','chemical','manufacturing','aerospace','工程','机械','电气','电子','土木','化工','制造','航空']},
  {id:'education',name:'教育与语言',hint:'教育 · 语言 · TESOL',words:['education','language','linguistic','tesol','teaching','教育','语言','教学']},
  {id:'media',name:'传媒与创意',hint:'传播 · 艺术 · 影视',words:['media','communication','journalism','creative','film','music','art','multimedia','传媒','传播','新闻','创意','电影','音乐','艺术','多媒体']},
  {id:'health',name:'医学与健康',hint:'医学 · 药学 · 护理',words:['medicine','medical','health','pharmacy','nursing','dentistry','nutrition','医学','医疗','健康','药学','护理','牙科','营养']},
  {id:'humanities',name:'人文与社科',hint:'心理 · 社会 · 国际关系',words:['psychology','sociology','anthropology','history','philosophy','political','international relations','social','humanities','心理','社会','人类','历史','哲学','政治','国际关系','人文']},
  {id:'science',name:'数学与理学',hint:'数学 · 物理 · 生物',words:['mathematics','statistics','physics','chemistry','biology','biotechnology','geology','marine','数学','统计','物理','化学','生物','地质','海洋','理学']},
  {id:'architecture',name:'建筑与设计',hint:'建筑 · 规划 · 景观',words:['architecture','built environment','urban','planning','landscape','quantity surveying','design','建筑','规划','景观','测量','设计']},
  {id:'law',name:'法律与政策',hint:'法律 · 政策 · 行政',words:['law','legal','policy','governance','public administration','法律','法学','政策','治理','行政']},
  {id:'agriculture',name:'农业食品环境',hint:'农业 · 食品 · 环境',words:['agriculture','agricultural','food','forestry','environment','sustainability','plant','animal science','aquaculture','农业','食品','林业','环境','可持续','植物','动物','水产']},
  {id:'hospitality',name:'旅游与酒店',hint:'旅游 · 酒店 · 会展',words:['hospitality','tourism','hotel','culinary','event management','旅游','酒店','餐饮','会展','活动管理']}
];
let expandedDirections=false;
function matchesDirection(row,id){
  const direction=programmeDirections.find(item=>item.id===id);
  if(!direction)return true;
  const text=[row.programme_name,row.programme_name_cn,row.field].join(' ').toLowerCase();
  return direction.words.some(word=>/^[a-z ]+$/.test(word)?new RegExp('(?:^|[^a-z])'+word+'(?:$|[^a-z])').test(text):text.includes(word));
}
function selectedDirections(value=$('direction').value){
  const ids=new Set(value.split(','));
  return programmeDirections.filter(item=>ids.has(item.id)).map(item=>item.id);
}
function matchesDirections(row,ids){return !ids.length||ids.some(id=>matchesDirection(row,id));}
let browseBase=[];
function renderBrowse(base=browseBase){
  browseBase=base;
  const degree=$('degree').value,directions=selectedDirections();
  $('direction').value=directions.join(',');
  const stages=[['','不限学历'],['Bachelor','本科'],['Master','硕士'],['Doctorate','博士'],['Foundation','预科']];
  const stageButtons=$('degreeChoices').querySelectorAll?.('[data-degree]');
  if(stageButtons?.length)stageButtons.forEach(button=>button.setAttribute('aria-pressed',String(degree===button.dataset.degree)));
  else $('degreeChoices').innerHTML=stages.map(([value,label])=>`<button type="button" data-degree="${value}" aria-pressed="${degree===value}">${label}</button>`).join('');
  $('otherDegree').value=['Diploma','Postgraduate Diploma','Postgraduate Certificate','Certificate'].includes(degree)?degree:'';
  $('allDirections').setAttribute?.('aria-pressed',String(!directions.length));
  const updateDirections=()=>{
    const buttons=$('directionChoices').querySelectorAll?.('[data-direction]');
    if(buttons?.length)buttons.forEach((button,index)=>{
      const selected=directions.includes(button.dataset.direction);
      button.setAttribute('aria-pressed',String(selected));
      button.hidden=index>=6&&!expandedDirections&&!selected;
      button.querySelector('.direction-mark').textContent=selected?'✓':'＋';
      button.querySelector('.direction-count').textContent=base.filter(row=>matchesDirection(row,button.dataset.direction)).length+' 个专业';
    });
    else $('directionChoices').innerHTML=programmeDirections.map((item,index)=>{const selected=directions.includes(item.id),count=base.filter(row=>matchesDirection(row,item.id)).length;return `<button class="direction-card" type="button" data-direction="${item.id}" aria-pressed="${selected}" ${index>=6&&!expandedDirections&&!selected?'hidden':''}><span class="direction-name">${item.name}<span class="direction-mark" aria-hidden="true">${selected?'✓':'＋'}</span></span><span class="direction-hint">${item.hint}</span><span class="direction-count">${count} 个专业</span></button>`}).join('');
  };
  window.StudyUI.resize($('directionChoices'),updateDirections);
  $('moreDirections').textContent=expandedDirections?'收起更多方向':'更多方向';
  $('moreDirections').setAttribute?.('aria-expanded',String(expandedDirections));
  const selected=[['q','搜索：'+$('q').value],['degree',degreeZh[degree]],['university',directoryRows().find(row=>row.university_abbr===$('university').value)?.university_cn],['faculty',$('faculty').value?($('faculty').selectedOptions?.[0]?.textContent||$('faculty').value):''],['type',typeZh[$('type').value]],['ielts','IELTS 要求 ≤ '+$('ielts').value],['cgpa','CGPA 要求 ≤ '+$('cgpa').value]].filter(([id])=>$(id).value);
  selected.splice(2,0,...directions.map(id=>['direction',programmeDirections.find(item=>item.id===id).name,id]));
  $('activeFilters').hidden=!selected.length;
  $('activeFilters').innerHTML=selected.length?`<span class="selected-label">已选</span>${selected.map(([id,label,direction])=>`<button class="filter-chip" type="button" data-clear="${id}" ${direction?`data-direction="${direction}"`:''} aria-label="取消${esc(label)}">${esc(label)}<span aria-hidden="true">×</span></button>`).join('')}<button class="reset-filters" type="button" data-clear="all">重新选择</button>`:'';
}
window.StudyBrowse={matchesDirection,matchesDirections,selectedDirections,directions:programmeDirections};

function directoryRows(){return allRows.filter(r=>!isOnlineStudy(r))}
function durationText(r){return r.duration_min_months!=null?`${r.duration_max_months==null?'至少':''}${r.duration_min_months}${r.duration_max_months!=null&&r.duration_max_months!==r.duration_min_months?'–'+r.duration_max_months:''}个月`:'';}

function refreshUniversities(){const current=$("university").value,schools=[...new Map(directoryRows().map(r=>[r.university_abbr,r.university_cn||r.university_abbr])).entries()].filter(([abbr])=>abbr).sort((a,b)=>a[1].localeCompare(b[1],'zh-CN'));$("university").innerHTML='<option value="">全部学校</option>'+schools.map(([abbr,name])=>`<option value="${esc(abbr)}">${esc(name)} · ${esc(abbr)}</option>`).join('');if(schools.some(([abbr])=>abbr===current))$("university").value=current}

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
  const update=()=>{$('count').textContent=`找到 ${list.length} 个专业，当前显示 ${shown.length} 个`;$('results').innerHTML=html||'<div class="empty-state"><h2>没有找到符合当前条件的专业</h2><p>可以取消上方某个条件，或重新选择学历和方向。</p></div>';$('loadMore').hidden=shown.length===list.length};
  return reset&&window.StudyUI?window.StudyUI.transition(update,$('results')):update();
}
function loadMore(){const firstNew=visibleCount;visibleCount=Math.min(visibleCount+20,rows.length);render(rows,false,firstNew);document.querySelectorAll('.card')[firstNew]?.scrollIntoView({block:'nearest'})}

async function run(e){
  e?.preventDefault();
  if(!ready){await bootstrap();if(!ready)return}
  const version=++searchVersion,p=new URLSearchParams({q:$('q').value});
  [['university','university'],['degree','degree_level'],['type','programme_type'],['ielts','ielts_max'],['cgpa','cgpa_max']].forEach(([id,k])=>{if($(id).value)p.set(k,$(id).value)});
  const fac=$('faculty').value;if(fac)p.set('faculty',fac);
  const directions=selectedDirections();if(directions.length)p.set('direction',directions.join(','));
  renderBrowse();
  if(![...p.values()].some(Boolean)){renderBrowse(directoryRows());await render(directoryRows());if(version===searchVersion)history.replaceState(null,'',location.pathname);return}
  $('count').textContent='正在查询…';
  try {
    const request=new URLSearchParams(p);request.delete('faculty');request.delete('direction');
    let found=await loadJSON('/api/search?'+request);
    if(version!==searchVersion)return;
    found=found.filter(r=>!isOnlineStudy(r));
    if(fac)found=found.filter(r=>r.faculty===fac);
    renderBrowse(found);
    found=found.filter(r=>matchesDirections(r,directions));
    await render(found);
    if(version===searchVersion)history.replaceState(null,'','?'+p);
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
$('degreeChoices').addEventListener('click',event=>{const button=event.target.closest('[data-degree]');if(button){$('degree').value=button.dataset.degree;run()}});
$('otherDegree').addEventListener('change',()=>{$('degree').value=$('otherDegree').value;run()});
$('directionChoices').addEventListener('click',event=>{const button=event.target.closest('[data-direction]');if(button){const ids=selectedDirections(),id=button.dataset.direction;$('direction').value=(ids.includes(id)?ids.filter(value=>value!==id):[...ids,id]).join(',');run()}});
$('allDirections').addEventListener('click',()=>{$('direction').value='';run()});
$('moreDirections').addEventListener('click',()=>{expandedDirections=!expandedDirections;renderBrowse()});
$('activeFilters').addEventListener('click',event=>{
  const button=event.target.closest('[data-clear]');if(!button)return;
  if(button.dataset.clear==='all'){['q','degree','direction','university','faculty','type','ielts','cgpa'].forEach(id=>$(id).value='');expandedDirections=false}
  else if(button.dataset.clear==='direction')$('direction').value=selectedDirections().filter(id=>id!==button.dataset.direction).join(',');
  else $(button.dataset.clear).value='';
  refreshFaculties();window.StudyFilters?.sync();run();
});
$('university').addEventListener('change',()=>{refreshFaculties();run()});
$('faculty').addEventListener('change',run);
document.querySelectorAll('#degree,#type,#ielts,#cgpa').forEach(x=>x.addEventListener('change',run));
$('loadMore').addEventListener('click',loadMore);
$('filterPanel').open=false;
const initial=new URLSearchParams(location.search);
[['q','q'],['university','university'],['degree','degree_level'],['type','programme_type'],['ielts','ielts_max'],['cgpa','cgpa_max'],['direction','direction']].forEach(([id,key])=>{if(initial.has(key))$(id).value=initial.get(key)});
async function bootstrap(){
  $('count').textContent='正在加载专业资料…';
  try{
    allRows=await loadJSON('/api/search?q=');refreshUniversities();refreshFaculties();
    if(initial.has('faculty'))$('faculty').value=initial.get('faculty');
    window.StudyFilters?.init();ready=true;await run();
    $('dataDate').textContent=window.knowledgeDataDate?`资料更新时间：${window.knowledgeDataDate.slice(0,10)}`:'';
    if(['faculty','type','ielts_max','cgpa_max'].some(key=>initial.has(key))){$('filterPanel').open=true;$('filterPanel').dataset&&($('filterPanel').dataset.expanded='true')}
    window.StudyUI?.initFilter($('filterPanel'));
    if(initial.has('programme'))await openDetail(encodeURIComponent(initial.get('programme')));
  }catch(error){$('count').textContent='资料加载失败，请检查网络后点击搜索重试。'}
}
bootstrap();
