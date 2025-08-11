import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { gameGuard } from './guards/game.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/lobby',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
        canActivate: [guestGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
        canActivate: [guestGuard]
    },
    {
        path: 'lobby',
        loadComponent: () => import('./pages/lobby/lobby.component').then(m => m.LobbyComponent),
        canActivate: [authGuard]
    },
    {
        path: 'game/:id',
        loadComponent: () => import('./pages/game/game.component').then(m => m.GameComponent),
        canActivate: [authGuard, gameGuard]
    },
    {
        path: '**',
        redirectTo: '/lobby'
    }
];

