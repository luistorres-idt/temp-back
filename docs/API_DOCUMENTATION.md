#  Documentación de la API (Backend Contratiempo)

Bienvenido a la documentación oficial de la API. Esta documentación ha sido diseñada para facilitar el consumo de los endpoints desde el frontend, siguiendo los más altos estándares de desarrollo.

---

## 📌 Información General

- **Base URL:** `http://localhost:3000/api` (por defecto, ajusta según el entorno).
- **Formato de datos:** JSON (`application/json`).
- **Autenticación:** JWT (JSON Web Tokens). Se debe enviar en el header `Authorization` como `Bearer <token>`.

> **Tip para el Frontend Dev:** En la carpeta `docs` tienes un archivo postman collection para importar en postman.

---

## 🔐 Autenticación

Todos los endpoints estandarizados (CRUD) requieren que el usuario esté autenticado.

### Login
- **URL:** `/autenticacion/login`
- **Método:** `POST`
- **Auth Requerida:** No

**Body:**
```json
{
  "correo": "usuario@ejemplo.com",
  "password": "Mypassword123!"
}
```

**Respuesta Exitosa (200 OK):**
```json
{
  "mensaje": "Sesión iniciada correctamente",
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

> ⚠️ Debes guardar el `accessToken` e inyectarlo en las futuras peticiones en el header:
> `Authorization: Bearer eyJhbG...`

---

## ⚙️ Estructura de Endpoints de Datos (CRUD)

La API cuenta con un enrutador generador de CRUD, lo que significa que **todas las entidades principales** comparten los siguientes 4 endpoints estándar. 

### Entidades Disponibles
Puedes reemplazar `:entidad` en las rutas de abajo por cualquiera de los siguientes recursos:
- `acciones`
- `modulos`
- `operaciones`
- `perfiles`
- `usuarios`
- `clientes`
- `sucursales`
- `secciones`
- `congeladores`
- `gateways`
- `dispositivos`
- `data` *(POST tiene formato especial, ver abajo)*
- `info-estatus` *(se crea automáticamente al registrar data)*

---

### 1. Obtener Lista de Elementos (GET)
- **Ruta:** `/:entidad`
- **Método:** `GET`
- **Query Params Soportados:** (Para paginación y filtros dinámicos, consulta con el backend qué campos están habilitados o envía `?page=1&limit=10`).

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Ejemplo",
      "creado": "2024-02-26T10:00:00Z",
      "actualizado": "2024-02-26T10:00:00Z",
      "estatus": true
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### 2. Obtener un Elemento por ID (GET)
- **Ruta:** `/:entidad/:id`
- **Método:** `GET`

**Respuesta:**
```json
{
  "id": 1,
  "nombre": "Ejemplo",
  "creado": "2024-02-26T10:00:00Z",
  "actualizado": "2024-02-26T10:00:00Z",
  "estatus": true
}
```

### 3. Crear un Elemento (POST)
- **Ruta:** `/:entidad`
- **Método:** `POST`
- **Body:** Dependerá de la entidad. Revisa el `openapi.yaml` para ver los atributos obligatorios de cada una.

**Body (Ejemplo para un Módulo):**
```json
{
  "nombre": "Inventario"
}
```

**Respuesta:** Devuelve el objeto creado con su nuevo `id`.

### 4. Actualizar un Elemento (PATCH)
- **Ruta:** `/:entidad/:id`
- **Método:** `PATCH`
- **Body:** Envía únicamente los campos que deseas actualizar.

**Body:**
```json
{
  "estatus": false
}
```

**Respuesta:** Devuelve el objeto actualizado.

---

## 🌡️ Registro de Lecturas (POST /data) - Formato Especial

El endpoint `POST /api/data` **no sigue el CRUD estándar**. Recibe un payload enviado por el gateway con las lecturas de múltiples sensores y crea registros en las tablas `Data` e `InfoEstatus` automáticamente dentro de una transacción atómica.

- **Ruta:** `/data`
- **Método:** `POST`

### Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `identificador` | string | Si | Identificador del gateway |
| `data` | array | Si | Array de objetos sensor |

### Objeto sensor (cada elemento del array `data`)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `identificador` | string | Si | Nombre del dispositivo/sensor |
| `signal.bateria` | number | Si | Nivel de batería |
| `signal.rssi` | int | Si | Intensidad de señal (RSSI) |
| `signal.snr` | int | Si | Relación señal/ruido (SNR) |
| `data.temperatura` | number | Si | Temperatura de la lectura |
| `data.ambiente` | number | Si | Temperatura ambiente |

### Ejemplo de Body
```json
{
  "identificador": "GW-001",
  "data": [
    {
      "identificador": "SENSOR-01",
      "signal": {
        "bateria": 85.5,
        "rssi": -70,
        "snr": 10
      },
      "data": {
        "temperatura": -18.5,
        "ambiente": 22.3
      }
    },
    {
      "identificador": "SENSOR-02",
      "signal": {
        "bateria": 92.0,
        "rssi": -65,
        "snr": 12
      },
      "data": {
        "temperatura": -20.1,
        "ambiente": 21.8
      }
    }
  ]
}
```

### Respuesta Exitosa (201)
```json
{
  "mensaje": "El registro se ha creado exitosamente",
  "data": [
    {
      "data": { "id": 1, "temperatura": -18.5, "ambiente": 22.3, ... },
      "infoEstatus": { "id": 1, "bateria": 85.5, "rssi": -70, "snr": 10, ... }
    }
  ]
}
```

### Consideraciones
- El `identificador` raíz debe corresponder a un **Gateway** registrado y activo en el sistema.
- El `identificador` de cada sensor debe corresponder al **nombre** de un **Dispositivo** asociado a ese gateway.
- Si algún gateway o dispositivo no se encuentra, la transacción se revierte y no se crea ningún registro.

### Errores
| Código | Descripción |
|--------|-------------|
| 400 | Datos de validación incorrectos o dispositivo no encontrado |
| 404 | Gateway no encontrado |

---

## 🛠️ Códigos de Error Comunes

- `400 Bad Request`: Faltan datos obligatorios o el formato es incorrecto (Ej. validación fallida).
- `401 Unauthorized`: El token expiró, es inválido, o las credenciales de login son incorrectas.
- `403 Forbidden`: El usuario no tiene permisos para realizar la acción.
- `404 Not Found`: El recurso que intentas buscar, actualizar o eliminar no existe.
- `500 Internal Server Error`: Algo salió mal en el servidor backend.
