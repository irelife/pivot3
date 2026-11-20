/* ★★ 「契約を消したのに、すぐ戻ってくる」の再現
 *
 *   2026/11/20、PIVOT4 で ロムさんが見つけた症状です。
 *   カードの × を押して消すと、その場ですぐ元に戻ります。
 *
 *   ここで見張ること
 *     ① 消したあと、手元の契約が1件減っている
 *     ② クラウド（Firestore）からも、その契約が消えている
 *     ③ そのあと読み直しても、戻ってこない
 *     ④ 控えのスプレッドシートが古いままでも、戻ってこない
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
 const dlg=[]; pg.on('dialog',d=>{ dlg.push(d.message().slice(0,90).replace(/\n/g,' ')); d.accept(); });
 const logs=[]; pg.on('console',m=>logs.push(String(m.text()).slice(0,150)));
 const errs=[]; pg.on('pageerror',e=>errs.push(e.message.slice(0,160)));

 /* 控えのスプレッドシート（GAS）は、消す前の6件を返しつづけます。
    実際の運用でも、控えは すぐには直りません。              */
 const SHEET={ buildings:{}, contracts:{}, owners:[] };
 for(let i=1;i<=6;i++){
   SHEET.contracts['c'+i]={ id:'c'+i, property:'物件'+i, room:'10'+i,
                            contractor:'契約者'+i, status:'申込' };
 }
 /* にせ GAS。本物と同じように、deleteContract で行を消し、
    saveContractsOnly で表を作り直します。
    （ここを「何もしない」にすると、消したあと控えから戻ってきます。
      それは検査の作りの話で、本物の動きではありません）        */
 const gasSeen = [];
 await pg.route('**://**', r=>{ const u=r.request().url();
   if(u.startsWith('file://')) return r.continue();
   if(u.indexOf('example.invalid')>=0){
     let body={};
     try{ body = JSON.parse(r.request().postData()||'{}'); }catch(e){ body={}; }
     const act = body && body.action;
     if(act) gasSeen.push(act);
     if(act==='deleteContract' && body.id){ delete SHEET.contracts[body.id]; }
     if(act==='saveContractsOnly' && body.payload && body.payload.contracts){
       SHEET.contracts = JSON.parse(JSON.stringify(body.payload.contracts));
     }
     return r.fulfill({status:200,contentType:'application/json',
       body:JSON.stringify({ok:true,version:'t',payload:SHEET})});
   }
   return r.fulfill({status:200,contentType:'application/javascript',body:'/* stub */'}); });

 await pg.addInitScript(FAKE);
 /* ★ PIVOT4 の画面を開きます（PIVOT3 ではありません） */
 await pg.goto('file://'+DIR+'/pivot4/index.html'); await pg.waitForTimeout(1200);
 const pre = await pg.evaluate(()=>(typeof insPrefix==='function'?insPrefix():'pivot_'));
 ok('★ PIVOT4 の画面を開いている（pivot4_）', pre === 'pivot4_', pre);

 await pg.evaluate((g)=>{ localStorage.setItem((typeof insPrefix==='function'?insPrefix():'pivot_')+'cloud_url', g); },
                   'https://example.invalid/gas');

 const CT = pre.replace(/_+$/,'') + '/data/contracts';
 const LS = pre + 'contract_kanban_v2';

 /* ★ 物件があるときと、無いときで分けて試します（PV_BLD=1 で物件あり） */
 const WITH_BLD = process.env.PV_BLD === '1';
 const BP = pre.replace(/_+$/,'') + '/data/buildings';
 if(WITH_BLD){
   SHEET.buildings = { b1:{ id:'b1', name:'物件A', addr:'岡山県岡山市北区1-1', spots:{} } };
 }
 console.log('   物件：' + (WITH_BLD ? 'あり（1件）' : 'なし（0件）'));

 /* ★ にせクラウドの中身は sessionStorage に控えます。
      その控えは、画面を読み込んだときに1回だけ読み出されます。
      ですから「入れてから読み込み直す」と、混んでいるときに
      前の画面の書き込みと新しい画面の読み出しがぶつかり、
      入れたはずの6件が消えることがあります（2026/11/20）。
      読み込み直したあとに入れて、そのまま取り込ませます。     */
 await pg.reload(); await pg.waitForTimeout(3000);
 await pg.evaluate((a)=>{
   if(a[2]){
     window.__seed(a[1],'b1',{ id:'b1', name:'物件A', addr:'岡山県岡山市北区1-1',
       spots:{}, rev:1, updatedAt:'2026-11-01T00:00:00.000Z', updatedBy:'x' });
   }
   for(var i=1;i<=6;i++){
     window.__seed(a[0],'c'+i,{ id:'c'+i, property:'物件'+i, room:'10'+i,
       contractor:'契約者'+i, status:'申込', rev:1, updatedAt2:'2026-11-01T00:00:00.000Z' });
   }
 }, [CT, BP, WITH_BLD]);
 await pg.evaluate(()=>{ try{ window.forcePullLatest(); }catch(e){} });
 await pg.waitForTimeout(Number(process.env.PV_WAIT||7000));

 const nLocal = ()=>pg.evaluate((k)=>{ try{ return Object.keys(JSON.parse(localStorage.getItem(k)||'{}')).length; }catch(e){ return -1; } }, LS);
 const hasLocal = (id)=>pg.evaluate((a)=>{ try{ return !!JSON.parse(localStorage.getItem(a[0])||'{}')[a[1]]; }catch(e){ return false; } }, [LS,id]);
 const hasCloud = (id)=>pg.evaluate((a)=>{ try{ return !!JSON.parse(sessionStorage.getItem('__fakedb')||'{}')[a[0]+'/'+a[1]]; }catch(e){ return false; } }, [CT,id]);

 console.log('\n❶ 下ごしらえ');
 ok('★ 手元に契約6件', (await nLocal())===6, await nLocal());
 const cloudKeys = ()=>pg.evaluate(()=>{ try{ return Object.keys(JSON.parse(sessionStorage.getItem('__fakedb')||'{}')); }catch(e){ return ['よめません']; } });
 ok('★ クラウドにも c3 がある', (await hasCloud('c3'))===true, await cloudKeys());

 console.log('\n❷ ★ カードの × を押して、1件消す');
 dlg.length = 0;
 await pg.evaluate(()=>{ try{ KB.deleteCardContract(null,'c3'); }catch(e){ window.__delErr = String(e); } });
 await pg.waitForTimeout(7000);
 const derr = await pg.evaluate(()=>window.__delErr || '');
 ok('★ 削除の呼び出しでエラーが出ていない', !derr, derr);
 ok('★ 「削除しますか?」の確認が出た', dlg.some(m=>/削除しますか/.test(m)), dlg);

 console.log('\n❸ ★★ 消した直後');
 ok('★★ 手元から c3 が消えた', (await hasLocal('c3'))===false, await nLocal());
 ok('★★ 手元は5件になった', (await nLocal())===5, await nLocal());
 ok('★★ クラウドからも c3 が消えた', (await hasCloud('c3'))===false);
 ok('★★ 控えのスプレッドシートからも c3 が消えた', !SHEET.contracts['c3'],
    { 控え:Object.keys(SHEET.contracts), GASに送った用事:gasSeen.slice(-6) });

 console.log('\n❹ ★★ 読み直しても、戻ってこない');
 await pg.evaluate(()=>{ try{ window.forcePullLatest(); }catch(e){} });
 await pg.waitForTimeout(6000);
 ok('★★ 読み直しても c3 は戻らない', (await hasLocal('c3'))===false, await nLocal());

 console.log('\n❺ ★★ 画面を開き直しても、戻ってこない');
 await pg.reload(); await pg.waitForTimeout(6000);
 ok('★★ 開き直しても c3 は戻らない', (await hasLocal('c3'))===false, await nLocal());
 ok('★★ ほかの5件は残っている', (await nLocal())===5, await nLocal());

 /* ---- ★ 2台めの端末（版番号を控えていない）が、書き戻さないか ---- */
 console.log('\n❻ ★★ 古いままの2台めが、消した契約を書き戻さない');
 /* 2026/11/20 ロムさんの PC と同じ形を作ります。
      ・手元の契約表には c3 が残っている
      ・版番号も指紋も控えていない（物件0件の端末は、こうなっていました）
      ・消した印の写しも持っていない
    この端末が読み直したとき、c3 を「自分の作りたて」と誤解して
    クラウドへ書き戻すと、消したはずの契約が全員に戻ります。      */
 await pg.evaluate((a)=>{
   var LS = a[0], pre = a[1];
   var m = {}; try{ m = JSON.parse(localStorage.getItem(LS)||'{}'); }catch(e){ m = {}; }
   m['c3'] = { id:'c3', property:'物件3', room:'103', contractor:'契約者3', status:'申込' };
   localStorage.setItem(LS, JSON.stringify(m));
   var rev = {}, sg = {};
   try{ rev = JSON.parse(localStorage.getItem(pre+'fs_ct_rev')||'{}'); }catch(e){}
   try{ sg  = JSON.parse(localStorage.getItem(pre+'fs_ct_sig')||'{}'); }catch(e){}
   delete rev['c3']; delete sg['c3'];
   localStorage.setItem(pre+'fs_ct_rev', JSON.stringify(rev));
   localStorage.setItem(pre+'fs_ct_sig', JSON.stringify(sg));
   localStorage.removeItem(pre+'fs_ct_gone');     /* 印の写しも持っていない */
 }, [LS, pre]);
 ok('★ 2台めの形を作れた（c3 が手元に戻っている）', (await hasLocal('c3'))===true);

 await pg.reload(); await pg.waitForTimeout(8000);
 await pg.evaluate(()=>{ try{ if(typeof window.__pushNow==='function') window.__pushNow(); }catch(e){} });
 await pg.waitForTimeout(6000);

 ok('★★ 2台めの手元からも c3 が消えた', (await hasLocal('c3'))===false, await nLocal());
 ok('★★ クラウドへ書き戻していない',   (await hasCloud('c3'))===false);
 ok('★★ 控えの表へも書き戻していない', !SHEET.contracts['c3'], Object.keys(SHEET.contracts));

 console.log('\n❼ 画面のエラー');
 ok('★ エラーなし', errs.length===0, errs);

 const hint = (process.env.PV_ALLLOG==='1') ? logs.slice(-60) : logs.filter(l=>/契約|削除|保存|止め/.test(l)).slice(-12);
 if(F) console.log('\n--- 手がかり（画面の記録）---\n' + hint.join('\n'));

 await b.close();
 console.log('\nPASS='+P+'  FAIL='+F);
 process.exit(F?1:0);
})();
