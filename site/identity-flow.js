const ready=()=>window.ycResolveIdentity?.();
const gate=document.getElementById("identityActionGate");
const form=document.getElementById("identityActionForm");
const title=document.getElementById("identityActionTitle");
const info=document.getElementById("identityActionInfo");
const error=document.getElementById("identityActionError");
const pass=document.getElementById("identityPassword");
const pass2=document.getElementById("identityPasswordConfirm");
const submit=document.getElementById("identityActionSubmit");

function hasIdentityToken(){
  const h=location.hash||"";
  return /(?:^#|[&#])(invite_token|recovery_token)=/.test(h);
}
function show(mode){
  gate?.classList.remove("hidden");
  document.body.classList.add("identity-flow-active");
  if(mode==="invite"){
    title.textContent="Crear contraseña";
    info.textContent="Activa tu acceso a Yellow Control creando una contraseña.";
    submit.textContent="Crear contraseña y entrar";
  }else{
    title.textContent="Cambiar contraseña";
    info.textContent="Escribe una nueva contraseña para tu acceso a Yellow Control.";
    submit.textContent="Guardar contraseña y entrar";
  }
  setTimeout(()=>pass?.focus(),50);
}
function fail(message){
  error.textContent=message||"No se ha podido completar el acceso.";
  if(submit)submit.disabled=false;
}
function finish(){
  gate?.classList.add("hidden");
  document.body.classList.remove("identity-flow-active");
  history.replaceState(null,"",location.pathname+location.search+"#dashboard");
  ready();
}

(async()=>{
  if(!hasIdentityToken()){ready();return}
  try{
    const identity=await import("https://esm.sh/@netlify/identity@2.0.0?bundle");
    const result=await identity.handleAuthCallback();
    if(!result){fail("El enlace de acceso no es válido o ha caducado.");return}
    const mode=result.type;
    if(mode!=="invite"&&mode!=="recovery"){
      finish();
      return;
    }
    show(mode);
    form.onsubmit=async(e)=>{
      e.preventDefault();
      error.textContent="";
      if(pass.value.length<8){fail("La contraseña debe tener al menos 8 caracteres.");return}
      if(pass.value!==pass2.value){fail("Las contraseñas no coinciden.");return}
      submit.disabled=true;
      try{
        if(mode==="invite"){
          if(!result.token)throw new Error("Falta el token de invitación.");
          await identity.acceptInvite(result.token,pass.value);
        }else{
          await identity.hydrateSession();
          await identity.updateUser({password:pass.value});
        }
        finish();
      }catch(err){
        fail(err?.message||"No se ha podido guardar la contraseña.");
      }
    };
  }catch(err){
    show("recovery");
    fail(err?.message||"No se ha podido procesar el enlace de Identity.");
  }
})();