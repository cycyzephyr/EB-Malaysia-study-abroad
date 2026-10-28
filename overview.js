(() => {
  const $ = id => document.getElementById(id), esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const degree = {Bachelor:'本科',Master:'硕士',Doctorate:'博士',Foundation:'预科',Diploma:'文凭',Certificate:'证书','Postgraduate Diploma':'研究生文凭','Postgraduate Certificate':'研究生证书','Language Course':'语言课程'};
  const months = {January:'1月',February:'2月',March:'3月',April:'4月',May:'5月',June:'6月',July:'7月',August:'8月',September:'9月',October:'10月',November:'11月',December:'12月','Year-round':'全年'};
  const fields = [
    ['学校',r=>r.university_cn||r.university,2],['学院',r=>r.faculty_cn||r.faculty,2],['中文专业名',r=>r.programme_name_cn,3],['英文专业名',r=>r.programme_name,3],['学历',r=>degree[r.degree_level]||r.degree_level,1],
    ['学习方式',r=>({'Online':'在线／远程','Full-time':'全日制','Part-time':'非全日制'}[r.study_mode]||r.study_mode),1.4],
    ['学制',r=>window.OverviewFormat.duration(r),1.4],
    ['入学月份',r=>window.OverviewFormat.intake(r),1.2],
    ['语言要求／雅思',r=>window.OverviewFormat.ielts(r),1.3],
    ['入学要求',r=>window.OverviewFormat.academic(r),3],
    ['校区',r=>r.campus_cn||r.campus||'',1.4],
    ['费用',r=>window.OverviewFormat.fee(r),1.8],
    ['官网来源',r=>r.source_url,2]
  ];
  const schools=new Set(), levels=new Set(), faculties=new Set(), directions=new Set(), excluded=new Set(), detailCache=new Map();
  let rows=[], filtered=[], generated=[], revision=0, manualSelection=false;
  const defaults=new Set(['学校','中文专业名','英文专业名','学历','学制','入学月份','语言要求／雅思','入学要求','费用']);
  function renderFields(){ $('overviewFields').innerHTML=fields.map(([name])=>`<label><input type="checkbox" value="${esc(name)}" ${defaults.has(name)?'checked':''}>${esc(name)}</label>`).join(''); }
  renderFields();
  $('overviewDegrees').innerHTML=Object.entries(degree).map(([value,label])=>`<label><input type="checkbox" value="${esc(value)}">${esc(label)}</label>`).join('');
  $('overviewDirections').innerHTML=window.OverviewSearch.directions.map(([name])=>`<label><input type="checkbox" value="${esc(name)}">${esc(name)}</label>`).join('');
  const facultyKey=r=>`${r.university_abbr}::${r.faculty||''}`;
  function drawFaculties(){
    const available=rows.filter(r=>schools.has(r.university_abbr)&&r.faculty), map=new Map(available.map(r=>[facultyKey(r),`${r.faculty_cn||r.faculty}${schools.size>1?' · '+(r.university_cn||r.university_abbr):''}`]));
    for(const key of [...faculties])if(!map.has(key))faculties.delete(key);
    $('overviewFaculties').innerHTML=map.size?[...map].sort((a,b)=>a[1].localeCompare(b[1],'zh-CN')).map(([value,label])=>`<label><input type="checkbox" value="${esc(value)}" ${faculties.has(value)?'checked':''}>${esc(label)}</label>`).join(''):'<p>请先选择学校。</p>';
    $('facultyHint').textContent=faculties.size?`已选 ${faculties.size} 个学院`:'默认包含全部学院';
  }
  function render(){
    const q=$('overviewQuery').value.trim().toLowerCase();
    filtered=(!schools.size&&!q&&!levels.size&&!directions.size)?[]:rows.filter(r=>(!schools.size||schools.has(r.university_abbr))&&(!levels.size||levels.has(r.degree_level))&&(!faculties.size||faculties.has(facultyKey(r)))&&window.OverviewSearch.direction(r,directions)&&window.OverviewSearch.query(r,q));
    const picked=filtered.filter(r=>!excluded.has(r.file_path));
    $('resultTitle').textContent=(!schools.size&&!q&&!levels.size&&!directions.size)?'先选择学校、学历或搜索专业':`已汇总 ${picked.length} 个专业`;
    $('overviewCount').textContent=(!schools.size&&!q&&!levels.size&&!directions.size)?'专业会自动汇总到这里':`符合条件 ${filtered.length} 个${picked.length!==filtered.length?`，已排除 ${filtered.length-picked.length} 个`:''}`;
    const names=[...schools].map(id=>rows.find(r=>r.university_abbr===id)?.university_cn||id), stages=[...levels].map(x=>degree[x]||x);
    $('scopeSummary').innerHTML=(!schools.size&&!q&&!levels.size&&!directions.size)?'选中的学校、学历和学院会显示在这里。':`<strong>学校：</strong>${esc(names.length?names.join('、'):'全部学校')}<br><strong>学历：</strong>${esc(stages.length?stages.join('、'):'全部学历')}${q?`<br><strong>关键词：</strong>${esc($('overviewQuery').value.trim())}`:''}${faculties.size?`<br><strong>学院：</strong>已选择 ${faculties.size} 个`:''}${directions.size?`<br><strong>方向：</strong>${esc([...directions].join('、'))}`:''}${manualSelection?'<br><strong>选择方式：</strong>手动挑选；新结果默认不加入':''}`;
    $('resultSample').hidden=!picked.length;$('resultSample').innerHTML=picked.length?`<strong>包含的专业</strong>${picked.slice(0,3).map(r=>`<div class="sample-row">${esc(r.programme_name_cn||r.programme_name)}<small>${esc(r.university_cn||r.university)} · ${esc(degree[r.degree_level]||r.degree_level||'')}</small></div>`).join('')}${picked.length>3?`<p class="sample-more">以及其他 ${picked.length-3} 个专业</p>`:''}`:'';
    $('adjustDetails').hidden=!filtered.length;$('adjustCount').textContent=`已选 ${picked.length} / ${filtered.length} 个`;
    $('overviewList').innerHTML=filtered.map(r=>`<label class="overview-item"><input type="checkbox" data-file="${esc(r.file_path)}" ${excluded.has(r.file_path)?'':'checked'}><span>${esc(r.programme_name_cn||r.programme_name)}<small>${esc(r.university_cn||r.university)} · ${esc(r.faculty_cn||r.faculty||'未注明学院')} · ${esc(degree[r.degree_level]||r.degree_level||'')}</small></span></label>`).join('');
    $('makeOverview').disabled=!picked.length;$('makeOverview').textContent=picked.length?`预览并下载 · ${picked.length} 个专业`:'先选择学校或搜索专业';
  }
  function changed(openList=false){invalidate();render();if(openList&&filtered.length)$('adjustDetails').open=true}
  $('overviewSchools').addEventListener('change',e=>{if(!e.target.value)return;e.target.checked?schools.add(e.target.value):schools.delete(e.target.value);drawFaculties();changed(true)});
  $('overviewDegrees').addEventListener('change',e=>{if(!e.target.value)return;e.target.checked?levels.add(e.target.value):levels.delete(e.target.value);changed(true)});
  $('overviewFaculties').addEventListener('change',e=>{if(!e.target.value)return;e.target.checked?faculties.add(e.target.value):faculties.delete(e.target.value);drawFaculties();changed(true)});
  $('overviewQuery').addEventListener('input',()=>changed(true));
  $('overviewDirections').addEventListener('change',e=>{if(!e.target.value)return;e.target.checked?directions.add(e.target.value):directions.delete(e.target.value);changed(true)});
  $('overviewList').addEventListener('change',e=>{if(!e.target.dataset.file)return;e.target.checked?excluded.delete(e.target.dataset.file):excluded.add(e.target.dataset.file);changed()});
  $('includeAll').onclick=()=>{manualSelection=false;excluded.clear();changed()};
  $('excludeAll').onclick=()=>{(manualSelection?filtered:rows).forEach(r=>excluded.add(r.file_path));manualSelection=true;changed()};
  $('resetScope').onclick=()=>{schools.clear();levels.clear();faculties.clear();directions.clear();excluded.clear();manualSelection=false;$('overviewQuery').value='';document.querySelectorAll('#overviewSchools input,#overviewDegrees input,#overviewDirections input').forEach(x=>x.checked=false);drawFaculties();changed()};
  $('resetFields').onclick=()=>{renderFields();invalidate()};
  function wrap(c,text,width){const result=[];for(const para of String(text||'待核实').replace(/\r/g,'').split('\n')){let line='';for(const token of (para.match(/[A-Za-z0-9]+(?:[.’'\/–-][A-Za-z0-9]+)*|[^\S\n]+|[^\n]/gu)||[])){for(const part of (c.measureText(token).width>width?Array.from(token):[token])){if(line&&c.measureText(line+part).width>width){result.push(line);line=part}else line+=part}}result.push(line)}return result}
  async function detail(row){if(!detailCache.has(row.file_path))detailCache.set(row.file_path,await window.hostedKB('/api/programme?file='+encodeURIComponent(row.file_path)));return detailCache.get(row.file_path)}
  function revoke(){generated.forEach(x=>URL.revokeObjectURL(x.url));generated=[];$('overviewDownloads').replaceChildren();$('overviewPreview').replaceChildren();document.querySelector('.overview-print')?.remove()}
  function invalidate(){revision++;if(generated.length){revoke();$('printOverview').disabled=true;$('overviewStatus').textContent='选择已更改，请重新生成预览。'}}
  $('overviewFields').addEventListener('change',invalidate);$('overviewGroup').addEventListener('change',invalidate);
  async function make(){const chosen=fields.filter(([name])=>[...$('overviewFields').querySelectorAll('input:checked')].some(x=>x.value===name));const picked=filtered.filter(r=>!excluded.has(r.file_path));if(!picked.length||!chosen.length){$('overviewOutput').hidden=false;$('overviewStatus').textContent=!picked.length?'当前没有可导出的专业，请调整选择。':'请先勾选至少一个栏目。';$('overviewOutput').scrollIntoView({behavior:'smooth',block:'start'});return}const runRevision=revision;const button=$('makeOverview');button.disabled=true;$('printOverview').disabled=true;revoke();$('overviewOutput').hidden=false;
    try{const detailed=[];for(let i=0;i<picked.length;i+=25){$('overviewStatus').textContent=`正在读取 ${Math.min(i+25,picked.length)} / ${picked.length} 个专业…`;detailed.push(...await Promise.all(picked.slice(i,i+25).map(detail)));if(runRevision!==revision)throw Error('选择已更改，请重新生成预览')}
      const grouping=$('overviewGroup').value,key=r=>grouping==='degree'?`${degree[r.degree_level]||r.degree_level} · ${r.university_cn||r.university}`:grouping==='name'?'按专业名称':`${r.university_cn||r.university} · ${r.faculty_cn||r.faculty||'其他学院'}`;
      detailed.sort((a,b)=>key(a).localeCompare(key(b),'zh-CN')||(a.programme_name_cn||a.programme_name||'').localeCompare(b.programme_name_cn||b.programme_name||'','zh-CN'));
      const canvas=document.createElement('canvas'),c=canvas.getContext('2d'),W=1600,H=2260,margin=50,tableW=W-2*margin,unit=chosen.reduce((s,f)=>s+f[2],0),widths=chosen.map(f=>tableW*f[2]/unit),fontSize=21,lineHeight=31,top=160,bottom=H-100,headerH=62;
      canvas.width=W;canvas.height=H;c.textBaseline='top';c.font=`${fontSize}px "PingFang SC",sans-serif`;
      let y,page=0,group='',pageHasRows=false;const pdf=document.createElement('div');pdf.className='overview-print';document.body.append(pdf);
      function pageStart(){page++;c.fillStyle='#fff';c.fillRect(0,0,W,H);c.fillStyle='#152440';c.font='bold 36px "PingFang SC",sans-serif';c.fillText('专业一览',margin,45);c.font='21px "PingFang SC",sans-serif';c.fillStyle='#657189';c.fillText(`共 ${detailed.length} 个专业 · 导出日期 ${new Date().toLocaleDateString('zh-CN')} · 第 ${page} 页`,margin,103);y=top;group='';pageHasRows=false}
      function heading(label){c.fillStyle='#b91c12';c.fillRect(margin,y,tableW,42);c.fillStyle='#fff';c.font='bold 23px "PingFang SC",sans-serif';c.fillText(label,margin+12,y+8,tableW-24);y+=42;c.fillStyle='#f3f5fa';c.fillRect(margin,y,tableW,headerH);let x=margin;c.fillStyle='#23324d';c.font='bold 20px "PingFang SC",sans-serif';chosen.forEach((f,i)=>{wrap(c,f[0],widths[i]-12).slice(0,2).forEach((s,j)=>c.fillText(s,x+6,y+7+j*24));x+=widths[i]});y+=headerH;group=label}
      async function save(){const output=document.createElement('canvas');output.width=W;output.height=Math.min(H,Math.max(y+110,380));const out=output.getContext('2d');out.drawImage(canvas,0,0,W,output.height,0,0,W,output.height);out.fillStyle='#657189';out.font='19px "PingFang SC",sans-serif';out.textBaseline='top';out.fillText('表中为重点条件；完整要求和费用以专业详情及院校官网为准。',margin,output.height-52);const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(runRevision!==revision)throw Error('选择已更改，请重新生成预览');if(!blob)throw Error('图片生成失败');const url=URL.createObjectURL(blob);generated.push({url,page});const img=document.createElement('img');img.src=url;img.alt=`专业一览第 ${page} 页`;const box=document.createElement('div');box.className='overview-page';box.append(img);$('overviewPreview').append(box);const link=document.createElement('a');link.href=url;link.download=`专业一览-${page}.png`;link.className='overview-download';link.textContent=`下载第 ${page} 页 PNG`;$('overviewDownloads').append(link);const printImg=document.createElement('img');printImg.src=url;pdf.append(printImg)}
      pageStart();for(const row of detailed){const label=key(row);c.font=`${fontSize}px "PingFang SC",sans-serif`;const lines=chosen.map((f,i)=>wrap(c,f[1](row),Math.max(30,widths[i]-16)));let offset=0,total=Math.max(...lines.map(x=>x.length));while(offset<total){if(group!==label){if(y+104+lineHeight+20>bottom){await save();pageStart()}heading(label)}let capacity=Math.floor((bottom-y-16)/lineHeight);if(capacity<1){await save();pageStart();continue}const take=Math.min(capacity,total-offset),height=Math.max(lineHeight,take*lineHeight)+16;let x=margin;c.font=`${fontSize}px "PingFang SC",sans-serif`;chosen.forEach((f,i)=>{c.fillStyle=pageHasRows?'#fff':'#fbfcff';c.fillRect(x,y,widths[i],height);c.strokeStyle='#d5dce7';c.strokeRect(x,y,widths[i],height);c.fillStyle='#17233a';lines[i].slice(offset,offset+take).forEach((line,j)=>c.fillText(line,x+8,y+8+j*lineHeight));x+=widths[i]});y+=height;offset+=take;pageHasRows=true;if(offset<total){await save();pageStart()}}}
      await save();$('overviewStatus').textContent=`已生成 ${generated.length} 页，包含 ${detailed.length} 个专业。可下载图片，或打印／保存为 PDF。`;$('printOverview').disabled=false;$('overviewOutput').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){revoke();$('overviewStatus').textContent=`生成失败：${error.message}，请重试。`}finally{button.disabled=false}}
  $('makeOverview').onclick=make;$('printOverview').onclick=()=>window.print();
  window.hostedOverviewCatalog().then(data=>{rows=data.programmes;const list=[...new Map(rows.filter(r=>r.university_abbr).map(r=>[r.university_abbr,r.university_cn||r.university])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'zh-CN'));$('overviewSchools').innerHTML=list.map(([value,label])=>`<label><input type="checkbox" value="${esc(value)}">${esc(label)}</label>`).join('');drawFaculties();render()}).catch(()=>{$('overviewCount').textContent='资料加载失败，请刷新页面重试。'});
})();
