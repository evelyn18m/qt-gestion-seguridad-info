# Estado del Proyecto — SGSI Platform (Quito Turismo)

> **Última actualización:** 2026-05-22  
> **Sesión actual:** En progreso

---

## 1. Resumen General

Aplicación web para la **Gestión de Seguridad de la Información (SGSI)** de Quito Turismo. Permite:

- Administrar catálogos maestros (amenazas, vulnerabilidades, impactos, formatos, procesos, riesgos, etc.).
- Realizar **Valoración de Activos** con evaluación CIA (Confidencialidad, Integridad, Disponibilidad).
- Ejecutar **Análisis de Riesgo** con evaluación y tratamiento de riesgos.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Nuxt 3 (Vue 3, TypeScript, SSR) — puerto 3000 |
| **Backend** | NestJS 11 (TypeScript, Express) — puerto 3001 |
| **ORM / DB** | Prisma 7.8 + `@prisma/adapter-mariadb` + MySQL/MariaDB |
| **Auth** | `nuxt-oidc-auth` (Keycloak) |
| **Excel** | `xlsx` (lectura de catálogos desde Excel) |
| **Testing** | Jest 30 + ts-jest + Supertest |

---

## 3. Estructura del Proyecto

```
qt-gestionseguridadinformacion/
├── frontend/                    # Nuxt 3 app
│   ├── layouts/
│   │   └── default.vue          # Sidebar + top banner + auth
│   ├── pages/
│   │   ├── index.vue            # Landing
│   │   ├── inicio.vue           # Dashboard de bienvenida
│   │   ├── catalogos.vue        # CRUD genérico de catálogos
│   │   ├── valoracion.vue       # Valoración de Activos (4 pestañas)
│   │   └── analisis-riesgo.vue  # (ELIMINADO) Tabla de Análisis de Riesgo
│   └── package.json
│
├── backend/                     # NestJS app
│   ├── src/
│   │   ├── main.ts              # Entry point (puerto 3001)
│   │   ├── app.module.ts        # Root module
│   │   ├── prisma/
│   │   │   └── prisma.service.ts # Prisma client con MariaDB adapter
│   │   ├── catalogos/           # CRUD genérico de 13 catálogos
│   │   └── valoraciones/        # ValoracionActivo endpoints
│   ├── prisma/
│   │   ├── schema.prisma        # 15 modelos (ver sección 5)
│   │   └── seed.ts              # Carga catálogos.json a MySQL
│   └── package.json
│
└── ESTADO_DEL_PROYECTO.md       # <-- Este archivo
```

---

## 4. Estado Actual — ¿Qué funciona?

### Backend (NestJS)
- [x] Servidor levantado en `http://localhost:3001`
- [x] Prisma conectado a MySQL/MariaDB (`sgsi_db`)
- [x] Seed de catálogos desde `catalogos.json`
- [x] CRUD genérico de catálogos (`/catalogos/{tipo}`)
- [x] Módulo `valoraciones` (POST, PATCH, DELETE, GET con relaciones)

### Frontend (Nuxt)
- [x] Layout con sidebar, top banner y logout
- [x] Auth OIDC con Keycloak
- [x] Dashboard de inicio con estadísticas
- [x] CRUD genérico de catálogos (13 tablas)
- [x] **Valoración de Activos**
  - [x] Tabla simplificada: Nombre de Activo | Macroproceso | Valoración CIA | Acciones
  - [x] Modal de 4 pestañas:
    1. Valoración de Activo (datos + CIA)
    2. Análisis de Riesgos (amenazas, vulnerabilidades)
    3. Evaluación de Riesgo (probabilidad, cálculo automático)
    4. Tratamiento de Riesgo (método, controles, cálculo con control)
  - [x] Ver / Editar / Eliminar valoraciones
  - [x] Las 4 pestañas guardan en un solo registro (`ValoracionActivo`)

---

