import path from "path";
import { globSync } from "glob";
import { input, confirm, select } from "@inquirer/prompts";
import BaseBuilder from "../base-builder.js";
import { exec, copyStaticFiles, randomPassword, ACTIONS } from "../utils.js";

class ApiBuilder extends BaseBuilder {
  async createProject(dir, { prefix, domain, port, user, target, connection }) {
    const projectName = this.getNameMap(`${user}-${target}`);
    const tokenSecret = {
      local: randomPassword(),
      dev: randomPassword(),
      staging: randomPassword(),
      production: randomPassword(),
    };

    const data = { projectName, tokenSecret, prefix, domain, port, user, target };

    this.mkdirs(dir, [
      "bin",
      "data",
      "data/config",
      "data/config/conf.d",
      "data/constants",
      "env",
      "models",
      "public",
      "public/swagger",
      "services",
      "services/passport",
      "services/passport/models",
      "services/passport/mappers",
    ]);

    const ejsFiles = [];

    await copyStaticFiles({
      source: "api/project",
      destination: dir,
      templatesDir: this.templatesDir,
      excludes: [".ejs", ".git", ".DS_Store"],
      onExcluded: ({ relDir, file }) => {
        if (file.endsWith(".ejs")) {
          ejsFiles.push({
            source: path.join("api/project", relDir, file),
            destination: path.join(relDir, file.replace(".ejs", "")),
          });
        }
      },
    });

    for (const f of ejsFiles) {
      this.createTemplateFile(dir, { ...f, data });
    }

    const serviceName = "Passport";

    this.createTemplateFile(dir, {
      source: "api/service/admin.controller.js.ejs",
      destination: `services/${serviceName.lower}/admin/Admin${serviceName.camel}Controller.js`,
      data: { serviceName },
    });

    this.createTemplateFile(dir, {
      source: "api/service/controller.js.ejs",
      destination: `services/${serviceName.lower}/api/${serviceName.camel}Controller.js`,
      data: { serviceName },
    });

    this.createTemplateFile(dir, {
      source: "api/service/service.js.ejs",
      destination: `services/${serviceName.lower}/${serviceName.camel}Service.js`,
      data: { serviceName },
    });

    this.createTemplateFile(dir, {
      source: "api/passport/PassportModel.js.ejs",
      destination: `models/${modelName.namespace}/${modelName.camel}Model.js`,
      data: { modelName, connectionType: connection, connectionName: `${connection}-connection` },
    });

    exec("npm install @ydmnypg/core lodash uuid");
    return projectName;
  }

  async createModel(dir, { service, model, connection }) {
    const serviceName = service ? this.getNameMap(service) : null;
    const modelName = this.getModelNameMap(model);
    console.log("create model", modelName.lower);

    let modelDir;
    if (serviceName) {
      modelDir = `services/${serviceName.lower}/models`;
      this.mkdirs(dir, [
        "services",
        `services/${serviceName.lower}`,
        `services/${serviceName.lower}/models`,
        `services/${serviceName.lower}/models/mappers`,
      ]);
    } else {
      modelDir = `models/${modelName.namespace}`;
      this.mkdirs(dir, ["models", `models/${modelName.namespace}`, `models/${modelName.namespace}/mappers`]);
    }

    this.createTemplateFile(dir, {
      source: "api/model/model.js.ejs",
      destination: `${modelDir}/${modelName.camel}Model.js`,
      data: { modelName, connectionType: connection, connectionName: `${connection}-connection` },
    });

    this.createTemplateFile(dir, {
      source: `api/model/mapper.xml.${connection}.ejs`,
      destination: `${modelDir}/mappers/${modelName.namespace}.xml`,
      data: { modelName, connectionType: connection },
    });

    return modelName;
  }

  async generateProject() {
    const domain = await input({ message: "Domain:", default: "domain.com" });
    const port = await input({ message: "Port:", default: "9000" });
    const user = await input({
      message: "Username:",
      validate: v => v !== "" || "Please enter username",
    });
    const target = await input({ message: "Target:", default: "api" });
    const prefix = await input({ message: "Project Prefix Name:", default: "" });
    const connection = await select({
      message: "Database:",
      choices: [{ value: "mysql" }, { value: "postgresql" }],
    });

    return this.createProject(path.resolve("."), { domain, port, user, target, prefix, connection });
  }

  async generateService() {
    const service = await input({ message: "Service Name:" });
    const createModel = await confirm({ message: "Create Model?", default: true });

    const dir = path.resolve(".");
    await this.createService(dir, { service });

    if (createModel) {
      const modelName = await this.generateModel({ service });
      await this.generateCRUD({ service, model: modelName.lower });
    }
  }

  async generateModel(defaults = {}) {
    const model = await input({ message: "Model Name:" });
    const connection = await input({ message: "Connection Name:" });
    return this.createModel(path.resolve("."), { service: defaults.service, model, connection });
  }

  async generateHandler(defaults = {}) {
    const serviceNames = this.getServiceNames();
    const modelNames = this.getModelNames();

    const service =
      defaults.service ??
      (await select({
        message: "Select Service:",
        choices: serviceNames.map(n => ({ value: n })),
      }));
    const model =
      defaults.model ??
      (await select({
        message: "Select Model:",
        choices: modelNames.map(n => ({ value: n })),
      }));
    const action = await select({
      message: "Handler Action:",
      choices: ACTIONS.map(a => ({ value: a })),
    });
    const scope = await select({
      message: "Handler Scope:",
      choices: [{ value: "controller" }, { value: "admin" }],
    });

    await this.createHandlers(path.resolve("."), { service, model, actions: [action], scope });
  }

  async generateCRUD(defaults = {}) {
    const serviceNames = this.getServiceNames();
    const modelNames = this.getModelNames();

    const service =
      defaults.service ??
      (await select({
        message: "Select Service:",
        choices: serviceNames.map(n => ({ value: n })),
      }));
    const model =
      defaults.model ??
      (await select({
        message: "Select Model:",
        choices: modelNames.map(n => ({ value: n })),
      }));
    const crud = await confirm({ message: "Create User CRUD Handlers?", default: true });
    const acrud = await confirm({ message: "Create Admin CRUD Handlers?", default: true });

    const dir = path.resolve(".");
    if (crud) await this.createHandlers(dir, { service, model, actions: ACTIONS, scope: "controller" });
    if (acrud) await this.createHandlers(dir, { service, model, actions: ACTIONS, scope: "admin" });
  }

  getServiceNames() {
    return globSync("services/*/*Service.js", { cwd: path.resolve(".") }).map(f =>
      path.basename(f).replace("Service.js", ""),
    );
  }

  getModelNames() {
    return [
      ...globSync("models/*/*.js", { cwd: path.resolve(".") }),
      ...globSync("services/*/models/*.js", { cwd: path.resolve(".") }),
    ].map(f => path.basename(f, ".js").replace(/Model$/, ""));
  }
}

export default ApiBuilder;
