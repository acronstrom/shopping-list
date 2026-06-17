/* Screens B — Recipes library, Recipe detail (cook), Recipe detail (shop) */
const { Ic, Phone, Nav, PhImg } = window;

function MetaDot() { return <span style={{ color: 'var(--ink-4)' }}>·</span>; }

function RCard({ name, meta, fav, label }) {
  return (
    <div className="row" style={{ padding: '12px 14px' }}>
      <PhImg w={52} h={52} r={13} label={label} style={{ flex: '0 0 auto' }} />
      <div className="row-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="serif" style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em' }}>{name}</span>
          {fav && <span style={{ color: 'var(--clay)' }}><Ic.heartFill size={14} /></span>}
        </div>
        <div className="row-sub" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>{meta}</div>
      </div>
      <span className="chev"><Ic.chevR size={17} /></span>
    </div>
  );
}

/* ============================================================
   RECIPES LIBRARY
   ============================================================ */
function ScreenRecipes() {
  return (
    <Phone tab="recipes">
      <Nav
        left="42 recept"
        title="Recept"
        right={<button className="iconbtn iconbtn--tint"><Ic.plus size={20} /></button>}
      />
      <div className="body" style={{ gap: 18, paddingBottom: 100 }}>
        <div className="addbar" style={{ padding: '11px 14px' }}>
          <Ic.search size={19} />
          <span className="ph" style={{ marginLeft: 2 }}>Sök recept eller ingrediens…</span>
        </div>

        {/* featured */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Veckans förslag</div>
          <div className="group" style={{ borderRadius: 'var(--radius-card)' }}>
            <div style={{ position: 'relative' }}>
              <PhImg w="100%" h={188} label="Receptbild" />
              <button className="iconbtn" style={{ position: 'absolute', top: 12, right: 12, background: 'oklch(1 0 0 / 0.9)', color: 'var(--clay)' }}>
                <Ic.heartFill size={18} />
              </button>
              <span className="chip chip--clay" style={{ position: 'absolute', left: 12, top: 12, background: 'oklch(1 0 0 / 0.92)' }}>Vegetariskt</span>
            </div>
            <div style={{ padding: '14px 16px 16px' }}>
              <div className="serif" style={{ fontSize: 23, fontWeight: 500, letterSpacing: '-0.015em', lineHeight: 1.1 }}>Krämig svamppasta</div>
              <div className="row-sub" style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 6 }}>
                <Ic.clock size={14} /> 35 min <MetaDot /> 4 portioner <MetaDot /> Medel
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="group-h">Vardag</div>
          <div className="group">
            <RCard name="Krämig svamppasta" fav label="Pasta" meta={<><span>6 ingredienser</span><MetaDot /><span>35 min</span></>} />
            <RCard name="Korv stroganoff" label="Gryta" meta={<><span>8 ingredienser</span><MetaDot /><span>25 min</span></>} />
            <RCard name="Tacos med quorn" label="Tacos" meta={<><span>11 ingredienser</span><MetaDot /><span>30 min</span></>} />
          </div>
        </div>

        <div className="section">
          <div className="group-h">Helg &amp; gäster</div>
          <div className="group">
            <RCard name="Högrev i rödvin" fav label="Gryta" meta={<><span>12 ingredienser</span><MetaDot /><span>3 tim</span></>} />
            <RCard name="Saffranspaella" label="Paella" meta={<><span>14 ingredienser</span><MetaDot /><span>50 min</span></>} />
          </div>
        </div>

        <div className="section">
          <div className="group-h">Bakat</div>
          <div className="group">
            <RCard name="Kardemummabullar" fav label="Bak" meta={<><span>9 ingredienser</span><MetaDot /><span>2 tim</span></>} />
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================
   RECIPE DETAIL — shared hero
   ============================================================ */
function RecipeHero({ mode }) {
  return (
    <>
      <div style={{ position: 'relative' }}>
        <PhImg w="100%" h={232} label="Receptbild" />
        <button className="iconbtn" style={{ position: 'absolute', top: 14, left: 14, background: 'oklch(1 0 0 / 0.9)', boxShadow: 'var(--shadow-card)' }}><Ic.chevL size={20} /></button>
        <button className="iconbtn" style={{ position: 'absolute', top: 14, right: 14, background: 'oklch(1 0 0 / 0.9)', color: 'var(--clay)', boxShadow: 'var(--shadow-card)' }}><Ic.heartFill size={19} /></button>
      </div>
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <span className="chip chip--clay" style={{ fontSize: 12, padding: '5px 11px' }}>Vegetariskt</span>
          <span className="chip" style={{ fontSize: 12, padding: '5px 11px' }}>Vardag</span>
        </div>
        <div className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.04 }}>Krämig svamppasta</div>

        <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
          <Stat label="Förberedelse" value="10 min" />
          <Stat label="Tillagning" value="25 min" />
          <Stat label="Betyg" value="★★★★☆" clay />
        </div>

        {/* portions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--hair)' }}>
          <div>
            <div className="eyebrow">Portioner</div>
            <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 2 }}>Skrivet för 4</div>
          </div>
          <div className="seg" style={{ borderRadius: 12, padding: 4 }}>
            <button style={{ padding: '6px 12px' }}><Ic.minus size={16} /></button>
            <span className="serif" style={{ fontSize: 18, fontWeight: 500, minWidth: 34, textAlign: 'center', display: 'grid', placeItems: 'center' }}>4</span>
            <button style={{ padding: '6px 12px' }}><Ic.plus size={16} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
          <button className="btn btn--ghost btn--sm" style={{ flex: 1 }}><Ic.calendar size={17} />Veckoplan</button>
          <div className="seg" style={{ flex: '0 0 auto' }}>
            <button className={mode === 'shop' ? 'on' : ''}><Ic.cart size={15} />Inköp</button>
            <button className={mode === 'cook' ? 'on' : ''}><Ic.flame size={15} />Laga</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, clay }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 3 }}>{label}</div>
      <div className="serif" style={{ fontSize: 18, fontWeight: 500, color: clay ? 'var(--clay)' : 'var(--ink)' }}>{value}</div>
    </div>
  );
}

/* ---------- cook mode ---------- */
function CookRow({ name, qty, done }) {
  return (
    <div className={'row' + (done ? ' row--done' : '')} style={{ padding: '14px 16px' }}>
      <span className={'tick' + (done ? ' tick--on' : '')} style={{ width: 22, height: 22 }}>{done && <Ic.check size={13} />}</span>
      <div className="row-main"><div className="row-title" style={{ fontSize: 17 }}>{name}</div></div>
      {qty && <span className="row-trail" style={{ fontSize: 16, fontWeight: 500, color: done ? 'var(--ink-4)' : 'var(--ink-2)' }}>{qty}</span>}
    </div>
  );
}

function Step({ n, text, done }) {
  return (
    <div style={{ display: 'flex', gap: 13, background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, padding: '15px 16px', boxShadow: 'var(--shadow-card)' }}>
      <span style={{ flex: '0 0 auto', width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, background: done ? 'var(--clay)' : 'var(--clay-tint)', color: done ? '#fff' : 'var(--clay-deep)' }} className="serif">
        {done ? <Ic.check size={15} /> : n}
      </span>
      <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5, color: done ? 'var(--ink-4)' : 'var(--ink)', paddingTop: 4 }}>{text}</p>
    </div>
  );
}

