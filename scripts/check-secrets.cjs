const fs=require('node:fs'),cp=require('node:child_process');
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}\b/,/\bAKIA[A-Z0-9]{16}\b/];
function matches(s){return patterns.some(p=>p.test(s));}
module.exports={matches};
if(require.main===module){
 const files=cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);let bad=false;
 for(const file of files){if(!fs.existsSync(file)||fs.statSync(file).size>2000000)continue;const b=fs.readFileSync(file);if(b.includes(0))continue;if(matches(b.toString())){console.error('Possible credential in '+file+' (content withheld)');bad=true;}}
 if(bad)process.exitCode=1;
}
