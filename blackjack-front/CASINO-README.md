# 🎰 BlackJack Casino - Frontend

Un frontend moderno de casino desarrollado con Angular 20 y TailwindCSS para conectar con el backend de BlackJack.

## 🚀 Características

### 🎮 Funcionalidades de Casino
- **Autenticación completa** - Login y registro de usuarios
- **Lobby interactivo** - Crear y unirse a mesas de juego
- **Juego en tiempo real** - Partidas de BlackJack con WebSockets
- **Interfaz de casino moderna** - Diseño atractivo con tema de casino
- **Notificaciones en tiempo real** - Sistema de toasts y alerts

### 🃏 Funcionalidades del Juego
- **BlackJack completo** - Reglas tradicionales del 21
- **Multijugador** - Hasta 7 jugadores por mesa
- **Códigos de sala** - Únete fácilmente con códigos de 6 dígitos
- **Estados de juego** - Esperando, activo, terminado
- **Acciones de jugador** - Pedir carta, terminar turno, BlackJack
- **Visualización de cartas** - Componentes de cartas realistas

## 🛠️ Stack Tecnológico

- **Angular 20** - Framework principal con signals
- **TailwindCSS** - Estilado moderno y responsivo
- **Socket.IO** - Comunicación en tiempo real
- **RxJS** - Manejo reactivo de estados
- **TypeScript** - Tipado fuerte
- **Standalone Components** - Arquitectura moderna

## 📁 Estructura del Proyecto

```
src/app/
├── components/           # Componentes reutilizables
│   ├── card/            # Componente de carta
│   ├── player-hand/     # Mano del jugador
│   ├── game-table/      # Mesa de juego
│   ├── loading-spinner/ # Spinner de carga
│   └── toast-notification/ # Notificaciones
├── pages/               # Páginas principales
│   ├── login/          # Página de login
│   ├── register/       # Página de registro
│   ├── lobby/          # Lobby principal
│   └── game/           # Página del juego
├── services/           # Servicios de la aplicación
│   ├── auth.service.ts     # Autenticación
│   ├── game.service.ts     # Gestión de juegos
│   ├── socket.service.ts   # WebSockets
│   ├── notification.service.ts # Notificaciones
│   └── loading.service.ts  # Estados de carga
├── guards/             # Guards de navegación
│   ├── auth.guard.ts       # Protección de rutas
│   └── game.guard.ts       # Validación de juegos
├── interceptors/       # Interceptors HTTP
│   ├── auth.interceptor.ts    # Headers de auth
│   └── loading.interceptor.ts # Loading automático
├── models/            # Interfaces TypeScript
│   ├── auth.model.ts      # Modelos de auth
│   ├── game.model.ts      # Modelos de juego
│   ├── card.model.ts      # Modelos de cartas
│   ├── user.model.ts      # Modelos de usuario
│   └── api.model.ts       # Modelos de API
└── utils/             # Utilidades
    └── card.utils.ts      # Utilidades de cartas
```

## 🎯 Configuración y Uso

### 1. Variables de Entorno

Asegúrate de que las URLs en `src/environments/` coincidan con tu backend:

```typescript
// environment.development.ts
export const environment = {
  production: false,
  apiUrl: 'http://127.0.0.1:3333',      // Backend HTTP
  socketUrl: 'http://127.0.0.1:3334',   // Backend WebSocket
};
```

### 2. Iniciar la Aplicación

```bash
# Instalar dependencias (si es necesario)
npm install

# Iniciar en modo desarrollo
npm run start

# La app estará disponible en http://localhost:4200
```

### 3. Flujo de Usuario

1. **Registro/Login** - Crea una cuenta o inicia sesión
2. **Lobby** - Crea una nueva mesa o únete con un código
3. **Sala de espera** - Espera que otros jugadores se unan
4. **Juego** - Juega BlackJack en tiempo real
5. **Resultado** - Ve quién ganó y reinicia si quieres

## 🎨 Componentes Principales

### CardComponent
Muestra una carta individual con:
- Palo y número/figura
- Colores correctos (rojo/negro)
- Animaciones y efectos hover
- Modo reverso para ocultar cartas

### GameTableComponent
Mesa principal de juego con:
- Todas las manos de jugadores
- Botones de acción
- Estado del juego
- Información en tiempo real

### PlayerHandComponent
Mano individual de jugador:
- Cartas del jugador
- Valor total
- Estados (listo, turno, quemado)
- Información del jugador

## 🔗 Integración con Backend

### Endpoints Utilizados
- `POST /login` - Autenticación
- `POST /register` - Registro
- `POST /games` - Crear juego
- `POST /games/join/:code` - Unirse a juego
- `GET /games/:id` - Obtener juego
- `POST /player-decks/pedir-carta/:id` - Pedir carta
- `POST /player-decks/ready/:id` - Estar listo
- Y más...

### WebSocket Events
- `join` - Unirse a sala de juego
- `gameNotify` - Notificaciones de cambios

## 🎮 Características del Casino

### Tema Visual
- 🎰 **Colores de casino** - Verde, dorado, negro
- 🃏 **Iconografía temática** - Cartas, dados, fichas
- ✨ **Animaciones suaves** - Transiciones y efectos
- 📱 **Diseño responsivo** - Funciona en móvil y desktop

### UX/UI
- **Notificaciones claras** - Éxito, error, info, warning
- **Estados de carga** - Spinners automáticos
- **Validación de formularios** - Feedback inmediato
- **Navegación intuitiva** - Flujo claro de usuario

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run start              # Servidor de desarrollo
npm run build             # Build de producción
npm run watch             # Build automático

# Linting y formato
npm run lint              # Verificar código
npm run format            # Formatear código
```

## 🎯 Próximas Mejoras

- [ ] Estadísticas de jugador
- [ ] Historial de partidas
- [ ] Sistema de ranking
- [ ] Salas privadas
- [ ] Chat en tiempo real
- [ ] Diferentes variantes de BlackJack
- [ ] Modo espectador
- [ ] Sonidos del casino

¡Disfruta jugando BlackJack en tu casino virtual! 🎲✨
