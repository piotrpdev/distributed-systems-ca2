import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Duration } from "aws-cdk-lib";

export class GalleryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const imagesBucket = new s3.Bucket(this, "images-bucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    const galleryTopic = new sns.Topic(this, "GalleryTopic", {
      displayName: "Gallery Topic",
    });

    const logImageQueue = new sqs.Queue(this, "log-image-queue", {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
    });

    const imageTable = new dynamodb.Table(this, "ImageTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "imageId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "ImageTable",
    });

    const logImageFn = new lambdanode.NodejsFunction(this, "LogImageFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/logImage.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        REGION: "eu-west-1",
        TABLE_NAME: imageTable.tableName
      },
    });

    imagesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(galleryTopic)
    );

    galleryTopic.addSubscription(
      new subs.SqsSubscription(logImageQueue)
    );

    logImageFn.addEventSource(
      new SqsEventSource(logImageQueue, {
        maxBatchingWindow: Duration.seconds(5),
        maxConcurrency: 2,
      })
    );

    imageTable.grantReadWriteData(logImageFn);

    new cdk.CfnOutput(this, "bucketName", {
      value: imagesBucket.bucketName,
    });
  }
}
  