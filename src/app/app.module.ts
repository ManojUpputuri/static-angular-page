import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { HomeComponent } from './home/home.component';
import { AdminComponent } from './admin/admin.component';

const routes: Routes = [
  { path: 'view', component: HomeComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', component: PageNotFoundComponent },
];

@NgModule({
  declarations: [AppComponent, PageNotFoundComponent, HomeComponent],
  imports: [RouterModule.forRoot(routes), BrowserModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
