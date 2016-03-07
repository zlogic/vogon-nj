FROM node:slim

# Create app directory
RUN mkdir -p /usr/src/vogon-nj
WORKDIR /usr/src/vogon-nj

# Allow bower to run as root
RUN echo '{ "allow_root": true }' > /root/.bowerrc

# Install app dependencies
COPY package.json /usr/src/vogon-nj/
COPY bower.json /usr/src/vogon-nj/
RUN  buildDeps='git' \
  && set -x \
  && apt-get update && apt-get install -y $buildDeps --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --unsafe-perm \
  && apt-get purge -y --auto-remove $buildDeps

# Bundle app source
COPY . /usr/src/vogon-nj

# Run tests
RUN npm test

# Delete test resources
RUN rm -rf test/tmp

EXPOSE 3000
CMD [ "npm", "start" ]
