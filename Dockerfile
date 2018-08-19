FROM node:8-alpine as builder

# Create app directory
RUN mkdir -p /usr/src/vogon-nj
WORKDIR /usr/src/vogon-nj

# Bundle app source
COPY . /usr/src/vogon-nj

# Install app dependencies
RUN  buildDeps='git' \
  && set -x \
  && apk add --no-cache --virtual .build-deps $buildDeps \
  && npm install \
  && apk del .build-deps

# Run tests
RUN npm test -- --timeout 10000


# Process resources with Webpack
RUN NODE_ENV=production npm run build:prod

# Delete development files
RUN npm prune --production

# Delete test resources and other unnecessary files
RUN rm -rf \
  test \
  .git .gitignore \
  Procfile package-lock.json

# Copy into a fresh image
FROM node:8-alpine

WORKDIR /usr/src/vogon-nj
COPY --from=builder /usr/src/vogon-nj /usr/src/vogon-nj

EXPOSE 3000
CMD [ "npm", "start" ]
