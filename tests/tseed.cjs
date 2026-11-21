/* ★★ 「物件を、はじめてクラウドへ写す」道具の検査
 *
 *   PIVOT4 は、物件がクラウドに1件も入っていませんでした。
 *   控えのスプレッドシート（PIVOT3 と共有）と端末の中にしか無く、
 *   PIVOT3 が控えを作り直すと、足した物件が消える形でした。
 *   （2026/11/22 ノスタルジア・バーチェツダカ・ヒガリア）
 *
 *   見張ること
 *     ① クラウドが0件のとき、手元の物件をぜんぶ写す
 *     ② 写したあと、版番号と指紋も控える（次の保存が「全部変わった」にならない）
 *     ③ クラウドに1件でもあるときは、何もしない（上書き事故を防ぐ）
 *     ④ 「移行」と入れるまでボタンは押せない
 */
const fs=require('fs');
const {chromium}=(function(){ try{ return require('playwright'); }
                              catch(e){ return require('playwright-core'); } })();
const DIR = require('path').resolve(process.argv[2] || require('path').join(__dirname, '..'));
let FAKE=eval(fs.readFileSync(__dirname+'/tquota.cjs','utf8').match(/const FAKE = (`[\s\S]*?`);\n/)[1]);
FAKE = FAKE.replace('var DB = { docs:{} };', [
  "var _raw=(function(){ try{ return JSON.parse(sessionStorage.getItem('__fakedb')||'{}'); }catch(e){ return {}; } })();",
  "var _save=function(){ try{ sessionStorage.setItem('__fakedb', JSON.stringify(_raw)); }catch(e){} };",
  "var DB = { docs: new Proxy(_raw, { set:function(t,k,v){ t[k]=v; _save(); return true; },",
  "  deleteProperty:function(t,k){ delete t[k]; _save(); return true; } }) };"].join('\n'));

let P=0,F=0; const ok=(n,c,x)=>{ if(c){P++;console.log('  ✅ '+n);} else {F++;console.log('  ❌ '+n+(x!==undefined?('  → '+JSON.stringify(x)):''));} };

