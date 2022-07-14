import { ArnPrincipal } from "@aws-quickstart/eks-blueprints/node_modules/aws-cdk-lib/aws-iam";
import { PlatformTeam } from '@aws-quickstart/eks-blueprints';

export class TeamPlatform extends PlatformTeam {
    constructor(accountID: string) {
        super({
            name: "platform",
            users: [new ArnPrincipal(`arn:aws:iam::${accountID}:user/platform`)]
        })
    }
}