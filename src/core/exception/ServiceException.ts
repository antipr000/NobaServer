const SERVICE_ERROR_CODE = {
  EMAIL_ALREADY_EXISTS: "EmailAlreadyExists",
  ITEM_NOT_FOUND_IN_DB: "ItemDoesNotExistsInDB",
  DUPLICATE_ITEM_EXCEPTION: "DuplicateItemsException",
  INVALID_INPUT: "InvalidInput",
} as const;

type ServiceErrorCode = keyof typeof SERVICE_ERROR_CODE;

export type ServiceExceptionConstructor = {
  message?: string; //this is not visible to client, if not set will default to messageForClient
  errorCode?: ServiceErrorCode;
  clientExceptionData?: any;
  error?: any;
};

export class ServiceException extends Error {
  constructor(params: ServiceExceptionConstructor) {
    super(params.message);
  }
}
