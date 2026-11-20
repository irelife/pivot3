/* ★★ PIVOT4 だけの見た目の検査
 *
 *   ① 契約カードの ×（削除）が、スマホの幅でも いつも見えている
 *      （css/swipe-del.css がスマホでは ×を隠すので、
 *        PIVOT4 だけ css/pivot4.css で出し直しています）
 *   ② 指で押せる大きさ（38px以上）になっている
 *   ③ PIVOT3 は、これまでどおり（スマホでは ×を隠す）
 *   ④ PIVOT4 のアイコンが、PIVOT3 と別の絵になっている
 *   ⑤ pivot4.css は PIVOT3 の index.html からは読まれていない
 */
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const {chromium}=(function(){ try{ return require('playwright'); }
                              catch(e){ return require('playwright-core'); } })();
const DIR = path.resolve(process.argv[2] || path.join(__dirname, '..'));

let P=0,F=0;
const ok=(n,c,x)=>{ if(c){P++;console.log('  ✅ '+n);} else {F++;console.log('  ❌ '+n+(x!==undefined?('  → '+JSON.stringify(x)):''));} };

/* index.html から、読んでいる css の並びを取り出します */
function cssList(html){
  const out = [], re = /<link rel="stylesheet" href="(?:\.\.\/)?(css\/[^"?]+\.css)[^"]*">/g;
  let g; while((g = re.exec(html))) out.push(g[1]);
  return out;
}
/* カード1枚だけの、ためし用の画面を作ります */
function testPage(list){
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    list.map(f => '<link rel="stylesheet" href="file://' + DIR + '/' + f + '">').join('') +
    /* ふだんの画面は、見ているところ以外を隠します。
       ここはカード1枚だけの ためし用なので、出しておきます。 */
    '<style>#kb-view{display:block !important;}</style>' +
    '</head><body><div id="kb-view"><div class="kb-grid">' +
    '<div class="ct-card status-apply" data-id="c1">' +
      '<button class="ct-card-del">×</button>' +
      '<div class="ct-head"><span class="ct-head-left">' +
        '<span class="ct-type-label ct-type-indiv">個人</span>' +
        '<span class="ct-ad-label">AD100%</span>' +
      '</span></div>' +
      '<div class="ct-main"><div class="ct-body"><div class="card-title">カンパネラ 101号</div></div></div>' +
    '</div></div></div></body></html>';
}

(async()=>{
 const p3html = fs.readFileSync(path.join(DIR,'index.html'),'utf8');
 const p4html = fs.readFileSync(path.join(DIR,'pivot4','index.html'),'utf8');

 console.log('\n❶ 読み込みの決まり');
 const p3css = cssList(p3html), p4css = cssList(p4html);
 ok('★★ pivot4.css は PIVOT4 だけが読む', p4css.includes('css/pivot4.css') && !p3css.includes('css/pivot4.css'),
    { P3:p3css.includes('css/pivot4.css'), P4:p4css.includes('css/pivot4.css') });
 ok('★★ pivot4.css は いちばん最後に読む（ほかを上書きできる）',
    p4css[p4css.length-1] === 'css/pivot4.css', p4css);

 console.log('\n❷ ★ アイコンが、PIVOT3 と別の絵になっている');
 const pick = (h, re) => { const m = h.match(re); return m ? m[1] : ''; };
 const AT = /<link rel="apple-touch-icon" href="data:image\/png;base64,([^"]+)">/;
 const FV = /<link rel="icon" href="data:image\/png;base64,([^"]+)">/;
 const a3 = pick(p3html, AT), a4 = pick(p4html, AT);
 const f3 = pick(p3html, FV), f4 = pick(p4html, FV);
 ok('★ PIVOT3 にアイコンがある', !!a3);
 ok('★ PIVOT4 にアイコンがある', !!a4);
 ok('★★ ホーム画面のアイコンが、2つで違う', !!a4 && a4 !== a3);
 ok('★★ タブのアイコンも、2つで違う',     !!f4 && f4 !== f3);

 const b=await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined});

 /* ---- スマホの幅（PIVOT4）---- */
 console.log('\n❸ ★ スマホの幅で、PIVOT4 の × が出ている');
 const tmp4 = path.join(os.tmpdir(), 'pv4_' + Date.now() + '.html');
 fs.writeFileSync(tmp4, testPage(p4css), 'utf8');
 const sp=await b.newPage({viewport:{width:390,height:844}});
 await sp.goto('file://' + tmp4);
 await sp.waitForTimeout(400);
 const m4 = await sp.evaluate(()=>{
   const el = document.querySelector('.ct-card-del');
   if(!el) return null;
   const cs = getComputedStyle(el), r = el.getBoundingClientRect();
   const hl = document.querySelector('.ct-head-left');
   return { display:cs.display, opacity:cs.opacity, w:Math.round(r.width), h:Math.round(r.height),
            padL: hl ? getComputedStyle(hl).paddingLeft : '' };
 });
 ok('★ ×のボタンがある', !!m4, m4);
 ok('★★ 隠れていない（display）', !!m4 && m4.display !== 'none', m4);
 ok('★★ 透明になっていない（opacity=1）', !!m4 && m4.opacity === '1', m4);
 ok('★★ 指で押せる大きさ（38px以上）', !!m4 && m4.w >= 38 && m4.h >= 38, m4);
 ok('★★ 左上の「個人／AD」が、×とかぶらないようにずれている',
    !!m4 && parseFloat(m4.padL) >= 40, m4);

 /* ---- パソコンの幅（PIVOT4）---- */
 console.log('\n❹ パソコンの幅でも、PIVOT4 は × が出ている');
 const dp=await b.newPage({viewport:{width:1280,height:900}});
 await dp.goto('file://' + tmp4);
 await dp.waitForTimeout(400);
 const d4 = await dp.evaluate(()=>{
   const el = document.querySelector('.ct-card-del'); if(!el) return null;
   const cs = getComputedStyle(el); return { display:cs.display, opacity:cs.opacity };
 });
 ok('★ マウスを乗せなくても見える', !!d4 && d4.display !== 'none' && d4.opacity === '1', d4);

 /* ---- スマホの幅（PIVOT3）---- */
 console.log('\n❺ ★ PIVOT3 は、これまでどおり（スマホでは ×を隠す）');
 const tmp3 = path.join(os.tmpdir(), 'pv3_' + Date.now() + '.html');
 fs.writeFileSync(tmp3, testPage(p3css), 'utf8');
 const sp3=await b.newPage({viewport:{width:390,height:844}});
 await sp3.goto('file://' + tmp3);
 await sp3.waitForTimeout(400);
 const m3 = await sp3.evaluate(()=>{
   const el = document.querySelector('.ct-card-del'); if(!el) return null;
   const cs = getComputedStyle(el);
   const hl = document.querySelector('.ct-head-left');
   return { display:cs.display, padL: hl ? getComputedStyle(hl).paddingLeft : '' };
 });
 ok('★★ PIVOT3 のスマホでは、×は隠れたまま', !!m3 && m3.display === 'none', m3);
 ok('★★ PIVOT3 の「個人／AD」の位置は、変わっていない',
    !!m3 && parseFloat(m3.padL || '0') < 40, m3);

 await b.close();
 try{ fs.unlinkSync(tmp4); fs.unlinkSync(tmp3); }catch(e){}
 console.log('\nPASS='+P+'  FAIL='+F);
 process.exit(F?1:0);
})();
