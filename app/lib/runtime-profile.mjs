import path from 'node:path';
// A prototype gets independent chats/cache/instance state, using the same key vault.
export function runtimeProfiles(base,version,override){
 if(override){const root=path.resolve(override);return {profile:root,credentials:root};}
 return {profile:version.includes('-prototype.')?path.join(base,'Prototypes',version):base,credentials:base};
}
