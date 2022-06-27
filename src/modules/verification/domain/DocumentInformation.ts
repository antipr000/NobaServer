import { DocumentTypes } from "./DocumentTypes";
import { Express } from "express";
// eslint-disable-next-line unused-imports/no-unused-imports
import { Multer } from "multer";

export type DocumentInformation = {
  userID: string;
  documentType: DocumentTypes;
  documentFrontImage: Express.Multer.File;
  documentBackImage?: Express.Multer.File;
  photoImage?: Express.Multer.File;
};
