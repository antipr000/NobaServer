const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

const hostname = "127.0.0.1";
const port = 1080;

const server = http.createServer((req, res) => {
  // Setup the two endpoints that Pomelo will hit in order to process card
  // transactions:
  if (req.url === "/transactions/authorizations") {
    authorizations(req, res);
  } else if (req.url.startsWith("/transactions/adjustments")) {
    adjustment(req, res);
  } else {
    res.statusCode = 404;
    res.end();
  }
});

// start http server
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// authorizations is your endpoint to handle card transactions that you can
// approve or reject. Here you'd check the user balance and apply any custom
// business logic
const authorizations = async (req, res) => {
  if (!(await checkSignature(req))) {
    console.log("Invalid signature, aborting");
    return;
  }

  // do your logic

  console.log("Authorization processed");

  let response = {
    Status: "APPROVED",
    StatusDetail: "APPROVED",
    Message: "OK",
  };

  // Marshal object to bytes (alternatively to string and then to bytes). It's
  // important to sign the exact same bytes that are written to the response
  // body.
  // Be careful with frameworks that allow you to return objects directly,
  // because their json marshalling might be different from yours. In that
  // case we recommend using a filter/interceptor/middleware to access the
  // raw response body
  let body = Buffer.from(JSON.stringify(response));

  await signResponse(body, req, res); // sign response first so headers are written before body
  res.setHeader("Content-Type", "application/json");
  res.end(body);
};

const adjustment = async (req, res) => {
  if (!(await checkSignature(req))) {
    console.log("Invalid signature, aborting");
    return;
  }

  // do your logic

  console.log("Adjustment processed");

  // adjustments have an empty response with no response body. Be careful with empty
  // objects and frameworks that might encode these as {}, the string "None",
  // a blank space ' ', etc. Signing those strings  will make the signature check to fail.

  await signResponse(null, req, res); // write signature headers first
  res.setHeader("Content-Type", "application/json");
  res.end();
};

// checkSignature does all the signature validations that you need to implement
// to make sure only Pomelo has signed this request and not an attacker. A
// signature mismatch should abort the http request or return Forbidden
const checkSignature = async (req) => {
  // console.log(req.headers);
  // console.log(req.body);

  let endpoint = req.headers["x-endpoint"];
  let timestamp = req.headers["x-timestamp"];
  let signature = req.headers["x-signature"];

  // Pomelo sends the algorithm + the signature in the X-Signature header, separated by a space
  // ex:
  // 		X-Signature:hmac-sha256 whk5MLlMd+zJBkEDGa9LYZVUsNsdKWJ94Qm3EXy6VK8=
  if (signature.startsWith("hmac-sha256")) {
    signature = signature.replace("hmac-sha256 ", "");
  } else {
    console.log(
      `Unsupported signature algorithm, expecting hmac-sha256, got ${signature}`
    );
    return false;
  }

  // important to read the raw body directly from the request as bytes, prior
  // to any json object deserialization which are framework-specific and can
  // change the string representation
  let rawBody = await getRawBody(req);

  console.log("ApiKey: ", req.headers["x-api-key"]);
  let secret = getApiSecret(req.headers["x-api-key"]);

  console.log(timestamp + endpoint + rawBody);
  // construct a new hasher and hash timestamp + endpoint + body without any
  // separators nor any decoding
  // console.log("Raw Body: " + rawBody);
  let hmac = crypto
    .createHmac("sha256", secret)
    .update(timestamp)
    .update(endpoint)
    .update(rawBody);

  let hashResult = hmac.digest("base64"); // calculated signature result
  let hashResultBytes = Buffer.from(hashResult, "base64"); // bytes representation

  // compare signatures using a cryptographically secure function
  // for that you normally need the signature bytes, so decode from base64
  signatureBytes = Buffer.from(signature, "base64");
  signaturesMatch = crypto.timingSafeEqual(hashResultBytes, signatureBytes);

  if (!signaturesMatch) {
    console.log(
      `Signature mismatch. Received ${signature}, calculated ${hashResult}`
    );
    return false;
  }

  return true;
};

// signResponse computes the signature of the given response and writes the
// necessary headers that Pomelo needs in order to reconstruct and validate the
// signature. If this method computes the signature wrongly, Pomelo will reject
// al responses!
const signResponse = async (body, req, res) => {
  let endpoint = req.headers["x-endpoint"];

  // do not re-send the same timestamp that pomelo sent, simply send the
  // current time. Clock skews can cause the signature check to fail!
  let timestamp = "" + Math.floor(Date.now() / 1000);

  let secret = getApiSecret(req.headers["x-api-key"]);

  // construct a new hasher and hash timestamp + endpoint + body (if not nil) without
  // separators nor any decoding (notice how body might not be part of the signature)
  hash = crypto.createHmac("sha256", secret).update(timestamp).update(endpoint);

  // be careful with empty bodies, do not hash spaces, empty json objects
  // (like {}), the string 'null', etc. Simply don't hash anything
  // if body is nil we don't pass it to the hasher so it's not considered for
  // signing
  if (body) {
    hash.update(body);
  }

  let hashResult = hash.digest("base64"); // calculated signature result

  res.setHeader("X-Endpoint", endpoint);
  res.setHeader("X-Timestamp", timestamp);

  // remember to write the algorithm plus the hash result
  res.setHeader("X-signature", "hmac-sha256 " + hashResult);
};

