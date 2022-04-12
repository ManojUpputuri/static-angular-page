import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor(private http: HttpClient) {
    console.log('hello');

  }

  configureAccess(){
   this.http.get('https://static-angular-page-b7v.pages.dev/hello-world').subscribe(res => {
     console.log('hello2');
     console.log(res);
     
     
   })
  };
}
