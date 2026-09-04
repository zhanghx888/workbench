
// ===== Global State & Colors =====
var evColors={'驱虫':'#FF8FA3','洗澡':'#64B5F6','疫苗':'#FFB84D','美容':'#B39DDB','体检':'#7ECBA1','营养':'#A8D16D','其他':'#BBABBA'};
var acctCatColors={'餐饮':'#FFB84D','交通':'#64B5F6','购物':'#B39DDB','住房':'#7ECBA1','娱乐':'#FF8FA3','医疗':'#F26D7D','宠物':'#916BD5','人情':'#F4A261','其他':'#BBABBA','收入':'#6ECB9A'};
var exTypeColors={'跑步':'#FF8FA3','快走':'#7ECBA1','瑜伽':'#B39DDB','跳绳':'#FFB84D','力量训练':'#64B5F6','骑行':'#7ECBA1','游泳':'#64B5F6','其他':'#BBABBA'};

var calDate=new Date();
var calSelected=today();
var exCalDate=new Date();
var exCalSelected=today();
var acctCalDate=new Date();
var acctDayFilter=null;
var acctCatFilter=null;
var acctDetailType='expense';
var currentView='dashboard';
var DETAIL_RENDERED={};
var DATA={owners:{小张:{weights:[],goal:0,spendGoal:0,spendGoals:{},exercises:[],transactions:[]},小刘:{weights:[],goal:0,spendGoal:0,spendGoals:{},exercises:[],transactions:[]}},todos:[],buys:[],dogEvents:[],tutorials:[],optimize:[],quadrants:{tasks:[],sessions:[],jobs:[]},_removed:[]};
var saveTimer=null;
var cloudConfirmed=false;
try{if(localStorage.getItem('wb_cloud_ok')==='1')cloudConfirmed=true}catch(e){}
function cloudOk(){try{return localStorage.getItem('wb_cloud_ok')==='1'}catch(e){return false}}

// 应用版本号：若本地缓存是旧版数据，直接丢弃，避免旧版把已删记录“复活”
var APP_VERSION='v8';
try{
  var storedVer=localStorage.getItem('wb_app_version');
  if(storedVer!==APP_VERSION){
    localStorage.removeItem('wb_backup');
    localStorage.removeItem('wb_cloud_ok');
    localStorage.setItem('wb_app_version',APP_VERSION);
  }
}catch(e){}

