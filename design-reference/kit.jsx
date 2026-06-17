/* Shared kit — phone shell, status bar, tab bar, primitives. */
const { Ic } = window;

function StatusBar() {
  return (
    <div className="statusbar">
      <span className="sb-time">9:41</span>
      <span className="sb-right">
        <span className="sb-bars"><i></i><i></i><i></i><i></i></span>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M1 5.5C3 3.2 5.6 2 8.5 2S14 3.2 16 5.5M3.4 8c1.4-1.5 3.1-2.3 5.1-2.3S12.2 6.5 13.6 8M6 10.3c.7-.7 1.6-1 2.5-1s1.8.3 2.5 1" strokeLinecap="round"/>
        </svg>
        <span className="sb-batt"><i></i></span>
      </span>
    </div>
  );
}

const TABS = [
  { id: 'list', label: 'Lista', icon: 'cart' },
  { id: 'plan', label: 'Veckoplan', icon: 'calendar' },
  { id: 'recipes', label: 'Recept', icon: 'book' },
  { id: 'stores', label: 'Butiker', icon: 'store' },
  { id: 'more', label: 'Mer', icon: 'more' },
];

function TabBar({ active }) {
  return (
    <div className="tabbar">
      {TABS.map((t) => {
        const I = Ic[t.icon];
        return (
          <div key={t.id} className={'tab' + (active === t.id ? ' on' : '')}>
            <I size={25} sw={active === t.id ? 1.9 : 1.7} />
            <span>{t.label}</span>
          </div>
        );
      })}
      <span className="home-ind"></span>
    </div>
  );
}

/* Phone shell. tab=active tab id; if no tab, omit bar. auto=grow to content */
function Phone({ children, tab, noStatus, auto, style }) {
  return (
    <div className={'phone' + (auto ? ' phone--auto' : '')} style={style}>
      {!noStatus && <StatusBar />}
      <div className="scroll">{children}</div>
      {tab && <TabBar active={tab} />}
    </div>
  );
}

/* Large-title nav header */
function Nav({ eyebrow, title, sub, left, right }) {
  return (
    <div className="nav">
      {(eyebrow || left || right) && (
        <div className="nav-top">
          <span className="nav-eyebrow">{left || eyebrow || ''}</span>
          {right}
        </div>
      )}
      {title && <div className="nav-title">{title}</div>}
      {sub && <div className="nav-sub">{sub}</div>}
    </div>
  );
}

function Dot({ color }) {
  return <span className="dot" style={{ background: `var(${color})` }}></span>;
}

function PhImg({ w, h, label, r = 0, style }) {
  return (
    <div className="ph-img" style={{ width: w, height: h, borderRadius: r, ...style }}>
      <span>{label}</span>
    </div>
  );
}

Object.assign(window, { StatusBar, TabBar, Phone, Nav, Dot, PhImg, TABS });
