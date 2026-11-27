/** Callbacks are authored in the harness. Runtime data travels as CDP arguments. */
export function browserCall(objectId, callback, values, returnByValue = true) {
  return {
    objectId,
    functionDeclaration: Function.prototype.toString.call(callback),
    arguments: values.map(value => ({ value })),
    awaitPromise: true,
    returnByValue,
  };
}

/** Keep classifications only, never a raw URL, header, request body or response. */
export function classifyRequest(base, request) {
  const url = new URL(request.url);
  const http = url.protocol === 'http:' || url.protocol === 'https:';
  const sameOrigin = url.origin === base;
  return {
    http,
    sameOrigin,
    readOnly: ['GET', 'HEAD'].includes(request.method) && !request.hasPostData && !request.postData,
    staticResource: !url.search && !url.hash && !url.username && !url.password &&
      /^\/$|^\/(?:favicon\.(?:ico|svg)|brand-mark\.svg)$|^\/fonts\/geist-latin(?:-ext)?\.woff2$|^\/assets\/[A-Za-z0-9_.-]+\.(js|css)$/.test(url.pathname),
    plotly: url.pathname.includes('plotly-basic'),
    excel: /exceljs(?:\.min|-browser)/.test(url.pathname),
    oldExcel: url.pathname.includes('exceljs.min'),
  };
}

export function inspectHeaders(headers) {
  const values = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  const csp = String(values.get('content-security-policy') ?? '');
  return {
    standard: csp.includes("connect-src 'none'") && csp.includes("frame-ancestors 'none'")
      && values.get('x-frame-options') === 'DENY' && values.get('x-content-type-options') === 'nosniff'
      && values.get('referrer-policy') === 'no-referrer' && Boolean(values.get('permissions-policy')),
    crossOrigin: values.get('cross-origin-opener-policy') === 'same-origin'
      && values.get('cross-origin-resource-policy') === 'same-origin',
  };
}
