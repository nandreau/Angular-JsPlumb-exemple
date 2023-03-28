
// TODO: Importar modelo real
/*
import {
  DesignerTheme,
} from '../../../../features/designer/models/';
*/
interface DesignerTheme {
  title: string;
  id: string;
  base: string;
  icon: string;
  variations: any[];
}



/**
 * Lista de themes para flow
 * exportada como una variable para ser utilizada estáticamente
 */
export const listThemesFlow: DesignerTheme[] = [
  {
    'title': 'Basic',
    'id': 'basic',
    'base': 'basic-',
    'icon': '/zenkiu/modules/mails/themes/themes/basic/img/icon.png',
    'variations':
      [
        {'colors': ['#337ab7', '#000', '#ededed'], 'file': 'fall'},
        {'colors': ['#941530', '#941530', '#D0C9AD'], 'file': 'winter'},
      ]
  },
  {
    'title': 'Corporate',
    'id': 'corporate',
    'base': '',
    'icon': '/zenkiu/modules/mails/themes/themes/corporate/img/icon.jpg',
    'variations':
      [
        {'colors': ['#E1E7F5', '#203958', '#FFF'], 'file': 'main.css'},
        {'colors': ['#0B3C5D', '#88BBD6', '#155765'], 'file': 'main-2.css'},
        {'colors': ['#0A314B', '#43A16A', '#E7F3F3'], 'file': 'main-3.css'},
        {'colors': ['#7A488E', '#00A5A5', '#3D6F76'], 'file': 'main-4.css'}
      ]
  }
];
