/* Take Control financial insights: cents only, no network calls. */
(function(root){
'use strict';
const DAY=86400000;
function parseDate(iso){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');if(!m)return null;const d=Date.UTC(+m[1],+m[2]-1,+m[3]);return new Date(d).toISOString().slice(0,10)===iso?Math.floor(d/DAY):null;}
function datePart(day){const d=new Date(day*DAY);return {y:d.getUTCFullYear(),m:d.getUTCMonth(),d:d.getUTCDate()};}
function clampMonth(y,m,dom){const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return Math.floor(Date.UTC(y,m,Math.min(dom,last))/DAY);}
function hits(r,day){const first=parseDate(r.start);if(first===null||day<first)return false;const a=datePart(first),b=datePart(day),diff=(b.y-a.y)*12+(b.m-a.m);if(r.freq==='annual'||r.freq==='yearly')return diff>=0&&diff%12===0&&day===clampMonth(b.y,b.m,a.d);if(r.freq==='quarterly')return diff>=0&&diff%3===0&&day===clampMonth(b.y,b.m,a.d);return false;}
function nextDue(r,today){const start=parseDate(r.start);if(start===null)return null;const freq=r.freq==='annual'||r.freq==='yearly'?12:r.freq==='quarterly'?3:0;if(!freq)return null;let n=start;for(let i=0;i<200&&n<today;i++){const p=datePart(start);const d=new Date(Date.UTC(p.y,p.m+(i+1)*freq,1));n=clampMonth(d.getUTCFullYear(),d.getUTCMonth(),p.d);}return n>=today?n:null;}
function subscriptionTotals(recs){let yearly=0;const items=(recs||[]).filter(r=>r.type==='out'&&(r.kind==='subscription'||r.cat==='Subscriptions')).map(r=>{const per={weekly:52,biweekly:26,twice:24,monthly:12,quarterly:4,annual:1,yearly:1,once:0}[r.freq]||0;const annual=Math.round(r.amt*per);yearly+=annual;return {name:r.name,annual,monthly:Math.round(annual/12),frequency:r.freq};});return {items,annual:yearly,monthly:Math.round(yearly/12)};}
function paycheckAdvice(rec,pays,today,saved){const due=nextDue(rec,today);if(due===null)return null;const remaining=Math.max(0,rec.amt-(saved||0));if(remaining===0)return {remaining:0,due,payments:0,perPaycheck:0};let dates=[];for(const pay of pays||[]){if(pay.type!=='in')continue;const start=parseDate(pay.start);if(start===null)continue;for(let d=Math.max(today,start);d<=due;d++){const p=datePart(d),a=datePart(start);const month=(p.y-a.y)*12+p.m-a.m;let yes=false;switch(pay.freq){case 'weekly':yes=(d-start)%7===0;break;case 'biweekly':yes=(d-start)%14===0;break;case 'monthly':yes=p.d===Math.min(a.d,new Date(Date.UTC(p.y,p.m+1,0)).getUTCDate());break;case 'twice':yes=p.d===Math.min(a.d,new Date(Date.UTC(p.y,p.m+1,0)).getUTCDate())||p.d===Math.min(pay.day2||15,new Date(Date.UTC(p.y,p.m+1,0)).getUTCDate());break;case 'quarterly':yes=month>=0&&month%3===0&&p.d===Math.min(a.d,new Date(Date.UTC(p.y,p.m+1,0)).getUTCDate());break;case 'annual':yes=month>=0&&month%12===0&&p.d===Math.min(a.d,new Date(Date.UTC(p.y,p.m+1,0)).getUTCDate());}if(yes)dates.push(d);}}
const n=new Set(dates).size;return {remaining,due,payments:n,perPaycheck:n?Math.ceil(remaining/n):null};}
function foodDelivery(tx,today){const month=datePart(today),start=Math.floor(Date.UTC(month.y,month.m,1)/DAY);const matched=(tx||[]).filter(t=>t.type==='out'&&t.day>=start&&t.day<=today&&(/\b(?:doordash|door dash|ubereats|uber eats|grubhub|postmates)\b/i.test((t.note||'')+' '+(t.cat||''))));return {amount:matched.reduce((a,t)=>a+t.amt,0),count:matched.length};}
function debtCost(rec){if(!Number.isFinite(rec.apr)||rec.apr<0||rec.apr>100)return null;return Math.round(rec.amt*rec.apr/1200);}
/* Illustrative minimum: interest + 1% of principal, with a $25 floor.
   All amounts are integer cents. Extra is allocated once per month, highest APR first.
   Scheduled bill amounts are deliberately not treated as issuer minimums. */
function creditPayoff(cards,extra){
 if(!Array.isArray(cards)||!Number.isSafeInteger(extra)||extra<0)return null;
 if(cards.some(c=>!Number.isSafeInteger(c.cardBalance)||c.cardBalance<0||!Number.isFinite(c.apr)||c.apr<0||c.apr>100))return null;
 const balances=cards.map(c=>c.cardBalance),paidAt=balances.map(b=>b===0?0:null);
 const order=cards.map((c,i)=>i).sort((a,b)=>cards[b].apr-cards[a].apr);
 let months=0,totalInterest=0,totalPaid=0;
 while(balances.some(b=>b>0)&&months<1200){
  months++;
  const interest=balances.map((b,i)=>Math.round(b*cards[i].apr/1200));
  const payments=balances.map((b,i)=>b?Math.min(b+interest[i],Math.max(2500,interest[i]+Math.ceil(b*.01))):0);
  let remaining=extra;
  for(const i of order){const add=Math.min(remaining,balances[i]+interest[i]-payments[i]);payments[i]+=add;remaining-=add;}
  balances.forEach((b,i)=>{balances[i]=b+interest[i]-payments[i];totalInterest+=interest[i];totalPaid+=payments[i];if(balances[i]===0&&paidAt[i]===null)paidAt[i]=months;});
 }
 return {months:balances.some(b=>b>0)?null:months,totalInterest,totalPaid,paidAt};
}
root.TakeControlInsights={hits,nextDue,subscriptionTotals,paycheckAdvice,foodDelivery,debtCost,creditPayoff,parseDate};
})(typeof window!=='undefined'?window:globalThis);
