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
 * Busca los hijos que tienen el atributo @pulseListItem
 * y los anima con un espacio de 300 ms
 *
 * Ejemplo:
 * <ul [@pulseList]>
 *   <li [@pulseListItem]>yo voy a aparecer animado con un pulso</li>
 *   <li [@pulseListItem]>yo aparezco 300ms después</li>
 * <ul>
 */

export const pulseList =
  trigger('pulseList', [
    transition(':enter', [
      query('@pulseListItem', stagger(300, animateChild()), { optional: true })
      // query('ios-designer-render-body-block', stagger(300, animateChild()), { optional: true })
    ]),
  ]);
