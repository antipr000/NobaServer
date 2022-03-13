import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import { ddbTables } from './ddbtables';
// import { validateTables } from './validatetables';

//This is only for local testing
process.env.AWS_ACCESS_KEY_ID ="test";
process.env.AWS_SECRET_ACCESS_KEY = "test"; 

const dynamoClient = new DynamoDB({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, 
    endpoint: "http://localhost:4566", //'https://dynamodb.ap-southeast-1.amazonaws.com'
    region: 'ap-southeast-1',
  });

async function run() {

  // validateTables();

  console.log(
    `creating ${ddbTables.length} tables: ${ddbTables
      .map((x) => x.TableName)
      .join(',')}`,
  );
  console.log('****************** Table creation starts ***************');
  for (const table of ddbTables) {
    console.log(`creating table ${table.TableName}`);
    await new Promise((res, rej) => {
      dynamoClient.createTable(table, (err, data) => {
        if (err) {
          console.log(
            `****failed to create table ${table.TableName} with error:` + err,
          );
        } else {
          console.log(`${table.TableName} table created`);
        }
        res('table created');
      });
    });
  }
}

run();
