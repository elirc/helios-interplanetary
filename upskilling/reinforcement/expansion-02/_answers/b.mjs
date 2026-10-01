export function summarizeRequests(samples) {
  const groups=new Map();
  for(const s of samples) {
    if(!Number.isFinite(s.durationMs)||s.durationMs<0)throw new TypeError('Invalid duration');
    const key=JSON.stringify([s.route,s.status]);const g=groups.get(key)??{route:s.route,status:s.status,count:0,sumMs:0,maxMs:0};
    g.count++;g.sumMs+=s.durationMs;g.maxMs=Math.max(g.maxMs,s.durationMs);groups.set(key,g);
  }
  return [...groups.values()].sort((a,b)=>a.route<b.route?-1:a.route>b.route?1:a.status-b.status).map(g=>({...g,meanMs:g.sumMs/g.count}));
}
