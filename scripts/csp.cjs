const fs=require('node:fs'),crypto=require('node:crypto');
const path=require('node:path');const file=path.join(__dirname,'../index.html');
let html=fs.readFileSync(file,'utf8');
const hashes=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter(m=>m[1]).map(m=>"'sha256-"+crypto.createHash('sha256').update(m[1]).digest('base64')+"'");
const policy="default-src 'self'; script-src 'self' "+hashes.join(' ')+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
const tag='<meta http-equiv="Content-Security-Policy" content="'+policy+'">';
const old=html.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/);
if(process.argv.includes('--check')){if(!old||old[0]!==tag)throw Error('CSP hashes are stale. Run node scripts/csp.cjs.');}
else {html=old?html.replace(old[0],tag):html.replace('<meta charset="utf-8">','<meta charset="utf-8">\n'+tag);fs.writeFileSync(file,html);fs.writeFileSync(path.join(__dirname,'../_headers'),'/*\n  Content-Security-Policy: '+policy+"; frame-ancestors 'none'\n  X-Frame-Options: DENY\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), geolocation=(), payment=(), usb=(), microphone=(self)\n");}
