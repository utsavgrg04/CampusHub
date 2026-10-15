const icon=(name,size=22)=>{
  const paths={
    checklist:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/><path d="m6.5 8 .7.7L8.5 7m-2 5 .7.7 1.3-1.7m-2 5 .7.7 1.3-1.7"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    trash:'<path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||''}</svg>`;
};

function heroArt(){return `<svg class="tasks-hero-art" viewBox="0 0 850 190" preserveAspectRatio="xMaxYMax meet" aria-hidden="true"><path fill="#fff" opacity=".78" d="M75 68q22-38 48 0 26-34 54 0H75m210-24q18-31 42 0 25-29 48 0h-90m330 27q21-35 47 0 26-31 50 0h-97m99-21q19-31 42 0 24-28 46 0h-88"/><path fill="#e5efb5" d="M0 162q112-49 218 0t211 0q108-48 216 0t205 0v28H0z"/><g fill="#77aaa3"><path d="M60 190q-18-69 11-118 31 59 13 118m75 0q-16-59 11-100 28 51 14 100m456 0q-18-78 12-125 32 60 14 125m77 0q-14-62 13-103 29 54 15 103m67 0q-18-88 12-145 38 72 15 145"/><path d="M72 190V74m70 116V94m467 96V68m75 122V91m66 99V48" stroke="#4c9690" stroke-width="4"/></g><g transform="translate(364 28)"><path fill="#8eb6ed" d="M0 162V70h212v92zm-15-92L106 9 227 70z"/><path fill="#e8f1ff" d="M16 81h29v33H16zm49 0h30v33H65zm51 0h30v33h-30zm51 0h29v33h-29zM17 126h28v27H17zm47 0h31v27H64zm52 0h31v27h-31zm51 0h29v27h-29z"/><path fill="#fff" d="M89 162v-39q0-20 18-20t18 20v39z"/><circle cx="106" cy="64" r="9" fill="#6698df"/><path fill="#fff" d="M104 63h4v3h-4z"/><path fill="#8eb6ed" d="M105 24V3h5v21m0-20h41l-41 23z"/></g></svg>`}
function flightArt(){return `<svg class="tasks-flight-art" viewBox="0 0 360 130" aria-hidden="true"><path d="M8 93c36-36 71 17 106-4 30-18 40-72 83-60 30 8 21 48 52 43 26-4 39-35 74-34" fill="none" stroke="#85b4ff" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 7"/><path d="m321 23 30-10-18 26-5-9-11 7 4-13z" fill="#78aaff" stroke="#6598ec" stroke-width="1.5" stroke-linejoin="round"/><path d="m195 7 2 7m-12-2 5 5m18-13-1 8m43 37 2 7m-8-3 5 1m8-8-1 5" fill="none" stroke="#ffc94f" stroke-width="2.5" stroke-linecap="round"/></svg>`}
function dueLabel(value){if(!value)return 'No due date';const date=new Date(`${value}T00:00:00`);if(Number.isNaN(date.getTime()))return value;return date.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}
function countdown(value,done){if(done)return 'Completed';if(!value)return 'No due date';const due=new Date(`${value}T00:00:00`);if(Number.isNaN(due.getTime()))return '';const now=new Date();now.setHours(0,0,0,0);const days=Math.round((due-now)/86400000);if(days<0)return 'Overdue';if(days===0)return 'Due today';if(days===1)return 'Due tomorrow';return `in ${days} days`}

export function register(R,A){
  R.tasks=async()=>{
    const tasks=await items('task');
    tasks.sort((a,b)=>(!!a.done-!!b.done)||(a.due||'9999-12-31').localeCompare(b.due||'9999-12-31'));
    const taskRows=tasks.map(t=>{
      const pri=(t.pri||'Medium').toLowerCase();
      const status=countdown(t.due,t.done);
      return `<article class="task-card ${t.done?'is-done':''}" data-task-row data-title="${esc(t.title).toLowerCase()}" data-due="${esc(t.due||'')}" data-priority="${esc(pri)}">${flightArt()}
        <div class="task-icon-tile"><span>${icon('checklist',38)}</span><label class="task-check-toggle" aria-label="Mark ${esc(t.title)} ${t.done?'incomplete':'complete'}"><input type="checkbox" ${t.done?'checked':''} onchange="patch(${t.id},{done:this.checked})"><i>${icon('check',13)}</i></label></div>
        <div class="task-details"><h2>${esc(t.title)}</h2><p class="task-description">${esc(t.description||'Keep this task moving and make time for the next step.')}</p><div class="task-meta"><span class="task-priority ${['high','medium','low'].includes(pri)?pri:'medium'}">${esc(t.pri||'Medium')} priority</span>${t.due?`<span>${icon('calendar',18)}${esc(dueLabel(t.due))}</span>`:''}</div><span class="task-countdown ${t.done?'complete':''} ${status==='Overdue'?'overdue':''}">${esc(status)}</span></div>
        <div class="task-actions"><button class="task-delete" type="button" aria-label="Delete ${esc(t.title)}" onclick="deleteTask(${t.id})">${icon('trash',18)}<span>Delete task</span></button><button class="task-expand" type="button" aria-label="Show details for ${esc(t.title)}" aria-expanded="false" onclick="toggleTaskDetails(this)">${icon('chevron',18)}</button></div>
        <div class="task-note-panel"><label>Task notes<textarea maxlength="500" data-task-note placeholder="Add details, links, or a reminder...">${esc(t.description||'')}</textarea></label><button type="button" onclick="saveTaskNote(${t.id},this)">Save details</button></div>
      </article>`;
    }).join('');
    return `<div class="tasks-page"><section class="tasks-hero"><div class="tasks-hero-copy"><h1>To-Do Tasks</h1><p>Stay organized and never miss what matters!</p></div>${heroArt()}</section>
      <section class="tasks-list-area" aria-label="Your tasks"><div class="tasks-toolbar"><label class="task-filter-search">${icon('search',18)}<input id="task-search" type="search" placeholder="Search tasks..." aria-label="Search tasks" oninput="filterTasks()"></label><label class="task-filter-date">${icon('calendar',18)}<input id="task-date-filter" type="date" aria-label="Filter by due date" onchange="filterTasks()"></label><select id="task-priority-filter" aria-label="Filter by priority" onchange="filterTasks()"><option value="">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><button type="button" onclick="toggleTaskCreate()">${icon('plus',17)} Add task</button></div>
      <form id="task-create" class="task-create" hidden onsubmit="event.preventDefault();addTask()"><input id="tt" type="text" maxlength="120" placeholder="New task title" aria-label="New task title" required><input id="td" type="date" aria-label="Task due date"><select id="tp" aria-label="Task priority"><option>High</option><option selected>Medium</option><option>Low</option></select><button type="submit">${icon('plus',17)} Save task</button></form>
      <div class="task-list">${taskRows||'<div class="task-empty"><span>'+icon('checklist',30)+'</span><h2>You’re all caught up</h2><p>Add a task above to keep your next steps in view.</p></div>'}</div><p class="task-filter-empty" hidden>No tasks match these filters.</p></section></div>`;
  };
  const addTask=async()=>{const title=v('tt').trim();if(!title)return;await add('task',{title,due:v('td'),pri:v('tp'),done:false,description:''});render()};
  const deleteTask=async(id)=>{await del(id)};
  const filterTasks=()=>{const q=(document.querySelector('#task-search')?.value||'').trim().toLowerCase(),date=document.querySelector('#task-date-filter')?.value||'',priority=document.querySelector('#task-priority-filter')?.value||'';let shown=0;document.querySelectorAll('[data-task-row]').forEach(row=>{const visible=row.dataset.title.includes(q)&&(!date||row.dataset.due===date)&&(!priority||row.dataset.priority===priority);row.hidden=!visible;if(visible)shown++});const empty=document.querySelector('.task-filter-empty');if(empty)empty.hidden=shown>0||!document.querySelector('[data-task-row]')};
  const toggleTaskDetails=(button)=>{const row=button.closest('.task-card'),open=row.classList.toggle('details-open');button.setAttribute('aria-expanded',String(open))};
  const saveTaskNote=async(id,button)=>{const description=button.closest('.task-card').querySelector('[data-task-note]').value.trim();await patch(id,{description})};
  const toggleTaskCreate=()=>{const form=document.querySelector('#task-create');form.hidden=!form.hidden;if(!form.hidden)form.querySelector('#tt').focus()};
  Object.assign(window,{addTask,deleteTask,filterTasks,toggleTaskDetails,saveTaskNote,toggleTaskCreate});
}
