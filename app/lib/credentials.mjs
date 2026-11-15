import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const profileDirectory=()=>path.join(process.env.LOCALAPPDATA || path.join(os.homedir(),'AppData','Local'),'FlameInFreefall');

// Opaque header value: do not assume a particular provider key alphabet or length.
export function normalizeApiKey(value) {
  if(typeof value!=='string')throw new Error("Enter your API key.");
  let key=value.replace(/^[\s\u200B\uFEFF]+|[\s\u200B\uFEFF]+$/gu,'');
  if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();
  if(!key)throw new Error("Enter your API key.");
  if(key.length>4096)throw new Error("The API key exceeds 4096 characters. Paste only the key value.");
  if(!/^[\x21-\x7E]+$/.test(key))throw new Error("The key contains whitespace, line breaks or invisible characters. Paste only the key value.");
  return key;
}

// DPAPI CurrentUser binds the ciphertext to this Windows account. Secrets travel on stdin,
// never through command-line arguments, environment variables, logs or browser storage.
export function windowsProtect(value, decrypt=false) {
  if(process.platform!=='win32')return Promise.reject(new Error('Windows DPAPI gerekli.'));
  const script="$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $e=[Text.Encoding]::UTF8.GetBytes('FlameInFreefall.credentials.v1'); $o=[Security.Cryptography.ProtectedData]::"+(decrypt?'Unprotect':'Protect')+"($b,$e,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($o))";
  return new Promise((resolve,reject)=>{
    const executable=path.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    const child=spawn(executable,['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='';let settled=false;
    const timer=setTimeout(()=>{child.kill();finish(new Error("The key vault did not respond."));},15000);
    function finish(error,result){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(result);}
    child.stdout.on('data',part=>{output+=part;});child.stderr.resume();
    child.stdin.on('error',()=>{});child.on('error',()=>finish(new Error("The Windows key vault could not be opened.")));
    child.on('close',code=>code===0 && output.trim()?finish(null,Buffer.from(output.trim(),'base64')):finish(new Error("The Windows key-vault operation failed.")));
    child.stdin.end(Buffer.from(value).toString('base64'));
  });
}

export function createCredentialStore(directory,protect=windowsProtect) {
  const target=path.join(directory,'credentials.openai.dpapi');
  return {
    async load(){try{return (await protect(await readFile(target),true)).toString('utf8');}catch(error){if(error.code==='ENOENT')return '';throw new Error("The stored key could not be decrypted. Use the same Windows account or save it again in API settings.");}},
    async save(key){const encrypted=await protect(Buffer.from(key,'utf8'));await mkdir(directory,{recursive:true});await writeFile(target+'.tmp',encrypted);await rename(target+'.tmp',target);},
    async clear(){await rm(target,{force:true});}
  };
}
