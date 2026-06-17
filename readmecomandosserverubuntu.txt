============================================================
  CERCADETI — COMANDOS PARA EL SERVIDOR EN UBUNTU
  (dejar el backend corriendo 24/7 en el portátil de casa)
============================================================

IDEA GENERAL
------------------------------------------------------------
- El Ubuntu SOLO corre el servidor (backend) en el puerto 3000.
- La app (Expo) se lanza desde tu PC/móvil y apunta a la IP del Ubuntu.
- "node_modules" y ".env" NO vienen de GitHub (es normal): se crean
  con "npm install" y "cp .env.example .env". Eso NO es que falte código.
- Móvil y Ubuntu deben estar en la MISMA WiFi.


============================================================
  PASO 0 — CONSEGUIR EL CÓDIGO (si aún no lo tienes)
============================================================

# Clonar (ojo: la carpeta es "CercaDeTiApp", con mayúsculas)
cd ~/Documentos/github
git clone https://github.com/Blongbli/CercaDeTiApp.git
cd CercaDeTiApp

# Si ya lo tenías clonado, solo actualiza:
cd ~/Documentos/github/CercaDeTiApp
git pull

# Comprobar que el código de la app está (debe listar los .tsx):
ls app/
# -> _layout.tsx  favorites.tsx  index.tsx  settings.tsx


============================================================
  PASO 1 — INSTALAR NODE (solo la primera vez)
============================================================

# Comprueba si ya tienes Node; si no, instala Node 22:
node -v || (curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs)

# Verifica:
node -v
npm -v


============================================================
  PASO 2 — PREPARAR EL BACKEND
============================================================

cd ~/Documentos/github/CercaDeTiApp/server
npm install

# Crear el .env (puede ir VACÍO: usa Overpass gratis y catálogo de ejemplo)
[ -f .env ] || cp .env.example .env


============================================================
  PASO 3 — PROBARLO A MANO (Ctrl+C para salir)
============================================================

npm start

# Si arranca bien, verás algo como:
#   ✅ CercaDeTi server (low-resource) en http://0.0.0.0:3000
#      Tiendas: overpass | IA: none | Online: catálogo | Caché: en memoria

# En otra terminal, comprobar que responde:
curl http://localhost:3000/config


============================================================
  PASO 4 — QUE ARRANQUE SOLO Y REVIVA (pm2)
============================================================

cd ~/Documentos/github/CercaDeTiApp/server
sudo npm install -g pm2
pm2 start index.js --name cercadeti
pm2 save
pm2 startup
# ^ pm2 imprimirá un comando "sudo env PATH=...". CÓPIALO Y EJECÚTALO
#   (eso hace que el servidor arranque al encender el Ubuntu).

# Gestión del servicio:
pm2 logs cercadeti      # ver registros / errores
pm2 restart cercadeti   # reiniciar (hazlo tras cambiar el .env)
pm2 stop cercadeti      # parar
pm2 status              # ver estado


============================================================
  PASO 5 — CONECTAR LA APP AL SERVIDOR
============================================================

# Ver la IP del Ubuntu:
hostname -I
# -> ejemplo: 192.168.1.50

# En la app (móvil, misma WiFi):
#   Ajustes (engranaje) -> escribe:  http://192.168.1.50:3000   (TU IP)
#   -> Probar conexión  (debe decir: tiendas OK, online no, IA no)
#   -> Guardar


============================================================
  PASO 6 (OPCIONAL) — ENCENDER MÁS FUENTES (todo gratis)
============================================================

# Edita el .env:
nano ~/Documentos/github/CercaDeTiApp/server/.env

# Para IA con Gemini (capa gratuita) — solo se usa bajo demanda:
#   AI_PROVIDER=gemini
#   GEMINI_API_KEY=tu_clave   (de https://aistudio.google.com/app/apikey)
#
# Tiendas: ya van con Overpass (gratis), no hay que tocar nada.
# SerpAPI (productos online reales): de pago tras 100/mes -> APARCADO.

# Tras cambiar el .env, reinicia:
pm2 restart cercadeti


============================================================
  PROBLEMAS FRECUENTES
============================================================

- "falta el código de la app":
    Casi siempre es mirar la carpeta equivocada. En Linux las mayúsculas
    importan: la carpeta es CercaDeTiApp. Entra dentro y haz:  ls app/
    Si salen los .tsx, el código ESTÁ. Si no, reclona (Paso 0).

- "puerto 3000 en uso":
    pm2 stop cercadeti     (o)   sudo lsof -i :3000   y matar el proceso.

- El móvil no conecta:
    1) ¿Misma WiFi que el Ubuntu?
    2) ¿IP correcta en Ajustes? (hostname -I)
    3) Firewall: sudo ufw allow 3000/tcp   (si tienes ufw activo)

- Cambié el .env y no pasa nada:
    Hay que reiniciar:  pm2 restart cercadeti


============================================================
  RESUMEN RÁPIDO (copiar-pegar de una vez)
============================================================

cd ~/Documentos/github/CercaDeTiApp && git pull
node -v || (curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs)
cd server && npm install
[ -f .env ] || cp .env.example .env
sudo npm install -g pm2
pm2 start index.js --name cercadeti && pm2 save && pm2 startup
hostname -I
# -> pon http://ESA_IP:3000 en la app (Ajustes)
============================================================
