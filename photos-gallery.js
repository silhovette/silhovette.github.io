(() => {
  'use strict';
  const terraSlides = [...document.querySelectorAll('.terra-slideshow img')];
  const terraCaptions = [...document.querySelectorAll('.terra-caption')];
  const terraSlideshow = document.querySelector('.terra-slideshow');
  if (terraSlides.length > 1) {
    let terraCurrent = 0, terraTimer, visible = false;
    const updateTimer = () => {
      clearInterval(terraTimer);
      if (!visible || document.hidden) return;
      terraTimer = setInterval(() => {
        terraSlides[terraCurrent].classList.remove('is-current');
        terraCaptions[terraCurrent].classList.remove('is-current');
        terraCaptions[terraCurrent].setAttribute('aria-hidden', 'true');
        terraCurrent = (terraCurrent + 1) % terraSlides.length;
        terraSlideshow.classList.toggle('has-caption-blur', terraCurrent === 1 || terraCurrent === 5);
        terraSlides[terraCurrent].classList.add('is-current');
        terraCaptions[terraCurrent].classList.add('is-current');
        terraCaptions[terraCurrent].removeAttribute('aria-hidden');
      }, 5000);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .1;
        updateTimer();
      }, {threshold: .1}).observe(terraSlideshow);
    } else { visible = true; updateTimer(); }
    document.addEventListener('visibilitychange', updateTimer);
    window.addEventListener('pageshow', event => {
      if (!event.persisted) return;
      terraSlides[terraCurrent].classList.remove('is-current');
      terraCaptions[terraCurrent].classList.remove('is-current');
      terraCaptions[terraCurrent].setAttribute('aria-hidden', 'true');
      terraCurrent = 0;
      terraSlides[0].classList.add('is-current');
      terraCaptions[0].classList.add('is-current');
      terraCaptions[0].removeAttribute('aria-hidden');
      terraSlideshow.classList.remove('has-caption-blur');
      updateTimer();
    });
  }
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
    if(!viewer.open || busy || !shots.length) return;
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
      document.querySelectorAll('.shot').forEach(target=>observer.observe(target));
      reduced.addEventListener('change',event=>{
        if(!event.matches)return;
        document.querySelectorAll('.shot').forEach(target=>target.classList.add('is-visible'));
        observer.disconnect();
      });
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
 const chapters=[...document.querySelectorAll('.photo-chapter')];
 root.classList.add('photo-enhanced');
 const carouselObserver='IntersectionObserver' in window
   ? new IntersectionObserver(entries=>{
     entries.forEach(entry=>{
       if(entry.isIntersecting){
         entry.target.classList.add('is-visible');
         carouselObserver.unobserve(entry.target);
       }
     });
   },{threshold:.1,rootMargin:'0px 0px -40px 0px'})
   : null;
 function observeReveal(target){
   if(carouselObserver)carouselObserver.observe(target);
   else target.classList.add('is-visible');
 }
 document.querySelectorAll('.archive-footer').forEach(observeReveal);
 let previousBackToTop=null;
 const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
 const gridPointer=matchMedia('(hover:hover) and (pointer:fine)');
 backToTop.addEventListener('click',()=>{
   window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
 });
 let gridFrame=null,gridBounds=null,gridPosition=null,gridTarget=null;
 let scrollFrame=null,paletteStops=[],paletteDirty=true,lastPaletteColor=null,lastGridScroll=null;
 const initialColor=[245,243,236];
 let paintedColor=initialColor,lastPaintTime=null;
 const darkInk=[39,35,34],lightInk=[245,243,236];
 const clamp=value=>Math.max(0,Math.min(1,value));
 const blend=(from,to,mix)=>from.map((value,index)=>Math.round(value+(to[index]-value)*mix));
 const rgb=color=>`rgb(${color.join(' ')})`;
 const fromHex=value=>value.trim().replace('#','').match(/../g).map(part=>parseInt(part,16));
 const luminance=color=>color.map(value=>{const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
 const darkBrightness=luminance(darkInk),lightBrightness=luminance(lightInk);
 const paletteColors=new Map(),chapterColors=new WeakMap();
 function setPaletteColor(target,name,value){
   if(paletteColors.get(name)===value)return;
   paletteColors.set(name,value);
   target.style.setProperty(name,value);
 }
 function measurePalette(top){
   // Cache document coordinates in viewport pixels, including the existing body zoom.
   const headerHeight=header.getBoundingClientRect().height;
   const maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight);
   let previousBottom=0;
   paletteStops=chapters.map((chapter,index)=>{
     const target=chapter.querySelector('.chapter-subhero');
     const bounds=target.getBoundingClientRect();
     const anchor=top+bounds.top;
     // Balance viewport entry with approaching the header, allowing for short chapters.
     const entry=Math.max(0,anchor-innerHeight*.95,index?previousBottom-headerHeight:0);
     const nearHeader=Math.max(0,anchor-headerHeight-innerHeight*.2);
     const transitionStart=(entry+nearHeader)/2-innerHeight*.37;
     const start=Math.min(maxScroll-1,Math.max(0,transitionStart));
     const duration=innerHeight*.28;
     // Include gallery content when spacing the next chapter's palette entrance.
     previousBottom=top+chapter.getBoundingClientRect().bottom;
     // The last palette must also finish when a tall viewport reaches the footer.
     const style=getComputedStyle(chapter);
     const ink=fromHex(style.getPropertyValue('--chapter-ink'));
     return {start,end:Math.min(maxScroll,Math.max(start+1,transitionStart+duration)),chapter,target,color:fromHex(style.getPropertyValue('--chapter-background')),ink,brightness:luminance(ink)};
   });
   paletteStops.slice(0,-1).forEach((stop,index)=>{
     const nextStart=paletteStops[index+1].start;
     const breathingRoom=Math.min(innerHeight*.16,(nextStart-stop.start)*.22);
     stop.end=Math.max(stop.start+1,Math.min(stop.end,nextStart-breathingRoom));
   });
   paletteDirty=false;
 }
 function measureGrid(){const r=grid.getBoundingClientRect();gridBounds={left:r.left,top:r.top,x:grid.clientWidth/r.width,y:grid.clientHeight/r.height};}
 async function revealChapter(stop){
   stop.target.classList.add('is-visible');
   // Overlap the final 880ms of the entrance, while still waiting for the banner
   // to decode. A failed image must not hide the copy.
   const entrances=stop.target.getAnimations({subtree:true});
   await Promise.allSettled([
     ...entrances.map(animation=>{
       const remaining=animation.effect.getComputedTiming().endTime-(animation.currentTime||0);
       return Promise.race([
         animation.finished,
         new Promise(resolve=>setTimeout(resolve,Math.max(0,remaining-880))),
       ]);
     }),
     ...[...stop.target.querySelectorAll('img')].map(image=>image.decode()),
   ]);
   const gallery=stop.chapter.querySelector('.chapter-gallery-slot');
   gallery.classList.add('is-visible');
   // Each slideshow follows its own gallery, including its delayed fade and
   // image decoding. Only then can entering the viewport reveal the slideshow.
   await Promise.allSettled([
     ...gallery.getAnimations().map(animation=>animation.finished),
     ...[...gallery.querySelectorAll('img')].map(image=>image.decode()),
   ]);
   stop.chapter.querySelectorAll('.materia-carousel, .terra-slideshow').forEach(observeReveal);
 }
 function paintScroll(now=performance.now()){
   scrollFrame=null;
   const top=window.scrollY;
   // Measure only when layout changes, in viewport pixels including the page zoom.
   if(paletteDirty)measurePalette(top);
   let color=initialColor;
   for(const stop of paletteStops){
     if(top<=stop.start)break;
     const progress=clamp((top-stop.start)/(stop.end-stop.start));
     color=blend(color,stop.color,progress*progress*(3-2*progress));
     if(progress<1)break;
   }
   // Brief smoothing keeps palette updates fluid without a long trailing fade.
   const elapsed=lastPaintTime===null?16:Math.min(64,now-lastPaintTime);
   lastPaintTime=now;
   const follow=reducedMotion.matches||lastPaletteColor===null?1:1-Math.exp(-elapsed/80);
   paintedColor=paintedColor.map((value,index)=>value+(color[index]-value)*follow);
   const unsettled=paintedColor.some((value,index)=>Math.abs(value-color[index])>.2);
   if(!unsettled)paintedColor=[...color];
   color=paintedColor.map(Math.round);
   if(!gridBounds)measureGrid();
   const gridScroll=-top*gridBounds.y;
   const showBackToTop=top>400;
   if(showBackToTop!==previousBackToTop){
     backToTop.classList.toggle('is-visible',showBackToTop);
     backToTop.inert=!showBackToTop;
     previousBackToTop=showBackToTop;
   }
   // All layout reads precede writes. Flat portions do not repaint the palette.
   const background=rgb(color);
   if(background!==lastPaletteColor){
     const brightness=luminance(color);
     const lightContrast=(lightBrightness+.05)/(brightness+.05);
     const darkContrast=(brightness+.05)/(darkBrightness+.05);
     const ink=lightContrast>darkContrast?lightInk:darkInk;
     const isPaper=color.every((value,index)=>value===initialColor[index]);
     // Background colors do not inherit; scope the remaining live variables to
     // their consumers instead of invalidating styles across the entire page.
     root.style.backgroundColor=background;
     document.body.style.backgroundColor=background;
     setPaletteColor(header,'--page-background',background);
     setPaletteColor(header,'--page-header-ink',rgb(ink));
     setPaletteColor(header,'--page-header-muted',isPaper?'#625b58':rgb(blend(ink,color,.12)));
     setPaletteColor(header,'--page-header-line',isPaper?'#d6cfcd':rgb(blend(color,ink,.22)));
     setPaletteColor(grid,'--page-grid-color',isPaper?'#8b807d':rgb(ink));
     // Keep already revealed copy readable when scrolling back between palettes.
     paletteStops.forEach(stop=>{
       const textBrightness=stop.brightness;
       const contrast=(Math.max(textBrightness,brightness)+.05)/(Math.min(textBrightness,brightness)+.05);
       const readable=rgb(contrast>=4.5?stop.ink:ink);
       if(chapterColors.get(stop.chapter)!==readable){
         chapterColors.set(stop.chapter,readable);
         stop.chapter.style.setProperty('--chapter-readable-ink',readable);
       }
     });
     lastPaletteColor=background;
   }
   // The scroll threshold starts each entrance once. Waiting for an exact painted
   // color delayed it during momentum scrolling and could skip earlier chapters.
   paletteStops.forEach(stop=>{
     if(top>=stop.end&&!stop.target.classList.contains('is-visible')){
       void revealChapter(stop);
     }
   });
   if(gridScroll!==lastGridScroll){grid.style.setProperty('--grid-scroll-y',`${gridScroll}px`);grid.style.setProperty('--grid-offset-y',`${gridScroll%40}px`);lastGridScroll=gridScroll;}
   if(unsettled)scrollGrid();
 }
 function scrollGrid(){if(scrollFrame===null)scrollFrame=requestAnimationFrame(paintScroll);}
 function invalidateScrollMeasurements(){paletteDirty=true;gridBounds=null;scrollGrid();}
 window.addEventListener('scroll',scrollGrid,{passive:true});
 window.addEventListener('pageshow',invalidateScrollMeasurements);
 const layoutObserver=new ResizeObserver(invalidateScrollMeasurements);
 layoutObserver.observe(hero);layoutObserver.observe(header);
 layoutObserver.observe(document.querySelector('main'));
 chapters.forEach(chapter=>layoutObserver.observe(chapter));
 document.fonts?.ready.then(invalidateScrollMeasurements);
 paintScroll();
 function clearGrid(){grid.classList.remove('is-active');if(gridFrame!==null)cancelAnimationFrame(gridFrame);gridFrame=null;gridPosition=gridTarget=null;}
 function drawGrid(){gridFrame=null;if(!gridTarget)return;gridPosition.x+=(gridTarget.x-gridPosition.x)*.2;gridPosition.y+=(gridTarget.y-gridPosition.y)*.2;grid.style.setProperty('--grid-x',`${gridPosition.x}px`);grid.style.setProperty('--grid-y',`${gridPosition.y}px`);if(Math.hypot(gridTarget.x-gridPosition.x,gridTarget.y-gridPosition.y)>.2)gridFrame=requestAnimationFrame(drawGrid);}
 window.addEventListener('pointermove',ev=>{if(ev.pointerType!=='mouse'||reducedMotion.matches||!gridPointer.matches||document.hidden)return;if(!gridBounds)measureGrid();gridTarget={x:(ev.clientX-gridBounds.left)*gridBounds.x,y:(ev.clientY-gridBounds.top)*gridBounds.y};if(!gridPosition)gridPosition={...gridTarget};grid.classList.add('is-active');if(gridFrame===null)gridFrame=requestAnimationFrame(drawGrid);},{passive:true});
 document.documentElement.addEventListener('pointerleave',clearGrid);window.addEventListener('blur',clearGrid);window.addEventListener('resize',()=>{clearGrid();invalidateScrollMeasurements();},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)clearGrid();});
 reducedMotion.addEventListener('change',()=>{clearGrid();scrollGrid();});gridPointer.addEventListener('change',clearGrid);
 const clock=document.querySelector('[data-shanghai-time]');
 const clockFmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false});
 function tick(){clock.textContent=clockFmt.format(new Date());}tick();setInterval(tick,60000);
})();

