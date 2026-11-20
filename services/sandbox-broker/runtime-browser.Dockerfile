# keelwork/runtime-browser — the project sandbox image plus a headless Chromium
# for Keelwork's QA browser suite (layout at phone/tablet/desktop widths,
# console errors, keyboard focus, Core Web Vitals, screenshots).
#   docker build -f runtime.Dockerfile -t keelwork/runtime-node:22 .
#   docker build -f runtime-browser.Dockerfile -t keelwork/runtime-browser .
# Then start the broker with SANDBOX_IMAGE=keelwork/runtime-browser.
FROM keelwork/runtime-node:22
USER root
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright
RUN npm install -g playwright@1.49.1 \
 && playwright install --with-deps chromium \
 && chmod -R a+rX /opt/ms-playwright \
 && rm -rf /var/lib/apt/lists/* /root/.npm
ENV NODE_PATH=/usr/local/lib/node_modules
USER 1000:1000
