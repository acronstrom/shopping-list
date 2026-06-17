/* Screens C — Weekly meal plan, History, Stores & offers, Style tile */
const { Ic, Phone, Nav, Dot, PhImg } = window;

/* ============================================================
   VECKOPLAN (weekly meal plan)
   ============================================================ */
function DateBubble({ wd, d, mo, today }) {
  return (
    <div style={{ flex: '0 0 auto', width: 52, borderRadius: 14, padding: '8px 0', textAlign: 'center', background: today ? 'var(--clay)' : 'var(--surface-2)', color: today ? '#fff' : 'var(--ink-2)', border: today ? 'none' : '1px solid var(--hair)' }}>
      <div style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>{wd}</div>
      <div className="serif" style={{ fontSize: 21, fontWeight: 500, lineHeight: 1, margin: '2px 0' }}>{d}</div>
      <div style={{ fontSize: 10, opacity: 0.75 }}>{mo}</div>
    </div>
  );
}

function PlanFilled({ wd, d, mo, today, name, port, cat, label }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface)', border: '1px solid ' + (today ? 'var(--clay-line)' : 'var(--hair)'), borderRadius: 18, padding: 10, boxShadow: 'var(--shadow-card)' }}>
      <DateBubble wd={wd} d={d} mo={mo} today={today} />
      <PhImg w={44} h={44} r={12} label={label} style={{ flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="serif" style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em' }}>{name}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 1 }}>{port} portioner · {cat}</div>
      </div>
      <span className="chev"><Ic.chevR size={16} /></span>
    </div>
  );
}

function PlanEmpty({ wd, d, mo, today }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', border: '1.5px dashed var(--hair)', borderRadius: 18, padding: 10, background: today ? 'var(--clay-tint)' : 'transparent' }}>
      <DateBubble wd={wd} d={d} mo={mo} today={today} />
      <span style={{ flex: 1, fontSize: 14, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 7 }}>
        <Ic.plus size={17} /> Lägg till recept
      </span>
    </div>
  );
}

function ScreenPlan() {
  return (
    <Phone tab="plan">
      <Nav title="Veckoplan" />
      <div className="body" style={{ gap: 12, paddingBottom: 150 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, padding: '10px 8px', boxShadow: 'var(--shadow-card)' }}>
          <button className="iconbtn" style={{ flex: '0 0 auto' }}><Ic.chevL size={18} /></button>
          <div style={{ textAlign: 'center', flex: '1 1 auto' }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 500, whiteSpace: 'nowrap' }}>v. 23 · 1–7 jun</div>
            <div style={{ fontSize: 12, color: 'var(--clay-deep)', fontWeight: 500 }}>Denna vecka</div>
          </div>
          <button className="iconbtn" style={{ flex: '0 0 auto' }}><Ic.chevR size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
          <PlanFilled wd="Mån" d="2" mo="jun" today name="Krämig svamppasta" port="4" cat="Vardag" label="Pasta" />
          <PlanEmpty wd="Tis" d="3" mo="jun" />
          <PlanFilled wd="Ons" d="4" mo="jun" name="Tacos med quorn" port="4" cat="Vardag" label="Tacos" />
          <PlanFilled wd="Tor" d="5" mo="jun" name="Korv stroganoff" port="3" cat="Vardag" label="Gryta" />
          <PlanEmpty wd="Fre" d="6" mo="jun" />
          <PlanFilled wd="Lör" d="7" mo="jun" name="Högrev i rödvin" port="6" cat="Helg" label="Gryta" />
        </div>
      </div>

      {/* sticky generate */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 86, padding: '12px 18px 14px', background: 'linear-gradient(to top, var(--paper) 60%, transparent)' }}>
        <button className="btn btn--clay btn--block"><Ic.cart size={19} />Generera inköpslista (4)</button>
      </div>
      <window.TabBar active="plan" />
    </Phone>
  );
}

/* ============================================================
   INKÖPSHISTORIK
   ============================================================ */
function HRow({ name, date, color }) {
  return (
    <div className="row" style={{ padding: '13px 16px' }}>
      <Dot color={color} />
      <div className="row-main">
        <div className="row-title" style={{ fontSize: 15.5 }}>{name}</div>
      </div>
      <span className="row-trail" style={{ fontSize: 13 }}>{date}</span>
    </div>
  );
}

