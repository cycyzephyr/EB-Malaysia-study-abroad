(() => {
  const schools = new Set(['APU','INTI','MUM','SEGI','UCSI','UKM','UM','UNM','UPM','USM','UTM']);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const version = document.currentScript?.src?.split('?')[1] || '';
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let revision = 0, active, outgoing;
  function transition(update, target) {
    const current = ++revision;
    active?.skipTransition();
    outgoing?.cancel();
    if (reducedMotion()) return update();
    if (!document.startViewTransition) {
      if (!target?.animate || !target.hasChildNodes()) return update();
      const exit = outgoing = target.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-8px)'}],{duration:120,fill:'forwards',easing:'ease-out'});
      return exit.finished.catch(() => {}).then(() => {
        if (current !== revision) return;
        update();exit.cancel();
        target.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
      });
    }
    active = document.startViewTransition(() => { if (current === revision) update(); });
    active.finished.catch(() => {});
    return active.updateCallbackDone;
  }
  function schoolBadge(row) {
    const abbr = row.university_abbr || '院校', name = row.university_cn || row.university || abbr;
    return `<div class="match-school" title="${esc(name)}">${schools.has(abbr)?`<img class="school-logo" src="./assets/school-${abbr}.webp${version?'?'+version:''}" alt="${esc(name)}校标" width="72" height="48" loading="lazy" decoding="async">`:`<span>${esc(name)}</span>`}</div>`;
  }
  async function dismiss(dialog) {
    if (dialog.animate && !reducedMotion()) {
      const animation = dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(18px) scale(.98)'}],{duration:180,easing:'cubic-bezier(.4,0,1,1)'});
      await animation.finished.catch(() => {});
    }
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
  }
  function initFilter(panel) {
    const summary=panel.querySelector('summary'),content=panel.querySelector('.filter-content');
    if(!summary?.addEventListener||!content?.animate)return;
    let desired=panel.open,animation,sequence=0;
    panel.dataset.expanded=String(desired);
    summary.addEventListener('click',async event=>{
      event.preventDefault();const current=++sequence,from=panel.open?content.getBoundingClientRect().height:0;
      desired=!desired;panel.dataset.expanded=String(desired);animation?.cancel();
      if(reducedMotion()){panel.open=desired;content.style.overflow='';return;}
      panel.open=true;content.style.overflow='hidden';
      animation=content.animate([{height:from+'px',opacity:from?1:0},{height:(desired?content.getBoundingClientRect().height:0)+'px',opacity:desired?1:0}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
      await animation.finished.catch(()=>{});
      if(current!==sequence)return;
      panel.open=desired;animation.cancel();content.style.overflow='';
    });
  }
  window.StudyTheme?.bind();
  document.addEventListener?.('click', event => {
    const link = event.target.closest?.('a.page-link');
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download') || reducedMotion() || document.startViewTransition) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.href === location.href) return;
    const main = document.querySelector('main');
    if (!main?.animate) return;
    event.preventDefault();
    main.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-10px)'}],{duration:160,fill:'forwards',easing:'ease-out'}).finished.catch(() => {}).then(() => location.assign(url.href));
  });
  window.StudyUI = {transition,schoolBadge,dismiss,initFilter};
})();
