# 🖥️ Guía completa — Montar el servidor CercaDeTi en Ubuntu (desde cero)

Esta guía asume que **acabas de instalar Ubuntu**, has creado tu usuario y has
conectado el WiFi de casa. **Nada más.** Te lleva de la mano hasta tener el
backend funcionando 24/7 y la app conectada.

> **¿Qué vas a conseguir?**
> El portátil con Ubuntu quedará encendido en casa ejecutando el **backend**
> (el servidor de búsquedas) en el **puerto 3000**. La app (en tu móvil o PC)
> le preguntará a ese servidor y mostrará productos y tiendas.

> **Conceptos que conviene tener claros:**
> - El Ubuntu **solo** ejecuta el backend (la carpeta `server/`). La app NO se
>   instala en el Ubuntu.
> - Las carpetas `node_modules` y el archivo `.env` **no vienen de GitHub** (es
>   normal). Se generan en el propio Ubuntu con `npm install` y copiando la
>   plantilla. **No es que falte código.**
> - Sin ninguna clave de pago, el servidor **ya funciona**: usa tiendas reales
>   gratis (OpenStreetMap/Overpass) y un catálogo de ejemplo de productos.

---

## 📋 Índice
1. [Preparar el sistema (actualizar + git)](#paso-1)
2. [Instalar Node.js 22](#paso-2)
3. [Descargar el código del proyecto](#paso-3)
4. [Preparar el backend](#paso-4)
5. [Probarlo a mano](#paso-5)
6. [Dejarlo encendido 24/7 (pm2)](#paso-6)
7. [Abrir el puerto en el firewall](#paso-7)
8. [Saber tu IP (y fijarla)](#paso-8)
9. [Conectar la app al servidor](#paso-9)
10. [(Opcional) Activar la IA gratis (Gemini)](#paso-10)
11. [(Opcional) Acceder desde fuera de casa](#paso-11)
12. [Mantenimiento del día a día](#mantenimiento)
13. [Problemas frecuentes](#problemas)
14. [Resumen copia-pega](#resumen)

---

<a name="paso-1"></a>
## 1) Preparar el sistema (actualizar + instalar git)

Abre una **terminal** en Ubuntu (`Ctrl + Alt + T`) y ejecuta:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
```

> La primera vez que uses `sudo` te pedirá **tu contraseña de usuario** (la que
> creaste al instalar Ubuntu). Es normal; escríbela (no se ve al teclear) y Enter.

Comprueba que git quedó instalado:

```bash
git --version
```

---

<a name="paso-2"></a>
## 2) Instalar Node.js 22

El backend necesita Node. Instala la versión 22 (solo la primera vez):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifica que funcionó (debe salir un número de versión en cada uno):

```bash
node -v
npm -v
```

---

<a name="paso-3"></a>
## 3) Descargar el código del proyecto

Vamos a clonar el repositorio en tu carpeta personal:

```bash
cd ~
git clone https://github.com/Blongbli/CercaDeTiApp.git
cd CercaDeTiApp
```

> ⚠️ **Ojo a las mayúsculas:** en Linux importan. La carpeta es `CercaDeTiApp`.

Comprueba que el código está bien (debe listar archivos `.tsx`):

```bash
ls app/
# Esperado: _layout.tsx  favorites.tsx  index.tsx  settings.tsx
```

> Si ya lo tenías clonado de antes, en vez de clonar de nuevo entra en la carpeta
> y actualiza: `cd ~/CercaDeTiApp && git pull`

---

<a name="paso-4"></a>
## 4) Preparar el backend

```bash
cd ~/CercaDeTiApp/server
npm install
```

Crea el archivo de configuración `.env` (puede ir **vacío**: con eso ya usa
tiendas gratis + catálogo de ejemplo):

```bash
[ -f .env ] || cp .env.example .env
```

---

<a name="paso-5"></a>
## 5) Probarlo a mano (para ver que arranca)

```bash
npm start
```

Si todo va bien verás algo así:

```
✅ CercaDeTi server (low-resource) en http://0.0.0.0:3000
   Tiendas:  overpass
   IA:       none (no configurada / solo bajo demanda)
   Online:   catálogo de ejemplo
   Caché:    en memoria (TTL 30 min, máx 100)
```

Déjalo abierto y, **en otra terminal**, comprueba que responde:

```bash
curl http://localhost:3000/config
```

Debe devolver un texto JSON con `"places":true`. Cuando lo confirmes, vuelve a la
primera terminal y pulsa **`Ctrl + C`** para pararlo (en el siguiente paso lo
dejamos corriendo de forma permanente).

---

<a name="paso-6"></a>
## 6) Dejarlo encendido 24/7 con pm2

`pm2` mantiene el servidor vivo: lo reinicia si se cae y lo vuelve a arrancar
cuando enciendes el Ubuntu.

```bash
cd ~/CercaDeTiApp/server
sudo npm install -g pm2
pm2 start index.js --name cercadeti
pm2 save
pm2 startup
```

> El comando `pm2 startup` imprimirá una línea que empieza por
> `sudo env PATH=...`. **Copia esa línea exacta, pégala y ejecútala.** Eso es lo
> que hace que el servidor arranque solo al encender el portátil.

Comandos útiles de pm2:

```bash
pm2 status            # ver si está "online"
pm2 logs cercadeti    # ver registros y errores (Ctrl+C para salir)
pm2 restart cercadeti # reiniciar (hazlo cada vez que cambies el .env)
pm2 stop cercadeti    # parar
```

---

<a name="paso-7"></a>
## 7) Abrir el puerto en el firewall

Si tienes el firewall `ufw` activo, hay que permitir el puerto 3000:

```bash
sudo ufw allow 3000/tcp
sudo ufw status
```

> Si `ufw status` dice *"inactive"*, no tienes firewall bloqueando: no hace falta
> tocar nada (pero el comando de arriba no hace daño).

---

<a name="paso-8"></a>
## 8) Saber tu IP (y fijarla para que no cambie)

Mira la IP local del Ubuntu en tu red:

```bash
hostname -I
# Ejemplo de salida: 192.168.1.50
```

Apunta esa IP (la que empiece por `192.168...`). **Esa es la dirección de tu
servidor en casa.**

> **Recomendado:** para que esa IP no cambie con el tiempo, entra en tu **router**
> y asígnale una **IP fija (DHCP estático)** al portátil Ubuntu por su dirección
> MAC. Cada router lo llama distinto ("Reserva de IP", "DHCP estático"…). Así la
> IP será siempre la misma y no tendrás que reconfigurar la app.

---

<a name="paso-9"></a>
## 9) Conectar la app al servidor

En el **móvil** (conectado a la **misma WiFi** que el Ubuntu), abre la app y:

1. Pulsa el engranaje **⚙️ Ajustes**.
2. Escribe la URL de tu servidor con tu IP y el puerto:
   ```
   http://192.168.1.50:3000
   ```
   (cambia `192.168.1.50` por **tu** IP del paso 8)
3. Pulsa **Probar conexión** → debe decir que las tiendas están OK.
4. Pulsa **Guardar**.

¡Listo! Busca "auriculares", "teclado", etc. y verás productos y tiendas reales.

---

<a name="paso-10"></a>
## 10) (Opcional) Activar la IA gratis — "Ayúdame a elegir"

La función de recomendación con IA es **opcional** y solo se usa cuando la pides.
Con la capa gratuita de Google Gemini:

1. Consigue una clave gratis en: https://aistudio.google.com/app/apikey
2. Edita el `.env`:
   ```bash
   nano ~/CercaDeTiApp/server/.env
   ```
3. Pon estas dos líneas (pega tu clave):
   ```
   AI_PROVIDER=gemini
   GEMINI_API_KEY=tu_clave_aqui
   ```
   Guarda en nano con `Ctrl + O`, Enter, y sal con `Ctrl + X`.
4. Reinicia el servidor para que tome la clave:
   ```bash
   pm2 restart cercadeti
   ```

> **Tiendas físicas:** ya funcionan gratis con Overpass, no hay que tocar nada.
> **Productos online reales (SerpAPI):** es de pago pasadas ~100 búsquedas/mes,
> así que lo dejamos aparcado; sin él se usa el catálogo de ejemplo.

---

<a name="paso-11"></a>
## 11) (Opcional) Usar la app FUERA de casa

Todo lo anterior funciona cuando el móvil está en la **misma WiFi** que el Ubuntu.
Si quieres usar la app desde la calle o desde otra red (ej. un coworking), tienes
que exponer el servidor a internet. Dos caminos:

**Opción A — Túnel gratis con Cloudflare (lo más fácil, sin tocar el router):**
```bash
# Instalar cloudflared (una sola vez):
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Levantar el túnel apuntando al backend:
cloudflared tunnel --url http://localhost:3000
```
Te dará una URL pública tipo `https://algo-aleatorio.trycloudflare.com`.
Pon **esa** URL en Ajustes de la app. (La URL cambia cada vez que lo reinicias;
para una fija hace falta una cuenta gratuita de Cloudflare.)

**Opción B — Abrir puerto en el router (port forwarding):**
Redirige el puerto 3000 del router hacia la IP del Ubuntu y usa tu IP pública +
un DDNS. Es más enredado y expone el servidor; **mejor usa la Opción A** para
empezar.

> ⚠️ Mientras solo estés probando en casa, **no necesitas nada de esto**.

---

<a name="mantenimiento"></a>
## 🔧 Mantenimiento del día a día

**Actualizar a la última versión del código** (cuando subas cambios a GitHub):
```bash
cd ~/CercaDeTiApp
git pull
cd server
npm install          # por si hay dependencias nuevas
pm2 restart cercadeti
```

**Ver si está funcionando / leer errores:**
```bash
pm2 status
pm2 logs cercadeti
```

**Tras cambiar el `.env` siempre:**
```bash
pm2 restart cercadeti
```

---

<a name="problemas"></a>
## 🆘 Problemas frecuentes

| Síntoma | Solución |
|---|---|
| **"Parece que falta el código de la app"** | Casi siempre es mirar la carpeta equivocada. Comprueba con `ls app/`: si salen los `.tsx`, el código **está**. Recuerda las mayúsculas: `CercaDeTiApp`. |
| **El móvil no conecta** | 1) ¿Misma WiFi que el Ubuntu? 2) ¿IP correcta en Ajustes? (`hostname -I`) 3) Firewall: `sudo ufw allow 3000/tcp` |
| **"puerto 3000 en uso"** | `pm2 stop cercadeti`  ó  `sudo lsof -i :3000` y matar el proceso. |
| **Cambié el `.env` y no pasa nada** | Hay que reiniciar: `pm2 restart cercadeti` |
| **`sudo` dice que mi usuario no puede** | Tu usuario no es administrador. Necesitas añadirlo al grupo sudo desde una cuenta admin: `sudo usermod -aG sudo TU_USUARIO` y reiniciar sesión. |
| **El servidor no arranca al encender** | Repite `pm2 startup` y ejecuta la línea `sudo env PATH=...` que imprime; luego `pm2 save`. |

---

<a name="resumen"></a>
## ⚡ Resumen copia-pega (todo de una vez)

Para alguien con prisa, esto hace los pasos 1 a 8 seguidos:

```bash
# 1-2) Sistema + Node
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3) Código
cd ~ && git clone https://github.com/Blongbli/CercaDeTiApp.git
cd CercaDeTiApp/server

# 4) Backend
npm install
[ -f .env ] || cp .env.example .env

# 6) 24/7 con pm2
sudo npm install -g pm2
pm2 start index.js --name cercadeti && pm2 save && pm2 startup
#   ^ copia y ejecuta la línea "sudo env PATH=..." que imprime

# 7) Firewall
sudo ufw allow 3000/tcp

# 8) Tu IP (apúntala para la app)
hostname -I
```

Después: en la app → **Ajustes ⚙️** → `http://TU_IP:3000` → **Probar** → **Guardar**.

---

*Hecho para CercaDeTi. Cualquier duda, revisa el apartado de Problemas frecuentes.*
