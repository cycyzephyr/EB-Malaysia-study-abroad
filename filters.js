(() => {
  const controls=[];
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sync(){controls.forEach(({select,text})=>text.textContent=select.selectedOptions[0]?.textContent||'请选择')}
  function init(){
    if(controls.length)return;
    document.querySelectorAll('.filters select').forEach(select=>{
      const wrapper=document.createElement('div');wrapper.className='filter-select';
      const trigger=document.createElement('button');trigger.type='button';
      trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
      const text=document.createElement('span');trigger.append(text);
      const list=document.createElement('div');list.className='filter-options';list.hidden=true;
      list.id=select.id+'-options';list.setAttribute('role','listbox');
      const label=select.closest('.filter-label');const title=label.firstChild.textContent.trim();
      list.setAttribute('aria-label',title);trigger.setAttribute('aria-label',title);
      trigger.setAttribute('aria-controls',list.id);
      select.after(wrapper);wrapper.append(trigger,list);select.hidden=true;
      let revision=0,animation;
      async function close(focus=false){
        if(trigger.getAttribute('aria-expanded')!=='true')return;
        const current=++revision;trigger.setAttribute('aria-expanded','false');animation?.cancel();if(focus)trigger.focus();
        if(!reduced()&&list.animate){animation=list.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-6px) scale(.98)'}],{duration:150,easing:'ease-in'});await animation.finished.catch(()=>{})}
        if(current!==revision)return;list.hidden=true;
      }
      function open(last=false){
        controls.forEach(control=>{if(control.select!==select)control.close()});
        ++revision;animation?.cancel();list.replaceChildren();
        [...select.options].forEach((option,index)=>{
          const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.tabIndex=-1;
          button.setAttribute('role','option');button.setAttribute('aria-selected',String(option.selected));
          button.addEventListener('click',event=>{event.preventDefault();select.selectedIndex=index;sync();select.dispatchEvent(new Event('change',{bubbles:true}));close(true)});
          list.append(button);
        });
        list.hidden=false;trigger.setAttribute('aria-expanded','true');
        list.classList.toggle('above',innerHeight-trigger.getBoundingClientRect().bottom<180);
        if(!reduced()&&list.animate)animation=list.animate([{opacity:0,transform:'translateY(-8px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:240,easing:'cubic-bezier(.16,1,.3,1)'});
        (last?list.lastElementChild:list.children[select.selectedIndex]||list.firstElementChild)?.focus({preventScroll:true});
      }
      trigger.addEventListener('click',event=>{event.preventDefault();trigger.getAttribute('aria-expanded')==='true'?close():open()});
      trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open(event.key==='ArrowUp')}});
      list.addEventListener('keydown',event=>{
        const buttons=[...list.children],index=buttons.indexOf(document.activeElement);
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
          event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();
        }
      });
      wrapper.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true)}else if(event.key==='Tab')close()});
      select.addEventListener('change',sync);
      controls.push({select,text,wrapper,close});
    });
    document.addEventListener('click',event=>{
      if(event.composedPath().some(node=>node.classList?.contains('filter-select')))return;
      controls.forEach(control=>control.close());
    });
    document.querySelector('#filterPanel>summary')?.addEventListener('click',()=>controls.forEach(control=>control.close()));
    sync();
  }
  window.StudyFilters={init,sync};
})();
