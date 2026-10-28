(() => {
  const directions = [
    ['计算机与数据',['计算机','电脑科学','信息技术','信息系统','数据科学','数据分析','软件','人工智能','网络安全','computer','computing','data science','data analytics','information technology','information systems','software','artificial intelligence','cybersecurity','cyber security']],
    ['商科与管理',['工商管理','商业','商学','管理','business','management','administration','marketing','市场营销']],
    ['会计与金融',['会计','金融','财务','银行','精算','accounting','accountancy','finance','financial','banking','actuarial']],
    ['工程技术',['工程','engineering','engineer']],
    ['教育与语言',['教育','教学','语言学','英语','education','teaching','tesol','tesl','linguistic']],
    ['医学与健康',['医学','医科','医疗','健康','护理','药学','药剂','牙科','营养','physiotherapy','medicine','medical','health','nursing','pharmacy','dental','dentistry','nutrition']],
    ['心理与社会',['心理','社会工作','社会学','心理学','psychology','psychological','social work','sociology']],
    ['传媒与设计',['传媒','传播','媒体','设计','艺术','音乐','电影','动画','communication','media','design','art','music','film','animation']],
    ['法律与政策',['法律','法学','公共政策','公共行政','law','legal','public policy','public administration']],
    ['旅游与酒店',['旅游','酒店','烹饪','hospitality','tourism','hotel','culinary']],
    ['自然科学',['生物','化学','物理','数学','环境','农业','地质','微生物','biology','biotechnology','chemistry','physics','mathematics','environment','agriculture','geology','microbiology']],
    ['建筑与规划',['建筑','工料测量','城市规划','architecture','architectural','quantity surveying','urban planning']]
  ];
  const concepts=[
    [['护理','nursing','nurse'],['护理','nursing','nurse']],
    [['教育','教学','education','teaching'],['教育','教学','education','teaching']],
    [['计算机','电脑','computer'],['计算机','电脑','computer','computing']],
    [['科学','science'],['科学','science']],
    [['心理','psychology'],['心理','psychology','psychological']],
    [['金融','finance','financial'],['金融','finance','financial']],
    [['科技','技术','technology'],['科技','技术','technology']],
    [['硕士','master'],['硕士','master']],
    [['博士','doctorate','phd'],['博士','doctorate','phd','doctor of philosophy']],
    [['本科','学士','bachelor'],['本科','学士','bachelor']]
  ];
  const norm=s=>String(s||'').toLowerCase().normalize('NFKC');
  const title=row=>norm([row.programme_name_cn,row.programme_name,...(row.aliases||[])].join(' '));
  const has=(text,word)=>{
    word=norm(word);
    if(/^[a-z ]+$/.test(word))return new RegExp('(?:^|[^a-z])'+word.replace(/ +/g,'\\s+')+'(?:$|[^a-z])','i').test(text);
    return text.includes(word);
  };
  function query(row,value){
    const q=norm(value).trim();if(!q)return true;
    const all=norm([row.university_cn,row.university,row.university_abbr,row.faculty_cn,row.faculty,title(row)].join(' '));
    if(all.includes(q))return true;
    const noSpace=q.replace(/[\s，,、（）()]/g,'');
    if(/^[a-z\d ]+$/.test(q))return q.split(/\s+/).filter(Boolean).every(word=>has(all,word));
    let rest=noSpace,groups=[];
    for(const [inputs,outputs] of concepts){const term=inputs.filter(x=>/[^a-z]/i.test(x)).sort((a,b)=>b.length-a.length).find(x=>rest.includes(x));if(term){groups.push(outputs);rest=rest.replace(term,'')}}
    return !rest&&groups.length>=2&&groups.every(words=>words.some(word=>has(title(row),word)));
  }
  function direction(row,names){return !names.size||directions.some(([name,words])=>names.has(name)&&words.some(word=>has(title(row),word)))}
  globalThis.OverviewSearch={directions,query,direction};
})();
