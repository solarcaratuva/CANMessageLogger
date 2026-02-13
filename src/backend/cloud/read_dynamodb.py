#contains pull_cloud_db() method that returns evertyhing in the
#SolarTelemetry table on dynamoDB

print(">>> SCRIPT STARTED <<<")

import boto3
import json
from boto3.dynamodb.types import TypeDeserializer
from botocore.exceptions import ProfileNotFound, NoCredentialsError, ClientError

REGION = "us-east-1"
TABLE_NAME = "SolarTelemetry"

deserializer = TypeDeserializer()

def deserialize(item):
    return {k: deserializer.deserialize(v) for k, v in item.items()}

def pull_cloud_db(profile_name=None):
    # Get username - allow passing it in or prompting
    if profile_name is None:
        PROFILE = input("Enter username: ").strip()
    else:
        PROFILE = profile_name.strip()
    
    if not PROFILE:
        print("Error: Username cannot be empty")
        return None
    
    try:
        # Try to create session with the profile
        session = boto3.Session(profile_name=PROFILE, region_name=REGION)
        ddb = session.client("dynamodb")
        
    except ProfileNotFound:
        print(f"Error: AWS profile '{PROFILE}' not found in your credentials")
        print(f"Run 'aws configure --profile {PROFILE}' to set it up")
        return None
        
    except NoCredentialsError:
        print("Error: No AWS credentials found")
        print("Run 'aws configure' to set up credentials")
        return None
    
    try:
        # Try to scan the table
        response = ddb.scan(TableName=TABLE_NAME)
        items = response.get("Items", [])
        
        print(f"Found {len(items)} items")
        
        # Deserialize all items into a list
        parsed_items = [deserialize(raw_item) for raw_item in items]
        
        # Return direct JSON pulled from DynamoBD
        return parsed_items
            
    except ClientError as e:
        error_code = e.response['Error']['Code']
        
        if error_code == 'ResourceNotFoundException':
            print(f"Error: Table '{TABLE_NAME}' does not exist in region {REGION}")
        elif error_code == 'AccessDeniedException':
            print(f"Error: No permission to access table '{TABLE_NAME}'")
        else:
            print(f"AWS Error: {e.response['Error']['Message']}")
        
        return None
            
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return None

if __name__ == "__main__":
    result = pull_cloud_db()
    
    if result:
        # Pretty print the JSON
        print("\n" + "="*50)
        print("PARSED DATA:")
        print("="*50)
        print(json.dumps(result, indent=2))
        
        # Optional: Save to file
        # with open('telemetry_data.json', 'w') as f:
        #     json.dump(result, f, indent=2)
    else:
        print("Failed to retrieve data")