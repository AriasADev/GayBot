# Selfhosting Guide
This guide will help you with selfhosting our bot, 
### Prerequisites

To selfhost GayBot, you will need git, node and either pnpm or npm , or docker and docker compose installed to your local machine/vps, and a Discord Account with access to the [Discord Developer Portal](http://discord.com/developers/applications)

To install git, see this install page [here](https://git-scm.com/install/)

To install node.js, see this install guide [here](https://nodejs.org/en/download)

To install docker, see this install guide [here](https://docs.docker.com/engine/install/) for a UI install (reccomended) or [here](https://docs.docker.com/compose/install/) for a general terminal install

### General starting info for both methods.

You will need to clone the repository to your machine using git.

```sh
git clone https://github.com/Girls-Development-Team/GayBot
```

You will then need to copy the .env.example to .env

For Linux/Mac:
```sh
cp .env.example
```

For Windows
```powershell
Copy-Item .env.example .env
```

Fill it out using the infomation in the file using a text editor

## Running using Docker Compose (Reccomended)

The bot comes with a premade Dockerfile and a premade compose.yml, so will work out the box. Docker containers run in the background, sologs are avalible on a query

To start the bot, use:
```sh
docker compose up -d
```

To look at the bot's logs, use:
```sh 
docker compose logs -f
# -f is optional to follow the logs, use ctrl + c to exit if you do use it
```

To stop the bot, use:
```sh
docker compose down
```

## Running using Node and P/NPM

This is not reccomended as it is fiddly and is easier to break if you do not know what you are doing.

PNPM and NPM are similar, and work the same. In the examples below, I use NPM, however you can use PNPM instead

After filling the bot's .env file out, you will need to install the node modules using:
```sh
npm i
```

To build the bot, you will need to run :
```sh
npm run build
```

And to start it, you will need:
```sh
npm run start
```

## UPDATES

From time to time, we will update the bot, either adding new features, mending broken code or updating dependancies.

To update the bot, you will have to update your fork (if you are using a fork) or the repo manually.

To pull an update, use:
```sh
git pull
```

This just pulls the latest code.

Depending on if you are using NPM or Docker will depend on the next commands

For Docker use:
```sh
docker compose build --no-cache
docker compose up -d
```

For P/NPM use:
```sh
npm i
npm run build
npm run start
```

And that's it., your bot will be updated.

NOTE: Slash (/) commands take up to 1 hour to propagate, so if the commands don't show up after that, reload your Discord .