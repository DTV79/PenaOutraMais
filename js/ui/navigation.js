const MAIN_VIEWS=['inicio','numeros','premios','historico','normas'];
export function navigate(target){
  if(!MAIN_VIEWS.includes(target))target='inicio';
  document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id===target));
  const navTarget=target;
  document.querySelectorAll('.nav-item').forEach(item=>{
    const active=item.dataset.go===navTarget;
    item.classList.toggle('active',active);
    if(active)item.setAttribute('aria-current','page');
    else item.removeAttribute('aria-current');
  });
  window.history.replaceState(null,'','#'+target);
  window.scrollTo({top:0,behavior:'smooth'});
}
export function initNavigation(){
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-go]');
    if(!trigger)return;
    navigate(trigger.dataset.go);
  });
  const initial=window.location.hash.slice(1);
  if(MAIN_VIEWS.includes(initial))navigate(initial);
}
