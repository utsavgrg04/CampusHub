import {Dashboard} from '../components/calendar-widget.js';

export function register(routes,actions){
  routes.dashboard=Dashboard.render;
  actions.dashboard=()=>Dashboard.bind();
}
