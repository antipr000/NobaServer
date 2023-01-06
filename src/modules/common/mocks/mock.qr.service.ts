import { anyString, mock, when } from "ts-mockito";
import { QRService } from "../qrcode.service";

export function getMockQRServiceWithDefaults() {
  const qrService = mock(QRService);
  when(qrService.generateQRCode(anyString())).thenReject(new Error("Method not implemented!"));
  return qrService;
}
