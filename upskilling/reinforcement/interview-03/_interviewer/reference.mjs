export function inspectReceipts(receipts) {
  const groups=new Map();
  for(const r of receipts) {
    const key=JSON.stringify([r.org,r.id]);
    if(!groups.has(key))groups.set(key,{org:r.org,id:r.id,state:'consistent',attempts:0,fingerprint:r.fingerprint,result:r.result});
    const group=groups.get(key);group.attempts++;
    if(group.fingerprint!==r.fingerprint||group.result!==r.result)group.state='conflict';
  }
  return [...groups.values()].map(({org,id,state,attempts})=>({org,id,state,attempts}));
}
