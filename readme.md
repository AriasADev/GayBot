## GayBot

The easiest and fastest way to install the bot is by using the [official Discord install link](https://discord.com/oauth2/authorize?client_id=1386796424720810234&permissions=67648&integration_type=0&scope=bot+applications.commands)

### Deploying with Docker

Copy the .env.example to the same dir and fill it out
```sh
cp .env.example .env
```

Build the image using
```sh
docker compose build
```

Run the container using:
```sh
docker compose up -d
```

Stop the container using:
```sh
docker compose down
```

See logs by using:
```sh
docker compose logs -f
```

### p/npm:

Copy the .env.example to .env as above

You can replace any use of `pnpm` here with `npm`

To install the bot's dependancies do:
```sh
pnpm install
```

To build and run, use:
```sh
pnpm run build
pnpm run start
```

To test
```sh
pnpm run test
```

To run in development mode
```sh
pnpm run dev
```

To build and watch
```sh
pnpm run build:watch
```

### Contributors
<a href="https://github.com/AriasADev/GayBot/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AriasADev/GayBot" />
</a>

# 📜 Licence: GNU NC-GPL v3 — non-commercial use only.  
> See [LICENCE](./LICENCE) for details.
