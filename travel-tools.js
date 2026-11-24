/* Travel tools: weather, PDF and taxi card interactions. Chinese address cards live in index.html. */
function travelToolsPanel(){
 return coreTaxiLocationPanel()+
 panel('<h2>🌦️ 上海・無錫の天気予報</h2><p class="muted">直近7日間のみ表示。年末年始の予報は旅行が近づいてから確認してください。通信が必要です。</p><div class="segment"><button class="ghost" data-weather="shanghai">上海の予報</button><button class="ghost" data-weather="wuxi">無錫の予報</button></div><div id="weatherResult" role="status">都市を選択すると予報を取得します。</div><p class="tiny-hint">提供：<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>。予報は最新の実測値や警報ではありません。</p>')+
 panel('<h2>📄 旅程PDF出力</h2><p class="muted">現在選択中の豫園通常／1月1日振替プランと、最新の計画予算を含む印刷版を作ります。「印刷」画面で「PDFとして保存」を選択してください。</p><button class="ghost" id="printTravelPlan">印刷・PDF保存画面を開く</button>');
}
function weatherDescription(code){
 if(code===0)return '快晴';if([1,2].includes(code))return '晴れ・時々曇り';if(code===3)return '曇り';if([45,48].includes(code))return '霧';if([51,53,55,56,57].includes(code))return '霧雨';if([61,63,65,66,67,80,81,82].includes(code))return '雨';if([71,73,75,77,85,86].includes(code))return '雪';if([95,96,99].includes(code))return '雷雨';return '不明';
}
function weatherResultMarkup(json,name){
 const daily=json&&json.daily;if(!daily||!Array.isArray(daily.time))throw Error('予報データ形式が不正です');
 const num=(key,i)=>daily[key]&&daily[key][i]!=null?Math.round(daily[key][i]):'—';
 return '<p class="muted">'+esc(name)+'の直近予報（中国時間）</p>'+daily.time.map((dt,i)=>'<div class="card"><strong>'+esc(dt)+' '+weatherDescription(num('weather_code',i))+'</strong><p>最高 '+num('temperature_2m_max',i)+'℃／最低 '+num('temperature_2m_min',i)+'℃・降水確率 '+num('precipitation_probability_max',i)+'%</p></div>').join('');
}
async function loadTripWeather(key){
 const el=document.getElementById('weatherResult'),cities={shanghai:['上海',31.2304,121.4737],wuxi:['無錫',31.4912,120.3119]},c=cities[key];if(!el||!c)return;
 el.textContent='予報を取得しています…';
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),10000);
 try{
  const u='https://api.open-meteo.com/v1/forecast?latitude='+c[1]+'&longitude='+c[2]+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FShanghai&forecast_days=7';
  const r=await fetch(u,{signal:ctrl.signal,cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();if(document.getElementById('weatherResult')===el)el.innerHTML=weatherResultMarkup(data,c[0]);
 }catch(err){if(document.getElementById('weatherResult')===el)el.textContent='天気を取得できませんでした。通信を確認して再試行してください。'+(err.name==='AbortError'?'（タイムアウト）':'');}
 finally{clearTimeout(timeout)}
}
function itineraryPrintableHtml(){
 const b=plannedBudget(),title=yuyuanPlanMode==='backup'?'予備：1/1豫園入園':'通常：12/30豫園入園';
 const sections=days.map((d,i)=>'<section><h2>'+esc(d.date)+'｜'+esc(yuyuanDayName(i))+'</h2><table><tr><th>時間</th><th>場所・予定</th><th>詳細</th></tr>'+yuyuanEvents(i).map(e=>'<tr><td>'+esc(e[0])+'</td><td>'+esc(e[1])+'</td><td>'+esc(e[2]||'')+'</td></tr>').join('')+'</table></section>').join('');
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>上海旅手帖｜旅程</title><style>body{font-family:sans-serif;line-height:1.5;padding:20px;color:#222}h1{color:#973f3c}h2{font-size:18px;margin-top:24px;border-bottom:2px solid #a85d46}table{width:100%;border-collapse:collapse;font-size:11px}td,th{border:1px solid #ddd;padding:7px;vertical-align:top}td:first-child{white-space:nowrap}th{background:#eee}section{break-inside:avoid-page}button{padding:12px}@media print{button{display:none}body{padding:0}@page{size:A4;margin:12mm}}</style></head><body><button onclick="window.print()">印刷／PDFとして保存</button><h1>上海旅手帖・2026/12/30〜2027/1/2</h1><p>'+title+'　｜　宿泊：'+esc(hotel.zh)+'（'+esc(hotel.address)+'）</p><p>航空券・ホテルを除く予算：1人 '+b.low+'〜'+b.high+'元／2人 '+(b.low*2)+'〜'+(b.high*2)+'元</p>'+sections+'<p>※記載時刻は計画。営業・予約・交通は直前確認。個人の支出履歴や予約番号は出力しません。</p></body></html>';
}
function printTravelItinerary(){
 const win=window.open('','_blank');if(!win){alert('印刷ウィンドウが開けません。ポップアップを許可してください。');return}
 win.document.open();win.document.write(itineraryPrintableHtml());win.document.close();win.focus();
}
document.addEventListener('click',event=>{
 const w=event.target.closest('[data-weather]');if(w){loadTripWeather(w.dataset.weather);return}
 const t=event.target.closest('[data-taxi-show]');if(t){openChineseShow(t.dataset.taxiShow,'','タクシー運転手に見せてください');return}
 if(event.target.closest('#printTravelPlan'))printTravelItinerary();
});
