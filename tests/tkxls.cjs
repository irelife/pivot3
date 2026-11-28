/* ★★ 「駐車場契約書を Excel で出す」の検査
 *
 *   単発の変わった契約は、手で直したほうが早いことがあります。
 *   そのための出力です（PIVOT4 だけ）。
 *
 *   ★2026/11/27 作りかたを変えました。
 *     それまでは「HTML の表を .xls という名前で落とす」やりかたでした。
 *     中身は出るのですが、紙の設定（A3・横・まん中）が Excel にも
 *     LibreOffice にも、ひとつも届きませんでした。3回直して3回とも
 *     届かなかったので、本物の .xlsx を組み立てる形に変えました。
 *     .xlsx は、XML を ZIP で固めたものです。紙の設定はそこに書けます。
 *
 *   見張ること
 *     ① 本物の .xlsx になっている（ZIP として開ける・中の部品がそろう）
 *     ② 紙の設定が入っている（A3・横・まん中・1ページ）
 *     ③ 印刷の契約書と、中身がそろっている（条文10個・金額・期間・特約）
 *     ④ 左の段＝A列、右の段＝C列（印刷と同じ区切り）
 *     ⑤ 特約の追記が、4番目から並ぶ
 *     ⑥ 記号（< > &）を入れても、ファイルが壊れない
 *     ⑦ ファイル名に、物件名と区画が入る
 *     ⑧ PIVOT4 だけに入っている（PIVOT3 には入れない）
 *     ⑨ 印刷のほうも、乙の住所が「乙の住所」になっている
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

/* ---- ここだけの、小さな ZIP 読み取り ----
     本物の .xlsx になっているかを、自分の目で確かめるために使います。
     外の部品は足しません（増やすと、いつか動かなくなる場所が増えます）。 */
