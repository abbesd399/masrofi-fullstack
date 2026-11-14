/* Tab 3 — Family Shared Wallet: dynamic members + invite code · purchases feed | smart grocery cart */

M.feedListHtml = () => {
  const s = M.s, ar = s.lang === 'ar';
  const list = (s.purchases || []).filter(p => s.famFilter === 'all' || p.member === s.famFilter);
  const days = [...new Set(list.map(p => p.day))];
  const head = `<div class="sec-h" style="margin-bottom:4px"><h3>${M.t('segFeed')}</h3><button type="button" class="btn sm tonal" data-act="add-purch-open">${M.ico('plus', 14, 2.5)} <span>${M.t('addPurchBtn')}</span></button></div>`;
  if (!days.length) {
    return `${head}<div class="empty">${M.illu('cart')}<h4>${ar ? 'لا توجد مشتريات مسجلة بعد' : 'No purchases yet'}</h4><p>${ar ? 'سجّل مشترياتك يدوياً أو صوّر أي إيصال بالكاميرا الذكية.' : 'Record purchases manually or scan any receipt with the camera.'}</p></div>`;
  }
  return head + days.map(d => `<div class="feed-day">${M.dayLabel(d)}</div>
    <div class="list">${list.filter(p => p.day === d).map(p => M.purchaseRow(p).replace('class="row"', `class="row${p.id === M.freshId ? ' fresh' : ''}"`)).join('')}</div>`).join('');
};

M.familyBodyHtml = () => {
  const s = M.s, seg = s.famSeg || 'feed';
  if (seg === 'feed') {
    return `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="chips" id="famChips">
        ${[['all', M.t('all'), 'var(--primary)'], ...M.MEMBERS.map(m => [m.id, M.L(m.n), m.c || '#0D9488'])].map(([v, l, col]) =>
          `<button type="button" class="chip ${s.famFilter === v ? 'on' : ''}" style="--chip-c:${col}" data-act="fam-filter" data-id="${v}">
            ${v !== 'all' ? M.avatar(v, 'xs') : `<span class="chip-all-ic">${M.ico('users', 15, 2)}</span>`}
            <span>${l}</span>
          </button>`).join('')}
      </div>
      <div class="card" id="feed">${M.feedListHtml()}</div>
    </div>`;
  }

  const c = M.calc();
  const cartList = s.cart || [];
  const est = cartList.reduce((a, i) => a + i.p * i.q, 0);
  const left = cartList.filter(i => !i.got).reduce((a, i) => a + i.p * i.q, 0);
  const gotCount = cartList.filter(i => i.got).length;
  const remCount = cartList.length - gotCount;
  const pct = c.spendable ? Math.min(100, Math.round((left / c.spendable) * 100)) : (left ? 100 : 0);
  const donePct = est ? Math.round(((est - left) / est) * 100) : 0;

  return `
  <div class="cart-est">
    <div class="ce-top">
      <div class="small" style="opacity:.92;display:flex;gap:6px;align-items:center;font-weight:600">${M.ico('cart', 16, 2)} ${M.t('remBasket')}</div>
      ${gotCount ? `<button type="button" class="ce-clear" data-act="cart-clear-got">${M.ico('trash', 13, 2)} ${M.t('clearGot')} (${gotCount})</button>` : `<span class="ce-pill">${remCount}/${cartList.length} ${M.t('items')}</span>`}
    </div>
    <div class="ce-big priv" id="cartLeftBal">${M.money(left)}</div>
    <div class="ce-meta">
      <span>${M.t('estBasket')}: <b class="priv">${M.money(est)}</b></span>
      <span>·</span>
      <span>${M.t('ofSpend')(pct)}</span>
    </div>
    <div class="bar"><i id="cartBarFill" style="width:${donePct}%"></i></div>
  </div>

  <div class="card">
    <form class="add-item" data-form="cart" id="cartForm" novalidate>
      <div class="add-row">
        <div class="in-wrap in-name">
          <input id="cartIn" name="item" placeholder="${M.t('addItem')}" autocomplete="off">
        </div>
        <div class="in-wrap in-price">
          <input id="cartPrice" name="price" type="text" inputmode="decimal" placeholder="${M.t('itemPrice')}" autocomplete="off">
        </div>
        <button class="btn add-submit" type="submit" aria-label="add">${M.ico('plus', 20, 2.5)}</button>
      </div>
    </form>

    ${cartList.length ? `<div class="list cart-list" style="margin-top:8px">${cartList.map(i => `<div class="row ${i.got ? 'got' : ''} ${i.id === M.freshId ? 'fresh' : ''}">
      <button type="button" class="cart-check ${i.got ? 'on' : ''}" data-act="cart-got" data-id="${i.id}" aria-label="check">${i.got ? M.ico('check', 14, 3) : ''}</button>
      <div class="r-main" data-act="cart-edit" data-id="${i.id}">
        <div class="r-t">${M.L(i.n)}</div>
        <div class="r-s priv"><span style="direction:ltr;unicode-bidi:isolate;display:inline-flex;align-items:baseline;gap:3px"><span class="num">${M.fmt(i.p)}</span> <span class="cur-u">${M.t('cur')}</span>${i.q > 1 ? ` <span class="muted">×</span> <span class="num">${i.q}</span> <span class="muted">=</span> <b class="cart-line-tot"><span class="num">${M.fmt(i.p * i.q)}</span> <span class="cur-u">${M.t('cur')}</span></b>` : ''}</span> <span class="edit-hint">${M.ico('pen', 11, 2)}</span></div>
      </div>
      <div class="qty">
        <button type="button" data-act="cart-q" data-id="${i.id}" data-d="-1" aria-label="decrease">−</button>
        <b class="num">${i.q}</b>
        <button type="button" data-act="cart-q" data-id="${i.id}" data-d="1" aria-label="increase">+</button>
        <button type="button" class="qty-del" data-act="cart-del" data-id="${i.id}" aria-label="delete">${M.ico('trash', 14, 2)}</button>
      </div></div>`).join('')}</div>`
      : `<div class="empty">${M.illu('cart')}<h4>${M.t('emptyCart')}</h4><p>${M.t('emptyCartSub')}</p></div>`}
  </div>`;
};

