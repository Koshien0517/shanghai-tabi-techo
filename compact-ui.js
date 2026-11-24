/* Compact UI experiment v2.6: no itinerary data migrations. */
const compactBottomNav=[['home','🏮','ホーム'],['schedule','🧭','日程'],['food','🥟','グルメ'],['more','🪭','お土産'],['phrase','🀄','中国語'],['budget','💴','お金']];
const compactMenuGroups=[
 ['旅の準備',[['bookings','🎫','予約・航空便'],['packing','🧳','持ち物'],['tools','🧰','便利ツール']]],
 ['観光・現地',[['food','🥟','グルメ'],['more','🪭','お土産'],['phrase','🀄','中国語・翻訳'],['knowledge','🇨🇳','中国豆知識'],['safety','🆘','緊急連絡']]],
 ['記録・設定',[['expenses','🧾','支出・精算'],['manage','⚙️','旅行管理']]]
];

/* v2.7: six one-tap destinations; context-specific shortcuts preserve all 13 original functions. */
function directShortcuts(items){
 return '<div class="direct-shortcuts">'+items.map(([name,target,anchor,emoji])=>'<button type="button" class="direct-shortcut" data-direct-page="'+esc(target)+'"'+(anchor?' data-direct-anchor="'+esc(anchor)+'"':'')+'><span aria-hidden="true">'+esc(emoji)+'</span><strong>'+esc(name)+'</strong></button>').join('')+'</div>';
}
function homeShortcutPanel(){
 return panel('<h2>よく使う機能</h2><p class="muted">必要な機能へ直接移動できます。</p>'+directShortcuts([
 ['持ち物','packing','','🧳'],['入国・旅行情報','knowledge','','🇨🇳'],['天気予報','tools','天気予報','🌦️'],['乗車準備','bookings','','🚄'],
 ['旅程PDF','tools','旅程PDF','📄'],['予約確認','bookings','','🎫'],['支出記録','budget','支出','🧾'],['タクシー','tools','タクシー','🚕']
 ]));
}
function scheduleShortcutPanel(){
 return panel('<h2>日程に関連する機能</h2>'+directShortcuts([['予約・高鉄','bookings','','🎫'],['タクシー','tools','タクシー','🚕'],['天気','tools','天気予報','🌦️'],['旅程PDF','tools','旅程PDF','📄']]));
}
function phraseShortcutPanel(){return panel('<h2>現地で使う中国語</h2>'+directShortcuts([['タクシー用中国語','tools','タクシー','🚕']]));}
function unifiedMoneyPanel(){
 const mode=get('money-view').tab==='expenses'?'expenses':'plan';
 return panel('<h2>💴 旅行のお金</h2><div class="segment money-switch"><button type="button" data-money-tab="plan" class="'+(mode==='plan'?'active':'')+'">🧧 予算・残額</button><button type="button" data-money-tab="expenses" class="'+(mode==='expenses'?'active':'')+'">🧾 支出・精算</button></div>')+(mode==='plan'?(selectedTrip()===MAIN_TRIP?budgetAssistantPanel()+spendingOverview()+budgetPanel():spendingOverview()):spendingOverview()+expensePanel()+splitPanel());
}
function directGo(pageId,anchor){
 if(pageId==='budget'&&anchor==='支出')set('money-view',{tab:'expenses'});
 jump(pageId);
 if(anchor&&!(pageId==='budget'&&anchor==='支出')){
  const sections=[...document.querySelectorAll('#content section.panel, #content details.compact-accordion')];
  const match=sections.find(el=>{
   const title=el.querySelector(':scope > h2,:scope > summary');return title&&title.textContent.includes(anchor);
  });
  if(match){
   if(match.tagName==='DETAILS')match.open=true;
   match.scrollIntoView({behavior:'smooth',block:'start'});
  }
 }
}
function compactPinnedActions(){
 let root=document.getElementById('compactPinnedActions');
 if(root)return;
 root=document.createElement('div');root.id='compactPinnedActions';
 root.innerHTML='<button type="button" data-pin-go="safety" aria-label="緊急連絡先を開く">🆘 <span>緊急</span></button><button type="button" data-pin-go="manage" aria-label="設定と旅行管理を開く">⚙️ <span>設定</span></button>';
 document.body.appendChild(root);
 root.querySelectorAll('[data-pin-go]').forEach(b=>b.onclick=()=>jump(b.dataset.pinGo));
}