function crc32(buf){
  let t = crc32._t;
  if(!t){
    t = crc32._t = new Uint32Array(256);
    for(let i=0;i<256;i++){ let c=i; for(let k=0;k<8;k++) c = (c&1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1); t[i]=c>>>0; }
  }
  let c = 0xFFFFFFFF;
  for(let i=0;i<buf.length;i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c>>>8);
  return (c ^ 0xFFFFFFFF)>>>0;
}
function unzip(bytes){
  const b = Buffer.from(bytes);
  /* おしまいの目印をさがす */
  let end = -1;
  for(let i=b.length-22;i>=0;i--){ if(b.readUInt32LE(i)===0x06054b50){ end=i; break; } }
  if(end<0) throw new Error('ZIP のおしまいの目印がありません');
  const count = b.readUInt16LE(end+10);
  let p = b.readUInt32LE(end+16);
  const out = {};
  for(let i=0;i<count;i++){
    if(b.readUInt32LE(p)!==0x02014b50) throw new Error('目録の目印がちがいます');
    const method = b.readUInt16LE(p+10);
    const crc    = b.readUInt32LE(p+16);
    const size   = b.readUInt32LE(p+24);
    const nlen   = b.readUInt16LE(p+28);
    const elen   = b.readUInt16LE(p+30);
    const clen   = b.readUInt16LE(p+32);
    const off    = b.readUInt32LE(p+42);
    const name   = b.slice(p+46, p+46+nlen).toString('utf8');
    if(method!==0) throw new Error('縮めない形のはずです: '+name);
    if(b.readUInt32LE(off)!==0x04034b50) throw new Error('中身の目印がちがいます: '+name);
    const lnlen = b.readUInt16LE(off+26), lelen = b.readUInt16LE(off+28);
    const data = b.slice(off+30+lnlen+lelen, off+30+lnlen+lelen+size);
    if(crc32(data)!==crc) throw new Error('中身がこわれています: '+name);
    out[name] = data.toString('utf8');
    p += 46 + nlen + elen + clen;
  }
  return out;
}

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
 ok('★ buildKeiyakuDoc がある',        await pg.evaluate(()=>typeof window.buildKeiyakuDoc==='function'));
 ok('★ buildKeiyakuXlsxParts がある',  await pg.evaluate(()=>typeof window.buildKeiyakuXlsxParts==='function'));
 ok('★ buildKeiyakuXlsxZip がある',    await pg.evaluate(()=>typeof window.buildKeiyakuXlsxZip==='function'));
 ok('★ buildKeiyakuXlsName がある',    await pg.evaluate(()=>typeof window.buildKeiyakuXlsName==='function'));
 ok('★ exportKeiyakuXls がある',       await pg.evaluate(()=>typeof window.exportKeiyakuXls==='function'));

 const raw = await pg.evaluate((d)=>Array.from(window.buildKeiyakuXlsxZip(window.buildKeiyakuXlsxParts(d))), DATA);

 console.log('\n❸ ★★ 本物の .xlsx になっている');
 let files = null, zipErr = null;
 try{ files = unzip(raw); }catch(e){ zipErr = String(e && e.message || e); }
 ok('★★ ZIP として開ける（中身がこわれていない）', !!files, zipErr);
 const need = ['[Content_Types].xml','_rels/.rels','xl/workbook.xml',
               'xl/_rels/workbook.xml.rels','xl/styles.xml','xl/worksheets/sheet1.xml'];
 need.forEach(function(n){ ok('★★ 部品がある: '+n, !!files && files[n] !== undefined); });
 ok('★ 先頭が ZIP の目印（PK）', raw[0]===0x50 && raw[1]===0x4b && raw[2]===0x03 && raw[3]===0x04);

 const sheet = (files && files['xl/worksheets/sheet1.xml']) || '';
 const styles = (files && files['xl/styles.xml']) || '';
 const wb = (files && files['xl/workbook.xml']) || '';

 /* ★2026/11/28 1マス＝1行に組みなおしたので、文のとちゅうで行が変わります。
      中身を見るときは、段ごとに1本につなげてから探します。
      （つなげずに探すと「振込にて支払う」のような言いまわしが、
        行の変わり目でちぎれていて、見つかりません）                  */
 function colText(letter){
   const re = new RegExp('<c r="'+letter+'\\d+"[^>]*><is><t[^>]*>([^<]*)<\\/t>','g');
   let m, out = '';
   while((m = re.exec(sheet)) !== null) out += m[1];
   return out;
 }
 const textA = colText('A'), textC = colText('C'), textAll = textA + '\n' + textC;

 console.log('\n❹ ★★ 紙の設定（これが前は1つも届いていませんでした）');
 ok('★★ A3（paperSize 8）', /paperSize="8"/.test(sheet));
 ok('★★ 横（landscape）',   /orientation="landscape"/.test(sheet));
 ok('★★ 紙のまん中に置く',
    /horizontalCentered="1"/.test(sheet) && /verticalCentered="1"/.test(sheet));
 ok('★★ 1ページに収める',
    /<pageSetUpPr fitToPage="1"\/>/.test(sheet) &&
    /fitToWidth="1"/.test(sheet) && /fitToHeight="1"/.test(sheet));
 ok('★ 余白が入っている', /<pageMargins /.test(sheet));
 ok('★ マス目の線は出さない', /showGridLines="0"/.test(sheet));
 ok('★★ シート名が契約書になっている', /name="駐車場賃貸借契約書"/.test(wb));
 ok('★★ 文字あつかいの指定（「P5」を数字にしない）',
    (styles.match(/numFmtId="49"/g)||[]).length >= 4);

 console.log('\n❺ ★★ 段の組みかた（印刷と同じ A3横・2段組）');
 ok('★★ 段が3つ（左・とじしろ・右）',
    /<col min="1" max="1"/.test(sheet) && /<col min="2" max="2"/.test(sheet) && /<col min="3" max="3"/.test(sheet));
 ok('★★ まん中のとじしろが、いちばん細い', (function(){
      const m = sheet.match(/<col min="\d" max="\d" width="([\d.]+)"/g) || [];
      const w = m.map(x=>parseFloat(x.match(/width="([\d.]+)"/)[1]));
      return w.length===3 && w[1] < w[0] && w[1] < w[2] && w[0]===w[2];
    })(), sheet.match(/<col [^>]*>/g));
 ok('★★ 題名は3つの段をつないで、1行めにある',
    /<mergeCell ref="A1:C1"\/>/.test(sheet) && /r="A1"[^>]*><is><t[^>]*>駐車場賃貸借契約書/.test(sheet));

 /* A列＝左の段、C列＝右の段。印刷と同じ区切りかを見ます */
 function colOf(word){
   const re = new RegExp('<c r="([AC])\\d+"[^>]*><is><t[^>]*>[^<]*' +
                         word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
   const m = sheet.match(re);
   return m ? m[1] : '?';
 }
 ok('★★ 目的：第1条 は左（A列）',      colOf('目的：第1条') === 'A', colOf('目的：第1条'));
 ok('★★ 解約：第6条 は左（A列）',      colOf('解約：第6条') === 'A', colOf('解約：第6条'));
 ok('★★ 契約解除：第7条 は右（C列）',  colOf('契約解除：第7条') === 'C', colOf('契約解除：第7条'));
 ok('★★ 特約事項：第10条 は右（C列）', colOf('特約事項：第10条') === 'C', colOf('特約事項：第10条'));
 ok('★★ 署名欄は右（C列）',            colOf('賃貸代理人(甲)') === 'C', colOf('賃貸代理人(甲)'));

 console.log('\n❺-2 ★★ 1マス＝1行に組んである（段のあいだに空きを作らない）');
 /* ★2026/11/28 1マス＝1段落だったころは、行の高さが左右の高いほうに
      合うので、左にぽっかり空きができていました。1行ずつにすると、
      左も右も同じ間隔で流れます。                                   */
 ok('★★ どの行も、同じ高さにしてある',
    (sheet.match(/<row r="\d+" ht="(\d+)" customHeight="1">/g) || []).length >= 20);
 ok('★★ 1マスに、長い文が丸ごと入っていない（1行ぶんに切ってある）', (function(){
      const re = /<is><t[^>]*>([^<]*)<\/t>/g;
      let m, longest = 0, w;
      while((m = re.exec(sheet)) !== null){
        w = 0;
        for(const ch of m[1]){ const c = ch.codePointAt(0); w += (c < 0x100 || (c >= 0xFF61 && c <= 0xFF9F)) ? 0.5 : 1; }
        if(w > longest) longest = w;
      }
      return longest <= 44;   /* 1行に入る字数（42）＋ ぶら下げ */
    })());

 console.log('\n❻ ★★ 中身が、印刷の契約書とそろっている');
 const must = ['駐車場賃貸借契約書','目的：第1条','賃料：第2条','賃貸借期間：第3条','禁止事項：第4条',
               '甲の免責事項：第5条','解約：第6条','契約解除：第7条','明け渡し：第8条','協議：第9条','特約事項：第10条'];
 must.forEach(function(m){ ok('★★ ' + m + ' がある', textAll.indexOf(m) >= 0); });

 console.log('\n❼ ★★ 画面で入れた値が入っている');
 ok('★★ 物件名', textAll.indexOf('ノスタルジア') >= 0);
 ok('★★ 区画',   textAll.indexOf('P5') >= 0);
 ok('★★ 賃借人', textAll.indexOf('山田 太郎') >= 0);
 ok('★★ 賃料と消費税（5,500円・500円）', textAll.indexOf('5,500') >= 0 && textAll.indexOf('500') >= 0);
 ok('★★ 支払日（末日）',       textAll.indexOf('毎月末日') >= 0);
 ok('★★ 支払い方法（振込）',   textAll.indexOf('振込にて支払う') >= 0);
 ok('★★ 期間（2026年12月1日から）', textAll.indexOf('2026年12月1日') >= 0);
 ok('★★ 期間（2028年11月30日まで）', textAll.indexOf('2028年11月30日') >= 0);
 ok('★★ 契約日',               textAll.indexOf('2026年11月27日') >= 0);
 ok('★★ 会社名',               textAll.indexOf('IREライフ株式会社') >= 0);
 ok('★★ 登録番号',             textAll.indexOf('T1234567890123') >= 0);
 ok('★★ 賃借人(乙)の住所',     textAll.indexOf('ノスタルジア 205号') >= 0);
 ok('★ 押印欄がある（甲・乙とも）', (textAll.match(/印/g) || []).length >= 2);

 console.log('\n❽ ★★ 特約の追記が、4番目から並ぶ');
 ok('★★ 追記1つめが入っている', textAll.indexOf('居室契約が終わったら') >= 0);
 const i4 = textC.indexOf('4. 居室契約が終わったら');
 const i5 = textC.indexOf('5. 車両の');
 ok('★★ 番号が 4 から始まる', i4 >= 0, i4);
 ok('★★ 2つめは 5 になる',    i5 > i4, { i4:i4, i5:i5 });
 ok('★★ もとからの3つは、そのまま1〜3',
    textC.indexOf('1. 乙の希望により') >= 0 &&
    textC.indexOf('2. 賃料及び証明書等発行料') >= 0 &&
    textC.indexOf('3. 甲乙共に反社会的勢力') >= 0);
 const noTk = await pg.evaluate((d)=>{
   const p = window.buildKeiyakuXlsxParts(Object.assign({}, d, { tokuyaku:[] }));
   return p['xl/worksheets/sheet1.xml'];
 }, DATA);
 ok('★★ 追記が無いときは 4 番が出ない', noTk.indexOf('>4. ') < 0 && noTk.indexOf('4. 居室契約') < 0);

 console.log('\n❾ ★★ 記号を入れても壊れない');
 ok('★★ < > & がそのまま出ていない',
    sheet.indexOf('<入れ替え>') < 0 && sheet.indexOf('&lt;入れ替え&gt;') >= 0);
 ok('★★ & も直してある', sheet.indexOf('&amp; 承認') >= 0);

 console.log('\n❿ ★ ファイル名');
 const nm = await pg.evaluate((d)=>window.buildKeiyakuXlsName(d), DATA);
 ok('★★ .xlsx で終わる', /\.xlsx$/.test(nm), nm);
 ok('★★ 物件名が入る', nm.indexOf('ノスタルジア') >= 0, nm);
 ok('★★ 区画が入る',   nm.indexOf('P5') >= 0, nm);
 const bad = await pg.evaluate(()=>window.buildKeiyakuXlsName({ bldName:'A/B:C*D?E"F<G>H|I', spotNo:'P1' }));
 ok('★★ ファイル名に使えない記号が落ちる', !/[\\\/:*?"<>|]/.test(bad.replace(/\.xlsx$/,'')), bad);

 /* ---- ★ 印刷が壊れていないか（js/buildings.js を直したので） ---- */
 console.log('\n⓫ ★★ 印刷（printKeiyaku）が、これまでどおり動く');
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

 console.log('\n⓬ ★★ 印刷の「賃借人(乙) 住所」が、乙の住所になっている');
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
    textAll.indexOf('ノスタルジア 205号') >= 0 && sign.indexOf('ノスタルジア 205号') >= 0);

 console.log('\n⓭ 画面のエラー');
 ok('★ エラーなし', errs.length===0, errs);

 await b.close();
 console.log('\nPASS='+P+'  FAIL='+F);
 process.exit(F?1:0);
})();
