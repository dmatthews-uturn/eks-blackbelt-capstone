// lib/pipeline.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope,id)

    const account = props?.env?.account!;
    const region = props?.env?.region!;
    const env = { account, region }

    const blueprint = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .addOns()
    .teams();
  
    blueprints.CodePipelineStack.builder()
      .name("eks-blackbelt-capstone-pipeline")
      .owner("dmatthews-uturn")
      .repository({
          repoUrl: 'eks-blackbelt-capstone',
          credentialsSecretName: 'github-token',
          targetRevision: 'main'
      })
      .wave({
        id: "envs",
        stages: [
          { id: "dev", stackBuilder: blueprint.clone('us-west-2', account)},
          { id: "test", stackBuilder: blueprint.clone('us-east-2', account)},
          { id: "prod", stackBuilder: blueprint.clone('us-east-1', account)}
        ]
      })
      .build(scope, id+'-stack', {env});
  }
}
