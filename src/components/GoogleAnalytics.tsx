import Script from "next/script";

/**
 * Third-party analytics & verification scripts.
 *
 * Behaviour:
 *   - GA4 (Google Analytics 4): rendered when NEXT_PUBLIC_GA_ID is set.
 *     Uses the standard gtag.js snippet via next/script.
 *   - Bing UET (Universal Event Tracking): rendered when NEXT_PUBLIC_BING_UET_ID
 *     is set. Tracks site visits that Bing Ads can attribute to ad clicks.
 *
 * Both scripts use `strategy="afterInteractive"` so they never block first
 * paint. If neither ID is configured the component returns null and the page
 * payload stays clean.
 *
 * IDs are public (NEXT_PUBLIC_*) — they are not secrets, but they do identify
 * the property in the analytics dashboard so they should not be hard-coded
 * into the source.
 */
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const bingUetId = process.env.NEXT_PUBLIC_BING_UET_ID;

  if (!gaId && !bingUetId) return null;

  return (
    <>
      {/* ===== Google Analytics 4 ===== */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                send_page_view: true,
              });
            `}
          </Script>
        </>
      )}

      {/* ===== Bing UET (Universal Event Tracking) =====
          Microsoft's first-party ad attribution. Standard bat.js loader
          followed by a config event so the tag starts recording immediately. */}
      {bingUetId && (
        <>
          <Script id="bing-uet-loader" strategy="afterInteractive">
            {`
              (function(w,d,t,r,u){
                var f,n,i;w[u]=w[u]||[],f=function(){
                  var e={log:function(){
                    var s=Array.prototype.slice.call(arguments);
                    s.unshift("[Bing UET]");console?s.unshift("[Bing UET]"):console.log(s.join(" "));
                  }
                  return e;
                };
                w[u]=f;n=d.createElement(t),n.src=r,n.async=1;
                n.onload=n.onreadystatechange=function(){
                  var s=this.readyState;
                  s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)
                };
                i=d.getElementsByTagName(t)[0];
                i.parentNode.insertBefore(n,i)
              })(window,document,"script","https://bat.bing.com/bat.js","uetq");
            `}
          </Script>
          <Script id="bing-uet-config" strategy="afterInteractive">
            {`
              window.uetq = window.uetq || [];
              window.uetq.push('config', '${bingUetId}');
              window.uetq.push('event', '', { 'revenue_value': 0, 'currency': 'USD' });
            `}
          </Script>
        </>
      )}
    </>
  );
}