# Lightweight Nginx Alpine base image for high performance & minimal footprint
FROM nginx:alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy application web assets and dictionaries
COPY index.html /usr/share/nginx/html/
COPY index.css /usr/share/nginx/html/
COPY course_data.json /usr/share/nginx/html/
COPY market_profile_tutorial_data.json /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/

# Ensure proper read permissions
RUN chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Healthcheck to verify container web responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
