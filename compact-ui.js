/* Compact UI experiment v2.6: no itinerary data migrations. */
const compactBottomNav=[['home','🏮','ホーム'],['schedule','🗓️','日程'],['map','📍','地図'],['budget','💴','予算'],['menu','☷','メニュー']];
const compactMenuGroups=[
 ['旅の準備',[['bookings','🎫','予約・航空便'],['packing','🧳','持ち物'],['tools','🧰','便利ツール']]],
 ['観光・現地',[['food','🥟','グルメ'],['more','🪭','お土産'],['phrase','🀄','中国語・翻訳'],['knowledge','🇨🇳','中国豆知識'],['safety','🆘','緊急連絡']]],
 ['記録・設定',[['expenses','🧾','支出・精算'],['manage','⚙️','旅行管理']]]
];
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
 const top=document.getElementById('compactToTop');if(top)top.hidden=true;
 const collapsiblePages=['food','more','knowledge','tools','budget','manage','home','schedule','phrase','packing','bookings','expenses'];
 if(collapsiblePages.includes(page)){
  [...container.querySelectorAll(':scope > section.panel')].forEach((section,i)=>{
   const head=section.querySelector(':scope > h2');
   if(!head||section.querySelector('form#railForm'))return;
   const heading=head.textContent.trim();
   // Keep summary and current itinerary immediately visible.
   if(page==='home'&&i<2)return;
   if(page==='schedule'&&heading==='日別スケジュール')return;
   if(page==='budget'&&i===0)return;
   if(page==='phrase'&&i===0)return;
   const details=document.createElement('details');details.className='compact-accordion panel';
   const summary=document.createElement('summary');summary.textContent=heading;details.appendChild(summary);
   head.remove();while(section.firstChild)details.appendChild(section.firstChild);
   section.replaceWith(details);
  });
 }
 if(page==='schedule'){
  const timeline=container.querySelector('section.panel:not(.compact-accordion) h2');
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
render();
