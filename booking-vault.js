/* Booking vault v1.0: offline PDF/image originals and dated itinerary links.
   Originals are stored in browser IndexedDB ONLY, never in GitHub or network. */
const VAULT_DB_NAME='shanghai-tabi-private-bookings-v1';
const VAULT_STORE='documents';
const VAULT_MAX_BYTES=15*1024*1024;
let vaultObjectUrl=null;
let vaultRefreshSequence=0;
function vaultEscape(x){return String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
function vaultOpenDb(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(new Error('このブラウザはIndexedDBに対応していません。'));return}
  const req=indexedDB.open(VAULT_DB_NAME,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(VAULT_STORE)){const store=db.createObjectStore(VAULT_STORE,{keyPath:'id'});store.createIndex('tripId','tripId',{unique:false})}};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('端末内の保存領域を開けませんでした'));
  req.onblocked=()=>reject(new Error('ほかのタブで保存領域が使用中です。閉じてから再試行してください。'));
 });
}
async function vaultWithStore(mode,action){
 const db=await vaultOpenDb();
 try{
  return await new Promise((resolve,reject)=>{
   let tx;
   try{tx=db.transaction(VAULT_STORE,mode)}catch(e){reject(e);return}
   const store=tx.objectStore(VAULT_STORE);
   let result;
   try{result=action(store)}catch(e){try{tx.abort()}catch{}reject(e);return}
   tx.oncomplete=()=>resolve(result);
   tx.onerror=()=>reject(tx.error||new Error('保存処理に失敗しました'));
   tx.onabort=()=>reject(tx.error||new Error('保存処理が中断されました'));
  });
 }finally{db.close()}
}
function vaultSave(doc){return vaultWithStore('readwrite',s=>s.put(doc))}
function vaultDelete(id){return vaultWithStore('readwrite',s=>s.delete(id))}
async function vaultList(tripId){
 const db=await vaultOpenDb();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(VAULT_STORE,'readonly'),req=tx.objectStore(VAULT_STORE).index('tripId').getAll(tripId);
  req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||'')||b.created.localeCompare(a.created)));
  req.onerror=()=>reject(req.error||new Error('予約確認書を取得できませんでした'));
 })}finally{db.close()}
}
async function vaultGet(id){
 const db=await vaultOpenDb();
 try{return await new Promise((resolve,reject)=>{
  const req=db.transaction(VAULT_STORE,'readonly').objectStore(VAULT_STORE).get(id);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error||new Error('確認書の取得に失敗しました'));
 })}finally{db.close()}
}
function vaultDateOptions(){
 const t=currentTrip();
 const values=itineraryDates(t);
 return values.map((date,i)=>'<option value="'+vaultEscape(date)+'">'+vaultEscape(date)+(t.id===MAIN_TRIP?'（'+vaultEscape(['12/30 上海','12/31 無錫','1/1 上海','1/2 帰国'][i]||'')+'）':'')+'</option>').join('');
}
function bookingVaultPanel(){
 return panel('<h2>📎 予約確認書の取り込み・保管</h2>'+
  '<p class="muted">PDF・スクリーンショット（JPG/PNG/WebP）をこの端末だけに保存します。登録した日付の旅程にも表示され、通信なしで開けます。</p>'+
  '<details class="vault-import"><summary>＋ 確認書を取り込む</summary>'+
  '<form id="vaultUploadForm" class="vault-form">'+
   '<label>PDF・画像（1ファイル15MBまで）<input id="vaultFile" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" required></label>'+
   '<label>種類<select name="kind"><option value="flight">✈️ 航空券</option><option value="hotel">🏨 ホテル</option><option value="train">🚄 高速鉄道</option><option value="attraction">🎫 観光施設</option><option value="other">📁 その他</option></select></label>'+
   '<label>予約名称<input name="title" maxlength="100" required placeholder="例：JL891 関空→上海浦東"></label>'+
   '<div class="vault-fields"><label>旅程に表示する日付<select name="date" required>'+vaultDateOptions()+'</select></label><label>時刻（任意）<input name="time" type="time"></label></div>'+
   '<label>備考（任意）<input name="note" maxlength="240" placeholder="例：第1ターミナル／チェックイン開始時刻"></label>'+
   '<button type="submit" class="ghost" id="vaultSaveButton">端末内に保存して旅程に追加</button>'+
   '<p id="vaultStatus" role="status" aria-live="polite" class="tiny-hint">ファイルを選んで登録してください。予約番号を入力する必要はありません。</p>'+
  '</form></details>'+
  '<div class="vault-list-heading"><strong>登録済み確認書</strong><span id="vaultCount" class="muted"></span></div>'+
  '<div id="vaultList" aria-live="polite"><p class="muted">この端末に保存された確認書を確認しています…</p></div>'+
  '<p class="tiny-hint">予約サイトへの自動ログインや確認書の文字認識は行いません。登録した名称・日付・時刻を旅程に反映します。ファイルは端末内保存のため、ブラウザのデータ消去・端末変更で失われる場合があります。必要な原本は別途保管してください。</p>');
}
function bookingVaultScheduleMarkup(dayIndex){
 const date=itineraryDates(currentTrip())[dayIndex];
 if(!date)return '';
 return '<div class="vault-day-strip"><div class="vault-day-title">📎 この日の予約確認書 <span id="vaultDayCount" class="muted"></span></div><div id="vaultDayDocs" data-vault-date="'+vaultEscape(date)+'"><span class="muted">確認中…</span></div></div>';
}
function vaultKindLabel(kind){return {flight:'✈️ 航空券',hotel:'🏨 ホテル',train:'🚄 高速鉄道',attraction:'🎫 観光施設',other:'📁 その他'}[kind]||'📁 その他'}
function vaultRecordMarkup(x,compact){
 const title=vaultEscape(x.title),when=vaultEscape(x.date+(x.time?' '+x.time:'')),label=vaultEscape(vaultKindLabel(x.kind));
 if(compact)return '<div class="vault-day-row"><span>'+label+' <strong>'+title+'</strong> <small>'+when+'</small></span><button type="button" class="ghost" data-vault-view="'+vaultEscape(x.id)+'">確認書を見る</button></div>';
 return '<article class="vault-record"><div class="vault-record-heading"><strong>'+title+'</strong><span class="muted">'+label+'</span></div>'+
 '<div class="muted">'+when+' ・ '+vaultEscape(x.filename)+'</div>'+
 (x.note?'<p>'+vaultEscape(x.note)+'</p>':'')+
 '<div class="vault-record-actions"><button type="button" class="ghost" data-vault-view="'+vaultEscape(x.id)+'">📄 確認書を開く</button><button type="button" class="ghost" data-vault-edit="'+vaultEscape(x.id)+'">日時・名称を変更</button><button type="button" class="ghost" data-vault-delete="'+vaultEscape(x.id)+'">削除</button></div></article>';
}
async function bookingVaultRefresh(){
 const list=document.getElementById('vaultList'),dayPanel=document.getElementById('vaultDayDocs');
 if(!list&&!dayPanel)return;
 const seq=++vaultRefreshSequence,tripId=selectedTrip();
 try{
  const docs=await vaultList(tripId);
  if(seq!==vaultRefreshSequence||selectedTrip()!==tripId)return;
  if(list){list.innerHTML=docs.length?docs.map(x=>vaultRecordMarkup(x,false)).join(''):'<p class="muted">この端末にはまだ予約確認書がありません。</p>';const c=document.getElementById('vaultCount');if(c)c.textContent=docs.length+'件'}
  if(dayPanel){const target=dayPanel.dataset.vaultDate,match=docs.filter(x=>x.date===target);dayPanel.innerHTML=match.length?match.map(x=>vaultRecordMarkup(x,true)).join(''):'<span class="muted">登録なし</span>';const c=document.getElementById('vaultDayCount');if(c)c.textContent=match.length+'件'}
 }catch(err){
  if(seq!==vaultRefreshSequence)return;
  const msg='確認書の読み込みに失敗しました：'+vaultEscape(err.message||String(err));
  if(list)list.innerHTML='<p class="hint">'+msg+'</p>';
  if(dayPanel)dayPanel.innerHTML='<span class="muted">'+msg+'</span>';
 }
}
async function vaultClassifyFile(file){
 if(!file||file.size<4||file.size>VAULT_MAX_BYTES)throw new Error('確認書は15MB以下のPDFまたは画像を選択してください。');
 const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const starts=vals=>vals.every((v,i)=>bytes[i]===v);
 let type=null;
 if(starts([37,80,68,70,45]))type='application/pdf';
 else if(starts([137,80,78,71,13,10,26,10]))type='image/png';
 else if(starts([255,216,255]))type='image/jpeg';
 else if(starts([82,73,70,70])&&bytes[8]===87&&bytes[9]===69&&bytes[10]===66&&bytes[11]===80)type='image/webp';
 if(!type)throw new Error('対応していない形式です。PDF・JPG・PNG・WebPを選択してください。');
 return type;
}
function vaultNewId(){
 if(window.crypto&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
 return 'doc-'+Date.now()+'-'+Math.random().toString(36).slice(2,13);
}
async function vaultUpload(form){
 const status=document.getElementById('vaultStatus'),button=document.getElementById('vaultSaveButton');
 const data=new FormData(form),file=data.get('file');
 if(!(file instanceof File)||!file.name)throw new Error('確認書ファイルを選択してください。');
 const title=String(data.get('title')||'').trim().slice(0,100),date=String(data.get('date')||''),time=String(data.get('time')||''),kind=String(data.get('kind')||''),note=String(data.get('note')||'').trim().slice(0,240);
 if(!title)throw new Error('予約名称を入力してください。');
 if(!itineraryDates(currentTrip()).includes(date))throw new Error('旅程の日付を選択してください。');
 if(time&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('時刻の形式を確認してください。');
 if(!['flight','hotel','train','attraction','other'].includes(kind))throw new Error('予約の種類を選択してください。');
 const type=await vaultClassifyFile(file);
 const record={id:vaultNewId(),tripId:selectedTrip(),title,date,time,kind,note,filename:file.name.slice(0,180),type,size:file.size,created:new Date().toISOString(),blob:file};
 if(button)button.disabled=true;
 try{
  await vaultSave(record);
  if(status)status.textContent='✓ この端末に保存しました。該当日の「日程」にも表示されます。';
  form.reset();
  await bookingVaultRefresh();
 }finally{if(button)button.disabled=false}
}
function vaultDisposePreview(){
 if(vaultObjectUrl){URL.revokeObjectURL(vaultObjectUrl);vaultObjectUrl=null}
 const modal=document.getElementById('vaultPreview');if(modal)modal.remove();
}
async function vaultPreview(id){
 const doc=await vaultGet(id);
 if(!doc||doc.tripId!==selectedTrip())throw new Error('確認書が見つかりません。');
 vaultDisposePreview();
 const url=URL.createObjectURL(doc.blob);vaultObjectUrl=url;
 const overlay=document.createElement('div');overlay.id='vaultPreview';overlay.className='vault-preview-backdrop';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','保存した予約確認書');
 overlay.innerHTML='<div class="vault-preview-box"><div class="vault-preview-header"><strong>'+vaultEscape(doc.title)+'</strong><button type="button" class="ghost" data-vault-close>閉じる ✕</button></div>'+
 (doc.type==='application/pdf'?'<iframe class="vault-preview-file" title="PDFの予約確認書" src="'+url+'"></iframe>':'<img class="vault-preview-file" alt="予約確認書の画像" src="'+url+'">')+
 '<p class="tiny-hint">通信なしで表示しています。端末やブラウザによってPDFのプレビューに非対応の場合は保存ボタンを利用してください。</p>'+
 '<a class="ghost vault-download" href="'+url+'" download="'+vaultEscape(doc.filename)+'">確認書の原本を保存</a></div>';
 document.body.appendChild(overlay);
 overlay.querySelector('[data-vault-close]').focus();
 overlay.addEventListener('click',e=>{if(e.target===overlay)vaultDisposePreview()});
}
async function vaultEdit(id){
 const doc=await vaultGet(id);if(!doc||doc.tripId!==selectedTrip())throw new Error('確認書が見つかりません。');
 const title=prompt('予約名称を変更（キャンセルで中止）',doc.title);if(title===null)return;
 const newTitle=title.trim().slice(0,100);if(!newTitle)throw new Error('名称を入力してください。');
 const date=prompt('表示する旅程の日付（YYYY-MM-DD）',doc.date);if(date===null)return;
 if(!itineraryDates(currentTrip()).includes(date))throw new Error('旅程内の日付を入力してください。');
 const time=prompt('予約時刻（HH:MM・空欄可）',doc.time||'');if(time===null)return;
 if(time&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('時刻はHH:MM形式で入力してください。');
 await vaultSave({...doc,title:newTitle,date,time});await bookingVaultRefresh();
}
document.addEventListener('submit',e=>{
 if(e.target?.id!=='vaultUploadForm')return;
 e.preventDefault();
 const form=e.target,status=document.getElementById('vaultStatus');
 vaultUpload(form).catch(err=>{if(status)status.textContent='保存できませんでした：'+(err.message||String(err))});
});
document.addEventListener('click',e=>{
 const view=e.target.closest('[data-vault-view]'),del=e.target.closest('[data-vault-delete]'),edit=e.target.closest('[data-vault-edit]'),close=e.target.closest('[data-vault-close]');
 if(close){vaultDisposePreview();return}
 if(view){vaultPreview(view.dataset.vaultView).catch(err=>alert('確認書を開けませんでした：'+err.message));return}
 if(edit){vaultEdit(edit.dataset.vaultEdit).catch(err=>alert('編集できませんでした：'+err.message));return}
 if(del){if(!confirm('この端末から予約確認書と旅程への紐付けを削除しますか？'))return;vaultDelete(del.dataset.vaultDelete).then(bookingVaultRefresh).catch(err=>alert('削除できませんでした：'+err.message))}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')vaultDisposePreview()});