// We do not recommend storing api secrets in your code, specially in plaintext
// This is here just for example purposes
var apiSecrets = {
  "Lp0g+cwb19eEfTn1YIOydEnqPcZOg8YxHctnMe+1cQA=":
    "uC8fVXzXMyaw1PseV452i6ozQwIIa4olcSpjuvn5E4E=",
  "5y8NSzLGYSegboKhGT3N8CXjnrv9yDVK=":
    "pp3NcIQ5byqtgQqmGBKNiUONB5AoLeu3nsET1tIZWKu2p4ubq_mwkWee1YgH99cC",
  "POMELO_CLIENT_ID": "POMELO_CLIENT_SECRET",
  "x": "y",
};

// getApiSecret returns the api secret for a given api key. We recommend you
// support multiple key pairs simultaneously and not just one key pair.
const getApiSecret = (apiKey) => {
  let apiSecret = apiSecrets[apiKey];
  console.log("RawSecret: ", apiSecret);
  // key = Buffer.from(apiSecret, "base64");
  key = Buffer.from(apiSecret, "utf8");

  console.log("KEY: ", key.toString());
  // abort if key not found!
  return key;
};

const getRawBody = async (req) => {
  const data = `{
    "transaction": {
      "id": "ctx-55f02942-823c-4f94-8a28-4439dcabf894",
      "country_code": "ESP",
      "type": "PURCHASE",
      "point_type": "ECOMMERCE",
      "entry_mode": "MANUAL",
      "origin": "INTERNATIONAL",
      "local_date_time": "2023-03-28T09:03:34",
      "original_transaction_id": null
    },
    "merchant": {
      "id": "111111111111111",
      "mcc": "5045",
      "address": null,
      "name": "Computer Software"
    },
    "card": {
      "id": "crd-1629483284114MGA9BF",
      "product_type": "PREPAID",
      "provider": "MASTERCARD",
      "last_four": "6708"
    },
    "user": {
      "id": "usr-1629293693904DM2U4T"
    },
    "amount": {
      "local": {
        "total": 999.9,
        "currency": "ARS"
      },
      "transaction": {
        "total": 9.45,
        "currency": "EUR"
      },
      "settlement": {
        "total": 11.0,
        "currency": "USD"
      },
      "details": [{
        "type": "BASE",
        "currency": "ARS",
        "amount": 999.9,
        "name": "BASE"
      }]
    }
  }`;
  const result = Buffer.from(data, 'utf8');
  // const x = "Y29uc3QgZGF0YSA9IHsKICAgICJ0cmFuc2FjdGlvbiI6IHsKICAgICAgImlkIjogImN0eC01NWYwMjk0Mi04MjNjLTRmOTQtOGEyOC00NDM5ZGNhYmY4OTQiLAogICAgICAiY291bnRyeV9jb2RlIjogIkVTUCIsCiAgICAgICJ0eXBlIjogIlBVUkNIQVNFIiwKICAgICAgInBvaW50X3R5cGUiOiAiRUNPTU1FUkNFIiwKICAgICAgImVudHJ5X21vZGUiOiAiTUFOVUFMIiwKICAgICAgIm9yaWdpbiI6ICJJTlRFUk5BVElPTkFMIiwKICAgICAgImxvY2FsX2RhdGVfdGltZSI6ICIyMDIzLTAzLTI4VDA5OjAzOjM0IiwKICAgICAgIm9yaWdpbmFsX3RyYW5zYWN0aW9uX2lkIjogbnVsbAogICAgfSwKICAgICJtZXJjaGFudCI6IHsKICAgICAgImlkIjogIjExMTExMTExMTExMTExMSIsCiAgICAgICJtY2MiOiAiNTA0NSIsCiAgICAgICJhZGRyZXNzIjogbnVsbCwKICAgICAgIm5hbWUiOiAiQ29tcHV0ZXIgU29mdHdhcmUiCiAgICB9LAogICAgImNhcmQiOiB7CiAgICAgICJpZCI6ICJjcmQtMTYyOTQ4MzI4NDExNE1HQTlCRiIsCiAgICAgICJwcm9kdWN0X3R5cGUiOiAiUFJFUEFJRCIsCiAgICAgICJwcm92aWRlciI6ICJNQVNURVJDQVJEIiwKICAgICAgImxhc3RfZm91ciI6ICI2NzA4IgogICAgfSwKICAgICJ1c2VyIjogewogICAgICAiaWQiOiAidXNyLTE2MjkyOTM2OTM5MDRETTJVNFQiCiAgICB9LAogICAgImFtb3VudCI6IHsKICAgICAgImxvY2FsIjogewogICAgICAgICJ0b3RhbCI6IDk5OS45LAogICAgICAgICJjdXJyZW5jeSI6ICJBUlMiCiAgICAgIH0sCiAgICAgICJ0cmFuc2FjdGlvbiI6IHsKICAgICAgICAidG90YWwiOiA5LjQ1LAogICAgICAgICJjdXJyZW5jeSI6ICJFVVIiCiAgICAgIH0sCiAgICAgICJzZXR0bGVtZW50IjogewogICAgICAgICJ0b3RhbCI6IDExLjAsCiAgICAgICAgImN1cnJlbmN5IjogIlVTRCIKICAgICAgfSwKICAgICAgImRldGFpbHMiOiBbewogICAgICAgICJ0eXBlIjogIkJBU0UiLAogICAgICAgICJjdXJyZW5jeSI6ICJBUlMiLAogICAgICAgICJhbW91bnQiOiA5OTkuOSwKICAgICAgICAibmFtZSI6ICJCQVNFIgogICAgICB9XQogICAgfQogIH07";
  // const result = Buffer.from(x, "base64")
  console.log(result);
  return result;

  // const buffers = [];

  // for await (const chunk of req) {
  //   fs.writeFileSync("/tmp/x", chunk);
  //   buffers.push(chunk);
  // }

  // console.log(buffers);
  // const data = Buffer.concat(buffers).toString();
  // // console.log("BufferedData: ", data);
  // return data;
};