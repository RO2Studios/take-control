/* Local-only, deterministic habit progress. Never uses balance or spending volume as points. */
(function(root){
'use strict';
const levels=[
 {name:'Money Rookie',short:'Rookie',color:'#15803d',icon:'sprout',min:0},
 {name:'Money Builder',short:'Builder',color:'#087a29',icon:'chart',min:80},
 {name:'Money Strategist',short:'Strategist',color:'#2563eb',icon:'rocket',min:170},
 {name:'Money Master',short:'Master',color:'#b7791f',icon:'trophy',min:290}
];
function achievements(s){
 const tx=Array.isArray(s.tx)?s.tx:[], rec=Array.isArray(s.recs)?s.recs:[], reviews=Array.isArray(s.reviews)?s.reviews:[], learned=s.learned||{};
 const lessons=Object.keys(learned).filter(k=>!!learned[k]).length;
 const annual=rec.filter(r=>r.type==='out'&&['annual','quarterly'].includes(r.freq)).length;
 const out=[
  {id:'budget',title:'Create your budget',done:!!s.budget?.done,xp:50,view:'plan'},
  {id:'firstlog',title:'Log your first purchase',done:tx.some(t=>t.type==='out'),xp:20,view:'today'},
  {id:'five',title:'Log five purchases',done:tx.filter(t=>t.type==='out').length>=5,xp:30,view:'today'},
  {id:'ten',title:'Log ten purchases',done:tx.filter(t=>t.type==='out').length>=10,xp:30,view:'today'},
  {id:'lesson1',title:'Finish one money lesson',done:lessons>=1,xp:20,view:'learn'},
  {id:'lesson3',title:'Finish three money lessons',done:lessons>=3,xp:30,view:'learn'},
  {id:'lesson6',title:'Finish six money lessons',done:lessons>=6,xp:40,view:'learn'},
  {id:'bill',title:'Plan an annual or quarterly bill',done:annual>=1,xp:30,view:'plan'},
  {id:'review',title:'Complete a weekly review',done:reviews.length>=1,xp:30,view:'review'},
  {id:'reviews3',title:'Complete three weekly reviews',done:reviews.length>=3,xp:40,view:'review'},
  {id:'goal',title:'Set an emergency savings goal',done:!!s.goals?.ef?.target,xp:20,view:'plan'}
 ];
 return out;
}
function progress(s){
 const missions=achievements(s),earned=missions.reduce((sum,m)=>sum+(m.done?m.xp:0),0),xp=Math.max(earned,Number.isFinite(s.moneyXPHigh)?s.moneyXPHigh:0);
 let index=levels.length-1;
 for(let i=0;i<levels.length-1;i++)if(xp<levels[i+1].min){index=i;break;}
 const cur=levels[index],next=levels[index+1];
 const levelPercent=next?Math.max(0,Math.min(100,Math.floor((xp-cur.min)/(next.min-cur.min)*100))):100;
 const percent=Math.max(0,Math.min(100,Math.floor(xp/levels[levels.length-1].min*100)));
 return {index,level:index+1,current:cur,next,percent,levelPercent,xp,missions,remaining:missions.filter(m=>!m.done),total:missions.length,completed:missions.length-missions.filter(m=>!m.done).length};
}
root.TakeControlLevels={levels,achievements,progress};
})(typeof window!=='undefined'?window:globalThis);
