export function summarizeJournals(lines) {
  const groups=new Map();
  for(const l of lines) {
    if(!['DEBIT','CREDIT'].includes(l.side)||!Number.isSafeInteger(l.cents)||l.cents<=0)throw new TypeError('Invalid line');
    const key=JSON.stringify([l.organizationId,l.journalId]);
    const g=groups.get(key)??{organizationId:l.organizationId,journalId:l.journalId,debit:0n,credit:0n};
    g[l.side==='DEBIT'?'debit':'credit']+=BigInt(l.cents);groups.set(key,g);
  }
  return [...groups.values()].sort((a,b)=>a.organizationId<b.organizationId?-1:a.organizationId>b.organizationId?1:a.journalId<b.journalId?-1:a.journalId>b.journalId?1:0).map(g=>({...g,debit:String(g.debit),credit:String(g.credit),balanced:g.debit===g.credit}));
}
