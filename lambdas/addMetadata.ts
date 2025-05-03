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
        const metaType = rec.Sns.MessageAttributes.metadata_type.Value;
        let msgId = msg?.id;
        let msgValue = msg?.value;

        console.log("msgId: ", msgId);
        console.log("msgValue: ", msgValue);
        console.log("metaType: ", metaType);

        if (!msgId || !msgValue || !metaType) {
          console.log("Missing msgId, msgValue or metaType");
          continue;
        }

        const updateTableOuput = await ddbDocClient.send(
          new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: { imageId: msgId },
            UpdateExpression: `SET #metatype = :val`,
            ExpressionAttributeNames: {
              "#metatype": metaType.toLowerCase(),
            },
            ExpressionAttributeValues: { ":val": msgValue },
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
