(() => {
  'use strict';
  const shots=[...document.querySelectorAll('.shot')].sort((a,b)=>Number(a.dataset.index)-Number(b.dataset.index));
  const viewer=document.getElementById('viewer');
  const full=document.getElementById('viewer-image');
  const flight=document.getElementById('viewer-flight');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let current=0, activeShot=null, busy=false, closeOnIdle=false, originalOverflow='', touchStart=null;
  const ease='cubic-bezier(.22,1,.36,1)';
  const photoOf=(shot)=>shot.querySelector('img');
  const rectOf=(shot)=>shot.querySelector('.shot-art').getBoundingClientRect();
  const visibleRect=(r)=>r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;
  const keyRect=(r)=>({left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});
  const waitReady=async img=>{ try {await img.decode();}catch(e){} };
  const setFlight=(r,src)=>{flight.src=src;Object.assign(flight.style,keyRect(r));flight.style.display='block';};
  const hideFlight=()=>{flight.style.display='none';flight.removeAttribute('style');flight.removeAttribute('src');};
  const animateFlight=async (from,to,duration)=>{
    const animation=flight.animate([keyRect(from),keyRect(to)],{duration,easing:ease,fill:'forwards'});
    try {await animation.finished;} catch(e) {}
    animation.cancel();
  };
  const fadePhoto=async (from,to,duration=380)=>{
    const anim=full.animate([{opacity:from},{opacity:to}],{duration,easing:ease,fill:'forwards'});
    try {await anim.finished;}catch(e){}
    anim.cancel();
  };

  async function openPhoto(shot) {
    if (busy || viewer.open) return;
    busy=true;
    activeShot=shot;
    current=shots.indexOf(shot);
    const thumb=photoOf(shot);
    const start=rectOf(shot);
    full.classList.remove('is-ready');
    full.src=thumb.dataset.full || thumb.currentSrc || thumb.src;
    full.alt=thumb.alt;
    viewer.classList.remove('is-closing');
    originalOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    viewer.showModal();
    await waitReady(full);
    const end=full.getBoundingClientRect();
    if (!reduced.matches && visibleRect(start) && end.width && end.height) {
      setFlight(start,full.src);
      await animateFlight(start,end,760);
      hideFlight();
    }
    full.classList.add('is-ready');
    busy=false;
    if(closeOnIdle){closeOnIdle=false;void closePhoto();}
  }

  async function navigateTo(step) {
    if(!viewer.open || busy) return;
    busy=true;
    await fadePhoto(1,0,150);
    full.classList.remove('is-ready');
    current=(current+step+shots.length)%shots.length;
    const thumb=photoOf(shots[current]);
    full.src=thumb.dataset.full || thumb.currentSrc || thumb.src;
    full.alt=thumb.alt;
    await waitReady(full);
    full.classList.add('is-ready');
    await fadePhoto(0,1,310);
    busy=false;
    if(closeOnIdle){closeOnIdle=false;void closePhoto();}
  }

  async function closePhoto() {
    if(!viewer.open)return;
    if(busy){closeOnIdle=true;return;}
    busy=true;
    closeOnIdle=false;
    viewer.classList.add('is-closing');
    const from=full.getBoundingClientRect();
    const to=rectOf(shots[current]);
    const shouldFly=!reduced.matches&&visibleRect(to)&&from.width>0&&from.height>0;
    if(shouldFly){
      setFlight(from,full.src);
      full.classList.remove('is-ready');
      await animateFlight(from,to,590);
      hideFlight();
    }else{
      if(!reduced.matches) await fadePhoto(1,0,300);
    }
    full.classList.remove('is-ready');
    viewer.close();
    full.removeAttribute('src');
    viewer.classList.remove('is-closing');
    document.body.style.overflow=originalOverflow;
    if(activeShot) activeShot.focus({preventScroll:true});
    busy=false;
  }

  shots.forEach(shot=>shot.addEventListener('click',()=>openPhoto(shot)));
  viewer.addEventListener('cancel',event=>{event.preventDefault();closePhoto();});
  viewer.addEventListener('click',event=>{if(event.target===viewer||event.target.classList.contains('viewer-layout'))closePhoto();});
  document.addEventListener('keydown',event=>{
    if(!viewer.open) return;
    if(event.key==='ArrowRight'){event.preventDefault();navigateTo(1);}
    if(event.key==='ArrowLeft'){event.preventDefault();navigateTo(-1);}
  });
  viewer.addEventListener('touchstart',event=>{if(event.touches.length===1)touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};},{passive:true});
  viewer.addEventListener('touchend',event=>{
    if(!touchStart) return;
    const dx=event.changedTouches[0].clientX-touchStart.x;
    const dy=event.changedTouches[0].clientY-touchStart.y;
    if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)navigateTo(dx<0?1:-1);
    touchStart=null;
  },{passive:true});

  // Animation is optional; the entire page remains accessible without it.
  if(!reduced.matches){
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
        }
      },{threshold:.1,rootMargin:'0px 0px -60px 0px'});
      document.documentElement.classList.add('photo-enhanced');
      document.querySelectorAll('.shot').forEach(shot=>observer.observe(shot));
    }
  }
})();
(() => {
 'use strict';
 const root=document.documentElement;
 const hero=document.querySelector('.hero');
 const header=document.querySelector('.portfolio-header');
 const grid=document.querySelector('.page-grid');
 const backToTop=document.querySelector('.back-to-top');
 let previousBackToTop=null;
 const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
 const gridPointer=matchMedia('(hover:hover) and (pointer:fine)');
 backToTop.addEventListener('click',()=>{
   window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
 });
 let gridFrame=null,gridBounds=null,gridPosition=null,gridTarget=null;
 let scrollFrame=null,paletteEnd=1,paletteDirty=true,lastPaletteMix=null,lastGridScroll=null;
 function measureGrid(){const r=grid.getBoundingClientRect();gridBounds={left:r.left,top:r.top,x:grid.clientWidth/r.width,y:grid.clientHeight/r.height};}
 function paintScroll(){
   scrollFrame=null;
   const top=window.scrollY;
   // Measure only when layout changes, in viewport pixels including the page zoom.
   if(paletteDirty){
     paletteEnd=Math.max(1,top+hero.getBoundingClientRect().bottom-header.getBoundingClientRect().bottom);
     paletteDirty=false;
   }
   if(!gridBounds)measureGrid();
   const progress=Math.max(0,Math.min(1,top/paletteEnd));
   const mix=progress*progress*(3-2*progress)*100;
   const gridScroll=-top*gridBounds.y;
   const showBackToTop=top>400;
   if(showBackToTop!==previousBackToTop){
     backToTop.classList.toggle('is-visible',showBackToTop);
     backToTop.inert=!showBackToTop;
     previousBackToTop=showBackToTop;
   }
   // Read layout before writing styles; the palette stops changing past the hero.
   if(mix!==lastPaletteMix){root.style.setProperty('--page-scroll-mix',`${mix}%`);lastPaletteMix=mix;}
   if(gridScroll!==lastGridScroll){grid.style.setProperty('--grid-scroll-y',`${gridScroll}px`);grid.style.setProperty('--grid-offset-y',`${gridScroll%40}px`);lastGridScroll=gridScroll;}
 }
 function scrollGrid(){if(scrollFrame===null)scrollFrame=requestAnimationFrame(paintScroll);}
 function invalidateScrollMeasurements(){paletteDirty=true;gridBounds=null;scrollGrid();}
 window.addEventListener('scroll',scrollGrid,{passive:true});
 window.addEventListener('pageshow',invalidateScrollMeasurements);
 const layoutObserver=new ResizeObserver(invalidateScrollMeasurements);
 layoutObserver.observe(hero);layoutObserver.observe(header);
 document.fonts?.ready.then(invalidateScrollMeasurements);
 paintScroll();
 function clearGrid(){grid.classList.remove('is-active');if(gridFrame!==null)cancelAnimationFrame(gridFrame);gridFrame=null;gridPosition=gridTarget=null;}
 function drawGrid(){gridFrame=null;if(!gridTarget)return;gridPosition.x+=(gridTarget.x-gridPosition.x)*.2;gridPosition.y+=(gridTarget.y-gridPosition.y)*.2;grid.style.setProperty('--grid-x',`${gridPosition.x}px`);grid.style.setProperty('--grid-y',`${gridPosition.y}px`);if(Math.hypot(gridTarget.x-gridPosition.x,gridTarget.y-gridPosition.y)>.2)gridFrame=requestAnimationFrame(drawGrid);}
 window.addEventListener('pointermove',ev=>{if(ev.pointerType!=='mouse'||reducedMotion.matches||!gridPointer.matches||document.hidden)return;if(!gridBounds)measureGrid();gridTarget={x:(ev.clientX-gridBounds.left)*gridBounds.x,y:(ev.clientY-gridBounds.top)*gridBounds.y};if(!gridPosition)gridPosition={...gridTarget};grid.classList.add('is-active');if(gridFrame===null)gridFrame=requestAnimationFrame(drawGrid);},{passive:true});
 document.documentElement.addEventListener('pointerleave',clearGrid);window.addEventListener('blur',clearGrid);window.addEventListener('resize',()=>{clearGrid();invalidateScrollMeasurements();},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)clearGrid();});
 reducedMotion.addEventListener('change',clearGrid);gridPointer.addEventListener('change',clearGrid);
 const clock=document.querySelector('[data-shanghai-time]');
 const clockFmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false});
 function tick(){clock.textContent=clockFmt.format(new Date());}tick();setInterval(tick,60000);
})();
