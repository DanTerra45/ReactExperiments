# Firebase Storage para la tienda: costos, límites e imágenes

> Documento de investigación para el proyecto.  
> Última revisión de precios y condiciones: **18 de septiembre de 2026**.
>
> Los precios de Firebase y Google Cloud pueden cambiar. Antes de pasar a producción conviene volver a comprobar los enlaces oficiales incluidos en este documento.

Para nosotros, hay cinco ideas que conviene tener claras desde el principio:

1. **Cloud Storage for Firebase requiere actualmente el plan Blaze.** Desde el 3 de febrero de 2026 ya no basta con Spark para crear o seguir accediendo al bucket de Storage.
2. **Los 5 GB no son un límite máximo del servicio.** Son una cantidad de uso sin costo bajo determinadas condiciones. Si se supera, el servicio puede seguir funcionando y el excedente se factura.
3. **La región importa muchísimo.** Los buckets nuevos `*.firebasestorage.app` usan el modelo de precios de Google Cloud Storage. El nivel Always Free de Cloud Storage solo aplica en `us-east1`, `us-central1` y `us-west1`.
4. **Santiago (`southamerica-west1`) no pertenece a esas regiones gratuitas.** Si elegimos Santiago para un bucket nuevo, no debemos presupuestar el proyecto suponiendo que tendremos esos 5 GB mensuales gratis, mejor elegir las que permiten free tier osea las estadounidendses xd
5. Para una tienda con imágenes optimizadas en AVIF, **el espacio almacenado probablemente no sea el mayor problema**. El tráfico de salida de las imágenes y una mala estrategia de tamaños/caché pueden importar bastante más que las operaciones de lectura y escritura.

Fuentes oficiales principales:

