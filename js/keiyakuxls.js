/* =====================================================================
   駐車場賃貸借契約書を、Excel で編集できる形で出す
                                        keiyakuxls.js 2026-11-27

   何のためのものか
     ふだんの契約は、印刷ボタンのまま（A3 1枚）で足ります。
     ところが単発の、少し変わった契約のときは、
     文面を手で直したほうが早いことがあります。
     そのために、Excel で開いて直せる形で出します。

   ★ なぜ、作りかたを変えたか（2026/11/27）
     はじめは「HTML の表を .xls という名前で落とす」やりかたでした。
     中身は出るのですが、紙の設定（A3・横・まん中）が、
     Excel にも LibreOffice にも、ひとつも届きませんでした。
     3回直して3回とも届かなかったので、作りかたを変えました。

     いまは、本物の .xlsx（Excel のファイル）を組み立てています。
     .xlsx は、XML をいくつか ZIP で固めたものです。
     紙の設定は、その XML にはっきり書けるので、確実に届きます。
     外の部品（ライブラリ）は使っていません。ZIP も自分で作ります。

   ★ PIVOT4 だけで使います（pivot4/index.html からだけ読みます）。
   ===================================================================== */
(function(){
  'use strict';

  /* ------------------------------------------------------------------
     XML の決まりごと
     ------------------------------------------------------------------ */
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function yen(n){ return (Number(n) || 0).toLocaleString('ja-JP'); }
  function fmtJp(dateStr){
    if(!dateStr) return '　　　年　　月　　日';
    var m = String(dateStr).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(!m) return String(dateStr);
    return m[1] + '年' + parseInt(m[2], 10) + '月' + parseInt(m[3], 10) + '日';
  }

  /* ------------------------------------------------------------------
     ① 中身（左の段・右の段）を作る
        印刷の契約書（js/buildings.js の generateKeiyakuPrint）と、
        一字一句そろえてあります。直すときは、両方いっしょに。
     ------------------------------------------------------------------ */
  function para(text, opt){
    var o = opt || {};
    return { t: text, b: !!o.b, r: !!o.r };     /* b:見出し  r:右寄せ */
  }

  window.buildKeiyakuDoc = function(data){
    var d = data || {};
    var cmp = d.company || {};
    var cmpName = cmp.name || 'IREライフ株式会社';
    var cmpAddr = ((cmp.zip ? '〒' + cmp.zip + '　' : '') + (cmp.addr || '')).trim();
    var price = Number(d.price) || 0;
    var taxRate = (d.taxRate === undefined || d.taxRate === null) ? 10 : Number(d.taxRate);
    var taxAmount = Math.round(price - price / (1 + taxRate / 100));
    var tk = Array.isArray(d.tokuyaku) ? d.tokuyaku : [];
    var i;

    var L = [];
    L.push(para('賃貸代理人：' + cmpName + '(以下、「甲」という。)と賃借人 ' + (d.userName || '') +
      '(以下、「乙」という。)は、以下のとおり駐車場賃貸借契約(以下、「本契約」という。)を締結する。'));
    L.push(para('目的：第1条', { b:true }));
    L.push(para('甲は下記記載の駐車場の専有部分(以下、「本件駐車場」という。)を、乙が賃借する下記物件の駐車場として、本契約書に記載の条件にて乙に賃貸する。'));
    L.push(para('駐車場の表示：' + (d.bldName || '')));
    L.push(para('駐車場の所在地：' + (d.bldAddr || '')));
    L.push(para('専用区画1台「' + (d.spotNo || '') + '」'));
    L.push(para('賃料：第2条', { b:true }));
    L.push(para('賃料は月額金 ' + yen(price) + ' 円(消費税率' + taxRate + '%、うち消費税' + yen(taxAmount) +
      '円)とし、毎月' + (d.payDay || '27日') + 'に翌月分を' + (d.payMethod || '口座振替') + 'にて支払うものとする。'));
    L.push(para('賃貸借期間：第3条', { b:true }));
    L.push(para('本契約の有効期間は、' + fmtJp(d.periodFrom) + 'から' + fmtJp(d.periodTo) + 'までの満2年間とする。'));
    L.push(para('前項の期間満了1ヶ月前迄に甲または乙どちらかの相手方に対する解約の申し入れがない場合は、自動的に同条件にて2年間契約を更新し、以後も同様とする。'));
    L.push(para('禁止事項：第4条', { b:true }));
    L.push(para('乙は、次に掲げる行為をすることができない。'));
    L.push(para('1. 本件駐車場を第三者に賃貸し、又は第三者に賃借権を譲渡すること'));
    L.push(para('2. 本件駐車場に建物その他の工作物を設置し、又は現状に変更を加えること'));
    L.push(para('3. 本件駐車場を駐車場以外の目的で利用してはいけない'));
    L.push(para('甲の免責事項：第5条', { b:true }));
    L.push(para('不可抗力、第三者の行為、その他甲の責めに帰すべき事由以外の事由により、乙の利用車両から生じた損害については、甲は一切責任を負わないものとする。'));
    L.push(para('解約：第6条', { b:true }));
    L.push(para('1. 甲乙は、いずれかの一方から本契約の解約を申し入れることができる。ただし、1ヶ月以上前に相手方に対して書面で通知すべきものとする。'));
    L.push(para('2. 乙が、前項の通知なく解約をなす場合には、1ヶ月分の賃料に相当する金員を甲に支払うものとする。'));
    L.push(para('3. 第1項に基づく中途解約が行われる場合、当該中途解約の日が属する月に係る賃料については、日割りにて精算する。'));

    var R = [];
    R.push(para('契約解除：第7条', { b:true }));
    R.push(para('甲は、乙が本契約に違反したときは、何らの催告をしないで直ちに本契約を解除することができる。'));
    R.push(para('明け渡し：第8条', { b:true }));
    R.push(para('本契約が期間の満了により終了し、又は前条により解除されたときは、乙は直ちに本件駐車場を甲に返還するものとする。'));
    R.push(para('協議：第9条', { b:true }));
    R.push(para('甲及び乙は、本契約に定めのない事項が生じたときや、本契約の各条項の解釈につき疑義が生じたときは、信義誠実の原則に従い協議し、円満に解決を図るものとする。'));
    R.push(para('特約事項：第10条', { b:true }));
    R.push(para('1. 乙の希望により、各種証明書等が必要な場合は金3,300 円(消費税率10%、うち消費税300円)にて甲が交付するものとする。'));
    R.push(para('2. 賃料及び証明書等発行料は、税法の改正により消費税等の税率が増減した場合は、改正税法施行日以降における増減後の税率により計算した税額とする。'));
    R.push(para('3. 甲乙共に反社会的勢力でないことを確約し、これに違反した場合、相手方は無催告で本契約を解除することができる。'));
    for(i = 0; i < tk.length; i++){ R.push(para((i + 4) + '. ' + tk[i])); }
    R.push(para(''));
    R.push(para('以上のとおり契約が成立したことを証するため、本書2通を作成し、甲乙各自署名のうえ、甲乙各自その1通を保有する。'));
    R.push(para(fmtJp(d.contractDate), { r:true }));
    R.push(para(''));
    R.push(para('賃貸代理人(甲)', { b:true }));
    R.push(para('住所　' + cmpAddr));
    R.push(para('氏名　' + cmpName + '　　　　　　　　　　　印'));
    R.push(para('　　　' + ((cmp.rep_title || '') + '　' + (cmp.rep_name || '')).trim()));
    R.push(para('登録番号　' + (cmp.invoice_no || '')));
    R.push(para(''));
    R.push(para('賃借人(乙)', { b:true }));
    R.push(para('住所　' + (d.userAddr || '')));
    R.push(para('氏名　　　　　　　　　　　　　　　　　　印'));

    return { title:'駐車場賃貸借契約書', left:L, right:R };
  };

  /* ------------------------------------------------------------------
     ② .xlsx の中身（XML）を作る

        ★ 紙の設定は、ここに書きます。ここなら確実に届きます。
            pageSetup  paperSize="8"（A3）  orientation="landscape"（横）
            printOptions  horizontalCentered / verticalCentered（まん中）
            pageSetUpPr fitToPage="1"（1ページに収める）

        ★★ 段の幅（width）と 文字の大きさ の関係に、気をつけてください。
            紙に対する「見た目の大きさ」は、文字の pt では決まりません。
            段の幅は「ふつうの文字いくつ分か」で数えます。そのものさしが
            fonts の1つめ（本文の字）なので、字を大きくすると段も同じだけ
            広がり、ぜんぶ同じ比のまま大きくなるだけです。そのあと
            「1ページに収める」で元の大きさまで縮められて、何も変わりません。
            じっさい 12pt → 16pt にしても、刷り上がりは寸分同じでした。

            紙に対する見た目を決めるのは、段の幅（COL_TEXT）のほうです。
            段を狭くすると、折り返しが増えて縦に伸び、紙をよく使います。

            いまの値（本文18pt／段66）は、LibreOffice で実際に A3 に刷って
            測って決めました。特約を3つ足した契約で
              縦 89%・横 94%・上下の空き 5%ずつ。
            文字を大きめにしてあるのは、はみ出したぶんは Excel が
            自動で縮めてくれるからです（足りないぶんは、足してくれません）。
     ------------------------------------------------------------------ */
  var COL_TEXT = 66;         /* 本文の段。左右2つ    */
  var COL_GAP  = 3.6;        /* まん中の、とじしろ   */

  function colLetter(i){ return ['A','B','C'][i]; }

  function cellXml(ref, styleIdx, text){
    if(text === '' || text === null || text === undefined) return '';
    return '<c r="' + ref + '" s="' + styleIdx + '" t="inlineStr">' +
           '<is><t xml:space="preserve">' + esc(text) + '</t></is></c>';
  }
  /* 0:本文  1:見出し  2:題名  3:右寄せ */
  function styleOf(p){ return p.b ? 1 : (p.r ? 3 : 0); }

  window.buildKeiyakuXlsxParts = function(data){
    var doc = window.buildKeiyakuDoc(data);
    var L = doc.left, R = doc.right;
    var n = Math.max(L.length, R.length);
    var rows = '', k, r, c;

    /* 1行め＝題名。A1:C1 をつなげて、まん中に出します */
    rows += '<row r="1" ht="42" customHeight="1">' +
            cellXml('A1', 2, doc.title) + '</row>';

    for(k = 0; k < n; k++){
      r = k + 2;
      c = '';
      if(L[k] && L[k].t !== '') c += cellXml('A' + r, styleOf(L[k]), L[k].t);
      if(R[k] && R[k].t !== '') c += cellXml('C' + r, styleOf(R[k]), R[k].t);
      rows += '<row r="' + r + '">' + c + '</row>';
    }

    var sheet =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
      '<dimension ref="A1:C' + (n + 1) + '"/>' +
      '<sheetViews><sheetView showGridLines="0" tabSelected="1" workbookViewId="0"/></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="18"/>' +
      '<cols>' +
        '<col min="1" max="1" width="' + COL_TEXT + '" customWidth="1"/>' +
        '<col min="2" max="2" width="' + COL_GAP + '" customWidth="1"/>' +
        '<col min="3" max="3" width="' + COL_TEXT + '" customWidth="1"/>' +
      '</cols>' +
      '<sheetData>' + rows + '</sheetData>' +
      '<mergeCells count="1"><mergeCell ref="A1:C1"/></mergeCells>' +
      /* ★ 紙のまん中に置く */
      '<printOptions horizontalCentered="1" verticalCentered="1"/>' +
      '<pageMargins left="0.4" right="0.4" top="0.4" bottom="0.4" header="0" footer="0"/>' +
      /* ★ A3（paperSize 8）・横（landscape）・1ページに収める */
      '<pageSetup paperSize="8" orientation="landscape" fitToWidth="1" fitToHeight="1"' +
      ' horizontalDpi="600" verticalDpi="600"/>' +
      '</worksheet>';

    var styles =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="3">' +
        '<font><sz val="18"/><name val="Yu Mincho"/></font>' +
        '<font><b/><sz val="19"/><name val="Yu Gothic"/></font>' +
        '<font><b/><sz val="34"/><name val="Yu Gothic"/></font>' +
      '</fonts>' +
      '<fills count="2">' +
        '<fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill>' +
      '</fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      /* numFmtId 49 ＝ 文字あつかい。「P05」を勝手に数字にしません */
      '<cellXfs count="4">' +
        '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1">' +
          '<alignment vertical="top" wrapText="1"/></xf>' +
        '<xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1">' +
          '<alignment vertical="top" wrapText="1"/></xf>' +
        '<xf numFmtId="49" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1">' +
          '<alignment horizontal="center" vertical="center"/></xf>' +
        '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1">' +
          '<alignment horizontal="right" vertical="top" wrapText="1"/></xf>' +
      '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>';

    var workbook =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="' + esc(doc.title) + '" sheetId="1" r:id="rId1"/></sheets>' +
      '</workbook>';

    var wbRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>';

    var rootRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';

    var types =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>';

    return {
      '[Content_Types].xml': types,
      '_rels/.rels': rootRels,
      'xl/workbook.xml': workbook,
      'xl/_rels/workbook.xml.rels': wbRels,
      'xl/styles.xml': styles,
      'xl/worksheets/sheet1.xml': sheet
    };
  };

  /* ------------------------------------------------------------------
     ③ ZIP に固める（.xlsx は、XML を ZIP でまとめたものです）

        縮めずに、そのまま入れる「保存(store)」だけを使います。
        縮める処理を自分で書くと、間違えたときに原因が追えません。
        中身は数十キロバイトなので、縮めなくても困りません。
     ------------------------------------------------------------------ */
  var CRC_TABLE = (function(){
    var t = new Uint32Array(256), c, i, k;
    for(i = 0; i < 256; i++){
      c = i;
      for(k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(buf){
    var c = 0xFFFFFFFF, i;
    for(i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function utf8(str){
    if(typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    /* ふるい端末むけの控え */
    var s = unescape(encodeURIComponent(str)), a = new Uint8Array(s.length), i;
    for(i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xFF;
    return a;
  }

  window.buildKeiyakuXlsxZip = function(parts){
    var names = [], name, chunks = [], central = [], offset = 0;
    for(name in parts){ if(Object.prototype.hasOwnProperty.call(parts, name)) names.push(name); }

    function u16(v){ return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function u32(v){ return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
    function push(arr, bytes){ var i; for(i = 0; i < bytes.length; i++) arr.push(bytes[i]); }

    var local = [], i, j, nb, db, cr;
    for(i = 0; i < names.length; i++){
      nb = utf8(names[i]);
      db = utf8(parts[names[i]]);
      cr = crc32(db);

      var h = [];
      push(h, u32(0x04034b50));          /* 目印 */
      push(h, u16(20));                  /* 必要な版 */
      push(h, u16(0x0800));              /* 名前は UTF-8 */
      push(h, u16(0));                   /* 縮めない */
      push(h, u16(0)); push(h, u16(0));  /* 日時（使いません） */
      push(h, u32(cr));
      push(h, u32(db.length)); push(h, u32(db.length));
      push(h, u16(nb.length)); push(h, u16(0));
      for(j = 0; j < nb.length; j++) h.push(nb[j]);

      var cd = [];
      push(cd, u32(0x02014b50));
      push(cd, u16(20)); push(cd, u16(20));
      push(cd, u16(0x0800)); push(cd, u16(0));
      push(cd, u16(0)); push(cd, u16(0));
      push(cd, u32(cr));
      push(cd, u32(db.length)); push(cd, u32(db.length));
      push(cd, u16(nb.length)); push(cd, u16(0)); push(cd, u16(0));
      push(cd, u16(0)); push(cd, u16(0)); push(cd, u32(0));
      push(cd, u32(offset));
      for(j = 0; j < nb.length; j++) cd.push(nb[j]);

      local.push({ h:h, d:db });
      central.push(cd);
      offset += h.length + db.length;
    }

    var cdStart = offset, cdLen = 0;
    for(i = 0; i < central.length; i++) cdLen += central[i].length;

    var end = [];
    push(end, u32(0x06054b50));
    push(end, u16(0)); push(end, u16(0));
    push(end, u16(names.length)); push(end, u16(names.length));
    push(end, u32(cdLen)); push(end, u32(cdStart));
    push(end, u16(0));

    var total = cdStart + cdLen + end.length;
    var out = new Uint8Array(total), p = 0;
    for(i = 0; i < local.length; i++){
      out.set(local[i].h, p); p += local[i].h.length;
      out.set(local[i].d, p); p += local[i].d.length;
    }
    for(i = 0; i < central.length; i++){ out.set(central[i], p); p += central[i].length; }
    out.set(end, p);
    return out;
  };

  /* ------------------------------------------------------------------
     ④ ファイル名と、落とすところ
     ------------------------------------------------------------------ */
  window.buildKeiyakuXlsName = function(data){
    var d = data || {};
    var bad = /[\\\/:*?"<>|]/g;
    var parts = ['駐車場賃貸借契約書'];
    if(d.bldName) parts.push(String(d.bldName).replace(bad, ''));
    if(d.spotNo)  parts.push(String(d.spotNo).replace(bad, ''));
    var t = new Date();
    parts.push(t.getFullYear() + String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0'));
    return parts.join('_') + '.xlsx';
  };

  window.exportKeiyakuXls = function(){
    if(typeof window.collectKeiyakuData !== 'function'){
      alert('この画面では使えません。\nページを開き直してから、もう一度お試しください。');
      return;
    }
    var data = window.collectKeiyakuData();
    if(!data) return;                     /* 入力が足りないときは、向こうが知らせています */

    try{
      var zip = window.buildKeiyakuXlsxZip(window.buildKeiyakuXlsxParts(data));
      var name = window.buildKeiyakuXlsName(data);
      var blob = new Blob([zip], {
        type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        try{ document.body.removeChild(a); }catch(e){}
        try{ URL.revokeObjectURL(url); }catch(e){}
      }, 1000);
      try{ if(typeof showToast === 'function') showToast('Excel で出しました'); }catch(e){}
    }catch(e){
      alert('Excel に出せませんでした。\n\n' + String((e && e.message) || e));
    }
  };
})();
