
# Instalar en sistemas que no sean Linux

No probamos Fedired en sistemas que no sean Linux, por lo que te recomendamos que instales Fedired en un entorno de este tipo **solo si puedes solucionar los problemas tú mismo**. No hay ningún tipo de soporte. Dicho esto, es posible instalar Fedired en algunos sistemas que no sean Linux.


> [!WARNING]
> 
>  Posible [configuración en Docker](https://github.com/fedired-dev/ordo/pkgs/container/ordo%2Fordo) esta forma de instalacion aun esta en Beta y puede no funcionar como se espera.



## 1. Instalar dependencias en Linux (Ubuntu Server)

Asegúrese de que puede utilizar el comando `sudo` antes de continuar.

### Utilidades

```sh
sudo apt update
sudo apt install build-essential python3 curl wget git lsb-release
```

### Node.js y pnpm

Las instrucciones se pueden encontrar en [Este repositorio](https://github.com/nodesource/distributions).

```sh
NODE_MAJOR=20
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
sudo apt install nodejs

# check version
node --version
```

También es necesario habilitar `pnpm`.
```sh
sudo corepack enable
corepack prepare pnpm@latest --activate

# check version
pnpm --version
```

### PostgreSQL

Las instrucciones de instalación de PostgreSQL se pueden encontrar en [esta pagina](https://www.postgresql.org/download/).

```sh
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install postgresql-16

sudo systemctl enable --now postgresql

# check version
psql --version
```


### Redis

Las instrucciones se pueden encontrar en [esta pagina](https://redis.io/docs/install/install-redis/).

```sh
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt update
sudo apt install redis

sudo systemctl enable --now redis-server

# check version
redis-cli --version
```

### FFmpeg

```sh
sudo apt install ffmpeg
```

## 2. Configurar una base de datos

1. Crear un usuario de base de datos
```sh
sudo -u postgres psql
CREATE DATABASE fedired;
CREATE USER fedired WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE fedired TO fedired;
GRANT ALL ON SCHEMA public TO fedired;
GRANT CREATE ON SCHEMA public TO fedired;
ALTER SCHEMA public OWNER TO fedired;

\dn+ public

\q

sudo systemctl restart postgresql.service
```

2. Verifica la conexión
```sh
psql -h localhost -U fedired -d fedired_db

```


## 3. Configurar Fedired

1. Crear un usuario para Fedired y cambiar de usuario
```sh
sudo useradd --create-home --user-group --shell /bin/bash fedired
sudo passwd fedired
sudo su --login fedired
 
```
2. Clonar el repositorio Fedired
```sh
git clone --branch=nvus https://github.com/fedired-dev/fedired.git
```

1. Copiar y editar el archivo de configuración
```sh
git checkout master
cd fedired
cp .config/example.yml .config/default.yml
nano .config/default.yml
```


## 4. Construir Fedired

1. Construir
```sh
git submodule update --init
NODE_ENV=production pnpm install --frozen-lockfile
NODE_ENV=production pnpm run build
pnpm run init
```


## 5. Publica tu servidor Fedired

## 6. Publica tu servidor Fedired

1. Crear un archivo de servicio
```sh
sudo nano /etc/systemd/system/fedired.service
```

```sh
[Unit]
Description=Misskey daemon

[Service]
Type=simple
User=misskey
ExecStart=/usr/bin/npm start
WorkingDirectory=/home/misskey/misskey
Environment="NODE_ENV=production"
TimeoutSec=60
StandardOutput=journal
StandardError=journal
SyslogIdentifier=misskey
Restart=always

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable misskey
```


1. Iniciar Fedired
```sh
NODE_ENV=production pnpm run start
```

# 🎉 ¡Felicidades! 🎉

¡Disfruta de tu nuevo servidor de Fedired! 🎈

Tu experiencia de hosting está ahora optimizada para ofrecerte un rendimiento excepcional. Aprovecha todas las características que hemos preparado para ti y no dudes en contactarnos si necesitas asistencia.

¡Bienvenido a la comunidad de Fedired! 🚀

**Recuerda:** La privacidad y seguridad son nuestras prioridades.
