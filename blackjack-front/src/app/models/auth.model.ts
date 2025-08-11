import { IUser } from './user.model';

export interface LoginModel {
    email: string;
    password: string;
}

export interface RegisterModel {
    fullName: string;
    email: string;
    password: string;
}