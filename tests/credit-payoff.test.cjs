'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../money-insights.js');
const payoff=globalThis.TakeControlInsights.creditPayoff;
test('zero APR pays principal only, floor is capped on final payment',()=>{
 const result=payoff([{cardBalance:5100,apr:0}],0);
 assert.equal(result.months,3);assert.equal(result.totalInterest,0);assert.equal(result.totalPaid,5100);
 assert.equal(payoff([{cardBalance:0,apr:20}],0).months,0);
 assert.equal(payoff([],5000).months,0);
});
test('monthly interest and declining minimums conserve principal and interest',()=>{
 const result=payoff([{cardBalance:10000,apr:24}],0);
 // Independent hand-calculated $100 balance: interest 200,154,107,59,10 cents.
 assert.equal(result.months,5);assert.equal(result.totalInterest,530);
 assert.equal(result.totalPaid,10530);
});
test('extra is shared once across cards in APR order and cannot overpay',()=>{
 const result=payoff([{cardBalance:10000,apr:0},{cardBalance:10000,apr:24}],10000);
 assert.equal(result.paidAt[1],1);assert.equal(result.paidAt[0],2);
 assert.equal(result.totalInterest,200);assert.equal(result.totalPaid,20200);
});
test('demo payoff uses current balances and improves with larger extra payments without mutation',()=>{
 const cards=[{cardBalance:285000,apr:24.99},{cardBalance:112500,apr:19.49},{cardBalance:75000,apr:21.49}];
 const original=JSON.stringify(cards),base=payoff(cards,0),extra=payoff(cards,5000),more=payoff(cards,10000);
 assert.equal(base.months,180);assert.deepEqual(base.paidAt,[180,77,44]);assert.equal(extra.months,52);
 assert.ok(extra.totalInterest<base.totalInterest);assert.ok(more.totalInterest<extra.totalInterest);assert.ok(more.months<extra.months);
 assert.equal(extra.totalPaid,472500+extra.totalInterest);assert.equal(JSON.stringify(cards),original);
});
test('invalid balances, APRs and extra amounts do not produce misleading projections',()=>{
 for(const card of [{cardBalance:-1,apr:20},{cardBalance:100,apr:NaN},{cardBalance:100,apr:101},{cardBalance:1.2,apr:20},{cardBalance:'100',apr:20}])assert.equal(payoff([card],0),null);
 for(const extra of [-1,NaN,Infinity,0.5])assert.equal(payoff([{cardBalance:100,apr:20}],extra),null);
});
