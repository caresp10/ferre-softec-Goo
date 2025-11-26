# Sistema POS Ferretería SaaS

Sistema de punto de venta, facturación e inventario para ferreterías con soporte multi-tenant (SaaS) y adaptado a la normativa tributaria de Paraguay (SET).

## Tecnologías

- **Frontend:** React + TypeScript + Vite
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Gráficos:** Recharts
- **IA:** Google Gemini API (para descripciones y análisis)
- **Base de Datos:** Firebase Firestore (o LocalStorage por defecto)

## Instalación Local

1. Asegúrate de tener **Node.js** instalado.
2. Clona o descarga los archivos en una carpeta.
3. Instala las dependencias:

```bash
npm install
```

4. Inicia el servidor de desarrollo:

```bash
npm run dev
```

## Configuración de Variables de Entorno

Para que funcionen las características de IA y la base de datos en la nube, crea un archivo `.env` en la raíz:

```env
VITE_GEMINI_API_KEY=tu_api_key_de_google_ai
```

## Configuración de Firebase

Si deseas persistencia de datos en la nube:

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com).
2. Habilita **Firestore Database** y **Authentication** (Email/Password).
3. Copia tus credenciales en el archivo `src/firebaseConfig.ts`.

## Características Principales

- **Multi-Tenant:** Gestión de múltiples ferreterías con un solo sistema.
- **Punto de Venta (POS):** Carrito, búsqueda por código de barras, tickets.
- **Facturación Paraguay:** Cálculo de IVA 5%, 10% y Exentas. Dígito verificador RUC.
- **Inventario:** Control de stock, costos y precios.
- **IA:** Generación automática de descripciones de productos y análisis de ventas.
