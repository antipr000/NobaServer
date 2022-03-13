

export const GLOBAL_SECRETS_CACHE: {[key: string]: string} = {}; 



export class SecretProvider {

    static cached = false; 

    static async cacheAllSecrets() {
        console.log("Calling secrets provider api and caching all secrets");
        //todo use aws secrets manager here
        this.setGlobalSecretsCache({});
    }

    static getSecret(key: string) {
        if(!SecretProvider.cached) throw new Error("Secrets were never fetched so cannot return anything!"); 
        return GLOBAL_SECRETS_CACHE[key]; 
    }

    private static setGlobalSecretsCache(cache: {[key: string]: string}) {
        SecretProvider.cached = true;
        for(const key of Object.keys(cache)) {
            GLOBAL_SECRETS_CACHE[key] = cache[key];
        }
    }
}