(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 document.querySelectorAll('.materia-carousel').forEach(carousel=>{
   const photos=[...carousel.querySelectorAll('.materia-carousel__photo')];
   const stories=[...carousel.querySelectorAll('.materia-carousel__story')];
   const status=carousel.querySelector('.materia-carousel__status');
   const previous=carousel.querySelector('.materia-carousel__arrow--prev');
   const next=carousel.querySelector('.materia-carousel__arrow--next');
   let current=0,busy=false;
   const pending=[];
   let autoTimer;
   let pointerInside=false, visible=false;
   function restartAuto(){
     clearInterval(autoTimer);
     if(pointerInside||!visible||document.hidden)return;
     autoTimer=setInterval(()=>{
       if(!document.hidden&&!busy)void change(1);
     },20000);
   }
   async function change(direction){
     pending.push(direction);
     if(busy)return;
     busy=true;
     while(pending.length){
     direction=pending.shift();
     const index=(current+direction+photos.length)%photos.length;
     const outgoing=photos[current],incoming=photos[index];
     const oldCopy=stories[current],newCopy=stories[index];
     const duration=reduced.matches?0:760;
     const animate=async(element,frames,ms)=>{
       const animation=element.animate(frames,{duration:ms,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
       try {await animation.finished;}catch(e){}finally{animation.cancel();}
     };
     incoming.classList.add('is-current');
     await Promise.all([
       animate(outgoing,[{transform:'translateX(0)'},{transform:`translateX(${-direction*100}%)`}],duration),
       animate(incoming,[{transform:`translateX(${direction*100}%)`},{transform:'translateX(0)'}],duration),
       (async()=>{
         await animate(oldCopy,[{opacity:1},{opacity:0}],reduced.matches?0:180);
         oldCopy.classList.remove('is-current');
         oldCopy.setAttribute('aria-hidden','true');
         newCopy.classList.add('is-current');
         newCopy.removeAttribute('aria-hidden');
         await animate(newCopy,[{opacity:0},{opacity:1}],reduced.matches?0:380);
       })(),
     ]);
     outgoing.classList.remove('is-current');
     current=index;
     status.textContent=`Photo story ${current+1} of ${photos.length}`;
     }
     busy=false;
   }
   previous.hidden=next.hidden=false;
   carousel.addEventListener('pointerenter',event=>{
     if(event.pointerType!=='mouse')return;
     pointerInside=true;
     clearInterval(autoTimer);
   });
   carousel.addEventListener('pointerleave',event=>{
     if(event.pointerType!=='mouse')return;
     pointerInside=false;
     restartAuto();
   });
   previous.addEventListener('click',()=>{restartAuto();void change(-1);});
   next.addEventListener('click',()=>{restartAuto();void change(1);});
   carousel.addEventListener('keydown',event=>{
     if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
     event.preventDefault();
     restartAuto();
     void change(event.key==='ArrowRight'?1:-1);
   });
   if('IntersectionObserver' in window){
     new IntersectionObserver(entries=>{
       visible=entries[0].isIntersecting;
       restartAuto();
     }).observe(carousel);
   }else{visible=true;restartAuto();}
   document.addEventListener('visibilitychange',restartAuto);
 });
})();
