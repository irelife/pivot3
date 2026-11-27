/* ★★ 「駐車場契約書を Excel で出す」の検査
 *
 *   単発の変わった契約は、手で直したほうが早いことがあります。
 *   そのための出力です（PIVOT4 だけ）。
 *
 *   見張ること
 *     ① 印刷の契約書と、中身がそろっている（条文10個・金額・期間・特約）
 *     ② 印刷と同じ「A3横・2段組」の形で出る（左段・とじしろ・右段）
 *     ③ Excel が開ける形になっている（表＋Excel の目印）
 *     ④ 特約の追記が、4番目から並ぶ
 *     ⑤ 記号（< > &）を入れても、画面が壊れない
 *     ⑥ ファイル名に、物件名と区画が入る
 *     ⑦ PIVOT4 だけに入っている（PIVOT3 には入れない）
 *     ⑧ 印刷のほうも、乙の住所が「乙の住所」になっている（物件の住所ではない）
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

 console.log('\n❸-2 ★★ 印刷と同じ「A3横・2段組」になっている');
 /* 題名は3列ぶちぬき。そのあとは「左段・とじしろ・右段」の3列が並びます */
 ok('★★ 題名が1行めにある（3列ぶちぬき）',
    /<tr><td class="t" colspan="3">駐車場賃貸借契約書<\/td><\/tr>/.test(html));
 const rows = html.split('<tr>').slice(2);     /* 題名の行を除いた、本文の行 */
 ok('★★ 本文の行がある', rows.length >= 20, rows.length);
 ok('★★ どの行も「左段・とじしろ・右段」の3マス',
    rows.every(function(r){ return (r.match(/<td /g) || []).length === 3; }),
    rows.filter(function(r){ return (r.match(/<td /g) || []).length !== 3; }).slice(0,2));
 ok('★★ まん中はとじしろ（td.g）',
    rows.every(function(r){ return /<td class="g">/.test(r); }));
 ok('★★ A3 の指定がある（PaperSizeIndex 8）', /<x:PaperSizeIndex>8<\/x:PaperSizeIndex>/.test(html));
 ok('★★ 横置きの指定がある', /x:Orientation="Landscape"/.test(html));
 /* ★2026/11/27 これが無いと Excel は紙の左上に寄せるので、下が大きく空きます */
 ok('★★ 紙のまん中に置く指定がある（上に寄らない）',
    /x:CenterVertical="1"/.test(html) && /x:CenterHorizontal="1"/.test(html));
 /* ★★2026/11/27 ここが本題です。
      Excel は WorksheetOptions の中を、決まった順番でしか読みません。
      順番がちがうと、黙って全部を捨てます（エラーも出ません）。
      じっさい Print を先に書いていたために、A3 も 横 も まん中 も、
      ひとつも効いていませんでした。順番そのものを見張ります。     */
 const opt = html.slice(html.indexOf('<x:WorksheetOptions>'), html.indexOf('</x:WorksheetOptions>'));
 const iPage = opt.indexOf('<x:PageSetup>');
 const iFit  = opt.indexOf('<x:FitToPage/>');
 const iPrn  = opt.indexOf('<x:Print>');
 ok('★★ PageSetup → FitToPage → Print の順になっている',
    iPage >= 0 && iFit > iPage && iPrn > iFit, { PageSetup:iPage, FitToPage:iFit, Print:iPrn });
 ok('★★ 紙の向きは PageSetup の中にある',
    opt.indexOf('x:Orientation="Landscape"') > iPage &&
    opt.indexOf('x:Orientation="Landscape"') < iFit);
 ok('★★ 紙の大きさ（A3）は Print の中にある',
    opt.indexOf('<x:PaperSizeIndex>8</x:PaperSizeIndex>') > iPrn);
 ok('★★ 1ページに収める指定がある',
    /<x:FitWidth>1<\/x:FitWidth>/.test(html) && /<x:FitHeight>1<\/x:FitHeight>/.test(html) && /<x:FitToPage\/>/.test(html));
 ok('★ 見出しは太字の指定（td.hd）がついている',
    html.indexOf('class="p hd">目的：第1条') >= 0 && html.indexOf('class="p hd">特約事項：第10条') >= 0);
 /* 印刷と同じ区切り：第1〜6条は左の段、第7〜10条と署名欄は右の段 */
 const side = function(word){
   const r = rows.filter(function(x){ return x.indexOf(word) >= 0; })[0] || '';
   const g = r.indexOf('<td class="g">');
   const w = r.indexOf(word);
   return (g < 0 || w < 0) ? '?' : (w < g ? '左' : '右');
 };
 ok('★★ 目的：第1条 は左の段',     side('目的：第1条') === '左', side('目的：第1条'));
 ok('★★ 解約：第6条 は左の段',     side('解約：第6条') === '左', side('解約：第6条'));
 ok('★★ 契約解除：第7条 は右の段', side('契約解除：第7条') === '右', side('契約解除：第7条'));
 ok('★★ 特約事項：第10条 は右の段',side('特約事項：第10条') === '右', side('特約事項：第10条'));
 ok('★★ 署名欄は右の段',           side('賃貸代理人(甲)') === '右', side('賃貸代理人(甲)'));
 ok('★★ 表の線は引かない（契約書なので）', /td\{border:none/.test(html));

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
 ok('★★ 賃借人(乙)の住所',     html.indexOf('ノスタルジア 205号') >= 0);
 ok('★ 押印欄がある（甲・乙とも）', (html.match(/印/g) || []).length >= 2);

 console.log('\n❻ ★★ 特約の追記が、4番目から並ぶ');
 ok('★★ 追記1つめが入っている', html.indexOf('居室契約が終わったら') >= 0);
 const i4 = html.indexOf('>4. 居室契約が終わったら');
 const i5 = html.indexOf('>5. 車両の');
 ok('★★ 番号が 4 から始まる', i4 >= 0, i4);
 ok('★★ 2つめは 5 になる',    i5 > i4, { i4:i4, i5:i5 });
 ok('★★ もとからの3つは、そのまま1〜3',
    html.indexOf('>1. 乙の希望により') >= 0 &&
    html.indexOf('>2. 賃料及び証明書等発行料') >= 0 &&
    html.indexOf('>3. 甲乙共に反社会的勢力') >= 0);
 const noTk = await pg.evaluate((d)=>window.buildKeiyakuXlsHtml(Object.assign({}, d, { tokuyaku:[] })), DATA);
 ok('★★ 追記が無いときは 4 番が出ない', noTk.indexOf('>4. ') < 0);

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

 /* ---- ★ 印刷が壊れていないか（js/buildings.js を直したので） ---- */
 console.log('\n❾ ★★ 印刷（printKeiyaku）が、これまでどおり動く');
 const pg2 = await b.newPage({viewport:{width:900,height:700}});
 const err2=[]; pg2.on('pageerror',e=>err2.push(e.message.slice(0,200)));
 pg2.on('dialog', d=>d.accept());
 await pg2.goto('about:blank');
 /* 画面の入力欄だけを用意します（本体のアプリは起こしません） */
 await pg2.evaluate((d)=>{
   const put = (id, v) => { const el = document.createElement('input'); el.id = id; el.value = v; document.body.appendChild(el); };
   put('ky-user-name', d.userName); put('ky-user-addr', d.userAddr);
   put('ky-bld-addr', d.bldAddr);   put('ky-bld-name', d.bldName);
   put('ky-spot-no', d.spotNo);     put('ky-price', String(d.price));
   put('ky-tax-rate', String(d.taxRate));
   put('ky-period-from', d.periodFrom); put('ky-period-to', d.periodTo);
   put('ky-contract-date', d.contractDate);
   put('ky-pay-day', d.payDay);     put('ky-pay-method', d.payMethod);
   const ta = document.createElement('textarea');
   ta.id = 'ky-tokuyaku'; ta.value = (d.tokuyaku || []).join('\n');
   document.body.appendChild(ta);
   window.getCompanyInfo = function(){ return d.company; };
   window.__got = null;
   window.escapeHtml = function(x){ return String(x == null ? '' : x); };
 }, DATA);
 await pg2.addScriptTag({ path: path.join(DIR,'js','buildings.js') });
 /* 印刷の出口だけ差し替えて、渡される中身を受け取ります
    （本物は __realGen に取っておいて、あとで出来上がりも見ます） */
 await pg2.evaluate(()=>{
   window.__realGen = window.generateKeiyakuPrint;
   window.generateKeiyakuPrint = function(d){ window.__got = d; };
 });
 const got = await pg2.evaluate(()=>{ try{ printKeiyaku(); }catch(e){ return { __err:String(e) }; } return window.__got; });
 ok('★ printKeiyaku が動く（エラーなし）', !!got && !got.__err, got && got.__err);
 ok('★★ 印刷へ渡る中身：物件名',  !!got && got.bldName === DATA.bldName, got && got.bldName);
 ok('★★ 印刷へ渡る中身：区画',    !!got && got.spotNo === DATA.spotNo, got && got.spotNo);
 ok('★★ 印刷へ渡る中身：賃料',    !!got && got.price === DATA.price, got && got.price);
 ok('★★ 印刷へ渡る中身：支払日',  !!got && got.payDay === DATA.payDay, got && got.payDay);
 ok('★★ 印刷へ渡る中身：支払方法',!!got && got.payMethod === DATA.payMethod, got && got.payMethod);
 ok('★★ 印刷へ渡る中身：特約2件', !!got && (got.tokuyaku||[]).length === 2, got && got.tokuyaku);
 ok('★ 印刷のほうでエラーが出ていない', err2.length===0, err2);

 console.log('\n❾-2 ★★ 印刷の「賃借人(乙) 住所」が、乙の住所になっている');
 /* ★2026/11/27 ここは駐車場の所在地（物件の住所）が入っていました。
      画面で入れた「賃借人の住所」は集めてはいたのに、使われていませんでした。
      Excel 出力と食いちがっていたので直し、二度と戻らないよう見張ります。 */
 const pr = await pg2.evaluate((d)=>{
   let out = null;
   window.showDocOverlay = function(h){ out = h; };
   try{ window.__realGen(Object.assign({}, d, { company:d.company })); }
   catch(e){ return { __err:String(e) }; }
   return { html: out };
 }, DATA);
 ok('★ 印刷の組み立てが動く（エラーなし）', !!pr && !pr.__err && !!pr.html, pr && pr.__err);
 const sign = pr && pr.html ? pr.html.slice(pr.html.indexOf('賃借人(乙)')) : '';
 ok('★★ 乙の住所が出ている（部屋番号つき）', sign.indexOf('ノスタルジア 205号') >= 0, sign.slice(0,200));
 ok('★★ 駐車場の所在地を、乙の住所として出していない',
    sign.indexOf(DATA.bldAddr) < 0, sign.slice(0,200));
 ok('★★ Excel と印刷で、乙の住所がそろっている',
    html.indexOf('ノスタルジア 205号') >= 0 && sign.indexOf('ノスタルジア 205号') >= 0);

 console.log('\n❿ 画面のエラー');
 ok('★ エラーなし', errs.length===0, errs);

 await b.close();
 console.log('\nPASS='+P+'  FAIL='+F);
 process.exit(F?1:0);
})();