(async()=>{
 const b=await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined});
 const pg=await b.newPage({viewport:{width:1200,height:900}});
 const dlg=[]; pg.on('dialog',d=>{ dlg.push(d.message().slice(0,110).replace(/\n/g,' ')); d.accept(); });
 const errs=[]; pg.on('pageerror',e=>errs.push(e.message.slice(0,160)));

 /* 控えのスプレッドシートには物件3件。クラウドには1件も無い状態を作ります */
 const SHEET={ buildings:{}, contracts:{}, owners:[] };
 const NAMES = ['ノスタルジア','バーチェツダカ','ヒガリア'];
 NAMES.forEach(function(nm,i){
   SHEET.buildings['b'+(i+1)] = { id:'b'+(i+1), name:nm, addr:'岡山県岡山市北区'+(i+1)+'-'+(i+1),
     spots:{ '1':{no:'1',type:'並',tou:'',room:'',user:'',price:0,status:'空',note:''} } };
 });

 await pg.route('**://**', r=>{ const u=r.request().url();
   if(u.startsWith('file://')) return r.continue();
   if(u.indexOf('example.invalid')>=0) return r.fulfill({status:200,contentType:'application/json',
     body:JSON.stringify({ok:true,version:'t',payload:SHEET})});
   return r.fulfill({status:200,contentType:'application/javascript',body:'/* stub */'}); });

 await pg.addInitScript(FAKE);
 await pg.goto('file://'+DIR+'/pivot4/index.html'); await pg.waitForTimeout(1200);
 const pre = await pg.evaluate(()=>(typeof insPrefix==='function'?insPrefix():'pivot_'));
 ok('★ PIVOT4 の画面を開いている（pivot4_）', pre === 'pivot4_', pre);

 await pg.evaluate((g)=>{ localStorage.setItem((typeof insPrefix==='function'?insPrefix():'pivot_')+'cloud_url', g); },
                   'https://example.invalid/gas');
 await pg.reload(); await pg.waitForTimeout(6000);

 const BP = pre.replace(/_+$/,'') + '/data/buildings';
 const nLocal = ()=>pg.evaluate(()=>{ try{ return Object.keys(pbLoadAll()||{}).length; }catch(e){ return -1; } });
 const cloudBlds = ()=>pg.evaluate((p)=>{ try{
   return Object.keys(JSON.parse(sessionStorage.getItem('__fakedb')||'{}'))
     .filter(function(k){ return k.indexOf(p+'/')===0; }).length; }catch(e){ return -1; } }, BP);
 const revCount = ()=>pg.evaluate((k)=>{ try{ return Object.keys(JSON.parse(localStorage.getItem(k)||'{}')).length; }catch(e){ return -1; } }, pre+'fs_rev');

 /* ログイン画面が上にかぶさるので、本物のクリックは使いません */
 const setWord = async (v)=>{ await pg.evaluate((t)=>{
   var el=document.getElementById('sb-word'); if(!el) return;
   el.value=t; el.dispatchEvent(new Event('input',{bubbles:true}));
 }, v); };

 console.log('\n❶ 下ごしらえ（PIVOT4 と同じ形）');
 ok('★ 手元に物件3件（控えの表から）', (await nLocal())===3, await nLocal());
 ok('★★ クラウドには物件が1件も無い', (await cloudBlds())===0, await cloudBlds());

 console.log('\n❷ ★ 道具の画面');
 await pg.evaluate(()=>{ try{ openSeedBlds(); }catch(e){ window.__e=String(e); } });
 await pg.waitForTimeout(400);
 ok('★ 画面が出た', (await pg.evaluate(()=>!!document.getElementById('sb-ov')))===true,
    await pg.evaluate(()=>window.__e||''));
 const hd = await pg.evaluate(()=>{ var e=document.querySelector('#sb-ov .sb-h2'); return e?e.textContent:''; });
 ok('★★ 写す件数が3件と出る', /写す物件（3件）/.test(hd), hd);
 const shown = await pg.evaluate(()=>Array.from(document.querySelectorAll('#sb-ov .sb-r b')).map(e=>e.textContent));
 ok('★★ 新築の名前が並んでいる',
    ['ノスタルジア','バーチェツダカ','ヒガリア'].every(n=>shown.includes(n)), shown);

 console.log('\n❸ ★ 「移行」と入れるまで押せない');
 ok('★★ はじめは押せない', (await pg.evaluate(()=>document.getElementById('sb-go').disabled))===true);
 await setWord('いこう');
 ok('★★ ちがう言葉では押せない', (await pg.evaluate(()=>document.getElementById('sb-go').disabled))===true);
 await setWord('移行');
 ok('★★ 「移行」と入れたら押せる', (await pg.evaluate(()=>document.getElementById('sb-go').disabled))===false);

 console.log('\n❹ ★★ 写したあと');
 dlg.length = 0;
 await pg.evaluate(()=>document.getElementById('sb-go').click());
 await pg.waitForTimeout(6000);
 ok('★★ クラウドに物件3件が入った', (await cloudBlds())===3, await cloudBlds());
 ok('★★ 手元の3件は、そのまま残っている', (await nLocal())===3, await nLocal());
 ok('★★ 版番号も控えた（次の保存が「全部変わった」にならない）', (await revCount())===3, await revCount());
 ok('★★ 「写しました」と知らせる', dlg.some(m=>/写しました/.test(m)), dlg);

 console.log('\n❺ ★★ もう入っているときは、何もしない');
 dlg.length = 0;
 await pg.evaluate(()=>{ try{ openSeedBlds(); }catch(e){} });
 await pg.waitForTimeout(400);
 await setWord('移行');
 await pg.evaluate(()=>document.getElementById('sb-go').click());
 await pg.waitForTimeout(5000);
 ok('★★ クラウドは3件のまま（増えも減りもしない）', (await cloudBlds())===3, await cloudBlds());
 ok('★★ 「写しませんでした」と断る', dlg.some(m=>/写しませんでした/.test(m)), dlg);

 console.log('\n❻ 画面のエラー');
 ok('★ エラーなし', errs.length===0, errs);

 await b.close();
 console.log('\nPASS='+P+'  FAIL='+F);
 process.exit(F?1:0);
})();
