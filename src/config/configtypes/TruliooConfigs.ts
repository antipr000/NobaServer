import {
    TRULIOO_AWS_SECRET_KEY_FOR_DOCV_API_KEY_ATTR,
    TRULIOO_AWS_SECRET_KEY_FOR_IDV_ATTR,
    TRULIOO_DOCV_API_KEY,
    TRULIOO_IDV
} from "../ConfigurationUtils";

export interface TruliooConfigs {
    [TRULIOO_AWS_SECRET_KEY_FOR_IDV_ATTR]: string;
    [TRULIOO_AWS_SECRET_KEY_FOR_DOCV_API_KEY_ATTR]: string;
    [TRULIOO_IDV]: string;
    [TRULIOO_DOCV_API_KEY]: string;
}