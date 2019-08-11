import { Component, OnInit } from '@angular/core';
import { UsersService } from '../../services/users.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.page.html',
  styleUrls: ['./add-user.page.scss'],
})
export class AddUserPage implements OnInit {
  name:string = "";
  surname:string = "";
  jobType:string = "";
  email:string = "";
  password:string = "";
  confirmPassword:string = "";
  error;
  constructor(private userService:UsersService,private router: Router) { }

  ngOnInit() {
  }

  async addUser()
  {
    if(this.name == "" || this.surname == "" || this.email == "" || this.jobType == "" || this.password == "")
    {
      //Dont do anything
      this.error = "Not all fields have been filled";
      
    }
    else if(this.password != this.confirmPassword)
    {
      //Password dont match
      this.error = "Password do not match";
    }
    else{
      //Insert
      const addUser = {
        id:0,
        name:this.name,
        surname:this.surname,
        email:this.email,
        job:this.jobType
      };

      await this.userService.addUser(addUser,this.password);
      this.router.navigate(['users']);
    }
  }

}
