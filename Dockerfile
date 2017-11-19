FROM node:8-alpine

# Create app directory
RUN mkdir -p /usr/src/vogon-nj
WORKDIR /usr/src/vogon-nj

# Install app dependencies
COPY package.json /usr/src/vogon-nj/
RUN  buildDeps='git' \
  && set -x \
  && apk add --no-cache --virtual .build-deps $buildDeps \
  && npm install \
  && apk del .build-deps

# Bundle app source
COPY . /usr/src/vogon-nj

# Run tests
RUN npm test -- --timeout 10000

# Delete test resources
RUN rm -rf \
  test \
  .git .gitignore \
  Procfile

# Process resources with Webpack
RUN npm run build

# Delete development files
RUN npm prune --production

EXPOSE 3000
CMD [ "npm", "start" ]
