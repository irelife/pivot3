/* ★★ 「岡山市・赤磐市の物件をまとめて消す」道具の検査
 *
 *   js/cityout.js は、物件・契約・オーナーを消します。
 *   取り消しのきかない道具なので、次のことを見張ります。
 *
 *     ① 岡山市・赤磐市の物件だけを消す
 *     ② 倉敷市・笠岡市・総社市には、いっさい触らない
 *     ③ 住所が空の物件は消さない
 *     ④ 消した物件の契約だけを消す
 *     ⑤ その物件しか持っていないオーナーは消す
 *     ⑥ ほかにも物件を持つオーナーは消さず、物件名だけ外す
 *     ⑦ PIVOT4 の画面では動かない
 *
 *   この道具は PIVOT3 の中身を直接さわるので、
 *   本体のアプリは起こさず、入れものだけを用意して試します。
 */
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const {chromium}=(function(){ try{ return require('playwright'); }
                              catch(e){ return require('playwright-core'); } })();
const DIR = path.resolve(process.argv[2] || path.join(__dirname, '..'));

let P=0,F=0;
const ok=(n,c,x)=>{ if(c){P++;console.log('  ✅ '+n);} else {F++;console.log('  ❌ '+n+(x!==undefined?('  → '+JSON.stringify(x)):''));} };

/* 入れものだけの、からっぽの画面 */
const PAGE = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>t</title></head><body></body></html>';

/* 道具が使う足まわりを、ここで用意します（本体のアプリは読みません） */
const STUB = `
  window.__PFX = 'pivot3_';
  window.insPrefix = function(){ return window.__PFX; };
  window.pbKey     = function(){ return window.__PFX + 'blds'; };
  window.ctKey     = function(){ return window.__PFX + 'contract_kanban_v2'; };
  window.pbLoadAll = function(){ try{ return JSON.parse(localStorage.getItem(pbKey())||'{}'); }catch(e){ return {}; } };
  window.pbSaveRaw = function(o){ localStorage.setItem(pbKey(), JSON.stringify(o)); };
  window.__pushed = [];
  window.pushFeatureToCloud = function(f){ window.__pushed.push(f); };
`;

