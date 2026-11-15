import {queryTokens,questionTokens,tokens} from './source-content-terms.mjs';
import {canonicalMaterial} from './material-identity.mjs';
export function shardTerms(manifest,shard){return shard.terms.map(t=>typeof t==='number'?manifest.lexicon[t]:t);}
export function rankFileShards(manifest,request,maxShardFiles=48){
 const allowed=new Set(request.ids||[]),q=queryTokens(request),question=questionTokens(request),material=tokens(canonicalMaterial(request.conditions?.material)),wanted=new Set([...q,...material]),files=new Map();
 // Only query/material terms affect frequency, score or the material tie-break.
 // Scanning all descriptors preserves recall while avoiding per-query copies
 // of the corpus vocabulary in every file and part Set.
 for(const shard of manifest.shards){if(!shard.sourceIds.some(id=>allowed.has(id)))continue;let file=files.get(shard.sha256);if(!file){file={sha256:shard.sha256,sourceIds:new Set(),terms:new Set(),shards:[]};files.set(shard.sha256,file);}const terms=new Set();for(const value of shard.terms){const term=typeof value==='number'?manifest.lexicon[value]:value;if(wanted.has(term))terms.add(term);}for(const t of terms)file.terms.add(t);for(const id of shard.sourceIds)if(allowed.has(id))file.sourceIds.add(id);file.shards.push({shard,terms});}
 const frequencies=new Map();for(const file of files.values())for(const term of file.terms)if(q.has(term))frequencies.set(term,(frequencies.get(term)||0)+1);
 const score=terms=>[...q].reduce((sum,t)=>sum+(terms.has(t)?Math.log(1+files.size/(frequencies.get(t)||1)):0),0),materialHit=terms=>canonicalMaterial(request.conditions?.material)!=='paper'&&material.length>0&&material.every(t=>terms.has(t));
 const questionHit=terms=>[...question].some(t=>terms.has(t));
 const ranked=[...files.values()].map(file=>({...file,score:score(file.terms),questionMention:questionHit(file.terms),materialMention:materialHit(file.terms),shards:file.shards.map(p=>({...p,score:score(p.terms),questionMention:questionHit(p.terms),materialMention:materialHit(p.terms)})).filter(p=>p.score>0).sort((a,b)=>Number(b.questionMention)-Number(a.questionMention)||b.score-a.score||Number(b.materialMention)-Number(a.materialMention)||a.shard.path.localeCompare(b.shard.path))})).filter(f=>f.score>0).sort((a,b)=>Number(b.questionMention)-Number(a.questionMention)||b.score-a.score||Number(b.materialMention)-Number(a.materialMention)||a.sha256.localeCompare(b.sha256));
 const materialFile=ranked.find(file=>file.materialMention),ordered=materialFile&&ranked[0]!==materialFile?[ranked[0],materialFile,...ranked.slice(1).filter(file=>file!==materialFile)]:ranked;
 const plan=[];let round=0;while(plan.length<maxShardFiles){let added=false;for(const file of ordered){if(file.shards[round]){plan.push(file.shards[round]);added=true;if(plan.length>=maxShardFiles)break;}}if(!added)break;round++;}
 return {files:ranked,plan,matchingParts:ranked.reduce((n,f)=>n+f.shards.length,0),candidateSourceIds:[...new Set(ranked.flatMap(f=>[...f.sourceIds]))]};
}
