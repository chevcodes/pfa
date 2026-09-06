import * as React from 'react';
import { PfaHiddenChart } from './pfa-hidden-chart.jsx';
import { PfaTreemapChart } from './pfa-treemap-chart.jsx';
import { PfaInlineDisclosure } from './pfa-inline-disclosure.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

function TreemapInfo({ source, iconSlot = false }) {
  const statementBasis = source === 'all' ? 'Eligible purchases combine bank and card statements.' : `Eligible purchases come from ${source} statements.`;
  const exclusions = source === 'bank' ? 'Own-account and household transfers, and savings movements are excluded.' : 'Card repayments, own-account and household transfers, and savings movements are excluded.';
  return <PfaInfoPopover label="" ariaLabel="Spending map details" content={<>
    <p>Tile area shows relative spending. The ranked list gives every category's exact amount and share.</p>
    <p>The map shows the five largest categories; Other groups the rest.</p>
    <p>{statementBasis} {exclusions}</p>
    <p>Category-attributed refunds reduce totals; other refunds appear as returned money. Fees and tax are separate.</p>
    <p><span className="tm-help-wide">Select a tile or row to view its transactions.</span><span className="tm-help-mobile">Select a category to view its transactions.</span></p>
  </>} iconSlot={iconSlot} />;
}

function CategoryRows({ categories, onCategory, money, source, activeCategory, onActiveCategory }) {
  return <div id={`tm-category-list-${source}`} className="tm-category-list">{categories.map((category) => <button key={category.name} id={`activity-category-${source}-${encodeURIComponent(category.name)}`} type="button" className="tm-category-row" data-active={activeCategory === category.name ? 'true' : undefined} onPointerEnter={() => onActiveCategory?.(category.name)} onPointerLeave={() => onActiveCategory?.(null)} onFocus={() => onActiveCategory?.(category.name)} onBlur={() => onActiveCategory?.(null)} onClick={() => onCategory(category.name)} aria-label={`${category.name}, ${money(category.amount)}${category.amount < 0 ? ' net refund' : `, ${category.share.toFixed(1)}% of spending`}. View transactions`}>
    <span className="tm-category-name"><i aria-hidden="true" style={{ background: category.fill }} />{category.name}</span>
    <strong className="num">{money(category.amount)}</strong><span className="muted small tm-category-share">{category.amount < 0 ? 'Refund' : `${category.share < 1 ? category.share.toFixed(1) : category.share.toFixed(0)}%`}</span><span aria-hidden="true">›</span>
    <span className="tm-category-track share-bar-track" aria-hidden="true"><span className="share-bar-seg" style={{ width: `${Math.max(0, category.share)}%`, background: category.fill }} /></span>
  </button>)}</div>;
}

export function PfaTreemapCard({ categories, rankedCategories, source = 'all', onCategory, money, embedded, interactive, hidden, hiddenLabel }) {
  const [activeCategory, setActiveCategory] = React.useState(null);
  const [showAllCategories, setShowAllCategories] = React.useState(false);
  if (rankedCategories) return (
    <section className="tm-panel" aria-label="Spending by category">
      <div className="tm-comparison" data-has-map={categories.length ? 'true' : 'false'}>
        {categories.length ? <div className="tm-map">
          {hidden ? <PfaHiddenChart what="Category treemap" height="280px" /> : <div className="tm-wrap" data-proportional=""><PfaTreemapChart categories={categories} onCategory={onCategory} activeCategory={activeCategory} onActiveCategory={setActiveCategory} money={money} showTooltip={false} showValues={false} /></div>}
        </div> : null}
        <div className="tm-ranked" data-expanded={showAllCategories ? 'true' : 'false'}>
          <h4 className="sec-subhead-title">Categories by spending<TreemapInfo source={source} iconSlot /></h4>
          <CategoryRows categories={rankedCategories} onCategory={onCategory} money={money} source={source} activeCategory={activeCategory} onActiveCategory={setActiveCategory} />
          {rankedCategories.length > 5 ? <button className="btn sm ghost tm-expand-categories" type="button" aria-expanded={showAllCategories} aria-controls={`tm-category-list-${source}`} onClick={() => setShowAllCategories((expanded) => !expanded)}>{showAllCategories ? 'Show top categories' : `View all ${rankedCategories.length} categories`}</button> : null}
        </div>
      </div>
    </section>
  );
  return (
    <section className={embedded ? 'tm-panel' : 'card'} aria-label="Spending by category">
      {!embedded ? <div className="card-head"><h3 className="card-title">Where it went <TreemapInfo source={source} iconSlot /></h3></div> : null}
      {hidden ? (
        <div className="chart-hidden" role="img" aria-label={hiddenLabel} style={{ minHeight: 200 }}>
          <PfaHiddenChart />
        </div>
      ) : (
        <div className="tm-wrap" data-proportional="">
          <PfaTreemapChart categories={categories} onCategory={onCategory} money={money} />
        </div>
      )}
      {!hidden && interactive ? <PfaInlineDisclosure className="tm-desktop-browse" name="activity-category-list" label="Browse categories"><CategoryRows categories={categories} onCategory={onCategory} money={money} source="browse" /></PfaInlineDisclosure> : null}
      {!hidden && interactive ? <div className="tm-mobile-categories"><h4>Categories by spending</h4><CategoryRows categories={categories} onCategory={onCategory} money={money} source="mobile" /></div> : null}
      {hidden ? <p className="muted small tm-help">Hidden with figures.</p> : null}
    </section>
  );
}
