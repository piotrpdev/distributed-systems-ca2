import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Handler, SQSHandler } from "aws-lambda";

const s3 = new S3Client({ region: process.env.REGION });

export const handler: SQSHandler = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    
    for (const rec of event.Records) {
      const recBody = JSON.parse(rec.body);

      // if (recBody?.Subject !== "Amazon S3 Notification") {
      //   console.log("Not an S3 notification");
      //   return;
      // }

      const recMsg = JSON.parse(recBody.Message);
      console.log("SNS: ", JSON.stringify(recMsg))

      if (!recMsg.Records) {
        console.log("No Records in SNS message");
        throw new Error("No Records in SNS message");
      }

      for (const msgRec of recMsg.Records) {
        const s3Key = msgRec.s3?.object?.key;
        console.log("S3 Object Key: ", JSON.stringify(s3Key));

        const s3Bucket = msgRec.s3?.bucket?.name;
        console.log("S3 Bucket Name: ", JSON.stringify(s3Bucket));

        if (!s3Key) {
          console.log("Missing S3 object key");
          throw new Error("Missing S3 object key");
        }

        if (!s3Bucket) {
          console.log("Missing S3 bucket name");
          throw new Error("Missing S3 bucket name");
        }

        const commandOutput = await s3.send(
          new DeleteObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
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
