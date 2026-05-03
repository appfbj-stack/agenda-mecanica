#!/bin/sh
# Substitui a URL da API no config.js e no nginx.conf em runtime
API_URL="${API_URL:-https://api.oficinadavid.fbautomacao.space}"

# 1. Injeta no config.js para o frontend JS
cat > /usr/share/nginx/html/config.js << JSEOF
// Configurado automaticamente na inicialização do container
window.__API_URL__ = "${API_URL}";
JSEOF

# 2. Injeta no nginx.conf para o proxy reverso
sed -i "s|__BACKEND_URL__|${API_URL}|g" /etc/nginx/conf.d/default.conf

echo "API_URL configurada: ${API_URL}"
exec nginx -g "daemon off;"
