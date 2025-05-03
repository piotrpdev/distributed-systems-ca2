import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Handler, SNSHandler, SQSHandler } from "aws-lambda";

const ddbDocClient = createDDbDocClient();

export const handler: SNSHandler = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    
    for (const rec of event.Records) {
      try {
        const msg = JSON.parse(rec.Sns.Message);
        let msgId = msg?.id;
        let msgDate = msg?.date;
        let msgUpdate = msg?.update;
        let msgStatus = msgUpdate?.status;
        let msgReason = msgUpdate?.reason;

        console.log("msgId: ", msgId);
        console.log("msgDate: ", msgDate);
        console.log("msgStatus: ", msgStatus);
        console.log("msgReason: ", msgReason);

        if (!msgId || !msgDate || !msgStatus || !msgReason) {
            console.log("Missing msgId, msgDate, msgStatus or msgReason");
            continue;
        }

        const updateTableOuput = await ddbDocClient.send(
          new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: { imageId: msgId },
            UpdateExpression: `SET #status = :status, #reason = :reason`,
            ExpressionAttributeNames: {
              "#status": "status",
              "#reason": "reason",
            },
            ExpressionAttributeValues: { ":status": msgStatus, ":reason": msgReason },
          })
        );

        console.log("UpdateCommand: ", updateTableOuput);
      } catch (error: any) {
        console.log(JSON.stringify({ error }));
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
