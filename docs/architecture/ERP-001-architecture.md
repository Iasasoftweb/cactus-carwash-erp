# ERP-001 — Arquitectura del Producto

## Decisiones

- Monorepo con Turborepo y pnpm.
- Aplicación web React.
- API modular NestJS.
- MySQL como base de datos.
- Prisma como ORM.
- Código, tablas y APIs en inglés.
- Interfaz inicialmente en español.
- UUID interno y consecutivos comerciales separados.
- Moneda inicial DOP / RD$.
- Arquitectura preparada para multiempresa y multisucursal; despliegue inicial de una empresa y una sucursal.

## Principios

1. La orden de servicio es el núcleo operativo.
2. Operación y estado financiero se modelan por separado.
3. Los documentos fiscales y comerciales no se eliminan.
4. Las excepciones requieren autorización y auditoría.
5. La interfaz prioriza velocidad, uso táctil y pocas acciones.