M.screens.family = () => {
  const s = M.s, seg = s.famSeg || 'feed', ar = s.lang === 'ar';
  const members = `<div class="members anim">
    ${M.MEMBERS.map(m => {
      const tot = (s.purchases || []).filter(p => p.member === m.id).reduce((a, p) => a + p.amount, 0);
      return `<div class="member" data-act="member" data-id="${m.id}">
        ${M.avatar(m.id, 'ring')}
        <span class="m-n">${M.L(m.n)}</span>
        <span class="m-a priv">${M.money(tot)}</span>
      </div>`;
    }).join('')}
    <div class="member" data-act="family-invite" style="border-style:dashed;border-color:color-mix(in srgb,var(--primary) 45%,var(--line))">
      <span class="av" style="width:42px;height:42px;background:var(--primary-soft);color:var(--primary)">${M.ico('plus', 19, 2.3)}</span>
      <span class="m-n" style="color:var(--primary)">${ar ? 'دعوة فرد' : 'Invite'}</span>
      <span class="m-a">${s.familyCode || (ar ? 'بالكود/الرابط' : 'Code/Link')}</span>
    </div>
  </div>`;
  return `${members}
  <div class="anim">${M.segc('famSeg', [['feed', M.t('segFeed')], ['cart', M.t('segCart')]], seg)}</div>
  <div class="seg-body anim" id="segBody">${M.familyBodyHtml()}</div>`;
};

M.refreshCartView = () => {
  const sb = document.getElementById('segBody');
  if (sb && M.s.tab === 'family') sb.innerHTML = M.familyBodyHtml();
  else M.render();
};

