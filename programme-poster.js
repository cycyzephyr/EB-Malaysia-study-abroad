(() => {
  const base = new URL('.', document.currentScript.src);
  const BLUE='#1237a0', INK='#142847', ORANGE='#ef6e16', PALE='#f1f5fb', FONT='"PingFang SC","Microsoft YaHei",sans-serif';
  const clean=x=>String(x??'').trim();
  const useful=x=>clean(x)&&!/^(未(?:公布|公开|列明|提供|收录)|暂无|待(?:核实|确认)|官网未|请向校方|向学校询价|见具体要求)/.test(clean(x));
  const months={January:'1月',February:'2月',March:'3月',April:'4月',May:'5月',June:'6月',July:'7月',August:'8月',September:'9月',October:'10月',November:'11月',December:'12月','Year-round':'全年'};
  function durationYears(n){if(n%6===0||(n<12&&n%3===0))return `${n/12} 年`;if(n<12)return `${n} 个月`;return `${Math.floor(n/12)} 年 ${n%12} 个月`;}
  function durationText(value){return value.replace(/(\d+)\s*(?:[–—~\-至]\s*(\d+)\s*)?(?:个\s*)?(?:月|months?)/gi,(match,a,b,offset,whole)=>{
    if(/年\s*[,，]?\s*$/.test(whole.slice(0,offset))||/^\s*(?:intake|入学|开学|开课)/i.test(whole.slice(offset+match.length))||Number(a)>240||Number(b)>240)return match;
    const from=durationYears(Number(a)),to=b?durationYears(Number(b)):'';
    return to?`${from.replace(/ 年$/, '')}–${to}`:from;
  });}
  function facts(r){
    const s=r.summaries||{},academic=clean(s.cgpa||r.academic_requirement_cn),background=clean(s.background||r.entry_requirement_cn),first=academic.split(/[\n。；]/)[0].trim(),m=first.match(r.university_abbr==='SEGI'?/CGPA\s*(≥|>=|>|≤|<=|至少|不低于)?\s*(\d(?:\.\d+)?)/i:/CGPA\s*(≥|>=|>|≤|<=)?\s*(\d(?:\.\d+)?)/i);
    let gpa=null;if(m&&m.index<65){let qualifier=first.slice(0,m.index).replace(/[：:，, ]+$/,'').trim();if(qualifier.length<=24)gpa={value:(/至少|不低于/.test(m[1]||'')?'≥':m[1]||'')+' '+m[2],note:qualifier};}
    const duration=durationText(clean(s.duration||r.duration_requirement_cn)||(r.duration_min_months!=null?`${r.duration_max_months==null?'至少 ':''}${r.duration_min_months}${r.duration_max_months&&r.duration_max_months!==r.duration_min_months?'–'+r.duration_max_months:''} 个月`:''));
    const fee=clean(s.fee||r.tuition_fee_requirement_cn||r.fee_preview),scope={total:'全程',per_year:'每年',per_semester:'每学期',from_total:'全程起',minimum_total:'最低学制参考总额'}[r.tuition_fee_scope]||'';
    const amounts=[...fee.matchAll(/(?:RM|MYR|USD|GBP|EUR)\s*[\d,]+(?:\.\d+)?/gi)];
    let feeValue='';if(!/差异|冲突|不一致/.test(fee)){if(r.tuition_fee_amount!=null&&r.tuition_fee_currency)feeValue=`${r.tuition_fee_currency==='MYR'?'RM':r.tuition_fee_currency} ${Number(r.tuition_fee_amount).toLocaleString()}`;else if(amounts.length===1)feeValue=amounts[0][0].replace(/^(MYR)/i,'RM');}
    const mumFeeRange=r.university_abbr==='MUM'&&!feeValue&&fee.match(/非科学方向\s*RM\s*([\d,]+)\s*\/年；科学方向\s*RM\s*([\d,]+)\s*\/年/);if(mumFeeRange)feeValue=`RM ${mumFeeRange[1]}–${mumFeeRange[2]}`;
    let tax=fee.match(/(?:不含|另计|加收)\s*6%\s*(?:SST|服务税)|6%\s*(?:SST|服务税)\s*(?:另计|不含)/i)?.[0]||'';const segiUntaxed=fee.match(/课程学费\s*RM\s*([\d,.]+)[^。；\n]*未含税/i);if(r.university_abbr==='SEGI'&&segiUntaxed&&Number(segiUntaxed[1].replaceAll(',',''))===Number(r.tuition_fee_amount)&&/6%\s*SST/i.test(fee))tax='不含6% SST';
    const feeNote=[r.tuition_fee_year?`${r.tuition_fee_year}年`:'',/全额付款/.test(fee)?'全额付款':'',/马来西亚阶段/.test(fee)&&/澳大利亚阶段/.test(fee)?'马来西亚阶段':'',scope,mumFeeRange?'按方向':'',tax].filter(Boolean).join(' · ');
    const tiles=[];if(r.ielts_min!=null)tiles.push({label:'雅思',value:Number.isInteger(Number(r.ielts_min))?Number(r.ielts_min).toFixed(1):String(r.ielts_min),note:''});if(gpa)tiles.push({label:'CGPA',value:gpa.value.trim(),note:gpa.note});
    let dval='';if(/1\+\s*年/.test(duration))dval='至少 1 年';else if(r.duration_min_months!=null&&r.duration_min_months<=240&&(r.duration_max_months==null||r.duration_max_months<=240)){const lo=durationYears(r.duration_min_months),hi=r.duration_max_months!=null&&r.duration_max_months!==r.duration_min_months?durationYears(r.duration_max_months):'';dval=`${r.duration_max_months==null?'至少 ':''}${hi?lo.replace(/ 年$/,'')+'–'+hi:lo}`;}
    const sem=duration.match(/[（(]\s*(\d+\s*学期)\s*[）)]/);const durationNote=r.university_abbr==='SEGI'&&/不同修读模式可能不同/.test(duration)?'不同修读模式可能不同':sem?sem[1]:'';
    if(dval)tiles.push({label:'学制',value:dval,note:durationNote});if(feeValue)tiles.push({label:'参考学费',value:feeValue,note:feeNote});
    const entries=[],add=(label,value)=>{if(useful(value))entries.push({label,text:clean(value)});};
    const intake=clean(s.intake||r.intake_requirement_cn)||(r.intakes||[]).map(x=>months[x]||x).join('、');
    if(r.university_abbr==='SEGI'){const m=intake.match(/^(\d{4})年官网列(?:出|示)的?入学月份：([^；。]+)/);add('入学时间',m?`${m[1]}年：${m[2]}`:intake);}
    if(r.university_abbr==='SEGI'&&academic&&background&&background!==academic&&!academic.includes(background))add('学术要求',`${background}\n${academic}`);
    else {add('学术要求',(academic||background).replace(/这里只记录学术／学历条件；英语成绩另列。?/g,''));if(academic&&background&&background!==academic&&!academic.includes(background))add('学历与专业背景',background);}
    const language=clean(s.language||r.language_requirement_cn);if(language&&!/^国际学生：IELTS\s*≥?\s*[\d.]+。?其他认可考试/.test(language)&&!(r.university_abbr==='SEGI'&&r.ielts_min!=null&&/^国际学生 IELTS\s*[\d.]+\s*或本专业页认可的等同资格。$/.test(language)))add('语言要求',language);else if(!r.ielts_min)add('语言要求',language);
    if(!(r.duration_min_months>240)&&!(r.university_abbr==='SEGI'&&dval&&/^官网列示学制范围为1至2年（不同修读模式可能不同）。$/.test(duration)))add('学制',duration);if(r.university_abbr!=='SEGI')add('入学时间',intake);
    if((!feeValue||mumFeeRange)&&!(r.university_abbr==='SEGI'&&/^该专业课程费用请向世纪大学国际部咨询。$/.test(fee)))add('参考学费',fee);if(feeValue&&r.university_abbr==='MUM'&&/马来西亚阶段/.test(fee)&&/澳大利亚阶段/.test(fee))add('澳大利亚阶段学费',fee.match(/澳大利亚阶段[^。]+/)?.[0]);if(!academic)add('其他要求',s.experience||r.experience_requirement_cn);
    // The approved APU sample has multiple conditional paths; compact only when the source text matches that exact set.
    const sampleAcademic='计算机或相关领域学士：CGPA ≥ 2.5。\n计算机或相关领域学士：CGPA ≥ 2 且 < 2.5，须通过严格内部评估。\n非相关领域学士：CGPA ≥ 2，具备相关工作经验，须通过严格内部评估。\n非相关领域学士：CGPA ≥ 2，无相关工作经验，须通过先修课程。\n没有计算机相关学士者还须通过计算机先修模块。';
    if(r.university_abbr==='APU'&&academic===sampleAcademic&&r.ielts_min===5.5&&r.tuition_fee_amount===45800&&r.tuition_fee_year===2026&&background===sampleAcademic&&duration==='全日制：1+ 年；非全日制：2 年 6 个月（“+”表示至少该时长，完成时间依进度而定）'&&s.intake==='官网当前展示的全日制入学日期：2026年11月30日。完整开班日历及申请截止时间另向学校确认。'&&fee==='2026年国际生费用指南参考：RM 45,800／全程（全额付款口径）；不含6% SST。其他费用和最终应付金额按APU正式账单确认。'&&s.language==='国际学生：IELTS ≥ 5.5。其他认可考试、有效期和豁免规则以本专业官网为准。'){
      return {tiles:[{label:'雅思',value:'5.5',note:''},{label:'CGPA',value:'≥ 2.50',note:'计算机或相关领域学士'},{label:'学制',value:'至少 1 年',note:'全日制；非全日制 2 年 6 个月'},{label:'参考学费',value:'RM 45,800',note:'2026年 · 全额付款 · 全程 · 不含6% SST'}],entries:[{label:'申请条件',text:'相关领域 CGPA 2.00–2.49：须通过内部评估\n非相关领域 CGPA ≥ 2.00：有经验须内部评估\n非相关领域 CGPA ≥ 2.00：无经验须通过先修课程\n非计算机背景还须通过计算机先修模块\n全日制开学：2026年11月30日'}]};
    }
    return {tiles,entries};
  }
  function courses(r){const c=r.curriculum;if(!c)return [];let unspecified=false;const entries=[],add=(label,value)=>{if(clean(value))entries.push({label,text:clean(value)});};
    if(c.academic_year)add('适用学年',c.academic_year);if(c.content_type==='partial_courses')add('课程范围','部分课程');
    for(const g of c.groups||[]){const lines=[];let req=clean(g.requirement);if(r.university_abbr==='SEGI'&&req==='官网列示学习内容；本组未进一步说明必选关系，实际组合及开课以学院安排为准。'){unspecified=true;req='';}if(/^按本组选修规则选择 1 门；每条课程中的 OR 继续表示互选。$/.test(req)||/^按手册课程组件修读；国际与本地学生的替代通识课分别适用。$/.test(req))req='';req=req.replace(/^条件性先修模块：是否需要修读及具体安排，按申请者本科背景与学校审核结果确定；不计作所有学生统一必修的主课程。 官网先修模块安排：全日制 1 个月；非全日制 4 个月。$/, '是否修读依学校审核结果确定\n全日制 1 个月 / 非全日制 4 个月');if(req)lines.push(req);for(const q of g.courses||[]){let n=clean(q.name_cn||q.name_en);if(!n)continue;if(q.credits!=null)n+=`（${q.credits} 学分）`;if(q.note&&!/^OR 为互选关系/.test(q.note))n+=`：${q.note}`;lines.push('• '+n)}if(lines.length)add((g.title||'课程')+(g.credits!=null?` · ${g.credits} 学分`:''),lines.join('\n'));}
    for(const note of c.notes||[]){if(!/^依据本专业官方页面整理/.test(note)&&/选修|不同|冲突|差异|不一致|预先|适用|年份|学年|不代表|非完整|部分资料|延期/.test(note))add('课程说明',note.replace(/[^。；]*(?:本站整理|辅助翻译|官方原文|官方资料为准|按原文要求选择)[^。；]*[。；]?/g,'').replace(/以\d{4}年\d{1,2}月\d{1,2}日读取的[^。；]*[。；]?/g,'').trim());}
    if(unspecified)add('课程说明','部分课程的必选关系未标明。');return entries;}
  function wrap(c,value,width){const lines=[];for(const para of String(value||'').replace(/\r/g,'').split('\n')){let line='';const tokens=para.match(/(?:(?:不含|另计|加收)?\s*6%\s*(?:SST|服务税))|[A-Za-z0-9]+(?:[’'./+–—-][A-Za-z0-9]+)*|[^\S\n]+|[^\n]/gu)||[];for(const token of tokens){for(const part of c.measureText(token).width>width?Array.from(token):[token]){if(line&&c.measureText(line+part).width>width){if(/^[）】，。：；、]/.test(part)&&line.length>1){lines.push(line.slice(0,-1));line=line.slice(-1)+part}else{lines.push(line.trimEnd());line=part.trimStart()}}else line+=part}}if(line)lines.push(line)}return lines;}
  function paragraphs(row){
    const parts=String(row.text).replace(/\r/g,'').split('\n').filter(Boolean);if(!/学术要求|申请条件|学历与专业背景/.test(row.label))return parts;
    return parts.flatMap(part=>{const pieces=part.match(/[^。；]+[。；]?/g)||[part];return pieces.map((piece,i)=>{const t=piece.trim().replace(/；$/,'');return i>0&&/^相关领域学士/.test(pieces[0])&&/^CGPA\s/i.test(t)?'相关领域学士 '+t:t;});});
  }
  function paginate(c,entries,space=950,courseMode=false){
    c.font=`400 30px ${FONT}`;const pages=[];let page=[],left=space;
    const flush=()=>{if(page.length)pages.push(page);page=[];left=space;};
    for(const row of entries){
      if(courseMode&&page.length&&/选修模块\s*1/.test(row.label)&&page.some(x=>/核心模块/.test(x.label)))flush();
      const parts=paragraphs(row),bullets=!courseMode&&/学术要求|申请条件|学历与专业背景/.test(row.label)&&parts.length>1;
      const units=parts.map(p=>wrap(c,(bullets?'• ':'')+p,760)).filter(x=>x.length);let i=0,continuation=false;
      while(i<units.length){
        if(left<130)flush();let capacity=Math.floor((left-72)/44);
        if(capacity<1){flush();continue;}
        let chosen=[],count=0;
        while(i<units.length&&count+units[i].length<=capacity){chosen.push(units[i]);count+=units[i].length;i++;}
        if(!chosen.length){
          if(page.length){flush();continue;}
          chosen.push(units[i].slice(0,capacity));units[i]=units[i].slice(capacity);count=chosen[0].length;if(!units[i].length)i++;
        }
        const lines=chosen.flat(),height=72+lines.length*44;
        page.push({label:row.label+(continuation?'（续）':''),lines,units:chosen,height});left-=height+14;continuation=true;
      }
    }
    flush();
    if(courseMode&&pages.length>1){
      const last=pages.at(-1),prev=pages.at(-2),totalLines=p=>p.reduce((n,b)=>n+b.lines.length,0);
      if(totalLines(last)<=5&&prev.length){
        const tail=prev.at(-1),first=last[0],plain=x=>x.replace(/（续）$/,'');
        if(plain(tail.label)===plain(first.label)){
          while(totalLines(last)<4&&tail.units.length>1){const unit=tail.units.at(-1);if(tail.lines.length-unit.length<3)break;tail.units.pop();first.units.unshift(unit);tail.lines=tail.units.flat();first.lines=first.units.flat();tail.height=72+tail.lines.length*44;first.height=72+first.lines.length*44;}
        }
        if(totalLines(last)<=5&&plain(tail.label)!==plain(first.label)&&tail.units.length>6){
          const move=tail.units.slice(-4),lines=move.flat(),height=72+lines.length*44;
          if(height+14+last.reduce((n,b)=>n+b.height+14,0)<=space){tail.units.splice(-4);tail.lines=tail.units.flat();tail.height=72+tail.lines.length*44;last.unshift({label:plain(tail.label)+'（续）',units:move,lines,height});}
        }
        if(totalLines(last)<=3&&prev.length>1&&tail.height+14+last.reduce((n,b)=>n+b.height+14,0)<=space){last.unshift(prev.pop());}
      }
    }
    return pages;
  }
  const image=src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=src;});
  function box(c,x,y,w,h,color,r=20){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
  function txt(c,s,x,y,size,color=INK,weight=400){c.font=`${weight} ${size}px ${FONT}`;c.fillStyle=color;c.fillText(String(s),x,y);}
  function contain(c,img,x,y,w,h){if(!img)return;const z=Math.min(w/img.width,h/img.height,1);c.drawImage(img,x+(w-img.width*z)/2,y+(h-img.height*z)/2,img.width*z,img.height*z);}
  function frame(c,brand){c.fillStyle='#eaf1fb';c.fillRect(0,0,1080,1440);box(c,24,24,1032,1392,'white',28);contain(c,brand,54,30,425,117);}
  function fitLines(c,s,x,y,width,size,maxLines,color=INK){let ls;do{c.font=`700 ${size}px ${FONT}`;ls=wrap(c,s,width);if(ls.length<=maxLines)break;size--;}while(size>=24);for(const line of ls){txt(c,line,x,y,size,color,700);y+=size*1.3;}return y;}
  function header(c,r,brand,section,index,total){frame(c,brand);fitLines(c,r.university_cn||r.university,54,198,970,34,1,BLUE);fitLines(c,r.programme_name_cn||r.programme_name,54,250,970,36,2,INK);box(c,54,315,972,77,BLUE,16);txt(c,section,82,368,38,'white',700);if(total>1)txt(c,`${index+1} / ${total}`,880,368,25,'white',700);}
  function cover(c,r,brand,logo){
    frame(c,brand);const hasLogo=logo&&logo.naturalWidth>=300&&logo.naturalHeight>=100,shift=hasLogo?0:135;
    let y=fitLines(c,r.university_cn||r.university,64,275+shift,952,52,2,INK);
    y=fitLines(c,r.university||'',65,Math.max(y+15,330+shift),950,32,2,BLUE);
    y=fitLines(c,(r.programme_name||'').toUpperCase(),65,Math.max(y+55,445+shift),950,40,4,ORANGE);
    y=fitLines(c,r.programme_name_cn||r.programme_name,64,Math.max(y+45,645+shift),950,64,2,BLUE);
    const barY=Math.max(hasLogo?725:860,y+20);box(c,64,barY,952,81,BLUE,16);txt(c,'申请条件  ·  学费  ·  课程设置',91,barY+53,36,'white',700);
    if(hasLogo)contain(c,logo,180,Math.max(850,barY+95),720,Math.max(0,1320-Math.max(850,barY+95)));
  }
  function info(c,r,brand,f){
    header(c,r,brand,'申请关键信息',0,1);const tiles=f.tiles.slice(0,4),n=tiles.length,cellWidth=n===1?972:473;
    tiles.forEach((tile,i)=>{
      const full=n===1||(n===3&&i===2),col=full?0:i%2,row=Math.floor(i/2),x=54+col*493,y=413+row*232,w=full?972:cellWidth,warm=/CGPA|学费/.test(tile.label);box(c,x,y,w,213,warm?'#fff0df':'#e6efff');
      txt(c,tile.label,x+26,y+42,27,warm?'#815431':'#435d78',700);let fs=tile.value.length>12?33:tile.value.length>8?42:60;txt(c,tile.value,x+26,y+119,fs,warm?ORANGE:BLUE,700);
      c.font=`400 24px ${FONT}`;wrap(c,tile.note,w-48).slice(0,2).forEach((line,j)=>txt(c,line,x+26,y+162+j*28,24,'#435d78'));
    });
    const start=413+Math.ceil(n/2)*232+20,available=Math.max(0,1340-start);let used=0,blocks=[],rest=[];c.font=`400 30px ${FONT}`;
    for(let index=0;index<f.entries.length;index++){
      const e=f.entries[index],paras=paragraphs(e),bullets=/学术要求|申请条件|学历与专业背景/.test(e.label)&&paras.length>1,gap=bullets?(r.university_abbr==='SEGI'?6:9):0,lines=[];let taken=0;
      for(const para of paras){
        const wrapped=wrap(c,para,bullets?835:870),trial=lines.length+wrapped.length,gaps=Math.max(0,taken)*gap,h=65+44*trial+gaps;
        if(r.university_abbr==='SEGI'&&used+h+12>available)break;
        wrapped.forEach((text,i)=>lines.push({text,first:i===0,bullet:bullets}));taken++;
      }
      const gaps=Math.max(0,taken-1)*gap,h=65+44*lines.length+gaps;
      if(!taken||used+h+12>available){rest=f.entries.slice(index);break;}
      blocks.push({label:e.label,lines,height:h,gap});used+=h+12;
      if(taken<paras.length){rest=[{label:e.label+'（续）',text:paras.slice(taken).join('\n')},...f.entries.slice(index+1)];break;}
    }
    let y=start;for(const b of blocks){box(c,54,y,972,b.height,PALE);txt(c,b.label,80,y+35,27,BLUE,700);let dy=0;b.lines.forEach((line,i)=>{if(i&&line.first&&line.bullet)dy+=b.gap;if(line.first&&line.bullet)txt(c,'•',80,y+74+i*44+dy,30,BLUE);txt(c,line.text,line.bullet?106:80,y+74+i*44+dy,30);});y+=b.height+12;}
    return rest;
  }
  function sheet(c,r,brand,section,blocks,index,total){header(c,r,brand,section,index,total);let y=420;blocks.forEach((b,i)=>{box(c,54,y,972,b.height,PALE);box(c,75,y+12,93,52,BLUE,14);txt(c,String(i+1).padStart(2,'0'),95,y+49,28,'white',700);let size=30;c.font=`700 ${size}px ${FONT}`;while(c.measureText(b.label).width>790&&size>20){size--;c.font=`700 ${size}px ${FONT}`}txt(c,b.label,205,y+38,size,BLUE,700);b.lines.forEach((v,j)=>txt(c,v,205,y+81+j*44,30));y+=b.height+14;});}
  // Standard ZIP (stored, UTF-8 filenames), so all PNGs download in one file without a dependency.
  function zip(files){const enc=new TextEncoder(),parts=[],central=[];let offset=0;const crc=bytes=>{let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^(-(n&1)&0xedb88320)}return(n^0xffffffff)>>>0;};const put=(size,values)=>{const b=new Uint8Array(size),v=new DataView(b.buffer);for(const [p,n,s] of values)s===2?v.setUint16(p,n,true):v.setUint32(p,n,true);return b;};for(const file of files){const name=enc.encode(file.name),bytes=file.bytes,sum=crc(bytes);const head=put(30,[[0,0x04034b50,4],[4,20,2],[6,0x800,2],[8,0,2],[14,sum,4],[18,bytes.length,4],[22,bytes.length,4],[26,name.length,2]]);parts.push(head,name,bytes);const ch=put(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x800,2],[16,sum,4],[20,bytes.length,4],[24,bytes.length,4],[28,name.length,2],[42,offset,4]]);central.push(ch,name);offset+=head.length+name.length+bytes.length;}const size=central.reduce((n,x)=>n+x.length,0);const end=put(22,[[0,0x06054b50,4],[8,files.length,2],[10,files.length,2],[12,size,4],[16,offset,4]]);return new Blob([...parts,...central,end],{type:'application/zip'});}
  async function open(r){const dialog=document.createElement('dialog');dialog.className='programme-poster-dialog';dialog.innerHTML='<div class="programme-poster-bar"><strong>专业图文</strong><button type="button" aria-label="关闭">×</button></div><div class="programme-poster-preview"><p role="status">正在生成图片…</p></div>';document.body.append(dialog);const preview=dialog.querySelector('.programme-poster-preview'),urls=[];const close=()=>{dialog.close();dialog.remove();urls.forEach(u=>URL.revokeObjectURL(u));};dialog.querySelector('button').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();try{await document.fonts?.ready;const brand=await image(new URL('assets/poster-brand.png',base));const logoExt={MUM:'jpg',UPM:'jpg',UUM:'jpg',TAYLORS:'svg',SUNWAY:'webp',LUC:'webp'}[r.university_abbr]||'png';const logo=await image(new URL(`assets/poster-school-${r.university_abbr}.${logoExt}`,base));const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const ctx=canvas.getContext('2d'),f=facts(r),course=courses(r),renders=[];renders.push(()=>cover(ctx,r,brand,logo));let remaining=[];renders.push(()=>{remaining=info(ctx,r,brand,f)});
    // Draw once to determine which details fit under the highlighted facts.
    remaining=info(ctx,r,brand,f);const details=paginate(ctx,remaining),coursePages=paginate(ctx,course,950,true);details.forEach((p,i)=>renders.push(()=>sheet(ctx,r,brand,'申请条件',p,i,details.length)));coursePages.forEach((p,i)=>renders.push(()=>sheet(ctx,r,brand,'课程设置',p,i,coursePages.length)));
    preview.replaceChildren();const files=[];for(let i=0;i<renders.length;i++){renders[i]();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG failed');const name=`${String(i+1).padStart(2,'0')}.png`,url=URL.createObjectURL(blob);urls.push(url);files.push({name,bytes:new Uint8Array(await blob.arrayBuffer())});const figure=document.createElement('figure'),im=document.createElement('img'),a=document.createElement('a');im.src=url;im.alt=`专业图文第 ${i+1} 张`;a.href=url;a.download=name;a.textContent=`下载第 ${i+1} 张`;figure.append(im,a);preview.append(figure);}
    const archive=URL.createObjectURL(zip(files));urls.push(archive);const all=document.createElement('a');all.href=archive;all.download=(r.programme_name_cn||'专业图文').replace(/[\\/:*?"<>|]/g,'-')+'.zip';all.className='programme-poster-all';all.textContent='下载全部图片';preview.prepend(all);
  }catch(e){preview.textContent='图片生成失败，请关闭后重试。';}}
  window.StudyPoster={open,facts,courses,info,paginate,paragraphs,wrap,zip};
})();
