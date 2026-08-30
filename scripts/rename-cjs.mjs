import { readdir, rename } from 'node:fs/promises'; import { join } from 'node:path';
async function walk(dir){ for(const name of await readdir(dir,{withFileTypes:true})){const p=join(dir,name.name); if(name.isDirectory()) await walk(p); else if(name.name.endsWith('.js')) await rename(p,p.slice(0,-3)+'.cjs')}} await walk('dist/cjs').catch(()=>{})
