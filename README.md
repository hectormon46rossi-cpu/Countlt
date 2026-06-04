# 🎉 CountIt — Contador de consumiciones para fiestas

App para llevar el control de copas por invitado en tiempo real.

## Funciones
- Añadir invitados con nombre
- Contar 6 tipos de bebida: cerveza, vino, cóctel, chupito, agua, refresco
- Sumar y restar consumiciones
- Vista de resumen con totales y ranking por invitado
- Los datos se guardan automáticamente en el navegador

## Cómo arrancar

### Requisitos
- Node.js 18 o superior

### Instalación

```bash
# 1. Entra en la carpeta
cd CountIt

# 2. Instala dependencias
npm install

# 3. Arranca el servidor de desarrollo
npm run dev
```

Abre http://localhost:5173 en el navegador.

### Build para producción
```bash
npm run build
npm run preview
```

## Estructura
```
CountIt/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx      ← lógica principal
    └── App.css      ← estilos
```