## 5. Modelos de Base de Datos (Prisma)

| Modelo | Descripción |
|--------|-------------|
| `Amenaza` | Categoría + nombre + tipo de fuente |
| `Vulnerabilidad` | Categoría + descripción |
| `Impacto` | Tipo (CIA) + nivel + valor + criterio |
| `Formato` | Nombre del formato |
| `Subproceso` | Nombre |
| `MacroProceso` | Nombre |
| `TipoActivo` | Nombre + detalle |
| `Valoracion` | Catálogo de valoraciones |
| `Funcionario` | Nombre |
| `Area` | Nombre |
| `TipoControl` | Nombre |
| `Probabilidad` | Nombre |
| `Riesgo` | Evaluación + valor |
| `ValoracionActivo` | Activo evaluado con CIA + análisis/evaluación/tratamiento de riesgo |

---

## 6. Registro de Cambios (Changelog)

### 2026-05-22 — Sesión actual
- **Tabla Valoración de Activos**: reducida a 3 columnas (Nombre de Activo, Macroproceso, Valoración CIA) + Acciones.
- **Campo Método de Tratamiento**: cambiado de `<select>` fijo a `<input>` de texto libre en pestaña 4.
- **Módulo Análisis de Riesgo ELIMINADO**: se quitó la página `analisis-riesgo.vue`, el módulo backend `analisis-riesgo/`, el modelo Prisma `AnalisisRiesgo` y el enlace del sidebar.
- **Datos de pestañas 2-4 integrados en ValoracionActivo**: todos los campos de Análisis, Evaluación y Tratamiento de Riesgo ahora viven en el mismo modelo `ValoracionActivo`. El frontend envía un solo body a `/valoraciones` y al editar se cargan todos los datos del mismo registro.
- **Tabla de Análisis de Riesgo en Valoración de Activos**: agregada una segunda tabla debajo de la tabla principal que muestra Amenazas, Vulnerabilidades, Nivel de Riesgo, Método de Tratamiento, Tipo de Control, Evaluación de Riesgo con Control y Nivel con Control.
- **Seed completo**: `prisma/seed.ts` ahora incluye `Funcionario`, `Area` y `Probabilidad`. Los catálogos de `Funcionario` y `Area` se leen directamente desde `documentos/funcionarios.xlsx` (96 funcionarios y 15 áreas reales de Quito Turismo).

---

## 7. Pendientes / TODO

- [ ] **Reportes / Exportación**: generar PDF/Excel de valoraciones y análisis.
- [ ] **Dashboard gráfico**: charts de riesgos por nivel, activos por macroproceso, etc.
- [ ] **Auditoría**: registrar quién creó/editó cada valoración/análisis.
- [ ] **Filtros y búsqueda** en las tablas de valoración y análisis.
- [ ] **Paginación** en tablas grandes.
- [ ] **Validaciones más estrictas** en el backend (DTOs).
- [ ] **Tests unitarios y e2e** pendientes.
- [ ] **Optimización de queries** Prisma (evitar N+1 en relaciones).

---

## 8. Cómo levantar el proyecto

### Requisitos
- Node.js 20+
- MySQL/MariaDB corriendo en `localhost:3306`
- Base de datos `sgsi_db` con usuario `sgsi_user` / `sgsi_password`

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed   # o: ts-node prisma/seed.ts
npm run start:dev    # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

---

## 9. Notas para el Equipo

- El frontend consume el backend directamente por `fetch('http://localhost:3001/...')`.
- La auth OIDC requiere que Keycloak esté configurado; si no, las rutas protegidas redirigen al login.
- El archivo `catalogos.json` (o `catalogos.xlsx` → `read_excel.js`) es la fuente de datos inicial para los catálogos.

---

> **Recordatorio:** Actualizar este archivo cada vez que se termine una sesión de trabajo, anotando los cambios realizados y el estado de los pendientes.
