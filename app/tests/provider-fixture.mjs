// Offline Responses API fixture. All scientific content is supplied by each test.
export function providerResponse(analysis, overrides = {}) {
 return {id:'OFFLINE_RESPONSE',object:'response',status:'completed',model:'gpt-6.1-sol',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(analysis),annotations:[]}]}],usage:{input_tokens:100,output_tokens:40,total_tokens:140},...overrides};
}
