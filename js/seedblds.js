/* =====================================================================
   物件を、はじめてクラウドへ写す道具        seedblds.js 2026-11-22

   何のためのものか
     PIVOT4 は、物件がクラウド（Firestore）に1件も入っていません。
     物件の実体は
       ・控えのスプレッドシート
       ・この端末の中
     の2か所だけです。しかも控えの表は PIVOT3 と共有しているため、
     PIVOT3 が保存すると、PIVOT4 で足した物件が控えから消えます。
     （2026/11/22、ノスタルジア・バーチェツダカ・ヒガリアが
       この状態にありました）

     この道具は、いま画面に出ている物件を、そのままクラウドへ写します。
     写したあとは、ほかの画面が何をしても消えません。

   安全のために決めていること
     ・クラウドに物件が1件でもあるときは、何もしません
       （上書き事故を防ぐため。手元が正しいとは限らないからです）
     ・写す前に件数を見せます。「移行」と入れるまで押せません
     ・消す道具ではありません。足すだけです
   ===================================================================== */
(function(){
  'use strict';

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function norm(s){ return String(s == null ? '' : s).normalize('NFKC').replace(/[\s　]/g, ''); }

  function styleTag(){
    var st = document.createElement('style');
    st.textContent = [
      '#sb-ov .sb-box{background:#fff;border-radius:16px;width:620px;max-width:100%;max-height:86vh;',
      '  overflow-y:auto;padding:20px 22px;box-shadow:0 18px 50px rgba(0,0,0,.3);',
      '  font-family:inherit;color:#17171a;}',
      '#sb-ov .sb-hd{font-size:17px;font-weight:800;margin-bottom:8px;}',
      '#sb-ov .sb-lead{font-size:13px;line-height:1.8;color:#3f3f46;margin-bottom:14px;}',
      '#sb-ov .sb-h2{font-size:12px;font-weight:800;letter-spacing:.06em;color:#71717a;margin:14px 0 6px;}',
      '#sb-ov .sb-list{border:1px solid #e4e4e7;border-radius:10px;max-height:28vh;',
      '  overflow-y:auto;background:#fafafa;}',
      '#sb-ov .sb-r{display:flex;gap:10px;align-items:baseline;padding:7px 11px;',
      '  border-bottom:1px solid #ececef;font-size:13px;}',
      '#sb-ov .sb-r:last-child{border-bottom:0;}',
      '#sb-ov .sb-r b{font-weight:700;flex:0 0 auto;}',
      '#sb-ov .sb-r span{color:#71717a;font-size:11.5px;flex:1;min-width:0;}',
      '#sb-ov .sb-note{font-size:11.5px;color:#71717a;line-height:1.8;margin-top:14px;',
      '  background:#f5f5f6;border-radius:10px;padding:10px 12px;}',
      '#sb-ov .sb-conf{font-size:12.5px;color:#3f3f46;margin-top:14px;display:flex;gap:10px;align-items:center;}',
      '#sb-ov .sb-conf input{flex:0 0 120px;padding:9px 10px;border:1.5px solid #d4d4d8;',
      '  border-radius:9px;font:inherit;}',
      '#sb-ov .sb-btns{display:flex;gap:10px;margin-top:14px;}',
      '#sb-ov .sb-btns button{flex:1;padding:13px;border-radius:11px;border:1.5px solid #d4d4d8;',
      '  background:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;}',
      '#sb-ov #sb-go{background:#1f6feb;border-color:#1f6feb;color:#fff;}',
      '#sb-ov #sb-go[disabled]{opacity:.4;cursor:default;}'
    ].join('');
    return st;
  }

  window.openSeedBlds = function(){
    if(typeof window.__pvSeedBlds !== 'function'){
      alert('この画面では使えません。\nページを開き直してから、もう一度お試しください。');
      return;
    }

    var all = {};
    try{ all = (typeof pbLoadAll === 'function') ? (pbLoadAll() || {}) : {}; }catch(e){ all = {}; }
    var ids = Object.keys(all);
    var names = ids.map(function(id){
      var b = all[id] || {};
      return { name: b.name || '(名前なし)', addr: b.addr || '',
               spots: (b.spots || []).length };
    }).sort(function(x, y){ return String(x.name).localeCompare(String(y.name), 'ja'); });

    var old = document.getElementById('sb-ov'); if(old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'sb-ov';
    ov.setAttribute('style',
      'position:fixed;inset:0;z-index:190000;background:rgba(0,0,0,.45);' +
      'display:flex;align-items:center;justify-content:center;padding:16px;');

    var list = names.length
      ? names.map(function(x){
          return '<div class="sb-r"><b>' + esc(x.name) + '</b>' +
                 '<span>' + esc(x.addr) + '　区画 ' + x.spots + '件</span></div>';
        }).join('')
      : '<div class="sb-r"><b>物件がありません</b></div>';

    ov.innerHTML =
      '<div class="sb-box">' +
        '<div class="sb-hd">物件を、はじめてクラウドへ写す</div>' +
        '<div class="sb-lead">' +
          'いまこの画面の物件は、<b>クラウドに1件も入っていません</b>。<br>' +
          '控えのスプレッドシートと、この端末の中にしかありません。<br>' +
          'ほかの画面が控えを作り直すと、<b>足した物件が消えます</b>。<br>' +
          'ここで写しておけば、もう消えません。' +
        '</div>' +
        '<div class="sb-h2">写す物件（' + names.length + '件）</div>' +
        '<div class="sb-list">' + list + '</div>' +
        '<div class="sb-note">' +
          '<b>消す道具ではありません。足すだけです。</b><br>' +
          'クラウドに物件が1件でも入っているときは、何もしません' +
          '（上書きの事故を防ぐためです）。<br>' +
          '写し終わったら、画面を1度 読み込み直してください。' +
        '</div>' +
        '<div class="sb-conf">' +
          '念のため、下の欄に <b>移行</b> と入れてください。' +
          '<input type="text" id="sb-word" autocomplete="off" placeholder="移行">' +
        '</div>' +
        '<div class="sb-btns">' +
          '<button type="button" id="sb-cancel">閉じる</button>' +
          '<button type="button" id="sb-go" disabled>この ' + names.length + '件を写す</button>' +
        '</div>' +
      '</div>';

    ov.appendChild(styleTag());
    document.body.appendChild(ov);

    var word = ov.querySelector('#sb-word');
    var go   = ov.querySelector('#sb-go');
    function check(){ go.disabled = !(names.length > 0 && norm(word.value) === '移行'); }
    word.addEventListener('input', check);
    check();

    ov.querySelector('#sb-cancel').onclick = function(){ ov.remove(); };

    go.onclick = function(){
      if(go.disabled) return;
      go.disabled = true;
      go.textContent = '写しています…';
      window.__pvSeedBlds().then(function(r){
        ov.remove();
        if(r && r.ok){
          alert('物件 ' + r.n + ' 件を、クラウドへ写しました。\n\n' +
                'これで、ほかの画面が何をしても消えません。\n\n' +
                '※ このあと、画面を1度 読み込み直してください。');
        }else{
          alert('写しませんでした。\n\n理由：' + ((r && r.why) || '分かりません') + '\n\n' +
                '※ クラウドにもう物件が入っている場合は、これで正常です。');
        }
      }, function(e){
        ov.remove();
        alert('写せませんでした。\n\n' + String((e && e.message) || e));
      });
    };
  };
})();
