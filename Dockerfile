FROM node:10-alpine as builder

# Create app directory
RUN mkdir -p /usr/src/vogon-nj
WORKDIR /usr/src/vogon-nj

# Bundle app source
COPY . /usr/src/vogon-nj

# Install app dependencies
RUN  buildDeps='git' \
  && set -x \
  && apk add --no-cache --virtual .build-deps $buildDeps \
  && npm ci \
  && apk del .build-deps

# Process resources with Webpack
RUN NODE_ENV=production npm run build:prod

# Run tests
RUN npm test -- --timeout 10000

# Delete development files
RUN npm prune --production

# Delete test resources, sources and other unnecessary files
RUN rm -rf \
  test src \
  .git .gitignore \
  Procfile package-lock.json

# Copy into a fresh image
FROM node:10-alpine

WORKDIR /usr/src/vogon-nj
COPY --from=builder /usr/src/vogon-nj /usr/src/vogon-nj

EXPOSE 3000
CMD [ "npm", "start" ]
