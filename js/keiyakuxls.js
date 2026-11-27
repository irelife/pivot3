/* =====================================================================
   駐車場賃貸借契約書を、Excel で編集できる形で出す
                                        keiyakuxls.js 2026-11-27

   何のためのものか
     ふだんの契約は、印刷ボタンのまま（A3 1枚）で足ります。
     ところが単発の、少し変わった契約のときは、
     文面を手で直したほうが早いことがあります。
     そのために、Excel で開いて直せる形で出します。

   作りかた
     表（table）の形にして、.xls の名前で落とします。
     Excel は、この形をそのまま開いて編集できます。
     余計な部品（ライブラリ）は使いません。増やすと、
     いつか動かなくなる場所が1つ増えるからです。

   ★ PIVOT4 だけで使います（pivot4/index.html からだけ読みます）。
   ===================================================================== */
(function(){
  'use strict';

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

  /* ★ 印刷の契約書（A3横・2段組）と、同じ並びにします。
       左の段・とじしろ・右の段 の3列。1行＝1段落なので、
       Excel ではそのマスを押して、文字を直すだけです。
       中身は js/buildings.js の generateKeiyakuPrint とそろえてあります。
       直すときは、両方いっしょに直してください。                 */

  /* 段落を1つ作ります。b:true で見出し、r:true で右寄せ */
  function para(text, opt){
    var o = opt || {};
    return { t: text, b: !!o.b, r: !!o.r, s: !!o.s };
  }
  function cell(p){
    if(!p) return '<td class="p">&nbsp;</td>';
    var cls = 'p' + (p.b ? ' hd' : '') + (p.r ? ' rt' : '') + (p.s ? ' sm' : '');
    return '<td class="' + cls + '">' + esc(p.t) + '</td>';
  }

  window.buildKeiyakuXlsHtml = function(data){
    var d = data || {};
    var cmp = d.company || {};
    var cmpName = cmp.name || 'IREライフ株式会社';
    var cmpAddr = ((cmp.zip ? '〒' + cmp.zip + '　' : '') + (cmp.addr || '')).trim();
    var price = Number(d.price) || 0;
    var taxRate = (d.taxRate === undefined || d.taxRate === null) ? 10 : Number(d.taxRate);
    var taxAmount = Math.round(price - price / (1 + taxRate / 100));
    var tk = Array.isArray(d.tokuyaku) ? d.tokuyaku : [];

    /* ---- 左の段 ---- */
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

    /* ---- 右の段 ---- */
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
    for(var i = 0; i < tk.length; i++){ R.push(para((i + 4) + '. ' + tk[i])); }
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

    var n = Math.max(L.length, R.length), rows = '', k;
    rows += '<tr><td class="t" colspan="3">駐車場賃貸借契約書</td></tr>';
    for(k = 0; k < n; k++){
      rows += '<tr>' + cell(L[k]) + '<td class="g">&nbsp;</td>' + cell(R[k]) + '</tr>';
    }

    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">' +
      '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>' +
      '<x:Name>駐車場賃貸借契約書</x:Name>' +
      '<x:WorksheetOptions>' +
        /* ★ A3 横・1ページに収める。開いたらそのまま印刷できる形にします */
        '<x:Print><x:ValidPrinterInfo/><x:PaperSizeIndex>8</x:PaperSizeIndex>' +
        '<x:FitWidth>1</x:FitWidth><x:FitHeight>1</x:FitHeight>' +
        '<x:HorizontalResolution>600</x:HorizontalResolution>' +
        '<x:VerticalResolution>600</x:VerticalResolution></x:Print>' +
        '<x:FitToPage/>' +
        /* ★ 紙の まん中 に置きます。これが無いと、Excel は紙の左上に寄せるので、
             下が大きく空いて「上に行き過ぎ」に見えます。 */
        '<x:PageSetup>' +
        '<x:Layout x:Orientation="Landscape" x:CenterHorizontal="1" x:CenterVertical="1"/>' +
        '<x:PageMargins x:Top="0.4" x:Bottom="0.4" x:Left="0.4" x:Right="0.4"/></x:PageSetup>' +
        '<x:DoNotDisplayGridlines/>' +
      '</x:WorksheetOptions>' +
      '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
      '<style>' +
      /* ★ 文字の大きさと段の幅。A3 の紙を、ちょうど使いきる寸法にしています。
           小さくすると下が空き、大きくすると Excel が勝手に縮めます。    */
      'table{border-collapse:collapse;font-family:"Yu Mincho","MS Mincho",serif;font-size:12pt;}' +
      'td{border:none;vertical-align:top;padding:2px 6px;' +
      '   mso-number-format:"\\@";white-space:normal;word-break:break-all;}' +
      'td.t{font-family:"Yu Gothic","Meiryo",sans-serif;font-size:24pt;font-weight:700;' +
      '     text-align:center;padding:10px 0 16px;}' +
      'td.p{width:545pt;line-height:1.7;}' +
      'td.g{width:36pt;}' +
      'td.hd{font-family:"Yu Gothic","Meiryo",sans-serif;font-weight:700;font-size:13pt;' +
      '      padding-top:9px;}' +
      'td.rt{text-align:right;}' +
      '</style></head><body>' +
      '<table>' + rows + '</table>' +
      '</body></html>';
  };

  /* ファイル名。物件名と区画と日付を入れます */
  window.buildKeiyakuXlsName = function(data){
    var d = data || {};
    var bad = /[\\\/:*?"<>|]/g;
    var parts = ['駐車場賃貸借契約書'];
    if(d.bldName) parts.push(String(d.bldName).replace(bad, ''));
    if(d.spotNo)  parts.push(String(d.spotNo).replace(bad, ''));
    var t = new Date();
    parts.push(t.getFullYear() + String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0'));
    return parts.join('_') + '.xls';
  };

  window.exportKeiyakuXls = function(){
    if(typeof window.collectKeiyakuData !== 'function'){
      alert('この画面では使えません。\nページを開き直してから、もう一度お試しください。');
      return;
    }
    var data = window.collectKeiyakuData();
    if(!data) return;                     /* 入力が足りないときは、向こうが知らせています */

    var html = window.buildKeiyakuXlsHtml(data);
    var name = window.buildKeiyakuXlsName(data);
    try{
      /* ★ 先頭の ﻿ は、Excel に「UTF-8 です」と伝える印です。
           これが無いと、日本語が文字化けすることがあります。 */
      var blob = new Blob(['﻿' + html], { type:'application/vnd.ms-excel;charset=utf-8' });
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
