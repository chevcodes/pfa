import { Fragment, useState } from 'react';
import { ChevronRight, List, Tag } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.jsx';
import { PfaInfoPopover } from './pfa-info-popover.jsx';

export const TRANSACTION_PAGE_SIZE = 50;

export function PfaTransactionFilterBar({ filterBar }) {
  if (!filterBar) return null;
  return <div className="txfilter" role="region" aria-label="Filters applied to these transactions">
    <div className="txfilter-chips">
      {filterBar.chips.map((chip) => <button key={chip.label} type="button" className="txfilter-chip" aria-label={`Remove filter: ${chip.label}`} onClick={chip.clear}><span>{chip.label}</span><span className="txfilter-x" aria-hidden="true">×</span></button>)}
    </div>
    <button type="button" className="btn sm ghost txfilter-clear" onClick={filterBar.clear}>Clear all</button>
    {filterBar.caveat ? <p className="txfilter-caveat muted small">{filterBar.caveat}</p> : null}
  </div>;
}

export function PfaTransactionSortControls({ columns, onSort }) {
  const items = [
    ['date', 'Date'],
    ['description', 'Description'],
    ...(columns.showLedger ? [['ledger', 'Ledger']] : []),
    ['amount', columns.amountLabel],
  ];
  return <div className="tx-sort-mobile" role="group" aria-label="Sort transactions">
    {items.map(([key, label]) => {
      const active = columns.sort.key === key;
      const arrow = active ? (columns.sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
      return <button key={key} type="button" className="tx-sort-mobile-btn" aria-label={`Sort by ${label}`} aria-pressed={active} onClick={() => onSort(key)}>{label + arrow}</button>;
    })}
  </div>;
}

export function PfaTransactionPagerControls({ rows, page, expanded, onPageChange, onCollapse }) {
  const pageCount = Math.max(1, Math.ceil(rows.length / TRANSACTION_PAGE_SIZE));
  if (!expanded || !rows.length) return null;
  const shownStart = page * TRANSACTION_PAGE_SIZE;
  const shownCount = Math.min(TRANSACTION_PAGE_SIZE, rows.length - shownStart);
  return <div className="tx-pager" role="group" aria-label="Transaction pages">
    <button type="button" className="btn sm ghost" onClick={onCollapse}>Show fewer</button>
    {pageCount > 1 ? <button type="button" className="btn sm ghost" aria-label="Previous transaction page" disabled={page <= 0} onClick={() => onPageChange(Math.max(0, page - 1))}>Previous</button> : null}
    <span className="muted small" role="status">{`Showing ${shownStart + 1}–${shownStart + shownCount} of ${rows.length}`}</span>
    {pageCount > 1 ? <button type="button" className="btn sm ghost" aria-label="Next transaction page" disabled={page >= pageCount - 1} onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}>Next</button> : null}
  </div>;
}

