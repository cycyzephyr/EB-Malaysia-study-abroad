(() => {
  let catalogPromise, answersPromise;
  const details = new Map();
  const scriptURL = new URL(document.currentScript.src);
  const baseURL = new URL('.', scriptURL);
  const version = scriptURL.searchParams.get('v');
  async function json(path) {
    const url = new URL(path.replace(/^\/+/, ''), baseURL);
    if (version) url.searchParams.set('v', version);
    const response = await fetch(url);
    if (!response.ok) throw new Error('资料加载失败，请检查网络后重试。');
    return response.json();
  }
  function catalog() {
    if (!catalogPromise) catalogPromise = json('/data/search-index.json').then(data => {
      window.knowledgeDataDate = data.exported_at;
      return data;
    }).catch(error => { catalogPromise = null; throw error; });
    return catalogPromise;
  }
  function answers() {
    if (!answersPromise) answersPromise = json('/data/field-answers.json').catch(error => { answersPromise = null; throw error; });
    return answersPromise;
  }
  window.hostedKB = async url => {
    const parsed = new URL(url, location.origin), data = await catalog();
    if (parsed.pathname === '/api/search') {
      const rows = knowledgeSearch(data, parsed.searchParams.get('q') || '', Object.fromEntries(parsed.searchParams));
      if (rows[0]?.requested_field) {
        const byFile = await answers();
        for (const row of rows) row.answer = byFile[row.file_path]?.[row.requested_field] ?? '';
      }
      return rows;
    }
    if (parsed.pathname === '/api/programme') {
      const file = parsed.searchParams.get('file'), row = data.programmes.find(item => item.file_path === file);
      if (!row) throw new Error('专业不存在，请刷新页面。');
      const bundle = row.detail_file;
      if (!details.has(bundle)) details.set(bundle, json('/data/' + bundle).catch(error => {
        details.delete(bundle);
        throw error;
      }));
      const detail = (await details.get(bundle))[file];
      if (!detail) throw new Error('专业资料缺失，请刷新页面。');
      return { ...detail, ...row };
    }
    throw new Error('查询地址无效。');
  };
})();
