/* Called directly by a save-location button, after encryption is complete. */
(function(root){
 'use strict';
 root.TakeControlSave={
  canChooseFolder(){return typeof root.showSaveFilePicker==='function';},
  canShare(file){return !!(root.navigator.canShare&&root.navigator.canShare({files:[file]}));},
  async save(file,method){
   if(method==='folder'){
    const handle=await root.showSaveFilePicker({suggestedName:file.name,types:[{description:'Encrypted Take Control backup',accept:{'application/json':['.json']}}]});
    const writer=await handle.createWritable();
    try{await writer.write(file);await writer.close();}catch(e){try{await writer.abort();}catch(_){}throw e;}
    return 'Encrypted backup saved to the location you selected.';
   }
   if(method==='share'){
    await root.navigator.share({files:[file],title:'Encrypted Take Control backup'});
    return 'Save/share sheet closed. Check the folder you selected to confirm your backup is there.';
   }
   if(method!=='download')throw Error('Choose a save option.');
   const a=root.document.createElement('a');a.href=root.URL.createObjectURL(file);a.download=file.name;root.document.body.appendChild(a);a.click();
   root.setTimeout(()=>{root.URL.revokeObjectURL(a.href);a.remove();},2000);
   return 'Download started. Your browser controls the folder; check its Downloads list. The app cannot verify the saved location.';
  }
 };
})(typeof window!=='undefined'?window:globalThis);
