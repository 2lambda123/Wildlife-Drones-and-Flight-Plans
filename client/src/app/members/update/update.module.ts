import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { UpdatePage } from './update.page';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
const routes: Routes = [
  {
    path: '',
    component: UpdatePage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LeafletModule,
    RouterModule.forChild(routes)
  ],
  declarations: [UpdatePage]
})
export class UpdatePageModule {}
