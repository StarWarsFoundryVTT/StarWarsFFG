# Foundry for CI, with the distribution already inside the image.
#
# felddy/foundryvtt ships no Foundry - it downloads one at container start, which in CI means
# either an account credential sitting in the repository or a cache that goes cold. Baking the
# release in once, here, means the runner needs neither.
#
# Building and pushing this is a manual step, documented in .github/CI.md.
ARG FOUNDRY_VERSION=13.351
FROM felddy/foundryvtt:${FOUNDRY_VERSION}

ARG FOUNDRY_VERSION
LABEL org.opencontainers.image.source=https://github.com/StarWarsFoundryVTT/StarWarsFFG
LABEL org.opencontainers.image.description="FoundryVTT ${FOUNDRY_VERSION} for the integration test workflow"

# The entrypoint installs from CONTAINER_CACHE when it finds the release there, and only asks
# foundryvtt.com for one when it does not. The filename is load-bearing: foundryvtt-<version>.zip.
COPY foundryvtt-${FOUNDRY_VERSION}.zip /container_cache/foundryvtt-${FOUNDRY_VERSION}.zip
ENV CONTAINER_CACHE=/container_cache

USER root
RUN chmod 0777 /container_cache
USER node
