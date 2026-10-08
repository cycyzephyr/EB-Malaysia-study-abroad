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

  function search(catalog, query = '', filters = {}) {
    const items = catalog.programmes.filter(item => {
      for (const [filter, field] of [['university', 'university_abbr'], ['degree_level', 'degree_level'], ['programme_type', 'programme_type']]) {
        if (filters[filter] && item[field] !== filters[filter]) return false;
      }
      for (const field of ['field', 'study_mode']) if (filters[field] && !String(item[field] || '').toLowerCase().includes(filters[field].toLowerCase())) return false;
      for (const [filter, field] of [['ielts_max', 'ielts_min'], ['cgpa_max', 'cgpa_min'], ['duration_max_months', 'duration_min_months'], ['fee_max', 'tuition_fee_amount']]) {
        if (filters[filter] != null && filters[filter] !== '' && (item[field] == null || item[field] > Number(filters[filter]))) return false;
      }
      return true;
    });
    const field = firstMatch(catalog.field_aliases, query);
    const answer = item => ({ ...item, requested_field: field, answer: field ? item.field_answers?.[field] || '' : '' });
    if (!query.trim()) return items.map(answer);

    let q = query.toLowerCase();
    const schools = new Set();
    for (const item of items) if ([...(item.university_aliases || []), item.university_abbr].some(alias => alias && phraseIn(q, String(alias)))) schools.add(item.university_abbr);
    const degree = firstMatch(catalog.degree_aliases, query);
    const type = firstMatch(catalog.type_aliases, query);
    const removable = new Set([
      ...Object.keys(catalog.field_aliases), ...Object.keys(catalog.degree_aliases), ...Object.keys(catalog.type_aliases),
      ...catalog.stop_phrases, ...items.flatMap(item => [...(item.university_aliases || []), item.university_abbr]),
    ].filter(Boolean).map(value => String(value).toLowerCase()));
    for (const phrase of [...removable].sort((a, b) => b.length - a.length)) q = latin(phrase) ? q.replace(boundary(phrase), '$1 ') : q.split(phrase).join(' ');
    const terms = words(q);
    const options = term => catalog.synonym_groups.find(group => group.map(compact).includes(compact(term)))?.map(compact) || [compact(term)];
    const matches = (term, raw) => options(term).some(option => optionMatches(option, raw, compact(raw)));
    let scored = [];
    for (const item of items) {
      if (schools.size && !schools.has(item.university_abbr) || degree && item.degree_level !== degree || type && item.programme_type !== type) continue;
      const raw = [...['university', 'university_cn', 'university_abbr', 'faculty', 'faculty_cn', 'programme_name', 'programme_name_cn', 'field'].map(key => item[key] || ''), ...(item.aliases || []), ...(item.university_aliases || [])].join(' ');
      if (!terms.every(term => matches(term, raw))) continue;
      const name = `${item.programme_name_cn || ''} ${item.programme_name || ''}`;
      const faculty = `${item.faculty_cn || ''} ${item.faculty || ''}`;
      const score = terms.filter(term => matches(term, name)).length * 5 + terms.filter(term => matches(term, faculty)).length * 2 + terms.filter(term => compact(name).startsWith(compact(term))).length * 4 + (schools.size ? 1 : 0);
      scored.push([score, item]);
    }
    if (!scored.length && terms.length) {
      const needle = compact(terms.join(''));
      for (const item of items) {
        if (schools.size && !schools.has(item.university_abbr) || degree && item.degree_level !== degree) continue;
        const score = similarity(needle, compact(item.programme_name_cn || ''));
        if (needle.length >= 3 && score >= 0.58) scored.push([score, item]);
      }
    }
    return scored.sort((a, b) => b[0] - a[0] || (a[1].programme_name < b[1].programme_name ? -1 : a[1].programme_name > b[1].programme_name ? 1 : 0)).map(([, item]) => answer(item));
  }
  globalThis.isOnlineStudy = row => {
    const labels = [row.study_mode, row.programme_name, row.programme_name_cn, ...(row.aliases || [])].join(' ');
    return /\bonline\b|distance learning|remote learning/i.test(labels) || /线上|在线/.test(labels);
  };
  globalThis.knowledgeSearch = search;
})();
