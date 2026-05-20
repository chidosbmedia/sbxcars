// Small font-loading helper: wait for Proxima Nova 600 before applying hero styles
(function(){
  if(!('fonts' in document)) return;

  // Only run once
  if(window.__proximaLoadAttempted) return; window.__proximaLoadAttempted = true;

  const timeout = 2500; // ms

  // Wait for DOMContentLoaded to avoid blocking initial parsing
  function init(){
    // Try to load semibold (600) for Proxima Nova
    const p = document.fonts.load('600 16px "proxima-nova"');
    const race = Promise.race([
      p,
      new Promise((res)=>setTimeout(res, timeout))
    ]);

    race.then(()=>{
      // If loaded, add a class so CSS can target a ready state
      if(document.fonts.check('600 16px "proxima-nova"')){
        document.documentElement.classList.add('fn-proxima-600');
      } else {
        document.documentElement.classList.add('fn-proxima-fallback');
      }
    }).catch(()=>{
      document.documentElement.classList.add('fn-proxima-failed');
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
