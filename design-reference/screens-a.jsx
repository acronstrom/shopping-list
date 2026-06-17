/* Screens A — Onboarding, Shopping list (edit), Shopping list (in-store) */
const { Ic, Phone, Nav, Dot, PhImg } = window;

/* ---------- Reusable grocery row ---------- */
function GRow({ name, qty, note, done, lg }) {
  return (
    <div className={'row' + (done ? ' row--done' : '')}>
      <span className={'tick' + (lg ? ' tick--lg' : '') + (done ? ' tick--on' : '')}>
        {done && <Ic.check size={lg ? 18 : 15} />}
      </span>
      <div className="row-main">
        <div className="row-title" style={lg ? { fontSize: 18 } : null}>{name}</div>
        {note && <div className="row-sub" style={{ color: 'var(--clay-deep)' }}>{note}</div>}
      </div>
      {qty && <span className="row-trail" style={lg ? { fontSize: 16 } : null}>{qty}</span>}
    </div>
  );
}

/* ============================================================
   ONBOARDING / SIGN-IN
   ============================================================ */
function ScreenSignIn() {
  return (
    <Phone>
      <div style={{ padding: '0 0 0', display: 'flex', flexDirection: 'column', minHeight: 790 }}>
        <div style={{ position: 'relative', margin: '2px 16px 0', borderRadius: 24, overflow: 'hidden' }}>
          <PhImg w="100%" h={326} label="Köksbild" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, oklch(0.25 0.012 60 / 0.34) 0%, transparent 30%, transparent 52%, oklch(0.25 0.012 60 / 0.5))' }}></div>
          <div style={{ position: 'absolute', left: 22, top: 20, display: 'flex', alignItems: 'center', gap: 9, color: '#fff' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--clay)', display: 'grid', placeItems: 'center', color: '#fff' }}>
              <Ic.leaf size={18} />
            </span>
            <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>Skafferi</span>
          </div>
          <div style={{ position: 'absolute', left: 22, right: 22, bottom: 20, color: '#fff' }}>
            <div className="serif" style={{ fontSize: 34, lineHeight: 1.02, fontWeight: 500, letterSpacing: '-0.02em' }}>Vad blir det<br />för mat?</div>
          </div>
        </div>

        <div style={{ padding: '22px 24px 0' }}>
          <p style={{ fontSize: 15, color: 'var(--ink-3)', margin: '0 0 20px', lineHeight: 1.45 }}>
            En delad inköpslista och receptbok för hela hushållet.
          </p>

          <div className="seg" style={{ display: 'flex', width: '100%', marginBottom: 18 }}>
            <button className="on" style={{ flex: 1, justifyContent: 'center' }}>Logga in</button>
            <button style={{ flex: 1, justifyContent: 'center' }}>Skapa konto</button>
          </div>

          <label className="eyebrow" style={{ display: 'block', marginBottom: 7 }}>E-post</label>
          <div className="addbar" style={{ borderRadius: 14, padding: '13px 16px', marginBottom: 14 }}>
            <span className="ph">du@exempel.se</span>
          </div>
          <label className="eyebrow" style={{ display: 'block', marginBottom: 7 }}>Lösenord</label>
          <div className="addbar" style={{ borderRadius: 14, padding: '13px 16px', marginBottom: 20 }}>
            <span className="ph">••••••••</span>
          </div>

          <button className="btn btn--clay btn--block" style={{ padding: '15px' }}>Logga in</button>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-4)', marginTop: 16 }}>
            Glömt lösenord?
          </p>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================
   SHOPPING LIST — REDIGERA (edit / plan)
   ============================================================ */
function ScreenListEdit() {
  return (
    <Phone tab="list">
      <Nav
        left="Familjen Lindqvist"
        title="Inköpslista"
        right={
          <button className="iconbtn iconbtn--tint"><Ic.sliders size={19} /></button>
        }
      />
      <div className="body" style={{ gap: 16, paddingBottom: 100 }}>
        {/* progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 14, color: 'var(--ink-2)' }}><b style={{ color: 'var(--ink)', fontWeight: 600 }}>14 varor</b> · 5 i kundvagnen</span>
            <span style={{ fontSize: 13, color: 'var(--clay-deep)', fontWeight: 500 }}>Rensa markerade</span>
          </div>
          <div className="prog"><i style={{ width: '36%' }}></i></div>
        </div>

        {/* mode + sort */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div className="seg">
            <button className="on">Redigera</button>
            <button><Ic.cart size={15} />Handla</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
          <span className="chip chip--on">Kategori</span>
          <span className="chip">ICA Maxi</span>
          <span className="chip">Coop Forum</span>
        </div>

        {/* suggestions */}
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
            <Ic.spark size={14} /> Förslag för dig
          </div>
          <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
            <span className="chip chip--clay"><Ic.plus size={13} />Kaffe</span>
            <span className="chip chip--clay"><Ic.plus size={13} />Hushållspapper</span>
            <span className="chip chip--clay"><Ic.plus size={13} />Gul lök</span>
          </div>
        </div>

        {/* add bar */}
        <div className="addbar">
          <span className="cam"><Ic.camera size={20} /></span>
          <span className="ph">Lägg till en vara…</span>
          <span className="fab"><Ic.plus size={20} /></span>
        </div>

        {/* groups */}
        <div className="section">
          <div className="group-h"><Dot color="--c-produce" />Frukt &amp; Grönt</div>
          <div className="group">
            <GRow name="Bananer" qty="1 klase" />
            <GRow name="Avokado" qty="2 st" note="Gärna mogna" />
            <GRow name="Babyspenat" qty="påse" />
            <GRow name="Citron" />
          </div>
        </div>

        <div className="section">
          <div className="group-h"><Dot color="--c-dairy" />Mejeri &amp; Ägg</div>
          <div className="group">
            <GRow name="Mjölk" qty="2 l" />
            <GRow name="Ägg" qty="12-pack" />
            <GRow name="Crème fraiche" />
          </div>
        </div>

        <div className="section">
          <div className="group-h"><Dot color="--c-meat" />Kött &amp; Chark</div>
          <div className="group">
            <GRow name="Kycklingfilé" qty="≈700 g" />
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================
   SHOPPING LIST — HANDLA (in-store, big targets)
   ============================================================ */
function ScreenListShop() {
  return (
    <Phone tab="list">
      <Nav
        left="ICA Maxi · Handlar nu"
        title="Handla"
        right={<div className="seg"><button>Redigera</button><button className="on"><Ic.cart size={15} />Handla</button></div>}
      />
      <div className="body" style={{ gap: 18, paddingBottom: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* progress ring */}
          <div style={{ position: 'relative', width: 56, height: 56, flex: '0 0 auto' }}>
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="var(--hair)" strokeWidth="5" />
              <circle cx="28" cy="28" r="24" fill="none" stroke="var(--clay)" strokeWidth="5" strokeLinecap="round"
                strokeDasharray="150.8" strokeDashoffset="56" transform="rotate(-90 28 28)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 600 }} className="serif">9</div>
          </div>
          <div>
            <div className="serif" style={{ fontSize: 21, fontWeight: 500, letterSpacing: '-0.01em' }}>9 kvar att handla</div>
            <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 1 }}>5 i kundvagnen · sorterat efter gång</div>
          </div>
        </div>

        <div className="section">
          <div className="group-h">Gång 1 · Frukt &amp; Grönt</div>
          <div className="group">
            <GRow name="Bananer" qty="1 klase" lg />
            <GRow name="Avokado" qty="2 st" lg />
            <GRow name="Babyspenat" qty="påse" lg />
          </div>
        </div>

        <div className="section">
          <div className="group-h">Gång 4 · Mejeri</div>
          <div className="group">
            <GRow name="Mjölk" qty="2 l" lg />
            <GRow name="Ägg" qty="12-pack" lg />
          </div>
        </div>

        {/* collapsed checked */}
        <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: '1px solid var(--hair)', borderRadius: 14, padding: '14px 16px', color: 'var(--ink-2)', font: 'inherit' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15 }}>
            <span className="tick tick--on" style={{ width: 22, height: 22 }}><Ic.check size={13} /></span>
            5 i kundvagnen
          </span>
          <Ic.chevD size={18} />
        </button>
      </div>
    </Phone>
  );
}

Object.assign(window, { ScreenSignIn, ScreenListEdit, ScreenListShop, GRow });