- [Firebase: cambios de Cloud Storage y requisito de Blaze](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- [Firebase: tabla general de precios](https://firebase.google.com/pricing)
- [Google Cloud Storage: precios](https://cloud.google.com/storage/pricing?hl=es-419)
- [Google Cloud Free Tier](https://cloud.google.com/free/docs/free-cloud-features)
- [Google Cloud Storage: caché](https://cloud.google.com/storage/docs/caching)

---

## 1. ¿Qué es Cloud Storage for Firebase?

Cloud Storage for Firebase es la capa de Firebase construida sobre Google Cloud Storage para guardar archivos como:

- imágenes de productos;
- fotografías originales;
- videos;
- PDFs;
- documentos;
- archivos subidos por usuarios.

En nuestra tienda, su uso más probable sería almacenar las imágenes del catálogo y entregar esas imágenes al navegador.

No debemos confundirlo con:

- **Firestore**, que almacena documentos y metadatos;
- **Firebase Hosting**, que sirve el sitio web estático;
- **Cloud Storage**, que guarda objetos/archivos.

Una arquitectura sencilla podría ser:

```text
Firestore
└─ producto
   ├─ nombre
   ├─ precio
   ├─ colores
   ├─ dimensiones
   └─ rutas/URLs de imágenes

Cloud Storage
└─ products/
   └─ producto-123/
      ├─ principal.avif
      ├─ detalle-01.avif
      └─ detalle-02.avif
```

Firestore sabe **qué imágenes corresponden al producto** y Storage contiene físicamente los archivos.

---

## 2. ¿Firebase Storage sigue siendo gratuito? NO, ya no pipipi

Firebase indica que desde el **3 de febrero de 2026** los proyectos deben estar en el plan **Blaze (pago por uso)** para utilizar Cloud Storage for Firebase o mantener acceso a un bucket existente.

Fuente oficial:

- [Default bucket and billing requirements for Cloud Storage for Firebase](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)

Esto significa que hay que separar dos conceptos:

### Blaze

Es el plan de facturación por consumo.

Tener Blaze **no significa automáticamente que habrá un cargo mensual fijo**. Significa que el proyecto tiene una cuenta de facturación asociada y que, cuando se superan las cantidades gratuitas aplicables, se cobra el excedente.

### Free Tier / uso sin costo

Son cantidades de uso que pueden costar USD 0.

Por tanto:

```text
Blaze = modelo de facturación habilitado
Free Tier = parte del consumo que puede seguir costando USD 0
```

---

## 3. Los 5 GB NO son un límite máximo

Los **5 GB representan una cuota sin costo en determinados escenarios**, no un máximo técnico de almacenamiento.

Por ejemplo, un bucket puede tener:

```text
5 GB
20 GB
100 GB
1 TB
...
```

Lo que cambia es cuánto se factura.

Por eso la pregunta correcta no es:

> "¿Qué pasa cuando lleguemos a 5 GB, Storage deja de funcionar?"

sino:

> "¿Qué tipo de bucket tenemos, en qué región está y cuánto cuesta el uso que exceda las cuotas gratuitas?"

---

## 4. Existen dos tipos de bucket predeterminado que debemos distinguir

Firebase cambió el formato del bucket predeterminado en septiembre de 2024.

### Bucket antiguo

```text
PROJECT_ID.appspot.com
```

### Bucket nuevo

```text
PROJECT_ID.firebasestorage.app
```

No son equivalentes desde el punto de vista de precios.

Fuente:

- [Firebase Storage: cambios de buckets predeterminados](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)

---

# 5. Bucket antiguo: `*.appspot.com`

Si el proyecto posee un bucket predeterminado antiguo `PROJECT_ID.appspot.com`, Firebase mantiene unas cuotas gratuitas específicas incluso después de migrar a Blaze.

Según la documentación vigente:

| Recurso | Sin costo | Después |
| --- | ---: | ---: |
| Almacenamiento | 5 GB | USD 0.026/GB |
| Descargas | 1 GB/día | USD 0.12/GB |
| Uploads | 20.000/día | USD 0.05/10.000 |
| Downloads | 50.000/día | USD 0.004/10.000 |

Fuente:

- [Firebase Pricing — Cloud Storage](https://firebase.google.com/pricing)

Firebase también confirma estas cantidades en:

- [FAQ oficial sobre los cambios de Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)

Este modelo es relevante únicamente si realmente tenemos un bucket legacy `*.appspot.com`.

---

# 6. Bucket nuevo: `*.firebasestorage.app`

Los buckets nuevos siguen el esquema de precios de **Google Cloud Storage**.

Firebase muestra como referencia:

| Concepto | Nivel sin costo anunciado |
| --- | ---: |
| Almacenamiento | 5 GB-mes |
| Descargas | 100 GB/mes |
| Upload operations | 5.000/mes |
| Download operations | 50.000/mes |

Fuente:

- [Firebase Pricing — Cloud Storage](https://firebase.google.com/pricing)

Pero aquí aparece la parte que es fácil pasar por alto:

## El Free Tier de Google Cloud Storage depende de la región

Google especifica que su Free Tier para Cloud Storage aplica únicamente a buckets ubicados en:

```text
us-east1
us-central1
us-west1
```

El nivel gratuito de Google Cloud Storage incluye actualmente:

- 5 GB-mes de almacenamiento regional;
- 5.000 operaciones Class A por mes;
- 50.000 operaciones Class B por mes;
- 100 GB de transferencia de salida elegible desde Norteamérica.

Fuente oficial:

- [Google Cloud Free Tier — Cloud Storage](https://cloud.google.com/free/docs/free-cloud-features)

Firebase también indica específicamente que los nuevos buckets `*.firebasestorage.app` usan el Always Free de Cloud Storage en esas regiones estadounidenses:

- [Firebase Storage FAQ](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)

---

# 7. ¿Qué ocurre si usamos Santiago?

La región de Google Cloud para Santiago de Chile es:

```text
southamerica-west1
```

Google la enumera entre sus regiones de Cloud Storage, pero **no** está entre:

```text
us-east1
us-central1
us-west1
```

Por tanto, para un bucket nuevo situado en Santiago:

> **No deberíamos asumir que tendremos los 5 GB del Always Free de Cloud Storage.**

Esto es especialmente importante porque habíamos elegido Santiago para partes del proyecto debido a su proximidad.

Hosting y Storage son productos distintos: elegir una región relacionada con Santiago para otro servicio no convierte automáticamente a Storage en gratuito.

Fuente de regiones y precios:

- [Google Cloud Storage pricing](https://cloud.google.com/storage/pricing?hl=es-419)

---

# 8. ¿Cuánto cuesta realmente almacenar imágenes en Santiago?

Google Cloud muestra actualmente para el grupo regional que incluye Santiago un precio de Standard Storage de aproximadamente:

```text
USD 0.000027397 por GiB-hora
```

Eso equivale aproximadamente a:

```text
USD 0.02 por GiB al mes
```

usando unas 730 horas por mes.

Fuente:

- [Cloud Storage pricing — almacenamiento regional](https://cloud.google.com/storage/pricing?hl=es-419)

Esto permite ver algo interesante:

### 5 GiB de imágenes

```text
5 GiB × USD 0.02 ≈ USD 0.10 / mes
```

### 10 GiB

```text
10 GiB × USD 0.02 ≈ USD 0.20 / mes
```

### 50 GiB

```text
50 GiB × USD 0.02 ≈ USD 1.00 / mes
```

Son aproximaciones para entender el orden de magnitud.

Esto explica por qué, para una tienda de tamaño moderado, **el almacenamiento puro puede ser muy barato**.

El tráfico de salida merece más atención.

---

# 9. ¿Qué significa una operación Class A o Class B?

Google Cloud no factura únicamente la cantidad de bytes almacenados.

También clasifica determinadas operaciones.

Para un bucket Standard en una sola región, actualmente:

| Tipo | Precio |
| --- | ---: |
| Class A | USD 0.005 / 1.000 operaciones |
| Class B | USD 0.0004 / 1.000 operaciones |

Fuente:

- [Cloud Storage pricing — cargos operativos](https://cloud.google.com/storage/pricing?hl=es-419)

## Class A

Son generalmente operaciones que crean, modifican o enumeran recursos.

Entre los ejemplos oficiales aparecen:

- `storage.objects.insert`;
- `storage.objects.copy`;
- `storage.objects.list`;
- `storage.objects.rewrite`;
- varias operaciones de actualización.

Una subida de un objeto entra normalmente aquí.

## Class B

Son principalmente operaciones de lectura/consulta.

Entre las operaciones oficiales aparecen:

- `storage.*.get`;
- Object GET;
- Object HEAD;
- lecturas de metadatos.

Fuente detallada:

- [Tabla de operaciones de Cloud Storage](https://cloud.google.com/storage/pricing?hl=es-419)

---

# 10. ¿Una escritura en Firebase Storage es cara?

No, normalmente una escritura individual es extremadamente barata.

Con:

```text
USD 0.005 / 1.000 Class A
```

tenemos aproximadamente:

| Operaciones | Costo aproximado |
| ---: | ---: |
| 1.000 | USD 0.005 |
| 10.000 | USD 0.05 |
| 100.000 | USD 0.50 |
| 1.000.000 | USD 5.00 |

Esto significa que subir unas miles de imágenes de productos no sería, por sí solo, un problema de precio.

Lo mismo ocurre con las operaciones Class B.

Con:

```text
USD 0.0004 / 1.000 Class B
```

obtenemos:

| Operaciones | Costo aproximado |
| ---: | ---: |
| 1.000 | USD 0.0004 |
| 10.000 | USD 0.004 |
| 100.000 | USD 0.04 |
| 1.000.000 | USD 0.40 |

Por eso no conviene obsesionarse únicamente con "reads" y "writes".

Para imágenes, los bytes transferidos pueden terminar importando bastante más.

---

# 11. Diferencia entre una operación y transferencia de datos

Supongamos que el navegador pide:

```text
products/123/main.avif
```

y la imagen pesa 200 KiB.

Hay dos conceptos diferentes:

### Operación

El acceso al objeto puede contar como una operación de lectura.

### Transferencia

Además, se envían 200 KiB desde Storage hacia el cliente.

La factura potencial puede contener ambas cosas:

```text
lectura del objeto
+
bytes transferidos
```

Por eso una imagen extremadamente pesada puede salir más cara aunque el número de requests sea el mismo.

---

# 12. El egress puede importar más que los reads

Google define la transferencia de salida como los datos enviados por Cloud Storage en las respuestas HTTP.

Fuente:

- [Cloud Storage pricing — red](https://cloud.google.com/storage/pricing?hl=es-419)

La tabla general de salida hacia Internet muestra actualmente, para los primeros niveles habituales y destinos que no sean Australia/China, valores que pueden comenzar alrededor de:

```text
USD 0.12 / GiB
```

según el tipo y destino del tráfico.

Los valores reales dependen de la ubicación del bucket y el destino, por lo que esta cifra debe tomarse como referencia y verificarse para la arquitectura final.

## Ejemplo sencillo

Tenemos una miniatura de:

```text
60 KiB
```

y digamos que nuestra página de catálogo muestra:

```text
12 productos
```

La carga completa sería:

```text
12 × 60 KiB = 720 KiB
```

Con 10.000 visitas a esa página:

```text
720 KiB × 10.000 ≈ 6.87 GiB
```

Con 100.000 visitas:

```text
≈ 68.7 GiB
```

El tamaño de cada imagen tiene un impacto directo sobre el ancho de banda.

---

# 13. Por qué AVIF tiene mucho sentido aqui para nosotros ohsisisisi

El objetivo de AVIF no es solamente ahorrar espacio dentro del bucket.

También reduce:

- bytes enviados al usuario;
- tiempo de carga;
- consumo de datos móviles;
- transferencia facturable;
- presión sobre la caché.

Ejemplo hipotético:

```text
JPEG: 450 KiB
AVIF: 180 KiB
```

Para 100.000 descargas:

```text
JPEG ≈ 42.9 GiB
AVIF ≈ 17.2 GiB
```

El ahorro sería aproximadamente:

```text
25.7 GiB de transferencia
```

Esto normalmente tiene más impacto práctico que ahorrar unas pocas operaciones Class B.

---

# 14. ¿Cuántas imágenes caben en 5 GiB?

Esto es únicamente una referencia matemática. La calidad y contenido real de las fotos puede producir tamaños muy diferentes.

| Tamaño promedio | Imágenes aprox. en 5 GiB |
| ---: | ---: |
| 50 KiB | 104.000 |
| 75 KiB | 69.000 |
| 100 KiB | 52.000 |
| 150 KiB | 34.000 |
| 200 KiB | 26.000 |
| 250 KiB | 20.000 |
| 300 KiB | 17.000 |
| 400 KiB | 13.000 |
| 500 KiB | 10.000 |
| 1 MiB | 5.120 |

Por ejemplo, si nuestras imágenes finales pesan de media unos **200 KiB**, 5 GiB equivalen aproximadamente a:

```text
26.000 imágenes
```

---

# 15. Ejemplos para el catálogo

Supongamos:

```text
200 KiB por AVIF
```

## 500 productos × 5 fotos

```text
500 × 5 × 200 KiB
≈ 0.48 GiB
```

## 1.000 productos × 5 fotos

```text
≈ 0.95 GiB
```

## 1.000 productos × 8 fotos

```text
≈ 1.53 GiB
```

## 1.000 productos × 20 fotos

```text
≈ 3.81 GiB
```

## 2.000 productos × 5 fotos

```text
≈ 1.91 GiB
```

Esto muestra que **5 GiB de fotografías optimizadas pueden dar bastante margen**.

---

# 16. El verdadero problema: guardar también los originales (si es que lo vamos a hacer, si no nel)

Una foto original de cámara puede pesar fácilmente varios MiB.

Supongamos:

```text
4 MiB por original
```

y tenemos 1.000 productos con una sola fotografía original:

```text
1.000 × 4 MiB
≈ 3.91 GiB
```

Es decir: casi el mismo espacio que ocuparían **20.000 AVIF de 200 KiB**.

Si conservamos:

- originales;
- AVIF;
- WebP;
- thumbnails;
- varias resoluciones;
- varias fotos por color;

el crecimiento cambia muchísimo.

Por eso sería razonable diferenciar:

```text
masters/
delivery/
```

o incluso plantear almacenamiento separado para los originales si realmente necesitamos conservarlos.

---

# 17. Variantes de color: porque la clienta sugirio que "tiene sentido" (hay que ver, quizas no sea necesario), pero hay que separar casos OJO ehem

La idea mencionada fue algo parecido a:

> en vez de tener una imagen para cada color, podríamos mostrar un color con HTML debajo de la imagen

Eso puede ser excelente en algunos casos y incorrecto en otros.

Hay que separar tres situaciones.

---

## Caso A: el circulito/cuadrado que sirve para seleccionar el color

Esto **no debería ser una imagen**.

Ejemplo:

```jsx
<button
  aria-label="Marrón"
  style={{ backgroundColor: '#8B5E3C' }}
/>
```

En Firestore se guarda simplemente:

```json
{
  "name": "Marrón",
  "hex": "#8B5E3C"
}
```

Ventajas:

- prácticamente cero almacenamiento;
- no hay que descargar una imagen adicional;
- cambia instantáneamente;
- es fácil de administrar;
- funciona perfectamente para un swatch.

### Recomendación

**Sí usar HTML/CSS para los selectores de color.**

No vale la pena subir pequeñas imágenes PNG/JPEG que solo contienen un color plano.

---

# 18. Caso B: solo queremos cambiar el fondo de la foto

Supongamos que el producto está recortado y posee transparencia.

Podemos almacenar:

```text
producto.avif
```

con fondo transparente y mostrarlo sobre:

```css
background-color: #d5b596;
```

Es una estrategia válida si lo que cambia es exclusivamente el fondo gráfico.

AVIF admite canal alfa/transparencia, aunque para compatibilidad también podríamos evaluar WebP según los navegadores objetivo.

Esto puede evitar tener archivos como:

```text
producto-fondo-rojo.avif
producto-fondo-azul.avif
producto-fondo-beige.avif
producto-fondo-verde.avif
```

cuando el producto es exactamente el mismo.

---

# 19. Caso C: el producto realmente cambia de color

Aquí un fondo HTML **no sustituye la fotografía**.

Ejemplo:

Una camiseta existe en:

- rojo;
- azul;
- negro;
- beige.

Si la foto muestra una camiseta azul opaca, colocar:

```css
background-color: red;
```

detrás de ella no convierte la camiseta en roja.

Podríamos intentar:

- filtros CSS;
- `mix-blend-mode`;
- máscaras;
- recolor mediante canvas;

pero eso puede alterar incorrectamente:

- sombras;
- textura;
- estampados;
- brillo;
- material;
- percepción real del color.

En una tienda esto importa porque la imagen debería representar fielmente el producto.

### Recomendación

Si el producto realmente cambia de apariencia:

> usar una fotografía optimizada real por variante importante.

---

# 20. Una estrategia intermedia: imagen base + máscara

Existe una opción más avanzada.

Podemos preparar:

```text
base del producto
+
máscara de la zona recoloreable
+
color elegido
```

El navegador podría colorear únicamente esa zona.

Esto tiene sentido para productos con:

- geometría idéntica;
- iluminación controlada;
- material constante;
- área recoloreable perfectamente aislada.

Pero requiere preparar correctamente las imágenes.

No debería utilizarse automáticamente sobre fotografías normales porque podría producir colores irreales.

---

# 21. Cuánto puede costar guardar cada color como fotografía

Supongamos:

- 1.000 productos;
- 6 colores;
- 5 fotos por color;
- 200 KiB por foto.

Tendríamos:

```text
1.000 × 6 × 5 × 200 KiB
≈ 5.72 GiB
```

En cambio, si cada producto utiliza una única galería de 5 fotos y los 6 colores son solo swatches de HTML:

```text
1.000 × 5 × 200 KiB
≈ 0.95 GiB
```

La diferencia es considerable.

Pero debemos ahorrar imágenes **solo cuando representan realmente el mismo contenido visual**.

No tendría sentido sacrificar la fidelidad de la tienda únicamente para reducir unos pocos centavos de almacenamiento.

---

# 22. No necesitamos cargar todas las variantes al abrir una página

Aunque guardemos fotografías distintas por color, eso no significa que el navegador tenga que descargarlas todas.

Ejemplo:

Producto:

```text
Negro
Azul
Rojo
Verde
```

Al abrir la ficha:

```text
cargar solo Negro
```

Si el usuario selecciona Azul:

```text
cargar galería Azul
```

Después se puede precargar alguna variante cuando el navegador esté libre, pero no es obligatorio.

Esto reduce mucho el tráfico inicial.

---

# 23. Lazy loading

Para imágenes que todavía no están cerca del viewport:

```html
<img loading="lazy" ...>
```

puede evitar descargas innecesarias.

Pero no conviene aplicar lazy loading a la imagen principal visible inmediatamente en el hero o en la parte superior de una página, ya que eso puede perjudicar su carga.

La idea es:

```text
imagen principal visible -> carga prioritaria
galería secundaria -> lazy
productos fuera de viewport -> lazy
colores no seleccionados -> no cargar todavía
```

---

# 24. Responsive images: probablemente más importante que reducir el número de archivos

No deberíamos enviar una foto de 2048 px a una tarjeta que en pantalla ocupa 300 px.

Un enfoque razonable sería generar tamaños como:

```text
320
640
960
1280
1600
2048
```

según lo que realmente necesitemos.

Con `srcset`:

```html
<img
  src="product-640.avif"
  srcset="
    product-320.avif 320w,
    product-640.avif 640w,
    product-960.avif 960w,
    product-1280.avif 1280w
  "
  sizes="..."
>
```

El navegador puede elegir una versión adecuada.

Esto aumenta el número de objetos almacenados, pero puede reducir muchísimo el tráfico.

Ese intercambio suele ser favorable porque el almacenamiento es barato y el ancho de banda repetido es mucho más significativo.

---

# 25. ¿No es malo guardar varias resoluciones porque ocupa más?

No necesariamente.

Ejemplo:

```text
320 px  = 25 KiB
640 px  = 65 KiB
1280 px = 150 KiB
2048 px = 280 KiB
```

Total almacenado:

```text
520 KiB
```

Si en cambio guardamos solo la imagen de 2048 px:

```text
280 KiB
```

Ahorramos 240 KiB de Storage.

Pero cada persona que vea una tarjeta pequeña podría descargar 280 KiB cuando solo necesitaba 25 o 65 KiB.

Después de unas pocas visitas, el ancho de banda desperdiciado supera ampliamente el ahorro de almacenamiento.

Por eso:

> para una tienda pública, varias resoluciones optimizadas pueden ser más eficientes económicamente que una sola imagen enorme.

---

# 26. Cache-Control

Cloud Storage permite controlar la caché usando metadata `Cache-Control`.

Fuente:

- [Google Cloud: caching with Cloud Storage](https://cloud.google.com/storage/docs/caching)
- [Google Cloud: object metadata](https://cloud.google.com/storage/docs/metadata)
- [Firebase: file metadata on Web](https://firebase.google.com/docs/storage/web/file-metadata)

Firebase permite, por ejemplo:

```js
const metadata = {
  cacheControl: 'public,max-age=31536000,immutable',
  contentType: 'image/avif',
};
```

La idea de un `max-age` largo funciona bien si usamos URLs/versiones inmutables.

Por ejemplo:

```text
product-123-v1.avif
product-123-v2.avif
```

o rutas que cambian cuando cambia el archivo.

Así podemos decir al navegador:

> puedes guardar esta imagen mucho tiempo porque esta URL nunca cambiará de contenido.

---

# 27. ¿Qué consigue la caché?

Supongamos que un usuario abre varias páginas donde aparece el mismo producto.

Sin una caché útil:

```text
descargar imagen
descargar imagen
descargar imagen
...
```

Con una caché válida:

```text
primera visita -> descargar
siguientes vistas -> reutilizar copia local/cache
```

Eso puede reducir:

- requests al origen;
- transferencia desde Storage;
- latencia;
- consumo de datos del usuario.

Google Cloud también ofrece caché integrada para objetos públicos bajo determinadas condiciones y recomienda Cloud CDN cuando se necesita un control de distribución más avanzado.

Fuente:

- [Cloud Storage caching](https://cloud.google.com/storage/docs/caching)

---

# 28. Importante: acceso público y caché

Cloud Storage indica que su caché integrada se aplica automáticamente a objetos que cumplen ciertas condiciones, entre ellas ser públicamente accesibles y permitir caching mediante `Cache-Control`.

Eso no significa que debamos volver público todo sin pensar.

Hay que distinguir:

### Imágenes públicas de catálogo

Normalmente no contienen información privada.

Pueden diseñarse para ser altamente cacheables.

### Archivos privados de usuarios/admin

No deberían hacerse públicos únicamente para conseguir caché.

La arquitectura final debe conservar las reglas de seguridad apropiadas.

---

# 29. ¿Firebase Storage o Firebase Hosting para imágenes? (tema aparte que busque no considerar)

Son usos distintos.

### Hosting

Está pensado principalmente para los assets del sitio desplegado:

- JS;
- CSS;
- íconos;
- imágenes estáticas que forman parte del build.

### Storage

Tiene más sentido para contenido administrable:

- imágenes de productos subidas por un panel;
- galerías dinámicas;
- contenido que cambia sin redeploy;
- archivos del catálogo.

Para una tienda con administración de productos, Storage es normalmente más natural para las fotos del catálogo.

---

# 30. Estructura para nuestras imágenes (idea)

Podríamos usar algo como:

```text
products/
  <productId>/
    <variantId>/
      original/
      delivery/
        320.avif
        640.avif
        960.avif
        1280.avif
```

Pero no necesariamente conviene guardar `original/` en Firebase Storage.

Podríamos simplificar a:

```text
products/
  <productId>/
    <variantId>/
      320.avif
      640.avif
      960.avif
      1280.avif
```

y almacenar los masters en otro sitio de respaldo si realmente son necesarios.

---

# 31. Posible modelo de Firestore (TODOs, preguntarle al adrian)

Ejemplo conceptual:

```json
{
  "name": "Bolso ejemplo",
  "variants": [
    {
      "id": "brown",
      "name": "Marrón",
      "hex": "#8B5E3C",
      "images": [
        {
          "alt": "Vista frontal",
          "src": {
            "320": "...",
            "640": "...",
            "960": "...",
            "1280": "..."
          }
        }
      ]
    }
  ]
}
```

El color del swatch:

```text
#8B5E3C
```

vive en metadata.

Las fotografías reales viven en Storage.

---

# 32. Qué NO deberíamos hacer (ojo, ojito)

## No subir una imagen para cada swatch

Malo:

```text
brown.png
red.png
blue.png
```

si cada archivo únicamente contiene un cuadrado de color.

Usar CSS.

---

## No servir siempre la imagen de máxima resolución

Malo:

```text
imagen de tarjeta de 260 px
<- descarga 2048 px
```

Usar tamaños responsive.

---

## No descargar todas las variantes automáticamente

Malo:

```text
usuario abre producto negro
<- se descargan negro + rojo + azul + verde + beige
```

Descargar inicialmente la variante activa.

---

## No conservar masters gigantes sin decidir por qué

Si los masters sirven para:

- reedición;
- impresión;
- nuevo encoding futuro;

puede valer la pena conservarlos.

Pero quizá deban ir a almacenamiento de archivo/backups y no al bucket de entrega de la tienda.

---

# 33. Una forma útil de calcular nuestro consumo

## Almacenamiento

```text
productos
× variantes con fotografía real
× imágenes por variante
× tamaño medio
```

Ejemplo:

```text
1.000 productos
× 4 colores 
× 5 imágenes
× 200 KiB
≈ 3.81 GiB
```

---

## Transferencia mensual

Una aproximación:

```text
pageviews
× imágenes descargadas por página
× tamaño promedio
```

Ejemplo:

```text
50.000 pageviews
× 12 miniaturas
× 60 KiB
≈ 34.3 GiB
```

Esto es antes de considerar:

- browser cache;
- caché integrada;
- CDN;
- visitantes que no hacen scroll hasta todas las imágenes;
- reutilización de imágenes entre páginas.

---

# 34. Escenario orientativo (estimacion, aunque puede que yo me haya equivocado aqui, aunque no creo, seria lo ideal)

Supongamos:

- 1.000 productos;
- 5 fotos principales por producto;
- 200 KiB promedio por foto grande AVIF;
- miniaturas responsive bastante menores;
- swatches en HTML/CSS;
- variantes de producto cargadas bajo demanda.

Las fotos grandes ocuparían aproximadamente:

```text
0.95 GiB
```

Aunque generásemos varias resoluciones, seguiríamos estando en un volumen modesto.

Lo que debemos vigilar conforme aumenten las visitas sería:

1. peso real de las miniaturas;
2. número de imágenes descargadas por navegación;
3. caché;
4. egress;
5. carga innecesaria de variantes.

---

# 35. Lo ideal

1. **AVIF como formato principal** para las fotografías.
2. Conservar WebP/JPEG únicamente si nuestra matriz real de compatibilidad lo necesita. (mejor si no la ocupamos xd, pero de que ahi esta, esta)
3. Generar varios tamaños responsive.
4. Guardar los swatches como valores de color en Firestore.
5. Guardar una imagen distinta por color solo cuando el producto visualmente cambia.
6. Lazy-load de imágenes secundarias.
7. No cargar galerías de colores no seleccionados.
8. Usar nombres/versiones de asset inmutables.
9. Configurar `Cache-Control` largo para assets inmutables.
10. Medir el tamaño promedio real con el experimento AVIF del proyecto.
11. Separar el presupuesto de masters/originales del presupuesto de imágenes de entrega.
12. Antes de crear el bucket definitivo, decidir conscientemente entre proximidad regional y Free Tier.

---

# 36. Santiago vs región gratuita de EE. UU.

Esta no es una decisión puramente de precio.

## Santiago

Ventajas posibles:

- proximidad geográfica a usuarios de Bolivia/Sudamérica;
- menor recorrido de red al origen;
- residencia regional coherente con otros servicios cercanos.

Desventaja:

- `southamerica-west1` no forma parte del Always Free de Cloud Storage.

## `us-central1`, `us-east1` o `us-west1`

Ventaja:

- pueden beneficiarse del Free Tier de Cloud Storage.

Posible desventaja:

- origen físicamente más lejano de usuarios sudamericanos.

La caché puede reducir bastante la importancia de esa distancia para assets populares, por lo que conviene evaluar el sistema completo y no únicamente la ubicación del bucket.

---

# 37. Algo importante sobre los precios de este documento

Google publica precios en USD y utiliza en distintas páginas unidades como GB, GiB, GB-mes o GiB-hora.

Por eso los cálculos de este documento son aproximaciones de planificación.

Cuando pongamos esto en producción hay que revisar:

- región exacta;
- SKU exacto;
- clase de Storage;
- impuestos/facturación de la cuenta;
- tráfico real;
- posible CDN;
- caché;
- cantidad de objetos.

No utilizar estos ejemplos como factura garantizada.

---

# 38. Fuentes oficiales

## Firebase

### Cambios de Cloud Storage y Blaze

https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

Confirma, entre otras cosas:

- requisito de Blaze;
- fecha de aplicación;
- diferencia entre `*.appspot.com` y `*.firebasestorage.app`;
- cuotas legacy;
- regiones de Always Free para buckets nuevos.

### Precios de Firebase

https://firebase.google.com/pricing

Incluye:

- cuotas de Storage legacy;
- 5 GB legacy;
- límites diarios;
- precios posteriores;
- referencia a precios de GCS para buckets nuevos.

### Metadata de archivos en Firebase Storage

https://firebase.google.com/docs/storage/web/file-metadata

Ejemplo oficial de configuración de `cacheControl` y `contentType`.

---

## Google Cloud

### Precios de Cloud Storage

https://cloud.google.com/storage/pricing?hl=es-419

Incluye:

- Standard Storage;
- precios regionales;
- Class A;
- Class B;
- red;
- categorías de operaciones.

### Google Cloud Free Tier

https://cloud.google.com/free/docs/free-cloud-features

Incluye:

- 5 GB-mes;
- 5.000 Class A;
- 50.000 Class B;
- 100 GB de transferencia elegible;
- regiones donde aplica el Free Tier de Cloud Storage.

### Caché de Cloud Storage

https://cloud.google.com/storage/docs/caching

Explica:

- caché integrada;
- `Cache-Control`;
- condiciones para cachear objetos;
- relación con Cloud CDN.

### Metadata de objetos

https://cloud.google.com/storage/docs/metadata

Explica cómo funciona `Cache-Control` y otros metadatos de objetos.

---

# 39. Tengamos cuidado, ojo (terminar de revisar, TODO)

La idea no es,

> "Solo tenemos 5 GB y hay que ahorrar cada imagen."

Más bien:

> "Hay que diseñar bien cómo almacenamos y entregamos las imágenes para no desperdiciar almacenamiento ni, sobre todo, ancho de banda."

Con AVIF, variantes cargadas bajo demanda, swatches HTML/CSS, responsive images y caché adecuada, incluso un catálogo de miles de productos puede mantenerse relativamente pequeño.

La decisión que sí debemos tomar antes de configurar Storage definitivamente es:

```text
¿queremos un bucket en Santiago (logicamente no, vamos a ir por el free tier de una region estadounidense) por proximidad,
o una región estadounidense compatible con el Free Tier?
```

Y esa decisión debería basarse en:

- público objetivo;
- latencia real;
- tráfico esperado;
- costo mensual estimado;
- estrategia de caché/CDN;
- necesidad o no de conservar originales.
