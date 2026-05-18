document.addEventListener('DOMContentLoaded', function(){
  const slider = document.querySelector('.hero-slider');
  if(!slider) return;
  const slides = Array.from(slider.querySelectorAll('.slide'));
  const nextBtn = slider.querySelector('.slider-control.next');
  const prevBtn = slider.querySelector('.slider-control.prev');
  const indicators = slider.querySelector('.slider-indicators');
  let current = slides.findIndex(s=>s.classList.contains('active')) || 0;
  // build indicators
  slides.forEach((s,i)=>{
    const b = document.createElement('button');
    b.className = 'indicator';
    b.setAttribute('aria-label', 'Go to slide '+(i+1));
    b.setAttribute('data-index', i);
    b.addEventListener('click', ()=>{ goTo(i); pause(); });
    indicators.appendChild(b);
  });

  function update(){
    slides.forEach((s,i)=> s.classList.toggle('active', i===current));
    Array.from(indicators.children).forEach((b,i)=> b.classList.toggle('active', i===current));
  }
  function next(){ current = (current+1) % slides.length; update(); }
  function prev(){ current = (current-1 + slides.length) % slides.length; update(); }
  function goTo(i){ current = i; update(); }

  nextBtn && nextBtn.addEventListener('click', ()=>{ pause(); next(); });
  prevBtn && prevBtn.addEventListener('click', ()=>{ pause(); prev(); });

  // autoplay with pause on hover/focus
  let interval = setInterval(next, 5000);
  let paused = false;
  function pause(){ if(!paused){ clearInterval(interval); paused = true; }}
  function resume(){ if(paused){ interval = setInterval(next, 5000); paused = false; }}
  slider.addEventListener('mouseenter', pause);
  slider.addEventListener('mouseleave', resume);
  slider.addEventListener('focusin', pause);
  slider.addEventListener('focusout', resume);

  // keyboard navigation
  document.addEventListener('keydown', function(e){
    if(e.key === 'ArrowRight') { pause(); next(); }
    if(e.key === 'ArrowLeft') { pause(); prev(); }
  });

  // initial update
  update();
});
