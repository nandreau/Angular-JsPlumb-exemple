import {
  animate,
  animateChild,
  query,
  stagger,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
/**
 * Animación para ser usada en las metadata de los componentes
 * Inspirada en
 * {@link https://medium.com/google-developer-experts/angular-applying-motion-principles-to-a-list-d5cdd35c899e}
 *
 * Esto anima cada elemento en la lista.
 * Si quieres que aparezcan animados al principio
 * utiliza también pulse-list
 *
 * Ejemplo:
 * <ul [@pulseList]>
 *   <li [@pulseListItem]>yo voy a aparecer animado con un pulso</li>
 *   <li [@pulseListItem]>yo aparezco 300ms después</li>
 * <ul> 
*/
export const pulseListItem =
  // trigger name for attaching this animation to an element using the [@triggerName] syntax
  trigger('pulseListItem', [
    // route 'enter' transition
    transition(':enter', [
        style({transform: 'scale(0.5)', opacity: 0 }),  // initial
        animate('500ms cubic-bezier(.8, -0.6, 0.2, 1.5)',
          style({ transform: 'scale(1)', opacity: 1 }))  // final
      ]),
    transition(':leave', [
      style({ transform: 'scale(1)', opacity: 1, height: '*' }),
      animate('500ms cubic-bezier(.8, -0.6, 0.2, 1.5)',
       style({
         transform: 'scale(0.5)', opacity: 0,
         height: '0px', /*margin: '0px'*/
       }))
    ])
  ]);



