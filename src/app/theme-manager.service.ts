import {
  Injectable
} from '@angular/core';

import {
  find,
} from 'lodash';

/**
 * Definición de los themes soportados
 */
import themesDefinitions from './themes/themes';

/**
 * Servicio para manipular los themes que utilizan
 * custom properties para definir sus propiedades
 * 
 * Se tiene una lista de themes y luego se usan
 * variables css (custom properties) para establecer los valores
 * 
 * Este servicio sólo se encarga de buscar en la lista
 * y devolver la lista de propiedades separadas por ';'
 * 
 * Para usarlo en un componente:
 * [attr.style] = "properties | safeStyle"
 * 
 * Dónde properties es el valor retornado por getThemeProperties
 */
@Injectable()
export class ThemeManagerService {

  constructor() { }

  /**
   * Busca la definición en el theme en la lista
   */
  getThemeDefinition(themeCss: string){
    const definition = find(themesDefinitions, t => t.id === themeCss);
    if (!definition) {
      console.warn('Not definition found for themeCss=', themeCss);
      /** Retornamos el primer theme definido */
      return themesDefinitions[0];
    }
    /** Retorna la definition encontrada */
    return definition;
  }
  /**
   * Retorna las custom css properties de un theme
   */
  getThemeProperties(themeCss: string) {
    const definition = this.getThemeDefinition(themeCss);
    
    const result = [];
    Object.keys(definition.properties).forEach( (k) => {
      result.push(`${k}: ${definition.properties[k]}`);
    })
    return result.join('; ');
  }
}