# Club Atenas

## Sistema de Gestión de Socios y Pagos

Sistema web completo para la administración de socios de un club, que permite registrar socios, consultar estados de cuenta, calcular intereses por mora, registrar pagos y generar recibos en PDF de forma automática.

---

## 🚀 Características Principales

* 🔐 Login seguro para administradores
* 👤 Registro de nuevos socios
* 📊 Consulta de estado de cuenta con cálculo automático de intereses por mora (2% mensual)
* 💳 Registro de pagos (totales o adelantados)
* 🧾 Generación automática de recibos en PDF descargables
* 🎨 Diseño moderno y responsive con Bootstrap 5
* 💬 Interfaz intuitiva con mensajes claros y feedback al usuario

---

## 🛠️ Tecnologías Utilizadas

**Backend**

* Node.js
* Express.js

**Base de Datos**

* MySQL

**Frontend**

* HTML5
* CSS3 (Bootstrap 5)
* JavaScript (Vanilla)

**Otras Herramientas**

* Generación de PDF: PDFKit
* Autenticación: express-session + bcrypt
* Íconos: Bootstrap Icons

---

## 📁 Estructura del Proyecto

```
club-atenas/
├── server.js                     # Archivo principal del servidor
├── package.json
├── .env                          # Variables de entorno
│
├── config/
│   └── db.js                     # Conexión a MySQL
│
├── controllers/
│   └── pagoController.js         # Lógica de pagos y estado de cuenta
│
├── routes/
│   ├── auth.js                   # Rutas de autenticación
│   ├── pagos.js                  # Rutas de pagos y estado de cuenta
│   └── socios.js                 # Rutas de registro de socios
│
├── public/
│   ├── html/                     # Páginas HTML
│   │   ├── login.html
│   │   ├── menu.html
│   │   ├── estado-cuenta.html
│   │   ├── registrar-pago.html
│   │   └── registrar-socio.html
│   └── recibos/                  # Recibos PDF generados automáticamente
│
├── utils/
│   └── pdfGenerator.js           # Generador de recibos PDF
└── views/
```

---

## 📋 Requisitos Previos

* Node.js (v14 o superior)
* MySQL (v8 o superior)
* Un navegador web moderno

---

## ⚙️ Instalación

1. Clona el repositorio o descarga los archivos del proyecto.
2. Abre una terminal en la carpeta raíz del proyecto.
3. Instala las dependencias:

```bash
pnpm install
```

4. Crea una base de datos en MySQL llamada:

```sql
club_atenas
```

5. Ejecuta el script SQL correspondiente para crear las tablas necesarias.
6. Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```env
DB_HOST=localhost
DB_USER=declarar_variable
DB_PASS=declarar_variable
DB_NAME=club_atenas
SESSION_SECRET=declarar_variable
PORT=3000
```

---

## ▶️ Ejecución del Proyecto

Inicia el servidor en modo desarrollo:

```bash
pnpm run dev
```

Luego, abre tu navegador y accede a:

```
http://localhost:3000
```

---

## 📄 Licencia

Proyecto con fines académicos y/o educativos.

---

## ✨ Autor

Desarrollado por el Grupo 4 como sistema de gestión para el **Club Atenas**.
