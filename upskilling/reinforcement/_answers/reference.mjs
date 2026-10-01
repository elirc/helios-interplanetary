export function pageInvoices(rows,{tenantId,cursor=null,limit}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('Invalid limit');
  return rows.filter(r => r.tenantId === tenantId && (!cursor || r.createdAt < cursor.createdAt || (r.createdAt === cursor.createdAt && r.id < cursor.id)))
    .sort((a,b) => b.createdAt-a.createdAt || (a.id === b.id ? 0 : a.id > b.id ? -1 : 1)).slice(0,limit);
}
