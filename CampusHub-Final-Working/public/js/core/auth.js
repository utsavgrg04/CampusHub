import {state} from './state.js';
import {invalidateRoutes, renderRoute} from '../router.js';
export function createAuthController({api, boot, showAuth, field, setUser}) {
  async function authenticate(mode) {
    try {
      const result = await api(mode, 'POST', {name:field('an'), email:field('ae'), password:field('ap')});
      if(mode==='register'){window.alert('Sign up successful! Please log in.');document.querySelector('#auth-form')?.reset();document.querySelector('#auth-login-tab')?.click();return;}
      setUser(result.user); await boot();
    } catch (error) { const message = document.querySelector('#er'); if (message) message.textContent = error.message; }
  }
  async function logout(notifyServer=true) {
    if(notifyServer)try{await api('logout','POST')}catch{}
    invalidateRoutes(); renderRoute.last = null; localStorage.removeItem('tok'); setUser(null);
    state.events.splice(0); Object.keys(state.byId).forEach(key => delete state.byId[key]); state.position = null;
    state.calendar.sel = null; window.Dashboard?.reset?.();
    window.dispatchEvent(new Event('campushub:logout'));
    document.querySelectorAll('.calendar-modal,.planner-modal').forEach(modal => modal.remove()); showAuth();
  }
  return {authenticate, logout};
}
