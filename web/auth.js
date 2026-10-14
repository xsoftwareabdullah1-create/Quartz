(() => {
 const cfg=window.QUARTZ_CONFIG||{},base=String(cfg.authBase||'').replace(/\/$/,'');
 const link=document.querySelector('#google-signin'),status=document.querySelector('#account-status'),out=document.querySelector('#google-signout');
 if(!link||!status||!out)return;
 if(!base){link.hidden=true;status.textContent='Sign-in is not configured yet.';return;}
 link.href=base+'/auth/google';
 async function load(){try{const r=await fetch(base+'/auth/me',{credentials:'include'});if(!r.ok)return;const d=await r.json();if(!d.authenticated||!d.user)return;status.textContent='Signed in as '+d.user.display_name+' · '+d.user.email;link.hidden=true;out.hidden=false;}catch{status.textContent='Quartz account service unavailable. Check configuration.';}}
 out.addEventListener('click',async()=>{out.disabled=true;try{const r=await fetch(base+'/auth/logout',{method:'POST',credentials:'include'});if(!r.ok)throw Error();status.textContent='Signed out. Sign in to access your Quartz account.';link.hidden=false;out.hidden=true;}catch{status.textContent='Could not sign out. Please retry.';}finally{out.disabled=false;}});
 const p=new URLSearchParams(location.search);if(p.get('quartz_signin')==='success'){p.delete('quartz_signin');history.replaceState({},'',location.pathname+(p.size?'?'+p.toString():'')+location.hash);}load();
})();
