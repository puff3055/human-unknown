FROM nginx:1.27-alpine

COPY opendeploy.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css app.js encounter-machine.js living-nebula.js living-soundscape.js THIRD_PARTY_NOTICES.md /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
