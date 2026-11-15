import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {collectThirdPartyNotices} from '../scripts/third-party-notices.mjs';
import {PDF_ASSETS} from '../lib/pdf-assets.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('portable/browser notice preserves every exact vendored license including Lucide and version-specific fonts',async()=>{
 const result=await collectThirdPartyNotices(process.cwd()),published=await readFile(new URL('../public/THIRD_PARTY_NOTICES.txt',import.meta.url));
 assert.deepEqual(published,result.bytes);assert.equal(sha(published),result.sha256);
 const required=['docs/standards/NODE_LICENSE.txt','docs/standards/LUCIDE_LICENSE.txt',...PDF_ASSETS.filter(file=>/(?:^|\/)LICENSE(?:_[^/]*)?$/.test(file)).map(file=>'public/'+file)];
 for(const file of required){const original=await readFile(file);assert.ok(result.sources.some(source=>source.file===file&&source.sha256===sha(original)),file);assert.notEqual(published.indexOf(original),-1,file);}
 assert.match(published.toString('utf8'),/ISC License/);assert.match(published.toString('utf8'),/GNU General Public License v.2/);assert.match(published.toString('utf8'),/Apache License/);
});
