/* =====================================================================
   市でまとめて片づける道具（PIVOT3 専用）

   何のためのものか
     岡山市・赤磐市の物件は PIVOT4 へ移りました。
     PIVOT3 には 倉敷市・笠岡市・総社市 だけを残します。
     そのために、岡山市・赤磐市の
       ① 物件（区画ごと）
       ② その物件の契約
       ③ その物件のオーナー
     を、まとめて消します。

   消す前に、かならず一覧で見せます。黙って消すことはありません。

   ★ 安全のために決めていること
     ・住所が空の物件は、どのみち消しません（判定できないため）
     ・物件名が ぴったり同じ契約・オーナーだけを消します
       （似た名前は消しません。取りこぼしは一覧に出ます）
     ・ほかにも物件を持っているオーナーは、消さずに
       その物件名だけを外します
     ・消した物件と区画は、30日間ごみ箱に残ります
       （設定 → 変更履歴・ごみ箱）

   ※ ここで消えるのは、この端末の中だけです。
     設定 → クラウド同期 → ⬆️（クラウドへ送信）を押すまで、
     クラウドにも 控えのスプレッドシートにも 残っています。
   ===================================================================== */
(function(){
  'use strict';

  /* 消す対象の市。ここを直せば対象が変わります。 */
  var CITIES = ['岡山市', '赤磐市'];

  function norm(s){ return String(s == null ? '' : s).normalize('NFKC').replace(/[\s　]/g, ''); }
  function key(s){ return norm(s).toLowerCase(); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function pfx(){ try{ return insPrefix(); }catch(e){ return 'pivot_'; } }
  function ctK(){ try{ return ctKey(); }catch(e){ return pfx() + 'contract_kanban_v2'; } }
  function owK(){ return pfx() + 'rent_owner_send_owners_v1'; }

  function loadCts(){ try{ var o = JSON.parse(localStorage.getItem(ctK()) || '{}'); return (o && typeof o === 'object') ? o : {}; }catch(e){ return {}; } }
  function loadOws(){ try{ var a = JSON.parse(localStorage.getItem(owK()) || '[]'); return Array.isArray(a) ? a : []; }catch(e){ return []; } }

  /* オーナーが持っている物件名を、配列でそろえます */
  function propsOf(o){
    var ps = [];
    if(o && Array.isArray(o.properties) && o.properties.length) ps = o.properties.slice();
    else if(o && o.property) ps = String(o.property).split(/[、,\n]/);
    return ps.map(function(x){ return String(x).trim(); }).filter(function(x){ return x; });
  }

  function cityOf(addr){
    var a = norm(addr);
    if(!a) return '';
    for(var i = 0; i < CITIES.length; i++){ if(a.indexOf(CITIES[i]) >= 0) return CITIES[i]; }
    return '';
  }

  /* 消すものを数えます（まだ何も変えません） */
  function scan(){
    var all = (typeof pbLoadAll === 'function') ? (pbLoadAll() || {}) : {};
    var cts = loadCts(), ows = loadOws();
    var hit = [], noAddr = [], names = {};

    Object.keys(all).forEach(function(id){
      var b = all[id] || {};
      var c = cityOf(b.addr);
      if(!c){
        if(!norm(b.addr)) noAddr.push({ id:id, name: b.name || '(名前なし)' });
        return;
      }
      hit.push({ id:id, name: b.name || '(名前なし)', addr: b.addr || '',
                 city: c, spots: (b.spots || []).length });
      if(norm(b.name)) names[key(b.name)] = 1;
    });

    var ctHit = [];
    Object.keys(cts).forEach(function(cid){
      var c = cts[cid] || {};
      if(names[key(c.property)]){
        ctHit.push({ id:cid, property: c.property || '', room: c.room || '',
                     who: c.contractor || c.tenant || '' });
      }
    });

    var owDel = [], owEdit = [];
    ows.forEach(function(o, i){
      var ps = propsOf(o);
      var gone = ps.filter(function(p){ return names[key(p)]; });
      if(!gone.length) return;
      var rest = ps.filter(function(p){ return !names[key(p)]; });
      if(rest.length) owEdit.push({ i:i, name: (o && o.name) || '(名前なし)', gone:gone, rest:rest });
      else           owDel.push({ i:i, name: (o && o.name) || '(名前なし)', gone:gone });
    });

    hit.sort(function(x, y){ return String(x.name).localeCompare(String(y.name), 'ja'); });
    return { hit:hit, noAddr:noAddr, ctHit:ctHit, owDel:owDel, owEdit:owEdit,
             total: Object.keys(all).length,
             ctTotal: Object.keys(cts).length,
             owTotal: ows.length };
  }

  /* ほんとうに消します */
  function run(r){
    var n1 = 0, n2 = 0, n3 = 0, n4 = 0;

    /* ① 物件（区画ごと） */
    try{
      var all = pbLoadAll() || {};
      r.hit.forEach(function(x){ if(all[x.id]){ delete all[x.id]; n1++; } });
      pbSaveRaw(all);
    }catch(e){}

    /* ② 契約 */
    try{
      var cts = loadCts();
      r.ctHit.forEach(function(x){ if(cts[x.id]){ delete cts[x.id]; n2++; } });
      localStorage.setItem(ctK(), JSON.stringify(cts));
    }catch(e){}

    /* ③ オーナー（先に書き替え、そのあと番号の大きい順に消します） */
    try{
      var ows = loadOws();
      r.owEdit.forEach(function(e){
        var o = ows[e.i]; if(!o) return;
        o.properties = e.rest.slice();
        o.property   = e.rest.join('、');
        n4++;
      });
      r.owDel.map(function(d){ return d.i; })
             .sort(function(a, b){ return b - a; })
             .forEach(function(i){ if(ows[i]){ ows.splice(i, 1); n3++; } });
      localStorage.setItem(owK(), JSON.stringify(ows));
    }catch(e){}

    try{ if(typeof touchLocalMtime === 'function') touchLocalMtime(); }catch(e){}
    try{ if(typeof renderAll === 'function') renderAll(); }catch(e){}
    try{ if(typeof requestRender === 'function') requestRender('buildings'); }catch(e){}

    return { b:n1, c:n2, od:n3, oe:n4 };
  }

  /* 見た目は 2つの画面で同じものを使います */
  function styleTag(){
    var st = document.createElement('style');
    st.textContent = [
      '#co-ov .co-box{background:#fff;border-radius:16px;width:700px;max-width:100%;max-height:88vh;',
      '  overflow-y:auto;padding:20px 22px;box-shadow:0 18px 50px rgba(0,0,0,.3);',
      '  font-family:inherit;color:#17171a;}',
      '#co-ov .co-hd{font-size:17px;font-weight:800;margin-bottom:8px;}',
      '#co-ov .co-lead{font-size:13px;line-height:1.8;color:#3f3f46;margin-bottom:14px;}',
      '#co-ov .co-h2{font-size:12px;font-weight:800;letter-spacing:.06em;color:#71717a;margin:14px 0 6px;}',
      '#co-ov .co-list{border:1px solid #e4e4e7;border-radius:10px;max-height:26vh;',
      '  overflow-y:auto;background:#fafafa;}',
      '#co-ov .co-r{display:flex;gap:10px;align-items:baseline;padding:7px 11px;',
      '  border-bottom:1px solid #ececef;font-size:13px;}',
      '#co-ov .co-r:last-child{border-bottom:0;}',
      '#co-ov .co-r b{font-weight:700;flex:0 0 auto;}',
      '#co-ov .co-r span{color:#71717a;font-size:11.5px;flex:1;min-width:0;}',
      '#co-ov .co-r i{color:#71717a;font-size:11.5px;font-style:normal;flex:0 0 auto;}',
      '#co-ov .co-none{padding:14px;text-align:center;color:#71717a;font-size:13px;}',
      '#co-ov .co-note{font-size:11.5px;color:#71717a;line-height:1.8;margin-top:14px;',
      '  background:#f5f5f6;border-radius:10px;padding:10px 12px;}',
      '#co-ov .co-conf{font-size:12.5px;color:#3f3f46;margin-top:14px;display:flex;',
      '  gap:10px;align-items:center;}',
      '#co-ov .co-conf input{flex:0 0 120px;padding:9px 10px;border:1.5px solid #d4d4d8;',
      '  border-radius:9px;font:inherit;}',
      '#co-ov .co-btns{display:flex;gap:10px;margin-top:14px;}',
      '#co-ov .co-btns button{flex:1;padding:13px;border-radius:11px;border:1.5px solid #d4d4d8;',
      '  background:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;}',
      '#co-ov #co-go{background:#b23a28;border-color:#b23a28;color:#fff;}',
      '#co-ov #co-go[disabled]{opacity:.4;cursor:default;}'
    ].join('');
    return st;
  }

  window.openCityOut = function(){
    if(!(function(){ try{ return insPrefix() === 'pivot3_'; }catch(e){ return false; } })()){
      alert('この道具は PIVOT3 専用です。\nこの画面では使えません。');
      return;
    }

    var r = scan();

    var old = document.getElementById('co-ov'); if(old) old.remove();

    /* 消すものが無いときは、控えのスプレッドシートを作り直す画面を出します。
       （⬆️ でクラウドへ送ったあと、ここをもう一度開いてもらいます）    */
    if(!r.hit.length){
      var ov2 = document.createElement('div');
      ov2.id = 'co-ov';
      ov2.setAttribute('style',
        'position:fixed;inset:0;z-index:190000;background:rgba(0,0,0,.45);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;');
      ov2.innerHTML =
        '<div class="co-box">' +
          '<div class="co-hd">' + CITIES.join('・') + ' の物件は、もうありません</div>' +
          '<div class="co-lead">' +
            'いま PIVOT3 には 物件 ' + r.total + '件 ／ 契約 ' + r.ctTotal + '件 ／ ' +
            'オーナー ' + r.owTotal + '件 あります。<br>' +
            '住所に ' + CITIES.join('・') + ' が入っている物件は、1件もありません。' +
          '</div>' +
          '<div class="co-note">' +
            '<b>控えのスプレッドシートも、作り直しますか</b><br>' +
            'クラウド（Firestore）から消しても、控えのスプレッドシートには残ります。<br>' +
            '下のボタンを押すと、いまの中身で 物件・契約・オーナーの表を作り直します。<br><br>' +
            '※ 先に 設定 → クラウド同期 → ⬆️（クラウドへ送信）を済ませてください。' +
            '手元とクラウドが同じでないと、安全のため送られません' +
            '（そのときは何も起きません）。<br>' +
            '※ PIVOT4 と同じクラウドURLを使っている場合は、押さないでください。' +
            'PIVOT4 の控えからも消えます。' +
          '</div>' +
          '<div class="co-btns">' +
            '<button type="button" id="co-cancel2">閉じる</button>' +
            '<button type="button" id="co-sheet">控えのスプレッドシートを作り直す</button>' +
          '</div>' +
        '</div>';
      ov2.appendChild(styleTag());
      document.body.appendChild(ov2);
      ov2.querySelector('#co-cancel2').onclick = function(){ ov2.remove(); };
      ov2.querySelector('#co-sheet').onclick = function(){
        if(!confirm('控えのスプレッドシートを、いまの中身で作り直します。\n\n' +
                    'PIVOT4 と同じクラウドURLを使っている場合は、押さないでください。')) return;
        try{ if(typeof window.pushFeatureToCloud === 'function'){
          window.pushFeatureToCloud('buildings');
          window.pushFeatureToCloud('contracts');
          window.pushFeatureToCloud('owners');
        } }catch(e){}
        ov2.remove();
        alert('控えのスプレッドシートへ送りました。\n\n' +
              '※ 手元とクラウドがまだ違うときは、安全のため送られません。\n' +
              '　 そのときは、先に ⬆️（クラウドへ送信）を済ませてから、\n' +
              '　 もう一度このボタンを押してください。\n' +
              '※ スプレッドシートを開いて、' + CITIES.join('・') + ' の行が\n' +
              '　 消えているか、目で確かめてください。');
      };
      return;
    }
    var ov = document.createElement('div');
    ov.id = 'co-ov';
    ov.setAttribute('style',
      'position:fixed;inset:0;z-index:190000;background:rgba(0,0,0,.45);' +
      'display:flex;align-items:center;justify-content:center;padding:16px;');

    function rows(list, fn){
      return list.length ? list.map(fn).join('') : '<div class="co-none">ありません。</div>';
    }

    var bldList = rows(r.hit, function(x){
      return '<div class="co-r"><b>' + esc(x.name) + '</b>' +
             '<span>' + esc(x.addr) + '</span>' +
             '<i>区画 ' + x.spots + '件</i></div>'; });

    var ctList = rows(r.ctHit, function(x){
      return '<div class="co-r"><b>' + esc(x.property) + '</b>' +
             '<span>' + esc(x.room) + '　' + esc(x.who) + '</span></div>'; });

    var owList = rows(r.owDel, function(x){
      return '<div class="co-r"><b>' + esc(x.name) + '</b>' +
             '<span>' + esc(x.gone.join('、')) + '</span></div>'; });

    var owEditList = r.owEdit.length
      ? '<div class="co-h2">オーナーは残し、物件名だけ外すもの（' + r.owEdit.length + '件）</div>' +
        '<div class="co-list">' + r.owEdit.map(function(x){
          return '<div class="co-r"><b>' + esc(x.name) + '</b>' +
                 '<span>外す：' + esc(x.gone.join('、')) + '　／　残す：' + esc(x.rest.join('、')) + '</span></div>';
        }).join('') + '</div>'
      : '';

    var noAddrList = r.noAddr.length
      ? '<div class="co-h2">住所が空なので、判定できないもの（' + r.noAddr.length + '件・消しません）</div>' +
        '<div class="co-list">' + r.noAddr.map(function(x){
          return '<div class="co-r"><b>' + esc(x.name) + '</b><span>住所が入っていません</span></div>';
        }).join('') + '</div>'
      : '';

    var n = r.hit.length;

    ov.innerHTML =
      '<div class="co-box">' +
        '<div class="co-hd">' + CITIES.join('・') + ' の物件を、まとめて消す</div>' +
        '<div class="co-lead">' +
          'いま PIVOT3 には 物件 ' + r.total + '件 ／ 契約 ' + r.ctTotal + '件 ／ オーナー ' + r.owTotal + '件 あります。<br>' +
          'このうち、住所に <b>' + CITIES.join('</b> か <b>') + '</b> が入っている物件と、' +
          'その物件の契約・オーナーを消します。<br>' +
          '<b>倉敷市・笠岡市・総社市は、ひとつも触りません。</b>' +
        '</div>' +

        '<div class="co-h2">消す物件（' + n + '件）</div>' +
        '<div class="co-list">' + bldList + '</div>' +

        '<div class="co-h2">いっしょに消す契約（' + r.ctHit.length + '件）</div>' +
        '<div class="co-list">' + ctList + '</div>' +

        '<div class="co-h2">いっしょに消すオーナー（' + r.owDel.length + '件）</div>' +
        '<div class="co-list">' + owList + '</div>' +

        owEditList +
        noAddrList +

        '<div class="co-note">' +
          '<b>消したあとに、かならずしてください</b><br>' +
          '設定 → クラウド同期 → <b>⬆️（クラウドへ送信）</b> を押す。<br>' +
          'ここで消えるのは、この端末の中だけです。押さないと、' +
          'クラウドにも 控えのスプレッドシートにも 残ったままで、' +
          '次にログインしたとき また戻ってきます。<br><br>' +
          '※「物件 ' + n + '件が消えます」と聞かれたら【OK】を押してください。' +
          'まとめて消すときに出る、確かめの画面です。<br>' +
          '※ 消した物件と区画は、30日間ごみ箱に残ります' +
          '（設定 → 変更履歴・ごみ箱）。' +
        '</div>' +

        '<div class="co-conf">' +
          '念のため、下の欄に <b>削除</b> と入れてください。' +
          '<input type="text" id="co-word" autocomplete="off" placeholder="削除">' +
        '</div>' +

        '<div class="co-btns">' +
          '<button type="button" id="co-cancel">閉じる</button>' +
          '<button type="button" id="co-go" disabled>この ' + n + '件を消す</button>' +
        '</div>' +
      '</div>';

    ov.appendChild(styleTag());
    document.body.appendChild(ov);

    var word = ov.querySelector('#co-word');
    var go   = ov.querySelector('#co-go');
    function check(){ go.disabled = !(n > 0 && norm(word.value) === '削除'); }
    word.addEventListener('input', check);
    check();

    ov.querySelector('#co-cancel').onclick = function(){ ov.remove(); };

    go.onclick = function(){
      if(go.disabled) return;
      if(!confirm(
        '消します。よろしいですか？\n\n' +
        '　物件　 ' + r.hit.length + '件（区画ごと）\n' +
        '　契約　 ' + r.ctHit.length + '件\n' +
        '　オーナー ' + r.owDel.length + '件（ほか ' + r.owEdit.length + '件は物件名だけ外します）\n\n' +
        '※ 消えるのは この端末の中だけです。\n' +
        '　 クラウドへ送るまでは、まだ戻せます。')) return;

      var res = run(r);
      ov.remove();

      /* クラウドへ送ります（止められたときは、人が ⬆️ を押します） */
      try{ if(typeof window.pushFeatureToCloud === 'function') window.pushFeatureToCloud('contracts'); }catch(e){}
      try{ if(typeof window.pushOwnersNow === 'function') window.pushOwnersNow(); }catch(e){}
      try{
        if(typeof window.__pushNow === 'function') window.__pushNow();
        else if(typeof window.__scheduleAutoPush === 'function') window.__scheduleAutoPush();
      }catch(e){}

      alert(
        '消しました。\n\n' +
        '　物件　 ' + res.b + '件（区画ごと）\n' +
        '　契約　 ' + res.c + '件\n' +
        '　オーナー ' + res.od + '件（ほか ' + res.oe + '件は物件名だけ外しました）\n\n' +
        '★ このあと かならず\n' +
        '　 設定 → クラウド同期 → ⬆️（クラウドへ送信）\n' +
        '　 を押してください。\n\n' +
        'いま消えたのは この端末の中だけです。\n' +
        'クラウドにも 控えのスプレッドシートにも まだ残っています。\n\n' +
        '※ 送信のとちゅうで「物件 ○件が消えます」と聞かれたら\n' +
        '　【OK】を押してください。\n' +
        '※ 送り終わったら、画面を1度 読み込み直してください。');
    };
  };
})();
