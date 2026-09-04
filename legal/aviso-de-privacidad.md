<!--
BORRADOR — no sustituye asesoría legal.

Este documento fue redactado a partir del esquema real de datos de Sonet
(supabase/schema.sql) para que sea preciso, no genérico — pero un aviso de
privacidad que rige un producto real, especialmente uno con datos de
ubicación, orientación/preferencias de citas y menores potencialmente
expuestos (verificación de edad por auto-declaración), debe ser revisado
por un abogado antes de publicarse. Trátalo como el primer borrador que le
ahorra tiempo a tu abogado, no como el documento final.

Antes de publicar:
1. Reemplaza los placeholders entre [corchetes].
2. Confirma con un abogado el cumplimiento de la LFPDPPP (México) y, si
   tendrás usuarios en la UE/California, RGPD/CCPA.
3. Hospédalo en una URL pública — Apple, Google y el consentimiento OAuth
   de Google lo requieren como enlace, no como archivo adjunto.
-->

# Aviso de Privacidad — Sonet

**Última actualización:** [fecha]

Este Aviso de Privacidad describe cómo [**Razón Social**, S.A. de C.V. / nombre de la persona física responsable], con domicilio en [domicilio fiscal] ("**Sonet**", "nosotros"), recaba, usa y protege tus datos personales al usar la aplicación móvil Sonet, en cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.

## 1. Datos que recabamos

Recabamos únicamente los datos necesarios para que la app funcione. Por categoría:

**Identidad y perfil** — nombre de usuario, nombre para mostrar, foto de perfil, biografía, fecha de nacimiento, país. La fecha de nacimiento se usa para verificar que seas mayor de 18 años; no se muestra a otros usuarios.

**Cuenta y autenticación** — correo electrónico (si te registras con correo), o el identificador que nos comparte Google, Apple o Spotify si te registras con esos proveedores. Los tokens de acceso de Spotify se almacenan por separado de tu perfil público, en una tabla que solo tú puedes leer.

**Actividad musical** — las canciones, álbumes, podcasts y conciertos que calificas, tus reseñas, tu historial de reproducción, y un vector de gusto musical (géneros, tempo, energía, etc.) calculado a partir de tu actividad en Spotify si conectas tu cuenta.

**Actividad social** — a quién sigues, tus conversaciones y mensajes con otros usuarios, tus historias (fotos y clips de audio, visibles 24 horas), y las notificaciones que recibes.

**SoundMatch (citas musicales)** — si activas esta función: tu género, tu preferencia de género de las personas que quieres conocer, tu rango de edad de búsqueda, y si buscas citas, amistad, o solo compañía para conciertos. Puedes desactivar esta función en cualquier momento desde Ajustes, lo que oculta tu perfil de inmediato. **No almacenamos tu ubicación exacta** — solo un radio de búsqueda en kilómetros que tú defines.

**Ubicación** — para el mapa de conciertos, usamos la ciudad que buscas manualmente, no tu ubicación GPS (la app no solicita permiso de ubicación del dispositivo).

**Juegos** — tus intentos y rachas en los juegos diarios (Adivina, Carrera Mundial, Perfect Lineup, Hitster), visibles en tablas de posiciones cuando el juego es público (p. ej. la Carrera Mundial).

**Pagos** — si compras Sonet Premium, el pago lo procesa Apple, Google o nuestro proveedor de suscripciones (RevenueCat); **nunca almacenamos tu información de tarjeta**.

**Datos técnicos** — identificador de tu dispositivo para notificaciones push (si las activas), y registros técnicos estándar de nuestro proveedor de infraestructura (Supabase) para mantener el servicio funcionando y seguro.

## 2. Para qué usamos tus datos

- Crear y operar tu cuenta y tu perfil musical.
- Calcular compatibilidad de gustos musicales con otros usuarios (Discover, SoundMatch).
- Mostrarte tu actividad y la de las personas que sigues (Feed).
- Operar las funciones de citas musicales, si las activas.
- Enviarte notificaciones sobre mensajes, matches y actividad relevante.
- Prevenir abuso, spam, y contenido inapropiado — incluyendo revisar reportes que otros usuarios presenten sobre tu actividad.
- Procesar tu suscripción Premium, si aplica.
- Cumplir con obligaciones legales.

No vendemos tus datos personales a terceros.

## 3. Con quién compartimos datos

Compartimos datos únicamente con los proveedores necesarios para operar la app, bajo sus propios términos de privacidad:

| Proveedor | Qué recibe | Para qué |
|---|---|---|
| Supabase | Todos los datos de la app | Base de datos, autenticación, almacenamiento de archivos |
| Spotify | Tu token de acceso (si conectas tu cuenta) | Leer tus canciones/artistas para calcular tu gusto musical |
| Ticketmaster | Búsquedas de conciertos | Mostrar eventos reales cerca de ti |
| RevenueCat / Apple / Google | Identificador de compra | Procesar tu suscripción Premium |

Otros usuarios de Sonet pueden ver: tu perfil público, tus calificaciones, tus historias, y — si activas SoundMatch — tu edad y distancia aproximada (ambos opcionales, configurables en Ajustes). Nunca mostramos tu nombre real ni tu foto en el modo de citas ciego de SoundMatch.

## 4. Tus derechos (ARCO)

Tienes derecho a **A**cceder, **R**ectificar, **C**ancelar y **O**ponerte al tratamiento de tus datos personales:

- **Eliminar tu cuenta**: disponible directamente en la app, en Perfil → Ajustes → Eliminar cuenta. Esto borra permanentemente tu perfil, calificaciones, mensajes, historias y toda tu actividad.
- **Acceder o corregir tus datos**: la mayoría de tu información es editable directamente desde tu perfil.
- Para cualquier otra solicitud (incluyendo oposición al tratamiento o dudas sobre este aviso), escríbenos a [correo de privacidad, p. ej. privacidad@sonet.app].

## 5. Seguridad

Tus datos están protegidos con controles de acceso a nivel de fila (cada usuario solo puede leer/escribir lo que le corresponde), tus credenciales de Spotify se almacenan separadas de tu perfil público, y las conexiones entre la app y nuestros servidores usan cifrado en tránsito (HTTPS/TLS).

## 6. Menores de edad

Sonet es para mayores de 18 años. Verificamos tu fecha de nacimiento al registrarte; no está diseñado para ni dirigido a menores de edad.

## 7. Cambios a este aviso

Si cambiamos este aviso de forma importante, te lo notificaremos dentro de la app antes de que el cambio entre en vigor.

## 8. Contacto

[Razón social] · [domicilio] · [correo de privacidad] · [teléfono, opcional]
