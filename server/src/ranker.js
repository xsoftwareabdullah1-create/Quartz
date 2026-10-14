import {tokenize} from './tokenize.js';
export function scoreDocument(q,d){const terms=tokenize(q);if(!terms.length)return 0;const title=new Set(tokenize(d.title));const body=tokenize(`${d.content??''} ${d.description??''}`);let s=0;for(const t of terms){if(title.has(t))s+=5;s+=Math.min(4,body.filter(x=>x===t).length);}if((d.title??'').toLowerCase().includes(q.toLowerCase()))s+=3;return s;}
