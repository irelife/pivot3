/* ===========================================================
   スマホで物件を見るときの画面（Googleマップと同じ組み立て）

   ・配置図を画面いっぱいに敷きます
   ・物件情報と区画一覧は、下から引き上げるシートに入れます

   いまある HTML の id は1つも変えません。
   .modal-body と .modal-footer を、新しく作る #pv-sheet の中へ
   「移すだけ」なので、保存・編集・印刷の動きはそのままです。
   760px より広い画面では、何もしません（パソコンは今までどおり）。
   =========================================================== */
(function(){
  'use strict';

  var MQ    = window.matchMedia('(max-width: 760px)');
  var SNAPS = ['peek', 'half', 'full'];
  var RATIO = { peek: 0.32, half: 0.60, full: 0.94 };

  var on = false, idx = 1;
  var modal, box, header, body, footer, sheet, stage, grip, gripName, hint, obs;

  function q(s, r){ return (r || document).querySelector(s); }

  /* ---------- 組み立て ---------- */
  function build(){
    if(on) return;
    modal  = document.getElementById('modal');            if(!modal) return;
    box    = q('.modal', modal);                          if(!box) return;
    header = q('.modal-header', box);
    body   = q('.modal-body', box);
    footer = q('.modal-footer', box);
    if(!body) return;

    stage = document.createElement('div');
    stage.id = 'pv-stage';
    box.insertBefore(stage, box.firstChild);

    hint = document.createElement('div');
    hint.id = 'pv-hint';
    hint.textContent = 'タップで拡大';
    box.appendChild(hint);

    sheet = document.createElement('div');
    sheet.id = 'pv-sheet';

    grip = document.createElement('div');
    grip.id = 'pv-grip';
    grip.setAttribute('role', 'button');
    grip.setAttribute('tabindex', '0');
    grip.setAttribute('aria-label', 'シートの高さを変える');
    grip.innerHTML = '<i></i><b id="pv-grip-name"></b>';
    gripName = q('#pv-grip-name', grip);

    sheet.appendChild(grip);
    sheet.appendChild(body);
    if(footer) sheet.appendChild(footer);
    box.appendChild(sheet);

    modal.classList.add('pv-ms');
    on = true;

    grip.addEventListener('pointerdown', onDown);
    grip.addEventListener('keydown', onKey);
    grip.addEventListener('click', onTap);
    stage.addEventListener('click', onStageTap);

    var area = document.getElementById('layout-area');
    if(area && window.MutationObserver){
      obs = new MutationObserver(syncStage);
      obs.observe(area, { childList:true, subtree:true, attributes:true, attributeFilter:['src'] });
    }
    var nameEl = document.getElementById('f-name');
    if(nameEl) nameEl.addEventListener('input', syncName);

    snap('half', false);
    syncStage();
    syncName();
  }

  /* ---------- 元に戻す（画面を広げたとき） ---------- */
  function teardown(){
    if(!on) return;
    if(obs){ obs.disconnect(); obs = null; }
    grip.removeEventListener('pointerdown', onDown);
    grip.removeEventListener('keydown', onKey);
    grip.removeEventListener('click', onTap);
    stage.removeEventListener('click', onStageTap);

    box.appendChild(body);
    if(footer) box.appendChild(footer);
    if(sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
    if(stage && stage.parentNode) stage.parentNode.removeChild(stage);
    if(hint  && hint.parentNode)  hint.parentNode.removeChild(hint);

    modal.classList.remove('pv-ms', 'pv-dragging');
    modal.removeAttribute('data-pv-snap');
    modal.style.removeProperty('--pv-h');
    body.style.removeProperty('overflow-y');
    sheet = stage = grip = gripName = hint = null;
    on = false;
  }

  /* ---------- 配置図をステージに映す ---------- */
  function layoutSrc(){
    var img = q('#layout-area .img-thumb img');
    return img ? img.getAttribute('src') : '';
  }
  function syncStage(){
    if(!on || !stage) return;
    var src = layoutSrc();
    if(src){
      var cur = q('img', stage);
      if(cur){ if(cur.getAttribute('src') !== src) cur.setAttribute('src', src); }
      else { stage.innerHTML = '<img alt="配置図">'; q('img', stage).setAttribute('src', src); }
      if(hint) hint.style.display = '';
      return;
    }
    if(q('#layout-area .img-thumb-pdf')){
      stage.innerHTML = '<div class="pv-stage-pdf">配置図はPDFです<br>下の配置図欄から開いてください</div>';
    } else {
      stage.innerHTML = '<div class="pv-stage-none">配置図がまだ登録されていません。<br>下の「配置図」から追加できます。</div>';
    }
    if(hint) hint.style.display = 'none';
  }
  function syncName(){
    if(!on || !gripName) return;
    var el = document.getElementById('f-name');
    gripName.textContent = (el && el.value) ? el.value : '';
  }

  /* ---------- 高さ ---------- */
  function h(name){ return Math.round(box.clientHeight * RATIO[name]); }

  function snap(name){
    idx = SNAPS.indexOf(name); if(idx < 0) idx = 1;
    modal.setAttribute('data-pv-snap', name);
    modal.style.setProperty('--pv-h', h(name) + 'px');
  }

  /* ---------- 指で引き上げる ---------- */
  var dragging = false, startY = 0, startH = 0, moved = 0;

  function onDown(e){
    if(e.button != null && e.button !== 0) return;
    dragging = true; moved = 0;
    startY = e.clientY;
    startH = h(SNAPS[idx]);
    modal.classList.add('pv-dragging');
    try{ grip.setPointerCapture(e.pointerId); }catch(err){}
    grip.addEventListener('pointermove', onMove);
    grip.addEventListener('pointerup', onUp);
    grip.addEventListener('pointercancel', onUp);
  }
  function onMove(e){
    if(!dragging) return;
    var dy = e.clientY - startY;
    if(Math.abs(dy) > moved) moved = Math.abs(dy);
    var v = Math.min(box.clientHeight * 0.96, Math.max(80, startH - dy));
    modal.style.setProperty('--pv-h', v + 'px');
  }
  function onUp(e){
    if(!dragging) return;
    dragging = false;
    modal.classList.remove('pv-dragging');
    try{ grip.releasePointerCapture(e.pointerId); }catch(err){}
    grip.removeEventListener('pointermove', onMove);
    grip.removeEventListener('pointerup', onUp);
    grip.removeEventListener('pointercancel', onUp);

    var cur = parseFloat(getComputedStyle(modal).getPropertyValue('--pv-h')) || h('half');
    var best = 'half', d = Infinity;
    SNAPS.forEach(function(n){ var dd = Math.abs(h(n) - cur); if(dd < d){ d = dd; best = n; } });
    snap(best);
  }
  function onTap(){
    if(moved > 6){ moved = 0; return; }   // ドラッグの終わりはタップとして扱いません
    snap(SNAPS[(idx + 1) % SNAPS.length]);
  }
  function onKey(e){
    if(e.key === 'ArrowUp'){   e.preventDefault(); snap(SNAPS[Math.min(2, idx + 1)]); }
    if(e.key === 'ArrowDown'){ e.preventDefault(); snap(SNAPS[Math.max(0, idx - 1)]); }
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); snap(SNAPS[(idx + 1) % SNAPS.length]); }
  }

  /* ---------- 配置図をタップして拡大（いまある機能をそのまま使います） ---------- */
  function onStageTap(){
    var src = layoutSrc();
    if(src && typeof window.openImgZoom === 'function') window.openImgZoom(src);
  }

  /* ---------- 出入り口 ---------- */
  function refresh(){
    if(MQ.matches) build(); else teardown();
    if(on){ snap(SNAPS[idx]); syncStage(); syncName(); }
  }
  function start(){
    refresh();
    if(MQ.addEventListener) MQ.addEventListener('change', refresh);
    else if(MQ.addListener) MQ.addListener(refresh);
    window.addEventListener('resize', function(){ if(on && !dragging) snap(SNAPS[idx]); });

    // 物件を開いたときに、配置図と物件名を映しなおします
    var m = document.getElementById('modal');
    if(m && window.MutationObserver){
      new MutationObserver(function(){
        if(!on) return;
        if(m.classList.contains('active')){ snap('half'); syncStage(); syncName(); }
      }).observe(m, { attributes:true, attributeFilter:['class'] });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.PVMobileSheet = { refresh: refresh, sync: function(){ syncStage(); syncName(); } };
})();
