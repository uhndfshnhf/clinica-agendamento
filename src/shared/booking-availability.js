// Public catalog only. Never infer staff assignments or expose hidden services.
export function bookingAvailability(catalog){
 const procedures=catalog?.procedures||[],professionals=catalog?.professionals||[],assignments=catalog?.assignments||[];
 const staffIds=new Set(professionals.map(p=>p.id));
 const services=procedures.filter(p=>assignments.some(a=>a.procedure_id===p.id&&staffIds.has(a.professional_id)));
 let reason=null;
 if(!catalog||!catalog.booking||typeof catalog.booking.enabled!=='boolean')reason='configuration';
 else if(!catalog.booking.enabled)reason='paused';
 else if(!procedures.length)reason='services';
 else if(!professionals.length)reason='team';
 else if(!services.length)reason='assignments';
 return {ready:reason===null,reason,services};
}
