export function createApi({baseURL, onUnauthorized, showError}) {
  const pending = new Map();
  let csrfPromise;
  const csrfFromCookie=()=>document.cookie.split('; ').find(item=>item.startsWith('ch_csrf='))?.slice(8);
  async function csrf(){let token=csrfFromCookie();if(token)return decodeURIComponent(token);if(!csrfPromise)csrfPromise=fetch('/api/auth/csrf',{credentials:'same-origin'}).then(async r=>{if(!r.ok)throw Error('Could not start a secure session.');const result=await r.json();return result.csrfToken}).finally(()=>{csrfPromise=null});return csrfPromise}
  async function request(path, method, body, stamp) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const headers={'Content-Type':'application/json'};
      if(!['GET','HEAD','OPTIONS'].includes(method))headers['X-CSRF-Token']=await csrf();
      const response = await fetch(baseURL + '/' + path, {method,credentials:'same-origin',signal: controller.signal, headers, body: body === undefined ? undefined : JSON.stringify(body)});
      if (response.status === 401 && !['login','register'].includes(path)) { onUnauthorized?.(); throw Error('Please log in again.'); }
      const text = await response.text(); let json;
      try { json = text ? JSON.parse(text) : null; } catch { throw Error('The server returned an invalid response. Please try again.'); }
      if (!response.ok) throw Error(json?.error || 'The request could not be completed.');
      return json;
    } catch (cause) {
      const error = new Error(cause.name === 'AbortError' ? 'The request timed out. Please try again.' : cause.message || 'The server could not be reached.');
      showError?.(error.message); error.userVisible = Boolean(showError);
      throw error;
    } finally { clearTimeout(timeout); }
  }
  return (path, method = 'GET', body) => {
    const key = JSON.stringify([path, method, body]);
    if (method === 'GET') return request(path, method, body, 0);
    if (pending.has(key)) return pending.get(key);
    const operation = request(path, method, body, 0).finally(() => pending.delete(key));
    pending.set(key, operation); return operation;
  };
}
