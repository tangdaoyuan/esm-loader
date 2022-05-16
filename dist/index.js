import { installSourceMapSupport, transform } from '@esbuild-kit/core-utils';
import getTsconfig from 'get-tsconfig';
import path from 'path';
import { init } from 'es-module-lexer';
import fs from 'fs';
import { fileURLToPath } from 'url';

const tsExtensionsPattern = /\.([cm]?ts|[tj]sx)$/;
const getFormatFromExtension = (filePath) => {
  const extension = path.extname(filePath);
  if (extension === ".mts") {
    return "module";
  }
  if (extension === ".cts") {
    return "commonjs";
  }
};
init.then(() => {
});

const packageJsonCache = /* @__PURE__ */ new Map();
async function readPackageJson(filePath) {
  if (packageJsonCache.has(filePath)) {
    return packageJsonCache.get(filePath);
  }
  const exists = await fs.promises.access(filePath).then(() => true, () => false);
  if (!exists) {
    packageJsonCache.set(filePath, void 0);
    return;
  }
  const packageJsonString = await fs.promises.readFile(filePath, "utf8");
  try {
    const packageJson = JSON.parse(packageJsonString);
    packageJsonCache.set(filePath, packageJson);
    return packageJson;
  } catch {
    throw new Error(`Error parsing: ${filePath}`);
  }
}
async function findPackageJson(filePath) {
  let packageJsonUrl = new URL("package.json", filePath);
  while (true) {
    if (packageJsonUrl.pathname.endsWith("/node_modules/package.json")) {
      break;
    }
    const packageJsonPath = fileURLToPath(packageJsonUrl);
    const packageJson = await readPackageJson(packageJsonPath);
    if (packageJson) {
      return packageJson;
    }
    const lastPackageJSONUrl = packageJsonUrl;
    packageJsonUrl = new URL("../package.json", packageJsonUrl);
    if (packageJsonUrl.pathname === lastPackageJSONUrl.pathname) {
      break;
    }
  }
}
async function getPackageType(filePath) {
  var _a;
  const packageJson = await findPackageJson(filePath);
  return (_a = packageJson == null ? void 0 : packageJson.type) != null ? _a : "commonjs";
}

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const sourcemaps$1 = installSourceMapSupport();
const tsconfig$1 = getTsconfig();
const tsconfigRaw$1 = tsconfig$1 == null ? void 0 : tsconfig$1.config;
const hasExtensionPattern = /\.\w+$/;
const extensions = [".js", ".json", ".ts", ".tsx", ".jsx"];
const possibleSuffixes = [
  ...extensions,
  ...extensions.map((extension) => `/index${extension}`)
];
const resolve = async function(specifier, context, defaultResolve) {
  var _a;
  if (specifier.startsWith("node:")) {
    specifier = specifier.slice(5);
  }
  if (specifier.endsWith("/")) {
    return resolve(`${specifier}index`, context, defaultResolve);
  }
  if (/\.[cm]js$/.test(specifier) && tsExtensionsPattern.test(context.parentURL)) {
    try {
      return await resolve(`${specifier.slice(0, -2)}ts`, context, defaultResolve);
    } catch {
    }
  }
  if (tsExtensionsPattern.test(specifier)) {
    const resolved = await defaultResolve(specifier, context, defaultResolve);
    const format = (_a = getFormatFromExtension(resolved.url)) != null ? _a : await getPackageType(resolved.url);
    return __spreadProps(__spreadValues({}, resolved), {
      format
    });
  }
  if (specifier.endsWith(".json")) {
    return __spreadProps(__spreadValues({}, await defaultResolve(specifier, context, defaultResolve)), {
      format: "json"
    });
  }
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    if (error instanceof Error) {
      if (error.code === "ERR_UNSUPPORTED_DIR_IMPORT") {
        return resolve(`${specifier}/index`, context, defaultResolve);
      }
      if (error.code === "ERR_MODULE_NOT_FOUND" && !hasExtensionPattern.test(specifier)) {
        for (const suffix of possibleSuffixes) {
          try {
            const trySpecifier = specifier + (specifier.endsWith("/") && suffix.startsWith("/") ? suffix.slice(1) : suffix);
            return await resolve(trySpecifier, context, defaultResolve);
          } catch {
          }
        }
      }
    }
    throw error;
  }
};
const load = async function(url, context, defaultLoad) {
  if (process.send) {
    process.send({
      type: "dependency",
      path: url
    });
  }
  if (url.endsWith(".json")) {
    context.importAssertions.type = "json";
  }
  const loaded = await defaultLoad(url, context, defaultLoad);
  if (!loaded.source || url.includes("/node_modules/")) {
    return loaded;
  }
  const code = loaded.source.toString();
  if (loaded.format === "json" || tsExtensionsPattern.test(url)) {
    const transformed = await transform(code, url, {
      format: "esm",
      tsconfigRaw: tsconfigRaw$1
    });
    if (transformed.map) {
      sourcemaps$1.set(url, transformed.map);
    }
    return {
      format: "module",
      source: transformed.code
    };
  }
  return loaded;
};

const tsconfig = getTsconfig();
const tsconfigRaw = tsconfig == null ? void 0 : tsconfig.config;
const sourcemaps = installSourceMapSupport();
const _getFormat = async function(url, context, defaultGetFormat) {
  var _a;
  if (url.endsWith(".json")) {
    return { format: "module" };
  }
  if (tsExtensionsPattern.test(url)) {
    const format = (_a = getFormatFromExtension(url)) != null ? _a : await getPackageType(url);
    return { format };
  }
  return await defaultGetFormat(url, context, defaultGetFormat);
};
const _transformSource = async function(source, context, defaultTransformSource) {
  const { url } = context;
  if (process.send) {
    process.send({
      type: "dependency",
      path: url
    });
  }
  if (url.endsWith(".json") || tsExtensionsPattern.test(url)) {
    const transformed = await transform(source.toString(), url, {
      format: "esm",
      tsconfigRaw
    });
    if (transformed.map) {
      sourcemaps.set(url, transformed.map);
    }
    return {
      source: transformed.code
    };
  }
  return defaultTransformSource(source, context, defaultTransformSource);
};
const loadersDeprecatedVersion = [16, 12, 0];
const nodeVersion = process.version.slice(1).split(".").map(Number);
const nodeSupportsDeprecatedLoaders = (nodeVersion[0] - loadersDeprecatedVersion[0] || nodeVersion[1] - loadersDeprecatedVersion[1] || nodeVersion[2] - loadersDeprecatedVersion[2]) < 0;
const getFormat = nodeSupportsDeprecatedLoaders ? _getFormat : void 0;
const transformSource = nodeSupportsDeprecatedLoaders ? _transformSource : void 0;

export { getFormat, load, resolve, transformSource };
