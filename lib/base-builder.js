import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mkdir, ucfirst } from "./utils.js";

function renderTemplate(template, data) {
  return template.replace(/<%=\s*([\w.]+)\s*%>/g, (_, key) => {
    const value = key.split(".").reduce((obj, k) => obj?.[k], data);
    return value ?? "";
  });
}

// Absolute path to the templates/ directory, resolved relative to this file.
const TEMPLATES_DIR = fileURLToPath(new URL("../templates", import.meta.url));

class BaseBuilder {
  get templatesDir() {
    return TEMPLATES_DIR;
  }

  getNameMap(name) {
    const normalised = name
      .replace(/[/|_\-.]+/g, "-")
      .replace(/[^A-Za-z0-9.-]+/g, "-")
      .replace(/^[-_.]+|-+$/g, "");

    return {
      lower: normalised.toLowerCase(),
      upper: normalised.toUpperCase(),
      camel: ucfirst(normalised),
    };
  }

  getModelNameMap(name) {
    const parts = name.replace(/\//g, "-").split("-");
    return {
      path: parts.map(p => p.toLowerCase()).join("/"),
      namespace: parts.map(p => p.toLowerCase()).join("."),
      lower: parts.map(p => p.toLowerCase()).join("_"),
      upper: parts.map(p => p.toUpperCase()).join("_"),
      camel: parts.map(p => ucfirst(p.toLowerCase())).join(""),
    };
  }

  createTemplateFile(dir, { source, destination, data }) {
    const destPath = path.join(dir, destination);
    if (fs.existsSync(destPath)) return false;

    const templatePath = path.join(TEMPLATES_DIR, source);
    const ejsString = fs.readFileSync(templatePath, "utf8");
    const rendered = renderTemplate(ejsString, data);

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, rendered, "utf8");
    return true;
  }

  mkdirs(base, dirs) {
    for (const dir of dirs) {
      mkdir(base, dir);
    }
  }

  async createService(dir, { service }) {
    const serviceName = this.getNameMap(service);
    console.log("create service", serviceName.lower);

    this.mkdirs(dir, [
      "services",
      `services/${serviceName.lower}`,
      `services/${serviceName.lower}/admin`,
      `services/${serviceName.lower}/admin/handlers`,
      `services/${serviceName.lower}/api`,
      `services/${serviceName.lower}/api/handlers`,
    ]);

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

    return serviceName;
  }

  async createHandlers(dir, { service, model, actions, scope }) {
    const serviceName = this.getNameMap(service);
    const modelName = this.getModelNameMap(model);
    const isAdmin = scope === "admin";
    const scopeDir = isAdmin ? `services/${serviceName.lower}/admin` : `services/${serviceName.lower}/api`;
    const handlersDir = `${scopeDir}/handlers`;
    const templatePrefix = isAdmin ? "admin.handler" : "handler";

    this.mkdirs(dir, ["services", `services/${serviceName.lower}`, scopeDir, handlersDir]);

    for (const action of actions) {
      this.createTemplateFile(dir, {
        source: `api/handler/${templatePrefix}.${action}.js.ejs`,
        destination: `${handlersDir}/${modelName.namespace}.${action}.js`,
        data: { modelName },
      });
    }
  }
}

export default BaseBuilder;