function ScreenHistory() {
  return (
    <Phone tab="more">
      <Nav left="Mer" title="Inköpshistorik" />
      <div className="body" style={{ gap: 18, paddingBottom: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>248 inköp sparade</span>
          <span style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 500 }}>Rensa historik</span>
        </div>

        <div className="section">
          <div className="group-h">Den här veckan</div>
          <div className="group">
            <HRow name="Bananer" date="lör 1 jun" color="--c-produce" />
            <HRow name="Mjölk" date="lör 1 jun" color="--c-dairy" />
            <HRow name="Kycklingfilé" date="ons 29 maj" color="--c-meat" />
            <HRow name="Surdegslimpa" date="ons 29 maj" color="--c-bread" />
          </div>
        </div>

        <div className="section">
          <div className="group-h">Förra veckan</div>
          <div className="group">
            <HRow name="Laxfilé" date="sön 26 maj" color="--c-fish" />
            <HRow name="Kaffe" date="sön 26 maj" color="--c-pantry" />
            <HRow name="Avokado" date="fre 24 maj" color="--c-produce" />
            <HRow name="Crème fraiche" date="fre 24 maj" color="--c-dairy" />
            <HRow name="Hushållspapper" date="tor 23 maj" color="--c-other" />
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================
   BUTIKER (stores & offers)
   ============================================================ */
function ScreenStores() {
  return (
    <Phone tab="stores">
      <Nav
        title="Butiker"
        right={<button className="iconbtn iconbtn--tint"><Ic.plus size={20} /></button>}
      />
      <div className="body" style={{ gap: 12, paddingBottom: 100 }}>
        {/* collapsed store */}
        <div className="group" style={{ borderRadius: 18 }}>
          <div className="row" style={{ padding: '14px 16px' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--hair)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', flex: '0 0 auto' }}><Ic.store size={21} /></span>
            <div className="row-main">
              <div className="row-title" style={{ fontWeight: 500 }}>Coop Forum</div>
              <div className="row-sub">Tryck för att redigera</div>
            </div>
            <span className="chip chip--clay" style={{ fontSize: 12 }}><Ic.tag size={13} />Erbjudanden</span>
          </div>
        </div>

        {/* expanded store */}
        <div className="group" style={{ borderRadius: 18 }}>
          <div className="row" style={{ padding: '14px 16px' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--clay-tint)', display: 'grid', placeItems: 'center', color: 'var(--clay-deep)', flex: '0 0 auto' }}><Ic.store size={21} /></span>
            <div className="row-main">
              <div className="row-title" style={{ fontWeight: 500 }}>ICA Maxi</div>
              <div className="row-sub">Tryck för att dölja</div>
            </div>
            <span className="chev"><Ic.chevD size={18} /></span>
          </div>

          <div style={{ borderTop: '1px solid var(--hair)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 9 }}>Aktuella erbjudanden</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[['Kycklingfilé', 'Kronfågel', '69:90/kg'], ['Avokado', 'Klass 1', '4 för 39:-'], ['Kaffe', 'Gevalia 450g', '49:90']].map((o, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i ? '1px solid var(--hair-2)' : 'none' }}>
                    <span style={{ color: 'var(--clay)', flex: '0 0 auto' }}><Ic.tag size={17} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5 }}>{o[0]}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{o[1]}</div>
                    </div>
                    <span className="serif tnum" style={{ fontSize: 16, fontWeight: 500, color: 'var(--clay-deep)', whiteSpace: 'nowrap', flex: '0 0 auto' }}>{o[2]}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8 }}>Uppdaterad idag 08:12</div>
            </div>

            <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="eyebrow">Kategoriordning</span>
                <span className="chev"><Ic.chevD size={17} /></span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '6px 0 0', lineHeight: 1.4 }}>Sortera din lista efter gångarna i just den här butiken.</p>
            </div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

/* ============================================================
   STYLE TILE
   ============================================================ */
function Sw({ name, varname, dark }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 14, background: `var(${varname})`, border: '1px solid var(--hair)' }}></div>
      <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 6, fontWeight: 500 }}>{name}</div>
    </div>
  );
}

function StyleTile() {
  const icons = ['cart', 'calendar', 'book', 'store', 'search', 'clock', 'camera', 'heart', 'tag', 'leaf', 'flame', 'spark'];
  return (
    <div style={{ width: 760, background: 'var(--paper)', fontFamily: 'var(--sans)', color: 'var(--ink)', padding: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--clay)', display: 'grid', placeItems: 'center', color: '#fff' }}><Ic.leaf size={26} /></span>
          <div>
            <div className="serif" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}>Skafferi</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Inköpslista · designriktning</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'right', lineHeight: 1.5 }}>Premium-editorial × lugn Apple-känsla<br />Varmt papper · lera · bläck</div>
      </div>

      <div className="divider"></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        {/* type */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Typografi</div>
          <div className="serif" style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}>Vad blir det för mat?</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', margin: '6px 0 18px' }}>Newsreader · display &amp; rubriker</div>
          <div style={{ fontSize: 17, lineHeight: 1.5 }}>Krämig svamppasta med karljohan, schalottenlök och riven parmesan.</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>SF Pro / system-ui · gränssnitt &amp; brödtext</div>
        </div>

        {/* color */}
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Färg</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Sw name="Papper" varname="--paper" />
            <Sw name="Bläck" varname="--ink" />
            <Sw name="Lera" varname="--clay" />
            <Sw name="Salvia" varname="--sage" />
            <Sw name="Linje" varname="--hair" />
          </div>
          <div className="eyebrow" style={{ margin: '18px 0 10px' }}>Kategoriprickar</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {['--c-produce', '--c-dairy', '--c-meat', '--c-fish', '--c-bread', '--c-pantry', '--c-snacks', '--c-drink'].map((c) => (
              <span key={c} style={{ width: 18, height: 18, borderRadius: '50%', background: `var(${c})` }}></span>
            ))}
          </div>
        </div>
      </div>

      <div className="divider"></div>

      {/* icons + components */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Ikoner — linje, inte emoji</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, color: 'var(--ink)' }}>
            {icons.map((n) => { const I = Ic[n]; return <span key={n} style={{ display: 'grid', placeItems: 'center' }}><I size={24} /></span>; })}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Komponenter</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn--clay btn--sm">Lägg till</button>
            <button className="btn btn--primary btn--sm">Generera</button>
            <button className="btn btn--ghost btn--sm">Veckoplan</button>
            <span className="chip chip--on">Kategori</span>
            <span className="chip">ICA Maxi</span>
            <span className="chip chip--clay"><Ic.plus size={13} />Kaffe</span>
          </div>
          <div className="seg" style={{ marginTop: 14 }}>
            <button className="on">Redigera</button>
            <button><Ic.cart size={15} />Handla</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenPlan, ScreenHistory, ScreenStores, StyleTile });
