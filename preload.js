// Preload runs in a privileged context. Expose a minimal, safe print API
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
	print: async () => {
		// Return the full result object so the renderer can decide how to present it
		return await ipcRenderer.invoke('print');
	}
	,
	printData: async (html) => {
		return await ipcRenderer.invoke('print-data', html);
	}
  ,
  saveFile: async (arrayBufferOrUint8, filename) => {
    // Forward binary data to main process to show a Save dialog and write the file.
    // The structured clone algorithm supports ArrayBuffer/Uint8Array here.
    return await ipcRenderer.invoke('save-file', { data: arrayBufferOrUint8, filename });
  }
});
