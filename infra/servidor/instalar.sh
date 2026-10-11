#!/usr/bin/env bash
# Deja un VPS Ubuntu (24.04) listo para SionMarket. Se corre una vez, como root:
#   curl -fsSL https://raw.githubusercontent.com/Lysmarrangel-dev/sion-market/main/infra/servidor/instalar.sh \
#     | bash -s -- api.tudominio.com tucorreo@ejemplo.com
# Instala Docker y el firewall, crea el usuario deploy (con una llave para GitHub Actions), baja la
# configuración a /opt/sionmarket y saca el certificado HTTPS. No toca la base de datos.
set -euo pipefail

DOMINIO="${1:?Uso: instalar.sh api.tudominio.com tucorreo@ejemplo.com}"
CORREO="${2:?Falta el correo para el certificado HTTPS}"
RAMA="${RAMA:-main}"
RAW="https://raw.githubusercontent.com/Lysmarrangel-dev/sion-market/$RAMA/infra"
DIR=/opt/sionmarket

[ "$(id -u)" -eq 0 ] || { echo "Corre este script como root"; exit 1; }

echo "==> Actualizando el sistema e instalando Docker"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl ufw rsync unattended-upgrades dnsutils
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh

echo "==> Firewall: solo SSH, HTTP y HTTPS"
ufw allow OpenSSH >/dev/null && ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

echo "==> Usuario deploy y llave para el despliegue automático"
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
if [ ! -f /home/deploy/.ssh/github_actions ]; then
  ssh-keygen -q -t ed25519 -N "" -C "github-actions-sionmarket" -f /home/deploy/.ssh/github_actions
  cat /home/deploy/.ssh/github_actions.pub >> /home/deploy/.ssh/authorized_keys
fi
chown -R deploy:deploy /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

echo "==> Configuración en $DIR"
install -d -o deploy -g deploy "$DIR" "$DIR/nginx/templates"
install -d /var/www/certbot /etc/letsencrypt
curl -fsSL "$RAW/docker-compose.prod.yml" -o "$DIR/docker-compose.yml"
curl -fsSL "$RAW/nginx/templates/default.conf.template" -o "$DIR/nginx/templates/default.conf.template"
if [ ! -f "$DIR/.env" ]; then
  curl -fsSL "$RAW/.env.produccion.example" | sed "s#^API_DOMAIN=.*#API_DOMAIN=$DOMINIO#" > "$DIR/.env"
fi
chown -R deploy:deploy "$DIR" && chmod 600 "$DIR/.env"

echo "==> Certificado HTTPS para $DOMINIO"
IP=$(curl -fsS https://api.ipify.org || true)
DNS=$(dig +short "$DOMINIO" A | tail -1)
if [ -n "$IP" ] && [ "$DNS" != "$IP" ]; then
  echo "AVISO: $DOMINIO apunta a '${DNS:-nada}' y este servidor es $IP. Corrige el DNS y vuelve a correr el script."
  exit 1
fi
if [ ! -f "/etc/letsencrypt/live/$DOMINIO/fullchain.pem" ]; then
  docker run --rm -p 80:80 -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot:v3.1.0 \
    certonly --standalone -d "$DOMINIO" -m "$CORREO" --agree-tos -n
fi
# nginx toma el certificado renovado cada madrugada.
echo "0 4 * * * deploy cd $DIR && docker compose exec -T nginx nginx -s reload >/dev/null 2>&1" > /etc/cron.d/sionmarket-nginx

cat <<FIN

Servidor listo. Falta:
  1. Edita $DIR/.env (nano $DIR/.env): pon DATABASE_URL de Supabase (Session pooler, puerto 5432)
     y CORS_ORIGINS con el dominio de tu web.
  2. Enciende:  cd $DIR && docker compose up -d
  3. Prueba:    curl https://$DOMINIO/v1/salud

Para el despliegue automático, en GitHub → Settings → Secrets and variables → Actions:
  Variable DEPLOY_HOST = $IP     Variable DEPLOY_USER = deploy
  Secreto  DEPLOY_SSH_KEY = el contenido de:  cat /home/deploy/.ssh/github_actions
FIN