/* Manual family purchase modal */
M.acts['add-purch-open'] = () => {
  const ar = M.s.lang === 'ar';
  const defaultMid = M.s.currentMemberId || M.MEMBERS[0]?.id || 'abu';
  M.sheet.open(M.t('addPurchT'), `<form class="manual-form" data-form="add-purch">
    <label>${M.t('member')}
      <div class="member-pick">
        ${M.MEMBERS.map(m => `<button type="button" class="mp-btn ${m.id === defaultMid ? 'on' : ''}" data-act="pick-mem" data-v="${m.id}">${M.avatar(m.id, 'xs')} <span>${M.L(m.n)}</span></button>`).join('')}
      </div>
      <input type="hidden" name="member" value="${defaultMid}">
    </label>
    <label>${M.t('merchant')}<input name="m" required placeholder="${ar ? 'مثال: سوبرماركت الوفاء…' : 'e.g. Local market…'}" autocomplete="off"></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>${M.t('amount')} (${M.t('cur')})<input name="a" type="text" inputmode="decimal" required placeholder="1200"></label>
      <label>${M.t('category')}
        <select name="cat">
          ${Object.entries(M.CATS).map(([k, v]) => `<option value="${k}">${M.L(v.n)}</option>`).join('')}
        </select>
      </label>
    </div>
    <button class="btn" type="submit">${M.ico('check', 18, 2.5)} ${M.t('save')}</button>
  </form>`);
};

M.acts['pick-mem'] = el => {
  const wrap = el.parentElement;
  wrap.querySelectorAll('.mp-btn').forEach(b => b.classList.toggle('on', b === el));
  const inp = wrap.parentElement.querySelector('input[name="member"]');
  if (inp) inp.value = el.dataset.v;
};

M.saveManualPurchase = f => {
  const mid = f.member.value || M.s.currentMemberId || M.MEMBERS[0]?.id || 'abu';
  const mar = f.m.value.trim(), cat = f.cat.value || 'groceries';
  const rawA = typeof f.a.value === 'string' ? M.toWesternDigits(f.a.value) : f.a.value;
  const amount = parseFloat(rawA);
  if (!mar || !(amount > 0)) return;
  const id = Date.now();
  const newP = {
    id, member: mid, merchant: { ar: mar, en: mar }, cat, amount, day: M.s.day, time: '7:15 PM', scanned: false,
    items: [{ n: { ar: M.CATS[cat].n.ar, en: M.CATS[cat].n.en }, q: 1, p: amount }]
  };
  M.s.purchases.unshift(newP);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.addPurchase(newP).catch(() => {});
  }
  M.freshId = id; M.tickerNew = true;
  M.sheet.close();
  M.render();
  M.freshId = null;
  M.toast(`${M.ico('checkc', 16, 2)} −${M.fmt(amount)} ${M.t('cur')} · ${mar}`);
  M.checkThreshold();
};

M.acts['fam-filter'] = el => {
  const nextId = el.dataset.id;
  if (M.s.famFilter === nextId) return;
  M.s.famFilter = nextId;
  const chipsWrap = document.getElementById('famChips');
  if (chipsWrap) {
    chipsWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.id === nextId));
    el.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  const feed = document.getElementById('feed');
  if (feed) {
    feed.innerHTML = M.feedListHtml();
    M.replayAnim(feed, 'feed-swap', 380);
  } else {
    M.refreshCartView();
  }
};

M.acts['cart-got'] = el => {
  const i = (M.s.cart || []).find(x => x.id == el.dataset.id);
  if (!i) return;
  i.got = !i.got;
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateCartItem(i.id, { got: i.got }).catch(() => {});
  }
  M.refreshCartView();
};

M.acts['cart-q'] = el => {
  const i = (M.s.cart || []).find(x => x.id == el.dataset.id);
  if (!i) return;
  i.q += +el.dataset.d;
  if (i.q <= 0) {
    M.s.cart = M.s.cart.filter(x => x !== i);
    if (M.api) {
      M.api.saveLocal(M.s);
      M.api.deleteCartItem(i.id).catch(() => {});
    }
  } else {
    if (M.api) {
      M.api.saveLocal(M.s);
      M.api.updateCartItem(i.id, { q: i.q }).catch(() => {});
    }
  }
  M.refreshCartView();
};

