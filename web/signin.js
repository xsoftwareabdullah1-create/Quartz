(() => {
  const cfg=window.QUARTZ_CONFIG||{};
  const base=String(cfg.authBase||'').replace(/\/$/,'');
  const status=document.querySelector('#signin-status');
  const google=document.querySelector('#google-button');
  const emailForm=document.querySelector('#email-form');
  const verifyForm=document.querySelector('#verify-form');
  const email=document.querySelector('#email-address');
  const code=document.querySelector('#email-code');
  const send=document.querySelector('#send-code');
  const verify=document.querySelector('#verify-code');
  const change=document.querySelector('#change-email');
  const message=document.querySelector('#message');
  let emailLocked=false;
  const say=(value,error=false)=>{message.textContent=value;message.dataset.error=error?'true':'false';};
  if(!base){status.textContent='Sign-in service is not configured.';emailForm.hidden=true;return;}
  google.href=base+'/auth/google';
  async function init(){
    try{
      const healthResponse=await fetch(base+'/health');
      if(!healthResponse.ok)throw new Error('Sign-in service is temporarily unavailable.');
      const health=await healthResponse.json();
      status.textContent='Choose how you want to sign in.';
      google.hidden=health.googleSignInConfigured!==true;
      if(health.emailSignInConfigured!==true){send.disabled=true;send.textContent='Email sign-in unavailable';say('Email delivery is not configured yet.');}
      const me=await fetch(base+'/auth/me',{credentials:'include'});
      if(me.ok){const data=await me.json();if(data.authenticated&&data.user){status.textContent='Already signed in as '+(data.user.display_name||data.user.email)+'.';say('Taking you back to Quartz…');location.replace('./');}}
    }catch(e){status.textContent='Could not connect to the sign-in service.';say(e.message||'Please try again in a moment.',true);}
  }
  emailForm.addEventListener('submit',async event=>{
    event.preventDefault();const address=email.value.trim();if(!address)return;
    send.disabled=true;say('Sending a secure sign-in code…');
    try{
      const response=await fetch(base+'/auth/email/request',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:address})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Could not send the code.');
      emailLocked=true;email.readOnly=true;verifyForm.hidden=false;send.textContent='Code sent';code.focus();say(data.message||'Check your inbox for the sign-in code.');
    }catch(e){say(e.message||'Email sign-in failed. Please retry.',true);}
    finally{send.disabled=false;}
  });
  verifyForm.addEventListener('submit',async event=>{
    event.preventDefault();verify.disabled=true;say('Verifying your code…');
    try{
      const response=await fetch(base+'/auth/email/verify',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.value.trim(),code:code.value.trim()})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'The code could not be verified.');
      say('Signed in successfully. Opening Quartz…');location.replace('./?quartz_signin=success');
    }catch(e){say(e.message||'Verification failed. Request a new code and try again.',true);}
    finally{verify.disabled=false;}
  });
  change.addEventListener('click',()=>{emailLocked=false;email.readOnly=false;code.value='';verifyForm.hidden=true;send.disabled=false;send.textContent='Continue with email';say('Enter the email address you want to use.');email.focus();});
  init();
})();