(() => {
  const preference = matchMedia('(prefers-color-scheme: dark)');
  let saved;
  try { const value=localStorage.getItem('study-theme'); if(value==='light'||value==='dark')saved=value; } catch {}
  function apply(theme) {
    document.documentElement.dataset.theme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0d1423':'#f4f6fb');
    const button=document.getElementById('themeToggle');
    if(button){button.innerHTML=theme==='dark'?'<span aria-hidden="true">☼</span> 日间模式':'<span aria-hidden="true">☾</span> 夜间模式';button.setAttribute('aria-pressed',String(theme==='dark'));}
  }
  apply(saved||(preference.matches?'dark':'light'));
  preference.addEventListener?.('change',()=>{if(!saved)apply(preference.matches?'dark':'light')});
  window.StudyTheme={bind(){
    apply(document.documentElement.dataset.theme);
    document.getElementById('themeToggle')?.addEventListener('click',()=>{
      saved=document.documentElement.dataset.theme==='dark'?'light':'dark';
      apply(saved);try{localStorage.setItem('study-theme',saved)}catch{}
    });
  }};
})();