function compactMenuPanel(){
 return panel('<h2>🔎 アプリ内検索</h2><label for="compactSearch">旅程・観光・飲食・お土産・中国語を探す</label><input type="search" id="compactSearch" placeholder="例：豫園、無錫、ホテル、小籠包" autocomplete="off"><div id="compactSearchResults" role="status"></div><p class="tiny-hint">検索は端末内の登録情報を対象にしています。公開サイトや地図全体を検索するものではありません。</p>')+
 compactMenuGroups.map(([heading,links])=>panel('<h2>'+heading+'</h2><div class="compact-menu-grid">'+links.map(([id,icon,name])=>'<button class="ghost compact-menu-item" data-compact-go="'+id+'"><span aria-hidden="true">'+icon+'</span><strong>'+name+'</strong> <span aria-hidden="true">›</span></button>').join('')+'</div>')).join('');
}
function compactMapPanel(){
 const points=[['ホテル',hotel.zh+' '+hotel.address],['豫園','豫园 上海'],['上海書城','上海书城 福州路465号'],['外灘','外滩 上海'],['上海タワー','上海中心大厦 上海'],['上海駅','上海火车站 上海'],['無錫駅','无锡站 无锡'],['恵山古鎮','惠山古镇 无锡'],['寄暢園','寄畅园 无锡'],['南長街','南长街 无锡']];
 return panel('<h2>📍 目的地ショートカット</h2><p class="muted">地図を開く、または現在地からルートを検索できます。中国国内では高徳地図が便利です。</p>'+points.map(([name,query])=>'<div class="card compact-map-point"><strong>'+esc(name)+'</strong>'+mapPickButton(query,'地図で確認')+'</div>').join(''));
}
function compactCatalog(){
 const all=[];
 const add=(page,name,detail)=>{if(name&&typeof name==='string')all.push({page,name,detail:String(detail||'')})};
 days.forEach((d,i)=>yuyuanEvents(i).forEach(e=>add('schedule',e[1],d.date+' '+(e[2]||''))));
 if(typeof foodDetails!=='undefined')foodDetails.forEach(e=>add('food',e[0],e[1]+' '+e[2]));
 if(typeof extraFoodDetails!=='undefined')extraFoodDetails.forEach(e=>add('food',e[0],e[1]+' '+e[2]));
 if(typeof giftDetails!=='undefined')giftDetails.forEach(e=>add('more',e[0],e[1]+' '+e[2]));
 if(typeof extraGiftDetails!=='undefined')extraGiftDetails.forEach(e=>add('more',e[0],e[1]+' '+e[2]));
 if(typeof phraseGroups!=='undefined')phraseGroups.forEach(group=>group[1].forEach(e=>add('phrase',e[2],e[0]+' '+e[1])));
 add('map','ホテル',hotel.zh+' '+hotel.address);
 add('tools','タクシー用中国語','ホテル 目的地 住所');
 add('tools','天気予報','上海 無錫');
 add('tools','旅程PDF','旅程 保存 印刷');
 return all;
}
function compactSearch(query){
 const q=String(query).normalize('NFKC').trim().toLocaleLowerCase();
 if(!q)return [];
 return compactCatalog().filter(x=>(x.name+' '+x.detail).normalize('NFKC').toLocaleLowerCase().includes(q)).slice(0,25);
}
function compactRenderResults(query){
 const box=document.getElementById('compactSearchResults');if(!box)return;
 const results=compactSearch(query);
 if(!query.trim()){box.innerHTML='';return}
 box.innerHTML=results.length?results.map((r,i)=>'<button class="ghost compact-search-hit" data-compact-result="'+i+'"><strong>'+esc(r.name)+'</strong><small>'+esc(({schedule:'日程',food:'グルメ',more:'お土産',phrase:'中国語',map:'地図',tools:'便利'}[r.page]||r.page))+'</small></button>').join(''):'<p class="muted">一致する項目がありません。</p>';
 box.querySelectorAll('[data-compact-result]').forEach(b=>b.onclick=()=>{
  const item=results[Number(b.dataset.compactResult)];if(!item)return;
  if(item.page==='schedule'){const idx=days.findIndex((d,i)=>yuyuanEvents(i).some(e=>e[1]===item.name));if(idx>=0)day=idx}
  jump(item.page);
  // Search the rendered text, not an external search provider.
  const targets=[...document.querySelectorAll('#content .card,#content .panel')];
  const match=targets.find(el=>el.textContent.includes(item.name));if(match){let parent=match.closest('details');if(parent)parent.open=true;match.scrollIntoView({behavior:'smooth',block:'center'});}
 });
}
function compactEnhance(){
 const container=document.getElementById('content');if(!container)return;
 document.querySelectorAll('[data-compact-go]').forEach(b=>b.onclick=()=>jump(b.dataset.compactGo));
 const search=document.getElementById('compactSearch');if(search)search.oninput=()=>compactRenderResults(search.value);
 const nav=document.getElementById('nav');if(nav)nav.setAttribute('aria-label','主要メニュー');
 const top=document.getElementById('compactToTop');if(top)top.hidden=window.scrollY<450;
 document.querySelectorAll('[data-direct-page]').forEach(b=>b.onclick=()=>directGo(b.dataset.directPage,b.dataset.directAnchor||''));
 document.querySelectorAll('[data-money-tab]').forEach(b=>b.onclick=()=>{set('money-view',{tab:b.dataset.moneyTab});render()});
 compactPinnedActions();
 const collapsiblePages=['food','more','knowledge','tools','budget','manage','home','schedule','phrase','packing','bookings','expenses'];
 if(collapsiblePages.includes(page)){
  [...container.querySelectorAll(':scope > section.panel')].forEach((section,i)=>{
   const head=section.querySelector(':scope > h2');
   if(!head||section.querySelector('form#railForm'))return;
   const heading=head.textContent.trim();
   // Keep summary and current itinerary immediately visible.
   if(page==='home'&&i<3)return;
   if((page==='food'||page==='more'||page==='knowledge')&&i===0)return;
   if(page==='schedule'&&(heading==='日別スケジュール'||heading.includes('関連する機能')))return;
   if(page==='budget'&&i<2)return;
   if(page==='phrase'&&i===0)return;
   const details=document.createElement('details');details.className='compact-accordion panel';
   const summary=document.createElement('summary');summary.textContent=heading;details.appendChild(summary);
   head.remove();while(section.firstChild)details.appendChild(section.firstChild);
   section.replaceWith(details);
  });
 }
 if(page==='schedule'){
  // Keep the itinerary switcher visible without hiding the scheduled stops.
  let host=[...container.querySelectorAll('section.panel')].find(el=>el.querySelector(':scope > h2')?.textContent.includes('日別スケジュール'));
  if(host){
   const controls=document.createElement('div');controls.className='compact-view-control';
   const current=get('compact-view').value==='detail'?'detail':'compact';
   controls.innerHTML='<strong>旅程の表示</strong><button type="button" data-compact-view="compact" class="'+(current==='compact'?'active':'')+'">簡易</button><button type="button" data-compact-view="detail" class="'+(current==='detail'?'active':'')+'">詳細</button>';
   host.querySelector('h2').insertAdjacentElement('afterend',controls);
   host.classList.toggle('itinerary-compact',current==='compact');
   host.querySelectorAll(':scope > .card').forEach(el=>{
    if(el.querySelector('span.time')){el.classList.add('compact-event');el.addEventListener('click',e=>{if(e.target.closest('button,a,input'))return;if(host.classList.contains('itinerary-compact'))el.classList.toggle('expanded')})}
   });
   controls.querySelectorAll('[data-compact-view]').forEach(b=>b.onclick=()=>{set('compact-view',{value:b.dataset.compactView});render()});
  }
 }
}
function compactTopButtonSetup(){
 if(document.getElementById('compactToTop'))return;
 const button=document.createElement('button');button.id='compactToTop';button.type='button';button.textContent='↑';button.setAttribute('aria-label','ページの先頭へ戻る');button.hidden=true;
 button.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});document.body.appendChild(button);
 const update=()=>{button.hidden=window.scrollY<450};window.addEventListener('scroll',update,{passive:true});update();
}
compactTopButtonSetup();
compactPinnedActions();
render();
