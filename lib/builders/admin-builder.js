import path from "path";
import { input, confirm, select } from "@inquirer/prompts";
import BaseBuilder from "../base-builder.js";
import { exec, copyStaticFiles, randomPassword, ACTIONS } from "../utils.js";

class AdminBuilder extends BaseBuilder {
  async createProject(dir, { name, prefix, domain, port, connection }) {
    const projectName = this.getNameMap(name);
    const tokenSecret = {
      local: randomPassword(),
      dev: randomPassword(),
      staging: randomPassword(),
      production: randomPassword(),
    };

    const data = { projectName, tokenSecret, prefix, domain, port, target: name };

    this.mkdirs(dir, [
      "bin",
      "data",
      "data/config",
      "data/config/conf.d",
      "data/constants",
      "env",
      "public",
      "utils",
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

    this.createTemplateFile(dir, {
      source: "api/service/admin.controller.js.ejs",
      destination: `services/passport/admin/AdminPassportController.js`,
      data: { serviceName: this.getNameMap("passport") },
    });

    this.createTemplateFile(dir, {
      source: "api/service/controller.js.ejs",
      destination: `services/passport/api/PassportController.js`,
      data: { serviceName: this.getNameMap("passport") },
    });

    this.createTemplateFile(dir, {
      source: "api/service/service.js.ejs",
      destination: `services/passport/PassportService.js`,
      data: { serviceName: this.getNameMap("passport") },
    });

    this.createTemplateFile(dir, {
      source: "api/passport/PassportModel.js.ejs",
      destination: "services/passport/models/PassportModel.js",
      data: { connectionType: connection, connectionName: `${connection}-connection` },
    });

    exec("npm install @ydmnypg/core lodash uuid");
    return projectName;
  }

  async createModel(dir, { model, connection }) {
    const modelName = this.getModelNameMap(model);
    console.log("create model", modelName.lower);

    this.mkdirs(dir, ["models", `models/${modelName.namespace}`, `models/${modelName.namespace}/mappers`]);

    this.createTemplateFile(dir, {
      source: "api/model/model.js.ejs",
      destination: `models/${modelName.namespace}/${modelName.camel}Model.js`,
      data: { modelName, connectionType: connection, connectionName: `${connection}-connection` },
    });

    this.createTemplateFile(dir, {
      source: `api/model/mapper.xml.${connection}.ejs`,
      destination: `models/${modelName.namespace}/mappers/${modelName.namespace}.xml`,
      data: { modelName, connectionType: connection },
    });

    return modelName;
  }

  async generateProject() {
    const name = await input({ message: "Project Name:", default: "admin" });
    const prefix = await input({ message: "Table Prefix:", default: "" });
    const domain = await input({ message: "Domain:", default: "domain.com" });
    const port = await input({ message: "Port:", default: "3100" });
    const connection = await select({
      message: "Database:",
      choices: [{ value: "mysql" }, { value: "postgresql" }],
    });

    return this.createProject(path.resolve("."), { name, prefix, domain, port, connection });
  }

  async generateService() {
    const service = await input({ message: "Service Name:" });
    const createModel = await confirm({ message: "Create Model?", default: true });

    const dir = path.resolve(".");
    await this.createService(dir, { service });

    if (createModel) {
      const modelName = await this.generateModel();
      await this.generateCRUD({ service, model: modelName.lower });
    }
  }

  async generateModel() {
    const model = await input({ message: "Model Name:" });
    const connection = await input({ message: "Connection Name:" });
    return this.createModel(path.resolve("."), { model, connection });
  }

  async generateCRUD(defaults = {}) {
    const service = defaults.service ?? (await input({ message: "Service Name:" }));
    const model = defaults.model ?? (await input({ message: "Model Name:" }));
    const crud = await confirm({ message: "Create User CRUD Handlers?", default: true });
    const acrud = await confirm({ message: "Create Admin CRUD Handlers?", default: true });

    const dir = path.resolve(".");
    if (crud) await this.createHandlers(dir, { service, model, actions: ACTIONS, scope: "controller" });
    if (acrud) await this.createHandlers(dir, { service, model, actions: ACTIONS, scope: "admin" });
  }
}

export default AdminBuilder;