function ScreenRecipeCook() {
  return (
    <Phone noStatus auto>
      <StatusBar />
      <RecipeHero mode="cook" />
      <div className="body" style={{ gap: 20, paddingTop: 22 }}>
        <div className="section">
          <div className="group-h">Ingredienser</div>
          <div className="group">
            <CookRow name="Tagliatelle" qty="320 g" done />
            <CookRow name="Karljohansvamp" qty="400 g" done />
            <CookRow name="Schalottenlök" qty="2 st" />
            <CookRow name="Vitlöksklyftor" qty="2 st" />
            <CookRow name="Vispgrädde" qty="2 dl" />
            <CookRow name="Riven parmesan" qty="40 g" />
            <CookRow name="Smör &amp; olivolja" qty="" />
          </div>
        </div>

        <div className="section">
          <div className="group-h">Gör så här</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Step n={1} done text="Koka pastan al dente i rikligt med saltat vatten. Spara en skvätt pastavatten." />
            <Step n={2} text="Hetta upp smör och olja i en stor panna. Stek svampen gyllene och salta." />
            <Step n={3} text="Tillsätt finhackad lök och vitlök, fräs mjukt utan att ta färg." />
            <Step n={4} text="Häll i grädden, låt sjuda ett par minuter och rör ner parmesanen." />
            <Step n={5} text="Vänd ner pastan, smaka av med salt och peppar. Toppa med persilja." />
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ---------- shop mode ---------- */
function ShopRow({ name, qty, off }) {
  return (
    <label className="row" style={{ padding: '13px 16px' }}>
      <span style={{ width: 22, height: 22, borderRadius: 7, border: '1.8px solid ' + (off ? 'var(--hair)' : 'var(--clay)'), background: off ? 'var(--surface)' : 'var(--clay)', display: 'grid', placeItems: 'center', color: '#fff', flex: '0 0 auto' }}>
        {!off && <Ic.check size={13} />}
      </span>
      <div className="row-main"><div className="row-title" style={{ fontSize: 16, color: off ? 'var(--ink-4)' : 'var(--ink)', textDecoration: off ? 'line-through' : 'none' }}>{name}</div></div>
      {qty && <span className="row-trail" style={{ color: off ? 'var(--ink-4)' : 'var(--ink-3)' }}>{qty}</span>}
    </label>
  );
}

function ScreenRecipeShop() {
  return (
    <Phone noStatus auto>
      <StatusBar />
      <RecipeHero mode="shop" />
      <div className="body" style={{ gap: 14, paddingTop: 22 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px 4px' }}>
            <span className="eyebrow">Ingredienser</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--clay-deep)' }}>Avmarkera alla</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', padding: '0 6px 10px', margin: 0 }}>Bocka av sånt du redan har — bara markerade läggs till.</p>
          <div className="group">
            <ShopRow name="Tagliatelle" qty="320 g" />
            <ShopRow name="Karljohansvamp" qty="400 g" />
            <ShopRow name="Schalottenlök" qty="2 st" />
            <ShopRow name="Vitlök" qty="2 klyftor" off />
            <ShopRow name="Vispgrädde" qty="2 dl" />
            <ShopRow name="Parmesan" qty="40 g" />
            <ShopRow name="Persilja" qty="1 kruka" />
          </div>
        </div>
        <button className="btn btn--clay btn--block" style={{ marginTop: 4 }}><Ic.plus size={19} />Lägg till markerade (6)</button>
      </div>
    </Phone>
  );
}

Object.assign(window, { ScreenRecipes, ScreenRecipeCook, ScreenRecipeShop });
