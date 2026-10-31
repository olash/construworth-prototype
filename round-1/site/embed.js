/*! Construworth embed helper. Add once to any page that holds a Construworth iframe.
 *  - Sizes each iframe to its content, so there is no second scrollbar.
 *  - Keeps pop-ups such as the image viewer on screen.
 *  - Scrolls the page to sections when a link inside the frame points to one.
 *  - Passes the page's #hash to the frame, so links like /#lifecycle land on the right section.
 *  Options on the iframe: data-cw-offset="80" leaves room for a sticky site header when scrolling.
 */
(function () {
  var script = document.currentScript;
  var ORIGIN = script ? new URL(script.src).origin : 'https://construworth-round-1.vercel.app';

  function frames() {
    return Array.prototype.filter.call(document.querySelectorAll('iframe'), function (f) {
      return (f.src || '').indexOf(ORIGIN) === 0;
    });
  }
  function frameFor(win) {
    var list = frames();
    for (var i = 0; i < list.length; i++) if (list[i].contentWindow === win) return list[i];
    return null;
  }
  function viewport() {
    frames().forEach(function (f) {
      if (!f.contentWindow) return;
      var r = f.getBoundingClientRect();
      var top = Math.max(0, -r.top);
      var visible = Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top);
      f.contentWindow.postMessage({ type: 'construworth:viewport', top: top, height: Math.max(visible, 200) }, ORIGIN);
    });
  }
  function prepare() {
    frames().forEach(function (f) {
      f.style.border = '0';
      f.style.display = 'block';
      f.style.width = '100%';
      f.setAttribute('scrolling', 'no');
      if (!f.style.height) f.style.height = '100vh';
      if (location.hash && f.src.indexOf('#') < 0) f.src = f.src + location.hash;
    });
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN || !e.data || e.data.source !== 'construworth') return;
    var f = frameFor(e.source);
    if (!f) return;
    if (e.data.type === 'construworth:height') { f.style.height = e.data.height + 'px'; viewport(); }
    if (e.data.type === 'construworth:ready') viewport();
    if (e.data.type === 'construworth:scrollTo') {
      var offset = parseInt(f.getAttribute('data-cw-offset') || '0', 10);
      window.scrollTo({ top: f.getBoundingClientRect().top + window.pageYOffset + e.data.top - offset, behavior: 'smooth' });
    }
  });
  window.addEventListener('scroll', viewport, { passive: true });
  window.addEventListener('resize', viewport);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare); else prepare();
})();
