from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

PANEL_HTML = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Painel SaaS</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh}
.logo{font-size:1.4rem;font-weight:700}.logo span{color:#6366f1}
#loginScreen{display:flex;align-items:center;justify-content:center;min-height:100vh}
.loginCard{background:#1a1d2e;border:1px solid #2d3148;border-radius:16px;padding:40px 36px;width:100%;max-width:400px}
.loginCard .logo{text-align:center;margin-bottom:32px;font-size:1.6rem}
.loginCard p{text-align:center;color:#94a3b8;margin-bottom:28px;font-size:.9rem}
label{display:block;font-size:.82rem;color:#94a3b8;margin-bottom:6px}
input{width:100%;background:#0f1117;border:1px solid #2d3148;border-radius:8px;padding:10px 14px;color:#e2e8f0;font-size:.95rem;outline:none}
input:focus{border-color:#6366f1}
.formGroup{margin-bottom:18px}
.btnPrimary{width:100%;padding:12px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:8px}
.btnPrimary:hover{background:#4f46e5}
.btnPrimary:disabled{background:#3d3f6e;cursor:not-allowed}
.errMsg{background:#2d1b1b;color:#f87171;border:1px solid #7f1d1d;border-radius:8px;padding:10px 14px;font-size:.87rem;margin-top:14px;display:none}
#dashboard{display:none}
header{background:#1a1d2e;border-bottom:1px solid #2d3148;padding:16px 32px;display:flex;align-items:center;justify-content:space-between}
header .subtitle{color:#94a3b8;font-size:.83rem;margin-top:2px}
.btnLogout{background:transparent;border:1px solid #2d3148;color:#94a3b8;padding:8px 16px;border-radius:8px;cursor:pointer}
main{padding:32px;max-width:1200px;margin:0 auto}
.statsBar{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
.statCard{background:#1a1d2e;border:1px solid #2d3148;border-radius:12px;padding:20px 24px}
.statCard .lbl{font-size:.8rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.val{font-size:2rem;font-weight:700}
.val.green{color:#34d399}.val.red{color:#f87171}.val.blue{color:#818cf8}
.secTitle{font-size:1.05rem;font-weight:600;margin-bottom:16px}
.tenantGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.tenantCard{background:#1a1d2e;border:1px solid #2d3148;border-radius:14px;padding:24px;position:relative;overflow:hidden}
.tenantCard::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.tenantCard.active::before{background:linear-gradient(90deg,#34d399,#059669)}
.tenantCard.blocked::before{background:linear-gradient(90deg,#f87171,#dc2626)}
.tHeader{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.tName{font-size:1.05rem;font-weight:600}
.tSlug{font-size:.78rem;color:#64748b;margin-top:2px}
.badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:.75rem;font-weight:600}
.badge.active{background:#064e3b;color:#34d399}
.badge.blocked{background:#450a0a;color:#f87171}
.tMeta{font-size:.8rem;color:#64748b;margin-bottom:16px}
.tMeta span{color:#94a3b8}
.mods{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.mod{background:#1e2235;border:1px solid #2d3148;border-radius:6px;padding:3px 10px;font-size:.73rem;color:#94a3b8}
.mod.on{background:#1e1b4b;border-color:#4338ca;color:#a5b4fc}
.btnBlock{width:100%;padding:10px;border-radius:8px;border:none;font-size:.88rem;font-weight:600;cursor:pointer}
.btnBlock.block{background:#7f1d1d;color:#fca5a5}
.btnBlock.block:hover{background:#991b1b}
.btnBlock.unblock{background:#064e3b;color:#6ee7b7}
.btnBlock.unblock:hover{background:#065f46}
.btnBlock:disabled{opacity:.5;cursor:not-allowed}
.spin{display:flex;align-items:center;justify-content:center;padding:60px;color:#64748b}
.spin::after{content:'';width:32px;height:32px;border:3px solid #2d3148;border-top-color:#6366f1;border-radius:50%;animation:sp .8s linear infinite;margin-left:12px}
@keyframes sp{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:24px;right:24px;background:#1a1d2e;border:1px solid #2d3148;border-radius:10px;padding:14px 20px;font-size:.88rem;transform:translateY(100px);opacity:0;transition:all .3s;z-index:999}
.toast.show{transform:translateY(0);opacity:1}
.toast.success{border-color:#059669;color:#34d399}
.toast.error{border-color:#dc2626;color:#f87171}@media(max-width:640px){header{padding:12px 16px}main{padding:16px}.statsBar{grid-template-columns:repeat(2,1fr);gap:10px}.tenantGrid{grid-template-columns:1fr}.loginCard{padding:28px 20px}.statCard{padding:14px 16px}.val{font-size:1.6rem}}@media(max-width:380px){.statsBar{grid-template-columns:1fr}.val{font-size:1.4rem}header .logo{font-size:1.1rem}}
</style>
</head>
<body>
<div id="loginScreen">
  <div class="loginCard">
    <div class="logo">fb<span>automacao</span></div>
    <p>Painel SaaS - Controle de Clientes</p>
    <div class="formGroup"><label>E-mail</label><input type="email" id="email" placeholder="admin@exemplo.com"/></div>
    <div class="formGroup"><label>Senha</label><input type="password" id="password" placeholder="senha"/></div>
    <button class="btnPrimary" id="btnLogin" onclick="doLogin()">Entrar</button>
    <div class="errMsg" id="errMsg"></div>
  </div>
</div>
<div id="dashboard">
  <header>
    <div><div class="logo">fb<span>automacao</span> - Super Admin</div><div class="subtitle" id="hSub"></div></div>
    <button class="btnLogout" onclick="doLogout()">Sair</button>
  </header>
  <main>
    <div class="statsBar">
      <div class="statCard"><div class="lbl">Total</div><div class="val blue" id="sTotal">-</div></div>
      <div class="statCard"><div class="lbl">Ativos</div><div class="val green" id="sActive">-</div></div>
      <div class="statCard"><div class="lbl">Bloqueados</div><div class="val red" id="sBlocked">-</div></div>
    </div>
    <div class="secTitle">Clientes</div>
    <div id="grid" class="tenantGrid"><div class="spin">Carregando</div></div>
  </main>
</div>
<div class="toast" id="toast"></div>
<script>
const BASE=window.location.origin.replace(/\\/$/,'');
let TOKEN=sessionStorage.getItem('sa_t')||'';
if(TOKEN){show();load();}
async function doLogin(){
  const btn=document.getElementById('btnLogin');
  const em=document.getElementById('email').value.trim();
  const pw=document.getElementById('password').value;
  document.getElementById('errMsg').style.display='none';
  if(!em||!pw){err('Preencha os campos.');return;}
  btn.disabled=true;btn.textContent='Entrando...';
  try{
    const r=await fetch(BASE+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,password:pw})});
    const d=await r.json();
    if(!r.ok){err(d.detail||'Erro.');return;}
    TOKEN=d.access_token;sessionStorage.setItem('sa_t',TOKEN);show();load();
  }catch(e){err('Erro de conexao.');}
  finally{btn.disabled=false;btn.textContent='Entrar';}
}
function err(m){const el=document.getElementById('errMsg');el.textContent=m;el.style.display='block';}
function show(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('dashboard').style.display='block';
  document.getElementById('hSub').textContent=window.location.hostname;
}
function doLogout(){
  sessionStorage.removeItem('sa_t');TOKEN='';
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('dashboard').style.display='none';
}
async function load(){
  const grid=document.getElementById('grid');
  grid.innerHTML='<div class="spin">Carregando</div>';
  try{
    const r=await fetch(BASE+'/admin/tenants',{headers:{'Authorization':'Bearer '+TOKEN}});
    if(r.status===401){doLogout();return;}
    const all=await r.json();
    const cl=all.filter(t=>t.id!==0&&t.slug!=='system'&&t.slug!=='__admin__');
    render(cl);
  }catch(e){grid.innerHTML='<p style="color:#f87171;padding:24px">Erro.</p>';}
}
function render(tenants){
  document.getElementById('sTotal').textContent=tenants.length;
  document.getElementById('sActive').textContent=tenants.filter(t=>t.active).length;
  document.getElementById('sBlocked').textContent=tenants.filter(t=>!t.active).length;
  if(!tenants.length){document.getElementById('grid').innerHTML='<p style="color:#64748b;padding:24px">Nenhum cliente.</p>';return;}
  document.getElementById('grid').innerHTML=tenants.map(t=>{
    const sc=t.active?'active':'blocked';
    const mods=t.modules||{};
    const mt=Object.keys(mods).map(k=>'<span class="mod '+(mods[k]?'on':'')+'">'+(k)+'</span>').join('');
    const dt=new Date(t.created_at).toLocaleDateString('pt-BR');
    return '<div class="tenantCard '+sc+'" id="c'+t.id+'"><div class="tHeader"><div><div class="tName">'+esc(t.name)+'</div><div class="tSlug">'+esc(t.slug)+'</div></div><span class="badge '+sc+'">'+(t.active?'Ativo':'Bloqueado')+'</span></div><div class="tMeta">Criado: <span>'+dt+'</span> | ID <span>#'+t.id+'</span></div>'+(mt?'<div class="mods">'+mt+'</div>':'')+'<button class="btnBlock '+(t.active?'block':'unblock')+'" id="b'+t.id+'" onclick="tog('+t.id+','+t.active+')">'+(t.active?'Bloquear':'Liberar')+'</button></div>';
  }).join('');
}
async function tog(id,active){
  const btn=document.getElementById('b'+id);
  btn.disabled=true;btn.textContent='...';
  try{
    const r=await fetch(BASE+'/admin/tenants/'+id,{method:'PATCH',headers:{'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'},body:JSON.stringify({active:!active})});
    if(!r.ok){toast('Erro.','error');btn.disabled=false;return;}
    const t=await r.json();
    const sc=t.active?'active':'blocked';
    const c=document.getElementById('c'+id);
    c.className='tenantCard '+sc;
    c.querySelector('.badge').className='badge '+sc;
    c.querySelector('.badge').textContent=t.active?'Ativo':'Bloqueado';
    btn.className='btnBlock '+(t.active?'block':'unblock');
    btn.textContent=t.active?'Bloquear':'Liberar';
    btn.onclick=()=>tog(id,t.active);btn.disabled=false;
    const cs=document.querySelectorAll('.tenantCard');let a=0,b=0;
    cs.forEach(x=>{x.classList.contains('active')?a++:b++;});
    document.getElementById('sActive').textContent=a;document.getElementById('sBlocked').textContent=b;
    toast(t.active?t.name+' liberado':t.name+' bloqueado',t.active?'success':'error');
  }catch(e){toast('Erro de rede.','error');btn.disabled=false;}
}
function toast(msg,type){
  const t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type+' show';
  setTimeout(()=>{t.className='toast';},3000);
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.getElementById('loginScreen').style.display!=='none')doLogin();});
</script>
</body>
</html>"""


@router.get("/painel", response_class=HTMLResponse, include_in_schema=False)
def admin_panel():
    return PANEL_HTML
