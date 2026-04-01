import { setResourceLoader } from "./resource-loader/resource-loader.config";
import { WebResourceLoader } from "./resource-loader/web-resource-loader";

setResourceLoader(new WebResourceLoader());

export * from "./index";
