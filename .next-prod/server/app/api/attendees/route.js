(()=>{var a={};a.id=835,a.ids=[835],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},1615:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>H,patchFetch:()=>G,routeModule:()=>C,serverHooks:()=>F,workAsyncStorage:()=>D,workUnitAsyncStorage:()=>E});var d={};c.r(d),c.d(d,{GET:()=>A,POST:()=>B});var e=c(6559),f=c(8088),g=c(7719),h=c(6191),i=c(1289),j=c(261),k=c(2603),l=c(9893),m=c(4823),n=c(7220),o=c(6946),p=c(7912),q=c(9786),r=c(6143),s=c(6439),t=c(3365),u=c(2190),v=c(7916),w=c(6031),x=c(6890);async function y(a){try{let b=new URL("https://nominatim.openstreetmap.org/search");b.searchParams.set("q",a),b.searchParams.set("format","json"),b.searchParams.set("limit","1");let c=await fetch(b.toString(),{headers:{"User-Agent":x.eE,"Accept-Language":"en"},cache:"no-store"});if(!c.ok)return null;let d=await c.json();if(!d?.length)return null;return{lat:Number(d[0].lat),lng:Number(d[0].lon)}}catch{return null}}let z=v.Ik({name:v.Yj().min(1).max(100),startingAddress:v.Yj().min(1).max(300),arrivalDate:v.Yj().date().or(v.eu("").transform(()=>void 0)).optional(),departureDate:v.Yj().date().or(v.eu("").transform(()=>void 0)).optional()});async function A(){let a=await (0,w.oP)();return u.NextResponse.json(a)}async function B(a){let b=await a.json().catch(()=>({})),c=z.safeParse(b);if(!c.success)return u.NextResponse.json({error:"Invalid payload"},{status:400});let{name:d,startingAddress:e,arrivalDate:f,departureDate:g}=c.data,h=await y(e),i=function(a){if(!a||"string"!=typeof a)return"";let b=a.split(",").map(a=>a.trim()).filter(Boolean);if(0===b.length)return"";let c=b[0]||"",d=b[1]||"",e=/\b\d{5}(?:-\d{4})?\b/,f=b.findIndex(a=>e.test(a)),g=f>=0&&b[f].match(e)?.[0]||"",h="";if(f>0){let a=b[f-1];!a||/\d/.test(a)||/County/i.test(a)||/United\s+States/i.test(a)||(h=a)}if(!h)for(let a=b.length-1;a>=2;a--){let c=b[a];if(!/\d/.test(c)&&!/County/i.test(c)&&!/United\s+States?/i.test(c)){h=c;break}}let i=[b.findIndex(a=>/County/i.test(a)),f,h?b.indexOf(h):-1].filter(a=>a>0),j=i.length?Math.min(...i):b.length,k="";for(let a=Math.min(j-1,b.length-1);a>=2;a--){let c=b[a];if(!(!c||/County/i.test(c))&&!/United\s+States?/i.test(c)){k=c;break}}let l=[c,d,k].filter(Boolean).join(" ").replace(/\s+/g," ").trim(),m=[g,h].filter(Boolean).join(" ").trim();return l&&m?`${l}, ${m}`:l||m||a}(e)||e,j=await (0,w.$Q)({name:d,startingAddress:i,arrivalDate:f??null,departureDate:g??null,location:h});return u.NextResponse.json(j,{status:201})}let C=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/attendees/route",pathname:"/api/attendees",filename:"route",bundlePath:"app/api/attendees/route"},distDir:".next-prod",projectDir:"",resolvedPagePath:"D:\\Workspace\\man-weekend-dashboard\\src\\app\\api\\attendees\\route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:D,workUnitAsyncStorage:E,serverHooks:F}=C;function G(){return(0,g.patchFetch)({workAsyncStorage:D,workUnitAsyncStorage:E})}async function H(a,b,c){var d;let e="/api/attendees/route";"/index"===e&&(e="/");let g=await C.prepare(a,b,{srcPage:e,multiZoneDraftMode:"false"});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(y.dynamicRoutes[E]||y.routes[D]);if(F&&!x){let a=!!y.routes[D],b=y.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||C.isDev||x||(G="/index"===(G=D)?"/":G);let H=!0===C.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{dynamicIO:!!w.experimental.dynamicIO,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>C.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>C.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await C.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})},z),b}},l=await C.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(L||b instanceof s.NoFallbackError||await C.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},3033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6031:(a,b,c)=>{"use strict";c.d(b,{$Q:()=>m,ZN:()=>p,gr:()=>u,Wz:()=>r,oP:()=>l,ug:()=>o,Yc:()=>s,YZ:()=>q});var d=c(9232),e=c(8909);let f=null;function g(){if(!f){let a=process.env.DATABASE_URL;if(!a)throw Error("DATABASE_URL is not set. Please add it to your environment (e.g. .env.local)");f=(0,e.lw)(a)}return f}let h=null;function i(){return h||(h=(async()=>{let a=g();await a`
        create table if not exists attendees (
          id text primary key,
          name text not null,
          starting_address text not null,
          arrival_date date,
          departure_date date,
          location_lat double precision,
          location_lng double precision,
          created_at timestamptz not null default now()
        );
      `,await a`
        create table if not exists expenses (
          id text primary key,
          description text not null,
          amount numeric(12,2) not null check (amount >= 0),
          payer_id text not null references attendees(id) on delete restrict,
          date date,
          created_at timestamptz not null default now()
        );
      `,await a`
        create table if not exists expense_beneficiaries (
          expense_id text not null references expenses(id) on delete cascade,
          beneficiary_id text not null references attendees(id) on delete restrict,
          primary key (expense_id, beneficiary_id)
        );
      `,await a`
        create table if not exists expense_paid (
          expense_id text not null references expenses(id) on delete cascade,
          beneficiary_id text not null references attendees(id) on delete restrict,
          paid boolean not null default false,
          primary key (expense_id, beneficiary_id)
        );
      `})()),h}function j(a){return{id:String(a.id),name:String(a.name),startingAddress:String(a.starting_address),arrivalDate:a.arrival_date?String(a.arrival_date):null,departureDate:a.departure_date?String(a.departure_date):null,location:null!=a.location_lat&&null!=a.location_lng?{lat:Number(a.location_lat),lng:Number(a.location_lng)}:null,createdAt:new Date(String(a.created_at)).toISOString()}}function k(a){let b=Array.isArray(a.beneficiary_ids)?a.beneficiary_ids.map(a=>String(a)):[],c=a.paid_by??{},d={};for(let[a,b]of Object.entries(c))d[String(a)]=!!b;return{id:String(a.id),description:String(a.description),amount:Number(a.amount),payerId:String(a.payer_id),beneficiaryIds:b,paidByBeneficiary:d,date:a.date?String(a.date):void 0,createdAt:new Date(String(a.created_at)).toISOString()}}async function l(){await i();let a=g();return(await a`
    select id, name, starting_address, arrival_date, departure_date, location_lat, location_lng, created_at
    from attendees
    order by created_at asc
  `).map(j)}async function m(a){await i();let b=(0,d.Ak)(),c=a.name.trim(),e=a.startingAddress.trim(),f=a.arrivalDate??null,h=a.departureDate??null,k=a.location?.lat??null,l=a.location?.lng??null,m=g();return j((await m`
    insert into attendees (id, name, starting_address, arrival_date, departure_date, location_lat, location_lng)
    values (${b}, ${c}, ${e}, ${f}, ${h}, ${k}, ${l})
    returning id, name, starting_address, arrival_date, departure_date, location_lat, location_lng, created_at
  `)[0])}async function n(a){let b=g(),c=await b`
    select
      e.id,
      e.description,
      (e.amount)::float8 as amount,
      e.payer_id,
      e.date,
      e.created_at,
      coalesce(array_agg(distinct eb.beneficiary_id) filter (where eb.beneficiary_id is not null), '{}'::text[]) as beneficiary_ids,
      coalesce(jsonb_object_agg(ep.beneficiary_id, ep.paid) filter (where ep.beneficiary_id is not null), '{}'::jsonb) as paid_by
    from expenses e
    left join expense_beneficiaries eb on eb.expense_id = e.id
    left join expense_paid ep on ep.expense_id = e.id
    where e.id = ${a}
    group by e.id
  `;return 0===c.length?null:k(c[0])}async function o(){await i();let a=g();return(await a`
    select
      e.id,
      e.description,
      (e.amount)::float8 as amount,
      e.payer_id,
      e.date,
      e.created_at,
      coalesce(array_agg(distinct eb.beneficiary_id) filter (where eb.beneficiary_id is not null), '{}'::text[]) as beneficiary_ids,
      coalesce(jsonb_object_agg(ep.beneficiary_id, ep.paid) filter (where ep.beneficiary_id is not null), '{}'::jsonb) as paid_by
    from expenses e
    left join expense_beneficiaries eb on eb.expense_id = e.id
    left join expense_paid ep on ep.expense_id = e.id
    group by e.id
    order by e.created_at asc
  `).map(k)}async function p(a){await i();let b=(0,d.Ak)(),c=a.description.trim(),e=Math.max(0,Number(a.amount)),f=a.payerId,h=a.date||null,j=Array.from(new Set(a.beneficiaryIds)),k=g();for(let a of(await k`
    insert into expenses (id, description, amount, payer_id, date)
    values (${b}, ${c}, ${e}, ${f}, ${h})
  `,j))await k`insert into expense_beneficiaries (expense_id, beneficiary_id) values (${b}, ${a}) on conflict do nothing`;let l=await n(b);if(!l)throw Error("Failed to create expense");return l}async function q(a,b){await i();let c=g();return await c`
    insert into expense_paid (expense_id, beneficiary_id, paid)
    values (${a}, ${b}, true)
    on conflict (expense_id, beneficiary_id) do update set paid = not expense_paid.paid
  `,n(a)}async function r(a){await i();let b=g();return(await b`delete from expenses where id = ${a} returning id`).length>0}async function s(a,b){await i();let c=Array.from(new Set(b)),d=g();for(let b of(await d`delete from expense_beneficiaries where expense_id = ${a}`,c))await d`insert into expense_beneficiaries (expense_id, beneficiary_id) values (${a}, ${b}) on conflict do nothing`;return await d`
    delete from expense_paid
    where expense_id = ${a}
      and beneficiary_id not in (select beneficiary_id from expense_beneficiaries where expense_id = ${a})
  `,n(a)}async function t(a){await i();let b=g(),c=(await b`
    select
      exists(select 1 from expenses where payer_id = ${a}) as is_payer,
      exists(select 1 from expense_beneficiaries where beneficiary_id = ${a}) as is_beneficiary
  `)[0];return!!c?.is_payer||!!c?.is_beneficiary}async function u(a){if(await i(),await t(a))return{ok:!1,reason:"referenced"};let b=g();return 0===(await b`delete from attendees where id = ${a} returning id`).length?{ok:!1,reason:"not_found"}:{ok:!0}}},6439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},6487:()=>{},6890:(a,b,c)=>{"use strict";c.d(b,{eE:()=>d});let d="undefined"!=typeof process&&process.env.NEXT_PUBLIC_APP_NAME||"man-weekend-dashboard/1.0 (+https://example.com)"},7598:a=>{"use strict";a.exports=require("node:crypto")},8335:()=>{},9294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[985,55,916,612],()=>b(b.s=1615));module.exports=c})();