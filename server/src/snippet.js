export function makeSnippet(text='',max=220){const s=String(text).replace(/\s+/g,' ').trim();return s.length>max?s.slice(0,max-1)+'…':s;}