M.acts['cart-del'] = el => {
  const i = (M.s.cart || []).find(x => x.id == el.dataset.id);
  if (!i) return;
  M.s.cart = M.s.cart.filter(x => x !== i);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.deleteCartItem(i.id).catch(() => {});
  }
  M.refreshCartView();
  M.toast(`${M.ico('trash', 15, 2)} ${M.t('itemRemoved')}`);
};

M.acts['cart-clear-got'] = () => {
  M.s.cart = (M.s.cart || []).filter(x => !x.got);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.clearGotCart().catch(() => {});
  }
  M.refreshCartView();
};

M.acts['cart-edit'] = el => {
  const it = (M.s.cart || []).find(x => x.id == el.dataset.id);
  if (!it) return;
  M.sheet.open(M.t('editItem'), `<form class="manual-form" data-form="cart-edit" data-id="${it.id}">
    <label>${M.t('itemName')}<input name="n" required value="${M.L(it.n)}" autocomplete="off"></label>
    <label>${M.t('unitPrice')} (${M.t('cur')})<input name="p" type="text" inputmode="decimal" required value="${it.p}"></label>
    <label>${M.t('itemQty')}<input name="q" type="text" inputmode="numeric" required value="${it.q}"></label>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn" type="submit" style="flex:1">${M.ico('check', 18, 2.5)} ${M.t('save')}</button>
      <button class="btn tonal" type="button" data-act="cart-del-sheet" data-id="${it.id}" style="width:52px;padding:0;color:var(--crit);background:color-mix(in srgb,var(--crit) 14%,transparent)">${M.ico('trash', 19, 2)}</button>
    </div>
  </form>`);
};

M.acts['cart-del-sheet'] = el => {
  const id = el.dataset.id;
  M.s.cart = (M.s.cart || []).filter(x => x.id != id);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.deleteCartItem(id).catch(() => {});
  }
  M.sheet.close();
  M.refreshCartView();
  M.toast(`${M.ico('trash', 15, 2)} ${M.t('itemRemoved')}`);
};

M.saveCartEdit = f => {
  const it = (M.s.cart || []).find(x => x.id == f.dataset.id);
  if (!it) return;
  const n = f.n.value.trim();
  const rawP = typeof f.p.value === 'string' ? M.toWesternDigits(f.p.value) : f.p.value;
  const rawQ = typeof f.q.value === 'string' ? M.toWesternDigits(f.q.value) : f.q.value;
  const p = parseFloat(rawP), q = Math.max(1, parseInt(rawQ, 10) || 1);
  if (!n || !(p > 0)) return;
  it.n = { ar: n, en: n };
  it.p = p;
  it.q = q;
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.updateCartItem(it.id, { n: it.n, p: it.p, q: it.q }).catch(() => {});
  }
  M.sheet.close();
  M.freshId = it.id;
  M.refreshCartView();
  M.freshId = null;
  M.toast(`${M.ico('checkc', 16, 2)} ${M.t('itemUpdated')} · ${M.fmt(p * q)} ${M.t('cur')}`);
};

M.addCartItem = (name, priceRaw) => {
  name = (name || '').trim();
  priceRaw = typeof priceRaw === 'string' ? M.toWesternDigits(priceRaw) : priceRaw;
  const p = parseFloat(priceRaw);
  const form = document.getElementById('cartForm');
  if (!name || !(p > 0)) {
    M.replayAnim(form, 'shake', 500);
    M.toast(`${M.ico('alert', 16, 2)} ${M.t('enterNamePrice')}`, 'warn');
    if (!name) document.getElementById('cartIn')?.focus();
    else document.getElementById('cartPrice')?.focus();
    return;
  }
  const id = Date.now();
  const newItem = { id, n: { ar: name, en: name }, q: 1, p, got: false };
  M.s.cart.unshift(newItem);
  if (M.api) {
    M.api.saveLocal(M.s);
    M.api.addCartItem(newItem).catch(() => {});
  }
  M.freshId = id;
  M.refreshCartView();
  M.freshId = null;
  M.toast(`${M.ico('checkc', 16, 2)} ${M.t('itemAdded')}: ${name} · ${M.fmt(p)} ${M.t('cur')}`);
  setTimeout(() => document.getElementById('cartIn')?.focus(), 40);
};
