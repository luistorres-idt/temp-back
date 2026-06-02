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
- **Autenticación:** Sí. Requiere cabecera `Authorization: Bearer <TOKEN_DE_GATEWAY>` (API Key del Gateway generado en el sistema).

### Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `identificador` | string | Si | Identificador del gateway |
| `data` | array | Si | Array de objetos sensor |

### Objeto sensor (cada elemento del array `data`)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `identificador` | string | Si | Dirección MAC (o identificador único) del dispositivo/sensor |
| `signal.bateria` | number | Si | Nivel de batería |
| `signal.rssi` | number | Si | Intensidad de señal (RSSI) |
| `signal.snr` | number | No | Relación señal/ruido (SNR) (opcional) |
| `data.temperatura` | number | Si | Temperatura de la lectura |
| `data.ambiente` | number | No | Temperatura ambiente (opcional, si se omite se resuelve automáticamente) |
| `data.humedad` | number | No | Humedad relativa (opcional) |

### Ejemplo de Body
```json
{
  "identificador": "GW-001",
  "data": [
    {
      "identificador": "00:1A:2B:3C:4D:5E",
      "signal": {
        "bateria": 85.5,
        "rssi": -70,
        "snr": 10
      },
      "data": {
        "temperatura": -18.5,
        "ambiente": 22.3,
        "humedad": 65.4
      }
    },
    {
      "identificador": "00:1A:2B:3C:4D:5F",
      "signal": {
        "bateria": 92.0,
        "rssi": -65,
        "snr": 12
      },
      "data": {
        "temperatura": -20.1,
        "ambiente": 21.8,
        "humedad": 58.2
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
      "data": { "id": 1, "temperatura": -18.5, "ambiente": 22.3, "humedad": 65.4, ... },
      "infoEstatus": { "id": 1, "bateria": 85.5, "rssi": -70, "snr": 10, ... }
    }
  ]
}
```

### Consideraciones
- Se debe enviar el token de la API Key del gateway en el encabezado de autorización (`Authorization: Bearer <TOKEN_DE_GATEWAY>`).
- El backend verificará de forma segura el hash SHA-256 de la API Key en base de datos.
- El gateway debe coincidir en `identificador` (MAC) con la clave provista y encontrarse con `estatus = true` (activo).
- El `identificador` de cada sensor debe corresponder a la **dirección MAC** de un **Dispositivo** asociado a ese gateway.
- Si algún gateway o dispositivo no se encuentra, la transacción se revierte y no se crea ningún registro.

### Errores
| Código | Descripción |
|--------|-------------|
| 400 | Datos de validación incorrectos o dispositivo no encontrado |
| 401 | Credenciales de gateway no proporcionadas, inválidas, inactivas o que no coinciden con el identificador |
| 404 | Gateway no encontrado |

---

## 🎯 Endpoints Especiales

### 1. Telemetría de un Congelador (GET)
- **Ruta:** `/congeladores/:id/telemetria`
- **Método:** `GET`
- **Query Params:**
  - `modo` (Opcional): `"vivo"` o `"historico"`. Por defecto es `"vivo"`.
  - `fechaInicio` (Opcional, formato ISO 8601): Fecha de inicio para el modo histórico.
  - `fechaFin` (Opcional, formato ISO 8601): Fecha de fin para el modo histórico.
- **Respuesta (200 OK - Modo Vivo):**
  Devuelve el congelador y sus dispositivos asociados junto con sus últimas lecturas.
  ```json
  {
    "congelador": { "id": 5, "nombre": "Congelador 5" },
    "dispositivos": [
      {
        "id": 12,
        "nombre": "Sensor Principal",
        "lecturas": [
          {
            "id": 105,
            "temperatura": -18.5,
            "ambiente": 22.1,
            "creado": "2026-06-02T12:00:00.000Z"
          }
        ]
      }
    ]
  }
  ```

### 2. Monitoreo en Tiempo Real - Stream (SSE) (GET)
- **Ruta:** `/monitoring/telemetria/stream`
- **Método:** `GET`
- **Query Params:**
  - `token` (Requerido): JWT access token de usuario.
- **Descripción:** Establece un canal de eventos unidireccionales (Server-Sent Events) para recibir telemetría en vivo. Las sucursales a monitorear se filtran de forma automática y segura según el JWT del usuario.
- **Detalles:** Ver la [Documentación de SSE](file:///C:/Users/idtTe/Desktop/proyectos/temp/backend/docs/SSE_DOCUMENTATION.md) para más detalles.

### 3. Calcular Resumen Diario de Sucursal (POST)
- **Ruta:** `/reportes/sucursales/:id/calcular`
- **Método:** `POST`
- **Descripción:** Genera el resumen consolidado de mediciones diarias (temperatura promedio, mínima, máxima, mediana) de la sucursal indicada por `:id`.
- **Respuesta (200 OK):**
  ```json
  {
    "mensaje": "Resumen calculado correctamente"
  }
  ```

### 4. Descargar Reporte Excel de Sucursal (GET)
- **Ruta:** `/reportes/sucursales/:id/excel`
- **Método:** `GET`
- **Descripción:** Genera y descarga un archivo binario de Excel (`.xlsx`) con el reporte histórico completo de mediciones de la sucursal indicada por `:id`.
- **Respuesta (200 OK):** Archivo binario `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### 5. Gestión de API Keys para Gateways

Estos endpoints permiten la administración del ciclo de vida de los tokens de autenticación física de los gateways. Requieren autenticación JWT de usuario (Roles: `superusuario`, `administrador`).

#### A. Generar API Key (POST)
Genera una clave criptográfica nueva para el gateway especificado y almacena su hash SHA-256 en la base de datos.
- **Ruta:** `/gateways/:id/token`
- **Método:** `POST`
- **Respuesta (200 OK):**
  ```json
  {
    "mensaje": "API Key generada correctamente",
    "token": "gw_prod_8f3d9b2e7a1c4f5b..."
  }
  ```
  *Nota: La clave (`token`) solo se expone en texto plano en esta respuesta y no se puede recuperar con posterioridad.*

#### B. Revocar/Eliminar API Key (DELETE)
Invalida la clave de acceso asociada al gateway, removiendo su hash de la base de datos. Los dispositivos que transmitan usando esta clave serán rechazados de inmediato.
- **Ruta:** `/gateways/:id/token`
- **Método:** `DELETE`
- **Respuesta (200 OK):**
  ```json
  {
    "mensaje": "API Key eliminada correctamente"
  }
  ```

---

## 🛠️ Códigos de Error Comunes

- `400 Bad Request`: Faltan datos obligatorios o el formato es incorrecto (Ej. validación fallida).
- `401 Unauthorized`: El token expiró, es inválido, o las credenciales de login son incorrectas.
- `403 Forbidden`: El usuario no tiene permisos para realizar la acción.
- `404 Not Found`: El recurso que intentas buscar, actualizar o eliminar no existe.
- `500 Internal Server Error`: Algo salió mal en el servidor backend.
