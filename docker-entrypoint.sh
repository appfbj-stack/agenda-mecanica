#!/bin/sh
# Substitui a URL da API no config.js e no nginx.conf em runtime
# API_URL: URL base para o JS do frontend (deve incluir /api)
API_URL="${API_URL:-https://oficina.fbautomacao.space/api}"
# BACKEND_URL: URL interna do container backend para o nginx proxy reverso
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

# 1. Injeta no config.js para o frontend JS
cat > /usr/share/nginx/html/config.js << JSEOF
// Configurado automaticamente na inicialização do container
window.__API_URL__ = "${API_URL}";
JSEOF

# 2. Injeta no nginx.conf para o proxy reverso
sed -i "s|__BACKEND_URL__|${BACKEND_URL}|g" /etc/nginx/conf.d/default.conf

echo "API_URL configurada: ${API_URL}"
echo "BACKEND_URL configurada: ${BACKEND_URL}"
exec nginx -g "daemon off;"
