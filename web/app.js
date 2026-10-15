const form=document.querySelector('#search'),input=document.querySelector('#q'),results=document.querySelector('#results'),status=document.querySelector('#status');form.addEventListener('submit',async e=>{e.preventDefault();const q=input.value.trim();if(!q)return;status.textContent='Searching local index…';results.replaceChildren();try{const r=await fetch(`${window.QUARTZ_CONFIG.apiBase}/api/search?q=${encodeURIComponent(q)}`);if(!r.ok)throw Error();const data=await r.json();status.textContent=`${data.count} indexed result(s)`;for(const d of data.results){const el=document.createElement('article'),a=document.createElement('a'),s=document.createElement('small'),p=document.createElement('p');a.href=d.url;a.textContent=d.title||d.url;a.rel='noopener noreferrer';s.textContent=d.url;p.textContent=(d.content||'').slice(0,240);el.append(a,s,p);results.append(el);}if(!data.count)status.textContent='No local matches. Index documents using the API.';}catch{status.textContent='Quartz API unavailable. Start the server first.';}});

/* Three-dot menu and private-search page controls */
const moreButton=document.querySelector('#more-menu-button');
const moreMenu=document.querySelector('#more-menu');
const privateToggle=document.querySelector('#private-search-toggle');
const clearMenu=document.querySelector('#clear-search-menu');
const aboutMenu=document.querySelector('#about-menu-link');
let privateSearch=false;
if(moreButton&&moreMenu){
  const closeMenu=()=>{moreMenu.hidden=true;moreButton.setAttribute('aria-expanded','false');};
  moreButton.addEventListener('click',()=>{moreMenu.hidden=!moreMenu.hidden;moreButton.setAttribute('aria-expanded',String(!moreMenu.hidden));});
  document.addEventListener('click',e=>{if(!e.target.closest('.more-menu-wrap'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  privateToggle?.addEventListener('click',()=>{
    privateSearch=!privateSearch;
    privateToggle.setAttribute('aria-checked',String(privateSearch));
    const note=document.querySelector('#private-mode-note');
    if(note)note.hidden=!privateSearch;
    if(privateSearch){input.value='';results.replaceChildren();status.textContent='Private search is on. This page does not save query history.';}
    else{status.textContent='Private search is off.';}
    closeMenu();
  });
  clearMenu?.addEventListener('click',()=>{
    input.value='';results.replaceChildren();status.textContent='Search cleared.';
    const clear=document.querySelector('#clear-query');if(clear)clear.hidden=true;
    closeMenu();input.focus();
  });
  aboutMenu?.addEventListener('click',closeMenu);
}
