const U='https://pgtrdfukjkigvmsrcxlr.supabase.co',FICHAJE_MODE=new URLSearchParams(location.search).get('fichaje')==='1',K='sb_publishable_6QyaKxKyJxHkNtVwEmGkww_KjnkUd3l',L=U+'/functions/v1/spanish-auditoria-login-public';
// Recovery uses the existing 256-bit server-side session mechanism; the URL fragment never reaches HTTP logs.
// iOS Home Screen apps inherit cookies from Safari at installation.
const AUDIT_COOKIE='__Host-spanish_audit',AUDIT_GRACE_COOKIE='__Host-spanish_audit_grace',AUDIT_GRACE_MS=600000;
const TOKEN_OK=/^[A-Za-z0-9_-]{43}$/;
function getAuditCookie(){
 if(FICHAJE_MODE)return '';
 const item=document.cookie.split('; ').find(x=>x.startsWith(AUDIT_COOKIE+'='));
 if(!item)return '';
 let value='';
 try{value=decodeURIComponent(item.slice(AUDIT_COOKIE.length+1))}catch(e){return ''}
 return TOKEN_OK.test(value)?value:''
}
function setAuditCookie(value){
 if(!FICHAJE_MODE&&TOKEN_OK.test(value))document.cookie=AUDIT_COOKIE+'='+encodeURIComponent(value)+'; Path=/; Max-Age=600; Secure; SameSite=Strict'
}
function clearAuditCookie(){if(!FICHAJE_MODE)document.cookie=AUDIT_COOKIE+'=; Path=/; Max-Age=0; Secure; SameSite=Strict'}
// The public employee link uses the Railway HTML host so the browser renders the
// kiosk instead of showing source code (the direct Edge GET is served as text/plain).
const PERSONAL_FICHAJE_ID=FICHAJE_MODE?(new URLSearchParams(location.search).get('empleado')||''):'';
const PERSONAL_FICHAJE_VALID=!PERSONAL_FICHAJE_ID||/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(PERSONAL_FICHAJE_ID);
if(!FICHAJE_MODE&&new URLSearchParams(location.hash.slice(1)).has('spanish_recovery')){
 // Enlaces de recuperación anteriores no permiten omitir el PIN.
 history.replaceState(null,'',location.pathname+location.search);
}
function storedAuditToken(){try{return sessionStorage.getItem('audit_access')||''}catch{return ''}}
function storeAuditToken(t){try{sessionStorage.setItem('audit_access',t)}catch(_e){}}
function forgetAuditToken(){
 try{sessionStorage.removeItem('audit_access');sessionStorage.removeItem('audit_access_until')}catch(_e){}
 if(!FICHAJE_MODE)document.cookie=AUDIT_GRACE_COOKIE+'=; Path=/; Max-Age=0; Secure; SameSite=Strict';
}
function auditGraceExpiry(){
 let local=0;
 try{local=Number(sessionStorage.getItem('audit_access_until'))||0}catch(_e){}
 const item=document.cookie.split('; ').find(x=>x.startsWith(AUDIT_GRACE_COOKIE+'='));
 const saved=item?Number(item.slice(AUDIT_GRACE_COOKIE.length+1))||0:0;
 const expires=Math.max(local,saved),now=Date.now();
 return expires>now&&expires<=now+AUDIT_GRACE_MS+2000?expires:0
}
function grantAuditGrace(){
 if(FICHAJE_MODE||!TOKEN_OK.test(tok))return;
 const expires=Date.now()+AUDIT_GRACE_MS;
 storeAuditToken(tok);
 try{sessionStorage.setItem('audit_access_until',String(expires))}catch(_e){}
 setAuditCookie(tok);
 document.cookie=AUDIT_GRACE_COOKIE+'='+expires+'; Path=/; Max-Age=600; Secure; SameSite=Strict';
}
let tok='',sb,cls=[],hist=[],sups=[],mov=[],supplierAllocations=[],supplierInvoiceCredits=[],bills=[],bclients=[],emps=[],adv=[],ded=[],pay=[],advAccounts=[],schedules=[],timeEntries=[],weeklyPayrolls=[],vacations=[],vacBalances=[],employeeAccess=[],timeDebts=[],attendanceOverrides=[],pendingParsedClose=null,pendingSourceFile=null,assistantProposal={},assistantFiles=[],billPhotoFile=null,billOcrText='',supAliases=[],billPreferredSupplier='',spanishImports=[],qrStream=null,qrScanTimer=null,qrScanBusy=false,pendingFiscalQr=null,qrEvidenceFile=null;
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0)),fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es-AR'):'',pct=n=>n==null?'—':Number(n).toLocaleString('es-AR',{maximumFractionDigits:2})+'%';
function client(){sb=supabase.createClient(U,K,{global:{headers:tok?{'X-Audit-Session':tok}:{}}})}client();
function enhanceNumericInputs(root=document){
 const digitIds=new Set(['pin','epin','mbCuit','cc','mbDoc','ieDoc','mn','brDoc','pref']);
 const decimalIds=new Set(['mtotal','minvoice','qtotal','qinvoice','ma','mbAmount','ieAmount','pamount','pgross','prate','spr','ser','bt','bp','bet','bep','cpct','eh','er','ech','ecr','moHours','aa','di']);
 const voucherIds=new Set(['mbDoc','ieDoc','mn','brDoc']);
 (root||document).querySelectorAll?.('input').forEach(el=>{
  let id=el.id||'',type=(el.getAttribute('type')||'text').toLowerCase();
  if(type==='number'||decimalIds.has(id))el.setAttribute('inputmode','decimal');
  else if(digitIds.has(id)||/pin$/i.test(id)){
   el.setAttribute('inputmode','numeric');
   el.setAttribute('pattern','[0-9]*');
  }
  if(voucherIds.has(id)&&!el.dataset.numericVoucher){
   el.dataset.numericVoucher='1';
   el.setAttribute('inputmode','numeric');
   // The hyphen is part of the fiscal voucher number: a digits-only HTML pattern
   // incorrectly rejects otherwise valid 0001-00014413 on iPhone.
   el.removeAttribute('pattern');
   el.setAttribute('maxlength','14');
   el.addEventListener('input',()=>{
    let raw=String(el.value||''),fiscal=raw.match(/^(\d{4,5})-(\d{0,8})$/);
    if(fiscal){el.value=fiscal[1]+'-'+fiscal[2];return}
    let digits=raw.replace(/\D/g,'').slice(0,12);
    el.value=digits.length>4?digits.slice(0,4)+'-'+digits.slice(4):digits
   })
  }
 })
}
function M(b){
 modal.innerHTML='<div class="modal" onclick="if(event.target===this)X()"><div class="sheet"><button class="x" onclick="X()">×</button>'+b+'</div></div>';
 enhanceNumericInputs(modal)
}
function X(){stopFiscalQrScanner();modal.innerHTML=''}
function A(s){alert(s)}
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}

function busyBtn(id,on,label='Guardando…'){
 let b=document.getElementById(id);
 if(!b)return;
 if(on){
  if(!b.dataset.old)b.dataset.old=b.textContent;
  b.disabled=true;b.textContent=label
 }else{
  b.disabled=false;b.textContent=b.dataset.old||b.textContent;delete b.dataset.old
 }
}
function duplicateMsg(e){
 return e&&(e.code==='23505'||/audit_supplier_invoice_unique_doc|duplicate key/i.test(e.message||''))
}
function requestDuplicate(e){
 return !!(e&&e.code==='23505'&&/request_key/i.test((e.message||'')+' '+(e.details||'')))
}
function requestKey(){return crypto.randomUUID()}
const GLOBAL_TAP_LOCK_MS=900;
document.addEventListener('click',e=>{
 let el=e.target?.closest?.('button,[role="button"],a,label.doc-btn');
 if(!el)return;
 let now=Date.now(),until=Number(el.dataset?.tapLockUntil||0);
 if(until>now){
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  return false
 }
 if(el.dataset)el.dataset.tapLockUntil=String(now+GLOBAL_TAP_LOCK_MS);
 setTimeout(()=>{if(el?.dataset)delete el.dataset.tapLockUntil},GLOBAL_TAP_LOCK_MS+50)
},true);
function localISODate(d=new Date()){
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
}

function moneyCents(v){
 if(v===null||v===undefined||v==='')return '—';
 return money(Number(v)/100)
}

let remitosControlRows=[],remitosControlOnlyPending=true;
const remitosCategoryOptions=[
 ['SIN_CLASIFICAR','Sin clasificar'],['PLATO_SPANISH','Plato Spanish'],
 ['MERCADERIA_EXTRA','Mercadería extra'],['SERVICIO_EXTRA','Servicio extra'],['OTRO','Otro']
];
function installRemitosControlEntry(){
 const sec=document.getElementById('p-caja');
 if(!sec||document.getElementById('spanishRemitosControlEntry'))return;
 const box=document.createElement('div');
 box.id='spanishRemitosControlEntry';
 box.className='card';
 box.innerHTML='<div class="row between"><div><b>Conciliación de Remitos Spanish</b><div class="small muted">Separar platos, mercadería extra y otros conceptos. No suma ventas ni stock.</div></div><button type="button" id="spanishRemitosControlOpen">Revisar ítems</button></div>';
 const title=sec.querySelector('.title');
 if(title)title.insertAdjacentElement('afterend',box);else sec.prepend(box);
 box.querySelector('button').addEventListener('click',spanishRemitosControlScreen);
}
async function spanishRemitosControlScreen(){
 M('<h3>Conciliación de Remitos Spanish</h3><p class="small muted">Los remitos pueden mezclar viandas, mercadería extra y servicios. Esta clasificación NO registra ventas nuevas ni modifica la caja o el inventario.</p><div id="spanishRemitosControlRoot"><div class="empty">Cargando datos…</div></div>');
 await spanishRemitosControlLoad();
}
async function spanishRemitosControlLoad(){
 const root=document.getElementById('spanishRemitosControlRoot');
 if(!root)return;
 try {
  const resp=await fetch(U+'/functions/v1/spanish-remitos-control',{
   method:'GET',headers:{'apikey':K,'x-audit-session':tok}
  });
  const data=await resp.json();
  if(!resp.ok||!data.ok)throw Error(data.error||'Error de conexión');
  remitosControlRows=data.items||[];
  spanishRemitosControlRender(data.synced_at);
 }catch(error){
  const node=document.getElementById('spanishRemitosControlRoot');
  if(node)node.innerHTML='<div class="bad">No se pudo consultar: '+esc(error.message||String(error))+'</div>';
 }
}
function spanishRemitosControlRender(syncedAt){
 const root=document.getElementById('spanishRemitosControlRoot');
 if(!root)return;
 const total=remitosControlRows.length, pendientes=remitosControlRows.filter(i=>i.category==='SIN_CLASIFICAR').length;
 const displayed=remitosControlRows.filter(i=>!remitosControlOnlyPending||i.category==='SIN_CLASIFICAR');
 const cards=displayed.map(i=>{
  const id=String(i.id);
  if(!/^\d{1,20}$/.test(id))return '';
  const options=remitosCategoryOptions.map(([value,label])=>
   '<option value="'+value+'"'+(i.category===value?' selected':'')+'>'+label+'</option>').join('');
  const status=i.status==='cancelled'?' · REMITO ANULADO':'';
  return '<div class="card" data-remitos-item="'+id+'">'+
   '<div class="row between"><div><b>Remito '+esc(i.remittance_number||'—')+'</b> · '+esc(i.company||'Cliente')+
   '<div class="small muted">'+esc(String(i.date||'').slice(0,10))+esc(status)+'</div></div>'+
   '<div class="small muted">'+esc(i.quantity)+' × '+money(i.unit_price)+'</div></div>'+
   '<div style="margin:8px 0"><b>'+esc(i.description)+'</b></div>'+
   '<label>Tipo de concepto</label><select data-remitos-category="'+id+'">'+options+'</select>'+
   '<label>Observaciones (opcional)</label><input maxlength="500" data-remitos-notes="'+id+'" placeholder="Aclaración" value="'+esc(i.notes||'')+'">'+
   '<div class="row between" style="margin-top:8px"><span class="small muted">No suma a ventas ni genera movimientos de stock.</span>'+
   '<button type="button" data-remitos-save="'+id+'">Guardar clasificación</button></div></div>';
 }).join('');
 root.innerHTML='<div class="card"><b>'+total+' artículos sincronizados · '+pendientes+' sin clasificar</b>'+
  '<div class="small muted">Última sincronización: '+esc(syncedAt?new Date(syncedAt).toLocaleString('es-AR'):'Pendiente')+
  '</div><label><input id="spanishRemitosOnlyPending" type="checkbox"'+(remitosControlOnlyPending?' checked':'')+'> Mostrar solo pendientes</label></div>'+
  (cards||'<div class="empty">No hay artículos para este filtro.</div>');
 const filter=document.getElementById('spanishRemitosOnlyPending');
 if(filter)filter.addEventListener('change',e=>{remitosControlOnlyPending=e.target.checked;spanishRemitosControlRender(syncedAt)});
 root.querySelectorAll('button[data-remitos-save]').forEach(button=>button.addEventListener('click',()=>spanishRemitosControlSave(button.dataset.remitosSave,button)));
}
async function spanishRemitosControlSave(id,button){
 const root=document.getElementById('spanishRemitosControlRoot');
 if(!root||!/^\d{1,20}$/.test(String(id)))return;
 const category=root.querySelector('select[data-remitos-category="'+id+'"]')?.value;
 const notes=root.querySelector('input[data-remitos-notes="'+id+'"]')?.value||'';
 if(!remitosCategoryOptions.some(x=>x[0]===category))return A('Seleccioná un tipo válido.');
 button.disabled=true;button.textContent='Guardando…';
 try {
  const resp=await fetch(U+'/functions/v1/spanish-remitos-control',{
   method:'POST',
   headers:{'content-type':'application/json','apikey':K,'x-audit-session':tok},
   body:JSON.stringify({item_id:id,category,notes,verified:category!=='SIN_CLASIFICAR'})
  });
  const data=await resp.json();
  if(!resp.ok||!data.ok)throw Error(data.error||'No se pudo guardar');
  await spanishRemitosControlLoad();
 }catch(error){A('No se pudo guardar: '+(error.message||String(error)))}
 finally{button.disabled=false;button.textContent='Guardar clasificación'}
}


function installWindowsManagerEntry(){
 const sec=document.getElementById('p-caja');
 if(!sec||document.getElementById('spanishWindowsManagerEntry'))return;
 const box=document.createElement('div');box.id='spanishWindowsManagerEntry';box.className='card';
 box.innerHTML='<div class="row between"><div><b>Estado de las PC de Spanish</b>'+
  '<div class="small muted">Sincronización, respaldos verificados y diagnóstico técnico.</div></div>'+
  '<button type="button" id="spanishWindowsManagerOpen">Ver estado</button></div>';
 const title=sec.querySelector('.title');
 if(title)title.insertAdjacentElement('afterend',box);else sec.prepend(box);
 box.querySelector('button').addEventListener('click',spanishWindowsManagerScreen);
}
async function spanishWindowsManagerScreen(){
 M('<h3>Estado de Sistema Spanish</h3>'+
 '<p class="small muted">Solo consulta: no reinicia caja ni cambia usuarios. La ausencia de contacto indica que falta instalar el agente local.</p>'+
 '<div id="spanishWindowsManagerList"><div class="empty">Consultando PC…</div></div>');
 await spanishWindowsManagerLoad()
}
async function spanishWindowsManagerLoad(){
 const holder=document.getElementById('spanishWindowsManagerList');if(!holder)return;
 try{
  const resp=await fetch(U+'/functions/v1/spanish-auditoria-pc-status',{
   headers:{'apikey':K,'x-audit-session':tok}
  });
  const data=await resp.json();
  if(!resp.ok||!data.ok)throw Error(data.error||'No se pudo obtener el estado');
  const list=Array.isArray(data.devices)?data.devices:[];
  if(!list.length){
   holder.innerHTML='<div class="empty">No hay ninguna PC conectada todavía. Falta la instalación inicial de SpanishManager en Windows.</div>';
   return
  }
  holder.innerHTML=list.map(d=>{
   const t=Date.parse(d.seen_at||''),recent=Number.isFinite(t)&&Date.now()-t<25*60*1000&&Date.now()>=t-3*60*1000;
   const ready=d.backup_verified===true;
   const stamp=Number.isFinite(t)?new Date(t).toLocaleString('es-AR'):'Sin dato';
   const backupDate=d.last_backup_at?new Date(d.last_backup_at).toLocaleString('es-AR'):'Sin respaldo';
   return '<div class="card"><div class="row between"><div><b>'+esc(d.display_name||d.device_id)+
    '</b><div class="small muted">Último contacto: '+esc(stamp)+'</div></div>'+
    '<span class="'+(recent?'ok':'bad')+'">'+(recent?'Conectada':'Sin contacto reciente')+'</span></div>'+
    '<div class="small muted">Bases SQLite detectadas: '+Number(d.sqlite_databases||0)+
    ' · Usuarios/configuración: '+(d.user_storage_detected?'Detectados':'Sin identificar')+
    ' · Exportaciones JSON: '+Number(d.json_exports_found||0)+'</div>'+
    '<div class="'+(ready?'ok':'bad')+'">Respaldo: '+(ready?'VERIFICADO':'NO VERIFICADO')+
    ' · '+esc(backupDate)+'</div>'+
    (d.last_error?'<div class="small bad">'+esc(d.last_error)+'</div>':'')+
    '<div class="small muted">Actualizaciones del programa: bloqueadas hasta validar la instalación real.</div></div>'
  }).join('')+'<button type="button" id="spanishWindowsRefresh">Actualizar estado</button>';
  const button=holder.querySelector('#spanishWindowsRefresh');
  if(button)button.addEventListener('click',spanishWindowsManagerLoad)
 }catch(e){
  holder.innerHTML='<div class="bad">Estado no disponible: '+esc(e.message||String(e))+'</div>'
 }
}

function installSpanishImportsEntry(){
 let sec=document.getElementById('p-caja');
 if(!sec||document.getElementById('spanishImportsEntry'))return;
 let box=document.createElement('div');
 box.id='spanishImportsEntry';
 box.className='card spanish-import-entry';
 box.innerHTML='<div class="row between"><div><b>Importaciones Sistema Spanish</b><div class="small muted">JSON estructurado del CIERRE FINAL · fuente automática principal</div></div><button onclick="spanishImportsScreen()">Abrir</button></div>';
 let title=sec.querySelector('.title');
 if(title)title.insertAdjacentElement('afterend',box);else sec.prepend(box)
}
function spanishImportStatus(x){
 let s=String(x.status||'RECEIVED');
 if(s==='IMPORTED'&&+x.duplicate_count>0)return 'IMPORTADO · DUPLICADO ×'+x.duplicate_count;
 return {'RECEIVED':'RECIBIDO','IMPORTED':'IMPORTADO','ERROR':'ERROR','REJECTED':'RECHAZADO'}[s]||s
}
function spanishImportStatusClass(x){
 let s=String(x.status||'');
 return s==='IMPORTED'?'ok':s==='ERROR'||s==='REJECTED'?'bad':'muted'
}
async function spanishImportsScreen(){
 M('<h3>Importaciones Sistema Spanish</h3>'+
 '<p class="small muted">La automatización usa exclusivamente el JSON estructurado. El TXT queda como resumen humano.</p>'+
 '<div class="spanish-import-upload"><label class="doc-btn">📎 Elegir JSON<input id="spanishJsonInput" type="file" accept=".json,application/json" hidden></label><div id="spanishImportProgress" class="small muted">Seleccioná el archivo <b>spanish_auditoria_..._final_....json</b></div></div>'+
 '<div id="spanishImportsList"><div class="empty">Cargando importaciones…</div></div>');
 let inp=document.getElementById('spanishJsonInput');
 inp.addEventListener('change',()=>importSpanishJsonFile(inp));
 await loadSpanishImports()
}
async function loadSpanishImports(){
 let r=await sb.from('audit_spanish_imports')
  .select('id,package_id,schema_name,schema_version,source_system,operational_day,jornada,final_close_source_id,final_close_sequence,money_unit,source_filename,received_at,imported_at,status,error_details,summary_total_sales_cents,summary_total_to_invoice_cents,summary_orders_total,orders_count,items_count,payments_count,tips_count,cash_vouchers_count,usd_cash_vouchers_count,post_close_adjustments_count,shifts_count,manual_vouchers_count,source_audit_events_count,inconsistency_count,duplicate_count,last_duplicate_at')
  .order('received_at',{ascending:false})
  .limit(100);
 if(r.error){
  let box=document.getElementById('spanishImportsList');
  if(box)box.innerHTML='<div class="bad">'+esc(r.error.message)+'</div>';
  return
 }
 const official=await sb.from('audit_daily_closes').select('operational_date,total_sales').order('operational_date',{ascending:false}).limit(250);
 if(official.error)return A('No se pudo verificar el cierre original: '+official.error.message);
 const officialAmounts=new Map((official.data||[]).map(v=>[v.operational_date,Number(v.total_sales||0)]));
 spanishImports=(r.data||[]).map(v=>({...v,official_total:officialAmounts.has(v.operational_day)?officialAmounts.get(v.operational_day):null}));
 renderSpanishImports()
}
function renderSpanishImports(){
 let box=document.getElementById('spanishImportsList');
 if(!box)return;
 if(!spanishImports.length){
  box.innerHTML='<div class="empty">Todavía no hay paquetes JSON importados.</div>';
  return
 }
 box.innerHTML='<div class="table spanish-import-table"><table><tr><th>Estado</th><th>Día</th><th>Cierre</th><th>Total general (cierre)</th><th>Órdenes</th><th>Incons.</th><th></th></tr>'+
 spanishImports.map(x=>{
  let close=(x.final_close_source_id||'—')+(x.final_close_sequence!=null?' · #'+x.final_close_sequence:'');
  return '<tr>'+
   '<td><span class="pill '+spanishImportStatusClass(x)+'">'+esc(spanishImportStatus(x))+'</span></td>'+
   '<td>'+fmt(x.operational_day)+'</td>'+
   '<td>'+esc(close)+'</td>'+
   '<td>'+(x.official_total!=null?money(x.official_total):'— pendiente de cierre')+'</td>'+
   '<td>'+Number(x.orders_count||0)+'</td>'+
   '<td class="'+(+x.inconsistency_count>0?'bad':'')+'">'+Number(x.inconsistency_count||0)+'</td>'+
   '<td><button onclick="spanishImportDetail(\''+x.id+'\')">Ver</button></td>'+
  '</tr>'
 }).join('')+'</table></div>'
}
async function importSpanishJsonFile(input){
 let f=input?.files?.[0];
 if(!f)return;
 let progress=document.getElementById('spanishImportProgress');
 if(!/\.json$/i.test(f.name||'')&&f.type!=='application/json'){
  input.value='';return A('Elegí un archivo JSON.')
 }
 input.disabled=true;
 if(progress)progress.innerHTML='Leyendo <b>'+esc(f.name)+'</b>…';
 try{
  let raw=await f.text();
  if(progress)progress.textContent='Validando e importando paquete completo…';
  let resp=await fetch(U+'/functions/v1/spanish-auditoria-json-import',{
   method:'POST',
   headers:{
    'content-type':'application/json',
    'apikey':K,
    'x-audit-session':tok
   },
   body:JSON.stringify({filename:f.name,raw})
  });
  let x={};try{x=await resp.json()}catch{}
  await loadSpanishImports();
  if(x.status==='IMPORTED'){
   if(progress)progress.innerHTML='<span class="ok">Importado correctamente.</span> '+esc(x.package_id||'');
   A('Paquete importado correctamente.'+(x.inconsistencies?'\nInconsistencias detectadas: '+x.inconsistencies:''))
  }else if(x.status==='DUPLICATE'){
   if(progress)progress.innerHTML='<span class="muted">Duplicado detectado. No se volvió a importar.</span>';
   A('Ese package_id ya había sido recibido. No se duplicó ningún dato.')
  }else{
   let msg=x.error||x.detail||'El paquete fue rechazado.';
   if(progress)progress.innerHTML='<span class="bad">'+esc(String(x.status||'ERROR'))+': '+esc(msg)+'</span>';
   A((x.status||'ERROR')+': '+msg)
  }
 }catch(e){
  if(progress)progress.innerHTML='<span class="bad">No se pudo importar: '+esc(e.message||String(e))+'</span>';
 }finally{
  input.disabled=false;input.value=''
 }
}
async function spanishImportDetail(id){
 let [a,b,c]=await Promise.all([
  sb.from('audit_spanish_imports')
   .select('id,package_id,schema_name,schema_version,source_system,operational_day,jornada,final_close_source_id,final_close_sequence,money_unit,summary,source_filename,storage_path,source_hash,received_via,received_at,imported_at,status,error_details,matched_close_id,summary_total_sales_cents,summary_total_to_invoice_cents,summary_orders_total,orders_count,items_count,payments_count,tips_count,cash_vouchers_count,usd_cash_vouchers_count,post_close_adjustments_count,shifts_count,manual_vouchers_count,source_audit_events_count,inconsistency_count,duplicate_count,last_duplicate_at')
   .eq('id',id).single(),
  sb.from('audit_spanish_import_inconsistencies')
   .select('*').eq('import_id',id).order('created_at',{ascending:true}),
  sb.from('audit_spanish_import_receipts')
   .select('received_at,status,source_filename,source_hash,received_via,details')
   .eq('import_id',id).order('received_at',{ascending:false}).limit(20)
 ]);
 if(a.error)return A(a.error.message);
 let x=a.data,inc=b.data||[],rec=c.data||[];
 let incHtml=inc.length
  ?'<div class="table"><table><tr><th>Severidad</th><th>Código</th><th>Detalle</th></tr>'+
    inc.map(v=>'<tr><td class="'+(v.severity==='ERROR'?'bad':v.severity==='WARNING'?'bad':'muted')+'">'+esc(v.severity)+'</td><td>'+esc(v.code)+'</td><td>'+esc(v.message)+'<div class="small muted">'+esc(v.entity_type||'')+(v.source_id?' · '+esc(v.source_id):'')+'</div></td></tr>').join('')+
    '</table></div>'
  :'<div class="empty">Sin inconsistencias detectadas.</div>';
 let recHtml=rec.length
  ?'<div class="table"><table><tr><th>Recepción</th><th>Estado</th><th>Vía</th></tr>'+
    rec.map(v=>'<tr><td>'+new Date(v.received_at).toLocaleString('es-AR')+'</td><td>'+esc(v.status)+'</td><td>'+esc(v.received_via||'')+'</td></tr>').join('')+
    '</table></div>'
  :'';
 const close=await sb.from('audit_daily_closes').select('total_sales,total_to_invoice').eq('operational_date',x.operational_day).maybeSingle();
 if(close.error)return A('No se pudo verificar el cierre contable: '+close.error.message);
 let sourceTotal=close.data?money(close.data.total_sales):'— pendiente de cierre';
 let invoiceTotal=close.data?money(close.data.total_to_invoice):'— pendiente de cierre';
 M('<div class="row between"><h3>Importación Sistema Spanish</h3><button onclick="spanishImportsScreen()">← Volver</button></div>'+
 '<div class="calc"><b>'+esc(spanishImportStatus(x))+'</b><div class="small muted">'+esc(x.package_id||'Sin package_id')+'</div></div>'+
 '<div class="status-grid">'+
  '<div><span class="small muted">Día operativo</span><b>'+esc(x.operational_day||'—')+'</b></div>'+
  '<div><span class="small muted">Cierre origen</span><b>'+esc(x.final_close_source_id||'—')+(x.final_close_sequence!=null?' · #'+x.final_close_sequence:'')+'</b></div>'+
  '<div><span class="small muted">Total general (cierre)</span><b>'+sourceTotal+'</b></div>'+
  '<div><span class="small muted">A facturar (cierre)</span><b>'+invoiceTotal+'</b></div>'+
 '</div>'+
 '<div class="spanish-import-counts">'+
  '<span>Órdenes <b>'+x.orders_count+'</b></span><span>Ítems <b>'+x.items_count+'</b></span><span>Pagos <b>'+x.payments_count+'</b></span>'+
  '<span>Propinas <b>'+x.tips_count+'</b></span><span>Vales $ <b>'+x.cash_vouchers_count+'</b></span><span>Vales USD <b>'+x.usd_cash_vouchers_count+'</b></span>'+
  '<span>Ajustes <b>'+x.post_close_adjustments_count+'</b></span><span>Turnos <b>'+x.shifts_count+'</b></span><span>Vales manuales <b>'+x.manual_vouchers_count+'</b></span><span>Eventos <b>'+x.source_audit_events_count+'</b></span>'+
 '</div>'+
 (x.error_details?'<div class="calc bad"><b>Error</b><pre>'+esc(JSON.stringify(x.error_details,null,2))+'</pre></div>':'')+
 '<h4>Inconsistencias</h4>'+incHtml+
 '<h4>Recepciones del package_id</h4>'+recHtml+
 '<details style="margin-top:12px"><summary>Summary original</summary><pre class="json-pre">'+esc(JSON.stringify(x.summary||{},null,2))+'</pre></details>'+
 '<div class="row" style="margin-top:12px"><button onclick="spanishImportRaw(\''+id+'\')">Ver JSON recibido</button></div>'+
 '<div class="small muted" style="margin-top:10px">Evidencia original: '+(x.storage_path?'guardada en almacenamiento privado.':'sin archivo asociado')+'</div>')
}
async function spanishImportRaw(id){
 let r=await sb.from('audit_spanish_imports').select('package_id,source_payload').eq('id',id).single();
 if(r.error)return A(r.error.message);
 M('<div class="row between"><h3>JSON recibido</h3><button onclick="spanishImportDetail(\''+id+'\')">← Volver</button></div>'+
 '<div class="small muted">'+esc(r.data.package_id||'Sin package_id')+'</div>'+
 '<pre class="json-pre json-full">'+esc(JSON.stringify(r.data.source_payload||{},null,2))+'</pre>')
}


let auditLoginInProgress=false;
function adminPinValue(){
 return String(document.getElementById('adminSinglePin')?.value||'').normalize('NFKC').replace(/[^0-9]/g,'').slice(0,4);
}
function adminClearPin(){
 const pin=document.getElementById('adminSinglePin');if(pin)pin.value='';
 const stale=document.getElementById('pin');if(stale)stale.value='';
}

function adminLoginMessage(message,kind='error'){
 const el=document.getElementById('authmsg');
 if(!el)return;
 el.textContent=message||'';
 el.dataset.state=kind;
}
async function verifyAdminSession(candidate){
 if(!TOKEN_OK.test(candidate))return false;
 tok=candidate;client();
 try{
  // Una sesión vencida o una red lenta nunca debe dejar la pantalla en "Preparando acceso".
  const pending=sb.rpc('audit_renew_admin_session');
  const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('session_timeout')),8000));
  const r=await Promise.race([pending,timeout]);
  return !r.error&&!!r.data;
 }catch(_e){
  tok='';client();
  return false
 }
}
async function signin(){
 const value=adminPinValue();
 if(auditLoginInProgress)return;
 if(!/^\d{4}$/.test(value)){
  adminLoginMessage('Ingresá los cuatro números del PIN.');return;
 }
 auditLoginInProgress=true;
 const button=document.getElementById('adminLoginSubmit');
 if(button){button.disabled=true;button.textContent='Verificando acceso…'}
 adminLoginMessage('Comprobando PIN y sesión…','progress');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),16000);
 try{
  const response=await fetch(L,{
   method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({pin:value}),
   signal:controller.signal,
   cache:'no-store'
  });
  let result={};
  try{result=await response.json()}catch(_e){}
  if(!response.ok){
   adminLoginMessage(String(result.error||('No se pudo ingresar (HTTP '+response.status+').')));
   adminClearPin();
   return;
  }
  if(result.role!=='ADMIN'||!TOKEN_OK.test(String(result.token||''))){
   adminLoginMessage('El servidor no devolvió una sesión administrativa válida.');
   adminClearPin();
   return;
  }
  const valid=await verifyAdminSession(result.token);
  if(!valid){
   tok='';client();
   adminLoginMessage('PIN aceptado, pero no se pudo confirmar la sesión. Reintentá en unos segundos.');
   adminClearPin();
   return;
  }
  grantAuditGrace();
  adminClearPin();
  adminLoginMessage('');
  await show(true);
 }catch(err){
  adminClearPin();
  adminLoginMessage(err&&err.name==='AbortError'?
   'La conexión tardó demasiado. Verificá internet y volvé a intentar.':
   'No se pudo conectar. Comprobá internet y reintentá.');
 }finally{
  clearTimeout(timer);
  auditLoginInProgress=false;
  if(button){button.disabled=false;button.textContent='Ingresar a administración'}
 }
}
async function show(ok){
 const authEl=document.getElementById('auth'),appEl=document.getElementById('app'),navEl=document.getElementById('nav'),logoutEl=document.getElementById('logout');
 if(!authEl||!appEl||!navEl||!logoutEl)return;
 authEl.classList.toggle('hide',ok);appEl.classList.toggle('hide',!ok);navEl.classList.toggle('hide',!ok);logoutEl.classList.toggle('hide',!ok);
 if(ok){
  // La sesión ADMIN fue renovada y validada inmediatamente antes de invocar show(true).
  // No repetir el RPC: el doble acceso retrasa el primer render.
  // La navegación se puede utilizar sin esperar a nómina, IVA y proveedores.
  await loadAll();
  // Conservar acceso a conteo de artículos: insertar después de cargar el panel.
  itemTrackerInstall();
  // Inventario y pedidos no se instalan en el panel de cuenta corriente.
 }
}

async function lockAdmin(reason='Ingresá tu PIN para acceder.'){
 if(FICHAJE_MODE)return;
 const previous=sb,active=TOKEN_OK.test(tok);
 tok='';forgetAuditToken();clearAuditCookie();client();adminClearPin();
 if(active){
  stopFiscalQrScanner();
  const popup=document.getElementById('modal');if(popup)popup.innerHTML='';
 }
 await show(false);
 adminLoginMessage(reason,'progress');
 if(active&&previous)try{await previous.rpc('audit_revoke_admin_session')}catch(_e){}
}
const logoutEl=document.getElementById('logout');
if(logoutEl)logoutEl.onclick=()=>{lockAdmin('Sesión cerrada. Ingresá tu PIN para continuar.')};
function go(p,b){document.querySelectorAll('main > section').forEach(x=>x.classList.add('hide'));document.getElementById('p-'+p).classList.remove('hide');document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active')}
async function init(){
 if(FICHAJE_MODE)return;
 if(new URLSearchParams(location.hash.slice(1)).has('spanish_reset')){await lockAdmin();return}
 const expiry=auditGraceExpiry(),candidate=storedAuditToken()||getAuditCookie();
 if(expiry>Date.now()&&TOKEN_OK.test(candidate)&&await verifyAdminSession(candidate)){
  grantAuditGrace();adminLoginMessage('');await show(true);return
 }
 await lockAdmin('Ingresá tu PIN para abrir Spanish Auditoría.');
}
let adminBackgroundSince=0;
function auditGraceOnReturn(){
 if(FICHAJE_MODE||!TOKEN_OK.test(tok))return;
 if((adminBackgroundSince&&Date.now()-adminBackgroundSince>=AUDIT_GRACE_MS)||!auditGraceExpiry()){
  adminBackgroundSince=0;
  lockAdmin('Pasaron 10 minutos fuera de la aplicación. Ingresá tu PIN.');return;
 }
 adminBackgroundSince=0;
 grantAuditGrace();
}
if(!FICHAJE_MODE){
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
   if(TOKEN_OK.test(tok)){adminBackgroundSince=Date.now();grantAuditGrace()}
  }else if(adminBackgroundSince)auditGraceOnReturn();
 });
 window.addEventListener('pagehide',()=>{
  if(TOKEN_OK.test(tok)){adminBackgroundSince=Date.now();grantAuditGrace()}
 });
 window.addEventListener('pageshow',event=>{
  if(event.persisted&&adminBackgroundSince)auditGraceOnReturn()
 });
}


let opsMonitorTimer=null,opsMonitorBusy=false;

/* Centro de control de Spanish: lecturas de fuente oficial, sin asientos automáticos. */
let spanishIntegrityTimer=null,spanishIntegrityBusy=false;

function spanishIntegrityInstall(){
 if(FICHAJE_MODE)return;
 const home=document.getElementById('p-home');if(!home)return;
 let panel=document.getElementById('spanishIntegrity');
 if(!panel){
  panel=document.createElement('div');panel.id='spanishIntegrity';panel.className='card spanish-integrity';
  panel.innerHTML='<div class="spanish-integrity-header"><div><h3>Control de pendientes</h3><div class="small muted">Lecturas verificables · no modifica saldos ni stock</div></div><button type="button" id="spanishIntegrityRefresh">Actualizar</button></div>'+
  '<div id="spanishIntegrityBody" class="small muted">Consultando compras, inventario y cierres…</div>';
  const kpis=home.querySelector('#kpis');if(kpis)kpis.insertAdjacentElement('beforebegin',panel);else home.prepend(panel);
  panel.querySelector('#spanishIntegrityRefresh').addEventListener('click',spanishIntegrityRefresh);
  panel.addEventListener('click',async e=>{
   const el=e.target.closest('button[data-integrity]');if(!el)return;
   if(el.dataset.integrity==='compras')comprasOpen();
   if(el.dataset.integrity==='inventario'){await invOpen()}
   if(el.dataset.integrity==='boletas'){
    invTab='docs';
    const ok=await invOpen();
    if(ok){invTab='docs';invRender()}
   }
  })
 }
 if(!document.getElementById('spanishIntegrityCss')){
  const style=document.createElement('style');style.id='spanishIntegrityCss';
  style.textContent='.spanish-integrity{border-left:4px solid #cd8b27!important}.spanish-integrity-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.spanish-integrity h3{margin:0 0 4px;font-size:17px}.spanish-integrity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}.spanish-integrity-item{background:#f5f8fc;border:1px solid #d9e4f3;border-radius:11px;padding:11px}.spanish-integrity-item b{display:block;font-size:24px;line-height:1.2;margin:2px 0}.spanish-integrity-item span{font-size:12px;color:#51647f}.spanish-integrity-notice{font-size:12px;background:#fff9e8;color:#8f6018;border-radius:9px;padding:9px}.spanish-integrity-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.spanish-integrity-actions button{background:#eef4ff;color:#23569c;border:1px solid #c4d7f3}.spanish-integrity-time{font-size:11px;color:#6c7b92;margin-top:10px}@media(min-width:700px){.spanish-integrity-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}';
  document.head.appendChild(style)
 }
 spanishIntegrityRefresh();
 if(!spanishIntegrityTimer)spanishIntegrityTimer=setInterval(()=>{
  if(!document.hidden&&TOKEN_OK.test(tok)&&document.getElementById('spanishIntegrity'))spanishIntegrityRefresh()
 },15*60*1000)
}
async function spanishIntegrityRefresh(){
 const panel=document.getElementById('spanishIntegrity'),body=document.getElementById('spanishIntegrityBody');
 if(!panel||!body||spanishIntegrityBusy||!TOKEN_OK.test(tok))return;
 spanishIntegrityBusy=true;
 try{
  const d=await comprasApi('ops_digest'),i=d.invoices||{},st=d.inventory||{},o=d.orders||{},sync=d.sync||{};
  const noDetail=Number(i.no_item_detail||0),need=Number(i.needs_classification_or_items||0);
  const noCount=Number(st.without_initial_count||0),noPrice=Number(st.products_without_price||0);
  const lastJson=String(sync.last_json||''),lastClose=String(sync.last_close||'');
  const today=localISODate(),dayBefore=new Date(today+'T12:00:00');
  dayBefore.setDate(dayBefore.getDate()-1);
  const yesterday=dayBefore.toISOString().slice(0,10);
  const importWarning=!lastJson||lastJson<yesterday;
  panel.style.borderLeftColor=(importWarning||need||noCount)?'#c18520':'#168352';
  const item=(title,note,value)=>'<div class="spanish-integrity-item"><span>'+esc(title)+'</span><b>'+esc(String(value))+'</b><span>'+esc(note)+'</span></div>';
  body.innerHTML='<div class="spanish-integrity-grid">'+
   item('Facturas sin detalle','Revisar / clasificar',noDetail)+
   item('Sin conteo inicial','Insumos activos',noCount)+
   item('Sin precio','Productos de proveedores',noPrice)+
   item('Pedidos por recibir','Enviados',Number(o.awaiting_receipt||0))+'</div>'+
   '<div class="small">'+(importWarning?'<b class="bad">Atención · sincronización pendiente</b> · ':'')+
   'JSON '+esc(lastJson||'sin datos')+' · Cierre '+esc(lastClose||'sin datos')+'</div>'+
   (need?'<div class="spanish-integrity-notice">Hay '+need+' comprobantes pendientes de clasificar o completar. No se actualizaron automáticamente costos ni deudas.</div>':'')+
   '<div class="spanish-integrity-actions"><button type="button" data-integrity="boletas">Revisar boletas</button><button type="button" data-integrity="inventario">Conteos y stock</button><button type="button" data-integrity="compras">Pedidos y precios</button></div>'+
   '<div class="spanish-integrity-time">Última lectura '+esc(new Date().toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'}))+' · se actualiza cada 15 minutos mientras la app está abierta</div>'
 }catch(err){
  body.innerHTML='<div class="spanish-integrity-notice">No pude comprobar los indicadores: '+esc(String(err?.message||err))+'. No se modificó ningún dato.</div>'
 }finally{spanishIntegrityBusy=false}
}

function opsMonitorInstall(){
 const home=document.getElementById('p-home');if(!home||document.getElementById('spanishOpsMonitor'))return;
 const box=document.createElement('div');box.id='spanishOpsMonitor';box.className='card';box.style.cssText='margin:12px 0;border-left:4px solid #64748b;padding:14px';
 box.innerHTML='<details><summary style="cursor:pointer;font-weight:700">Herramientas técnicas de auditoría</summary><div id="opsHealth" style="margin-top:10px">Comprobando fuentes…</div><div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" id="opsRefresh">Actualizar</button><button id="opsJson">JSON</button><button id="opsPc">PC</button><button id="opsRemitos">Remitos</button></div></details>';
 const kpis=home.querySelector('#kpis');if(kpis)kpis.insertAdjacentElement('afterend',box);else home.prepend(box);
 box.querySelector('#opsRefresh').addEventListener('click',opsMonitorLoad);
 box.querySelector('#opsJson').addEventListener('click',spanishImportsScreen);
 box.querySelector('#opsPc').addEventListener('click',spanishWindowsManagerScreen);
 box.querySelector('#opsRemitos').addEventListener('click',spanishRemitosControlScreen);
 opsMonitorLoad();
 if(!opsMonitorTimer)opsMonitorTimer=setInterval(()=>{if(!document.hidden&&TOKEN_OK.test(tok))opsMonitorLoad()},180000);
}
async function opsMonitorLoad(){
 const h=document.getElementById('opsHealth');if(!h||opsMonitorBusy||!TOKEN_OK.test(tok))return;opsMonitorBusy=true;
 try{
  const [a,b,c]=await Promise.all([
   sb.from('audit_spanish_imports').select('operational_day,status,inconsistency_count').order('operational_day',{ascending:false}).limit(45),
   sb.from('audit_daily_closes').select('operational_date').order('operational_date',{ascending:false}).limit(45),
   fetch(U+'/functions/v1/spanish-auditoria-pc-status',{headers:{apikey:K,'x-audit-session':tok}})
  ]);
  if(a.error||b.error||!c.ok)throw Error(a.error?.message||b.error?.message||'PC no disponible');
  const pc=await c.json();if(!pc.ok)throw Error('Estado PC no disponible');
  const day=new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(Date.now()-21600000));
  const closes=new Set((b.data||[]).map(x=>x.operational_date));
  const unclosed=(a.data||[]).filter(x=>x.operational_day<day&&!closes.has(x.operational_day)).map(x=>x.operational_day);
  const errors=(a.data||[]).filter(x=>x.status==='REJECTED'||x.status==='ERROR'||Number(x.inconsistency_count)>0).map(x=>x.operational_day);
  const main=(pc.devices||[]).find(x=>x.pc_role==='PRINCIPAL');
  const minutes=main?.seen_at?Math.round((Date.now()-Date.parse(main.seen_at))/60000):null;
  const online=minutes!==null&&minutes>=0&&minutes<=30;
  const warning=!online||unclosed.length>0||errors.length>0;
  document.getElementById('spanishOpsMonitor').style.borderLeftColor=warning?'#b45309':'#16803d';
  h.innerHTML='<b style="color:'+(warning?'#9a3412':'#166534')+'">'+(warning?'REQUIERE REVISIÓN':'SIN INCIDENCIAS NUEVAS')+'</b>'+
  '<div class="small muted">Último JSON: '+esc(a.data?.[0]?.operational_day||'sin datos')+' · Último cierre: '+esc(b.data?.[0]?.operational_date||'sin datos')+'</div>'+
  '<div class="small">PC principal: '+esc(online?'reporta hace '+minutes+' min':minutes===null?'sin reporte':'último reporte hace '+minutes+' min')+'</div>'+
  (unclosed.length?'<div class="small" style="color:#9a3412">Días con JSON sin cierre: <b>'+esc(unclosed.join(', '))+'</b></div>':'')+
  (errors.length?'<div class="small" style="color:#9a3412">Importaciones con errores: '+esc(errors.join(', '))+'</div>':'')+
  '<div class="small muted">Actualizado '+esc(new Date().toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'}))+' · no se generan cierres ficticios.</div>';
 }catch(e){h.innerHTML='<span class="bad">No pude verificar la sincronización: '+esc(e.message||String(e))+'</span>'}
 finally{opsMonitorBusy=false}
}
async function loadAll(){
 // Pintar la interfaz primero; cargas pesadas diferidas y aisladas.
 shiftAuditInstall();
 controlEnsure();spanishSimpleHome();controlAutomaticRefresh();
 const core=Promise.allSettled([loadCloses(),loadSuppliers()]);
 core.then(()=>{
  if(!TOKEN_OK.test(tok))return;
  dashboard();
  // IVA e histórico no bloquean la navegación. Nómina se carga luego para reducir
  // consultas simultáneas y no ejecutar el refresco de sueldos al abrir Inicio.
  Promise.allSettled([loadHist(),loadBilling()]).then(()=>{
   if(!TOKEN_OK.test(tok))return;
   dashboard();
   loadPeople().catch(e=>console.warn('Personal no disponible',e))
  })
 });
 miDiaLoad().catch(e=>console.warn('Mi día no disponible',e));
 controlLoad().catch(e=>console.warn('Control no disponible',e))
}

let shiftAuditRows=[];
function shiftMoney(cents){return money((Number(cents)||0)/100)}
function shiftStatusLabel(s){return ({
 'PENDIENTE_COMPROBACION':'PENDIENTE',
 'CONCILIADO':'CONCILIADO',
 'ERROR_LOCALIZADO':'ERROR LOCALIZADO',
 'DIFERENCIA_SIN_EXPLICACION':'DIFERENCIA SIN EXPLICACIÓN'
})[String(s||'')]||String(s||'PENDIENTE')}
function shiftStatusClass(s){s=String(s||'');return s==='CONCILIADO'?'ok':s==='ERROR_LOCALIZADO'||s==='DIFERENCIA_SIN_EXPLICACION'?'bad':'muted'}
function shiftAuditInstall(){
 const sec=document.getElementById('p-caja');
 if(!sec||document.getElementById('shiftAuditEntry'))return;
 const box=document.createElement('div');box.id='shiftAuditEntry';box.className='card';
 box.innerHTML='<div class="row between"><div><b>Auditor de cierres por turno</b><div class="small muted">Declarado por Caja vs comprobado por Auditor · efectivo y medios por separado.</div></div><button type="button" id="shiftAuditOpen">Abrir</button></div>';
 const title=sec.querySelector('.title');if(title)title.insertAdjacentElement('afterend',box);else sec.prepend(box);
 box.querySelector('#shiftAuditOpen').addEventListener('click',shiftAuditScreen)
}
async function shiftAuditScreen(){
 M('<h3>Auditor de cierres por turno</h3><p class="small muted">Cada fila proviene automáticamente del mismo cierre que genera el correo. El auditor carga la comprobación real; el dato original nunca se reemplaza.</p><div id="shiftAuditList"><div class="empty">Cargando cierres…</div></div>');
 await shiftAuditLoad()
}
async function shiftAuditLoad(){
 const r=await sb.from('audit_shift_closes').select('*,audit_shift_reconciliation(*)').order('received_at',{ascending:false}).limit(120);
 const box=document.getElementById('shiftAuditList');if(!box)return;
 if(r.error){box.innerHTML='<div class="bad">'+esc(r.error.message)+'</div>';return}
 shiftAuditRows=r.data||[];
 if(!shiftAuditRows.length){box.innerHTML='<div class="empty">Todavía no llegaron cierres por turno desde Sistema Spanish.</div>';return}
 const recs=shiftAuditRows.flatMap(x=>x.audit_shift_reconciliation||[]);
 const pending=recs.filter(x=>x.status==='PENDIENTE_COMPROBACION').length;
 const errors=recs.filter(x=>x.status==='ERROR_LOCALIZADO'||x.status==='DIFERENCIA_SIN_EXPLICACION').length;
 const ok=recs.filter(x=>x.status==='CONCILIADO').length;
 const summary='<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 14px">'+
  '<div class="card"><div class="small muted">Conciliados</div><b style="font-size:22px">'+ok+'</b></div>'+
  '<div class="card"><div class="small muted">Pendientes</div><b style="font-size:22px">'+pending+'</b></div>'+
  '<div class="card"><div class="small muted">Con diferencia</div><b style="font-size:22px">'+errors+'</b></div></div>';
 const rows=shiftAuditRows.map(x=>{
   const rs=x.audit_shift_reconciliation||[];
   const bad=rs.filter(r=>r.status==='ERROR_LOCALIZADO'||r.status==='DIFERENCIA_SIN_EXPLICACION').length;
   const pen=rs.filter(r=>r.status==='PENDIENTE_COMPROBACION').length;
   const state=bad?'REVISAR':pen?'PENDIENTE':'CONCILIADO';
   const cls=bad?'bad':pen?'muted':'ok';
   return '<tr><td>'+fmt(x.operational_day)+'</td><td>#'+Number(x.seq||1)+' · '+esc(String(x.kind||''))+'</td><td>'+esc(x.closed_by_name||'—')+'</td>'+
    '<td>'+shiftMoney(x.expected_cash_cents)+'</td><td>'+shiftMoney(x.cashier_counted_cents)+'</td>'+
    '<td><span class="'+cls+'">'+state+'</span></td><td><button onclick="shiftReconcile(\''+x.id+'\')">Auditar</button></td></tr>'
 }).join('');
 box.innerHTML=summary+'<div class="table"><table><tr><th>Fecha</th><th>Turno</th><th>Cajero</th><th>Efectivo teórico</th><th>Contado cajero</th><th>Estado</th><th></th></tr>'+rows+'</table></div>'
}
function shiftReconcile(id){
 const x=shiftAuditRows.find(v=>v.id===id);if(!x)return A('No encontré el cierre.');
 const rs=[...(x.audit_shift_reconciliation||[])].sort((a,b)=>String(a.method).localeCompare(String(b.method)));
 const expected=Number(x.expected_cash_cents||0), counted=Number(x.cashier_counted_cents||0);
 const formula='<div class="calc"><b>Efectivo del turno</b>'+
  '<div class="small" style="margin-top:6px">Salón efectivo '+shiftMoney(x.cash_sales_salon_cents)+' + PedidosYa efectivo '+shiftMoney(x.pya_cash_cents)+' − Vales '+shiftMoney(x.cash_vouchers_cents)+' = <b>'+shiftMoney(expected)+'</b></div>'+
  '<div class="small">Cajero declaró físicamente <b>'+shiftMoney(counted)+'</b> · diferencia del cierre <b>'+shiftMoney(counted-expected)+'</b></div></div>';
 const table=rs.map((r,i)=>{
   const verified=r.verified_cents==null?'':(Number(r.verified_cents)/100).toFixed(2).replace('.',',');
   const diff=r.difference_cents==null?'—':shiftMoney(r.difference_cents);
   const opts=['PENDIENTE_COMPROBACION','CONCILIADO','ERROR_LOCALIZADO','DIFERENCIA_SIN_EXPLICACION'].map(s=>'<option value="'+s+'" '+(s===r.status?'selected':'')+'>'+shiftStatusLabel(s)+'</option>').join('');
   const label=r.method==='EFECTIVO'?'Efectivo contado por cajero':String(r.method||'').replaceAll('_',' ');
   return '<tr><td><b>'+esc(label)+'</b></td><td>'+shiftMoney(r.declared_cents)+'</td>'+
    '<td><input id="sv'+i+'" data-rec="'+r.id+'" type="text" inputmode="decimal" value="'+esc(verified)+'" placeholder="Comprobado"></td>'+
    '<td id="sd'+i+'">'+diff+'</td><td><select id="ss'+i+'">'+opts+'</select></td></tr>'+
    '<tr><td colspan="5"><input id="se'+i+'" type="text" value="'+esc(r.explanation||'')+'" placeholder="Explicación / operación que origina la diferencia"></td></tr>'
 }).join('');
 M('<h3>Auditar '+fmt(x.operational_day)+' · turno #'+Number(x.seq||1)+'</h3>'+formula+
 '<p class="small muted" style="margin-top:10px">“Declarado” es lo registrado por Caja. En efectivo es el conteo físico informado por el cajero; el teórico queda arriba para explicar la diferencia. “Comprobado” es el dato real obtenido por el auditor.</p>'+
 '<div class="table"><table><tr><th>Medio</th><th>Declarado</th><th>Comprobado auditor</th><th>Diferencia</th><th>Estado</th></tr>'+table+'</table></div>'+
 '<label>Nota general / evidencia</label><textarea id="shiftEvidence" placeholder="Ej. Resumen Posnet, página PedidosYa, conteo físico, operación localizada…"></textarea>'+
 '<button id="shiftRecSave" class="primary" style="width:100%;margin-top:12px" onclick="shiftReconcileSave(\''+id+'\')">Guardar auditoría</button>');
 rs.forEach((r,i)=>{
   const inp=document.getElementById('sv'+i),sel=document.getElementById('ss'+i);
   if(inp)inp.addEventListener('input',()=>{
     if(inp.value.trim()===''){document.getElementById('sd'+i).textContent='—';sel.value='PENDIENTE_COMPROBACION';return}
     const v=parseAmount(inp.value),d=Math.round(v*100)-Number(r.declared_cents||0);
     document.getElementById('sd'+i).textContent=shiftMoney(d);
     if(Math.abs(d)<=1)sel.value='CONCILIADO';else if(sel.value==='CONCILIADO'||sel.value==='PENDIENTE_COMPROBACION')sel.value='DIFERENCIA_SIN_EXPLICACION'
   })
 })
}
async function shiftReconcileSave(id){
 const x=shiftAuditRows.find(v=>v.id===id);if(!x)return;
 const rs=[...(x.audit_shift_reconciliation||[])].sort((a,b)=>String(a.method).localeCompare(String(b.method)));
 const note=document.getElementById('shiftEvidence')?.value||'';
 busyBtn('shiftRecSave',true,'Guardando…');
 try{
   for(let i=0;i<rs.length;i++){
     const inp=document.getElementById('sv'+i),sel=document.getElementById('ss'+i),expl=document.getElementById('se'+i);
     const blank=!inp||inp.value.trim()==='';
     const verified=blank?null:Math.round(parseAmount(inp.value)*100);
     const diff=verified==null?null:verified-Number(rs[i].declared_cents||0);
     let status=blank?'PENDIENTE_COMPROBACION':String(sel?.value||'PENDIENTE_COMPROBACION');
     if(verified!=null&&Math.abs(diff)<=1)status='CONCILIADO';
     if(verified!=null&&Math.abs(diff)>1&&status==='CONCILIADO')status='DIFERENCIA_SIN_EXPLICACION';
     const u=await sb.from('audit_shift_reconciliation').update({
       verified_cents:verified,difference_cents:diff,status,
       explanation:expl?.value||null,evidence_note:note||null,updated_at:new Date().toISOString()
     }).eq('id',rs[i].id);
     if(u.error)throw Error(u.error.message)
   }
   X();await shiftAuditScreen()
 }catch(e){A('No se pudo guardar la auditoría: '+(e.message||String(e)))}
 finally{busyBtn('shiftRecSave',false)}
}

let cierreImported=[];
async function loadCloses(){let q=sb.from('audit_daily_closes').select('*,audit_reconciliation_items(*)').order('operational_date',{ascending:false}).limit(250),j=sb.from('audit_spanish_imports').select('operational_day,jornada,summary,summary_total_sales_cents,summary_total_to_invoice_cents,status').eq('status','IMPORTED').eq('jornada','CIERRE_FINAL').order('operational_day',{ascending:false}).order('received_at',{ascending:false}).limit(250);if(from?.value){q=q.gte('operational_date',from.value);j=j.gte('operational_day',from.value)}if(to?.value){q=q.lte('operational_date',to.value);j=j.lte('operational_day',to.value)}const [r,ir]=await Promise.all([q,j]);if(r.error)return A(r.error.message);cls=r.data||[];if(!from?.value&&!to?.value&&cls.length){const m=cls[0].operational_date.slice(0,7);from.value=m+'-01';to.value=m+'-'+String(new Date(Number(m.slice(0,4)),Number(m.slice(5,7)),0).getDate()).padStart(2,'0');}cierreImported=ir.error?[]:(ir.data||[]).filter((j,i,list)=>list.findIndex(x=>x.operational_day===j.operational_day)===i);renderCloses();dashboard()}

function effectiveDiff(c){
 return c.reconciled_cash_difference!=null ? +c.reconciled_cash_difference : +c.cash_difference||0
}

function descontarYaFacturado(monto,desde,hasta){return Math.max(0,Number(monto||0)-ivaExternalTotal(desde,hasta))}
function renderCloses(){
 const start=from?.value||localISODate().slice(0,7)+'-01',end=to?.value||localISODate();
 const rows=cls.filter(c=>c.operational_date>=start&&c.operational_date<=end);
 const auditDay=c=>{
  const gross=Number(c.total_sales||0),tips=Number(c.digital_tip||0),net=gross-tips;
  const imp=cierreImported.find(x=>x.operational_day===c.operational_date);
  const jsonSale=imp&&imp.summary_total_sales_cents!=null?Number(imp.summary_total_sales_cents)/100:null;
  const rawPaid=imp?.summary?.kpis?.total_cobrado;
  const jsonPaid=rawPaid==null?null:Number(rawPaid)/100;
  const saleMismatch=jsonSale!=null&&Math.abs(net-jsonSale)>.009;
  const grossMismatch=jsonPaid!=null&&Math.abs(gross-jsonPaid)>.009;
  return {gross,tips,net,jsonSale,jsonPaid,saleMismatch,grossMismatch,flag:saleMismatch||grossMismatch,hasImport:!!imp};
 };
 const enriched=rows.map(c=>({c,...auditDay(c)}));
 const totalGeneral=enriched.reduce((a,x)=>a+x.gross,0);
 const totalVenta=enriched.reduce((a,x)=>a+x.net,0);
 const invoicing=descontarYaFacturado(rows.reduce((a,c)=>a+Number(c.total_to_invoice||0),0),start,end);
 const differences=rows.reduce((a,c)=>a+effectiveDiff(c),0);
 const bad=enriched.filter(x=>x.flag);
 const recentClose=enriched[0]||null;
 const box=(name,amount,sub)=>'<div class="card" style="margin:0;min-width:0"><div class="small muted">'+name+'</div><div style="font-size:clamp(18px,3.6vw,24px);font-weight:800;margin:7px 0 3px">'+money(amount)+'</div><div class="small muted">'+sub+'</div></div>';
 const summary='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px;margin:8px 0 18px">'+
  box('TOTAL GENERAL DEL PERÍODO',totalGeneral,'Incluye propinas · coincide con el cierre')+
  
  box('TOTAL A FACTURAR',invoicing,start.split('-').reverse().join('/')+' al '+end.split('-').reverse().join('/'))+
  box('Diferencia de caja',differences,'Diferencias registradas en cierres')+'</div>';
 const warning=bad.length?'<div class="card" style="border:2px solid #b45309;background:#fffbeb;color:#78350f"><b>REVISAR CONCILIACIÓN · '+bad.length+' día(s)</b><div class="small">El cierre y el paquete original de Spanish no coinciden. No se modifica ninguno de los importes.</div></div>':'';
 const day=recentClose?'<div class="card" style="margin:0 0 14px"><div class="row between"><div><b>Último cierre · '+fmt(recentClose.c.operational_date)+'</b><div class="small muted">Total general '+money(recentClose.gross)+'</div><div class="small muted">Venta sin propinas '+money(recentClose.net)+' · propinas '+money(recentClose.tips)+'</div></div><div class="right"><div class="small muted">A facturar del día</div><b style="font-size:19px">'+money(recentClose.c.total_to_invoice)+'</b></div></div></div>':'';
 const lines=enriched.map(x=>{
  const c=x.c,d=effectiveDiff(c),color=d<-.009?'bad':'ok';
  const reconciliation=x.flag?'<div class="small" style="color:#b45309;font-weight:700">REVISAR: cierre ≠ paquete POS'+(x.jsonSale!=null?' · venta POS '+money(x.jsonSale):'')+(x.jsonPaid!=null?' · cobrado POS '+money(x.jsonPaid):'')+'</div>':'';
  const desc='<div class="small muted">Propinas digitales: '+money(x.tips)+'</div>'+reconciliation;
  return '<tr><td>'+fmt(c.operational_date)+'</td><td><b>'+money(x.gross)+'</b>'+desc+'</td>'+
   '<td><b>'+money(c.total_to_invoice)+'</b></td>'+
   '<td class="'+color+'">'+money(d)+'</td>'+
   '<td><button onclick="reconcile(\''+c.id+'\')">Conciliar</button></td></tr>';
 });
 const hdr='<table><tr><th>Fecha</th><th>Total general</th><th>A facturar</th><th>Diferencia</th><th></th></tr>';
 closes.innerHTML=summary+warning+day+(lines.length?hdr+lines.join('')+'</table>':'<div class="empty">No hay cierres cargados.</div>');
 recent.innerHTML=lines.length?hdr+lines.slice(0,5).join('')+'</table>':'<div class="empty">Sin cierres.</div>';
}
function dashboard(){
 let mo=((from?.value&&from.value.slice(0,7))||(cls.some(x=>x.operational_date.startsWith(localISODate().slice(0,7)))?localISODate().slice(0,7):(cls[0]?.operational_date||localISODate()).slice(0,7))),
     cm=cls.filter(x=>x.operational_date.startsWith(mo)),
     hm=hist.filter(x=>x.sale_date.startsWith(mo)),
     v=cm.reduce((a,x)=>a+Number(x.total_sales||0),0),
     inv=cm.reduce((a,x)=>a+ +x.total_to_invoice,0)+cierreImported.filter(j=>j.operational_day.startsWith(mo)&&!cm.some(c=>c.operational_date===j.operational_day)).reduce((a,j)=>a+Number(j.summary_total_to_invoice_cents||0)/100,0),
     p=cls.filter(x=>x.status==='PENDIENTE_CONCILIACION'&&effectiveDiff(x)<-.009).length,
     supplierDebt=sups.reduce((tot,s)=>{let b=bal(s.id);return tot+(b>0?b:0)},0);
 kpis.innerHTML=[
  ['Total general del mes (incluye propinas)',money(v)],
  ['A facturar',money(descontarYaFacturado(inv,mo+'-01',mo+'-'+String(new Date(Number(mo.slice(0,4)),Number(mo.slice(5,7)),0).getDate()).padStart(2,'0')))],
  ['Diferencias pendientes',p],
  ['Saldo proveedores',money(supplierDebt)]
 ].map((x,i)=>'<div class="card kpi" role="button" tabindex="0" data-nav="'+(['caja','iva','caja','proveedores'][i])+'" aria-label="Abrir '+x[0]+'"><span class="muted small">'+x[0]+'</span><b>'+x[1]+'</b><span class="kpi-link">Ver detalle →</span></div>').join('')
}

function closeForm(){
 M('<h3>Carga manual mínima</h3><input id="mreq" type="hidden" value="'+requestKey()+'"><p class="small muted">Sólo completá estos tres datos.</p><label>Fecha</label><input id="mdate" type="date" value="'+localISODate()+'"><label>Total general del día</label><input id="mtotal" type="text" inputmode="decimal"><label>Total a facturar</label><input id="minvoice" type="text" inputmode="decimal"><button id="manualCloseSave" class="primary" style="width:100%;margin-top:14px" onclick="saveManualClose()">Guardar cierre</button>')
}

async function saveManualClose(){
 if(!mdate.value)return A('Ingresá la fecha.');
 let total=parseAmount(mtotal.value),invoice=parseAmount(minvoice.value);
 if(total<0||mtotal.value==='')return A('Ingresá el total general del día.');
 if(invoice<0||minvoice.value==='')return A('Ingresá el total a facturar.');
 busyBtn('manualCloseSave',true);
 try{
  let row={operational_date:mdate.value,total_sales:total,total_to_invoice:invoice,status:'CERRADO',notes:'Carga manual mínima: sin detalle automático de medios.',request_key:mreq.value};
  let r=await sb.from('audit_daily_closes').insert(row).select().single();
  if(r.error){
   if(requestDuplicate(r.error))return A('Este cierre ya había sido procesado.');
   if(r.error.code==='23505')return A('Ya existe un cierre para esa fecha.');
   return A(r.error.message)
  }
  X();await loadCloses()
 }finally{busyBtn('manualCloseSave',false)}
}
async function upload(cid,mid,fs){for(let f of fs){let path=(cid||'prov')+'/'+crypto.randomUUID()+'-'+f.name,r=await sb.storage.from('audit-evidence').upload(path,f);if(!r.error)await sb.from('audit_evidence').insert({close_id:cid,supplier_movement_id:mid,file_name:f.name,storage_path:path,mime_type:f.type,file_size:f.size})}}
function parseAmount(v){
 let x=String(v??'').replace(/\$/g,'').replace(/\s/g,'').trim();
 if(!x)return 0;
 let neg=x.startsWith('-');x=x.replace(/-/g,'');
 if(x.includes(',')&&x.includes('.'))x=x.replace(/\./g,'').replace(',','.');
 else if(x.includes(','))x=x.replace(',','.');
 else if((x.match(/\./g)||[]).length>1||/^\d{1,3}\.\d{3}$/.test(x))x=x.replace(/\./g,'');
 let n=Number(x);return Number.isFinite(n)?(neg?-n:n):0;
}
function parseTxt(t){
 const amount=re=>{let m=t.match(re);return m?parseAmount(m[1]):0};
 const integer=re=>{let m=t.match(re);return m?parseInt(m[1],10)||0:0};
 const str=re=>{let m=t.match(re);return m?m[1].trim():''};
 return{
  operational_date:str(/Fecha:\s*(\d{4}-\d{2}-\d{2})/i),
  total_sales:amount(/Total general del día:\s*\$?\s*(-?[\d\.,]+)/i),
  cash_collected:amount(/Efectivo recaudado:\s*\$?\s*(-?[\d\.,]+)/i),
  digital_total:amount(/Tarjeta\s*\/\s*digital:\s*\$?\s*(-?[\d\.,]+)/i),
  total_to_invoice:amount(/Totales? a facturar:\s*\$?\s*(-?[\d\.,]+)/i),
  expected_cash:amount(/Efectivo esperado:\s*\$?\s*(-?[\d\.,]+)/i),
  dollars_applied:amount(/Dólares aplicados.*?:\s*\$?\s*(-?[\d\.,]+)/i),
  actual_cash:amount(/Caja real:\s*\$?\s*(-?[\d\.,]+)/i),
  vouchers:amount(/Vales:\s*\$?\s*(-?[\d\.,]+)/i),
  salon_cash:amount(/-\s*Salón:\s*\$?\s*(-?[\d\.,]+)/i),
  delivery_cash:amount(/-\s*Delivery:\s*\$?\s*(-?[\d\.,]+)/i),
  pya_cash:amount(/-\s*PedidosYa Efectivo:\s*\$?\s*(-?[\d\.,]+)/i),
  pya_card:amount(/-\s*PedidosYa Tarjeta:\s*\$?\s*(-?[\d\.,]+)/i),
  mercado_pago:amount(/-\s*Mercado Pago:\s*\$?\s*(-?[\d\.,]+)/i),
  posnet_leoni:amount(/-\s*Posnet Leoni:\s*\$?\s*(-?[\d\.,]+)/i),
  posnet_provincia:amount(/-\s*Posnet Provincia:\s*\$?\s*(-?[\d\.,]+)/i),
  bank_transfer:amount(/-\s*Transferencia:\s*\$?\s*(-?[\d\.,]+)/i),
  digital_tip:amount(/Propina digital:\s*\$?\s*(-?[\d\.,]+)/i),
  orders_total:integer(/Total de órdenes:\s*(\d+)/i),
  orders_voided:integer(/Órdenes anuladas:\s*(\d+)/i),
  orders_adjusted:integer(/Órdenes con ajuste:\s*(\d+)/i),
  close_user:str(/Usuario cierre:\s*(.+)/i),
  close_time:str(/Hora cierre:\s*([0-2]?\d:[0-5]\d)/i),
  _cash_detail_present:/Efectivo esperado:/i.test(t)&&/Caja real:/i.test(t)
 };
}
async function hashText(t){
 const d=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)));
 return Array.from(d).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function parsedDetail(p){
 const d=[
  ['Efectivo esperado',p.expected_cash],['Caja real',p.actual_cash],['Vales',p.vouchers],
  ['Mercado Pago',p.mercado_pago],['Leoni',p.posnet_leoni],['Provincia',p.posnet_provincia],
  ['PYA Tarjeta',p.pya_card],['Transferencia',p.bank_transfer],['Propina digital',p.digital_tip]
 ];
 return d.map(x=>'<div><span class="muted small">'+x[0]+'</span><br><b>'+money(x[1])+'</b></div>').join('');
}
function previewParsedClose(p,raw,name,file){
 pendingParsedClose={...p,source_text:raw,source_filename:name||null,request_key:requestKey()};
 pendingSourceFile=file||new File([raw],(name||('cierre_'+(p.operational_date||'sin_fecha')+'.txt')),{type:'text/plain'});
 let diff=(+p.actual_cash||0)-(+p.expected_cash||0);
 M('<h3>Cierre leído automáticamente</h3><p class="small muted">Revisá sólo estos tres datos. El resto ya fue extraído del TXT.</p>'+
 '<div class="form"><div><label>Fecha</label><input id="qdate" type="date" value="'+(p.operational_date||'')+'"></div>'+
 '<div><label>Total general del día</label><input id="qtotal" type="number" value="'+(p.total_sales||'')+'"></div>'+
 '<div><label>Total a facturar</label><input id="qinvoice" type="number" value="'+(p.total_to_invoice||'')+'"></div></div>'+
 '<div class="title"><h2>Extraído automáticamente</h2><span class="pill">'+(p._cash_detail_present?(diff===0?'Caja OK':('Diferencia '+money(diff))):'Sin detalle de caja')+'</span></div>'+
 '<div class="grid kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">'+parsedDetail(p)+'</div>'+
 '<div class="small muted" style="margin:12px 0">Órdenes '+(p.orders_total||0)+' · anuladas '+(p.orders_voided||0)+' · usuario '+(p.close_user||'—')+' · hora '+(p.close_time||'—')+'</div>'+
 '<button class="primary" style="width:100%" onclick="saveParsedClose()">Guardar cierre</button>');
}
async function saveParsedClose(){
 if(!pendingParsedClose)return;
 if(!qdate.value)return A('Falta la fecha.');
 if(qtotal.value==='')return A('Falta el total general del día.');
 if(qinvoice.value==='')return A('Falta el total a facturar.');
 let p=pendingParsedClose;
 let row={
  operational_date:qdate.value,total_sales:+qtotal.value,total_to_invoice:+qinvoice.value,
  expected_cash:+p.expected_cash||0,actual_cash:+p.actual_cash||0,cash_collected:+p.cash_collected||0,digital_total:+p.digital_total||0,
  dollars_applied:+p.dollars_applied||0,vouchers:+p.vouchers||0,digital_tip:+p.digital_tip||0,pya_card:+p.pya_card||0,
  mercado_pago:+p.mercado_pago||0,posnet_leoni:+p.posnet_leoni||0,posnet_provincia:+p.posnet_provincia||0,
  bank_transfer:+p.bank_transfer||0,pya_cash:+p.pya_cash||0,delivery_cash:+p.delivery_cash||0,salon_cash:+p.salon_cash||0,
  orders_total:+p.orders_total||0,orders_voided:+p.orders_voided||0,orders_adjusted:+p.orders_adjusted||0,
  close_user:p.close_user||null,close_time:p.close_time||null,source_filename:p.source_filename||null,source_text:p.source_text||null,
  source_hash:p.source_text?await hashText(p.source_text):null,request_key:p.request_key
 };
 row.status=p._cash_detail_present?(row.actual_cash===row.expected_cash?'CONSISTENTE':'PENDIENTE_CONCILIACION'):'CERRADO';
 let r=await sb.from('audit_daily_closes').insert(row).select().single();
 if(r.error){
  if(requestDuplicate(r.error))return A('Este cierre ya había sido procesado.');
  if(r.error.code==='23505')return A('Ese cierre ya existe o el archivo ya fue importado.');
  return A(r.error.message)
 }
 if(pendingSourceFile)await upload(r.data.id,null,[pendingSourceFile]);
 pendingParsedClose=null;pendingSourceFile=null;X();await loadCloses();
}
function txtForm(){M('<h3>Importar cierre TXT</h3><p class="small muted">Elegí el TXT. Lo leo automáticamente y sólo te pido revisar fecha, total y total a facturar.</p><input id="tf" type="file" accept=".txt,text/plain" onchange="readTxt()">')}
async function readTxt(){
 let f=tf.files[0];if(!f)return;
 let raw=await f.text(),p=parseTxt(raw);
 X();previewParsedClose(p,raw,f.name,f);
}
function pasteCloseForm(){M('<h3>Pegar cierre</h3><p class="small muted">Pegá el reporte completo. La app extrae el resto sola.</p><textarea id="pasteCloseText" style="min-height:260px" placeholder="Pegá aquí el texto de AUDITORÍA DEL DÍA..."></textarea><div class="row" style="margin-top:10px"><button onclick="readClipboardClose()">Pegar portapapeles</button><button class="primary" onclick="processPastedClose()">Leer cierre</button></div>');setTimeout(()=>document.getElementById('pasteCloseText')?.focus(),50)}
async function readClipboardClose(){try{document.getElementById('pasteCloseText').value=await navigator.clipboard.readText()}catch(e){A('Mantené presionado dentro del cuadro y elegí Pegar.')}}
function processPastedClose(){let raw=document.getElementById('pasteCloseText').value.trim();if(!raw)return A('Pegá primero el cierre completo.');let p=parseTxt(raw);X();previewParsedClose(p,raw,null,null)}

function methods(c){return[['Mercado Pago',c.mercado_pago,c.mercado_pago],['Posnet Leoni',c.posnet_leoni,c.posnet_leoni],['Posnet Provincia',c.posnet_provincia,c.posnet_provincia],['PedidosYa Tarjeta',c.pya_card,c.pya_card],['Transferencia',c.bank_transfer,c.bank_transfer],['Efectivo',c.expected_cash,c.actual_cash]]}

function reconcile(id,proposal=null){
 let c=cls.find(x=>x.id===id),z=Object.fromEntries((c.audit_reconciliation_items||[]).map(x=>[x.payment_method,x])),p=proposal||assistantProposal||{};
 let rec=c.reconciled_cash_difference!=null;
 M('<h3>Conciliar '+fmt(c.operational_date)+'</h3>'+
 '<div class="calc"><b>Diferencia original: '+money(c.cash_difference)+'</b>'+
 '<div class="small muted">Esperado '+money(c.expected_cash)+' · Caja original '+money(c.actual_cash)+'</div>'+
 (rec?'<div style="margin-top:8px"><b>Resultado conciliado: '+money(c.reconciled_cash_difference)+'</b><div class="small muted">Caja corregida '+money(c.reconciled_actual_cash)+'</div></div>':'')+
 '</div>'+
 '<div class="row" style="margin:10px 0"><button onclick="assistantForm(\''+id+'\')">Asistente de conciliación</button></div>'+
 '<div class="table"><table><tr><th>Medio</th><th>Esperado</th><th>Real</th></tr>'+
 methods(c).map((x,i)=>'<tr><td>'+x[0]+'</td><td>'+money(x[1])+'</td><td><input id="rr'+i+'" type="text" inputmode="decimal" value="'+esc(decimalInputValue(p[x[0]]!=null?p[x[0]]:(z[x[0]]?z[x[0]].actual_amount:x[2])))+'"></td></tr>').join('')+
 '</table></div><label>Observación</label><textarea id="rn" placeholder="Ej. cobro digital mal imputado, faltante de efectivo, diferencia explicada..."></textarea><label>Evidencia</label><input id="rf" type="file" multiple>'+
 '<button id="recSave" class="primary" onclick="saveRec(\''+id+'\')">Guardar conciliación</button>')
}

async function saveRec(id){
 let c=cls.find(x=>x.id===id);
 let now=new Date().toISOString();
 let a=methods(c).map((x,i)=>({
  close_id:id,
  payment_method:x[0],
  expected_amount:+x[1]||0,
  actual_amount:parseAmount(document.getElementById('rr'+i).value),
  notes:rn.value,
  reconciled_at:now
 }));
 if(a.some(x=>!Number.isFinite(x.actual_amount)))return A('Revisá los importes de conciliación.');

 let d=a.reduce((s,x)=>s+x.actual_amount-x.expected_amount,0);
 let efectivo=a.find(x=>x.payment_method==='Efectivo');
 let status=Math.abs(d)<.01?'DIFERENCIA_EXPLICADA':d<0?'FALTANTE':'SOBRANTE';

 busyBtn('recSave',true,'Guardando…');
 try{
  let r=await sb.from('audit_reconciliation_items')
    .upsert(a,{onConflict:'close_id,payment_method'});
  if(r.error)return A(r.error.message);

  let u=await sb.from('audit_daily_closes').update({
   status,
   reconciled_actual_cash:efectivo?efectivo.actual_amount:null,
   reconciled_cash_difference:d,
   reconciled_at:now
  }).eq('id',id);
  if(u.error)return A(u.error.message);

  if(rf.files.length)await upload(id,null,[...rf.files]);
  assistantProposal={};assistantFiles=[];X();await loadCloses();

  A(status==='DIFERENCIA_EXPLICADA'
   ?'Conciliación cerrada: diferencia explicada.'
   :status==='FALTANTE'
    ?'Conciliación cerrada con faltante de '+money(Math.abs(d))+'.'
    :'Conciliación cerrada con sobrante de '+money(d)+'.')
 }finally{busyBtn('recSave',false)}
}
function normalizeText(t){return String(t||'').replace(/\t+/g,' ').replace(/\u00a0/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function moneyCandidates(line){
 let out=[],re=/-?\$?\s*\d[\d\.]*(?:,\d{1,2})?|-?\$?\s*\d+(?:\.\d{1,2})/g,m;
 while((m=re.exec(line))){let v=parseAmount(m[0]);if(Number.isFinite(v)&&Math.abs(v)>=1)out.push(v)}
 return out;
}
function methodKeywords(name){
 return {
  'Mercado Pago':['mercado pago','mercadopago',' mp ','mpago'],
  'Posnet Leoni':['leoni'],
  'Posnet Provincia':['provincia','banco provincia','posnet provincia'],
  'PedidosYa Tarjeta':['pedidosya','pedidos ya','pya'],
  'Transferencia':['transferencia','transfer','transf'],
  'Efectivo':['efectivo','caja real','caja']
 }[name]||[];
}
function analyzeEvidenceText(c,text){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const used=new Set(),result={},detail=[];
 for(const [name,expected,defaultActual] of methods(c)){
  if(name==='Efectivo'){result[name]=+c.actual_cash||0;detail.push({name,expected:+expected||0,actual:result[name],confidence:'ALTA',source:'Caja real del cierre'});continue}
  let best=null;
  for(let i=0;i<lines.length;i++){
   if(used.has(i))continue;
   const line=lines[i],norm=' '+normalizeText(line)+' ',vals=moneyCandidates(line);
   if(!vals.length)continue;
   const kws=methodKeywords(name),kw=kws.some(k=>norm.includes(k));
   for(const v of vals){
    const delta=Math.abs(v-(+expected||0)),pct=(+expected||0)?delta/Math.abs(+expected):999;
    let score=0;
    if(kw)score+=7;
    if(delta<1)score+=8; else if(delta<=100)score+=5; else if(pct<=.005)score+=4; else if(pct<=.02)score+=2;
    if(/total|acredit|cobro|venta|liquid|pago/.test(norm))score+=1;
    if(score>0&&(!best||score>best.score))best={score,val:v,line,index:i,delta,kw};
   }
  }
  if(best&&best.score>=5){
   used.add(best.index);result[name]=best.val;
   detail.push({name,expected:+expected||0,actual:best.val,confidence:best.score>=12?'ALTA':best.score>=8?'MEDIA':'BAJA',source:best.line});
  }else{
   result[name]=+defaultActual||0;
   detail.push({name,expected:+expected||0,actual:+defaultActual||0,confidence:'BAJA',source:'Sin coincidencia clara; se mantiene valor del cierre'});
  }
 }
 return {result,detail,lines}
}
async function readAssistantFiles(files){
 let chunks=[];
 for(const f of files){
  try{
   const ext=f.name.split('.').pop().toLowerCase();
   if(['txt','csv'].includes(ext)){chunks.push('ARCHIVO '+f.name+'\n'+await f.text())}
   else if(['xlsx','xls'].includes(ext)){
    let ab=await f.arrayBuffer(),wb=XLSX.read(ab,{type:'array'}),txt='ARCHIVO '+f.name+'\n';
    wb.SheetNames.forEach(n=>{txt+='HOJA '+n+'\n'+XLSX.utils.sheet_to_csv(wb.Sheets[n])+'\n'});
    chunks.push(txt);
   }
  }catch(e){}
 }
 return chunks.join('\n');
}

function assistantForm(id){
 assistantProposal={};assistantFiles=[];
 let c=cls.find(x=>x.id===id);
 M('<h3>Asistente de conciliación</h3>'+
 '<p class="small muted">Copiá directamente desde Excel, Mercado Pago, banco, Posnet o PedidosYa y pegalo acá. No hace falta descargar ningún archivo.</p>'+
 '<label>Movimientos / extracto</label><textarea id="assistText" style="min-height:240px" placeholder="Pegá acá las filas copiadas del Excel o el texto del extracto..."></textarea>'+
 '<div class="row" style="margin-top:10px"><button onclick="pasteAssistantClipboard()">Pegar portapapeles</button><button onclick="clearAssistantText()">Limpiar</button></div>'+
 '<div class="small muted" style="margin:10px 0">También podés adjuntar TXT, CSV o Excel si alguna vez te resulta más cómodo, pero no es obligatorio.</div>'+
 '<input id="assistFiles" type="file" multiple accept=".txt,.csv,.xlsx,.xls">'+
 '<button class="primary" style="width:100%;margin-top:12px" onclick="runAssistant(\''+id+'\')">Analizar y proponer</button>');
 setTimeout(()=>document.getElementById('assistText')?.focus(),50)
}
async function pasteAssistantClipboard(){
 try{
  let t=await navigator.clipboard.readText();
  if(!t)return A('El portapapeles está vacío.');
  let box=document.getElementById('assistText');
  box.value=(box.value?box.value+'\n':'')+t;
 }catch(e){
  A('Si el navegador no permite leer el portapapeles, mantené presionado dentro del cuadro y elegí Pegar.');
 }
}
function clearAssistantText(){let x=document.getElementById('assistText');if(x)x.value=''}
async function runAssistant(id){
 let c=cls.find(x=>x.id===id),files=[...assistFiles.files],fileText=await readAssistantFiles(files),text=(assistText.value||'')+'\n'+fileText;
 if(!text.trim())return A('Pegá texto o subí al menos un TXT, CSV o Excel.');
 let a=analyzeEvidenceText(c,text);assistantProposal=a.result;assistantFiles=files;
 await sb.from('audit_reconciliation_inputs').insert({close_id:id,input_type:files.length?'MIXED':'TEXT',source_name:files.map(f=>f.name).join(', ')||'Texto pegado',raw_text:text});
 let diff=a.detail.reduce((s,x)=>s+x.actual-x.expected,0);
 let rows=a.detail.map(x=>'<tr><td>'+x.name+'</td><td>'+money(x.expected)+'</td><td><b>'+money(x.actual)+'</b></td><td><span class="pill">'+x.confidence+'</span></td></tr>').join('');
 let sources=a.detail.map(x=>'<div class="card"><b>'+x.name+'</b><div class="small muted">'+esc(x.source)+'</div></div>').join('');
 M('<h3>Propuesta de conciliación</h3>'+
 '<div class="calc"><b>Diferencia propuesta: '+money(diff)+'</b><div class="small muted">'+(Math.abs(diff)<1?'Los importes encontrados compensan el cierre.':diff<0?'Queda un faltante sin explicar.':'Queda un sobrante sin explicar.')+'</div></div>'+
 '<div class="table" style="margin-top:10px"><table><tr><th>Medio</th><th>Esperado</th><th>Encontrado</th><th>Conf.</th></tr>'+rows+'</table></div>'+
 '<div class="title"><h2>Coincidencias usadas</h2></div>'+sources+
 '<div class="row"><button onclick="assistantForm(\''+id+'\')">Volver a analizar</button><button class="primary" onclick="reconcile(\''+id+'\',assistantProposal)">Revisar y confirmar</button></div>')
}
function exportXlsx(){if(!cls.length)return A('No hay cierres');let rows=[...cls].reverse().map(c=>{let z=Object.fromEntries((c.audit_reconciliation_items||[]).map(x=>[x.payment_method,x])),r={'Fecha':fmt(c.operational_date),'Total general':+c.total_sales,'Total a facturar':+c.total_to_invoice,'Efectivo esperado':+c.expected_cash,'Caja real':+c.actual_cash,'Diferencia caja':+c.cash_difference,'Vales':+c.vouchers,'Propina digital':+c.digital_tip,'Estado':c.status};methods(c).forEach(x=>{r[x[0]+' esperado']=+x[1];r[x[0]+' real']=z[x[0]]?+z[x[0]].actual_amount:''});return r}),ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Conciliación');XLSX.writeFile(wb,'Spanish_Conciliacion.xlsx')}
async function loadHist(){let r=await sb.from('audit_sales_history').select('*').eq('operational',true).order('sale_date',{ascending:false}).limit(500);if(r.error)return A(r.error.message);hist=r.data||[];let g={};hist.forEach(x=>(g[x.sale_date.slice(0,7)]??=[]).push(x));salesMonths.innerHTML=Object.keys(g).length?'<table><tr><th>Mes</th><th>Días</th><th>Total</th><th></th></tr>'+Object.keys(g).sort().reverse().map(m=>'<tr><td>'+m+'</td><td>'+g[m].length+'</td><td>'+money(g[m].reduce((s,x)=>s+ +x.amount,0))+'</td><td><button onclick="monthDetail(\''+m+'\')">Ver días</button></td></tr>').join('')+'</table>':'<div class="empty">Sin histórico.</div>'}
function monthDetail(m){let l=hist.filter(x=>x.sale_date.startsWith(m));M('<h3>Ventas '+m+'</h3><div class="table"><table><tr><th>Fecha</th><th>Venta</th><th>A facturar</th></tr>'+l.map(x=>'<tr><td>'+fmt(x.sale_date)+'</td><td>'+money(x.amount)+'</td><td>'+(x.total_to_invoice==null?'—':money(x.total_to_invoice))+'</td></tr>').join('')+'</table></div>')}

async function loadSuppliers(){
 let [a,b,c,d,e]=await Promise.all([
  sb.from('audit_suppliers').select('*').order('name'),
  sb.from('audit_supplier_movements').select('*').order('movement_date',{ascending:false}).order('created_at',{ascending:false}),
  sb.from('audit_supplier_aliases').select('*').order('alias'),
  sb.from('audit_supplier_payment_allocations').select('id,supplier_id,payment_id,invoice_id,amount,created_at'),
  sb.from('audit_supplier_invoice_credits').select('id,supplier_id,invoice_id,credit_movement_id,kind,description,reversed_by_movement_id,created_at')
 ]);
 if(a.error||b.error||d.error||e.error)return A('Error cargando cuenta corriente: '+(a.error?.message||b.error?.message||d.error?.message||e.error?.message));
 sups=a.data||[];mov=b.data||[];supAliases=c.data||[];supplierAllocations=d.data||[];supplierInvoiceCredits=e.data||[];
 renderSuppliers()
}
function bal(id){
 return mov.filter(x=>x.supplier_id===id).reduce((s,x)=>s+(['PAGO','NOTA_CREDITO'].includes(x.movement_type)?-1:1)*+x.amount,0)
}
function balHtml(id){
 let v=bal(id);
 if(v>0.009)return '<span class="bad">Debo '+money(v)+'</span>';
 if(v<-0.009)return '<span class="ok">A favor '+money(Math.abs(v))+'</span>';
 return '<span class="ok">Saldo '+money(0)+'</span>';
}
function supplierOptions(selected=''){
 return sups.filter(x=>x.active).map(x=>'<option value="'+x.id+'" '+(x.id===selected?'selected':'')+'>'+esc(x.name)+'</option>').join('')
}


function renderSuppliers(){
 const q=(sq.value||'').toLocaleLowerCase('es-AR');
 const listed=sups.filter(s=>s.active&&(s.name+' '+(s.cuit||'')).toLocaleLowerCase('es-AR').includes(q))
   .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es-AR',{sensitivity:'base'}));
 const head='<div class="supplier-compact-head"><b>Proveedores</b><span>'+listed.length+' registrados</span></div>';
 const cards=listed.length?listed.map(s=>'<div class="supplier-compact-item"><div class="supplier-compact-name"><b>'+esc(s.name)+'</b>'+
   '<span>'+esc(s.cuit||'CUIT pendiente')+'</span></div>'+
   '<div class="supplier-compact-bottom"><strong>'+balHtml(s.id)+'</strong>'+
   '<button type="button" onclick="supplierDetail(\''+s.id+'\')">Ver cuenta</button></div></div>').join(''):'<div class="empty">No hay proveedores para esta búsqueda.</div>';
 suppliers.innerHTML=head+cards;
 controlRender();
}
function supplierForm(){
 M('<h3>Proveedor</h3><input id="srq" type="hidden" value="'+requestKey()+'"><label>Nombre</label><input id="sn"><label>CUIT</label><input id="sc"><label>Comisión Posnet predeterminada %</label><input id="spr" type="number" step=".01" placeholder="Sólo si corresponde"><label>Notas</label><textarea id="sno"></textarea><button id="sSave" class="primary" onclick="saveSupplier()">Guardar</button>')
}
async function saveSupplier(){
 let name=sn.value.trim(),cuit=sc.value.trim();
 if(!name)return A('Ingresá el nombre del proveedor.');
 let row={name,cuit:cuit||null,notes:sno.value||null,posnet_commission_rate:spr.value===''?null:+spr.value,request_key:srq.value};
 busyBtn('sSave',true);
 try{
  let r=await sb.from('audit_suppliers').insert(row);
  if(r.error){
   if(requestDuplicate(r.error))return A('Este proveedor ya había sido guardado.');
   if(r.error.code==='23505'&&/cuit|audit_suppliers_cuit_normalized/i.test((r.error.message||'')+' '+(r.error.details||'')))return A('Ya existe un proveedor con ese CUIT.');
   return A(r.error.message)
  }
  X();await loadSuppliers()
 }finally{busyBtn('sSave',false)}
}
function supplierEdit(id){
 let x=sups.find(v=>v.id===id);if(!x)return A('Proveedor no encontrado.');
 M('<h3>Editar proveedor</h3><label>Nombre</label><input id="sen" value="'+esc(x.name)+'"><label>CUIT</label><input id="sec" value="'+esc(x.cuit||'')+'"><label>Comisión Posnet predeterminada %</label><input id="ser" type="number" step=".01" value="'+(x.posnet_commission_rate??'')+'"><div class="small muted">Cambiar este valor sólo afecta pagos futuros; los anteriores conservan su porcentaje.</div><label>Notas</label><textarea id="seo">'+esc(x.notes||'')+'</textarea><div class="row" style="margin-top:12px"><button id="seSave" class="primary" data-id="'+esc(id)+'" onclick="saveSupplierEdit(this.dataset.id)">Guardar</button><button class="danger" data-id="'+esc(id)+'" onclick="deleteSupplier(this.dataset.id)">Eliminar proveedor</button></div>')
}
async function saveSupplierEdit(id){
 let name=sen.value.trim(),cuit=sec.value.trim();
 if(!name)return A('Ingresá el nombre del proveedor.');
 busyBtn('seSave',true);
 try{
  let r=await sb.from('audit_suppliers').update({name,cuit:cuit||null,notes:seo.value||null,posnet_commission_rate:ser.value===''?null:+ser.value}).eq('id',id);
  if(r.error){
   if(r.error.code==='23505'&&/cuit|audit_suppliers_cuit_normalized/i.test((r.error.message||'')+' '+(r.error.details||'')))return A('Ya existe otro proveedor con ese CUIT.');
   return A(r.error.message)
  }
  X();await loadSuppliers()
 }finally{busyBtn('seSave',false)}
}

function supplierChronologicalMovements(id){
 return mov.filter(x=>x.supplier_id===id).slice().sort((a,b)=>{
  let d=String(a.movement_date||'').localeCompare(String(b.movement_date||''));
  return d||String(a.created_at||'').localeCompare(String(b.created_at||''))
 })
}
function supplierSignedAmount(x){
 return ['PAGO','NOTA_CREDITO'].includes(x.movement_type)?-Number(x.amount||0):Number(x.amount||0)
}
function supplierPendingSnapshot(id){
 const all=supplierChronologicalMovements(id);
 const allocatedByInvoice=new Map(),allocatedByPayment=new Map();
 for(const a of supplierAllocations.filter(x=>x.supplier_id===id)){
  const cents=Math.round(Number(a.amount||0)*100);
  allocatedByInvoice.set(a.invoice_id,(allocatedByInvoice.get(a.invoice_id)||0)+cents);
  allocatedByPayment.set(a.payment_id,(allocatedByPayment.get(a.payment_id)||0)+cents)
 }
 const creditedByInvoice=new Map();
 for(const link of supplierInvoiceCredits.filter(l=>l.supplier_id===id&&!l.reversed_by_movement_id)){
  const credit=mov.find(x=>x.id===link.credit_movement_id);
  if(!credit)continue;
  creditedByInvoice.set(link.invoice_id,(creditedByInvoice.get(link.invoice_id)||0)+Math.round(Number(credit.amount||0)*100));
 }
 const invoices=[],extras=[];let creditsUnassigned=0,notesCredit=0;
 for(const x of all){
  const original=Math.round(Number(x.amount||0)*100);
  if(x.movement_type==='FACTURA'){
   const assigned=allocatedByInvoice.get(x.id)||0,credited=creditedByInvoice.get(x.id)||0;
   if(original>assigned+credited)invoices.push({movement:x,original,pending:original-assigned-credited,credited,assigned});
  }else if(x.movement_type==='PAGO'){
   creditsUnassigned+=Math.max(0,original-(allocatedByPayment.get(x.id)||0))
  }else if(x.movement_type==='NOTA_CREDITO'){
   if(!supplierInvoiceCredits.some(l=>l.credit_movement_id===x.id))notesCredit+=original;
  }else if(original>0&&!supplierInvoiceCredits.some(l=>l.reversed_by_movement_id===x.id))extras.push({movement:x,original,pending:original})
 }
 return {invoices:invoices.reverse(),extras,balance:Math.round(bal(id)*100),
   creditsUnassigned,notesCredit}
}
function supplierPendingMarkup(id,limit=10){
 const x=supplierPendingSnapshot(id);
 const recent=x.invoices.slice(0,limit),older=x.invoices.slice(limit);
 const grossOpen=x.invoices.reduce((n,r)=>n+r.pending,0);
 const item=r=>{
  const inv=r.movement;
  const detail=r.pending<r.original?'<span class="supplier-compact-sub">Original '+money(r.original/100)+
    (r.assigned?' · Pagado '+money(r.assigned/100):'')+
    (r.credited?' · NC '+money(r.credited/100):'')+'</span>':'';
  return '<div class="supplier-pending-item"><div class="supplier-pending-info"><b>'+esc(inv.document_number||'S/N')+'</b>'+
   '<span class="supplier-compact-sub">'+fmt(inv.movement_date)+'</span>'+detail+'</div>'+
   '<div class="supplier-pending-value">'+money(r.pending/100)+'</div></div>';
 };
 const list=recent.map(item).join('')||
  '<div class="supplier-compact-empty">No hay boletas pendientes de imputación.</div>';
 const extra=older.length?'<details class="supplier-secondary"><summary>Ver '+older.length+' boletas anteriores</summary>'+
   older.map(item).join('')+'</details>':'';
 const other=x.extras.reduce((n,r)=>n+r.pending,0);
 const difference=other?'<div class="supplier-compact-sub">Otros débitos: '+money(other/100)+'</div>':'';
 const unassigned=x.creditsUnassigned?'<div>Pagos aún sin imputar: <b>'+money(x.creditsUnassigned/100)+'</b></div>':'';
 const uncNotes=x.notesCredit?'<div>NC aún sin asociar: <b>'+money(x.notesCredit/100)+'</b></div>':'';
 return '<div class="supplier-pending-wrap"><div class="supplier-pending-heading"><b>Boletas pendientes</b><span>'+x.invoices.length+' boletas</span></div>'+
  list+extra+difference+
  '<details class="supplier-secondary supplier-saldo-detail"><summary>Detalle de conciliación</summary>'+
  '<div>Boletas sin cubrir por imputaciones: <b>'+money(grossOpen/100)+'</b></div>'+
  unassigned+uncNotes+
  '<div>Saldo contable: <b>'+money(x.balance/100)+'</b></div>'+
  '<p>Los pagos no asignados reducen el saldo contable, pero no cancelan boletas hasta elegirlas.</p>'+
  '</details></div>';
}
/* Elegir un pago YA registrado y asignarle boletas sin crear pagos ni cambiar saldos. */
function supplierUnallocatedPaymentPicker(supplierId){
 const supplier=sups.find(x=>x.id===supplierId);
 if(!supplier)return A('Proveedor no encontrado.');
 const list=mov.filter(x=>x.supplier_id===supplierId&&x.movement_type==='PAGO')
  .map(p=>{
   const paid=Math.round(Number(p.amount||0)*100);
   const assigned=supplierAllocations.filter(a=>a.payment_id===p.id)
    .reduce((sum,a)=>sum+Math.round(Number(a.amount||0)*100),0);
   return {payment:p,pending:Math.max(0,paid-assigned)}
  }).filter(x=>x.pending>0).sort((a,b)=>String(b.payment.movement_date||'').localeCompare(String(a.payment.movement_date||'')));
 const rows=list.slice(0,60).map(x=>'<div class="card" style="padding:12px;margin-top:8px">'+
  '<div class="row between"><div><b>'+esc(fmt(x.payment.movement_date))+'</b><div class="small muted">Pago original '+money(x.payment.amount)+'</div>'+
  '<div class="small bad">Sin imputar '+money(x.pending/100)+'</div></div>'+
  '<button type="button" class="primary" data-payment-id="'+esc(x.payment.id)+'" onclick="supplierAllocationForm(this.dataset.paymentId)">Asignar boletas</button></div></div>').join('');
 M('<h3>Imputar pagos · '+esc(supplier.name)+'</h3>'+
  '<p class="small muted">Seleccioná un pago existente y elegí las facturas que cancela, completas o parcialmente. Esta acción no registra un nuevo pago.</p>'+
  (list.length?'<div class="calc">'+list.length+' pago(s) con importe sin imputar</div>'+rows:
   '<div class="calc">No hay pagos pendientes de imputación en este proveedor.</div>')+
  '<button type="button" style="margin-top:12px" onclick="supplierDetail(\''+esc(supplierId)+'\')">Volver a cuenta</button>')
}



function supplierDetail(id){
 const s=sups.find(x=>x.id===id);if(!s)return A('Proveedor no encontrado.');
 M('<div class="supplier-compact-account"><div class="supplier-compact-account-head"><h3>'+esc(s.name)+'</h3>'+
  '<span class="supplier-compact-sub">'+esc(s.cuit||'CUIT pendiente')+'</span></div>'+
  '<div class="supplier-compact-balance"><span>Saldo de cuenta corriente</span><strong>'+balHtml(id)+'</strong></div>'+
  '<div class="supplier-compact-actions">'+
  '<button class="primary" onclick="documentForm(\''+id+'\')">Cargar boleta</button>'+
  '<button onclick="paymentForm(\''+id+'\')">Registrar pago</button>'+
  '<button onclick="supplierUnallocatedPaymentPicker(\''+id+'\')">Imputar pago</button>'+
  '<button onclick="supplierInvoiceCreditPicker(\''+id+'\')">NC / faltante</button></div>'+
  supplierPendingMarkup(id,15)+supplierHistoryMarkup(id)+
  '<details class="supplier-secondary supplier-more"><summary>Extracto y edición</summary>'+
  '<div class="supplier-more-actions">'+
  '<button onclick="supplierStatementForm(\''+id+'\')">Extracto por fechas</button>'+
  '<button onclick="supplierEdit(\''+id+'\')">Editar proveedor</button></div></details></div>');
}
function supplierPaymentPeriodMarkup(x){
 if(x.movement_type!=='PAGO'||x.payment_method!=='POSNET_LEONI'||!x.posnet_period_from||!x.posnet_period_to)return '';
 return '<div class="small muted">Operaciones del '+fmt(x.posnet_period_from)+' al '+fmt(x.posnet_period_to)+' · período fijo</div>'
}
function supplierMovementNoteMarkup(x){
 return x.notes?'<details style="margin-top:4px"><summary style="cursor:pointer">Ver observaciones</summary><div style="white-space:pre-wrap;padding:5px 0">'+esc(x.notes)+'</div></details>':''
}
function supplierHistoryMarkup(id){
 let s=sups.find(x=>x.id===id);if(!s)return '';
 let m=supplierChronologicalMovements(id),running=0;
 let rows=m.map(x=>{
  let isCredit=['PAGO','NOTA_CREDITO'].includes(x.movement_type),debe=isCredit?0:+x.amount,haber=isCredit?+x.amount:0;
  running+=debe-haber;
  let extra='';
  if(x.movement_type==='PAGO'){
   if(x.payment_method==='POSNET_LEONI') extra='<div class="small muted">Bruto '+money(x.gross_amount||x.amount)+' · Comisión '+pct(x.commission_rate)+' = '+money(x.commission_amount||0)+' · Neto '+money(x.amount)+'</div>';
   else if(x.payment_method) extra='<div class="small muted">'+esc(x.payment_method.replaceAll('_',' '))+'</div>';
  }
  if(x.movement_type==='PAGO'){
   extra+=supplierPaymentPeriodMarkup(x);
   const linked=supplierAllocations.filter(a=>a.payment_id===x.id);
   const assigned=linked.reduce((n,a)=>n+Number(a.amount||0),0);
   extra+='<div class="small muted">Imputado a '+linked.length+' boleta(s): '+money(assigned)+' · Sin imputar: '+money(Math.max(0,Number(x.amount)-assigned))+'</div>';
  }
  if(x.movement_type==='NOTA_CREDITO'){
   const link=supplierInvoiceCredits.find(l=>l.credit_movement_id===x.id);
   if(link){
    const related=mov.find(m=>m.id===link.invoice_id);
    extra+='<div class="small muted">'+(link.kind==='DESCUENTO_FALTANTE'?'Descuento por faltante':'Nota de crédito')+
      ' · Aplicada a '+esc(related?.document_number||'boleta original')+
      (link.reversed_by_movement_id?' · Revertido':' · Vigente')+'</div>';
   }
  }
  let actions='<span class="invoice-actions">'+
    (x.movement_type==='FACTURA'?'<button class="iconbtn" title="Editar boleta" aria-label="Editar boleta" onclick="invoiceEditForm(\''+x.id+'\')">✎</button>':'')+
    (supplierInvoiceCredits.some(l=>l.credit_movement_id===x.id)
       ? (supplierInvoiceCredits.some(l=>l.credit_movement_id===x.id&&l.reversed_by_movement_id)?'<span class="small muted">Revertido</span>':
          '<button class="iconbtn" title="Revertir con contramovimiento" onclick="supplierInvoiceCreditReverse(\''+x.id+'\')">Revertir</button>')
       : supplierInvoiceCredits.some(l=>l.reversed_by_movement_id===x.id)
         ? '<span class="small muted">Reversión auditada</span>'
         : '<button class="iconbtn danger" title="Eliminar movimiento" aria-label="Eliminar movimiento" onclick="deleteSupplierMovement(\''+x.id+'\')">×</button>')+'</span>';
  let saldoClass=running<-.009?'ok':running>.009?'bad':'';
  return '<article class="supplier-hist-item"><div class="supplier-hist-head"><div><b>'+
    esc(x.document_number||x.movement_type.replaceAll('_',' '))+'</b><small>'+fmt(x.movement_date)+'</small></div>'+
    '<strong class="'+saldoClass+'">'+money(running)+'</strong></div>'+
    '<div class="supplier-hist-values"><span>Debe <b>'+(debe?money(debe):'—')+'</b></span>'+
    '<span>Haber <b>'+(haber?money(haber):'—')+'</b></span></div>'+
    (extra?'<details class="supplier-hist-more"><summary>Detalle del movimiento</summary>'+extra+'</details>':'')+
    (x.notes?'<div class="supplier-hist-more">'+supplierMovementNoteMarkup(x)+'</div>':'')+
    '<details class="supplier-hist-more"><summary>Acciones</summary>'+actions+'</details></article>'
 }).join('');
 let totalDebe=m.reduce((a,x)=>a+(!['PAGO','NOTA_CREDITO'].includes(x.movement_type)?+x.amount:0),0);
 let totalHaber=m.reduce((a,x)=>a+(['PAGO','NOTA_CREDITO'].includes(x.movement_type)?+x.amount:0),0);

 return '<details class="supplier-account-section supplier-hist-screen"><summary>Historial de movimientos</summary>'+
   '<div class="supplier-hist-totals"><div>Debe <b>'+money(totalDebe)+'</b></div>'+
   '<div>Haber <b>'+money(totalHaber)+'</b></div></div>'+
   (rows||'<div class="empty">No hay movimientos registrados.</div>')+'</details>';
}
function supplierDetailLegacy(id){supplierDetail(id)}

function supplierStatementForm(id,mode='DATES',anchor=''){
 let s=sups.find(x=>x.id===id);if(!s)return A('Proveedor no encontrado.');
 let all=supplierChronologicalMovements(id),first=all[0]?.movement_date||localISODate(),last=localISODate();
 if(mode==='LAST'){
  let lp=[...all].reverse().find(x=>x.movement_type==='PAGO');
  if(!lp)return A('Este proveedor todavía no tiene pagos registrados.');
  first=lp.movement_date;anchor=lp.id
 }
 M('<div class="row between"><div><h3>Extracto · '+esc(s.name)+'</h3><div class="small muted">Cuenta corriente histórica</div></div><button onclick="supplierDetail(\''+id+'\')">← Cuenta</button></div>'+
 '<input id="stmtAnchor" type="hidden" value="'+esc(anchor||'')+'">'+
 '<label>Desde</label><input id="stmtFrom" type="date" value="'+esc(first)+'">'+
 '<label>Hasta</label><input id="stmtTo" type="date" value="'+esc(last)+'">'+
 '<div class="row" style="margin-top:10px"><button class="primary" data-id="'+esc(id)+'" onclick="supplierStatementApply(this.dataset.id)">Ver período</button><button data-id="'+esc(id)+'" onclick="supplierStatementLastPayment(this.dataset.id)">Desde último pago</button></div>'+
 '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button data-id="'+esc(id)+'" onclick="supplierStatementExport(this.dataset.id,\'copy\')">Copiar para WhatsApp</button><button data-id="'+esc(id)+'" onclick="supplierStatementExport(this.dataset.id,\'csv\')">Exportar CSV</button></div>'+ '<div id="stmtResult" style="margin-top:12px"></div>');
 supplierStatementRender(id,mode,anchor)
}
function supplierStatementApply(id){
 let a=document.getElementById('stmtAnchor');if(a)a.value='';
 supplierStatementRender(id,'DATES','')
}
function supplierStatementLastPayment(id){
 let all=supplierChronologicalMovements(id),lp=[...all].reverse().find(x=>x.movement_type==='PAGO');
 if(!lp)return A('Este proveedor todavía no tiene pagos registrados.');
 let f=document.getElementById('stmtFrom'),a=document.getElementById('stmtAnchor');
 if(f)f.value=lp.movement_date;if(a)a.value=lp.id;
 supplierStatementRender(id,'LAST',lp.id)
}
function supplierStatementRender(id,mode='DATES',anchor=''){
 let box=document.getElementById('stmtResult');if(!box)return;
 let all=supplierChronologicalMovements(id),from=document.getElementById('stmtFrom')?.value||'',to=document.getElementById('stmtTo')?.value||'9999-12-31';
 if(from&&to&&from>to){box.textContent='La fecha Desde no puede ser posterior a Hasta.';box.dataset.valid='0';return}
 box.dataset.valid='1';box.dataset.statementMode=mode;box.dataset.statementAnchor=anchor||'';box.dataset.statementSupplier=id;
 let opening=0,selected=[];
 if(mode==='LAST'&&anchor){
  let idx=all.findIndex(x=>x.id===anchor);if(idx<0)idx=0;
  opening=all.slice(0,idx).reduce((s,x)=>s+supplierSignedAmount(x),0);
  selected=all.slice(idx).filter(x=>x.movement_date<=to)
 }else{
  opening=all.filter(x=>!from||x.movement_date<from).reduce((s,x)=>s+supplierSignedAmount(x),0);
  selected=all.filter(x=>(!from||x.movement_date>=from)&&(!to||x.movement_date<=to))
 }
 let running=opening,totalDebe=0,totalHaber=0;
 let rows=selected.map(x=>{
  let credit=['PAGO','NOTA_CREDITO'].includes(x.movement_type),debe=credit?0:Number(x.amount||0),haber=credit?Number(x.amount||0):0;
  totalDebe+=debe;totalHaber+=haber;running+=debe-haber;
  return '<tr><td>'+fmt(x.movement_date)+'</td><td>'+esc(x.document_number||x.movement_type.replaceAll('_',' '))+supplierPaymentPeriodMarkup(x)+supplierMovementNoteMarkup(x)+'</td><td class="right">'+(debe?money(debe):'—')+'</td><td class="right">'+(haber?money(haber):'—')+'</td><td class="right"><b>'+money(running)+'</b></td></tr>'
 }).join('');
 box.innerHTML='<div class="statement-summary"><div><span class="small muted">Saldo inicial</span><b>'+money(opening)+'</b></div><div><span class="small muted">Debe período</span><b>'+money(totalDebe)+'</b></div><div><span class="small muted">Haber período</span><b>'+money(totalHaber)+'</b></div><div><span class="small muted">Saldo final</span><b>'+money(running)+'</b></div></div>'+
 (mode==='LAST'?'<div class="small muted" style="margin:8px 0">Desde el último pago registrado.</div>':'')+
 '<div class="table"><table><tr><th>Fecha</th><th>Comprobante</th><th class="right">Debe</th><th class="right">Haber</th><th class="right">Saldo</th></tr>'+ (rows||'<tr><td colspan="5" class="muted">Sin movimientos en el período.</td></tr>') +'</table></div>'
}



function supplierPaymentAllocationDescription(payment){
 if(!payment||payment.movement_type!=='PAGO')return '';
 const linked=supplierAllocations.filter(a=>a.payment_id===payment.id);
 const descriptions=linked.map(a=>{
  const invoice=mov.find(m=>m.id===a.invoice_id);
  return (invoice?.document_number||'Boleta sin número')+' '+money(a.amount)
 });
 const assigned=linked.reduce((s,a)=>s+Number(a.amount||0),0);
 const balance=Math.max(0,Number(payment.amount||0)-assigned);
 if(balance>0.009)descriptions.push('Sin imputar '+money(balance));
 return descriptions.join(' · ')
}
function supplierStatementWhatsAppText(supplierName,period,opening,selected){
 const invoices=[],otherCharges=[],credits=[];
 let totalDebits=0,totalCredits=0,missingNumbers=0;
 for(const x of selected){
  const typ=String(x.movement_type||'').toUpperCase();
  const amount=Number(x.amount||0),date=fmt(x.movement_date);
  if(typ==='PAGO'||typ==='NOTA_CREDITO'){
   totalCredits+=amount;
   const label=typ==='NOTA_CREDITO'?'Nota de crédito':'Pago'+(x.payment_method?' ('+String(x.payment_method).replaceAll('_',' ').toLowerCase()+')':'');
   credits.push(date+' · '+label+(String(x.document_number||'').trim()?' '+String(x.document_number).trim():'')+' · '+money(amount)+
    (typ==='PAGO'?'\n  ↳ '+supplierPaymentAllocationDescription(x):''));
  }else if(typ==='FACTURA'){
   totalDebits+=amount;
   const number=String(x.document_number||'').trim();
   if(!number)missingNumbers++;
   invoices.push(date+' · Fact. '+(number||'S/N')+' · '+money(amount));
  }else{
   totalDebits+=amount;
   otherCharges.push(date+' · '+(typ.replaceAll('_',' ').toLowerCase()||'Otro cargo')+
     (String(x.document_number||'').trim()?' '+String(x.document_number).trim():'')+' · '+money(amount));
  }
 }
 const balance=Math.round((opening+totalDebits-totalCredits)*100)/100;
 const formatTotal=balance>0.009?'*SALDO A PAGAR: '+money(balance)+'*':
  balance<-.009?'*SALDO A FAVOR: '+money(-balance)+'*':'*SALDO FINAL: $0,00*';
 return [
  '*SPANISH · CUENTA CORRIENTE*',
  '*Proveedor:* '+supplierName,
  period,
  '',
  'Saldo inicial: '+money(opening),
  '',
  '*FACTURAS (fecha · número · importe)*',
  ...(invoices.length?invoices:['Sin facturas en el período.']),
  ...(otherCharges.length?['','*OTROS CARGOS*',...otherCharges]:[]),
  '',
  '*PAGOS Y NOTAS DE CRÉDITO*',
  ...(credits.length?credits:['Sin pagos registrados en el período.']),
  '',
  '*RESUMEN*',
  'Saldo inicial: '+money(opening),
  'Facturas y cargos: +'+money(totalDebits),
  'Pagos y créditos: -'+money(totalCredits),
  formatTotal,
  ...(missingNumbers?['','S/N = factura cuyo número no está registrado en Spanish.']:[])
 ].join('\n');
}

async function supplierStatementExport(id,format='copy'){
 const box=document.getElementById('stmtResult');
 const s=sups.find(x=>x.id===id);
 if(!box||!s||box.dataset.valid!=='1'||box.dataset.statementSupplier!==id)return A('Primero generá un extracto válido.');
 const mode=box.dataset.statementMode||'DATES',anchor=box.dataset.statementAnchor||'';
 const from=document.getElementById('stmtFrom')?.value||'';
 const to=document.getElementById('stmtTo')?.value||'9999-12-31';
 if(from&&to&&from>to)return A('Revisá el período.');
 const all=supplierChronologicalMovements(id);
 let opening=0,selected=[];
 if(mode==='LAST'&&anchor){
  const i=all.findIndex(x=>x.id===anchor);
  if(i<0)return A('El último pago seleccionado ya no está disponible.');
  opening=all.slice(0,i).reduce((sum,x)=>sum+supplierSignedAmount(x),0);
  selected=all.slice(i).filter(x=>x.movement_date<=to)
 }else{
  opening=all.filter(x=>!from||x.movement_date<from).reduce((sum,x)=>sum+supplierSignedAmount(x),0);
  selected=all.filter(x=>(!from||x.movement_date>=from)&&(!to||x.movement_date<=to))
 }
 let running=opening,debeTotal=0,haberTotal=0;
 const rows=selected.map(x=>{
  const credit=['PAGO','NOTA_CREDITO'].includes(x.movement_type);
  const debe=credit?0:Number(x.amount||0),haber=credit?Number(x.amount||0):0;
  debeTotal+=debe;haberTotal+=haber;running+=debe-haber;
  return [x.movement_date,x.document_number||x.movement_type.replaceAll('_',' '),debe,haber,running,supplierPaymentAllocationDescription(x)]
 });
 const period=(mode==='LAST'?'Desde último pago':'Desde '+(from?fmt(from):'inicio'))+' · Hasta '+(to==='9999-12-31'?'hoy':fmt(to));
 if(format==='csv'){
  const cell=value=>{let v=String(value??'');if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
  const csvRows=[
   [cell('Proveedor'),cell(s.name)],
   [cell('Período'),cell(period)],
   [cell('Saldo inicial'),opening.toFixed(2)],
   [cell('Fecha'),cell('Comprobante'),cell('Debe'),cell('Haber'),cell('Saldo'),cell('Imputaciones de pago')],
   ...rows.map(r=>[cell(r[0]),cell(r[1]),r[2].toFixed(2),r[3].toFixed(2),r[4].toFixed(2),cell(r[5])]),
   [cell('TOTALES'),cell(''),debeTotal.toFixed(2),haberTotal.toFixed(2),running.toFixed(2),cell('')]
  ].map(r=>r.join(';'));
  const url=URL.createObjectURL(new Blob(['\ufeff'+csvRows.join('\r\n')],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download='Extracto_'+String(s.name).replace(/[^a-z0-9_-]+/gi,'_')+'_'+localISODate()+'.csv';
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  return
 }
 const msg=supplierStatementWhatsAppText(s.name,period,opening,selected);
 try{
  await navigator.clipboard.writeText(msg);
  A('Extracto copiado. Podés pegarlo en WhatsApp.')
 }catch(e){
  const ta=document.createElement('textarea');
  ta.value=msg;ta.style.cssText='position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta);ta.focus();ta.select();
  const copied=document.execCommand('copy');ta.remove();
  if(copied)A('Extracto copiado. Podés pegarlo en WhatsApp.');
  else window.prompt('Copiá el extracto:',msg)
 }
}


function decimalInputValue(n){
 if(n===null||n===undefined||n==='')return '';
 let v=Number(n);
 if(!Number.isFinite(v))return String(n);
 return v.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})
}
function normalizeCuit(v){return String(v||'').replace(/\D/g,'')}
function normText(v){
 return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()
}
function arDate(v){
 let s=String(v||'').trim(),m;
 if((m=s.match(/^(\d{4})(\d{2})(\d{2})$/)))return m[1]+'-'+m[2]+'-'+m[3];
 if((m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)))return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
 if((m=s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/)))return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
 return ''
}
function moneyValues(v){
 let out=[],re=/(?:\$|ARS)?\s*(-?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\d+(?:,\d{2}))/g,m;
 while((m=re.exec(String(v||'')))!==null){
  let n=parseAmount(m[1]);if(Number.isFinite(n)&&n>0)out.push(n)
 }
 return out
}
function extractVerifiedTotal(text){
 let lines=String(text||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);

 // Casos fuertes: TOTAL / IMPORTE TOTAL / TOTAL A PAGAR con importe en la misma línea.
 for(let l of lines){
  if(/SUBTOTAL|TOTAL\s+IVA|TOTAL\s+NETO|TOTAL\s+GRAVADO/i.test(l))continue;
  if(/\b(?:IMPORTE\s+TOTAL|TOTAL\s+A\s+PAGAR|TOTAL\s+FACTURA|TOTAL)\b/i.test(l)){
   let vals=moneyValues(l);
   if(vals.length)return vals[vals.length-1]
  }
 }

 // Encabezados contables en una línea y valores en la siguiente:
 // SUBTOTAL ... IVA ... TOTAL -> tomar el último importe de la línea siguiente.
 for(let i=0;i<lines.length-1;i++){
  if(/\bTOTAL\b/i.test(lines[i])&&/(SUBTOTAL|IVA|IIBB|IMP\.?\s*INT|DTO)/i.test(lines[i])){
   for(let j=i+1;j<=Math.min(i+2,lines.length-1);j++){
    let vals=moneyValues(lines[j]);
    if(vals.length>=2)return vals[vals.length-1]
   }
  }
 }
 return 0
}

function matchSupplierFromText(text,preferredSupplier=''){
 let raw=String(text||''),digits=raw.replace(/\D/g,''),nt=normText(raw);

 // 1. CUIT: prioridad máxima.
 for(let s of sups){
  let c=normalizeCuit(s.cuit);
  if(c&&digits.includes(c))return s.id
 }
 for(let a of supAliases.filter(x=>x.alias_type==='CUIT')){
  let c=normalizeCuit(a.alias);
  if(c&&digits.includes(c))return a.supplier_id
 }

 // 2. Alias/nombre.
 let names=supAliases.filter(x=>x.alias_type==='NAME').slice().sort((a,b)=>normText(b.alias).length-normText(a.alias).length);
 for(let a of names){
  let n=normText(a.alias);
  if(n.length>=5&&nt.includes(n))return a.supplier_id
 }
 for(let s of sups){
  let n=normText(s.name);
  if(n.length>=5&&nt.includes(n))return s.id
 }

 // 3. Si se abrió desde la cuenta de un proveedor, usarlo sólo como respaldo.
 if(preferredSupplier&&sups.some(s=>s.id===preferredSupplier))return preferredSupplier;
 return ''
}
function parseBillIdentity(text,preferredSupplier=''){
 let raw=String(text||''),compact=raw.replace(/\s+/g,' '),date='',doc='';
 let lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);

 // Fecha de emisión solamente; ignorar vencimiento/CAE.
 for(let l of lines){
  if(/VTO|VENC|CAE|PAGO/i.test(l))continue;
  let dm=l.match(/(?:FECHA(?:\s+DE\s+EMISI[ÓO]N)?|EMISI[ÓO]N)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}|\d{8})/i);
  if(dm){date=arDate(dm[1]);if(date)break}
 }
 if(!date){
  for(let l of lines.slice(0,18)){
   if(/VTO|VENC|CAE/i.test(l))continue;
   let dm=l.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})\b/);
   if(dm){date=arDate(dm[1]);if(date)break}
  }
 }

 let nm=compact.match(/(?:FACTURA|COMPROBANTE|TICKET|FC)\s*(?:A|B|C)?\s*(?:N[°ºO]?|NUMERO|NRO)?\s*[:#-]?\s*(\d{4,5}\s*[-–]\s*\d{6,8})/i);
 if(!nm)nm=compact.match(/\b(?:NRO|NUMERO|N[°ºO]?)\s*[:#-]?\s*(\d{4,5}\s*[-–]\s*\d{6,8})/i);
 if(nm)doc=nm[1].replace(/\s/g,'').replace('–','-');

 return {
  supplier:matchSupplierFromText(raw,preferredSupplier),
  date,
  doc,
  total:extractVerifiedTotal(raw),
  raw
 }
}

async function ensureJsQR(){
 if(window.jsQR)return true;
 await new Promise((resolve,reject)=>{
  let existing=document.querySelector('script[data-spanish-qr="1"]');
  if(existing){
   if(window.jsQR)return resolve();
   existing.addEventListener('load',resolve,{once:true});
   existing.addEventListener('error',()=>reject(new Error('No se pudo cargar el lector QR.')),{once:true});
   return
  }
  let s=document.createElement('script');
  s.dataset.spanishQr='1';
  s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
  s.async=true;
  s.onload=resolve;
  s.onerror=()=>reject(new Error('No se pudo cargar el lector QR.'));
  document.head.appendChild(s)
 });
 if(!window.jsQR)throw new Error('El lector QR no quedó disponible.');
 return true
}
function decodeBase64Url(s){
 let x=String(s||'').replace(/-/g,'+').replace(/_/g,'/');
 while(x.length%4)x+='=';
 let bin=atob(x),bytes=new Uint8Array(bin.length);
 for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
 return new TextDecoder('utf-8').decode(bytes)
}

function fiscalInvoiceType(code){
 let n=Number(code);
 return [1,6,11,51,201,206,211].includes(n)
}
function fiscalTypeLabel(code){
 let m={
  1:'Factura A',6:'Factura B',11:'Factura C',51:'Factura M',
  201:'Factura de Crédito MiPyMEs A',206:'Factura de Crédito MiPyMEs B',211:'Factura de Crédito MiPyMEs C'
 };
 return m[Number(code)]||('Comprobante ARCA tipo '+String(code??''))
}
function parseFiscalQrData(data){
 try{
  let raw=String(data||'').trim(),payload='',sourceUrl='';
  if(/^https?:/i.test(raw)){
   let u=new URL(raw);
   sourceUrl=u.toString();
   payload=u.searchParams.get('p')||u.searchParams.get('P')||''
  }else{
   let m=raw.match(/[?&]p=([^&]+)/i);
   payload=m?decodeURIComponent(m[1]):raw
  }
  if(!payload)return null;

  let j;
  try{j=JSON.parse(decodeBase64Url(payload))}
  catch(_e){
   try{j=JSON.parse(decodeURIComponent(payload))}
   catch(_e2){return null}
  }
  if(!j||typeof j!=='object'||Array.isArray(j))return null;

  let ver=Number(j.ver??j.version??0);
  let cuit=normalizeCuit(j.cuit||'');
  let pto=Number(j.ptoVta??j.pto_vta??0);
  let tipoCmp=Number(j.tipoCmp??j.tipo_cmp??0);
  let nro=Number(j.nroCmp??j.nro_cmp??0);
  // El QR debe indicar pesos y centavos exactos. Nunca redondear importes
  // de tres o más decimales al guardarlos como NUMERIC(14,2).
  const qrAmountSource=String(j.importe??'').trim();
  const qrAmountIsExact=/^\d+(?:\.\d{1,2})?$/.test(qrAmountSource);
  let importe=qrAmountIsExact?Number(qrAmountSource):NaN;
  let fecha=String(j.fecha||'');
  let moneda=String(j.moneda||'PES').toUpperCase();
  let ctz=Number(j.ctz??1);
  let doc='';

  if(!/^\d{11}$/.test(cuit))return null;
  if(!(pto>0&&Number.isInteger(pto)))return null;
  if(!(tipoCmp>0&&Number.isInteger(tipoCmp)))return null;
  if(!(nro>0&&Number.isInteger(nro)))return null;
  if(!(Number.isFinite(importe)&&importe>0))return null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha))return null;
  if(ver && ver!==1)return null;

  let ptoWidth=pto>9999?5:4;
  doc=String(pto).padStart(ptoWidth,'0')+'-'+String(nro).padStart(8,'0');

  return {
   qr:true,
   arcaVerified:true,
   cuit,
   supplier:matchSupplierFromQrCuit(cuit),
   date:fecha,
   doc,
   total:importe,
   ptoVta:pto,
   nroCmp:nro,
   tipoCmp,
   tipoLabel:fiscalTypeLabel(tipoCmp),
   isInvoice:fiscalInvoiceType(tipoCmp),
   currency:moneda,
   exchangeRate:Number.isFinite(ctz)&&ctz>0?ctz:1,
   sourceUrl,
   rawQr:j
  }
 }catch(_e){return null}
}
function matchSupplierFromQrCuit(cuit){
 let c=normalizeCuit(cuit);
 if(!c)return '';
 let direct=sups.find(s=>normalizeCuit(s.cuit)===c);
 if(direct)return direct.id;
 let alias=supAliases.find(a=>a.alias_type==='CUIT'&&normalizeCuit(a.alias)===c);
 return alias?.supplier_id||''
}

async function loadImageSource(file){
 // createImageBitmap is fast on Chrome/Android; <img> fallback is safer on Safari/iPhone/HEIC-compatible browsers.
 if('createImageBitmap' in window){
  try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(_e){}
 }
 return await new Promise((resolve,reject)=>{
  let img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};
  img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('El teléfono no pudo abrir esta imagen. Probá JPG/PNG o elegí la foto desde Galería.'))};
  img.src=u
 })
}
function sourceSize(src){
 return {w:src.width||src.naturalWidth||0,h:src.height||src.naturalHeight||0}
}
function closeImageSource(src){try{if(src&&typeof src.close==='function')src.close()}catch(_e){}}
function canvasFromSource(src,x0=0,y0=0,x1=1,y1=1,maxSide=2600,minScale=1){
 let {w,h}=sourceSize(src);
 if(!w||!h)throw new Error('La imagen no tiene dimensiones válidas.');
 let sx=Math.max(0,Math.floor(w*x0)),sy=Math.max(0,Math.floor(h*y0));
 let sw=Math.max(1,Math.floor(w*(x1-x0))),sh=Math.max(1,Math.floor(h*(y1-y0)));
 let scale=Math.min(1,maxSide/Math.max(sw,sh));
 scale=Math.max(minScale,scale);
 let c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});
 c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));
 ctx.drawImage(src,sx,sy,sw,sh,0,0,c.width,c.height);
 return c
}
function improveDocumentCanvas(canvas,strong=false){
 let c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});
 c.width=canvas.width;c.height=canvas.height;
 ctx.drawImage(canvas,0,0);
 let im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
 for(let i=0;i<d.length;i+=4){
  let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
  let low=strong?70:55, high=strong?205:220;
  let v=g<=low?0:g>=high?255:Math.round((g-low)/(high-low)*255);
  d[i]=d[i+1]=d[i+2]=v
 }
 ctx.putImageData(im,0,0);
 return c
}
function scanQrCanvasJs(canvas){
 try{
  if(!window.jsQR)return '';
  let ctx=canvas.getContext('2d',{willReadFrequently:true});
  let im=ctx.getImageData(0,0,canvas.width,canvas.height);
  let qr=jsQR(im.data,im.width,im.height,{inversionAttempts:'attemptBoth'});
  return qr?.data||''
 }catch(_e){return ''}
}
async function scanQrCanvasNative(canvas){
 try{
  if(!('BarcodeDetector' in window))return '';
  let formats=await BarcodeDetector.getSupportedFormats();
  if(!formats.includes('qr_code'))return '';
  let detector=new BarcodeDetector({formats:['qr_code']});
  let found=await detector.detect(canvas);
  return found?.[0]?.rawValue||''
 }catch(_e){return ''}
}
async function scanQrCanvasRobust(canvas){
 // Native detector first: much stronger on mobile camera photos.
 let native=await scanQrCanvasNative(canvas);
 if(native)return native;

 // jsQR fallback on full image, then dedicated high-resolution regions.
 await ensureJsQR();
 let d=scanQrCanvasJs(canvas);
 if(d)return d;

 let regions=[
  [0,.35,.62,1], [.38,.35,1,1],
  [0,.55,.55,1], [.45,.55,1,1],
  [0,0,.62,.62], [.38,0,1,.62]
 ];
 for(let r of regions){
  let sx=Math.floor(canvas.width*r[0]),sy=Math.floor(canvas.height*r[1]);
  let sw=Math.max(1,Math.floor(canvas.width*(r[2]-r[0])));
  let sh=Math.max(1,Math.floor(canvas.height*(r[3]-r[1])));
  let crop=document.createElement('canvas'),ctx=crop.getContext('2d',{willReadFrequently:true});
  let scale=Math.min(4,2200/Math.max(sw,sh));scale=Math.max(1.5,scale);
  crop.width=Math.max(1,Math.round(sw*scale));crop.height=Math.max(1,Math.round(sh*scale));
  ctx.drawImage(canvas,sx,sy,sw,sh,0,0,crop.width,crop.height);
  d=await scanQrCanvasNative(crop); if(d)return d;
  d=scanQrCanvasJs(crop); if(d)return d;
  let bw=improveDocumentCanvas(crop,true);
  d=scanQrCanvasJs(bw); if(d)return d
 }
 return ''
}
async function readFiscalQrFromImage(file){
 let src=null;
 try{
  src=await loadImageSource(file);
  // Keep more resolution for QR than the old implementation.
  let c=canvasFromSource(src,0,0,1,1,3600,1);
  let data=await scanQrCanvasRobust(c);
  return data?parseFiscalQrData(data):null
 }catch(_e){return null}
 finally{closeImageSource(src)}
}
async function readFiscalQrFromPdfPage(page){
 try{
  await ensureJsQR();
  let viewport=page.getViewport({scale:2.2});
  let c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});
  c.width=Math.ceil(viewport.width);c.height=Math.ceil(viewport.height);
  await page.render({canvasContext:ctx,viewport}).promise;
  let data=await scanQrCanvasRobust(c);
  return data?parseFiscalQrData(data):null
 }catch(_e){return null}
}
async function ensureTesseract(){
 if(window.Tesseract)return true;
 await new Promise((resolve,reject)=>{
  let existing=document.querySelector('script[data-spanish-ocr="1"]');
  if(existing){
   if(window.Tesseract)return resolve();
   existing.addEventListener('load',resolve,{once:true});
   existing.addEventListener('error',()=>reject(new Error('No se pudo cargar el lector de imágenes.')),{once:true});
   return
  }
  let s=document.createElement('script');
  s.dataset.spanishOcr='1';
  s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  s.async=true;
  s.onload=resolve;
  s.onerror=()=>reject(new Error('No se pudo cargar el lector de imágenes.'));
  document.head.appendChild(s)
 });
 if(!window.Tesseract)throw new Error('El lector OCR no quedó disponible.');
 return true
}
async function ensurePdfJs(){
 if(window.pdfjsLib)return true;
 await new Promise((resolve,reject)=>{
  let existing=document.querySelector('script[data-spanish-pdf="1"]');
  if(existing){
   if(window.pdfjsLib)return resolve();
   existing.addEventListener('load',resolve,{once:true});
   existing.addEventListener('error',()=>reject(new Error('No se pudo cargar el lector de PDF.')),{once:true});
   return
  }
  let s=document.createElement('script');
  s.dataset.spanishPdf='1';
  s.src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  s.async=true;
  s.onload=resolve;
  s.onerror=()=>reject(new Error('No se pudo cargar el lector de PDF.'));
  document.head.appendChild(s)
 });
 if(!window.pdfjsLib)throw new Error('El lector PDF no quedó disponible.');
 pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
 return true
}
function groupPdfLines(items){
 let rows=[];
 for(let it of items){
  let t=String(it.str||'').trim();
  if(!t)continue;
  let x=Number(it.transform?.[4]||0),y=Number(it.transform?.[5]||0);
  let row=rows.find(r=>Math.abs(r.y-y)<3);
  if(!row){row={y,items:[]};rows.push(row)}
  row.items.push({x,t})
 }
 rows.sort((a,b)=>b.y-a.y);
 return rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.t).join(' ').replace(/\s+/g,' ').trim())
}
async function pdfToImageBlob(page){
 let viewport=page.getViewport({scale:1.8});
 let c=document.createElement('canvas'),ctx=c.getContext('2d');
 c.width=Math.ceil(viewport.width);c.height=Math.ceil(viewport.height);
 await page.render({canvasContext:ctx,viewport}).promise;
 return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('No se pudo renderizar el PDF.')),'image/jpeg',.92))
}

async function readPdfDocument(file,status){
 await ensurePdfJs();
 let data=new Uint8Array(await file.arrayBuffer());
 let pdf=await pdfjsLib.getDocument({data}).promise;
 let all=[],bestTotal=0,maxPages=Math.min(pdf.numPages,5),firstPage=null,qrData=null;
 for(let p=1;p<=maxPages;p++){
  if(status)status.textContent='Leyendo PDF… página '+p+' de '+maxPages;
  let page=await pdf.getPage(p);
  if(p===1){
   firstPage=page;
   if(status)status.textContent='Buscando QR fiscal…';
   qrData=await readFiscalQrFromPdfPage(page)
  }
  let tc=await page.getTextContent();
  let lines=groupPdfLines(tc.items||[]);
  all.push(lines.join('\n'));
  let t=extractVerifiedTotal(lines.join('\n'));
  if(t>0)bestTotal=t
 }
 let text=all.join('\n--- PÁGINA ---\n');

 if(text.replace(/\s/g,'').length<80&&firstPage){
  if(status)status.textContent='PDF escaneado: leyendo imagen…';
  await ensureTesseract();
  let blob=await pdfToImageBlob(firstPage);
  let rr=await Tesseract.recognize(blob,'spa');
  text=rr?.data?.text||text;
  bestTotal=extractVerifiedTotal(text)
 }
 return {text,total:qrData?.total||bestTotal,qrData}
}


async function canvasToBlob(canvas,type='image/png',quality=.92){
 return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo preparar la imagen.')),type,quality))
}
function parseHeaderIdentityStrict(text){
 let raw=String(text||''),lines=raw.split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 let date='',doc='';

 // Only accept date when tied to Fecha/Emisión in header.
 for(let l of lines){
  if(/VTO|VENC|CAE/i.test(l))continue;
  let m=l.match(/(?:FECHA(?:\s+DE\s+EMISI[ÓO]N)?|EMISI[ÓO]N)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}|\d{8})/i);
  if(m){date=arDate(m[1]);if(date)break}
 }

 // Only accept voucher number when it has the 4/5 + 6/8 digit fiscal pattern.
 let compact=raw.replace(/\s+/g,' ');
 let nm=compact.match(/(?:FACTURA|COMPROBANTE|TICKET|FC)\s*(?:A|B|C)?\s*(?:N[°ºO]?|NRO|NUMERO)?\s*[:#-]?\s*(\d{4,5}\s*[-–]\s*\d{6,8})/i);
 if(!nm)nm=compact.match(/\b(?:NRO|NUMERO|N[°ºO]?)\s*[:#-]?\s*(\d{4,5}\s*[-–]\s*\d{6,8})/i);
 if(nm)doc=nm[1].replace(/\s/g,'').replace('–','-');

 return {date,doc}
}
function extractTotalStrict(text){
 let lines=String(text||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 for(let i=0;i<lines.length;i++){
  let l=lines[i];
  if(/SUBTOTAL|TOTAL\s+(?:IVA|NETO|GRAVADO)/i.test(l))continue;
  if(/\b(?:IMPORTE\s+TOTAL|TOTAL\s+A\s+PAGAR|TOTAL\s+FACTURA|TOTAL)\b/i.test(l)){
   let vals=moneyValues(l);
   if(vals.length)return vals[vals.length-1];

   // Some OCR engines split label and amount into adjacent lines.
   for(let j=i+1;j<=Math.min(i+2,lines.length-1);j++){
    let next=moneyValues(lines[j]);
    if(next.length===1)return next[0]
   }
  }
 }
 return 0
}
async function ocrCanvas(canvas,lang='spa',opts={}){
 let blob=await canvasToBlob(canvas,'image/png');
 let rr=await Tesseract.recognize(blob,lang,opts);
 return {text:rr?.data?.text||'',confidence:Number(rr?.data?.confidence||0)}
}
async function readImageDocument(file,status){
 let qrData=null;
 try{
  if(status)status.textContent='Buscando QR fiscal…';
  qrData=await readFiscalQrFromImage(file)
 }catch(_e){}

 // QR fiscal y OCR de productos deben ejecutarse sobre la misma foto.
 let src=null;
 try{
  await ensureTesseract();
  src=await loadImageSource(file);

  // Si hay QR fiscal válido, se lee SOLO el cuerpo de artículos: los datos fiscales
  // ya vienen verificados en el QR, evitando OCR repetido del encabezado y del pie.
  if(qrData&&!fiscalQrErrorMessage(qrData)){
   if(status)status.textContent='QR reconocido. Leyendo productos, cantidades y precios…';
   const full=improveDocumentCanvas(canvasFromSource(src,0,0,1,1,2600,1.15),false);
   const result=await ocrCanvas(full,'spa',{tessedit_pageseg_mode:'3'});
   return {text:result.text||'',fullOcrText:result.text||'',total:qrData.total,
    qrData,headerDate:qrData.date,headerDoc:qrData.doc,ocrConfidence:{full:result.confidence||0}};
  }

  // Normalize once. Huge phone images reduce OCR quality and consume too much memory.
  let fullBase=canvasFromSource(src,0,0,1,1,2400,1);
  let full=improveDocumentCanvas(fullBase,false);

  // Header: supplier/CUIT/date/voucher.
  if(status)status.textContent=qrData?'QR leído. Verificando encabezado…':'Leyendo encabezado…';
  let headerBase=canvasFromSource(src,0,0,1,.43,2600,1.25);
  let header=improveDocumentCanvas(headerBase,false);
  let hr=await ocrCanvas(header,'spa',{tessedit_pageseg_mode:'6'});
  let hi=parseHeaderIdentityStrict(hr.text);

  // Footer: TOTAL only. We never use "largest amount" heuristics.
  if(status)status.textContent='Leyendo TOTAL al pie…';
  let footerBase=canvasFromSource(src,.20,.52,1,1,2800,1.35);
  let footer=improveDocumentCanvas(footerBase,true);
  let fr=await ocrCanvas(footer,'spa',{tessedit_pageseg_mode:'6'});
  let footerTotal=extractTotalStrict(fr.text);

  // Full OCR only to identify supplier aliases/CUIT and preserve extracted text.
  if(status)status.textContent='Identificando proveedor…';
  let ful=await ocrCanvas(full,'spa',{tessedit_pageseg_mode:'3'});
  let text=[hr.text,ful.text,'--- PIE DE BOLETA ---',fr.text].filter(Boolean).join('\n');

  return {
   text,fullOcrText:ful.text||'',
   total:qrData?.total||footerTotal||0,
   qrData,
   headerDate:qrData?.date||hi.date||'',
   headerDoc:qrData?.doc||hi.doc||'',
   ocrConfidence:{
    header:hr.confidence||0,
    full:ful.confidence||0,
    footer:fr.confidence||0
   }
  }
 }catch(e){
  if(qrData&&!fiscalQrErrorMessage(qrData))
   return {text:'',fullOcrText:'',total:qrData.total,qrData,
    headerDate:qrData.date,headerDoc:qrData.doc,ocrError:String(e?.message||e)};
  throw e
 }finally{closeImageSource(src)}
}




function stopFiscalQrScanner(){
 if(qrScanTimer){clearInterval(qrScanTimer);qrScanTimer=null}
 qrScanBusy=false;
 if(qrStream){
  try{qrStream.getTracks().forEach(t=>t.stop())}catch(_e){}
  qrStream=null
 }
}
function fiscalQrErrorMessage(q){
 if(!q)return 'No pude reconocer un QR fiscal válido.';
 if(!q.isInvoice)return 'El QR corresponde a '+q.tipoLabel+'. No se va a registrar automáticamente como factura.';
 if(String(q.currency||'PES').toUpperCase()!=='PES')return 'El comprobante está expresado en '+q.currency+'. Para no convertir moneda silenciosamente, cargalo manualmente.';
 if(!q.supplier)return 'El CUIT '+q.cuit+' no está vinculado a un proveedor activo. Primero cargá/corregí ese CUIT en el maestro de proveedores.';
 return ''
}
async function startFiscalQrScanner(){
 pendingFiscalQr=null;qrEvidenceFile=null;
 if(!navigator.mediaDevices?.getUserMedia){
  return A('Este navegador no permite escanear QR con cámara. Elegí Carga manual.')
 }
 try{
  M('<h3>Escanear QR fiscal ARCA</h3>'+
    '<p class="small muted">Apuntá solamente al QR. No hace falta fotografiar toda la factura.</p>'+
    '<div class="qr-scanner"><video id="qrVideo" autoplay muted playsinline></video><div class="qr-frame"></div></div>'+
    '<canvas id="qrCanvas" class="hide"></canvas>'+
    '<div id="qrLiveStatus" class="calc">Abriendo cámara…</div>'+
    '<div class="row" style="margin-top:10px"><button onclick="stopFiscalQrScanner();documentForm(billPreferredSupplier)">Cancelar</button></div>');

  qrStream=await navigator.mediaDevices.getUserMedia({
   audio:false,
   video:{
    facingMode:{ideal:'environment'},
    width:{ideal:1920},
    height:{ideal:1080}
   }
  });

  let v=document.getElementById('qrVideo');
  if(!v){stopFiscalQrScanner();return}
  v.srcObject=qrStream;
  await v.play();

  // Load JS fallback once. Native BarcodeDetector is used first when available.
  try{await ensureJsQR()}catch(_e){}

  let st=document.getElementById('qrLiveStatus');
  if(st)st.textContent='Buscando QR fiscal…';
  qrScanTimer=setInterval(scanFiscalQrFrame,350)
 }catch(e){
  stopFiscalQrScanner();
  M('<h3>No pude abrir la cámara</h3><div class="bad">'+esc(e.message||String(e))+'</div>'+
    '<p class="small muted">Volvé y elegí Carga manual para registrar esta factura.</p>'+
    '<button class="primary" onclick="documentForm(billPreferredSupplier)">Volver</button>')
 }
}
async function scanFiscalQrFrame(){
 if(qrScanBusy)return;
 let v=document.getElementById('qrVideo'),c=document.getElementById('qrCanvas');
 if(!v||!c||v.readyState<2)return;
 qrScanBusy=true;
 try{
  let vw=v.videoWidth||0,vh=v.videoHeight||0;
  if(!vw||!vh)return;
  let scale=Math.min(1,1500/Math.max(vw,vh));
  c.width=Math.max(1,Math.round(vw*scale));
  c.height=Math.max(1,Math.round(vh*scale));
  let ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(v,0,0,c.width,c.height);

  let raw=await scanQrCanvasNative(c);
  if(!raw&&window.jsQR)raw=scanQrCanvasJs(c);
  if(!raw)return;

  let q=parseFiscalQrData(raw);
  if(!q){
   let st=document.getElementById('qrLiveStatus');
   if(st)st.innerHTML='<span class="bad">QR leído, pero no corresponde al formato fiscal esperado.</span>';
   return
  }
  stopFiscalQrScanner();
  fiscalQrReview(q,null)
 }finally{qrScanBusy=false}
}
function openFiscalQrFile(){
 let x=document.getElementById('qrFiscalFile');
 if(!x)return;
 x.value='';x.click()
}
async function readFiscalQrOnlyFile(file){
 if(!file)return null;
 let isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name||'');
 let isImage=String(file.type||'').startsWith('image/');
 if(!isPdf&&!isImage)throw new Error('Usá una imagen o PDF.');
 if(isImage)return await readFiscalQrFromImage(file);

 await ensurePdfJs();
 let data=new Uint8Array(await file.arrayBuffer());
 let pdf=await pdfjsLib.getDocument({data}).promise;
 let max=Math.min(pdf.numPages,5);
 for(let i=1;i<=max;i++){
  let page=await pdf.getPage(i);
  let q=await readFiscalQrFromPdfPage(page);
  if(q)return q
 }
 return null
}
async function fiscalQrFileSelected(file){
 if(!file)return;
 qrEvidenceFile=file;
 M('<h3>Leer QR fiscal</h3><div class="calc" id="qrFileStatus">Buscando QR en '+esc(file.name||'archivo')+'…</div>');
 try{
  let q=await readFiscalQrOnlyFile(file);
  if(!q){
   return M('<h3>QR no encontrado</h3><div class="bad">No pude encontrar un QR fiscal válido en este archivo.</div>'+
    '<div class="row" style="margin-top:12px"><button class="primary" onclick="documentForm(billPreferredSupplier)">Volver</button></div>')
  }
  fiscalQrReview(q,file)
 }catch(e){
  M('<h3>No pude leer el QR</h3><div class="bad">'+esc(e.message||String(e))+'</div>'+
   '<div class="row" style="margin-top:12px"><button class="primary" onclick="documentForm(billPreferredSupplier)">Volver</button></div>')
 }
}
function fiscalQrReview(q,file=null){
 pendingFiscalQr=q;qrEvidenceFile=file||null;
 let err=fiscalQrErrorMessage(q);
 let s=sups.find(x=>x.id===q.supplier);
 let req=requestKey();

 if(err){
  M('<h3>QR fiscal leído</h3>'+
   '<div class="calc"><b>'+esc(q.tipoLabel||'Comprobante')+'</b><div class="small muted">CUIT '+esc(q.cuit||'')+' · '+esc(q.doc||'')+' · '+money(q.total)+'</div></div>'+
   '<div class="bad" style="margin-top:10px">'+esc(err)+'</div>'+
   '<div class="row" style="margin-top:12px"><button onclick="documentForm(billPreferredSupplier)">Volver</button></div>');
  return
 }

 M('<h3>Confirmar QR fiscal ARCA</h3>'+
  '<input id="qrReq" type="hidden" value="'+req+'">'+
  '<div class="qr-verified-banner"><b>✓ QR fiscal verificado</b><div class="small">Los datos siguientes provienen del QR, no de OCR.</div></div>'+
  '<label>Proveedor</label><input value="'+esc(s?.name||'')+'" readonly>'+
  '<label>CUIT</label><input value="'+esc(s?.cuit||q.cuit)+'" readonly>'+
  '<label>Tipo</label><input value="'+esc(q.tipoLabel)+'" readonly>'+
  '<label>Fecha</label><input value="'+esc(fmt(q.date))+'" readonly>'+
  '<label>Número de comprobante</label><input value="'+esc(q.doc)+'" readonly>'+
  '<label>Importe total</label><input value="'+esc(decimalInputValue(q.total))+'" readonly>'+
  '<div class="small muted" style="margin-top:8px">Punto de venta '+q.ptoVta+' · comprobante '+q.nroCmp+' · moneda '+esc(q.currency)+' · cotización '+esc(q.exchangeRate)+'</div>'+
  (file?'<div class="calc small" style="margin-top:10px">El archivo también quedará adjunto como evidencia.</div>':'')+
  '<div class="row" style="margin-top:14px"><button onclick="documentForm(billPreferredSupplier)">Cancelar</button><button id="qrSave" class="primary" onclick="saveFiscalQrBill()">Confirmar y guardar</button></div>')
}

/* Spanish / Boletas: QR fiscal primero, foto de ítems como evidencia del MISMO comprobante. */
let qrItemsCtx=null;
function qrItemsNext(message=''){
 const d=qrItemsCtx;if(!d)return documentForm();
 M('<h3>Factura fiscal · artículos</h3>'+
 '<div class="calc spanish-qr-confirm"><b>✓ QR fiscal confirmado</b><div>'+esc(d.doc)+' · '+money(d.total)+'</div>'+
 '<div class="small muted">Ya existe una sola factura. Ahora fotografiá los artículos.</div></div>'+
 (message?'<div class="small spanish-qr-note">'+esc(message)+'</div>':'')+
 (d.photo_attached&&d.photoFile?'<div class="calc small">✓ La foto original ya está vinculada a esta factura.</div>':'')+
 '<div class="spanish-qr-photo-actions">'+
 (d.photo_attached&&d.photoFile?'<button type="button" class="primary" onclick="qrItemsSelected(qrItemsCtx.photoFile)">↻ Releer la misma foto (sin duplicarla)</button>':'')+
 '<button type="button" class="primary" onclick="document.getElementById(\'qrItemsCamera\').click()">📷 Foto de artículos</button>'+
 '<button type="button" onclick="document.getElementById(\'qrItemsFile\').click()">Elegir foto o PDF</button>'+
 '<button type="button" onclick="qrItemsFinishPending()">Dejar artículos pendientes</button></div>'+
 '<input id="qrItemsCamera" type="file" accept="image/*" capture="environment" class="sr-file-input">'+
 '<input id="qrItemsFile" type="file" accept="image/*,application/pdf,.pdf" class="sr-file-input">');
 document.getElementById('qrItemsCamera')?.addEventListener('change',e=>qrItemsSelected(e.target.files?.[0]));
 document.getElementById('qrItemsFile')?.addEventListener('change',e=>qrItemsSelected(e.target.files?.[0]))
}
async function qrItemsFinishPending(){
 const d=qrItemsCtx;if(!d)return documentForm();
 qrItemsCtx=null;billPhotoFile=null;billOcrText='';billAutoProposal=null;
 await invOpenInvoice(d.supplier,d.invoice_id)
}
async function qrItemsSelected(file){
 const d=qrItemsCtx;if(!d||!file)return;
 const pdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name||'');
 if(!pdf&&!String(file.type||'').startsWith('image/'))return A('Usá una foto o PDF.');
 if(d.photo_attached&&d.photoFile!==file)return qrItemsNext('Ya se vinculó una foto. Podés releer el original sin crear otro adjunto.');
 M('<h3>Vinculando foto y leyendo artículos</h3><div class="calc" id="billPhotoStatus">Guardando la foto original…</div>');
 billPhotoFile=file;
 try{
  // Primero guardar original; al releerlo jamás generar otra evidencia.
  if(!d.photo_attached){
   await billAttachVerified(d.invoice_id,file);
   d.photo_attached=true;d.photoFile=file;
  }
  billPhotoFile=null;
 }catch(err){
  qrItemsNext('La foto NO quedó adjunta. Reintentá. '+String(err?.message||err));
  return
 }
 let ocr='';
 try{
  if(pdf){
   const r=await readPdfDocument(file,document.getElementById('billPhotoStatus'));
   ocr=r.text||''
  }else{
   await ensureTesseract();
   let source=await loadImageSource(file);
   try{
    let canvas=improveDocumentCanvas(canvasFromSource(source,0,0,1,1,2700,1.1),false);
    const r=await ocrCanvas(canvas,'spa',{tessedit_pageseg_mode:'3'});
    ocr=r.text||''
   }finally{closeImageSource(source)}
  }
  billOcrText=ocr;
  const draft={supplier:d.supplier,date:d.date,doc:d.doc,total:d.total,
    qrVerified:true,sourceType:pdf?'PDF':'IMAGEN',sourceName:file.name||'Foto',
    ocrLineText:ocr,raw:'Datos fiscales del QR · foto original vinculada.\n'+ocr};
  try{
   const catalog=await comprasApi();
   billAutoProposal=billPrepareProposal(draft,catalog)
  }catch(err){
   billAutoProposal={rows:[],catalog:null,error:'No se pudo consultar el catálogo: '+String(err?.message||err),can_post_all:false}
  }
  if(!(billAutoProposal.rows||[]).length){
   return qrItemsNext('Foto conservada en la factura. No se leyeron artículos suficientes: quedan pendientes, sin modificar costos.')
  }
  billReviewForm(draft)
 }catch(err){
  billOcrText=ocr;
  qrItemsNext('Foto conservada en la factura. La lectura falló; los artículos quedan pendientes.')
 }
}

async function saveFiscalQrBill(){
 const q=pendingFiscalQr;if(!q)return A('No hay un QR pendiente.');
 const error=fiscalQrErrorMessage(q);if(error)return A(error);
 const s=sups.find(x=>x.id===q.supplier);
 if(!s||normalizeCuit(s.cuit)!==normalizeCuit(q.cuit))return A('CUIT del proveedor no coincide con el QR.');
 busyBtn('qrSave',true,'Guardando…');
 try{
  // Idempotencia: no repetir boletas preexistentes del mismo proveedor y número.
  const prior=await sb.from('audit_supplier_movements').select('id,amount,qr_verified')
   .eq('supplier_id',s.id).eq('movement_type','FACTURA').eq('document_number',q.doc).limit(1);
  if(prior.error)throw Error(prior.error.message);
  const old=prior.data?.[0]||null;
  if(old&&Math.abs(Number(old.amount)-Number(q.total))>.02)
   throw Error('La factura ya existe con otro importe. Revisá el registro antes de continuar.');
  let invoiceId=old?.id||null;
  if(!invoiceId){
   const r=await sb.from('audit_supplier_movements').insert({
    supplier_id:s.id,movement_date:q.date,due_date:null,movement_type:'FACTURA',
    document_number:q.doc,amount:q.total,
    notes:'Carga automática desde QR fiscal ARCA.',request_key:qrReq.value,
    qr_verified:true,qr_scanned_at:new Date().toISOString(),qr_cuit:q.cuit,
    qr_pto_vta:q.ptoVta,qr_nro_cmp:q.nroCmp,qr_tipo_cmp:q.tipoCmp,
    qr_currency:q.currency,qr_exchange_rate:q.exchangeRate,qr_payload:q.rawQr
   }).select('id').single();
   if(r.error){
    if(requestDuplicate(r.error)||duplicateMsg(r.error)||r.error.code==='23505')
     throw Error('Este QR ya fue registrado. Consultá su factura, no lo cargues otra vez.');
    throw Error(r.error.message)
   }
   invoiceId=r.data.id
  }
  let warning='';
  if(qrEvidenceFile&&!old){
   try{await upload(null,invoiceId,[qrEvidenceFile])}
   catch(e){warning='El QR quedó registrado, pero su archivo adjunto requiere revisión.'}
  }
  qrItemsCtx=null;
  pendingFiscalQr=null;qrEvidenceFile=null;billPreferredSupplier='';
  X();await loadSuppliers();
  controlLoad(true);miDiaLoad();
  A((old?'Factura ya registrada, sin duplicar. ':'Factura registrada. ')+s.name+' · '+q.doc+' · '+money(q.total)+'.'+(warning?'\n'+warning:''))
 }catch(e){A('No se pudo completar: '+String(e?.message||e))}
 finally{busyBtn('qrSave',false)}
}


function openManualBill(){
 const section=document.getElementById('manualBillDetails');
 if(!section)return documentForm();
 section.open=true;
 section.scrollIntoView({block:'nearest',behavior:'auto'});
 const selected=document.getElementById('mbSupplier');
 const next=selected?.value?document.getElementById('mbDate'):selected;
 try{next?.focus({preventScroll:true})}catch(_e){}
}
function documentForm(id=''){
 qrItemsCtx=null;
 stopFiscalQrScanner();
 if(!sups.filter(x=>x.active).length)return A('Primero cargá al menos un proveedor.');
 billPhotoFile=null;billOcrText='';billPreferredSupplier=id||'';
 pendingFiscalQr=null;qrEvidenceFile=null;
 let selected=id||'';
 let s=sups.find(x=>x.id===selected);

 M('<div class="manual-bill-compact">'+
 '<div class="manual-bill-head"><h3>Cargar boleta</h3><div class="small muted">QR fiscal o carga manual.</div></div>'+
 '<div style="border:1px solid #d9e1e9;border-radius:14px;padding:13px;margin:12px 0;background:#f8fafc">'+
 '<button class="primary" type="button" style="width:100%;min-height:60px;font-weight:800" onclick="startFiscalQrScanner()">▣ QR con cámara</button>'+
 '<button type="button" style="width:100%;margin-top:9px;min-height:52px;font-weight:800" onclick="openFiscalQrFile()">▣ QR desde foto/PDF</button>'+
 '<button type="button" style="width:100%;margin-top:9px;min-height:52px;font-weight:800" onclick="openManualBill()">✎ Carga manual</button>'+


 ''+
 '</div>'+
 '<details id="manualBillDetails" style="margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:12px"><summary style="cursor:pointer;font-weight:700;padding:4px">✎ Formulario de carga manual</summary><div style="padding-top:12px">'+
 '<input id="mbReq" type="hidden" value="'+requestKey()+'">'+
 '<div class="manual-bill-fields">'+
   '<div class="manual-bill-field full"><label for="mbSupplier">Proveedor</label>'+
     '<select id="mbSupplier" onchange="manualBillSupplierChanged()"><option value="">Elegir proveedor…</option>'+supplierOptions(selected)+'</select>'+
     '<input type="hidden" id="mbCuit" value="'+esc(s?.cuit||'')+'">'+
     '<div id="mbCuitDisplay" class="manual-bill-cuit">'+(s?.cuit?'CUIT '+esc(s.cuit):'Seleccioná el proveedor para ver su CUIT')+'</div></div>'+
   '<div class="manual-bill-field"><label for="mbDate">Fecha de factura</label><input id="mbDate" type="date" value="'+localISODate()+'"></div>'+
   '<div class="manual-bill-field"><label for="mbDoc">Número de factura</label><input id="mbDoc" autocomplete="off" placeholder="0001-00014413" aria-describedby="mbDocHint"><div id="mbDocHint" class="manual-bill-hint">El guion se agrega automáticamente</div></div>'+
   '<div class="manual-bill-field full"><label for="mbAmount">Importe total ($)</label><input id="mbAmount" type="text" inputmode="decimal" autocomplete="off" placeholder="11.177,90"></div>'+
 '</div>'+
 '<details class="manual-bill-optional"><summary>Adjuntar foto/PDF o notas (opcional, sin lectura automática)</summary>'+
   '<div class="manual-bill-optional-body"><div class="small muted">Adjunto opcional.</div><div class="doc-actions"><button type="button" onclick="manualBillCamera()">📷 Adjuntar foto</button><button type="button" onclick="manualBillFile()">📎 Adjuntar PDF/archivo</button></div>'+
   '<div id="mbEvidence" class="small muted">Sin archivo adjunto.</div>'+
   '<label for="mbNotes">Observaciones</label><textarea id="mbNotes" rows="2" placeholder="Solo si necesitás agregar un dato"></textarea></div>'+
 '</details>'+
 '<input id="qrFiscalFile" type="file" accept="image/*,application/pdf,.pdf" class="sr-file-input">'+
 '<input id="mbCamera" type="file" accept="image/*" capture="environment" class="sr-file-input">'+
 '<input id="mbFile" type="file" accept="image/*,application/pdf,.pdf" class="sr-file-input">'+

 '<div class="manual-bill-savebar"><button id="mbSave" class="primary" type="button" onclick="saveManualBill()">Guardar boleta manual</button></div>'+
 '</div></details>'+
 '</div>');

 const qrFile=document.getElementById('qrFiscalFile');
 const cam=document.getElementById('mbCamera'),fi=document.getElementById('mbFile');
 qrFile?.addEventListener('change',()=>fiscalQrFileSelected(qrFile.files&&qrFile.files[0]));
 cam.addEventListener('change',()=>manualBillEvidenceSelected(cam.files&&cam.files[0]));
 fi.addEventListener('change',()=>manualBillEvidenceSelected(fi.files&&fi.files[0]))
}
function photoBillForm(id=''){documentForm(id)}
function manualBillSupplierChanged(){
 let id=document.getElementById('mbSupplier')?.value||'';
 let s=sups.find(x=>x.id===id);
 let c=document.getElementById('mbCuit');
 if(c)c.value=s?.cuit||'';
 let display=document.getElementById('mbCuitDisplay');
 if(display)display.textContent=s?.cuit?'CUIT '+s.cuit:'Proveedor sin CUIT cargado'
}
function manualBillCamera(){
 let x=document.getElementById('mbCamera');
 if(!x)return;x.value='';x.click()
}
function manualBillFile(){
 let x=document.getElementById('mbFile');
 if(!x)return;x.value='';x.click()
}
function manualBillEvidenceSelected(file){
 if(!file)return;
 billPhotoFile=file;
 let box=document.getElementById('mbEvidence');
 if(box)box.innerHTML='Adjunto: <b>'+esc(file.name||'Foto tomada')+'</b> · '+Math.round((file.size||0)/1024)+' KB'
}
async function saveManualBill(){
 let sid=document.getElementById('mbSupplier')?.value||'';
 let s=sups.find(x=>x.id===sid);
 let date=document.getElementById('mbDate')?.value||'';
 let doc=(document.getElementById('mbDoc')?.value||'').trim();
 let amount=parseAmount(document.getElementById('mbAmount')?.value||'');
 let notes=(document.getElementById('mbNotes')?.value||'').trim();
 let req=document.getElementById('mbReq')?.value||requestKey();

 if(!s)return A('Elegí el proveedor.');
 // Facturas manuales admitidas aunque el proveedor aún no tenga CUIT cargado.
 if(!date)return A('Ingresá la fecha de la factura.');
 if(!doc)return A('Ingresá el número de factura.');
 if(!(amount>0))return A('Ingresá un importe total válido.');

 busyBtn('mbSave',true);
 try{
  let r=await sb.from('audit_supplier_movements').insert({
   supplier_id:s.id,
   movement_date:date,
   due_date:null,
   movement_type:'FACTURA',
   document_number:doc,
   amount,
   notes:notes||'Carga manual.',
   request_key:req
  }).select().single();

  if(r.error){
   if(requestDuplicate(r.error))return A('Esta boleta ya había sido procesada.');
   if(duplicateMsg(r.error))return A('Ese número de factura ya está cargado para '+s.name+'. No se puede duplicar.');
   return A(r.error.message)
  }

  let attachmentWarning='';
  if(billPhotoFile){
   try{await upload(null,r.data.id,[billPhotoFile])}
   catch(e){attachmentWarning=' Atención: no se pudo adjuntar el archivo; la factura SÍ quedó registrada y no debés volver a cargarla.'}
  }
  billPhotoFile=null;billPreferredSupplier='';
  X();await loadSuppliers();
  controlLoad(true);miDiaLoad();
  A('Factura registrada.'+attachmentWarning);
 }finally{busyBtn('mbSave',false)}
}
function photoBillForm(id=''){documentForm(id)}
async function pasteDocumentFromClipboard(){
 let preferred=billPreferredSupplier||'';
 let drop=document.getElementById('docDrop');
 try{
  if(!navigator.clipboard?.read)throw new Error('Pegá con Ctrl+V dentro del recuadro.');
  let items=await navigator.clipboard.read();
  for(let item of items){
   let type=item.types.find(t=>t.startsWith('image/')||t==='application/pdf');
   if(type){
    let blob=await item.getType(type);
    let ext=type==='application/pdf'?'.pdf':'.'+(type.split('/')[1]||'jpg');
    let f=new File([blob],'comprobante'+ext,{type});
    return documentSelected(f,preferred)
   }
  }
  throw new Error('El portapapeles no contiene una foto o PDF.');
 }catch(e){
  if(drop)drop.focus();
  A((e.message||'No pude leer el portapapeles.')+' También podés presionar Ctrl+V dentro del recuadro.')
 }
}

function openBillReadCamera(){const el=document.getElementById('billReadCamera');if(el){el.value='';el.click()}}
function openBillReadFile(){const el=document.getElementById('billReadFile');if(el){el.value='';el.click()}}

let billInboxRequestKey='',billInboxSavedId='',billInboxFailure=null;
async function billReadFailed(p,missing){
 const file=billPhotoFile,fields=Array.isArray(missing)?missing:[];
 billInboxFailure={p,missing:fields};
 if(!file){M('<h3>Lectura incompleta</h3><p>No se registró ninguna factura.</p>'+
 '<button class="primary" onclick="openBillReadCamera()">Sacar otra foto</button>');return}
 M('<h3>Guardando foto</h3><p>Conservando el original sin generar deuda…</p>');
 try{
  if(!billInboxRequestKey)billInboxRequestKey=requestKey();
  const start=await comprasApi('photo_inbox_start',{
   request_key:billInboxRequestKey,file_name:String(file.name||'foto.jpg'),
   mime_type:file.type,file_size:file.size,supplier_id:p?.supplier||null,
   issues:fields,ocr_preview:String(p?.ocrLineText||p?.raw||'').slice(0,8000)
  });
  if(start.status==='PENDIENTE_REVISION'){billInboxSavedId=start.id;billPhotoPendingDone();return}
  if(start.status!=='UPLOAD_PENDING'||!start.path||!start.upload_token)
   throw Error('No se pudo preparar el archivo.');
  let completed=false;
  try{
   const done=await comprasApi('photo_inbox_complete',{id:start.id});
   completed=done.status==='PENDIENTE_REVISION';
  }catch(err){if(!String(err?.message||err).includes('upload_not_verified'))throw err}
  if(!completed){
   const up=await sb.storage.from('audit-evidence').uploadToSignedUrl(start.path,start.upload_token,file,{contentType:file.type});
   if(up.error)throw Error(up.error.message||'Falló la carga');
   const done=await comprasApi('photo_inbox_complete',{id:start.id});
   completed=done.status==='PENDIENTE_REVISION';
  }
  if(!completed)throw Error('La foto aún no fue confirmada.');
  billInboxSavedId=start.id;billPhotoPendingDone()
 }catch(err){
  M('<h3>No se pudo guardar la foto</h3><p>No se creó ninguna deuda ni factura.</p>'+
  '<div class="small bad">'+esc(String(err?.message||err))+'</div>'+
  '<div style="display:grid;gap:9px;margin-top:15px">'+
  '<button class="primary" type="button" onclick="billReadFailed(billInboxFailure.p,billInboxFailure.missing)">Reintentar guardar</button>'+
  '<button type="button" onclick="openBillReadCamera()">Otra foto</button></div>')
 }
}
function billPhotoPendingDone(){
 M('<h3>Foto recibida</h3><p>Guardada en pendientes. No se generó ninguna factura ni se cambiaron los costos.</p>'+
 '<div style="display:grid;gap:9px;margin-top:16px">'+
 '<button type="button" class="primary" onclick="billPhotoInboxList()">Ver pendientes</button>'+
 '<button type="button" onclick="documentForm()">Otra boleta</button></div>')
}
async function billPhotoInboxList(){
 M('<h3>Fotos pendientes</h3><p class="small muted">Comprobantes pendientes, sin asientos contables.</p>'+
 '<div id="photoInboxRows">Cargando…</div>');
 try{
  const r=await comprasApi('photo_inbox_list'),host=document.getElementById('photoInboxRows');
  if(!host)return;
  host.innerHTML=(r.photos||[]).length?(r.photos||[]).map(x=>
   '<div style="padding:12px 0;border-bottom:1px solid #e3e8ef">'+
   '<b>'+esc(x.original_filename)+'</b><div class="small muted">'+
   esc(new Date(x.created_at).toLocaleDateString('es-AR'))+' · '+
   (x.status==='PENDIENTE_REVISION'?'Para revisar':'Subida incompleta')+'</div>'+
   (x.status==='PENDIENTE_REVISION'?'<button type="button" style="margin-top:8px" data-id="'+esc(x.id)+
    '" onclick="billPhotoInboxView(this.dataset.id)">Ver foto original</button>':'')+'</div>').join(''):
   '<p>No hay fotos pendientes.</p>'
 }catch(e){const host=document.getElementById('photoInboxRows');if(host)host.textContent='No se pudo consultar la bandeja.'}
}
async function billPhotoInboxView(id){
 const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;
 try{
  const r=await comprasApi('photo_inbox_view',{id});
  if(!/^https:\/\//i.test(String(r.url||'')))throw Error('Enlace inválido');
  if(tab)tab.location.replace(r.url);else window.location.assign(r.url)
 }catch(e){if(tab)tab.close();A('No se pudo abrir el archivo: '+(e.message||String(e)))}
}

function billPhotoReviewWithoutOcr(){
 if(!billPhotoFile)return A('Seleccioná una foto o PDF.');
 return billReadFailed({supplier:billPreferredSupplier||'',ocrLineText:billOcrText||''},['lectura incompleta'])
}
async function documentSelected(file,preferredSupplier=''){
 if(!file)return;
 preferredSupplier=preferredSupplier||billPreferredSupplier||'';
 let isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name||'');
 let isImage=String(file.type||'').startsWith('image/');
 if(!isPdf&&!isImage)return A('Formato no admitido. Usá una foto o un PDF.');
 billPhotoFile=file;billInboxRequestKey=requestKey();billInboxSavedId='';billInboxFailure=null;
 M('<h3>Leyendo boleta</h3><div class="calc" id="billPhotoStatus">Leyendo foto…</div>');
 let st=document.getElementById('billPhotoStatus');
 if(st)st.innerHTML='Archivo: <b>'+esc(file.name||'comprobante')+'</b><br>Preparando lectura…';
 try{
  let r=isPdf?await readPdfDocument(file,st):await readImageDocument(file,st);
  billOcrText=r.text||'';
  if(!billOcrText.trim()&&!r.qrData)throw new Error('No pude extraer datos del comprobante.');

  let p=parseBillIdentity(billOcrText,preferredSupplier);

  if(r.qrData&&!fiscalQrErrorMessage(r.qrData)){
   if(r.qrData.supplier)p.supplier=r.qrData.supplier;
   if(r.qrData.date)p.date=r.qrData.date;
   if(r.qrData.doc)p.doc=r.qrData.doc;
   if(r.qrData.total>0)p.total=r.qrData.total;
   p.qrVerified=true
  }else if(isImage){
   // For camera photos, date/voucher come only from strict header parsing.
   p.date=r.headerDate||'';
   p.doc=r.headerDoc||'';
   p.total=r.total||0;
   p.ocrConfidence=r.ocrConfidence||{};
   p.ocrAssisted=true
  }else if(r.total>0){
   p.total=r.total
  }

  p.sourceType=isPdf?'PDF':'IMAGEN';
  p.sourceName=file.name||'comprobante';
  p.ocrLineText=r.fullOcrText||r.text||'';
  p.ocrReadError=r.ocrError||'';
  try{
   const catalog=await comprasApi();
   billAutoProposal=billPrepareProposal(p,catalog)
  }catch(err){
   billAutoProposal={rows:[],catalog:null,error:'No se pudo consultar el catálogo: '+String(err?.message||err),raw:p.ocrLineText||'',can_post_all:false}
  }
  const missing=[];
  if(!p.supplier)missing.push('proveedor');
  if(!p.date)missing.push('fecha');
  if(!p.doc)missing.push('número');
  if(!(Number(p.total)>0))missing.push('total');
  const rows=billAutoProposal?.rows||[];
  if(!rows.length)missing.push('artículos');
  const hasCatalog=billAutoProposal?.catalog?.products?.length>0;
  const allMatched=hasCatalog&&rows.length&&rows.every(x=>x.match_id&&x.ingredient_id);
  const safePackages=allMatched&&rows.every(x=>{
    const product=billAutoProposal.catalog.products.find(y=>y.id===x.match_id);
    return product&&Number(product.units_per_pack)===1
  });
  const rowsTotal=rows.reduce((sum,x)=>sum+Number(x.line_total_final||0),0);
  if(rows.length&&!allMatched)missing.push('artículos sin identificar');
  if(allMatched&&!safePackages)missing.push('presentaciones');
  if(rows.length&&Number(p.total)>0&&Math.abs(rowsTotal-Number(p.total))>.02)missing.push('total sin conciliar');
  // Las fotos que no se puedan procesar COMPLETAS van a la bandeja, no al registro de facturas.
  if(missing.length){await billReadFailed(p,missing);return}
  billReviewForm(p)
 }catch(e){
  await billReadFailed({ocrLineText:billOcrText||'',raw:String(e?.message||e)},['lectura incompleta'])
 }
}


/* Extracción de renglones: nunca actualiza precios por coincidencias ambiguas. */
let billAutoProposal=null;
function billNorm(t){
 return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')
}
function billNum(t){
 t=String(t||'').trim().replace(/\$/g,'').replace(/\s/g,'');
 if(!t||!/^[0-9][0-9.,]*$/.test(t))return NaN;
 return parseAmount(t)
}
function billExtractItemRows(text,catalog=null,supplierId=''){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 const result=[],matchedLines=new Set();
 const excluded=/\b(subtotal|importe total|total factura|total a pagar|iva|iibb|percepci|vencimiento|cuit|cae|neto gravado|saldo|fecha emisi|comprobante|cliente|domicilio|entregados|recibidos)\b/i;
 for(let idx=0;idx<lines.length;idx++){
  const line=lines[idx];if(excluded.test(line))continue;
  const m=line.match(/^(.{4,125}?)\s+(\d+(?:[.,]\d{1,3})?)\s*(?:UN|U|UND|KG|KGS|LT|LTS|CJ|PZ)?\s+\$?\s*(\d[\d.,]*)\s+\$?\s*(\d[\d.,]*)\s*$/i);
  if(!m)continue;
  const description=m[1].replace(/^\d{3,14}\s+/,'').trim();
  const qty=billNum(m[2]),unit=billNum(m[3]),lineTotal=billNum(m[4]);
  if(description.length<4||!Number.isFinite(qty)||qty<=0||qty>100000||
   !Number.isFinite(unit)||unit<=0||!Number.isFinite(lineTotal)||lineTotal<=0)continue;
  if(Math.abs(qty*unit-lineTotal)>Math.max(.03,lineTotal*.002))continue;
  result.push({description,quantity:qty,unit_cost_final:Math.round(lineTotal/qty*10000)/10000,
   line_total_final:Math.round(lineTotal*100)/100,match_id:'',ingredient_id:'',state:'SIN_VINCULO'});
  matchedLines.add(idx);
  if(result.length>=120)return result
 }
 // Rescate supervisado: identificar productos aunque la foto tenga columnas corridas o IVA.
 const ingredients=new Map((catalog?.ingredients||[]).map(x=>[x.id,x]));
 const names=(catalog?.products||[]).filter(p=>p.active&&p.supplier_id===supplierId)
  .map(p=>ingredients.get(p.ingredient_id)?.name||'').filter(Boolean);
 const distinct=[...new Set(names)].map(name=>({name,norm:billNorm(name),
  tokens:billNorm(name).split(' ').filter(x=>x.length>2)}))
  .filter(x=>x.tokens.length).sort((a,b)=>b.tokens.length-a.tokens.length);
 for(let idx=0;idx<lines.length&&result.length<120;idx++){
  if(matchedLines.has(idx)||excluded.test(lines[idx]))continue;
  const flat=lines[idx].normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const words=billNorm(flat).split(' ');
  const match=distinct.find(x=>x.tokens.every(t=>words.includes(t)));
  if(!match)continue;
  const marker=flat.toLowerCase().indexOf(match.norm);
  let after=marker>=0?flat.slice(marker+match.norm.length):flat;
  after=after.replace(/\b0\s+(\d{2})(?=\s+\d{3,})/g,'0.$1');
  const pair=after.match(/(?:^|\s)(\d+(?:[.,]\d{1,3})?)\s+(\d{2,}(?:[.,]\d{2})?)(?=\s|$)/);
  let qty=0,unit=0;
  if(pair){qty=billNum(pair[1]);unit=billNum(pair[2])}
  if(!Number.isFinite(qty)||qty<0||qty>10000)qty=0;
  if(!Number.isFinite(unit)||unit<0||unit>100000000)unit=0;
  const total=qty&&unit?Math.round(qty*unit*100)/100:0;
  result.push({description:match.name,quantity:qty||0,unit_cost_final:unit||0,
   line_total_final:total,match_id:'',ingredient_id:'',state:'REVISAR_OCR',
   ocr_review:true,source_line:lines[idx].slice(0,180)});
 }
 return result
}
function billMatchItemRows(rows,catalog,supplierId){
 const products=(catalog?.products||[]).filter(x=>x.active&&x.supplier_id===supplierId);
 const items=new Map((catalog?.ingredients||[]).map(x=>[x.id,x]));
 return rows.map(line=>{
  const txt=billNorm(line.description),words=txt.split(' ');
  const matches=[];
  for(const p of products){
   const item=items.get(p.ingredient_id);if(!item)continue;
   const name=billNorm(item.name),tokens=name.split(' ').filter(x=>x.length>2);
   if(name.length<4)continue;
   const exact=txt===name||txt.startsWith(name+' ')||txt.endsWith(' '+name)||txt.includes(' '+name+' ');
   const complete=tokens.length>1&&tokens.every(t=>words.includes(t));
   if(exact||complete)matches.push(p)
  }
  if(matches.length===1){
   const p=matches[0];
   return {...line,match_id:p.id,ingredient_id:p.ingredient_id,state:'VINCULADO'}
  }
  return {...line,match_id:'',ingredient_id:'',state:matches.length?'AMBIGUO':'SIN_COINCIDENCIA'}
 })
}
function billPrepareProposal(p,catalog){
 const extracted=billExtractItemRows(p.ocrLineText||'',catalog,p.supplier||'');
 // Solo distribuir IVA cuando el importe de IVA está leído y la conciliación es exacta.
 // El costo final por renglón debe incluir impuestos para CMV.
 const taxLine=String(p.ocrLineText||'').split(/\r?\n/).find(x=>/\biva\b/i.test(x)&&/\d+(?:[.,]\d+)?\s*%/.test(x));
 const tax=taxLine?.match(/(?:10[.,]5|21|27)\s*%\s+([\d.,]+)/i);
 const taxAmount=tax?billNum(tax[1]):0;
 const sum=extracted.reduce((s,x)=>s+Number(x.line_total_final||0),0);
 const grand=Number(p.total||0);
 const autoTax=extracted.length&&extracted.every(x=>Number(x.quantity)>0)&&
  taxAmount>0&&sum>0&&grand>0&&Math.abs(sum+taxAmount-grand)<=.02;
 if(autoTax){
  let assigned=0;
  extracted.forEach((x,i)=>{
   const gross=i===extracted.length-1?Math.round((grand-assigned)*100)/100:
    Math.round((x.line_total_final+x.line_total_final/sum*taxAmount)*100)/100;
   assigned+=gross;x.line_total_final=gross;x.unit_cost_final=Math.round(gross/x.quantity*10000)/10000
  })
 }
 return {rows:billMatchItemRows(extracted,catalog,p.supplier||''),catalog,
  raw:p.ocrLineText||'',error:'',ocr_total_rows:extracted.length,qr_verified:!!p.qrVerified}
}
function billRemapProposal(){
 if(!billAutoProposal?.catalog)return billReviewLines();
 const supplier=document.getElementById('brSupplier')?.value||'';
 billAutoProposal.rows=billMatchItemRows(billAutoProposal.rows.map(x=>({...x,match_id:'',ingredient_id:''})),billAutoProposal.catalog,supplier);
 billReviewLines()
}
function billReviewLines(){
 const host=document.getElementById('brLines');if(!host||!billAutoProposal)return;
 const proposal=billAutoProposal,rows=proposal.rows||[];
 const products=(proposal.catalog?.products||[]).filter(p=>p.supplier_id===(document.getElementById('brSupplier')?.value||'')&&p.active);
 const total=billNum(document.getElementById('brTotal')?.value||'');
 const sum=rows.reduce((acc,x)=>acc+Number(x.line_total_final||0),0);
 const linked=rows.filter(x=>x.match_id&&x.ingredient_id).length;
 const packSafe=rows.every(x=>{
  const p=(proposal.catalog?.products||[]).find(p=>p.id===x.match_id);
  return p&&Number(p.units_per_pack)===1;
 });
 const balanced=rows.length>0&&linked===rows.length&&rows.every(x=>Number(x.quantity)>0&&Number(x.line_total_final)>0)&&total>0&&Math.abs(sum-total)<=.02&&packSafe;
 proposal.can_post_all=balanced;
 host.innerHTML='<div class="calc" style="margin:12px 0"><b>Artículos: '+linked+' de '+rows.length+' vinculados</b>'+
 '<div class="small muted">Importe final de artículos (con impuestos) '+money(sum)+' · Total de boleta '+(total>0?money(total):'sin verificar')+'</div>'+(rows.some(x=>x.ocr_review)?'<div class="small muted">Revisá cantidad e importe de los artículos detectados: el OCR no pudo validar todas las columnas.</div>':'')+
 '<div class="small '+(balanced?'ok':'muted')+'">'+(balanced?'Detalle conciliado.':'Detalle por verificar.')+'</div></div>'+
 (proposal.error?'<p class="small bad">'+esc(proposal.error)+'</p>':'')+
 (rows.length?'<div class="table"><table><thead><tr><th>Artículo leído</th><th>Cantidad</th><th>Total</th><th>Producto del proveedor</th></tr></thead><tbody>'+
 rows.map((x,i)=>'<tr><td>'+esc(x.description)+'</td><td><input type="text" inputmode="decimal" data-br-qty="'+i+'" aria-label="Cantidad" style="min-width:62px;max-width:88px" value="'+esc(decimalInputValue(x.quantity||0))+'"></td>'+'<td><input type="text" inputmode="decimal" data-br-total="'+i+'" aria-label="Importe final con impuestos" style="min-width:85px;max-width:120px" value="'+esc(decimalInputValue(x.line_total_final||0))+'"></td>'+
 '<td><select data-br-match="'+i+'" style="min-width:115px;max-width:200px"><option value="">Sin identificar</option>'+
 products.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===x.match_id?'selected':'')+'>'+
 esc((proposal.catalog.ingredients||[]).find(t=>t.id===p.ingredient_id)?.name||'Producto')+' · '+esc(p.presentation)+'</option>').join('')+
 '</select></td></tr>').join('')+'</tbody></table></div>':
 '<p class="small muted">No se encontraron artículos confiables.</p>');
 const button=document.getElementById('brSave');
 if(button){button.textContent=balanced?'Confirmar artículos y actualizar stock':'Artículos pendientes de revisión';button.disabled=!balanced;
 button.setAttribute('aria-label',balanced?'Confirmar factura y productos':'Lectura incompleta: no se puede registrar')}

}
function billSelectMatch(e){
 const el=e.target.closest('[data-br-match],[data-br-qty],[data-br-total]');if(!el||!billAutoProposal)return;
 const i=Number(el.dataset.brMatch??el.dataset.brQty??el.dataset.brTotal),row=billAutoProposal.rows[i];if(!row)return;
 if(el.hasAttribute('data-br-match')){
  const p=(billAutoProposal.catalog?.products||[]).find(x=>x.id===el.value);
  row.match_id=p?.id||'';row.ingredient_id=p?.ingredient_id||'';
 }else if(el.hasAttribute('data-br-qty')){
  const v=parseAmount(el.value);if(!Number.isFinite(v)||v<=0)return A('Ingresá una cantidad válida.');
  row.quantity=v;row.unit_cost_final=row.line_total_final/v;
 }else{
  const v=parseAmount(el.value);if(!Number.isFinite(v)||v<=0)return A('Ingresá un importe final válido.');
  row.line_total_final=v;row.unit_cost_final=row.quantity>0?v/row.quantity:0;
 }
 billReviewLines()
}

function billReviewForm(p){
 const opts='<option value="">Elegir proveedor…</option>'+supplierOptions(p.supplier||'');
 const totalAuto=+p.total>0,req=requestKey(),qr=!!p.qrVerified,qrLocked=!!qrItemsCtx;
 M('<h3>Revisar boleta</h3><input id="brReq" type="hidden" value="'+req+'">'+
 '<div class="calc"><b>'+(qr?'QR verificado':'Lectura de foto')+'</b>'+
 (!qr?'<div class="small muted">Revisá los datos.</div>':'')+'</div>'+
 '<label>Proveedor</label><select id="brSupplier" onchange="billRemapProposal()" '+(qrLocked?'disabled':'')+'>'+opts+'</select>'+
 (!p.supplier?'<div class="small bad">Elegí el proveedor.</div>':!qr?'<div class="small muted">Confirmá el proveedor.</div>':'')+
 '<label>Fecha</label><input id="brDate" type="date" '+(qrLocked?'readonly':'')+' value="'+esc(p.date||'')+'">'+(!p.date?'<div class="small bad">Falta fecha.</div>':'')+
 '<label>Número</label><input id="brDoc" '+(qrLocked?'readonly':'')+' value="'+esc(p.doc||'')+'">'+(!p.doc?'<div class="small bad">Falta número.</div>':'')+
 '<label>Total</label><input id="brTotal" '+(qrLocked?'readonly':'')+' oninput="billReviewLines()" type="text" inputmode="decimal" autocomplete="off" value="'+esc(totalAuto?decimalInputValue(p.total):'')+'">'+
 (!totalAuto?'<div class="small bad">Falta importe.</div>':'')+
 '<div class="small muted" style="margin-top:10px">Se registra únicamente la factura: sin movimientos de stock ni modificaciones de costos.</div>'+
 '<details style="margin-top:12px"><summary class="small muted">Observaciones y datos leídos</summary>'+
 '<label>Observaciones</label><textarea id="brNotes">Cargada desde '+esc(p.sourceType==='PDF'?'PDF':'foto')+'.</textarea>'+
 '<pre style="white-space:pre-wrap;font-size:11px;max-height:220px;overflow:auto">'+esc((p.raw||'').slice(0,16000))+'</pre></details>'+
 '<button id="brSave" class="primary" style="width:100%;margin-top:12px;min-height:56px" onclick="savePhotoBill(true)">Guardar boleta · sin stock</button>'+
 (qrLocked?'<button type="button" style="width:100%;margin-top:9px" onclick="qrItemsNext()">↻ Volver a lectura de foto</button>'+
 '<button type="button" style="width:100%;margin-top:9px" onclick="qrItemsFinishPending()">Terminar con artículos pendientes</button>':''));
 const list=document.getElementById('brLines');
 if(list)list.addEventListener('change',billSelectMatch);
 billReviewLines()
}

let billPhotoAttachRetry=null;
async function billAttachVerified(id,file){
 if(!id||!file)return;
 const safeName=String(file.name||'foto.jpg').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100);
 const path='prov/'+crypto.randomUUID()+'-'+safeName;
 const uploaded=await sb.storage.from('audit-evidence').upload(path,file,{contentType:file.type||'application/octet-stream'});
 if(uploaded.error)throw Error('No se pudo guardar la imagen: '+uploaded.error.message);
 const link=await sb.from('audit_evidence').insert({
  supplier_movement_id:id,file_name:String(file.name||safeName).slice(0,190),
  storage_path:path,mime_type:file.type||'application/octet-stream',file_size:file.size||0
 }).select('id').single();
 if(link.error)throw Error('Foto cargada pero no vinculada a boleta: '+link.error.message);
 return link.data.id
}
async function billFinishPhoto(id,successText){
 const source=billPhotoFile;
 let problem='';
 if(source){
  try{await billAttachVerified(id,source)}catch(err){
   problem=String(err?.message||err);
   billPhotoAttachRetry={invoice_id:id,file:source}
  }
 }
 if(!problem)billPhotoAttachRetry=null;
 billPhotoFile=null;billOcrText='';billAutoProposal=null;billPreferredSupplier='';
 X();await loadSuppliers();controlLoad(true);miDiaLoad();
 if(problem){
  M('<h3>Boleta registrada · adjunto pendiente</h3><p>'+esc(successText)+'</p>'+
    '<div class="bad">'+esc(problem)+'</div>'+
    '<p class="small muted">Los datos ya están guardados. No vuelvas a registrar la factura. Solo reintentá adjuntar la foto.</p>'+
    '<button type="button" class="primary" onclick="billRetryAttach()">Reintentar adjuntar foto</button>')
 }else A(successText)
}
async function billRetryAttach(){
 const r=billPhotoAttachRetry;if(!r)return A('No hay foto pendiente.');
 try{await billAttachVerified(r.invoice_id,r.file);billPhotoAttachRetry=null;X();A('Foto vinculada a la factura existente.')}
 catch(e){A('El adjunto sigue pendiente: '+(e.message||String(e)))}
}

async function savePhotoBill(onlyInvoice=true){
 const supplier=brSupplier.value,doc=brDoc.value.trim(),date=brDate.value;
 const amount=parseAmount(brTotal.value);
 if(qrItemsCtx&&(qrItemsCtx.supplier!==supplier||qrItemsCtx.doc!==doc||qrItemsCtx.date!==date||Math.abs(qrItemsCtx.total-amount)>.02))return A('Los datos fiscales no coinciden con el QR.');
 if(!supplier||!doc||!date||amount<=0)return A('No hay datos suficientes. No se guardó la boleta.');
 billReviewLines();
 if(!onlyInvoice&&!billAutoProposal?.can_post_all)return A('El detalle no coincide con la factura. No se registró deuda ni stock.');
 busyBtn('brSave',true);
 try{
  const prior=await sb.from('audit_supplier_movements')
   .select('id,amount').eq('supplier_id',supplier).eq('movement_type','FACTURA').eq('document_number',doc)
   .order('created_at',{ascending:false}).limit(1);
  if(prior.error)throw Error(prior.error.message);
  const old=prior.data?.[0]||null;
  if(qrItemsCtx&&old?.id!==qrItemsCtx.invoice_id)throw Error('No coincide la factura del QR. No se agregó mercadería.');
  if(old&&Math.abs(Number(old.amount)-amount)>.02)throw Error('Esta factura ya figura con otro importe. No se duplicó.');
  const proposal=billAutoProposal;
  const ready=!onlyInvoice&&!!proposal?.can_post_all&&Array.isArray(proposal.rows)&&proposal.rows.length>0;
  if(ready){
   const products=proposal.catalog?.products||[];
   const lines=proposal.rows.map(x=>{
    const offer=products.find(p=>p.id===x.match_id);
    return {ingredient_id:x.ingredient_id,supplier_product_id:x.match_id,quantity:x.quantity,
     unit_cost_final:x.unit_cost_final,update_unit_price:offer&&Number(offer.units_per_pack)===1}
   });
   const result=await comprasApi('invoice_receipt',{supplier_id:supplier,
    request_key:brReq.value,existing_invoice_id:qrItemsCtx?.invoice_id||old?.id||null,create_invoice:!qrItemsCtx&&!old,
    document_type:'FACTURA',document_number:doc,document_date:date,document_total:amount,
    due_date:null,partial_document:false,
    source_kind:proposal.qr_verified?'FACTURA_QR':'MANUAL',
    notes:(brNotes.value||'').trim().slice(0,500),lines});
   const invoiceId=result.invoice_id||old?.id;
   qrItemsCtx=null;
   await billFinishPhoto(invoiceId,'Factura fiscal e ítems conciliados en un único comprobante.');
   return
  }
  if(old){
   await billFinishPhoto(old.id,'Esta factura ya estaba registrada. Se conservó la foto y NO se duplicó la deuda; los costos quedan pendientes de verificar.');
   return
  }
  const r=await sb.from('audit_supplier_movements').insert({
   supplier_id:supplier,movement_date:date,due_date:null,movement_type:'FACTURA',
   document_number:doc,amount,notes:(brNotes.value||'').trim()||'Foto leída; artículos por revisar.',
   request_key:brReq.value,qr_verified:!!proposal?.qr_verified
  }).select().single();
  if(r.error){
   if(requestDuplicate(r.error)||duplicateMsg(r.error))return A('La factura ya estaba registrada; no se duplicó.');
   throw Error(r.error.message)
  }
  await billFinishPhoto(r.data.id,'Factura registrada. El detalle de artículos todavía requiere comprobación: los costos NO se modificaron y aparecen pendientes en Mercadería.')
 }catch(e){A('No se pudo completar: '+(e.message||String(e))+'. La foto sigue disponible para revisar.')}
 finally{busyBtn('brSave',false)}
}
function invoiceEditForm(id){
 let x=mov.find(v=>v.id===id&&v.movement_type==='FACTURA');
 if(!x)return A('No encontré la boleta.');
 M('<h3>Editar boleta</h3>'+
 '<p class="small muted">Los cambios afectan la cuenta corriente inmediatamente.</p>'+
 '<label>Fecha</label><input id="ieDate" type="date" value="'+esc(x.movement_date||'')+'">'+
 '<label>Número de comprobante</label><input id="ieDoc" value="'+esc(x.document_number||'')+'">'+
 '<label>Importe total</label><input id="ieAmount" type="text" inputmode="decimal" value="'+esc(decimalInputValue(x.amount))+'">'+
 '<label>Observaciones</label><textarea id="ieNotes">'+esc(x.notes||'')+'</textarea>'+
 '<button id="ieSave" class="primary" style="width:100%;margin-top:12px" onclick="saveInvoiceEdit(\''+id+'\')">Guardar cambios</button>'+ '<button type="button" style="width:100%;margin-top:9px" onclick="supplierInvoiceCreditForm(\''+id+'\')">Incorporar nota de crédito o faltante</button>')
}
async function saveInvoiceEdit(id){
 let x=mov.find(v=>v.id===id&&v.movement_type==='FACTURA');
 if(!x)return A('No encontré la boleta.');
 let doc=ieDoc.value.trim(),amount=parseAmount(ieAmount.value);
 if(!ieDate.value)return A('Ingresá la fecha.');
 if(!doc)return A('Ingresá el número de comprobante.');
 if(amount<=0)return A('Ingresá un importe válido.');
 let row={movement_date:ieDate.value,document_number:doc,amount,notes:ieNotes.value||null};
 busyBtn('ieSave',true);
 try{
  let r=await sb.from('audit_supplier_movements').update(row).eq('id',id).eq('movement_type','FACTURA').select().single();
  if(r.error){
   if(duplicateMsg(r.error))return A('Ya existe una boleta con ese número para este proveedor.');
   return A(r.error.message)
  }
  await sb.from('audit_supplier_movement_history').insert({
   movement_id:id,supplier_id:x.supplier_id,action:'EDIT',before_data:x,after_data:r.data
  });
  X();await loadSuppliers()
 }finally{busyBtn('ieSave',false)}
}

async function removeMovementEvidence(ids){
 // Protección intencional: los comprobantes originales nunca se eliminan automáticamente.
 return;
}
function movementTypeLabel(x){
 return {
  FACTURA:'boleta',PAGO:'pago',NOTA_CREDITO:'nota de crédito',
  NOTA_DEBITO:'nota de débito',AJUSTE:'ajuste'
 }[x?.movement_type]||'movimiento'
}
async function deleteSupplierMovement(id){
 let x=mov.find(v=>v.id===id);
 if(!x)return A('No encontré el movimiento.');
 let s=sups.find(v=>v.id===x.supplier_id),label=movementTypeLabel(x);
 let detail=(x.document_number?' '+x.document_number:'')+' por '+money(x.amount);
 if(!confirm('¿Eliminar '+label+detail+' de '+(s?.name||'este proveedor')+'?\n\nNo se permitirá borrar si hay evidencia adjunta.'))return;
 try{
  const evidence=await sb.from('audit_evidence').select('id',{count:'exact',head:true}).eq('supplier_movement_id',id);
  if(evidence.error)return A('No pude verificar los adjuntos. Borrado bloqueado por seguridad.');
  if(Number(evidence.count||0)>0)return A('Este movimiento tiene fotos o documentos originales. Para preservar la trazabilidad, no se permite eliminarlo. Usá un ajuste contable auditado.');
  let r=await sb.rpc('audit_delete_supplier_movement',{p_movement_id:id,p_reason:'Eliminado manualmente desde Spanish Auditoría'});
  if(r.error)return A(r.error.message);
  X();await loadSuppliers()
 }catch(e){A(e.message||String(e))}
}
async function deleteInvoice(id){return deleteSupplierMovement(id)}
async function deleteSupplier(id){
 let s=sups.find(v=>v.id===id);if(!s)return A('Proveedor no encontrado.');
 let items=mov.filter(v=>v.supplier_id===id),count=items.length,balance=bal(id);
 let msg='¿Eliminar proveedor '+s.name+'?';
 if(count)msg+='\n\nTambién se eliminarán '+count+' movimiento(s) de su cuenta corriente'+(Math.abs(balance)>.009?' y su saldo actual '+money(balance):'')+'.';
 msg+='\n\nEl borrado queda auditado.';
 if(!confirm(msg))return;
 try{
  if(items.length)await removeMovementEvidence(items.map(v=>v.id));
  let r=await sb.rpc('audit_delete_supplier',{p_supplier_id:id,p_delete_movements:true,p_reason:'Eliminado manualmente desde Spanish Auditoría'});
  if(r.error)return A(r.error.message);
  X();await loadSuppliers()
 }catch(e){A(e.message||String(e))}
}
function movementForm(id,t){
 M('<h3>Movimiento proveedor</h3><input id="ms" type="hidden" value="'+id+'"><input id="mrq" type="hidden" value="'+requestKey()+'"><label>Tipo</label><select id="mt"><option>'+t+'</option><option>FACTURA</option><option>NOTA_CREDITO</option><option>NOTA_DEBITO</option><option>AJUSTE</option></select><label>Fecha</label><input id="md" type="date" value="'+localISODate()+'"><label>Número</label><input id="mn"><label>Importe</label><input id="ma" type="text" inputmode="decimal" placeholder="Ej. 38.288,64"><label>Observaciones</label><textarea id="mnotes"></textarea><label>Adjunto</label><input id="mf" type="file" accept="image/*,application/pdf,.pdf" multiple><button id="mSave" class="primary" onclick="saveMovement()">Guardar</button>')
}

async function saveMovement(){
 let amount=parseAmount(ma.value);
 if(amount<=0)return A('Ingresá un importe mayor a cero.');
 if(mt.value==='FACTURA'&&!mn.value.trim())return A('Ingresá el número de comprobante.');
 busyBtn('mSave',true);
 try{
  let r=await sb.from('audit_supplier_movements').insert({
   supplier_id:ms.value,movement_date:md.value,due_date:null,movement_type:mt.value,
   document_number:mn.value.trim()||null,amount,notes:mnotes.value||null,request_key:mrq.value
  }).select().single();
  if(r.error){
   if(requestDuplicate(r.error))return A('Este movimiento ya había sido procesado.');
   if(duplicateMsg(r.error))return A('Ese comprobante ya está cargado para este proveedor. No se puede duplicar.');
   return A(r.error.message)
  }
  if(mf.files.length)await upload(null,r.data.id,[...mf.files]);
  X();await loadSuppliers()
 }finally{busyBtn('mSave',false)}
}

function supplierAllocationInputs(supplierId,paymentId=''){
 const all=mov.filter(x=>x.supplier_id===supplierId&&x.movement_type==='FACTURA')
   .slice().sort((a,b)=>String(a.movement_date).localeCompare(String(b.movement_date))||String(a.created_at).localeCompare(String(b.created_at)));
 const previous=supplierAllocations.filter(a=>a.payment_id===paymentId);
 const previousMap=new Map(previous.map(a=>[a.invoice_id,Math.round(Number(a.amount||0)*100)]));
 const rows=all.map(inv=>{
  const confirmedOther=supplierAllocations.filter(a=>a.invoice_id===inv.id&&a.payment_id!==paymentId)
    .reduce((s,a)=>s+Math.round(Number(a.amount||0)*100),0);
  const credited=supplierInvoiceCredits.filter(x=>x.invoice_id===inv.id&&!x.reversed_by_movement_id)
    .reduce((sum,l)=>{const m=mov.find(x=>x.id===l.credit_movement_id);return sum+Math.round(Number(m?.amount||0)*100)},0);
  const maxCents=Math.max(0,Math.round(Number(inv.amount||0)*100)-confirmedOther-credited);
  if(maxCents<=0&&!previousMap.has(inv.id))return '';
  const assigned=Math.min(maxCents,previousMap.get(inv.id)||0),selected=assigned>0;
  return '<div class="supplier-alloc-card" data-alloc-card style="border:1px solid #dbe4eb;border-radius:10px;padding:9px;margin:7px 0;background:'+(selected?'#edf8f0':'#fff')+'">'+
   '<button type="button" data-alloc-pick style="width:100%;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:55px;border:0;background:transparent;cursor:pointer"'+
   ' aria-pressed="'+(selected?'true':'false')+'" onclick="supplierAllocationToggle(this)">'+
   '<span style="font-size:20px;min-width:26px" data-alloc-check>'+(selected?'☑':'☐')+'</span>'+
   '<span style="flex:1"><b>'+esc(inv.document_number||'Factura sin número')+'</b>'+
   '<span class="small muted" style="display:block">'+fmt(inv.movement_date)+' · Original '+money(inv.amount)+'</span>'+
   '<span class="small" style="display:block">Pendiente disponible: <b>'+money(maxCents/100)+'</b></span></span>'+
   '<span class="small" data-alloc-result style="min-width:95px;text-align:right">'+(selected?'Queda '+money((maxCents-assigned)/100):'Tocar para descontar')+'</span></button>'+
   '<div data-alloc-edit style="'+(selected?'':'display:none;')+'margin:4px 0 0 34px">'+
   '<label style="font-size:12px">Importe a descontar de esta boleta</label>'+
   '<input aria-label="Imputar a boleta '+esc(inv.document_number||'sin número')+'" data-alloc-invoice="'+inv.id+
   '" data-alloc-max="'+(maxCents/100).toFixed(2)+'" type="number" inputmode="decimal" step="0.01" min="0" max="'+(maxCents/100).toFixed(2)+
   '" style="max-width:180px" value="'+(assigned?(assigned/100).toFixed(2):'')+'" oninput="supplierAllocationEdit(this)"></div></div>'
 }).filter(Boolean).join('');
 return '<section style="border:1px solid #dbe4eb;border-radius:12px;padding:12px;margin:12px 0">'+
 '<h4 style="margin:0 0 6px">Elegí las boletas para descontar</h4>'+
 '<div class="small muted">Tocá cada boleta: se suma el importe pendiente hasta cubrir el pago. Si alcanza sólo para una parte, la última queda parcialmente paga con su saldo real. Podés ajustar cualquier importe antes de guardar.</div>'+
 (rows||'<div class="small muted">No hay boletas pendientes disponibles.</div>')+
 '<div id="allocationSum" class="calc" role="status" aria-live="polite" style="margin-top:10px">Sin boletas seleccionadas</div></section>'
}
function collectPaymentAllocations(){
 const fields=[...document.querySelectorAll('#pAllocEditor input[data-alloc-invoice]')];
 const values=[];let cents=0;
 for(const f of fields){
  const raw=String(f.value||'').trim();
  if(!raw)continue;
  const number=Number(raw);
  if(!Number.isFinite(number)||number<0)return {error:'Revisá los importes de las boletas.'};
  const valueCents=Math.round(number*100);
  if(Math.abs(number*100-valueCents)>0.0001)return {error:'Los importes deben tener dos decimales.'};
  const maxCents=Math.round(Number(f.dataset.allocMax||0)*100);
  if(valueCents>maxCents)return {error:'La imputación a '+f.getAttribute('aria-label')+' supera el pendiente de esa factura.'};
  if(valueCents<=0)continue;
  values.push({invoice_id:f.dataset.allocInvoice,amount:valueCents/100});
  cents+=valueCents
 }
 return {values,cents}
}

function supplierAllocationBudget(){
 const historicalId=document.getElementById('pAllocHistoryId')?.value;
 if(historicalId){
  const p=mov.find(x=>x.id===historicalId);
  return {cents:Math.round(Number(p?.amount||0)*100),historical:true,auto:false};
 }
 const method=document.getElementById('pmethod')?.value;
 if(method==='POSNET_LEONI'){
  const gross=Number(document.getElementById('pgross')?.value||0);
  const rate=Number(document.getElementById('prate')?.value||0);
  const cents=Math.round(gross*100);
  return {cents:Math.max(0,cents-Math.round(cents*rate/100)),historical:false,auto:false,posnet:true};
 }
 const field=document.getElementById('pamount');
 return {cents:Math.max(0,Math.round(Number(field?.value||0)*100)),historical:false,
  auto:!!field&&(field.dataset.allocAuto==='1'||field.value.trim()===''),field};
}
function supplierAllocationInputsSelected(){
 return [...document.querySelectorAll('#pAllocEditor input[data-alloc-invoice]')];
}
function supplierAllocationRender(){
 let order=0;
 for(const field of supplierAllocationInputsSelected()){
  const cents=Math.max(0,Math.round(Number(field.value||0)*100));
  const maxCents=Math.round(Number(field.dataset.allocMax||0)*100);
  const card=field.closest('[data-alloc-card]');
  if(!card)continue;
  const selected=cents>0;
  card.style.background=selected?'#edf8f0':'#fff';
  const pick=card.querySelector('[data-alloc-pick]');
  pick.setAttribute('aria-pressed',selected?'true':'false');
  card.querySelector('[data-alloc-check]').textContent=selected?'☑':'☐';
  card.querySelector('[data-alloc-edit]').style.display=(selected||document.activeElement===field)?'block':'none';
  card.querySelector('[data-alloc-result]').textContent=selected?
   ('Queda '+money(Math.max(0,maxCents-cents)/100)):'Tocar para descontar';
  if(selected&&!field.dataset.allocOrder)field.dataset.allocOrder=String(++order);
 }
}
function supplierAllocationToggle(button){
 const card=button.closest('[data-alloc-card]'),field=card?.querySelector('input[data-alloc-invoice]');
 if(!field)return;
 const current=Math.round(Number(field.value||0)*100),maxCents=Math.round(Number(field.dataset.allocMax||0)*100);
 if(current>0){field.value='';delete field.dataset.allocOrder}
 else{
  const a=collectPaymentAllocations();
  if(a.error)return A(a.error);
  const budget=supplierAllocationBudget();
  const available=budget.auto?maxCents:Math.max(0,budget.cents-a.cents);
  if(available<=0){
   return A(budget.posnet?'Indicá primero el bruto y la comisión del Posnet.':
    'El importe del pago ya está totalmente distribuido. Para agregar otra boleta, aumentá el pago o desmarcá alguna.')
  }
  field.value=(Math.min(maxCents,available)/100).toFixed(2);
  field.dataset.allocOrder=String(Date.now())+'-'+String(++supplierAllocationSequence)
 }
 const budget=supplierAllocationBudget();
 if(budget.auto&&budget.field){
  const a=collectPaymentAllocations();
  if(!a.error){budget.field.value=(a.cents/100).toFixed(2);budget.field.dataset.allocAuto='1'}
 }
 paymentAllocationChanged()
}
let supplierAllocationSequence=0;
function supplierAllocationEdit(field){
 const cents=Math.round(Number(field.value||0)*100);
 if(cents>0&&!field.dataset.allocOrder)field.dataset.allocOrder=String(Date.now())+'-'+String(++supplierAllocationSequence);
 if(cents<=0)delete field.dataset.allocOrder;
 const budget=supplierAllocationBudget();
 if(budget.auto&&budget.field){
  const a=collectPaymentAllocations();
  if(!a.error){budget.field.value=(a.cents/100).toFixed(2);budget.field.dataset.allocAuto='1'}
 }
 paymentAllocationChanged()
}
function paymentAmountChanged(){
 const field=document.getElementById('pamount');
 if(field)field.dataset.allocAuto='0';
 const budget=supplierAllocationBudget();
 const selected=supplierAllocationInputsSelected().filter(f=>Number(f.value||0)>0)
  .sort((a,b)=>String(a.dataset.allocOrder||'').localeCompare(String(b.dataset.allocOrder||'')));
 let remaining=budget.cents;
 for(const f of selected){
  const oldCents=Math.round(Number(f.value||0)*100);
  const used=Math.min(oldCents,Math.max(0,remaining));
  f.value=used?(used/100).toFixed(2):'';
  if(!used)delete f.dataset.allocOrder;
  remaining-=used
 }
 paymentAllocationChanged()
}

function paymentAllocationChanged(){
 const box=document.getElementById('allocationSum');if(!box)return;
 supplierAllocationRender();
 const a=collectPaymentAllocations();
 if(a.error){box.innerHTML='<span class="bad">'+esc(a.error)+'</span>';return}
 const budget=supplierAllocationBudget(),remaining=budget.cents-a.cents;
 const count=a.values.length;
 const supId=document.getElementById('ps')?.value||
  mov.find(x=>x.id===document.getElementById('pAllocHistoryId')?.value)?.supplier_id;
 const before=supId?bal(supId):0;
 const after=budget.historical?before:before-budget.cents/100;
 box.innerHTML='<div><b>'+count+' boleta(s) seleccionada(s)</b></div>'+
 '<div>Pago neto: <b>'+money(budget.cents/100)+'</b></div>'+
 '<div>Descontado de boletas: <b>'+money(a.cents/100)+'</b></div>'+
 (remaining<0?'<div class="bad"><b>Excede el pago por '+money(-remaining/100)+'</b></div>':
 '<div class="'+(remaining?'small muted':'ok')+'">Saldo del pago sin asignar: <b>'+money(remaining/100)+'</b></div>')+
 '<div class="small muted">Saldo contable proveedor '+(budget.historical?'(sin cambios)':'después del pago')+': <b>'+money(after)+'</b></div>'
}
function supplierAllocationForm(paymentId){
 const payment=mov.find(x=>x.id===paymentId&&x.movement_type==='PAGO');
 if(!payment)return A('Pago no encontrado.');
 const supplier=sups.find(x=>x.id===payment.supplier_id);
 M('<h3>Imputar pago · '+esc(supplier?.name||'Proveedor')+'</h3>'+
 '<div class="calc"><b>Pago del '+fmt(payment.movement_date)+' · '+money(payment.amount)+'</b><div class="small muted">Se conserva el pago original y su fecha. Sólo se vinculan boletas a este pago.</div></div>'+
 '<input id="pAllocHistoryId" type="hidden" value="'+payment.id+'">'+
 '<div id="pAllocEditor">'+supplierAllocationInputs(payment.supplier_id,payment.id)+'</div>'+
 '<button class="primary" id="pAllocSave" onclick="saveSupplierAllocationHistory()">Guardar imputaciones de boletas</button>');
 paymentAllocationChanged()
}
async function saveSupplierAllocationHistory(){
 const id=document.getElementById('pAllocHistoryId')?.value||'';
 const payment=mov.find(x=>x.id===id),data=collectPaymentAllocations();
 if(!payment)return A('Pago inexistente.');
 if(data.error)return A(data.error);
 const paidCents=Math.round(Number(payment.amount||0)*100);
 if(data.cents>paidCents)return A('El importe aplicado supera el pago.');
 if(!confirm('¿Guardar la asignación de '+data.values.length+' boleta(s) para este pago? El importe pagado no cambia.'))return;
 busyBtn('pAllocSave',true);
 try{
  const r=await sb.rpc('audit_set_supplier_payment_allocations',{p_payment_id:id,p_allocations:data.values});
  if(r.error)return A('No se guardaron las imputaciones: '+r.error.message);
  X();await loadSuppliers();supplierDetailLegacy(payment.supplier_id);
  A('Imputaciones guardadas. El pago y el saldo contable no cambiaron.')
 }finally{busyBtn('pAllocSave',false)}
}

function paymentForm(id='',payAll=false){
 if(!sups.some(x=>x.active))return A('Primero cargá un proveedor.');
 const selected=id||sups.find(x=>x.active)?.id||'';
 const total=Math.round(bal(selected)*100)/100;
 if(payAll&&total<=0)return A('El proveedor no tiene saldo pendiente.');
 M('<h3>'+(payAll?'Pagar saldo completo':'Registrar pago')+'</h3>'+
 '<input id="prq" type="hidden" value="'+requestKey()+'">'+
 '<input id="pIsFull" type="hidden" value="'+(payAll?'1':'0')+'">'+
 '<input id="pFullExpected" type="hidden" value="'+(payAll?total.toFixed(2):'')+'">'+
 (payAll?'<div class="calc">Deuda actual: <b>'+money(total)+'</b><div class="small muted">Incluye todas las boletas pendientes, no sólo las últimas mostradas.</div></div>':
 '<p class="small muted">Si pagás menos que la deuda, queda saldo pendiente. Si pagás más, saldo a favor.</p>')+
 '<label>Proveedor</label><select id="ps" onchange="paymentSupplierChanged()" '+(payAll?'disabled':'')+'>'+supplierOptions(selected)+'</select>'+
 '<label>Forma de pago</label><select id="pmethod" onchange="paymentMethodChanged()">'+
 '<option value="TRANSFERENCIA">Transferencia</option><option value="E_CHEQ">E-cheq</option><option value="CHEQUE">Cheque físico</option><option value="EFECTIVO">Efectivo</option>'+
 '<option value="EXTERNO">Pago externo</option><option value="OTRO">Otro</option>'+
 (payAll?'':'<option value="POSNET_LEONI">Posnet Leoni (con comisión)</option>')+'</select>'+
 '<label>Fecha de pago / entrega</label><input id="pdate" type="date" value="'+localISODate()+'">'+
 '<div id="posnetFields" class="hide"><label>Total procesado por Posnet</label><input id="pgross" type="number" inputmode="decimal" oninput="paymentCalc()"><label>Comisión %</label><input id="prate" type="number" step=".01" inputmode="decimal" oninput="paymentCalc()"><div id="pcalc" class="calc"></div><label>Operaciones incluidas desde</label><input id="ppfrom" type="date"><label>Operaciones incluidas hasta (inclusive)</label><input id="ppto" type="date"><div class="small muted">El período se guarda una sola vez al registrar el pago. Después no se modifica.</div></div>'+
 '<div id="externalFields"><label>Importe pagado</label><input id="pamount" oninput="paymentAmountChanged()" type="number" inputmode="decimal" step=".01" min=".01" '+(payAll?'readonly':'')+' value="'+(payAll?total.toFixed(2):'')+'"></div>'+
 '<label id="pRefLabel">Referencia / comprobante (opcional)</label><input id="pref" maxlength="120">'+
 '<div id="echeqFields" class="hide"><label>Vencimiento del e-cheq</label><input id="pEcheqDue" type="date"><div class="small muted">Se registra como e-cheq entregado, no como acreditación bancaria.</div></div>'+
 '<div id="pAllocEditor"></div><label>Observaciones</label><textarea id="pnotes" maxlength="1000"></textarea><label>Adjunto (opcional)</label><input id="pfile" type="file" multiple>'+
 '<button id="pSave" class="primary" style="width:100%;margin-top:12px" onclick="savePayment()">'+(payAll?'Confirmar pago total':'Guardar pago')+'</button>');
 paymentSupplierChanged();
 if(!payAll&&String(sups.find(x=>x.id===ps.value)?.name||'').trim().toLowerCase()==='leoni'){
  pmethod.value='POSNET_LEONI';paymentMethodChanged()
 }
}
function paymentSupplierChanged(){
 let s=sups.find(x=>x.id===ps.value);
 const onlyLeoni=String(s?.name||'').trim().toLowerCase()==='leoni';
 const opt=pmethod.querySelector('option[value="POSNET_LEONI"]');
 if(opt){opt.hidden=!onlyLeoni;opt.disabled=!onlyLeoni;if(!onlyLeoni&&pmethod.value==='POSNET_LEONI')pmethod.value='TRANSFERENCIA'}
 if(prate)prate.value=s?.posnet_commission_rate??5;
 const allocBox=document.getElementById('pAllocEditor');
 if(allocBox)allocBox.innerHTML=supplierAllocationInputs(ps.value);
 paymentMethodChanged()
}
function paymentMethodChanged(){
 const pos=pmethod.value==='POSNET_LEONI',cheque=pmethod.value==='E_CHEQ'||pmethod.value==='CHEQUE';
 posnetFields.classList.toggle('hide',!pos);
 externalFields.classList.toggle('hide',pos);
 echeqFields.classList.toggle('hide',!cheque);
 const refLabel=document.getElementById('pRefLabel');
 if(refLabel)refLabel.textContent=cheque?'Número / referencia del cheque':'Referencia / comprobante (opcional)';
 pref.required=cheque;pEcheqDue.required=cheque;
 const rangeFrom=document.getElementById('ppfrom'),rangeTo=document.getElementById('ppto');
 if(rangeFrom)rangeFrom.required=pos;if(rangeTo)rangeTo.required=pos;
 paymentAllocationChanged();
 if(pos){
  const s=sups.find(x=>x.id===ps.value);
  if(String(s?.name||'').trim().toLowerCase()!=='leoni')pcalc.innerHTML='<span class="bad">Posnet Leoni sólo corresponde al proveedor Leoni.</span>';
  else paymentCalc()
 }
}
function paymentCalc(){
 let bruto=+pgross.value||0,tasa=+prate.value||0,com=bruto*tasa/100,neto=bruto-com;
 pcalc.innerHTML='Bruto <b>'+money(bruto)+'</b><br>Comisión '+pct(tasa)+': <b>'+money(com)+'</b><br>Neto que cancela deuda: <b>'+money(neto)+'</b>';
 paymentAllocationChanged()
}

async function savePayment(){
 const s=sups.find(x=>x.id===ps.value),method=pmethod.value;
 if(!s)return A('Elegí un proveedor.');
 const full=document.getElementById('pIsFull')?.value==='1';
 const ref=pref.value.trim(),due=document.getElementById('pEcheqDue')?.value||null;
 const periodFrom=document.getElementById('ppfrom')?.value||'';
 const periodTo=document.getElementById('ppto')?.value||'';
 if((method==='E_CHEQ'||method==='CHEQUE')&&(!ref||!due))return A('Para el cheque indicá número y fecha de vencimiento.');
 let bruto=0,tasa=null,comision=0,neto=0;
 if(method==='POSNET_LEONI'){
  if(full)return A('Para pagar por Posnet usá Registrar pago.');
  if(String(s.name||'').trim().toLowerCase()!=='leoni')return A('Posnet Leoni sólo corresponde a Leoni.');
  if(!periodFrom||!periodTo||periodFrom>periodTo||periodTo>pdate.value)return A('Revisá el rango de fechas incluido en el Posnet.');
  bruto=parseAmount(pgross.value);tasa=parseAmount(prate.value);
  if(!(bruto>0)||tasa<0||tasa>=100)return A('Revisá bruto y comisión.');
  comision=Math.round(bruto*tasa)/100;
  neto=Math.round((bruto-comision)*100)/100
 }else{
  neto=parseAmount(pamount.value);bruto=neto;
  if(!(neto>0))return A('Ingresá el importe pagado.')
 }
 if(!pdate.value)return A('Completá la fecha del pago.');
 const expected=full?Number(document.getElementById('pFullExpected')?.value):null;
 if(full&&Math.abs(expected-neto)>.009)return A('El pago total no coincide con el saldo.');
 const a=collectPaymentAllocations();
 if(a.error)return A(a.error);
 if(a.cents>Math.round(neto*100))return A('El total asignado a boletas supera el importe del pago.');
 if(a.cents<Math.round(neto*100)&&!confirm('Hay '+money((Math.round(neto*100)-a.cents)/100)+' sin imputar a facturas. ¿Registrar igual?'))return;
 if(full&&!confirm('¿Registrar pago total de '+money(neto)+' a '+s.name+'?'))return;
 let note=(pnotes.value||'').trim();
 if(method==='POSNET_LEONI'){
  const auto='Posnet Leoni: bruto '+money(bruto)+'; comisión '+pct(tasa)+' ('+money(comision)+'); neto aplicado '+money(neto)+'.';
  note=note?auto+' '+note:auto
 }
 if(full)note=(note?'Pago total según cuenta. '+note:'Pago total según cuenta.');
 if(method==='E_CHEQ')note=(note?'E-cheq entregado. '+note:'E-cheq entregado.');
 if(method==='CHEQUE')note=(note?'Cheque físico entregado. '+note:'Cheque físico entregado.');
 busyBtn('pSave',true);
 let paymentId='',saved=false,attachmentIssue='';
 try{
  const r=await sb.rpc('audit_register_supplier_payment_allocated',{
   p_supplier_id:s.id,p_date:pdate.value,p_method:method,p_net:neto,p_gross:bruto,
   p_commission_rate:method==='POSNET_LEONI'?tasa:null,
   p_reference:ref||null,p_notes:note||null,
   p_cheque_due:(method==='E_CHEQ'||method==='CHEQUE')?due:null,
   p_period_from:method==='POSNET_LEONI'?periodFrom:null,
   p_period_to:method==='POSNET_LEONI'?periodTo:null,
   p_request_key:prq.value,p_pay_full:full,p_expected_total:expected,p_allocations:a.values
  });
  if(r.error){
   if(/SALDO_CAMBIO|SIN_SALDO_PENDIENTE/.test(r.error.message||''))return A('El saldo cambió. Actualizá la cuenta antes de pagar. No se registró el pago.');
   if(requestDuplicate(r.error))return A('Este pago ya estaba registrado.');
   return A('No se registró el pago: '+r.error.message)
  }
  paymentId=r.data;saved=true;
  if(pfile.files.length){try{await upload(null,paymentId,[...pfile.files])}catch(e){attachmentIssue=String(e.message||e)}}
  X();await loadSuppliers();
  A(attachmentIssue?'Pago e imputaciones guardados; falló adjunto: '+attachmentIssue:
   'Pago registrado con '+a.values.length+' boleta(s) imputada(s). Saldo actualizado.')
 }catch(e){A(saved?'Pago registrado pero falló actualizar pantalla: '+e.message:'No se registró el pago: '+e.message)}
 finally{busyBtn('pSave',false)}
}

/* IVA v124: comprobantes independientes; no sobrescribir totales mensuales históricos. */
let ivaEntries=[],billingLegacy=[],ivaFile=null,ivaOcrText='';
const ivaDate=x=>String(x.invoice_date||x.entry_date||'').slice(0,10);
const ivaActive=x=>x.status==='FACTURADO';
const ivaMonth=x=>ivaDate(x).slice(0,7);
const ivaCustomer=x=>bclients.find(c=>c.id===x.client_id);
const ivaPercent=x=>Number(x.iva_percent_snapshot||0);
const ivaDebt=x=>ivaActive(x)?Number(x.iva_due||0):0;
function ivaExternalTotal(fromDate,toDate){
 return ivaEntries.filter(x=>ivaActive(x)&&ivaDate(x)>=fromDate&&ivaDate(x)<=toDate)
 .reduce((s,x)=>s+Number(x.total_amount||0),0);
}
async function loadBilling(){
 const [cs,es,ls]=await Promise.all([
  sb.from('audit_billing_clients').select('*').order('legal_name'),
  sb.from('audit_billing_entries').select('*').order('invoice_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(1000),
  sb.from('audit_monthly_billing_summary').select('*').order('period_month',{ascending:false})
 ]);
 if(cs.error||es.error||ls.error){A('No se pudo consultar IVA: '+(cs.error||es.error||ls.error).message);return;}
 bclients=cs.data||[];ivaEntries=es.data||[];billingLegacy=ls.data||[];
 renderBilling();
 if(typeof ivaCustomerRender==='function')ivaCustomerRender();
 if(typeof renderCloses==='function')renderCloses();
}
function renderBilling(){
 const months=[...new Set(ivaEntries.filter(ivaActive).map(ivaMonth))].sort().reverse();
 const cur=(window.__spanishBillingMonth||months[0]||localISODate().slice(0,7)),cm=ivaEntries.filter(x=>ivaActive(x)&&ivaMonth(x)===cur);
 const sum=(a,key)=>a.reduce((n,x)=>n+Number(x[key]||0),0);
 const k=[['Mes',cur],['Facturas registradas',String(cm.length)],['Facturado externamente',money(sum(cm,'total_amount'))]];
 const kp=document.getElementById('billKpis'),mb=document.getElementById('billMonths');
 const monthInput=document.getElementById('billMonthPick');if(monthInput)monthInput.value=cur;
 if(kp)kp.innerHTML=k.map(x=>'<div class="card kpi"><span class="muted small">'+x[0]+'</span><b>'+esc(x[1])+'</b></div>').join('');
 if(mb)mb.innerHTML='<p class="small muted">Comprobantes individuales. Cada factura se conserva por separado. El descuento en Caja corresponde al TOTAL facturado; la deuda se calcula únicamente sobre el IVA discriminado.</p>'+
  (months.length?'<table><tr><th>Mes</th><th>Comprobantes</th><th>Facturado externo</th><th>Deuda IVA</th><th></th></tr>'+
  months.map(m=>{let z=ivaEntries.filter(x=>ivaActive(x)&&ivaMonth(x)===m);return '<tr><td>'+esc(m)+'</td><td>'+z.length+'</td><td>'+money(sum(z,'total_amount'))+'</td><td>'+money(sum(z,'iva_due'))+'</td><td><button onclick="billingMonth(\''+m+'\')">Detalle</button></td></tr>'}).join('')+'</table>':
  '<div class="empty">No hay facturas individuales en el período.</div>')+
  '<div class="small muted" style="margin-top:10px">Los resúmenes mensuales anteriores se conservan únicamente como histórico, sin volver a descontarlos ni generar deuda.</div>'+
  (billingLegacy.length?'<button type="button" onclick="billingLegacyForm()">Ver histórico anterior ('+billingLegacy.length+')</button>':'');
}
function billingLegacyForm(){
 M('<h3>Histórico IVA anterior — no conciliado</h3><p class="small muted">Registros del módulo reemplazado. No se computan como nuevas facturas ni como nueva deuda para evitar duplicaciones.</p><div class="table"><table><tr><th>Mes</th><th>Cliente</th><th>Importe anterior</th><th>Deuda anterior</th></tr>'+
 billingLegacy.map(x=>'<tr><td>'+esc(x.period_month)+'</td><td>'+esc(x.client_name)+'</td><td>'+money(x.total_billed)+'</td><td>'+money(x.amount_to_pay)+'</td></tr>').join('')+'</table></div>');
}
function billingMonth(m){
 const z=ivaEntries.filter(x=>ivaMonth(x)===m).sort((a,b)=>ivaDate(b).localeCompare(ivaDate(a)));
 const total=z.filter(ivaActive).reduce((s,x)=>s+Number(x.total_amount||0),0);
 const debt=z.reduce((s,x)=>s+ivaDebt(x),0);
 M('<h3>IVA y facturación externa — '+esc(m)+'</h3><p class="small muted">Total facturado externo '+money(total)+' · Deuda IVA '+money(debt)+'. Los comprobantes ANULADOS no se descuentan.</p>'+
 '<div class="table"><table><tr><th>Fecha</th><th>Cliente / tipo</th><th>Comprobante</th><th>Total factura</th><th>IVA</th><th>% IVA</th><th>Deuda</th><th>Acciones</th></tr>'+
 z.map(x=>'<tr><td>'+esc(fmt(ivaDate(x)))+'</td><td>'+esc(ivaCustomer(x)?.legal_name||'Cliente no encontrado')+'<br><span class="small muted">'+(x.billing_mode_snapshot==='IVA_COBRO'?'Cobro de IVA':'Solo factura externa')+'</span></td>'+
 '<td>'+esc((x.voucher_type||'')+' '+(x.voucher_number||'S/N'))+(x.cae?'<br><span class="small muted">CAE '+esc(x.cae)+'</span>':'')+(x.status==='ANULADO'?'<br><b class="bad">ANULADO</b>':'')+'</td>'+
 '<td>'+money(x.total_amount)+'</td><td>'+(x.vat_amount==null?'No discriminado':money(x.vat_amount))+'</td><td>'+pct(ivaPercent(x))+'</td><td>'+money(ivaDebt(x))+'</td>'+
 '<td>'+(x.evidence_path?'<button onclick="billingEvidenceOpen(\''+x.id+'\')">Archivo</button> ':'')+
 (ivaActive(x)?'<button onclick="billingEdit(\''+x.id+'\')">Corregir</button> <button onclick="billingCancel(\''+x.id+'\')">Anular</button>':'')+'</td></tr>').join('')+
 '</table></div><button onclick="billingForm()">+ Otra factura</button>');
}

/* IVA v125: carga simple, tres datos, acumulación de IVA por mes y por cliente. */
function billingForm(){
 ivaFile=null;ivaOcrText='';
 const opts=bclients.filter(x=>x.active).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.legal_name)+'</option>').join('');
 M('<h3>Registrar IVA</h3><p class="small muted">Registrá cada factura una sola vez. Las nuevas se suman a las anteriores, sin reemplazarlas.</p>'+
 '<label>Cliente</label><select id="bc" onchange="billClientChanged()">'+opts+'</select>'+
 '<div class="small muted" id="ivaClientInfo"></div>'+
 '<label>Total facturado ($)</label><input id="bt" type="number" min=".01" step=".01" inputmode="decimal" placeholder="0,00" oninput="billCalc()">'+
 '<label>Total IVA de la factura ($)</label><input id="bvat" type="number" min="0" step=".01" inputmode="decimal" placeholder="0,00" oninput="billCalc()">'+
 '<button type="button" onclick="ivaIncludedChanged()" style="margin-top:6px">Calcular IVA incluido al 21% (opcional)</button>'+
 '<div class="calc" id="bcalc" style="margin:12px 0"></div>'+
 '<details style="margin:10px 0 14px"><summary style="cursor:pointer;font-weight:600">Datos del comprobante y adjunto (opcional)</summary>'+
 '<label>Fecha de factura</label><input id="bdate" type="date" value="'+localISODate()+'" onchange="billCalc()">'+
 '<label>Tipo de comprobante</label><select id="btype"><option value="EXTERNA_SIN_NUMERO" selected>Facturación externa</option><option value="FACTURA_A">Factura A</option><option value="FACTURA_B">Factura B</option><option value="FACTURA_C">Factura C</option><option value="NOTA_CREDITO">Nota de crédito</option><option value="OTRO">Otro</option></select>'+
 '<label>Número de comprobante</label><input id="bnumber" maxlength="30" placeholder="Si lo tenés">'+
 '<label>CAE</label><input id="bcae" inputmode="numeric" maxlength="14" placeholder="Si lo tenés">'+
 '<label>Imagen o PDF de la factura</label><input id="ivaAttachment" type="file" accept=".pdf,image/jpeg,image/png,image/webp" onchange="ivaReadDocument(this)">'+
 '<div class="small muted" id="ivaOcrStatus">Si adjuntás una factura, se intentarán completar automáticamente los datos para que los revises.</div>'+
 '</details>'+
 '<button id="ivaSaveBtn" type="button" class="primary" onclick="billingSave()">Registrar y sumar IVA</button>');
 billClientChanged();
}
function ivaIncludedChanged(){
 const total=Number(document.getElementById('bt')?.value||0),vat=document.getElementById('bvat');
 if(vat)vat.value=total>0?(Math.round((total*21/121+Number.EPSILON)*100)/100).toFixed(2):'';
 billCalc();
}
function billClientChanged(){
 const c=bclients.find(x=>x.id===document.getElementById('bc')?.value);
 const info=document.getElementById('ivaClientInfo');
 if(info)info.textContent=c?(c.billing_mode==='IVA_COBRO'?'IVA a cobrar: '+pct(c.payable_percent)+' del IVA informado':'Solo factura externa: no se le cobra IVA'):'Seleccioná un cliente';
 billCalc();
}
function billCalc(){
 const total=Number(document.getElementById('bt')?.value||0),iva=Number(document.getElementById('bvat')?.value||0);
 const c=bclients.find(x=>x.id===document.getElementById('bc')?.value);
 const p=c?.billing_mode==='IVA_COBRO'?Number(c.payable_percent||0):0;
 const due=Math.round(iva*p)/100;
 const month=(document.getElementById('bdate')?.value||localISODate()).slice(0,7);
 const prev=ivaEntries.filter(x=>ivaActive(x)&&ivaMonth(x)===month);
 const customerAccum=prev.filter(x=>x.client_id===c?.id).reduce((s,x)=>s+Number(x.iva_due||0),0);
 const monthAccum=prev.reduce((s,x)=>s+Number(x.iva_due||0),0);
 const box=document.getElementById('bcalc');if(!box)return;
 box.innerHTML='<div class="small muted">IVA a cobrar por este registro ('+pct(p)+')</div>'+
 '<div style="font-size:20px;font-weight:800;margin:4px 0">'+money(due)+'</div>'+
 '<div class="small muted">Acumulado de '+esc(c?.legal_name||'cliente')+' en '+esc(month)+': '+money(customerAccum+due)+'</div>'+
 '<div class="small muted">Acumulado general de IVA en '+esc(month)+': '+money(monthAccum+due)+'</div>'+
 '<div class="small muted">Descuento de facturación externa: '+money(total)+'</div>';
}
async function billingSave(){
 const c=bclients.find(x=>x.id===document.getElementById('bc')?.value);
 const date=document.getElementById('bdate')?.value||localISODate();
 const type=document.getElementById('btype')?.value||'EXTERNA_SIN_NUMERO';
 const voucher=document.getElementById('bnumber')?.value.trim()||null;
 const cae=document.getElementById('bcae')?.value.trim()||null;
 const totalRaw=document.getElementById('bt')?.value||'';
 const total=Number(totalRaw);
 const vatRaw=document.getElementById('bvat')?.value||'';
 const vat=vatRaw.trim()===''?null:Number(vatRaw);
 if(!c||!c.active||!date||!type||totalRaw.trim()===''||!Number.isFinite(total)||total<=0)
  return A('Ingresá cliente y total facturado válido.');
 if(vat==null||!Number.isFinite(vat)||vat<0||vat>total)
  return A('Ingresá el total del IVA, entre $0 y el total facturado.');
 if(type==='NOTA_CREDITO')return A('Para notas de crédito utilizá la anulación o corrección de la factura vinculada.');
 if(cae&&!/^\d{14}$/.test(cae))return A('El CAE debe contener 14 dígitos.');
 if(voucher&&ivaEntries.some(x=>x.status!=='ANULADO'&&x.client_id===c.id&&x.voucher_type===type&&(x.voucher_number||'').trim()===voucher))
  return A('Esta factura ya está registrada. No se duplicó.');
 if(!voucher&&ivaEntries.some(x=>x.status!=='ANULADO'&&x.client_id===c.id&&ivaDate(x)===date&&Math.abs(Number(x.total_amount)-total)<.005&&Math.abs(Number(x.vat_amount||0)-vat)<.005)){
  if(!confirm('Ya existe un registro de este cliente, fecha e importes. ¿Son dos facturas distintas?'))return;
 }
 busyBtn('ivaSaveBtn',true);
 try{
  const is21=Math.abs(vat-Math.round((total*21/121)*100)/100)<.015;
  const row={client_id:c.id,entry_date:date,invoice_date:date,total_amount:total,vat_amount:vat,
   voucher_type:type,voucher_number:voucher,cae,iva_aliquot_percent:is21?21:null,
   status:'FACTURADO',request_key:requestKey()};
  const rr=await sb.from('audit_billing_entries').insert(row).select('id').single();
  if(rr.error)throw Error(rr.error.code==='23505'?'Comprobante ya existente; no se duplicó.':rr.error.message);
  let attachError='';
  if(ivaFile){
   const clean=ivaFile.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-85);
   const path='iva/'+rr.data.id+'/'+crypto.randomUUID()+'-'+clean;
   try{
    const u=await sb.storage.from('audit-evidence').upload(path,ivaFile,{upsert:false,contentType:ivaFile.type||'application/pdf'});
    if(u.error)throw Error(u.error.message);
    const up=await sb.from('audit_billing_entries').update({evidence_path:path,evidence_name:ivaFile.name}).eq('id',rr.data.id);
    if(up.error)throw Error(up.error.message);
   }catch(e){attachError=e.message}
  }
  X();await loadBilling();dashboard();
  A(attachError?'IVA registrado y sumado; falló adjuntar el archivo: '+attachError:'IVA registrado y sumado. Los comprobantes anteriores permanecen.');
 }catch(e){A('No se registró IVA: '+e.message)}
 finally{busyBtn('ivaSaveBtn',false)}
}

function billingEdit(id){
 const x=ivaEntries.find(v=>v.id===id);if(!x||!ivaActive(x))return;
 M('<h3>Corregir comprobante</h3><p class="small muted">Cliente: '+esc(ivaCustomer(x)?.legal_name)+' · '+esc(x.billing_mode_snapshot==='IVA_COBRO'?'IVA '+pct(ivaPercent(x)):'Solo descuento de facturación')+
 '. El porcentaje histórico del comprobante no se modifica.</p>'+
 '<label>Fecha</label><input id="bed" type="date" value="'+esc(ivaDate(x))+'">'+
 '<label>Tipo</label><input id="bety" value="'+esc(x.voucher_type||'FACTURA_B')+'">'+
 '<label>Número</label><input id="ben" value="'+esc(x.voucher_number||'')+'">'+
 '<label>CAE</label><input id="becae" maxlength="14" inputmode="numeric" value="'+esc(x.cae||'')+'">'+
 '<label>Total facturado</label><input id="bet" type="number" step=".01" value="'+Number(x.total_amount)+'" oninput="billEditCalc()">'+
 '<label>IVA discriminado</label><input id="bevat" type="number" step=".01" value="'+(x.vat_amount==null?'':Number(x.vat_amount))+'" oninput="billEditCalc()">'+
 '<div class="calc" id="bec"></div><button id="ivaUpdateBtn" class="primary" onclick="billingUpdate(\''+id+'\')">Guardar corrección</button>');
 billEditCalc();
}
function billEditCalc(){
 const x=ivaEntries.find(v=>v.id===document.getElementById('ivaUpdateBtn')?.getAttribute('onclick')?.match(/[0-9a-f-]{36}/)?.[0]);
 const v=Number(document.getElementById('bevat')?.value||0);
 const box=document.getElementById('bec');
 if(box)box.textContent='A descontar en Caja: '+money(document.getElementById('bet')?.value)+' · Nueva deuda IVA: '+money(Math.round(v*Number(x?.iva_percent_snapshot||0))/100);
}
async function billingUpdate(id){
 const x=ivaEntries.find(v=>v.id===id);if(!x||!ivaActive(x))return;
 const date=document.getElementById('bed')?.value,n=document.getElementById('ben')?.value.trim(),type=document.getElementById('bety')?.value.trim(),cae=document.getElementById('becae')?.value.trim()||null;
 const total=Number(document.getElementById('bet')?.value),raw=document.getElementById('bevat')?.value;
 const vat=raw===''?null:Number(raw);
 if(!date||!n||!type||!(total>0)||!Number.isFinite(total)||vat!=null&&(!Number.isFinite(vat)||vat<0||vat>total)||x.billing_mode_snapshot==='IVA_COBRO'&&vat==null||cae&&!/^\d{14}$/.test(cae))return A('Revisá los datos del comprobante, CAE y el IVA.');
 if(!confirm('¿Confirmás la corrección? El registro y el historial de cambios se conservarán.'))return;
 busyBtn('ivaUpdateBtn',true);
 try{
  const r=await sb.from('audit_billing_entries').update({invoice_date:date,entry_date:date,voucher_number:n,voucher_type:type,cae,total_amount:total,vat_amount:vat}).eq('id',id);
  if(r.error)throw Error(r.error.message);
  X();await loadBilling();dashboard();A('Comprobante corregido, sin duplicar registros.');
 }catch(e){A('No se corrigió: '+e.message)}
 finally{busyBtn('ivaUpdateBtn',false)}
}
async function billingCancel(id){
 const x=ivaEntries.find(v=>v.id===id);if(!x||!ivaActive(x))return;
 const reason=prompt('Motivo de anulación (se conserva el historial):');
 if(reason===null)return;
 if(!reason.trim())return A('Ingresá un motivo para anular.');
 if(!confirm('¿Anular esta factura? Dejará de descontarse del acumulado y de generar deuda.'))return;
 const r=await sb.from('audit_billing_entries').update({status:'ANULADO',cancel_reason:reason.trim()}).eq('id',id);
 if(r.error)return A('No se pudo anular: '+r.error.message);
 X();await loadBilling();dashboard();A('Comprobante anulado. Sigue visible en el historial.');
}
async function billingEvidenceOpen(id){
 const x=ivaEntries.find(v=>v.id===id);if(!x?.evidence_path)return A('No hay archivo adjunto.');
 const r=await sb.storage.from('audit-evidence').createSignedUrl(x.evidence_path,120);
 if(r.error)return A('No se pudo abrir el archivo: '+r.error.message);
 window.open(r.data.signedUrl,'_blank','noopener');
}
function clientsForm(){
 M('<h3>Clientes IVA / Facturación externa</h3><button class="primary" onclick="clientForm()">+ Nuevo cliente</button>'+
 '<p class="small muted">Los clientes inactivos conservan sus facturas históricas, pero no aparecen en el formulario de nuevas facturas.</p>'+
 bclients.map(x=>'<div class="card" style="margin-top:10px"><div class="row between"><div><b>'+esc(x.legal_name)+'</b><div class="small muted">'+esc(x.active?'Activo':'Inactivo')+' · '+esc(x.billing_mode==='IVA_COBRO'?'IVA a cobrar '+pct(x.payable_percent):'Solo facturación, 0% deuda IVA')+'</div></div><button onclick="clientForm(\''+x.id+'\')">Configurar</button></div></div>').join(''));
}
function clientForm(id=''){
 const x=id?bclients.find(v=>v.id===id):null;
 M('<h3>'+(x?'Configurar cliente':'Nuevo cliente')+'</h3>'+
 '<label>Nombre / razón social</label><input id="cn" value="'+esc(x?.legal_name||'')+'">'+
 '<label>CUIT</label><input id="cc" inputmode="numeric" value="'+esc(x?.cuit||'')+'">'+
 '<label>Condición IVA</label><input id="cv" value="'+esc(x?.vat_condition||'')+'">'+
 '<label>Tratamiento</label><select id="cMode" onchange="clientModeChanged()"><option value="SOLO_FACTURACION" '+(x?.billing_mode!=='IVA_COBRO'?'selected':'')+'>Solo resta facturación externa (sin deuda de IVA)</option><option value="IVA_COBRO" '+(x?.billing_mode==='IVA_COBRO'?'selected':'')+'>Factura externa y genera deuda sobre IVA</option></select>'+
 '<div id="cPercentWrap"><label>Porcentaje del IVA a cobrar</label><input id="cpct" type="number" step=".0001" min="0" max="100" value="'+(x?.billing_mode==='IVA_COBRO'?(x?.payable_percent??''):'0')+'"></div>'+
 '<label>Estado</label><select id="cActive"><option value="true" '+(x?.active!==false?'selected':'')+'>Activo</option><option value="false" '+(x?.active===false?'selected':'')+'>Inactivo</option></select>'+
 '<label>Observaciones</label><textarea id="cnotes">'+esc(x?.notes||'')+'</textarea>'+
 '<button class="primary" onclick="saveClient(\''+id+'\')">Guardar cliente</button>');
 clientModeChanged();
}
function clientModeChanged(){
 const w=document.getElementById('cPercentWrap');
 if(w)w.style.display=document.getElementById('cMode')?.value==='IVA_COBRO'?'':'none';
}
async function saveClient(id){
 const cuit=document.getElementById('cc').value.replace(/\D/g,''),mode=document.getElementById('cMode').value;
 const percent=mode==='IVA_COBRO'?Number(document.getElementById('cpct').value):0;
 const row={legal_name:document.getElementById('cn').value.trim(),cuit:cuit||null,
  vat_condition:document.getElementById('cv').value.trim()||null, billing_mode:mode,
  payable_percent:percent,active:document.getElementById('cActive').value==='true',
  notes:document.getElementById('cnotes').value.trim()||null,requires_invoice:true};
 if(!row.legal_name||cuit&&cuit.length!==11||!Number.isFinite(percent)||percent<0||percent>100)return A('Revisá el nombre, CUIT y porcentaje (0 a 100).');
 const r=id?await sb.from('audit_billing_clients').update(row).eq('id',id):await sb.from('audit_billing_clients').insert(row);
 if(r.error)return A('No se pudo guardar el cliente: '+r.error.message);
 X();await loadBilling();clientsForm();
}
/* La extracción no crea comprobantes: autocompleta una propuesta que debe confirmarse. */
function ivaAddScript(url){
 return new Promise((resolve,reject)=>{
  if(document.querySelector('script[data-iva-src="'+url+'"]'))return resolve();
  const el=document.createElement('script');el.src=url;el.dataset.ivaSrc=url;el.onload=resolve;el.onerror=()=>reject(Error('No se pudo cargar el lector OCR/PDF'));document.head.appendChild(el)
 });
}
async function ivaReadDocument(input){
 ivaFile=input?.files?.[0]||null;ivaOcrText='';
 const status=document.getElementById('ivaOcrStatus');if(!ivaFile||!status)return;
 if(ivaFile.size>25000000||!(/pdf|image\/(jpeg|png|webp)/i.test(ivaFile.type)))return A('Adjuntá PDF o imagen menor a 25 MB.');
 status.textContent='Leyendo archivo y buscando los datos fiscales…';
 try{
  let txt='';
  if(ivaFile.type==='application/pdf'||/\.pdf$/i.test(ivaFile.name)){
   await ivaAddScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
   window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
   const doc=await window.pdfjsLib.getDocument({data:await ivaFile.arrayBuffer()}).promise;
   for(let i=1;i<=Math.min(doc.numPages,3);i++){
    const page=await doc.getPage(i),tokens=await page.getTextContent();
    txt+=' '+tokens.items.map(v=>v.str||'').join(' ');
    if(txt.trim().length<70){
     const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),v=page.getViewport({scale:1.7});
     canvas.width=Math.floor(v.width);canvas.height=Math.floor(v.height);
     await page.render({canvasContext:ctx,viewport:v}).promise;
     txt+=' '+await ivaOcrImage(canvas);
    }
   }
  }else txt=await ivaOcrImage(ivaFile);
  ivaOcrText=txt;
  const found=ivaAutofill(txt);
  status.textContent=found?'Se identificaron '+found+' campos. Verificá fecha, número, total e IVA antes de guardar.':'No se identificaron importes con certeza. Completá manualmente los campos; el archivo igual se adjunta.';
 }catch(e){status.textContent='No se pudo leer automáticamente ('+e.message+'). Podés completar los campos manualmente y adjuntar el archivo.';}
}
async function ivaOcrImage(blob){
 await ivaAddScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
 const r=await window.Tesseract.recognize(blob,'spa');return r.data?.text||'';
}
function ivaAutofill(text){
 const t=String(text||'').replace(/\s+/g,' ');let count=0;
 const date=t.match(/fecha\s*(?:de\s*)?(?:emisi[oó]n)?\s*:?\s*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i);
 if(date){document.getElementById('bdate').value=date[3]+'-'+date[2]+'-'+date[1];count++;}
 const v=t.match(/\b(\d{4,5})\s*-\s*(\d{8})\b/);
 if(v){document.getElementById('bnumber').value=v[1]+'-'+v[2];count++;}
 const kind=t.match(/FACTURA\s*([ABC])\b/i);
 if(kind){document.getElementById('btype').value='FACTURA_'+kind[1].toUpperCase();count++;}
 const pat='(?:\\$\\s*)?([0-9][0-9.,]*)';
 const total=t.match(new RegExp('(?:IMPORTE\\s+TOTAL|TOTAL\\s+(?:FACTURA|A\\s+PAGAR)|TOTAL\\s*:)\\s*'+pat,'i'));
 if(total){const n=parseAmount(total[1]);if(n>0){document.getElementById('bt').value=n;ivaIncludedChanged();count++;}}
 const vat=t.match(new RegExp('(?:IMPORTE\\s+(?:TOTAL\\s+)?IVA|TOTAL\\s+IVA|IVA\\s+(?:21|10[.,]5|27)\\s*%)\\s*:?\\s*'+pat,'i'));
 if(vat){const n=parseAmount(vat[1]);if(n>0&&n<=Number(document.getElementById('bt').value||Infinity)){document.getElementById('bvat').value=n;count++;}}
 const caeMatch=t.match(/(?:C\.?A\.?E\.?)\s*(?:N[°ºo.]\s*)?:?\s*(\d{14})/i);if(caeMatch){document.getElementById('bcae').value=caeMatch[1];count++;}
 billCalc();return count;
}

async function loadPeople(){
 try{await sb.rpc('audit_refresh_weekly_payrolls')}catch(_e){}
 let cutoff=localISODate(new Date(Date.now()-45*86400000));
 let rs=await Promise.all([
  sb.from('audit_employees').select('*').order('sort_order',{ascending:true}).order('name',{ascending:true}),
  sb.from('audit_employee_advances').select('*').order('advance_date',{ascending:false}),
  sb.from('audit_advance_deductions').select('*').order('deduction_date',{ascending:false}).order('created_at',{ascending:false}),
  sb.from('audit_payroll_snapshot').select('*').order('sort_order',{ascending:true}),
  sb.from('audit_advance_accounts').select('*').order('employee_name',{ascending:true}).order('advance_date',{ascending:false}),
  sb.from('audit_employee_schedules').select('*').order('iso_weekday',{ascending:true}),
  sb.from('audit_time_entries').select('*').gte('work_date',cutoff).order('work_date',{ascending:false}).order('clock_in_at',{ascending:false}).limit(800),
  sb.from('audit_weekly_payrolls').select('*').order('pay_date',{ascending:false}).limit(300),
  sb.from('audit_employee_vacations').select('*').order('entitlement_year',{ascending:false}).order('start_date',{ascending:false}),
  sb.from('audit_employee_vacation_balances').select('*'),
  sb.from('audit_employee_access').select('employee_id,active'),
  sb.from('audit_employee_time_debt').select('*'),
  sb.from('audit_attendance_overrides').select('employee_id,work_date,status').gte('work_date',cutoff)
 ]);
 let err=rs.map(x=>x.error).find(Boolean);
 if(err)return A(err.message);
 [emps,adv,ded,pay,advAccounts,schedules,timeEntries,weeklyPayrolls,vacations,vacBalances,employeeAccess,timeDebts,attendanceOverrides]=rs.map(x=>x.data||[]);
 renderPeople()
}
function minsText(n){
 n=Math.max(0,Math.round(Number(n||0)));
 let h=Math.floor(n/60),m=n%60;
 return h?(h+' h'+(m?' '+m+' min':'')):(m+' min')
}
function payRuleLabel(v){return v==='FRIDAY'?'Viernes':v==='EVENTUAL'?'Eventual / manual':'Sábado'}
function localTime(v){
 return v?new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,hourCycle:'h23',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(v)):'—'
}
function workDateLabel(v){
 if(!v)return '—';
 let d=new Date(String(v).slice(0,10)+'T12:00:00');
 let days=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
 return days[d.getDay()]+' '+String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()
}
function addDaysISO(iso,n){
 let d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return localISODate(d)
}
let attendanceWeekOffset=0;
async function moveAttendanceWeek(delta,view='people'){
 const next=delta===0?0:Math.max(-104,Math.min(52,attendanceWeekOffset+delta));
 if(next===attendanceWeekOffset){if(view==='review')timeReviewScreen();return}
 const current=attendanceWeekOffset;
 const base=addDaysISO(localISODate(),next*7),d=new Date(base+'T12:00:00');
 const start=addDaysISO(base,-((d.getDay()-6+7)%7)),end=addDaysISO(start,7);
 try{
  const r=await sb.from('audit_time_entries').select('*').gte('work_date',start).lt('work_date',end).order('work_date',{ascending:false}).limit(800);
  if(r.error)throw new Error(r.error.message);
  const merged=new Map(timeEntries.map(t=>[t.id,t]));
  for(const entry of r.data||[])merged.set(entry.id,entry);
  timeEntries=Array.from(merged.values());
  attendanceWeekOffset=next;
  renderPeople();
  if(view==='review')timeReviewScreen()
 }catch(e){attendanceWeekOffset=current;A('No se pudo cargar la semana: '+(e.message||e))}
}
function calendarSaturdayWeek(){
 let today=addDaysISO(localISODate(),attendanceWeekOffset*7),d=new Date(today+'T12:00:00'),back=(d.getDay()-6+7)%7;
 let start=addDaysISO(today,-back),end=addDaysISO(start,7);
 return {start,end}
}
function employeeWeekEntries(eid,start,end){
 return timeEntries.filter(t=>t.employee_id===eid&&t.work_date>=start&&t.work_date<end)
  .slice().sort((a,b)=>String(a.work_date).localeCompare(String(b.work_date))||String(a.clock_in_at).localeCompare(String(b.clock_in_at)))
}
function payableEntryExtra(t){
 if(t.review_status==='REVIEW')return 0;
 if(t.approved_overtime_minutes!==null&&t.approved_overtime_minutes!==undefined)return Number(t.approved_overtime_minutes||0);
 return Number(t.overtime_minutes||0)
}
function employeeWeekSummary(eid,start,end){
 let entries=employeeWeekEntries(eid,start,end);
 return {
  entries,
  late:entries.reduce((s,t)=>s+Number(t.late_minutes||0),0),
  payableExtra:entries.reduce((s,t)=>s+payableEntryExtra(t),0),
  review:entries.filter(t=>t.review_status==='REVIEW').length
 }
}
function localDateTimeInput(v){
 if(!v)return '';
 return new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(v)).replace(' ','T')
}
function employeeById(id){return emps.find(x=>x.id===id)}
function openAdvances(eid){return advAccounts.filter(x=>x.employee_id===eid&&x.status==='OPEN')}
function employeeDebt(eid){return openAdvances(eid).reduce((s,x)=>s+Number(x.balance||0),0)}
function employeeScheduleCount(eid){return schedules.filter(x=>x.employee_id===eid&&x.active).length}
function employeeHasPin(eid){return employeeAccess.some(x=>x.employee_id===eid&&x.active)}
function employeeTimeDebt(eid){return Number(timeDebts.find(x=>x.employee_id===eid)?.open_minutes||0)}
function payrollReviewCount(w){return timeEntries.filter(t=>t.employee_id===w.employee_id&&t.work_date>=w.period_start&&t.work_date<=w.period_end&&t.review_status==='REVIEW').length}
function relevantOpenPayroll(eid){
 const today=localISODate();
 const pending=weeklyPayrolls.filter(w=>w.employee_id===eid&&(w.status==='OPEN'||w.status==='DUE')&&
  w.pay_date>=PAYROLL_LIVE_FROM&&w.source_mode!=='LEGACY_CONFIRM')
  .sort((a,b)=>String(a.pay_date).localeCompare(String(b.pay_date)));
 return pending.find(w=>w.period_start<=today&&w.pay_date>=today)||
  pending.find(w=>w.status==='OPEN'&&w.pay_date>=today)||pending.find(w=>w.status==='DUE')||null
}
function relevantPayroll(eid){
 let due=weeklyPayrolls.filter(x=>x.employee_id===eid&&x.status==='DUE').sort((a,b)=>String(a.pay_date).localeCompare(String(b.pay_date)))[0];
 if(due)return due;
 let open=relevantOpenPayroll(eid);if(open)return open;
 return weeklyPayrolls.filter(x=>x.employee_id===eid&&x.status==='PAID').sort((a,b)=>String(b.pay_date).localeCompare(String(a.pay_date)))[0]
}
function openPunchApp(){window.open(location.origin+location.pathname+'?fichaje=1','_blank')}


let payrollCycleShift=0,payrollPanelTab='due';
const PAYROLL_LIVE_FROM='2026-10-09';
function payrollCycleInfo(){
 const today=addDaysISO(localISODate(),payrollCycleShift*7),d=new Date(today+'T12:00:00');
 const weekday=d.getDay();
 let saturday=addDaysISO(today,-((weekday-6+7)%7));
 if(weekday===5)saturday=addDaysISO(today,1);
 return {friday:addDaysISO(saturday,-1),saturday,nextFriday:addDaysISO(saturday,6),nextSaturday:addDaysISO(saturday,7)}
}
function payrollInCycle(w,c,next=false){
 return w&&w.pay_date===(w.pay_schedule==='FRIDAY'?(next?c.nextFriday:c.friday):(next?c.nextSaturday:c.saturday))
}
/* Friday can prepare and record Saturday payroll when money was actually handed over.
   Never unlock paid, legacy or periods more than one day ahead. */
function payrollCanLiquidate(w){
 return !!w && ['OPEN','DUE'].includes(w.status) &&
   w.pay_date>=PAYROLL_LIVE_FROM && w.source_mode!=='LEGACY_CONFIRM' &&
   String(w.pay_date)<=addDaysISO(localISODate(),1);
}
function payrollSetView(view){
 if(!['due','next','paid','history'].includes(view))return;
 payrollPanelTab=view;renderPeople()
}
function payrollMoveCycle(delta){
 payrollCycleShift=delta===0?0:Math.max(-52,Math.min(26,payrollCycleShift+delta));
 payrollPanelTab='due';renderPeople()
}

function payrollVisualState(w,today=localISODate()){
 const day=String(w?.pay_date||'').slice(0,10);
 const historic=day<PAYROLL_LIVE_FROM||w?.source_mode==='LEGACY_CONFIRM';
 if(w?.status==='PAID')return {kind:'paid',label:'PAGADO',detail:'Registrado como pagado'+(w.paid_date?' el '+fmt(w.paid_date):''),background:'#eaf7ed',border:'#23844c',text:'#17663b'};
 if(historic)return {kind:'history',label:'HISTÓRICO SIN CONCILIAR',detail:'No confirma deuda ni pago pendiente.',background:'#f2f4f7',border:'#929eae',text:'#526072'};
 if((w?.status==='DUE'||w?.status==='OPEN')&&day<today){
  const days=Math.max(1,Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(day+'T00:00:00Z'))/86400000));
  return {kind:'late',label:'FUERA DE TÉRMINO',detail:'Sin pago registrado · '+days+' día'+(days===1?'':'s')+' de atraso desde '+fmt(day),background:'#fff0ef',border:'#cb3c38',text:'#9d2525'};
 }
 return {kind:'pending',label:'PENDIENTE DE LIQUIDACIÓN',detail:'Fecha prevista: '+fmt(day),background:'#fff7dd',border:'#db9d25',text:'#805208'};
}
function payrollStatusBadge(st){
 return '<span role="status" style="display:inline-block;max-width:100%;font-size:11px;font-weight:800;letter-spacing:.02em;border-radius:999px;padding:5px 9px;background:'+st.background+';color:'+st.text+';border:1px solid '+st.border+'">'+st.label+'</span>'
}


function payrollCard(w,e,readOnly=false){
 const isPaid=w.status==='PAID',isHistoric=w.pay_date<PAYROLL_LIVE_FROM||w.source_mode==='LEGACY_CONFIRM';
 const visual=payrollVisualState(w),debt=employeeDebt(e.id);
 const ready=!readOnly&&payrollCanLiquidate(w);
 const second=weeklyPayrolls.find(x=>x.employee_id===w.employee_id&&x.pay_date===addDaysISO(w.pay_date,7));
 const canBundle=ready&&w.status==='DUE'&&second&&second.status==='OPEN'&&!openAdvances(e.id).length;
 const mainLabel=ready?'Liquidar':isPaid?'Ver pago':isHistoric?'Consultar histórico':'Ver importe';
 const detailButton='<button class="'+(ready?'primary':'')+'" style="width:100%;min-height:52px;font-size:16px;font-weight:750" data-id="'+esc(w.id)+'" onclick="payrollDetail(this.dataset.id)">'+mainLabel+'</button>';
 let more='';
 if(!readOnly&&!isPaid&&!isHistoric){
  more='<details style="margin-top:9px"><summary style="padding:8px 2px;cursor:pointer;font-weight:600;font-size:13px">Más opciones</summary><div class="payroll-cycle-actions">'+
   (w.status==='OPEN'?'<button data-id="'+esc(e.id)+'" onclick="staffAddOvertime(this.dataset.id)">+ Horas extra</button>':w.status==='DUE'?'<button data-id="'+esc(w.id)+'" onclick="payrollDetail(this.dataset.id)">Editar horas extra</button>':'')+
   '<button data-id="'+esc(e.id)+'" onclick="advanceNew(this.dataset.id)">+ Adelanto</button>'+
   (canBundle?'<button data-id="'+esc(w.id)+'" onclick="payTwoWeeksPreview(this.dataset.id)">Pagar dos semanas</button>':'')+
   '</div></details>';
 }
 return '<div class="payroll-cycle-card" style="border-left:5px solid '+visual.border+';background:'+visual.background+';padding:12px 13px">'+
  '<div class="payroll-cycle-main"><div class="payroll-cycle-name">'+esc(e.name)+
  '<div class="small muted">Cobro '+fmt(w.pay_date)+'</div></div>'+
  '<div class="payroll-cycle-amount">'+money(w.net_total)+'</div></div>'+
  '<div class="small muted" style="margin-top:5px">Hora '+money(w.hourly_rate)+' · '+Number(w.regular_hours||0).toLocaleString('es-AR',{maximumFractionDigits:2})+' h habituales</div>'+
  '<div class="payroll-cycle-foot" style="margin:7px 0 9px">'+
  (Number(w.overtime_minutes)>0?'<span>Extras '+minsText(w.overtime_minutes)+'</span>':'')+
  (debt>0?'<span>Deuda de adelantos '+money(debt)+'</span>':'')+
  (isPaid&&Number(w.advance_deduction)>0?'<span>Descontado '+money(w.advance_deduction)+'</span>':'')+
  '</div>'+
  detailButton+
  (debt>0||Number(w.advance_deduction)>0?
   '<button type="button" style="width:100%;min-height:38px;margin-top:6px;font-size:13px" data-id="'+esc(e.id)+'" onclick="advancesForm(this.dataset.id)">Adelantos · Ver movimientos</button>':'')+
  (isPaid&&Number(w.advance_deduction)>0&&!advanceLedgerFromPayroll(w).ok?
   '<div class="small bad">Revisar imputación de adelanto</div>':'')+
  more+
  (isHistoric&&!isPaid?'<div class="small muted">Histórico sólo consulta</div>':'')+
  '</div>';
}

let personnelView='salary';
function personnelOpen(view){
 if(view!=='staff'&&view!=='salary'&&view!=='advances')return;
 personnelView=view;renderPeople()
}
function personnelNavigation(){
 return '<div style="margin-bottom:13px"><h2 style="margin:0 0 12px">Personal</h2>'+
 '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px">'+
 '<button class="'+(personnelView==='salary'?'primary':'')+'" style="min-height:47px;padding:8px 4px" onclick="personnelOpen(\'salary\')">Sueldos</button>'+
 '<button class="'+(personnelView==='advances'?'primary':'')+'" style="min-height:47px;padding:8px 4px" onclick="personnelOpen(\'advances\')">Adelantos</button>'+
 '<button class="'+(personnelView==='staff'?'primary':'')+'" style="min-height:47px;padding:8px 4px" onclick="personnelOpen(\'staff\')">Empleados</button></div></div>'
}


/* Adelantos visibles: se leen únicamente movimientos reales y liquidaciones ya guardadas. */
function advanceLedgerFromPayroll(w){
 const rows=ded.filter(x=>x.movement_type==='PAYMENT'&&String(x.request_key||'').startsWith('payroll-'+w.id+'-advance-'));
 const total=rows.reduce((n,x)=>n+Number(x.amount||0),0);
 const expected=Number(w.advance_deduction||0);
 return {rows,total,expected,ok:Math.abs(total-expected)<.01};
}
function advancesForEmployee(eid){return advAccounts.filter(x=>x.employee_id===eid)}
function advanceDuplicateCandidates(aid){
 const seen=new Map(),hits=[];
 for(const x of ded.filter(x=>x.advance_id===aid&&x.movement_type==='PAYMENT'&&Number(x.amount)>0)){
  const key=x.deduction_date+'-'+Number(x.amount).toFixed(2);
  if(seen.has(key)){hits.push(x.deduction_date);continue}
  seen.set(key,true)
 }
 return Array.from(new Set(hits))
}
function renderAdvancesDashboard(){
 const pending=advAccounts.filter(a=>a.status==='OPEN'&&Number(a.balance)>0)
  .slice().sort((a,b)=>Number(b.weekly_review_due===true)-Number(a.weekly_review_due===true)||
   Number(b.balance)-Number(a.balance));
 const debt=pending.reduce((n,a)=>n+Number(a.balance||0),0);
 const people=new Map(emps.map(e=>[e.id,e]));
 const due=pending.filter(a=>a.weekly_review_due===true).length;
 const recent=ded.filter(d=>d.movement_type==='PAYMENT'&&Number(d.amount)>0)
  .slice().sort((a,b)=>String(b.deduction_date).localeCompare(String(a.deduction_date))||
    String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,10);
 const advmap=new Map(advAccounts.map(a=>[a.id,a]));
 payTable.innerHTML=personnelNavigation()+
 '<div class="card" style="padding:14px;margin-bottom:11px"><div class="small muted">ADELANTOS POR COBRAR</div>'+
 '<b style="font-size:25px;display:block;margin:4px 0">'+money(debt)+'</b>'+
 '<span class="small muted">'+pending.length+' adelantos abiertos'+(due?' · '+due+' requieren control':'')+'</span></div>'+
 (pending.length?pending.map(a=>{
  const e=people.get(a.employee_id),rep=advanceDuplicateCandidates(a.id);
  return '<div class="card" style="padding:13px;margin-bottom:9px">'+
  '<div class="row between"><div><b style="font-size:16px">'+esc(e?.name||a.employee_name||'Empleado')+'</b>'+
  '<div class="small muted">Adelanto '+fmt(a.advance_date)+' · '+money(a.original_amount)+'</div></div>'+
  '<div style="text-align:right"><div class="small muted">Por cobrar</div><b style="font-size:18px">'+money(a.balance)+'</b></div></div>'+
  '<div class="small muted" style="margin:7px 0">Recuperado '+money(a.paid_amount)+
  ' · Último pago '+(a.last_payment_date?fmt(a.last_payment_date):'sin registrar')+'</div>'+
  (a.weekly_review_due===true?'<div class="small bad">Revisar descuento de esta semana</div>':'')+
  (rep.length?'<div class="small bad">Revisar movimientos del '+esc(rep.map(fmt).join(', '))+' (mismo importe y fecha)</div>':'')+
  '<div class="row" style="gap:7px;flex-wrap:wrap;margin-top:9px">'+
  '<button class="primary" data-eid="'+esc(a.employee_id)+'" onclick="advancesForm(this.dataset.eid)">Ver historial</button>'+
  '<button data-aid="'+esc(a.id)+'" data-eid="'+esc(a.employee_id)+'" onclick="dedNew(this.dataset.aid,this.dataset.eid)">Cobro fuera de sueldo</button></div></div>'
 }).join(''):'<div class="card">No hay adelantos pendientes.</div>')+
 '<details style="margin-top:13px"><summary style="font-weight:700;padding:10px 0">Últimos movimientos registrados</summary>'+
 (recent.length?recent.map(d=>{
  const a=advmap.get(d.advance_id),e=people.get(a?.employee_id);
  const payroll=String(d.request_key||'').startsWith('payroll-');
  return '<div class="history-line"><span>'+fmt(d.deduction_date)+' · '+esc(e?.name||a?.employee_name||'Empleado')+
   '<div class="small muted">'+(payroll?'Descuento de sueldo':'Devolución fuera de sueldo')+
   ' · Adelanto '+fmt(a?.advance_date)+'</div></span><b>'+money(d.amount)+'</b></div>'
 }).join(''):'<div class="small muted">Todavía no hay movimientos.</div>')+'</details>'
}

function attendanceAlertDateParts(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const out={};parts.forEach(p=>{if(p.type!=='literal')out[p.type]=p.value});
 const d=new Date(out.year+'-'+out.month+'-'+out.day+'T12:00:00Z');
 return {date:out.year+'-'+out.month+'-'+out.day,minutes:Number(out.hour||0)*60+Number(out.minute||0),isoWeekday:d.getUTCDay()===0?7:d.getUTCDay()};
}
function attendanceAlertInstall(){
 const host=document.querySelector('#app main.wrap');
 if(!host)return;
 const old=document.getElementById('auditAttendanceAlert');if(old)old.remove();
 const now=attendanceAlertDateParts(),rows=[];
 (emps||[]).filter(e=>e.active).forEach(e=>{
  const s=(schedules||[]).find(x=>x.employee_id===e.id&&Number(x.iso_weekday)===now.isoWeekday&&x.active&&x.work_start&&x.work_end);
  if(!s)return;
  const start=Number(String(s.work_start).slice(0,2))*60+Number(String(s.work_start).slice(3,5));
  if(now.minutes<start)return;
  if((attendanceOverrides||[]).some(o=>o.employee_id===e.id&&o.work_date===now.date&&o.status==='ABSENT'))return;
  if((timeEntries||[]).some(t=>t.employee_id===e.id&&t.work_date===now.date&&t.clock_in_at&&!t.is_test))return;
  rows.push({e,s})
 });
 if(!rows.length)return;
 const box=document.createElement('section');box.id='auditAttendanceAlert';
 box.innerHTML='<div class="audit-attendance-alert-head"><div><strong>Fichajes pendientes</strong><span>Hay turnos iniciados sin entrada registrada.</span></div><span class="audit-attendance-alert-count">'+rows.length+'</span></div>'+
  rows.map(x=>'<div class="audit-attendance-alert-row"><div><b>'+esc(x.e.name)+'</b><small>Turno '+String(x.s.work_start).slice(0,5)+'–'+String(x.s.work_end).slice(0,5)+'</small></div><div class="audit-attendance-alert-actions"><button type="button" data-attendance-add="'+x.e.id+'">Corregir fichaje</button><button type="button" class="primary" data-attendance-absent="'+x.e.id+'">Marcar ausente</button></div></div>').join('');
 host.prepend(box);
 box.querySelectorAll('[data-attendance-absent]').forEach(b=>b.onclick=()=>window.auditV5Override(b.dataset.attendanceAbsent,'ABSENT',now.date));
 box.querySelectorAll('[data-attendance-add]').forEach(b=>b.onclick=()=>window.auditV5Add(b.dataset.attendanceAdd,now.date));
 if(!window._auditAttendanceAlertTimer)window._auditAttendanceAlertTimer=setInterval(()=>{if(TOKEN_OK.test(tok))attendanceAlertInstall()},60000)
}
function renderPeople(){
 if(personnelView==='staff'){renderPersonnelHome();attendanceAlertInstall();return}
 if(personnelView==='advances'){renderAdvancesDashboard();attendanceAlertInstall();return}
 renderPayrollTable();
 payTable.innerHTML=personnelNavigation()+payTable.innerHTML;
 attendanceAlertInstall()
}

/* Agrupación visual basada en los horarios ya cargados. No cambia la asignación ni los sueldos. */
function staffShiftGroup(employeeId){
 const shifts=schedules.filter(s=>s.employee_id===employeeId&&s.active===true&&s.work_start&&s.work_end);
 if(!shifts.length)return 'unassigned';
 let morning=0,afternoon=0;
 for(const s of shifts){
  const type=String(s.shift_code||'').toUpperCase();
  const hour=Number(String(s.work_start).slice(0,2));
  if(type==='MORNING')morning++;
  else if(type==='AFTERNOON')afternoon++;
  else if(Number.isFinite(hour)){if(hour<14)morning++;else afternoon++}
 }
 if(!morning&&!afternoon)return 'unassigned';
 return morning>=afternoon?'morning':'afternoon';
}

/* Pago: clasificación administrativa, no cambia el turno de fichaje. */
function payrollEmployeeShift(e){
 const key=String(e?.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
 if(['damian','gisel','joel','luna'].includes(key))return 'morning';
 if(key==='rocio')return 'afternoon';
 return staffShiftGroup(e?.id);
}
function staffShiftGroups(rows,card,unit='empleados'){
 const groups=[['morning','Turno mañana'],['afternoon','Turno tarde'],['unassigned','Sin turno configurado']];
 return groups.map(([key,label])=>{
  const items=rows.filter(x=>(unit==='liquidaciones'?payrollEmployeeShift(x.e||x):staffShiftGroup((x.e||x).id))===key).sort((a,b)=>
   String((a.e||a).name||'').localeCompare(String((b.e||b).name||''),'es'));
  if(!items.length)return '';
  return '<section style="margin:15px 0 20px"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #dbe3ea;padding:8px 3px;margin-bottom:9px">'+
   '<h3 style="margin:0;font-size:16px">'+label+'</h3><span class="small muted">'+items.length+' '+unit+'</span></div>'+
   (key==='unassigned'?'<div class="small muted" style="margin-bottom:10px">Estos empleados no tienen un horario habitual cargado. Se pueden liquidar normalmente, sin inventar un turno.</div>':'')+
   items.map(card).join('')+'</section>';
 }).join('');
}

const STAFF_DAYS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
function staffDailySchedule(employeeId){
 const rows=schedules.filter(s=>s.employee_id===employeeId);
 if(!rows.length)return '<div class="small muted">No hay horarios por día configurados.</div>';
 return STAFF_DAYS.map((name,index)=>{
  const s=rows.find(x=>Number(x.iso_weekday)===index+1);
  const time=s?.active&&s.work_start&&s.work_end
   ?String(s.work_start).slice(0,5)+' – '+String(s.work_end).slice(0,5)
   :'Franco';
  return '<div class="row between" style="padding:5px 0;border-bottom:1px solid #e2e8f0"><span>'+name+'</span><b>'+esc(time)+'</b></div>';
 }).join('');
}

function staffPayBreakdown(w,e){
 const regularHours=Number(w?.regular_hours??e.weekly_regular_hours??0),hourly=Number(w?.hourly_rate??e.hourly_rate??0);
 const base=w?Number(w.base_amount||0):regularHours*hourly;
 const extraMinutes=Number(w?.overtime_minutes||0),extra=Number(w?.overtime_amount||0);
 const discounts=Number(w?.other_discounts||0),advance=Number(w?.advance_deduction||0),net=w?Number(w.net_total||0):base;
 const st=w?payrollVisualState(w):null;
 return '<div style="background:'+(st?st.background:'#f8fafc')+';border:1px solid '+(st?st.border:'#e2e8f0')+';border-left:4px solid '+(st?st.border:'#e2e8f0')+';border-radius:11px;padding:11px;margin:9px 0">'+
  (st?'<div style="margin-bottom:6px">'+payrollStatusBadge(st)+'</div>':'')+
  '<div class="small muted" style="margin-bottom:7px">Semana '+(w?fmt(w.pay_date):'habitual')+'</div>'+
  (st?'<div class="small" style="color:'+st.text+';margin:0 0 8px;font-weight:650">'+esc(st.detail)+'</div>':'')+
  '<div class="row between" style="margin:5px 0"><span>Base · '+regularHours.toLocaleString('es-AR',{maximumFractionDigits:2})+' h × '+money(hourly)+'/h</span><b>'+money(base)+'</b></div>'+
  '<div class="row between" style="margin:5px 0"><span>Extras · '+minsText(extraMinutes)+'</span><b>+'+money(extra)+'</b></div>'+
  (discounts?'<div class="row between"><span>Otros descuentos</span><b>−'+money(discounts)+'</b></div>':'')+
  (advance?'<div class="row between"><span>Adelanto descontado</span><b>−'+money(advance)+'</b></div>':'')+
  '<div class="row between" style="padding-top:7px;margin-top:7px;border-top:1px solid #cbd5e1"><b>'+(w?.status==='PAID'?'Total registrado como pagado':'Total semanal')+'</b><b style="font-size:17px">'+money(net)+'</b></div>'+
  '<div class="small muted" style="margin-top:7px">'+(w?.status==='PAID'?'Registro interno; no acredita entrega de dinero.':'Las extras sólo afectan esta semana, no modifican la base habitual.')+'</div></div>';
}

function staffCard(e){
 const debt=employeeDebt(e.id);
 const open=relevantOpenPayroll(e.id);
 const due=weeklyPayrolls.filter(w=>w.employee_id===e.id&&payrollCanLiquidate(w))
  .sort((a,b)=>String(b.pay_date).localeCompare(String(a.pay_date)))[0];
 const w=open||due,cardStatus=w?payrollVisualState(w):null;
 return '<article class="staff-card" data-staffname="'+esc(e.name.toLocaleLowerCase('es'))+'" style="background:#fff;border:1px solid #dfe4ea;border-left:5px solid '+(cardStatus?cardStatus.border:'#dfe4ea')+';border-radius:15px;padding:14px;margin:0 0 10px;box-shadow:0 1px 3px rgba(0,0,0,.035)">'+
  '<div style="display:flex;gap:10px;align-items:start;justify-content:space-between">'+
   '<div><b style="font-size:16px">'+esc(e.name)+'</b><div class="small muted">'+(employeeHasPin(e.id)?'PIN de fichaje activo':'PIN sin activar')+' · Pago '+payRuleLabel(e.pay_schedule)+'</div></div>'+
   '<div style="text-align:right"><div class="small muted">Deuda adelantos</div><b>'+money(debt)+'</b></div></div>'+
  '<div style="font-size:13px;margin:8px 0"><b>Horas habituales: '+Number(e.weekly_regular_hours||0).toLocaleString('es-AR',{maximumFractionDigits:2})+' h/semana</b> · '+money(e.hourly_rate)+' por hora</div>'+
  staffPayBreakdown(w,e)+
  '<details style="margin:10px 0"><summary style="cursor:pointer;font-weight:650;min-height:35px">Ver horarios por día</summary>'+
  '<div style="padding:8px 2px;font-size:13px">'+staffDailySchedule(e.id)+'</div>'+
  '<button data-id="'+esc(e.id)+'" onclick="employeeScheduleForm(this.dataset.id)">Editar horarios diarios</button></details>'+
  '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:11px">'+
   '<button class="primary" style="min-height:46px;font-weight:700" data-id="'+esc(e.id)+'" onclick="advanceNew(this.dataset.id)">+ Adelanto</button>'+
   '<button style="min-height:46px;font-weight:700" data-id="'+esc(e.id)+'" onclick="staffRepay(this.dataset.id)" '+(debt<=0?'disabled':'')+'>Devolución externa</button>'+
   '<button style="min-height:46px;font-weight:700" data-id="'+esc(e.id)+'" onclick="staffAddOvertime(this.dataset.id)">+ Horas extra</button>'+
   '<button style="min-height:46px;font-weight:700" data-id="'+esc(e.id)+'" onclick="employeeProfile(this.dataset.id)">Ficha y cuenta</button>'+
  '</div>'+
  '<button type="button" style="width:100%;min-height:46px;margin-top:8px" data-id="'+esc(e.id)+'" onclick="quickHourlyRateForm(this.dataset.id)">Editar valor hora</button>'+
  '<details style="margin-top:6px"><summary class="small muted" style="cursor:pointer">Otros ajustes del empleado</summary><button type="button" style="width:100%;min-height:40px;margin-top:6px" data-id="'+esc(e.id)+'" onclick="employeeConditionsForm(this.dataset.id)">Modificar horas habituales y condiciones</button></details>'+
  (due?'<button class="primary" style="width:100%;min-height:48px;margin-top:8px" data-id="'+esc(due.id)+'" onclick="payrollDetail(this.dataset.id)">Liquidar · '+money(due.net_total)+'</button>':'')+
  '</article>';
}

function renderPersonnelHome(){
 const employees=emps.filter(x=>x.active).slice().sort((a,b)=>
   Number(a.sort_order??9999)-Number(b.sort_order??9999)||String(a.name).localeCompare(String(b.name),'es'));
 const debt=employees.reduce((t,e)=>t+employeeDebt(e.id),0);
 const activeAdv=employees.reduce((t,e)=>t+openAdvances(e.id).length,0);
 payTable.innerHTML=personnelNavigation()+
  '<div style="border:1px solid #dbe3ec;background:#f8fafc;border-radius:14px;padding:14px;margin:10px 0 14px">'+
  '<div class="small muted">SALDO TOTAL DE ADELANTOS PENDIENTES</div><b style="font-size:25px;display:block;margin:3px 0">'+money(debt)+'</b>'+
  '<div class="small muted">'+employees.length+' empleados activos · '+activeAdv+' adelantos abiertos · Saldos calculados desde los movimientos</div></div>'+
  '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin:13px 0"><b style="font-size:16px">Empleados</b>'+
  '<button onclick="employeeForm()">+ Empleado</button></div>'+
  '<input id="personnelSearch" type="search" autocomplete="off" placeholder="Buscar empleado…" style="width:100%;min-height:48px;margin-bottom:12px" oninput="staffSearch(this.value)" aria-label="Buscar empleado">'+
  '<div id="personnelEmployeeList">'+staffShiftGroups(employees,staffCard,'empleados')+'</div>'+
  '<div class="row" style="margin:13px 0"><button onclick="timeReviewScreen()">Ver fichajes</button><button onclick="employeePinQuickPicker()">PIN de fichaje</button></div>'+
  '<div class="small muted" style="margin-bottom:8px">Los adelantos se suman a la deuda; las devoluciones se restan. Ninguna de estas acciones descuenta automáticamente del sueldo.</div>'
}
function staffSearch(term){
 let t=String(term||'').toLocaleLowerCase('es').trim();
 document.querySelectorAll('#personnelEmployeeList .staff-card').forEach(el=>{
  el.classList.toggle('hide',!!t&&!String(el.dataset.staffname||'').includes(t))
 })
}
function staffRepay(eid){
 const a=openAdvances(eid).filter(x=>Number(x.balance)>0);
 const e=employeeById(eid);
 if(!a.length)return A('Este empleado no tiene adelantos pendientes.');
 if(a.length===1)return dedNew(a[0].id,eid);
 M('<h3>Devolución fuera del sueldo · '+esc(e?.name||'Empleado')+'</h3>'+
  '<div class="calc"><b>Deuda total: '+money(employeeDebt(eid))+'</b><div class="small muted">Elegí a cuál adelanto imputar la devolución.</div></div>'+
  a.map(x=>'<button data-aid="'+esc(x.id)+'" data-eid="'+esc(eid)+'" onclick="dedNew(this.dataset.aid,this.dataset.eid)" style="width:100%;min-height:54px;margin-top:9px;text-align:left">'+
  'Adelanto '+fmt(x.advance_date)+' · Saldo '+money(x.balance)+'</button>').join(''))
}
let activeStaffOvertimeRequestKey='';
function staffAddOvertime(eid){
 const e=employeeById(eid);if(!e)return A('Empleado inexistente.');
 const choices=weeklyPayrolls.filter(w=>w.employee_id===eid&&w.status==='OPEN'&&w.pay_date>=PAYROLL_LIVE_FROM&&w.source_mode!=='LEGACY_CONFIRM')
  .sort((a,b)=>String(a.pay_date).localeCompare(String(b.pay_date)));
 if(!choices.length)return A('No hay una semana abierta para sumar extras. Los períodos pagados permanecen cerrados.');
 const today=localISODate(),current=choices.find(w=>w.period_start<=today&&w.pay_date>=today)||choices[0];
 activeStaffOvertimeRequestKey=requestKey();
 const select=choices.length===1?
  '<input id="staffExtraPay" type="hidden" value="'+esc(current.id)+'"><div class="calc small">Semana '+fmt(current.period_start)+' al '+fmt(current.period_end)+'</div>':
  '<label>Semana</label><select id="staffExtraPay" onchange="staffOvertimePreview()">'+
   choices.map(w=>'<option value="'+esc(w.id)+'" '+(w.id===current.id?'selected':'')+'>'+fmt(w.period_start)+' al '+fmt(w.period_end)+'</option>').join('')+'</select>';
 M('<h3>Sumar horas extra · '+esc(e.name)+'</h3>'+select+
  '<label>Horas a sumar</label><input id="staffExtraHours" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej. 1,5" oninput="staffOvertimePreview()">'+
  '<div class="row" style="margin:8px 0;gap:7px"><button type="button" onclick="staffOvertimeQuick(0.5)">30 min</button><button type="button" onclick="staffOvertimeQuick(1)">1 h</button><button type="button" onclick="staffOvertimeQuick(1.5)">1 h 30</button></div>'+
  '<div class="calc" id="staffExtraCalc"></div>'+
  '<button class="primary" style="width:100%;min-height:52px;margin-top:10px" id="staffExtraSubmit" onclick="staffOvertimeSave()">Guardar extras de esta semana</button>');
 staffOvertimePreview();
}
function staffOvertimeQuick(hours){
 const input=document.getElementById('staffExtraHours');if(!input)return;
 input.value=Number(hours).toLocaleString('es-AR',{maximumFractionDigits:2});
 staffOvertimePreview();
}

function staffOvertimePreview(){
 const w=weeklyPayrolls.find(x=>x.id===document.getElementById('staffExtraPay')?.value);
 const field=document.getElementById('staffExtraHours');
 const result=document.getElementById('staffExtraCalc');
 if(!w||!result)return;
 const hours=parseAmount(field?.value||'');
 const add=Math.round(hours*60);
 result.innerHTML='<div class="row between"><span>Extras ya registradas</span><b>'+minsText(w.overtime_minutes||0)+'</b></div>'+
  '<div class="row between"><span>Horas adicionales</span><b>'+(hours>0?minsText(add):'—')+'</b></div>'+
  '<div class="row between"><b>Nuevo total</b><b>'+minsText(Number(w.overtime_minutes||0)+Math.max(0,add))+'</b></div>'+
  '<div class="row between"><span>Incremento de sueldo</span><b>'+(hours>0?money((add/60)*Number(w.hourly_rate||0)):'—')+'</b></div>'
}
async function staffOvertimeSave(){
 const w=weeklyPayrolls.find(x=>x.id===document.getElementById('staffExtraPay')?.value);
 const raw=document.getElementById('staffExtraHours')?.value||'';
 const hours=parseAmount(raw),minutes=Math.round(hours*60);
 const why=(document.getElementById('staffExtraWhy')?.value||'').trim()||('Horas extra manuales · '+fmt(w?.period_start)+' al '+fmt(w?.period_end));
 if(!w||w.status!=='OPEN'||w.pay_date<PAYROLL_LIVE_FROM)return A('Sólo se pueden modificar liquidaciones abiertas.');
 if(!raw.trim()||!Number.isFinite(hours)||hours<=0||hours>24||minutes<=0)return A('Ingresá una cantidad válida de horas adicionales.');
 if(!confirm('¿Sumar '+minsText(minutes)+' a las extras existentes de '+(employeeById(w.employee_id)?.name||'este empleado')+'?'))return;
 busyBtn('staffExtraSubmit',true,'Guardando extras…');
 try{
  const latest=await sb.from('audit_weekly_payrolls').select('id,status,overtime_minutes,net_total').eq('id',w.id).single();
  if(latest.error)return A('No pude comprobar la liquidación: '+latest.error.message);
  if(latest.data.status!=='OPEN'||Number(latest.data.overtime_minutes)!==Number(w.overtime_minutes)||
    Math.abs(Number(latest.data.net_total)-Number(w.net_total))>0.009)
    return A('La liquidación cambió. Volvé a abrir el formulario para revisar el nuevo total.');
  const key=activeStaffOvertimeRequestKey||(activeStaffOvertimeRequestKey=requestKey());
  const r=await sb.rpc('audit_add_weekly_overtime',{
    p_payroll_id:w.id,p_additional_minutes:minutes,p_reason:why,p_request_key:key
  });
  if(r.error){
    await loadPeople();
    return A('No se pudo confirmar la carga: '+r.error.message+'. Revisá las extras antes de volver a intentar.');
  }
  activeStaffOvertimeRequestKey='';
  X();await loadPeople();
  A(r.data?.already_applied?'Estas horas ya estaban registradas.':'Horas adicionales sumadas y sueldo recalculado.');
 }finally{busyBtn('staffExtraSubmit',false)}
}

function renderPayrollTable(){
 const c=payrollCycleInfo(),employees=emps.filter(e=>e.active).slice().sort((a,b)=>
  Number(a.sort_order??9999)-Number(b.sort_order??9999)||String(a.name).localeCompare(String(b.name),'es'));
 const current=employees.map(e=>({e,w:weeklyPayrolls.find(w=>w.employee_id===e.id&&payrollInCycle(w,c))})).filter(x=>x.w);
 const future=employees.map(e=>({e,w:weeklyPayrolls.find(w=>w.employee_id===e.id&&payrollInCycle(w,c,true))})).filter(x=>x.w);
 const due=current.filter(x=>['OPEN','DUE'].includes(x.w.status)&&x.w.pay_date>=PAYROLL_LIVE_FROM&&x.w.source_mode!=='LEGACY_CONFIRM');
 const olderOverdue=payrollCycleShift===0?weeklyPayrolls.filter(w=>['OPEN','DUE'].includes(w.status)&&w.pay_date>=PAYROLL_LIVE_FROM&&w.source_mode!=='LEGACY_CONFIRM'&&w.pay_date<localISODate()&&w.pay_date<c.friday&&!current.some(x=>x.w.id===w.id)).map(w=>({w,e:employeeById(w.employee_id)})).filter(x=>x.e?.active):[];
 const pending=[...olderOverdue,...due].sort((a,b)=>String(a.w.pay_date).localeCompare(String(b.w.pay_date))||String(a.e.name).localeCompare(String(b.e.name),'es'));
 const lateCount=pending.filter(x=>payrollVisualState(x.w).kind==='late').length;
 const next=future.filter(x=>x.w.status==='OPEN');
 const paid=weeklyPayrolls.filter(w=>w.status==='PAID'&&w.pay_date>=c.friday&&w.pay_date<=c.nextSaturday)
  .map(w=>({w,e:employeeById(w.employee_id)})).filter(x=>x.e).sort((a,b)=>String(a.w.pay_date).localeCompare(String(b.w.pay_date)));
 const history=weeklyPayrolls.filter(w=>w.pay_date<PAYROLL_LIVE_FROM).map(w=>({w,e:employeeById(w.employee_id)}))
  .filter(x=>x.e).sort((a,b)=>String(b.w.pay_date).localeCompare(String(a.w.pay_date))||String(a.e.name).localeCompare(String(b.e.name),'es'));
 const chosen=payrollPanelTab==='due'?pending:payrollPanelTab==='next'?next:payrollPanelTab==='paid'?paid:history;
 const labels={due:'Pendientes',next:'Próxima semana',paid:'Pagados',history:'Histórico anterior'};
 const tabs=['due','next','paid','history'].map(k=>'<button class="'+(payrollPanelTab===k?'primary':'')+'" onclick="payrollSetView(\''+k+'\')">'+labels[k]+
  (k==='due'?' · '+pending.length:k==='next'?' · '+next.length:k==='paid'?' · '+paid.length:'')+'</button>').join('');
 const dueTotal=pending.reduce((s,x)=>s+Number(x.w.net_total||0),0),paidTotal=paid.reduce((s,x)=>s+Number(x.w.net_total||0),0);
 const noRows=payrollPanelTab==='due'?'Sin sueldos pendientes en este ciclo. Los pagados se consultan en su pestaña.':
  payrollPanelTab==='next'?'Todavía no hay liquidaciones de la semana siguiente.':
  payrollPanelTab==='paid'?'Aún no se registraron pagos de este ciclo.':'No hay liquidaciones históricas.';
 payTable.innerHTML='<div class="payroll-top"><div><div class="small muted">CICLO DE PAGOS</div><h2>Sueldos · '+fmt(c.friday)+' y '+fmt(c.saturday)+'</h2>'+
 '<div class="small muted">Pagos con vencimiento viernes o sábado. Cada período pagado queda cerrado.</div></div>'+
 '<div class="payroll-cycle-nav"><button onclick="payrollMoveCycle(-1)">← Anterior</button><button onclick="payrollMoveCycle(0)">Actual</button><button onclick="payrollMoveCycle(1)">Siguiente →</button></div></div>'+
 '<div class="payroll-cycle-summary"><div><span>Pendientes</span><b>'+pending.length+'</b><small>'+money(dueTotal)+'</small></div>'+
 '<div><span>Pagados</span><b>'+paid.length+'</b><small>'+money(paidTotal)+'</small></div>'+
 '<div><span>Próxima semana</span><b>'+next.length+'</b><small>'+fmt(c.nextFriday)+' y '+fmt(c.nextSaturday)+'</small></div></div>'+
 (lateCount&&payrollPanelTab==='due'?'<div role="status" style="border-left:4px solid #cb3c38;padding:9px 12px;background:#fff0ef;border-radius:9px;margin:8px 0 12px;color:#9d2525;font-weight:700">'+lateCount+' liquidación'+(lateCount===1?'':'es')+' fuera de término · sin pago registrado</div>':'')+
 '<div class="payroll-tabs">'+tabs+'</div>'+
 (payrollPanelTab==='due'&&due.filter(x=>x.w.status==='DUE').length>1?'<div class="payroll-batch-alert"><div><b>Registrar varios sueldos</b><div class="small muted">Seleccioná sólo a quienes ya les pagaste. Los demás siguen pendientes.</div></div><button class="primary" onclick="payrollBatchPreview()">Seleccionar pagos realizados</button></div>':'')+
 (chosen.length?'<div class="payroll-cycle-list">'+staffShiftGroups(chosen,x=>payrollCard(x.w,x.e,payrollPanelTab==='paid'||payrollPanelTab==='history'),'liquidaciones')+'</div>':
 '<div class="empty">'+noRows+'</div>')+
 '<div class="payroll-bottom-actions"><button class="primary" onclick="employeePinQuickPicker()">Activar PINs de fichaje</button><button onclick="timeReviewScreen()">Consultar fichajes</button><button onclick="openPunchApp()">Abrir fichaje</button><button onclick="payrollGeofenceSetup()">Ubicación para fichaje</button><button onclick="employeeForm()">+ Empleado</button></div>'
}

function payrollBatchPreview(){
 const cycle=payrollCycleInfo();
 const rows=weeklyPayrolls.filter(w=>w.status==='DUE'&&w.pay_date>=PAYROLL_LIVE_FROM&&
  w.source_mode!=='LEGACY_CONFIRM'&&payrollInCycle(w,cycle)&&employeeById(w.employee_id)?.active)
  .sort((a,b)=>String(employeeById(a.employee_id)?.name).localeCompare(String(employeeById(b.employee_id)?.name),'es'));
 if(!rows.length)return A('No hay sueldos pendientes en esta semana.');
 M('<h3>Registrar varios sueldos pagados</h3>'+
  '<p class="small muted">Revisá el valor hora, las extras y los adelantos por empleado. Sólo marcá pagos realmente realizados.</p>'+
  rows.map(w=>{
   const e=employeeById(w.employee_id),loans=openAdvances(e.id),flag=(w.notes||'').includes('REVISAR:');
   return '<div class="card" style="padding:13px;margin:10px 0;border-radius:13px">'+
     '<label style="display:flex;align-items:center;gap:10px;font-size:15px;color:inherit">'+
      '<input type="checkbox" class="batchStaffChoice" data-id="'+esc(w.id)+'" style="width:22px;min-width:22px;height:22px" onchange="payrollBatchCalc()" '+(flag?'disabled':'')+'>'+
      '<span><b>'+esc(e.name)+'</b><div class="small muted">'+money(w.net_total)+' · '+minsText(w.overtime_minutes)+' extras</div></span></label>'+
     '<div class="small muted" style="margin:7px 0">Hora '+money(w.hourly_rate)+' · '+Number(w.regular_hours||0).toLocaleString('es-AR',{maximumFractionDigits:2})+' h habituales</div>'+
     '<div class="row" style="gap:8px;margin:6px 0"><button type="button" data-id="'+esc(w.id)+'" onclick="payrollDetail(this.dataset.id)">Editar extras</button>'+
      '<button type="button" data-id="'+esc(e.id)+'" onclick="quickHourlyRateForm(this.dataset.id)">Editar valor hora</button></div>'+
     (flag?'<div class="small bad">Tiene ajustes pendientes de revisión. Liquidalo individualmente.</div>':'')+
     (loans.length?'<details style="margin:10px 0"><summary style="cursor:pointer;font-weight:650">Descontar adelantos ('+loans.length+')</summary>'+
      loans.map(a=>'<label style="display:block;margin-top:9px">Adelanto '+fmt(a.advance_date)+' · Saldo '+money(a.balance)+
       '<input class="batchAdvanceAmount" data-payroll-id="'+esc(w.id)+'" data-advance-id="'+esc(a.id)+'" type="text" inputmode="decimal" value="0" style="width:100%;min-height:42px;margin-top:3px" oninput="payrollBatchCalc()" /></label>').join('')+
      '</details>':'')+
    '</div>';
  }).join('')+
 '<div id="batchPayrollSummary" class="calc">Seleccioná los pagos realizados.</div>'+
 '<label class="checkline"><input id="batchPayrollAgree" type="checkbox"> Confirmo que se entregaron o imputaron los importes seleccionados</label>'+
 '<button class="primary" id="batchPayrollSave" style="width:100%;min-height:52px;margin-top:12px" onclick="payrollBatchSave()">Registrar pagos seleccionados</button>');
 payrollBatchCalc()
}


function payrollBatchCalc(){
 const picked=Array.from(document.querySelectorAll('.batchStaffChoice:checked'));
 const result=document.getElementById('batchPayrollSummary');if(!result)return;
 let total=0,credit=0,error='';const allocationsByPayroll={};
 for(const check of picked){
  const w=weeklyPayrolls.find(x=>x.id===check.dataset.id);if(!w)continue;
  const alloc=payrollAdvanceAllocations('.batchAdvanceAmount[data-payroll-id="'+w.id+'"]',openAdvances(w.employee_id));
  const gross=Number(w.base_amount||0)+Number(w.overtime_amount||0)-Number(w.other_discounts||0);
  if(alloc.error)error=alloc.error;
  if(alloc.total>gross+.009)error='Los adelantos superan el sueldo disponible de '+(employeeById(w.employee_id)?.name||'un empleado')+'.';
  allocationsByPayroll[w.id]=alloc.allocations;
  total+=gross-alloc.total;credit+=alloc.total;
 }
 result.innerHTML='<div class="row between"><span>Sueldos seleccionados</span><b>'+picked.length+'</b></div>'+
  '<div class="row between"><span>Descuentos a adelantos</span><b>'+money(credit)+'</b></div>'+
  '<div class="row between"><b>Importe declarado como pagado</b><b>'+money(total)+'</b></div>'+
  (error?'<div class="bad">'+esc(error)+'</div>':'');
 const submit=document.getElementById('batchPayrollSave');if(submit)submit.disabled=!!error;
 return {picked,total,credit,error,allocationsByPayroll}
}


async function payrollBatchSave(){
 const summary=payrollBatchCalc();
 if(!summary?.picked?.length)return A('Seleccioná al menos un sueldo realmente pagado.');
 if(summary.error)return A(summary.error);
 if(!document.getElementById('batchPayrollAgree')?.checked)
  return A('Confirmá que los importes seleccionados ya se entregaron o imputaron.');
 const selected=summary.picked.map(check=>{
  const w=weeklyPayrolls.find(x=>x.id===check.dataset.id);
  return {payroll_id:w.id,allocations:summary.allocationsByPayroll[w.id]||[],expected_net:Number(w.net_total)};
 });
 if(!confirm('¿Registrar '+selected.length+' sueldos como PAGADOS en una sola operación?\nDescuentos a adelantos: '+
  money(summary.credit)+'\nTotal entregado o imputado: '+money(summary.total)+'\nLas semanas quedarán cerradas.'))return;
 busyBtn('batchPayrollSave',true,'Registrando…');
 try{
  const r=await sb.rpc('audit_mark_weekly_payrolls_paid_batch_multi',{p_payments:selected,p_notes:null});
  X();payrollPanelTab='due';personnelView='salary';await loadPeople();
  if(r.error)return A('No se registró el lote: '+r.error.message+'. Verificá los estados antes de reintentar.');
  A('Se registraron '+r.data.count+' liquidaciones con sus descuentos individuales.');
 }catch(e){
  X();payrollPanelTab='due';personnelView='salary';
  try{await loadPeople()}catch(_e){}
  A('No se pudo confirmar el resultado del lote. Revisá los estados antes de reintentar.');
 }finally{busyBtn('batchPayrollSave',false)}
}


function payTwoWeeksPreview(id){
 const first=weeklyPayrolls.find(w=>w.id===id);
 if(!first||first.status!=='DUE'||first.pay_date<PAYROLL_LIVE_FROM||first.source_mode==='LEGACY_CONFIRM')
  return A('Primera semana no habilitada para pagar.');
 const second=weeklyPayrolls.find(w=>w.employee_id===first.employee_id&&w.pay_date===addDaysISO(first.pay_date,7));
 if(!second||second.status!=='OPEN'||second.period_start!==addDaysISO(first.period_start,7))
  return A('No está disponible la segunda semana consecutiva.');
 if(openAdvances(first.employee_id).length)
  return A('Tiene adelantos abiertos. Liquidá individualmente para aplicar sus descuentos.');
 const employee=employeeById(first.employee_id);
 M('<h3>Pagar dos semanas · '+esc(employee?.name||'Empleado')+'</h3>'+
 '<div class="calc"><div>'+fmt(first.period_start)+' – '+fmt(first.period_end)+': <b>'+money(first.net_total)+'</b> · '+minsText(first.overtime_minutes)+' extras</div>'+
 '<div>'+fmt(second.period_start)+' – '+fmt(second.period_end)+': <b>'+money(second.net_total)+'</b> · '+minsText(second.overtime_minutes)+' extras</div>'+
 '<hr><b>Total: '+money(Number(first.net_total||0)+Number(second.net_total||0))+'</b></div>'+
 '<div class="small muted" style="margin:10px 0">Valor hora '+money(first.hourly_rate)+' · '+Number(first.regular_hours||0).toLocaleString('es-AR',{maximumFractionDigits:2})+' h habituales semanales</div>'+
 '<button type="button" style="width:100%;min-height:43px;margin-bottom:7px" data-id="'+esc(first.id)+'" onclick="payrollDetail(this.dataset.id)">Editar extras · primera semana</button>'+
 '<button type="button" style="width:100%;min-height:43px;margin-bottom:10px" data-id="'+esc(second.id)+'" onclick="payrollDetail(this.dataset.id)">Editar extras · segunda semana</button>'+
 '<div class="small warn">La segunda semana se registra como pago anticipado según su cálculo actual. Ambos períodos quedarán cerrados, sin posibilidad de edición. Revisá los importes y las extras.</div>'+
 '<label>Observación</label><input id="twoWeekNotes" placeholder="Referencia opcional">'+
 '<label class="checkline"><input id="twoWeekAgree" type="checkbox"> Confirmo el pago completo de ambos períodos</label>'+
 '<button id="twoWeekSave" class="primary" data-first="'+esc(first.id)+'" data-second="'+esc(second.id)+'" style="width:100%;margin-top:12px" onclick="payTwoWeeksConfirm(this.dataset.first,this.dataset.second)">Confirmar las dos semanas</button>')
}
async function payTwoWeeksConfirm(firstId,secondId){
 if(!document.getElementById('twoWeekAgree')?.checked)return A('Confirmá el pago de las dos semanas.');
 const notes=(document.getElementById('twoWeekNotes')?.value||'').trim();
 busyBtn('twoWeekSave',true,'Registrando las dos semanas…');
 try{
  const r=await sb.rpc('audit_mark_two_week_payrolls_paid',{p_first_payroll_id:firstId,p_second_payroll_id:secondId,p_allow_future:true,p_notes:notes||null});
  if(r.error)return A(r.error.message);
  X();payrollPanelTab='paid';await loadPeople();A('Las dos semanas quedaron pagadas y cerradas.')
 }finally{busyBtn('twoWeekSave',false)}
}

function employeeForm(){
 M('<h3>Nuevo empleado</h3><p class="small muted">La fecha de ingreso se carga una sola vez y queda bloqueada.</p>'+
 '<label>Nombre</label><input id="en"><label>Fecha de ingreso</label><input id="ei" type="date">'+
 '<label>Horas habituales por semana</label><input id="eh" type="text" inputmode="decimal">'+
 '<label>Precio por hora</label><input id="er" type="text" inputmode="decimal">'+
 '<label>Regla de pago</label><select id="epay"><option value="SATURDAY">Semanal · sábado</option><option value="FRIDAY">Semanal · viernes</option><option value="EVENTUAL">Eventual / manual</option></select>'+
 '<button id="employeeSaveBtn" class="primary" style="width:100%;margin-top:12px" onclick="employeeSave()">Guardar empleado</button>')
}
async function employeeSave(){
 let name=en.value.trim(),hire=ei.value,hours=parseAmount(eh.value),rate=parseAmount(er.value);
 if(!name)return A('Ingresá el nombre.');
 if(!hire)return A('Ingresá la fecha de ingreso.');
 if(hours<0||rate<=0)return A('Revisá horas habituales y precio por hora.');
 busyBtn('employeeSaveBtn',true);
 try{
  let r=await sb.from('audit_employees').insert({name,hourly_rate:rate,base_hours:7,weekly_regular_hours:hours,hire_date:hire,hire_date_locked_at:new Date().toISOString(),pay_schedule:epay.value,active:true}).select().single();
  if(r.error)return A(r.error.message);
  X();await loadPeople();employeeProfile(r.data.id)
 }finally{busyBtn('employeeSaveBtn',false)}
}

function manualOvertimeForm(pid){
 let w=weeklyPayrolls.find(x=>x.id===pid);if(!w)return A('Liquidación no encontrada.');
 if(w.status==='PAID'||w.pay_date<PAYROLL_LIVE_FROM)return A('Este período está cerrado y no admite edición.');
 let e=employeeById(w.employee_id);
 M('<h3>Horas extra · '+esc(e?.name||'Empleado')+'</h3>'+
 '<div class="calc"><b>Período '+fmt(w.period_start)+' → '+fmt(w.period_end)+'</b><div class="small muted">Actual: '+minsText(w.overtime_minutes)+' · origen '+(w.overtime_source==='MANUAL'?'manual':w.overtime_source==='LEGACY'?'histórico':'fichaje')+'</div></div>'+
 '<label>Corregir el total de horas extra de esta semana (reemplaza el anterior)</label><input id="moHours" type="text" inputmode="decimal" value="'+esc(decimalInputValue(Number(w.overtime_minutes||0)/60))+'" placeholder="Ej. 3,5">'+
 '<div class="small muted">La carga manual reemplaza el cálculo automático sólo para esta liquidación.</div>'+
 '<div class="row" style="margin-top:12px"><button id="moSave" class="primary" data-id="'+esc(pid)+'" onclick="saveManualOvertime(this.dataset.id)">Guardar extras</button>'+
 (w.overtime_source==='MANUAL'&&w.source_mode!=='LEGACY_CONFIRM'?'<button data-id="'+esc(pid)+'" onclick="clearManualOvertime(this.dataset.id)">Volver a fichaje</button>':'')+
 '</div>')
}
async function saveManualOvertime(pid){
 let hours=parseAmount(document.getElementById('moHours')?.value||'0');
 if(!Number.isFinite(hours)||hours<0)return A('Las horas extra no pueden ser negativas.');
 if(!confirm('Esta es una CORRECCIÓN del total de horas de la semana. Para sumar horas usá el botón + Horas extra desde el empleado. ¿Reemplazar el total anterior?'))return;
 busyBtn('moSave',true);
 try{
  let r=await sb.rpc('audit_set_weekly_manual_overtime',{p_payroll_id:pid,p_hours:hours,p_reason:(document.getElementById('moReason')?.value||'').trim()||null});
  if(r.error)return A(r.error.message);
  X();await loadPeople()
 }finally{busyBtn('moSave',false)}
}
async function clearManualOvertime(pid){
 let r=await sb.rpc('audit_clear_weekly_manual_overtime',{p_payroll_id:pid});
 if(r.error)return A(r.error.message);
 X();await loadPeople()
}
function employeeProfile(eid){
 let e=employeeById(eid);if(!e)return A('Empleado no encontrado.');
 let year=Number(localISODate().slice(0,4)),vb=vacBalances.find(x=>x.employee_id===eid&&+x.entitlement_year===year),next=vacBalances.find(x=>x.employee_id===eid&&+x.entitlement_year===year+1);
 let debt=employeeDebt(eid),hourDebt=employeeTimeDebt(eid),w=relevantOpenPayroll(eid),sch=employeeScheduleCount(eid),pin=employeeHasPin(eid);
 let hist=vacations.filter(x=>x.employee_id===eid).slice(0,8);
 let vacHtml=hist.length?hist.map(v=>'<div class="history-line"><span>'+(v.entry_type==='LEGACY_TAKEN'?'Histórico':fmt(v.start_date)+' → '+fmt(v.end_date))+(v.is_advance?' · anticipada':'')+'</span><b>'+v.days_count+' días</b></div>').join(''):'<div class="small muted">Sin períodos registrados.</div>';

 M('<div class="profile-head"><div><h3>'+esc(e.name)+'</h3><div class="small muted">'+payRuleLabel(e.pay_schedule)+'</div></div><span class="pill">'+(pin?'PIN fichaje OK':'PIN pendiente')+'</span></div>'+
 '<div class="profile-grid"><div><span class="small muted">Ingreso</span><b>'+fmt(e.hire_date)+'</b><div class="small muted">Bloqueado</div></div><div><span class="small muted">Horas habituales</span><b>'+Number(e.weekly_regular_hours||0).toLocaleString('es-AR')+' h</b></div><div><span class="small muted">Precio hora</span><b>'+money(e.hourly_rate)+'</b></div><div><span class="small muted">Próximo estimado</span><b>'+money(w?w.net_total:Number(e.weekly_regular_hours||0)*Number(e.hourly_rate||0))+'</b></div></div>'+
 staffPayBreakdown(w,e)+
 '<div class="profile-section"><b>Horario habitual por día</b><div style="margin:8px 0">'+staffDailySchedule(eid)+'</div></div>'+
 (w&&w.status==='OPEN'?'<button type="button" class="primary" style="width:100%;min-height:52px;margin:8px 0" data-id="'+esc(eid)+'" onclick="staffAddOvertime(this.dataset.id)">+ Extras de esta semana</button>':'')+
 '<div class="row profile-actions"><button class="primary" data-id="'+esc(eid)+'" onclick="advanceNew(this.dataset.id)">+ Registrar adelanto</button><button data-id="'+esc(eid)+'" onclick="staffRepay(this.dataset.id)" '+(debt<=0?'disabled':'')+'>Registrar devolución</button><button data-id="'+esc(eid)+'" onclick="staffAddOvertime(this.dataset.id)">+ Sumar horas extra</button></div>'+'<div class="row profile-actions"><button data-id="'+esc(eid)+'" onclick="employeeConditionsForm(this.dataset.id)">Editar horas y valor hora</button><button data-id="'+esc(eid)+'" onclick="employeeScheduleForm(this.dataset.id)">Horario habitual</button><button data-id="'+esc(eid)+'" onclick="employeePinForm(this.dataset.id)">PIN fichaje</button></div>'+
 '<div class="profile-section"><div class="row between"><div><b>Vacaciones '+year+'</b><div class="small muted">Cupo anual teórico: '+(vb?.annual_entitlement_days??0)+' días</div></div><button data-id="'+esc(eid)+'" onclick="vacationNew(this.dataset.id)">+ Período</button></div><div class="vac-kpis"><div><span>Devengadas</span><b>'+(vb?.accrued_days??0)+'</b></div><div><span>Tomadas</span><b>'+(vb?.taken_days??0)+'</b></div><div><span>Pendientes</span><b>'+(vb?.remaining_days??0)+'</b></div><div><span>Anticipadas</span><b>'+(vb?.advanced_days??0)+'</b></div></div>'+vacHtml+
 (next&&+next.advanced_days>0?'<div class="small warn">Ya hay '+next.advanced_days+' días adelantados del período '+(year+1)+'.</div>':'')+'</div>'+
 '<div class="profile-section"><div class="row between"><div><b>Cuenta de adelantos</b><div class="small muted">'+(debt>0?'Saldo pendiente '+money(debt):'Sin deuda')+'</div></div><button data-id="'+esc(eid)+'" onclick="advancesForm(this.dataset.id)">Ver movimientos</button></div></div>'+
 '<div class="profile-section"><div class="row between"><div><b>Fichaje</b><div class="small muted">'+sch+' día(s) con horario configurado</div><div class="small '+(hourDebt>0?'warn':'muted')+'">Deuda de horas pendiente: '+minsText(hourDebt)+'</div></div><button data-id="'+esc(eid)+'" onclick="timeReviewScreen(this.dataset.id)">Ver fichajes</button></div></div>'+
 '<div class="row profile-danger"><button data-id="'+esc(eid)+'" onclick="correctHireDateForm(this.dataset.id)">Corregir ingreso</button><button class="danger" data-id="'+esc(eid)+'" onclick="removeEmployee(this.dataset.id)">Borrar / dar de baja</button></div>')
}
function employeeConditionsForm(eid){
 let e=employeeById(eid);if(!e)return;
 M('<h3>Condiciones · '+esc(e.name)+'</h3><label>Horas habituales por semana</label><input id="ech" type="text" inputmode="decimal" value="'+esc(decimalInputValue(e.weekly_regular_hours||0))+'">'+
 '<label>Precio por hora</label><input id="ecr" type="text" inputmode="decimal" value="'+esc(decimalInputValue(e.hourly_rate||0))+'">'+
 '<label>Regla de pago</label><select id="ecp"><option value="SATURDAY" '+(e.pay_schedule==='SATURDAY'?'selected':'')+'>Semanal · sábado</option><option value="FRIDAY" '+(e.pay_schedule==='FRIDAY'?'selected':'')+'>Semanal · viernes</option><option value="EVENTUAL" '+(e.pay_schedule==='EVENTUAL'?'selected':'')+'>Eventual / manual</option></select>'+
 '<div class="small muted">Las horas habituales son la base de pago semanal; las extras se registran sólo en la liquidación correspondiente.</div>'+
 '<div class="small muted">La fecha de ingreso no se edita desde esta pantalla.</div><button id="ecSave" class="primary" style="width:100%;margin-top:12px" data-id="'+esc(eid)+'" onclick="saveEmployeeConditions(this.dataset.id)">Guardar</button>')
}
async function saveEmployeeConditions(eid){
 let hours=parseAmount(ech.value),rate=parseAmount(ecr.value);
 if(hours<0||rate<=0)return A('Revisá horas y precio por hora.');
 busyBtn('ecSave',true);
 try{
  let r=await sb.from('audit_employees').update({weekly_regular_hours:hours,hourly_rate:rate,pay_schedule:ecp.value,updated_at:new Date().toISOString()}).eq('id',eid);
  if(r.error)return A(r.error.message);
  // Don't delete OPEN payrolls: preserve manual edits and advance deductions.
  let refresh=await sb.rpc('audit_refresh_weekly_payrolls');
  if(refresh.error)return A('Condiciones guardadas; error al actualizar previsiones: '+refresh.error.message);
  X();await loadPeople();employeeProfile(eid)
 }finally{busyBtn('ecSave',false)}
}

function shiftLabel(code,d){
 if(code==='MORNING')return d===6?'Mañana · 8:30–15:30':'Mañana · 7:30–16:00';
 if(code==='AFTERNOON')return d===6?'Tarde · 15:30–23:00':'Tarde · 16:00–23:00';
 return 'Franco'
}
function scheduleDefaultHours(code,day){
 if(code==='OFF')return ['', ''];
 if(code==='MORNING')return day===6?['08:30','15:30']:['07:30','16:00'];
 return day===6?['15:30','23:00']:['16:00','23:00']
}
function scheduleRowModeChanged(day){
 const select=document.getElementById('shift'+day),
 a=document.getElementById('shiftStart'+day),b=document.getElementById('shiftEnd'+day);
 if(!select||!a||!b)return;
 const def=scheduleDefaultHours(select.value,day);
 a.value=def[0];b.value=def[1];
 a.disabled=b.disabled=select.value==='OFF';
 scheduleWeeklyPreview()
}
function scheduleWeeklyPreview(){
 let planned=0;
 for(let day=1;day<=7;day++){
  const code=document.getElementById('shift'+day)?.value||'OFF';
  if(code==='OFF')continue;
  let from=document.getElementById('shiftStart'+day)?.value||'',
   to=document.getElementById('shiftEnd'+day)?.value||'';
  if(!/^\d{2}:\d{2}$/.test(from)||!/^\d{2}:\d{2}$/.test(to))continue;
  let [h1,m1]=from.split(':').map(Number),[h2,m2]=to.split(':').map(Number);
  let d=h2*60+m2-h1*60-m1;if(d<0)d+=1440;planned+=d
 }
 let element=document.getElementById('scheduleWeekTotal');
 if(!element)return;
 let fixed=Number(element.dataset.fixed||0),hour=planned/60,delta=hour-fixed;
 const n=v=>v.toLocaleString('es-AR',{maximumFractionDigits:2});
 element.innerHTML='<b>Horas del calendario: '+n(hour)+' h</b> · Horas fijas de sueldo: '+n(fixed)+' h'+
  (Math.abs(delta)>.01?'<div class="small warn">Diferencia: '+n(Math.abs(delta))+' h. La planilla de turnos no modifica las horas fijas ni liquidaciones pagadas.</div>':
   '<div class="small ok">Coinciden con las horas fijas.</div>')
}
function employeeScheduleForm(eid){
 let e=employeeById(eid);if(!e)return;
 const days=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
 const rows=days.map((label,i)=>{
  const d=i+1,s=schedules.find(x=>x.employee_id===eid&&x.iso_weekday===d);
  const code=s?.active===true?(s.shift_code||'OFF'):'OFF';
  const defaults=scheduleDefaultHours(code,d);
  const beginning=(s?.active===true?s.work_start?.slice(0,5):'')||defaults[0];
  const ending=(s?.active===true?s.work_end?.slice(0,5):'')||defaults[1];
  const choices=['OFF','MORNING','AFTERNOON'].filter(x=>d!==7||x!=='MORNING');
  const options=choices.map(x=>'<option value="'+x+'" '+(x===code?'selected':'')+'>'+
   (x==='OFF'?'Franco':x==='MORNING'?'Mañana':'Tarde')+'</option>').join('');
  return '<div class="shift-time-row"><b>'+label+'</b><select id="shift'+d+'" aria-label="Turno '+label+'" onchange="scheduleRowModeChanged('+d+')">'+options+'</select>'+
   '<input type="time" id="shiftStart'+d+'" aria-label="Entrada '+label+'" value="'+esc(beginning)+'" '+(code==='OFF'?'disabled':'')+' onchange="scheduleWeeklyPreview()" />'+
   '<input type="time" id="shiftEnd'+d+'" aria-label="Salida '+label+'" value="'+esc(ending)+'" '+(code==='OFF'?'disabled':'')+' onchange="scheduleWeeklyPreview()" /></div>'
 }).join('');
 M('<div class="shift-custom-editor"><h3>Turnos habituales · '+esc(e.name)+'</h3>'+
  '<p class="small muted">Podés ajustar la entrada y salida de cada día. Sábados: mañana 8:30–15:30 y tarde 15:30–23:00, salvo cocina y bacha.</p>'+
  '<div class="shift-time-header"><span>Día</span><span>Turno</span><span>Entrada</span><span>Salida</span></div>'+rows+
  '<div id="scheduleWeekTotal" class="calc small" data-fixed="'+Number(e.weekly_regular_hours||0)+'"></div>'+
  '<button id="scheduleSave" class="primary" style="width:100%;margin-top:12px" data-id="'+esc(eid)+'" onclick="saveEmployeeSchedule(this.dataset.id)">Guardar horarios</button></div>');
 scheduleWeeklyPreview()
}
async function saveEmployeeSchedule(eid){
 let rows=[];
 for(let day=1;day<=7;day++){
  const code=document.getElementById('shift'+day)?.value||'OFF';
  const active=code!=='OFF',start=active?document.getElementById('shiftStart'+day)?.value:null,
   end=active?document.getElementById('shiftEnd'+day)?.value:null;
  if(active&&(!/^\d{2}:\d{2}$/.test(start||'')||!/^\d{2}:\d{2}$/.test(end||'')||start===end))
   return A('Revisá el horario del día '+day+'. La entrada y la salida no pueden ser iguales ni quedar vacías.');
  rows.push({employee_id:eid,iso_weekday:day,shift_code:code,active,
   work_start:start,work_end:end,updated_at:new Date().toISOString()})
 }
 busyBtn('scheduleSave',true);
 try{
  let result=await sb.from('audit_employee_schedules').upsert(rows,{onConflict:'employee_id,iso_weekday'});
  if(result.error)return A(result.error.message);
  X();await loadPeople();employeeProfile(eid)
 }finally{busyBtn('scheduleSave',false)}
}
function employeePinQuickPicker(){
 const wanted=['Victorio','Damian','Karen','Valeria','Milagros'];
 const rows=wanted.map(name=>emps.find(e=>e.active&&e.name===name)).filter(Boolean);
 if(!rows.length)return A('No se encontraron los empleados de fichaje.');
 M('<h3>Activar PIN de fichaje</h3><p class="small muted">Elegí un empleado, ingresá su PIN de 4 dígitos y guardá. Sólo habilita entrada y salida, no el panel administrativo.</p>'+
 rows.map(e=>'<div class="row between" style="margin:8px 0"><b>'+esc(e.name==='Damian'?'Damián':e.name)+'</b><span class="small muted">'+(employeeHasPin(e.id)?'PIN activo':'PIN pendiente')+'</span><button data-id="'+esc(e.id)+'" onclick="employeePinForm(this.dataset.id)">'+(employeeHasPin(e.id)?'Cambiar PIN':'Activar PIN')+'</button></div>').join('')+
 '<div class="small muted">Si el guardado es rechazado por permisos, volvé a ingresar a Spanish Auditoría como administrador.</div>')
}
function employeePinForm(eid){
 let e=employeeById(eid);if(!e)return;
 M('<h3>PIN fichaje · '+esc(e.name)+'</h3><p class="small muted">Sólo habilita Entrada/Salida. No da acceso a Sueldos.</p><label>PIN de 4 dígitos</label><input id="epin" type="password" inputmode="numeric" maxlength="4"><button id="pinSave" class="primary" style="width:100%;margin-top:12px" data-id="'+esc(eid)+'" onclick="saveEmployeePin(this.dataset.id)">Guardar PIN</button>')
}
async function saveEmployeePin(eid){
 let p=epin.value.trim();if(!/^\d{4}$/.test(p))return A('El PIN debe tener 4 dígitos.');
 busyBtn('pinSave',true);
 try{let r=await sb.rpc('audit_set_employee_pin',{p_employee_id:eid,p_pin:p});if(r.error){const msg=/administrador|session|sesión|permisos/i.test(r.error.message||'')?'Tu sesión no tiene autorización de administrador vigente. Salí y volvé a entrar al panel.':r.error.message;return A('PIN no activado: '+msg)}X();await loadPeople();employeeProfile(eid);A('PIN guardado. Ya puede usar su enlace personal de fichaje.')}
 finally{busyBtn('pinSave',false)}
}
function correctHireDateForm(eid){
 let e=employeeById(eid);if(!e)return;
 M('<h3>Corregir ingreso</h3><p class="small muted">Corrección excepcional auditada.</p><label>Fecha actual</label><input value="'+esc(fmt(e.hire_date))+'" readonly><label>Nueva fecha</label><input id="hnew" type="date" value="'+esc(e.hire_date||'')+'"><label>Motivo</label><input id="hreason"><button id="hireSave" class="primary" style="width:100%;margin-top:12px" data-id="'+esc(eid)+'" onclick="saveHireDateCorrection(this.dataset.id)">Guardar</button>')
}
async function saveHireDateCorrection(eid){
 if(!hnew.value||!hreason.value.trim())return A('Fecha y motivo son obligatorios.');
 busyBtn('hireSave',true);
 try{let r=await sb.rpc('audit_correct_employee_hire_date',{p_employee_id:eid,p_new_date:hnew.value,p_reason:hreason.value.trim()});if(r.error)return A(r.error.message);X();await loadPeople();employeeProfile(eid)}
 finally{busyBtn('hireSave',false)}
}
async function removeEmployee(eid){
 let e=employeeById(eid);if(!e)return;
 if(!confirm('¿Borrar o dar de baja a '+e.name+'? Si tiene historia se conserva y sólo queda inactivo.'))return;
 let r=await sb.rpc('audit_remove_employee',{p_employee_id:eid});
 if(r.error)return A(r.error.message);
 X();await loadPeople();A(r.data?.action==='DELETED'?'Empleado eliminado.':'Empleado dado de baja; historial conservado.')
}
function vacationNew(eid){
 let e=employeeById(eid);if(!e)return;
 let year=Number(localISODate().slice(0,4)),vb=vacBalances.find(x=>x.employee_id===eid&&+x.entitlement_year===year);
 M('<h3>Vacaciones · '+esc(e.name)+'</h3><label>Imputar al período</label><select id="vy" onchange="vacPreview()"><option value="'+year+'">'+year+'</option><option value="'+(year+1)+'">'+(year+1)+' (anticipadas)</option></select><label>Desde</label><input id="vs" type="date" onchange="vacPreview()"><label>Hasta</label><input id="ve" type="date" onchange="vacPreview()"><label class="checkline"><input id="va" type="checkbox"> Anticipadas</label><label>Observación</label><input id="vn"><div id="vacCalc" data-eid="'+esc(eid)+'" class="calc small">Cupo '+(vb?.entitled_days??14)+' · pendiente '+(vb?.remaining_days??14)+' días.</div><button id="vacSave" class="primary" style="width:100%;margin-top:12px" data-id="'+esc(eid)+'" onclick="saveVacation(this.dataset.id)">Guardar período</button>')
}
function vacPreview(){
 let box=document.getElementById('vacCalc');if(!box)return;
 let eid=box.dataset.eid,y=Number(vy.value),vb=vacBalances.find(x=>x.employee_id===eid&&+x.entitlement_year===y),days=0;
 if(vs.value&&ve.value)days=Math.floor((new Date(ve.value+'T12:00:00')-new Date(vs.value+'T12:00:00'))/86400000)+1;
 if(y>Number(localISODate().slice(0,4)))va.checked=true;
 box.textContent='Días: '+Math.max(0,days)+' · devengadas '+(vb?.accrued_days??vb?.entitled_days??0)+' · cupo anual '+(vb?.annual_entitlement_days??0)+' · pendiente antes '+(vb?.remaining_days??0)
}
async function saveVacation(eid){
 if(!vs.value||!ve.value)return A('Ingresá desde y hasta.');
 let days=Math.floor((new Date(ve.value+'T12:00:00')-new Date(vs.value+'T12:00:00'))/86400000)+1;
 if(days<=0)return A('Período inválido.');
 busyBtn('vacSave',true);
 try{let r=await sb.from('audit_employee_vacations').insert({employee_id:eid,entitlement_year:+vy.value,entry_type:'PERIOD',start_date:vs.value,end_date:ve.value,days_count:days,is_advance:va.checked,notes:vn.value.trim()||null,request_key:requestKey()});if(r.error)return A(r.error.message);X();await loadPeople();employeeProfile(eid)}
 finally{busyBtn('vacSave',false)}
}
function payrollCurrencyInputValid(raw){
 return /^(?:\d+(?:[,.]\d{1,2})?|\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)$/.test(String(raw||'').trim());
}
function payrollAdvanceAllocations(selector,loanList){
 const inputs=Array.from(document.querySelectorAll(selector));
 const loans=new Map((loanList||[]).map(a=>[String(a.id),a]));
 const allocations=[];let total=0,error='';
 for(const input of inputs){
  const aid=String(input.dataset.advanceId||''),raw=String(input.value||'').trim();
  const a=loans.get(aid),val=raw?parseAmount(raw):0;
  if(!a){error='Adelanto no encontrado.';break}
  if(raw&&!payrollCurrencyInputValid(raw)){error='Importe de descuento inválido.';break}
  if(!Number.isFinite(val)||val<0){error='Un descuento no es válido.';break}
  if(val>Number(a.balance)+.009){error='Descuento mayor al saldo del adelanto '+fmt(a.advance_date);break}
  if(val>0){allocations.push({advance_id:aid,amount:Number(val.toFixed(2))});total+=val}
 }
 return {allocations,total:Number(total.toFixed(2)),error};
}
function quickHourlyRateForm(eid){
 const e=employeeById(eid);if(!e||!e.active)return A('Empleado no disponible.');
 M('<h3>Editar valor hora · '+esc(e.name)+'</h3>'+
  '<div class="calc"><b>Valor actual '+money(e.hourly_rate)+'</b>'+
  '<div class="small muted">Se recalculan sólo las liquidaciones actuales y futuras pendientes. Los pagos anteriores no cambian.</div></div>'+
  '<label>Nuevo valor por hora</label><input id="quickHourlyValue" type="text" inputmode="decimal" autocomplete="off" value="'+esc(decimalInputValue(e.hourly_rate))+'">'+
  '<button type="button" class="primary" id="quickHourlySave" style="width:100%;min-height:52px;margin-top:12px" data-id="'+esc(e.id)+'" onclick="quickHourlyRateSave(this.dataset.id)">Guardar valor hora</button>');
}
async function quickHourlyRateSave(eid){
 const e=employeeById(eid),input=document.getElementById('quickHourlyValue');
 if(!e||!input)return A('Empleado no encontrado.');
 const raw=input.value.trim(),rate=parseAmount(raw);
 if(!payrollCurrencyInputValid(raw)||!Number.isFinite(rate)||rate<=0||rate>1000000)
  return A('Ingresá un valor hora positivo válido.');
 if(Math.abs(rate-Number(e.hourly_rate))<.009)return X();
 if(!confirm('¿Actualizar el valor hora de '+e.name+' de '+money(e.hourly_rate)+' a '+money(rate)+' para liquidaciones actuales y futuras pendientes?'))return;
 busyBtn('quickHourlySave',true,'Guardando…');
 try{
  const result=await sb.rpc('audit_change_employee_hourly_rate',{p_employee_id:eid,p_expected_rate:Number(e.hourly_rate),p_new_rate:rate});
  if(result.error)return A('No se actualizó el precio hora: '+result.error.message);
  X();await loadPeople();A('Nuevo valor hora guardado. Semanas pendientes actualizadas; pagos históricos intactos.');
 }finally{busyBtn('quickHourlySave',false)}
}

function payrollDetail(id){
 const w=weeklyPayrolls.find(x=>x.id===id);if(!w)return A('Liquidación no encontrada.');
 const e=employeeById(w.employee_id),name=esc(e?.name||'Empleado');
 const history=w.pay_date<PAYROLL_LIVE_FROM||w.source_mode==='LEGACY_CONFIRM';
 const ready=payrollCanLiquidate(w);
 const oa=openAdvances(w.employee_id);
 const entries=timeEntries.filter(t=>t.employee_id===w.employee_id&&t.work_date>=w.period_start&&t.work_date<=w.period_end);
 const reviews=entries.filter(t=>t.review_status==='REVIEW');
 const hourlyRate=Number(w.hourly_rate??e?.hourly_rate??0);
 const allocationAudit=advanceLedgerFromPayroll(w);
 const ledgerDetail=w.status==='PAID'&&Number(w.advance_deduction||0)>0?
  '<div class="calc" style="margin-top:10px"><b>Adelantos descontados · '+money(w.advance_deduction)+'</b>'+
  (allocationAudit.rows.length?allocationAudit.rows.map(x=>{
    const a=advAccounts.find(t=>t.id===x.advance_id);
    return '<div class="row between" style="margin-top:6px"><span>Adelanto '+fmt(a?.advance_date||x.deduction_date)+'</span><b>'+money(x.amount)+'</b></div>'
   }).join(''):'<div class="small bad">No se identificó la imputación en el historial.</div>')+
  (!allocationAudit.ok?'<div class="small bad">El descuento no concilia con los movimientos registrados. Revisar.</div>':'<div class="small ok">Descuento conciliado con la cuenta de adelantos.</div>')+
  '<button type="button" style="width:100%;min-height:42px;margin-top:9px" data-eid="'+esc(w.employee_id)+'" onclick="advancesForm(this.dataset.eid)">Ver cuenta e historial</button></div>':'';
 const loanInput=oa.length?
  '<div style="margin:10px 0"><b>Adelantos pendientes · '+money(oa.reduce((n,a)=>n+Number(a.balance||0),0))+'</b><div class="small muted">Indicá el descuento antes de liquidar. Si dejás $0, el sistema te pedirá confirmación.</div>'+oa.map(a=>
   '<div style="margin-top:9px"><label style="display:block;margin-bottom:4px">Adelanto '+fmt(a.advance_date)+' · Saldo '+money(a.balance)+'</label>'+
   '<input type="text" inputmode="decimal" class="wpAdvanceAmount" data-advance-id="'+esc(a.id)+'" value="0" style="width:100%;min-height:45px" oninput="weeklyPayCalc()" aria-label="Descuento del adelanto '+esc(fmt(a.advance_date))+'"></div>').join('')+'</div>':'';
 const canEditExtras=!history&&['OPEN','DUE'].includes(w.status);
 const extrasEdit=canEditExtras?
  '<div style="border:1px solid #dbe3ec;border-radius:12px;padding:12px;margin:12px 0;background:#f8fafc">'+
  '<b style="font-size:15px">Horas extra antes de liquidar</b>'+
  '<div class="small muted" style="margin-top:5px">Horas registradas: '+minsText(w.overtime_minutes)+' · Valor de cada hora extra: '+money(hourlyRate)+'</div>'+
  '<label for="wpExtraHours" style="display:block;margin-top:10px">Total de horas extra de esta semana (editable)</label>'+
  '<input id="wpExtraHours" data-id="'+esc(w.id)+'" type="text" inputmode="decimal" autocomplete="off" value="'+esc(decimalInputValue(Number(w.overtime_minutes||0)/60))+'" placeholder="Ej. 2,5" style="width:100%;min-height:48px;font-size:17px" oninput="weeklyPayCalc()">'+
  '<div id="wpExtraPreview" class="small" style="margin:8px 0"></div>'+
  '<button id="wpExtraSave" type="button" style="width:100%;min-height:46px;font-weight:700" data-id="'+esc(w.id)+'" onclick="savePayrollOvertimeBeforePay(this.dataset.id)">Guardar horas extra</button>'+
  '<div class="small muted" style="margin-top:7px">Se guarda el total de esta semana; no se suman las horas ingresadas al total anterior. Guardá los cambios antes de liquidar.</div>'+
  '</div>':'';
 let action='';
 if(w.status==='PAID'){
  action='<div style="padding:14px;border:1px solid #b8dfc2;border-radius:12px;background:#f0faf2"><div class="small muted">PAGADO '+fmt(w.paid_date||w.pay_date)+'</div><div style="font-size:24px;font-weight:800;margin-top:4px">'+money(w.net_total)+'</div></div>';
 }else if(history){
  action='<div class="calc small">Liquidación histórica. Sólo consulta.</div>';
 }else if(ready){
  action=(w.status==='OPEN'?'<div class="small muted" style="margin:8px 0">Pago previsto '+fmt(w.pay_date)+' · registralo únicamente si ya se pagó.</div>':'')+
   (reviews.length?'<div class="small warn" style="margin:8px 0">'+reviews.length+' fichaje(s) por revisar; controlá el detalle antes de confirmar.</div>':'')+
   loanInput+
   '<div id="wpCalc" data-id="'+esc(w.id)+'" class="calc" style="padding:12px;margin:10px 0"></div>'+
   '<button id="wpSave" class="primary" style="width:100%;min-height:58px;font-size:17px;font-weight:800" data-id="'+esc(w.id)+'" onclick="markWeeklyPayrollPaid(this.dataset.id)">Liquidar y registrar pago</button>'+
   '<div class="small muted" style="margin-top:7px">Confirmar sólo cuando el dinero se entregó o aplicó a un adelanto.</div>';
 }else{
  action='<div class="calc"><b>Estimado '+money(w.net_total)+'</b><div class="small muted">La liquidación se habilita el día anterior al pago previsto: '+fmt(w.pay_date)+'.</div></div>';
 }
 const attendance=entries.length?entries.map(t=>'<div class="history-line"><span>'+fmt(t.work_date)+' · '+localTime(t.clock_in_at)+' → '+localTime(t.clock_out_at)+
   (t.anomaly_code==='ASSUMED_SHIFT'?' · estimado':t.is_test?' · prueba':'')+
   '</span><b>'+minsText(t.approved_overtime_minutes)+' extras</b></div>').join(''):'<div class="small muted">Sin fichajes en este período.</div>';
 const breakdown='<details style="margin-top:18px;border-top:1px solid #d8e1ec;padding-top:10px">'+
  '<summary style="cursor:pointer;min-height:38px;font-weight:650">Ver desglose, observaciones y fichajes</summary>'+
  '<div class="profile-grid" style="margin-top:10px">'+
  '<div><span class="small muted">Horas habituales</span><b>'+Number(w.regular_hours||0).toLocaleString('es-AR')+' h</b></div>'+
  '<div><span class="small muted">Horas extra</span><b>'+minsText(w.overtime_minutes)+'</b></div>'+
  '<div><span class="small muted">Base</span><b>'+money(w.base_amount)+'</b></div>'+
  '<div><span class="small muted">Extras $</span><b>'+money(w.overtime_amount)+'</b></div></div>'+
  (Number(w.other_discounts||0)>0?'<div class="small">Otros descuentos: '+money(w.other_discounts)+'</div>':'')+
  (Number(w.advance_deduction||0)>0?'<div class="small">Descuento registrado: '+money(w.advance_deduction)+'</div>':'')+
  (w.notes?'<div class="calc small"><b>Observaciones anteriores</b><div>'+esc(w.notes)+'</div></div>':'')+
  '<div style="margin-top:8px"><b>Fichajes</b>'+attendance+'</div>'+
  (ready?'<label style="margin-top:8px;display:block">Observación de pago (opcional)</label><input id="wpNotes" value="'+esc(w.notes||'')+'" placeholder="Solo si necesitás aclarar algo">':'')+
  '</details>';
 M('<div style="padding:2px 0"><h3 style="margin:0 40px 3px 0">'+name+' · '+fmt(w.pay_date)+'</h3>'+
  '<div class="small muted" style="margin-bottom:11px">Semana '+fmt(w.period_start)+' al '+fmt(w.period_end)+'</div>'+
  '<div style="font-weight:750;font-size:14px;margin:7px 0">Valor hora: '+money(hourlyRate)+' · Horas habituales: '+Number(w.regular_hours||0).toLocaleString('es-AR',{maximumFractionDigits:2})+' h</div>'+
  (e?.active&&w.status!=='PAID'?'<button type="button" data-id="'+esc(e.id)+'" style="min-height:39px;margin-bottom:7px" onclick="quickHourlyRateForm(this.dataset.id)">Editar valor hora</button>':'')+
  '<div class="small muted" style="margin:3px 0 8px">Base '+money(w.base_amount)+' + extras '+money(w.overtime_amount)+
  (Number(w.other_discounts||0)>0?' − otros '+money(w.other_discounts):'')+'</div>'+
  ledgerDetail+
  (entries.length&&w.overtime_source==='AUTO'?'<details style="margin:10px 0;border:1px solid #dbe3ec;border-radius:11px;padding:11px"><summary style="cursor:pointer;font-weight:650">Ajustar extras provenientes del fichaje</summary>'+extrasEdit+'</details>':extrasEdit)+action+breakdown+'</div>');
 if(ready||canEditExtras)weeklyPayCalc();
}

function weeklyPayCalc(){
 const box=document.getElementById('wpCalc'),extraField=document.getElementById('wpExtraHours');
 if(!box&&!extraField)return;
 const w=weeklyPayrolls.find(x=>x.id===(box?.dataset.id||extraField?.dataset.id));if(!w)return;
 const extraRaw=String(extraField?.value??'').trim();
 const extraHours=extraField?parseAmount(extraRaw):Number(w.overtime_minutes||0)/60;
 const extraValid=!extraField||(/^\d+(?:[,.]\d{1,2})?$/.test(extraRaw)&&Number.isFinite(extraHours)&&extraHours>=0&&extraHours<=48);
 const extraMinutes=extraValid&&extraField?Math.round(extraHours*60):Number(w.overtime_minutes||0);
 const extraChanged=!!extraField&&extraValid&&extraMinutes!==Number(w.overtime_minutes||0);
 const extraPay=Math.round(extraMinutes/60*Number(w.hourly_rate||0)*100)/100;
 const gross=Number(w.base_amount||0)+extraPay-Number(w.other_discounts||0);
 const alloc=payrollAdvanceAllocations('.wpAdvanceAmount',openAdvances(w.employee_id));
 let error=!extraValid?'Ingresá horas extra válidas (0 a 48).':alloc.error;
 if(!error&&alloc.total>gross+.009)error='La suma de adelantos supera el sueldo disponible.';
 const preview=document.getElementById('wpExtraPreview');
 if(preview)preview.innerHTML=extraValid?
   '<span>Extras: <b>'+minsText(extraMinutes)+'</b> · Importe: <b>'+money(extraPay)+'</b></span>'+
   (extraChanged?'<div class="bad" style="margin-top:5px">Guardá las extras antes de liquidar.</div>':
   '<div class="small muted">Extras guardadas.</div>'):
   '<div class="bad">Cantidad de horas extra inválida.</div>';
 const saveExtra=document.getElementById('wpExtraSave');
 if(saveExtra)saveExtra.disabled=!extraValid||!extraChanged;
 if(box)box.innerHTML='<div class="small muted">A ENTREGAR'+(extraChanged?' · PREVISTO, NO GUARDADO':'')+'</div>'+
  '<div style="font-size:27px;font-weight:850;line-height:1.2">'+money(Math.max(0,gross-alloc.total))+'</div>'+
  (alloc.total>0?'<div class="row between"><span>Descuento de '+alloc.allocations.length+' adelanto(s)</span><b>−'+money(alloc.total)+'</b></div>':'')+
  (error?'<div class="bad" role="alert">'+esc(error)+'</div>':'');
 const btn=document.getElementById('wpSave');if(btn)btn.disabled=!!error||extraChanged;
}


async function savePayrollOvertimeBeforePay(id){
 const w=weeklyPayrolls.find(x=>x.id===id);
 const field=document.getElementById('wpExtraHours');
 if(!w||!field||!['OPEN','DUE'].includes(w.status)||w.pay_date<PAYROLL_LIVE_FROM||w.source_mode==='LEGACY_CONFIRM')
  return A('Esta liquidación no admite modificar horas extra.');
 const raw=field.value.trim(),hours=parseAmount(raw);
 if(!/^\d+(?:[,.]\d{1,2})?$/.test(raw)||!Number.isFinite(hours)||hours<0||hours>48)
  return A('Ingresá horas extra válidas (0 a 48).');
 const minutes=Math.round(hours*60);
 if(minutes===Number(w.overtime_minutes||0))return A('El total de horas extra ya está guardado.');
 if(Number(w.overtime_minutes||0)>0&&!confirm('Vas a reemplazar '+minsText(w.overtime_minutes)+' por '+minsText(minutes)+' de extras para esta semana. ¿Confirmás?'))return;
 busyBtn('wpExtraSave',true,'Guardando…');
 try{
  const latest=await sb.from('audit_weekly_payrolls').select('id,status,source_mode,overtime_minutes,net_total,hourly_rate,base_amount').eq('id',w.id).single();
  if(latest.error)return A('No pude comprobar la liquidación: '+latest.error.message);
  if(!['OPEN','DUE'].includes(latest.data.status)||latest.data.source_mode==='LEGACY_CONFIRM'||
     Number(latest.data.overtime_minutes)!==Number(w.overtime_minutes)||
     Number(latest.data.hourly_rate)!==Number(w.hourly_rate)||
     Math.abs(Number(latest.data.base_amount)-Number(w.base_amount))>.009||
     Math.abs(Number(latest.data.net_total)-Number(w.net_total))>.009)
   return A('La liquidación cambió. Abrila nuevamente para revisar antes de guardar.');
  const reason=String(document.getElementById('wpExtraReason')?.value||'').trim()||
    ('Carga administrativa de extras previa a liquidación · '+fmt(w.period_start)+' al '+fmt(w.period_end));
  const res=await sb.rpc('audit_set_weekly_manual_overtime',{p_payroll_id:w.id,p_hours:minutes/60,p_reason:reason});
  if(res.error)return A('No se guardaron las extras: '+res.error.message);
  X();
  await loadPeople();
  payrollDetail(id);
 }finally{busyBtn('wpExtraSave',false)}
}


async function markWeeklyPayrollPaid(id){
 const w=weeklyPayrolls.find(x=>x.id===id);if(!w)return;
 if(!payrollCanLiquidate(w))return A('Esta liquidación no está habilitada para pagar todavía.');
 const edit=document.getElementById('wpExtraHours');
 if(edit){
  const raw=edit.value.trim(),hours=parseAmount(raw);
  if(!/^\d+(?:[,.]\d{1,2})?$/.test(raw)||!Number.isFinite(hours)||hours<0||hours>48)
   return A('Revisá las horas extra antes de liquidar.');
  if(Math.round(hours*60)!==Number(w.overtime_minutes||0))
   return A('Guardá las horas extra editadas antes de confirmar el pago.');
 }
 if((w.notes||'').includes('REVISAR:')){
  if(w.employee_id==='b8fea12c-73aa-4166-b742-4023a549906d'&&w.pay_date==='2026-10-10'&&Number(w.other_discounts)===28000){
   if(!confirm('Milagros: se descuentan 7 horas ($28.000). No se suman horas extras no verificadas. ¿Confirmás?'))return;
  }else return A('Hay una ausencia pendiente de revisión antes de pagar.');
 }
 const allocations=payrollAdvanceAllocations('.wpAdvanceAmount',openAdvances(w.employee_id));
 if(allocations.error)return A(allocations.error);
 const gross=Number(w.base_amount||0)+Number(w.overtime_amount||0)-Number(w.other_discounts||0);
 if(allocations.total>gross+.009)return A('La suma de descuentos supera el sueldo disponible.');
 const loans=new Map(openAdvances(w.employee_id).map(x=>[x.id,x]));
 const details=allocations.allocations.map(x=>{const a=loans.get(x.advance_id);return '\n- Adelanto '+fmt(a.advance_date)+': '+money(x.amount)+' · Saldo restante '+money(Math.max(0,Number(a.balance)-x.amount))}).join('');
 if(loans.size&&allocations.total===0){
  const pending=Array.from(loans.values()).reduce((n,a)=>n+Number(a.balance||0),0);
  if(!confirm('ATENCIÓN: '+(employeeById(w.employee_id)?.name||'Empleado')+' tiene '+money(pending)+
   ' en adelantos pendientes.\nEsta liquidación descontará $0.\n\n¿Confirmás que esta semana NO corresponde descontar ningún adelanto?'))return;
 }
 const payable=gross-allocations.total;
 if(!confirm('CONFIRMAR PAGO REAL · '+(employeeById(w.employee_id)?.name||'Empleado')+
  '\nSueldo antes de adelantos: '+money(gross)+
  '\nDescuentos ('+allocations.allocations.length+'): '+money(allocations.total)+details+
  '\nTotal entregado / imputado: '+money(payable)+
  '\n\n¿Registraste realmente este pago? La semana quedará cerrada.'))return;
 busyBtn('wpSave',true,'Guardando pago…');
 try{
  const notes=(document.getElementById('wpNotes')?.value||'').trim()||null;
  const r=await sb.rpc('audit_mark_weekly_payroll_paid_multi',{
   p_payroll_id:id,p_allocations:allocations.allocations,p_expected_net:Number(w.net_total),p_notes:notes
  });
  if(r.error){
   await loadPeople();
   return A('El pago no fue registrado: '+r.error.message);
  }
  X();await loadPeople();
  A('Liquidación registrada: '+allocations.allocations.length+' adelantos imputados por separado. Historial preservado.');
 }finally{busyBtn('wpSave',false)}
}


function timeDebtLabel(s){
 return {OPEN:'PENDIENTE',CHARGED:'COBRADA',COMPENSATED:'COMPENSADA',WAIVED:'PERDONADA',NONE:'—'}[s]||s
}
function timeEntryAuditCard(t){
 let flag=t.review_status==='REVIEW'&&!t.is_test,
     turn=t.actual_shift_code==='MORNING'?'Mañana':t.actual_shift_code==='AFTERNOON'?'Tarde':'—',
     hasDebt=Number(t.time_debt_minutes||0)>0,
     debtOpen=t.time_debt_status==='OPEN',
     payableExtra=payableEntryExtra(t);
 return '<div class="time-card '+(flag?'flag':'')+'">'+
  (t.is_test?'<div class="pill warn">FICHAJE DE PRUEBA · no se paga</div>':'')+
  '<div class="row between"><div><b>'+workDateLabel(t.work_date)+'</b><div class="small muted">'+turn+' · '+localTime(t.clock_in_at)+' → '+localTime(t.clock_out_at)+'</div></div><span class="pill '+(flag?'bad':'')+'">'+esc(t.review_status)+'</span></div>'+
  '<div class="time-metrics"><span>Tardanza <b class="'+(+t.late_minutes>0?'bad':'ok')+'">'+minsText(t.late_minutes)+'</b></span><span>Retiro anticipado <b>'+minsText(t.early_departure_minutes)+'</b></span><span>Trabajado <b>'+minsText(t.worked_minutes)+'</b></span><span>Extra <b class="'+(payableExtra>0?'bad':'ok')+'">'+minsText(payableExtra)+'</b></span>'+
  (hasDebt?'<span class="time-debt">Deuda Spanish <b>'+minsText(t.time_debt_minutes)+' · '+timeDebtLabel(t.time_debt_status)+'</b></span>':'')+'</div>'+
  (t.shift_changed?'<div class="small warn">Cambio de turno detectado automáticamente.</div>':'')+
  (t.auto_closed?'<div class="small warn">Salida automática al horario habitual: extra = 0.</div>':'')+
  (flag?'<div class="small bad">Extra atípica: requiere revisión antes de liquidar.</div>':'')+
  '<div class="row" style="margin-top:8px">'+
   (flag?'<button class="primary" data-id="'+esc(t.id)+'" onclick="approveTimeEntry(this.dataset.id)">Aprobar</button><button data-id="'+esc(t.id)+'" onclick="rejectTimeEntry(this.dataset.id)">Rechazar</button>':'')+
   (debtOpen?'<button data-id="'+esc(t.id)+'" data-action="CHARGED" onclick="resolveTimeDebt(this.dataset.id,this.dataset.action)">Cobrar</button><button data-id="'+esc(t.id)+'" data-action="COMPENSATED" onclick="resolveTimeDebt(this.dataset.id,this.dataset.action)">Compensar</button><button data-id="'+esc(t.id)+'" data-action="WAIVED" onclick="resolveTimeDebt(this.dataset.id,this.dataset.action)">Perdonar</button>':'')+
   '<button data-id="'+esc(t.id)+'" onclick="correctTimeEntryForm(this.dataset.id)">Corregir</button></div></div>'
}
function timeReviewScreen(eid=''){
 let week=calendarSaturdayWeek();
 let people=emps.filter(e=>e.active&&(!eid||e.id===eid)).slice().sort((a,b)=>Number(a.sort_order??9999)-Number(b.sort_order??9999)||String(a.name).localeCompare(String(b.name),'es'));
 let groups=people.map(e=>{
  let rows=employeeWeekEntries(e.id,week.start,week.end),sum=employeeWeekSummary(e.id,week.start,week.end);
  let punctual=rows.length?(sum.late>0?'<span class="pill bad">Demora '+minsText(sum.late)+'</span>':'<span class="pill ok">A tiempo</span>'):'<span class="pill muted">Sin fichajes</span>';
  let extra=sum.payableExtra>0?'<span class="pill bad">Extras '+minsText(sum.payableExtra)+'</span>':sum.review>0?'<span class="pill bad">Extras a revisar</span>':'<span class="pill ok">Sin extras</span>';
  return '<details class="employee-week-card" '+(eid?'open':'')+'><summary><div class="employee-week-main"><div><b>'+esc(e.name)+'</b><div class="small muted">'+rows.length+' fichaje(s)</div></div><div class="employee-week-badges">'+punctual+extra+'</div><span class="employee-week-chevron">⌄</span></div></summary><div class="employee-week-body">'+
   (rows.length?rows.map(timeEntryAuditCard).join(''):'<div class="empty">Sin fichajes esta semana.</div>')+
  '</div></details>'
 }).join('');
 M('<div class="row between"><div><h3>Fichajes · semana</h3><div class="small muted">'+workDateLabel(week.start)+' → '+workDateLabel(addDaysISO(week.end,-1))+' · horario 24 h</div></div><button onclick="openPunchApp()">Abrir fichaje</button></div><div class="row" style="gap:6px;flex-wrap:wrap;margin:8px 0 12px"><button onclick="moveAttendanceWeek(-1,\'review\')">← Anterior</button><button onclick="moveAttendanceWeek(0,\'review\')">Actual</button><button onclick="moveAttendanceWeek(1,\'review\')">Siguiente →</button></div>'+
 (groups||'<div class="empty">Sin empleados activos.</div>'))
}
async function resolveTimeDebt(id,action){
 let labels={CHARGED:'cobrada',COMPENSATED:'compensada',WAIVED:'perdonada'};
 let note=prompt('Observación opcional para marcar la deuda como '+(labels[action]||action)+':','');
 if(note===null)return;
 let r=await sb.rpc('audit_resolve_time_debt',{p_entry_id:id,p_action:action,p_note:note||null});
 if(r.error)return A(r.error.message);
 X();await loadPeople();timeReviewScreen()
}
async function approveTimeEntry(id){
 let t=timeEntries.find(x=>x.id===id);if(!t)return;
 let r=await sb.rpc('audit_review_time_entry',{p_entry_id:id,p_action:'APPROVE',p_approved_minutes:t.overtime_minutes,p_reason:'Aprobado por Administración',p_clock_in_at:null,p_clock_out_at:null});
 if(r.error)return A(r.error.message);X();await loadPeople();timeReviewScreen(t.employee_id)
}
async function rejectTimeEntry(id){
 let t=timeEntries.find(x=>x.id===id);if(!t)return;
 let reason=prompt('Motivo del rechazo:','Extra no autorizada');if(reason===null)return;
 let r=await sb.rpc('audit_review_time_entry',{p_entry_id:id,p_action:'REJECT',p_approved_minutes:0,p_reason:reason||'Extra rechazada',p_clock_in_at:null,p_clock_out_at:null});
 if(r.error)return A(r.error.message);X();await loadPeople();timeReviewScreen(t.employee_id)
}
function correctTimeEntryForm(id){
 let t=timeEntries.find(x=>x.id===id),e=employeeById(t?.employee_id);if(!t)return;
 M('<h3>Corregir fichaje · '+esc(e?.name||'')+'</h3><p class="small muted">Queda auditado.</p><label>Entrada</label><input id="tcIn" type="datetime-local" value="'+esc(localDateTimeInput(t.clock_in_at))+'"><label>Salida</label><input id="tcOut" type="datetime-local" value="'+esc(localDateTimeInput(t.clock_out_at))+'"><label>Motivo</label><input id="tcReason"><button id="tcSave" class="primary" style="width:100%;margin-top:12px" data-id="'+esc(id)+'" onclick="saveTimeCorrection(this.dataset.id)">Guardar</button>')
}
async function saveTimeCorrection(id){
 if(!tcIn.value||!tcOut.value||!tcReason.value.trim())return A('Entrada, salida y motivo son obligatorios.');
 let toIso=x=>new Date(x+':00-03:00').toISOString();
 busyBtn('tcSave',true);
 try{let r=await sb.rpc('audit_review_time_entry',{p_entry_id:id,p_action:'CORRECT',p_approved_minutes:null,p_reason:tcReason.value.trim(),p_clock_in_at:toIso(tcIn.value),p_clock_out_at:toIso(tcOut.value)});if(r.error)return A(r.error.message);X();await loadPeople();timeReviewScreen()}
 finally{busyBtn('tcSave',false)}
}
function advancesForm(eid){
 if(!eid)return A('Empleado sin vínculo');
 let e=emps.find(x=>x.id===eid);
 let aa=advAccounts.filter(x=>x.employee_id===eid).slice().sort((a,b)=>{
  if(a.status!==b.status)return a.status==='OPEN'?-1:1;
  return String(b.advance_date||'').localeCompare(String(a.advance_date||''))
 });
 let cards=aa.length?aa.map(a=>{
  let dd=ded.filter(x=>x.advance_id===a.id).slice().sort((x,y)=>{
   let d=String(y.deduction_date||'').localeCompare(String(x.deduction_date||''));
   return d||String(y.created_at||'').localeCompare(String(x.created_at||''))
  });
  const latest=dd.find(x=>x.movement_type==='PAYMENT'&&Number(x.amount)>0);
  const rep=advanceDuplicateCandidates(a.id);
  let hist=dd.length?'<details class="advance-history"><summary>Ver todos los movimientos · '+dd.length+'</summary><div class="table"><table><tr><th>Fecha</th><th>Movimiento</th><th>Importe</th><th>Nota</th></tr>'+
   dd.map(d=>'<tr><td>'+fmt(d.deduction_date)+'</td><td>'+(d.movement_type==='NO_PAYMENT'?'Sin descuento':String(d.request_key||'').startsWith('payroll-')||d.period_label==='Liquidación semanal'?'Descuento en sueldo':'Devolución fuera de sueldo')+'</td><td>'+money(d.amount)+'</td><td>'+esc(d.notes||d.period_label||'')+'</td></tr>').join('')+
   '</table></div></details>':'<div class="small muted">Sin movimientos todavía.</div>';
  let status=a.status==='SETTLED'?'<span class="pill ok">CANCELADO</span>':'<span class="pill">ABIERTO</span>';
  let review=a.status==='OPEN'&&(a.weekly_review_due===true||a.weekly_review_due==='true')
   ?'<div class="advance-warning small">⚠ Pasaron '+Number(a.days_since_movement||0)+' días sin registrar movimiento.</div>':'';
  let action=a.status==='OPEN'
   ?'<button class="primary" data-aid="'+esc(a.id)+'" data-eid="'+esc(eid)+'" onclick="dedNew(this.dataset.aid,this.dataset.eid)" >Devolución externa</button>'
   :'<div class="small ok">Cancelado el '+fmt(a.settled_on)+'</div>';
  return '<div class="card advance-card">'+
   '<div class="row between"><div><b>'+money(a.original_amount)+'</b><div class="small muted">Adelanto del '+fmt(a.advance_date)+'</div></div>'+status+'</div>'+
   '<div class="advance-balance-grid"><div><span class="small muted">Pagado</span><b>'+money(a.paid_amount)+'</b></div><div><span class="small muted">Pendiente</span><b>'+money(a.balance)+'</b></div><div><span class="small muted">Último pago</span><b>'+(a.last_payment_date?fmt(a.last_payment_date):'Sin pagos')+'</b></div></div>'+
   (latest?'<div class="small" style="margin-top:7px"><b>Última recuperación:</b> '+fmt(latest.deduction_date)+' · '+money(latest.amount)+
     (String(latest.request_key||'').startsWith('payroll-')?' · Descontado del sueldo':' · Cobro externo')+'</div>':'')+
   (rep.length?'<div class="small bad">Posible repetición de movimientos: '+esc(rep.map(fmt).join(', '))+'. Revisar comprobantes.</div>':'')+
   review+'<div class="row" style="margin-top:10px">'+action+'</div>'+hist+
  '</div>'
 }).join(''):'<div class="empty">Sin adelantos para este empleado.</div>';
 M('<h3>Cuenta de adelantos · '+esc(e?.name||'')+'</h3>'+
 '<div class="calc"><div class="small muted">TOTAL PENDIENTE</div><b style="font-size:23px">'+money(employeeDebt(eid))+'</b>'+
 '<div class="small muted">'+aa.filter(x=>x.status==='OPEN').length+' adelantos abiertos · Los descuentos en sueldo se registran al liquidar; las devoluciones fuera de sueldo se registran aparte.</div></div>'+
 '<div class="row" style="margin:12px 0"><button class="primary" data-eid="'+esc(eid)+'" onclick="advanceNew(this.dataset.eid)">+ Adelanto</button>'+
 '<button data-eid="'+esc(eid)+'" onclick="staffRepay(this.dataset.eid)">Registrar devolución</button></div>'+cards)
}
function advanceNew(eid){
 const e=employeeById(eid);if(!e)return A('Empleado inexistente.');
 M('<h3>Registrar adelanto · '+esc(e.name)+'</h3>'+
 '<div class="calc"><span class="small muted">Deuda actual</span><b style="display:block;font-size:22px">'+money(employeeDebt(eid))+'</b>'+
 '<div class="small muted">Se agregará una deuda nueva, sin modificar ni duplicar el préstamo anterior.</div></div>'+
 '<input id="ae" type="hidden" value="'+esc(eid)+'"><input id="arq" type="hidden" value="'+requestKey()+'">'+
 '<label>Fecha</label><input id="ad" type="date" value="'+localISODate()+'">'+
 '<label>Importe entregado ($)</label><input id="aa" type="text" inputmode="decimal" placeholder="Ej. 255.000" oninput="staffAdvancePreview()">'+
 '<div id="staffAdvanceCalc" class="small muted"></div>'+
 '<label>Motivo</label><input id="ar">'+
 '<div class="small muted">Si no se registra ningún movimiento, el sistema pedirá un control al cumplirse 7 días.</div>'+
 '<button id="advanceSaveBtn" class="primary" style="width:100%;min-height:50px" onclick="advanceSave()">Guardar adelanto</button>');staffAdvancePreview()
}
function staffAdvancePreview(){
 const e=document.getElementById('ae')?.value||'';
 const value=document.getElementById('aa')?.value||'';
 const box=document.getElementById('staffAdvanceCalc');
 if(!box)return;
 const amount=parseAmount(value),old=employeeDebt(e);
 box.innerHTML='<div class="row between"><span>Deuda anterior</span><b>'+money(old)+'</b></div>'+
  '<div class="row between"><span>Nuevo adelanto</span><b>'+(amount>0?money(amount):'—')+'</b></div>'+
  '<div class="row between"><b>Saldo total resultante</b><b>'+(amount>0?money(old+amount):'—')+'</b></div>'
}
async function advanceSave(){
 let amount=parseAmount(aa.value);
 if(!Number.isFinite(amount)||amount<=0||!ad.value)return A('Ingresá fecha e importe válidos.');
 const debtBefore=employeeDebt(ae.value);
 if(!confirm('NUEVO ADELANTO · '+(employeeById(ae.value)?.name||'Empleado')+'\nDeuda anterior: '+money(debtBefore)+'\nAdelanto: '+money(amount)+'\nNuevo saldo: '+money(debtBefore+amount)+'\n\n¿Confirmás el registro separado del préstamo anterior?'))return;
 busyBtn('advanceSaveBtn',true);
 try{
  let r=await sb.from('audit_employee_advances').insert({
   employee_id:ae.value,advance_date:ad.value,original_amount:amount,reason:ar.value||null,request_key:arq.value,status:'OPEN'
  });
  if(r.error){
   if(requestDuplicate(r.error))return A('Este adelanto ya había sido procesado.');
   return A(r.error.message)
  }
  X();await loadPeople();A('Nuevo adelanto registrado. Deuda total estimada: '+money(debtBefore+amount)+'.')
 }finally{busyBtn('advanceSaveBtn',false)}
}
function dedNew(aid,eid){
 let a=advanceAccount(aid);
 if(!a)return A('No encontré el adelanto.');
 if(a.status==='SETTLED')return A('Este adelanto ya está cancelado.');
 M('<h3>Devolución fuera del sueldo</h3>'+
 '<input id="da" type="hidden" value="'+esc(aid)+'"><input id="de" type="hidden" value="'+esc(eid)+'"><input id="drq" type="hidden" value="'+requestKey()+'">'+
 '<div class="calc"><b>Saldo pendiente: '+money(a.balance)+'</b><div class="small muted">Último pago: '+(a.last_payment_date?fmt(a.last_payment_date):'sin pagos registrados')+'</div></div>'+
 '<label>Fecha</label><input id="dd" type="date" value="'+localISODate()+'">'+
 '<div class="small warn">Usá esta pantalla sólo cuando el empleado realmente te devuelve dinero por fuera de su sueldo. Si lo vas a descontar al pagarle, hacelo desde Liquidaciones para evitar duplicar el descuento.</div><label>Importe recibido ($)</label><input id="di" type="text" inputmode="decimal" value="" placeholder="0,00" oninput="dedPreview()">'+
 '<div class="row" style="margin-top:8px"><button type="button" onclick="dedSettle()">Devolución total</button></div>'+
 '<details style="margin-top:12px"><summary class="small muted">Registrar semana sin descuento ($0)</summary><button type="button" onclick="dedZero()">Esta semana $0</button></details>'+
 '<div id="dedCalc" class="small muted" style="margin-top:8px">Ingresá el importe o registrá $0 si esta semana no hubo descuento.</div>'+
 '<label>Observación</label><input id="dn" placeholder="Opcional">'+
 '<button id="dedSaveBtn" class="primary" style="width:100%;min-height:52px;margin-top:12px" onclick="dedSave()">Registrar devolución fuera de sueldo</button>');
 dedPreview()
}
function dedZero(){
 let x=document.getElementById('di'),n=document.getElementById('dn');
 if(x)x.value='0';
 if(n&&!n.value)n.value='Sin descuento esta semana';
 dedPreview()
}
function dedSettle(){
 let a=advanceAccount(document.getElementById('da')?.value||'');
 let x=document.getElementById('di');
 if(a&&x)x.value=decimalInputValue(a.balance);
 dedPreview()
}
function dedPreview(){
 const a=advanceAccount(document.getElementById('da')?.value||'');
 const box=document.getElementById('dedCalc'),input=document.getElementById('di');
 if(!a||!box||!input)return;
 const raw=input.value.trim(),amount=raw===''?null:parseAmount(raw);
 if(amount===null){box.className='small muted';box.textContent='Ingresá un importe o usá Esta semana $0 para registrar un control sin descuento.';return}
 if(!Number.isFinite(amount)||amount<0){box.className='small bad';box.textContent='Ingresá un importe válido.';return}
 if(amount>+a.balance){box.className='small bad';box.textContent='Supera el saldo de este adelanto: '+money(a.balance);return}
 const prevDebt=employeeDebt(document.getElementById('de')?.value||'');
 const remaining=+a.balance-amount;
 box.className='calc small';
 box.innerHTML='<div class="row between"><span>Saldo de este adelanto</span><b>'+money(a.balance)+'</b></div>'+
  '<div class="row between"><span>Devolución / descuento</span><b>'+money(amount)+'</b></div>'+
  '<div class="row between"><span>Saldo después</span><b>'+money(remaining)+'</b></div>'+
  '<div class="row between"><b>Deuda total después</b><b>'+money(Math.max(0,prevDebt-amount))+'</b></div>'+
  (amount===0?'<div class="small muted">Semana sin descuento. La deuda no cambia.</div>':
    Math.abs(remaining)<.009?'<div class="small ok">Se cancela este adelanto; los demás se conservan.</div>':'')
}

async function dedSave(){
 let aid=da.value,a=advanceAccount(aid);
 if(!a)return A('No encontré el adelanto.');
 if(a.status==='SETTLED')return A('Este adelanto ya está cancelado.');
 if(!String(di.value||'').trim())return A('Ingresá un importe o seleccioná Esta semana $0. El campo vacío no genera un movimiento.');
 let amount=parseAmount(di.value);
 if(!Number.isFinite(amount)||amount<0)return A('Ingresá un importe válido y no negativo.');
 if(amount>+a.balance)return A('El importe supera el saldo pendiente de '+money(a.balance)+'.');
 if(!dd.value)return A('Ingresá la fecha.');
 let movementDate=dd.value;
 let willSettle=amount>0&&Math.abs(+a.balance-amount)<.009;
 const oldTotal=employeeDebt(de.value),newTotal=Math.max(0,oldTotal-amount);
 if(!confirm('MOVIMIENTO DE ADELANTO\nSaldo anterior: '+money(a.balance)+'\nDevolución: '+money(amount)+'\nDeuda total anterior: '+money(oldTotal)+'\nDeuda total resultante: '+money(newTotal)+'\n\n¿Confirmás la imputación sólo a este adelanto?'))return;
 busyBtn('dedSaveBtn',true);
 try{
  let r=await sb.from('audit_advance_deductions').insert({
   advance_id:aid,deduction_date:movementDate,amount,
   movement_type:amount===0?'NO_PAYMENT':'PAYMENT',
   period_label:amount===0?'Control semanal':'Devolución fuera de sueldo',
   notes:(dn.value||'').trim()||(amount===0?'Sin descuento esta semana':null),
   request_key:drq.value
  });
  if(r.error){
   if(requestDuplicate(r.error))return A('Este movimiento ya había sido procesado.');
   return A(r.error.message)
  }
  X();await loadPeople();
  if(willSettle)A('Adelanto cancelado completamente. Quedó cerrado en el historial con fecha '+fmt(movementDate)+'.');
  else if(amount===0)A('Semana registrada con $0. El próximo control vencerá dentro de 7 días.');
  else A('Devolución fuera de sueldo registrada. Saldo restante: '+money(+a.balance-amount)+'.')
 }finally{busyBtn('dedSaveBtn',false)}
}


async function kioskApi(action,body={}){
 const endpoint=U+'/functions/v1/spanish-auditoria-fichaje';
 const r=await fetch(endpoint,{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({action,...body})
 });
 let x={};try{x=await r.json()}catch{}
 if(!r.ok)throw new Error(x.error||'No se pudo completar la operación.');
 return x
}
function kioskEsc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}
function kioskFmtTime(v){
 return v?new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,hourCycle:'h23',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(v)):'—'
}
let kioskToken='',kioskEmployee=null;
function kioskShow(id){
 ['kList','kPin','kPunch','kDone'].forEach(x=>{
  let el=document.getElementById(x);if(el)el.classList.toggle('hide',x!==id)
 })
}
function kioskRenderShell(){
 document.title='Spanish · Fichaje';
 document.body.innerHTML=
 '<style>'+
 ':root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;background:#f3f4f6}*{box-sizing:border-box}body{margin:0;background:#f3f4f6}.kwrap{max-width:520px;margin:auto;padding:18px 14px 38px}.kbrand{text-align:center;padding:10px 0 18px}.kbrand b{font-size:30px}.kbrand div{font-size:13px;color:#6b7280;margin-top:3px}.kcard{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;margin-bottom:12px;box-shadow:0 1px 2px rgba(0,0,0,.03)}.hide{display:none!important}.muted{color:#6b7280}.small{font-size:12px}.center{text-align:center}.kstaff{display:grid;grid-template-columns:1fr 1fr;gap:10px}.kstaff button{min-height:62px;background:#fff;border:1px solid #d1d5db;border-radius:15px;font-size:16px;font-weight:800;padding:10px}.kpin{width:100%;min-height:58px;border:1px solid #d1d5db;border-radius:13px;text-align:center;font-size:28px;letter-spacing:10px;padding:8px;margin:10px 0}.kprimary{width:100%;min-height:66px;border:0;border-radius:15px;background:#111827;color:#fff;font-size:20px;font-weight:900}.ksecondary{width:100%;min-height:48px;border:1px solid #d1d5db;border-radius:13px;background:#fff;font-weight:800;margin-top:9px}.kname{font-size:27px;font-weight:900}.kstate{margin:12px 0;padding:12px;background:#f8fafc;border-radius:13px}.kok{color:#087443}.kmsg{font-size:13px;margin-top:9px}.ksuccess{background:#effcf5;border:1px solid #a7e2c4;color:#087443}.kfooter{text-align:center;color:#9ca3af;font-size:11px;margin-top:16px}@media(max-width:380px){.kstaff{grid-template-columns:1fr}}'+
 '</style>'+
 '<div class="kwrap">'+
  '<div class="kbrand"><b>Spanish</b><div>Fichaje de personal</div></div>'+
  '<div id="kList" class="kcard"><h2 style="margin-top:0">'+(PERSONAL_FICHAJE_ID?'Mi fichaje':'Elegí tu nombre')+'</h2><div id="kStaff" class="kstaff"></div><div id="kListMsg" class="kmsg muted"></div></div>'+
  '<div id="kPin" class="kcard hide"><div class="center"><div id="kPinName" class="kname"></div><div class="small muted">Ingresá tu PIN</div></div><input id="kPinInput" class="kpin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"><button class="kprimary" onclick="kioskSignin()">Continuar</button><button class="ksecondary" onclick="kioskBack()">Volver</button><div id="kPinMsg" class="kmsg muted"></div></div>'+
  '<div id="kPunch" class="kcard hide"><div class="center"><div id="kWho" class="kname"></div></div><div id="kState" class="kstate"></div><button id="kPunchBtn" class="kprimary" onclick="kioskPunch()"></button><button class="ksecondary" onclick="kioskBack()">Cancelar</button><div id="kPunchMsg" class="kmsg muted"></div></div>'+
  '<div id="kDone" class="kcard ksuccess hide center"><div id="kDoneText" class="kname" style="font-size:22px"></div><div id="kDoneSub" class="small" style="margin-top:6px"></div></div>'+
  '<div class="kfooter">La hora se registra automáticamente en el servidor. El empleado no puede editarla.</div>'+
 '</div>';
}
async function kioskLoadEmployees(){
 let msg=document.getElementById('kListMsg'),box=document.getElementById('kStaff');
 if(msg)msg.textContent='Cargando…';
 try{
  if(!PERSONAL_FICHAJE_VALID)throw new Error('El enlace personal de fichaje no es válido.');
  if(PERSONAL_FICHAJE_ID){
   let res=await kioskApi('employee',{employee_id:PERSONAL_FICHAJE_ID});
   box.innerHTML='';
   if(!res.employee){
    msg.textContent='Este empleado todavía no tiene PIN de fichaje habilitado. Pedí al administrador que lo active.';
    kioskShow('kList');
    return
   }
   msg.textContent='';
   kioskChoose(res.employee.id,res.employee.name);
   return
  }
  let x=await kioskApi('employees');
  box.innerHTML=(x.employees||[]).map(e=>'<button data-id="'+kioskEsc(e.id)+'" data-name="'+kioskEsc(e.name)+'" onclick="kioskChoose(this.dataset.id,this.dataset.name)">'+kioskEsc(e.name)+'</button>').join('');
  msg.textContent=(x.employees||[]).length?'':'Todavía no hay empleados con PIN de fichaje habilitado.'
 }catch(e){msg.textContent=e.message}
}
function kioskChoose(id,name){
 kioskEmployee={id,name};
 document.getElementById('kPinName').textContent=name;
 document.getElementById('kPinInput').value='';
 document.getElementById('kPinMsg').textContent='';
 kioskShow('kPin');
 setTimeout(()=>document.getElementById('kPinInput')?.focus(),100)
}
function kioskBack(){
 kioskToken='';kioskEmployee=null;
 let p=document.getElementById('kPinInput');if(p)p.value='';
 kioskShow('kList');
 if(PERSONAL_FICHAJE_ID)kioskLoadEmployees()
}
async function kioskSignin(){
 if(!kioskEmployee)return kioskBack();
 let pin=document.getElementById('kPinInput').value.trim(),msg=document.getElementById('kPinMsg');
 if(!/^\d{4}$/.test(pin)){msg.textContent='Ingresá los 4 dígitos.';return}
 msg.textContent='Verificando…';
 try{
  let x=await kioskApi('login',{employee_id:kioskEmployee.id,pin});
  kioskToken=x.token;
  document.getElementById('kPinInput').value='';
  await kioskLoadStatus()
 }catch(e){msg.textContent=e.message}
}
async function kioskLoadStatus(){
 try{
  let x=await kioskApi('status',{token:kioskToken});
  document.getElementById('kWho').textContent=x.employee.name;
  let o=x.open_entry,state=document.getElementById('kState'),btn=document.getElementById('kPunchBtn');
  if(o){
   let turn=o.actual_shift_code==='MORNING'?'Mañana':o.actual_shift_code==='AFTERNOON'?'Tarde':'';
   state.innerHTML='<b class="kok">Entrada registrada '+kioskFmtTime(o.clock_in_at)+'</b><div class="small muted">'+turn+(o.scheduled_end_at?' · salida habitual '+kioskFmtTime(o.scheduled_end_at):'')+'</div>';
   btn.textContent='FICHAR SALIDA'
  }else{
   state.innerHTML='<b>Sin entrada abierta</b><div class="small muted">La hora se toma automáticamente al tocar el botón.</div>';
   btn.textContent='FICHAR ENTRADA'
  }
  document.getElementById('kPunchMsg').textContent='';
  kioskShow('kPunch')
 }catch(e){
  kioskBack();
  document.getElementById('kListMsg').textContent=e.message
 }
}
function geofenceReadPosition(){
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation)return reject(new Error('Este dispositivo no admite geolocalización.'));
  navigator.geolocation.getCurrentPosition(
   p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude,
    accuracy_m:p.coords.accuracy,timestamp_ms:p.timestamp}),
   e=>reject(new Error(e.code===1?'Permití el uso de ubicación en el navegador.':
    'No se pudo obtener ubicación precisa. Probá desde un celular dentro del bar.')),
   {enableHighAccuracy:true,maximumAge:0,timeout:22000}
  )
 })
}
async function payrollGeofenceSetup(){
 const response=await sb.rpc('audit_punch_geofence_status');
 if(response.error)return A(response.error.message);
 const state=response.data||{};
 M('<h3>Ubicación de fichaje</h3><div class="small muted">Se verifica sólo al marcar entrada o salida. No se hace seguimiento continuo ni se guardan las coordenadas de cada empleado.</div>'+
 '<div class="calc"><b>Perímetro: 50 metros</b><div>'+
 (state.enabled?'Activo · calibrado en el bar':'Pendiente de calibración: el perímetro todavía no está activo')+
 '</div>'+(state.calibration_accuracy_m!=null?'<div class="small">Precisión de calibración: '+Number(state.calibration_accuracy_m).toFixed(1)+' m</div>':'')+
 '</div><p class="small muted">Estando físicamente dentro de Spanish (Mitre 204), activá GPS preciso y tocá Calibrar. Se exigirá ubicación dentro de 50 m en cada fichaje, incluso desde celular. También debe funcionar la ubicación en la PC si se usa allí.</p>'+
 '<button id="geoCalibrate" class="primary" onclick="payrollCalibrateAtBar()" style="width:100%">Calibrar desde mi ubicación actual</button>')
}
async function payrollCalibrateAtBar(){
 busyBtn('geoCalibrate',true,'Obteniendo ubicación…');
 try{
  const geo=await geofenceReadPosition();
  if(geo.accuracy_m>40)return A('La precisión GPS es '+Math.round(geo.accuracy_m)+' m y se necesitan 40 m o menos. Intentá desde la puerta del bar.');
  if(!confirm('¿Estás físicamente dentro de Spanish, Mitre 204? Esta ubicación quedará como centro del perímetro de fichaje de 50 m.'))return;
  const result=await sb.rpc('audit_calibrate_punch_geofence',{
   p_latitude:geo.lat,p_longitude:geo.lon,p_accuracy_m:geo.accuracy_m
  });
  if(result.error)return A(result.error.message);
  X();A('Ubicación del bar calibrada. Los próximos fichajes exigirán GPS dentro de los 50 metros.');
 }catch(e){A(e.message||'No se pudo calibrar el bar')}
 finally{busyBtn('geoCalibrate',false)}
}
function kioskPunchPosition(){
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation)return reject(new Error('Este dispositivo no dispone de geolocalización.'));
  navigator.geolocation.getCurrentPosition(p=>resolve({
   lat:p.coords.latitude,lon:p.coords.longitude,
   accuracy_m:p.coords.accuracy,timestamp_ms:p.timestamp
  }),e=>reject(new Error(e.code===1?'Permití la ubicación al fichar.':
   e.code===3?'Tiempo agotado al obtener ubicación. Probá otra vez.':
   'Ubicación no disponible. Revisá el GPS y reintentá.')),
   {enableHighAccuracy:true,maximumAge:0,timeout:20000})
 })
}
async function kioskPunch(){
 let btn=document.getElementById('kPunchBtn'),msg=document.getElementById('kPunchMsg');
 btn.disabled=true;msg.textContent='Registrando…';
 try{
  msg.textContent='Verificando ubicación (únicamente en este fichaje)…';
  const policy=await kioskApi('policy');
  const geo=policy.geofence_enabled?await kioskPunchPosition():null;
  msg.textContent='Registrando…';
  let x=await kioskApi('punch',{token:kioskToken,geo}),r=x.result,isIn=r.action==='CLOCK_IN';
  document.getElementById('kDoneText').textContent=isIn?'Entrada registrada':'Salida registrada';
  document.getElementById('kDoneSub').textContent=kioskFmtTime(isIn?r.clock_in_at:r.clock_out_at)+(r.shift_changed?' · cambio de turno detectado':'');
  kioskShow('kDone');
  kioskToken='';kioskEmployee=null;
  setTimeout(()=>{kioskShow('kList');kioskLoadEmployees()},1500)
 }catch(e){msg.textContent=e.message}
 finally{btn.disabled=false}
}
async function kioskBoot(){
 kioskRenderShell();
 await kioskLoadEmployees()
}


function rebuildAdminLogin(){
 const auth=document.getElementById('auth');
 if(!auth||auth.dataset.rebuilt==='1')return;
 auth.dataset.rebuilt='1';
 auth.classList.add('audit-login-rebuilt');
 const fragment=new URLSearchParams(location.hash.slice(1));
 const recovery=fragment.get('spanish_reset')||'';
 const resetMode=/^[A-Za-z0-9_-]{43}$/.test(recovery);
 auth.innerHTML=resetMode
  ?'<h2>Definir nuevo PIN</h2><form id="adminResetForm" autocomplete="off" novalidate>'+
    '<label for="adminResetPin">Nuevo PIN</label>'+
    '<input id="adminResetPin" type="password" inputmode="numeric" autocomplete="new-password" autocapitalize="off" maxlength="4" placeholder="••••" required>'+
    '<label for="adminResetPinConfirm">Repetir PIN</label>'+
    '<input id="adminResetPinConfirm" type="password" inputmode="numeric" autocomplete="new-password" autocapitalize="off" maxlength="4" placeholder="••••" required>'+
    '<button id="adminResetSubmit" class="primary" type="submit">Guardar nuevo PIN</button>'+
    '<div id="authmsg" class="small" aria-live="polite" role="status"></div></form>'
  :'<h2>Acceso administrativo</h2><form id="adminLoginForm" autocomplete="off" novalidate>'+
    '<label for="adminSinglePin">PIN</label>'+
    '<input id="adminSinglePin" type="password" inputmode="numeric" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="4" placeholder="••••" required>'+
    '<button id="adminLoginSubmit" class="primary" type="submit">Ingresar</button>'+
    '<div id="authmsg" class="small" aria-live="polite" role="status"></div></form>';
 if(!document.getElementById('adminLoginStyles')){
  const style=document.createElement('style');style.id='adminLoginStyles';
  style.textContent='#auth.audit-login-rebuilt{max-width:440px;margin:clamp(24px,5vh,68px) auto;padding:24px;border-radius:20px}'+
   '#auth.audit-login-rebuilt h2{font-size:22px;margin:0 0 22px;color:#14243b}'+
   '#auth.audit-login-rebuilt form{display:grid;gap:12px}'+
   '#auth.audit-login-rebuilt label{font-weight:650;font-size:14px}'+
   '#auth.audit-login-rebuilt input[type=password]{width:100%;height:56px;font-size:23px;letter-spacing:.28em;text-align:center;border:1.5px solid #cbd5e1;border-radius:12px;box-sizing:border-box}'+
   '#auth.audit-login-rebuilt input[type=password]:focus{outline:2px solid #245ec4}'+
   '#auth.audit-login-rebuilt button.primary{min-height:54px;margin-top:8px;font-size:16px;font-weight:700}'+
   '#authmsg{min-height:20px;line-height:1.35;font-size:13px;color:#b42318}'+
   '#authmsg[data-state=progress]{color:#4f647e}';
  document.head.appendChild(style)
 }
 const digitsOnly=el=>el.addEventListener('input',()=>{
  el.value=String(el.value||'').normalize('NFKC').replace(/[^0-9]/g,'').slice(0,4)
 });
 if(resetMode){
  const field=document.getElementById('adminResetPin'),
        confirmField=document.getElementById('adminResetPinConfirm'),
        button=document.getElementById('adminResetSubmit');
  digitsOnly(field);digitsOnly(confirmField);
  document.getElementById('adminResetForm').addEventListener('submit',async e=>{
   e.preventDefault();
   if(button.disabled)return;
   const pin=field.value.trim();
   if(!/^\d{4}$/.test(pin))return adminLoginMessage('Ingresá cuatro números.');
   if(pin!==confirmField.value.trim())return adminLoginMessage('Los PIN no coinciden.');
   button.disabled=true;
   adminLoginMessage('Guardando…','progress');
   try{
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),16000);
    let response;
    try{
     response=await fetch(L,{method:'POST',headers:{'content-type':'application/json'},
       body:JSON.stringify({action:'reset_pin',recovery,pin}),cache:'no-store',signal:ctrl.signal})
    }finally{clearTimeout(timer)}
    let result={};try{result=await response.json()}catch(_e){}
    if(!response.ok)return adminLoginMessage(result.error||'No se pudo actualizar el PIN.');
    field.value='';confirmField.value='';
    history.replaceState(null,'',location.pathname+location.search);
    auth.dataset.rebuilt='';
    rebuildAdminLogin();
    adminLoginMessage('PIN actualizado. Ingresá para continuar.','progress');
   }catch(e){adminLoginMessage('No se pudo conectar. Reintentá.')}
   finally{button.disabled=false}
  });
 }else{
  const input=document.getElementById('adminSinglePin');
  digitsOnly(input);
  document.getElementById('adminLoginForm').addEventListener('submit',e=>{
   e.preventDefault();signin()
  });
 }
}

if(!FICHAJE_MODE)rebuildAdminLogin();

/* Admin UI V2: progressive enhancement only; no data/auth modifications. */
function adminV2Open(target){
 const button=Array.from(document.querySelectorAll('#nav button')).find(x=>x.getAttribute('onclick')?.includes("go('"+target+"'"));
 if(button){go(target,button);if(target==='sueldos')personnelOpen('salary');window.scrollTo(0,0)}
}

function enhanceSuppliersUI(){
 // La lista de Proveedores ya tiene acciones únicas y no agrega pedidos.
}

/* Spanish Auditoria - interfaz operativa simplificada y colores de estados (admin solamente). */
function spanishSimpleUi20261024(){
 if(FICHAJE_MODE||document.getElementById('spanishSimpleCss'))return;
 const css=document.createElement('style');css.id='spanishSimpleCss';
 css.textContent="\nbody.audit-ui-v2{--primary:#2459cc;--text:#152843;--muted:#60718d;--line:#d8e2f1;--soft:#eef4ff;--shadow:0 7px 20px rgba(25,48,92,.07);background:#f3f6fb}\nbody.audit-ui-v2 .card{border-radius:16px;border-color:#d8e2ef}\nbody.audit-ui-v2 button{border-radius:11px;font-weight:650;min-height:40px}\nbody.audit-ui-v2 button.primary,body.audit-ui-v2 .primary{background:#2459cc;color:#fff;border-color:#2459cc}\nbody.audit-ui-v2 #nav button.active{background:#e8f0ff;color:#1743a8}\nbody.audit-ui-v2 #nav button.active .navtxt{color:#1743a8}\nbody.audit-ui-v2 .bad{color:#bd313b}\nbody.audit-ui-v2 .ok{color:#167348}\nbody.audit-ui-v2 .supplier-card{border-left:4px solid #9ab8ee}\nbody.audit-ui-v2 .supplier-card .supplier-actions{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:10px}\nbody.audit-ui-v2 .supplier-card .supplier-actions button{margin:0}\nbody.audit-ui-v2 .spanish-order-btn{background:#eef3ff;color:#244a9a;border:1px solid #b9c9ed}\nbody.audit-ui-v2 .spanish-pay-btn{background:#ecf9f2;color:#14724b;border:1px solid #b8e2ca}\nbody.audit-ui-v2 .supplier-options{padding:7px 10px;border:1px solid #dce4f2;border-radius:11px}\nbody.audit-ui-v2 .supplier-options summary{cursor:pointer;color:#475b77}\nbody.audit-ui-v2 .supplier-options button{display:block;margin-top:8px!important}\nbody.audit-ui-v2 .spanish-action-hub{margin:10px 0 14px;padding:15px;background:#fff;border:1px solid #d6e1f2;border-radius:17px;box-shadow:0 6px 14px rgba(24,55,93,.05)}\nbody.audit-ui-v2 .spanish-action-hub h2{font-size:17px;letter-spacing:-.01em;margin:0 0 5px}\nbody.audit-ui-v2 .spanish-action-hub .hint{font-size:12px;color:#65758d;margin:0 0 10px}\nbody.audit-ui-v2 .spanish-action-hub .spanish-action-main{display:grid;grid-template-columns:1fr 1fr;gap:8px}\nbody.audit-ui-v2 .spanish-action-hub button{min-height:50px;text-align:center;line-height:1.15;white-space:normal}\nbody.audit-ui-v2 .spanish-action-hub .spanish-action-qr{grid-column:1/-1;min-height:58px;background:#2459cc;color:white;border:1px solid #2459cc;font-size:16px}\nbody.audit-ui-v2 .spanish-action-hub .spanish-action-txt{background:#fff8e8;color:#885e0c;border:1px solid #eed9a6}\nbody.audit-ui-v2 .spanish-action-hub .spanish-action-order{background:#eef4ff;color:#24539f;border:1px solid #c5d6f4}\nbody.audit-ui-v2 .spanish-action-hub .spanish-action-pay{background:#edfaf3;color:#136c43;border:1px solid #bce5cf}\nbody.audit-ui-v2 #p-home .quick-actions:not(.spanish-more-open){display:none!important}\nbody.audit-ui-v2 .spanish-action-more{background:transparent;border:0;color:#435e91;font-size:13px;text-decoration:underline;min-height:36px!important;padding:4px 0}\nbody.audit-ui-v2 .spanish-qr-photo-actions{display:grid;gap:10px;margin-top:14px}\nbody.audit-ui-v2 .spanish-qr-photo-actions button{min-height:53px}\nbody.audit-ui-v2 .spanish-qr-confirm{border-left:4px solid #1b9a64;background:#ecfaf4}\nbody.audit-ui-v2 .spanish-qr-note{margin-top:12px;background:#fff6dd;padding:12px;border:1px solid #ecd9a1;border-radius:10px}\nbody.audit-ui-v2 input[readonly],body.audit-ui-v2 select[disabled]{background:#f0f5fc!important;color:#2c405f;opacity:1}\n@media(max-width:500px){body.audit-ui-v2 .supplier-card .row.between{display:block}body.audit-ui-v2 .supplier-card .right{text-align:left;margin-top:10px}body.audit-ui-v2 .spanish-action-hub{padding:12px}body.audit-ui-v2 nav button{font-size:12px}}\n";
 document.head.appendChild(css);
 const restyle=document.createElement('style');restyle.id='spanishRestyle20261027';restyle.textContent="\nbody.audit-ui-v2{--bg:#f6f8fb;--card:#fff;--text:#1a2c44;--muted:#6b7b91;--line:#e0e7f0;--primary:#224d88;--soft:#edf3fc;--shadow:0 2px 11px rgba(22,42,71,.035);background:var(--bg);color:var(--text)}\nbody.audit-ui-v2 header{background:#fff;min-height:64px;border-bottom:1px solid var(--line);box-shadow:none}body.audit-ui-v2 header h1{font-size:19px}body.audit-ui-v2 .app-subtitle{display:none}body.audit-ui-v2 .spanish-build{font-size:10px!important;opacity:.72;margin-top:4px;letter-spacing:0}\nbody.audit-ui-v2 .wrap{max-width:1180px}body.audit-ui-v2 .card{background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:16px}body.audit-ui-v2 .title h2{font-size:19px}\nbody.audit-ui-v2 button{min-height:43px;border-radius:10px;font-weight:650;box-shadow:none}body.audit-ui-v2 button.primary{border-color:var(--primary);background:var(--primary);color:#fff;box-shadow:none}\nbody.audit-ui-v2 button:focus-visible,body.audit-ui-v2 input:focus-visible,body.audit-ui-v2 select:focus-visible{outline:2px solid #467cbb;outline-offset:2px}body.audit-ui-v2 input,body.audit-ui-v2 textarea,body.audit-ui-v2 select{border-radius:9px;border:1px solid #d8e2ef}\nbody.audit-ui-v2 nav{background:#fff;box-shadow:none;border-color:var(--line)}body.audit-ui-v2 nav button{font-weight:650;color:#5f718a}body.audit-ui-v2 nav button.active{background:#eaf1fb;color:#224d88}body.audit-ui-v2 nav button.active .navtxt{color:#224d88}\nbody.audit-ui-v2 .kpi{min-height:100px}body.audit-ui-v2 .kpi b{font-size:clamp(19px,2.2vw,25px);line-height:1.14}body.audit-ui-v2 .kpi-link{font-size:11px;color:#59718b}\nbody.audit-ui-v2 .control-center{background:#fff;border:1px solid var(--line);border-radius:15px;padding:18px;margin:3px 0 14px;box-shadow:var(--shadow)}body.audit-ui-v2 .control-head{margin-bottom:13px}body.audit-ui-v2 .control-head h2{font-size:18px;font-weight:760;margin:0}\nbody.audit-ui-v2 .control-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}body.audit-ui-v2 .control-buttons button{min-height:54px;text-align:center;padding:11px 9px;font-size:14px;white-space:normal;line-height:1.25}\nbody.audit-ui-v2 .control-tools{border:0;margin:12px 0 0;padding:0}body.audit-ui-v2 .control-tools summary{color:#64768d;font-size:12px;font-weight:600;cursor:pointer;padding:7px 0}body.audit-ui-v2 .control-tools .control-buttons{margin-top:9px}\nbody.audit-ui-v2 #p-home .quick-actions,body.audit-ui-v2 #p-home #comprasEntry,body.audit-ui-v2 #p-home #invLaunch,body.audit-ui-v2 #p-home #costosEntry,body.audit-ui-v2 body.audit-ui-v2 #p-home #spanishIntegrity{display:none!important}\nbody.audit-ui-v2 #spanishFinance{margin:10px 0 15px;border:0;background:transparent;padding:0;box-shadow:none}body.audit-ui-v2 #spanishFinance>summary{font-weight:750;padding:10px 0;cursor:pointer}body.audit-ui-v2 #spanishFinance #kpis{margin-top:8px}\nbody.audit-ui-v2 .supplier-list-head{display:flex;justify-content:space-between;align-items:center;margin:0 0 12px}body.audit-ui-v2 .supplier-item{padding:13px 15px}body.audit-ui-v2 .supplier-item-inner{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}\nbody.audit-ui-v2 .supplier-name{font-size:15px;font-weight:750;overflow-wrap:anywhere}body.audit-ui-v2 .supplier-meta{font-size:11px;color:#8290a0;margin-top:3px}body.audit-ui-v2 .supplier-balance{text-align:right;font-size:15px;font-weight:700;margin-bottom:7px}body.audit-ui-v2 .supplier-item button{min-height:35px;padding:7px 12px}\nbody.audit-ui-v2 .supplier-account-header h3{font-size:21px;margin:0 0 4px}body.audit-ui-v2 .supplier-account-balance{background:#f7f9fd;border:1px solid #e4eaf2;border-radius:11px;padding:15px;margin:12px 0}body.audit-ui-v2 .supplier-account-balance b{font-size:25px}\nbody.audit-ui-v2 .supplier-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:14px 0}body.audit-ui-v2 .supplier-actions button{min-width:0;min-height:46px;padding:9px 7px;font-size:13px}\nbody.audit-ui-v2 .supplier-account-section{margin:14px 0}body.audit-ui-v2 .supplier-account-section summary{background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:12px;font-weight:740;cursor:pointer}body.audit-ui-v2 .supplier-account-section .table{margin-top:8px}body.audit-ui-v2 .table{box-shadow:none;border-radius:10px}body.audit-ui-v2 table th{background:#f7f9fc;color:#677891}\nbody.audit-ui-v2 .sheet{border-radius:18px 18px 0 0}body.audit-ui-v2 .sheet h3{font-size:20px;letter-spacing:-.02em}body.audit-ui-v2 .manual-bill-compact{max-width:690px;margin:auto}body.audit-ui-v2 .calc{border-radius:10px;background:#f7f9fc}\nbody.audit-ui-v2 .bad{color:#b53a46}body.audit-ui-v2 .ok{color:#237047}\n@media(min-width:740px){body.audit-ui-v2 .control-buttons{grid-template-columns:repeat(4,minmax(0,1fr))}body.audit-ui-v2 .sheet{max-width:850px;border-radius:18px}body.audit-ui-v2 .supplier-actions{grid-template-columns:repeat(5,minmax(0,1fr))}}\n@media(max-width:560px){body.audit-ui-v2 .control-center{padding:14px}body.audit-ui-v2 .control-buttons button{font-size:13px;min-height:50px}body.audit-ui-v2 .card{padding:13px}}\n";
 document.head.appendChild(restyle);
}

function initAdminV2(){
 if(FICHAJE_MODE)return;
 document.body.classList.add('audit-ui-v2');
 const head=document.querySelector('header h1');
 if(head&&!head.querySelector('.app-subtitle')){
  const sub=document.createElement('span');sub.className='app-subtitle';sub.textContent='Panel de gestión';head.prepend(sub)
 }
 if(head&&!head.querySelector('.spanish-build')){
  const tag=document.createElement('span');tag.className='spanish-build';tag.textContent='Spanish Auditoría';tag.style.cssText='font-size:11px;font-weight:500;opacity:.8;display:block';head.appendChild(tag)
 }
 const icons={
  home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  caja:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/>',
  proveedores:'<path d="M6 3h9l4 4v14H6zM15 3v5h5M9 12h7M9 16h7"/>',
  iva:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
  sueldos:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'
 };
 const names={home:'Inicio',caja:'Caja',proveedores:'Proveedores',iva:'IVA',sueldos:'Liquidaciones'};
 for(const btn of document.querySelectorAll('#nav button')){
  const key=Object.keys(names).find(x=>btn.getAttribute('onclick')?.includes("go('"+x+"'"));
  if(!key)continue;
  const ico=btn.querySelector('.navico'),label=btn.querySelector('.navtxt');
  if(ico)ico.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[key]+'</svg>';
  if(label)label.textContent=names[key];
  btn.setAttribute('aria-label',names[key]);
  if(key==='sueldos')btn.addEventListener('click',()=>personnelOpen('salary'))
 }
 const container=document.getElementById('p-home'),kpis=document.getElementById('kpis');
 // Inicio already has "Cierre de caja" in quick actions. One visible entry per action.
 if(container){
  const duplicate=container.querySelector('.title button[onclick="closeForm()"]');
  if(duplicate)duplicate.remove()
 }
 if(kpis&&!kpis.dataset.uiV2){
  kpis.dataset.uiV2='1';
  kpis.addEventListener('click',e=>{
   const card=e.target.closest('.kpi[data-nav]');
   if(card&&kpis.contains(card))adminV2Open(card.dataset.nav)
  });
  kpis.addEventListener('keydown',e=>{
   if(e.key!=='Enter'&&e.key!==' ')return;
   const card=e.target.closest('.kpi[data-nav]');
   if(card&&kpis.contains(card)){e.preventDefault();adminV2Open(card.dataset.nav)}
  })
 }
}



/* Spanish · Centro operativo 2026-10-23. Lecturas aisladas; no altera los módulos existentes. */
let controlBusy=false,controlLast=0,controlData=null;


function controlEnsure(){
 if(FICHAJE_MODE)return;
 const home=document.getElementById('p-home');
 if(!home||document.getElementById('spanishControl'))return;
 const center=document.createElement('section');center.id='spanishControl';center.className='control-center';
 center.innerHTML='<div class="control-head"><h2>Operaciones</h2></div>'+
 '<div class="control-buttons">'+
 '<button type="button" class="primary" data-control="invoice">Cargar boleta</button>'+
 '<button type="button" data-control="payment">Registrar pago</button>'+
 '<button type="button" data-control="credit">NC / faltante</button>'+
 '<button type="button" data-control="remitos">Remitos</button></div>'+
 '<details class="control-tools"><summary>Importaciones</summary><div class="control-buttons">'+
 '<button type="button" data-control="txt">Importar cierre TXT</button></div></details>';
 const quick=home.querySelector('.quick-actions');
 if(quick)quick.insertAdjacentElement('afterend',center);else home.prepend(center);
 center.addEventListener('click',event=>{
  const key=event.target.closest('button[data-control]')?.dataset.control;
  if(key==='invoice')documentForm();
  else if(key==='payment')paymentForm();
  else if(key==='credit')supplierCreditChooser();
  else if(key==='remitos')window.open('https://remitos-spanish.floot.app/','_blank','noopener,noreferrer');
  else if(key==='txt')pasteCloseForm();
 });
}
function controlRender(){}
async function controlLoad(){controlEnsure()}
function controlAutomaticRefresh(){}

function controlInventory(tab){invTab=tab;invOpen()}

function spanishSimpleHome(){
 if(FICHAJE_MODE)return;
 const center=document.getElementById('spanishControl');
 if(!center)return;
 let finance=document.getElementById('spanishFinance');
 if(!finance){
  finance=document.createElement('details');finance.id='spanishFinance';
  const t=document.createElement('summary');t.textContent='Resumen financiero';finance.appendChild(t);
  center.insertAdjacentElement('afterend',finance)
 }
 const kpis=document.getElementById('kpis'),day=document.getElementById('spanishMiDia');
 if(kpis&&!finance.contains(kpis))finance.appendChild(kpis);
 if(day&&!finance.contains(day))finance.appendChild(day);
}

/* Mi dia: vista administrativa de solo lectura; datos de fuentes originales, sin imputaciones. */
let miDiaBusy=false,miDiaRefreshInstalled=false,miDiaLastRead=0;
function miDiaEsc(v){
 return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}
function miDiaEnsure(){
 const home=document.getElementById('p-home'), kpis=document.getElementById('kpis');
 if(!home||!kpis)return null;
 let box=document.getElementById('spanishMiDia');
 if(box)return box;
 if(!document.getElementById('spanishMiDiaStyle')){
  const css=document.createElement('style');css.id='spanishMiDiaStyle';
  css.textContent='.mi-dia{margin:14px 0 18px;border:1px solid #dbe3ea;border-radius:15px;background:#fff;padding:14px}.mi-dia-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.mi-dia-title{font-weight:800;font-size:20px;line-height:1.2}.mi-dia-sub{font-size:12px;color:#64748b;margin-top:4px}.mi-dia-refresh{min-width:90px;min-height:38px}.mi-dia-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mi-dia-card{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#f8fafc;min-width:0}.mi-dia-card b{font-size:18px;display:block;line-height:1.35;margin:5px 0 2px}.mi-dia-card span{font-size:12px;color:#475569}.mi-dia-section{border-top:1px solid #e2e8f0;padding-top:12px;margin-top:13px}.mi-dia-section h3{font-size:15px;margin:0 0 6px}.mi-dia-line{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #edf2f7}.mi-dia-line:last-child{border-bottom:0}.mi-dia-line .left{min-width:0;overflow-wrap:anywhere;font-size:13px}.mi-dia-line .right{white-space:nowrap;font-size:13px;font-weight:700}.mi-dia-muted{font-size:12px;color:#64748b}.mi-dia-link{margin-top:9px;min-height:40px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;width:100%}.mi-dia-good{color:#166534}.mi-dia-warn{color:#92400e}.mi-dia-alert{background:#fff7ed;border:1px solid #fed7aa;padding:10px;border-radius:10px;font-size:12px;margin-top:10px}@media(min-width:720px){.mi-dia-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.mi-dia{padding:18px}}';
  document.head.appendChild(css);
 }
 box=document.createElement('div');box.id='spanishMiDia';box.className='mi-dia';
 box.innerHTML='<div class="mi-dia-head"><div><div class="mi-dia-title">Mi día</div><div class="mi-dia-sub">Pagos, cobranzas y pendientes del negocio</div></div><button type="button" class="mi-dia-refresh" data-mi-dia="refresh">Actualizar</button></div><div id="spanishMiDiaBody" class="mi-dia-muted">Consultando las aplicaciones…</div>';
 const quick=home.querySelector('.quick-actions');
 if(quick)quick.insertAdjacentElement('afterend',box);else kpis.insertAdjacentElement('beforebegin',box);
 box.addEventListener('click',function(ev){
  const button=ev.target.closest('button[data-mi-dia]');
  if(!button||!box.contains(button))return;
  const type=button.dataset.miDia;
  if(type==='refresh')miDiaLoad();
  else if(type==='proveedores')adminV2Open('proveedores');
  else if(type==='sueldos')adminV2Open('sueldos');
  else if(type==='caja')adminV2Open('caja');
  else if(type==='remitos')window.open('https://remitos-spanish.floot.app/','_blank','noopener,noreferrer');
  else if(type==='boleta')documentForm();
  else if(type==='pago')paymentForm();
 });
 return box
}
function miDiaCard(title,value,sub){
 return '<div class="mi-dia-card"><span>'+miDiaEsc(title)+'</span><b>'+miDiaEsc(value)+'</b><span>'+miDiaEsc(sub)+'</span></div>'
}
function miDiaList(items,make,empty){
 if(!items||!items.length)return '<div class="mi-dia-muted">'+miDiaEsc(empty)+'</div>';
 return items.slice(0,4).map(make).join('')
}

function miDiaRender(d){
 const node=document.getElementById('spanishMiDiaBody');if(!node)return;
 const s=d.proveedores||{},p=d.sueldos||{},c=d.clientes||{},co=d.compras||{};
 const format=v=>money(Number(v||0));
 let h='<div class="mi-dia-grid">'+
  miDiaCard('Por cobrar · sin e-cheqs',format(c.total),String(c.count||0)+' clientes')+
  miDiaCard('E-cheqs por acreditar',format(c.instruments_pending),String(c.instruments_count||0)+' cheques recibidos')+
  miDiaCard('Proveedores por pagar',format(s.total),String(s.count||0)+' proveedores')+
  miDiaCard('Liquidaciones pendientes',format(p.total),String(p.count||0)+' vencidas o de hoy')+'</div>';
 h+='<div class="mi-dia-section"><h3>Clientes por cobrar</h3>'+
  miDiaList(c.items,x=>'<div class="mi-dia-line"><div class="left"><b>'+miDiaEsc(x.client)+'</b>'+
   '<div class="mi-dia-muted">'+Number(x.invoice_count||0)+' factura(s) abiertas</div>'+
   (Number(x.instruments_pending)>0?'<div class="mi-dia-muted">E-cheqs entregados, aún sin acreditar: <b>'+miDiaEsc(format(x.instruments_pending))+'</b></div>':'')+
   '</div><div class="right">'+miDiaEsc(format(x.balance))+'</div></div>',
   'No hay importes pendientes de recibir registrados.')+
  '</div>';
 if((s.count||0)||(p.count||0)){
  h+='<details class="mi-dia-section"><summary style="cursor:pointer;font-weight:700;padding:8px 0">Ver proveedores y liquidaciones</summary>'+
   miDiaList(s.items,x=>'<div class="mi-dia-line"><span>'+miDiaEsc(x.name)+'</span><b>'+miDiaEsc(format(x.balance))+'</b></div>','Sin saldos de proveedores.')+

   miDiaList(p.items,x=>'<div class="mi-dia-line"><span>'+miDiaEsc(x.name)+'</span><b>'+miDiaEsc(format(x.amount))+'</b></div>','Sin liquidaciones vencidas.')+
   '</details>';
 }
 h+='<div class="mi-dia-muted" style="margin-top:10px">Valores de Remitos Spanish. Los e-cheqs pendientes NO se contabilizan como dinero acreditado. Actualizado: '+miDiaEsc(new Date(d.as_of||Date.now()).toLocaleString('es-AR'))+'</div>';
 node.innerHTML=h;
}
async function miDiaLoad(){
 if(FICHAJE_MODE||miDiaBusy||!TOKEN_OK.test(tok))return;
 const box=miDiaEnsure();if(!box)return;
 miDiaBusy=true;
 const btn=box.querySelector('[data-mi-dia="refresh"]');if(btn)btn.disabled=true;
 try{
  const r=await fetch(U+'/functions/v1/spanish-gestion-hoy',{method:'GET',headers:{'apikey':K,'x-audit-session':tok},cache:'no-store'});
  if(!r.ok)throw new Error('No se pudo obtener el estado ('+r.status+').');
  const data=await r.json();
  if(!data.ok)throw new Error('Datos no disponibles');
  miDiaRender(data);miDiaLastRead=Date.now();
 }catch(e){
  const node=document.getElementById('spanishMiDiaBody');
  if(node)node.innerHTML='<div class="mi-dia-alert">No pudimos actualizar los pendientes. Los módulos existentes siguen disponibles. '+miDiaEsc(e.message||String(e))+'</div>';
 }finally{miDiaBusy=false;if(btn)btn.disabled=false}
}



function miDiaAutomaticRefreshSetup(){
 if(FICHAJE_MODE||miDiaRefreshInstalled)return;
 miDiaRefreshInstalled=true;
 const run=()=>{
  if(document.hidden||Date.now()-miDiaLastRead<25000)return;
  if(document.getElementById('spanishMiDia')&&!document.getElementById('p-home')?.classList.contains('hide'))miDiaLoad();
 };
 document.addEventListener('visibilitychange',run);
 window.addEventListener('focus',run);
 setInterval(run,120000);
}
miDiaAutomaticRefreshSetup();

/* COMPRAS Spanish: planificador móvil, no genera movimientos contables ni envía pedidos automáticamente. */
let comprasData=null,comprasSelected='',comprasBusy=false,comprasRequestId='';
const comprasDayNames=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function comprasEsc(x){return String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function comprasNumber(x){let z=Number(x);return Number.isFinite(z)?z:0}
function comprasFindSupplier(id){return (comprasData?.suppliers||[]).find(x=>x.id===id)}
function comprasRule(){return (comprasData?.rules||[]).find(x=>x.supplier_id===comprasSelected)||{}}
function comprasDayOfWeek(){const d=new Date();return (d.getDay()+6)%7+1}
function comprasInstall(){
 if(FICHAJE_MODE)return;
 const home=document.getElementById('p-home'),app=home?.closest('main');
 if(!home||!app)return;
 if(!document.getElementById('comprasStyle')){
  const css=document.createElement('style');css.id='comprasStyle';css.textContent='.compras-wrap{margin:12px 0 60px}.compras-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.compras-head h2{font-size:21px;margin:0}.compras-note{font-size:12px;color:#64748b;margin:6px 0}.compras-panel{border:1px solid #dbe3ea;border-radius:14px;background:white;padding:14px;margin:10px 0}.compras-panel h3{font-size:16px;margin:0 0 10px}.compras-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.compras-field{min-width:0}.compras-field label{display:block;color:#475569;font-size:12px;margin-bottom:4px}.compras-field input,.compras-field select,.compras-field textarea{width:100%;max-width:100%;min-height:40px}.compras-days{display:flex;flex-wrap:wrap;gap:7px}.compras-days label{display:flex;gap:4px;align-items:center;padding:8px 10px;border:1px solid #dfe6eb;border-radius:10px;font-size:12px}.compras-days input{width:auto}.compras-product{padding:11px 0;border-bottom:1px solid #edf2f7;display:flex;align-items:center;gap:10px;justify-content:space-between}.compras-product:last-child{border:0}.compras-product b{font-size:13px}.compras-product small{color:#64748b;display:block}.compras-product input{width:76px;text-align:center;min-height:43px}.compras-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.compras-actions button{min-height:42px}.compras-order{border:1px solid #e2e8f0;border-radius:12px;padding:11px;margin:8px 0}.compras-order-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.compras-pill{font-size:11px;background:#e2e8f0;border-radius:8px;padding:3px 7px}.compras-bad{color:#9a3412}.compras-success{color:#166534}.compras-muted{color:#64748b;font-size:12px}.compras-highlight{background:#f1f5f9;border-radius:10px;padding:10px;margin-bottom:12px}.compras-entry button{min-height:46px}@media(min-width:720px){.compras-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.compras-wrap{max-width:960px}}';
  document.head.appendChild(css)
 }
 if(!document.getElementById('comprasEntry')){
  const entry=document.createElement('div');entry.id='comprasEntry';entry.className='card compras-entry';
  entry.innerHTML='<div class="row between"><div><b>Pedidos a proveedores</b><div class="small muted">Qué comprar, cuándo pedir y cómo pagar.</div></div><button class="primary" type="button" data-compras-open>Preparar pedido →</button></div>';
  const mi=document.getElementById('spanishMiDia');if(mi)mi.insertAdjacentElement('afterend',entry);else home.prepend(entry);
  entry.querySelector('button').addEventListener('click',comprasOpen)
 }
 if(!document.getElementById('p-compras')){
  const sec=document.createElement('section');sec.id='p-compras';sec.className='hide';sec.innerHTML='<div class="compras-wrap"><div class="compras-head"><div><h2>Pedidos a proveedores</h2><div class="compras-note">Prepará pedidos con los datos del bar, sin generar facturas ni pagos duplicados.</div></div><button type="button" data-compras-action="back">Volver</button></div><div id="comprasRoot"><div class="compras-panel">Cargando proveedores…</div></div></div>';
  app.appendChild(sec);
  sec.addEventListener('change',ev=>{if(ev.target?.id==='comprasSupplier'){comprasSelected=ev.target.value;comprasRender()}});
  sec.addEventListener('input',ev=>{if(ev.target?.id==='comprasSearch')comprasFilterProductos()});
  sec.addEventListener('click',ev=>{
   const btn=ev.target.closest('[data-compras-action]');if(!btn)return;
   const act=btn.dataset.comprasAction;
   if(act==='back')adminV2Open('home');
   else if(act==='refresh')comprasLoad();
   else if(act==='rules')comprasSaveRules();
   else if(act==='product')comprasProductForm();
   else if(act==='editproduct')comprasEditOffer(btn.dataset.id);
   else if(act==='stock'){
    const itemId=btn.dataset.id;invTab='count';
    invOpen().then(ok=>{if(ok){const el=document.getElementById('invCountItem');if(el)el.value=itemId}});
   }
   else if(act==='historical')comprasShowHistory();
   else if(act==='sync-imports')spanishImportsScreen();
   else if(act==='cmvdrafts')comprasShowCMVDrafts();
   else if(act==='habitual')comprasFillHabitual();
   else if(act==='clear')comprasClearQuantities();
   else if(act==='draft')comprasCreateDraft();
   else if(act==='status')comprasStatus(btn.dataset.id,btn.dataset.status);
   else if(act==='copy')comprasCopyOrder(btn.dataset.id,false);
   else if(act==='whatsapp')comprasCopyOrder(btn.dataset.id,true);
   else if(act==='staff')comprasStaffManager();
   else if(act==='configwhatsapp'){
    const el=document.getElementById('comprasPhone');
    if(!el)return A('No se encontró el campo WhatsApp del proveedor.');
    el.closest('details')?.setAttribute('open','');
    document.querySelectorAll('#p-compras details').forEach(d=>{if(d.contains(el))d.open=true});
    el.scrollIntoView({behavior:'smooth',block:'center'});el.focus()
   }
  })
 }
}
function comprasOpen(){
 comprasInstall();const el=document.getElementById('p-compras');if(!el)return;
 document.querySelectorAll('main > section').forEach(x=>x.classList.add('hide'));el.classList.remove('hide');
 document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));window.scrollTo(0,0);
 comprasLoad()
}
let spanishOpsDigestPending=null;
async function comprasApi(action,x={}){
 if(!TOKEN_OK.test(tok))throw Error('Ingresá nuevamente con tu PIN.');
 if(action==='ops_digest'&&spanishOpsDigestPending)return spanishOpsDigestPending;
 const run=async()=>{
  const r=await fetch(U+'/functions/v1/spanish-compras',{method:action?'POST':'GET',headers:{'apikey':K,'x-audit-session':tok,...(action?{'content-type':'application/json'}:{})},
   ...(action?{body:JSON.stringify({action,...x})}:{})});
  const j=await r.json();if(!r.ok||!j.ok)throw Error(j.detail||j.error||'No se pudo completar');return j
 };
 if(action!=='ops_digest')return run();
 const pending=run();spanishOpsDigestPending=pending;
 try{return await pending}finally{if(spanishOpsDigestPending===pending)spanishOpsDigestPending=null}
}
async function comprasLoad(){
 if(comprasBusy)return;comprasBusy=true;
 const root=document.getElementById('comprasRoot');if(root)root.innerHTML='<div class="compras-panel">Actualizando catálogo y pedidos…</div>';
 try{
  const data=await comprasApi();comprasData=data;
  if(!comprasData.suppliers.some(x=>x.id===comprasSelected))comprasSelected=comprasData.suppliers[0]?.id||'';
  comprasRender()
 }catch(err){if(root)root.innerHTML='<div class="compras-panel compras-bad">No se pudo cargar Compras: '+comprasEsc(err.message)+'</div>'}
 finally{comprasBusy=false}
}
function comprasDaysMarkup(name,values){
 return '<div class="compras-days">'+comprasDayNames.map((day,index)=>'<label><input type="checkbox" data-compras-days="'+name+'" value="'+(index+1)+'" '+((values||[]).includes(index+1)?'checked':'')+'>'+day+'</label>').join('')+'</div>'
}
function comprasProductOrderQty(x,ingredient,rule){
 const last=(comprasData.orders||[]).find(o=>o.supplier_id===comprasSelected&&o.status!=='ANULADO'&&(o.audit_purchase_order_lines||[]).some(line=>line.supplier_product_id===x.id));
 const interval=Number(x.frequency_days||0);
 const today=localISODate();
 // Las existencias del registro anterior no son un saldo conciliado de Inventario.
 // Hasta confirmar base física y consumo, no calcular reposición automática por stock.

 if(rule.order_weekdays?.length&&!rule.order_weekdays.includes(comprasDayOfWeek()))return 0;
 if(interval&&last){
  const elapsed=Math.floor((new Date(today+'T12:00:00')-new Date(last.order_date+'T12:00:00'))/86400000);
  if(elapsed<interval)return 0;
 }
 return Number(x.default_packs||1)
}

function comprasSimplePresentation(name,pres){
 const raw=String(pres||'').replace(/\s*\([^)]*(?:confirmar|ocasional|eventos)[^)]*\)/gi,'').trim();
 if(!raw||/^(?:precio\s+)?por\s+(?:kilogramo|kilo|kg)/i.test(raw))return '';
 const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const n=norm(name),p=norm(raw),weight=p.match(/\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|litros?|unidades?|sobres?)\b/);
 if(n===p||(weight&&n.includes(norm(weight[0]))&&/^(envase|botella|paquete|lata|pouch|bolsa|frasco|balde)/i.test(raw)))return '';
 return raw;
}
function comprasSimpleUnit(presentation,unit){
 const p=String(presentation||'').toLowerCase().trim();
 if(/^(?:precio\s+)?por\s+(?:kilogramo|kilo|kg)/.test(p))return 'kg';
 for(const pair of [['caja','cajas'],['cajón','cajones'],['envase','envases'],['pouch','pouch'],['bolsa','bolsas'],['bidón','bidones'],['paquete','paquetes'],['balde','baldes'],['botella','botellas'],['lata','latas'],['horma','hormas'],['frasco','frascos'],['pieza','piezas'],['bulto','bultos'],['pack','packs'],['bandeja','bandejas'],['cuarto','cuartos'],['unidad','unidades']]){
  if(p===pair[0]||p.startsWith(pair[0]+' ')||p.startsWith(pair[0]+'('))return pair[1]
 }
 return unit==='kg'?'kg':unit==='litro'?'litros':'unidades';
}
function comprasFilterProductos(){
 const q=String(document.getElementById('comprasSearch')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 document.querySelectorAll('#p-compras [data-compras-item-name]').forEach(el=>{
  const name=String(el.dataset.comprasItemName||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  el.style.display=(!q||name.includes(q))?'':'none'
 })
}
function comprasRender(){
 const root=document.getElementById('comprasRoot');if(!root||!comprasData)return;
 const sup=comprasFindSupplier(comprasSelected),r=comprasRule(),ingredients=new Map((comprasData.ingredients||[]).map(x=>[x.id,x]));
 const ps=(comprasData.products||[]).filter(x=>x.supplier_id===comprasSelected&&x.active).sort((a,b)=>{
  const an=ingredients.get(a.ingredient_id)?.name||'',bn=ingredients.get(b.ingredient_id)?.name||'';return an.localeCompare(bn,'es')});
 const ord=(comprasData.orders||[]).filter(x=>x.supplier_id===comprasSelected);
 const D=Array.isArray(r.delivery_weekdays)?r.delivery_weekdays:[],O=Array.isArray(r.order_weekdays)?r.order_weekdays:[];
 const paymentLabels={A_CONFIRMAR:'A confirmar',CONTADO:'Contado',TRANSFERENCIA:'Transferencia',EFECTIVO:'Efectivo',ECHEQ:'E-cheq',CHEQUE:'Cheque',CUENTA_CORRIENTE:'Cuenta corriente',OTRO:'Otro'};
 if(!sup){root.innerHTML='<div class="compras-panel">Primero necesitás un proveedor activo. Podés cargarlo en Proveedores, sin duplicar su ficha.</div>';return}
 const opt=(comprasData.suppliers||[]).map(x=>'<option value="'+comprasEsc(x.id)+'" '+(x.id===comprasSelected?'selected':'')+'>'+comprasEsc(x.name)+'</option>').join('');
 let h='<div class="compras-panel"><div class="compras-actions"><button type="button" data-compras-action="staff">Acceso de empleados</button><button type="button" onclick="invOpen()">Facturas + mercadería + costos</button><button type="button" onclick="spanishRecipeCatalogOpen()">Fichas de recetas POS</button></div><p class="compras-muted">Todo pedido queda registrado. WhatsApp abre el mensaje: marcá enviado solo después de mandarlo.</p></div>'+
 '<div class="compras-panel"><div class="compras-grid"><div class="compras-field" style="grid-column:span 2"><label>Proveedor</label><select id="comprasSupplier">'+opt+'</select></div><div class="compras-field"><label>Pedidos registrados</label><b>'+ord.length+'</b></div><div class="compras-field"><label>Insumos vinculados</label><b>'+ps.length+'</b></div></div></div>';
 const sync=comprasData.integracion||{},consumo=comprasData.consumption||{};
 const delayed=sync.status&&sync.status!=='ACTUALIZADO';
 if(!String(r.whatsapp||'').trim()){
  h+='<div class="compras-panel compras-bad"><b>WhatsApp de '+comprasEsc(sup.name)+' sin configurar</b><p class="compras-muted">Cargá el número una vez para abrir cada pedido en el chat correcto.</p><button type="button" data-compras-action="configwhatsapp">Cargar WhatsApp</button></div>';
 }
 h+='<div class="compras-panel"><b class="'+(delayed?'compras-bad':'compras-success')+'">Sincronización de ventas: '+(delayed?'REVISAR':'ACTUALIZADA')+'</b>'+
  '<div class="compras-muted">Último JSON de productos: '+comprasEsc(sync.last_json||'sin datos')+
  ' · Último cierre de caja: '+comprasEsc(sync.last_close||'sin datos')+'</div>'+
  (sync.latest_sales?'<div class="compras-muted">Última jornada con JSON final: '+comprasEsc(sync.latest_sales.units)+' unidades vendidas</div>':'')+
  (sync.latest_snapshot?'<div class="compras-muted">Captura POS parcial: '+comprasEsc(sync.latest_snapshot.operational_day||'?')+' · '+comprasEsc(sync.latest_snapshot.item_units||0)+' unidades en esa captura. No es cierre final.</div>':'')+
  (sync.snapshot_pending_final?'<div class="compras-bad">Hay capturas posteriores al último JSON final. Recuperá el archivo definitivo original; no dupliques ventas ni vuelvas a ingresarlas.</div>':'')+
  (delayed?'<div class="compras-actions"><button type="button" data-compras-action="sync-imports">Revisar e importar JSON final</button></div>':'')+
  (sync.diagnostic_partial?'<div class="compras-bad">No se pudo comprobar alguna fuente de sincronización.</div>':'')+
  (!consumo.automatic_ready?'<div class="compras-bad"><b>'+Number(consumo.recipes_approved_for_estimated_cmv||0)+' recetas APROBADAS para costeo referencial</b> · '+Number(consumo.pos_products_with_approved_estimated_cmv||0)+' de '+Number(consumo.sold_product_types||0)+' productos vendidos cubiertos. <b>Stock automático no habilitado:</b> '+Number(consumo.fully_verified_recipes||0)+' fichas estructuralmente completas y '+Number(consumo.required_ingredients_without_stock||0)+' insumos críticos sin conteo inicial. Podés generar pedidos manuales utilizando los costos estimados.</div>':'<div class="compras-success">Base de reposición de ingredientes verificada. No confundir gramajes teóricos con conteo físico.</div>')+
  '</div>';

 const reconstruction=comprasData.reconstruction;
 if(reconstruction && reconstruction.stats){
  const t=reconstruction.stats;
  h+='<details class="compras-panel" style="border-left:4px solid #64748b"><summary style="font-weight:700;cursor:pointer;padding:5px 0">Simulación histórica de costos (NO es CMV real)</summary>'+
  '<div class="compras-muted">Referencias sin aprobación, procedentes de chats y facturas: los valores no equivalen a inventario físico, costo definitivo ni CMV medido.</div>'+
  '<div class="compras-grid" style="margin-top:8px"><div><div class="compras-muted">Renglones documentados</div><b>'+Number(t.evidence_rows||0)+'</b></div>'+
  '<div><div class="compras-muted">Facturas confirmadas</div><b>'+Number(t.invoiced_lines||0)+'</b></div>'+
  '<div><div class="compras-muted">Recetas aprobadas para CMV referencial</div><b>'+Number(t.approved_for_estimated_cmv||0)+'</b></div>'+
  '<div><div class="compras-muted">Productos con costo aprobado estimado</div><b>'+Number(t.costed_product_types||0)+'</b></div></div>'+
  '<div style="margin-top:9px"><b>CMV referencial parcial (NO CMV real): '+money(t.partial_cost_low||0)+' a '+money(t.partial_cost_high||0)+'</b>'+
  '<div class="compras-muted">Ventas '+comprasEsc(t.from_day||'?')+' a '+comprasEsc(t.through_day||'?')+' · '+Number(t.without_cost_types||0)+' tipos sin costo · '+Number(t.without_cost_units||0)+' unidades sin costo. NO es el CMV total.</div></div>'+
  '<div class="compras-actions"><button type="button" data-compras-action="historical">Ver compras y devoluciones</button><button type="button" data-compras-action="cmvdrafts">Ver recetas y costos</button></div>'+
  '<p class="compras-muted" style="margin-top:9px">Los pedidos de chat no se suman al stock físico. Las recetas no se descuentan automáticamente hasta confirmar cantidades. El CMV real requiere stock inicial, compras y stock final, conciliando mermas y consumos no vendidos.</p></details>';
 }else{
  h+='<div class="compras-panel compras-muted">Las estimaciones históricas todavía no están disponibles; el módulo de pedidos continúa independiente.</div>';
 }

 h+='<div class="compras-panel"><h3>Qué necesitás pedir</h3>'+
  '<label>Buscar artículo</label><input id="comprasSearch" type="search" placeholder="Buscar producto" autocomplete="off">';
 if(!ps.length)h+='<div class="compras-highlight">Todavía no hay insumos vinculados a este proveedor. Agregalos una sola vez y después aparecerán automáticamente.</div>';
 for(const x of ps){
  const ing=ingredients.get(x.ingredient_id)||{},name=ing.name||'Artículo';
  const pres=comprasSimplePresentation(name,x.presentation),unit=comprasSimpleUnit(x.presentation,ing.unit);
  const demand=(comprasData.integracion?.demand_by_ingredient||[]).find(y=>y.ingredient_id===x.ingredient_id);
  h+='<div class="compras-product" data-compras-item-name="'+comprasEsc(name)+'"><div style="min-width:0;flex:1"><b>'+comprasEsc(name)+'</b>'+
   (pres?'<small>'+comprasEsc(pres)+'</small>':'')+
   (demand?'<small>Consumo teórico registrado: '+comprasEsc(demand.quantity)+' '+comprasEsc(ing.unit)+' · '+comprasEsc(comprasData.integracion?.demand_from||'?')+' a '+comprasEsc(comprasData.integracion?.demand_to||'?')+'</small>':'')+
   '<details style="margin-top:5px"><summary class="compras-muted" style="cursor:pointer">Costo, conteo y editar</summary>'+
   '<div class="compras-muted" style="margin-top:5px">'+(x.pack_price==null?'Sin costo registrado':money(x.pack_price))+
   (ing.stock_quantity==null?' · Sin conteo en ficha anterior':' · Conteo anterior '+comprasEsc(ing.stock_quantity)+' '+comprasEsc(ing.unit)+' (revisar en Inventario)')+'</div>'+
   '<div class="compras-actions"><button type="button" data-compras-action="stock" data-id="'+comprasEsc(ing.id)+'">Contar en inventario</button>'+
   '<button type="button" data-compras-action="editproduct" data-id="'+comprasEsc(x.id)+'">Editar</button></div></details></div>'+
   '<div class="compras-field" style="width:90px;flex:0 0 90px"><label style="text-align:center">Cantidad<br><span class="compras-muted">'+comprasEsc(unit)+'</span></label>'+
   '<input type="number" inputmode="decimal" step=".001" min="0" max="100000" data-compras-pack="'+comprasEsc(x.id)+'" value="0" aria-label="Cantidad en '+comprasEsc(unit)+' de '+comprasEsc(name)+'"></div></div>'
 }
 h+='<div class="compras-actions"><button type="button" data-compras-action="habitual">Usar cantidades habituales</button><button type="button" data-compras-action="clear">Vaciar cantidades</button></div>';
 h+='<div class="compras-actions"><button data-compras-action="product">+ Agregar insumo / presentación</button></div></div>';
 const next=localISODate();
 h+='<div class="compras-panel"><h3>Guardar pedido</h3>'+
  '<div class="compras-grid"><div class="compras-field"><label>Entrega prevista (opcional)</label><input id="comprasExpected" type="date" value="'+comprasEsc((r.lead_days===null||r.lead_days===undefined||!D.length?'':addDaysISO(next,Number(r.lead_days))))+'"></div>'+
  '<div class="compras-field" style="grid-column:span 2"><label>Mensaje adicional (opcional)</label><input id="comprasOrderNotes" placeholder="Observaciones del pedido" maxlength="1000"></div></div>'+
  '<div class="compras-actions"><button class="primary" data-compras-action="draft" '+(ps.length?'':'disabled')+'>Guardar pedido</button>'+
  '<button data-compras-action="refresh">Actualizar información</button></div>'+
  '<div class="compras-muted">Guardar no envía WhatsApp ni genera deuda. Después podés revisar y aprobar.</div></div>';
 h+='<div class="compras-panel"><h3>Pedidos recientes</h3>';
 if(!ord.length)h+='<div class="compras-muted">Todavía no se generaron pedidos para este proveedor.</div>';
 for(const x of ord.slice(0,12)){
  const lines=x.audit_purchase_order_lines||[];
  const unknown=lines.some(z=>z.pack_price==null);
  const statuses={BORRADOR:['APROBADO','ANULADO'],APROBADO:['ENVIADO','ANULADO'],ENVIADO:['RECIBIDO','ANULADO'],RECIBIDO:[],ANULADO:[]};
  h+='<div class="compras-order"><div class="compras-order-head"><b>'+comprasEsc(x.order_date)+'</b><span class="compras-pill">'+comprasEsc(x.status)+'</span></div>'+
   '<div class="compras-muted">'+lines.length+' artículos · '+(unknown?'Total parcial, precios pendientes':('Estimado '+money(x.total_estimate)))+' · '+comprasEsc(x.payment_method||'A confirmar')+' '+(x.payment_days?'('+x.payment_days+' días)':'')+'</div>'+
   lines.map(z=>'<div class="compras-muted">'+comprasEsc(comprasWhatsAppLine(z))+'</div>').join('')+
   '<details class="compras-highlight" style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">Ver mensaje para WhatsApp</summary><div style="white-space:pre-wrap;font-size:14px;padding:10px 0">'+comprasEsc(comprasOrderText(x.id))+'</div></details>'+'<div class="compras-actions"><button data-compras-action="copy" data-id="'+comprasEsc(x.id)+'">Copiar para WhatsApp</button>'+
   '<button data-compras-action="whatsapp" data-id="'+comprasEsc(x.id)+'">Abrir WhatsApp</button>'+
   (statuses[x.status]||[]).map(st=>'<button data-compras-action="status" data-id="'+comprasEsc(x.id)+'" data-status="'+st+'">'+({APROBADO:'Aprobar',ENVIADO:'Marcar enviado',RECIBIDO:'Marcar recibido',ANULADO:'Anular'}[st])+'</button>').join('')+
   '</div></div>'
 }
 h+='</div>';
 h+='<div class="compras-panel"><details><summary style="cursor:pointer;font-weight:600">Editar condiciones del proveedor (opcional)</summary>'+
 '<div class="compras-muted">Quedan guardadas una sola vez. Si no hay días o frecuencia fijos, dejalos vacíos.</div>';
 h+='<div class="compras-panel"><h3>Condiciones de '+comprasEsc(sup.name)+'</h3>'+
  '<div class="compras-field"><label>Días para pedir (opcional)</label>'+comprasDaysMarkup('order',O)+'</div>'+
  '<div class="compras-field" style="margin-top:10px"><label>Días de entrega (opcional)</label>'+comprasDaysMarkup('delivery',D)+'</div>'+
  '<div class="compras-grid" style="margin-top:10px"><div class="compras-field"><label>Demora de entrega (días, opcional)</label><input id="comprasLead" type="number" min="0" max="30" value="'+(r.lead_days??'')+'"></div>'+
  '<div class="compras-field"><label>Forma de pago</label><select id="comprasPayment">'+Object.keys(paymentLabels).map(k=>'<option value="'+k+'" '+(r.payment_method===k?'selected':'')+'>'+paymentLabels[k]+'</option>').join('')+'</select></div>'+
  '<div class="compras-field"><label>Plazo de pago (si aplica)</label><input id="comprasPayDays" type="number" min="0" max="180" value="'+(r.payment_days||'')+'"></div>'+
  '<div class="compras-field"><label>WhatsApp del proveedor (opcional)</label><input id="comprasPhone" type="tel" placeholder="549336…" value="'+comprasEsc(r.whatsapp||'')+'"></div></div>'+
  '<details style="margin-top:10px"><summary class="compras-muted" style="cursor:pointer">Notas internas</summary><textarea id="comprasRuleNotes" rows="2">'+comprasEsc(r.notes||'')+'</textarea></details>'+
  '<div class="compras-actions"><button class="primary" data-compras-action="rules">Guardar condiciones</button></div></div>';

 h+='</details></div>';
 root.innerHTML=h
}
async function comprasSaveRules(){
 if(comprasBusy)return;
 const collect=name=>[...document.querySelectorAll('#p-compras input[data-compras-days="'+name+'"]:checked')].map(x=>Number(x.value));
 const lead=Number(document.getElementById('comprasLead').value||0),pdays=Number(document.getElementById('comprasPayDays').value||0);
 if(!Number.isInteger(lead)||lead<0||lead>30||!Number.isInteger(pdays)||pdays<0||pdays>180)return A('Revisá los días.');
 comprasBusy=true;
 try{await comprasApi('save_rules',{supplier_id:comprasSelected,order_weekdays:collect('order'),delivery_weekdays:collect('delivery'),lead_days:lead,
   payment_method:document.getElementById('comprasPayment').value,payment_days:pdays,whatsapp:document.getElementById('comprasPhone').value,
   notes:document.getElementById('comprasRuleNotes').value,minimum_order:null});
  await comprasLoadAfterAction();A('Condiciones guardadas para los próximos pedidos.');
 }catch(e){A('No se guardaron las condiciones: '+e.message)}finally{comprasBusy=false}
}
async function comprasLoadAfterAction(){
 const data=await comprasApi();comprasData=data;comprasRender();controlLoad(true)
}
function comprasProductForm(){
 const list=(comprasData?.ingredients||[]).filter(x=>x.active).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const options=list.map(x=>'<option value="'+comprasEsc(x.id)+'">'+comprasEsc(x.name)+' ('+comprasEsc(x.unit)+')</option>').join('');
 M('<h3>Insumo para '+comprasEsc(comprasFindSupplier(comprasSelected)?.name)+'</h3>'+
 '<p class="small muted">Elegí un insumo existente para reutilizarlo con otro proveedor, o escribí uno nuevo.</p>'+
 '<label>Insumo ya cargado</label><select id="comprasExisting"><option value="">Nuevo insumo</option>'+options+'</select>'+
 '<label>Nombre del insumo (si es nuevo)</label><input id="comprasName" placeholder="Ej. mozzarella, pechuga, harina">'+
 '<label>Unidad base</label><select id="comprasUnit"><option value="kg">Kilogramos</option><option value="litro">Litros</option><option value="unidad">Unidades</option></select>'+
 '<label>Presentación de este proveedor</label><input id="comprasPresentation" placeholder="Ej. cajón 15 kg, horma 4 kg, caja 12 unidades">'+
 '<label>Cantidad base por presentación</label><input id="comprasUnits" type="number" min="0.001" step=".001" value="1">'+
 '<label>Precio (se carga con factura desde Control de costos)</label><input id="comprasPrice" type="text" placeholder="Usá Control de costos para registrar precios" disabled>'+
 '<label>Cantidad habitual (opcional)</label><input id="comprasDefault" type="number" min=".001" step=".001" value="1">'+
 '<label>Frecuencia en días (opcional, si aplica)</label><input id="comprasFrequency" type="number" min="1" max="90" placeholder="Opcional">'+
 '<button type="button" class="primary" style="width:100%;margin-top:14px" onclick="comprasSaveProduct()">Guardar insumo</button>')
}
function comprasEditOffer(id){
 const offer=(comprasData?.products||[]).find(x=>x.id===id);
 if(!offer)return;
 comprasProductForm();
 const existing=document.getElementById('comprasExisting'),item=(comprasData.ingredients||[]).find(x=>x.id===offer.ingredient_id);
 if(!existing||!item)return;
 existing.value=item.id;existing.disabled=true;
 document.getElementById('comprasName').value=item.name;
 document.getElementById('comprasUnit').value=item.unit;
 document.getElementById('comprasUnit').disabled=true;
 document.getElementById('comprasPresentation').value=offer.presentation;
 document.getElementById('comprasPresentation').readOnly=true;
 document.getElementById('comprasUnits').value=offer.units_per_pack;
 document.getElementById('comprasPrice').value='Ver en Control de costos';
 document.getElementById('comprasDefault').value=offer.default_packs;
 document.getElementById('comprasFrequency').value=offer.frequency_days??'';
}
async function comprasSaveProduct(){
 if(comprasBusy)return;
 const existing=document.getElementById('comprasExisting').value,ingredient=(comprasData.ingredients||[]).find(x=>x.id===existing);
 const name=existing?ingredient?.name:document.getElementById('comprasName').value.trim();
 const unit=existing?ingredient?.unit:document.getElementById('comprasUnit').value;
 const values={supplier_id:comprasSelected,ingredient_id:existing||null,name,unit,presentation:comprasPresentation.value.trim(),
  units_per_pack:comprasUnits.value,pack_price:null,default_packs:comprasDefault.value,frequency_days:comprasFrequency.value||null};
 if(!name||!values.presentation||!values.units_per_pack)return A('Completá insumo, presentación y cantidad.');
 comprasBusy=true;
 try{await comprasApi('save_product',values);X();await comprasLoadAfterAction();A('Insumo vinculado. Su presentación queda guardada para los próximos pedidos.')}
 catch(e){A('No se pudo guardar: '+e.message)}finally{comprasBusy=false}
}
function comprasStockForm(id){
 const ing=(comprasData?.ingredients||[]).find(x=>x.id===id);if(!ing)return;
 M('<h3>Stock de '+comprasEsc(ing.name)+'</h3><p class="small muted">Registro opcional: si no contaste, dejá vacío. No afecta caja ni inventario contable.</p>'+
  '<label>Stock contado ('+comprasEsc(ing.unit)+')</label><input type="number" min="0" step=".001" id="comprasStockQty" value="'+comprasEsc(ing.stock_quantity??'')+'">'+
  '<label>Stock objetivo ('+comprasEsc(ing.unit)+')</label><input type="number" min="0" step=".001" id="comprasStockTarget" value="'+comprasEsc(ing.target_stock_quantity??'')+'">'+
  '<button class="primary" type="button" style="width:100%;margin-top:14px" onclick="comprasStockSave(\''+comprasEsc(id)+'\')">Guardar conteo</button>')
}
async function comprasStockSave(id){
 if(comprasBusy)return;comprasBusy=true;
 try{await comprasApi('save_stock',{ingredient_id:id,stock_quantity:comprasStockQty.value||null,target_stock_quantity:comprasStockTarget.value||null});
 X();await comprasLoadAfterAction();A('Conteo guardado. Se actualizará la sugerencia de pedido.')}
 catch(e){A(e.message)}finally{comprasBusy=false}
}

function comprasFillHabitual(){
 if(!comprasData)return;
 let count=0;
 for(const x of comprasData.products||[]){
  if(x.supplier_id!==comprasSelected||!x.active)continue;
  const el=document.querySelector('#p-compras input[data-compras-pack="'+x.id+'"]');
  if(!el)continue;
  const recommended=Number(x.default_packs||1);
  if(!Number.isFinite(recommended)||recommended<0)continue;
  el.value=String(recommended);
  if(recommended>0)count++
 }
 A(count?'Cargué '+count+' artículos con sus cantidades habituales. No usé stock sin conciliar: revisá todo antes de guardar.':'No hay cantidades habituales para sugerir: cargá cantidades manualmente.')
}

function comprasShowHistory(){
 const data=comprasData?.reconstruction?.orders;
 if(!Array.isArray(data))return A('No hay órdenes históricas disponibles.');
 M('<div class="row between"><h3>Pedidos de WhatsApp</h3><button onclick="X()">Volver</button></div>'+
 '<p class="small muted">Registro de evidencia, NO ingreso de mercadería. Facturado significa factura identificada, no recepción física.</p>'+
 '<input id="chatHistorySearch" type="search" placeholder="Proveedor, fecha, artículo o estado" autocomplete="off" style="width:100%;min-height:44px;margin-bottom:10px">'+
 '<div id="chatHistoryList"></div>');
 document.getElementById('chatHistorySearch')?.addEventListener('input',comprasHistoryFilter);
 comprasHistoryFilter();
}
function comprasHistoryFilter(){
 const container=document.getElementById('chatHistoryList'),rows=comprasData?.reconstruction?.orders||[];
 if(!container)return;
 const term=String(document.getElementById('chatHistorySearch')?.value||'').toLocaleLowerCase('es-AR');
 const filtered=rows.filter(x=>[x.supplier,x.date,x.product,x.status,x.channel].join(' ').toLocaleLowerCase('es-AR').includes(term));
 container.innerHTML='<div class="small muted">'+filtered.length+' renglones encontrados</div><div class="table"><table><tr><th>Fecha</th><th>Proveedor</th><th>Artículo</th><th>Pedido</th><th>Estado</th></tr>'+
 filtered.slice(0,180).map(x=>'<tr><td>'+comprasEsc(x.date)+'</td><td>'+comprasEsc(x.supplier)+'</td><td>'+comprasEsc(x.product)+'</td><td>'+comprasEsc(x.quantity)+' '+comprasEsc(x.unit)+'</td><td>'+comprasEsc(x.status)+'</td></tr>').join('')+'</table></div>'+
 (filtered.length>180?'<div class="small muted">Se muestran los primeros 180 resultados; usá el buscador para filtrar.</div>':'');
}
function comprasShowCMVDrafts(){
 const data=comprasData?.reconstruction?.recipes;
 if(!Array.isArray(data))return A('No hay recetas estimadas disponibles.');
 M('<div class="row between"><h3>Recetas genéricas · CMV</h3><button onclick="X()">Volver</button></div>'+
 '<p class="small muted">Escenarios APROBADOS por gerencia para CMV referencial, basados en precios y rendimientos históricos. NO representan CMV real ni generan egresos de stock.</p>'+
 '<input id="cmvDraftSearch" type="search" placeholder="Buscar producto o familia" autocomplete="off" style="width:100%;min-height:44px;margin-bottom:10px">'+
 '<div id="cmvDraftList"></div>');
 document.getElementById('cmvDraftSearch')?.addEventListener('input',comprasDraftFilter);
 comprasDraftFilter();
}
function comprasDraftFilter(){
 const host=document.getElementById('cmvDraftList'),rows=comprasData?.reconstruction?.recipes||[];
 if(!host)return;
 const term=String(document.getElementById('cmvDraftSearch')?.value||'').toLocaleLowerCase('es-AR');
 const list=rows.filter(x=>[x.name,x.family,x.pos_id].join(' ').toLocaleLowerCase('es-AR').includes(term));
 host.innerHTML='<div class="small muted">'+list.length+' recetas provisionales encontradas</div>'+
 list.slice(0,120).map(r=>{
 const ingredients=Array.isArray(r.ingredients)?r.ingredients:[];
 const name=ingredients.map(i=>comprasEsc(i[0])+' · '+comprasEsc(i[1])+' '+comprasEsc(i[2])).join(', ');
 return '<details class="compras-order"><summary><b>'+comprasEsc(r.name)+'</b><div class="small muted">'+comprasEsc(r.family)+' · '+money(r.low)+' a '+money(r.high)+'</div></summary>'+
 '<p class="small">'+name+'</p><p class="small muted">'+comprasEsc(r.pricing_note||'Pendiente de revisar')+'</p></details>';
 }).join('')+
 (list.length>120?'<div class="small muted">Se muestran 120: filtrá para localizar un plato.</div>':'');
}

function comprasClearQuantities(){
 for(const el of document.querySelectorAll('#p-compras input[data-compras-pack]'))el.value='0';
}

async function comprasCreateDraft(){
 if(comprasBusy)return;
 const lines=[...document.querySelectorAll('#p-compras input[data-compras-pack]')].map(el=>({product_id:el.dataset.comprasPack,packages:Number(el.value)})).filter(x=>x.packages>0);
 if(!lines.length)return A('Seleccioná al menos una cantidad mayor que cero.');
 if(lines.some(x=>!Number.isFinite(x.packages)||x.packages>100000))return A('Revisá las cantidades.');
 if(!comprasRequestId)comprasRequestId=crypto.randomUUID();
 comprasBusy=true;
 try{
  await comprasApi('create_order',{supplier_id:comprasSelected,request_key:comprasRequestId,lines,
   expected_date:document.getElementById('comprasExpected').value||null,notes:document.getElementById('comprasOrderNotes').value});
  comprasRequestId='';await comprasLoadAfterAction();A('Borrador guardado. Revisalo abajo, aprobalo y después envialo al proveedor.');
 }catch(e){A('No se pudo guardar el pedido: '+e.message)}finally{comprasBusy=false}
}
async function comprasStatus(id,status){
 if(comprasBusy)return;
 const confirmText={APROBADO:'¿Aprobar este pedido? Todavía no se envía.',ENVIADO:'¿Confirmás que lo enviaste efectivamente al proveedor?',RECIBIDO:'¿Confirmás que recibiste este pedido? No se genera factura ni pago.',ANULADO:'¿Anular este pedido? El historial se conserva.'}[status];
 if(!window.confirm(confirmText))return;
 comprasBusy=true;
 try{
  const original=(comprasData?.orders||[]).find(x=>x.id===id);
  await comprasApi('change_status',{order_id:id,status});
  await comprasLoadAfterAction();
  if(status==='RECIBIDO'&&original?.supplier_id){
    if(confirm('Pedido marcado como recibido. ¿Cargar ahora los artículos reales de la boleta? No se descuentan ni suman existencias hasta registrarlas.')){
      invSupplier=original.supplier_id;invTab='receive';invOpen()
    }
  }else A('Estado actualizado: '+status)
 }
 catch(e){A('No se pudo cambiar el estado: '+e.message)}finally{comprasBusy=false}
}
function comprasWhatsAppLine(x){
 const amount=Number(x.packages);
 if(!Number.isFinite(amount)||amount<=0)return '';
 const qty=amount.toLocaleString('es-AR',{maximumFractionDigits:3});
 const parts=String(x.description||'Producto').split(/\s*·\s*/);
 const rawName=(parts.shift()||'Producto').trim();
 const name=/^nalga$/i.test(rawName)?'nalga':rawName;
 const raw=parts.join(' · ').trim();
 const presentation=raw.replace(/\([^)]*(?:confirmar|ocasional|eventos)[^)]*\)/gi,'').replace(/\s+/g,' ').trim();
 if(/^(?:(?:precio|venta)\s+)?por\s+(?:kilogramo|kilo|kg)\b/i.test(presentation))return qty+' kg de '+name;
 if(/^kg\b/i.test(presentation))return qty+' kg de '+name;
 const units=[
 ['caja','cajas'],['cajón','cajones'],['bolsa','bolsas'],['balde','baldes'],
 ['pouch','pouch'],['horma','hormas'],['bidón','bidones'],
 ['frasco','frascos'],['paquete','paquetes'],['pack','packs'],
 ['lata','latas'],['botella','botellas'],['envase','envases'],
 ['pieza','piezas'],['pote','potes'],['atado','atados'],['rollo','rollos'],
 ['bulto','bultos'],['cuarto','cuartos'],['unidad','unidades'],
 ['bandeja','bandejas']
 ];
 let noun='';
 for(const u of units){
  if(presentation.toLocaleLowerCase('es-AR').startsWith(u[0]+' ')||presentation.toLocaleLowerCase('es-AR')===u[0]){
   noun=amount===1?u[0]:u[1];break
  }
 }
 if(!noun)noun='unidades';
 let size='';
 const m=presentation.match(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|litros?|sobres?|unidades?|metros?)\b/i);
 if(m){
  const norm=z=>String(z).toLocaleLowerCase('es-AR').replace(/[\s.,]/g,'');
  if(!norm(name).includes(norm(m[0])))size=' ('+m[0]+')'
 }
 return qty+' '+noun+' de '+name+size
}
function comprasOrderText(id){
 const o=(comprasData?.orders||[]).find(x=>x.id===id);
 if(!o)return '';
 const lines=(o.audit_purchase_order_lines||[]).map(comprasWhatsAppLine).filter(Boolean);
 if(!lines.length)return '';
 const notes=String(o.notes||'').trim();
 return 'Buenas, te encargo\n\n'+
  lines.join('\n')+
  (notes?'\n\n'+notes:'')
}
async function comprasCopyOrder(id,whatsapp){
 const text=comprasOrderText(id);if(!text){A('El pedido no tiene artículos para copiar.');return}
 const order=(comprasData?.orders||[]).find(x=>x.id===id);
 if(whatsapp){
  const rule=(comprasData?.rules||[]).find(x=>x.supplier_id===order?.supplier_id);
  const phone=String(rule?.whatsapp||'').replace(/\D/g,'');
  const url=phone?'https://wa.me/'+phone+'?text='+encodeURIComponent(text):
   'https://api.whatsapp.com/send?text='+encodeURIComponent(text);
  window.open(url,'_blank','noopener,noreferrer');return
 }
 try{await navigator.clipboard.writeText(text);A('Pedido claro copiado. Ya lo podés pegar en WhatsApp.')}
 catch(_){window.prompt('Copiá este pedido para WhatsApp:',text)}
}



let comprasStaffData=null,comprasStaffBusy=false;
async function comprasStaffManager(){
 if(comprasStaffBusy)return;comprasStaffBusy=true;
 try{
  comprasStaffData=await comprasApi('staff_permissions');
  const staff=comprasStaffData,perms=new Map((staff.permissions||[]).map(x=>[x.employee_id,x]));
  const rows=(staff.employees||[]).map(e=>{
   const p=perms.get(e.id)||{};
   return '<div class="compras-panel"><b>'+comprasEsc(e.name)+'</b>'+
   '<div class="compras-actions"><label><input type="checkbox" id="staffEn'+comprasEsc(e.id)+'" '+(p.enabled?'checked':'')+'> Habilitar</label>'+
   '<label><input type="checkbox" id="staffCr'+comprasEsc(e.id)+'" '+(p.may_create?'checked':'')+'> Crear pedidos</label>'+
   '<label><input type="checkbox" id="staffSe'+comprasEsc(e.id)+'" '+(p.may_send?'checked':'')+'> Enviar por WhatsApp</label></div>'+
   '<button type="button" onclick="comprasStaffSave(\''+comprasEsc(e.id)+'\')">Guardar permisos</button></div>';
  }).join('');
  M('<h3>Pedidos de empleados</h3><p class="small muted">Cada persona utiliza su PIN de fichaje. El permiso solo alcanza pedidos; no accede a sueldos, IVA ni caja. Los cambios se registran por empleado.</p>'+
   '<button class="primary" type="button" onclick="comprasStaffCopyLink()">Copiar enlace para el personal</button><p class="small muted">El enlace abre una pantalla exclusiva de pedidos. No comparte tu PIN de administrador.</p>'+
   rows);
 }catch(err){A('No se pudo cargar personal: '+err.message)}finally{comprasStaffBusy=false}
}
async function comprasStaffSave(id){
 if(comprasStaffBusy)return;
 const enabled=!!document.getElementById('staffEn'+id)?.checked;
 const may_create=!!document.getElementById('staffCr'+id)?.checked;
 const may_send=!!document.getElementById('staffSe'+id)?.checked;
 if(may_send&&!may_create)return A('Para enviar también debe tener permiso de preparar pedidos.');
 if(enabled&&!may_create)return A('Un empleado habilitado debe poder preparar pedidos.');
 if(!confirm((enabled?'Habilitar':'Deshabilitar')+' acceso a pedidos de este empleado?'))return;
 comprasStaffBusy=true;
 try{
  await comprasApi('staff_permission_save',{employee_id:id,enabled,may_create,may_send});
  comprasStaffBusy=false;await comprasStaffManager();A('Permisos de pedidos actualizados.')
 }catch(err){comprasStaffBusy=false;A('Error: '+err.message)}
}
function comprasStaffCopyLink(){
 const link=comprasStaffData?.portal_url;
 if(!link)return A('Enlace no disponible.');
 navigator.clipboard?.writeText(link).then(()=>A('Enlace de pedidos copiado. Compartilo únicamente con empleados autorizados.'))
 .catch(()=>window.prompt('Enlace para empleados:',link));
}

/* Control de consumo teórico y precios comprobados; consulta independiente de caja. */
let costosState=null,costosBusy=false,costosSupplier='',costosPos='';
let costosSaleDay='';
function costosEsc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function costosStatus(x){return ({SIN_PRECIO:'Sin precio',REFERENCIAL:'Referencia sin factura',DESACTUALIZADO:'Precio vencido',CONFIRMADO:'Precio confirmado'})[x]||x}

let itemTrackerData=null,itemTrackerDay='',itemTrackerBusy=false,itemTrackerPoll=null;
function itemTrackerInstall(){
 if(FICHAJE_MODE)return;
 const home=document.getElementById('p-home'),app=home?.closest('main');if(!home||!app)return;
 if(!document.getElementById('itemTrackerStyle')){
  const style=document.createElement('style');style.id='itemTrackerStyle';
  style.textContent='.itemtrack-page{max-width:900px;margin:0 auto;padding:14px 0 70px}.itemtrack-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.itemtrack-top h2{margin:0;font-size:20px}.itemtrack-card{border:1px solid #dbe3ea;background:#fff;border-radius:14px;padding:14px;margin:12px 0}.itemtrack-muted{font-size:12px;color:#64748b}.itemtrack-row{display:flex;gap:12px;justify-content:space-between;align-items:center;border-bottom:1px solid #edf2f7;padding:10px 0}.itemtrack-row:last-child{border:0}.itemtrack-row b{font-size:14px}.itemtrack-row strong{font-size:18px;min-width:40px;text-align:right}.itemtrack-row small{display:block;font-size:11px;color:#64748b;margin-top:3px}.itemtrack-card select,.itemtrack-card input{width:100%;min-height:44px}.itemtrack-warning{color:#a16207;font-size:12px}.itemtrack-stamp{font-weight:700;color:#334155}@media(min-width:720px){.itemtrack-page{padding-top:20px}}';
  document.head.appendChild(style)
 }
 if(!document.getElementById('itemTrackerEntry')){
  const entry=document.createElement('div');entry.className='card';entry.id='itemTrackerEntry';
  entry.innerHTML='<div class="row between"><div><b>Mercadería vendida</b><div class="small muted">Parciales por ítem y cierre definitivo. Sin importes.</div></div><button class="primary" type="button" id="itemTrackerOpenBtn">Ver ítems →</button></div>';
  const mi=document.getElementById('spanishMiDia');
  if(mi)mi.insertAdjacentElement('afterend',entry);else home.prepend(entry);
  entry.querySelector('button').addEventListener('click',itemTrackerOpen)
 }
 if(!document.getElementById('p-item-tracker')){
  const section=document.createElement('section');section.id='p-item-tracker';section.className='hide';
  section.innerHTML='<div class="itemtrack-page"><div class="itemtrack-top"><h2>Mercadería vendida</h2><button type="button" id="itemTrackerBack">Volver</button></div><div class="itemtrack-muted">Unidades por ítem · parciales acumulados y cierre final, sin sumar ambos.</div><div id="itemTrackerRoot" class="itemtrack-card">Consultando…</div></div>';
  app.appendChild(section);
  section.querySelector('#itemTrackerBack').addEventListener('click',()=>adminV2Open('home'));
 }
 itemTrackerMonthlyInstall(document.getElementById('p-item-tracker'));
}
function itemTrackerOpen(){
 itemTrackerInstall();const section=document.getElementById('p-item-tracker');if(!section)return;
 document.querySelectorAll('main > section').forEach(x=>x.classList.add('hide'));section.classList.remove('hide');
 document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));window.scrollTo(0,0);
 itemTrackerLoad(itemTrackerDay||'');
 if(!itemTrackerPoll)itemTrackerPoll=setInterval(()=>{
  const active=document.getElementById('p-item-tracker');
  if(active&&!active.classList.contains('hide')&&!document.hidden&&!itemTrackerBusy)itemTrackerLoad(itemTrackerDay)
 },60000);
}
async function itemTrackerLoad(day){
 if(itemTrackerBusy)return;
 itemTrackerBusy=true;const host=document.getElementById('itemTrackerRoot');
 if(host)host.innerHTML='<div class="itemtrack-muted">Consultando conteos por ítem…</div>';
 try{
  if(!TOKEN_OK.test(tok))throw Error('Ingresá con tu PIN para consultar.');
  const url=U+'/functions/v1/spanish-auditoria-item-partials'+(day?'?day='+encodeURIComponent(day):'');
  const response=await fetch(url,{method:'GET',headers:{apikey:K,'x-audit-session':tok}});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'Sin conexión con los parciales');
  itemTrackerData=data;itemTrackerDay=data.day;itemTrackerRender();
 }catch(error){if(host)host.innerHTML='<div class="itemtrack-warning">No se pudo consultar: '+costosEsc(error.message||String(error))+'</div>'}
 finally{itemTrackerBusy=false}
}
function itemTrackerRender(){
 const host=document.getElementById('itemTrackerRoot'),d=itemTrackerData;if(!host||!d)return;
 const fmt=n=>Number(n||0).toLocaleString('es-AR',{maximumFractionDigits:3});
 const stamp=s=>s?new Date(s).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'}):'sin registro';
 const stage=d.status==='FINAL'?'DEFINITIVO':d.status==='PARCIAL'?'PARCIAL':'SIN DATOS';
 const source=d.status==='FINAL'?'Cierre final del POS':d.status==='PARCIAL'?'Acumulado de pedidos cobrados':'Aún no llegó un parcial de esta jornada';
 let h='<div class="itemtrack-muted">Jornada operativa (06:00–05:59)</div>'+
  '<select id="itemTrackerSelect" aria-label="Jornada">'+(d.dates||[d.day]).map(x=>'<option value="'+costosEsc(x)+'" '+(x===d.day?'selected':'')+'>'+costosEsc(x)+'</option>').join('')+'</select>'+
  '<div style="margin:14px 0 6px"><b class="itemtrack-stamp">'+stage+'</b><div class="itemtrack-muted">'+source+'</div></div>'+
  '<div class="row between" style="margin:12px 0"><div><strong style="font-size:30px">'+fmt(d.units)+'</strong><div class="itemtrack-muted">unidades por ítem</div></div><button type="button" id="itemTrackerRefresh">Actualizar</button></div>'+
  '<div class="itemtrack-muted">'+fmt((d.items||[]).length)+' renglones de producto distintos · '+fmt(d.paid_orders)+' pedidos cobrados</div>'+
  '<div class="itemtrack-muted">Última recepción: '+stamp(d.received_at)+'</div>';
 if(d.status==='SIN_DATOS')h+='<p class="itemtrack-warning">No se dispone de un parcial de esta jornada. Esto no significa que se hayan vendido cero unidades.</p>';
 if(d.status==='PARCIAL')h+='<p class="itemtrack-warning">Provisorio hasta el cierre. Este total se reemplaza por el definitivo; nunca se suman los parciales.</p>';
 h+='<div style="margin-top:13px"><label class="itemtrack-muted" for="itemTrackerSearch">Buscar ítem</label><input id="itemTrackerSearch" type="search" placeholder="Gaseosa, hamburguesa, medialunas…" autocomplete="off"></div>'+
  '<div id="itemTrackerLines"></div>'+
  '<p class="itemtrack-muted">Los combos se muestran como fueron cobrados y no se descomponen sin receta confirmada. «Gaseosa» sigue genérica. Los IDs originales quedan preservados para auditar.</p>';
 if(d.status==='FINAL')h+='<div class="itemtrack-muted">Archivo definitivo: '+costosEsc(d.filename||'JSON de cierre')+'</div>';
 host.innerHTML=h;
 host.querySelector('#itemTrackerSelect').addEventListener('change',e=>{itemTrackerDay=e.target.value;itemTrackerLoad(itemTrackerDay)});
 host.querySelector('#itemTrackerRefresh').addEventListener('click',()=>itemTrackerLoad(itemTrackerDay));
 host.querySelector('#itemTrackerSearch').addEventListener('input',itemTrackerFilter);
 itemTrackerFilter();
}
function itemTrackerFilter(){
 const host=document.getElementById('itemTrackerLines'),query=String(document.getElementById('itemTrackerSearch')?.value||'').trim().toLocaleLowerCase('es-AR');
 if(!host||!itemTrackerData)return;
 const fmt=n=>Number(n||0).toLocaleString('es-AR',{maximumFractionDigits:3});
 const rows=(itemTrackerData.items||[]).filter(x=>String(x.name||'').toLocaleLowerCase('es-AR').includes(query));
 host.innerHTML=rows.length?rows.map(x=>'<div class="itemtrack-row"><div style="min-width:0"><b>'+costosEsc(x.name)+'</b>'+
   '<small>'+costosEsc(x.generic?'Genérico, sin asignar marca':x.combo?'Combo/variante original; desglose pendiente':'Código POS: '+(x.menu_item_id||'sin código'))+'</small></div><strong>'+fmt(x.quantity)+'</strong></div>').join(''):'<p class="itemtrack-muted">No hay ítems que coincidan con la búsqueda.</p>';
}


let itemTrackerMonthlyView=false,itemTrackerMonthlyData=null,itemTrackerMonthlyBusy=false;
function itemTrackerMonthlyInstall(section){
 if(section.querySelector('#itemTrackerMonthlyPanel'))return;
 const page=section.querySelector('.itemtrack-page'),daily=section.querySelector('#itemTrackerRoot');
 if(!page||!daily)return;
 const controls=document.createElement('div');
 controls.className='row';controls.style.cssText='gap:8px;flex-wrap:wrap;margin:12px 0';
 controls.innerHTML='<button type="button" id="itemTrackerDailyBtn" class="primary" style="min-height:44px;flex:1">Hoy / día</button>'+
   '<button type="button" id="itemTrackerMonthlyBtn" style="min-height:44px;flex:1">Mes / semana</button>';
 page.insertBefore(controls,daily);
 const box=document.createElement('div');
 box.id='itemTrackerMonthlyPanel';box.className='itemtrack-card';box.style.display='none';
 box.innerHTML='<h3 style="margin:0 0 10px">Reporte de productos vendidos</h3>'+
  '<div class="itemtrack-muted" style="margin-bottom:10px">Agrupado por mes, con semanas y cantidades exactas según los ítems registrados.</div>'+
  '<label for="monthlyItemsMonth">Mes</label><input type="month" id="monthlyItemsMonth" value="'+localISODate().slice(0,7)+'" style="width:100%;min-height:46px">'+
  '<label for="monthlyItemsWeek" style="margin-top:10px">Período dentro del mes</label><select id="monthlyItemsWeek" style="width:100%;min-height:46px"><option value="">Mes completo</option></select>'+
  '<div class="row" style="gap:8px;flex-wrap:wrap;margin:11px 0"><button type="button" id="monthlyItemsRefresh" class="primary" style="min-height:43px">Actualizar</button>'+
  '<button type="button" id="monthlyItemsDownload" style="min-height:43px" disabled>Exportar CSV</button></div>'+
  '<div id="monthlyItemsContent" role="status">Elegí el mes y consultá el reporte.</div>';
 daily.insertAdjacentElement('afterend',box);
 controls.querySelector('#itemTrackerDailyBtn').addEventListener('click',()=>itemTrackerMonthlyToggle(false));
 controls.querySelector('#itemTrackerMonthlyBtn').addEventListener('click',()=>itemTrackerMonthlyToggle(true));
 box.querySelector('#monthlyItemsMonth').addEventListener('change',()=>{box.querySelector('#monthlyItemsWeek').value='';itemTrackerMonthlyLoad()});
 box.querySelector('#monthlyItemsWeek').addEventListener('change',itemTrackerMonthlyLoad);
 box.querySelector('#monthlyItemsRefresh').addEventListener('click',itemTrackerMonthlyLoad);
 box.querySelector('#monthlyItemsDownload').addEventListener('click',itemTrackerMonthlyExport);
}
function itemTrackerMonthlyToggle(isMonthly){
 const section=document.getElementById('p-item-tracker');if(!section)return;
 itemTrackerMonthlyView=!!isMonthly;
 const daily=document.getElementById('itemTrackerRoot'),monthly=document.getElementById('itemTrackerMonthlyPanel');
 if(daily)daily.style.display=isMonthly?'none':'';
 if(monthly)monthly.style.display=isMonthly?'':'none';
 const a=document.getElementById('itemTrackerDailyBtn'),b=document.getElementById('itemTrackerMonthlyBtn');
 if(a)a.classList.toggle('primary',!isMonthly);if(b)b.classList.toggle('primary',!!isMonthly);
 if(isMonthly&&!itemTrackerMonthlyData&&!itemTrackerMonthlyBusy)itemTrackerMonthlyLoad();
}
async function itemTrackerMonthlyLoad(){
 if(itemTrackerMonthlyBusy)return;
 const month=document.getElementById('monthlyItemsMonth')?.value||localISODate().slice(0,7),
 week=document.getElementById('monthlyItemsWeek')?.value||'';
 const box=document.getElementById('monthlyItemsContent');if(!box)return;
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return A('Elegí un mes válido.');
 if(!TOKEN_OK.test(tok))return A('Ingresá con tu PIN de administrador.');
 itemTrackerMonthlyBusy=true;
 box.innerHTML='<div class="itemtrack-muted">Analizando cierres definitivos y últimos parciales, sin duplicar jornadas…</div>';
 const download=document.getElementById('monthlyItemsDownload');if(download)download.disabled=true;
 try{
  const params=new URLSearchParams({month});if(week)params.set('week',week);
  const response=await fetch(U+'/functions/v1/spanish-auditoria-monthly-items?'+params.toString(),{
   method:'GET',headers:{apikey:K,'x-audit-session':tok}
  });
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'No se pudo obtener el reporte');
  itemTrackerMonthlyData=data;itemTrackerMonthlyRender();
 }catch(e){itemTrackerMonthlyData=null;box.innerHTML='<div class="itemtrack-warning">No se pudo generar el reporte: '+costosEsc(e.message||String(e))+'</div>'}
 finally{itemTrackerMonthlyBusy=false}
}
function itemTrackerMonthlyRender(){
 const d=itemTrackerMonthlyData,host=document.getElementById('monthlyItemsContent');if(!d||!host)return;
 const fmt=v=>Number(v||0).toLocaleString('es-AR',{maximumFractionDigits:3});
 const weeks=document.getElementById('monthlyItemsWeek');
 if(weeks){weeks.innerHTML='<option value="">Mes completo</option>'+
   (d.weeks||[]).map(w=>'<option value="'+Number(w.id)+'" '+(d.selected_week===w.id?'selected':'')+'>Semana '+Number(w.id)+' · '+costosEsc(w.label)+'</option>').join('')}
 const download=document.getElementById('monthlyItemsDownload');if(download)download.disabled=!(d.items||[]).length;
 let html='<div class="calc" style="margin:12px 0"><div class="small muted">UNIDADES VENDIDAS REGISTRADAS</div>'+
  '<strong style="font-size:29px">'+fmt(d.totals.units)+'</strong>'+
  '<div class="small muted">'+fmt(d.totals.products)+' productos/variantes · '+fmt(d.totals.paid_orders)+' pedidos cobrados</div>'+
  '<div class="small muted">'+fmt(d.final_days)+' días definitivos · '+fmt(d.partial_days)+' provisionales</div></div>';
 if(d.partial_days)html+='<p class="itemtrack-warning">Incluye ventas provisionales del día en curso. Se reemplazarán al llegar el cierre final.</p>';
 if((d.missing_days||[]).length)html+='<p class="itemtrack-warning">Faltan registros de '+d.missing_days.length+' día(s): '+d.missing_days.map(x=>costosEsc(x.slice(8))).join(', ')+'. Los totales son del período registrado, no del mes completo.</p>';
 if(d.warning_days)html+='<p class="itemtrack-warning">'+fmt(d.warning_days)+' día(s) tienen advertencias de conciliación. Revisar la consistencia de los cierres.</p>';
 if(!d.days.length)html+='<p class="itemtrack-warning">No hay días registrados en ese período. Esto no significa ventas cero.</p>';
 html+='<label for="monthlyItemsSearch" style="display:block;margin-top:12px">Buscar producto</label>'+
  '<input type="search" id="monthlyItemsSearch" autocomplete="off" placeholder="Gaseosa, café, hamburguesa..." style="width:100%;min-height:43px">'+
  '<label for="monthlyItemsCategory" style="display:block;margin-top:9px">Categoría</label>'+
  '<select id="monthlyItemsCategory" style="width:100%;min-height:43px"><option value="">Todas</option>'+
  [...new Set((d.items||[]).map(x=>x.kind))].sort((a,b)=>a.localeCompare(b,'es')).map(k=>'<option value="'+costosEsc(k)+'">'+costosEsc(k)+'</option>').join('')+'</select>'+
  '<div id="monthlyItemsRows"></div>'+
  '<p class="itemtrack-muted" style="margin-top:14px">Los combos cuentan como el producto vendido. Las variantes diferentes se distinguen. Gaseosa sin marca continúa como genérica; no hay forma exacta de asignarla a Coca-Cola o Mirinda desde la caja.</p>';
 host.innerHTML=html;
 host.querySelector('#monthlyItemsSearch').addEventListener('input',itemTrackerMonthlyRows);
 host.querySelector('#monthlyItemsCategory').addEventListener('change',itemTrackerMonthlyRows);
 itemTrackerMonthlyRows();
}
function itemTrackerMonthlyRows(){
 const host=document.getElementById('monthlyItemsRows'),data=itemTrackerMonthlyData;if(!host||!data)return;
 const query=String(document.getElementById('monthlyItemsSearch')?.value||'').toLowerCase().trim();
 const kind=document.getElementById('monthlyItemsCategory')?.value||'';
 const fmt=v=>Number(v||0).toLocaleString('es-AR',{maximumFractionDigits:3});
 const rows=(data.items||[]).filter(x=>(!kind||x.kind===kind)&&(!query||String(x.name).toLowerCase().includes(query)));
 host.innerHTML='<div class="small muted" style="margin:10px 0">'+rows.length+' ítems en el listado</div>'+
  (rows.length?rows.map(x=>'<div class="itemtrack-row"><div style="min-width:0"><b>'+costosEsc(x.name)+'</b>'+
   '<small>'+costosEsc(x.kind)+' · '+(x.combo?'Combo/variante':x.generic?'Genérico':('POS '+(x.menu_item_id||'sin código')))+
   (Number(x.partial_quantity)>0?' · '+fmt(x.partial_quantity)+' provisional(es)':'')+'</small></div>'+
   '<strong>'+fmt(x.quantity)+'</strong></div>').join(''):'<p class="itemtrack-muted">Sin coincidencias.</p>');
}
function itemTrackerMonthlyExport(){
 const data=itemTrackerMonthlyData;if(!data?.items?.length)return A('Primero consultá un mes con ventas.');
 const escCSV=s=>{let text=String(s??'');if(/^[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'};
 const lines=[
  ['SPANISH · Ítems vendidos'],['Mes',data.month],['Semana',data.selected_week||'Mes completo'],
  ['Días definitivos',data.final_days],['Días provisionales',data.partial_days],
  ['Días sin datos',(data.missing_days||[]).join(', ')],['Unidades registradas',data.totals.units],[],
  ['Categoría','Producto / variante','Código POS','Unidades definitivas','Unidades provisionales','Unidades totales','Días con ventas'],
  ...(data.items||[]).map(x=>[x.kind,x.name,x.menu_item_id,x.final_quantity,x.partial_quantity,x.quantity,x.days]),
  [],['DETALLE POR DÍA'],['Fecha','Estado','Pedidos cobrados','Renglones','Unidades','Advertencias de conciliación'],
  ...(data.days||[]).map(x=>[x.day,x.status,x.paid_orders,x.item_lines,x.units,x.warning_count])
 ].map(row=>row.map(escCSV).join(';')).join('\r\n');
 const blob=new Blob(['\ufeff'+lines],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
 link.download='Spanish_Items_'+data.month+(data.selected_week?'_semana_'+data.selected_week:'')+'.csv';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function costosInstall(){
 if(FICHAJE_MODE)return;
 const app=document.getElementById('p-home')?.closest('main'),home=document.getElementById('p-home');if(!app||!home)return;
 if(!document.getElementById('costosStyles')){
  const style=document.createElement('style');style.id='costosStyles';
  style.textContent='.costos-page{max-width:900px;margin:0 auto;padding:14px 0 70px}.costos-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.costos-head h2{font-size:21px;margin:0}.costos-note{font-size:12px;color:#64748b;margin:6px 0 10px}.costos-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.costos-card{border:1px solid #d9e2e9;border-radius:12px;padding:12px;background:white}.costos-card strong{font-size:22px;display:block;margin-top:4px}.costos-panel{border:1px solid #dbe3e9;border-radius:14px;padding:14px;background:white;margin:12px 0}.costos-panel h3{margin:0 0 10px;font-size:16px}.costos-alert{background:#fff7ed;border:1px solid #fed7aa;border-radius:9px;padding:11px;color:#9a3412;font-size:12px;margin:10px 0}.costos-row{border-bottom:1px solid #e2e8f0;padding:9px 0;display:flex;gap:8px;justify-content:space-between;align-items:center}.costos-row:last-child{border:0}.costos-row small{display:block;color:#64748b}.costos-badge{font-size:12px;color:#475569}.costos-actions{display:flex;gap:8px;flex-wrap:wrap}.costos-actions button{min-height:42px}.costos-select{width:100%;min-height:44px}.costos-panel label{display:block;font-size:12px;color:#64748b;margin-top:11px}.costos-panel input,.costos-panel select{width:100%;min-height:42px}.costos-muted{color:#64748b;font-size:12px}.costos-red{color:#b45309}.costos-green{color:#15803d}';
  document.head.appendChild(style)
 }
 if(!document.getElementById('costosEntry')){
  const entry=document.createElement('div');entry.id='costosEntry';entry.className='card';
  entry.innerHTML='<div class="row between"><div><b>Consumo y precios</b><div class="small muted">Aumentos, precios vencidos, recetas y mercadería.</div></div><button type="button" class="primary" id="costosOpenBtn">Controlar →</button></div>';
  const compras=document.getElementById('comprasEntry');
  if(compras)compras.insertAdjacentElement('afterend',entry);else home.prepend(entry);
  entry.querySelector('button').addEventListener('click',costosOpen)
 }
 if(!document.getElementById('p-costos')){
  const section=document.createElement('section');section.id='p-costos';section.className='hide';
  section.innerHTML='<div class="costos-page"><div class="costos-head"><h2>Consumo y precios</h2><button type="button" data-costos="back">Volver</button></div><div class="costos-note">Control de compras y consumo teórico. Sin sumar operaciones ni modificar la caja.</div><div id="costosRoot" class="costos-panel">Consultando…</div></div>';
  app.appendChild(section);
  section.addEventListener('click',ev=>{
   const b=ev.target.closest('[data-costos]');if(!b)return;
   if(b.dataset.costos==='back')adminV2Open('home');
   else if(b.dataset.costos==='refresh')costosLoad();
   else if(b.dataset.costos==='save-price')costosSavePrice();
   else if(b.dataset.costos==='open-price')costosPriceForm(b.dataset.id);
   else if(b.dataset.costos==='open-recipe')costosRecipeForm(b.dataset.id);
   else if(b.dataset.costos==='open-remitos')spanishRemitosControlScreen();
   else if(b.dataset.costos==='open-pos')spanishImportsScreen();
  });
  section.addEventListener('input',ev=>{if(ev.target?.id==='costosSaleSearch')costosUpdateSoldList()});
  section.addEventListener('change',ev=>{
   if(ev.target?.id==='costosSupplier'){costosSupplier=ev.target.value;costosRender()}
   else if(ev.target?.id==='costosSaleDay'){costosSaleDay=ev.target.value;costosUpdateSoldList()}
  })
 }
 const compras=document.getElementById('p-compras');
 if(compras&&!compras.querySelector('[data-costos-launch]')){
  const link=document.createElement('button');link.type='button';link.className='primary';link.textContent='Controlar precios y consumo →';link.dataset.costosLaunch='1';link.style.margin='8px 0 14px';
  const head=compras.querySelector('.compras-head');if(head)head.insertAdjacentElement('afterend',link);
  link.addEventListener('click',costosOpen)
 }
}
function costosOpen(){
 costosInstall();const section=document.getElementById('p-costos');if(!section)return;
 document.querySelectorAll('main > section').forEach(x=>x.classList.add('hide'));section.classList.remove('hide');
 document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));window.scrollTo(0,0);
 if(!costosState)costosLoad();else costosRender()
}
async function costosFetch(action,x={}){
 if(!TOKEN_OK.test(tok))throw Error('Sesión vencida. Ingresá con tu PIN.');
 const r=await fetch(U+'/functions/v1/spanish-consumos-precios',{
  method:action?'POST':'GET',
  headers:{apikey:K,'x-audit-session':tok,...(action?{'content-type':'application/json'}:{})},
  ...(action?{body:JSON.stringify({action,...x})}:{})});
 const value=await r.json();if(!r.ok||!value.ok)throw Error(value.detail||value.error||'No se pudo completar');
 return value
}
async function costosLoad(){
 if(costosBusy)return;costosBusy=true;
 const root=document.getElementById('costosRoot');if(root)root.textContent='Actualizando precios y consumo…';
 try{costosState=await costosFetch();costosRender()}catch(e){if(root)root.innerHTML='<div class="costos-alert">No se pudo cargar el control: '+costosEsc(e.message)+'</div>'}
 finally{costosBusy=false}
}

function costosUpdateSoldList(){
 const node=document.getElementById('costosSoldList'),input=document.getElementById('costosSaleSearch');
 if(!node||!costosState)return;
 const day=(costosState.sales?.days||[]).find(x=>x.date===costosSaleDay);
 if(!day){node.innerHTML='<div class="costos-muted">Sin artículos para el día seleccionado.</div>';return}
 const filter=String(input?.value||'').toLocaleLowerCase('es-AR').trim();
 const products=(day.products||[]).filter(x=>String(x.name||'').toLocaleLowerCase('es-AR').includes(filter));
 const fmt=x=>Number(x||0).toLocaleString('es-AR',{maximumFractionDigits:3});
 node.innerHTML='<div class="costos-muted" style="margin:8px 0">'+fmt(products.reduce((a,x)=>a+Number(x.quantity||0),0))+' unidades en '+products.length+' productos'+(filter?' filtrados':'')+'. No incluye artículos anulados.</div>'+
  (products.length?products.map(x=>'<div class="costos-row"><div style="min-width:0"><b>'+costosEsc(x.name)+'</b></div><b>'+costosEsc(fmt(x.quantity))+' u.</b></div>').join(''):'<div class="costos-muted">Sin resultados para la búsqueda.</div>')
}

function costosRender(){
 if(!costosState)return;
 const host=document.getElementById('costosRoot');if(!host)return;
 const d=costosState,stat=d.prices?.summary||{},cons=d.consumption||{};
 const items=d.prices?.items||[],suppliers=[...new Map(items.map(x=>[x.supplier_id,x.supplier_name])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'es'));
 if(!costosSupplier||!suppliers.some(x=>x[0]===costosSupplier))costosSupplier=suppliers[0]?.[0]||'';
 const chosen=items.filter(x=>x.supplier_id===costosSupplier).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const cards=(label,v,small)=>'<div class="costos-card"><div class="costos-muted">'+costosEsc(label)+'</div><strong>'+costosEsc(v)+'</strong><div class="costos-muted">'+costosEsc(small)+'</div></div>';
 let html='<div class="costos-cards">'+cards('Precio confirmado',stat.confirmed||0,'Actualizado en últimos 30 días')+
  cards('Sin precio',stat.without_price||0,'Sin referencia válida')+
  cards('Revisar precio',(stat.reference||0)+(stat.stale||0),'Sin respaldo o antiguo')+
  cards('Ventas con alguna línea',cons.linked_products||0,'Puede incluir recetas parciales')+
  cards('Recetas aprobadas para costeo',d.recipe_status_summary?.approved||0,'CMV de referencia, con rango estimado')+
  cards('Con componentes aprobados',d.recipe_status_summary?.operational_approved_pos_ids||0,'Referencias del POS; receta parcial posible')+
  cards('Completas verificadas',d.recipe_status_summary?.verified_complete||0,'Revisión íntegra; sin activar stock automático')+
  cards('Borradores de receta',d.recipe_status_summary?.draft||0,'No descuentan stock')+'</div>';
 if(Number(d.recipe_status_summary?.draft||0)>0)html+='<div class="costos-alert">Las '+Number(d.recipe_status_summary.draft)+' fichas con cantidades parciales aún requieren ingredientes. La aprobación del costo orientativo no equivale a una receta exacta ni habilita descuento de stock.</div>';
 const estimate=d.estimated_cmv||{};
 if(Number(estimate.covered_product_types||0)>0){
  html+='<div class="costos-panel"><h3>CMV referencial con recetas aprobadas</h3>'+
   '<p class="costos-muted">Estimación sobre las ventas pagadas importadas del período (hasta 60 días), exclusivamente de productos con receta aprobada para costeo. No es el consumo físico ni incluye los productos sin ficha.</p>'+
   '<div class="costos-cards">'+cards('Productos cubiertos',estimate.covered_product_types||0,'De '+((estimate.covered_product_types||0)+(estimate.uncovered_product_types||0))+' tipos vendidos')+
   cards('Unidades cubiertas',estimate.covered_units||0,'Sin costear: '+(estimate.uncovered_units||0)+' unidades')+
   cards('Costo teórico mínimo',money(estimate.total_cost_low||0),'Total parcial de las ventas cubiertas')+
   cards('Costo teórico máximo',money(estimate.total_cost_high||0),'Total parcial de las ventas cubiertas')+'</div></div>';
 }
 html+='<div class="costos-panel"><h3>CMV sin falsa precisión</h3><p class="costos-muted">Papas, ensaladas, queso servido a ojo, aceite y salsas tienen consumo variable. No hay gramos reales por plato cuando nadie los pesa. Se usará consumo de referencia y banda de variación para proyectar; el CMV efectivamente consumido se calcula con existencias iniciales + compras - existencias finales, conciliando mermas, transferencias y uso no vendido. Si faltan conteos y pesos de bultos, se indicará ESTIMADO, nunca REAL.</p><p class="costos-muted"><b>Ejemplo papas:</b> 100 / 150 / 200 g son escenarios ilustrativos, no gramajes verificados ni límites del personal. Los promedios se ajustan por muestreos ocasionales y diferencias de inventario, no pesando cada plato.</p></div>';


 const bridge=d.integration_status||{};
 if(Object.keys(bridge).length){
  const lastPos=String(bridge.pos_snapshot_day||'sin datos');
  const lastJson=String(bridge.final_pos_json_day||'sin datos');
  const pending=bridge.remitos_items_pending_classification===null?'sin verificar':String(bridge.remitos_items_pending_classification);
  html+='<div class="costos-panel"><h3>Integración de sistemas · control de fuentes</h3>'+
   '<p class="costos-muted">Ventas POS y Remitos provienen de fuentes distintas; estas cifras solo controlan la sincronización. No crean ventas nuevas ni mueven stock.</p>'+
   '<div class="costos-cards">'+cards('Última captura POS',lastPos,'Datos parciales')+
   cards('Último JSON de cierre',lastJson,'Día operativo definitivo')+
   cards('Renglones Remitos pendientes',pending,'No computan en ventas/stock')+'</div>'+
   (bridge.snapshot_pending_final?'<div class="costos-alert">El POS tiene capturas posteriores al último cierre detallado. Verificar sincronización del JSON final antes de conciliar consumo.</div>':'')+
   '<div class="costos-actions"><button type="button" data-costos="open-pos">Revisar JSON del POS</button>'+
   '<button type="button" data-costos="open-remitos">Clasificar Remitos</button></div></div>';
 }
 const audit=Array.isArray(d.recipe_audit)?d.recipe_audit:[];
 const physical=d.stock_readiness||{};
 if(audit.length){
  const pending=audit.filter(x=>!x.recipe_approved&&!x.approved_for_estimated_cmv).length;
  const lackingPrice=audit.filter(x=>Number(x.priced_lines||0)<Number(x.ingredient_lines||0)).length;
  const variable=audit.filter(x=>(x.variable_portion_ingredients||[]).length).length;
  html+='<div class="costos-panel"><h3>Recetas POS · trazabilidad</h3>'+
   '<p class="costos-muted">Cada ficha está vinculada a su ID POS. Cotización de ingredientes y receta completa son validaciones distintas: una ficha parcial no es un CMV del plato.</p>'+
   '<div class="costos-cards">'+cards('Sin ninguna aprobación',pending,'Sin receta verificada ni costeo aprobado')+
    cards('Fichas sin precios completos',lackingPrice,'Incluye equivalencias no verificadas')+
    cards('Con porciones variables',variable,'Son referencias, no pesos reales')+'</div>';
  if(physical.physical_counts===0||physical.receipts===0)
   html+='<div class="costos-alert">CMV real NO disponible: '+Number(physical.physical_counts||0)+' conteos de inventario y '+Number(physical.receipts||0)+' recepciones. Las ventas y recetas sólo permiten consumo teórico, sujeto a diferencias, mermas y porciones variables.</div>';
  html+='<details><summary style="cursor:pointer;font-weight:700;padding:12px 0">Ver diagnóstico de las '+audit.length+' fichas vinculadas al POS</summary>'+
   '<p class="costos-muted">Ordenadas por unidades vendidas en el período. Costo de componentes identifica solamente materias primas documentadas; no es el costo final del plato. Nunca se descuenta stock desde esta vista.</p>'+
   audit.map(x=>{
    const state=x.complete_theoretical_cost?'Costo teórico documentado':x.recipe_approved?'Receta íntegra; faltan precios':x.approved_for_estimated_cmv?'Costeo referencial aprobado':'Borrador parcial';
    const missing=(x.missing_price_ingredients||[]).length?'Sin precio utilizable: '+(x.missing_price_ingredients||[]).join(', '):'';
    const uncertain=(x.presentation_unverified_ingredients||[]).length?' · Presentación dudosa: '+(x.presentation_unverified_ingredients||[]).join(', '):'';
    const variable=(x.variable_portion_ingredients||[]).length?' · Porción variable: '+(x.variable_portion_ingredients||[]).join(', '):'';
    const c=x.component_cost_documented_ars;
    return '<div class="costos-row"><div style="min-width:0;flex:1"><b>'+costosEsc(x.name)+' · ID '+costosEsc(x.pos_product_id)+'</b>'+
     '<small>'+costosEsc(state)+' · '+Number(x.priced_lines||0)+'/'+Number(x.ingredient_lines||0)+' insumos con costo utilizable · '+Number(x.sold_units||0).toLocaleString('es-AR')+' u. vendidas</small>'+
     ((missing||uncertain||variable)?'<small>'+costosEsc(missing+uncertain+variable)+'</small>':'')+
     '</div><div style="text-align:right"><b>'+(c===null?'Sin costo parcial':costosEsc(money(c))+'<small>Solo componentes</small>')+'</b></div></div>'
   }).join('')+'</details><div class="costos-actions"><button type="button" data-costos="open-recipe">Completar ficha técnica</button></div></div>';
 }
 const sales=d.sales||{},saleDays=sales.days||[];
 if(!costosSaleDay||!saleDays.some(x=>x.date===costosSaleDay))costosSaleDay=saleDays[0]?.date||'';
 const currentSaleDay=saleDays.find(x=>x.date===costosSaleDay),mailClose=sales.latest_close;
 const lastDetailDay=saleDays[0]?.date||'',todayOperational=localISODate();
 const daysWithoutDetail=lastDetailDay?Math.floor((Date.parse(todayOperational+'T12:00:00Z')-Date.parse(lastDetailDay+'T12:00:00Z'))/86400000):null;
 html+='<div class="costos-panel"><h3>Ventas por producto · unidades vendidas</h3>'+
 (daysWithoutDetail!==null&&daysWithoutDetail>1?'<div class="costos-alert">SINCRONIZACIÓN ATRASADA: los productos llegan solo hasta el '+costosEsc(lastDetailDay)+'. El último conteo no corresponde a la jornada actual.</div>':'')+
  '<p class="costos-muted">Pedidos pagados de Sistema Spanish, sin anulaciones. Cada pedido se cuenta una sola vez aunque se vuelva a importar.</p>';
 if(mailClose&&(!saleDays.length||String(mailClose.operational_date)>String(saleDays[0].date))){
  html+='<div class="costos-alert">El cierre del '+costosEsc(mailClose.operational_date)+' ya está en Caja, pero todavía falta su detalle de artículos. No se inventan unidades desde el correo.</div>';
 }
 if(!saleDays.length){
  html+='<div class="costos-alert">Sin ventas detalladas importadas.</div>';
 }else{
  html+='<div class="costos-cards">'+
   '<div class="costos-card"><div class="costos-muted">Productos distintos del día</div><strong>'+Number(currentSaleDay?.product_types||0).toLocaleString('es-AR')+'</strong></div>'+
   '<div class="costos-card"><div class="costos-muted">Unidades vendidas del día</div><strong>'+Number(currentSaleDay?.units||0).toLocaleString('es-AR',{maximumFractionDigits:3})+'</strong></div>'+
   '</div>';
  html+='<label>Día operativo con detalle</label><select id="costosSaleDay" class="costos-select">'+
   saleDays.map(x=>'<option value="'+costosEsc(x.date)+'" '+(x.date===costosSaleDay?'selected':'')+'>'+costosEsc(x.date)+'</option>').join('')+'</select>'+
   '<label>Buscar artículo</label><input type="search" id="costosSaleSearch" placeholder="Ej. hamburguesa, gaseosa, medialuna" autocomplete="off">'+
   '<div id="costosSoldList"></div>';
 }
 html+='</div>';

 html+='<div class="costos-panel"><h3>Alertas de compras</h3>';
 if(!(stat.alerts||[]).length)html+='<div class="costos-muted">No hay aumentos calculables todavía. Se compararán precios de igual presentación y base tributaria.</div>';
 for(const a of (stat.alerts||[]).slice(0,10))html+='<div class="costos-row"><div><b>'+costosEsc(a.product_name)+'</b><small>'+costosEsc(a.supplier_name)+'</small></div><b class="costos-red">+'+costosEsc(a.increase_pct)+'%</b></div>';
 if(stat.missing_package_size)html+='<div class="costos-alert">'+stat.missing_package_size+' presentaciones tienen peso o contenido sin confirmar: no se calcula su costo por unidad.</div>';
 if(stat.unusable_cost_units)html+='<p class="costos-muted">Presentaciones sin equivalencia utilizable para CMV: '+Number(stat.unusable_cost_units)+'. Aunque el precio del bulto esté documentado, no se divide por un peso inventado.</p>';
 html+='</div>';
 html+='<div class="costos-panel"><h3>Costos finales por proveedor</h3><p class="costos-muted">Siempre con IVA, impuestos y percepciones incluidos. Los valores prorrateados se identifican como referenciales. Un presupuesto no equivale a factura.</p>'+
  '<label>Proveedor</label><select class="costos-select" id="costosSupplier">'+suppliers.map(([id,name])=>'<option value="'+costosEsc(id)+'" '+(id===costosSupplier?'selected':'')+'>'+costosEsc(name)+'</option>').join('')+'</select>';
 for(const x of chosen){
  html+='<div class="costos-row"><div style="min-width:0"><b>'+costosEsc(x.name)+'</b>'+
   '<small>'+costosEsc(x.presentation)+'</small>'+
   '<small>'+costosEsc(costosStatus(x.price_status))+(x.price_allocation_method==='DOCUMENT_PRORATED'?' · Impuestos distribuidos proporcionalmente':x.price_allocation_method==='QUOTE_ONLY'?' · Presupuesto':'')+(x.price_checked_at?' · '+costosEsc(x.price_checked_at):'')+'</small></div>'+
   '<div style="text-align:right;min-width:96px"><b>'+(x.pack_price===null?'—':costosEsc(money(x.pack_price)))+'</b>'+
   '<br><button type="button" data-costos="open-price" data-id="'+costosEsc(x.id)+'">Registrar precio</button></div></div>'
 }
 html+='</div>';
 html+='<div class="costos-panel"><h3>Consumo según ventas</h3>';
 if(!cons.received_packages){
  html+='<div class="costos-alert">Todavía no llegan pedidos con detalle desde la PC principal. Las cantidades de consumo no están verificadas. La caja sigue intacta.</div>';
 }else{
  html+='<p class="costos-muted">Ventas importadas: '+Number(cons.received_packages)+' cierres · '+Number(cons.items_count||0)+' productos distintos.</p>';
  if((cons.unlinked_products||[]).length||(cons.products||[]).length)html+='<div class="costos-alert">'+cons.unlinked_products.length+' productos vendidos aún no tienen receta: no se calcula su CMV.</div>';
  html+=(cons.products||[]).slice(0,12).map(x=>'<div class="costos-row"><div><b>'+costosEsc(x.name)+'</b><small>'+Number(x.quantity).toLocaleString('es-AR')+' vendidos</small></div><b>'+(x.theoretical_cost_complete?costosEsc(money(x.theoretical_cost)):'CMV pendiente')+'</b></div>').join('');
  if((cons.unlinked_products||[]).length)html+='<div class="costos-actions"><button type="button" data-costos="open-recipe">Vincular producto a insumos →</button></div>';
 }
 html+='<p class="costos-muted">Faltantes, mermas, consumo interno y stock contado se controlarán por separado. Venta no equivale a consumo físico exacto.</p></div>';
 html+='<div class="costos-actions"><button type="button" data-costos="refresh">Actualizar control</button></div>';
 host.innerHTML=html;
 costosUpdateSoldList()
}
function costosPriceForm(id){
 const data=(costosState?.prices?.items||[]).find(x=>x.id===id);if(!data)return;
 const invoices=(costosState.invoices||[]).filter(x=>x.supplier_id===data.supplier_id);
 const options=invoices.map(x=>'<option value="'+costosEsc(x.id)+'">'+costosEsc(String(x.document_number||'S/N'))+' · '+costosEsc(x.movement_date)+(x.qr_verified?' · QR confirmado':'')+'</option>').join('');
 M('<h3>Precio: '+costosEsc(data.name)+'</h3><p class="small muted">'+costosEsc(data.supplier_name)+' · '+costosEsc(data.presentation)+'</p>'+
  '<label>Precio FINAL de esta presentación ($)</label><input id="costosPriceValue" type="number" min=".01" step=".01" inputmode="decimal" value="'+costosEsc(data.pack_price??'')+'">'+
  '<label>Criterio de costo</label><select id="costosPriceBasis"><option value="PRECIO_FINAL">Precio final, IVA y percepciones incluidos</option></select>'+
  '<label>Fecha del precio</label><input id="costosPriceDate" type="date" value="'+localISODate()+'">'+
  '<label>Tipo de comprobante</label><select id="costosEvidenceType" onchange="costosEvidenceChanged()"><option value="FACTURA">Factura registrada en Auditoría</option><option value="COTIZACION">Cotización (referencial)</option></select>'+
  '<div id="costosInvoiceWrap"><label>Factura a la que pertenece</label><select id="costosInvoiceId">'+
   '<option value="">Seleccionar factura</option>'+options+'</select></div>'+
  '<label>Referencia / nota</label><input id="costosPriceRef" maxlength="120" placeholder="Producto y detalle del comprobante">'+
  '<p class="small muted">No modifica ni cancela facturas. Para costos comparables seleccioná siempre la misma base tributaria.</p>'+
  '<button class="primary" style="width:100%;margin-top:14px" onclick="costosSavePrice(\''+costosEsc(id)+'\')">Guardar precio</button>');
 costosEvidenceChanged()
}
function costosEvidenceChanged(){
 const el=document.getElementById('costosInvoiceWrap');if(el)el.classList.toggle('hide',document.getElementById('costosEvidenceType')?.value==='COTIZACION')
}
async function costosSavePrice(id){
 const v=document.getElementById('costosPriceValue'),basis=document.getElementById('costosPriceBasis'),
 date=document.getElementById('costosPriceDate'),type=document.getElementById('costosEvidenceType'),
 inv=document.getElementById('costosInvoiceId'),ref=document.getElementById('costosPriceRef');
 if(!v||!basis||!date||!type)return;
 if(!(Number(v.value)>0))return A('Ingresá el precio real de la presentación.');
 if(type.value==='FACTURA'&&!inv?.value)return A('Elegí una factura registrada, o marcá el precio como cotización.');
 costosBusy=true;
 try{
  await costosFetch('record_price',{product_id:id,price:Number(v.value),date:date.value,basis:basis.value,
   evidence_type:type.value,invoice_id:type.value==='FACTURA'?inv.value:null,reference:ref.value});
  X();costosBusy=false;await costosLoad();A('Precio guardado con fecha y referencia. Los cambios quedan en el historial.')
 }catch(e){A('No se guardó: '+e.message)}finally{costosBusy=false}
}
function costosRecipeForm(){
 const d=costosState||{},soldItems=[...(d.consumption?.unlinked_products||[]),...(d.consumption?.products||[])].map(x=>({pos_product_id:String(x.pos_product_id),pos_product_name:x.pos_product_name||x.name})),draftItems=(d.recipes||[]).map(x=>({pos_product_id:String(x.pos_product_id),pos_product_name:x.pos_product_name||('Producto POS '+x.pos_product_id)})),items=[...new Map([...draftItems,...soldItems].filter(x=>x.pos_product_id&&x.pos_product_id!=='undefined').map(x=>[x.pos_product_id,x])).values()].sort((a,b)=>a.pos_product_name.localeCompare(b.pos_product_name,'es')),ingredients=d.ingredients||[];
 const unique=[...new Map(ingredients.map(x=>[x.id,{id:x.id,name:x.name,unit:x.unit}])).values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
 if(!items.length)return A('No hay productos importados pendientes de receta.');
 M('<h3>Vincular venta a insumo</h3><p class="small muted">Registrá cuánto insumo requiere una unidad vendida. Ejemplo: 250 gramos de milanesa = 0,250 kg.</p>'+
 '<label>Producto de la caja</label><select id="costosRecipePos">'+items.map(x=>'<option value="'+costosEsc(x.pos_product_id)+'">'+costosEsc(x.pos_product_name)+'</option>').join('')+'</select>'+
 '<label>Insumo</label><select id="costosRecipeIngredient">'+unique.map(x=>'<option value="'+costosEsc(x.id)+'">'+costosEsc(x.name)+' ('+costosEsc(x.unit)+')</option>').join('')+'</select>'+
 '<label>Cantidad de insumo por unidad vendida (unidad base)</label><input id="costosRecipeQty" type="number" min=".0001" step=".0001" placeholder="Ej. 0.250">'+
 '<button type="button" class="primary" style="width:100%;margin-top:14px" onclick="costosSaveRecipe()">Agregar insumo</button>'+
 '<button type="button" style="width:100%;margin-top:9px" onclick="costosReviewRecipe()">Confirmar receta completa</button>')
}
async function costosReviewRecipe(){
 const pos=document.getElementById('costosRecipePos')?.value;
 const links=(costosState?.recipes||[]).filter(x=>x.pos_product_id===pos);
 if(!pos||!links.length)return A('Primero cargá todos los insumos y cantidades.');
 if(!window.confirm('¿Ya incorporaste todos los insumos y gramajes del plato? El costo solo sera completo si tambien tiene precios netos confirmados.'))return;
 try{await costosFetch('review_recipe',{pos_product_id:pos,complete:true});X();await costosLoad();A('Receta confirmada.')}
 catch(e){A('No se pudo confirmar: '+e.message)}
}

async function costosSaveRecipe(){
 const pos=document.getElementById('costosRecipePos'),ingredient=document.getElementById('costosRecipeIngredient'),qty=document.getElementById('costosRecipeQty');
 if(!pos||!ingredient||!(Number(qty?.value)>0))return A('Completá producto, insumo y cantidad.');
 const info=[...(costosState.consumption?.unlinked_products||[]),...(costosState.consumption?.products||[])].find(x=>x.pos_product_id===pos.value);
 costosBusy=true;
 try{
  await costosFetch('save_recipe',{pos_product_id:pos.value,pos_product_name:info?.pos_product_name||'',ingredient_id:ingredient.value,quantity:Number(qty.value)});
  X();costosBusy=false;await costosLoad();A('Receta vinculada. Agregá los demás insumos del plato para tener el CMV completo.')
 }catch(e){A(e.message)}finally{costosBusy=false}
}


/* Inventario trazable v1 - solo administración. Mantiene el POS y cuentas corrientes intactos. */
let invState=null,invBusy=false,invTab='stock',invSupplier='',invSearch='',invKey='',invDocsFilter='PENDIENTES';
function invEsc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function invMoney(v){return '$ '+Number(v||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function invNum(v){return Number(v||0).toLocaleString('es-AR',{maximumFractionDigits:3})}
function invInstall(){
 if(FICHAJE_MODE)return;
 const home=document.getElementById('p-home'),app=home?.closest('main');if(!home||!app)return;
 if(!document.getElementById('invStyle')){
  const css=document.createElement('style');css.id='invStyle';
  css.textContent='.inv-area{max-width:1100px;margin:auto;padding:10px 0 65px}.inv-panel{background:#fff;border:1px solid #d8e1ea;border-radius:12px;padding:13px;margin:10px 0}.inv-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}.inv-actions button{min-height:42px}.inv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px}.inv-field label{display:block;font-size:12px;color:#526078;margin:6px 0}.inv-field input,.inv-field select,.inv-field textarea{width:100%;min-height:42px;max-width:100%}.inv-table{overflow-x:auto}.inv-table table{border-collapse:collapse;width:100%;font-size:12px}.inv-table td,.inv-table th{border-bottom:1px solid #e1e7ed;padding:9px;text-align:left;white-space:nowrap}.inv-line{display:grid;grid-template-columns:minmax(130px,2fr) 1fr 1fr auto;gap:6px;align-items:end;margin:8px 0}.inv-line select,.inv-line input{width:100%;min-height:40px}.inv-status{border-radius:5px;padding:3px 5px;font-size:11px;background:#f1f5f9}.inv-warn{color:#9a3412}.inv-good{color:#166534}.inv-hint{font-size:12px;color:#526078;line-height:1.5}@media(max-width:600px){.inv-line{grid-template-columns:1fr 1fr}.inv-line .inv-product{grid-column:span 2}}';
  document.head.appendChild(css)
 }
 if(!document.getElementById('invLaunch')){
  const entry=document.createElement('div');entry.id='invLaunch';entry.className='inv-panel';
  entry.innerHTML='<b>Control de mercadería</b><p class="inv-hint">Recepciones por artículo · conteos · mermas · alertas de reposición</p><button type="button" id="invOpenBtn">Abrir inventario trazable</button>';
  home.prepend(entry);
  entry.querySelector('button').addEventListener('click',invOpen)
 }
 if(!document.getElementById('p-inventario')){
  const page=document.createElement('section');page.id='p-inventario';page.className='hide';
  page.innerHTML='<div class="inv-area"><div class="row between"><h2>Inventario de Spanish</h2><button type="button" id="invBack">Volver</button></div><div class="inv-actions" id="invTabs"></div><div id="invRoot" class="inv-panel">Cargando…</div></div>';
  app.appendChild(page);
  page.querySelector('#invBack').addEventListener('click',()=>go('home',document.querySelector('#nav button')||document.createElement('button')));
  page.addEventListener('click',invClick);
  page.addEventListener('change',e=>{
   if(e.target?.id==='invSupplier'){invSupplier=e.target.value;invRender();return}
   if(e.target?.id==='invExistingDoc'){
    invApplyDocument((invState?.documents||[]).find(x=>x.id===e.target.value));
   }
  });
  page.addEventListener('input',e=>{if(e.target?.id==='invSearch'){invSearch=e.target.value;invFilter()}else if(e.target?.classList?.contains('inv-qty')||e.target?.classList?.contains('inv-cost'))invLineTotal()})
 }
}
async function invOpen(){
 invInstall();
 document.querySelectorAll('main > section').forEach(s=>s.classList.add('hide'));
 document.getElementById('p-inventario')?.classList.remove('hide');
 document.querySelectorAll('#nav button').forEach(b=>b.classList.remove('active'));
 window.scrollTo(0,0);
 return await invLoad()
}
async function invOpenInvoice(supplierId,invoiceId){
 invSupplier=supplierId;invTab='receive';
 const ok=await invOpen();
 if(!ok){A('La boleta está guardada en proveedores. No se pudo cargar el detalle de mercadería todavía.');return}
 const doc=(invState.documents||[]).find(x=>x.id===invoiceId);
 if(!doc){A('Boleta guardada, pero no apareció entre las facturas pendientes. Podés buscarla desde Inventario.');return}
 invApplyDocument(doc)
}
async function invLoad(){
 if(invBusy)return false;invBusy=true;
 const root=document.getElementById('invRoot');if(root)root.innerHTML='Consultando movimientos de inventario…';
 try{
  invState=await comprasApi('stock_snapshot');
  if(!invState.suppliers.some(s=>s.id===invSupplier))invSupplier=invState.suppliers[0]?.id||'';
  invRender();return true
 }catch(e){if(root)root.innerHTML='<div class="inv-warn">No se pudo cargar inventario: '+invEsc(e.message)+'</div>';return false}
 finally{invBusy=false}
}
function invTabs(){
 const bar=document.getElementById('invTabs');if(!bar)return;
 const tabs=[['stock','Existencias'],['docs','Facturas sin artículos'],['receive','Recibir mercadería'],['count','Conteo físico'],['adjust','Mermas y ajustes'],['history','Historial']];
 bar.innerHTML=tabs.map(([key,label])=>'<button type="button" data-inv-tab="'+key+'" '+(key===invTab?'class="primary"':'')+'>'+label+'</button>').join('')
}
function invSelectIngredients(chosen=''){
 return (invState?.ingredients||[]).map(i=>'<option value="'+invEsc(i.id)+'" '+(i.id===chosen?'selected':'')+'>'+invEsc(i.name)+' ('+invEsc(i.unit)+')</option>').join('')
}
function invFilter(){
 const q=invSearch.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 document.querySelectorAll('#invRoot tr[data-inv-name]').forEach(tr=>{tr.style.display=tr.dataset.invName.includes(q)?'':'none'})
}
function invRender(){
 invTabs();
 const root=document.getElementById('invRoot');if(!root||!invState)return;
 const d=invState.diagnostics||{},items=invState.ingredients||[];
 if(invTab==='stock'){
  const without=items.filter(x=>x.stock===null).length;
  const alerts=items.filter(x=>x.stock!==null&&x.target_stock_quantity!==null&&Number(x.stock)<=Number(x.target_stock_quantity)).length;
  root.innerHTML='<h3>Existencias y reposición</h3><div class="inv-grid"><div>Insumos <b>'+items.length+'</b></div><div>Sin conteo <b class="inv-warn">'+without+'</b></div><div>Recetas revisadas <b>'+Number(d.recipe_count||0)+'</b></div><div>Bajo mínimo <b class="inv-warn">'+alerts+'</b></div><div>Boletas para clasificar o detallar <b class="inv-warn">'+Number(d.invoices_need_review||0)+'</b></div></div>'+
   '<p class="inv-hint">Última captura POS: '+invEsc(d.latest_snapshot||'sin datos')+' · Último JSON final: '+invEsc(d.latest_json||'sin datos')+' · Detalle vendido cubierto por recetas: '+Number(d.sales_covered||0)+'/'+Number(d.sales_rows||0)+' líneas. El saldo es TEÓRICO; no certifica diferencias físicas y excluye ventas del mismo día del conteo.</p>'+
   '<div class="inv-actions"><button type="button" data-inv-tab="docs">Revisar '+Number(d.invoices_need_review||0)+' boletas sin resolver</button></div>'+
   '<div class="inv-field"><label>Buscar mercadería</label><input id="invSearch" placeholder="Escribí queso, cerveza, carne…" value="'+invEsc(invSearch)+'"></div>'+
   '<div class="inv-table"><table><thead><tr><th>Insumo</th><th>Stock estimado</th><th>Mínimo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>'+
   items.map(i=>{
    const warn=i.stock!==null&&i.target_stock_quantity!==null&&Number(i.stock)<=Number(i.target_stock_quantity);
    const status=i.stock===null?'SIN CONTEO':warn?'REPOSICIÓN':i.status==='ESTIMADO'?'ESTIMADO':i.status;
    const normalized=String(i.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return '<tr data-inv-name="'+invEsc(normalized)+'"><td><b>'+invEsc(i.name)+'</b><small> '+invEsc(i.unit)+'</small></td><td>'+(i.stock===null?'—':invNum(i.stock))+'</td><td>'+(i.target_stock_quantity==null?'—':invNum(i.target_stock_quantity))+'</td><td><span class="inv-status '+(warn?'inv-warn':'')+'">'+invEsc(status)+'</span></td><td><button type="button" data-inv-count="'+invEsc(i.id)+'">Contar</button> <button type="button" data-inv-target="'+invEsc(i.id)+'">Mín.</button></td></tr>'
   }).join('')+'</tbody></table></div>';
  invFilter();return
 }
 if(invTab==='docs'){
  const records=invState.documents||[],open=records.filter(x=>!['SERVICIO','GASTO'].includes(x.review_classification));
  const shown=invDocsFilter==='TODAS'?records:open;
  root.innerHTML='<h3>Boletas pendientes de clasificación o artículos</h3>'+
   '<p class="inv-hint">Estas facturas ya existen en Proveedores. Clasificá su naturaleza antes de ingresar stock. Servicio o gasto NO crea ingreso de mercadería ni elimina la deuda.</p>'+
   '<div class="inv-grid"><div>Por clasificar o detallar <b>'+open.length+'</b></div><div>Servicios/gastos clasificados <b>'+(records.length-open.length)+'</b></div>'+
   '<div>QR fiscal <b>'+records.filter(x=>x.qr_verified).length+'</b></div></div>'+
   '<div class="inv-actions"><button type="button" data-inv-docs="PENDIENTES" '+(invDocsFilter==='PENDIENTES'?'class="primary"':'')+'>Pendientes</button>'+
   '<button type="button" data-inv-docs="TODAS" '+(invDocsFilter==='TODAS'?'class="primary"':'')+'>Todas</button></div>'+
   '<div class="inv-table"><table><thead><tr><th>Fecha</th><th>Proveedor</th><th>Factura</th><th>Importe</th><th>Tipo</th><th>Acción</th></tr></thead><tbody>'+
   shown.map(d=>'<tr><td>'+invEsc(d.movement_date)+'</td><td>'+invEsc(invState.suppliers.find(x=>x.id===d.supplier_id)?.name||'Proveedor')+'</td>'+
   '<td>'+invEsc(d.document_number||'Sin número')+(d.qr_verified?' · QR':'')+'</td><td>'+invMoney(d.amount)+'</td>'+
   '<td><select data-inv-classification="'+invEsc(d.id)+'" aria-label="Tipo de factura">'+
   [['REVISAR','Revisar'],['MERCADERIA','Mercadería'],['SERVICIO','Servicio'],['GASTO','Gasto']].map(([value,title])=>
    '<option value="'+value+'" '+(d.review_classification===value||(value==='REVISAR'&&d.review_classification==='SIN_CLASIFICAR')?'selected':'')+'>'+title+'</option>').join('')+
   '</select></td><td><div class="inv-actions"><button type="button" data-inv-review-save="'+invEsc(d.id)+'">Guardar</button>'+
   '<button type="button" data-inv-document="'+invEsc(d.id)+'">Artículos</button>'+ '<button type="button" onclick="supplierInvoiceCreditForm(\''+invEsc(d.id)+'\')">NC / faltante</button></div></td></tr>').join('')+
   '</tbody></table></div><p class="inv-hint">Los cambios de clasificación guardan fecha y responsable. Los comprobantes originales no se modifican.</p>';return
 }
 if(invTab==='receive'){
  const options=(invState.suppliers||[]).map(s=>'<option value="'+invEsc(s.id)+'" '+(s.id===invSupplier?'selected':'')+'>'+invEsc(s.name)+'</option>').join('');
  const linked=new Set((invState.receipts||[]).map(r=>r.supplier_movement_id).filter(Boolean));
  const documentOptions=(invState.documents||[]).filter(d=>d.supplier_id===invSupplier&&!linked.has(d.id))
   .map(d=>'<option value="'+invEsc(d.id)+'">'+invEsc(d.movement_date)+' · '+invEsc(d.document_number||'Sin número')+' · '+invMoney(d.amount)+(d.qr_verified?' · QR':'')+'</option>').join('');
  root.innerHTML='<h3>Recepción por artículo</h3><p class="inv-hint">Esta carga NO crea otra factura ni otro pago. El QR fiscal identifica el comprobante, pero NO incluye las cantidades ni el costo unitario: esos datos deben anotarse desde la boleta o el remito.</p>'+
   '<div class="inv-field"><label>Boleta ya cargada en Proveedores (sin duplicar)</label><select id="invExistingDoc"><option value="">Registrar nueva factura y recepción juntas</option>'+documentOptions+'</select></div>'+
 '<p class="inv-hint">Una sola carga: deuda + inventario + precio de compra. Si la factura ya existe en Proveedores, seleccionála para no duplicar.</p>'+
 '<label class="inv-hint"><input id="invCreateInvoice" type="checkbox" checked style="width:auto"> Registrar factura en deuda de proveedores cuando todavía no existe</label>'+
   '<div class="inv-grid"><div class="inv-field"><label>Proveedor</label><select id="invSupplier">'+options+'</select></div><div class="inv-field"><label>Tipo de comprobante</label><select id="invDocType"><option value="FACTURA">Factura</option><option value="REMITO">Remito</option><option value="TICKET">Ticket</option><option value="SIN_COMPROBANTE">Sin comprobante / WhatsApp</option></select></div><div class="inv-field"><label>Número de comprobante</label><input id="invDocNo" placeholder="0001-00001234"></div><div class="inv-field"><label>Fecha del comprobante</label><input id="invDocDate" type="date" value="'+localISODate()+'"></div><div class="inv-field"><label>Total comprobante IVA incluido ($)</label><input id="invDocTotal" type="number" min="0" step=".01" placeholder="Opcional"></div><div class="inv-field"><label>Fuente</label><select id="invSource"><option value="MANUAL">Boleta / ingreso manual</option><option value="WHATSAPP">Pedido WhatsApp</option><option value="FACTURA_QR">Factura fiscal QR</option><option value="REMITO">Remito</option><option value="OTRO">Otro</option></select></div></div>'+
   '<h4>Mercadería efectivamente recibida</h4><div id="invLines"></div><div class="inv-actions"><button type="button" data-inv-action="add-line">Agregar artículo</button></div>'+
   '<div><b>Ítems registrados: <span id="invLinesSum">$ 0,00</span></b></div>'+
   '<label class="inv-hint"><input id="invPartial" type="checkbox" style="width:auto"> La factura incluye otros conceptos que aún no están detallados (registro PARCIAL)</label>'+
   '<div class="inv-field"><label>Vencimiento de factura (opcional)</label><input id="invDueDate" type="date"></div>'+
 '<div class="inv-field"><label>Observaciones</label><textarea id="invNotes" rows="2" placeholder="Diferencias, faltantes, referencia del pedido…"></textarea></div>'+
   '<div class="inv-actions"><button class="primary" type="button" data-inv-action="save-receipt">Confirmar recepción y actualizar stock</button></div>';
  invLineAdd();return
 }
 if(invTab==='count'){
  root.innerHTML='<h3>Conteo físico inicial o control</h3><p class="inv-hint">Cada insumo necesita un conteo real para establecer un saldo inicial. El conteo guarda fecha, usuario y cantidad sin borrar el historial. Las ventas del día del conteo quedan fuera de la proyección hasta que podamos separar su hora.</p>'+
   '<div class="inv-field"><label>Insumo</label><select id="invCountItem">'+invSelectIngredients()+'</select></div>'+
   '<div class="inv-field"><label>Cantidad contada (unidad base)</label><input id="invCountQty" type="number" min="0" step=".001" placeholder="0"></div>'+
   '<div class="inv-field"><label>Observación</label><input id="invCountNote" placeholder="Ej.: depósito + heladeras"></div>'+
   '<div class="inv-actions"><button class="primary" type="button" data-inv-action="save-count">Guardar conteo</button></div>';return
 }
 if(invTab==='adjust'){
  root.innerHTML='<h3>Mermas, consumos internos y diferencias</h3><p class="inv-hint">Los ajustes son registros separados. Nunca se borran ventas o compras históricas para forzar el stock.</p>'+
   '<div class="inv-grid"><div class="inv-field"><label>Insumo</label><select id="invAdjustItem">'+invSelectIngredients()+'</select></div><div class="inv-field"><label>Movimiento</label><select id="invAdjustType"><option value="MERMA">Merma / vencimiento</option><option value="CONSUMO_INTERNO">Consumo interno</option><option value="AJUSTE_NEGATIVO">Diferencia negativa investigada</option><option value="AJUSTE_POSITIVO">Diferencia positiva investigada</option></select></div><div class="inv-field"><label>Cantidad</label><input id="invAdjustQty" type="number" min="0" step=".001"></div></div>'+
   '<div class="inv-field"><label>Motivo obligatorio</label><textarea id="invAdjustNote" rows="2" placeholder="Detallá la causa, persona y comprobante si corresponde"></textarea></div>'+
   '<div class="inv-actions"><button class="primary" type="button" data-inv-action="save-adjust">Registrar movimiento</button></div>';return
 }
 if(invTab==='history'){
  root.innerHTML='<h3>Recepciones registradas</h3><p class="inv-hint">Registro de movimientos de inventario; NO duplica facturas contables ni pagos de proveedores.</p>'+
   '<h4>Conteos y diferencias preliminares</h4><div class="inv-table"><table><thead><tr><th>Fecha</th><th>Insumo</th><th>Teórico anterior</th><th>Físico contado</th><th>Diferencia</th><th>Estado</th></tr></thead><tbody>'+
   (invState.recent_counts||[]).map(c=>'<tr><td>'+invEsc(c.operational_day)+'</td><td>'+invEsc(invState.ingredients.find(i=>i.id===c.ingredient_id)?.name||'Insumo')+'</td><td>'+(c.expected_quantity==null?'—':invNum(c.expected_quantity))+'</td><td>'+invNum(c.counted_quantity)+'</td><td>'+(c.difference_quantity==null?'—':invNum(c.difference_quantity))+'</td><td>'+invEsc(c.reconciliation_status)+'</td></tr>').join('')+
   '</tbody></table></div><h4>Facturas y recepciones</h4>'+
   '<div class="inv-table"><table><thead><tr><th>Fecha</th><th>Proveedor</th><th>Documento</th><th>Ítems</th><th>Total fiscal</th><th>Carga parcial</th></tr></thead><tbody>'+
   (invState.receipts||[]).map(r=>'<tr><td>'+invEsc(r.received_date)+'</td><td>'+invEsc(invState.suppliers.find(s=>s.id===r.supplier_id)?.name||'Proveedor')+'</td><td>'+invEsc(r.document_type)+' '+invEsc(r.document_number||'')+'</td><td>'+invMoney(r.lines_total)+'</td><td>'+(r.document_total==null?'—':invMoney(r.document_total))+'</td><td>'+(r.partial_document?'SÍ':'NO')+'</td></tr>').join('')+
   '</tbody></table></div>';return
 }
}
function invLineAdd(){
 const wrap=document.getElementById('invLines');if(!wrap)return;
 const div=document.createElement('div');div.className='inv-line';
 div.innerHTML='<div class="inv-product inv-field"><label>Insumo (unidad base)</label><select class="inv-ingredient">'+invSelectIngredients()+'</select></div>'+
 '<div class="inv-field"><label>Cantidad</label><input class="inv-qty" type="number" min="0" step=".001" placeholder="0"></div>'+
 '<div class="inv-field"><label>Costo por unidad IVA incluido</label><input class="inv-cost" type="number" min="0" step=".01" placeholder="$"></div>'+
 '<div class="inv-field"><label title="Actualiza historial de costos desde esta factura; solo si la presentación es verificable."><input type="checkbox" class="inv-update-price" style="width:auto"> Actualizar precio</label><button type="button" data-inv-action="remove-line" title="Quitar">×</button></div>';
 wrap.appendChild(div);invLineTotal()
}
function invLineTotal(){
 let sum=0;document.querySelectorAll('#invLines .inv-line').forEach(line=>{sum+=Number(line.querySelector('.inv-qty')?.value||0)*Number(line.querySelector('.inv-cost')?.value||0)});
 const el=document.getElementById('invLinesSum');if(el)el.textContent=invMoney(sum)
}
function invApplyDocument(d){
  if(!d)return;
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??''};
  set('invExistingDoc',d.id);
  set('invDocType','FACTURA');
  set('invDocNo',d.document_number||'');
  set('invDocDate',d.movement_date||'');
  set('invDocTotal',d.amount??'');
  set('invSource',d.qr_verified?'FACTURA_QR':'MANUAL');
 }
function invClick(ev){
 const b=ev.target.closest('button');if(!b)return;
 if(b.dataset.invDocs){invDocsFilter=b.dataset.invDocs;invRender();return}
 if(b.dataset.invReviewSave){
   if(invBusy)return;
   const id=b.dataset.invReviewSave;
   const classification=document.querySelector('#invRoot select[data-inv-classification="'+id+'"]')?.value;
   if(!classification)return A('Elegí el tipo de comprobante.');
   if(!confirm('¿Confirmar '+classification+' para esta factura? El cambio conserva historial.'))return;
   invSend('invoice_classify',{invoice_id:id,classification,notes:''});return
 }
 if(b.dataset.invDocument){
  const d=(invState.documents||[]).find(x=>x.id===b.dataset.invDocument);
  if(!d)return;
  invSupplier=d.supplier_id;invTab='receive';invRender();invApplyDocument(d);return
 }
 if(b.dataset.invTab){invTab=b.dataset.invTab;invRender();return}
 if(b.dataset.invCount){invTab='count';invRender();document.getElementById('invCountItem').value=b.dataset.invCount;return}
 if(b.dataset.invTarget){
  const item=invState?.ingredients?.find(i=>i.id===b.dataset.invTarget);
  if(!item)return;
  const x=prompt('Stock mínimo / objetivo de '+item.name+' ('+item.unit+'). Ingresá cantidad:',item.target_stock_quantity??'');
  if(x!==null)invSend('stock_target',{ingredient_id:item.id,target:x});return
 }
 if(b.dataset.invAction==='add-line'){invLineAdd();return}
 if(b.dataset.invAction==='remove-line'){b.closest('.inv-line')?.remove();invLineTotal();return}
 if(b.dataset.invAction==='save-count'){
  const item=document.getElementById('invCountItem'),v=document.getElementById('invCountQty'),n=document.getElementById('invCountNote');
  if(!v.value.trim()||Number(v.value)<0||!Number.isFinite(Number(v.value)))return A('Cargá una cantidad válida.');
  if(!confirm('¿Confirmás un conteo REAL de '+item.options[item.selectedIndex].text+' = '+v.value+'?'))return;
  invSend('stock_count',{ingredient_id:item.value,quantity:v.value,notes:n.value});return
 }
 if(b.dataset.invAction==='save-adjust'){
  const item=document.getElementById('invAdjustItem'),type=document.getElementById('invAdjustType'),v=document.getElementById('invAdjustQty'),note=document.getElementById('invAdjustNote');
  if(!v.value||Number(v.value)<=0||note.value.trim().length<3)return A('Falta cantidad positiva y motivo.');
  if(!confirm('¿Confirmás el ajuste? Quedará en el historial.'))return;
  invSend('stock_adjust',{ingredient_id:item.value,quantity:v.value,movement_type:type.value,notes:note.value});return
 }
 if(b.dataset.invAction==='save-receipt'){
  const lines=[...document.querySelectorAll('#invLines .inv-line')].map(row=>{
   const ingredient_id=row.querySelector('.inv-ingredient').value;
   const product=(invState.products||[]).find(p=>p.supplier_id===invSupplier&&p.ingredient_id===ingredient_id);
   return {ingredient_id,supplier_product_id:product?.id||null,quantity:Number(row.querySelector('.inv-qty').value),unit_cost_final:Number(row.querySelector('.inv-cost').value),update_unit_price:!!row.querySelector('.inv-update-price')?.checked}
  });
  if(lines.length===0||lines.some(r=>!Number.isFinite(r.quantity)||r.quantity<=0||!Number.isFinite(r.unit_cost_final)||r.unit_cost_final<0))return A('Completá artículos, cantidades y costos unitarios.');
  const type=document.getElementById('invDocType').value,num=document.getElementById('invDocNo').value.trim();
  if(type!=='SIN_COMPROBANTE'&&!num)return A('Ingresá número de factura/remito; si no hay, seleccioná Sin comprobante.');
  const doc=document.getElementById('invDocTotal').value;
  const total=lines.reduce((s,r)=>s+Math.round(r.quantity*r.unit_cost_final*100)/100,0);
  const partial=document.getElementById('invPartial').checked;
  if(doc&&!partial&&Math.abs(total-Number(doc))>.02)return A('La suma de artículos '+invMoney(total)+' no coincide con la boleta '+invMoney(doc)+'. Completá artículos o marcá detalle parcial.');
  const existing=document.getElementById('invExistingDoc')?.value||null;
  const invoiceMode=type==='FACTURA'||type==='TICKET';
  if(invoiceMode){
    if(!num||!doc||Number(doc)<=0||!document.getElementById('invDocDate').value)
      return A('Para registrar la factura y sus artículos necesitás número, fecha y total fiscal.');
    if(!existing&&!document.getElementById('invCreateInvoice').checked)
      return A('Seleccioná la factura ya registrada o habilitá la creación de la nueva deuda.');
    if(partial&&lines.some(x=>x.update_unit_price))
      return A('Para actualizar precios de una factura, completá todos los artículos o desmarcá actualizar precio.');
    if(!confirm('¿Registrar '+lines.length+' artículo(s) y '+(existing?'VINCULAR la factura ya existente':'CREAR la factura y deuda')+' en una sola operación?'))return;
    invSend('invoice_receipt',{supplier_id:invSupplier,existing_invoice_id:existing,
      create_invoice:!existing&&document.getElementById('invCreateInvoice').checked,
      document_type:type,document_number:num,document_date:document.getElementById('invDocDate').value,
      due_date:document.getElementById('invDueDate').value||null,document_total:Number(doc),
      partial_document:partial,source_kind:document.getElementById('invSource').value,
      notes:document.getElementById('invNotes').value,lines});return
  }
  if(!confirm('¿Registrar la recepción sin nueva deuda contable?'))return;
  invSend('stock_receipt',{supplier_id:invSupplier,document_type:type,document_number:num||null,
   document_date:document.getElementById('invDocDate').value||null,document_total:doc?Number(doc):null,
   partial_document:partial,source_kind:document.getElementById('invSource').value,
   notes:document.getElementById('invNotes').value,lines});return
 }
}
async function invSend(action,payload){
 if(invBusy)return;if(!invKey)invKey=crypto.randomUUID();invBusy=true;
 try{
  await comprasApi(action,{...payload,request_key:invKey});
  invKey='';invBusy=false;
  const verified=await invLoad();
  controlLoad(true);
  A(verified?(action==='invoice_classify'?'Clasificación guardada y lista actualizada.':'Movimiento guardado y actualizado en inventario.'):'El servidor confirmó el guardado, pero no pude actualizar la pantalla. No repitas la operación; volvé a abrir inventario.')
 }catch(e){invBusy=false;A('No se pudo registrar: '+e.message)}
}


/* Ajustes de facturas existentes: trazabilidad contable sin duplicar compras ni modificar el total fiscal. */
function supplierInvoiceActiveCredits(invoiceId){
 return supplierInvoiceCredits.filter(l=>l.invoice_id===invoiceId&&!l.reversed_by_movement_id).reduce((sum,l)=>{
  const row=mov.find(x=>x.id===l.credit_movement_id);
  return sum+Number(row?.amount||0);
 },0)
}

function supplierCreditChooser(){
 const list=sups.filter(s=>s.active&&mov.some(x=>x.supplier_id===s.id&&x.movement_type==='FACTURA'));
 if(!list.length)return A('No hay proveedores con facturas registradas.');
 M('<h3>Nota de crédito o faltante</h3>'+
 '<p class="small muted">Elegí el proveedor.</p>'+
 '<label>Proveedor</label><select id="creditSupplierChoice">'+
 list.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('')+'</select>'+
 '<button type="button" class="primary" style="width:100%;margin-top:14px" onclick="supplierCreditChooserNext()">Elegir factura</button>');
}
function supplierCreditChooserNext(){
 const id=document.getElementById('creditSupplierChoice')?.value||'';
 if(!id)return A('Elegí un proveedor.');
 supplierInvoiceCreditPicker(id)
}
function supplierInvoiceCreditPicker(supplierId){
 const supplier=sups.find(s=>s.id===supplierId);
 if(!supplier)return A('Proveedor no encontrado.');
 const invoices=mov.filter(x=>x.supplier_id===supplierId&&x.movement_type==='FACTURA').slice()
  .sort((a,b)=>String(b.movement_date||'').localeCompare(String(a.movement_date||'')));
 M('<div class="row between"><h3>Notas de crédito y faltantes · '+esc(supplier.name)+'</h3>'+
  '<button type="button" onclick="supplierDetail(\''+supplierId+'\')">← Cuenta</button></div>'+
  '<p class="small muted">Elegí la factura.</p>'+
  (invoices.length?'<div class="table"><table><tr><th>Factura</th><th>Importe</th><th>Acción</th></tr>'+
   invoices.map(x=>'<tr><td>'+esc(x.document_number||'S/N')+'<div class="small muted">'+fmt(x.movement_date)+'</div></td>'+
    '<td>'+money(x.amount)+'<div class="small muted">NC / descuentos activos: '+money(supplierInvoiceActiveCredits(x.id))+'</div></td>'+
    '<td><button type="button" onclick="supplierInvoiceCreditForm(\''+x.id+'\')">NC / faltante</button></td></tr>').join('')+
   '</table></div>':'<div class="empty">Este proveedor no tiene boletas cargadas.</div>')
 )
}
function supplierInvoiceCreditTypeChanged(){
 const mode=document.getElementById('sicKind')?.value||'';
 const label=document.getElementById('sicDocLabel');
 const doc=document.getElementById('sicDoc');
 const warning=document.getElementById('sicTaxInfo');
 if(label)label.textContent=mode==='NOTA_CREDITO'?'Número de nota de crédito (obligatorio)':'Referencia del acuerdo (opcional)';
 if(doc)doc.placeholder=mode==='NOTA_CREDITO'?'0001-00001234':'WhatsApp / acuerdo con proveedor';
 if(warning)warning.textContent=mode==='DESCUENTO_FALTANTE'
 ?'Sólo registrá el descuento cuando el proveedor lo haya aceptado. No genera nota de crédito fiscal ni modifica automáticamente el IVA.'
 :'La nota fiscal debe estar emitida por el proveedor. Este registro no altera por sí solo la liquidación del IVA.';
}
function supplierInvoiceCreditForm(invoiceId){
 const invoice=mov.find(x=>x.id===invoiceId&&x.movement_type==='FACTURA');
 if(!invoice)return A('La boleta no está disponible. Volvé a cargar proveedores.');
 const supplier=sups.find(s=>s.id===invoice.supplier_id);
 const credits=supplierInvoiceCredits.filter(l=>l.invoice_id===invoiceId);
 const active=credits.filter(l=>!l.reversed_by_movement_id);
 const totalCredit=supplierInvoiceActiveCredits(invoiceId);
 const assigned=supplierAllocations.filter(a=>a.invoice_id===invoiceId).reduce((s,a)=>s+Number(a.amount||0),0);
 const max=Math.round(Math.max(0,Number(invoice.amount)-totalCredit)*100)/100;
 const outstanding=Math.max(0,Number(invoice.amount)-totalCredit-assigned);
 const records=credits.map(l=>{
  const note=mov.find(m=>m.id===l.credit_movement_id);
  return '<div class="small" style="padding:6px 0;border-bottom:1px solid #e2e8f0">'+
   esc(l.kind==='DESCUENTO_FALTANTE'?'Faltante acordado':'Nota de crédito')+' '+
   esc(note?.document_number||'sin número')+' · <b>'+money(note?.amount||0)+'</b>'+
   (l.reversed_by_movement_id?' · Revertido':' · Activo')+
   '<div class="small muted">'+esc(l.description||'')+'</div></div>';
 }).join('');
 M('<div class="row between"><div><h3>NC / faltante sobre boleta</h3><div class="small muted">'+esc(supplier?.name||'Proveedor')+' · '+esc(invoice.document_number||'S/N')+'</div></div>'+
  '<button type="button" onclick="supplierDetail(\''+invoice.supplier_id+'\')">← Cuenta</button></div>'+
  '<div class="calc">Factura original <b>'+money(invoice.amount)+'</b> · Pagos imputados <b>'+money(assigned)+'</b><br>'+
  'Notas y descuentos activos <b>'+money(totalCredit)+'</b> · Pendiente por boleta <b>'+money(outstanding)+'</b></div>'+
  (records?'<details style="margin:10px 0"><summary>Ver '+credits.length+' ajuste(s) vinculado(s)</summary>'+records+'</details>':'')+
  '<input id="sicInvoice" type="hidden" value="'+esc(invoice.id)+'">'+
  '<input id="sicReq" type="hidden" value="'+esc(requestKey())+'">'+
  '<label>Tipo de corrección</label><select id="sicKind" onchange="supplierInvoiceCreditTypeChanged()">'+
  '<option value="NOTA_CREDITO">Nota de crédito emitida por proveedor</option>'+
  '<option value="DESCUENTO_FALTANTE">Descuento acordado por mercadería faltante</option></select>'+
  '<label>Fecha del ajuste</label><input id="sicDate" type="date" value="'+localISODate()+'">'+
  '<label id="sicDocLabel">Número de nota de crédito (obligatorio)</label><input id="sicDoc" maxlength="120" placeholder="0001-00001234">'+
  '<label>Importe a descontar</label><input id="sicAmount" type="text" inputmode="decimal" placeholder="0,00">'+
  '<div class="small muted">Crédito máximo contra el importe original: '+money(max)+'. Una factura ya pagada puede generar saldo a favor.</div>'+
  '<label>Producto faltante o motivo (obligatorio)</label><textarea id="sicReason" rows="3" placeholder="Producto, cantidad faltante, acuerdo o motivo del ajuste"></textarea>'+
  '<label>Adjuntar comprobante o foto (opcional)</label><input id="sicFiles" type="file" accept="image/*,application/pdf,.pdf" multiple>'+
  '<div id="sicTaxInfo" class="small muted">La nota fiscal debe estar emitida por el proveedor. Este registro no altera por sí solo la liquidación del IVA.</div>'+
  '<label style="display:flex;gap:8px;align-items:center;margin:12px 0"><input id="sicConfirmed" type="checkbox" style="width:auto"> El proveedor emitió la nota o aceptó el descuento</label>'+
  '<button id="sicSave" class="primary" style="width:100%" onclick="supplierInvoiceCreditSave()">Aplicar a esta boleta</button>'
 );
}
async function supplierInvoiceCreditSave(){
 const invoiceId=document.getElementById('sicInvoice')?.value||'';
 const invoice=mov.find(m=>m.id===invoiceId&&m.movement_type==='FACTURA');
 if(!invoice)return A('Boleta inexistente.');
 const kind=document.getElementById('sicKind')?.value||'';
 const doc=document.getElementById('sicDoc')?.value?.trim()||'';
 const amount=parseAmount(document.getElementById('sicAmount')?.value||'');
 const reason=document.getElementById('sicReason')?.value?.trim()||'';
 const date=document.getElementById('sicDate')?.value||'';
 const confirmed=!!document.getElementById('sicConfirmed')?.checked;
 const max=Math.round((Number(invoice.amount)-supplierInvoiceActiveCredits(invoiceId))*100)/100;
 if(!date)return A('Elegí la fecha del ajuste.');
 if(kind==='NOTA_CREDITO'&&!doc)return A('Ingresá el número de la nota de crédito.');
 if(!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>0.0001)return A('Ingresá un importe válido con dos decimales.');
 if(amount>max+0.004)return A('El ajuste supera el saldo máximo disponible de esa factura.');
 if(reason.length<5)return A('Indicá la mercadería faltante o el motivo.');
 if(!confirmed)return A('Confirmá que el proveedor emitió la nota o aceptó el descuento.');
 busyBtn('sicSave',true);
 try{
  const req=document.getElementById('sicReq')?.value||'';
  const result=await sb.rpc('audit_record_supplier_invoice_credit',{
   p_invoice_id:invoiceId,p_date:date,p_amount:amount,p_kind:kind,
   p_document_number:doc||null,p_description:reason,p_confirmed:true,p_request_key:req
  });
  if(result.error)return A(result.error.message||'No pude guardar el ajuste.');
  const creditId=result.data?.credit_movement_id;
  const files=[...(document.getElementById('sicFiles')?.files||[])];
  let failed=0;
  for(const file of files){
   const path=invoice.supplier_id+'/credito-'+crypto.randomUUID()+'-'+file.name;
   const uploaded=await sb.storage.from('audit-evidence').upload(path,file);
   if(uploaded.error){failed++;continue}
   const ev=await sb.from('audit_evidence').insert({supplier_movement_id:creditId,file_name:file.name,storage_path:path,mime_type:file.type,file_size:file.size});
   if(ev.error)failed++;
  }
  X();
  await loadSuppliers();
  supplierInvoiceCreditForm(invoiceId);
  A('Ajuste guardado y descontado del saldo del proveedor.'+(failed?' '+failed+' adjunto(s) no se pudieron vincular; revisá el comprobante.':''));
 }catch(e){A(e.message||String(e))}
 finally{busyBtn('sicSave',false)}
}
async function supplierInvoiceCreditReverse(creditMovementId){
 const linked=supplierInvoiceCredits.find(l=>l.credit_movement_id===creditMovementId);
 if(!linked||linked.reversed_by_movement_id)return A('Este ajuste no admite nueva reversión.');
 const note=mov.find(x=>x.id===creditMovementId);
 const reason=prompt('Motivo para revertir '+money(note?.amount||0)+' de esta nota o descuento:');
 if(reason===null)return;
 if(reason.trim().length<5)return A('Explicá el motivo de la reversión.');
 if(!confirm('Se generará una nota de débito interna compensatoria. La nota original seguirá visible. ¿Continuar?'))return;
 const result=await sb.rpc('audit_reverse_supplier_invoice_credit',{p_credit_movement_id:creditMovementId,p_reason:reason.trim(),p_request_key:requestKey()});
 if(result.error)return A(result.error.message);
 X();await loadSuppliers();supplierDetailLegacy(linked.supplier_id);
 A('Reversión registrada sin borrar el comprobante original.');
}


let spanishRecipeCatalogRows=[];
let spanishRecipeProductTemplates=[];
let spanishRecipeCostingEstimates=[];
async function spanishRecipeCatalogOpen(){
 M('<div class="row between"><h3>Fichas de recetas · POS</h3><button type="button" onclick="X()">Cerrar</button></div>'+
 '<div class="small muted">Borradores elaborados desde ventas reales y gramajes documentados. La receta parcial NO se aplica a stock físico.</div>'+
 '<div id="recipePosStatus" class="calc">Cargando fichas con sus opciones…</div>');
 try{
  const result=await comprasApi('recipe_variant_catalog');
  spanishRecipeCatalogRows=Array.isArray(result.catalog)?result.catalog:[];
  spanishRecipeProductTemplates=Array.isArray(result.templates)?result.templates:[];
  spanishRecipeCostingEstimates=Array.isArray(result.costing_estimates)?result.costing_estimates:[];
  M('<div class="row between"><h3>Fichas de recetas · POS</h3><button type="button" onclick="X()">Cerrar</button></div>'+
   '<p class="small muted">Catalogadas '+Number(result.total||0)+' preparaciones correspondientes a '+Number(result.ids||0)+
   ' referencias de ventas. Componentes aprobados operativamente: '+Number(result.operational_approved_fichas||0)+
   ' fichas, '+Number(result.operational_approved_ids||0)+' referencias. '+
   'Además, '+Number(result.costing_approved_ids||0)+' recetas genéricas quedaron APROBADAS para costeo referencial. '+
   'Las 4 recetas íntegramente verificadas siguen separadas; nunca se descuenta stock real automáticamente.</p>'+
   '<input id="recipePosFind" type="search" autocomplete="off" placeholder="Buscar plato, bebida, ID o variante" style="width:100%;min-height:42px">'+
   '<select id="recipePosStatus" style="width:100%;margin-top:6px">'+
   '<option value="">Todos los estados</option>'+ '<option value="OPERATIVA">Con componentes aprobados operativamente</option>'+ '<option value="COSTEO_ESTIMADO">Recetas aprobadas para CMV referencial</option>'+
   '<option value="APROBADA_ID_FIJO">Receta previamente aprobada</option>'+
   '<option value="BORRADOR_PARCIAL">Con gramajes parciales</option>'+
   '<option value="REQUIERE_VARIANTE">ID con opciones diferentes</option>'+
   '<option value="SIN_RECETA">Sin cantidades documentadas</option></select>'+
   '<div id="recipeProductTemplates"></div><div id="recipeCostingEstimates"></div><div id="recipePosList"></div>');
  document.getElementById('recipePosFind')?.addEventListener('input',spanishRecipeCatalogRender);
  document.getElementById('recipePosStatus')?.addEventListener('change',spanishRecipeCatalogRender);
  spanishRecipeCatalogRender();
 }catch(e){const box=document.getElementById('recipePosStatus');if(box)box.innerHTML='<span class="bad">No pude consultar las fichas: '+comprasEsc(e.message||String(e))+'</span>'}
}
function spanishRecipeCatalogRender(){
 const box=document.getElementById('recipePosList');if(!box)return;
 const q=String(document.getElementById('recipePosFind')?.value||'').toLocaleLowerCase('es-AR').trim();
 const status=document.getElementById('recipePosStatus')?.value||'';
 const records=spanishRecipeCatalogRows.filter(x=>(!status||(status==='OPERATIVA'?!!x.operational_approved:(status==='COSTEO_ESTIMADO'?false:x.review_status===status)))&&
  (!q||[x.pos_product_id,x.variant_name,x.notes].join(' ').toLocaleLowerCase('es-AR').includes(q)));
 const labels={APROBADA_ID_FIJO:'Aprobada (histórica)',BORRADOR_PARCIAL:'Gramajes parciales',
 REQUIERE_VARIANTE:'Varía por opción',SIN_RECETA:'Sin ficha cuantificada'};
 const templateHost=document.getElementById('recipeProductTemplates');
 if(templateHost){
  const templates=spanishRecipeProductTemplates.filter(t=>!q||[t.product_name,t.recipe_key].join(' ').toLocaleLowerCase('es-AR').includes(q));
  templateHost.innerHTML=templates.length
   ? '<h4>Recetas nuevas · aprobadas por gerencia</h4>'+templates.map(t=>{
     const parts=Array.isArray(t.ingredients_per_unit)?t.ingredients_per_unit:[];
     const items=parts.map(p=>comprasEsc(p.insumo)+' · '+(p.cantidad===null?'a gusto':comprasEsc(p.cantidad))+' '+comprasEsc(p.unidad));
     const pending=Array.isArray(t.pending_to_cost)?t.pending_to_cost:[];
     return '<details class="compras-order" open><summary><b>'+comprasEsc(t.product_name)+'</b>'+
      '<div class="small muted">APROBADA OPERATIVA · '+comprasEsc(t.yield_units)+' '+comprasEsc(t.yield_unit)+' por tanda'+
      (t.pos_product_id?' · POS #'+comprasEsc(t.pos_product_id):' · Nueva, pendiente de alta POS')+'</div></summary>'+
      '<p class="small"><b>Por sándwich:</b> '+items.join('; ')+'</p>'+
      (pending.length?'<p class="small muted">Para CMV exacto: '+pending.map(comprasEsc).join('; ')+'</p>':'')+
      '<p class="small muted">'+comprasEsc(t.notes||'')+'</p></details>';
   }).join(''):'';
 }
 const estimatedHost=document.getElementById('recipeCostingEstimates');
 if(estimatedHost){
  const rows=spanishRecipeCostingEstimates.filter(x=>(!q||[x.pos_product_id,x.name,x.family].join(' ').toLocaleLowerCase('es-AR').includes(q)));
  const display=(status==='COSTEO_ESTIMADO'||!!q) && (!status||status==='COSTEO_ESTIMADO');
  estimatedHost.innerHTML=
   '<details class="compras-order" '+(display?'open':'')+'><summary><b>Recetas aprobadas para CMV estimado ('+rows.length+')</b>'+
   '<div class="small muted">Rangos de costo, NO receta completa de stock</div></summary>'+
   (display?rows.slice(0,100).map(x=>{
    const parts=Array.isArray(x.components)?x.components:[];
    return '<details class="compras-order"><summary><b>'+comprasEsc(x.name)+'</b>'+
     '<div class="small muted">POS #'+comprasEsc(x.pos_product_id)+' · CMV referencial '+money(x.low)+'–'+money(x.high)+'</div></summary>'+
     '<p class="small">Ingredientes estimados: '+parts.map(p=>Array.isArray(p)?comprasEsc(p[0])+' '+comprasEsc(p[1])+' '+comprasEsc(p[2]):'').join('; ')+'</p>'+
     '<p class="small muted">'+comprasEsc(x.pricing_note||'')+'</p></details>';
   }).join(''):'<p class="small muted">Seleccioná «Recetas aprobadas para CMV referencial» para consultar las fichas.</p>')+
   '</details>';
 }
 const list=records.slice(0,80).map(r=>{
  const base=Array.isArray(r.recipe_components)?r.recipe_components:[];
  const options=Array.isArray(r.explicit_variant_components)?r.explicit_variant_components:[];
  const items=base.map(a=>comprasEsc(a.ingredient)+' · '+comprasEsc(a.quantity_per_sale)+' '+comprasEsc(a.unit));
  const optionItems=options.map(a=>comprasEsc(a.insumo)+' · '+comprasEsc(a.cantidad)+' '+comprasEsc(a.unidad));
  return '<details class="compras-order"><summary><b>'+comprasEsc(r.variant_name)+'</b>'+
   '<div class="small muted">POS #'+comprasEsc(r.pos_product_id)+' · '+comprasEsc(labels[r.review_status]||r.review_status)+
   ' · '+comprasEsc(r.sold_units)+' unidades vendidas'+(r.operational_approved?' · COMPONENTES APROBADOS':' · Sin componentes aprobados')+'</div></summary>'+
   (items.length?'<p class="small"><b>Componentes base:</b> '+items.join('; ')+'</p>':'')+
   (optionItems.length?'<p class="small"><b>Componentes explícitos de la opción:</b> '+optionItems.join('; ')+'</p>':'')+
   '<p class="small muted">'+comprasEsc(r.approval_basis||'')+'</p>'+ '<p class="small muted">'+comprasEsc(r.notes||'Pendiente de ingredientes o cantidades')+'</p></details>';
 }).join('');
 box.innerHTML='<div class="small muted">'+records.length+' preparaciones · mostrando '+Math.min(80,records.length)+'</div>'+
 (list||'<div class="empty">No se encontraron fichas para este filtro.</div>');
}

if(!FICHAJE_MODE){const uiStyle=document.createElement('style');uiStyle.id='spanishUiFix20261027';uiStyle.textContent="\nbody.audit-ui-v2 #p-home #itemTrackerEntry{display:block!important;margin:12px 0!important;background:#fff!important;border:1px solid #dbe3ee!important;border-radius:12px!important}\nbody.audit-ui-v2 #itemTrackerEntry .row{flex-wrap:wrap;gap:10px;align-items:center}\nbody.audit-ui-v2 #itemTrackerEntry .row>div{min-width:160px;flex:1}\nbody.audit-ui-v2 #itemTrackerEntry button{min-height:42px;white-space:nowrap}\nbody.audit-ui-v2 .supplier-compact-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:5px 1px 13px}\nbody.audit-ui-v2 .supplier-compact-head b{font-size:18px}\nbody.audit-ui-v2 .supplier-compact-head span,body.audit-ui-v2 .supplier-compact-name span,body.audit-ui-v2 .supplier-compact-sub{font-size:12px;color:#67778d;overflow-wrap:anywhere}\nbody.audit-ui-v2 .supplier-compact-item{display:flex;flex-direction:column;gap:10px;padding:13px 14px;background:#fff;border:1px solid #e0e6ef;border-radius:13px;margin:0 0 9px}\nbody.audit-ui-v2 .supplier-compact-name{display:flex;flex-direction:column;min-width:0;gap:3px}\nbody.audit-ui-v2 .supplier-compact-name b{font-size:15px;overflow-wrap:anywhere}\nbody.audit-ui-v2 .supplier-compact-bottom{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}\nbody.audit-ui-v2 .supplier-compact-bottom strong{font-size:15px;overflow-wrap:anywhere;min-width:0}\nbody.audit-ui-v2 .supplier-compact-bottom button{min-height:40px;flex-shrink:0}\nbody.audit-ui-v2 .supplier-compact-account-head h3{margin:0;font-size:20px;overflow-wrap:anywhere}\nbody.audit-ui-v2 .supplier-compact-account-head{display:flex;flex-direction:column;gap:3px;margin:0 0 12px}\nbody.audit-ui-v2 .supplier-compact-balance{background:#f6f8fc;border:1px solid #e3eaf2;border-radius:11px;padding:11px 12px;display:flex;flex-direction:column;gap:5px;margin-bottom:12px}\nbody.audit-ui-v2 .supplier-compact-balance span{font-size:12px;color:#60718a}\nbody.audit-ui-v2 .supplier-compact-balance strong{font-size:21px;overflow-wrap:anywhere}\nbody.audit-ui-v2 .supplier-compact-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:15px}\nbody.audit-ui-v2 .supplier-compact-actions button{margin:0!important;min-width:0;min-height:46px;white-space:normal;font-size:13px;padding:9px 5px}\nbody.audit-ui-v2 .supplier-pending-wrap{margin-top:10px}\nbody.audit-ui-v2 .supplier-pending-heading{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px}\nbody.audit-ui-v2 .supplier-pending-heading b{font-size:15px}\nbody.audit-ui-v2 .supplier-pending-heading span{font-size:12px;color:#64748b}\nbody.audit-ui-v2 .supplier-pending-item{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px 2px;border-bottom:1px solid #e5eaf2}\nbody.audit-ui-v2 .supplier-pending-info{display:flex;flex-direction:column;gap:3px;min-width:0}\nbody.audit-ui-v2 .supplier-pending-info b{font-size:14px;overflow-wrap:anywhere}\nbody.audit-ui-v2 .supplier-pending-value{font-weight:750;font-size:14px;text-align:right;white-space:nowrap}\nbody.audit-ui-v2 .supplier-compact-empty{padding:12px 0;color:#64748b;font-size:13px}\nbody.audit-ui-v2 .supplier-secondary{margin-top:12px;border:1px solid #e1e7f0;border-radius:10px;padding:10px}\nbody.audit-ui-v2 .supplier-secondary>summary{cursor:pointer;font-weight:650;font-size:13px;list-style:revert;padding:3px}\nbody.audit-ui-v2 .supplier-saldo-detail{font-size:12px;color:#506178;line-height:1.8}\nbody.audit-ui-v2 .supplier-saldo-detail p{font-size:12px;line-height:1.4}\nbody.audit-ui-v2 .supplier-more-actions{display:grid;grid-template-columns:1fr;gap:7px;margin-top:10px}\nbody.audit-ui-v2 .supplier-more-actions button{width:100%;white-space:normal}\n@media(min-width:700px){body.audit-ui-v2 .supplier-compact-actions{grid-template-columns:repeat(4,minmax(0,1fr))}body.audit-ui-v2 .supplier-more-actions{grid-template-columns:repeat(3,minmax(0,1fr))}}\n";document.head.appendChild(uiStyle)}
if(!FICHAJE_MODE){const u=document.createElement('style');u.id='spanishHistFix20261027';u.textContent="\nbody.audit-ui-v2 .supplier-hist-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}\nbody.audit-ui-v2 .supplier-hist-top h3{margin:0;font-size:19px;overflow-wrap:anywhere}\nbody.audit-ui-v2 .supplier-hist-totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:12px 0}\nbody.audit-ui-v2 .supplier-hist-totals>div{background:#f6f8fc;border:1px solid #e4eaf2;padding:10px;border-radius:10px;font-size:12px}\nbody.audit-ui-v2 .supplier-hist-totals>div:last-child{grid-column:1/-1}\nbody.audit-ui-v2 .supplier-hist-totals b{display:block;margin-top:4px;font-size:15px;overflow-wrap:anywhere}\nbody.audit-ui-v2 .supplier-hist-item{border:1px solid #e2e8f0;background:#fff;border-radius:11px;padding:12px;margin:9px 0;max-width:100%;overflow-wrap:anywhere}\nbody.audit-ui-v2 .supplier-hist-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start}\nbody.audit-ui-v2 .supplier-hist-head>div{display:flex;flex-direction:column;gap:4px;min-width:0}\nbody.audit-ui-v2 .supplier-hist-head small{color:#64748b}\nbody.audit-ui-v2 .supplier-hist-head b{overflow-wrap:anywhere}\nbody.audit-ui-v2 .supplier-hist-head strong{font-size:15px;white-space:nowrap}\nbody.audit-ui-v2 .supplier-hist-values{display:flex;justify-content:space-between;gap:6px;padding:9px;background:#f8fafc;border-radius:8px;margin:9px 0 0}\nbody.audit-ui-v2 .supplier-hist-values span{color:#60718a;font-size:12px}\nbody.audit-ui-v2 .supplier-hist-values b{color:#22334e;font-size:13px}\nbody.audit-ui-v2 .supplier-hist-more{color:#596b83;font-size:12px;margin-top:8px}\nbody.audit-ui-v2 .supplier-hist-more>summary{cursor:pointer;font-weight:650;padding:4px 0}\nbody.audit-ui-v2 .supplier-hist-more .invoice-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}\nbody.audit-ui-v2 .supplier-hist-more .invoice-actions button{min-height:36px;padding:7px 10px;font-size:12px}\n";document.head.appendChild(u)}

/* Spanish Auditoría Proveedores — restyle funcional 28/oct/2026 */
function initProveedorClaro20261028(){
 if(FICHAJE_MODE)return;
 const st=document.createElement('style');st.id='proveedorClaro20261028';
 st.textContent=[
 '.supplier-compact-account{max-width:900px;margin:0 auto}',
 '.supplier-compact-balance{display:flex;align-items:center;justify-content:space-between;gap:15px;border:1px solid #dfe5ee;border-radius:12px;padding:15px;margin:12px 0;background:#f7f9fc}',
 '.supplier-compact-balance strong{font-size:clamp(19px,3vw,26px)}',
 '.supplier-compact-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:15px 0}',
 '.supplier-compact-actions button{min-height:48px}',
 '.spclean-open{border:1px solid #dce5ee;border-radius:12px;overflow:hidden;margin:15px 0}',
 '.spclean-top{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;background:#f6f8fc;border-bottom:1px solid #e3e9f2}',
 '.spclean-invoice{padding:12px 14px;border-bottom:1px solid #eaf0f5;display:flex;justify-content:space-between;gap:15px;align-items:center}',
 '.spclean-invoice:last-child{border:0}',
 '.spclean-invoice small{display:block;font-size:12px;color:#63768a;margin-top:4px}',
 '.spclean-invoice strong,.spclean-top .bad{color:#b12a39}',
 '.spclean-zero{background:#f2faf5;border:1px solid #cde4d5;color:#166339;border-radius:12px;padding:15px;margin:14px 0}',
 '.spclean-zero small{display:block;margin-top:4px}',
 '.spclean-ledger{display:grid;gap:8px;margin:12px 0}',
 '.spclean-entry{border:1px solid #e1e9f1;border-left:4px solid #afbbc8;border-radius:10px;padding:11px 13px}',
 '.spclean-entry.debit{border-left-color:#ba3543}.spclean-entry.credit{border-left-color:#19804e}',
 '.spclean-entry-head{display:flex;justify-content:space-between;gap:12px;align-items:center}',
 '.spclean-entry-head small{display:block;color:#738397;margin-top:3px}',
 '.spclean-entry.debit .spclean-entry-head strong{color:#b12a39}',
 '.spclean-entry.credit .spclean-entry-head strong{color:#17693f}',
 '.spclean-entry-meta{font-size:12px;color:#60758b;margin-top:8px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}',
 '.spclean-entry details{border-top:1px solid #eaf0f5;padding-top:6px;margin-top:8px}',
 '.spclean-entry details>summary{padding:4px 0!important;background:transparent!important;border:0!important;font-size:12px!important}',
 '.spclean-link{font-size:13px;padding:5px 0}',
 '.spclean-extra{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}',
 '.spclean-select{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}',
 '@media(max-width:520px){.supplier-compact-balance{align-items:flex-start;flex-direction:column}.spclean-invoice{align-items:flex-start}.spclean-entry-meta{flex-direction:column}}'
 ].join('\n');document.head.appendChild(st);
 const originalInputs=supplierAllocationInputs;
 supplierAllocationInputs=function(supplierId,paymentId=''){
   return originalInputs(supplierId,paymentId)
    .replace('Elegí las boletas para descontar','Boletas a cancelar')
    .replace('Tocá cada boleta: se suma el importe pendiente hasta cubrir el pago. Si alcanza sólo para una parte, la última queda parcialmente paga con su saldo real. Podés ajustar cualquier importe antes de guardar.','Seleccioná una o todas, desde la más vieja. Si el pago no alcanza, la última queda parcialmente cancelada.')
    .replace('<div id="allocationSum"','<div class="spclean-select"><button type="button" onclick="spSelectAllInvoices()">Seleccionar todas</button><button type="button" onclick="spClearInvoices()">Limpiar selección</button></div><div id="allocationSum"');
 };
 window.spSelectAllInvoices=function(){
   const budget=supplierAllocationBudget();
   if(!budget.auto&&budget.cents<=0)return A('Ingresá el importe del pago.');
   let left=budget.auto?Number.MAX_SAFE_INTEGER:budget.cents,total=0;
   for(const f of supplierAllocationInputsSelected()){
     const max=Math.round(Number(f.dataset.allocMax||0)*100),v=Math.min(max,Math.max(0,left));
     f.value=v?(v/100).toFixed(2):'';
     if(v){total+=v;f.dataset.allocOrder=String(++supplierAllocationSequence)}else delete f.dataset.allocOrder;
     if(!budget.auto)left-=v;
   }
   if(budget.auto&&budget.field){budget.field.value=(total/100).toFixed(2);budget.field.dataset.allocAuto='1'}
   paymentAllocationChanged();
 };
 window.spClearInvoices=function(){
   for(const f of supplierAllocationInputsSelected()){f.value='';delete f.dataset.allocOrder}
   const budget=supplierAllocationBudget();
   if(budget.auto&&budget.field){budget.field.value='';budget.field.dataset.allocAuto='1'}
   paymentAllocationChanged();
 };
 supplierPendingMarkup=function(id,limit=18){
   const cents=Math.round(bal(id)*100),snap=supplierPendingSnapshot(id);
   if(cents<=0)return '<div class="spclean-zero"><b>Sin boletas por pagar</b><small>'+
     (cents<0?'Saldo a favor '+money(-cents/100):'Cuenta al día · deuda $0,00')+'</small></div>';
   const invoices=snap.invoices.slice().sort((a,b)=>String(a.movement.movement_date).localeCompare(String(b.movement.movement_date))||
     String(a.movement.created_at).localeCompare(String(b.movement.created_at)));
   const row=r=>'<div class="spclean-invoice"><span><b>'+esc(r.movement.document_number||'Boleta sin número')+'</b><small>'+
     fmt(r.movement.movement_date)+(r.pending<r.original?' · Pago parcial':'')+'</small></span>'+
     '<strong>'+money(r.pending/100)+'</strong></div>';
   const pendingCredit=snap.creditsUnassigned+snap.notesCredit;
   return '<div class="spclean-open"><div class="spclean-top"><b>Boletas por cancelar</b><b class="bad">'+money(cents/100)+'</b></div>'+
    (invoices.slice(0,limit).map(row).join('')||'<div class="empty">Sin boletas individuales.</div>')+
    (invoices.length>limit?'<details><summary>Ver '+(invoices.length-limit)+' anteriores</summary>'+invoices.slice(limit).map(row).join('')+'</details>':'')+
    (pendingCredit?'<div class="small muted" style="padding:10px 14px">Pagos anteriores por vincular; el saldo real está arriba.</div>':'')+
    '</div>';
 };
 supplierHistoryMarkup=function(id){
   let saldo=0;const all=supplierChronologicalMovements(id);
   const rows=all.map(x=>{
     const credit=['PAGO','NOTA_CREDITO'].includes(x.movement_type),amount=Number(x.amount||0);
     saldo+=credit?-amount:amount;
     const kind=x.movement_type==='FACTURA'?'Boleta':x.movement_type==='PAGO'?'Pago':x.movement_type==='NOTA_CREDITO'?'Nota de crédito':x.movement_type.replaceAll('_',' ');
     let detail='';
     if(x.movement_type==='PAGO'){
       const a=supplierAllocations.filter(v=>v.payment_id===x.id),spent=a.reduce((n,r)=>n+Number(r.amount||0),0),unused=Math.max(0,amount-spent);
       detail='<details><summary>Boletas canceladas ('+a.length+')</summary>'+
        (a.map(z=>{const inv=mov.find(v=>v.id===z.invoice_id);return '<div class="spclean-link">'+
          esc(inv?.document_number||('Boleta '+fmt(inv?.movement_date||'')))+' · '+money(z.amount)+'</div>'}).join('')||
          '<div class="spclean-link">Sin imputaciones individuales.</div>')+
        (unused>.009?'<div class="spclean-link">Por vincular '+money(unused)+'</div>':'')+
        supplierPaymentPeriodMarkup(x)+'</details>';
     }else if(x.movement_type==='FACTURA'){
       const paid=supplierAllocations.filter(v=>v.invoice_id===x.id).reduce((n,a)=>n+Number(a.amount||0),0);
       const notes=supplierInvoiceCredits.filter(v=>v.invoice_id===x.id&&!v.reversed_by_movement_id)
         .reduce((n,a)=>n+Number(mov.find(v=>v.id===a.credit_movement_id)?.amount||0),0);
       const open=Math.max(0,amount-paid-notes);
       detail='<details><summary>'+(open<.009?'Cancelada':paid+notes>.009?'Parcialmente cancelada':'Ver imputaciones')+'</summary>'+
         '<div class="spclean-link">Aplicado '+money(paid)+' · NC '+money(notes)+
         (open>.009?' · Sin vincular '+money(open):'')+'</div></details>';
     }
     if(x.notes)detail+='<details><summary>Observaciones</summary><div class="spclean-link">'+esc(x.notes)+'</div></details>';
     let btn=x.movement_type==='FACTURA'?'<button onclick="invoiceEditForm(\''+x.id+'\')">Editar</button> ':'';
     const linked=supplierInvoiceCredits.some(v=>v.credit_movement_id===x.id||v.reversed_by_movement_id===x.id);
     if(!linked)btn+='<button class="danger" onclick="deleteSupplierMovement(\''+x.id+'\')">Eliminar</button>';
     else if(supplierInvoiceCredits.some(v=>v.credit_movement_id===x.id&&!v.reversed_by_movement_id))
       btn+='<button onclick="supplierInvoiceCreditReverse(\''+x.id+'\')">Revertir NC</button>';
     if(btn)detail+='<details><summary>Opciones</summary><div class="spclean-extra">'+btn+'</div></details>';
     const running=saldo>.009?'Debo '+money(saldo):saldo<-.009?'A favor '+money(-saldo):'Saldo $0,00';
     return '<div class="spclean-entry '+(credit?'credit':'debit')+'"><div class="spclean-entry-head"><span><b>'+
      esc(kind+' '+(x.document_number||''))+'</b><small>'+fmt(x.movement_date)+'</small></span>'+
      '<strong>'+(credit?'− ':'+ ')+money(amount)+'</strong></div>'+
      '<div class="spclean-entry-meta"><span>'+(credit?'Haber':'Debe')+'</span><span>'+running+'</span></div>'+detail+'</div>';
   }).join('');
   return '<details class="supplier-account-section"><summary>Historial completo · '+all.length+' movimientos</summary>'+
     '<div class="spclean-ledger">'+(rows||'<div class="empty">Sin movimientos.</div>')+'</div></details>';
 };
 supplierDetail=function(id){
   const s=sups.find(x=>x.id===id);if(!s)return A('Proveedor no encontrado.');
   const cents=Math.round(bal(id)*100),snap=supplierPendingSnapshot(id);
   const label=cents>0?'Deuda actual':cents<0?'Saldo a favor':'Cuenta al día';
   const hasPendingLink=snap.creditsUnassigned>0&&snap.invoices.length>0;
   M('<div class="supplier-compact-account"><div class="supplier-compact-account-head"><h3>'+esc(s.name)+'</h3>'+
    '<span class="supplier-compact-sub">'+esc(s.cuit||'CUIT pendiente')+'</span></div>'+
    '<div class="supplier-compact-balance"><span>'+label+'</span><strong class="'+(cents>0?'bad':'ok')+'">'+
    money(Math.abs(cents)/100)+'</strong></div>'+
    '<div class="supplier-compact-actions"><button class="primary" onclick="documentForm(\''+id+'\')">Cargar boleta</button>'+
    '<button onclick="paymentForm(\''+id+'\')">Registrar pago</button></div>'+
    supplierPendingMarkup(id,18)+supplierHistoryMarkup(id)+
    '<details class="supplier-account-section"><summary>Otras operaciones</summary><div class="spclean-extra">'+
    (hasPendingLink?'<button onclick="supplierUnallocatedPaymentPicker(\''+id+'\')">Vincular pagos anteriores</button>':'')+
    '<button onclick="supplierInvoiceCreditPicker(\''+id+'\')">NC / faltante</button>'+
    '<button onclick="supplierStatementForm(\''+id+'\')">Extracto por fechas</button>'+
    '<button onclick="supplierEdit(\''+id+'\')">Editar proveedor</button></div></details></div>');
 };
}
initProveedorClaro20261028();

if(!FICHAJE_MODE)initAdminV2();
if(!FICHAJE_MODE)spanishSimpleUi20261024();
if(!FICHAJE_MODE)enhanceNumericInputs(document);

/* Spanish Auditoría: lectura de adelantos y aguinaldo */
let sacPayments=[];
let sacSelectedYear=new Date().getFullYear();

function personnelNavigation(){
 return '<div style="margin-bottom:13px"><h2 style="margin:0 0 12px">Personal</h2><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px">'+
 '<button class="'+(personnelView==='salary'?'primary':'')+'" style="min-height:47px" onclick="personnelOpen(\'salary\')">Sueldos semanales</button>'+
 '<button class="'+(personnelView==='advances'?'primary':'')+'" style="min-height:47px" onclick="personnelOpen(\'advances\')">Deuda de adelantos</button>'+
 '<button class="'+(personnelView==='sac'?'primary':'')+'" style="min-height:47px" onclick="personnelOpen(\'sac\')">Aguinaldo</button>'+
 '<button class="'+(personnelView==='staff'?'primary':'')+'" style="min-height:47px" onclick="personnelOpen(\'staff\')">Empleados</button></div></div>'
}
function personnelOpen(view){
 if(!['staff','salary','advances','sac'].includes(view))return;
 personnelView=view;renderPeople()
}
function renderPeople(){
 if(personnelView==='staff'){renderPersonnelHome();return}
 if(personnelView==='advances'){renderAdvancesDashboard();return}
 if(personnelView==='sac'){renderSACDashboard();return}
 renderPayrollTable();payTable.innerHTML=personnelNavigation()+payTable.innerHTML
}
function renderAdvancesDashboard(){
 const pending=advAccounts.filter(a=>a.status==='OPEN'&&Number(a.balance)>0),people=new Map(emps.map(e=>[e.id,e])),groups=new Map();
 pending.forEach(a=>{if(!groups.has(a.employee_id))groups.set(a.employee_id,[]);groups.get(a.employee_id).push(a)});
 const debt=pending.reduce((n,a)=>n+Number(a.balance||0),0),due=pending.filter(a=>a.weekly_review_due===true).length;
 const rows=Array.from(groups.entries()).map(([id,loans])=>({id,loans,employee:people.get(id),total:loans.reduce((n,a)=>n+Number(a.balance||0),0)}))
  .sort((a,b)=>b.total-a.total||String(a.employee?.name||'').localeCompare(String(b.employee?.name||''),'es'));
 const accounts=new Map(advAccounts.map(a=>[a.id,a]));
 const recent=ded.filter(d=>['PAYMENT','NO_PAYMENT'].includes(d.movement_type)).slice()
  .sort((a,b)=>String(b.deduction_date||'').localeCompare(String(a.deduction_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,10);
 payTable.innerHTML=personnelNavigation()+
 '<div class="card" style="padding:15px;border-left:5px solid #b42332;background:#fff8f7"><div class="small muted">DEUDA TOTAL DE ADELANTOS</div><b style="display:block;font-size:26px;margin:3px 0;color:#9d2525">'+money(debt)+'</b><div class="small muted">'+pending.length+' adelanto(s) abiertos · '+rows.length+' empleado(s) con saldo'+(due?' · '+due+' requieren control':'')+'</div></div>'+
 (rows.length?rows.map(g=>{
  const loans=g.loans.slice().sort((a,b)=>String(a.advance_date||'').localeCompare(String(b.advance_date||'')));
  const detail=loans.map(a=>{
   const repeated=advanceDuplicateCandidates(a.id);
   return '<div style="border-top:1px solid #e5e7eb;padding:10px 0"><div class="row between" style="gap:8px"><b>Adelanto del '+fmt(a.advance_date)+'</b><b style="color:#9d2525">'+money(a.balance)+' pendiente</b></div><div class="small muted">Entregado '+money(a.original_amount)+' · Recuperado '+money(a.paid_amount)+'</div><div class="small muted">Última recuperación: '+(a.last_payment_date?fmt(a.last_payment_date):'ninguna')+'</div>'+
   (a.weekly_review_due===true?'<div class="small bad">Revisar control de descuento semanal.</div>':'')+
   (repeated.length?'<div class="small bad">Posible movimiento repetido: '+esc(repeated.map(fmt).join(', '))+'.</div>':'')+'</div>'
  }).join('');
  const w=relevantOpenPayroll(g.id);
  return '<div class="card" style="padding:13px;margin:9px 0"><div class="row between" style="align-items:start"><div><b style="font-size:17px">'+esc(g.employee?.name||loans[0]?.employee_name||'Empleado')+'</b><div class="small muted">'+loans.length+' adelanto(s) abiertos</div></div><div style="text-align:right"><div class="small muted">Deuda pendiente</div><b style="font-size:19px;color:#9d2525">'+money(g.total)+'</b></div></div>'+detail+
  '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:9px"><button class="primary" data-eid="'+esc(g.id)+'" onclick="advancesForm(this.dataset.eid)">Cuenta e historial</button>'+
  (w?'<button data-id="'+esc(w.id)+'" onclick="payrollDetail(this.dataset.id)">Abrir liquidación</button>':'')+'</div></div>'
 }).join(''):'<div class="card">No hay adelantos pendientes.</div>')+
 '<details style="margin-top:13px"><summary style="font-weight:700;padding:10px 0">Últimos movimientos de adelantos</summary>'+
 (recent.length?recent.map(d=>{
  const a=accounts.get(d.advance_id),e=people.get(a?.employee_id),payroll=String(d.request_key||'').startsWith('payroll-')||d.period_label==='Liquidación semanal';
  const kind=d.movement_type==='NO_PAYMENT'?'Control semanal · sin descuento':payroll?'Descuento de sueldo':'Devolución fuera de sueldo';
  return '<div class="history-line"><span>'+fmt(d.deduction_date)+' · '+esc(e?.name||a?.employee_name||'Empleado')+'<div class="small muted">'+kind+' · Adelanto '+fmt(a?.advance_date)+'</div></span><b>'+money(d.amount)+'</b></div>'
 }).join(''):'<div class="small muted">Todavía no hay movimientos.</div>')+'</details>'
}
function advancesForm(eid){
 if(!eid)return A('Empleado sin vínculo');
 const e=employeeById(eid),accounts=advAccounts.filter(a=>a.employee_id===eid).slice().sort((a,b)=>
  a.status!==b.status?(a.status==='OPEN'?-1:1):String(b.advance_date||'').localeCompare(String(a.advance_date||'')));
 const total=accounts.filter(a=>a.status==='OPEN').reduce((n,a)=>n+Number(a.balance||0),0);
 const recovered=accounts.reduce((n,a)=>n+Number(a.paid_amount||0),0);
 const cards=accounts.length?accounts.map(a=>{
  const movements=ded.filter(d=>d.advance_id===a.id).slice().sort((x,y)=>String(y.deduction_date||'').localeCompare(String(x.deduction_date||''))||String(y.created_at||'').localeCompare(String(x.created_at||'')));
  const repeated=advanceDuplicateCandidates(a.id),latest=movements.find(d=>d.movement_type==='PAYMENT'&&Number(d.amount)>0);
  const history=movements.length?'<details style="margin-top:9px"><summary>Movimientos · '+movements.length+'</summary><div class="table"><table><tr><th>Fecha</th><th>Imputación</th><th>Importe</th><th>Nota</th></tr>'+
   movements.map(d=>'<tr><td>'+fmt(d.deduction_date)+'</td><td>'+(d.movement_type==='NO_PAYMENT'?'Control $0':String(d.request_key||'').startsWith('payroll-')||d.period_label==='Liquidación semanal'?'Descuento en sueldo':'Devolución fuera del sueldo')+'</td><td>'+money(d.amount)+'</td><td>'+esc(d.notes||d.period_label||'')+'</td></tr>').join('')+'</table></div></details>':'<div class="small muted">Sin movimientos todavía.</div>';
  return '<div class="card advance-card" style="padding:13px;margin:10px 0"><div class="row between"><div><b>Adelanto del '+fmt(a.advance_date)+'</b><div class="small muted">Estado: '+(a.status==='SETTLED'?'cancelado':'deuda abierta')+'</div></div><span class="pill '+(a.status==='SETTLED'?'ok':'')+'">'+(a.status==='SETTLED'?'CANCELADO':'ABIERTO')+'</span></div>'+
   '<div class="advance-balance-grid"><div><span class="small muted">Entregado</span><b>'+money(a.original_amount)+'</b></div><div><span class="small muted">Recuperado</span><b>'+money(a.paid_amount)+'</b></div><div><span class="small muted">Saldo pendiente</span><b>'+money(a.balance)+'</b></div></div>'+
   '<div class="small muted">Última recuperación: '+(a.last_payment_date?fmt(a.last_payment_date)+' · '+money(latest?.amount||0):'ninguna registrada')+'</div>'+
   (repeated.length?'<div class="small bad">Posible repetición el '+esc(repeated.map(fmt).join(', '))+'. Revisar antes de imputar.</div>':'')+
   (a.status==='OPEN'?'<button class="primary" style="margin-top:8px" data-aid="'+esc(a.id)+'" data-eid="'+esc(eid)+'" onclick="dedNew(this.dataset.aid,this.dataset.eid)">Registrar devolución externa</button>':'<div class="small ok">Cancelado el '+fmt(a.settled_on)+'</div>')+history+'</div>'
 }).join(''):'<div class="empty">Sin adelantos para este empleado.</div>';
 const w=relevantOpenPayroll(eid);
 M('<h3>Cuenta de adelantos · '+esc(e?.name||'')+'</h3><div class="calc"><div class="row between"><span>Deuda pendiente total</span><b style="font-size:22px;color:#9d2525">'+money(total)+'</b></div><div class="row between"><span>Recuperado históricamente</span><b>'+money(recovered)+'</b></div><div class="small muted">'+accounts.filter(a=>a.status==='OPEN').length+' adelanto(s) abiertos. El descuento salarial se imputa desde cada liquidación semanal.</div></div>'+
 '<div class="row" style="margin:12px 0;gap:7px;flex-wrap:wrap"><button class="primary" data-eid="'+esc(eid)+'" onclick="advanceNew(this.dataset.eid)">+ Adelanto</button><button data-eid="'+esc(eid)+'" onclick="staffRepay(this.dataset.eid)">Registrar devolución</button>'+
 (w?'<button data-id="'+esc(w.id)+'" onclick="payrollDetail(this.dataset.id)">Abrir liquidación semanal</button>':'')+'</div>'+cards)
}
function useAdvanceBalance(aid){
 const input=Array.from(document.querySelectorAll('.wpAdvanceAmount')).find(x=>x.dataset.advanceId===String(aid));
 const payrollId=document.querySelector('#wpCalc')?.dataset.id;
 const employeeId=weeklyPayrolls.find(w=>w.id===payrollId)?.employee_id;
 const a=openAdvances(employeeId||'').find(x=>x.id===String(aid));
 if(!input||!a)return A('No encontré este saldo dentro de la liquidación abierta.');
 input.value=decimalInputValue(a.balance);weeklyPayCalc();input.scrollIntoView({block:'center',behavior:'smooth'})
}
function weeklyPayCalc(){
 const box=document.getElementById('wpCalc'),extraField=document.getElementById('wpExtraHours');
 if(!box&&!extraField)return;
 const w=weeklyPayrolls.find(x=>x.id===(box?.dataset.id||extraField?.dataset.id));if(!w)return;
 const raw=String(extraField?.value??'').trim(),hours=extraField?parseAmount(raw):Number(w.overtime_minutes||0)/60;
 const valid=!extraField||(/^\d+(?:[,.]\d{1,2})?$/.test(raw)&&Number.isFinite(hours)&&hours>=0&&hours<=48);
 const minutes=valid&&extraField?Math.round(hours*60):Number(w.overtime_minutes||0),changed=!!extraField&&valid&&minutes!==Number(w.overtime_minutes||0);
 const extraPay=Math.round(minutes/60*Number(w.hourly_rate||0)*100)/100,gross=Number(w.base_amount||0)+extraPay-Number(w.other_discounts||0);
 const loans=openAdvances(w.employee_id),alloc=payrollAdvanceAllocations('.wpAdvanceAmount',loans);
 let error=!valid?'Ingresá horas extra válidas (0 a 48).':alloc.error;
 const reviewCount=Array.isArray(timeEntries)?timeEntries.filter(t=>String(t.employee_id||'')===String(w.employee_id||'')&&String(t.work_date||'')>=String(w.period_start||'')&&String(t.work_date||'')<=String(w.period_end||'')&&String(t.review_status||'')==='REVIEW').length:0;
 if(!error&&reviewCount>0)error='No se puede liquidar: hay '+reviewCount+' fichaje(s) en revisión dentro del período.';
 if(!error&&alloc.total>gross+.009)error='La suma de descuentos supera el sueldo disponible.';
 const used=new Map(alloc.allocations.map(x=>[String(x.advance_id),Number(x.amount||0)]));
 const debt=loans.reduce((n,a)=>n+Number(a.balance||0),0);
 const breakdown=loans.map(a=>'<div class="row between" style="gap:8px;padding:4px 0"><span>Adelanto '+fmt(a.advance_date)+' · descuento '+money(used.get(String(a.id))||0)+'</span><b>Queda '+money(Math.max(0,Number(a.balance||0)-(used.get(String(a.id))||0)))+'</b></div>').join('');
 const preview=document.getElementById('wpExtraPreview');
 if(preview)preview.innerHTML=valid?'<span>Extras: <b>'+minsText(minutes)+'</b> · Importe: <b>'+money(extraPay)+'</b></span>'+(changed?'<div class="bad">Guardá las extras antes de liquidar.</div>':'<div class="small muted">Extras guardadas.</div>'):'<div class="bad">Cantidad de horas extra inválida.</div>';
 const extraButton=document.getElementById('wpExtraSave');if(extraButton)extraButton.disabled=!valid||!changed;
 if(box)box.innerHTML='<div class="small muted">RESUMEN DE LA LIQUIDACIÓN</div><div class="row between"><span>Sueldo antes de adelantos</span><b>'+money(Math.max(0,gross))+'</b></div><div class="row between"><span>Deuda total antes</span><b>'+money(debt)+'</b></div>'+
  (loans.length?'<div style="border-top:1px solid #dbe3ec;margin-top:7px;padding-top:5px">'+breakdown+'</div>':'')+
  '<div class="row between" style="margin-top:6px"><span>Descuento total</span><b>−'+money(alloc.total)+'</b></div><div class="row between"><b>Deuda total restante</b><b>'+money(Math.max(0,debt-alloc.total))+'</b></div><div class="row between" style="font-size:19px;margin-top:8px"><b>A entregar</b><b>'+money(Math.max(0,gross-alloc.total))+'</b></div>'+
  (changed?'<div class="small warn">El total de extras editado todavía no se guardó.</div>':'')+(error?'<div class="bad" role="alert">'+esc(error)+'</div>':'');
 const save=document.getElementById('wpSave');if(save)save.disabled=!!error||changed
}
const spanishPayrollDetailCore=payrollDetail;
payrollDetail=function(id){
 spanishPayrollDetailCore(id);
 const w=weeklyPayrolls.find(x=>x.id===id);if(!w)return;
 document.querySelectorAll('.wpAdvanceAmount').forEach(input=>{
  const a=openAdvances(w.employee_id).find(x=>x.id===input.dataset.advanceId),holder=input.parentElement;
  if(!a||!holder||holder.dataset.clearLoanView==='1')return;
  holder.dataset.clearLoanView='1';
  const info=document.createElement('div');info.className='small muted';info.style.cssText='padding:7px 9px;margin:5px 0;background:#f5f7fa;border-radius:8px';
  info.textContent='Entregado '+money(a.original_amount)+' · Recuperado '+money(a.paid_amount)+' · Saldo antes de liquidar '+money(a.balance);holder.insertBefore(info,input);
  const button=document.createElement('button');button.type='button';button.style.cssText='width:100%;min-height:40px;margin:6px 0';button.textContent='Descontar saldo completo: '+money(a.balance);button.dataset.advanceId=a.id;button.onclick=function(){useAdvanceBalance(this.dataset.advanceId)};holder.appendChild(button)
 });
 weeklyPayCalc()
};

function sacDate(y,m,d){return String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function sacDaysInclusive(a,b){if(!a||!b||b<a)return 0;return Math.max(0,Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000)+1)}
function sacCompute(e,y,s,rows=weeklyPayrolls){
 const start=s===1?sacDate(y,1,1):sacDate(y,7,1),end=s===1?sacDate(y,6,30):sacDate(y,12,31),periodDays=sacDaysInclusive(start,end),hire=String(e?.hire_date||'').slice(0,10);
 if(!hire)return {start,end,periodDays,workedDays:null,amount:null,error:'Falta registrar la fecha de ingreso.'};
 const activeStart=hire>start?hire:start,term=String(e?.terminated_at||'').slice(0,10),activeEnd=term&&term<end?term:end,workedDays=sacDaysInclusive(activeStart,activeEnd);
 if(!workedDays)return {start,end,periodDays,workedDays:0,amount:0,error:'No hay días de relación laboral en este semestre.'};
 const ref=(rows||[]).filter(w=>w.employee_id===e.id&&w.source_mode!=='LEGACY_CONFIRM'&&w.base_amount!=null).slice()
  .sort((a,b)=>String(b.period_end||'').localeCompare(String(a.period_end||''))||String(b.pay_date||'').localeCompare(String(a.pay_date||'')))[0];
 if(!ref)return {start,end,periodDays,workedDays,amount:null,error:'No hay una liquidación semanal registrada para usar como referencia.'};
 const weekly=Math.max(0,Number(ref.base_amount||0)+Number(ref.overtime_amount||0)),amount=Math.round(weekly*workedDays/periodDays*100)/100;
 return {start,end,periodDays,workedDays,weekly,amount,ref}
}
function sacPayment(e,y,s){return sacPayments.find(x=>x.employee_id===e.id&&Number(x.period_year)===Number(y)&&Number(x.semester)===Number(s))||null}
function sacYearChange(v){const y=Number(v);if(!Number.isInteger(y)||y<2000||y>2100)return;sacSelectedYear=y;renderSACDashboard()}
function renderSACDashboard(){
 const year=Number(sacSelectedYear)||new Date().getFullYear(),now=new Date().getFullYear();
 const employees=emps.filter(e=>e.active).slice().sort((a,b)=>Number(a.sort_order??9999)-Number(b.sort_order??9999)||String(a.name).localeCompare(String(b.name),'es'));
 const years=Array.from(new Set([now-2,now-1,now,now+1,year])).sort((a,b)=>b-a);
 payTable.innerHTML=personnelNavigation()+'<div class="card" style="padding:14px"><div class="row between" style="align-items:center"><div><b style="font-size:18px">Aguinaldo</b><div class="small muted">Una semana en junio y otra en diciembre</div></div><label style="width:110px">Año<select onchange="sacYearChange(this.value)" style="min-height:42px">'+years.map(y=>'<option value="'+y+'" '+(y===year?'selected':'')+'>'+y+'</option>').join('')+'</select></label></div><div class="small muted" style="margin-top:9px">Importe: última liquidación semanal registrada (base + extras, antes de adelantos y descuentos). Si el alta cae dentro del semestre, se prorratea por días de relación laboral sobre los días calendario de ese semestre.</div></div>'+
 (employees.length?employees.map(e=>{
  const sems=[1,2].map(s=>{
   const payment=sacPayment(e,year,s),calc=sacCompute(e,year,s),label=s===1?'Junio · primera semana':'Diciembre · segunda semana';
   if(payment)return '<div style="border:1px solid #b9dfc1;background:#f3fbf4;border-radius:11px;padding:11px;margin-top:8px"><div class="row between"><b>'+label+'</b><span class="pill ok">PAGADO</span></div><div style="font-size:19px;font-weight:800;margin:5px 0">'+money(payment.amount)+'</div><div class="small muted">Pagado el '+fmt(payment.paid_date)+' · Referencia semanal '+money(payment.weekly_reference_amount)+(payment.reference_period_start?' · '+fmt(payment.reference_period_start)+' al '+fmt(payment.reference_period_end):'')+' · '+payment.worked_days+'/'+payment.period_days+' días</div>'+(payment.notes?'<div class="small muted">'+esc(payment.notes)+'</div>':'')+'</div>';
   const ready=calc.amount!=null&&calc.workedDays>0;
   return '<div style="border:1px solid #e5d6a8;background:#fffaf0;border-radius:11px;padding:11px;margin-top:8px"><div class="row between"><b>'+label+'</b><span class="pill">PENDIENTE</span></div>'+
    (calc.amount!=null?'<div style="font-size:19px;font-weight:800;margin:5px 0">'+money(calc.amount)+'</div>':'<div class="small bad" style="margin:6px 0">'+esc(calc.error||'No se pudo calcular.')+'</div>')+
    (calc.amount!=null?'<div class="small muted">Proporción '+calc.workedDays+'/'+calc.periodDays+' días · '+(calc.ref?'Referencia '+fmt(calc.ref.period_start)+' al '+fmt(calc.ref.period_end)+' · '+money(calc.weekly):'')+'</div>':'')+
    '<button type="button" class="primary" style="width:100%;min-height:43px;margin-top:8px" data-eid="'+esc(e.id)+'" data-year="'+year+'" data-sem="'+s+'" onclick="sacPaymentForm(this.dataset.eid,Number(this.dataset.year),Number(this.dataset.sem))" '+(!ready?'disabled':'')+'>Registrar pago real</button></div>'
  }).join('');
  return '<div class="card" style="padding:13px;margin:9px 0"><b style="font-size:16px">'+esc(e.name)+'</b>'+sems+'</div>'
 }).join(''):'<div class="card">No hay empleados activos.</div>')
}
function sacPaymentForm(id,y,s){
 const e=employeeById(id);if(!e)return A('Empleado no encontrado.');
 if(sacPayment(e,y,s))return A('Este aguinaldo ya figura pagado.');
 const c=sacCompute(e,y,s);if(c.amount==null||c.workedDays<1)return A(c.error||'No se puede calcular este pago.');
 const title=s===1?'Aguinaldo de junio':'Aguinaldo de diciembre';
 M('<h3>Registrar pago de aguinaldo · '+esc(e.name)+'</h3><input id="sacEmployee" type="hidden" value="'+esc(id)+'"><input id="sacYearValue" type="hidden" value="'+y+'"><input id="sacSemValue" type="hidden" value="'+s+'"><input id="sacRequestKey" type="hidden" value="'+requestKey()+'">'+
 '<div class="calc"><b>'+title+' · '+y+'</b><div class="row between" style="margin-top:8px"><span>Semana de referencia</span><b>'+fmt(c.ref.period_start)+' al '+fmt(c.ref.period_end)+'</b></div><div class="row between"><span>Una semana antes de descuentos</span><b>'+money(c.weekly)+'</b></div><div class="row between"><span>Días de relación laboral</span><b>'+c.workedDays+' / '+c.periodDays+'</b></div><div class="row between" style="font-size:20px;margin-top:7px"><b>Importe a registrar</b><b>'+money(c.amount)+'</b></div><div class="small muted">Separado de las liquidaciones semanales y de los adelantos.</div></div>'+
 '<label>Fecha en que se pagó realmente</label><input id="sacPaidDate" type="date" value="'+localISODate()+'"><label>Observación (opcional)</label><input id="sacNotes" maxlength="500" placeholder="Ej. efectivo o transferencia"><button id="sacSave" class="primary" style="width:100%;min-height:52px;margin-top:12px" onclick="sacSavePayment()">Confirmar pago de '+money(c.amount)+'</button><div class="small muted" style="margin-top:7px">Sólo se marca pagado después de confirmar la entrega.</div>')
}
async function sacSavePayment(){
 const id=document.getElementById('sacEmployee')?.value||'',year=Number(document.getElementById('sacYearValue')?.value||0),semester=Number(document.getElementById('sacSemValue')?.value||0),paidDate=document.getElementById('sacPaidDate')?.value||'',e=employeeById(id);
 if(!e||!year||![1,2].includes(semester)||!paidDate)return A('Completá los datos del pago.');
 const calc=sacCompute(e,year,semester);if(calc.amount==null||calc.workedDays<1)return A(calc.error||'No se puede calcular.');
 const confirmText='PAGO REAL DE AGUINALDO · '+e.name+'\nPeríodo '+(semester===1?'enero a junio':'julio a diciembre')+' de '+year+'\nReferencia semanal '+fmt(calc.ref.period_start)+' al '+fmt(calc.ref.period_end)+'\nUna semana '+money(calc.weekly)+' · proporción '+calc.workedDays+'/'+calc.periodDays+' días\nImporte '+money(calc.amount)+'\nFecha '+fmt(paidDate)+'\n\n¿Confirmás que ya fue entregado?';
 if(!confirm(confirmText))return;
 busyBtn('sacSave',true,'Guardando…');
 try{
  const existing=await sb.from('audit_employee_sac_payments').select('id').eq('employee_id',id).eq('period_year',year).eq('semester',semester).maybeSingle();
  if(existing.error)return A('No pude verificar si ya está registrado: '+existing.error.message);
  if(existing.data)return A('Ese pago ya está registrado. No se duplicó.');
  const [freshEmployee,freshRows]=await Promise.all([
   sb.from('audit_employees').select('id,name,hire_date,terminated_at').eq('id',id).single(),
   sb.from('audit_weekly_payrolls').select('id,employee_id,period_start,period_end,pay_date,base_amount,overtime_amount,source_mode').eq('employee_id',id).order('period_end',{ascending:false}).limit(300)
  ]);
  if(freshEmployee.error||freshRows.error)return A('No pude verificar los datos actualizados antes de registrar el pago.');
  const fresh=sacCompute(freshEmployee.data,year,semester,freshRows.data||[]);
  if(fresh.amount==null||fresh.ref?.id!==calc.ref?.id||Math.abs(Number(fresh.amount)-Number(calc.amount))>.009)return A('Cambió la referencia semanal o el cálculo. Volvé a abrir el aguinaldo para revisar el importe actualizado.');
  const result=await sb.from('audit_employee_sac_payments').insert({
   employee_id:id,period_year:year,semester,reference_payroll_id:calc.ref.id,reference_period_start:calc.ref.period_start||null,reference_period_end:calc.ref.period_end||null,
   weekly_reference_amount:calc.weekly,worked_days:calc.workedDays,period_days:calc.periodDays,amount:calc.amount,paid_date:paidDate,
   notes:String(document.getElementById('sacNotes')?.value||'').trim()||null,request_key:document.getElementById('sacRequestKey')?.value||requestKey()
  });
  if(result.error){if(result.error.code==='23505')return A('Ese pago ya se registró. No se duplicó.');return A('No se guardó el pago: '+result.error.message)}
  X();await loadPeople();A('Pago de aguinaldo registrado por '+money(calc.amount)+'.')
 }finally{busyBtn('sacSave',false)}
}
const spanishLoadPeopleCore=loadPeople;
loadPeople=async function(){
 await spanishLoadPeopleCore();
 if(!emps.length)return;
 const r=await sb.from('audit_employee_sac_payments').select('*').order('period_year',{ascending:false}).order('semester',{ascending:false});
 if(r.error){sacPayments=[];if(personnelView==='sac')A('No se pudo cargar el historial de aguinaldos: '+r.error.message);return}
 sacPayments=r.data||[];
 if(personnelView==='sac')renderSACDashboard()
};
;if(FICHAJE_MODE)kioskBoot();else init();

/* SPANISH_WEEK_VIEW_20261031: private employee timecard, shifts only */
if(FICHAJE_MODE){
 const panel=document.getElementById('kPunch');
 const msg=document.getElementById('kPunchMsg');
 if(panel&&msg){
   const btn=document.createElement('button');
   btn.type='button';btn.className='ksecondary';btn.id='kWeekViewBtn';
   btn.textContent='Ver mis jornadas de la semana';
   const box=document.createElement('section');
   box.id='kWeekViewContent';box.className='hide';
   box.style.cssText='margin-top:12px;padding:14px;border:1px solid #dbe3ed;border-radius:14px;background:#f8fafc;line-height:1.45';
   panel.insertBefore(btn,msg);
   panel.insertBefore(box,msg);
   const dateDisplay=s=>{
     if(!/^\d{4}-\d\d-\d\d$/.test(s||''))return '';
     const [y,m,d]=s.split('-');return d+'/'+m+'/'+y;
   };
   const dayDisplay=s=>{
     if(!/^\d{4}-\d\d-\d\d$/.test(s||''))return '';
     const d=new Intl.DateTimeFormat('es-AR',{weekday:'long',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
     return d.charAt(0).toUpperCase()+d.slice(1);
   };
   const timeDisplay=v=>v?kioskFmtTime(v):'Pendiente';
   const duration=n=>{
     const mins=Math.max(0,Number(n)||0),h=Math.floor(mins/60),m=mins%60;
     return h+' h '+String(m).padStart(2,'0')+' min';
   };
   const clear=()=>{box.replaceChildren();box.classList.add('hide');btn.textContent='Ver mis jornadas de la semana';btn.disabled=false};
   const oldShow=kioskShow;
   kioskShow=function(id){if(id!=='kPunch')clear();oldShow(id);};
   btn.addEventListener('click',async()=>{
     if(!box.classList.contains('hide')){clear();return;}
     if(!kioskToken){box.textContent='Ingresá con tu PIN para consultar tus jornadas.';box.classList.remove('hide');return;}
     btn.disabled=true;btn.textContent='Consultando jornadas…';
     try{
       const x=await kioskApi('week',{token:kioskToken});
       box.replaceChildren();
       const heading=document.createElement('div');
       heading.style.cssText='font-size:16px;font-weight:800;margin-bottom:9px';
       heading.textContent='Jornadas · '+dateDisplay(x.period_start)+' al '+dateDisplay(x.period_end);
       box.appendChild(heading);
       if(x.locked){
         const p=document.createElement('p');p.className='small muted';
         p.textContent='La consulta de esta semana está cerrada.';
         box.appendChild(p);
       }else if(!x.entries?.length){
         const p=document.createElement('p');p.className='muted small';
         p.textContent='No hay jornadas registradas en este período.';box.appendChild(p);
       }else for(const e of x.entries){
         const line=document.createElement('div');
         line.style.cssText='padding:10px 1px;border-bottom:1px solid #e2e8f0';
         const title=document.createElement('div');title.style.fontWeight='700';
         title.textContent=dayDisplay(e.work_date)+' '+dateDisplay(e.work_date);
         const times=document.createElement('div');
         times.textContent='Entrada '+timeDisplay(e.clock_in_at)+' · Salida '+timeDisplay(e.clock_out_at);
         const detail=document.createElement('div');detail.className='small muted';
         detail.textContent=e.clock_out_at?'Duración '+duration(e.worked_minutes)+(e.auto_closed?' · salida automática':''):'Jornada en curso';
         line.append(title,times,detail);box.appendChild(line);
       }
       box.classList.remove('hide');btn.textContent='Ocultar jornadas';
     }catch(e){
       box.textContent=e.message||'No se pudieron consultar las jornadas.';
       box.classList.remove('hide');btn.textContent='Cerrar consulta';
     }finally{btn.disabled=false;}
   });
 }
}

if(!FICHAJE_MODE){const leoniScript=document.createElement('script');leoniScript.src='https://pgtrdfukjkigvmsrcxlr.supabase.co/functions/v1/spanish-auditoria-appjs-stage-v78?v=20261102_credit_v19';leoniScript.async=false;document.head.appendChild(leoniScript);}
/* SPANISH IVA REPORT V2: fresh read from original billing data on every export.
   Customer statements are independent. Percentage is never displayed in PDFs. */
let ivaReportLast=null,ivaReportRefreshSerial=0;
function ivaReportMonth(){
 const input=document.getElementById('billMonthPick');
 const month=window.__spanishBillingMonth||input?.value||localISODate().slice(0,7);
 if(!/^\d{4}-\d{2}$/.test(month))throw Error('Período inválido.');
 return month;
}
function ivaReportNextMonth(month){
 const year=Number(month.slice(0,4)),m=Number(month.slice(5));
 return new Date(Date.UTC(year,m,1)).toISOString().slice(0,10);
}
function ivaReportMoney(n){
 return '$ '+new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0)/100);
}
function ivaReportCents(n){
 if(n===null||n===undefined||n==='')return null;
 const v=Number(n);return Number.isFinite(v)?Math.round(v*100):null;
}
function ivaReportSafe(s){
 return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function ivaReportDate(v){
 const s=String(v||'').slice(0,10);
 return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'—';
}
function ivaReportSelected(clients){
 const stored=window.__ivaReportClient;
 if(stored&&clients.some(c=>c.id===stored))return stored;
 return clients.find(c=>String(c.legal_name||'').toLowerCase()==='hola mundo')?.id||clients[0]?.id||'';
}
async function ivaReportFetch(month){
 if(!sb)throw Error('La sesión de Auditoría no está abierta.');
 const start=month+'-01',end=ivaReportNextMonth(month);
 const [cs,bs]=await Promise.all([
  sb.from('audit_billing_clients').select('id,legal_name,cuit,active').order('legal_name',{ascending:true}),
  sb.from('audit_billing_entries')
    .select('id,client_id,invoice_date,voucher_type,voucher_number,status,vat_amount,iva_due,total_amount')
    .eq('status','FACTURADO').gte('invoice_date',start).lt('invoice_date',end)
    .order('invoice_date',{ascending:true}).order('voucher_number',{ascending:true})
    .limit(2000)
 ]);
 if(cs.error||bs.error)throw Error('No se pudieron actualizar los comprobantes: '+(cs.error||bs.error).message);
 if((bs.data||[]).length>=2000)throw Error('El período excede 2000 facturas; no se exportó un informe incompleto.');
 const clients=cs.data||[], entries=bs.data||[],groups=clients.map(client=>{
  const records=entries.filter(e=>e.client_id===client.id);
  let iva=0,pay=0,missingVat=0;
  for(const e of records){
   const v=ivaReportCents(e.vat_amount),due=ivaReportCents(e.iva_due);
   if(v===null||due===null){missingVat++;continue;}
   iva+=v;pay+=due;
  }
  return {client,records,iva,pay,missingVat};
 });
 const orphans=entries.filter(e=>!clients.some(c=>c.id===e.client_id));
 if(orphans.length)throw Error('Existen comprobantes sin pagador identificado; se bloqueó el PDF para evitar mezclas.');
 return {month,clients,entries,groups,updatedAt:new Date()};
}
function ivaReportGroup(data,id){return data.groups.find(g=>g.client.id===id);}
function ivaCustomerRender(){void ivaCustomerRefresh();}
async function ivaCustomerRefresh(){
 const root=document.getElementById('ivaClienteReporte');if(!root)return;
 const serial=++ivaReportRefreshSerial;
 root.innerHTML='<p class="small muted">Actualizando importes de IVA desde Auditoría…</p>';
 try{
  const month=ivaReportMonth();
  const data=await ivaReportFetch(month);
  if(serial!==ivaReportRefreshSerial)return;
  ivaReportLast=data;
  const selected=ivaReportSelected(data.clients);
  window.__ivaReportClient=selected;
  const group=ivaReportGroup(data,selected);
  const choices=data.clients.map(c=>'<option value="'+ivaReportSafe(c.id)+'"'+(selected===c.id?' selected':'')+'>'+ivaReportSafe(c.legal_name)+'</option>').join('');
  const rows=(group?.records||[]).map(e=>'<tr><td>'+ivaReportDate(e.invoice_date)+'</td><td>'+ivaReportSafe([e.voucher_type||'',e.voucher_number||'S/N'].join(' '))+'</td><td style="text-align:right">'+(ivaReportCents(e.vat_amount)===null?'Pendiente':ivaReportMoney(ivaReportCents(e.vat_amount)))+'</td></tr>').join('');
  root.innerHTML='<div class="row between" style="gap:12px;flex-wrap:wrap;align-items:end">'+
   '<div><h3 style="margin:0">Estado de IVA por pagador</h3><span class="small muted">Valores consultados en la base · '+ivaReportSafe(month)+'</span></div>'+
   '<div style="min-width:180px;max-width:310px;flex:1"><label for="ivaReportClient">Pagador</label><select id="ivaReportClient" onchange="window.__ivaReportClient=this.value;ivaCustomerRefresh()">'+choices+'</select></div></div>'+
   '<p class="small muted" style="margin:12px 0">'+ivaReportSafe(group?.client.legal_name||'Sin cliente')+' · CUIT '+ivaReportSafe(group?.client.cuit||'—')+
   ' · '+(group?.records.length||0)+' comprobantes</p>'+
   '<div class="table"><table><tr><th>Fecha</th><th>Comprobante</th><th style="text-align:right">Importe IVA</th></tr>'+rows+'</table></div>'+
   '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px;margin:14px 0">'+
   '<div style="padding:12px;border:1px solid #dce4ef;border-radius:12px"><div class="small muted">Total IVA</div><b style="font-size:21px">'+ivaReportMoney(group?.iva||0)+'</b></div>'+
   '<div style="padding:12px;border:1px solid #dce4ef;border-radius:12px"><div class="small muted">Total a cobrar</div><b style="font-size:21px">'+ivaReportMoney(group?.pay||0)+'</b></div></div>'+
   (group?.missingVat?'<p class="bad">Hay comprobantes sin IVA discriminado; completalos antes de exportar.</p>':'')+
   '<div class="row" style="display:flex;gap:8px;flex-wrap:wrap">'+
   '<button type="button" onclick="ivaCustomerPDF()" '+(!group?.records.length?'disabled':'')+'>Exportar PDF de este pagador</button>'+
   '<button type="button" onclick="ivaCustomerCSV()" '+(!group?.records.length?'disabled':'')+'>Exportar CSV de este pagador</button>'+
   '<button type="button" onclick="ivaCustomerSummaryPDF()" '+(!data.entries.length?'disabled':'')+'>PDF resumen interno por pagador</button>'+
   '<button type="button" onclick="ivaCustomerRefresh()">Actualizar</button></div>'+
   '<p class="small muted" style="margin-top:10px">Los informes se recalculan al exportar; nuevas facturas o correcciones se incorporan automáticamente. El PDF individual nunca incluye importes de otros clientes.</p>';
 }catch(error){if(serial!==ivaReportRefreshSerial)return;root.innerHTML='<p class="bad">'+ivaReportSafe(error?.message||String(error))+'</p><button type="button" onclick="ivaCustomerRefresh()">Reintentar</button>';}
}
function ivaReportPrintableHeader(title,subtitle){
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+ivaReportSafe(title)+'</title><style>'+
 '@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font:12px Arial,Helvetica,sans-serif;color:#16243d;margin:0}header{border-bottom:2px solid #1d416c;padding-bottom:14px;margin-bottom:18px}h1{font-size:23px;margin:0 0 7px}h2{font-size:17px;margin:12px 0 8px}.meta{color:#606d82;font-size:11px;line-height:1.65}table{width:100%;border-collapse:collapse;margin-top:17px}th{text-align:left;background:#edf2f9;color:#243b5b;font-weight:700}td,th{padding:9px 10px;border-bottom:1px solid #dfe6ef}th.r,td.r{text-align:right;white-space:nowrap}.totals{margin-top:24px;display:flex;gap:20px;justify-content:flex-end}.total{padding:13px 15px;border:1px solid #dfe6ef;border-radius:7px;min-width:185px}.total b{display:block;font-size:19px;margin-top:7px}section{break-inside:avoid;margin-top:20px}.foot{font-size:10px;color:#738096;margin-top:20px}.noprint{margin-top:16px}@media print{.noprint{display:none}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body>'+
 '<header><h1>'+ivaReportSafe(title)+'</h1><div class="meta">'+ivaReportSafe(subtitle)+'</div></header>';
}
function ivaReportPrintableRow(e){
 return '<tr><td>'+ivaReportDate(e.invoice_date)+'</td><td>'+ivaReportSafe((e.voucher_type||'').replace(/_/g,' ')+' '+(e.voucher_number||'S/N'))+'</td>'+
 '<td class="r">'+ivaReportMoney(ivaReportCents(e.vat_amount)||0)+'</td></tr>';
}
function ivaReportPrintableClient(data,group){
 const c=group.client;
 return ivaReportPrintableHeader('Estado de IVA',c.legal_name+' · CUIT '+(c.cuit||'—')+' · Período '+data.month)+
 '<table><thead><tr><th>Fecha</th><th>Comprobante</th><th class="r">IVA</th></tr></thead><tbody>'+
 group.records.map(ivaReportPrintableRow).join('')+'</tbody></table>'+
 '<div class="totals"><div class="total">Total IVA<b>'+ivaReportMoney(group.iva)+'</b></div>'+
 '<div class="total">Total a pagar<b>'+ivaReportMoney(group.pay)+'</b></div></div>'+
 '<p class="foot">Emitido desde Spanish Auditoría el '+new Date().toLocaleString('es-AR')+'. Informe del cliente seleccionado.</p></body></html>';
}
function ivaReportPrintableSummary(data){
 const visible=data.groups.filter(g=>g.records.length);
 let sumVat=0,sumPay=0;
 const rows=visible.map(g=>{
  sumVat+=g.iva;sumPay+=g.pay;
  return '<tr><td>'+ivaReportSafe(g.client.legal_name)+'</td><td>'+ivaReportSafe(g.client.cuit||'—')+'</td>'+
  '<td class="r">'+g.records.length+'</td><td class="r">'+ivaReportMoney(g.iva)+'</td><td class="r">'+ivaReportMoney(g.pay)+'</td></tr>';
 }).join('');
 return ivaReportPrintableHeader('Resumen interno de IVA por pagador','Período '+data.month+' · Cada pagador se calcula de forma independiente')+
 '<table><thead><tr><th>Pagador</th><th>CUIT</th><th class="r">Comprobantes</th><th class="r">IVA</th><th class="r">Total a pagar</th></tr></thead><tbody>'+
 rows+'</tbody></table>'+
 '<div class="totals"><div class="total">Total IVA<b>'+ivaReportMoney(sumVat)+'</b></div><div class="total">Total a cobrar<b>'+ivaReportMoney(sumPay)+'</b></div></div>'+
 '<p class="foot">Resumen administrativo de clientes. Para compartir con un pagador, usar su PDF individual. Generado '+new Date().toLocaleString('es-AR')+'.</p></body></html>';
}

/* Native PDF download: zero libraries, no cached or mixed customer totals. */
function ivaPdfClean(s){
 let result='';
 const value=String(s==null?'':s).replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"');
 for(let i=0;i<value.length;i++){
  const code=value.charCodeAt(i);
  result+=(code<32||code>255)?' ':value[i];
 }
 return result;
}
function ivaPdfLiteral(value){
 return ivaPdfClean(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
}
function ivaPdfText(value,x,y,size=10,bold=false){
 return 'BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+Math.round(x)+' '+Math.round(y)+' Tm ('+ivaPdfLiteral(value)+') Tj ET\n';
}
function ivaPdfRight(value,right,y,size=10,bold=false){
 const v=String(value);
 const scale=.51+(bold?.03:0);
 return ivaPdfText(v,right-v.length*size*scale,y,size,bold);
}
function ivaPdfLine(x1,y1,x2,y2){
 return '0.83 0.87 0.91 RG 0.65 w '+x1+' '+y1+' m '+x2+' '+y2+' l S\n';
}
function ivaPdfBytes(raw){
 const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i)&255;
 return bytes;
}
function ivaReportBuildPDF(data,group,summary){
 const pages=[],margin=44,right=551;
 const groups=summary?data.groups.filter(g=>g.records.length):[group];
 if(!groups.length)throw Error('No hay comprobantes para exportar.');
 if(groups.some(g=>g.missingVat))throw Error('Hay facturas sin IVA discriminado.');
 let lines=[];
 if(summary){
  lines=groups.map(g=>({a:g.client.legal_name,b:g.client.cuit||'—',c:String(g.records.length),d:ivaReportMoney(g.iva),e:ivaReportMoney(g.pay)}));
 }else{
  lines=group.records.map(e=>({a:ivaReportDate(e.invoice_date),b:(e.voucher_type||'').replace(/_/g,' ')+' '+(e.voucher_number||'S/N'),c:ivaReportMoney(ivaReportCents(e.vat_amount))}));
 }
 const maxRows=23, pageCount=Math.max(1,Math.ceil(lines.length/maxRows));
 for(let pg=0;pg<pageCount;pg++){
  let parts=[],Y=0;
  const text=(s,x,y,sz,b)=>parts.push(ivaPdfText(s,x,y,sz,b));
  const rtext=(s,x,y,sz,b)=>parts.push(ivaPdfRight(s,x,y,sz,b));
  const line=(a,b,c,d)=>parts.push(ivaPdfLine(a,b,c,d));
  text(summary?'RESUMEN INTERNO DE IVA POR PAGADOR':'ESTADO DE IVA',margin,785,20,true);
  if(summary){
   text('Período: '+data.month+' | Cada pagador tiene su saldo independiente',margin,761,10);
  }else{
   text(ivaPdfClean(group.client.legal_name),margin,761,13,true);
   text('CUIT: '+(group.client.cuit||'-')+'   Período: '+data.month,margin,744,10);
  }
  line(margin,729,right,729);
  Y=711;
  if(summary){
   text('Pagador',margin,Y,9,true);
   text('CUIT',239,Y,9,true);
   rtext('Fact.',336,Y,9,true);
   rtext('IVA',446,Y,9,true);
   rtext('A pagar',right,Y,9,true);
  }else{
   text('Fecha',margin,Y,9,true);
   text('Comprobante',144,Y,9,true);
   rtext('IVA',right,Y,9,true);
  }
  line(margin,700,right,700);
  const slice=lines.slice(pg*maxRows,(pg+1)*maxRows);
  for(let k=0;k<slice.length;k++){
   const e=slice[k],y=680-k*23;
   if(summary){
    text(ivaPdfClean(e.a).slice(0,31),margin,y,9);
    text(ivaPdfClean(e.b),239,y,9);
    rtext(e.c,336,y,9);
    rtext(e.d,446,y,9);
    rtext(e.e,right,y,9);
   }else{
    text(e.a,margin,y,10);
    text(ivaPdfClean(e.b).slice(0,43),144,y,10);
    rtext(e.c,right,y,10);
   }
   line(margin,y-8,right,y-8);
  }
  if(pg===pageCount-1){
   const vat=summary?groups.reduce((s,g)=>s+g.iva,0):group.iva;
   const due=summary?groups.reduce((s,g)=>s+g.pay,0):group.pay;
   let y=Math.max(85,680-slice.length*23-30);
   text('TOTAL IVA',margin,y,11,true);rtext(ivaReportMoney(vat),right,y,14,true);
   y-=31;text('TOTAL A PAGAR',margin,y,11,true);rtext(ivaReportMoney(due),right,y,17,true);
  }
  text('Generado desde Spanish Auditoría al descargar. '+new Date().toLocaleDateString('es-AR'),margin,47,8);
  rtext('Página '+(pg+1)+' / '+pageCount,right,47,8);
  pages.push(parts.join(''));
 }
 const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>','',"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
 const ids=[];
 for(const content of pages){
  const contentId=objects.length;
  objects.push('<< /Length '+content.length+' >>\nstream\n'+content+'endstream');
  const pageId=objects.length;
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contentId+' 0 R >>');
  ids.push(pageId);
 }
 objects[2]='<< /Type /Pages /Kids ['+ids.map(i=>i+' 0 R').join(' ')+'] /Count '+ids.length+' >>';
 let pdf='%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n',offsets=[0];
 for(let i=1;i<objects.length;i++){
  offsets.push(pdf.length);
  pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n';
 }
 const xref=pdf.length;
 pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
 for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return ivaPdfBytes(pdf);
}
function ivaReportDownloadPdf(data,group,summary){
 const bytes=ivaReportBuildPDF(data,group,summary);
 const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
 anchor.href=url;
 const fragment=summary?'RESUMEN_PAGADORES':ivaPdfClean(group.client.legal_name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_');
 anchor.download='Spanish_IVA_'+fragment+'_'+data.month+'.pdf';
 document.body.appendChild(anchor);
 anchor.click();
 anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function ivaCustomerPDF(summary=false){
 try{
  const data=await ivaReportFetch(ivaReportMonth());
  if(summary){
   if(!data.entries.length)throw Error('Este período no contiene facturas.');
   ivaReportDownloadPdf(data,null,true);
  }else{
   const group=ivaReportGroup(data,ivaReportSelected(data.clients));
   if(!group||!group.records.length)throw Error('El pagador seleccionado no tiene facturas en este período.');
   ivaReportDownloadPdf(data,group,false);
  }
  void ivaCustomerRefresh();
 }catch(error){A('No se pudo exportar el PDF: '+(error?.message||String(error)));}
}
function ivaCustomerSummaryPDF(){return ivaCustomerPDF(true)}
async function ivaCustomerCSV(){
 const selected=window.__ivaReportClient;
 try{
  const data=await ivaReportFetch(ivaReportMonth()),group=ivaReportGroup(data,selected||ivaReportSelected(data.clients));
  if(!group?.records.length)throw Error('No hay comprobantes para exportar.');
  if(group.missingVat)throw Error('Hay comprobantes sin IVA discriminado; corregilos primero.');
  const q=x=>'"'+String(x??'').replace(/"/g,'""')+'"',line=(...args)=>args.map(q).join(';'),v=n=>(Number(n)||0).toFixed(2).replace('.',',');
  const csv=[line('Estado de IVA'),line('Pagador',group.client.legal_name),line('CUIT',group.client.cuit),line('Período',data.month),'',line('Fecha','Comprobante','IVA'),
   ...group.records.map(e=>line(e.invoice_date,(e.voucher_type||'')+' '+(e.voucher_number||'S/N'),v(e.vat_amount))),
   '',line('Total IVA','',v(group.iva/100)),line('Total a pagar','',v(group.pay/100))].join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='IVA_'+String(group.client.legal_name||'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_')+'_'+data.month+'.csv';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  void ivaCustomerRefresh();
 }catch(error){A(error?.message||String(error));}
}

/* Manual supplier credit notes: standalone or matched with one invoice.
   One entry point per supplier; retain original audit and notes. */
function supplierCreditManualForm(supplierId){
 const supplier=sups.find(x=>x.id===supplierId&&x.active);
 if(!supplier)return A('Proveedor no encontrado o inactivo.');
 const inv=mov.filter(x=>x.supplier_id===supplierId&&x.movement_type==='FACTURA').slice()
  .sort((a,b)=>String(b.movement_date||'').localeCompare(String(a.movement_date||'')));
 M('<div class="row between"><div><h3>Nota de crédito / faltante</h3><div class="small muted">'+esc(supplier.name)+'</div></div>'+
  '<button type="button" onclick="supplierDetail(\''+esc(supplierId)+'\')">← Cuenta</button></div>'+
  '<p class="small muted">Registrá el crédito con su número. Si afecta una boleta específica, podés seleccionarla. Si es un crédito general, dejá la factura sin vincular.</p>'+
  '<input type="hidden" id="mncSupplier" value="'+esc(supplierId)+'">'+
  '<input type="hidden" id="mncRequest" value="'+requestKey()+'">'+
  '<label>Tipo</label><select id="mncKind" onchange="supplierCreditManualChanged()">'+
  '<option value="NOTA_CREDITO">Nota de crédito del proveedor</option>'+
  '<option value="DESCUENTO_FALTANTE">Descuento acordado por faltante</option></select>'+
  '<label>Fecha del documento</label><input id="mncDate" type="date" value="'+localISODate()+'" required>'+
  '<label>Número del crédito</label><input id="mncDoc" maxlength="120" autocomplete="off" placeholder="CA3 00057775" required>'+
  '<label>Importe del crédito</label><input id="mncAmount" inputmode="decimal" type="text" placeholder="0,00" required>'+
  '<label>Aplicar a una factura (opcional)</label><select id="mncInvoice"><option value="">Sin vincular · crédito general</option>'+
  inv.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.document_number||'S/N')+' · '+money(x.amount)+' · '+fmt(x.movement_date)+'</option>').join('')+
  '</select>'+
  '<div class="small muted">Si lo vinculás a una boleta, su saldo pendiente se reduce. Una NC general reduce el saldo total de cuenta sin fingir imputaciones.</div>'+
  '<label>Descripción / motivo</label><textarea id="mncReason" rows="3" maxlength="600" placeholder="Ej.: nota de crédito por devolución, bonificación o faltante"></textarea>'+
  '<label>Foto o PDF (opcional)</label><input id="mncFiles" type="file" accept="image/*,application/pdf,.pdf" multiple>'+
  '<label style="display:flex;align-items:center;gap:8px;margin:12px 0"><input id="mncConfirmed" type="checkbox" style="width:auto"> El documento fue emitido por el proveedor o el descuento fue aceptado</label>'+
  '<button type="button" id="mncSave" class="primary" style="width:100%;min-height:48px" onclick="supplierCreditManualSave()">Guardar nota de crédito</button>');
 supplierCreditManualChanged();
}
function supplierCreditManualChanged(){
 const kind=document.getElementById('mncKind')?.value||'NOTA_CREDITO';
 const invoice=document.getElementById('mncInvoice');
 if(invoice)invoice.required=kind==='DESCUENTO_FALTANTE';
}
function supplierCreditManualNumber(value){
 const txt=String(value||'').trim().toUpperCase();
 const ca=/^CA[\s-]*0*3[\s-]*0*(\d{1,8})$/.exec(txt);
 if(ca)return '0003-'+ca[1].padStart(8,'0');
 const standard=/^0*(\d{1,5})[\s-]+0*(\d{1,8})$/.exec(txt);
 if(standard)return standard[1].padStart(4,'0')+'-'+standard[2].padStart(8,'0');
 return txt;
}
async function supplierCreditManualSave(){
 const sid=document.getElementById('mncSupplier')?.value||'';
 const supplier=sups.find(x=>x.id===sid&&x.active);
 const kind=document.getElementById('mncKind')?.value||'NOTA_CREDITO';
 const date=document.getElementById('mncDate')?.value||'';
 const number=supplierCreditManualNumber(document.getElementById('mncDoc')?.value);
 const raw=document.getElementById('mncAmount')?.value||'';
 const amount=parseAmount(raw);
 const invoiceId=document.getElementById('mncInvoice')?.value||'';
 const reason=document.getElementById('mncReason')?.value?.trim()||'';
 const confirmed=!!document.getElementById('mncConfirmed')?.checked;
 const key=document.getElementById('mncRequest')?.value||'';
 if(!supplier)return A('Proveedor no disponible.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return A('Ingresá una fecha válida.');
 if(!number||number.length<4||number.length>120)return A('Ingresá el número de nota de crédito.');
 if(!(amount>0)||!Number.isFinite(amount)||Math.abs(amount*100-Math.round(amount*100))>.001)return A('Ingresá un importe válido con centavos.');
 if(reason.length<5)return A('Describí brevemente el motivo del crédito.');
 if(kind==='DESCUENTO_FALTANTE'&&!invoiceId)return A('El descuento por faltante debe vincularse a una factura.');
 if(!confirmed)return A('Confirmá la nota emitida o el descuento aceptado.');
 const norm=n=>String(n||'').replace(/[^a-z0-9]/gi,'').toLowerCase();
 if(mov.some(m=>m.supplier_id===sid&&m.movement_type==='NOTA_CREDITO'&&norm(m.document_number)===norm(number)))
  return A('Esta nota de crédito ya existe; no se duplicó.');
 let creditId='';
 busyBtn('mncSave',true);
 try{
  if(invoiceId){
   const invoice=mov.find(m=>m.id===invoiceId&&m.supplier_id===sid&&m.movement_type==='FACTURA');
   if(!invoice)throw Error('No se encontró la factura seleccionada.');
   const result=await sb.rpc('audit_record_supplier_invoice_credit',{
    p_invoice_id:invoiceId,p_date:date,p_amount:amount,p_kind:kind,
    p_document_number:number,p_description:reason,p_confirmed:true,p_request_key:key
   });
   if(result.error)throw Error(result.error.message||'No se pudo registrar la nota.');
   creditId=result.data?.credit_movement_id||'';
  }else{
   if(kind!=='NOTA_CREDITO')throw Error('Un faltante debe vincularse a su factura.');
   const result=await sb.from('audit_supplier_movements')
     .insert({supplier_id:sid,movement_date:date,movement_type:'NOTA_CREDITO',
      document_number:number,amount:amount,notes:'NC manual sin vincular a boleta. '+reason,
      request_key:key}).select('id').single();
   if(result.error)throw Error(result.error.message||'No se pudo registrar la nota.');
   creditId=result.data?.id||'';
  }
  const uploads=[...(document.getElementById('mncFiles')?.files||[])];
  let failures=0;
  for(const file of uploads){
   if(!creditId){failures++;continue}
   const path=sid+'/credito-'+crypto.randomUUID()+'-'+String(file.name||'adjunto').replace(/[^\w.\-]/g,'_');
   const up=await sb.storage.from('audit-evidence').upload(path,file);
   if(up.error){failures++;continue}
   const linked=await sb.from('audit_evidence').insert({
    supplier_movement_id:creditId,file_name:file.name,storage_path:path,mime_type:file.type,file_size:file.size
   });
   if(linked.error)failures++;
  }
  X();
  await loadSuppliers();
  supplierDetail(sid);
  A('Nota de crédito registrada. Se descontó del saldo de '+supplier.name+'.'+
   (failures?' No se vincularon '+failures+' adjunto(s); el crédito sí se guardó.':''));
 }catch(error){
  const msg=String(error?.message||error);
  A(/duplicate|unique|audit_supplier_credit_unique_doc/i.test(msg)
   ?'Esta nota de crédito ya estaba registrada.':msg);
 }finally{busyBtn('mncSave',false)}
}

function spanishPickMonth(ym){
 if(!/^\d{4}-\d{2}$/.test(String(ym||'')))return;
 const start=document.getElementById('from'),end=document.getElementById('to');
 if(!start||!end)return;
 const y=Number(ym.slice(0,4)),m=Number(ym.slice(5,7));
 if(m<1||m>12)return;
 start.value=ym+'-01';
 end.value=ym+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0');
 if(typeof loadCloses==='function')loadCloses();
}
function spanishMonthStep(delta){
 const start=document.getElementById('from');
 const anchor=(start&&start.value)||(typeof cls!=='undefined'&&cls.length?cls[0].operational_date:localISODate());
 const match=/^(\d{4})-(\d{2})/.exec(anchor);
 if(!match)return;
 const target=new Date(Number(match[1]),Number(match[2])-1+Number(delta||0),1);
 spanishPickMonth(target.getFullYear()+'-'+String(target.getMonth()+1).padStart(2,'0'));
}

(function(){try{var s=document.createElement('style');s.textContent='@media (max-width:600px){body.audit-ui-v2 #nav,body.audit-ui-v2 nav,body.audit-ui-v2 [role=\"navigation\"]{position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:1000!important}body.audit-ui-v2 .wrap{padding-bottom:82px!important}}';document.head.appendChild(s)}catch(e){}})();
(function(){
  document.body.classList.add('audit-ui-v5');
  var css=`
    body.audit-ui-v5{background:#f3f6fa}
    body.audit-ui-v5 .p-sueldos>h2{display:none!important}
    body.audit-ui-v5 .audit-payroll-v5{width:min(100%,1180px);margin:0 auto;padding:18px 22px 100px;background:#f3f6fa;min-height:calc(100vh - 78px);font-family:Inter,system-ui,-apple-system,sans-serif}
    body.audit-ui-v5 .v5-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:15px}
    body.audit-ui-v5 .v5-eyebrow{font-size:10px;font-weight:900;letter-spacing:.1em;color:#68809c;text-transform:uppercase}
    body.audit-ui-v5 .v5-title{font-size:32px;line-height:1;letter-spacing:-.05em;color:#132f55;margin:6px 0 5px}
    body.audit-ui-v5 .v5-sub{font-size:12px;color:#75869b;margin:0}
    body.audit-ui-v5 .v5-actions{display:flex;gap:7px;flex-wrap:wrap}
    body.audit-ui-v5 .v5-btn{border:1px solid #d7e1ec;background:#fff;color:#1a4d88;border-radius:10px;min-height:38px;padding:8px 12px;font-size:12px;font-weight:850;cursor:pointer}
    body.audit-ui-v5 .v5-btn.primary{background:#1a4d88;color:#fff;border-color:#1a4d88}
    body.audit-ui-v5 .v5-btn:disabled{opacity:.48;cursor:not-allowed}
    body.audit-ui-v5 .v5-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:14px}
    body.audit-ui-v5 .v5-stat{background:#fff;border:1px solid #dce5ef;border-radius:14px;padding:12px 14px;box-shadow:0 4px 13px rgba(22,54,88,.04)}
    body.audit-ui-v5 .v5-stat b{display:block;color:#173b6d;font-size:22px}
    body.audit-ui-v5 .v5-stat span{display:block;color:#7b8ca1;font-size:10px;margin-top:2px}
    body.audit-ui-v5 .v5-alert{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff7df;border:1px solid #f0d899;border-left:4px solid #dda52f;border-radius:12px;padding:10px 12px;margin-bottom:14px}
    body.audit-ui-v5 .v5-alert strong{display:block;color:#745300;font-size:12px}
    body.audit-ui-v5 .v5-alert span{display:block;color:#8b7240;font-size:10px;margin-top:2px}
    body.audit-ui-v5 .v5-section-head{display:flex;justify-content:space-between;align-items:center;margin:14px 2px 7px}
    body.audit-ui-v5 .v5-section-head h2{font-size:17px;color:#173b6d;margin:0}
    body.audit-ui-v5 .v5-section-head span{font-size:10px;color:#7b8ca1}
    body.audit-ui-v5 .v5-list{display:grid;gap:7px}
    body.audit-ui-v5 .v5-row{background:#fff;border:1px solid #dce5ef;border-radius:14px;padding:12px 13px;box-shadow:0 3px 10px rgba(22,54,88,.04)}
    body.audit-ui-v5 .v5-row.blocked{border-left:4px solid #dda52f;padding-left:9px;background:#fffdf8}
    body.audit-ui-v5 .v5-row.ready{border-left:4px solid #2f8b66;padding-left:9px}
    body.audit-ui-v5 .v5-row-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
    body.audit-ui-v5 .v5-name{font-size:15px;font-weight:900;color:#173b6d}
    body.audit-ui-v5 .v5-period{font-size:10px;color:#7b8ca1;margin-top:3px}
    body.audit-ui-v5 .v5-badge{border-radius:999px;padding:5px 7px;font-size:9px;font-weight:900;line-height:1;white-space:nowrap}
    body.audit-ui-v5 .v5-badge.warn{background:#ffedbd;color:#795600}
    body.audit-ui-v5 .v5-badge.ok{background:#dff3e9;color:#176d4b}
    body.audit-ui-v5 .v5-badge.muted{background:#e8edf4;color:#657891}
    body.audit-ui-v5 .v5-row-bottom{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-top:9px}
    body.audit-ui-v5 .v5-meta{font-size:10px;color:#7b8ca1}
    body.audit-ui-v5 .v5-row-bottom .v5-btn{min-height:31px;padding:6px 9px;font-size:10px}
    body.audit-ui-v5 .v5-empty{background:#fff;border:1px dashed #cdd9e6;border-radius:13px;padding:18px;text-align:center;color:#71839a;font-size:12px}
    body.audit-ui-v5 .v5-web-table{background:#fff;border:1px solid #dce5ef;border-radius:16px;overflow:hidden;box-shadow:0 4px 15px rgba(22,54,88,.04)}
    body.audit-ui-v5 .v5-web-head,body.audit-ui-v5 .v5-web-row{display:grid;grid-template-columns:1.25fr 1.05fr .7fr .7fr .7fr .9fr auto;gap:10px;align-items:center;padding:12px 14px}
    body.audit-ui-v5 .v5-web-head{background:#f6f9fc;color:#74869e;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #dce5ef}
    body.audit-ui-v5 .v5-web-row{border-bottom:1px solid #e6edf4;color:#173b6d;font-size:12px}
    body.audit-ui-v5 .v5-web-row:last-child{border-bottom:0}
    body.audit-ui-v5 .v5-web-row.blocked{background:#fffdf8}
    body.audit-ui-v5 .v5-web-row strong{font-size:13px}
    body.audit-ui-v5 .v5-web-row small{display:block;color:#7b8ca1;font-size:10px;margin-top:3px}
    body.audit-ui-v5 .v5-web-metric b{font-size:12px}
    body.audit-ui-v5 .v5-web-action{display:flex;gap:5px;justify-content:flex-end}
    body.audit-ui-v5 .v5-web-action .v5-btn{min-height:31px;padding:6px 8px;font-size:10px}
    body.audit-ui-v5 .v5-modal{position:fixed;inset:0;z-index:4100;background:rgba(13,34,60,.48);display:flex;align-items:flex-end;justify-content:center}
    body.audit-ui-v5 .v5-sheet{width:min(100%,620px);max-height:88vh;overflow:auto;background:#f5f8fb;border-radius:20px 20px 0 0;padding:15px 12px 24px;box-shadow:0 -15px 45px rgba(10,35,65,.25)}
    body.audit-ui-v5 .v5-sheet-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;border-bottom:1px solid #dce5ef;padding-bottom:10px;margin-bottom:10px}
    body.audit-ui-v5 .v5-sheet h2{margin:0;color:#153966;font-size:19px}
    body.audit-ui-v5 .v5-sheet p{margin:3px 0 0;color:#71839a;font-size:11px}
    body.audit-ui-v5 .v5-close{border:0;background:#e8eef5;color:#315b8d;border-radius:8px;width:32px;height:32px;font-size:18px;font-weight:900}
    body.audit-ui-v5 .v5-detail-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
    body.audit-ui-v5 .v5-detail-stat{background:#fff;border:1px solid #dce5ef;border-radius:10px;padding:8px;text-align:center}
    body.audit-ui-v5 .v5-detail-stat small{display:block;color:#7b8ca1;font-size:9px}
    body.audit-ui-v5 .v5-detail-stat b{display:block;color:#173b6d;font-size:15px;margin-top:3px}
    body.audit-ui-v5 .v5-rule{background:#e8f0f9;border-radius:10px;color:#24568d;padding:8px 9px;font-size:10px;line-height:1.35;margin-bottom:9px}
    body.audit-ui-v5 .v5-sheet-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:9px}
    body.audit-ui-v5 .v5-sheet-actions .v5-btn{min-height:35px;padding:6px 5px;font-size:10px}
    body.audit-ui-v5 .v5-incident{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:1px solid #dce5ef;border-left:4px solid #dda52f;border-radius:11px;padding:9px;margin:6px 0}
    body.audit-ui-v5 .v5-incident b{display:block;color:#173b6d;font-size:11px}
    body.audit-ui-v5 .v5-incident small{display:block;color:#71839a;font-size:9px;margin-top:3px}
    body.audit-ui-v5 .v5-incident-actions{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
    body.audit-ui-v5 .v5-incident-actions .v5-btn{min-height:29px;padding:5px 6px;font-size:9px}
    @media(max-width:760px){
      body.audit-ui-v5 .audit-payroll-v5{width:min(100%,560px);padding:10px 10px 94px}
      body.audit-ui-v5 .v5-head{display:block;padding:13px 4px 9px}
      body.audit-ui-v5 .v5-title{font-size:29px}
      body.audit-ui-v5 .v5-actions{margin-top:13px}
      body.audit-ui-v5 .v5-summary{display:flex;gap:6px;padding:9px 4px}
      body.audit-ui-v5 .v5-summary b{font-size:16px}
      body.audit-ui-v5 .v5-summary{font-size:10px}
      body.audit-ui-v5 .v5-web-table{display:none}
      body.audit-ui-v5 .v5-mobile-list{display:grid!important}
    }
    @media(min-width:761px){
      body.audit-ui-v5 .v5-mobile-list{display:none}
    }
    body.audit-ui-v5 .v5-mobile-list{display:none}
    @media(max-width:380px){
      body.audit-ui-v5 .v5-actions .v5-btn{flex:1}
      body.audit-ui-v5 .v5-sheet-actions{grid-template-columns:1fr}
    }
  `;
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var esc=function(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var emp=function(id){return (typeof emps!=='undefined'&&emps||[]).find(function(e){return String(e.id)===String(id)})||{}};
  var date=function(v){return v?String(v).slice(0,10):''};
  var fmt=function(v){return date(v).split('-').reverse().join('/')};
  var entries=function(w){return (typeof timeEntries!=='undefined'&&timeEntries||[]).filter(function(t){return String(t.employee_id)===String(w.employee_id)&&String(t.work_date||'')>=String(w.period_start||'')&&String(t.work_date||'')<=String(w.period_end||'')})};
  var incident=function(t){return String(t.review_status||'')==='REVIEW'||!t.clock_in_at||!t.clock_out_at||t.auto_closed===true||String(t.close_source||'').toUpperCase()==='AUTO'};
  var noSchedule=function(w){return !(typeof schedules!=='undefined'&&(schedules||[]).some(function(s){return String(s.employee_id)===String(w.employee_id)}))};
  var legacy=function(w){return String(w.source_mode||'')==='LEGACY_CONFIRM'&&String(w.pay_date||'')<'2026-10-09'};
  var blocked=function(w){return String(w.status||'')!=='PAID'&&(Number(w.unresolved_count||0)>0||noSchedule(w)||legacy(w))};
  var rows=function(){return (typeof weeklyPayrolls!=='undefined'&&weeklyPayrolls||[]).slice().sort(function(a,b){return String(b.period_start||'').localeCompare(String(a.period_start||''))||String(emp(a.employee_id).name||'').localeCompare(String(emp(b.employee_id).name||''),'es')})};
  var close=function(){var x=document.getElementById('auditV5Overlay');if(x)x.remove()};
  var toast=function(msg){if(typeof A==='function')return A(msg);alert(msg)};
  window.auditV5Override=async function(employeeId,status,workDate){workDate=workDate||prompt('Fecha (AAAA-MM-DD):','');if(!workDate)return;var reason=prompt(status==='ABSENT'?'Motivo de inasistencia:':status==='EXTRA_DAY'?'Motivo del día extra:':'Motivo de corrección:','Corrección administrativa');if(!reason)return;var r=await sb.rpc('audit_set_attendance_override',{p_employee_id:employeeId,p_work_date:workDate,p_status:status,p_reason:reason});if(r.error)return toast(r.error.message||'No se pudo guardar.');toast('Cambio guardado. Se recalculó la semana.');close();render()};
  window.auditV5Add=async function(employeeId,workDate){workDate=workDate||prompt('Fecha (AAAA-MM-DD):','');if(!workDate)return;var ini=prompt('Entrada (AAAA-MM-DD HH:MM):',workDate+' 08:00');if(!ini)return;var out=prompt('Salida (AAAA-MM-DD HH:MM):',workDate+' 16:00');if(!out)return;var reason=prompt('Motivo:','Fichaje olvidado corregido por Administración');if(!reason)return;var r=await sb.rpc('audit_admin_add_time_entry',{p_employee_id:employeeId,p_work_date:workDate,p_clock_in_at:ini.replace(' ','T')+':00Z',p_clock_out_at:out.replace(' ','T')+':00Z',p_reason:reason});if(r.error)return toast(r.error.message||'No se pudo guardar.');toast('Fichaje corregido y semana recalculada.');close();render()};
  function openReview(id){
    var w=(typeof weeklyPayrolls!=='undefined'&&weeklyPayrolls||[]).find(function(x){return String(x.id)===String(id)});if(!w)return;
    var e=emp(w.employee_id),es=entries(w),inc=es.filter(incident),missing=[];
    var cur=new Date(String(w.period_start||'')+'T12:00:00'),end=new Date(String(w.period_end||'')+'T12:00:00');
    while(cur<=end){var ds=cur.toISOString().slice(0,10),wd=cur.getDay()===0?7:cur.getDay(),sh=(typeof schedules!=='undefined'&&schedules||[]).find(function(s){return String(s.employee_id)===String(w.employee_id)&&Number(s.iso_weekday)===wd&&s.active});if(sh&&!es.some(function(t){return String(t.work_date)===ds&&t.clock_in_at&&t.clock_out_at&&String(t.review_status||'')!=='REVIEW'}))missing.push(ds);cur.setDate(cur.getDate()+1)}
    var readOnly=String(w.status||'')==='PAID'||legacy(w);
    var h='<div class="v5-modal" id="auditV5Overlay"><div class="v5-sheet"><div class="v5-sheet-head"><div><h2>'+esc(e.name||'Empleado')+'</h2><p>'+fmt(w.period_start)+' al '+fmt(w.period_end)+' · '+esc(w.status||'OPEN')+'</p></div><button class="v5-close" id="v5Close">×</button></div><div class="v5-detail-stats"><div class="v5-detail-stat"><small>Trabajado</small><b>'+Math.round(Number(w.worked_minutes||0)/60*10)/10+' h</b></div><div class="v5-detail-stat"><small>Ausencia</small><b>'+Math.round(Number(w.absence_minutes||0)/60*10)/10+' h</b></div><div class="v5-detail-stat"><small>Extra</small><b>'+Math.round(Number(w.extra_minutes||0)/60*10)/10+' h</b></div></div>'+(readOnly?'<div class="v5-empty">Período de solo lectura.</div>':'<div class="v5-rule">Extras por jornada: 0–14 = 0 · 15–44 = 30 · 45–74 = 60 minutos.</div><div class="v5-sheet-actions"><button class="v5-btn primary" data-v5-action="add">Cargar fichaje</button><button class="v5-btn" data-v5-action="absent">Marcar ausencia</button><button class="v5-btn" data-v5-action="extra">Día extra</button></div><div>');
    if(!readOnly){inc.forEach(function(t){h+='<div class="v5-incident"><div><b>'+fmt(t.work_date)+'</b><small>'+esc((t.anomaly_detail&&t.anomaly_detail.message)||t.notes||t.anomaly_code||'Fichaje para revisar')+'</small></div><div class="v5-incident-actions"><button class="v5-btn" data-v5-action="absent" data-date="'+esc(t.work_date)+'">Ausencia</button><button class="v5-btn" data-v5-action="add" data-date="'+esc(t.work_date)+'">Corregir</button><button class="v5-btn" data-v5-action="clear" data-date="'+esc(t.work_date)+'">Quitar</button></div></div>'});missing.forEach(function(ds){h+='<div class="v5-incident"><div><b>'+fmt(ds)+'</b><small>Día programado sin fichaje</small></div><div class="v5-incident-actions"><button class="v5-btn" data-v5-action="absent" data-date="'+ds+'">Ausencia</button><button class="v5-btn" data-v5-action="add" data-date="'+ds+'">Cargar</button></div></div>'});if(!inc.length&&!missing.length)h+='<div class="v5-empty">No hay incidencias individuales.</div>';h+='</div>'}
    h+='</div></div>';document.body.insertAdjacentHTML('beforeend',h);var wrap=document.getElementById('auditV5Overlay');document.getElementById('v5Close').onclick=close;wrap.addEventListener('click',function(ev){var b=ev.target.closest('[data-v5-action]');if(!b)return;var a=b.dataset.v5Action,d=b.dataset.date||'';if(a==='add')auditV5Add(w.employee_id,d);else if(a==='absent')auditV5Override(w.employee_id,'ABSENT',d);else if(a==='extra')auditV5Override(w.employee_id,'EXTRA_DAY',d);else if(a==='clear')auditV5Override(w.employee_id,'CLEAR',d)});
  }
  function mobileMarkup(shown,blockedRows,pending,reviewCount){
    var h='<div class="audit-payroll-v5"><header class="v5-head"><div class="v5-eyebrow">PERSONAL</div><h1 class="v5-title">Liquidaciones</h1><p class="v5-sub">Control semanal de pagos</p><div class="v5-actions"><button class="v5-btn primary" id="v5Review">Incidencias'+(blockedRows.length?' · '+blockedRows.length:'')+'</button><button class="v5-btn" id="v5History">Historial</button></div></header><div class="v5-summary"><b>'+pending+'</b> pendientes <span>·</span><b>'+blockedRows.length+'</b> bloqueadas <span>·</span><b>'+reviewCount+'</b> fichajes</div><div class="v5-section"><div class="v5-section-head"><h2>'+ (window.auditV5History===true?'Todos los períodos':'Períodos pendientes') +'</h2><span>'+shown.length+'</span></div><div class="v5-mobile-list">';
    if(!shown.length)h+='<div class="v5-empty">No hay períodos para mostrar.</div>';
    shown.forEach(function(w){h+=rowMobile(w)});return h+'</div></div></div>';
  }
  function rowMobile(w){var e=emp(w.employee_id),paid=String(w.status||'')==='PAID',isBlocked=blocked(w),isNo=noSchedule(w),isLegacy=legacy(w),label=paid?'PAGADO':isLegacy?'SOLO LECTURA':isNo?'AGENDA PENDIENTE':isBlocked?'REVISAR':'LISTO',meta=paid?'Período pagado':isLegacy?'Solo lectura':isNo?'Falta agenda semanal':Number(w.unresolved_count||0)+' incidencia(s)';return '<article class="v5-row '+(paid?'':isBlocked?'blocked':'ready')+'"><div class="v5-row-top"><div><div class="v5-name">'+esc(e.name||'Empleado')+'</div><div class="v5-period">'+fmt(w.period_start)+' al '+fmt(w.period_end)+'</div></div><span class="v5-badge '+(paid?'muted':isBlocked?'warn':'ok')+'">'+label+'</span></div><div class="v5-row-bottom"><span class="v5-meta">'+meta+'</span><button class="v5-btn '+(isBlocked||paid?'':'primary')+'" data-v5-open="'+esc(w.id)+'">'+(paid?'Ver':isBlocked?'Resolver':'Liquidar')+'</button></div></article>'}
  function webMarkup(shown,blockedRows,pending,reviewCount){
    var h='<div class="audit-payroll-v5"><header class="v5-head"><div><div class="v5-eyebrow">PERSONAL · ADMINISTRACIÓN</div><h1 class="v5-title">Liquidaciones</h1><p class="v5-sub">Control semanal de pagos, incidencias y horas.</p></div><div class="v5-actions"><button class="v5-btn primary" id="v5Review">Revisar incidencias'+(blockedRows.length?' · '+blockedRows.length:'')+'</button><button class="v5-btn" id="v5History">Historial</button></div></header><div class="v5-summary"><div class="v5-stat"><b>'+pending+'</b><span>Períodos pendientes</span></div><div class="v5-stat"><b>'+blockedRows.length+'</b><span>Bloqueadas</span></div><div class="v5-stat"><b>'+reviewCount+'</b><span>Fichajes en revisión</span></div><div class="v5-stat"><b>'+shown.length+'</b><span>Mostradas</span></div></div><div class="v5-section-head"><h2>'+ (window.auditV5History===true?'Todos los períodos':'Períodos pendientes') +'</h2><span>'+shown.length+' períodos</span></div><div class="v5-web-table"><div class="v5-web-head"><div>Empleado</div><div>Período</div><div>Trabajado</div><div>Ausencia</div><div>Extra</div><div>Estado</div><div></div></div>';
    if(!shown.length)h+='<div class="v5-empty">No hay períodos para mostrar.</div>';
    shown.forEach(function(w){var e=emp(w.employee_id),paid=String(w.status||'')==='PAID',isBlocked=blocked(w),label=paid?'PAGADO':legacy(w)?'SOLO LECTURA':noSchedule(w)?'AGENDA PENDIENTE':isBlocked?'REVISAR':'LISTO';h+='<div class="v5-web-row '+(isBlocked?'blocked':'')+'"><div><strong>'+esc(e.name||'Empleado')+'</strong><small>'+esc(w.status||'OPEN')+'</small></div><div>'+fmt(w.period_start)+' al '+fmt(w.period_end)+'</div><div class="v5-web-metric"><b>'+Math.round(Number(w.worked_minutes||0)/60*10)/10+' h</b></div><div class="v5-web-metric"><b>'+Math.round(Number(w.absence_minutes||0)/60*10)/10+' h</b></div><div class="v5-web-metric"><b>'+Math.round(Number(w.extra_minutes||0)/60*10)/10+' h</b></div><div><span class="v5-badge '+(paid?'muted':isBlocked?'warn':'ok')+'">'+label+'</span></div><div class="v5-web-action"><button class="v5-btn '+(isBlocked||paid?'':'primary')+'" data-v5-open="'+esc(w.id)+'">'+(paid?'Ver':isBlocked?'Resolver':'Liquidar')+'</button></div></div>'});return h+'</div></div>';
  }
  function bind(){
    payTable.querySelectorAll('[data-v5-open]').forEach(function(b){b.onclick=function(){var id=b.dataset.v5Open,w=(typeof weeklyPayrolls!=='undefined'&&weeklyPayrolls||[]).find(function(x){return String(x.id)===String(id)});if(w&&String(w.status||'')!=='PAID'&&!blocked(w)&&typeof payrollDetail==='function')payrollDetail(id);else openReview(id)}});
    var review=document.getElementById('v5Review'),history=document.getElementById('v5History');
    if(review)review.onclick=function(){var first=rows().filter(blocked)[0];if(first)openReview(first.id);else toast('No hay incidencias pendientes.')};
    if(history)history.onclick=function(){window.auditV5History=window.auditV5History!==true;render()};
  }
  function render(){
    if(typeof payTable==='undefined'||!payTable)return;
    var all=rows(),shown=window.auditV5History===true?all:all.filter(function(w){return String(w.status||'')!=='PAID'}),blockedRows=shown.filter(blocked),pending=shown.filter(function(w){return String(w.status||'')!=='PAID'}).length,reviewCount=shown.reduce(function(n,w){return n+Number(w.review_count||0)},0);
    payTable.innerHTML=window.matchMedia('(max-width:760px)').matches?mobileMarkup(shown,blockedRows,pending,reviewCount):webMarkup(shown,blockedRows,pending,reviewCount);
    bind();
  }
  var oldRender=typeof renderPeople==='function'?renderPeople:null;
  var wrapped=function(){if(typeof personnelView!=='undefined'&&personnelView==='salary'){render();return}if(oldRender)return oldRender.apply(this,arguments)};
  try{renderPeople=wrapped;window.renderPeople=wrapped}catch(e){}
  var resizeTimer;window.addEventListener('resize',function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){if(typeof personnelView!=='undefined'&&personnelView==='salary')render()},180)});
  setTimeout(function(){try{if(typeof personnelView!=='undefined'&&personnelView==='salary')render()}catch(e){}},500);
})();
(function(){
  try{
    var map=new Map([
      ['Saldo inicial','Deuda anterior'],
      ['Debe período','Facturas del período'],
      ['Haber período','Pagos y créditos del período'],
      ['Saldo final','Deuda al cierre']
    ]);
    var style=document.createElement('style');
    style.id='sa-human-statement-style';
    style.textContent='.sa-readable-statement-modal .sa-human-formula{grid-column:1/-1;margin:10px 0 0;padding:12px 14px;border-radius:12px;background:#eef4ff;color:#263f63;font-size:14px;line-height:1.45}.sa-readable-statement-modal table{width:100%!important;table-layout:fixed!important}.sa-readable-statement-modal th,.sa-readable-statement-modal td{white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important}';
    (document.head||document.documentElement).appendChild(style);
    function apply(){
      if(!document.body)return;
      var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),node;
      while((node=walker.nextNode())){
        var value=(node.nodeValue||'').trim(),next=map.get(value);
        if(next)node.nodeValue=node.nodeValue.replace(value,next);
      }
      var required=['Deuda anterior','Facturas del período','Pagos y créditos del período','Deuda al cierre'];
      var candidates=Array.prototype.slice.call(document.querySelectorAll('div')).filter(function(el){
        var t=el.textContent||'';
        return required.every(function(x){return t.indexOf(x)>=0});
      }).sort(function(a,b){return a.textContent.length-b.textContent.length});
      var box=candidates[0];
      if(!box)return;
      var modal=box.closest('.modal');
      if(modal)modal.classList.add('sa-readable-statement-modal');
      if(!box.querySelector('.sa-human-formula')){
        var note=document.createElement('div');
        note.className='sa-human-formula';
        note.textContent='La deuda al cierre se calcula así: deuda anterior + facturas del período − pagos y créditos.';
        box.appendChild(note);
      }
    }
    apply();
    new MutationObserver(apply).observe(document.body,{subtree:true,childList:true,characterData:true});
  }catch(e){console.warn('No se pudo aplicar la lectura simple del extracto:',e)}
})();