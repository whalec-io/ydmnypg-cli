# @ydmnypg/cli

Code generator and project scaffolding tool for the YS framework.

## Installation

```bash
npm install -g @ydmnypg/cli
```

Or as a project dependency:

```bash
npm install --save-dev @ydmnypg/cli
```

## Usage

```bash
ys-cli <command> <subcommand>
```

## Commands

### API Project

```bash
# Scaffold a new API project
ys-cli api project

# Generate a service (controller + service file)
ys-cli api service

# Generate a model with MyBatis mapper
ys-cli api model

# Generate CRUD handler files
ys-cli api crud

# Generate a single handler file
ys-cli api handler
```

### Admin Project

```bash
# Scaffold a new Admin project
ys-cli admin project

# Generate a service
ys-cli admin service

# Generate a model
ys-cli admin model

# Generate CRUD handler files
ys-cli admin crud
```

## Generated Structure

### `api project`

Creates a complete API project structure:

```
project/
├── bin/
│   └── worker.js
├── data/
│   ├── config/
│   │   ├── config.js
│   │   └── conf.d/
│   │       ├── config.local.json
│   │       ├── config.dev.json
│   │       ├── config.staging.json
│   │       └── config.production.json
│   └── constants/
│       └── error.js
├── env/
│   ├── nodemon.local.json
│   ├── nodemon.dev.json
│   ├── nodemon.staging.json
│   └── nodemon.prod.json
├── public/
│   └── swagger/
└── package.json
```

### `api service`

Generates a service with controllers and optional model:

```
services/<name>/
├── <Name>Service.js
├── api/
│   ├── <Name>Controller.js
│   └── handlers/
├── admin/
│   ├── Admin<Name>Controller.js
│   └── handlers/
└── models/           # if model creation is selected
    ├── <Name>Model.js
    └── mappers/
        └── <name>.xml
```

### `api crud`

Generates handler files for all CRUD operations:

```
handlers/
├── <model>.create.js
├── <model>.delete.js
├── <model>.get.js
├── <model>.list.js
└── <model>.update.js
```

## Interactive Prompts

All commands run interactively with guided prompts:

```
$ ys-cli api project
? Domain: domain.com
? Port: 9000
? Username: john
? Target: api
? Project Prefix Name: myapp
```

## Running with npm scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "generate": "ys-cli"
  }
}
```

Then run:

```bash
npm run generate -- api service
```

## Requirements

- Node.js >= 18.0.0

## License

MIT
