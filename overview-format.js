(() => {
  function ielts(row) {
    const text=String(row.summaries?.language||row.language_requirement_cn||'');
    const year=text.match(/原(20\d\d)[.年](\d\d)[.月](\d\d)语言表[^：]*：\s*IELTS\s*(\d(?:\.\d)?)/i);
    const direct=text.match(/(?:直录|直接语言路径)[^。；]*?IELTS(?: Academic)?(?:总分)?\s*(\d(?:\.\d)?)/i);
    const pathway=text.match(/(?:附带英语学习路径|另一路径)[^。；]*?(?:IELTS(?: Academic)?(?:总分)?|总分)\s*(\d(?:\.\d)?)/i);
    if(direct&&pathway&&/语言强化班|In-Sessional|英语学习路径/i.test(text))return `IELTS ${direct[1]}（直录）／${pathway[1]}（含语言课）`;
    if(row.ielts_min!=null)return `IELTS ${row.ielts_min}${/英语分流参考/.test(text)?'（分流参考）':''}`;
    if(year)return `IELTS ${year[4]}（${year[1]}语言表）`;
    const supplied=text.match(/(?:招生资料列示|截图列示|截图)\s*IELTS\s*(\d(?:\.\d)?)/i);
    if(supplied)return `IELTS ${supplied[1]}（招生资料参考）`;
    return '雅思待核实';
  }
  function fee(row) {
    const scope={total:'全程',from_total:'全程起',per_year:'年',per_semester:'学期',minimum_total:'最低学制总额'}[row.tuition_fee_scope];
    const text=String(row.summaries?.fee||row.tuition_fee_requirement_cn||row.fee_preview||'');
    const compact=row.fee_preview_card_cn;
    if(['TAYLORS','UUM','HELP'].includes(row.university_abbr)&&compact&&/(?:RM|MYR|USD|CNY|GBP|EUR)\s*[\d,]/i.test(compact))return compact;
    if(row.tuition_fee_amount!=null&&row.tuition_fee_currency&&scope){
      const currency=row.tuition_fee_currency==='MYR'?'RM':row.tuition_fee_currency;
      const tax=/(?:不含|未含)(?:国际生)?\s*(?:6%\s*)?(?:SST|服务税|税)/i.test(text)?'，不含税':'';
      return `${currency} ${Number(row.tuition_fee_amount).toLocaleString('zh-CN')} / ${scope}${row.tuition_fee_year||tax?`（${[row.tuition_fee_year?row.tuition_fee_year+'年':'',tax.replace(/^，/,'')].filter(Boolean).join('，')}）`:''}`;
    }
    if(compact&&/(?:RM|MYR|USD|CNY|GBP|EUR)\s*[\d,]/i.test(compact))return compact;
    const clause=text.split(/[；;。\n]/).find(x=>/(?:学费|tuition)/i.test(x)&&/(?:RM|MYR|USD|CNY|GBP|EUR)\s*[\d,]/i.test(x));
    if(clause&&clause.length<=80)return clause.trim();
    return /询价|向学校|向校方|招生处/.test(text)?'向学校询价':'待核实';
  }
  function duration(row) {
    const text=String(row.duration_card_cn||row.summaries?.duration||row.duration_requirement_cn||'');
    if(/非全日制|part[ -]?time/i.test(text))return text.replace(/[（(][^（）()]*[+＋][^（）()]*表示[^（）()]*[）)]/g,'').replace(/(\d+(?:\.\d+)?)\s*[+＋]\s*年/g,'至少$1年').replace(/\s+/g,' ').trim();
    if(row.duration_min_months!=null){const min=row.duration_min_months,max=row.duration_max_months;const value=n=>n%12===0?`${n/12}年`:`${n}个月`;return max&&max!==min?`${value(min)}–${value(max)}`:max==null?`至少${value(min)}`:value(min)}
    return text||'待核实';
  }
  function intake(row) {
    const names={January:'1月',February:'2月',March:'3月',April:'4月',May:'5月',June:'6月',July:'7月',August:'8月',September:'9月',October:'10月',November:'11月',December:'12月','Year-round':'全年'};
    const text=String(row.summaries?.intake||row.intake_requirement_cn||'');
    const parsed=[...new Set((row.intakes||[]).map(x=>names[x]||x))];
    const months=parsed.length?parsed:[...new Set(text.match(/(?:1[0-2]|[1-9])月/g)||[])];
    const year=text.match(/20\d{2}年/);
    if(months.length)return `${year?year[0]+'：':''}${months.join('、')}`;
    if(/持续招生|ongoing|year.round/i.test(text))return '持续招生';
    return text||'待核实';
  }
  function academic(row) {
    const text=String(row.academic_preview_cn||row.summaries?.cgpa||row.academic_requirement_cn||row.entry_requirement_cn||(row.cgpa_min!=null?`CGPA ≥ ${row.cgpa_min}`:''));
    if(!text)return '待核实';
    const parts=text.replace(/\s+/g,' ').split(/[；;。\n]/).map(x=>x.trim()).filter(Boolean);
    const chosen=[];
    for(const part of parts){
      if(chosen.length && chosen.join('；').length+part.length+1>140)break;
      chosen.push(part);
    }
    let result=chosen.join('；');
    if(result.length>140 && chosen.length===1){
      const clauses=result.split(/，/);let prefix='';
      for(const clause of clauses){if(prefix&&(prefix.length+clause.length+1>140))break;prefix+=(prefix?'，':'')+clause;}
      if(prefix.length>=10&&!/(?:及|或|和|且|并|须|包括|至少|不低于)$/.test(prefix))result=prefix;
    }
    if(/矛盾|混写/.test(row.application_notice_cn||''))result+='（官网有差异）';
    return result;
  }
  globalThis.OverviewFormat={ielts,fee,academic,duration,intake};
})();
