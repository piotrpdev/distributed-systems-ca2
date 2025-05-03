import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Handler, SQSHandler } from "aws-lambda";

const ddbDocClient = createDDbDocClient();

export const handler: SQSHandler = async (event, context) => {
  try {
    for (const rec of event.Records) {
      const recMsg = JSON.parse(JSON.parse(rec.body).Message);
      console.log("SNS: ", JSON.stringify(recMsg))

      if (!recMsg.Records) {
        console.log("No Records in SNS message");
        throw new Error("No Records in SNS message");
      }

      for (const msgRec of recMsg.Records) {
        const s3Key = msgRec.s3?.object?.key;
        console.log("S3 Object Key: ", JSON.stringify(s3Key));

        if (!s3Key) {
          console.log("Missing S3 object key");
          throw new Error("Missing S3 object key");
        }

        if (!s3Key.endsWith(".jpeg") && !s3Key.endsWith(".png")) {
          console.log("Only .jpeg and .png allowed");
          throw new Error("Only .jpeg and .png allowed");
        }

        const commandOutput = await ddbDocClient.send(
          new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: { imageId: s3Key },
          })
        );

        console.log("commandOutput: ", commandOutput);
      }
    }
  } catch (error: any) {
    console.log(JSON.stringify({ error }));
    throw new Error(JSON.stringify({ error }));
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
