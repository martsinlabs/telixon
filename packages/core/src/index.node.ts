import { NodeResourceLoader } from "./resource-loader/node-resource-loader";
import { setResourceLoader } from "./resource-loader/resource-loader.config";

setResourceLoader(new NodeResourceLoader());

export * from "./index";
