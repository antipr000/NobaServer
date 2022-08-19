import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const IS_NO_API_KEY_NEEDED_KEY = "isNoApiKeyNeeded";
export const IsNoApiKeyNeeded = () => SetMetadata(IS_NO_API_KEY_NEEDED_KEY, true);
