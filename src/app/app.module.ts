import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';


import { AppComponent } from './app.component';
import { FlowBaseBlockComponent } from './blocks/flow-base-block.component';
import { FlowActionBlockComponent } from './blocks/flow-action-block/flow-action-block.component';
import { FlowNodeBlockComponent } from './blocks/flow-node-block/flow-node-block.component';
import { FlowSignalBlockComponent } from './blocks/flow-signal-block/flow-signal-block.component';
import { PlumbService } from './plumb.service';
import { DesignerRenderComponent } from './designer-render/designer-render.component';
import { BlockStoreService } from './block-store.service';
import { DesignerRenderBodyComponent } from './designer-render/designer-render-body/designer-render-body.component';
import { DesignerRenderBodyBlockComponent } from './designer-render/designer-render-body/designer-render-body-block/designer-render-body-block.component';
import { DesignerBlockRowFragmentComponent } from './designer-render/designer-render-body/designer-render-body-block/designer-block-row-fragment/designer-block-row-fragment.component';
import { FlowNoteBlockComponent } from './blocks/flow-note-block/flow-note-block.component';
import { FlowStartBlockComponent } from './blocks/flow-start-block/flow-start-block.component';
import { FlowEndBlockComponent } from './blocks/flow-end-block/flow-end-block.component';
import { ThemeManagerService } from './theme-manager.service';
import { SafeStylePipe } from './safe-style.pipe';

@NgModule({
  imports:      [ BrowserModule, FormsModule, BrowserAnimationsModule, FontAwesomeModule ],
  declarations: [
    AppComponent,
    // FlowBaseBlockComponent,
    FlowActionBlockComponent,
    FlowNodeBlockComponent,
    FlowSignalBlockComponent,
    DesignerRenderComponent,
    DesignerRenderBodyComponent,
    DesignerRenderBodyBlockComponent,
    DesignerBlockRowFragmentComponent,
    FlowNoteBlockComponent,
    FlowStartBlockComponent,
    FlowEndBlockComponent,
    SafeStylePipe ],
  entryComponents: [
    // FlowBaseBlockComponent,
    FlowActionBlockComponent,
    FlowNodeBlockComponent,
    FlowSignalBlockComponent,
    FlowNoteBlockComponent,
    FlowStartBlockComponent,
    FlowEndBlockComponent,
  ],
  bootstrap:    [ AppComponent ],
  providers: [PlumbService, BlockStoreService, ThemeManagerService]
})
export class AppModule { }
