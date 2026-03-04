#  Documentación de la API (Backend Contratiempo)

Bienvenido a la documentación oficial de la API. Esta documentación ha sido diseñada para facilitar el consumo de los endpoints desde el frontend, siguiendo los más altos estándares de desarrollo.

---

## 📌 Información General

- **Base URL:** `http://localhost:3000/api` (por defecto, ajusta según el entorno).
- **Formato de datos:** JSON (`application/json`).
- **Autenticación:** JWT (JSON Web Tokens). Se debe enviar en el header `Authorization` como `Bearer <token>`.

> **Tip para el Frontend Dev:** En la carpeta `docs` tienes un archivo `openapi.yaml`. Puedes importarlo directamente en **Postman**, **Insomnia** o usarlo en **Swagger Editor** (`editor.swagger.io`) para visualizar toda la API de forma interactiva y generar código autocompletado para tu frontend (por ejemplo, con `openapi-generator` o RTK Query).

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
- `data`
- `info-estatus`

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

## 🛠️ Códigos de Error Comunes

- `400 Bad Request`: Faltan datos obligatorios o el formato es incorrecto (Ej. validación fallida).
- `401 Unauthorized`: El token expiró, es inválido, o las credenciales de login son incorrectas.
- `403 Forbidden`: El usuario no tiene permisos para realizar la acción.
- `404 Not Found`: El recurso que intentas buscar, actualizar o eliminar no existe.
- `500 Internal Server Error`: Algo salió mal en el servidor backend.

¡Cualquier duda, el `openapi.yaml` es tu mejor amigo como fuente de la verdad para conocer exactamente qué propiedades lleva cada modelo!
