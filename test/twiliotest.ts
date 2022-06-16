//npx ts-node test/twiliotest.ts

import { Twilio } from "twilio";

run();

async function run() {
  //SID and AUTH TOKEN shouldn't be put in code they are supposed to be secrets

  const ACCOUNT_SID = "AC4efa22156849ec40b383a80f45525409";
  const AUTH_TOKEN = "c34165debbb0a77e3507884e86b88772";
  const FROM_NUMBER = "+19894557345";
  const twilioClient = new Twilio(ACCOUNT_SID, AUTH_TOKEN);
  const d = await twilioClient.messages.create({
    from: FROM_NUMBER,
    to: "+91 8171685165",
    body: "123456 is your one time password for Noba Pay login.",
  });

  console.log(d);
}
