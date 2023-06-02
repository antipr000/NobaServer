import { getRandomActiveConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { NotificationPayloadMapper } from "../domain/NotificationPayload";
import { validateDocumentVerificationPendingEvent } from "../events/SendDocumentVerificationPendingEvent";
import { validateDocumentVerificationRejectedEvent } from "../events/SendDocumentVerificationRejectedEvent";
import { validateDocumentVerificationTechnicalFailureEvent } from "../events/SendDocumentVerificationTechnicalFailureEvent";
import { validateSendEmployerRequestEvent } from "../events/SendEmployerRequestEvent";
import { validateSendKycApprovedNonUSEvent } from "../events/SendKycApprovedNonUSEvent";
import { validateSendKycApprovedUSEvent } from "../events/SendKycApprovedUSEvent";
import { validateSendKycDeniedEvent } from "../events/SendKycDeniedEvent";
import { validateSendKycPendingOrFlaggedEvent } from "../events/SendKycPendingOrFlaggedEvent";
import { validateSendOtpEvent } from "../events/SendOtpEvent";
import { validateSendPhoneVerificationCodeEvent } from "../events/SendPhoneVerificationCodeEvent";
import { validateSendWelcomeMessageEvent } from "../events/SendWelcomeMessageEvent";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { validateSendUpdatePayrollStatusEvent } from "../events/SendUpdatePayrollStatusEvent";
import { validateSendScheduledReminderEvent } from "../events/SendScheduledReminderEvent";

describe("NotificationPayloadMapper Tests", () => {
  describe("toOtpEvent", () => {
    it("should map the parameters correctly when consumer does not have locale", () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const payload = NotificationPayloadMapper.toOtpEvent("123456", "fake+email@noba.com", consumer);

      expect(payload).toEqual({
        email: "fake+email@noba.com",
        otp: "123456",
        locale: "es_co",
      });

      validateSendOtpEvent(payload);
    });

    it("should map the parameters correctly when consumer has locale", () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      consumer.props.locale = "en";
      const payload = NotificationPayloadMapper.toOtpEvent("123456", "fake+email@noba.com", consumer);

      expect(payload).toEqual({
        email: "fake+email@noba.com",
        otp: "123456",
        locale: "en",
      });

      validateSendOtpEvent(payload);
    });

    it("should map parameters correctly when consumer is not provided", () => {
      const payload = NotificationPayloadMapper.toOtpEvent("123456", "fake+email@noba.com");

      expect(payload).toEqual({
        email: "fake+email@noba.com",
        otp: "123456",
        locale: "en",
      });

      validateSendOtpEvent(payload);
    });

    it("should map parameters correctly and set locale as es_co when consumer is not present and phone number is of Colombia", () => {
      const payload = NotificationPayloadMapper.toOtpEvent("123456", "+5730000000012");

      expect(payload).toEqual({
        phone: "+5730000000012",
        otp: "123456",
        locale: "es_co",
      });

      validateSendOtpEvent(payload);
    });

    it("should throw error when emailOrPhone is undefined", () => {
      expect(() => NotificationPayloadMapper.toOtpEvent("123456", undefined)).toThrowError();
    });

    it("should throw error when emailOrPhone is null", () => {
      expect(() => NotificationPayloadMapper.toOtpEvent("123456", null)).toThrowError();
    });

    it("should throw error if otp is not provided", () => {
      expect(() => {
        const payload = NotificationPayloadMapper.toOtpEvent(null, "fake+user@noba.com");
        validateSendOtpEvent(payload);
      }).toThrowError();
    });
  });

  describe("toPhoneVerificationCodeEvent", () => {
    it("should map the parameters correctly when consumer does not have locale", () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const payload = NotificationPayloadMapper.toPhoneVerificationCodeEvent("123456", consumer.props.phone, consumer);

      expect(payload).toEqual({
        phone: consumer.props.phone,
        otp: "123456",
        locale: "es_co",
      });

      validateSendPhoneVerificationCodeEvent(payload);
    });

    it("should map the parameters correctly when consumer has locale", () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      consumer.props.locale = "en";
      const payload = NotificationPayloadMapper.toPhoneVerificationCodeEvent("123456", consumer.props.phone, consumer);

      expect(payload).toEqual({
        phone: consumer.props.phone,
        otp: "123456",
        locale: "en",
      });

      validateSendPhoneVerificationCodeEvent(payload);
    });

    it("should map parameters correctly when consumer is not provided", () => {
      const payload = NotificationPayloadMapper.toPhoneVerificationCodeEvent("123456", "+5730000000012");

      expect(payload).toEqual({
        otp: "123456",
        phone: "+5730000000012",
        locale: "es_co",
      });

      validateSendPhoneVerificationCodeEvent(payload);
    });

    it("should throw error if otp is not provided", () => {
      expect(() => {
        const payload = NotificationPayloadMapper.toPhoneVerificationCodeEvent(null, "+5730000000012");
        validateSendPhoneVerificationCodeEvent(payload);
      }).toThrowError();
    });

    it("should throw error when phone is undefined", () => {
      expect(() => {
        const payload = NotificationPayloadMapper.toPhoneVerificationCodeEvent("123456", undefined);
        validateSendPhoneVerificationCodeEvent(payload);
      }).toThrowError();
    });
  });

  describe("toWelcomeMessageEvent", () => {
    it("should map parameters correctly if consumer has locale", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const payload = NotificationPayloadMapper.toWelcomeMessageEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
      });

      validateSendWelcomeMessageEvent(payload);
    });

    it("should map parameters correctly if Consumer is not active", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      delete consumer.props.address;
      delete consumer.props.phone;
      delete consumer.props.firstName;
      delete consumer.props.lastName;
      delete consumer.props.dateOfBirth;
      delete consumer.props.gender;
      delete consumer.props.locale;
      delete consumer.props.verificationData;
      const payload = NotificationPayloadMapper.toWelcomeMessageEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
      });

      validateSendWelcomeMessageEvent(payload);
    });

    it("should throw error if email is not present", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      delete consumer.props.email;
      expect(() => {
        const payload = NotificationPayloadMapper.toWelcomeMessageEvent(consumer);
        validateSendWelcomeMessageEvent(payload);
      }).toThrowError();
    });
  });

  describe("toKycApprovedUSEvent", () => {
    it("should map parameters correctly for active consumer", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      const payload = NotificationPayloadMapper.toKycApprovedUSEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycApprovedUSEvent(payload);
    });

    it("should not throw error if firstName is missing", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      delete consumer.props.firstName;
      const payload = NotificationPayloadMapper.toKycApprovedUSEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: undefined,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycApprovedUSEvent(payload);
    });

    it("should not throw error if lastName is missing", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      delete consumer.props.lastName;
      const payload = NotificationPayloadMapper.toKycApprovedUSEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: consumer.props.firstName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycApprovedUSEvent(payload);
    });
  });

  describe("toKycApprovedNonUSEvent", () => {
    it("should map parameters correctly for active consumer", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const payload = NotificationPayloadMapper.toKycApprovedNonUSEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycApprovedNonUSEvent(payload);
    });

    it("should not throw error if firstName is missing", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      delete consumer.props.firstName;
      const payload = NotificationPayloadMapper.toKycApprovedNonUSEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
        firstName: undefined,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycApprovedNonUSEvent(payload);
    });

    it("should not throw error if lastName is missing", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      delete consumer.props.lastName;
      const payload = NotificationPayloadMapper.toKycApprovedNonUSEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
        firstName: consumer.props.firstName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycApprovedNonUSEvent(payload);
    });
  });

  describe("toKycDeniedEvent", () => {
    it("should map parameters correctly for active consumer", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const payload = NotificationPayloadMapper.toKycDeniedEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycDeniedEvent(payload);
    });

    it("should not throw error if firstName is missing", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      delete consumer.props.firstName;
      const payload = NotificationPayloadMapper.toKycDeniedEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
        firstName: undefined,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycDeniedEvent(payload);
    });

    it("should not throw error if lastName is missing", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      delete consumer.props.lastName;
      const payload = NotificationPayloadMapper.toKycDeniedEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
        firstName: consumer.props.firstName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycDeniedEvent(payload);
    });
  });

  describe("toKycPendingOrFlaggedEvent", () => {
    it("should map parameters correctly for active consumer", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const payload = NotificationPayloadMapper.toKycPendingOrFlaggedEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycPendingOrFlaggedEvent(payload);
    });

    it("should not throw error if firstName is missing", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      delete consumer.props.firstName;
      const payload = NotificationPayloadMapper.toKycPendingOrFlaggedEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
        firstName: undefined,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycPendingOrFlaggedEvent(payload);
    });

    it("should not throw error if lastName is missing", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      delete consumer.props.lastName;
      const payload = NotificationPayloadMapper.toKycPendingOrFlaggedEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "es_co",
        firstName: consumer.props.firstName,
        nobaUserID: consumer.props.id,
      });

      validateSendKycPendingOrFlaggedEvent(payload);
    });
  });

  describe("toDocumentVerificationPendingEvent", () => {
    it("should map parameters correctly for active consumer", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      const payload = NotificationPayloadMapper.toDocumentVerificationPendingEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateDocumentVerificationPendingEvent(payload);
    });

    it("should not throw error if firstName is missing", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      delete consumer.props.firstName;
      const payload = NotificationPayloadMapper.toDocumentVerificationPendingEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: undefined,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateDocumentVerificationPendingEvent(payload);
    });

    it("should not throw error if lastName is missing", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      delete consumer.props.lastName;
      const payload = NotificationPayloadMapper.toDocumentVerificationPendingEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: consumer.props.firstName,
        nobaUserID: consumer.props.id,
      });

      validateDocumentVerificationPendingEvent(payload);
    });
  });

  describe("toDocumentVerificationRejectedEvent", () => {
    it("should map parameters correctly for active consumer", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      const payload = NotificationPayloadMapper.toDocumentVerificationRejectedEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateDocumentVerificationRejectedEvent(payload);
    });

    it("should not throw error if firstName is missing", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      delete consumer.props.firstName;
      const payload = NotificationPayloadMapper.toDocumentVerificationRejectedEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: undefined,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateDocumentVerificationRejectedEvent(payload);
    });

    it("should not throw error if lastName is missing", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      delete consumer.props.lastName;
      const payload = NotificationPayloadMapper.toDocumentVerificationRejectedEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: consumer.props.firstName,
        nobaUserID: consumer.props.id,
      });

      validateDocumentVerificationRejectedEvent(payload);
    });
  });

  describe("toDocumentVerificationTechnicalFailureEvent", () => {
    it("should map parameters correctly for active consumer", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      const payload = NotificationPayloadMapper.toDocumentVerificationTechnicalFailureEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateDocumentVerificationTechnicalFailureEvent(payload);
    });

    it("should not throw error if firstName is missing", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      delete consumer.props.firstName;
      const payload = NotificationPayloadMapper.toDocumentVerificationTechnicalFailureEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: undefined,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      validateDocumentVerificationTechnicalFailureEvent(payload);
    });

    it("should not throw error if lastName is missing", async () => {
      const consumer = getRandomActiveConsumer("1", "US");
      delete consumer.props.lastName;
      const payload = NotificationPayloadMapper.toDocumentVerificationTechnicalFailureEvent(consumer);

      expect(payload).toStrictEqual({
        email: consumer.props.email,
        locale: "en_us",
        firstName: consumer.props.firstName,
        nobaUserID: consumer.props.id,
      });

      validateDocumentVerificationTechnicalFailureEvent(payload);
    });
  });

  describe("toEmployerRequestEvent", () => {
    it("should map parameters correctly when everything is provided", async () => {
      const payload = NotificationPayloadMapper.toEmployerRequestEvent("fake+user@noba.com", "Fake", "User");

      expect(payload).toStrictEqual({
        email: "fake+user@noba.com",
        firstName: "Fake",
        lastName: "User",
        locale: "en",
      });

      validateSendEmployerRequestEvent(payload);
    });

    it("should throw error if email is not proper", async () => {
      expect(() => {
        const payload = NotificationPayloadMapper.toEmployerRequestEvent("fakeuser@noba", "Fake", "User");
        validateSendEmployerRequestEvent(payload);
      }).toThrowError();
    });

    it("should throw error if firstName is missing", async () => {
      expect(() => {
        const payload = NotificationPayloadMapper.toEmployerRequestEvent("fake+user@noba.com", undefined, "User");
        validateSendEmployerRequestEvent(payload);
      }).toThrowError();
    });

    it("should not throw error if lastName is missing", async () => {
      const payload = NotificationPayloadMapper.toEmployerRequestEvent("fake+user@noba.com", "Fake", undefined);

      expect(payload).toStrictEqual({
        email: "fake+user@noba.com",
        firstName: "Fake",
        locale: "en",
        lastName: undefined,
      });

      validateSendEmployerRequestEvent(payload);
    });
  });

  describe("toUpdatePayrollStatusEvent", () => {
    it("should map parameters correctly when everything is provided", () => {
      const payload = NotificationPayloadMapper.toUpdatePayrollStatusEvent("payroll-id", PayrollStatus.COMPLETED);

      expect(payload).toStrictEqual({
        nobaPayrollID: "payroll-id",
        payrollStatus: PayrollStatus.COMPLETED,
      });

      validateSendUpdatePayrollStatusEvent(payload);
    });

    it("should throw Error when status is missing", async () => {
      expect(() => {
        const payload = NotificationPayloadMapper.toUpdatePayrollStatusEvent("payroll-id", undefined);

        validateSendUpdatePayrollStatusEvent(payload);
      }).toThrowError();
    });

    it("should throw Error when employeeID is missing", async () => {
      expect(() => {
        const payload = NotificationPayloadMapper.toUpdatePayrollStatusEvent(undefined, PayrollStatus.COMPLETED);

        validateSendUpdatePayrollStatusEvent(payload);
      }).toThrowError();
    });
  });

  describe("SendScheduledReminderEvent", () => {
    it("should not throw Error when email is null", () => {
      const consumer = getRandomActiveConsumer("1", "US");
      consumer.props.email = null;
      const payload = NotificationPayloadMapper.toScheduledReminderEvent(consumer, "fake-event");

      expect(payload).toStrictEqual({
        email: null,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        locale: consumer.props.locale,
        nobaUserID: consumer.props.id,
        eventID: "fake-event",
        handle: consumer.props.handle,
        phone: consumer.props.phone,
      });

      validateSendScheduledReminderEvent(payload);
    });

    it("should not throw Error when optional fields are null", () => {
      const consumer = getRandomActiveConsumer("1", "US");
      consumer.props.email = null;
      consumer.props.phone = null;
      consumer.props.handle = null;
      consumer.props.locale = null;
      const payload = NotificationPayloadMapper.toScheduledReminderEvent(consumer, "fake-event");

      expect(payload).toStrictEqual({
        email: null,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
        eventID: "fake-event",
        handle: null,
        phone: null,
      });

      validateSendScheduledReminderEvent(payload);
    });

    it("should throw Error when eventID is null", () => {
      const consumer = getRandomActiveConsumer("1", "US");
      expect(() => {
        const payload = NotificationPayloadMapper.toScheduledReminderEvent(consumer, null);
        validateSendScheduledReminderEvent(payload);
      }).toThrowError();
    });
  });
});
