import { Construct } from 'constructs';
import { App, TerraformStack } from 'cdktf';
import { AwsProvider, DataAwsAvailabilityZones } from './.gen/providers/aws';
import { AwsVpc, AwsEksGroups } from './lib/aws';
import { AzurermProvider, ResourceGroup } from './.gen/providers/azurerm';
import { AzureNetwork, AzureAksGroups } from './lib/azure';

const config = require('config');
const stackName = config.get('StackName');
const tags = config.get('Tags')

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

class MyStack extends TerraformStack {
    constructor(scope: Construct, name: string ) {
      super(scope, name);

        ///////////////////////////////////////////////////////////////////
        ///////////////       Genral Informations     /////////////////////
        const awsProvider = new AwsProvider(this, 'aws', {
            region: config.get('Providers.Aws.Regions')[0],
        });

        const azs = new DataAwsAvailabilityZones(this, 'azs', {
            provider: awsProvider,
            state: 'available',
        });

        new AzurermProvider(this, 'azure', {
            features: [{}]
        });

        const resourceGroup = new ResourceGroup(this, 'resource_group', {
            location: config.get('Providers.Azure.Regions')[0],
            name: stackName,
        });

        ///////////////////////////////////////////////////////////////////
        //////////////////         Network          ///////////////////////
        const awsVpc = new AwsVpc(this, 'awsVpc', {
            name: stackName,
            region: config.get('Providers.Aws.Regions')[0],
            cidr: config.get('Providers.Aws.Vpc.cidr'),
            azs,
            privateSubnets: config.get('Providers.Aws.Vpc.privateSubnets'),
            publicSubnets: config.get('Providers.Aws.Vpc.publicSubnets'),
            infraSubnets: config.get('Providers.Aws.Vpc.infraSubnets'),
            enableNatGateway: config.get('Providers.Aws.Vpc.enableNatGateway'),
            eksClusterName: config.get('Providers.Aws.Eks.name'),
            tags,
        });

        const azureNetwork = new AzureNetwork(this, 'azureNetwork', {
            name: stackName,
            region: config.get('Providers.Azure.Regions')[0],
            resourceGroup,
            cidr: config.get('Providers.Azure.Network.cidr'),
            azNames: azs.names,
            privateSubnets: config.get('Providers.Azure.Network.privateSubnets'),
            publicSubnets: config.get('Providers.Azure.Network.publicSubnets'),
            infraSubnets: config.get('Providers.Azure.Network.infraSubnets'),
            natSubnets: config.get('Providers.Azure.Network.natSubnets'),
            enableNatGateway: config.get('Providers.Azure.Network.enableNatGateway'),
            tags,
        });

        ///////////////////////////////////////////////////////////////////
        //////////////////        Kubernetes        ///////////////////////
        
        new AwsEksGroups(this, 'awsEksGroups', {
            name: stackName,
            clusterName: config.get('Providers.Aws.Eks.name'),
            version: config.get('Providers.Aws.Eks.version'),
            instanceType: config.get('Providers.Aws.Eks.instanceType')[0],
            instanceCount: config.get('Providers.Aws.Eks.instanceCount'),
            subnetIds: awsVpc.privateSubnetIds,
            vpc: awsVpc.vpcId,
            tags,
        });

        new AzureAksGroups(this, 'azureAksGroups', {
            name: stackName,
            region: config.get('Providers.Azure.Regions')[0],
            resourceGroup,
            clusterName: config.get('Providers.Azure.Aks.name'),
            version: config.get('Providers.Azure.Aks.version'),
            instanceType: config.get('Providers.Azure.Aks.instanceType')[0],
            instanceCount: config.get('Providers.Azure.Aks.instanceCount'),
            dnsPrefix: config.get('Providers.Azure.Aks.dnsPrefix'),
            azureNetwork: azureNetwork.azureNetwork,
            azurePrivateSubnetIds: azureNetwork.azurePrivateSubnetIds,
            tags,
        });
    }
}

const app = new App();
new MyStack(app, 'cdktf');
app.synth();
