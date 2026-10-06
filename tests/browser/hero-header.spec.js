import {test,expect} from '@playwright/test';

test('First paint uses the video poster even before JavaScript runs',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  try{
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:5173/');
    await expect(page.locator('.hero-art')).toHaveCSS('background-image',/hero-poster\.jpg/);
  }finally{await context.close();}
});

test('Cover starts before public settings respond and keeps the same video',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/rest/v1/rpc/public_*',async route=>{await gate;await route.continue();});
  try{
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.hero-art')).toHaveCSS('background-image',/hero-poster\.jpg/);
    await expect(page.locator('.hero-video')).toHaveAttribute('src','assets/hero-video.mp4');
    await expect.poll(()=>page.locator('.hero-video').evaluate(video=>video.readyState)).toBeGreaterThan(1);
    await page.evaluate(()=>{window.firstCoverVideo=document.querySelector('.hero-video');});
  }finally{release();}
  await expect(page.locator('#about-content .media').first()).toBeVisible();
  expect(await page.evaluate(()=>window.firstCoverVideo===document.querySelector('.hero-video'))).toBe(true);
  await expect(page.locator('.hero-art')).toHaveCSS('background-image',/hero-poster\.jpg/);
  await page.locator('#video-toggle').click();
  await expect.poll(()=>page.locator('.hero-video').evaluate(video=>video.paused)).toBe(true);
  await page.locator('#video-toggle').click();
  await expect.poll(()=>page.locator('.hero-video').evaluate(video=>video.paused)).toBe(false);
});

test('Failed video retains its matching poster',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('**/assets/hero-video.mp4',route=>route.abort());
  await page.goto('/');
  await expect(page.locator('.hero-video')).toBeHidden();
  await expect(page.locator('#video-toggle')).toBeHidden();
  await expect(page.locator('.hero-art')).toHaveCSS('background-image',/hero-poster\.jpg/);
});

test('Mobile poster and video use the same crop',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  await expect(page.locator('.hero-art')).toHaveCSS('background-size','auto 480px');
  await expect(page.locator('.hero-art')).toHaveCSS('background-position','34% 0%');
  await expect(page.locator('.hero-video')).toHaveCSS('height','480px');
  await expect(page.locator('.hero-video')).toHaveCSS('width','390px');
  await expect(page.locator('.hero-video')).toHaveCSS('object-position','34% 0%');
  await expect(page.locator('.hero-video')).toHaveCSS('transform','none');
});

test('Published custom cover replaces the initial media',async({page})=>{
  await page.route('**/rest/v1/rpc/public_catalog',async route=>{
    const response=await route.fetch();
    const catalog=await response.json();
    catalog.content.hero={...catalog.content.hero,poster:'/assets/procedimento-pele.webp',video:''};
    await route.fulfill({response,json:catalog});
  });
  await page.goto('/');
  await expect(page.locator('#about-content .media').first()).toBeVisible();
  await expect(page.locator('.hero-art')).toHaveCSS('background-image',/procedimento-pele\.webp/);
  await expect(page.locator('.hero-video')).toBeHidden();
  await expect(page.locator('#video-toggle')).toBeHidden();
});

for(const width of [320,360,390,430,768,900]){
  test(`Mobile header stays aligned at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:844});
    await page.goto('/');
    await expect(page.locator('#about-content .media').first()).toBeVisible();
    const boxes=await page.locator('#site-header').evaluate(header=>{
      const rect=selector=>{const {x,y,width,height,right,bottom}=header.querySelector(selector).getBoundingClientRect();return {x,y,width,height,right,bottom};};
      return {brand:rect('.brand'),actions:rect('.header-actions'),menu:rect('.menu-toggle'),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    expect(boxes.overflow).toBe(false);
    expect(boxes.brand.right).toBeLessThanOrEqual(boxes.actions.x);
    expect(boxes.actions.right).toBeLessThanOrEqual(boxes.menu.x);
    expect(Math.abs(boxes.actions.y+boxes.actions.height/2-boxes.menu.y-boxes.menu.height/2)).toBeLessThan(1);
    expect(boxes.menu.height).toBeGreaterThanOrEqual(44);
    await page.locator('.menu-toggle').click();
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','true');
    await expect(page.locator('#navigation')).toBeVisible();
    await page.locator('#navigation a').first().click();
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','false');
    if(width===390)await page.screenshot({path:testInfo.outputPath('header-celular.png')});
  });
}
