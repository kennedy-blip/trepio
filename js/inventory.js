/* =====================================================================
   inventory.js — candy balance, the Candy Boutique & purchases
   ===================================================================== */
import { ctx, $ } from './ctx.js';
import { PETS } from './pets.js';

export const SHOP = [
  { id: 'candycane', icon: '🍭', name: 'Candy Cane Outfit', price: 15, desc: 'A stripey sweet outfit for any doll.' },
  { id: 'rainbow', icon: '🌈', name: 'Rainbow Gown', price: 20, desc: 'A swirling rainbow skirt (girls · also unlocks at Lv 2).' },
  { id: 'star', icon: '✨', name: 'Star Suit', price: 20, desc: 'A suit sprinkled with stars (boys · also unlocks at Lv 2).' },
  { id: 'wand', icon: '🪄', name: 'Star Wand', price: 25, desc: 'A twinkling wand held in the right hand.' },
  { id: 'wings', icon: '🦋', name: 'Butterfly Wings', price: 35, desc: 'Flapping rainbow wings (also unlocks at Lv 3).' },
  { id: 'trail', icon: '💫', name: 'Sparkle Trail', price: 35, desc: 'Leave sparkles wherever you run.' },
  ...PETS.map((p) => ({ id: 'pet_' + p.id, icon: p.icon, name: p.name, price: p.price, desc: p.desc + ' Follows you everywhere.', pet: p.id })),
  { id: 'halo', icon: '🌟', name: 'Golden Halo', price: 50, desc: 'A glowing halo (also unlocks at Lv 4).' },
];

export const candyBalance = () => Math.max(0, ctx.progress.candies - (ctx.state.spent || 0));

export function renderShop() {
  const balance = candyBalance();
  const balEl = $('shopBalance');
  if (balEl) balEl.textContent = `Your candies: 🍬 ${balance}`;
  const list = $('shopList');
  if (!list) return;
  list.innerHTML = '';
  for (const item of SHOP) {
    const owned = !!ctx.state.purchases[item.id];
    const row = document.createElement('div');
    row.className = 'shop-row' + (owned ? ' owned' : '');
    const btn = document.createElement('button');
    btn.className = 'sr-buy';
    if (owned) { btn.textContent = '✓ Owned'; btn.disabled = true; }
    else {
      btn.textContent = `Buy · 🍬 ${item.price}`;
      btn.disabled = balance < item.price;
      btn.addEventListener('click', () => buyItem(item));
    }
    row.innerHTML = `
      <div class="sr-icon">${item.icon}</div>
      <div class="sr-body">
        <div class="sr-name">${item.name}</div>
        <div class="sr-desc">${item.desc}</div>
      </div>`;
    row.appendChild(btn);
    list.appendChild(row);
  }
}

export function buyItem(item) {
  const balance = candyBalance();
  if (balance < item.price || ctx.state.purchases[item.id]) return;
  ctx.state.spent += item.price;
  ctx.state.purchases[item.id] = true;
  if (item.pet && !ctx.state.settings.pet) {
    ctx.pet.setPet(item.pet); /* auto-equip the first pet */
  } else {
    ctx.save();
  }
  ctx.ui.toast(item.pet
    ? `🐾 <b>${item.name}</b> joins your adventure!`
    : `🛍️ Purchased <b>${item.name}</b>! Equip it in the wardrobe.`, 3200);
  if (ctx.ui.effectsOn()) ctx.effects.spawnConfetti(16, ctx.player.group.position);
  ctx.ui.updateStats();
  renderShop();
  ctx.ui.renderCharInfo();
  ctx.ui.buildWardrobePanel();
}
