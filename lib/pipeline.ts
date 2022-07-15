// lib/pipeline.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { TeamPlatform, TeamApplication } from '../teams';

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope,id)

    const account = props?.env?.account!;
    const region = props?.env?.region!;
    const env = { account, region }

    const blueprint = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .addOns(new blueprints.CalicoAddOn,
    new blueprints.MetricsServerAddOn,
    new blueprints.ClusterAutoScalerAddOn,
    new blueprints.ContainerInsightsAddOn,
    new blueprints.AwsLoadBalancerControllerAddOn(),
    new blueprints.VpcCniAddOn(),
    new blueprints.CoreDnsAddOn(),
    new blueprints.KubeProxyAddOn(),
    new blueprints.XrayAddOn())
    .teams(new TeamPlatform(account), new TeamApplication('burnham',account),new TeamApplication('riker',account));
  
    const repoUrl = 'https://github.com/dmatthews-uturn/eks-blueprints-workloads.git';

    const bootstrapRepo : blueprints.ApplicationRepository = {
        repoUrl,
        targetRevision: 'deployable',
    }  
  
    const devBootstrapArgo = new blueprints.ArgoCDAddOn({
        bootstrapRepo: {
            ...bootstrapRepo,
            path: 'envs/dev'
        },
    });
    const testBootstrapArgo = new blueprints.ArgoCDAddOn({
        bootstrapRepo: {
            ...bootstrapRepo,
            path: 'envs/test'
        },
    });
    const prodBootstrapArgo = new blueprints.ArgoCDAddOn({
        bootstrapRepo: {
            ...bootstrapRepo,
            path: 'envs/prod'
        },
    });
    
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
          { id: "dev", stackBuilder: blueprint.clone('us-west-2', account).addOns(devBootstrapArgo)},
          { id: "test", stackBuilder: blueprint.clone('us-east-2', account).addOns(testBootstrapArgo)},
          { id: "prod", stackBuilder: blueprint.clone('us-east-1', account).addOns(prodBootstrapArgo)}
        ]
      })
      .build(scope, id+'-stack', {env});
  }
}
