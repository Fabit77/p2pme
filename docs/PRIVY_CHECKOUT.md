# Pago ARS sin wallet externa

El checkout público carga Privy únicamente al elegir **Pesos argentinos**.
El usuario pulsa continuar; Fondo crea una sesión de invitado y utiliza su
wallet embebida exclusivamente para las operaciones P2P. No solicita MetaMask,
claves privadas ni fondos para gas. `sponsor: true` es obligatorio: si Privy
rechaza el patrocinio se muestra un error, nunca una alternativa con gas del usuario.

## Configuración externa requerida

- `NEXT_PUBLIC_PRIVY_APP_ID`: App ID público de Privy (no App Secret).
- Habilitar Guest accounts y wallets Ethereum en el panel de Privy.
- Permitir `https://p2pme.vercel.app`. Usar una app de desarrollo separada para
  localhost o quitar el origen local cuando termine la prueba.
- Activar y financiar/configurar el patrocinio de gas de Base Sepolia según el
  panel de Privy. No asumir que obtener el App ID activa el patrocinio.
- Limitar el patrocinio en el proveedor a Base Sepolia, al integrador de Fondo
  y al Diamond configurados; establecer topes de gasto y controles de abuso.
  La validación de destinos del cliente no sustituye estas políticas del proveedor.

El widget obtiene el comerciante, la cotización y los datos bancarios. No se
inventa un Alias/CBU o QR. Un QR que abra la campaña no equivale a un QR bancario.
Esta implementación continúa en testnet: no transferir ARS reales.

La sesión de invitado no cambia el login Supabase de Fondo. El pago solo se
acredita después de la verificación del servidor contra la orden y tesorería.
Todavía debe validarse el ciclo completo con el patrocinio activado; un build
correcto no acredita que el comerciante haya recibido un pago.

## USDC directo

Se muestra como **Próximamente**, sin conectar ni cobrar. El checkout P2P anterior
con MetaMask también cobraba ARS; no era un flujo USDC directo. Habilitar esa
opción requiere cotización, transferencia y verificación propias.

## Dependencias

Privy 3.39.0 usa un peer opcional de `permissionless` incompatible con la versión
de `ox` usada por Viem. `.npmrc` fija `legacy-peer-deps=true` para instalaciones
reproducibles; esta opción ignora la resolución de peers, no solo ese peer.
Axios está fijado a 1.20.0 para evitar el aviso de alta severidad transitivo.
Revisar los avisos moderados heredados del SDK antes de habilitar mainnet.
