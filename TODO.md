# TODO: Fixes para Nomenclatura de Ciclos con Sustituyentes

## Estado Actual
- ✅ El ciclo ahora se reconoce como estructura principal (antes creaba cadena lineal incorrectamente)
- ✅ Los grupos funcionales en sustituyentes ya no se aplican incorrectamente al ciclo principal
- ❌ Los sustituyentes NO incluyen grupos funcionales en su nombre (e.g., "(aminometil)" se nombra solo como "metil")

## Problema Principal Identificado
`getSubstituentName` en `nomenclatura.js` no puede generar prefijos para grupos funcionales (NH2, NO2) porque:
1. El NH2 se detecta correctamente (manual fallback funciona)
2. Pero `localConnections` está vacío - no incluye conexiones C-heteroátomo
3. Sin conexiones, el BFS no puede encontrar path desde C hasta N
4. Sin path, carbonCount = 0, posición = 0 (inválida)
5. No se agrega el prefijo al nombre

## Cambios a Realizar

### Cambio 1: Fix en getSubstituentName - Conexiones C-Heteroátomo
**Archivo**: `javascript/nomenclatura.js`
**Líneas**: ~247-251
**Problema**: `localConnections` se construye solo con conexiones de `branchConnections`, pero puede que no incluya C-heteroátomo
**Solución**: Asegurar que al construir `localConnections`, se incluyan TODAS las conexiones del sustituyente, incluyendo C-N, C-O, etc.
**Código a modificar**:
```javascript
const localConnections = branchConnections.map(c => ({
    i: localMap.get(c.i),
    j: localMap.get(c.j),
    type: c.type
}));
```
**Verificación**: Agregar console.log para confirmar que localConnections tiene la conexión C-N

---

### Cambio 2: Fallback Simplificado para Posición de FG
**Archivo**: `javascript/nomenclatura.js`
**Líneas**: ~372-424
**Problema**: Si BFS falla, no hay fallback
**Solución**: Si path está vacío, usar heurística simple:
- Si FG es heteroátomo (N, O) conectado a un solo C, la posición es 1
- Esto cubre el caso común del usuario
**Código nuevo**:
```javascript
// Fallback si BFS no encuentra path
if (path.length === 0 && localAtoms[target].type !== 'C') {
    // Para heteroátomos simples conectados al primer carbono
    const pos = 1;
    prefixes.push(`${pos}-${fg.name}`);
} else {
    // Lógica BFS existente...
}
```

---

### Cambio 3: Limpiar Console.logs de Debug
**Archivo**: `javascript/nomenclatura.js` y `javascript/nomenclatura2.js`
**Acción**: Eliminar todos los console.log agregados durante debug
**Archivos afectados**:
- nomenclatura.js: líneas con `[getSubstituentName]`
- nomenclatura2.js: líneas con `[getFunctionalGroupName]` (ya limpiadas)

---

### Cambio 4: Fix de Numeración del Ciclo
**Archivo**: `javascript/nomenclatura.js`
**Función**: `getBranchedAlkaneName` - Caso 2 (ciclo con sustituyentes)
**Problema**: La numeración muestra "4" en lugar de "3" para el ciclobutano
**Solución**: Revisar cómo se numeran los carbonos del ciclo para minimizar posiciones de sustituyentes
**Estado**: Pendiente investigación

---

## Orden de Ejecución
1. ✅ Investigar por qué localConnections está vacío
2. [ ] Implementar Cambio 1: Fix conexiones C-heteroátomo
3. [ ] Implementar Cambio 2: Fallback de posición
4. [ ] Probar con molécula del usuario (aminometil ciclopropano)
5. [ ] Implementar Cambio 3: Limpiar console.logs
6. [ ] Investigar Cambio 4: Numeración del ciclo
7. [ ] Pruebas finales con todas las moléculas

## Moléculas de Prueba
1. **Aminometil ciclopropano**: C3 ring + CH2-NH2
   - Esperado: `1-(aminometil)ciclopropano` o `(aminometil)ciclopropano`
   - Actual: `1-metil ciclopropano`

2. **2-nitroetil ciclopropano**: C3 ring + CH2-CH2-NO2
   - Esperado: `(2-nitroetil)ciclopropano`
   - Actual: Pendiente prueba

3. **3-nitro-3-(2-aminoetil)ciclobutano**: C4 ring + nitro + CH2-CH2-NH2
   - Esperado: `3-nitro-3-(2-aminoetil)ciclobutano`
   - Actual: `4-nitro 4-etil ciclobutano` (progreso: ciclo reconocido, falta amino en sustituyente)
