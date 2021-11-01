# use node docker image

# gr: nodegit not compatible with node 16.0.0
#	https://github.com/nodegit/nodegit/issues/1840
#FROM node:latest AS node_base
FROM node:15.4.0 AS node_base

RUN echo "NODE Version:" && node --version
RUN echo "NPM Version:" && npm --version

# To avoid "tzdata" asking for geographic area
ARG DEBIAN_FRONTEND=noninteractive

# source/app paths
ENV APP_DIR=/App


# copy application source from repository
#	*.*
#	Assets/
COPY . $APP_DIR

WORKDIR $APP_DIR

# print out working dir contents to help debugging
# gr: this doesn't print out to sloppy...
RUN ls -la ./*

CMD [ "node", "--experimental-json-modules", "./NodeServer.js" ] 

