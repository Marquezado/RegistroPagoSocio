# Club Atenas

## Sistema de Gestión de Socios y Pagos

Sistema web completo para la administración de socios de un club, que permite registrar socios, consultar estados de cuenta, calcular intereses por mora, registrar pagos y generar recibos en PDF de forma automática.

---

## 🚀 Características Principales

- 🔐 Login seguro para administradores
- 👤 Registro de nuevos socios
- 📊 Consulta de estado de cuenta con cálculo automático de intereses por mora (2% mensual)
- 💳 Registro de pagos (totales o adelantados)
- 🧾 Generación automática de recibos en PDF descargables
- 🎨 Diseño moderno y responsive con Bootstrap 5
- 💬 Interfaz intuitiva con mensajes claros y feedback al usuario

---

## 🛠️ Tecnologías Utilizadas

**Backend**

- Node.js
- Express.js

**Base de Datos**

- MySQL

**Frontend**

- HTML5
- CSS3 (Bootstrap 5)
- JavaScript (Vanilla)

**Otras Herramientas**

- Generación de PDF: PDFKit
- Autenticación: express-session + bcrypt
- Íconos: Bootstrap Icons

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

- Node.js (v14 o superior)
- MySQL (v8 o superior)

```
DROP DATABASE club_atenas;
CREATE DATABASE IF NOT EXISTS club_atenas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE club_atenas;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE socios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(8) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    tipo_socio ENUM('Ordinario', 'Vitalicio', 'Honorario') DEFAULT 'Ordinario',
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    fecha_registro DATE DEFAULT (CURRENT_DATE)
);

CREATE TABLE facturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    monto_base DECIMAL(10,2) NOT NULL,
    estado ENUM('pendiente', 'pagado', 'parcial') DEFAULT 'pendiente',
    FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE
);

CREATE TABLE detalle_factura (
    id INT AUTO_INCREMENT PRIMARY KEY,
    factura_id INT NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
);


CREATE TABLE pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socio_id INT NOT NULL,
    fecha_pago DATE DEFAULT (CURRENT_DATE),
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia') NOT NULL,
    tipo_pago ENUM('normal', 'adelantado') DEFAULT 'normal',
    recibo_num VARCHAR(50) UNIQUE,
    FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE
);

CREATE TABLE pago_factura (
    pago_id INT NOT NULL,
    factura_id INT NOT NULL,
    monto_aplicado DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (pago_id, factura_id),
    FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE CASCADE,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
);


CREATE INDEX idx_factura_socio_estado ON facturas(socio_id, estado);
CREATE INDEX idx_detalle_factura_id ON detalle_factura(factura_id);
CREATE INDEX idx_pago_factura_pago ON pago_factura(pago_id);
CREATE INDEX idx_pago_factura_factura ON pago_factura(factura_id);

INSERT INTO usuarios (email, password_hash)
VALUES ('Carlos@clubatenas.pe', '$2b$10$z5f3f3f3f3f3f3f3f3f3fuExampleHash1234567890'); -- Cambiaremos el hash real después

-- actualizamos la contraseña del usuario administrativo
UPDATE usuarios
SET password_hash = '$2b$10$UQKoLwF7DnXwyfJaBicweumIEK.ptisifopt7L.dqig8j42AVYOnG'
WHERE email = 'Carlos@clubatenas.pe';


INSERT IGNORE INTO socios (dni, nombre, telefono, tipo_socio, estado) VALUES
('71234567', 'Carlos Gala', '973961124', 'Ordinario', 'activo'),
('70000001', 'María Pérez Prueba','999111222', 'Ordinario', 'activo');


INSERT INTO facturas (socio_id, fecha_emision, fecha_vencimiento, monto_base, estado) VALUES
((SELECT id FROM socios WHERE dni='71234567'), '2025-01-01', '2025-01-31', 300, 'pendiente'),
((SELECT id FROM socios WHERE dni='70000001'), '2025-02-01', '2025-02-28', 300, 'pendiente');


INSERT INTO detalle_factura (factura_id, concepto, monto) VALUES
(1, 'Cuota enero 2025', 300.00),
(1, 'Interés mora 2 meses', 12.00),
(2, 'Cuota febrero 2025', 300.00),
(2, 'Interés mora 1 mes', 6.00);

select * from usuarios;
select * from socios;
select * from facturas;
select * from detalle_factura;


```

- Un navegador web moderno

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
