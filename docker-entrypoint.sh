#!/bin/sh
# Substitui a URL da API no config.js em runtime
# Variável de ambiente: API_URL (ex: https://api.suaoficina.com)

API_URL="${API_URL:-http://localhost:8000}"

cat > /usr/share/nginx/html/config.js << JSEOF
// Configurado automaticamente na inicialização do container
window.__API_URL__ = "${API_URL}";
JSEOF

echo "API_URL configurada: ${API_URL}"
exec nginx -g "daemon off;"