export function PfaTransactionTable({
  rows,
  columns,
  filterBar,
  empty,
  summary,
  expanded,
  page = 0,
  onSort,
  onName,
  onCategory,
  onTag,
  onExpandChange,
  focusKey,
  onKeyDown,
}) {
  const [visibleCount, setVisibleCount] = useState(10);
  const [openRows, setOpenRows] = useState(() => new Set(focusKey ? [focusKey] : []));
  const focusIndex = focusKey ? rows.findIndex((item) => item.key === focusKey) : -1;
  const pageCount = Math.max(1, Math.ceil(rows.length / TRANSACTION_PAGE_SIZE));
  const currentPage = Math.max(0, Math.min(pageCount - 1, focusIndex >= 0 ? Math.floor(focusIndex / TRANSACTION_PAGE_SIZE) : page));
  const shownStart = expanded ? currentPage * TRANSACTION_PAGE_SIZE : 0;
  const shownCount = expanded ? Math.min(TRANSACTION_PAGE_SIZE, rows.length - shownStart) : Math.min(visibleCount, rows.length);
  const shownRows = rows.slice(shownStart, shownStart + shownCount);
  const remaining = Math.max(0, rows.length - shownCount - shownStart);
  const step = Math.min(3, remaining);

  const toggleRow = (key) => {
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sortable = (key, label, className = '') => {
    const active = columns.sort.key === key;
    const arrow = active ? (columns.sort.dir === 'asc' ? ' ↑' : ' ↓') : '';
    return (
      <TableHead key={key} className={[className, 'tx-sort', active ? 'is-active' : ''].filter(Boolean).join(' ')} aria-sort={active ? (columns.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className="tx-sort-btn" aria-label={`Sort by ${label}`} onClick={() => onSort(key)}>
          {label + arrow}
        </button>
      </TableHead>
    );
  };
  return (
    <section className="card" id="acct-tx" tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="card-head">
        <h3 className="card-title"><span aria-hidden="true"><List data-icon="inline-start" /></span>{columns.title}</h3>
      </div>
      <PfaTransactionFilterBar filterBar={filterBar} />
      {empty ? (
        <div className="tx-empty">
          <p className="tx-empty-lead">{empty.message || 'No transactions match these filters.'}</p>
          <button type="button" className="btn sm" onClick={empty.onClear}>{empty.actionLabel || 'Clear all filters'}</button>
        </div>
      ) : (
        <>
          <div className="table-wrap sticky">
            <Table className="grid tx">
              <TableHeader>
                <TableRow>
                  {sortable('date', 'Date')}
                  {sortable('description', 'Description')}
                  {columns.showLedger ? sortable('ledger', 'Ledger') : null}
                  {sortable('amount', columns.amountLabel, 'num')}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shownRows.map((item) => {
                  const opened = openRows.has(item.key);
                  return (
                    <Fragment key={item.key}>
                      <TableRow
                        className={'tx-row' + (opened ? ' open' : '') + (item.focused ? ' focus-row' : '')}
                        id={item.id}
                        onClick={(event) => {
                          if (event.target.closest('button')) return;
                          toggleRow(item.key);
                        }}
                      >
                        <TableCell className="nowrap"><button type="button" className="tx-date-toggle" aria-label={`${opened ? 'Hide' : 'Show'} details for ${item.name} on ${item.date}`} aria-expanded={opened} aria-controls={item.detailId} onClick={() => toggleRow(item.key)}>{item.date}<ChevronRight aria-hidden="true" /></button></TableCell>
                        <TableCell>
                          <span className="tx-name">{item.name}</span>
                          <div className="muted small" style={{ marginTop: 2 }}>
                            <button type="button" className={'cat-tag cat-tag-btn' + (item.category.review ? ' review' : '')} title={item.category.label} onClick={() => onCategory(item.model)}>
                              <span className="cat-dot" style={{ background: item.category.color }} />
                              <span className="cat-tag-name">{item.category.label}</span>
                            </button>
                            {item.rowLabel ? <span className="vm-tag tone-neutral">{item.rowLabel}</span> : null}
                            {item.split ? <span className="vm-tag tone-neutral" title="This transaction is distributed across categories" style={{ marginLeft: 6 }}>Split</span> : null}
                            {item.tagNames?.length ? (
                              <button className="vm-tag tone-neutral" title={item.tagNames.join(', ')} aria-label={`Edit custom labels for this transaction: ${item.tagNames.join(', ')}`} style={{ marginLeft: 6 }} onClick={() => onTag(item.model)}>
                                {item.tagNames[0] + (item.tagNames.length > 1 ? ` ×${item.tagNames.length}` : '')}
                              </button>
                            ) : (
                              <button className="row-tag-action is-icon" title="Add this transaction to a custom label" aria-label="Add this transaction to a custom label" onClick={() => onTag(item.model)}>
                                <Tag className="row-tag-ic" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                          {item.reason ? <div className="muted small">{item.reason}</div> : null}
                        </TableCell>
                        {columns.showLedger ? <TableCell>{item.ledger}</TableCell> : null}
                        <TableCell className={'num amt ' + item.amountClass}>{item.amount}</TableCell>
                      </TableRow>
                      <TableRow className="tx-detail" hidden={!opened} id={item.detailId}>
                        <TableCell colSpan={columns.count}>
                          <div className="detail-grid">
                            {item.details.map(([key, value]) => value ? (
                              <div key={key}>
                                <div className="kv-k muted small">{key}{key === 'Category' ? <PfaInfoPopover label="" ariaLabel="How this credit was classified" content="This label describes the credit. Money in figures still follow the statement evidence and your answers." /> : null}</div>
                                <div className="kv-v">{String(value)}</div>
                              </div>
                            ) : null)}
                          </div>
                          <div className="tx-detail-actions">
                            <button type="button" className="btn sm ghost" onClick={() => onName(item.model)}>{item.nameTitle}</button>
                            <button type="button" className="btn sm ghost" onClick={() => toggleRow(item.key)}>Close details</button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
                {!rows.length ? <TableRow><TableCell colSpan={columns.count} /></TableRow> : null}
                {!expanded && rows.length > 10 ? (
                  <TableRow>
                    <TableCell colSpan={columns.count}>
                      <div className="show-more show-more-multi">
                        {remaining > 0 ? <button className="btn sm ghost" onClick={() => setVisibleCount((count) => Math.min(rows.length, count + 3))}>See {step} more</button> : null}
                        {remaining > 3 ? <button className="btn sm" onClick={() => onExpandChange(true)}>Browse all {rows.length}</button> : null}
                        {shownCount > 10 ? <button className="btn sm ghost" onClick={() => onExpandChange(false)}>Hide {shownCount - 10}</button> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <p className="muted small">{summary}</p>
        </>
      )}
    </section>
  );
}
