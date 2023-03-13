import { anyString, anything, mock, when } from "ts-mockito";
import { S3Service } from "../s3.service";

export function getMockS3ServiceWithDefaults(): S3Service {
  const mockS3Service = mock(S3Service);
  when(mockS3Service.loadFromS3(anyString(), anyString())).thenReject(new Error("Method not implemented"));
  when(mockS3Service.uploadToS3(anyString(), anyString(), anything())).thenReject(new Error("Method not implemented"));
  return mockS3Service;
}
