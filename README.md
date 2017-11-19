# Vogon-NJ

Public demo: https://vogon-nj-demo.herokuapp.com

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

See [details](#getting-started-on-heroku) below.

## Project description

Simple web-based personal finance tracker using

* Angular 4 on client-side, with Angular Material controls
* Node.js on the server side
* Pug for page generation
* Sequelize for entity management
* SQLite database for data storage, or (preferrable) a server-provided PostgreSQL (Heroku)

Named after the Vogons (http://en.wikipedia.org/wiki/Vogon) race who were known to be extremely boring accountants.

_A rewrite from the [Java/Spring/Hibernate version of Vogon](https://github.com/zlogic/vogon)_.

## Environment support

Vogon-NJ currently works on:
- Heroku
- Windows
- Linux (tested on Cloud9)

It's not compatible with:
- Azure (npm seems to download or build a non-working version of SQLite, and PostgreSQL doesn't run on Azure)

It's not tested to work on:
- Openshift

Most SQLite versions do not support uppercase/lowercase conversions for non-ASCII characters.
So search in deployments with SQLite may not always work correctly.
SQLite transactions may also work unpredictably if they time out, resulting in duplicate entries.

## Configuration

If you do not want random people using your deployment, you may want to set the `ALLOW_REGISTRATION` environment variable to `false`.

See the [documentation](https://devcenter.heroku.com/articles/config-vars) for more details on how to change configuration variables.

You should set `ALLOW_REGISTRATION` to `false` only after registering yourself.

Set the `TOKEN_EXPIRES_DAYS` variable to the number of days before authorization expires and the user has to re-login (e.g. `14`);

To periodically perform regular maintenance tasks such as cleaning up unreachable database entries and recalculating account balances:

Set the `RUN_MAINTENANCE_HOURS_INTERVAL` variable to the interval (in hours) for performing maintenance (e.g. `24`).
Note that this task may take a significant time and will likely update ALL data in the database.

## Getting started on Heroku

You can either
- fork this repository and copy into a new Heroku app [through Github](http://devcenter.heroku.com/articles/github-integration)
- or use the [deployment button](#vogon-nj) above
- or try the [demo version](https://vogon-nj-demo.herokuapp.com) first

This app requires a PostgreSQL database, the deployment button will automatically create a free database and configure it.

Configuration of Vogon-NJ can be done via environment variables, as described in the [Configuration](#configuration) section above.

See the [documentation](https://devcenter.heroku.com/articles/config-vars) for more details on how to change configuration variables.

## How to run the Docker image

To deploy create a Vogon-NJ container, run the following Docker command (change `[port]` to the port where Vogon-NJ will be accessible):

`docker create --env ALLOW_REGISTRATION=true --publish [port]:3000 zlogic42/vogon-nj`

This will create a container with an embedded SQLite database, allow registration and disable enforcement of HTTPS.

Configuration of Vogon-NJ can be done via environment variables, as described in the [Configuration](#configuration) section above.

Supply the configuration via `--env` properties when creating the Docker container.

### A more advanced Docker configuration example

Create the Posgtres DB container:

`sudo docker create postgres:latest`

Write down the Postgres container ID or name (like `65ff9625218ec70f5af7256e206f256723ff599e10f5c80e387b3a7ed34b9060` or `gigantic_stallman`).

Create the `Vogon` database (change `[postgres_container]` to the Postgres container ID):

`sudo docker exec [postgres_container] sh -c 'echo "CREATE DATABASE vogon;" | psql --username postgres'`

Create the Vogon-NJ container (change `[postgres_container]` to the Postgres container ID, and provide any extra parameters via `--env`):

```
sudo docker create \
	--env ALLOW_REGISTRATION=true \
	--env DATABASE_URL=postgres://postgres@db/vogon \
	--link [postgres_container]:db \
  zlogic42/vogon-nj
```

To use SSL, I highly recommend to create an NGINX container and use it as a reverse-proxy. That's what Heroku does!

## How to run in standalone mode

Run webapp:

`npm start`

Run tests:

`npm test`

Run maintenance (performs regular maintenance tasks such as cleaning up unreachable database entries and recalculating account balances):

`npm run maintenance`

By default, Vogon-NJ runs in `development` mode, which disables SSL enforcement and enables advanced error logging.
Set the `NODE_ENV` environment variable to something other than `development` (e.g. `production`) to disable this.
