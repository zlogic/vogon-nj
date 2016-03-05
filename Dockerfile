FROM node:5.7

# Create app directory
RUN mkdir -p /usr/src/vogon-nj
WORKDIR /usr/src/vogon-nj

# Allow bower to run as root
RUN echo '{ "allow_root": true }' > /root/.bowerrc

# Install app dependencies
COPY package.json /usr/src/vogon-nj/
COPY bower.json /usr/src/vogon-nj/
RUN npm install --unsafe-perm

# Bundle app source
COPY . /usr/src/vogon-nj

# Run tests
RUN npm test

# Delete test resources
RUN rm -rf test/tmp

EXPOSE 3000
CMD [ "npm", "start" ]