(async()=>{
 const tmp = path.join(os.tmpdir(), 'pvcity_' + Date.now() + '.html');
 fs.writeFileSync(tmp, PAGE, 'utf8');

 const b=await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined});
 const pg=await b.newPage({viewport:{width:900,height:900}});
 const dlg=[]; pg.on('dialog',d=>{ dlg.push(d.message().slice(0,120).replace(/\n/g,' ')); d.accept(); });
 const errs=[]; pg.on('pageerror',e=>errs.push(e.message.slice(0,160)));

 await pg.addInitScript(STUB);
 await pg.goto('file://' + tmp);

 /* ---- 下ごしらえ ---------------------------------------------------- */
 await pg.evaluate(()=>{
   var blds = {
     b1:{ id:'b1', name:'サンプラザ岡山',       addr:'岡山県岡山市北区1-1',   spots:[{no:'1'},{no:'2'},{no:'3'}] },
     b2:{ id:'b2', name:'あかいわ荘',           addr:'岡山県赤磐市下市2-2',   spots:[{no:'1'},{no:'2'}] },
     b3:{ id:'b3', name:'ベラカーサノース',     addr:'岡山県倉敷市老松町3-3', spots:[{no:'1'}] },
     b4:{ id:'b4', name:'エスプレイスビルド',   addr:'岡山県総社市中央4-4',   spots:[{no:'1'}] },
     b5:{ id:'b5', name:'かさおか館',           addr:'岡山県笠岡市五番町5-5', spots:[{no:'1'}] },
     b6:{ id:'b6', name:'住所のない物件',       addr:'',                      spots:[{no:'1'}] }
   };
   localStorage.setItem(pbKey(), JSON.stringify(blds));

   var cts = {
     c1:{ id:'c1', property:'サンプラザ岡山',     room:'101', contractor:'岡山太郎' },
     c2:{ id:'c2', property:'ベラカーサノース',   room:'705', contractor:'倉敷花子' },
     c3:{ id:'c3', property:'あかいわ荘',         room:'201', contractor:'赤磐次郎' },
     c4:{ id:'c4', property:'エスプレイスビルド', room:'106', contractor:'総社三郎' }
   };
   localStorage.setItem(ctKey(), JSON.stringify(cts));

   var ows = [
     { name:'山田', properties:['サンプラザ岡山'],              property:'サンプラザ岡山' },
     { name:'鈴木', properties:['あかいわ荘','かさおか館'],      property:'あかいわ荘、かさおか館' },
     { name:'佐藤', properties:['ベラカーサノース'],            property:'ベラカーサノース' }
   ];
   localStorage.setItem(insPrefix() + 'rent_owner_send_owners_v1', JSON.stringify(ows));
 });

 await pg.addScriptTag({ path: path.join(DIR, 'js', 'cityout.js') });

 console.log('\n❶ 道具が読めている');
 ok('★ openCityOut がある', await pg.evaluate(()=>typeof window.openCityOut === 'function'));

 /* ---- PIVOT4 では動かない ------------------------------------------- */
 console.log('\n❷ ★ PIVOT4 の画面では動かない');
 dlg.length = 0;
 await pg.evaluate(()=>{ window.__PFX = 'pivot4_'; window.openCityOut(); });
 await pg.waitForTimeout(300);
 ok('★★ 画面を出さずに断る', (await pg.evaluate(()=>!document.getElementById('co-ov'))) === true);
 ok('★★ 「PIVOT3 専用です」と知らせる', dlg.some(m=>/PIVOT3 専用/.test(m)), dlg);
 await pg.evaluate(()=>{ window.__PFX = 'pivot3_'; });

 /* ---- 消す前の一覧 --------------------------------------------------- */
 console.log('\n❸ ★ 消す前に、一覧で見せる');
 dlg.length = 0;
 await pg.evaluate(()=>window.openCityOut());
 await pg.waitForTimeout(300);
 ok('★ 画面が出た', (await pg.evaluate(()=>!!document.getElementById('co-ov'))) === true);

 const heads = await pg.evaluate(()=>Array.from(document.querySelectorAll('#co-ov .co-h2')).map(e=>e.textContent));
 ok('★★ 消す物件は2件（岡山市・赤磐市だけ）', heads.some(h=>/消す物件（2件）/.test(h)), heads);
 ok('★★ いっしょに消す契約は2件',            heads.some(h=>/消す契約（2件）/.test(h)), heads);
 ok('★★ いっしょに消すオーナーは1件',        heads.some(h=>/消すオーナー（1件）/.test(h)), heads);
 ok('★★ 物件名だけ外すオーナーは1件',        heads.some(h=>/物件名だけ外すもの（1件）/.test(h)), heads);
 ok('★★ 住所が空のものは「消しません」と出す', heads.some(h=>/判定できないもの（1件・消しません）/.test(h)), heads);

 const names = await pg.evaluate(()=>Array.from(document.querySelectorAll('#co-ov .co-list .co-r b')).map(e=>e.textContent));
 ok('★★ 倉敷市の物件は一覧に出ない', !names.includes('ベラカーサノース') || names.filter(n=>n==='ベラカーサノース').length===1, names);
 ok('★★ 総社市の物件は、消す一覧に出ない',
    !(await pg.evaluate(()=>{
      var boxes = document.querySelectorAll('#co-ov .co-list');
      return Array.from(boxes[0].querySelectorAll('.co-r b')).map(e=>e.textContent).includes('エスプレイスビルド');
    })));

 console.log('\n❹ ★ 「削除」と入れるまで、ボタンは押せない');
 ok('★★ はじめは押せない', (await pg.evaluate(()=>document.getElementById('co-go').disabled)) === true);
 await pg.fill('#co-ov #co-word', 'さくじょ');
 ok('★★ ちがう言葉では押せない', (await pg.evaluate(()=>document.getElementById('co-go').disabled)) === true);
 await pg.fill('#co-ov #co-word', '削除');
 ok('★★ 「削除」と入れたら押せる', (await pg.evaluate(()=>document.getElementById('co-go').disabled)) === false);

 /* ---- 消す ----------------------------------------------------------- */
 console.log('\n❺ ★ 消したあとの中身');
 dlg.length = 0;
 await pg.click('#co-ov #co-go');
 await pg.waitForTimeout(600);

 const after = await pg.evaluate(()=>({
   blds: Object.keys(JSON.parse(localStorage.getItem(pbKey())||'{}')),
   cts:  Object.keys(JSON.parse(localStorage.getItem(ctKey())||'{}')),
   ows:  JSON.parse(localStorage.getItem(insPrefix()+'rent_owner_send_owners_v1')||'[]')
 }));

 ok('★★ 岡山市の物件が消えた',   !after.blds.includes('b1'), after.blds);
 ok('★★ 赤磐市の物件が消えた',   !after.blds.includes('b2'), after.blds);
 ok('★★ 倉敷市の物件は残った',    after.blds.includes('b3'), after.blds);
 ok('★★ 総社市の物件は残った',    after.blds.includes('b4'), after.blds);
 ok('★★ 笠岡市の物件は残った',    after.blds.includes('b5'), after.blds);
 ok('★★ 住所のない物件は残った',  after.blds.includes('b6'), after.blds);
 ok('★★ 残ったのは4件だけ',       after.blds.length === 4, after.blds);

 ok('★★ 岡山市の契約が消えた',   !after.cts.includes('c1'), after.cts);
 ok('★★ 赤磐市の契約が消えた',   !after.cts.includes('c3'), after.cts);
 ok('★★ 倉敷市の契約は残った',    after.cts.includes('c2'), after.cts);
 ok('★★ 総社市の契約は残った',    after.cts.includes('c4'), after.cts);

 const yamada = after.ows.find(o=>o.name==='山田');
 const suzuki = after.ows.find(o=>o.name==='鈴木');
 const sato   = after.ows.find(o=>o.name==='佐藤');
 ok('★★ その物件しか無いオーナーは消えた', !yamada, after.ows);
 ok('★★ ほかにも物件を持つオーナーは残った', !!suzuki, after.ows);
 ok('★★ 残ったオーナーから、岡山市・赤磐市の物件名だけ外れた',
    !!suzuki && JSON.stringify(suzuki.properties) === JSON.stringify(['かさおか館']), suzuki);
 ok('★★ 物件名の並び（文字）もそろえた',
    !!suzuki && suzuki.property === 'かさおか館', suzuki);
 ok('★★ 関係ないオーナーは、そのまま', !!sato && JSON.stringify(sato.properties)===JSON.stringify(['ベラカーサノース']), sato);

 console.log('\n❻ ★ 消したあとの知らせ');
 ok('★★ 「クラウドへ送信」を押すように言う', dlg.some(m=>/クラウドへ送信/.test(m)), dlg);

 console.log('\n❼ 2回目に開いたとき');
 await pg.evaluate(()=>window.openCityOut());
 await pg.waitForTimeout(300);
 const hd = await pg.evaluate(()=>{ var e=document.querySelector('#co-ov .co-hd'); return e?e.textContent:''; });
 ok('★★ 「もうありません」と出る', /もうありません/.test(hd), hd);
 ok('★★ 控えのスプレッドシートを作り直すボタンがある',
    (await pg.evaluate(()=>!!document.getElementById('co-sheet'))) === true);

 console.log('\n❽ 画面のエラー');
 ok('★ エラーなし', errs.length===0, errs);

 await b.close();
 try{ fs.unlinkSync(tmp); }catch(e){}
 console.log('\nPASS='+P+'  FAIL='+F);
 process.exit(F?1:0);
})();
