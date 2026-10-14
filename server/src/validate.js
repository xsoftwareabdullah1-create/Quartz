export function validDocument(d){return !!d&&typeof d.url==='string'&&/^https?:\/\//i.test(d.url)&&typeof(d.title??'')==='string'&&typeof(d.content??'')==='string';}
