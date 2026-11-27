/* ★★ 「駐車場契約書を Excel で出す」の検査
 *
 *   単発の変わった契約は、手で直したほうが早いことがあります。
 *   そのための出力です（PIVOT4 だけ）。
 *
 *   見張ること
 *     ① 印刷の契約書と、中身がそろっている（条文10個・金額・期間・特約）
 *     ② Excel が開ける形になっている（表＋Excel の目印）
 *     ③ 特約の追記が、4番目から並ぶ
 *     ④ 記号（< > &）を入れても、画面が壊れない
 *     ⑤ ファイル名に、物件名と区画が入る
 *     ⑥ PIVOT4 だけに入っている（PIVOT3 には入れない）
 */
const fs=require('fs');
const path=require('path');
const {chromium}=(function(){ try{ return require('playwright'); }
                              catch(e){ return require('playwright-core'); } })();
const DIR = path.resolve(process.argv[2] || path.join(__dirname, '..'));

let P=0,F=0;
const ok=(n,c,x)=>{ if(c){P++;console.log('  ✅ '+n);} else {F++;console.log('  ❌ '+n+(x!==undefined?('  → '+JSON.stringify(x)):''));} };

const DATA = {
  bldName:'ノスタルジア', bldAddr:'岡山県岡山市北区1-2-3', spotNo:'P5',
  price:5500, taxRate:10,
  userName:'山田 太郎', userAddr:'岡山県岡山市中区4-5-6 ノスタルジア 205号',
  periodFrom:'2026-12-01', periodTo:'2028-11-30', contractDate:'2026-11-27',
  payDay:'末日', payMethod:'振込',
  tokuyaku:['居室契約が終わったら、本契約も終わる。','車両の<入れ替え>は届け出る & 承認を得る。'],
  company:{ name:'IREライフ株式会社', zip:'721-0963', addr:'広島県福山市南手城町2丁目15-6',
            rep_title:'代表取締役', rep_name:'淺野 充弘', invoice_no:'T1234567890123' }
};

(async()=>{
 const p3 = fs.readFileSync(path.join(DIR,'index.html'),'utf8');
 const p4 = fs.readFileSync(path.join(DIR,'pivot4','index.html'),'utf8');

 console.log('\n❶ 入れ先');
 ok('★★ PIVOT4 にだけ「Excelで出す」がある',
    /exportKeiyakuXls\(\)/.test(p4) && !/exportKeiyakuXls\(\)/.test(p3),
    { P4:/exportKeiyakuXls\(\)/.test(p4), P3:/exportKeiyakuXls\(\)/.test(p3) });
 ok('★★ keiyakuxls.js を読むのは PIVOT4 だけ',
    /keiyakuxls\.js/.test(p4) && !/keiyakuxls\.js/.test(p3));
 ok('★ 印刷のボタンは、そのまま残っている', /printKeiyaku\(\)/.test(p4) && /printKeiyaku\(\)/.test(p3));

 const b=await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined});
 const pg=await b.newPage({viewport:{width:900,height:700}});
 const errs=[]; pg.on('pageerror',e=>errs.push(e.message.slice(0,160)));
 await pg.goto('about:blank');
 await pg.addScriptTag({ path: path.join(DIR,'js','keiyakuxls.js') });

 console.log('\n❷ 道具がある');
 ok('★ buildKeiyakuXlsHtml がある', await pg.evaluate(()=>typeof window.buildKeiyakuXlsHtml==='function'));
 ok('★ buildKeiyakuXlsName がある', await pg.evaluate(()=>typeof window.buildKeiyakuXlsName==='function'));
 ok('★ exportKeiyakuXls がある',    await pg.evaluate(()=>typeof window.exportKeiyakuXls==='function'));

 const html = await pg.evaluate((d)=>window.buildKeiyakuXlsHtml(d), DATA);

 console.log('\n❸ ★ Excel が開ける形');
 ok('★★ 表になっている', /<table/.test(html) && /<\/table>/.test(html));
 ok('★★ Excel の目印がある（ExcelWorkbook）', /x:ExcelWorkbook/.test(html));
 ok('★★ シート名が入っている', /<x:Name>駐車場賃貸借契約書<\/x:Name>/.test(html));
 ok('★★ 文字として扱う指定がある（勝手に数字にしない）', /mso-number-format/.test(html));

 console.log('\n❹ ★★ 中身が、印刷の契約書とそろっている');
 const must = ['駐車場賃貸借契約書','目的：第1条','賃料：第2条','賃貸借期間：第3条','禁止事項：第4条',
               '甲の免責事項：第5条','解約：第6条','契約解除：第7条','明け渡し：第8条','協議：第9条','特約事項：第10条'];
 must.forEach(function(m){ ok('★★ ' + m + ' がある', html.indexOf(m) >= 0); });

 console.log('\n❺ ★★ 画面で入れた値が入っている');
 ok('★★ 物件名', html.indexOf('ノスタルジア') >= 0);
 ok('★★ 区画',   html.indexOf('P5') >= 0);
 ok('★★ 賃借人', html.indexOf('山田 太郎') >= 0);
 ok('★★ 賃料と消費税（5,500円・500円）', html.indexOf('5,500') >= 0 && html.indexOf('500') >= 0);
 ok('★★ 支払日（末日）',       html.indexOf('毎月末日') >= 0, html.indexOf('末日'));
 ok('★★ 支払い方法（振込）',   html.indexOf('振込にて支払う') >= 0);
 ok('★★ 期間（2026年12月1日から）', html.indexOf('2026年12月1日') >= 0);
 ok('★★ 期間（2028年11月30日まで）', html.indexOf('2028年11月30日') >= 0);
 ok('★★ 契約日',               html.indexOf('2026年11月27日') >= 0);
 ok('★★ 会社名',               html.indexOf('IREライフ株式会社') >= 0);
 ok('★★ 登録番号',             html.indexOf('T1234567890123') >= 0);

 console.log('\n❻ ★★ 特約の追記が、4番目から並ぶ');
 ok('★★ 追記1つめが入っている', html.indexOf('居室契約が終わったら') >= 0);
 const i4 = html.indexOf('>4</td>');
 const i5 = html.indexOf('>5</td>');
 ok('★★ 番号が 4 から始まる', i4 >= 0, i4);
 ok('★★ 2つめは 5 になる',    i5 > i4, { i4:i4, i5:i5 });

 console.log('\n❼ ★★ 記号を入れても壊れない');
 ok('★★ < > & がそのまま出ていない',
    html.indexOf('<入れ替え>') < 0 && html.indexOf('&lt;入れ替え&gt;') >= 0);
 ok('★★ & も直してある', html.indexOf('&amp; 承認') >= 0);

 console.log('\n❽ ★ ファイル名');
 const nm = await pg.evaluate((d)=>window.buildKeiyakuXlsName(d), DATA);
 ok('★ .xls で終わる', /\.xls$/.test(nm), nm);
 ok('★★ 物件名が入る', nm.indexOf('ノスタルジア') >= 0, nm);
 ok('★★ 区画が入る',   nm.indexOf('P5') >= 0, nm);
 const bad = await pg.evaluate(()=>window.buildKeiyakuXlsName({ bldName:'A/B:C*D?E"F<G>H|I', spotNo:'P1' }));
 ok('★★ ファイル名に使えない記号が落ちる', !/[\\\/:*?"<>|]/.test(bad.replace(/\.xls$/,'')), bad);

 console.log('\n❾ 画面のエラー');
 ok('★ エラーなし', errs.length===0, errs);

 await b.close();
 console.log('\nPASS='+P+'  FAIL='+F);
 process.exit(F?1:0);
})();
