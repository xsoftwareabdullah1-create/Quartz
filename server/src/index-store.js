import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';import path from 'node:path';
const db=()=>path.resolve(process.env.QUARTZ_DATA_DIR??'./data','documents.json');
export async function readIndex(){try{return JSON.parse(await readFile(db(),'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}}
export async function upsertDocument(d){const p=db();await mkdir(path.dirname(p),{recursive:true});const docs=await readIndex();const row={url:String(d.url),title:String(d.title??''),content:String(d.content??''),updatedAt:new Date().toISOString()};const i=docs.findIndex(x=>x.url===row.url);if(i<0)docs.push(row);else docs[i]=row;const tmp=p+'.tmp';await writeFile(tmp,JSON.stringify(docs,null,2));await rename(tmp,p);return row;}
