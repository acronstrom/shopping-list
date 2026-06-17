/* App — lay the screens out on the design canvas */
const {
  DesignCanvas, DCSection, DCArtboard,
  StyleTile, ScreenSignIn, ScreenListEdit, ScreenListShop,
  ScreenRecipes, ScreenRecipeCook, ScreenRecipeShop,
  ScreenPlan, ScreenHistory, ScreenStores,
} = window;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="ds" title="Designriktning" subtitle="Skafferi — en lugn, editorial omtolkning. Varmt papper, lerfärgad accent, Newsreader + SF, linjeikoner istället för emoji.">
        <DCArtboard id="tile" label="Stilkort · system" width={760} height={624}><StyleTile /></DCArtboard>
      </DCSection>

      <DCSection id="start" title="Komma igång" subtitle="Inloggning & välkomst">
        <DCArtboard id="signin" label="Inloggning" width={390} height={844}><ScreenSignIn /></DCArtboard>
      </DCSection>

      <DCSection id="list" title="Inköpslistan" subtitle="Hjärtat i appen — redigera hemma, handla i butik">
        <DCArtboard id="edit" label="Lista · Redigera" width={390} height={1170}><ScreenListEdit /></DCArtboard>
        <DCArtboard id="shop" label="Lista · Handla i butik" width={390} height={904}><ScreenListShop /></DCArtboard>
      </DCSection>

      <DCSection id="recipes" title="Recept" subtitle="Receptbok med tidnings­känsla, samt laga- och inköpsläge">
        <DCArtboard id="lib" label="Receptbok" width={390} height={1190}><ScreenRecipes /></DCArtboard>
        <DCArtboard id="cook" label="Recept · Laga" width={390} height={1452}><ScreenRecipeCook /></DCArtboard>
        <DCArtboard id="rshop" label="Recept · Inköp" width={390} height={1052}><ScreenRecipeShop /></DCArtboard>
      </DCSection>

      <DCSection id="plan" title="Veckoplanering" subtitle="Planera veckan och generera listan med ett tryck">
        <DCArtboard id="week" label="Veckoplan" width={390} height={884}><ScreenPlan /></DCArtboard>
      </DCSection>

      <DCSection id="more" title="Mer" subtitle="Historik samt butiker & erbjudanden">
        <DCArtboard id="hist" label="Inköpshistorik" width={390} height={884}><ScreenHistory /></DCArtboard>
        <DCArtboard id="stores" label="Butiker & erbjudanden" width={390} height={884}><ScreenStores /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