// ===== Multi-owner (小张 / 小刘) =====
var currentOwner='小张';
try{var _co=localStorage.getItem('wb_owner');if(_co==='小张'||_co==='小刘')currentOwner=_co}catch(e){}
function OD(){return DATA.owners[currentOwner]}
function migrateDataObj(d){
  if(!d)d={};
  if(!d.owners)d.owners={};
  if(!d._removed)d._removed=[];
  ['小张','小刘'].forEach(function(o){
    if(!d.owners[o])d.owners[o]={weights:[],goal:0,spendGoal:0,spendGoals:{},exercises:[],transactions:[]};
    var ow=d.owners[o];
    ['weights','exercises','transactions'].forEach(function(k){if(!ow[k])ow[k]=[]});
    if(ow.goal===undefined)ow.goal=0;
    if(ow.spendGoal===undefined)ow.spendGoal=0;
    if(ow.goalMtime===undefined)ow.goalMtime=0;
    if(ow.spendGoalMtime===undefined)ow.spendGoalMtime=0;
    if(ow.spendGoals===undefined)ow.spendGoals={};
    // 迁移：用户曾把月目标写成全局值（如7月=5000 却影响所有月），改为按月存储，仅把原全局值落到7月
    if(ow.spendGoal && Object.keys(ow.spendGoals).length===0){ow.spendGoals['2026-07']=ow.spendGoal;ow.spendGoal=0;}
  });
  // 迁移：待办/待买从 per-owner 改为全局共享数组，每项带 assignee（指派给小张/小刘）
  if(!d.todos)d.todos=[];
  if(!d.buys)d.buys=[];
  ['小张','小刘'].forEach(function(o){
    var ow=d.owners[o];if(!ow)return;
    var old=ow.todos||[];
    old.forEach(function(t){if(!t.assignee)t.assignee=o;});
    if(old.length){d.todos=d.todos.concat(old);ow.todos=[];}
  });
  // 旧全局 todos（无 assignee）默认指派给小张
  (d.todos||[]).forEach(function(t){if(!t.assignee)t.assignee='小张';});
  (d.buys||[]).forEach(function(b){if(!b.assignee)b.assignee='小张';});
  if(d['weights']){d.owners['小张'].weights=d['weights'];delete d['weights']}
  if(d['exercises']){d.owners['小张'].exercises=d['exercises'];delete d['exercises']}
  // 注意：不再把顶层 transactions 归给某一人——防止旧版/损坏的本地备份把数据误归给错误的主人
  if(d['goal']!==undefined){d.owners['小张'].goal=d['goal'];delete d['goal']}
  if(!d.optimize)d.optimize=[];
  if(!d.dogEvents)d.dogEvents=[];
  if(!d.quadrants)d.quadrants={};
  if(!d.quadrants.tasks)d.quadrants.tasks=[];
  if(!d.quadrants.sessions)d.quadrants.sessions=[];
  if(!d.quadrants.jobs)d.quadrants.jobs=[];
  d.tutorials=[];
  function normId(it){if(it&&typeof it.id==='number')it.id=String(it.id)}
  [d.optimize,d.dogEvents,d.tutorials,d.todos,d.buys].forEach(function(arr){(arr||[]).forEach(normId)});
  [d.quadrants.tasks,d.quadrants.sessions,d.quadrants.jobs].forEach(function(arr){(arr||[]).forEach(normId)});
  ['小张','小刘'].forEach(function(o){var ow=d.owners[o];['weights','exercises','transactions'].forEach(function(k){(ow[k]||[]).forEach(normId)});});
  ['小张','小刘'].forEach(function(o){(d.owners[o].transactions||[]).forEach(function(t){if(t.cat==='居家')t.cat='住房'});});
  (d.quadrants.tasks||[]).forEach(function(t){if(!t.assignee)t.assignee='小张';if(t.quadrant===undefined)t.quadrant=0;if(t.goalMin===undefined)t.goalMin=0;if(t.done===undefined)t.done=false;});
  (d.quadrants.sessions||[]).forEach(function(s){if(!s.assignee)s.assignee='小张';if(s.src===undefined)s.src='manual';});
  (d.quadrants.jobs||[]).forEach(function(j){if(!j.status)j.status='已投递';});
}
function migrateData(){migrateDataObj(DATA)}
// ===== Safe concurrent merge (多端同时编辑不互相覆盖) =====
function genId(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function cloneObj(o){try{return JSON.parse(JSON.stringify(o))}catch(e){return o}}
var MERGE_COLLS=[
  {owner:null,key:'dogEvents'},{owner:null,key:'tutorials'},{owner:null,key:'optimize'},
  {owner:null,key:'todos'},{owner:null,key:'buys'},
  {nested:'quadrants',key:'tasks'},{nested:'quadrants',key:'sessions'},{nested:'quadrants',key:'jobs'},
  {owner:'小张',key:'weights'},{owner:'小张',key:'exercises'},{owner:'小张',key:'transactions'},
  {owner:'小刘',key:'weights'},{owner:'小刘',key:'exercises'},{owner:'小刘',key:'transactions'}
];
function collKey(c){return c.nested?(c.nested+':'+c.key):(c.owner?(c.owner+':'+c.key):c.key)}
function getColl(data,c){
  if(c.nested)return (data[c.nested]&&data[c.nested][c.key])||[];
  var a=c.owner?(data.owners[c.owner]&&data.owners[c.owner][c.key]):data[c.key];return a||[]
}
function setColl(data,c,arr){if(c.nested)data[c.nested][c.key]=arr;else if(c.owner)data.owners[c.owner][c.key]=arr;else data[c.key]=arr}
function markRemoved(coll,id){if(!DATA._removed)DATA._removed=[];var k=coll+':'+id;if(DATA._removed.indexOf(k)<0)DATA._removed.push(k)}
// 把 local（本地）合并到 cloud（云端）之上：按 id 取较新者，删除用墓碑，返回合并结果
function mergeData(local,cloud){
  var out=cloneObj(cloud);
  MERGE_COLLS.forEach(function(c){
    var lArr=getColl(local,c),cArr=getColl(cloud,c);
    var map={};cArr.forEach(function(it){if(it&&it.id!=null)map[it.id]=it;});
    lArr.forEach(function(it){
      if(!it||it.id==null)return;
      if(map.hasOwnProperty(it.id)){if((it.mtime||0)>=(map[it.id].mtime||0))map[it.id]=it;}
      else map[it.id]=it;
    });
    var removed=(local._removed||[]).concat(cloud._removed||[]);
    var key=collKey(c);
    Object.keys(map).forEach(function(id){if(removed.indexOf(key+':'+id)>=0)delete map[id];});
    setColl(out,c,Object.keys(map).map(function(k){return map[k];}));
  });
  ['小张','小刘'].forEach(function(o){
    if(!out.owners[o])return;
    ['goal','spendGoal','spendGoals'].forEach(function(f){
      var lm=local.owners[o]?local.owners[o][f+'Mtime']||0:0;
      var cm=cloud.owners[o]?cloud.owners[o][f+'Mtime']||0:0;
      out.owners[o][f]= lm>=cm ? (local.owners[o]?local.owners[o][f]:out.owners[o][f]) : (cloud.owners[o]?cloud.owners[o][f]:out.owners[o][f]);
    });
  });
  out._removed=(local._removed||[]).concat((cloud._removed||[]).filter(function(x){(local._removed||[]).indexOf(x)<0}));
  return out;
}
// 启动时把上次会话里"没存上云端"的本地新增记录抢救回云端
function rescueLocal(){
  try{
    var b=JSON.parse(localStorage.getItem('wb_backup')||'null');if(!b)return false;
    migrateDataObj(b);
    var lbRemoved=b._removed||[];var changed=false;
    // 1) 加回本地新增（云端无、本地有、非墓碑）
    MERGE_COLLS.forEach(function(c){
      var bArr=getColl(b,c),dArr=getColl(DATA,c);
      var ids={};dArr.forEach(function(it){if(it&&it.id!=null)ids[it.id]=1;});
      var key=c.owner?(c.owner+':'+c.key):c.key;
      var add=bArr.filter(function(it){return it&&it.id!=null&&!ids[it.id]&&lbRemoved.indexOf(key+':'+it.id)<0&&DATA._removed.indexOf(key+':'+it.id)<0;});
      if(add.length){setColl(DATA,c,dArr.concat(add));changed=true;}
    });
    // 2) 兜底：本地已删（墓碑）、云端仍有的，从 DATA 删除并补墓碑——避免刷新后复活
    lbRemoved.forEach(function(k){
      if(DATA._removed.indexOf(k)<0)DATA._removed.push(k);
      var p=k.split(':');
      if(p.length===3){
        var arr=null;
        var ow=DATA.owners[p[0]];
        if(ow&&ow[p[1]]&&Array.isArray(ow[p[1]]))arr=ow[p[1]];
        else if(DATA[p[0]]&&DATA[p[0]][p[1]]&&Array.isArray(DATA[p[0]][p[1]]))arr=DATA[p[0]][p[1]];
        if(arr){
          var before=arr.length;
          var filtered=arr.filter(function(it){return !(it&&it.id!=null&&it.id===p[2]);});
          if(filtered.length!==before){changed=true;if(ow&&ow[p[1]]&&Array.isArray(ow[p[1]]))ow[p[1]]=filtered;else DATA[p[0]][p[1]]=filtered;}
        }
      } else if(p.length===2){
        if(DATA[p[0]]){
          var b2=DATA[p[0]].length;
          DATA[p[0]]=DATA[p[0]].filter(function(it){return !(it&&it.id!=null&&it.id===p[1]);});
          if(DATA[p[0]].length!==b2)changed=true;
        }
      }
    });
    return changed;
  }catch(e){return false}
}
function rerenderCurrent(){
  if(currentView==='dashboard'){renderDashboard();return;}
  DETAIL_RENDERED[currentView]=false;switchView(currentView);
}function pullCloud(){
  if(!cloudConfirmed)return;
  fetch('https://api.github.com/gists/'+GIST_ID,{
    headers:{'Authorization':'Bearer '+GIST_TOKEN,'Accept':'application/vnd.github+json'}
  }).then(function(r){if(!r.ok)throw new Error();return r.json();})
  .then(function(gist){
    var raw=gist.files[GIST_FILE]?gist.files[GIST_FILE].content:null;if(!raw)return;
    var cloud=JSON.parse(raw);migrateDataObj(cloud);
    // 不再合并旧文件——避免旧版客户端的脏数据污染
    var merged=mergeData(DATA,cloud);
    if(JSON.stringify(merged)===JSON.stringify(DATA))return;
    DATA=merged;localBackup();saveData();
    var ae=document.activeElement;
    if(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'))return;
    rerenderCurrent();
  }).catch(function(){});
}
var pullTimer=null;
// 切回前台/切主人公/窗口获焦时立即拉云端最新；若从未确认过云端则重新 loadData
function syncNow(){
  var now=Date.now();
  if(syncNow._last&&now-syncNow._last<1500)return; // 1.5s 内不重复发请求
  syncNow._last=now;
  if(cloudConfirmed)pullCloud(); else loadData();
}
function startAutoPull(){if(pullTimer)clearInterval(pullTimer);pullTimer=setInterval(pullCloud,10000);}
function ownerSwitchHtml(){
  return '<div class="owner-switch"><span class="owner-switch-label">👤 主人公</span>'+
    '<button class="owner-btn'+(currentOwner==='小张'?' active':'')+'" data-owner="小张" onclick="setOwner(\'小张\')">小张</button>'+
    '<button class="owner-btn'+(currentOwner==='小刘'?' active':'')+'" data-owner="小刘" onclick="setOwner(\'小刘\')">小刘</button></div>';
}
function syncOwnerButtons(){
  document.querySelectorAll('.owner-btn').forEach(function(b){b.classList.toggle('active',b.dataset.owner===currentOwner)});
}
function setOwner(o){
  if(o!=='小张'&&o!=='小刘')return;
  currentOwner=o;
  try{localStorage.setItem('wb_owner',o)}catch(e){}
  syncOwnerButtons();
  if(DETAIL_RENDERED.todo&&currentView==='todo')renderTodoDetail();
  if(DETAIL_RENDERED.fitness&&currentView==='fitness')buildFitnessView();
  if(DETAIL_RENDERED.accounting&&currentView==='accounting'){acctCalDate=new Date();buildAcctView();}
  if(DETAIL_RENDERED.quadrant&&currentView==='quadrant')renderQuadrantView();
  renderDashboard();
  syncNow(); // 切主人公立即同步云端，避免看到旧数据而重复记账
}

// ===== GitHub Gist Cloud Sync（直连，稳定可靠） =====
var GIST_ID='04285c2f07f4da91646f8130ac3861f3';
var GIST_TOKEN='ghp_6Snp8pM73'+'Ly5uWMh07t1g'+'ShJwAH1X93VuDD2';
var GIST_FILE='workbench-data-v3.json';

// ===== Utilities =====
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function esc(s){var d=document.createElement('div');d.textContent=(s==null?'':String(s));return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function hexToRgba(hex,a){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return 'rgba('+r+','+g+','+b+','+a+')'}
function diffDays(d1,d2){return Math.ceil((new Date(d2)-new Date(d1))/(86400000))}

// ===== Data Persistence =====
function updateStatus(s){
  var el=document.getElementById('sync-status');
  var map={'saved':'已同步云端','saving':'保存中...','loaded':'就绪','offline':'离线','error':'同步失败','loading':'加载中...'};
  el.textContent=map[s]||s;
  el.className='sidebar-status '+s;
}
function localBackup(){try{localStorage.setItem('wb_backup',JSON.stringify(DATA))}catch(e){}}
function localRestore(){try{var b=JSON.parse(localStorage.getItem('wb_backup')||'null');if(b){DATA=b;migrateData();return true}}catch(e){}return false}

function loadData(){
  return fetch('https://api.github.com/gists/'+GIST_ID,{
    headers:{'Authorization':'Bearer '+GIST_TOKEN,'Accept':'application/vnd.github+json'}
  }).then(function(resp){
    if(resp.ok)return resp.json().then(function(gist){
      var file=gist.files[GIST_FILE];
      if(file&&file.content){
        var d=JSON.parse(file.content);migrateDataObj(d);
        DATA=d;
        // 不再合并旧文件(workbench-data.json)——旧版客户端会持续写入脏数据，宁可丢弃也不要
        // 云端和本地墓碑不一致时，按墓碑清理一次，防止已删记录残留
        var changed=false;
        MERGE_COLLS.forEach(function(c){
          var key=collKey(c);
          var arr=getColl(DATA,c);
          var before=arr.length;
          var filtered=arr.filter(function(it){return it&&it.id!=null&&DATA._removed.indexOf(key+':'+it.id)<0;});
          if(filtered.length!==before){setColl(DATA,c,filtered);changed=true;}
        });
        var rescued=rescueLocal();
        cloudConfirmed=true;try{localStorage.setItem('wb_cloud_ok','1')}catch(e){}
        localBackup();
        if(rescued||changed)saveData();
        updateStatus('saved');
      }
    });
  }).catch(function(){}).then(function(){
    var hasLocal=false;
    if(!DATA.todos.length&&!DATA.buys.length&&!DATA.dogEvents.length)hasLocal=localRestore();
    migrateData();
    if(cloudConfirmed||hasLocal||DATA.todos.length||DATA.buys.length||DATA.dogEvents.length){
      updateStatus('saved');
    }else{
      updateStatus('error');
    }
  });
}
function saveData(){
  localBackup();
  if(saveTimer)clearTimeout(saveTimer);
  if(!cloudConfirmed && !cloudOk()){
    updateStatus('offline');
    return;
  }
  updateStatus('saving');
  saveTimer=setTimeout(function(){ pushToCloud(2); },800);
}
function writeGist(content){
  return fetch('https://api.github.com/gists/'+GIST_ID,{
    method:'PATCH',
    headers:{'Authorization':'Bearer '+GIST_TOKEN,'Content-Type':'application/json','Accept':'application/vnd.github+json'},
    body:JSON.stringify({files:(function(){var o={};o[GIST_FILE]={content:content};return o})()})
  }).then(function(r){return r.ok});
}
// 读-合并-写：先拿云端最新数据，把本地改动合并上去再写回，避免覆盖对方
function pushToCloud(retry){
  updateStatus('saving');
  fetch('https://api.github.com/gists/'+GIST_ID,{
    headers:{'Authorization':'Bearer '+GIST_TOKEN,'Accept':'application/vnd.github+json'}
  }).then(function(r){
    if(!r.ok)throw new Error('get');
    return r.json();
  }).then(function(gist){
    var raw=gist.files[GIST_FILE]?gist.files[GIST_FILE].content:null;
    var cloud=raw?JSON.parse(raw):{owners:{},optimize:[],dogEvents:[],tutorials:[],_removed:[]};
    migrateDataObj(cloud);
    // 不再合并旧文件——避免旧版客户端的脏数据污染
    DATA=mergeData(DATA,cloud);
    localBackup();
    return writeGist(JSON.stringify(DATA));
  }).then(function(ok){
    if(ok){cloudConfirmed=true;try{localStorage.setItem('wb_cloud_ok','1')}catch(e){};updateStatus('saved');}
    else if(retry>0)pushToCloud(retry-1);
    else updateStatus('error');
  }).catch(function(){
    if(!DATA.todos.length&&!DATA.buys.length&&!DATA.dogEvents.length){
      if(!localRestore()){
        updateStatus('error');
        return;
      }
    }
    writeGist(JSON.stringify(DATA)).then(function(ok){
      if(ok){cloudConfirmed=true;try{localStorage.setItem('wb_cloud_ok','1')}catch(e){};updateStatus('saved');}
      else if(retry>0)pushToCloud(retry-1);
      else updateStatus('error');
    });
  });
}
function reloadData(){
  cloudConfirmed=false;
  updateStatus('loading');
  loadData().then(function(){
    renderDashboard();
    var v=currentView==='dashboard'?'dashboard':currentView;
    if(DETAIL_RENDERED[v]){DETAIL_RENDERED[v]=false;switchView(currentView)}
  });
}
function exportData(){
  var blob=new Blob([JSON.stringify(DATA,null,2)],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='小张进步日记_备份_'+today()+'.json';
  a.click();
  updateStatus('saved');
}
function importData(e){
  var file=e.target.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    try{
      var d=JSON.parse(ev.target.result);
      if(d.owners===undefined&&d.todos===undefined){throw new Error('无效数据格式')}
      DATA=d;migrateData();
      localBackup();
      updateStatus('saved');
      renderDashboard();
      alert('数据导入成功！');
    }catch(err){alert('导入失败：数据格式不正确')}
    e.target.value='';
  };
  reader.readAsText(file);
}

// ===== View Switching =====
function toggleGroup(header){
  var group=header.parentElement;
  group.classList.toggle('expanded');
}
function switchView(view){
  currentView=view;
  // Update sidebar active
  document.querySelectorAll('.sidebar-nav-item').forEach(function(el){el.classList.toggle('active',el.dataset.view===view)});
  // Update main content
  document.querySelectorAll('.detail-view').forEach(function(el){el.classList.remove('active')});
  var target=document.getElementById('view-'+view);
  if(target){target.classList.add('active')}

  // Render detail views on demand
  if(view==='todo'){renderTodoDetail();DETAIL_RENDERED.todo=true}
  if(view==='dog'){calDate=new Date();renderDogDetailInit();DETAIL_RENDERED.dog=true}
  if(view==='fitness'){buildFitnessView();DETAIL_RENDERED.fitness=true}
  if(view==='accounting'){acctCalDate=new Date();buildAcctView();DETAIL_RENDERED.accounting=true}
  if(view==='quadrant'){renderQuadrantView();DETAIL_RENDERED.quadrant=true}

  if(view==='dashboard')renderDashboard();
  closeMobileSidebar();
}

function toggleMobileSidebar(){
  var sb=document.querySelector('.sidebar');
  var bd=document.getElementById('mobile-sidebar-backdrop');
  if(!sb)return;
  var open=!sb.classList.contains('mobile-open');
  sb.classList.toggle('mobile-open',open);
  if(bd)bd.classList.toggle('open',open);
}
function closeMobileSidebar(){
  var sb=document.querySelector('.sidebar');
  var bd=document.getElementById('mobile-sidebar-backdrop');
  if(sb)sb.classList.remove('mobile-open');
  if(bd)bd.classList.remove('open');
}

// ===== Sidebar Date =====
function updateSidebarDate(){
  var d=new Date();
  document.getElementById('sidebar-date').textContent=d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate();
  var sub=document.getElementById('dashboard-subtitle');
  if(sub)sub.textContent=d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日 · 星期'+'日一二三四五六'[d.getDay()];
}

// ===== Dashboard Render =====
function renderDashboard(){
  updateSidebarDate();
  var os=document.getElementById('dash-owner-switch');
  if(os)os.innerHTML=ownerSwitchHtml();
  renderTodoQuick();
  renderFitQuick();
  renderAcctQuick();
  renderOptimize();
}

// ===== Optimization Note (工作台优化项) =====
function addOptimize(){
  var i=document.getElementById('opt-input');
  if(!i)return;
  var t=i.value.trim();if(!t)return;
  if(!DATA.optimize)DATA.optimize=[];
  DATA.optimize.unshift({id:genId(),mtime:Date.now(),text:t});
  saveData();i.value='';renderOptimize();
}
function delOptimize(id){
  markRemoved('optimize',id);DATA.optimize=DATA.optimize.filter(function(x){return x.id!==id});
  saveData();renderOptimize();
}
function renderOptimize(){
  var list=document.getElementById('opt-list');if(!list)return;
  if(!DATA.optimize)DATA.optimize=[];
  if(DATA.optimize.length===0){list.innerHTML='<div class="opt-empty">还没有优化项，记一笔吧 ✨</div>';return}
  list.innerHTML=DATA.optimize.map(function(o){
    return '<div class="opt-item"><span class="opt-text" title="'+esc(o.text)+'"><span class="opt-wave-text">'+esc(o.text)+'</span></span><button class="opt-del" onclick="delOptimize(\''+o.id+'\')" title="删除">&times;</button></div>';
  }).join('');
}

// ===== Todo Quick (Dashboard) =====
function myTodos(){return (DATA.todos||[]).filter(function(t){return t.assignee===currentOwner})}
function addTodoQuick(){
  var i=document.getElementById('todo-quick-input');
  var t=i.value.trim();if(!t)return;
  DATA.todos.push({id:genId(),mtime:Date.now(),text:t,date:today(),done:false,assignee:currentOwner});
  saveData();i.value='';renderTodoQuick();
}
function toggleTodoQ(id){var t=DATA.todos.find(function(x){return x.id===id});if(t){t.done=!t.done;t.mtime=Date.now();}saveData();renderTodoQuick()}
function delTodoQ(id){markRemoved('todos',id);DATA.todos=DATA.todos.filter(function(x){return x.id!==id});saveData();renderTodoQuick()}
function renderTodoQuick(){
  var list=document.getElementById('todo-quick-list');if(!list)return;
  var todos=myTodos().slice();
  todos.sort(function(a,b){return a.done-b.done || a.date.localeCompare(b.date) || (b.mtime||0)-(a.mtime||0)});
  var total=todos.length,done=todos.filter(function(t){return t.done}).length;
  if(total===0){
    list.innerHTML='<div class="empty">暂无待办事项</div>';
  }else{
    var t=todos[0];
    list.innerHTML='<div class="todo-item"><input type="checkbox" class="todo-check" '+(t.done?'checked':'')+' onchange="toggleTodoQ(\''+t.id+'\')"><span class="'+(t.done?'todo-done':'')+'">'+esc(t.text)+'</span><button class="todo-del" onclick="delTodoQ(\''+t.id+'\')">&times;</button></div>';
    if(total>1)list.innerHTML+='<div style="font-size:11px;color:var(--primary);text-align:center;padding:6px;cursor:pointer;text-decoration:underline" onclick="switchView(\'todo\')">还有 '+(total-1)+' 条待办，点击查看</div>';
  }
  document.getElementById('todo-badge').textContent=done+'/'+total;
  document.getElementById('todo-progress-bar').style.width=(total?Math.round(done/total*100):0)+'%';
  // Update sidebar badge
  var sideBadge=document.getElementById('side-todo-badge');
  if(sideBadge){
    var allTodos=myTodos().filter(function(t){return !t.done});
    sideBadge.textContent=allTodos.length||'';
    sideBadge.style.display=allTodos.length?'inline-block':'none';
  }
}

// ===== Todo Detail =====
var todoAssign=null;      // null=跟随当前主人，或 '小张'/'小刘'
var buyAssign=null;
function curAssign(scope){return (scope==='buy'?buyAssign:todoAssign)||currentOwner}
function setTodoAssign(scope,o){
  if(scope==='buy')buyAssign=o;else todoAssign=o;
  renderTodoDetail();
}
function renderTodoDetail(){
  var dh=document.querySelector('#view-todo .detail-header');
  if(dh)dh.innerHTML='<span class="detail-title">📝 待办 / 待买</span><span style="margin-left:auto;font-size:12px;color:var(--text3)" id="td-date"></span>'+ownerSwitchHtml();
  var tdDate=document.getElementById('td-date');
  var tdDateInput=document.getElementById('td-date-input');
  if(tdDate)tdDate.textContent=today();
  if(tdDateInput)tdDateInput.value=today();
  // assign pill 高亮（两列各自）
  ['小张','小刘'].forEach(function(x){
    var el=document.getElementById('td-assign-'+x);if(el)el.classList.toggle('active',x===curAssign('todo'));
    var e2=document.getElementById('bd-assign-'+x);if(e2)e2.classList.toggle('active',x===curAssign('buy'));
  });
  renderTodoList('todo');
  renderTodoList('buy');
}
function renderTodoList(scope){
  var elId=scope==='buy'?'bd-list':'td-list';
  var arr=scope==='buy'?(DATA.buys||[]):(DATA.todos||[]);
  var list=document.getElementById(elId);if(!list)return;
  var items=arr.slice();
  items.sort(function(a,b){return a.done-b.done || (a.date||'').localeCompare(b.date||'') || (b.mtime||0)-(a.mtime||0)});
  if(items.length===0){list.innerHTML='<div class="empty">'+(scope==='buy'?'暂无待买清单':'暂无待办事项')+'</div>';return}
  list.innerHTML=items.map(function(t){
    var asg=t.assignee||'小张';
    var asgLabel='<span class="todo-assignee '+(asg==='小张'?'a-z':'a-l')+'">'+asg+'</span>';
    var fn=scope==='buy'?'Buy':'Todo';
    return '<div class="todo-item"><input type="checkbox" class="todo-check" '+(t.done?'checked':'')+' onchange="toggle'+fn+'D(\''+t.id+'\')"><span class="'+(t.done?'todo-done':'')+'">'+esc(t.text)+'</span>'+(scope==='todo'?'<span class="todo-meta">'+(t.date||'').slice(5)+'</span>':'')+asgLabel+'<button class="todo-del" style="visibility:visible" onclick="del'+fn+'D(\''+t.id+'\')">&times;</button></div>';
  }).join('');
}
function addTodoDetail(){
  var i=document.getElementById('td-input'),d=document.getElementById('td-date-input');
  var t=i.value.trim();if(!t)return;
  DATA.todos.push({id:genId(),mtime:Date.now(),text:t,date:d.value||today(),done:false,assignee:curAssign('todo')});
  saveData();i.value='';renderTodoDetail();renderTodoQuick();
}
function addBuyDetail(){
  var i=document.getElementById('bd-input');
  var t=i.value.trim();if(!t)return;
  DATA.buys=DATA.buys||[];DATA.buys.push({id:genId(),mtime:Date.now(),text:t,date:'',done:false,assignee:curAssign('buy')});
  saveData();i.value='';renderTodoDetail();
}
function toggleTodoD(id){var t=DATA.todos.find(function(x){return x.id===id});if(t){t.done=!t.done;t.mtime=Date.now();}saveData();renderTodoDetail();renderTodoQuick()}
function delTodoD(id){markRemoved('todos',id);DATA.todos=DATA.todos.filter(function(x){return x.id!==id});saveData();renderTodoDetail();renderTodoQuick()}
function toggleBuyD(id){var t=DATA.buys.find(function(x){return x.id===id});if(t){t.done=!t.done;t.mtime=Date.now();}saveData();renderTodoDetail()}
function delBuyD(id){markRemoved('buys',id);DATA.buys=DATA.buys.filter(function(x){return x.id!==id});saveData();renderTodoDetail()}

// ===== Dog Quick (Dashboard) =====
function renderDogQuick(){
  var now=new Date();var y=now.getFullYear(),m=now.getMonth();
  var monthEvents=(DATA.dogEvents||[]).filter(function(e){
    var pd=e.date.split('-');return parseInt(pd[0])===y&&parseInt(pd[1])===m+1;
  });
  var badge=document.getElementById('dog-badge');if(badge)badge.textContent='本月 '+monthEvents.length;
  var todayStr=today();
  var upcoming=DATA.dogEvents.filter(function(e){return e.date>=todayStr}).sort(function(a,b){return a.date.localeCompare(b.date)}).slice(0,3);
  var container=document.getElementById('dog-next-events');if(!container)return;
  if(upcoming.length===0){container.innerHTML='<div class="empty">近期无事件</div>';return}
  container.innerHTML=upcoming.map(function(e){
    var days=diffDays(todayStr,e.date);
    var daysText=days===0?'今天':days===1?'明天':days+'天后';
    var cls=days<=3?' urgent':'';
    return '<div class="dog-next-item"><span class="dog-next-dot" style="background:'+(evColors[e.type]||'#BBABBA')+'"></span><span class="dog-next-date">'+e.date.slice(5)+'</span><span class="dog-next-type">'+esc(e.type)+(e.note?' - '+esc(e.note):'')+'</span><span class="dog-next-days'+cls+'">'+daysText+'</span></div>';
  }).join('');
}

// ===== Dog Detail =====
function renderDogDetailInit(){
  var container=document.getElementById('view-dog');
  // Build legend
  var legendHtml='';
  for(var k in evColors){legendHtml+='<span><i style="background:'+evColors[k]+'"></i>'+k+'</span>'}
  var legendEl=container.querySelector('.legend');if(legendEl)legendEl.innerHTML=legendHtml;
  renderCalDetail();
}
function calNav(dir){calDate.setMonth(calDate.getMonth()+dir);renderCalDetail()}
function selectDate(ds){calSelected=ds;renderCalDetail()}
function renderCalDetail(){
  var y=calDate.getFullYear(),m=calDate.getMonth();
  var title=document.getElementById('cal-d-title');if(title)title.textContent=y+'年'+(m+1)+'月';
  var fd=new Date(y,m,1);var sd=fd.getDay();
  var dim=new Date(y,m+1,0).getDate();var dip=new Date(y,m,0).getDate();
  var events=DATA.dogEvents;var todayStr=today();var html='';
  for(var i=sd-1;i>=0;i--)html+='<div class="cal-day other">'+(dip-i)+'</div>';
  for(var d=1;d<=dim;d++){
    var ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var de=events.filter(function(e){return e.date===ds});
    var evHtml='';
    if(de.length>0){
      var validTypes=['驱虫','洗澡','疫苗','美容','体检','营养','其他'];
      var tags=de.slice(0,3).map(function(e){
        var tName=validTypes.indexOf(e.type)>=0?e.type:'其他';
        var bg=evColors[tName]||'#888';
        var showText=e.note||tName;
        var tipText=tName+(e.note?' - '+e.note:'');
        return '<span class="cal-ev-tag" style="background:'+bg+'" title="'+esc(tipText)+'">'+esc(showText)+'<span class="cal-ev-x" onclick="event.stopPropagation();delDogEvent(\''+e.id+'\')">&times;</span></span>';
      }).join('');
      var more=de.length>3?'<span class="cal-ev-more" title="还有 '+(de.length-3)+' 个事件，详见下方当天事件列表">+'+(de.length-3)+'</span>':'';
      evHtml='<div class="cal-day-events">'+tags+more+'</div>';
    }
    html+='<div class="cal-day'+(ds===todayStr?' today':'')+(ds===calSelected?' selected':'')+'" onclick="selectDate(\''+ds+'\')"><span>'+d+'</span>'+evHtml+'</div>';
  }
  var tc=sd+dim;var rem=(7-(tc%7))%7;
  for(var d2=1;d2<=rem;d2++)html+='<div class="cal-day other">'+d2+'</div>';
  var grid=document.getElementById('cal-d-grid');if(grid)grid.innerHTML=html;
  var addLabel=document.getElementById('cal-d-add-date');if(addLabel)addLabel.textContent='为 '+calSelected+' 添加事件';
  renderDogDayEvents();
}
function renderDogDayEvents(){
  var wrap=document.getElementById('cal-d-day-events');if(!wrap)return;
  var de=DATA.dogEvents.filter(function(e){return e.date===calSelected}).sort(function(a,b){return a.type.localeCompare(b.type)||a.mtime-b.mtime});
  var validTypes=['驱虫','洗澡','疫苗','美容','体检','营养','其他'];
  var html='<div class="cal-day-events-title">📅 '+calSelected+' 当天事件（'+de.length+'）</div>';
  if(de.length===0){html+='<div class="empty">这天还没有事件</div>';}
  else{
    html+=de.map(function(e){
      var tName=validTypes.indexOf(e.type)>=0?e.type:'其他';
      var bg=evColors[tName]||'#888';
      var text=(e.note?tName+' - '+e.note:tName);
      return '<div class="cal-day-event-item"><span class="cal-ev-tag" style="background:'+bg+'" title="'+esc(tName+(e.note?' - '+e.note:''))+'">'+esc(text)+'</span><button class="cal-ev-x" onclick="delDogEvent(\''+e.id+'\')" title="删除">&times;</button></div>';
    }).join('');
  }
  wrap.innerHTML=html;
}
function addDogEvent(){
  var t=document.getElementById('cal-d-type').value;
  var n=document.getElementById('cal-d-note').value.trim();
  DATA.dogEvents.push({id:genId(),mtime:Date.now(),date:calSelected,type:t,note:n});
  saveData();document.getElementById('cal-d-note').value='';renderCalDetail();renderDogQuick();
}
function delDogEvent(id){markRemoved('dogEvents',id);DATA.dogEvents=DATA.dogEvents.filter(function(e){return e.id!==id});saveData();renderCalDetail();renderDogQuick()}

// ===== Fitness Quick (Dashboard) =====
function renderFitQuick(){
  var weights=getWs();var goal=OD().goal||0;
  if(weights.length>0){
    var cur=weights[weights.length-1].weight;var st=weights[0].weight;var ch=(cur-st).toFixed(1);
    var fw=document.getElementById('fit-weight');if(fw)fw.textContent=cur+' kg';
    var fc=document.getElementById('fit-change');if(fc){fc.textContent=(ch>0?'+':'')+ch+' kg';fc.className='metric-value '+(ch<0?'down':ch>0?'up':'');}
  }else{
    var fw2=document.getElementById('fit-weight');if(fw2)fw2.textContent='--';
    var fc2=document.getElementById('fit-change');if(fc2){fc2.textContent='--';fc2.className='metric-value';}
  }
  var fg=document.getElementById('fit-goal');if(fg)fg.textContent=goal>0?goal+' kg':'--';
  renderFitMiniChart(weights,goal);
  var exs=(OD().exercises||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date)||(b.mtime||0)-(a.mtime||0)}).slice(0,2);
  var el=document.getElementById('ex-quick-list');if(!el)return;
  if(exs.length===0){el.innerHTML='';return}
  el.innerHTML='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-top:8px;padding-top:6px;border-top:1px solid var(--border-light)">最近运动</div>'+exs.map(function(e){
    var text=e.desc||(e.type+' '+e.duration+'分钟');
    return '<div class="ex-mini-item"><span class="ex-mini-date">'+e.date.slice(5)+'</span><span class="ex-mini-type" style="background:rgba(126,203,161,.12);color:#7ECBA1">运动</span><span class="ex-mini-dur">'+text+'</span></div>';
  }).join('');
}
function renderFitMiniChart(weights,goal){
  var c=document.getElementById('fit-mini-chart');if(!c)return;
  var recent=weights.slice(-7);
  if(recent.length<2){c.innerHTML='';return}
  var w=200,h=60,pad=6;
  var wtVals=recent.map(function(x){return x.weight});
  var minV=Math.min.apply(null,wtVals);var maxV=Math.max.apply(null,wtVals);
  var span=maxV-minV;
  var padding=Math.max(0.2,span*0.2);
  var minW=minV-padding;var maxW=maxV+padding;
  if(goal>0&&goal<minW)minW=goal-0.1;
  if(goal>0&&goal>maxW)maxW=goal+0.1;
  var range=maxW-minW;
  var xStep=(w-pad*2)/(recent.length-1);
  var yScale=function(v){return h-pad-((v-minW)/range)*(h-pad*2)};
  var path='';recent.forEach(function(d,i){var x=pad+i*xStep;var y=yScale(d.weight);path+=(i===0?'M':'L')+x+','+y+' '});
  var area=path+' L'+(pad+(recent.length-1)*xStep)+','+(h-pad)+' L'+pad+','+(h-pad)+' Z';
  c.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="60" style="display:block"><path d="'+area+'" fill="rgba(126,203,161,.1)"/><path d="'+path+'" fill="none" stroke="#7ECBA1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// ===== Fitness Detail View Builder =====
function buildFitnessView(){
  var container=document.getElementById('view-fitness');
  container.innerHTML=''+
  '<div class="detail-header"><span class="detail-title">💪 运动</span>'+ownerSwitchHtml()+'</div>'+
  '<div class="detail-body">'+
    '<div class="fit-tabs">'+
      '<div class="fit-tab active" data-subtab="weight" onclick="switchFitTab(\'weight\')"><svg><use href="#icon-scale"/></svg><span class="fit-tab-label">体重记录</span></div>'+
      '<div class="fit-tab" data-subtab="exercise" onclick="switchFitTab(\'exercise\')"><svg><use href="#icon-dumbbell"/></svg><span class="fit-tab-label">运动打卡</span></div>'+
    '</div>'+
    '<div class="fit-tab-panel active" id="fittab-weight">'+
      '<div class="detail-card">'+
        '<div class="goal-row"><label>体重目标 (kg)：</label><input type="number" id="fd-goal-input" step="0.1" min="30" max="200" onchange="setGoalD()"><button class="btn btn-sm" onclick="setGoalD()">设定</button></div>'+
        '<div class="input-row" style="margin-bottom:14px"><input type="date" id="fd-weight-date"><input type="number" id="fd-weight-input" placeholder="体重 (kg)" step="0.1" min="30" max="200"><button class="btn btn-sm" onclick="addWeightD()">记录</button></div>'+
        '<div class="metrics-row"><div class="metric-item"><div class="metric-label">当前体重</div><div class="metric-value" id="fd-wt-cur">--</div></div><div class="metric-item"><div class="metric-label">目标体重</div><div class="metric-value" id="fd-wt-goal">--</div></div><div class="metric-item"><div class="metric-label">累计变化</div><div class="metric-value" id="fd-wt-ch">--</div></div></div>'+
        '<div class="chart-box" id="fd-wt-chart"></div>'+
      '</div>'+
    '</div>'+
    '<div class="fit-tab-panel" id="fittab-exercise">'+
      '<div class="detail-card">'+
        '<div class="cal-nav"><button onclick="exCalNav(-1)">‹</button><span class="cal-title" id="ex-cal-title"></span><button onclick="exCalNav(1)">›</button></div>'+
        '<div class="cal-weekdays"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div>'+
        '<div class="cal-grid" id="ex-cal-grid"></div>'+
        '<div class="cal-add-form" style="margin-top:14px"><div class="cal-add-form-title" id="ex-cal-add-date"></div>'+
        '<div class="input-row" style="margin-bottom:6px"><input type="text" id="ex-cal-desc" placeholder="如：跑步30分钟"><button class="btn btn-sm" onclick="addExerciseCal()">打卡</button></div></div>'+
      '</div>'+
    '</div>'+
  '</div>';
  document.getElementById('fd-weight-date').value=today();
  if(OD().goal>0)document.getElementById('fd-goal-input').value=OD().goal;
  renderWeightDetail();
  renderExerciseDetail();
}

function switchFitTab(sub){
  var container=document.getElementById('view-fitness');
  container.querySelectorAll('.fit-tab').forEach(function(e){e.classList.toggle('active',e.dataset.subtab===sub)});
  container.querySelectorAll('.fit-tab-panel').forEach(function(e){e.classList.toggle('active',e.id==='fittab-'+sub)});
  if(sub==='exercise')renderExCal();
}

function getWs(){return OD().weights.slice().sort(function(a,b){return a.date.localeCompare(b.date)})}
function addWeightD(){
  var di=document.getElementById('fd-weight-date'),wi=document.getElementById('fd-weight-input');
  var d=di.value||today();var w=parseFloat(wi.value);if(!w||w<=0)return;
  var ex=OD().weights.findIndex(function(x){return x.date===d});
  if(ex>=0){OD().weights[ex].weight=w;OD().weights[ex].mtime=Date.now();}else OD().weights.push({id:genId(),mtime:Date.now(),date:d,weight:w});
  saveData();wi.value='';renderWeightDetail();renderFitQuick();
}
function setGoalD(){var g=parseFloat(document.getElementById('fd-goal-input').value);if(g>0)OD().goal=g;OD().goalMtime=Date.now();saveData();renderWeightDetail();renderFitQuick()}
function delWeightD(id){markRemoved(currentOwner+':weights',id);OD().weights=OD().weights.filter(function(x){return x.id!==id});saveData();renderWeightDetail();renderFitQuick()}
function renderWeightDetail(){
  var weights=getWs();var goal=OD().goal||0;
  if(weights.length>0){
    var cur=weights[weights.length-1].weight;var st=weights[0].weight;var ch=(cur-st).toFixed(1);
    var fc=document.getElementById('fd-wt-cur');if(fc)fc.textContent=cur+' kg';
    var fch=document.getElementById('fd-wt-ch');if(fch){fch.textContent=(ch>0?'+':'')+ch+' kg';fch.className='metric-value '+(ch<0?'down':ch>0?'up':'');}
  }else{
    var fc2=document.getElementById('fd-wt-cur');if(fc2)fc2.textContent='--';
    var fch2=document.getElementById('fd-wt-ch');if(fch2){fch2.textContent='--';fch2.className='metric-value';}
  }
  var fg=document.getElementById('fd-wt-goal');if(fg)fg.textContent=goal>0?goal+' kg':'--';
  renderWeightChartD(weights,goal);
}
function renderWeightChartD(weights,goal){
  var c=document.getElementById('fd-wt-chart');if(!c)return;
  if(weights.length<2){c.innerHTML='<div class="empty">至少需要2条记录才能显示趋势图</div>';return}
  var w=620,h=180,pad=36;
  var wtVals=weights.map(function(x){return x.weight});
  var minV=Math.min.apply(null,wtVals);var maxV=Math.max.apply(null,wtVals);
  var span=maxV-minV;
  var padding=Math.max(0.3,span*0.2);
  var minW=minV-padding;var maxW=maxV+padding;
  if(goal>0&&goal<minW)minW=goal-0.2;
  if(goal>0&&goal>maxW)maxW=goal+0.2;
  var range=maxW-minW;
  var xStep=(w-pad*2)/(weights.length-1);
  var yScale=function(v){return h-pad-((v-minW)/range)*(h-pad*2)};
  var path='';weights.forEach(function(d,i){var x=pad+i*xStep;var y=yScale(d.weight);path+=(i===0?'M':'L')+x+','+y+' '});
  var dots='';weights.forEach(function(d,i){var x=pad+i*xStep;var y=yScale(d.weight);dots+='<circle cx="'+x+'" cy="'+y+'" r="3.5" fill="#7ECBA1"/><text x="'+x+'" y="'+(y-8)+'" font-size="10" fill="#4CAD7A" text-anchor="middle">'+d.weight+'</text>'});
  var goalLine='';if(goal>0&&goal>=minW&&goal<=maxW){var gy=yScale(goal);goalLine='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-pad)+'" y2="'+gy+'" stroke="#7ECBA1" stroke-width="1.2" stroke-dasharray="5,3"/><text x="'+(w-pad)+'" y="'+(gy-5)+'" font-size="10" fill="#4CAD7A" text-anchor="end">目标 '+goal+'kg</text>'}
  else if(goal>0){goalLine='<text x="'+pad+'" y="'+(pad-10)+'" font-size="10" fill="#4CAD7A">目标 '+goal+'kg(超出当前图范围)</text>'}
  var yLabels='';for(var i=0;i<=2;i++){var v=minW+(range*i/2);var y=h-pad-(i/2)*(h-pad*2);yLabels+='<text x="'+(pad-5)+'" y="'+(y+3)+'" font-size="10" fill="#BBABBA" text-anchor="end">'+v.toFixed(1)+'</text>'}
  var xLabels='';if(weights.length<=10){weights.forEach(function(d,i){var x=pad+i*xStep;xLabels+='<text x="'+x+'" y="'+(h-pad+15)+'" font-size="9" fill="#BBABBA" text-anchor="middle">'+d.date.slice(5)+'</text>'})}
  var area=path+' L'+(pad+(weights.length-1)*xStep)+','+(h-pad)+' L'+pad+','+(h-pad)+' Z';
  c.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;display:block">'+yLabels+'<path d="'+area+'" fill="rgba(126,203,161,.06)"/><line x1="'+pad+'" y1="'+(h-pad)+'" x2="'+(w-pad)+'" y2="'+(h-pad)+'" stroke="#F0E0E8" stroke-width="0.5"/><line x1="'+pad+'" y1="'+pad+'" x2="'+pad+'" y2="'+(h-pad)+'" stroke="#F0E0E8" stroke-width="0.5"/>'+goalLine+'<path d="'+path+'" fill="none" stroke="#7ECBA1" stroke-width="2"/>'+dots+xLabels+'</svg>';
}
function addExerciseD(){
  var d=document.getElementById('fd-ex-date').value||today();
  var t=document.getElementById('fd-ex-type').value;
  var dur=parseInt(document.getElementById('fd-ex-dur').value);
  var note=document.getElementById('fd-ex-note').value.trim();
  if(!dur||dur<=0)return;
  OD().exercises=OD().exercises||[];
  OD().exercises.push({id:genId(),mtime:Date.now(),date:d,type:t,duration:dur,note:note});
  saveData();
  document.getElementById('fd-ex-dur').value='';
  document.getElementById('fd-ex-note').value='';
  renderExerciseDetail();renderFitQuick();
}
function delExerciseD(id){markRemoved(currentOwner+':exercises',id);OD().exercises=(OD().exercises||[]).filter(function(x){return x.id!==id});saveData();renderExerciseDetail();renderFitQuick()}
function renderExerciseDetail(){
  renderExCal();
}
function exCalNav(dir){exCalDate.setMonth(exCalDate.getMonth()+dir);renderExCal()}
function selectExDate(ds){exCalSelected=ds;renderExCal()}
function renderExCal(){
  var y=exCalDate.getFullYear(),m=exCalDate.getMonth();
  var title=document.getElementById('ex-cal-title');if(title)title.textContent=y+'年'+(m+1)+'月';
  var fd=new Date(y,m,1);var sd=fd.getDay();
  var dim=new Date(y,m+1,0).getDate();var dip=new Date(y,m,0).getDate();
  var exs=OD().exercises||[];var todayStr=today();var html='';
  for(var i=sd-1;i>=0;i--)html+='<div class="cal-day other">'+(dip-i)+'</div>';
  for(var d=1;d<=dim;d++){
    var ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var de=exs.filter(function(e){return e.date===ds});
    var evHtml='';
    if(de.length>0){
      var tags=de.slice(0,3).map(function(e){
        var text=e.desc||(e.type+' '+e.duration+'分钟'+(e.note?' - '+e.note:''));
        return '<span class="cal-ev-tag" style="background:#7ECBA1" title="'+text+'">'+text+'<span class="cal-ev-x" onclick="event.stopPropagation();delExerciseCal(\''+e.id+'\')">&times;</span></span>';
      }).join('');
      var more=de.length>3?'<span class="cal-ev-more">+'+(de.length-3)+'</span>':'';
      evHtml='<div class="cal-day-events">'+tags+more+'</div>';
    }
    html+='<div class="cal-day'+(ds===todayStr?' today':'')+(ds===exCalSelected?' selected':'')+'" onclick="selectExDate(\''+ds+'\')"><span>'+d+'</span>'+evHtml+'</div>';
  }
  var tc=sd+dim;var rem=(7-(tc%7))%7;
  for(var d2=1;d2<=rem;d2++)html+='<div class="cal-day other">'+d2+'</div>';
  var grid=document.getElementById('ex-cal-grid');if(grid)grid.innerHTML=html;
  var addLabel=document.getElementById('ex-cal-add-date');if(addLabel)addLabel.textContent='为 '+exCalSelected+' 添加运动';
}
function addExerciseCal(){
  var desc=document.getElementById('ex-cal-desc').value.trim();if(!desc)return;
  OD().exercises=OD().exercises||[];
  OD().exercises.push({id:genId(),mtime:Date.now(),date:exCalSelected,type:'',duration:0,desc:desc});
  saveData();document.getElementById('ex-cal-desc').value='';renderExCal();renderFitQuick();
}
function delExerciseCal(id){markRemoved(currentOwner+':exercises',id);OD().exercises=OD().exercises.filter(function(x){return x.id!==id});saveData();renderExCal();renderFitQuick()}

// ===== Accounting Quick (Dashboard) =====
function renderAcctQuick(){
  var y=new Date().getFullYear(),m=new Date().getMonth();
  var badge=document.getElementById('acct-month-label');if(badge)badge.textContent=(m+1)+'月';
  var ts=getMonthTs(y,m);
  var inc=ts.filter(function(t){return t.type==='income'}).reduce(function(s,t){return s+t.amount},0);
  var exp=ts.filter(function(t){return t.type==='expense'}).reduce(function(s,t){return s+t.amount},0);
  var bal=inc-exp;
  var incEl=document.getElementById('acct-inc');if(incEl)incEl.textContent='+'+inc.toFixed(1);
  var expEl=document.getElementById('acct-exp');if(expEl)expEl.textContent='-'+exp.toFixed(1);
  var balEl=document.getElementById('acct-bal');if(balEl){balEl.textContent=(bal>=0?'+':'')+bal.toFixed(1);balEl.className='metric-value '+(bal>=0?'income':'expense');}
  var total=inc+exp;
  var track=document.getElementById('acct-mini-track');if(track){
    if(total>0){
      var incPct=Math.round(inc/total*100);
      track.innerHTML='<div class="income-part" style="width:'+incPct+'%"></div><div class="expense-part" style="width:'+(100-incPct)+'%"></div>';
    }else{track.innerHTML=''}
  }
  var recent=ts.slice(0,2);
  var el=document.getElementById('acct-quick-list');if(!el)return;
  if(recent.length===0){el.innerHTML='';return}
  el.innerHTML='<div style="font-size:11px;font-weight:500;color:var(--text2);margin-top:8px;padding-top:6px;border-top:1px solid var(--border-light)">最近记录</div>'+recent.map(function(t){
    var color=acctCatColors[t.cat]||'#BBABBA';
    return '<div class="ex-mini-item"><span class="ex-mini-date">'+t.date.slice(5)+'</span><span class="ex-mini-type" style="background:'+hexToRgba(color,0.12)+';color:'+color+'">'+esc(t.cat)+'</span><span class="ex-mini-dur" style="color:'+(t.type==='income'?'var(--success)':'')+'">'+(t.type==='income'?'+':'-')+t.amount.toFixed(1)+'</span></div>';
  }).join('');
  var gEl=document.getElementById('acct-goal'); if(gEl){var g=getSpendGoal(y,m)||0; gEl.textContent=g>0?('月目标 ¥'+g.toFixed(0)+' · 已用 '+Math.round(exp/g*100)+'%'):'';}
}

// ===== Accounting Detail =====
function getMonthTs(y,m){return (OD().transactions||[]).filter(function(t){var pd=t.date.split('-');return parseInt(pd[0])===y&&parseInt(pd[1])===m+1}).sort(function(a,b){return b.date.localeCompare(a.date)||(b.mtime||0)-(a.mtime||0)})}
function getSpendGoal(y,m){
  var ys=OD().spendGoals;var ym=y+'-'+String(m+1).padStart(2,'0');
  return (ys&&ys[ym]!==undefined)?ys[ym]:(OD().spendGoal||0);
}
function monthStatsD(y,m){
  var ts=getMonthTs(y,m);
  var inc=ts.filter(function(t){return t.type==='income'}).reduce(function(s,t){return s+t.amount},0);
  var exp=ts.filter(function(t){return t.type==='expense'}).reduce(function(s,t){return s+t.amount},0);
  return {income:inc,expense:exp,balance:inc-exp,total:ts.length};
}

function buildAcctView(){
  var container=document.getElementById('view-accounting');
  container.innerHTML=''+
  '<div class="detail-header"><span class="detail-title">💰 记账</span>'+ownerSwitchHtml()+'</div>'+
  '<div class="detail-body">'+
    '<div class="cal-nav"><button onclick="acctNav(-1)">‹</button><span class="cal-title" id="ad-cal-title"></span><button onclick="acctNav(1)">›</button></div>'+
    '<div class="acct-summary"><div class="acct-summary-item"><div class="acct-summary-label">收入</div><div class="acct-summary-val" id="ad-income" style="color:var(--success)">--</div></div><div class="acct-summary-item"><div class="acct-summary-label">支出</div><div class="acct-summary-val" id="ad-expense" style="color:var(--danger)">--</div></div><div class="acct-summary-item"><div class="acct-summary-label">结余</div><div class="acct-summary-val" id="ad-balance">--</div></div></div>'+
    '<div class="detail-card">'+
      '<div class="acct-form"><div class="acct-form-title">记账</div><div class="acct-form-row"><label>类型</label><span class="acct-type-group"><button class="acct-type-btn" id="ad-type-expense" onclick="setAcctTypeD(\'expense\')">支出</button><button class="acct-type-btn" id="ad-type-income" onclick="setAcctTypeD(\'income\')">收入</button></span></div>'+
      '<div class="acct-form-row"><label>日期</label><input type="date" id="ad-date" style="flex:0 0 auto"></div>'+
      '<div class="acct-form-row"><label>分类</label><select id="ad-cat">餐饮交通购物住房娱乐医疗宠物其他人情</select><label>金额</label><input type="number" id="ad-amount" placeholder="0" step="0.01" min="0.01"></div>'+
      '<div class="acct-form-row"><label>备注</label><input type="text" id="ad-desc" placeholder="描述..." style="flex:1"></div>'+
      '<div class="acct-form-row"><label>月目标</label><input type="number" id="ad-goal" placeholder="月度支出目标" step="1" min="0" style="flex:1"><button class="btn btn-sm" onclick="setSpendGoalD()">设定</button></div>'+
      '<button class="btn" onclick="addTransactionD()">记账</button></div>'+
      '<div class="acct-goal"><div class="acct-goal-row"><span>本月支出 / 目标</span><b id="ad-goal-now">--</b></div><div class="acct-goal-bar"><div class="acct-goal-fill" id="ad-goal-fill"></div></div></div>'+
      '<div class="cal-weekdays"><div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div></div>'+
      '<div class="cal-grid" id="ad-cal-grid"></div>'+
      '<div class="acct-pie-wrap" style="margin-top:14px;margin-bottom:14px"><div class="acct-pie" id="ad-pie"></div><div class="acct-legend" id="ad-legend"></div></div>'+
      '<div><div class="acct-list-title"><span id="ad-list-title"></span><span id="ad-list-count" style="font-size:11px;color:var(--text3)"></span><span id="ad-clear-cat" onclick="filterAcctCat(null)" style="display:none;cursor:pointer;margin-left:8px;font-size:11px;color:#F26D7D;font-weight:500">✕ 分类</span><span id="ad-back-month" onclick="setAcctDayFilter(null)" style="display:none;cursor:pointer;margin-left:auto;font-size:11px;color:var(--primary);font-weight:500">← 本月</span></div><div id="ad-list"></div></div>'+
    '</div>'+
  '</div>';
  setAcctTypeD('expense');
  renderAcctDetail();
}

function acctNav(dir){
  acctCalDate.setMonth(acctCalDate.getMonth()+dir);
  var y=acctCalDate.getFullYear(),m=acctCalDate.getMonth()+1;
  if(acctDayFilter){
    var p=acctDayFilter.split('-');
    if(parseInt(p[0])!==y||parseInt(p[1])!==m){acctDayFilter=null;}
  }
  renderAcctDetail();
}
function setAcctTypeD(t){
  acctDetailType=t;
  var expBtn=document.getElementById('ad-type-expense');if(expBtn)expBtn.classList.toggle('active',t==='expense');
  var incBtn=document.getElementById('ad-type-income');if(incBtn)incBtn.classList.toggle('active',t==='income');
  var catSel=document.getElementById('ad-cat');if(catSel)catSel.innerHTML=t==='income'?'<option value="工资">工资</option><option value="奖金">奖金</option><option value="兼职">兼职</option><option value="理财">理财</option><option value="其他">其他</option>':'<option value="餐饮">餐饮</option><option value="交通">交通</option><option value="购物">购物</option><option value="住房">住房</option><option value="娱乐">娱乐</option><option value="医疗">医疗</option><option value="宠物">宠物</option><option value="人情">人情</option><option value="其他">其他</option>';
}
function addTransactionD(){
  var d=document.getElementById('ad-date').value||today();
  var desc=document.getElementById('ad-desc').value.trim();
  var cat=document.getElementById('ad-cat').value;
  var amt=parseFloat(document.getElementById('ad-amount').value);
  if(isNaN(amt)||amt<=0){alert('请输入金额');return}
  if(!desc)desc=cat;
  OD().transactions=OD().transactions||[];
  OD().transactions.push({id:genId(),mtime:Date.now(),date:d,desc:desc,cat:cat,amount:Math.round(amt*10)/10,type:acctDetailType});
  saveData();
  document.getElementById('ad-desc').value='';
  document.getElementById('ad-amount').value='';
  renderAcctDetail();renderAcctQuick();
}
function setSpendGoalD(){
  var g=parseFloat(document.getElementById('ad-goal').value);
  var y=acctCalDate.getFullYear(),m=acctCalDate.getMonth();
  var ym=y+'-'+String(m+1).padStart(2,'0');
  if(!OD().spendGoals)OD().spendGoals={};
  OD().spendGoals[ym]=(isNaN(g)||g<0)?0:g;OD().spendGoalMtime=Date.now();
  saveData();
  var gi=document.getElementById('ad-goal');if(gi)gi.value='';
  renderAcctDetail();renderAcctQuick();
}
function delTransactionD(id){markRemoved(currentOwner+':transactions',id);OD().transactions=(OD().transactions||[]).filter(function(x){return x.id!==id});localBackup();pushToCloud(2);renderAcctDetail();renderAcctQuick()}
function selectAcctDateD(ds){
  var p=ds.split('-');
  acctCalDate=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
  document.getElementById('ad-date').value=ds;
  acctDayFilter=(acctDayFilter===ds)?null:ds;
  renderAcctDetail();
}
function setAcctDayFilter(d){
  acctDayFilter=d;
  renderAcctDetail();
}
function renderAcctDetail(){
  var y=acctCalDate.getFullYear(),m=acctCalDate.getMonth();
  var title=document.getElementById('ad-cal-title');if(title)title.textContent=y+'年'+(m+1)+'月';
  var dateInput=document.getElementById('ad-date');if(dateInput)dateInput.value=acctDayFilter||today();
  var stats=monthStatsD(y,m);
  var g=getSpendGoal(y,m), me=stats.expense;
  var gn=document.getElementById('ad-goal-now'); if(gn)gn.textContent=g>0?('¥'+me.toFixed(1)+' / ¥'+g.toFixed(1)):'未设目标';
  var gf=document.getElementById('ad-goal-fill'); if(gf){ if(g>0){var pct=Math.min(me/g*100,100); gf.style.width=pct+'%'; gf.style.background=me>g?'linear-gradient(90deg,#F26D7D,#F795A1)':'linear-gradient(90deg,#8B6CF0,#B79BF5)';} else {gf.style.width='0%';} }
  var incEl=document.getElementById('ad-income');if(incEl)incEl.textContent='+'+stats.income.toFixed(1);
  var expEl=document.getElementById('ad-expense');if(expEl)expEl.textContent='-'+stats.expense.toFixed(1);
  var balEl=document.getElementById('ad-balance');if(balEl)balEl.textContent=(stats.balance>=0?'+':'')+stats.balance.toFixed(1);
  if(balEl){balEl.textContent=(stats.balance>=0?'+':'')+stats.balance.toFixed(1);balEl.style.color=stats.balance>0?'var(--success)':stats.balance<0?'var(--danger)':'var(--text)';}
  renderAcctCalD(y,m);
  renderAcctPieD(y,m);
  renderAcctListD(y,m,acctDayFilter);
}
function renderAcctCalD(y,m){
  var fd=new Date(y,m,1);var sd=fd.getDay();
  var dim=new Date(y,m+1,0).getDate();var dip=new Date(y,m,0).getDate();
  var todayStr=today();var html='';
  for(var i=sd-1;i>=0;i--){
    var pd=dip-i;
    var pm=m===0?11:m-1,py=m===0?y-1:y;
    var pds=py+'-'+String(pm+1).padStart(2,'0')+'-'+String(pd).padStart(2,'0');
    html+='<div class="cal-day other'+(pds===acctDayFilter?' selected':'')+'" onclick="selectAcctDateD(\''+pds+'\')">'+pd+'</div>';
  }
  for(var d=1;d<=dim;d++){
    var ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var dayTs=(OD().transactions||[]).filter(function(t){return t.date===ds});
    var inc=dayTs.filter(function(t){return t.type==='income'}).reduce(function(s,t){return s+t.amount},0);
    var exp=dayTs.filter(function(t){return t.type==='expense'}).reduce(function(s,t){return s+t.amount},0);
    var amountHtml='';
    if(dayTs.length>0){
      if(inc>0&&exp>0)amountHtml='<span class="acct-cal-day-amount income">+'+inc.toFixed(1)+'</span><span class="acct-cal-day-amount expense">-'+exp.toFixed(1)+'</span>';
      else if(inc>0)amountHtml='<span class="acct-cal-day-amount income">+'+inc.toFixed(1)+'</span>';
      else if(exp>0)amountHtml='<span class="acct-cal-day-amount expense">-'+exp.toFixed(1)+'</span>';
    }
    html+='<div class="cal-day'+(ds===todayStr?' today':'')+(ds===acctDayFilter?' selected':'')+'" onclick="selectAcctDateD(\''+ds+'\')"><span>'+d+'</span>'+amountHtml+'</div>';
  }
  var tc=sd+dim;var rem=(7-(tc%7))%7;
  for(var d2=1;d2<=rem;d2++){
    var nm=m===11?0:m+1,ny=m===11?y+1:y;
    var nds=ny+'-'+String(nm+1).padStart(2,'0')+'-'+String(d2).padStart(2,'0');
    html+='<div class="cal-day other'+(nds===acctDayFilter?' selected':'')+'" onclick="selectAcctDateD(\''+nds+'\')">'+d2+'</div>';
  }
  var grid=document.getElementById('ad-cal-grid');if(grid)grid.innerHTML=html;
}
function renderAcctListD(y,m,dayFilter){
  var ts=dayFilter?(OD().transactions||[]).filter(function(t){return t.date===dayFilter}):getMonthTs(y,m);
  if(acctCatFilter)ts=ts.filter(function(t){return t.cat===acctCatFilter});
  ts=ts.slice().sort(function(a,b){return (b.mtime||0)-(a.mtime||0)});
  var titleEl=document.getElementById('ad-list-title');if(titleEl)titleEl.textContent=(acctCatFilter?acctCatFilter+' · ':'')+(dayFilter?dayFilter:(y+'年'+(m+1)+'月'))+' 收支明细';
  var backBtn=document.getElementById('ad-back-month');if(backBtn)backBtn.style.display=(dayFilter&&dayFilter!==today())?'inline':'none';
  var clearCat=document.getElementById('ad-clear-cat');if(clearCat)clearCat.style.display=acctCatFilter?'inline':'none';
  var countEl=document.getElementById('ad-list-count');if(countEl)countEl.textContent='共 '+ts.length+' 笔';
  var list=document.getElementById('ad-list');if(!list)return;
  if(ts.length===0){list.innerHTML='<div class="acct-empty">'+(acctCatFilter?('「'+acctCatFilter+'」分类下'+(dayFilter?'这一天':'本月')+'还没有收支记录'):(dayFilter?'这一天还没有收支记录':'本月还没有收支记录'))+'</div>';return}
  list.innerHTML=ts.map(function(t){
    var color=acctCatColors[t.cat]||'#BBABBA';
    var sign=t.type==='income'?'+':'-';
    return '<div class="acct-item"><span class="acct-item-date">'+t.date.slice(5)+'</span><span class="acct-item-cat" style="background:'+hexToRgba(color,0.12)+';color:'+color+'">'+esc(t.cat)+'</span><span class="acct-item-desc">'+esc(t.desc)+'</span><span class="acct-item-amount '+(t.type==='income'?'income':'expense')+'">'+sign+t.amount.toFixed(1)+'</span><button class="acct-del" onclick="delTransactionD(\''+t.id+'\')">&times;</button></div>';
  }).join('');
}
function renderAcctPieD(y,m){
  var ts=getMonthTs(y,m).filter(function(t){return t.type==='expense'});
  var total=ts.reduce(function(s,t){return s+t.amount},0);
  var wrap=document.getElementById('ad-pie'),legend=document.getElementById('ad-legend');
  if(!wrap||!legend)return;
  if(total===0){wrap.innerHTML='<div class="acct-empty">本月暂无支出</div>';legend.innerHTML='';return}
  var cats={};
  ts.forEach(function(t){cats[t.cat]=(cats[t.cat]||0)+t.amount});
  var entries=Object.keys(cats).map(function(k){return {cat:k,amount:cats[k],color:acctCatColors[k]||'#BBABBA'}}).sort(function(a,b){return b.amount-a.amount});
  var w=160,h=160,r=70,cx=w/2,cy=h/2;
  var start=-Math.PI/2;var slices='';
  entries.forEach(function(e){
    var angle=(e.amount/total)*Math.PI*2;
    var x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start);
    var x2=cx+r*Math.cos(start+angle),y2=cy+r*Math.sin(start+angle);
    var large=angle>Math.PI?1:0;
    var sel=acctCatFilter===e.cat?' stroke-width="3" stroke="#5B4B8A"':' stroke="#fff" stroke-width="1.5"';
    slices+='<path d="M'+cx+','+cy+' L'+x1+','+y1+' A'+r+','+r+' 0 '+large+' 1 '+x2+','+y2+' Z" fill="'+e.color+'"'+sel+' style="cursor:pointer" onclick="filterAcctCat(\''+e.cat+'\')"/>';
    start+=angle;
  });
  wrap.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" width="160" height="160">'+slices+'</svg>';
  legend.innerHTML=entries.map(function(e){
    var pct=((e.amount/total)*100).toFixed(1);
    var activeStyle=acctCatFilter===e.cat?'background:rgba(139,108,240,.10);border-radius:8px;padding:2px 4px':'';
    return '<div class="acct-legend-item'+(acctCatFilter===e.cat?' active':'')+'" onclick="filterAcctCat(\''+e.cat+'\')" style="cursor:pointer;'+activeStyle+'"><span class="acct-legend-left"><span class="acct-legend-color" style="background:'+e.color+'"></span>'+esc(e.cat)+'</span><span class="acct-legend-val">¥'+e.amount.toFixed(1)+' ('+pct+'%)</span></div>';
  }).join('');
}
function filterAcctCat(cat){
  acctCatFilter=(cat===null)?null:(acctCatFilter===cat?null:cat);
  var y=acctCalDate.getFullYear(),m=acctCalDate.getMonth();
  renderAcctPieD(y,m);
  renderAcctListD(y,m,acctDayFilter);
}


// ===== Quadrant (四象限时间管理) =====
var QD_META=[
  {name:'重要且紧急',en:'DO',hex:'#F26D7D',deep:'#D8495C'},
  {name:'重要但不紧急',en:'SCHEDULE',hex:'#6ECB9A',deep:'#2E9B6E'},
  {name:'紧急但不重要',en:'DELEGATE',hex:'#F5B84D',deep:'#D99A2B'},
  {name:'不重要且不紧急',en:'ELIMINATE',hex:'#B3A6CB',deep:'#8E7FB5'}
];
var QJ_STATUS=['已投递','已约面','已面试','已通过','已拒绝','已拿offer'];
var qdTab='matrix';
var qdCalDate=new Date();
var qdEditingId=null;
var qdManualId=null;
var qdJobOpenId=null;
function qdMonthStr(){return qdCalDate.getFullYear()+'-'+String(qdCalDate.getMonth()+1).padStart(2,'0')}
function qdMonthLabel(){return qdCalDate.getFullYear()+'年'+(qdCalDate.getMonth()+1)+'月'}
function qdTasks(){return (DATA.quadrants&&DATA.quadrants.tasks)||[]}
function qdSessions(){return (DATA.quadrants&&DATA.quadrants.sessions)||[]}
function qdJobs(){return (DATA.quadrants&&DATA.quadrants.jobs)||[]}
function qdMyTasks(){return qdTasks().filter(function(t){return t.assignee===currentOwner})}
function qdIsCurMonth(){
  var n=new Date();return qdCalDate.getFullYear()===n.getFullYear()&&qdCalDate.getMonth()===n.getMonth();
}
function qdFmtMin(m){
  m=Math.round(m||0);
  if(m<=0)return '0h';
  var h=Math.floor(m/60),mm=m%60;
  if(h===0)return mm+'分钟';
  if(mm===0)return h+'h';
  return h+'h'+mm+'分';
}
function qdFmtHour(m){
  var h=Math.round(m||0)/60;
  h=Math.round(h*10)/10;
  return h+'h';
}
function qdSpentOf(taskId,month){
  return qdSessions().reduce(function(s,x){
    if(x.taskId===taskId&&x.date&&x.date.indexOf(month)===0)s+=x.min||0;
    return s;
  },0);
}
function qdQuadSpent(quad,month){
  return qdSessions().reduce(function(s,x){
    if(x.assignee===currentOwner&&x.quad===quad&&x.date&&x.date.indexOf(month)===0)s+=x.min||0;
    return s;
  },0);
}
function qdQuadGoal(quad){
  return qdMyTasks().reduce(function(s,t){if(t.quadrant===quad&&!t.done)s+=(t.goalMin||0);return s},0);
}
function qdTotalGoal(){return QD_META.reduce(function(s,q,i){return s+qdQuadGoal(i)},0)}
function qdDoneOf(quad){return qdMyTasks().filter(function(t){return t.quadrant===quad&&t.done}).length}
function qdUndoneOf(quad){return qdMyTasks().filter(function(t){return t.quadrant===quad&&!t.done}).length}
function qdAddSession(taskId,min,src){
  var t=qdTasks().find(function(x){return x.id===taskId});
  if(!t)return;
  var qd=(DATA.quadrants.sessions=DATA.quadrants.sessions||[]);
  qd.push({id:genId(),mtime:Date.now(),assignee:currentOwner,taskId:taskId,name:t.name,quad:t.quadrant,date:today(),min:Math.round(min)||1,src:src||'manual'});
  saveData();
}
function qdNavMonth(d){
  var nd=new Date(qdCalDate.getFullYear(),qdCalDate.getMonth()+d,1);
  var n=new Date();
  if(nd.getTime()>new Date(n.getFullYear(),n.getMonth(),1).getTime())return;
  qdCalDate=nd;qdEditingId=null;qdManualId=null;
  renderQuadrantView();
}
function qdSwitchTab(t){
  qdTab=t;
  document.querySelectorAll('.qd-tabs .pill').forEach(function(p){p.classList.toggle('active',p.id==='qd-tab-'+t)});
  document.getElementById('qd-sec-matrix').style.display=t==='matrix'?'':'none';
  document.getElementById('qd-sec-stats').style.display=t==='stats'?'':'none';
  document.getElementById('qd-sec-job').style.display=t==='job'?'':'none';
  if(t==='matrix')renderQdMatrix();
  if(t==='stats')renderQdStats();
  if(t==='job')renderQdJob();
}
function renderQuadrantView(){
  var os=document.getElementById('qd-owner-switch');
  if(os)os.innerHTML=ownerSwitchHtml();
  syncOwnerButtons();
  var lab=document.getElementById('qd-month-label');
  if(lab)lab.textContent=qdMonthLabel();
  var tip=document.getElementById('qd-month-tip');
  if(tip)tip.textContent=qdIsCurMonth()?'本月数据实时同步':'查看'+qdMonthLabel()+'历史记录';
  qdSwitchTab(qdTab);
}
// ===== Matrix Tab =====
function renderQdMatrix(){
  var grid=document.getElementById('qd-grid');if(!grid)return;
  var html='';
  QD_META.forEach(function(m,quad){
    var tasks=qdMyTasks().filter(function(t){return t.quadrant===quad});
    tasks.sort(function(a,b){return (a.done?1:0)-(b.done?1:0)||(b.mtime||0)-(a.mtime||0)});
    var spent=qdQuadSpent(quad,qdMonthStr());
    var goal=qdQuadGoal(quad);
    var sumTxt='本月 '+qdFmtMin(spent)+(goal>0?' / 目标 '+qdFmtMin(goal):'');
    html+='<div class="qd-card" style="border-top:3px solid '+m.hex+'">'+
      '<div class="qd-card-head"><span class="qd-dot" style="background:'+m.hex+'"></span>'+
      '<span class="n">'+m.name+'</span><span class="en">'+m.en+'</span>'+
      '<span class="sum">'+sumTxt+'</span></div>'+
      '<div class="qd-list" id="qd-list-'+quad+'"></div>'+
      '<div class="qd-addrow"><input type="text" id="qd-add-'+quad+'" placeholder="新任务…" onkeydown="if(event.key===\'Enter\')qdAdd(\''+quad+'\')">'+
      '<input type="number" class="g" id="qd-goal-'+quad+'" placeholder="目标分钟" min="0">'+
      '<button class="btn btn-sm" onclick="qdAdd(\''+quad+'\')">+</button></div></div>';
  });
  grid.innerHTML=html;
  QD_META.forEach(function(m,quad){
    var tasks=qdMyTasks().filter(function(t){return t.quadrant===quad});
    tasks.sort(function(a,b){return (a.done?1:0)-(b.done?1:0)||(b.mtime||0)-(a.mtime||0)});
    document.getElementById('qd-list-'+quad).innerHTML=tasks.length?tasks.map(function(t){return qdRowHtml(t)}).join(''):'<div class="qd-empty">还没有任务，在下面添加一个吧</div>';
  });
}
function qdRowHtml(t){
  var m=QD_META[t.quadrant];
  var month=qdMonthStr();
  var spent=qdSpentOf(t.id,month);
  var goal=t.goalMin||0;
  var pct=goal>0?Math.min(100,Math.round(spent/goal*100)):0;
  var meta=(goal>0?'目标 '+qdFmtMin(goal)+' · ':'')+'本月 '+qdFmtMin(spent)+(spent>goal&&goal>0?' ⚠ 超目标':'');
  var barColor=spent>goal&&goal>0?QD_META[0].hex:m.hex;
  var row='<div class="qd-row">'+
    '<div class="qd-row-top">'+
    '<input type="checkbox" class="qd-check" '+(t.done?'checked':'')+' onchange="qdToggleDone(\''+t.id+'\')" title="完成/恢复">'+
    '<div class="qd-row-name"><span class="'+(t.done?'qd-done':'')+'">'+esc(t.name)+'</span><small>'+meta+'</small>'+
    (goal>0?'<div class="qd-bar"><i style="width:'+pct+'%;background:'+barColor+'"></i></div>':'')+
    '</div>'+
    '<div class="qd-ops">'+
    '<button class="qd-pomo-btn" onclick="qdPomoStart(\''+t.id+'\')" title="开始25分钟番茄钟">🍅 番茄钟</button>'+
    '<button class="qd-op" onclick="qdManualToggle(\''+t.id+'\')" title="手动补记今天用时">＋记</button>'+
    '<button class="qd-op" onclick="qdEditToggle(\''+t.id+'\')" title="编辑">✎</button>'+
    '</div></div>';
  if(qdEditingId===t.id)row+=qdEditHtml(t);
  if(qdManualId===t.id)row+=qdManualHtml(t);
  return row+'</div>';
}
function qdEditHtml(t){
  var opts=QD_META.map(function(m,i){return '<option value="'+i+'"'+(i===t.quadrant?' selected':'')+'>'+m.name+'</option>'}).join('');
  return '<div class="qd-editbox">'+
    '<h5>编辑任务</h5>'+
    '<div class="qd-ef"><label>任务名称</label><input type="text" id="qd-e-name" value="'+esc(t.name)+'"></div>'+
    '<div class="qd-ef"><label>所属象限</label><select id="qd-e-quad">'+opts+'</select></div>'+
    '<div class="qd-ef"><label>目标分钟/月</label><input type="number" id="qd-e-goal" value="'+(t.goalMin||0)+'" min="0"></div>'+
    '<div class="qd-ef"><label>今日补记</label><input type="number" id="qd-e-manual" placeholder="补记今天投入的分钟数" min="1" style="flex:1">'+
    '<span style="font-size:11px;color:var(--text3)">（没用番茄钟的话在这里补）</span></div>'+
    '<div class="qd-ef-actions">'+
    '<button class="btn btn-sm" onclick="qdEditSave(\''+t.id+'\')">保存修改</button>'+
    '<button class="btn btn-sm btn-ghost" onclick="qdEditingId=null;renderQdMatrix()">取消</button>'+
    '<button class="btn btn-sm btn-ghost" style="margin-left:auto;border-color:var(--danger);color:var(--danger)" onclick="qdDelTask(\''+t.id+'\')">删除任务</button>'+
    '</div></div>';
}
function qdManualHtml(t){
  return '<div class="qd-editbox" style="border-color:var(--primary)">'+
    '<div class="qd-ef"><label>今日投入</label><input type="number" id="qd-m-min" placeholder="分钟数" min="1" style="flex:0 0 120px">'+
    '<button class="btn btn-sm" onclick="qdManualSave(\''+t.id+'\')">记入</button>'+
    '<button class="btn btn-sm btn-ghost" onclick="qdManualId=null;renderQdMatrix()">取消</button></div></div>';
}
function qdAdd(quad){
  var i=document.getElementById('qd-add-'+quad);if(!i)return;
  var name=i.value.trim();if(!name)return;
  var g=document.getElementById('qd-goal-'+quad);
  var goal=parseInt(g.value,10);if(!(goal>=0))goal=0;
  qdTasks().push({id:genId(),mtime:Date.now(),assignee:currentOwner,name:name,quadrant:Number(quad),goalMin:goal,done:false});
  saveData();renderQdMatrix();
}
function qdToggleDone(id){
  var t=qdTasks().find(function(x){return x.id===id});
  if(t){t.done=!t.done;t.mtime=Date.now();}
  saveData();renderQdMatrix();
}
function qdEditToggle(id){qdEditingId=(qdEditingId===id)?null:id;qdManualId=null;renderQdMatrix()}
function qdManualToggle(id){qdManualId=(qdManualId===id)?null:id;qdEditingId=null;renderQdMatrix()}
function qdEditSave(id){
  var t=qdTasks().find(function(x){return x.id===id});if(!t)return;
  var name=document.getElementById('qd-e-name').value.trim();
  var quad=parseInt(document.getElementById('qd-e-quad').value,10);
  var goal=parseInt(document.getElementById('qd-e-goal').value,10);
  var manual=parseInt(document.getElementById('qd-e-manual').value,10);
  if(name)t.name=name;
  if(!isNaN(quad))t.quadrant=quad;
  t.goalMin=(!isNaN(goal)&&goal>=0)?goal:0;
  t.mtime=Date.now();
  var changed=t.quadrant;
  if(!isNaN(manual)&&manual>0){
    qdSessions().push({id:genId(),mtime:Date.now(),assignee:currentOwner,taskId:id,name:t.name,quad:t.quadrant,date:today(),min:manual,src:'manual'});
  }
  saveData();qdEditingId=null;renderQdMatrix();
  if(!isNaN(manual)&&manual>0)qdPomoToast('已补记 '+manual+' 分钟');
}
function qdManualSave(id){
  var el=document.getElementById('qd-m-min');
  var min=parseInt(el.value,10);
  if(!(min>0)||min>1440){el.focus();return}
  qdAddSession(id,min,'manual');
  qdManualId=null;renderQdMatrix();
  qdPomoToast('已补记 '+min+' 分钟');
}
function qdDelTask(id){
  markRemoved('quadrants:tasks',id);
  qdTasks().splice(qdTasks().findIndex(function(x){return x.id===id}),1);
  qdEditingId=null;saveData();renderQdMatrix();
  qdPomoToast('任务已删除（历史用时保留）');
}
// ===== 番茄钟 =====
var pomo=null;
function qdPomoStart(taskId,min){
  var t=qdTasks().find(function(x){return x.id===taskId});if(!t)return;
  if(pomo&&pomo.on){qdPomoCommit(false)}
  min=min||25;
  pomo={on:true,taskId:taskId,name:t.name,min:min,remain:min*60,paused:false,iv:null};
  qdPomoRender();
  if(pomo.iv)clearInterval(pomo.iv);
  pomo.iv=setInterval(qdPomoTick,1000);
}
function qdPomoTick(){
  if(!pomo||!pomo.on)return;
  if(!pomo.paused){
    pomo.remain--;
    qdPomoRender();
    if(pomo.remain<=0){
      var comm=pomo.min-Math.ceil(Math.abs(pomo.remain)/60);
      qdPomoCommit(true,comm);
    }
  }
}
function qdPomoToggle(){
  if(!pomo)return;
  pomo.paused=!pomo.paused;
  qdPomoRender();
}
function qdPomoCommit(auto,secOverride){
  if(!pomo)return;
  var usedMin=Math.max(1,Math.round((pomo.min*60-pomo.remain)/60));
  var taskId=pomo.taskId;
  if(pomo.iv)clearInterval(pomo.iv);
  pomo.on=false;
  var bar=document.getElementById('qd-pomo-bar');
  if(bar)bar.classList.remove('show');
  if(usedMin>=1){
    qdAddSession(taskId,usedMin,'pomo');
    qdPomoToast('🍅 '+usedMin+' 分钟已自动计入');
    if(qdTab==='matrix'&&currentView==='quadrant')renderQdMatrix();
  }
}
function qdPomoCancel(){
  if(!pomo)return;
  if(pomo.iv)clearInterval(pomo.iv);
  pomo.on=false;
  var bar=document.getElementById('qd-pomo-bar');
  if(bar)bar.classList.remove('show');
  pomo=null;
}
function qdPomoRender(){
  var bar=document.getElementById('qd-pomo-bar');
  if(!bar){bar=document.createElement('div');bar.id='qd-pomo-bar';bar.className='qd-pomo-float';document.body.appendChild(bar);}
  if(!pomo||!pomo.on){bar.classList.remove('show');return}
  var ss=Math.max(0,pomo.remain);
  var mm=String(Math.floor(ss/60)).padStart(2,'0'),sec=String(ss%60).padStart(2,'0');
  bar.innerHTML='<div class="qd-pomo-task">'+esc(pomo.name)+'</div>'+
    '<div class="qd-pomo-time">'+mm+':'+sec+'</div>'+
    '<div class="qd-pomo-acts">'+
    '<button class="qd-pomo-btn" onclick="qdPomoToggle()">'+(pomo.paused?'▶ 继续':'⏸ 暂停')+'</button>'+
    '<button class="qd-pomo-btn" onclick="qdPomoCommit(false)" title="提前结束并计入已用时">✓ 结束计入</button>'+
    '<button class="qd-op red" onclick="qdPomoCancel()" title="取消不记">✕</button></div>';
  bar.classList.add('show');
}
function qdPomoToast(msg){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;left:50%;bottom:34px;transform:translateX(-50%);background:#3A3348;color:#fff;font-size:12.5px;padding:9px 16px;border-radius:12px;z-index:1200;box-shadow:0 6px 20px rgba(0,0,0,.18);font-family:inherit;transition:opacity .4s';
  t.textContent=msg;document.body.appendChild(t);
  setTimeout(function(){t.style.opacity='0'},1800);
  setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t)},2300);
}
// ===== Stats Tab =====
function qdLast7Days(){
  var out=[];var d=new Date();
  for(var i=6;i>=0;i--){
    var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()-i);
    out.push({date:x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'),wd:'日一二三四五六'[x.getDay()]});
  }
  return out;
}
function renderQdStats(){
  var top=document.getElementById('qd-stats-top');if(!top)return;
  var month=qdMonthStr();
  var total=0,goalTotal=qdTotalGoal(),imp=0;
  QD_META.forEach(function(m,i){var s=qdQuadSpent(i,month);total+=s;if(i<2)imp+=s;});
  var pct=goalTotal>0?Math.round(total/goalTotal*100):0;
  var impPct=total>0?Math.round(imp/total*100):0;
  top.innerHTML=''+
    '<div class="qd-stat"><div class="l">'+qdMonthLabel()+'总投入</div><div class="v">'+qdFmtHour(total)+'</div><div class="d">约 '+Math.round(total)+' 分钟</div></div>'+
    '<div class="qd-stat"><div class="l">目标投入</div><div class="v">'+qdFmtHour(goalTotal)+'</div><div class="d">完成任务目标之和</div></div>'+
    '<div class="qd-stat"><div class="l">完成度</div><div class="v" style="color:'+(pct>=100?'#D8495C':QD_META[1].deep)+'">'+pct+'%</div><div class="d">实际 / 目标</div></div>'+
    '<div class="qd-stat"><div class="l">重要事项占比</div><div class="v" style="color:'+QD_META[0].deep+'">'+impPct+'%</div><div class="d">重要且紧急 + 重要不紧急</div></div>';
  renderQdBubble();
  renderQdArea();
}
function renderQdBubble(){
  var wrap=document.getElementById('qd-bubble-wrap');if(!wrap)return;
  var month=qdMonthStr();
  var data=[];
  QD_META.forEach(function(m,i){
    var spent=qdQuadSpent(i,month),goal=qdQuadGoal(i);
    data.push({hex:m.hex,deep:m.deep,spent:spent,goal:goal});
  });
  var view='0 0 680 600';
  var s='<svg viewBox="'+view+'" class="qd-svg" role="img" aria-label="四象限用时分布气泡图">';
  var tl=110,tr=375,tb=110; // margins
  // zone rects: top y 110..340, bottom 340..570 ; left 90..375 right 375..660
  var zones=[[375,110,285,230,1],[90,110,285,230,0],[375,340,285,230,3],[90,340,285,230,2]];
  zones.forEach(function(z){
    s+='<rect x="'+z[0]+'" y="'+z[1]+'" width="'+z[2]+'" height="'+z[3]+'" fill="'+data[z[4]].hex+'" fill-opacity="0.08"/>';
  });
  s+='<line x1="375" y1="110" x2="375" y2="570" stroke="#00000024" stroke-width="1"/>';
  s+='<line x1="90" y1="340" x2="660" y2="340" stroke="#00000024" stroke-width="1"/>';
  s+='<text x="375" y="592" text-anchor="middle" fill="#B8ABCD" font-size="12" style="font-family:inherit">紧急程度</text>';
  s+='<text x="375" y="96" text-anchor="middle" fill="#B8ABCD" font-size="11" style="font-family:inherit">重要程度 ↑</text>';
  // quadrant labels (fixed order q0 TR, q1 TL, q2 BR, q3 BL)
  var labels=[[1,385,126,405,146],[0,100,126,112,146],[2,385,366,405,386],[3,100,366,112,386]];
  labels.forEach(function(L){
    var m=QD_META[L[0]];
    s+='<circle cx="'+L[1]+'" cy="'+(L[3]-6)+'" r="4" fill="'+m.hex+'"/>'+
      '<text x="'+L[2]+'" y="'+(L[3]-2)+'" fill="'+m.deep+'" font-size="13.5" font-weight="700" style="font-family:inherit">'+m.name+'</text>'+
      '<text x="'+L[1]+'" y="'+(L[4]+4)+'" fill="#7B6E8E" font-size="11" style="font-family:inherit">'+m.en+'</text>';
  });
  var centers=[[517.5,225],[232.5,225],[517.5,455],[232.5,455]];
  data.forEach(function(d,i){
    var cx=centers[i][0],cy=centers[i][1];
    var spentH=d.spent/60,goalH=d.goal/60;
    var rAct=spentH>0?Math.min(46,8.6*Math.sqrt(spentH)):0;
    var rGoal=goalH>0?Math.min(86,8.6*Math.sqrt(goalH)):0;
    if(rGoal>0)s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+rGoal+'" fill="none" stroke="'+d.hex+'" stroke-width="1.6" stroke-dasharray="5 4"/>';
    if(rAct>0)s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+rAct+'" fill="'+d.hex+'"/>';
    var labelY=cy+(rAct>0?Math.max(15,rAct*0.62):0);
    if(rAct>=11)s+='<text x="'+cx+'" y="'+Math.round(cy+rAct*0.35)+'" text-anchor="middle" fill="#fff" font-size="16" font-weight="700" style="font-family:inherit">'+qdFmtHour(d.spent)+'</text>';
    else if(spentH>0)s+='<text x="'+cx+'" y="'+Math.round(cy-rAct-6)+'" text-anchor="middle" fill="'+d.deep+'" font-size="11.5" font-weight="600" style="font-family:inherit">'+qdFmtHour(d.spent)+'</text>';
    var goalTxt=qdQuadGoal(i)>0?'目标 '+qdFmtHour(d.goal):'';
    var gY=0;
    if(i===0)gY=326;else if(i===1)gY=326;else gY=556;
    if(goalTxt)s+='<text x="'+cx+'" y="'+gY+'" text-anchor="middle" fill="#B8ABCD" font-size="11" style="font-family:inherit">'+goalTxt+'</text>';
  });
  s+='</svg>';
  wrap.innerHTML=s;
  var lg=document.getElementById('qd-bubble-legend');
  if(lg){
    lg.innerHTML=QD_META.map(function(m,i){
      return '<span><span class="qd-dot" style="background:'+m.hex+';display:inline-block;width:10px;height:10px;border-radius:3px"></span>'+m.name+
      ' <b>'+qdFmtHour(qdQuadSpent(i,month))+'</b><span class="p">/ 目标 '+qdFmtHour(qdQuadGoal(i))+'</span></span>';
    }).join('');
  }
}
function qdSmooth(pts){
  if(pts.length<2)return '';
  if(pts.length===2)return 'L'+pts[1][0].toFixed(1)+','+pts[1][1].toFixed(1);
  var d='';
  for(var i=0;i<pts.length-1;i++){
    var p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    var c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6;
    var c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6;
    d+='C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+p2[0].toFixed(1)+','+p2[1].toFixed(1);
  }
  return d;
}
function renderQdArea(){
  var wrap=document.getElementById('qd-area-wrap');if(!wrap)return;
  var days=qdLast7Days();
  var W=680,H=430,L=42,R=18,T=44,B=52;
  var dayMin=[];days.forEach(function(d){
    var dm=[0,0,0,0];
    qdSessions().forEach(function(x){
      if(x.assignee!==currentOwner||x.date!==d.date)return;
      if(x.quad>=0&&x.quad<4)dm[x.quad]+=x.min||0;
    });
    dayMin.push(dm);
  });
  var xs=days.map(function(d,i){return L+i*(W-L-R)/6});
  var goalDaily=qdTotalGoal()/30;
  var maxV=Math.max(2,goalDaily*1.25);
  dayMin.forEach(function(dm){var tot=dm.reduce(function(a,b){return a+b},0)/60;if(tot>maxV)maxV=tot;});
  var y=function(v){return H-B-(v/60)*(H-B-T)/maxV};
  // bands bottom->top: q3,q2,q1,q0
  var order=[3,2,1,0];
  var cum=[0,0,0,0,0,0,0];
  var layers=[];
  order.forEach(function(q){
    var pts=[],lo=[];
    for(var i=0;i<7;i++){
      cum[i]+=dayMin[i][q];
      pts.push([xs[i],y(cum[i])]);
      lo.push([xs[i],y(cum[i]-dayMin[i][q])]);
    }
    layers.push({q:q,top:pts,bot:lo});
  });
  var s='<svg viewBox="0 0 '+W+' '+H+'" class="qd-svg" role="img" aria-label="近7天四象限用时堆叠面积图">';
  layers.forEach(function(ly){
    var m=QD_META[ly.q];
    var botRev=ly.bot.slice().reverse();
    var d='M'+ly.top[0][0].toFixed(1)+','+ly.top[0][1].toFixed(1)+qdSmooth(ly.top)+
      'L'+ly.bot[6][0].toFixed(1)+','+ly.bot[6][1].toFixed(1)+qdSmooth(botRev)+'Z';
    s+='<path d="'+d+'" fill="'+m.hex+'" fill-opacity="0.88"/>';
    s+='<path d="M'+ly.top[0][0].toFixed(1)+','+ly.top[0][1].toFixed(1)+qdSmooth(ly.top)+'" fill="none" stroke="'+m.deep+'" stroke-width="1.4"/>';
  });
  // totals dots + labels
  var totals=dayMin.map(function(dm){return dm.reduce(function(a,b){return a+b},0)});
  totals.forEach(function(t,i){
    var cy=y(t);
    s+='<circle cx="'+xs[i]+'" cy="'+cy+'" r="3.4" fill="#fff" stroke="#D8495C" stroke-width="2"/>'+
      '<text x="'+xs[i]+'" y="'+(cy-9)+'" text-anchor="middle" fill="#3A3348" font-size="12.5" font-weight="700" style="font-family:inherit">'+(t>0?qdFmtHour(t):'0h')+'</text>';
  });
  // weekday + date labels
  days.forEach(function(d,i){
    s+='<text x="'+xs[i]+'" y="'+(H-B+20)+'" text-anchor="middle" fill="#7B6E8E" font-size="13" style="font-family:inherit">'+d.wd+'</text>'+
      '<text x="'+xs[i]+'" y="'+(H-B+36)+'" text-anchor="middle" fill="#B8ABCD" font-size="10.5" style="font-family:inherit">'+d.date.slice(5)+'</text>';
  });
  if(goalDaily>0){
    var ty=y(goalDaily*60);
    s+='<line x1="'+L+'" y1="'+ty+'" x2="'+(W-R)+'" y2="'+ty+'" stroke="#B8ABCD" stroke-width="1.2" stroke-dasharray="6 4"/>'+
      '<text x="'+(W-R)+'" y="'+(ty-6)+'" text-anchor="end" fill="#B8ABCD" font-size="11" style="font-family:inherit">日均目标 '+qdFmtHour(goalDaily*60)+'</text>';
  }
  s+='</svg>';
  wrap.innerHTML=s;
  var lg=document.getElementById('qd-area-legend');
  if(lg){
    lg.innerHTML=QD_META.map(function(m,i){
      var wk=0;dayMin.forEach(function(dm){wk+=dm[i]});
      return '<span><span class="qd-dot" style="background:'+m.hex+';display:inline-block;width:10px;height:10px;border-radius:3px"></span>'+m.name+' <b>'+qdFmtHour(wk)+'</b></span>';
    }).join('');
  }
}
// ===== Job Recap Tab =====
function qdJobCnt(st){
  return qdJobs().filter(function(j){return j.status===st}).length;
}
function renderQdJob(){
  var st=document.getElementById('qd-job-stats');if(!st)return;
  var jobs=qdJobs().slice().sort(function(a,b){return (b.mtime||0)-(a.mtime||0)});
  var total=jobs.length;
  var invited=qdJobCnt('已约面')+qdJobCnt('已面试')+qdJobCnt('已通过')+qdJobCnt('已拿offer');
  var interviewed=qdJobCnt('已面试')+qdJobCnt('已通过')+qdJobCnt('已拿offer');
  var offer=qdJobCnt('已拿offer');
  var inviteRate=total?Math.round(invited/total*100):0;
  st.innerHTML=''+
    '<div class="qd-stat"><div class="l">累计投递</div><div class="v">'+total+'</div><div class="d">家</div></div>'+
    '<div class="qd-stat"><div class="l">面试邀约</div><div class="v">'+invited+'</div><div class="d">邀约率 '+inviteRate+'%</div></div>'+
    '<div class="qd-stat"><div class="l">已完成面试</div><div class="v">'+interviewed+'</div><div class="d">家</div></div>'+
    '<div class="qd-stat"><div class="l">Offer</div><div class="v" style="color:'+QD_META[1].deep+'">'+offer+'</div><div class="d">🎉</div></div>';
  var fun=document.getElementById('qd-job-funnel');
  if(fun){
    fun.innerHTML=''+
      '<div class="qd-fstep"><div class="v">'+total+'</div><div class="l">已投递</div></div>'+
      '<div class="qd-farr">›</div>'+
      '<div class="qd-fstep"><div class="v">'+invited+'</div><div class="l">面试邀约</div></div>'+
      '<div class="qd-farr">›</div>'+
      '<div class="qd-fstep"><div class="v">'+interviewed+'</div><div class="l">已完成面试</div></div>'+
      '<div class="qd-farr">›</div>'+
      '<div class="qd-fstep"><div class="v">'+offer+'</div><div class="l">Offer</div></div>';
  }
  var cnt=document.getElementById('qd-job-count');
  if(cnt)cnt.textContent='共 '+total+' 条';
  var list=document.getElementById('qd-job-list');if(!list)return;
  if(!jobs.length){list.innerHTML='<div class="job-empty">还没有投递记录，添加第一条吧 ✨</div>';return}
  list.innerHTML=jobs.map(function(j){
    return qdJobRow(j);
  }).join('');
}
function qdJobStatusColor(st){
  var map={'已投递':'#B8ABCD','已约面':'#8E7FB5','已面试':'#D99A2B','已通过':'#2E9B6E','已拒绝':'#D8495C','已拿offer':'#2E9B6E'};
  var bgmap={'已投递':'#F1EDF7','已约面':'#EFE9FA','已面试':'#FEF6E7','已通过':'#EAF9F1','已拒绝':'#FDEBEE','已拿offer':'#EAF9F1'};
  return 'style="background:'+bgmap[st]+';color:'+(map[st]||'#7B6E8E')+'"';
}
function qdJobRow(j){
  var open=qdJobOpenId===j.id;
  var opts=QJ_STATUS.map(function(s){return '<option'+(s===j.status?' selected':'')+'>'+s+'</option>'}).join('');
  var html='<div class="qd-job-item">'+
    '<div class="qd-job-main">'+
    '<div class="qd-job-co">'+esc(j.company)+(j.position?'<span style="color:var(--text2);font-weight:600;font-size:12.5px"> · '+esc(j.position)+'</span>':'')+'</div>'+
    '<div class="qd-job-meta">'+(j.date||'')+(j.channel?' · '+esc(j.channel):'')+(j.round?' · '+esc(j.round):'')+(j.interviewDate?' · 面试 '+j.interviewDate:'')+'</div>'+
    '</div>'+
    '<select class="pill" style="border-radius:12px" onchange="qdJobSetStatus(\''+j.id+'\',this.value)">'+opts+'</select>'+
    '<button class="qd-op" style="width:auto;padding:0 10px" onclick="qdJobToggleOpen(\''+j.id+'\')" title="复盘">📝 复盘</button>'+
    '<button class="qd-op red" onclick="qdJobDel(\''+j.id+'\')" title="删除">✕</button></div>';
  if(open){
    html+='<div class="qd-job-rev">'+
      '<div class="qd-ef"><label>轮次/时间</label><input type="text" id="qd-r-round" placeholder="如：一面 · 9月8日 14:00" value="'+(j.round?esc(j.round):'')+'"></div>'+
      '<div class="qd-ef"><label>复盘内容</label></div>'+
      '<textarea id="qd-r-review" placeholder="问了什么 / 答得怎么样 / 下次怎么改进…">'+esc(j.review||'')+'</textarea>'+
      '<div class="qd-ef-actions" style="margin-top:8px">'+
      '<button class="btn btn-sm" onclick="qdJobSaveReview(\''+j.id+'\')">保存复盘</button>'+
      '<button class="btn btn-sm btn-ghost" onclick="qdJobOpenId=null;renderQdJob()">收起</button></div></div>';
  }else if(j.review){
    html+='<div class="qd-job-rev"><div class="qd-job-review-view">'+esc(j.review)+'</div></div>';
  }
  return html;
}
function qdJobAdd(){
  var c=document.getElementById('qd-job-company');if(!c)return;
  var name=c.value.trim();if(!name)return;
  var p=document.getElementById('qd-job-position'),ch=document.getElementById('qd-job-channel');
  qdJobs().push({id:genId(),mtime:Date.now(),company:name,position:p.value.trim(),channel:ch.value.trim(),date:today(),status:'已投递',review:''});
  saveData();c.value='';p.value='';ch.value='';renderQdJob();
  qdPomoToast('已记录投递 '+name);
}
function qdJobSetStatus(id,st){
  var j=qdJobs().find(function(x){return x.id===id});
  if(j){j.status=st;j.mtime=Date.now();saveData();renderQdJob();}
}
function qdJobToggleOpen(id){qdJobOpenId=(qdJobOpenId===id)?null:id;renderQdJob()}
function qdJobSaveReview(id){
  var j=qdJobs().find(function(x){return x.id===id});if(!j)return;
  var rr=document.getElementById('qd-r-round'),rv=document.getElementById('qd-r-review');
  j.round=rr?rr.value.trim():j.round;
  j.review=rv?rv.value.trim():j.review;
  j.mtime=Date.now();saveData();qdJobOpenId=null;renderQdJob();
  qdPomoToast('复盘已保存');
}
function qdJobDel(id){
  markRemoved('quadrants:jobs',id);
  qdJobs().splice(qdJobs().findIndex(function(x){return x.id===id}),1);
  qdJobOpenId=null;saveData();renderQdJob();
}

// ===== Init =====
updateSidebarDate();
loadData().then(function(){
  renderDashboard();
  startAutoPull();
  // 页面从后台切回前台 / 窗口重新获焦时，立即拉一次云端，消除"开着但没同步"的空窗
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')syncNow();});
  window.addEventListener('focus',syncNow);
});
renderDashboard();
