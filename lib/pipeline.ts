// lib/pipeline.ts
import * as cdk from '@aws-quickstart/eks-blueprints/node_modules/aws-cdk-lib';
import * as ec2 from "@aws-quickstart/eks-blueprints/node_modules/aws-cdk-lib/aws-ec2";
import { InstanceType } from '@aws-quickstart/eks-blueprints/node_modules/aws-cdk-lib/aws-ec2';
import { CapacityType, KubernetesVersion, NodegroupAmiType } from '@aws-quickstart/eks-blueprints/node_modules/aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { TeamPlatform, TeamApplication } from '../teams';

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope,id)

    const account = props?.env?.account!;
    const region = props?.env?.region!;
    const env = { account, region }
    
    const clusterProvider = new blueprints.GenericClusterProvider({
            version: KubernetesVersion.V1_21,
            managedNodeGroups: [
                {
                    id: "NodeGroup",
                    instanceTypes: [new InstanceType('t3.large')],
                    minSize: 1,
                    maxSize: 10,
                    desiredSize: 3,
                    nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }
                }
            ]
        });

    const blueprint = blueprints.EksBlueprint.builder()
    .account(account)
    .clusterProvider(clusterProvider)
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
