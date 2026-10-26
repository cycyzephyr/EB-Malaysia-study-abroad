/* Search rules and field answers are exported from the existing Python app. */
(() => {
  const words = text => String(text ?? '').toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const compact = text => words(text).join('');
  const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const latin = text => /^[a-z0-9 ]+$/.test(text);
  const boundary = text => new RegExp('(^|[^a-z0-9])' + escaped(text) + '(?=$|[^a-z0-9])', 'g');
  const phraseIn = (text, phrase) => latin(phrase.toLowerCase()) ? boundary(phrase.toLowerCase()).test(text.toLowerCase()) : text.toLowerCase().includes(phrase.toLowerCase());
  const optionMatches = (option, raw, normalized) => /^[a-z0-9]{1,2}$/.test(compact(option)) ? phraseIn(raw, option) : normalized.includes(compact(option));
  const firstMatch = (aliases, query) => Object.entries(aliases).find(([alias]) => phraseIn(query, alias))?.[1] ?? null;
  const onlineTerms = /\b(?:open\s+(?:and\s+)?distance\s+learning|distance\s+learning|remote\s+learning|online(?:\s+(?:learning|mode|study|courses?))?|odl)\b|(?:线上|在线)(?:\s*(?:学习|授课|课程))?|远程(?=$|[\s，、,:：()（）a-z]|学习|授课|课程|教育|本科|硕士|博士)(?:\s*(?:学习|授课|课程))?|网络授课/i;
  const isOnlineSearch = query => onlineTerms.test(String(query ?? ''));
  function isOnlineStudy(row) {
    if (isOnlineSearch(row.study_mode)) return true;
    // Delivery labels are parenthesised or suffixed; a research topic such as
    // "Master of Philosophy: Online Learning" does not establish online delivery.
    return [row.programme_name, row.programme_name_cn, ...(row.aliases || [])].some(label =>
      /(?:^|[(（\[【–—-])\s*(?:online\b|odl\b|(?:open\s+(?:and\s+)?)?distance\s+learning|remote\s+learning|线上|在线|远程(?:学习|授课|教育|课程)|网络授课)/i.test(String(label || '')));
  }

  // Same longest matching block ratio as difflib for the short programme titles.
  function similarity(a, b) {
    let matched = 0;
    const queue = [[0, a.length, 0, b.length]];
    while (queue.length) {
      const [alo, ahi, blo, bhi] = queue.pop();
      let best = 0, ai = alo, bj = blo, previous = new Map();
      for (let i = alo; i < ahi; i++) {
        const current = new Map();
        for (let j = blo; j < bhi; j++) {
          if (a[i] !== b[j]) continue;
          const size = (previous.get(j - 1) || 0) + 1;
          current.set(j, size);
          if (size > best) { best = size; ai = i - size + 1; bj = j - size + 1; }
        }
        previous = current;
      }
      if (!best) continue;
      matched += best;
      if (alo < ai && blo < bj) queue.push([alo, ai, blo, bj]);
      if (ai + best < ahi && bj + best < bhi) queue.push([ai + best, ahi, bj + best, bhi]);
    }
    return a.length + b.length ? 2 * matched / (a.length + b.length) : 1;
  }

  const degreeLabels = {Bachelor:'本科',Master:'硕士',Doctorate:'博士',Foundation:'预科',Diploma:'文凭',Certificate:'证书','Language Course':'语言课程','Postgraduate Diploma':'研究生文凭','Postgraduate Certificate':'研究生证书'};
  const typeLabels = {Coursework:'授课型',Research:'研究型','Mixed Mode':'混合型',Clinical:'临床型'};
  const prepared = new WeakMap();
  function searchAliases(catalog) {
    if (prepared.has(catalog)) return prepared.get(catalog);
    const schools = new Map((catalog.schools || []).map(school => [school.id, {...school, aliases:new Set([school.id,school.name,school.english,...school.aliases])}]));
    for (const row of catalog.programmes) {
      if (!schools.has(row.university_abbr)) schools.set(row.university_abbr, {id:row.university_abbr,name:row.university_cn||row.university_abbr,aliases:new Set()});
      const school = schools.get(row.university_abbr);
      for (const alias of [row.university_abbr,row.university,row.university_cn,...(row.university_aliases || [])]) if (alias) school.aliases.add(alias);
    }
    const aliases = [];
    for (const school of schools.values()) for (const alias of school.aliases) if (alias) aliases.push({alias,kind:'university',value:school.id,label:school.name});
    for (const [dictionary,kind,labels] of [[catalog.degree_aliases,'degree_level',degreeLabels],[catalog.type_aliases,'programme_type',typeLabels]]) {
      for (const [alias,value] of Object.entries(dictionary || {})) aliases.push({alias,kind,value,label:labels[value]||value});
    }
    for (const [value,alias] of Object.entries(degreeLabels)) aliases.push({alias,kind:'degree_level',value,label:alias});
    for (const [alias,value] of [['公立大学','公立大学'],['公立','公立大学'],['私立大学','私立大学'],['私立','私立大学'],['海外大学分校','海外大学分校']]) aliases.push({alias,kind:'school_type',value,label:value});
    const result = {schools,aliases:aliases.sort((a,b)=>b.alias.length-a.alias.length)};
    prepared.set(catalog,result);
    return result;
  }
  const removePhrase = (text,phrase) => latin(phrase) ? text.replace(boundary(phrase),'$1 ') : text.split(phrase).join(' ');

  function parseQuery(catalog, query = '', filters = {}) {
    query = String(query);
    let remaining = query.toLowerCase();
    const parts = [], errors = [], {schools,aliases} = searchAliases(catalog);
    const add = (start,length,condition) => {
      parts.push({...condition,start,end:start+length,text:query.slice(start,start+length)});
      remaining = remaining.slice(0,start)+' '.repeat(length)+remaining.slice(start+length);
    };
    // Mask recognised spans rather than changing their offsets: each chip can remove
    // precisely its own phrase without deleting another condition or a title word.
    const negation = '(?:不要|排除|不选|不含|不考虑|不看|非|excluding\\s+|except\\s+|not\\s+)\\s*';
    for (const entry of aliases) {
      const alias = entry.alias.toLowerCase();
      const pattern = new RegExp(negation+escaped(alias)+(latin(alias)?'(?=$|[^a-z0-9])':''),'gi');
      for (const match of [...remaining.matchAll(pattern)]) add(match.index,match[0].length,{...entry,exclude:true,label:'排除：'+entry.label});
    }
    const onlinePattern = new RegExp(negation+'(?:'+onlineTerms.source+')','gi');
    for (const match of [...remaining.matchAll(onlinePattern)]) add(match.index,match[0].length,{kind:'online',value:true,exclude:true,label:'排除：在线授课'});
    for (const [kind,label,max] of [['ielts_min','IELTS',9],['cgpa_min','CGPA',4]]) {
      const name = kind==='ielts_min'?'(?:雅思|ielts)':'(?:cgpa|gpa|绩点)';
      const numeric = new RegExp(name+'\\s*(?:要求|成绩|分数)?\\s*(不高于|不超过|不低于|至少|至多|低于|高于|小于|大于|超过|达到|为|是|有|≤|≥|<=|>=|<|>|=|:|：)?\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*分?','gi');
      for (const match of [...remaining.matchAll(numeric)]) {
        const number=Number(match[2]), comparison=match[1]||'', op=/^(不低于|至少|达到|≥|>=)$/.test(comparison)?'>=':/^(高于|大于|超过|>)$/.test(comparison)?'>':/^(低于|小于|<)$/.test(comparison)?'<':'<=';
        if (number<0 || number>max || (kind==='ielts_min' && number*2%1)) errors.push(`${label} 数值需为 0–${max}${kind==='ielts_min'?'，以 0.5 为间隔':''}。`);
        add(match.index,match[0].length,{kind,value:number,op,label:`${label} 要求 ${op.replace('<=','≤').replace('>=','≥')} ${number}`});
      }
    }
    for (const entry of aliases) {
      const alias = entry.alias.toLowerCase();
      const pattern = new RegExp((latin(alias)?'(?<![a-z0-9])':'')+escaped(alias)+(latin(alias)?'(?=$|[^a-z0-9])':''),'g');
      for (const match of [...remaining.matchAll(pattern)]) add(match.index,match[0].length,entry);
    }
    for (const match of [...remaining.matchAll(new RegExp(onlineTerms.source,'gi'))]) add(match.index,match[0].length,{kind:'online',value:true,label:'在线授课'});
    if (/(?:不要|排除|不选|不含|不考虑|不看|\b(?:not|except|excluding)\b)/i.test(remaining)) errors.push('暂不支持这条排除条件，请使用具体学校、学历、培养类型或在线授课名称。');
    const field = firstMatch(catalog.field_aliases, remaining);
    for (const phrase of [...Object.keys(catalog.field_aliases),...catalog.stop_phrases,'只考虑','只要','只看','我想找','我想','想找','请'].sort((a,b)=>b.length-a.length)) remaining=removePhrase(remaining,phrase.toLowerCase());
    remaining=remaining.replace(/(^|\s)(?:以及|或者|和|与|及|或|and|or)(?=$|\s)/g,' ');
    const included = kind => parts.filter(part=>part.kind===kind&&!part.exclude);
    const excluded = kind => parts.filter(part=>part.kind===kind&&part.exclude);
    for (const [kind,label] of [['university','学校'],['degree_level','学历'],['programme_type','培养类型']]) {
      const positive=included(kind), negative=excluded(kind);
      if (filters[kind] && (positive.length&&!positive.some(part=>part.value===filters[kind]) || negative.some(part=>part.value===filters[kind]))) errors.push(`搜索中的${label}与已选筛选条件冲突，请取消其中一个条件。`);
      if (positive.length&&positive.every(part=>negative.some(other=>other.value===part.value))) errors.push(`${label}同时被选择和排除，请调整条件。`);
    }
    const positiveTypes=included('school_type'), negativeTypes=excluded('school_type');
    if (positiveTypes.length&&positiveTypes.every(part=>negativeTypes.some(other=>other.value===part.value))) errors.push('学校类型同时被选择和排除，请调整条件。');
    const schoolParts=included('university');
    const selectedSchool=filters.university?[schools.get(filters.university)]:schoolParts.map(part=>schools.get(part.value));
    if ((positiveTypes.length||negativeTypes.length) && selectedSchool.length && selectedSchool.every(school=>!school || positiveTypes.length&&!positiveTypes.some(part=>part.value===school.type) || negativeTypes.some(part=>part.value===school.type))) errors.push('学校名称与学校类型条件冲突，请调整条件。');
    if (included('online').length&&excluded('online').length) errors.push('在线授课同时被选择和排除，请调整条件。');
    for (const [kind,key,label] of [['ielts_min','ielts_max','IELTS'],['cgpa_min','cgpa_max','CGPA']]) {
      const numbers=[...included(kind)], upper=filters[key];
      if (upper!=null&&upper!=='') numbers.push({op:'<=',value:Number(upper)});
      if (numbers.some(part=>!Number.isFinite(part.value))) errors.push(`${label} 筛选值无效，请输入数字。`);
      const lower=numbers.filter(part=>part.op.startsWith('>')), higher=numbers.filter(part=>part.op.startsWith('<'));
      if (lower.some(a=>higher.some(b=>a.value>b.value||a.value===b.value&&(a.op==='>'||b.op==='<')))) errors.push(`${label} 条件冲突，请调整搜索或筛选数值。`);
    }
    return {query,parts:parts.sort((a,b)=>a.start-b.start),terms:words(remaining),requested_field:field,errors:[...new Set(errors)],online:included('online').length>0};
  }

  function search(catalog, query = '', filters = {}) {
    const plan = parseQuery(catalog,query,filters);
    if (plan.errors.length) return [];
    const schoolTypes = searchAliases(catalog).schools;
    const items = catalog.programmes.filter(item => {
      for (const [kind,field] of [['university','university_abbr'],['degree_level','degree_level'],['programme_type','programme_type'],['school_type','school_type'],['online','online']]) {
        const value=kind==='school_type'?schoolTypes.get(item.university_abbr)?.type:kind==='online'?isOnlineStudy(item):item[field];
        const positive=plan.parts.filter(part=>part.kind===kind&&!part.exclude), negative=plan.parts.filter(part=>part.kind===kind&&part.exclude);
        const matches = candidate => kind==='programme_type' ? (item.programme_types?.length ? item.programme_types : [value]).includes(candidate) : candidate===value;
        if (positive.length&&!positive.some(part=>matches(part.value)) || negative.some(part=>matches(part.value))) return false;
        if (filters[kind]&&!matches(filters[kind])) return false;
      }
      for (const part of plan.parts.filter(part=>part.kind==='ielts_min'||part.kind==='cgpa_min')) {
        const value=item[part.kind];
        if (value==null || !({'<=':value<=part.value,'<':value<part.value,'>=':value>=part.value,'>':value>part.value}[part.op])) return false;
      }
      for (const field of ['field','study_mode']) if (filters[field]&&!String(item[field]||'').toLowerCase().includes(filters[field].toLowerCase())) return false;
      for (const [filter,field] of [['ielts_max','ielts_min'],['cgpa_max','cgpa_min'],['duration_max_months','duration_min_months'],['fee_max','tuition_fee_amount']]) {
        if (filters[filter]==null||filters[filter]==='') continue;
        let value=item[field];
        if (filter==='duration_max_months' && item.duration_options?.length) {
          const types=plan.parts.filter(part=>part.kind==='programme_type'&&!part.exclude).map(part=>part.value);
          if (filters.programme_type) types.push(filters.programme_type);
          const options=item.duration_options.filter(option=>!types.length||types.some(type=>option.programme_types.includes(type)));
          value=options.length?Math.min(...options.map(option=>option.min_months)):undefined;
        }
        if (value==null||value>Number(filters[filter])) return false;
      }
      return true;
    });
    const field = plan.requested_field;
    const answer = item => ({...item,requested_field:field,answer:field?item.field_answers?.[field]||'':''});
    if (!query.trim()) return items.map(answer);
    const terms=plan.terms;
    const options=term=>catalog.synonym_groups.find(group=>group.map(compact).includes(compact(term)))?.map(compact)||[compact(term)];
    const matches=(term,raw)=>options(term).some(option=>optionMatches(option,raw,compact(raw)));
    let scored=[];
    for (const item of items) {
      const raw=[...['university','university_cn','university_abbr','faculty','faculty_cn','programme_name','programme_name_cn','field','study_mode'].map(key=>item[key]||''),...(item.aliases||[]),...(item.university_aliases||[])].join(' ');
      if (!terms.every(term=>matches(term,raw))) continue;
      const name=`${item.programme_name_cn||''} ${item.programme_name||''}`, faculty=`${item.faculty_cn||''} ${item.faculty||''}`;
      const needle=compact(terms.join(''));
      const exact=needle&&[item.programme_name_cn,item.programme_name].some(title=>title&&(compact(title)===needle||phraseIn(query,title)));
      const score=terms.filter(term=>matches(term,name)).length*5+terms.filter(term=>matches(term,faculty)).length*2+terms.filter(term=>compact(name).startsWith(compact(term))).length*4
        +terms.filter(term=>optionMatches(compact(term),name,compact(name))).length*3+(exact?40:0);
      scored.push([score,item]);
    }
    if (!scored.length&&terms.length===1) {
      const needle=compact(terms[0]);
      // Chinese title tolerance stays conservative; every hard condition was already
      // applied above. English spelling suggestions are a separate future change.
      if (/^[\u3400-\u9fff]{3,}$/.test(needle)) for (const item of items) {
        const score=similarity(needle,compact(item.programme_name_cn||''));
        if (score>=0.72) scored.push([score,item]);
      }
    }
    return scored.sort((a,b)=>b[0]-a[0]||(a[1].programme_name<b[1].programme_name?-1:a[1].programme_name>b[1].programme_name?1:0)).map(([,item])=>answer(item));
  }
  globalThis.parseKnowledgeQuery = parseQuery;
  globalThis.isOnlineStudy = isOnlineStudy;
  globalThis.isOnlineSearch = isOnlineSearch;
  globalThis.knowledgeSearch = search;
})();
