import { markScrollAffordance } from '../../application/core/shared-helpers.js';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs.jsx';

export function PfaActivityTabs({ value, onValueChange }) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="activity-tabs">
      <TabsList aria-label="Activity views" className="ledger-tabs" ref={markScrollAffordance}>
        <TabsTrigger id="activity-tab-analysis" aria-controls="activity-panel" aria-label="Analysis" aria-describedby="activity-tab-analysis-detail" value="analysis" className={'ledger-tab' + (value === 'analysis' ? ' active' : '')}>
          <span className="activity-tab-title">Analysis</span>
          <span className="activity-tab-detail" id="activity-tab-analysis-detail">Understand spending</span>
        </TabsTrigger>
        <TabsTrigger id="activity-tab-transactions" aria-controls="activity-panel" aria-label="Transactions" aria-describedby="activity-tab-transactions-detail" value="transactions" className={'ledger-tab' + (value === 'transactions' ? ' active' : '')}>
          <span className="activity-tab-title">Transactions</span>
          <span className="activity-tab-detail" id="activity-tab-transactions-detail">Find and correct</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
